import React, { useCallback, useEffect, useState } from "react";
import cx from "classnames";
import { CodeStreamState } from "../store";
import { FormattedMessage } from "react-intl";
import Icon from "../Stream/Icon";
import Button from "../Stream/Button";
import { InlineMenu } from "../src/components/controls/InlineMenu";
import { Link } from "../Stream/Link";
// TODO: BRIAN FIX (remove this dependency)...
import { ModalRoot } from "../Stream/Modal"; // HACK ALERT: including this component is NOT the right way
import {
	goToNewUserEntry,
	goToEmailConfirmation,
	goToTeamCreation,
	goToOktaConfig,
	goToCompanyCreation,
	goToLogin,
	goToNewRelicSignup
} from "../store/context/actions";
import { handleSelectedRegion, setSelectedRegion } from "../store/session/actions";
import { TextInput } from "./TextInput";
import { LoginResult } from "@codestream/protocols/api";
import { RegisterUserRequestType, GetUserInfoRequestType } from "@codestream/protocols/agent";
import { HostApi } from "../webview-api";
import { completeSignup, startIDESignin, startSSOSignin, SignupType } from "./actions";
import { logError } from "../logger";
import { useDispatch, useSelector } from "react-redux";
import { useDidMount } from "../utilities/hooks";
import { Loading } from "../Container/Loading";
import { supportsSSOSignIn } from "../store/configs/reducer";
import { Server } from "../webview-api";
import { PresentTOS } from "./PresentTOS";
import Tooltip from "../Stream/Tooltip";
import { Dropdown } from "../Stream/Dropdown";
import { confirmPopup } from "../Stream/Confirm";
import styled from "styled-components";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";

const isPasswordValid = (password: string) => password.length >= 6;
export const isEmailValid = (email: string) => {
	const emailRegex = new RegExp(
		"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
	);
	return email !== "" && emailRegex.test(email);
};
export const isUsernameValid = (username: string) =>
	new RegExp("^[-a-zA-Z0-9_.]{1,21}$").test(username);

const isNotEmpty = s => s.length > 0;

const OnPremTooltipCopy = styled.span`
	color: var(--text-color-info);
	cursor: pointer;
`;

const OnPremWrapper = styled.div`
	padding: 5px 0 0 0;
	font-size: smaller;
	text-align: center;
`;

// all buttons container
const SignupButtonsContainer = styled.div`
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	margin: 0 0 10px 0;
`;

// single button container
const SignupButtonContainer = styled.div`
	@media (max-width: 351px) {
		width: 100%;
	}
	@media (min-width: 351px) {
		width: 49%;
	}
	.btn {
		padding: 5px 10px 5px 10px !important;
	}
	.icon:not(.spin) {
		display: inline-block !important;
	}
`;

export const TooltipIconWrapper = styled.span`
	position: relative;
	top: 1px;
`;

interface TeamAuthSettings {
	limitAuthentication: boolean;
	authenticationProviders: {
		[id: string]: boolean;
	};
}

interface Props {
	email?: string;
	teamName?: string;
	teamId?: string;
	inviteCode?: string;
	type?: SignupType;
	tosType?: string;

	/** the following attributes are for auto-joining teams */
	repoId?: string;
	commitHash?: string;
}

export const Signup = (props: Props) => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { serverUrl, isOnPrem, environment, isProductionCloud, environmentHosts } = state.configs;
		const { selectedRegion, forceRegion } = state.context.__teamless__ || {};
		const supportsMultiRegion = isFeatureEnabled(state, "multiRegion");
		let whichServer = isOnPrem ? serverUrl : "CodeStream's cloud service";
		if (!isProductionCloud || (environmentHosts || []).length > 1) {
			whichServer += ` (${environment.toUpperCase()})`;
		}

		return {
			pluginVersion: state.pluginVersion,
			whichServer,
			isOnPrem,
			supportsSSOSignIn: supportsSSOSignIn(state.configs),
			oktaEnabled: state.configs.isOnPrem,
			isInVSCode: state.ide.name === "VSC",
			supportsVSCodeGithubSignin: state.capabilities.vsCodeGithubSignin,
			acceptedTOS: state.session.acceptedTOS,
			machineId: state.session.machineId || "0",
			webviewFocused: state.context.hasFocus,
			pendingProtocolHandlerQuerySource: state.context.pendingProtocolHandlerQuery?.src,
			environmentHosts,
			selectedRegion,
			forceRegion,
			supportsMultiRegion
		};
	});

	const [email, setEmail] = useState(props.email || "");
	const [emailValidity, setEmailValidity] = useState(true);
	const [scmEmail, setScmEmail] = useState("");
	const [showEmailForm, setShowEmailForm] = useState<boolean>(false);

	const [password, setPassword] = useState("");
	const [passwordValidity, setPasswordValidity] = useState(true);

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isInitializing, setIsInitializing] = useState(false);
	const [unexpectedError, setUnexpectedError] = useState(false);
	const [inviteConflict, setInviteConflict] = useState(false);
	const [bootstrapped, setBootstrapped] = useState(true);
	const [limitAuthentication, setLimitAuthentication] = useState(false);
	const [authenticationProviders, setAuthenticationProviders] = useState({});
	const [checkForWebmail, setCheckForWebmail] = useState(true);
	const wasInvited = props.inviteCode !== undefined;

	const { environmentHosts, selectedRegion, forceRegion, supportsMultiRegion } = derivedState;

	useEffect(() => {
		dispatch(handleSelectedRegion());
	}, [environmentHosts, selectedRegion, forceRegion]);

	let regionItems, forceRegionName, selectedRegionName;
	if (supportsMultiRegion && environmentHosts && environmentHosts.length > 1) {
		regionItems = environmentHosts.map(host => ({
			key: host.shortName,
			label: host.name,
			action: () => {
				dispatch(setSelectedRegion(host.shortName));
			}
		}));

		if (forceRegion) {
			const forceHost = environmentHosts.find(host => host.shortName === forceRegion);
			if (forceHost) {
				forceRegionName = forceHost.name;
			}
		} else if (selectedRegion) {
			const selectedHost = environmentHosts.find(host => host.shortName === selectedRegion);
			if (selectedHost) {
				selectedRegionName = selectedHost.name;
			}
			// Set to first value in array if non of the above for default
		} else {
			selectedRegionName = environmentHosts[0]?.name;
		}
	}

	const getUserInfo = async () => {
		const response = await HostApi.instance.send(GetUserInfoRequestType, {});
		// only set this if it exists, in case there is no git configured email
		// and the user was invited, in which case we'll use props.email
		// turn off the suggestion for now.....
		// if (response.email) setEmail(response.email);
		setScmEmail(response.email); // to track if they used our git-based suggestion

		setBootstrapped(true);
	};

	const getTeamAuthInfo = async teamId => {
		setIsInitializing(true);
		try {
			const url = `/no-auth/teams/${teamId}/auth-settings`;
			const response = await Server.get<TeamAuthSettings>(url);
			if (response && response.limitAuthentication) {
				setLimitAuthentication(true);
				setAuthenticationProviders(response.authenticationProviders);
			}
		} catch (e) {
			console.warn("Error in getTeamAuthInfo: ", e);
		}
		setIsInitializing(false);
	};

	useDidMount(() => {
		getUserInfo();
		if (derivedState.webviewFocused) {
			HostApi.instance.track("Page Viewed", { "Page Name": "Create Account" });
		}
		if (props.teamId) getTeamAuthInfo(props.teamId);
	});

	const onValidityChanged = useCallback((field: string, validity: boolean) => {
		switch (field) {
			case "email": {
				setEmailValidity(validity);
				break;
			}
			case "password":
				setPasswordValidity(validity);
				break;
			default: {
			}
		}
	}, []);

	const onSubmit = async (event: React.SyntheticEvent, checkForWebmailArg?: boolean) => {
		setInviteConflict(false);
		setUnexpectedError(false);
		event.preventDefault();
		if (isSubmitting) return; // prevent double-clicks

		onValidityChanged("email", isEmailValid(email));
		onValidityChanged("password", isPasswordValid(password));

		if (
			email === "" ||
			!emailValidity ||
			password === "" ||
			!passwordValidity

			// (!wasInvited && (companyName === "" || !companyNameValidity))
		) {
			return;
		}

		setIsSubmitting(true);
		try {
			const attributes = {
				email,
				username: email.split("@")[0].replace(/\+/g, ""),
				password,
				inviteCode: props.inviteCode,
				checkForWebmail: checkForWebmailArg,

				// for auto-joining teams
				commitHash: props.commitHash,
				repoId: props.repoId,
				teamId: props.commitHash ? props.teamId : undefined
			};
			const { status, token } = await HostApi.instance.send(RegisterUserRequestType, attributes);

			const sendTelemetry = () => {
				HostApi.instance.track("Account Created", {
					email: email,
					"Git Email Match?": email === scmEmail,
					Source: derivedState.pendingProtocolHandlerQuerySource
				});
			};

			switch (status) {
				case LoginResult.WebMail: {
					setIsSubmitting(false);
					setCheckForWebmail(false);

					confirmPopup({
						title: "Work Email?",
						message:
							"Are you sure you don’t want to use a work email? It makes it easier for your teammates to connect with you on CodeStream.",
						centered: true,
						buttons: [
							{ label: "Change Email", className: "control-button" },
							{
								label: "Continue",
								action: e => {
									onSubmit(e, false);
								},
								className: "secondary"
							}
						]
					});

					break;
				}
				case LoginResult.Success: {
					sendTelemetry();
					dispatch(
						goToEmailConfirmation({
							confirmationType: "signup",
							email: attributes.email,
							teamId: props.teamId,
							registrationParams: attributes
						})
					);
					break;
				}
				case LoginResult.NotInCompany: {
					sendTelemetry();
					dispatch(goToCompanyCreation({ token, email: attributes.email }));
					break;
				}
				case LoginResult.NotOnTeam: {
					sendTelemetry();
					dispatch(goToTeamCreation({ token, email: attributes.email }));
					break;
				}
				case LoginResult.AlreadyConfirmed: {
					// because user was invited
					sendTelemetry();
					dispatch(
						completeSignup(attributes.email, token!, props.teamId!, {
							createdTeam: false
						})
					);
					break;
				}
				case LoginResult.InviteConflict: {
					setInviteConflict(true);
					setIsSubmitting(false);
					break;
				}
				default:
					throw status;
			}
		} catch (error) {
			logError(error, {
				detail: `Unexpected error during registration request`,
				email: email,
				inviteCode: props.inviteCode
			});
			setUnexpectedError(true);
			setIsSubmitting(false);
		}
	};

	// const onClickGoBack = useCallback(
	// 	(event: React.SyntheticEvent) => {
	// 		event.preventDefault();
	// 		switch (props.type) {
	// 			case SignupType.JoinTeam: {
	// 				// simplified the first panel to include joining a team
	// 				// return dispatch(goToJoinTeam());
	// 				return dispatch(goToNewUserEntry());
	// 			}
	// 			case SignupType.CreateTeam:
	// 			default:
	// 				return dispatch(goToNewUserEntry());
	// 		}
	// 	},
	// 	[props.type]
	// );

	const buildSignupInfo = () => {
		const info: any = { fronSignup: true };

		if (props.inviteCode) {
			info.type = SignupType.JoinTeam;
			info.inviteCode = props.inviteCode;
		} else if (props.commitHash) {
			info.type = SignupType.JoinTeam;
			info.repoInfo = {
				teamId: props.teamId,
				commitHash: props.commitHash,
				repoId: props.repoId
			};
		} else {
			info.type = SignupType.CreateTeam;
		}

		info.fromSignup = true;

		return info;
	};

	const onClickNewRelicSignup = useCallback(
		(event: React.SyntheticEvent) => {
			event.preventDefault();
			HostApi.instance.track("Provider Auth Selected", {
				Provider: "New Relic"
			});
			dispatch(goToNewRelicSignup({}));
		},
		[props.type]
	);

	const onClickGithubSignup = useCallback(
		(event: React.SyntheticEvent) => {
			event.preventDefault();
			HostApi.instance.track("Provider Auth Selected", {
				Provider: "GitHub"
			});
			if (derivedState.isInVSCode && derivedState.supportsVSCodeGithubSignin) {
				return dispatch(startIDESignin("github", buildSignupInfo()));
			} else {
				return dispatch(startSSOSignin("github", buildSignupInfo()));
			}
		},
		[props.type]
	);

	const onClickGitlabSignup = useCallback(
		(event: React.SyntheticEvent) => {
			event.preventDefault();
			HostApi.instance.track("Provider Auth Selected", {
				Provider: "GitLab"
			});
			return dispatch(startSSOSignin("gitlab", buildSignupInfo()));
		},
		[props.type]
	);

	const onClickBitbucketSignup = useCallback(
		(event: React.SyntheticEvent) => {
			event.preventDefault();
			HostApi.instance.track("Provider Auth Selected", {
				Provider: "Bitbucket"
			});
			return dispatch(startSSOSignin("bitbucket", buildSignupInfo()));
		},
		[props.type]
	);

	const onClickOktaSignup = useCallback(
		(event: React.SyntheticEvent) => {
			return dispatch(goToOktaConfig({ fromSignup: true, inviteCode: props.inviteCode }));
		},
		[props.type]
	);

	const onClickEmailSignup = useCallback(
		(event: React.SyntheticEvent) => {
			event.preventDefault();
			setShowEmailForm(true);
		},
		[props.type]
	);

	if (!bootstrapped || isInitializing) return <Loading />;

	const showOr =
		!limitAuthentication ||
		(authenticationProviders["email"] &&
			(authenticationProviders["github*com"] ||
				authenticationProviders["gitlab*com"] ||
				authenticationProviders["bitbucket*org"]));
	const showOauth =
		!limitAuthentication ||
		authenticationProviders["github*com"] ||
		authenticationProviders["gitlab*com"] ||
		authenticationProviders["bitbucket*org"];

	if (!derivedState.acceptedTOS && props.tosType && props.tosType === "Interstitial")
		return <PresentTOS />;

	return (
		<div className="onboarding-page">
			<ModalRoot />
			<div id="confirm-root" />
			{derivedState.supportsSSOSignIn && showOauth && (
				<form className="standard-form">
					<fieldset className="form-body" style={{ paddingTop: 0, paddingBottom: 0 }}>
						<div id="controls">
							<div className="border-bottom-box">
								<h3>Create a CodeStream account, for free</h3>
								<br />
								{regionItems && !forceRegionName && (
									<>
										Region:{" "}
										<Dropdown
											selectedValue={selectedRegionName}
											items={regionItems}
											noModal={true}
										/>
										<Tooltip
											placement={"bottom"}
											title={`Select the region where your CodeStream data should be stored.`}
										>
											<TooltipIconWrapper>
												<Icon name="question" />
											</TooltipIconWrapper>
										</Tooltip>
									</>
								)}
								{forceRegionName && <>Region: {forceRegionName}</>}
								<SignupButtonsContainer>
									{!limitAuthentication && (
										<SignupButtonContainer>
											<Button className="row-button no-top-margin" onClick={onClickNewRelicSignup}>
												<Icon name="newrelic" />
												<div className="copy">New Relic</div>
												<Icon name="chevron-right" />
											</Button>
										</SignupButtonContainer>
									)}
									{(!limitAuthentication || authenticationProviders["github*com"]) && (
										<SignupButtonContainer>
											<Button className="row-button no-top-margin" onClick={onClickGithubSignup}>
												<Icon name="mark-github" />
												<div className="copy">GitHub</div>
												<Icon name="chevron-right" />
											</Button>
										</SignupButtonContainer>
									)}
									{(!limitAuthentication || authenticationProviders["gitlab*com"]) && (
										<SignupButtonContainer>
											<Button className="row-button no-top-margin" onClick={onClickGitlabSignup}>
												<Icon name="gitlab" />
												<div className="copy">GitLab</div>
												<Icon name="chevron-right" />
											</Button>
										</SignupButtonContainer>
									)}
									{(!limitAuthentication || authenticationProviders["bitbucket*org"]) && (
										<SignupButtonContainer>
											<Button className="row-button no-top-margin" onClick={onClickBitbucketSignup}>
												<Icon name="bitbucket" />
												<div className="copy">Bitbucket</div>
												<Icon name="chevron-right" />
											</Button>
										</SignupButtonContainer>
									)}
									{derivedState.oktaEnabled && (
										<SignupButtonContainer>
											<Button className="row-button no-top-margin" onClick={onClickOktaSignup}>
												<Icon name="okta" />
												<div className="copy">Okta</div>
												<Icon name="chevron-right" />
											</Button>
										</SignupButtonContainer>
									)}
									{(!limitAuthentication || authenticationProviders["email"]) && !showEmailForm && (
										<SignupButtonContainer>
											<Button className="row-button no-top-margin" onClick={onClickEmailSignup}>
												<Icon name="codestream" />
												<div className="copy">Email</div>
												<Icon name="chevron-right" />
											</Button>
										</SignupButtonContainer>
									)}
								</SignupButtonsContainer>
								<OnPremWrapper id={`on-prem-wrapper`}>
									Codestream supports on-prem code hosts as well. {` `}
									<Tooltip
										key="on-prem"
										title={`CodeStream supports both cloud and on-prem versions of GitHub, 
										GitLab and Bitbucket. However, only the cloud versions are available 
										to use for CodeStream authentication. If you use an on-prem version of 
										these services, sign up for CodeStream using a different method and then 
										connect to your code host from the Integrations page in CodeStream.`}
										placement="bottom"
									>
										<OnPremTooltipCopy>Learn More</OnPremTooltipCopy>
									</Tooltip>
								</OnPremWrapper>

								{showOr && showEmailForm && (
									<div className="separator-label">
										<span className="or">
											<FormattedMessage id="signUp.or" defaultMessage="or" />
										</span>
									</div>
								)}
							</div>
						</div>
					</fieldset>
				</form>
			)}
			<form className="standard-form" onSubmit={e => onSubmit(e, checkForWebmail)}>
				<fieldset className="form-body" style={{ paddingTop: 0, paddingBottom: 0 }}>
					{(!limitAuthentication || authenticationProviders["email"]) && showEmailForm && (
						<div className="border-bottom-box">
							{wasInvited && (
								<p className="explainer">
									<FormattedMessage
										id="signUp.joinTeam"
										defaultMessage={`Create an account to join the <strong>${props.teamName}</strong> team.`}
									/>
								</p>
							)}
							{!wasInvited && <div className="small-spacer" />}
							<div id="controls">
								{unexpectedError && (
									<div className="error-message form-error">
										<FormattedMessage
											id="error.unexpected"
											defaultMessage="Something went wrong! Please try again, or "
										/>
										<FormattedMessage id="contactSupport" defaultMessage="contact support">
											{text => (
												<Link href="https://docs.newrelic.com/docs/codestream/">{text}</Link>
											)}
										</FormattedMessage>
										.
									</div>
								)}
								{inviteConflict && (
									<div className="error-message form-error">
										<FormattedMessage id="signUp.conflict" defaultMessage="Invitation conflict." />{" "}
										<FormattedMessage id="contactSupport" defaultMessage="Contact support">
											{text => <Link href="mailto:support@codestream.com">{text}</Link>}
										</FormattedMessage>
										.
									</div>
								)}
								<div className="control-group">
									<label>
										<FormattedMessage id="signUp.workEmail" defaultMessage="Work Email" />
									</label>
									<TextInput
										name="email"
										value={email}
										onChange={setEmail}
										onValidityChanged={onValidityChanged}
										validate={isEmailValid}
										required
									/>
									{!emailValidity && (
										<small className="explainer error-message">
											<FormattedMessage id="signUp.email.invalid" />
										</small>
									)}
								</div>
								<div className="control-group">
									<label>
										<FormattedMessage id="signUp.password.label" />
									</label>
									<TextInput
										type="password"
										name="password"
										value={password}
										onChange={setPassword}
										validate={isPasswordValid}
										onValidityChanged={onValidityChanged}
										required
									/>
									<small className={cx("explainer", { "error-message": !passwordValidity })}>
										<FormattedMessage id="signUp.password.help" />
									</small>
								</div>

								<div className="small-spacer" />

								<Button
									className="row-button"
									onClick={e => onSubmit(e, checkForWebmail)}
									loading={isSubmitting}
								>
									<Icon name="codestream" />
									<div className="copy">
										<FormattedMessage id="signUp.submitButton" />
									</div>
									<Icon name="chevron-right" />
								</Button>
							</div>
						</div>
					)}
					<div id="controls">
						<div className="footer">
							<small className="fine-print">
								<FormattedMessage id="signUp.legal.start" />{" "}
								<FormattedMessage id="signUp.legal.terms">
									{text => <Link href="https://codestream.com/terms">{text}</Link>}
								</FormattedMessage>{" "}
								<FormattedMessage id="and" />{" "}
								<FormattedMessage id="signUp.legal.privacyPolicy">
									{text => (
										<Link href="https://newrelic.com/termsandconditions/privacy">{text}</Link>
									)}
								</FormattedMessage>
							</small>

							<div>
								<p>
									Already have an account?{" "}
									<Link
										onClick={e => {
											e.preventDefault();
											dispatch(goToLogin());
										}}
									>
										Sign In
									</Link>
								</p>
								<p style={{ opacity: 0.5, fontSize: ".9em", textAlign: "center" }}>
									CodeStream Version {derivedState.pluginVersion}
									<br />
									Connected to {derivedState.whichServer}.
								</p>
							</div>
						</div>
					</div>
				</fieldset>
			</form>
		</div>
	);
};
