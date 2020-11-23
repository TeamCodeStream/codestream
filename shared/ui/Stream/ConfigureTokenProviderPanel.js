import React, { Component } from "react";
import { injectIntl } from "react-intl";
import { connect } from "react-redux";
import { closePanel } from "./actions";
import { configureProvider } from "../store/providers/actions";
import CancelButton from "./CancelButton";
import Button from "./Button";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";
import { Link } from "../Stream/Link";

export class ConfigureTokenProviderPanel extends Component {
	initialState = {
		token: "",
		tokenTouched: false,
		formTouched: false
	};

	state = this.initialState;

	focusInput() {

		const el = document.getElementById("configure-provider-access-token");
		el && el.focus();
	}

	componentDidMount() {
		this.focusInput();
	}

	componentDidUpdate() {}

	onSubmit = async e => {
		e.preventDefault();
		if (this.isFormInvalid()) return;
		const { providerId } = this.props;
		const { token } = this.state;

		// configuring is as good as connecting, since we are letting the user
		// set the access token
console.warn('CONFIGURING PROVIDER...');
		this.props.configureProvider(
			providerId,
			{ token },
			true,
			this.props.originLocation
		);
console.warn('CLOSE THE PANEL...');
		this.props.closePanel();
console.warn('PANEL CLOSED');
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
		return this.state.token.length === 0;
	};

	render() {
		const { providerId } = this.props;
		const inactive = false;
		const { name, scopes } = this.props.providers[providerId] || {};
		const providerName = PROVIDER_MAPPINGS[name] ? PROVIDER_MAPPINGS[name].displayName : "";
		const providerShortName = PROVIDER_MAPPINGS[name]
			? PROVIDER_MAPPINGS[name].shortDisplayName || providerName
			: "";
		const helpUrl = PROVIDER_MAPPINGS[name] ? PROVIDER_MAPPINGS[name].helpUrl : "";
		return (
			<div className="panel configure-provider-panel">
				<form className="standard-form vscroll" onSubmit={this.onSubmit}>
					<div className="panel-header">
						<CancelButton onClick={this.props.closePanel} />
						<span className="panel-title">Configure {providerName}</span>
					</div>
					<fieldset className="form-body" disabled={inactive}>
						{this.renderError()}
						<div id="controls">
							<div key="token" id="configure-enterprise-controls-token" className="control-group">
								<label>
									<strong>{providerShortName} API Token</strong>
								</label>
								<label>
									Please provide an <Link href={helpUrl}>API Token</Link> we can use to access
									your {providerShortName} projects and issues.
									{scopes && scopes.length && (
										<span>
											&nbsp;Your API Token should have the following scopes: <b>{scopes.join(", ")}</b>.
										</span>
									)}
								</label>
								<input
									className="input-text control"
									type="text"
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

const mapStateToProps = ({ providers, ide }) => {
	return { providers };
};

export default connect(mapStateToProps, { closePanel, configureProvider })(
	injectIntl(ConfigureTokenProviderPanel)
);
