import { CodeStreamState } from "@codestream/webview/store";
import UrlInputComponent from "@codestream/webview/Stream/UrlInputComponent";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import { normalizeUrl } from "@codestream/webview/utilities/urls";
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { configureProvider, disconnectProvider, ViewLocation } from "../store/providers/actions";
import { getUserProviderInfoFromState } from "../store/providers/utils";
import { isConnected } from "../store/providers/reducer";
import { closePanel } from "./actions";
import Button from "./Button";
import CancelButton from "./CancelButton";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";
import { CSProviderInfo } from "@codestream/protocols/api";
import { Link } from "./Link";

interface Props {
	providerId: string;
	originLocation: ViewLocation | string;
}

export default function ConfigureEnterprisePanel(props: Props) {
	const initialInput = useRef<HTMLInputElement>(null);

	const derivedState = useSelector((state: CodeStreamState) => {
		const { providers, ide } = state;
		const provider = providers[props.providerId];
		const isInVscode = ide.name === "VSC";
		const userProviderInfo = getUserProviderInfoFromState(provider.name, state) as CSProviderInfo;
		const providerDisplay = PROVIDER_MAPPINGS[provider.name];
		const accessTokenError = { accessTokenError: undefined };
		const didConnect =
			isConnected(state, { name: provider.name }, undefined, accessTokenError) &&
			!accessTokenError.accessTokenError &&
			!userProviderInfo.pendingVerification;
		return {
			provider,
			providerDisplay,
			isInVscode,
			verificationError: accessTokenError.accessTokenError,
			didConnect,
			userProviderInfo
		};
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

	const { didConnect, verificationError, userProviderInfo } = derivedState;
	useEffect(() => {
		if (didConnect) {
			dispatch(closePanel());
		} else if (verificationError) {
			setLoading(false);
		}
	}, [didConnect, verificationError, userProviderInfo]);

	const onSubmit = async e => {
		e.preventDefault();
		setSubmitAttempted(true);
		if (isFormInvalid()) return;
		setLoading(true);
		const { providerId } = props;

		// configuring is as good as connecting, since we are letting the user
		// set the access token
		await dispatch(
			configureProvider(
				providerId,
				{ data: { baseUrl: normalizeUrl(baseUrl) || "" }, accessToken: token },
				{ setConnectedWhenConfigured: true, connectionLocation: props.originLocation, verify: true }
			)
		);
	};

	const renderError = () => {
		if (derivedState.verificationError) {
			const message =
				(derivedState.verificationError as any).providerMessage ||
				(derivedState.verificationError as any).error?.info?.error?.message ||
				"Access token invalid";
			console.warn(message);
			return (
				<p className="error-message">
					Could not connect. Please verify your base URL and personal access token.
				</p>
			);
		} else {
			return "";
		}
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
		return baseUrl.length === 0 || token.length === 0 || !baseUrlValid;
	};

	const onCancel = () => {
		if (submitAttempted) {
			dispatch(disconnectProvider(props.providerId, props.originLocation));
		}
		dispatch(closePanel());
	};

	const inactive = false;
	const { scopes } = derivedState.provider;
	const { providerDisplay } = derivedState;
	const {
		displayName,
		urlPlaceholder,
		getUrl,
		helpUrl,
		directPAT,
		versionMinimum,
		checkVersionUrl,
		invalidHosts,
		namePAT = "Personal Access Token",
		supportsPRManagement
	} = providerDisplay;
	const providerShortName = providerDisplay.shortDisplayName || displayName;
	let providerUrl = helpUrl;
	if (directPAT && baseUrl.length > 0) {
		providerUrl = `${baseUrl}/${directPAT.path}?`;
		if (directPAT.descriptionParam) {
			providerUrl += `${directPAT.descriptionParam}=CodeStream`;
		}
		providerUrl += `&${directPAT.scopesParam}=${(scopes || []).join(",")}`;
	}

	return (
		<div className="panel configure-provider-panel">
			<form className="standard-form vscroll" onSubmit={onSubmit}>
				<div className="panel-header">
					<CancelButton onClick={() => onCancel()} />
					<span className="panel-title">Connect to {displayName}</span>
				</div>
				<fieldset className="form-body" disabled={inactive}>
					{getUrl && (
						<p style={{ textAlign: "center" }} className="explainer">
							Not a {displayName} customer yet? <Link href={getUrl}>Get {displayName}</Link>
						</p>
					)}
					{versionMinimum && (
						<p style={{ textAlign: "center" }} className="explainer">
							Requires {displayName} {versionMinimum} or later.{" "}
							<Link href={checkVersionUrl}>Check your version</Link>.
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
								placeholder={urlPlaceholder}
							/>
						</div>
						<div key="token" id="configure-enterprise-controls-token" className="control-group">
							<label>
								<strong>
									{providerShortName} {namePAT}
								</strong>
							</label>
							{scopes && (
								<label>
									Provide a <Link href={providerUrl}>{namePAT.toLowerCase()}</Link> with the
									following scopes so that CodeStream can access your{" "}
									{supportsPRManagement && "pull requests and "}issues:
									<span>
										&nbsp;<b>{scopes!.join(", ")}</b>.
									</span>
								</label>
							)}
							{!scopes && (
								<label>
									Provide a <Link href={providerUrl}>{namePAT.toLowerCase()}</Link> so that
									CodeStream can access your {supportsPRManagement && "pull requests and "}issues.
								</label>
							)}
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
							<Button id="save-button" className="control-button" type="submit" loading={loading}>
								Submit
							</Button>
							<Button
								id="discard-button"
								className="control-button cancel"
								type="button"
								onClick={() => onCancel()}
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
