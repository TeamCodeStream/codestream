import React, { useCallback, useState } from "react";
import cx from "classnames";
import { CodeStreamState } from "../store";
import { FormattedMessage } from "react-intl";
import Icon from "../Stream/Icon";
import Button from "../Stream/Button";
import { Link } from "../Stream/Link";
import {
	goToNewUserEntry,
	goToEmailConfirmation,
	goToTeamCreation,
	goToOktaConfig,
	goToCompanyCreation,
	goToLogin
} from "../store/context/actions";
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
import { confirmPopup } from "../Stream/Confirm";

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
		const { serverUrl, isOnPrem, environment, isProductionCloud } = state.configs;
		let whichServer = isOnPrem ? serverUrl : "CodeStream's cloud service";
		if (!isProductionCloud) {
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
			webviewFocused: state.context.hasFocus
		};
	});
	const [email, setEmail] = useState(props.email || "");
	const [emailValidity, setEmailValidity] = useState(true);
	const [scmEmail, setScmEmail] = useState("");

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
		if (derivedState.webviewFocused)
			HostApi.instance.track("Page Viewed", { "Page Name": "Create Account" });
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
					"Git Email Match?": email === scmEmail
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
			logError(`Unexpected error during registration request: ${error}`, {
				email,
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
			<div id="confirm-root" />
			{derivedState.supportsSSOSignIn && showOauth && (
				<form className="standard-form">
					<fieldset className="form-body" style={{ paddingTop: 0, paddingBottom: 0 }}>
						<div id="controls">
							<div className="border-bottom-box">
								<h3>Create a CodeStream account, for free</h3>
								{(!limitAuthentication || authenticationProviders["github*com"]) && (
									<Button className="row-button no-top-margin" onClick={onClickGithubSignup}>
										<Icon name="mark-github" />
										<div className="copy">Sign Up with GitHub</div>
										<Icon name="chevron-right" />
									</Button>
								)}
								{(!limitAuthentication || authenticationProviders["gitlab*com"]) && (
									<Button className="row-button no-top-margin" onClick={onClickGitlabSignup}>
										<Icon name="gitlab" />
										<div className="copy">Sign Up with GitLab</div>
										<Icon name="chevron-right" />
									</Button>
								)}
								{(!limitAuthentication || authenticationProviders["bitbucket*org"]) && (
									<Button className="row-button no-top-margin" onClick={onClickBitbucketSignup}>
										<Icon name="bitbucket" />
										<div className="copy">Sign Up with Bitbucket</div>
										<Icon name="chevron-right" />
									</Button>
								)}
								{derivedState.oktaEnabled && (
									<Button className="row-button no-top-margin" onClick={onClickOktaSignup}>
										<Icon name="okta" />
										<div className="copy">Sign Up with Okta</div>
										<Icon name="chevron-right" />
									</Button>
								)}
								{showOr && (
									<div className="separator-label">
										<span className="or">or</span>
									</div>
								)}
							</div>
						</div>
					</fieldset>
				</form>
			)}
			<form className="standard-form" onSubmit={e => onSubmit(e, checkForWebmail)}>
				<fieldset className="form-body" style={{ paddingTop: 0, paddingBottom: 0 }}>
					{(!limitAuthentication || authenticationProviders["email"]) && (
						<div className="border-bottom-box">
							{wasInvited && (
								<p className="explainer">
									Create an account to join the <strong>{props.teamName}</strong> team.
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
										Invitation conflict.{" "}
										<FormattedMessage id="contactSupport" defaultMessage="Contact support">
											{text => <Link href="mailto:support@codestream.com">{text}</Link>}
										</FormattedMessage>
										.
									</div>
								)}
								<div className="control-group">
									<label>Work Email</label>
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
									{text => <Link href="https://codestream.com/privacy">{text}</Link>}
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
