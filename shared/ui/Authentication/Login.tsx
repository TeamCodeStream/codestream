import { EnvironmentHost } from "@codestream/protocols/agent";
import React from "react";
import { FormattedMessage } from "react-intl";
import { connect } from "react-redux";
import { setEnvironment } from "@codestream/webview/store/session/thunks";
import { CodeStreamState } from "../store";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { supportsSSOSignIn } from "../store/configs/slice";
import {
	clearForceRegion,
	goToForgotPassword,
	goToNewRelicSignup,
	goToNewUserEntry,
	goToOktaConfig,
} from "../store/context/actions";
import Button from "../Stream/Button";
import Icon from "../Stream/Icon";
import { ModalRoot } from "../Stream/Modal"; // HACK ALERT: including this component is NOT the right way
import { authenticate, generateLoginCode, startIDESignin, startSSOSignin } from "./actions";
import { HostApi } from "../webview-api";

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
	goToNewRelicSignup: typeof goToNewRelicSignup;
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
		if (this.props.isInVSCode) {
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

		const handleClickNewRelicSignup = e => {
			e.preventDefault();
			e.stopPropagation();

			const { email } = this.state;

			HostApi.instance.track("Signup Method Selected", {
				Provider: "New Relic",
				Email: email,
			});

			//@TODO: Change to idp signin page event
			//this.props.goToNewRelicSignup({});
			this.props.startSSOSignin("newrelicidp");
		};

		return (
			<div id="login-page" className="onboarding-page">
				<ModalRoot />
				<form className="standard-form">
					<fieldset className="form-body">
						{/* this.renderAccountMessage() */}
						<div id="controls">
							{this.props.supportsSSOSignIn && (
								<div className="border-bottom-box">
									<h3>Sign in to CodeStream with your New Relic account</h3>
									<Button className="row-button no-top-margin" onClick={handleClickNewRelicSignup}>
										<Icon name="newrelic" />
										<div className="copy">Sign in to New Relic</div>
										<Icon name="chevron-right" />
									</Button>
								</div>
							)}
						</div>
					</fieldset>
				</form>
				{/* @TODO: this might be no longer needed
				<form className="standard-form">
					<fieldset className="form-body">
						<div id="controls">
							<div className="border-bottom-box">
								{this.renderError()}
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

					</fieldset>
				</form>
				*/}
				<div className="footer">
					<p>
						<FormattedMessage id="login.noAccount" defaultMessage="Don't have an account?" />{" "}
						<a onClick={this.handleClickSignup}>
							<FormattedMessage id="login.signUp" defaultMessage="Sign Up" />
						</a>
					</p>
				</div>
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
		goToNewRelicSignup,
		setEnvironment,
		clearForceRegion,
	}
)(Login);

export { ConnectedLogin as Login };
