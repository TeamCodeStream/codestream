import React, { useCallback, useState } from "react";
import cx from "classnames";
import { CodeStreamState } from "../store";
import { FormattedMessage } from "react-intl";
import Icon from "../Stream/Icon";
import Button from "../Stream/Button";
import { Link } from "../Stream/Link";
import {
	goToJoinTeam,
	goToNewUserEntry,
	goToEmailConfirmation,
	goToTeamCreation,
	goToOktaConfig
} from "../store/context/actions";
import { TextInput } from "./TextInput";
import { LoginResult } from "@codestream/protocols/api";
import { RegisterUserRequestType, GetUserInfoRequestType } from "@codestream/protocols/agent";
import { HostApi } from "../webview-api";
import { completeSignup, startSSOSignin, SignupType } from "./actions";
import { logError } from "../logger";
import { useDispatch, useSelector } from "react-redux";
import { CSText } from "../src/components/CSText";
import { useDidMount } from "../utilities/hooks";
import { Loading } from "../Container/Loading";
import { isOnPrem, supportsIntegrations } from "../store/configs/reducer";

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

interface Props {
	email?: string;
	teamName?: string;
	teamId?: string;
	inviteCode?: string;
	type?: SignupType;
}

export const Signup = (props: Props) => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { serverUrl } = state.configs;
		return {
			supportsIntegrations: supportsIntegrations(state.configs),
			oktaEnabled: isOnPrem(state.configs)
		};
	});
	const [email, setEmail] = useState(props.email || "");
	const [emailValidity, setEmailValidity] = useState(true);
	const [scmEmail, setScmEmail] = useState("");
	const [username, setUsername] = useState("");
	const [usernameValidity, setUsernameValidity] = useState(true);
	const [password, setPassword] = useState("");
	const [passwordValidity, setPasswordValidity] = useState(true);
	const [fullName, setFullName] = useState("");
	const [fullNameValidity, setFullNameValidity] = useState(true);
	const [companyName, setCompanyName] = useState("");
	const [companyNameValidity, setCompanyNameValidity] = useState(true);
	const [isLoading, setIsLoading] = useState(false);
	const [unexpectedError, setUnexpectedError] = useState(false);
	const [inviteConflict, setInviteConflict] = useState(false);
	const [bootstrapped, setBootstrapped] = useState(true);

	const wasInvited = props.inviteCode !== undefined;

	const getUserInfo = async () => {
		const response = await HostApi.instance.send(GetUserInfoRequestType, {});
		// only set this if it exists, in case there is no git configured email
		// and the user was invited, in which case we'll use props.email
		// turn off the suggestion for now.....
		// if (response.email) setEmail(response.email);
		setScmEmail(response.email); // to track if they used our git-based suggestion
		setFullName(response.name);
		setUsername(response.username);
		setBootstrapped(true);
	};

	useDidMount(() => {
		getUserInfo();
	});

	const onValidityChanged = useCallback((field: string, validity: boolean) => {
		switch (field) {
			case "email": {
				setEmailValidity(validity);
				break;
			}
			case "username":
				setUsernameValidity(validity);
				break;
			case "password":
				setPasswordValidity(validity);
				break;
			case "fullName":
				setFullNameValidity(validity);
				break;
			case "companyName":
				setCompanyNameValidity(validity);
				break;
			default: {
			}
		}
	}, []);

	const onSubmit = async (event: React.SyntheticEvent) => {
		setInviteConflict(false);
		setUnexpectedError(false);
		event.preventDefault();
		if (isLoading) return; // prevent double-clicks

		onValidityChanged("email", isEmailValid(email));
		onValidityChanged("password", isPasswordValid(password));
		onValidityChanged("username", isUsernameValid(username));
		onValidityChanged("fullName", isNotEmpty(fullName));
		onValidityChanged("companyName", isNotEmpty(companyName));

		if (
			email === "" ||
			!emailValidity ||
			!usernameValidity ||
			password === "" ||
			!passwordValidity ||
			fullName === "" ||
			!fullNameValidity
			// (!wasInvited && (companyName === "" || !companyNameValidity))
		)
			return;
		setIsLoading(true);
		try {
			const attributes = {
				email,
				username,
				password,
				fullName,
				inviteCode: props.inviteCode,
				companyName: wasInvited ? undefined : companyName
			};
			const { status, token } = await HostApi.instance.send(RegisterUserRequestType, attributes);

			const sendTelemetry = () => {
				HostApi.instance.track("Account Created", {
					email: email,
					"Git Email Match?": email === scmEmail,
					"Changed Invite Email?": wasInvited ? email !== props.email : undefined
				});
			};

			switch (status) {
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
					setIsLoading(false);
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
			setIsLoading(false);
		}
	};

	const onClickGoBack = useCallback(
		(event: React.SyntheticEvent) => {
			event.preventDefault();
			switch (props.type) {
				case SignupType.JoinTeam: {
					// simplified the first panel to include joining a team
					// return dispatch(goToJoinTeam());
					return dispatch(goToNewUserEntry());
				}
				case SignupType.CreateTeam:
				default:
					return dispatch(goToNewUserEntry());
			}
		},
		[props.type]
	);

	const onClickGithubSignup = useCallback(
		(event: React.SyntheticEvent) => {
			event.preventDefault();
			HostApi.instance.track("Provider Auth Selected", {
				Provider: "GitHub"
			});
			const info = props.inviteCode
				? { type: SignupType.JoinTeam, inviteCode: props.inviteCode }
				: { type: SignupType.CreateTeam };
			return dispatch(startSSOSignin("github", { ...info, fromSignup: true }));
		},
		[props.type]
	);

	const onClickGitlabSignup = useCallback(
		(event: React.SyntheticEvent) => {
			event.preventDefault();
			HostApi.instance.track("Provider Auth Selected", {
				Provider: "GitLab"
			});
			const info = props.inviteCode
				? { type: SignupType.JoinTeam, inviteCode: props.inviteCode }
				: { type: SignupType.CreateTeam };
			return dispatch(startSSOSignin("gitlab", { ...info, fromSignup: true }));
		},
		[props.type]
	);

	const onClickBitbucketSignup = useCallback(
		(event: React.SyntheticEvent) => {
			event.preventDefault();
			HostApi.instance.track("Provider Auth Selected", {
				Provider: "Bitbucket"
			});
			const info = props.inviteCode
				? { type: SignupType.JoinTeam, inviteCode: props.inviteCode }
				: { type: SignupType.CreateTeam };
			return dispatch(startSSOSignin("bitbucket", { ...info, fromSignup: true }));
		},
		[props.type]
	);

	const onClickOktaSignup = useCallback(
		(event: React.SyntheticEvent) => {
			return dispatch(goToOktaConfig({ fromSignup: true, inviteCode: props.inviteCode }));
		},
		[props.type]
	);

	if (!bootstrapped) return <Loading />;

	return (
		<div className="onboarding-page">
			{derivedState.supportsIntegrations && (
				<form className="standard-form">
					<fieldset className="form-body" style={{ paddingTop: 0, paddingBottom: 0 }}>
						<div id="controls">
							<div className="border-bottom-box">
								<Button className="row-button no-top-margin" onClick={onClickGithubSignup}>
									<Icon name="mark-github" />
									<div className="copy">Sign Up with GitHub</div>
									<Icon name="chevron-right" />
								</Button>
								<Button className="row-button no-top-margin" onClick={onClickGitlabSignup}>
									<Icon name="gitlab" />
									<div className="copy">Sign Up with GitLab</div>
									<Icon name="chevron-right" />
								</Button>
								<Button className="row-button no-top-margin" onClick={onClickBitbucketSignup}>
									<Icon name="bitbucket" />
									<div className="copy">Sign Up with Bitbucket</div>
									<Icon name="chevron-right" />
								</Button>
								{derivedState.oktaEnabled && (
									<Button className="row-button no-top-margin" onClick={onClickOktaSignup}>
										<Icon name="okta" />
										<div className="copy">Sign Up with Okta</div>
										<Icon name="chevron-right" />
									</Button>
								)}
								<div className="separator-label">
									<span className="or">or</span>
								</div>
							</div>
						</div>
					</fieldset>
				</form>
			)}
			<form className="standard-form" onSubmit={onSubmit}>
				<fieldset className="form-body" style={{ paddingTop: 0, paddingBottom: 0 }}>
					<div className="border-bottom-box">
						<h3>Create an Account</h3>
						{wasInvited && (
							<React.Fragment>
								<br />
								<p>
									Create an account to join the <strong>{props.teamName}</strong> team.
								</p>
							</React.Fragment>
						)}
						<div id="controls">
							<div className="small-spacer" />
							{unexpectedError && (
								<div className="error-message form-error">
									<FormattedMessage
										id="error.unexpected"
										defaultMessage="Something went wrong! Please try again, or "
									/>
									<FormattedMessage id="contactSupport" defaultMessage="contact support">
										{text => <Link href="https://help.codestream.com">{text}</Link>}
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
							<div className="control-group">
								<label>
									<FormattedMessage id="signUp.username.label" />
								</label>
								<TextInput
									name="username"
									value={username}
									onChange={setUsername}
									onValidityChanged={onValidityChanged}
									validate={isUsernameValid}
								/>
								<small className={cx("explainer", { "error-message": !usernameValidity })}>
									<FormattedMessage id="signUp.username.help" />
								</small>
							</div>
							<div className="control-group">
								<label>
									<FormattedMessage id="signUp.fullName.label" />
								</label>
								<TextInput
									name="fullName"
									value={fullName}
									onChange={setFullName}
									required
									validate={isNotEmpty}
									onValidityChanged={onValidityChanged}
								/>
								{!fullNameValidity && <small className="explainer error-message">Required</small>}
							</div>
							{false && !wasInvited && (
								<div className="control-group">
									<label>
										<FormattedMessage id="signUp.companyName.label" />
									</label>
									<TextInput
										name="companyName"
										value={companyName}
										onChange={setCompanyName}
										required
										validate={isNotEmpty}
										onValidityChanged={onValidityChanged}
									/>
									{!companyNameValidity && (
										<small className="explainer error-message">Required</small>
									)}
								</div>
							)}

							<div className="small-spacer" />

							<Button className="row-button" onClick={onSubmit} loading={isLoading}>
								<Icon name="codestream" />
								<div className="copy">
									<FormattedMessage id="signUp.submitButton" />
								</div>
								<Icon name="chevron-right" />
							</Button>
						</div>
					</div>
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
							<Link onClick={onClickGoBack}>
								<p>{"< Back"}</p>
							</Link>
						</div>
					</div>
				</fieldset>
			</form>
		</div>
	);
};
