import React, { useContext, useState } from "react";
import { useDispatch } from "react-redux";
import styled, { ThemeContext } from "styled-components";
import {
	GetReposScmRequestType,
	NewRelicOptions,
	RepoProjectType,
} from "@codestream/protocols/agent";

import { CodeStreamState } from "../store";
import { useAppSelector, useDidMount } from "../utilities/hooks";
import { HostApi } from "../webview-api";
import { closePanel } from "./actions";
import { Button } from "../src/components/Button";
import { Link } from "./Link";
import { Icon } from "./Icon";
import { Dialog } from "../src/components/Dialog";
import { IntegrationButtons, Provider } from "./IntegrationsPanel";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { CenterRow, DialogRow, Dot, Dots, Sep, SkipLink, Step } from "./Onboard";
import { AddAppMonitoringNodeJS } from "./NewRelicWizards/AddAppMonitoringNodeJS";
import { AddAppMonitoringJava } from "./NewRelicWizards/AddAppMonitoringJava";
import { AddAppMonitoringDotNetCore } from "./NewRelicWizards/AddAppMonitoringDotNetCore";
import { isDarkTheme } from "../src/themes";

const NUM_STEPS = 4;
const CODEMARK_STEP = 6;
const CONGRATULATIONS_STEP = 3;

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

export const OnboardNewRelic = React.memo(function OnboardNewRelic() {
	const dispatch = useDispatch();
	const currentO11yRepoId = useAppSelector(
		(state: CodeStreamState) => state.preferences.currentO11yRepoId
	);

	const [currentStep, setCurrentStep] = useState(0);
	const [lastStep, setLastStep] = useState(0);
	// if we come back into the tour from elsewhere and currentStep is the codemark step, add icons
	const [seenCommentingStep, setSeenCommentingStep] = useState(currentStep === CODEMARK_STEP);
	const [newRelicOptions, setNewRelicOptions] = useState<NewRelicOptions>();

	useDidMount(() => {
		setTimeout(() => positionDots(), 250);
		(async () => {
			const reposResponse = await HostApi.instance.send(GetReposScmRequestType, {
				inEditorOnly: true,
				guessProjectTypes: true,
			});
			if (!reposResponse.error) {
				const knownRepo = (reposResponse.repositories ?? []).find(repo => {
					return repo.id === currentO11yRepoId;
				});
				if (knownRepo) {
					setNewRelicOptions({
						path: knownRepo.path,
						projects: knownRepo.projects,
						repoId: knownRepo.id,
						projectType: knownRepo.projectType ?? RepoProjectType.Unknown,
					});
				}
			}
		})();

		HostApi.instance.track("codestream/instrumentation_wizard/intro displayed", {
			event_type: "modal_display",
		});
	});

	const [isLoadingData, setIsLoadingData] = useState(false);
	const [projectType, setProjectType] = useState<RepoProjectType | undefined>();

	const skip = (plus = 1, options?: { appName?: string }) => setStep(currentStep + plus, options);

	const setStep = (step: number, options?: { appName?: string }) => {
		if (step === NUM_STEPS - 1) {
			HostApi.instance.track("codestream/instrumentation_wizard/finish displayed", {
				meta_data: `selected_language: ${projectType}`,
				event_type: "modal_display",
			});
		}

		if (step === 1) {
			HostApi.instance.track("codestream/instrumentation_wizard/start_button clicked", {
				meta_data: `detected_language: ${newRelicOptions?.projectType}`,
				target: "get_started",
				target_text: "Get Started",
				event_type: "click",
			});
		}

		if (step >= NUM_STEPS) {
			setCurrentStep(0);
			dispatch(closePanel());
			return;
		}
		if (step === CODEMARK_STEP) setSeenCommentingStep(true);
		setLastStep(currentStep);
		setCurrentStep(step);
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

						{newRelicOptions && (
							<AddAppMonitoringIntro
								className={className(1)}
								instrument={projectType => {
									setProjectType(projectType);
									skip();
								}}
								later={() => setStep(NUM_STEPS)}
								newRelicOptions={newRelicOptions}
							/>
						)}
						<AddAppMonitoring
							className={className(2)}
							skip={skip}
							projectType={projectType}
							newRelicOptions={newRelicOptions || {}}
						/>
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
											setCurrentStep(0);
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
