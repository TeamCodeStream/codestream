import {
	GetNewRelicSignupJwtTokenRequestType,
	GetReposScmRequestType,
	RepoProjectType
} from "@codestream/protocols/agent";
import { OpenUrlRequestType, WebviewPanels } from "@codestream/protocols/webview";
import { CodeStreamState } from "@codestream/webview/store";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { closeAllPanels, openPanel, setWantNewRelicOptions } from "../store/context/actions";
import { configureProvider, ViewLocation } from "../store/providers/actions";
import { isConnected } from "../store/providers/reducer";
import { HostApi } from "../webview-api";
import Button from "./Button";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";
import Icon from "./Icon";
import { Link } from "./Link";

interface Props {
	isInternalUser?: boolean;
	showSignupUrl: boolean;
	disablePostConnectOnboarding?: boolean;
	providerId: string;
	originLocation?: ViewLocation;
	headerChildren?: any;
	onClose?: Function;
	onSubmited?: Function;
}

export default function ConfigureNewRelic(props: Props) {
	const initialInput = useRef<HTMLInputElement>(null);

	const [loading, setLoading] = useState(false);
	const [apiKey, setApiKey] = useState("");
	const [apiKeyTouched, setApiKeyTouched] = useState(false);
	const [submitAttempted, setSubmitAttempted] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const derivedState = useSelector((state: CodeStreamState) => {
		const isNewRelicConnected = isConnected(state, { id: "newrelic*com" });
		const { providers, ide } = state;
		const provider = providers[props.providerId];
		const providerDisplay = PROVIDER_MAPPINGS[provider.name];
		const { newRelicApiUrl, isProductionCloud } = state.configs;
		return {
			isNewRelicConnected,
			providers,
			ide,
			newRelicApiUrl,
			isProductionCloud,
			provider,
			providerDisplay
		};
	});

	const dispatch = useDispatch();

	useDidMount(() => {
		if (derivedState.isNewRelicConnected) {
			dispatch(closeAllPanels());
		}
		initialInput.current?.focus();
	});

	useEffect(() => {
		// automatically close the panel
		if (derivedState.isNewRelicConnected && !apiKey) {
			dispatch(closeAllPanels());
		}
	}, [derivedState.isNewRelicConnected]);

	const onSubmit = async e => {
		e.preventDefault();
		setSubmitAttempted(true);
		if (isFormInvalid()) return;
		let isOnSubmittedPromise = false;
		const { providerId } = props;
		const apiUrl: string | undefined = derivedState.isProductionCloud
			? derivedState.newRelicApiUrl || "https://api.newrelic.com"
			: "https://staging-api.newrelic.com";

		// configuring is as good as connecting, since we are letting the user
		// set the access token ... sending the fourth argument as true here lets the
		// configureProvider function know that they can mark New Relic as connected as soon
		// as the access token entered by the user has been saved to the server
		setLoading(true);
		try {
			await dispatch(
				configureProvider(
					providerId,
					{ accessToken: apiKey, data: { apiUrl } },
					{
						setConnectedWhenConfigured: true,
						connectionLocation: props.originLocation,
						throwOnError: true
					}
				)
			);
			setError(null);

			HostApi.instance.track("NR Connected", {
				"Connection Location": props.originLocation
			});
			if (props.onSubmited) {
				const result = props.onSubmited(e);
				if (typeof result?.then === "function") {
					isOnSubmittedPromise = true;
					result.then(_ => {
						setLoading(false);
					});
				}
			}
			if (!props.disablePostConnectOnboarding) {
				const reposResponse = await HostApi.instance.send(GetReposScmRequestType, {
					inEditorOnly: true,
					guessProjectTypes: true
				});
				if (!reposResponse.error) {
					const knownRepo = (reposResponse.repositories || []).find(repo => {
						return repo.id && repo.projectType !== RepoProjectType.Unknown;
					});
					if (knownRepo && knownRepo.projectType) {
						await dispatch(
							setWantNewRelicOptions(
								knownRepo.projectType,
								knownRepo.id,
								knownRepo.path,
								knownRepo.projects
							)
						);
						await dispatch(openPanel(WebviewPanels.OnboardNewRelic));
					}
				}
			}
		} catch (ex) {
			setError(ex.message);
			setLoading(false);
		}
		if (!isOnSubmittedPromise) {
			setLoading(false);
		}
	};

	const renderError = () => {
		if (error) {
			return <small className="error-message">{error}</small>;
		}
		return;
	};

	const onBlurApiKey = () => {
		setApiKeyTouched(true);
	};

	const renderApiKeyHelp = () => {
		if (apiKeyTouched || submitAttempted) {
			if (apiKey.length === 0) return <small className="error-message">Required</small>;
		}
		return;
	};

	const isFormInvalid = () => {
		return apiKey.length === 0;
	};

	const onClickSignup = async campaign => {
		const { token, baseLandingUrl } = await HostApi.instance.send(
			GetNewRelicSignupJwtTokenRequestType,
			{}
		);
		const url =
			`${baseLandingUrl}/codestream/signup` +
			`?token=${token}` +
			`&utm_source=codestream` +
			`&utm_medium=${derivedState.ide.name}` +
			`&utm_campaign=${campaign}`;
		await HostApi.instance.send(OpenUrlRequestType, { url });
	};

	if (derivedState.isNewRelicConnected) {
		return null;
	}
	const { providerId, headerChildren, showSignupUrl } = props;
	const { displayName, getUrl } = derivedState.providerDisplay;
	return (
		<div className="standard-form vscroll">
			{headerChildren}

			<fieldset className="form-body">
				{showSignupUrl && getUrl && (
					<p style={{ textAlign: "center" }} className="explainer">
						Not a {displayName} customer yet? <a href={getUrl}>Get {displayName}</a>
					</p>
				)}
				{renderError()}
				<div id="controls">
					<div id="token-controls" className="control-group">
						<div className="control-group">
							<label>Already have a {displayName} User API Key?</label>
							<div
								style={{
									width: "100%",
									display: "flex",
									alignItems: "stretch"
								}}
							>
								<div style={{ position: "relative", flexGrow: 10 }}>
									<input
										ref={initialInput}
										id="configure-provider-initial-input"
										className="input-text control"
										type="password"
										name="apiKey"
										tabIndex={1}
										autoFocus
										value={apiKey}
										onChange={e => setApiKey(e.target.value)}
										onBlur={onBlurApiKey}
									/>
									{renderApiKeyHelp()}
								</div>
							</div>
							<div className="control-group" style={{ margin: "15px 0px" }}>
								<Button
									id="save-button"
									tabIndex={2}
									style={{ marginTop: "0px" }}
									className="row-button"
									onClick={onSubmit}
									loading={loading}
								>
									<Icon name="newrelic" />
									<div className="copy"> Connect to New Relic One</div>
									<Icon name="chevron-right" />
								</Button>
							</div>
							<div>
								Don't have an API key?{" "}
								<Link
									onClick={e => {
										e.preventDefault();
										HostApi.instance.track("NR Get API Key");
										onClickSignup("nr_getapikey");
									}}
								>
									Create one now
								</Link>
							</div>
						</div>
					</div>
					<div className="control-group" style={{ marginTop: "30px" }}>
						<div>Don't have a {displayName} account?</div>
						<div>
							<Button
								style={{ marginTop: "5px" }}
								className="row-button"
								onClick={e => {
									e.preventDefault();
									HostApi.instance.track("NR Signup Initiated");
									onClickSignup("nr_signup");
								}}
							>
								<Icon name="newrelic" />
								<div className="copy">Sign Up for New Relic One</div>
								<Icon name="chevron-right" />
							</Button>
						</div>
					</div>
				</div>
			</fieldset>
		</div>
	);
}
