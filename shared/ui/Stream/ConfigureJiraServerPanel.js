import React, { Component } from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import { closePanel, openPanel } from "./actions";
import { configureProvider } from "../store/providers/actions";
import { setIssueProvider } from "../store/context/actions";
import CancelButton from "./CancelButton";
import Button from "./Button";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";
import UrlInputComponent from "@codestream/webview/Stream/UrlInputComponent";
import { normalizeUrl } from "@codestream/webview/utilities/urls";

export class ConfigureJiraServerPanel extends Component {
	constructor(props) {
		super(props);
		const { name } = props.provider;
		this.providerDisplay = PROVIDER_MAPPINGS[name];
	}

	initialState = {
		baseUrl: "",
		baseUrlValid: false,
		token: "",
		tokenTouched: false,
		formTouched: false
	};

	state = this.initialState;

	componentDidMount() {
		const el = document.getElementById("configure-provider-initial-input");
		el && el.focus();
	}

	onSubmit = e => {
		e.preventDefault();
		if (this.isFormInvalid()) return;
		const { providerId } = this.props;
		const { token, baseUrl } = this.state;

		// configuring is as good as connecting, since we are letting the user
		// set the access token ... sending the fourth argument as true here lets the
		// configureProvider function know that they can mark Kora as connected as soon
		// as the access token entered by the user has been saved to the server
		this.props.configureProvider(
			providerId,
			{ token, baseUrl: normalizeUrl(baseUrl) },
			true,
			this.props.originLocation
		);

		this.props.closePanel();
	};

	renderError = () => {};

	onBlurToken = () => {
		this.setState({ tokenTouched: true });
	};

	renderTokenHelp = () => {
		const { token, tokenTouched, formTouched } = this.state;
		if (tokenTouched || formTouched)
			if (token.length === 0) return <small className="error-message">Required</small>;
	};

	tabIndex = () => {};

	isFormInvalid = () => {
		return this.state.baseUrl.length === 0 || this.state.token.length === 0 || !this.state.baseUrlValid;
	};

	render() {
		const inactive = false;
		const { displayName, urlPlaceholder, invalidHosts } = this.providerDisplay;
		const providerShortName = this.providerDisplay.shortDisplayName || displayName;
		return (
			<div className="panel configure-provider-panel">
				<form className="standard-form vscroll" onSubmit={this.onSubmit}>
					<div className="panel-header">
						<CancelButton onClick={this.props.closePanel} />
						<span className="panel-title">Connect to {displayName}</span>
					</div>
					<fieldset className="form-body" disabled={inactive}>
						<p style={{ textAlign: "center" }} className="explainer">
							 Requires Jira Server v8.14.0 or later.&nbsp;
							   <a href="https://docs.newrelic.com/docs/codestream/troubleshooting/jira-server-version/">Check your version.</a>
						</p>
						<br />
						{this.renderError()}
						<div id="controls">
							<div id="configure-jira-controls" className="control-group">
								<UrlInputComponent
									providerShortName={providerShortName}
									invalidHosts={invalidHosts}
									tabIndex={this.tabIndex()}
									formTouched={this.state.formTouched}
									onChange={value => this.setState({ baseUrl: value })}
									onValidChange={valid => this.setState({baseUrlValid: valid})}
									placeholder={urlPlaceholder}/>
							</div>
							<br />
							<div id="token-controls" className="control-group">
								<label>
									<strong>{displayName} API token</strong>
								</label>
								<label>
									Please provide an{" "}
									<a href="https://confluence.atlassian.com/enterprise/using-personal-access-tokens-1026032365.html">
										API token
									</a>{" "}
									we can use to access your Jira Server projects and issues.
								</label>
								<input
									className="input-text control"
									type="password"
									name="token"
									tabIndex={this.tabIndex()}
									value={this.state.token}
									onChange={e => this.setState({ token: e.target.value })}
									onBlur={this.onBlurToken}
									required={this.state.tokenTouched || this.state.formTouched}
								/>
								{this.renderTokenHelp()}
							</div>
							<div className="button-group">
								<Button
									id="save-button"
									className="control-button"
									tabIndex={this.tabIndex()}
									type="submit"
									loading={this.state.loading}
								>
									Submit
								</Button>
								<Button
									id="discard-button"
									className="control-button cancel"
									tabIndex={this.tabIndex()}
									type="button"
									onClick={this.props.closePanel}
								>
									Cancel
								</Button>
							</div>
						</div>
					</fieldset>
				</form>
			</div>
		);
	}
}

const mapStateToProps = ({ providers, users, session }, ownProps) => {
	const currentUser = users[session.userId];
	const provider = providers[ownProps.providerId];
	return { provider, currentUser };
};

export default connect(mapStateToProps, {
	closePanel,
	configureProvider,
	openPanel,
	setIssueProvider
})(injectIntl(ConfigureJiraServerPanel));
