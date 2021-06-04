import React from "react";
import PropTypes from "prop-types";
import { IntlProvider } from "react-intl";
import { connect, Provider } from "react-redux";
import Stream from "../Stream/index";
import { UnauthenticatedRoutes } from "../Authentication";
import { logError } from "../logger";
import { HostApi } from "../webview-api";
import { ReloadWebviewRequestType, RestartRequestType } from "../ipc/webview.protocol";
import { Loading } from "./Loading";
import RoadBlock from "../Stream/RoadBlock";
import Dismissable from "../Stream/Dismissable";
import { SearchContextProvider } from "../Stream/SearchContextProvider";
import { upgradeRecommendedDismissed } from "../store/versioning/actions";
import { VersioningActionsType } from "../store/versioning/types";
import { apiUpgradeRecommendedDismissed } from "../store/apiVersioning/actions";
import { ApiVersioningActionsType } from "../store/apiVersioning/types";
import { errorDismissed } from "@codestream/webview/store/connectivity/actions";
import { ThemeProvider } from "styled-components";
import { darkTheme, createTheme } from "../src/themes";
import { closeAllPanels } from "../store/context/actions";
import { WebviewErrorRequestType } from "@codestream/protocols/agent";
import { PresentTOS } from "../Authentication/PresentTOS";

const mapStateToProps = state => {
	const team = state.teams[state.context.currentTeamId];

	return {
		bootstrapped: state.bootstrapped,
		connectivityError: state.connectivity.error,
		loggedIn: Boolean(state.session.userId),
		inMaintenanceMode: Boolean(state.session.inMaintenanceMode),
		company: team ? state.companies[team.companyId] : undefined,
		versioning: state.versioning,
		apiVersioning: state.apiVersioning,
		ide: state.ide && state.ide.name ? state.ide.name : undefined,
		serverUrl: state.configs.serverUrl,
		isOnPrem: state.configs.isOnPrem,
		offline: state.connectivity.offline,
		acceptedTOS: state.session.userId ? state.preferences.acceptedTOS : state.session.acceptedTOS
	};
};

const getIdeInstallationInstructions = props => {
	let specifics;
	if (props.ide) {
		if (props.ide === "VSC") {
			specifics = (
				<p>
					Go to the Extensions view via the activity bar and then look for the Update button in the
					CodeStream entry.
				</p>
			);
		} else if (props.ide === "JETBRAINS") {
			specifics = (
				<p>
					Look for the menu corresponding to your IDE name (e.g., IntelliJ) and select “Check for
					Updates” (or under the Help menu on Windows/Linux).
				</p>
			);
		} else if (props.ide === "VS") {
			specifics = (
				<p>
					Go to Extensions > Manage Extensions in VS 2019 (or Tools > Extensions and Updates in
					2017) and then select Updates in the left pane. Select CodeStream in the middle pane, and
					then click Update.
				</p>
			);
		} else if (props.ide === "ATOM") {
			specifics = (
				<p>
					In the Settings/Preferences page, select Packages and then look for the Update button in
					the CodeStream entry in the Installed Packages section.
				</p>
			);
		}
	}

	return specifics;
};

const Root = connect(mapStateToProps)(props => {
	if (props.connectivityError) {
		return (
			<Dismissable
				title="Can't connect"
				buttons={[
					{
						text: "Dismiss",
						onClick: e => {
							e.preventDefault();
							props.dispatch(errorDismissed());
						}
					},
					{
						text: "Retry",
						onClick: () => {
							HostApi.instance.send(RestartRequestType);
						}
					}
				]}
			>
				<p>
					We are unable to connect to CodeStream's backend. Please check your connectivity and try
					again.
				</p>
				<p>
					If you are behind a network proxy,{" "}
					<a href="https://docs.codestream.com/userguide/faq/proxy-support">
						turn on CodeStream's proxy support
					</a>
					.
				</p>
				<p>Error: {props.connectivityError.message}</p>
			</Dismissable>
		);
	}
	if (props.versioning && props.versioning.type === VersioningActionsType.UpgradeRequired)
		return (
			<RoadBlock title="Update Required">
				<p>
					We're all for vintage, but your version of CodeStream is simply too old! Please update to
					the latest version to continue. You may need to update your IDE as well if it isn't
					recent.
				</p>
				{getIdeInstallationInstructions(props)}
			</RoadBlock>
		);
	if (props.inMaintenanceMode)
		return (
			<RoadBlock title="Pardon the Interruption">
				<p>CodeStream is undergoing a quick update. We'll be right back!</p>
			</RoadBlock>
		);
	if (!props.bootstrapped) return <Loading />;
	if (
		props.apiVersioning &&
		props.apiVersioning.type === ApiVersioningActionsType.ApiUpgradeRequired
	)
		return (
			<RoadBlock title="API Server Out of Date">
				<p>
					Your on-prem installation of CodeStream is running an outdated version of the API server
					that is incompatible with this version of the CodeStream extension. Please ask your admin
					to update the API server.
				</p>
			</RoadBlock>
		);
	// if (!props.acceptedTOS) return <PresentTOS />;
	if (!props.loggedIn) return <UnauthenticatedRoutes />;
	if (props.company && props.company.plan === "TRIALEXPIRED") {
		const upgradeLink = `${props.serverUrl}/web/subscription/upgrade/${props.company.id}`;
		return (
			<RoadBlock title="Trial Expired">
				{props.isOnPrem ? (
					<p>
						Your free-trial period is over. If you would like to purchase CodeStream for your team,
						- please contact <a href="mailto:sales@codestream.com">sales@codestream.com</a> to
						discuss - service plans and pricing options.{" "}
					</p>
				) : (
					<p>
						Your free-trial period is over. <a href={upgradeLink}>Upgrade your plan</a> if you'd
						like to continue to use CodeStream.
					</p>
				)}
			</RoadBlock>
		);
	}
	if (props.versioning && props.versioning.type === VersioningActionsType.UpgradeRecommended)
		return (
			<Dismissable
				title="Update Suggested"
				buttons={[
					{
						text: "Dismiss",
						onClick: e => {
							e.preventDefault();
							props.dispatch(upgradeRecommendedDismissed());
						}
					}
				]}
			>
				<p>
					Your version of CodeStream is getting a little long in the tooth! We suggest that you
					update to the latest version.
				</p>
				{getIdeInstallationInstructions(props)}
			</Dismissable>
		);
	if (
		props.apiVersioning &&
		props.apiVersioning.type === ApiVersioningActionsType.ApiUpgradeRecommended
	) {
		const { missingCapabilities } = props.apiVersioning;
		let haveFeatures = "new features.";
		let missingFeatures = [];
		if (Object.keys(missingCapabilities).length > 0) {
			haveFeatures = "these features:";
			missingFeatures = Object.values(missingCapabilities);
		}
		return (
			<Dismissable
				title="API Server Update Suggested"
				buttons={[
					{
						text: "Dismiss",
						onClick: e => {
							e.preventDefault();
							props.dispatch(apiUpgradeRecommendedDismissed());
						}
					}
				]}
			>
				<p>
					Your on-prem installation of CodeStream has an API server that seems to be getting a bit
					long in the tooth. Please ask your admin to upgrade to the latest version to get access to{" "}
					{haveFeatures}
				</p>
				{missingFeatures.map(feature => {
					return (
						<p>
							&middot; {feature.description}
							{feature.url && " ("}
							{feature.url && (
								<a href="{feature.url}" target="_blank">
									{feature.url}
								</a>
							)}
							{feature.url && ")"}
						</p>
					);
				})}
			</Dismissable>
		);
	}

	return <Stream />;
});

export default class Container extends React.Component {
	state = { hasError: false, theme: darkTheme };
	_mutationObserver;

	static getDerivedStateFromError(error) {
		// note, the Error object itself doesn't seem to survive lsp
		HostApi.instance.send(WebviewErrorRequestType, {
			error: {
				message: error.message,
				stack: error.stack
			}
		});
		return { hasError: true };
	}

	static childContextTypes = {
		store: PropTypes.object
	};

	getChildContext() {
		return { store: this.props.store };
	}

	componentDidMount() {
		this.setState({ theme: createTheme() });
		this._mutationObserver = new MutationObserver(() => {
			this.setState({ theme: createTheme() });
		});
		this._mutationObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
	}

	componentDidCatch(error, info) {
		logError(`Exception caught in React component tree: ${error.message}`, {
			stacktrace: error.stack,
			info
		});
	}

	componentWillUnmount() {
		this._mutationObserver.disconnect();
	}

	handleClickReload = event => {
		event.preventDefault();

		// reset view state in case the error was tied to a piece of bad data
		this.props.store.dispatch(closeAllPanels());

		HostApi.instance.send(ReloadWebviewRequestType);
	};

	render() {
		const { i18n, store } = this.props;

		let content;
		if (this.state.hasError)
			content = (
				<div id="oops">
					<form className="standard-form">
						<fieldset className="form-body">
							<div className="border-bottom-box">
								<p>
									<h3>An unexpected error has occurred. </h3>
									<br />
									<a onClick={this.handleClickReload}>Click here</a> to reload.
									<br />
									<br />
									If the problem persists please contact{" "}
									<a href="mailto:support@codestream.com">support@codestream.com</a>
								</p>
							</div>
						</fieldset>
					</form>
				</div>
			);
		else content = <Root />;

		return (
			<IntlProvider locale={i18n.locale} messages={i18n.messages}>
				<Provider store={store}>
					<ThemeProvider theme={this.state.theme}>
						<SearchContextProvider>{content}</SearchContextProvider>
					</ThemeProvider>
				</Provider>
			</IntlProvider>
		);
	}
}
