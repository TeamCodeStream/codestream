import React, { Component } from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import { closePanel } from "./actions";
import { configureProvider, connectProvider } from "../store/providers/actions";
import CancelButton from "./CancelButton";
import Button from "./Button";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";
import UrlInputComponent from "@codestream/webview/Stream/UrlInputComponent";
import { normalizeUrl } from "@codestream/webview/utilities/urls";

export class ConfigureEnterprisePanel extends Component {
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

	componentDidUpdate() {}

	onSubmit = async e => {
		e.preventDefault();
		if (this.isFormInvalid()) return;
		const { providerId } = this.props;
		const { token, baseUrl } = this.state;

		// configuring is as good as connecting, since we are letting the user
		// set the access token
		this.props.configureProvider(
			providerId,
			{ baseUrl: normalizeUrl(baseUrl), token },
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
		if (tokenTouched || formTouched) {
			if (token.length === 0) return <small className="error-message">Required</small>;
		}
	};

	tabIndex = () => {};

	isFormInvalid = () => {
		return this.state.baseUrl.length === 0 || this.state.token.length === 0 || !this.state.baseUrlValid
	};

	render() {
		const inactive = false;
		const { scopes } = this.props.provider;
		const { displayName, urlPlaceholder, getUrl, helpUrl, versionMinimum, invalidHosts } = this.providerDisplay;
		const providerShortName = this.providerDisplay.shortDisplayName || displayName;
		return (
			<div className="panel configure-provider-panel">
				<form className="standard-form vscroll" onSubmit={this.onSubmit}>
					<div className="panel-header">
						<CancelButton onClick={this.props.closePanel} />
						<span className="panel-title">Configure {displayName}</span>
					</div>
					<fieldset className="form-body" disabled={inactive}>
						{getUrl && (
							<p style={{ textAlign: "center" }} className="explainer">
								Not a {displayName} customer yet? <a href={getUrl}>Get {displayName}</a>
							</p>
						)}
						{versionMinimum && (
							<p style={{ textAlign: "center" }} className="explainer">
								Requires {displayName} v12.10 or later.{" "}
								<a href="https://docs.newrelic.com/docs/codestream/troubleshooting/glsm-version/">
									Check your version
								</a>
								.
							</p>
						)}
						<br/>
						{this.renderError()}
						<div id="controls">
							<div id="configure-enterprise-controls" className="control-group">
								<UrlInputComponent
									providerShortName={providerShortName}
									invalidHosts={invalidHosts}
									tabIndex={this.tabIndex()}
									formTouched={this.state.formTouched}
									value={this.state.baseUrl}
									onChange={value => this.setState({ baseUrl: value })}
									onValidChange={valid => this.setState({baseUrlValid: valid})}
									placeholder={urlPlaceholder}/>
							</div>
							<div key="token" id="configure-enterprise-controls-token" className="control-group">
								<label>
									<strong>{providerShortName} Personal Access Token</strong>
								</label>
								<label>
									Please provide a <a href={helpUrl}>personal access token</a> we can use to access
									your {providerShortName} projects and issues.
									{scopes && scopes.length && (
										<span>
											&nbsp;Your PAT should have the following scopes: <b>{scopes.join(", ")}</b>.
										</span>
									)}
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
									id="configure-provider-access-token"
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

const mapStateToProps = ({ providers, ide }, ownProps) => {
	const provider = providers[ownProps.providerId];
	return { provider, isInVscode: ide.name === "VSC" };
};

export default connect(mapStateToProps, { closePanel, configureProvider, connectProvider })(
	injectIntl(ConfigureEnterprisePanel)
);
