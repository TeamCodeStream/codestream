import { CodeStreamState } from "@codestream/webview/store";
import UrlInputComponent from "@codestream/webview/Stream/UrlInputComponent";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import { normalizeUrl } from "@codestream/webview/utilities/urls";
import React, { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { configureProvider, ViewLocation } from "../store/providers/actions";
import { closePanel } from "./actions";
import Button from "./Button";
import CancelButton from "./CancelButton";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";

interface Props {
	providerId: string;
	originLocation: ViewLocation;
}

export function ConfigureEnterprisePanel(props: Props) {
	const initialInput = useRef<HTMLInputElement>(null);

	const derivedState = useSelector((state: CodeStreamState) => {
		const { providers, ide } = state;
		const provider = providers[props.providerId];
		const isInVscode = ide.name === "VSC";
		const providerDisplay = PROVIDER_MAPPINGS[provider.name];
		return { provider, providerDisplay, isInVscode };
	});

	const dispatch = useDispatch();

	const [baseUrl, setBaseUrl] = useState("");
	const [baseUrlValid, setBaseUrlValid] = useState(false);
	const [token, setToken] = useState("");
	const [tokenTouched, setTokenTouched] = useState(false);
	const [submitAttempted, setSubmitAttempted] = useState(false);
	const [loading, setLoading] = useState(false);

	useDidMount(() => {
		initialInput.current?.focus();
	});

	const onSubmit = async e => {
		e.preventDefault();
		setSubmitAttempted(true);
		if (isFormInvalid()) return;
		setLoading(true);
		const { providerId } = props;

		// configuring is as good as connecting, since we are letting the user
		// set the access token
		dispatch(configureProvider(
			providerId,
			{ baseUrl: normalizeUrl(baseUrl), token },
			true,
			props.originLocation
		));
		setLoading(false);
		dispatch(closePanel());
	};

	const renderError = () => {
	};

	const onBlurToken = () => {
		setTokenTouched(true);
	};

	const renderTokenHelp = () => {
		if (tokenTouched || submitAttempted) {
			if (token.length === 0) return <small className="error-message">Required</small>;
		}
		return;
	};

	const isFormInvalid = () => {
        return baseUrl.length === 0 || token.length === 0 || !baseUrlValid
	};

    const inactive = false;
    const { scopes } = derivedState.provider;
	const {providerDisplay} = derivedState;
    const { displayName, urlPlaceholder, getUrl, helpUrl, versionMinimum, invalidHosts } =  providerDisplay;
    const providerShortName = providerDisplay.shortDisplayName || displayName;

		return (
			<div className="panel configure-provider-panel">
				<form className="standard-form vscroll" onSubmit={onSubmit}>
					<div className="panel-header">
						<CancelButton onClick={() => dispatch(closePanel())} />
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
						<br />
						{renderError()}
						<div id="controls">
							<div id="configure-enterprise-controls" className="control-group">
								<UrlInputComponent
									inputRef={initialInput}
									providerShortName={providerShortName}
									invalidHosts={invalidHosts}
									submitAttempted={submitAttempted}
									onChange={value => setBaseUrl(value)}
									onValidChange={valid => setBaseUrlValid(valid)}
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
									value={token}
									onChange={e => setToken(e.target.value)}
									onBlur={onBlurToken}
									id="configure-provider-access-token"
								/>
								{renderTokenHelp()}
							</div>
							<div className="button-group">
								<Button
									id="save-button"
									className="control-button"
									type="submit"
									loading={loading}
								>
									Submit
								</Button>
								<Button
									id="discard-button"
									className="control-button cancel"
									type="button"
									onClick={() => dispatch(closePanel())}
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

export default ConfigureEnterprisePanel;