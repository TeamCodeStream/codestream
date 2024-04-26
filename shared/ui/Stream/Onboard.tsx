import React, { useState } from "react";
import { shallowEqual, useDispatch } from "react-redux";
import styled from "styled-components";
import {
	GetLatestCommittersRequestType,
	UpdateCompanyRequestType,
} from "@codestream/protocols/agent";
import { FormattedMessage } from "react-intl";

import { CodeStreamState } from "../store";
import { currentUserIsAdminSelector, getTeamMembers } from "../store/users/reducer";
import { useAppDispatch, useAppSelector, useDidMount } from "../utilities/hooks";
import { HostApi } from "../webview-api";
import { closePanel, invite } from "./actions";
import { Checkbox } from "../src/components/Checkbox";
import { CSText } from "../src/components/CSText";
import * as Legacy from "../Stream/Button";
import { Link } from "./Link";
import { Icon } from "./Icon";
import { TextInput } from "../Authentication/TextInput";
import { isEmailValid } from "../Authentication/Signup";
import {
	clearForceRegion,
	clearPendingProtocolHandlerUrl,
	handlePendingProtocolHandlerUrl,
} from "../store/context/actions";

export const Step = styled.div`
	margin: 0 auto;
	text-align: left;
	position: absolute;
	display: none;
	opacity: 0;
	justify-content: center;
	align-items: center;
	flex-direction: row;
	top: 0;
	left: 0;
	width: 100%;
	min-height: 100vh;
	.body {
		padding: 30px 20px 20px 20px;
		margin-bottom: 30px;
		max-width: 450px;
		pointer-events: none;
	}
	p {
		margin-top: 0.5em;
		color: var(--text-color-subtle);
	}
	h1,
	h2,
	h3 {
		color: var(--text-color-highlight);
		margin: 0 0 0 0;
		text-align: center;
	}
	h1 {
		font-size: 32px;
		margin-bottom: 10px;
		.icon {
			pointer-events: none;
			font-size: 24px;
			line-height: 1;
			display: inline-block;
			opacity: 1;
			transform: scale(7);
			animation-duration: 2s;
			animation-timing-function: ease-out;
			animation-name: hoverin;
			animation-fill-mode: forwards;
		}
	}
	h3 {
		font-size: 18px;
		margin-bottom: 10px;
		.icon {
			line-height: 2;
			display: inline-block;
			opacity: 0.5;
			transform: scale(2);
			margin: 0 15px;
		}
	}
	.explainer {
		text-align: center;
		&.left {
			text-align: left;
		}
	}
	&.active {
		animation-duration: 0.75s;
		animation-name: slidein;
		animation-timing-function: ease;
		display: flex;
		opacity: 1;
		.body {
			pointer-events: auto;
		}
		z-index: 10;
	}
	&.ease-down {
		animation-duration: 2s;
		animation-timing-function: ease-out;
		animation-name: easedown;
	}
	&.last-active {
		animation-duration: 0.25s;
		animation-name: slideout;
		animation-timing-function: ease;
		animation-fill-mode: forwards;
		display: flex;
		overflow: hidden;
	}
	b {
		color: var(--text-color-highlight);
	}

	@keyframes easedown {
		from {
			transform: translateY(-30px);
		}
		75% {
			transform: translateY(-30px);
		}
		to {
			transform: translateY(0);
		}
	}

	@keyframes hoverin {
		from {
			transform: scale(400) translateY(15vh);
			opacity: 0;
		}

		75% {
			opacity: 0.1;
		}

		to {
			transform: scale(7) translateY(0);
			opacity: 1;
		}
	}

	@keyframes slideout {
		from {
			opacity: 1;
			height: auto;
		}
		99% {
			opacity: 0;
			height: auto;
			transform: scale(0.9);
		}
		to {
			opacity: 0;
			height: 0px;
			transform: scale(0.09);
		}
	}
	@keyframes slidein {
		from {
			opacity: 0;
			transform: scale(1);
		}
		50% {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
`;

export const ButtonRow = styled.div`
	margin-top: 10px;
	flex-wrap: wrap;
	justify-content: flex-start;
	white-space: normal; // required for wrap
	button {
		margin: 10px 10px 0 0;
	}
`;

export const LinkRow = styled.div`
	margin-top: 10px;
	text-align: right;
	a {
		text-decoration: none;
	}
`;

export const CenterRow = styled.div`
	margin-top: 20px;
	text-align: center;
`;

export const Dots = styled.div<{ steps: number }>`
	display: flex;
	position: absolute;
	top: calc(100vh - 30px);
	left: calc(50vw - ${props => props.steps * 10}px);
	z-index: 11;
	transition: top 0.15s;
`;

export const Dot = styled.div<{ selected?: boolean }>`
	width: 10px;
	height: 10px;
	border-radius: 5px;
	margin: 0 5px;
	background: var(--text-color-highlight);
	opacity: ${props => (props.selected ? "1" : "0.2")};
	transition: opacity 0.25s;
`;

export const OutlineBox = styled.div`
	width: 100%;
	border: 1px solid var(--base-border-color);
	padding: 50px 0;
`;

export const DialogRow = styled.div`
	display: flex;
	padding: 10px 0;
	&:first-child {
		margin-top: -10px;
	}
	.icon {
		color: var(--text-color-info);
		margin-right: 15px;
		flex-shrink: 0;
		flex-grow: 0;
	}
`;

export const SkipLink = styled.div`
	cursor: pointer;
	text-align: center;
	margin-top: 30px;
	color: var(--text-color-subtle);
	opacity: 0.75;
	&:hover {
		opacity: 1;
		color: var(--text-color);
	}
`;

export const Keybinding = styled.div`
	margin: 20px 0;
	text-align: center;
	transform: scale(1.5);
`;

export const Sep = styled.div`
	border-top: 1px solid var(--base-border-color);
	margin: 10px -20px 20px -20px;
`;

export const OutlineNumber = styled.div`
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	font-size: 14px;
	width: 30px;
	height: 30px;
	border-radius: 50%;
	margin: 0 10px 0 0;
	font-weight: bold;

	background: var(--button-background-color);
	color: var(--button-foreground-color);
`;

export const ExpandingText = styled.div`
	margin: 10px 0;
	position: relative;

	.error-message {
		position: absolute;
		top: 5px;
		right: 5px;
	}

	animation-duration: 0.25s;
	animation-name: expand;
	animation-timing-function: ease;
	animation-fill-mode: forwards;

	@keyframes expand {
		from {
			height: 0px;
		}
		to {
			height: 25px;
		}
	}
`;

export const CheckboxRow = styled.div`
	padding: 20px 0 0 0;
`;
const positionDots = () => {
	requestAnimationFrame(() => {
		const $active = document.getElementsByClassName("active")[0];
		if ($active) {
			const $dots = document.getElementById("dots");
			if ($dots) $dots.style.top = `${$active.clientHeight - 30}px`;
		}
	});
};

export const Onboard = React.memo(function Onboard() {
	const dispatch = useDispatch();

	const NUM_STEPS = 1;
	const [currentStep, setCurrentStep] = useState(0);
	const [lastStep, setLastStep] = useState(0);
	const skip = () => setStep(currentStep + 1);
	const setStep = (step: number) => {
		if (step === NUM_STEPS) {
			setCurrentStep(0);
			dispatch(closePanel());
			return;
		}

		setLastStep(currentStep);
		setCurrentStep(step);
		setTimeout(() => scrollToTop(), 250);
	};

	const scrollToTop = () => {
		requestAnimationFrame(() => {
			const $container = document.getElementById("scroll-container");
			if ($container) $container.scrollTo({ top: 0, behavior: "smooth" });
		});
	};

	return (
		<>
			<div id="scroll-container" className="onboarding-page">
				<div className="standard-form">
					<fieldset className="form-body">
						<div className="border-bottom-box">
							<InviteTeammates className={"active"} skip={skip} unwrap={true} />
						</div>
					</fieldset>
				</div>
			</div>
		</>
	);
});

export const InviteTeammates = (props: { className: string; skip: Function; unwrap?: boolean }) => {
	const dispatch = useAppDispatch();

	const derivedState = useAppSelector((state: CodeStreamState) => {
		const user = state.users[state.session.userId!];
		const team =
			state.teams && state.context.currentTeamId
				? state.teams[state.context.currentTeamId]
				: undefined;
		const company = team ? state.companies && state.companies[team.companyId] : undefined;
		const dontSuggestInvitees =
			team && team.settings ? team.settings.dontSuggestInvitees || {} : {};
		const currentUserIsAdmin = currentUserIsAdminSelector(state);
		const domain = user.email?.split("@")[1].toLowerCase();

		return {
			providers: state.providers,
			dontSuggestInvitees,
			companyName: team ? state.companies[team.companyId]?.name : "your organization",
			companyId: team ? state.companies[team.companyId]?.id : null,
			teamMembers: team ? getTeamMembers(state) : [],
			domain,
			isWebmail: state.configs?.isWebmail,
			webviewFocused: state.context.hasFocus,
			pendingProtocolHandlerUrl: state.context.pendingProtocolHandlerUrl,
			currentUserIsAdmin,
			isNonCsOrg: company && !company.codestreamOnly,
		};
	}, shallowEqual);

	const [numInviteFields, setNumInviteFields] = useState(1);
	const [inviteEmailFields, setInviteEmailFields] = useState<string[]>([]);
	const [inviteEmailValidity, setInviteEmailValidity] = useState<boolean[]>(
		new Array(50).fill(true)
	);
	// Checkbox should be checked unless its a newrelic domain, for now
	const [allowDomainBasedJoining, setAllowDomainBasedJoining] = useState(
		derivedState.domain !== "newrelic.com"
	);
	const [sendingInvites, setSendingInvites] = useState(false);
	const [addSuggestedField, setAddSuggestedField] = useState<{ [email: string]: boolean }>({});
	const [suggestedInvitees, setSuggestedInvitees] = useState<any[]>([]);

	useDidMount(() => {
		if (derivedState.isNonCsOrg) {
			props.skip();
			return;
		}
		// if (derivedState.webviewFocused) {
		// 	HostApi.instance.track("Page Viewed", { "Page Name": "Invite Teammates - Onboarding" });
		// }
		getSuggestedInvitees();
	});

	const getSuggestedInvitees = async () => {
		const result = await HostApi.instance.send(GetLatestCommittersRequestType, {});
		const committers = result ? result.scm : undefined;
		if (!committers) return;

		const { teamMembers, dontSuggestInvitees } = derivedState;
		const suggested: any[] = [];
		Object.keys(committers).forEach((email, index) => {
			// only show 15, list is too long for onboarding otherwise
			if (index > 14) return;
			if (email.match(/noreply/)) return;
			// If whitespace in domain, invalid email
			if (email.match(/.*(@.* .+)/)) return;
			// If contains @ and ends in .local is invalid email
			if (email.match(/.*(@.*\.local)$/)) return;
			// Will check for spaces not surrounded by quotes. Will still
			// allow some emails through that shouldn't be through, but
			// won't block any that shouldn't be
			if (email.match(/(?<!"") (?!"")(?=((?:[^"]*"){2})*[^"]*$)/)) return;
			// If no period in domain, invalid email
			if (!email.match(/.*@.*\..*/)) return;
			if (teamMembers?.find(user => user.email === email)) return;
			if (dontSuggestInvitees[email.replace(/\./g, "*")]) return;
			suggested.push({ email, fullName: committers[email] || email });
		});
		setSuggestedInvitees(suggested);
		if (suggested.length === 0) setNumInviteFields(3);
	};

	const addInvite = () => {
		setNumInviteFields(numInviteFields + 1);
		setTimeout(() => positionDots(), 250);
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
			// HostApi.instance.track("Teammate Invited", {
			// 	"Invitee Email Address": email,
			// 	"Invitation Method": method,
			// });
		}
	};

	const handleGetStarted = async () => {
		const { pendingProtocolHandlerUrl } = derivedState;

		setSendingInvites(true);

		let index = 0;
		while (index <= suggestedInvitees.length) {
			if (suggestedInvitees[index]) {
				const email = suggestedInvitees[index].email;
				if (addSuggestedField[email]) await inviteEmail(email, "Onboarding Suggestion");
			}
			index++;
		}

		index = 0;
		while (index <= numInviteFields) {
			await inviteEmail(inviteEmailFields[index], "Onboarding");
			index++;
		}

		if (allowDomainBasedJoining && displayDomainJoinCheckbox()) {
			updateCompanyRequestType();
		}

		if (pendingProtocolHandlerUrl) {
			await dispatch(handlePendingProtocolHandlerUrl(pendingProtocolHandlerUrl));
			dispatch(clearPendingProtocolHandlerUrl());
			dispatch(clearForceRegion());
		}

		setSendingInvites(false);

		props.skip();
	};

	const updateCompanyRequestType = async () => {
		const { domain, companyId } = derivedState;

		if (domain && companyId) {
			try {
				await HostApi.instance.send(UpdateCompanyRequestType, {
					companyId,
					domainJoining: allowDomainBasedJoining ? [domain] : [],
				});
				// HostApi.instance.track("Domain Joining Enabled");
			} catch (ex) {
				console.error(ex);
				return;
			}
		}
	};

	const displayDomainJoinCheckbox = () => {
		const { domain, isWebmail, currentUserIsAdmin } = derivedState;

		return currentUserIsAdmin && domain && isWebmail === false;
	};

	const component = () => {
		const { domain } = derivedState;
		if (derivedState.isNonCsOrg) return <div></div>;

		return (
			<div className="body">
				<h3>Invite your teammates</h3>
				{suggestedInvitees.length === 0 && (
					<p className="explainer">We recommend exploring CodeStream with your team</p>
				)}
				<div>
					{suggestedInvitees.length > 0 && (
						<>
							<p className="explainer left">
								Discuss code and investigate errors with your teammates. Here are some suggestions
								based on your git history.
							</p>
							{suggestedInvitees.map(user => {
								return (
									<Checkbox
										name={user.email}
										checked={addSuggestedField[user.email]}
										onChange={() => {
											setAddSuggestedField({
												...addSuggestedField,
												[user.email]: !addSuggestedField[user.email],
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
						<Link onClick={addInvite}>+ Add another</Link>
					</LinkRow>

					{displayDomainJoinCheckbox() && (
						<CheckboxRow>
							<Checkbox
								name="allow-domain-based-joining"
								checked={allowDomainBasedJoining}
								onChange={(value: boolean) => {
									setAllowDomainBasedJoining(!allowDomainBasedJoining);
								}}
							>
								Let anyone with the <b>{domain}</b> email address join this organization
							</Checkbox>
						</CheckboxRow>
					)}

					<div>
						<Legacy.default
							className="row-button"
							loading={sendingInvites}
							onClick={handleGetStarted}
						>
							<div className="copy">Get Started</div>
							<Icon name="chevron-right" />
						</Legacy.default>
					</div>
				</div>
			</div>
		);
	};
	if (props.unwrap) {
		return component();
	}
	return <Step className={props.className}>{component()}</Step>;
};
