import { setEnvironment } from "@codestream/webview/store/session/thunks";
import React from "react";
import { FormattedMessage } from "react-intl";
import { connect } from "react-redux";
import Icon from "../Stream/Icon";
import Button from "../Stream/Button";
import { authenticate, generateLoginCode, startSSOSignin, startIDESignin } from "./actions";
import { CodeStreamState } from "../store";
import {
	goToNewUserEntry,
	goToForgotPassword,
	goToOktaConfig,
	clearForceRegion,
} from "../store/context/actions";
import { supportsSSOSignIn } from "../store/configs/slice";
import { InlineMenu } from "../src/components/controls/InlineMenu";
import Tooltip from "../Stream/Tooltip";
import { ModalRoot } from "../Stream/Modal"; // HACK ALERT: including this component is NOT the right way
import { EnvironmentHost } from "../protocols/agent/agent.protocol";
import { TooltipIconWrapper } from "./Signup";
import { Dropdown } from "../Stream/Dropdown";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";

const isPasswordInvalid = password => password.length === 0;
const isEmailInvalid = email => {
	const emailRegex = new RegExp(
		"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
	);
	return email === "" || emailRegex.test(email) === false;
};

interface ConnectedProps {
	initialEmail?: string;
	supportsSSOSignIn?: boolean;
	oktaEnabled?: boolean;
	isInVSCode?: boolean;
	supportsVSCodeGithubSignin?: boolean;
	environmentHosts?: EnvironmentHost[];
	selectedRegion?: string;
	supportsMultiRegion?: boolean;
}

interface DispatchProps {
	authenticate: (
		...args: Parameters<typeof authenticate>
	) => ReturnType<ReturnType<typeof authenticate>>;
	generateLoginCode: (
		...args: Parameters<typeof generateLoginCode>
	) => ReturnType<ReturnType<typeof generateLoginCode>>;
	goToNewUserEntry: typeof goToNewUserEntry;
	startSSOSignin: (
		...args: Parameters<typeof startSSOSignin>
	) => ReturnType<ReturnType<typeof startSSOSignin>>;
	goToForgotPassword: typeof goToForgotPassword;
	goToOktaConfig: typeof goToOktaConfig;
	startIDESignin: typeof startIDESignin;
	setEnvironment: typeof setEnvironment;
	clearForceRegion: typeof clearForceRegion;
}

interface Props extends ConnectedProps, DispatchProps {}

interface State {
	email: string;
	password: string;
	passwordTouched: boolean;
	emailTouched: boolean;
	loading: boolean;
	error: string | undefined;
	activeLoginMode: "code" | "password";
}

class Login extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = {
			email: props.initialEmail || "",
			password: "",
			passwordTouched: false,
			emailTouched: false,
			loading: false,
			error: undefined,
			activeLoginMode: "code",
		};
	}

	onBlurPassword = () => this.setState({ passwordTouched: true });

	onBlurEmail = () => this.setState({ emailTouched: true });

	renderEmailError = () => {
		const { email, emailTouched } = this.state;
		if (isEmailInvalid(email) && emailTouched)
			return (
				<small className="error-message">
					<FormattedMessage id="login.email.invalid" />
				</small>
			);
		return;
	};

	renderPasswordHelp = () => {
		const { password, passwordTouched } = this.state;
		if (isPasswordInvalid(password) && passwordTouched) {
			return (
				<small className="error-message">
					<FormattedMessage id="login.password.required" />
				</small>
			);
		}
		return;
	};

	// renderAccountMessage = () => {
	// 	if (this.props.alreadySignedUp)
	// 		return (
	// 			<p>
	// 				<FormattedMessage id="login.alreadySignedUp" />
	// 			</p>
	// 		);
	// 	if (this.props.alreadyConfirmed)
	// 		return (
	// 			<p>
	// 				<FormattedMessage id="login.alreadyConfirmed" />
	// 			</p>
	// 		);
	// 	return;
	// };

	renderError = () => {
		if (this.state.error === "INVALID_CREDENTIALS")
			return (
				<div className="error-message form-error">
					<FormattedMessage id="login.invalid" />
				</div>
			);
		if (this.state.error === "UNKNOWN")
			return (
				<div className="error-message form-error">
					<FormattedMessage
						id="error.unexpected"
						defaultMessage="Something went wrong! Please try again, or "
					/>
					<a href="https://docs.newrelic.com/docs/codestream/">
						<FormattedMessage id="contactSupport" defaultMessage="contact support" />
					</a>
					.
				</div>
			);
		if (this.state.error) {
			return (
				<div className="error-message form-error">
					<FormattedMessage
						id="something-is-screwed"
						defaultMessage={this.state.error.toString()}
					/>{" "}
					<a href="https://docs.newrelic.com/docs/codestream/">
						<FormattedMessage id="contactSupport" defaultMessage="contact support" />
					</a>
					.
				</div>
			);
		}
		return;
	};

	isFormInvalid = () => {
		const { password, email } = this.state;
		return isPasswordInvalid(password) || isEmailInvalid(email);
	};

	submitCredentials = async event => {
		event.preventDefault();
		if (this.isFormInvalid()) {
			if (!(this.state.passwordTouched && this.state.emailTouched))
				this.setState({ emailTouched: true, passwordTouched: true });
			return;
		}
		const { password, email } = this.state;
		this.setState({ loading: true });
		try {
			await this.props.authenticate({ password, email });
		} catch (error) {
			this.setState({ loading: false });
			this.setState({ error });
		}
	};

	submitGenerateCode = async event => {
		event.preventDefault();
		const { email } = this.state;
		if (isEmailInvalid(email)) {
			if (!this.state.emailTouched) this.setState({ emailTouched: true });
			return;
		}
		this.setState({ loading: true });
		try {
			await this.props.generateLoginCode(email);
		} catch (error) {
			this.setState({ loading: false });
			this.setState({ error });
		}
	};

	handleClickSignup = event => {
		event.preventDefault();
		this.props.goToNewUserEntry();
	};

	handleClickGithubLogin = event => {
		event.preventDefault();
		if (this.props.isInVSCode && this.props.supportsVSCodeGithubSignin) {
			this.props.startIDESignin("github");
		} else {
			this.props.startSSOSignin("github");
		}
	};

	handleClickGitlabLogin = event => {
		event.preventDefault();
		this.props.startSSOSignin("gitlab");
	};

	handleClickBitbucketLogin = event => {
		event.preventDefault();
		this.props.startSSOSignin("bitbucket");
	};

	handleClickOktaLogin = event => {
		event.preventDefault();
		this.props.goToOktaConfig({});
	};

	handleClickSwitchToCodeMode = event => {
		event.preventDefault();
		this.setState({ activeLoginMode: "code" });
	};

	handleClickSwitchToPasswordMode = event => {
		event.preventDefault();
		this.setState({ activeLoginMode: "password" });
	};

	onClickForgotPassword = (event: React.SyntheticEvent) => {
		event.preventDefault();
		this.props.goToForgotPassword({ email: this.state.email });
	};

	setSelectedRegion = region => {
		if (this.props.environmentHosts) {
			const host = this.props.environmentHosts!.find(host => host.shortName === region);
			if (host) {
				this.props.setEnvironment(host.shortName, host.publicApiUrl);
			}
			this.props.clearForceRegion();
		}
	};

	render() {
		let regionItems,
			selectedRegionName = "";
		if (
			this.props.supportsMultiRegion &&
			this.props.environmentHosts &&
			this.props.environmentHosts.length > 1
		) {
			let usHost = this.props.environmentHosts.find(host =>
				host.shortName.match(/(^|[^a-zA-Z\d\s:])us($|[^a-zA-Z\d\s:])/)
			);
			if (!usHost) {
				usHost = this.props.environmentHosts[0];
			}
			regionItems = this.props.environmentHosts.map(host => ({
				key: host.shortName,
				label: host.name,
				action: () => this.setSelectedRegion(host.shortName),
			}));
			if (!this.props.selectedRegion && usHost) {
				this.props.setEnvironment(usHost.shortName, usHost.publicApiUrl);
			}
			if (this.props.selectedRegion) {
				const selectedHost = this.props.environmentHosts.find(
					host => host.shortName === this.props.selectedRegion
				);
				if (selectedHost) {
					selectedRegionName = selectedHost.name;
				} else if (usHost) {
					this.props.setEnvironment(usHost.shortName, usHost.publicApiUrl);
				}
			}
		}

		return (
			<div id="login-page" className="onboarding-page">
				<ModalRoot />
				<form className="standard-form">
					<fieldset className="form-body">
						{/* this.renderAccountMessage() */}
						<div id="controls">
							{this.props.supportsSSOSignIn && (
								<div className="border-bottom-box">
									<Button
										className="row-button zero-top-margin"
										onClick={this.handleClickGithubLogin}
									>
										<Icon name="mark-github" />
										<div className="copy">
											<FormattedMessage id="login.signGH" defaultMessage="Sign In with GitHub" />
										</div>
										<Icon name="chevron-right" />
									</Button>
									<Button
										className="row-button no-top-margin"
										onClick={this.handleClickGitlabLogin}
									>
										<Icon name="gitlab" />
										<div className="copy">
											<FormattedMessage id="login.signGL" defaultMessage="Sign In with GitLab" />
										</div>
										<Icon name="chevron-right" />
									</Button>
									<Button
										className="row-button no-top-margin"
										onClick={this.handleClickBitbucketLogin}
									>
										<Icon name="bitbucket" />
										<div className="copy">
											<FormattedMessage id="login.signBb" defaultMessage="Sign In with Bitbucket" />
										</div>
										<Icon name="chevron-right" />
									</Button>
									{this.props.oktaEnabled && (
										<Button
											className="row-button no-top-margin"
											onClick={this.handleClickOktaLogin}
										>
											<Icon name="okta" />
											<div className="copy">
												<FormattedMessage id="login.signOkta" defaultMessage="Sign In with Okta" />
											</div>
											<Icon name="chevron-right" />
										</Button>
									)}
									<div className="separator-label">
										<span className="or">
											<FormattedMessage id="login.or" defaultMessage="or" />
										</span>
									</div>
								</div>
							)}
						</div>
					</fieldset>
				</form>
				<form className="standard-form">
					<fieldset className="form-body">
						<div id="controls">
							<div className="border-bottom-box">
								{this.renderError()}
								<div id="email-controls" className="control-group">
									<label>
										<FormattedMessage id="login.email.label" />
									</label>
									<input
										id="login-input-email"
										className="input-text control"
										type="text"
										name="email"
										value={this.state.email}
										onChange={e => this.setState({ email: e.target.value })}
										onBlur={this.onBlurEmail}
										required={this.state.emailTouched}
									/>
									{this.renderEmailError()}
								</div>
								{this.state.activeLoginMode === "password" && (
									<>
										<div id="password-controls" className="control-group">
											<label>
												<FormattedMessage id="login.password.label" />
											</label>
											<input
												id="login-input-password"
												className="input-text"
												type="password"
												name="password"
												value={this.state.password}
												onChange={e => this.setState({ password: e.target.value })}
												onBlur={this.onBlurPassword}
												required={this.state.passwordTouched}
											/>
											{this.renderPasswordHelp()}
											{
												<div className="help-link">
													<a onClick={this.onClickForgotPassword}>
														<FormattedMessage id="login.forgotPassword" />
													</a>
												</div>
											}
										</div>

										<Button
											className="row-button"
											onClick={this.submitCredentials}
											loading={this.state.loading}
										>
											<Icon name="codestream" />
											<div className="copy">Sign in with Password</div>
											<Icon name="chevron-right" />
										</Button>
										<p>
											No password?{" "}
											<a onClick={this.handleClickSwitchToCodeMode}>Sign in with a code instead.</a>
										</p>
									</>
								)}
								{this.state.activeLoginMode === "code" && (
									<>
										<Button
											className="row-button"
											onClick={this.submitGenerateCode}
											loading={this.state.loading}
										>
											<Icon name="codestream" />
											<div className="copy">Sign in with Code</div>
											<Icon name="chevron-right" />
										</Button>
										<p>
											We’ll email you a code so you can sign in without a password. Or,{" "}
											<a onClick={this.handleClickSwitchToPasswordMode}>
												you can sign in manually.
											</a>
										</p>
									</>
								)}
								{regionItems && (
									<p>
										Trouble signing in? Make sure you're in the right region:
										<Dropdown
											selectedValue={selectedRegionName}
											items={regionItems}
											noModal={true}
										/>
										<Tooltip
											placement={"bottom"}
											title={`Select the region where your CodeStream organization is located.`}
										>
											<TooltipIconWrapper>
												<Icon name="question" />
											</TooltipIconWrapper>
										</Tooltip>
									</p>
								)}
							</div>
						</div>
						<div className="footer">
							<p>
								<FormattedMessage id="login.noAccount" defaultMessage="Don't have an account?" />{" "}
								<a onClick={this.handleClickSignup}>
									<FormattedMessage id="login.signUp" defaultMessage="Sign Up" />
								</a>
							</p>
						</div>
					</fieldset>
				</form>
			</div>
		);
	}
}

const ConnectedLogin = connect<ConnectedProps, any, any, CodeStreamState>(
	(state, props) => {
		const supportsMultiRegion = isFeatureEnabled(state, "multiRegion");
		return {
			initialEmail: props.email !== undefined ? props.email : state.configs.email,
			supportsSSOSignIn: supportsSSOSignIn(state.configs),
			oktaEnabled: state.configs.isOnPrem,
			isInVSCode: state.ide.name === "VSC",
			supportsVSCodeGithubSignin: state.capabilities.vsCodeGithubSignin,
			environmentHosts: state.configs.environmentHosts,
			selectedRegion: state.context.__teamless__?.selectedRegion,
			supportsMultiRegion,
		};
	},
	{
		authenticate,
		generateLoginCode,
		goToNewUserEntry,
		startSSOSignin,
		startIDESignin,
		goToForgotPassword,
		goToOktaConfig,
		setEnvironment,
		clearForceRegion,
	}
)(Login);

export { ConnectedLogin as Login };
