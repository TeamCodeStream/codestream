import cx from "classnames";
import React, { useCallback, useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { GetUserInfoRequestType, RegisterUserRequestType } from "@codestream/protocols/agent";
import { LoginResult } from "@codestream/protocols/api";
import styled from "styled-components";
import { isEmpty as _isEmpty } from "lodash-es";
import { CodeStreamState } from "../store";
import Button from "../Stream/Button";
import Icon from "../Stream/Icon";
import { Link } from "../Stream/Link";
// TODO: BRIAN FIX (remove this dependency)...

import { handleSelectedRegion, setSelectedRegion } from "@codestream/webview/store/session/thunks";
import { Loading } from "../Container/Loading";
import { logError } from "../logger";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { supportsSSOSignIn } from "../store/configs/slice";
import {
	goToCompanyCreation,
	goToEmailConfirmation,
	goToOldLogin,
	goToTeamCreation,
} from "../store/context/actions";
import { confirmPopup } from "../Stream/Confirm";
import { DropdownItem } from "../Stream/Dropdown";
import { ModalRoot } from "../Stream/Modal"; // HACK ALERT: including this component is NOT the right way
import Tooltip from "../Stream/Tooltip";
import { useAppDispatch, useAppSelector, useDidMount } from "../utilities/hooks";
import { HostApi, Server } from "../webview-api";
import { completeSignup, SignupType, startSSOSignin } from "./actions";
import { PresentTOS } from "./PresentTOS";
import { TextInput } from "./TextInput";

const isPasswordValid = (password: string) =>
	password.length >= 8 &&
	Boolean(password.match(/[a-zA-Z]/)) &&
	Boolean(password.match(/[^a-zA-Z]/));
export const isEmailValid = (email: string) => {
	const emailRegex = new RegExp(
		"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
	);
	return email !== "" && emailRegex.test(email);
};
export const isUsernameValid = (username: string) =>
	new RegExp("^[-a-zA-Z0-9_.]{1,21}$").test(username);

const NoBorderBottomBox = styled.div`
	margin: 0 auto;
	padding: 20px;
	max-width: 420px;
	text-align: left;

	p {
		margin-top: 0.5em;
		color: var(--text-color-subtle);
	}

	h2,
	h3 {
		color: var(--text-color-highlight);
		margin: 0 0 0 0;
	}

	&::after {
		content: "";
		position: absolute;
		left: 0;
		right: 0;
		transform: translateY(19px);
		z-index: 2;
	}

	.or {
		display: inline-block;
		background: var(--sidebar-background);
		padding: 0 10px;
	}

	.app-or {
		display: inline-block;
		background: var(--app-background-color);
		padding: 0 10px;
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

	newOrg?: boolean; // indicates user is signing up with a new org
	joinCompanyId?: string; // indicates user is joining this org
	companyName?: string; // user will name the new org from this
}

export const Signup = (props: Props) => {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
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
			acceptedTOS: state.session.acceptedTOS,
			machineId: state.session.machineId || "0",
			webviewFocused: state.context.hasFocus,
			pendingProtocolHandlerQuerySource: state.context.pendingProtocolHandlerQuery?.src,
			environmentHosts,
			selectedRegion,
			forceRegion,
			supportsMultiRegion,
			originalEmail: props.email,
			pendingProtocolHandlerUrl: state.context.pendingProtocolHandlerUrl,
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

	let regionItems: DropdownItem[] | undefined;
	let forceRegionName: string | undefined;
	let selectedRegionName: string | undefined;

	// handleSelectedRegion handles setting a selected or default region in selectedRegion
	// Requiring selectedRegion makes sure <Dropdown> is not rendered before default region selected
	if (selectedRegion && supportsMultiRegion && environmentHosts && environmentHosts.length > 1) {
		regionItems = environmentHosts.map(host => ({
			key: host.shortName,
			label: host.name,
			action: () => {
				dispatch(setSelectedRegion(host.shortName));
			},
		}));

		if (forceRegion) {
			const forceHost = environmentHosts.find(host => host.shortName === forceRegion);
			if (forceHost) {
				forceRegionName = forceHost.name;
			}
		} else {
			const selectedHost = environmentHosts.find(host => host.shortName === selectedRegion);
			if (selectedHost) {
				selectedRegionName = selectedHost.name;
			}
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
			HostApi.instance.track("codestream/sign_in page_viewed", { event_type: "page_view" });
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
				companyName: props.companyName,
				joinCompanyId: props.joinCompanyId,
				originalEmail: derivedState.originalEmail,

				// for auto-joining teams
				commitHash: props.commitHash,
				repoId: props.repoId,
				teamId: props.commitHash ? props.teamId : undefined,
			};
			const { status, token } = await HostApi.instance.send(RegisterUserRequestType, attributes);

			const sendTelemetry = () => {
				HostApi.instance.track("Account Created", {
					email: email,
					"Auth Provider": "Email",
					"Git Email Match?": email === scmEmail,
					Source: derivedState.pendingProtocolHandlerQuerySource,
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
								className: "secondary",
							},
						],
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
							registrationParams: attributes,
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
							createdTeam: false,
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
				inviteCode: props.inviteCode,
			});
			setUnexpectedError(true);
			setIsSubmitting(false);
		}
	};

	const buildSignupInfo = (fromSignup = true, domain?) => {
		const info: any = {};

		if (props.inviteCode) {
			info.type = SignupType.JoinTeam;
			info.inviteCode = props.inviteCode;
		} else if (props.commitHash) {
			info.type = SignupType.JoinTeam;
			info.repoInfo = {
				teamId: props.teamId,
				commitHash: props.commitHash,
				repoId: props.repoId,
			};
		} else {
			info.type = SignupType.CreateTeam;
		}

		if (props.joinCompanyId) {
			info.joinCompanyId = props.joinCompanyId;
		}

		if (domain) {
			info.domain = domain;
		}

		info.fromSignup = fromSignup;
		return info;
	};

	const onClickNewRelicSignup = useCallback(
		(event: React.SyntheticEvent, domain?: string) => {
			event.preventDefault();
			dispatch(startSSOSignin("newrelicidp", buildSignupInfo(false, domain)));
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
							<NoBorderBottomBox>
								{(props.newOrg || props.joinCompanyId) && <h2>Create an account</h2>}
								{!props.newOrg && !props.joinCompanyId && (
									<>
										<h3>Sign in to see your data</h3>
										{!limitAuthentication && (
											<>
												<Button
													style={{ marginTop: "10px", marginBottom: "30px" }}
													className="row-button no-top-margin"
													onClick={event => onClickNewRelicSignup(event)}
												>
													<Icon name="newrelic" />
													<div className="copy">Sign in to New Relic</div>
													<Icon name="chevron-right" />
												</Button>
											</>
										)}
									</>
								)}
								{_isEmpty(derivedState.pendingProtocolHandlerUrl) && (
									<>
										<div style={{ marginBottom: "5px", textAlign: "center" }}>
											{(props.newOrg || props.joinCompanyId) && (
												<>How will you sign into this organization?</>
											)}
											{!props.newOrg && !props.joinCompanyId && (
												<>
													Don't have an account?{" "}
													<Link href="https://newrelic.com/signup?utm_source=codestream&utm_medium=programmatic&utm_campaign=global-ever-green-codestream-signin-form">
														Sign up for free.
													</Link>
												</>
											)}
										</div>

										{showOr && showEmailForm && (
											<div className="separator-label">
												<span className="or">
													<FormattedMessage id="signUp.or" defaultMessage="or" />
												</span>
											</div>
										)}
									</>
								)}
							</NoBorderBottomBox>
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
											{text => <Link href="https://one.newrelic.com/help-xp">{text}</Link>}
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
										baseBorder={true}
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
										baseBorder={true}
									/>
									<Tooltip
										placement="topRight"
										content={<FormattedMessage id="signUp.password.tip" />}
									>
										<small className={cx("explainer", { "error-message": !passwordValidity })}>
											<FormattedMessage id="signUp.password.help" />
										</small>
									</Tooltip>
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

					<p style={{ opacity: 0.5, fontSize: ".9em", textAlign: "center" }}>
						CodeStream Version {derivedState.pluginVersion}
					</p>
					{false && ( // enable me if you need CodeStream login
						<div>
							<h2>(Remove me when New Relic sign-in is fully supported)</h2>
							<p>
								Already have an account?{" "}
								<Link
									onClick={e => {
										e.preventDefault();
										dispatch(goToOldLogin());
									}}
								>
									Sign In
								</Link>
							</p>
						</div>
					)}
				</fieldset>
			</form>
		</div>
	);
};
