import React, { useState, useEffect, useContext } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import styled, { ThemeContext } from "styled-components";
import {
	GetLatestCommittersRequestType,
	NewRelicOptions,
	RepoProjectType,
	GetReposScmRequestType,
	ReposScm,
} from "@codestream/protocols/agent";
import { FormattedMessage } from "react-intl";
import { TelemetryRequestType } from "@codestream/protocols/agent";

import { CodeStreamState } from "../store";
import { getTeamMembers } from "../store/users/reducer";
import { useAppDispatch, useAppSelector, useDidMount, usePrevious } from "../utilities/hooks";
import { HostApi } from "../webview-api";
import { closePanel, invite } from "./actions";
import { Checkbox } from "../src/components/Checkbox";
import { CSText } from "../src/components/CSText";
import { Button } from "../src/components/Button";
import { Link } from "./Link";
import Icon from "./Icon";
import { confirmPopup } from "./Confirm";
import { Dialog } from "../src/components/Dialog";
import { IntegrationButtons, Provider } from "./IntegrationsPanel";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";
import { configureAndConnectProvider } from "../store/providers/actions";
import { ComposeKeybindings } from "./ComposeTitles";
import { CreateCodemarkIcons } from "./CreateCodemarkIcons";
import { getPRLabel, isConnected } from "../store/providers/reducer";
import { TextInput } from "../Authentication/TextInput";
import { isEmailValid } from "../Authentication/Signup";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { setOnboardStep, setWantNewRelicOptions } from "../store/context/actions";
import {
	Step,
	LinkRow,
	CenterRow,
	Dots,
	Dot,
	DialogRow,
	SkipLink,
	Keybinding,
	Sep,
	OutlineNumber,
	ExpandingText,
} from "./Onboard";
import { AddAppMonitoringNodeJS } from "./NewRelicWizards/AddAppMonitoringNodeJS";
import { AddAppMonitoringJava } from "./NewRelicWizards/AddAppMonitoringJava";
import { AddAppMonitoringDotNetCore } from "./NewRelicWizards/AddAppMonitoringDotNetCore";
import { isDarkTheme } from "../src/themes";

export const StepNumber = styled.div`
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	font-size: 20px;
	width: 40px;
	height: 40px;
	border-radius: 50%;
	margin: 0;
	font-weight: bold;

	background: var(--button-background-color);
	color: var(--button-foreground-color);
	// background: var(--text-color-highlight);
	// color: var(--base-background-color);
	@media only screen and (max-width: 450px) {
		display: none;
	}
`;

export const InstallRow = styled.div`
	display: flex;
	align-items: center;
	padding: 10px 0;
	width: 100%;
	label {
		text-align: left;
	}
	> * {
		flex-grow: 0;
	}
	> :nth-child(2) {
		text-align: left;
		margin: 0 10px;
		flex-grow: 10;
	}
	> :nth-child(3) {
		align-self: flex-end;
		flex-shrink: 0;
	}
	opacity: 0.15;
	transition: opacity 0.3s;
	&.row-active {
		opacity: 1;
	}
	button {
		width: 65px;
	}
	code {
		white-space: normal !important;
	}
`;

const NewRelicLogo = () => {
	const themeContext = useContext(ThemeContext);
	const color = isDarkTheme(themeContext) ? "#fff" : "#000";
	return <Icon name="newrelic-big" style={{ color }} />;
};

const EMPTY_ARRAY = [];

export const OnboardNewRelic = React.memo(function OnboardNewRelic() {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { providers, context } = state;
		const user = state.users[state.session.userId!];
		const newRelicOptions = context.wantNewRelicOptions;
		const connectedProviders = Object.keys(providers).filter(id => isConnected(state, { id }));
		const codeHostProviders = Object.keys(providers)
			.filter(id =>
				[
					"github",
					"github_enterprise",
					"bitbucket",
					"bitbucket_server",
					"gitlab",
					"gitlab_enterprise",
				].includes(providers[id].name)
			)
			.sort((a, b) => {
				return providers[a].name.localeCompare(providers[b].name);
			});
		const connectedCodeHostProviders = codeHostProviders.filter(id =>
			connectedProviders.includes(id)
		);
		const issueProviders = Object.keys(providers)
			.filter(id => providers[id].hasIssues)
			.filter(id => !codeHostProviders.includes(id))
			.sort((a, b) => {
				return providers[a].name.localeCompare(providers[b].name);
			});
		const connectedIssueProviders = issueProviders.filter(id => connectedProviders.includes(id));
		const messagingProviders = Object.keys(providers)
			.filter(id => providers[id].hasSharing)
			.sort((a, b) => {
				return providers[a].name.localeCompare(providers[b].name);
			});
		const connectedMessagingProviders = messagingProviders.filter(id =>
			connectedProviders.includes(id)
		);

		return {
			wantNewRelicOptions: state.context.wantNewRelicOptions,
			currentStep: state.context.onboardStep,
			providers: state.providers,
			connectedProviders,
			codeHostProviders,
			connectedCodeHostProviders,
			issueProviders,
			connectedIssueProviders,
			messagingProviders,
			connectedMessagingProviders,
			teamMembers: getTeamMembers(state),
			totalPosts: user.totalPosts || 0,
			isInVSCode: state.ide.name === "VSC",
			isInJetBrains: state.ide.name === "JETBRAINS",
			newRelicOptions,
		};
	}, shallowEqual);

	const {
		currentStep,
		connectedCodeHostProviders,
		connectedIssueProviders,
		connectedMessagingProviders,
		newRelicOptions,
	} = derivedState;

	let NUM_STEPS = 4;
	let CODE_HOSTS_STEP = 1;
	let ISSUE_PROVIDERS_STEP = 2;
	let MESSAGING_PROVIDERS_STEP = 3;
	let CODEMARK_STEP = 6;
	let CONGRATULATIONS_STEP = 3;

	const [lastStep, setLastStep] = useState(currentStep);
	// if we come back into the tour from elsewhere and currentStep is the codemark step, add icons
	const [seenCommentingStep, setSeenCommentingStep] = useState(currentStep === CODEMARK_STEP);
	const previousConnectedCodeHostProviders = usePrevious(derivedState.connectedCodeHostProviders);
	const previousConnectedIssueProviders = usePrevious(derivedState.connectedIssueProviders);
	const previousConnectedMessagingProviders = usePrevious(derivedState.connectedMessagingProviders);
	const previousTotalPosts = usePrevious(derivedState.totalPosts);
	const [showNextMessagingStep, setShowNextMessagingStep] = useState(false);

	useDidMount(() => {
		setTimeout(() => positionDots(), 250);
		(async () => {
			if (Object.keys(derivedState.wantNewRelicOptions || {}).length === 0) {
				const reposResponse = await HostApi.instance.send(GetReposScmRequestType, {
					inEditorOnly: true,
					guessProjectTypes: true,
				});
				if (!reposResponse.error) {
					const knownRepo = (reposResponse.repositories || []).find(repo => {
						return repo.id && repo.projectType !== RepoProjectType.Unknown;
					});
					if (knownRepo) {
						dispatch(
							setWantNewRelicOptions(
								knownRepo.projectType!,
								knownRepo.id,
								knownRepo.path,
								knownRepo.projects
							)
						);
					}
				}
			}
		})();

		HostApi.instance.track("codestream/instrumentation_wizard displayed", {
			event_type: "modal_display",
		});
	});

	// check when you connect to a host provider
	useEffect(() => {
		if (connectedCodeHostProviders.length > (previousConnectedCodeHostProviders || []).length) {
			if (currentStep === CODE_HOSTS_STEP) setStep(currentStep + 1);
		}
	}, [derivedState.connectedCodeHostProviders]);

	useEffect(() => {
		if (connectedIssueProviders.length > (previousConnectedIssueProviders || []).length) {
			if (currentStep === ISSUE_PROVIDERS_STEP) setStep(currentStep + 1);
		}
	}, [derivedState.connectedIssueProviders]);

	useEffect(() => {
		if (connectedMessagingProviders.length > (previousConnectedMessagingProviders || []).length) {
			if (currentStep === MESSAGING_PROVIDERS_STEP) setStep(currentStep + 1);
		}
	}, [derivedState.connectedMessagingProviders]);

	useEffect(() => {
		if (derivedState.totalPosts > (previousTotalPosts || 0)) {
			if (currentStep === CODEMARK_STEP) setStep(CONGRATULATIONS_STEP);
		}
	}, [derivedState.totalPosts]);

	const [isLoadingData, setIsLoadingData] = useState(false);
	const [loadedData, setLoadedData] = useState(false);
	const [projectType, setProjectType] = useState<RepoProjectType | undefined>();

	const skip = (plus: number = 1, options?: { appName?: string }) =>
		setStep(currentStep + plus, options);

	const setStep = (step: number, options?: { appName?: string }) => {
		if (step === NUM_STEPS - 1) {
			HostApi.instance.track("codestream/instrumentation_wizard completed", {
				meta_data: `selected_language: ${projectType}`,
				event_type: "modal_display",
			});
		}

		if (step === 1) {
			HostApi.instance.track("codestream/instrumentation_wizard started", {
				meta_data: `detected_language: ${derivedState.wantNewRelicOptions?.projectType}`,
				target: "get_started",
				target_text: "Get Started",
				event_type: "click",
			});
		}

		if (step >= NUM_STEPS) {
			dispatch(setOnboardStep(0));
			dispatch(closePanel());
			return;
		}
		if (step === CODEMARK_STEP) setSeenCommentingStep(true);
		setLastStep(currentStep);
		dispatch(setOnboardStep(step));
		setTimeout(() => scrollToTop(), 250);
		setTimeout(() => positionDots(), 250);
		if (step === 2) setTimeout(() => document.getElementById("appName")?.focus(), 250);
	};

	const scrollToTop = () => {
		requestAnimationFrame(() => {
			const $container = document.getElementById("scroll-container");
			if ($container) $container.scrollTo({ top: 0, behavior: "smooth" });
		});
	};

	const positionDots = () => {
		requestAnimationFrame(() => {
			const $active = document.getElementsByClassName("active")[0];
			if ($active) {
				const $dots = document.getElementById("dots");
				if ($dots) $dots.style.top = `${$active.clientHeight - 30}px`;
			}
		});
	};

	const className = (step: number) => {
		if (step === currentStep) return "active";
		if (step === lastStep) return "last-active";
		return "";
	};

	return (
		<>
			{seenCommentingStep && <CreateCodemarkIcons />}
			<div
				id="scroll-container"
				className="onboarding-page"
				style={{
					position: "relative",
					alignItems: "center",
					overflowX: "hidden",
					overflowY: currentStep === 0 ? "hidden" : "auto",
				}}
			>
				<div className="standard-form" style={{ height: "auto", position: "relative" }}>
					<fieldset className="form-body">
						<Step className={`ease-down ${className(0)}`}>
							<div className="body">
								<h1>
									<NewRelicLogo />
									<br />
									Instrument your app
								</h1>
								<p className="explainer">
									New Relic's APM agent helps developers make data-driven decisions. Improve system
									performance, and your customers' experience.
								</p>
								<CenterRow>
									<Button variant="new-relic" size="xl" onClick={() => setStep(1)}>
										Get Started
									</Button>
								</CenterRow>
								<SkipLink onClick={() => skip(999)}>I'll do this later</SkipLink>
							</div>
						</Step>

						<AddAppMonitoringIntro
							className={className(1)}
							instrument={projectType => {
								setProjectType(projectType);
								skip();
							}}
							later={() => setStep(NUM_STEPS)}
							newRelicOptions={newRelicOptions || {}}
						/>
						<AddAppMonitoring
							className={className(2)}
							skip={skip}
							projectType={projectType}
							newRelicOptions={newRelicOptions || {}}
						/>
						{/*
						<ConnectCodeHostProvider className={className(2)} skip={skip} />
						<ConnectIssueProvider className={className(3)} skip={skip} />
						<ConnectMessagingProvider
							className={className(4)}
							skip={skip}
							showNextMessagingStep={showNextMessagingStep}
							setShowNextMessagingStep={setShowNextMessagingStep}
						/>
						<CreateCodemark className={className(CODEMARK_STEP)} skip={skip} />
						<InviteTeammates className={className(3)} skip={skip} positionDots={positionDots} />
						*/}
						<Step className={className(CONGRATULATIONS_STEP)}>
							<div className="body">
								<h1>You're good to go!</h1>
								<p className="explainer">Head to New Relic to see your application's data.</p>
								<CenterRow>
									<Button
										size="xl"
										onClick={() => {
											const url = "https://one.newrelic.com/launcher/nr1-core.explorer";
											HostApi.instance.send(OpenUrlRequestType, { url });
											dispatch(setOnboardStep(0));
											dispatch(closePanel());
										}}
										isLoading={isLoadingData}
									>
										See Your Data
									</Button>
								</CenterRow>
								<SkipLink onClick={() => setStep(NUM_STEPS)}>I'll do this later</SkipLink>
							</div>
						</Step>
					</fieldset>
				</div>
				<Dots id="dots" steps={NUM_STEPS}>
					{[...Array(NUM_STEPS)].map((_, index) => {
						const selected = index === currentStep;
						return <Dot selected={selected} onClick={() => setStep(index)} />;
					})}
				</Dots>
			</div>
		</>
	);
});

const ThreeWays = (props: { className: string; skip: Function }) => {
	return (
		<Step className={props.className}>
			<div className="body">
				<h3>3 Ways to Collaborate</h3>
				<p className="explainer left">
					CodeStream provides different ways to collaborate depending on where you are in your
					workflow.
				</p>
				<div style={{ margin: "0 0 20px 20px" }}>
					<DialogRow style={{ alignItems: "center" }}>
						<OutlineNumber>1</OutlineNumber>
						<div>
							<b>Code Comments</b> to discuss any block of code at any time
						</div>
					</DialogRow>
					<DialogRow style={{ alignItems: "center" }}>
						<OutlineNumber>2</OutlineNumber>
						<div>
							<b>Feedback Requests</b> to have someone look over your work in progress
						</div>
					</DialogRow>
					<DialogRow style={{ alignItems: "center" }}>
						<OutlineNumber>3</OutlineNumber>
						<div>
							<b>Pull Requests</b> to review and merge completed work
						</div>
					</DialogRow>
				</div>
				<p className="explainer left">Pick and choose those that work best for your team.</p>
				<CenterRow>
					<Button size="xl" onClick={() => props.skip()}>
						Next
					</Button>
				</CenterRow>
			</div>
		</Step>
	);
};

const GIF = (props: { src: string }) => {
	return (
		<div
			style={{
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				width: "100%",
			}}
		>
			<img style={{ width: "100%" }} src={props.src} />
		</div>
	);
};

const CodeComments = (props: {
	className: string;
	skip: Function;
	showNextMessagingStep: boolean;
	setShowNextMessagingStep: Function;
}) => {
	const derivedState = useSelector((state: CodeStreamState) => {
		const { providers } = state;

		return {
			messagingProviders: Object.keys(providers).filter(id => providers[id].hasSharing),
			img: state.ide.name === "JETBRAINS" ? "CM-JB.gif" : "CM.gif",
		};
	}, shallowEqual);

	return (
		<Step className={props.className}>
			<div className="body">
				<h3>Code Comments</h3>
				<p className="explainer">
					Have a question about some code? Just select the code, click Comment, and ask!
				</p>
				<GIF src={`https://images.codestream.com/onboard/${derivedState.img}`} />
				<br />
				<p className="explainer">
					Connect your messaging service so teams can be notified, and can participate, via Slack or
					Teams.
				</p>
				<IntegrationButtons noBorder noPadding>
					<ProviderButtons
						providerIds={[...derivedState.messagingProviders].reverse()}
						setShowNextMessagingStep={props.setShowNextMessagingStep}
					/>
				</IntegrationButtons>

				{props.showNextMessagingStep ? (
					<CenterRow>
						<Button size="xl" onClick={() => props.skip()}>
							Next
						</Button>
					</CenterRow>
				) : (
					<SkipLink onClick={() => props.skip()}>I'll do this later</SkipLink>
				)}
			</div>
		</Step>
	);
};

const FeedbackRequests = (props: { className: string; skip: Function }) => {
	const derivedState = useSelector((state: CodeStreamState) => {
		const { providers } = state;

		return {
			messagingProviders: Object.keys(providers).filter(id => providers[id].hasSharing),
			img: state.ide.name === "JETBRAINS" ? "FR-JB.gif" : "FR.gif",
		};
	}, shallowEqual);

	return (
		<Step className={props.className}>
			<div className="body">
				<h3>Feedback Requests</h3>
				<p className="explainer">
					Get feedback on your changes with no need to commit, push, open a PR, or leave your IDE.
				</p>
				<GIF src={`https://images.codestream.com/onboard/${derivedState.img}`} />
				<br />
				<p className="explainer">
					Your teammates don't need to switch branches or set aside their own work to review your
					changes.
				</p>
				<CenterRow>
					<Button size="xl" onClick={() => props.skip()}>
						Next
					</Button>
				</CenterRow>
			</div>
		</Step>
	);
};

const PullRequests = (props: { className: string; skip: Function }) => {
	const derivedState = useSelector((state: CodeStreamState) => {
		const { providers } = state;

		const connectedProviders = Object.keys(providers).filter(id => isConnected(state, { id }));
		const codeHostProviders = Object.keys(providers)
			.filter(id =>
				[
					"github",
					"github_enterprise",
					"bitbucket",
					"bitbucket_server",
					"gitlab",
					"gitlab_enterprise",
				].includes(providers[id].name)
			)
			.sort((a, b) => {
				return providers[a].name.localeCompare(providers[b].name);
			});
		const connectedCodeHostProviders = codeHostProviders.filter(id =>
			connectedProviders.includes(id)
		);

		return {
			prLabel: getPRLabel(state),
			codeHostProviders,
			connectedCodeHostProviders,
			img1: state.ide.name === "JETBRAINS" ? "PR-GH-JB.gif" : "PR-GH.gif",
			img2: state.ide.name === "JETBRAINS" ? "PR-GLBB-JB.gif" : "PR-GLBB.gif",
		};
	}, shallowEqual);

	if (derivedState.connectedCodeHostProviders.find(id => id.includes("github"))) {
		return (
			<Step className={props.className}>
				<div className="body">
					<h3>Pull Requests</h3>
					<p className="explainer">
						Create and review pull requests from your IDE, with full-file context, and side-by-side
						diffs that allow you to comment anywhere in the file.
					</p>
					<GIF src={`https://images.codestream.com/onboard/${derivedState.img1}`} />
					<br />
					<p className="explainer">
						Your comments sync to GitHub in real time, so you can try out CodeStream before inviting
						your teammates.
					</p>
					<CenterRow>
						<Button size="xl" onClick={() => props.skip()}>
							Next
						</Button>
					</CenterRow>
				</div>
			</Step>
		);
	} else if (derivedState.connectedCodeHostProviders.length > 0) {
		return (
			<Step className={props.className}>
				<div className="body">
					<h3>{derivedState.prLabel["PullRequests"]}</h3>
					<p className="explainer">
						Create {derivedState.prLabel["pullrequests"]} right from your IDE, with no context
						switching.
					</p>
					<GIF src={`https://images.codestream.com/onboard/${derivedState.img2}`} />
					<br />
					<CenterRow>
						<Button size="xl" onClick={() => props.skip()}>
							Next
						</Button>
					</CenterRow>
				</div>
			</Step>
		);
	} else {
		return (
			<Step className={props.className}>
				<div className="body">
					<h3>Pull Requests</h3>
					<p className="explainer">
						Create and review pull requests from your IDE, with full-file context, and side-by-side
						diffs that allow you to comment anywhere in the file.
					</p>
					<GIF src={`https://images.codestream.com/onboard/${derivedState.img1}`} />
					<br />
					<p className="explainer">
						Your comments sync to your code host in real time, so you can try out CodeStream before
						inviting your teammates.
					</p>
					<IntegrationButtons noBorder noPadding>
						<ProviderButtons providerIds={derivedState.codeHostProviders} />
					</IntegrationButtons>
					<SkipLink onClick={() => props.skip()}>I'll do this later</SkipLink>
				</div>
			</Step>
		);
	}
};

const AddAppMonitoringIntro = (props: {
	className: string;
	instrument: Function;
	later: Function;
	newRelicOptions: NewRelicOptions;
}) => {
	const nodeJSDetected = props.newRelicOptions.projectType === RepoProjectType.NodeJS;
	const javaDetected = props.newRelicOptions.projectType === RepoProjectType.Java;
	const dotNetDetected =
		props.newRelicOptions.projectType === RepoProjectType.DotNetCore ||
		props.newRelicOptions.projectType === RepoProjectType.DotNetFramework;

	const nodeJSVariant = nodeJSDetected ? "primary" : "neutral";
	const javaVariant = javaDetected ? "primary" : "neutral";
	const dotNetVariant = dotNetDetected ? "primary" : "neutral";

	return (
		<Step className={props.className}>
			<div className="body">
				<h3>Add App Monitoring</h3>
				<p className="explainer">Monitor the performance of your app by installing an agent</p>
				<Dialog>
					<DialogRow>
						<Icon name="check" />
						<div>Troubleshoot and resolve problems with Alerts and Applied Intelligence</div>
					</DialogRow>
					<DialogRow>
						<Icon name="check" />
						<div>
							Query any data type (including metrics, events, logs, and traces) via UI or API
						</div>
					</DialogRow>
					<DialogRow>
						<Icon name="check" />
						<div>
							Create and share a variety of charts and dashboards that include customer context with
							business priorities and expected outcomes
						</div>
					</DialogRow>
					<Sep />
					<IntegrationButtons noBorder noPadding>
						<Provider
							onClick={() => props.instrument(RepoProjectType.NodeJS)}
							variant={nodeJSVariant}
						>
							<Icon name="node" />
							Node JS
							<div style={{ position: "absolute", fontSize: "10px", bottom: "-5px", right: "4px" }}>
								{nodeJSDetected && <>detected</>}
							</div>
						</Provider>
						{/*
						<Provider variant="neutral">
							<Icon name="php" />
							PHP
						</Provider>
						*/}
						<Provider onClick={() => props.instrument(RepoProjectType.Java)} variant={javaVariant}>
							<Icon name="java" />
							Java
							<div style={{ position: "absolute", fontSize: "10px", bottom: "-5px", right: "4px" }}>
								{props.newRelicOptions.projectType === RepoProjectType.Java && <>detected</>}
							</div>
						</Provider>
						<Provider
							onClick={() => props.instrument(RepoProjectType.DotNetCore)}
							variant={dotNetVariant}
						>
							<Icon name="dot-net" />
							Microsft.NET
							<div style={{ position: "absolute", fontSize: "10px", bottom: "-5px", right: "4px" }}>
								{(props.newRelicOptions.projectType === RepoProjectType.DotNetCore ||
									props.newRelicOptions.projectType === RepoProjectType.DotNetFramework) && (
									<>detected</>
								)}
							</div>
						</Provider>
					</IntegrationButtons>
					<SkipLink onClick={() => {}}>
						PHP, Ruby, Python, Go and C users{" "}
						<Link href="https://developer.newrelic.com/instant-observability/">click here</Link>
					</SkipLink>
				</Dialog>
				<SkipLink onClick={() => props.later()}>I'll do this later</SkipLink>
			</div>
		</Step>
	);
};

const AddAppMonitoring = (props: {
	className: string;
	skip: Function;
	projectType: RepoProjectType | undefined;
	newRelicOptions: NewRelicOptions;
}) => {
	switch (props.projectType) {
		case RepoProjectType.NodeJS:
			return <AddAppMonitoringNodeJS {...props} />;
		case RepoProjectType.Java:
			return <AddAppMonitoringJava {...props} />;
		case RepoProjectType.DotNetCore:
			return <AddAppMonitoringDotNetCore {...props} />;
		default:
			// FIXME
			return (
				<Step className={props.className}>
					<div className="body">
						<h1>Unknown Framework</h1>
						<p className="explainer">Click OK to continue to CodeStream.</p>
						<CenterRow>
							<Button size="xl" onClick={() => props.skip(999)}>
								OK
							</Button>
						</CenterRow>
					</div>
				</Step>
			);
	}
};

const ConnectIssueProvider = (props: { className: string; skip: Function }) => {
	const derivedState = useSelector((state: CodeStreamState) => {
		const { providers } = state;

		const codeHostProviders = Object.keys(providers).filter(id =>
			[
				"github",
				"github_enterprise",
				"bitbucket",
				"bitbucket_server",
				"gitlab",
				"gitlab_enterprise",
			].includes(providers[id].name)
		);
		const issueProviders = Object.keys(providers)
			.filter(id => providers[id].hasIssues)
			.filter(id => !codeHostProviders.includes(id));

		return {
			issueProviders,
		};
	}, shallowEqual);

	return (
		<Step className={props.className}>
			<div className="body">
				<h3>
					<Icon name="jira" />
					<Icon name="trello" />
					<Icon name="asana" />
					<br />
					Connect to your Issue Tracker
				</h3>
				<p className="explainer">Grab tickets and get to work without breaking flow</p>
				<Dialog>
					<DialogRow>
						<Icon name="check" />
						<div>View a list of outstanding tasks assigned to you with custom queries</div>
					</DialogRow>
					<DialogRow>
						<Icon name="check" />
						<div>
							One-click to update task status, create a branch, and update your status on Slack
						</div>
					</DialogRow>
					<DialogRow>
						<Icon name="check" />
						<div>
							Enrich the context of code discussion, pull requests, and feedback requests by
							including ticket information
						</div>
					</DialogRow>
					<Sep />
					<IntegrationButtons noBorder noPadding>
						<ProviderButtons providerIds={derivedState.issueProviders} />
					</IntegrationButtons>
				</Dialog>
				<SkipLink onClick={() => props.skip()}>I'll do this later</SkipLink>
			</div>
		</Step>
	);
};

const ConnectMessagingProvider = (props: {
	className: string;
	skip: Function;
	showNextMessagingStep: boolean;
	setShowNextMessagingStep: Function;
}) => {
	const derivedState = useSelector((state: CodeStreamState) => {
		const { providers } = state;

		return {
			messagingProviders: Object.keys(providers).filter(id => providers[id].hasSharing),
		};
	}, shallowEqual);

	return (
		<Step className={props.className}>
			<div className="body">
				<h3>
					<Icon name="slack" />
					<Icon name="msteams" />
					<br />
					Connect to Slack or MS Teams
				</h3>
				<p className="explainer">Ask questions or make suggestions about any code in your repo</p>
				<Dialog>
					<DialogRow>
						<Icon name="check" />
						<div>
							Discussing code is as simple as: select the code, type your question, and share to a
							channel or DM
						</div>
					</DialogRow>
					<DialogRow>
						<Icon name="check" />
						<div>Code authors are automatically at-mentioned based on git blame info</div>
					</DialogRow>
					<DialogRow>
						<Icon name="check" />
						<div>
							Conversation threads are tied to code locations across branches and as new code merges
							in
						</div>
					</DialogRow>
					<Sep />
					<IntegrationButtons noBorder noPadding>
						<ProviderButtons
							providerIds={[...derivedState.messagingProviders].reverse()}
							setShowNextMessagingStep={props.setShowNextMessagingStep}
						/>
					</IntegrationButtons>
				</Dialog>
				{props.showNextMessagingStep ? (
					<CenterRow>
						<Button size="xl" onClick={() => props.skip()}>
							Next
						</Button>
					</CenterRow>
				) : (
					<SkipLink onClick={() => props.skip()}>I'll do this later</SkipLink>
				)}
			</div>
		</Step>
	);
};

const InviteTeammates = (props: { className: string; skip: Function; positionDots: Function }) => {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const team = state.teams[state.context.currentTeamId];
		const dontSuggestInvitees = team.settings ? team.settings.dontSuggestInvitees || {} : {};

		return {
			providers: state.providers,
			dontSuggestInvitees,
			teamMembers: getTeamMembers(state),
		};
	}, shallowEqual);

	const [numInviteFields, setNumInviteFields] = useState(1);
	const [inviteEmailFields, setInviteEmailFields] = useState<string[]>([]);
	const [inviteEmailValidity, setInviteEmailValidity] = useState<boolean[]>(
		new Array(50).fill(true)
	);
	const [sendingInvites, setSendingInvites] = useState(false);
	const [skipSuggestedField, setSkipSuggestedField] = useState<{ [email: string]: boolean }>({});
	const [suggestedInvitees, setSuggestedInvitees] = useState<any[]>([]);

	useDidMount(() => {
		getSuggestedInvitees();
	});

	const getSuggestedInvitees = async () => {
		const result = await HostApi.instance.send(GetLatestCommittersRequestType, {});
		const committers = result ? result.scm : undefined;
		if (!committers) return;

		const { teamMembers, dontSuggestInvitees } = derivedState;
		const suggested: any[] = [];
		Object.keys(committers).forEach(email => {
			if (teamMembers.find(user => user.email === email)) return;
			if (dontSuggestInvitees[email.replace(/\./g, "*")]) return;
			if (committers[email].startsWith("TeamCity")) return;
			suggested.push({ email, fullName: committers[email] || email });
		});
		setSuggestedInvitees(suggested);
		if (suggested.length === 0) setNumInviteFields(3);
	};

	const confirmSkip = () => {
		confirmPopup({
			title: "Skip this step?",
			message:
				"CodeStream is more powerful when you collaborate. You can invite team members at any time, but don’t hoard all the fun.",
			centered: false,
			buttons: [
				{ label: "Go Back", className: "control-button" },
				{
					label: "Skip Step",
					action: () => props.skip(),
					className: "secondary",
				},
			],
		});
	};

	const addInvite = () => {
		setNumInviteFields(numInviteFields + 1);
		setTimeout(() => props.positionDots(), 250);
	};

	const onInviteEmailChange = (value, index) => {
		const invites = [...inviteEmailFields];
		invites[index] = value;
		setInviteEmailFields(invites);
	};

	const onInviteValidityChanged = (field: string, validity: boolean) => {
		const inviteMatches = field.match(/^invite-(\d+)/);
		if (inviteMatches) {
			const invalid = [...inviteEmailValidity];
			invalid[inviteMatches[1]] = validity;
			setInviteEmailValidity(invalid);
		}
	};

	const inviteEmail = async (email: string, method: "Onboarding" | "Onboarding Suggestion") => {
		if (email) {
			await dispatch(invite({ email, inviteType: method }));
			HostApi.instance.track("Teammate Invited", {
				"Invitee Email Address": email,
				"Invitation Method": method,
			});
		}
	};

	const sendInvites = async () => {
		setSendingInvites(true);

		let index = 0;
		while (index <= suggestedInvitees.length) {
			if (suggestedInvitees[index]) {
				const email = suggestedInvitees[index].email;
				if (!skipSuggestedField[email]) await inviteEmail(email, "Onboarding Suggestion");
			}
			index++;
		}

		index = 0;
		while (index <= numInviteFields) {
			await inviteEmail(inviteEmailFields[index], "Onboarding");
			index++;
		}

		setSendingInvites(false);
		props.skip();
	};

	return (
		<Step className={props.className}>
			<div className="body">
				<h3>Invite your team</h3>
				<p className="explainer">We recommend exploring CodeStream with your team</p>
				<Dialog>
					{suggestedInvitees.length > 0 && (
						<>
							<p className="explainer left">Suggestions below are based on your git history</p>
							{suggestedInvitees.map(user => {
								return (
									<Checkbox
										name={user.email}
										checked={!skipSuggestedField[user.email]}
										onChange={() => {
											setSkipSuggestedField({
												...skipSuggestedField,
												[user.email]: !skipSuggestedField[user.email],
											});
										}}
									>
										{user.fullName}{" "}
										<CSText as="span" muted>
											{user.email}
										</CSText>
									</Checkbox>
								);
							})}
						</>
					)}
					{[...Array(numInviteFields)].map((_, index) => {
						return (
							<ExpandingText className="control-group">
								<TextInput
									name={`invite-${index}`}
									autoFocus={index === numInviteFields - 1}
									placeholder="name@example.com"
									value={inviteEmailFields[index] || ""}
									onChange={value => onInviteEmailChange(value, index)}
									onValidityChanged={onInviteValidityChanged}
									validate={inviteEmailFields[index] ? isEmailValid : () => true}
								/>
								{!inviteEmailValidity[index] && (
									<small className="error-message">
										<FormattedMessage id="login.email.invalid" />
									</small>
								)}
							</ExpandingText>
						);
					})}
					<LinkRow style={{ minWidth: "180px" }}>
						<Link onClick={addInvite}>+ Add more</Link>
						<Button isLoading={sendingInvites} onClick={sendInvites}>
							Send invites
						</Button>
					</LinkRow>
				</Dialog>
				<SkipLink onClick={confirmSkip}>I'll do this later</SkipLink>
			</div>
		</Step>
	);
};

const CreateCodemark = (props: { className: string; skip: Function }) => {
	const [openRepos, setOpenRepos] = useState<ReposScm[]>(EMPTY_ARRAY);

	useDidMount(() => {
		fetchOpenRepos();
	});

	const fetchOpenRepos = async () => {
		const response = await HostApi.instance.send(GetReposScmRequestType, {
			inEditorOnly: true,
			includeCurrentBranches: true,
			includeProviders: true,
		});
		if (response && response.repositories) {
			setOpenRepos(response.repositories);
		}
	};

	return (
		<Step className={props.className}>
			<div className="body">
				<h3>Discuss any code, anytime</h3>
				<p className="explainer">
					Discuss code in a pull request, a feedback request, or to ask a question or make a
					suggestion about any part of your code base.
				</p>
				<Dialog>
					<div
						style={{
							textAlign: "center",
							margin: "0 0 10px 0",
							fontSize: "larger",
							color: "var(--text-color-highlight)",
						}}
					>
						Try sharing a code comment with your team:
					</div>
					{openRepos.length === 0 ? (
						<>
							<DialogRow style={{ alignItems: "center" }}>
								<OutlineNumber>1</OutlineNumber>
								<div>Open a repository in your editor</div>
							</DialogRow>
							<DialogRow style={{ alignItems: "center" }}>
								<OutlineNumber>2</OutlineNumber>
								<div>Select a range in a source file</div>
							</DialogRow>
							<DialogRow style={{ alignItems: "center" }}>
								<OutlineNumber>3</OutlineNumber>
								<div>Click the comment icon or type the keybinding:</div>
							</DialogRow>
						</>
					) : (
						<>
							<DialogRow style={{ alignItems: "center" }}>
								<OutlineNumber>1</OutlineNumber>
								<div>Select a range in your editor</div>
							</DialogRow>
							<DialogRow style={{ alignItems: "center" }}>
								<OutlineNumber>2</OutlineNumber>
								<div>Click the comment icon or type the keybinding:</div>
							</DialogRow>
						</>
					)}
					<Keybinding>{ComposeKeybindings.comment}</Keybinding>
				</Dialog>
				<SkipLink onClick={() => props.skip()}>I'll try this later</SkipLink>
			</div>
		</Step>
	);
};

const ProviderButtons = (props: { providerIds: string[]; setShowNextMessagingStep?: Function }) => {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { providers } = state;
		const connectedProviders = Object.keys(providers).filter(id => isConnected(state, { id }));

		return {
			providers: state.providers,
			connectedProviders,
		};
	}, shallowEqual);

	return (
		<>
			{props.providerIds.map(providerId => {
				const provider = derivedState.providers[providerId];
				const providerDisplay = PROVIDER_MAPPINGS[provider.name];
				const connected = derivedState.connectedProviders.includes(providerId);
				if (providerDisplay) {
					return (
						<Provider
							key={provider.id}
							variant={connected ? "success" : undefined}
							onClick={() => {
								if (connected) return;
								if (provider.id == "msteams") {
									HostApi.instance.send(OpenUrlRequestType, {
										url: "https://docs.newrelic.com/docs/codestream/code-discussion/msteams-integration/",
									});
									HostApi.instance.send(TelemetryRequestType, {
										eventName: "codestream/integration connected",
										properties: {
											meta_data: `service: ${provider.name}`,
											meta_data_2: `connection_location: onboard`,
											event_type: "response",
										},
									});
									if (props.setShowNextMessagingStep) props.setShowNextMessagingStep(true);
									return;
								}
								dispatch(configureAndConnectProvider(provider.id, "Onboard"));
							}}
						>
							<Icon name={providerDisplay.icon} />
							{providerDisplay.displayName}
						</Provider>
					);
				} else return null;
			})}
		</>
	);
};
