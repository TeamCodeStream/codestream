import { CodeStreamState } from "@codestream/webview/store";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import React, { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { configureProvider, ViewLocation } from "../store/providers/actions";
import { Link } from "../Stream/Link";
import { closePanel } from "./actions";
import Button from "./Button";
import CancelButton from "./CancelButton";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";

interface Props {
	providerId: string;
	originLocation: ViewLocation | string;
}

export default function ConfigureTokenProviderPanel(props: Props) {
	const initialInput = useRef<HTMLInputElement>(null);

	const derivedState = useSelector((state: CodeStreamState) => {
		const { providers, ide } = state;
		const provider = providers[props.providerId];
		const isInVscode = ide.name === "VSC";
		const providerDisplay = PROVIDER_MAPPINGS[provider.name];
		return { provider, providerDisplay, isInVscode };
	});

	const dispatch = useDispatch();

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
		await dispatch(
			configureProvider(
				providerId,
				{ accessToken: token },
				{ setConnectedWhenConfigured: true, connectionLocation: props.originLocation }
			)
		);
		setLoading(false);
		await dispatch(closePanel());
	};

	const renderError = () => {};

	const onBlurToken = () => {
		setTokenTouched(true);
	};

	const renderTokenHelp = () => {
		if (tokenTouched || submitAttempted) {
			if (token.length === 0) return <small className="error-message">Required</small>;
		}
		return;
	};

	const tabIndex = (): any => {};

	const isFormInvalid = () => {
		return token.trim().length === 0;
	};

	const inactive = false;
	const { providerDisplay, provider } = derivedState;
	const { scopes } = provider;
	const { displayName, urlPlaceholder, invalidHosts, helpUrl } = providerDisplay;
	const providerShortName = providerDisplay.shortDisplayName || displayName;
	return (
		<div className="panel configure-provider-panel">
			<form className="standard-form vscroll" onSubmit={onSubmit}>
				<div className="panel-header">
					<CancelButton onClick={() => dispatch(closePanel())} />
					<span className="panel-title">Configure {displayName}</span>
				</div>
				<fieldset className="form-body" disabled={inactive}>
					{renderError()}
					<div id="controls">
						<div key="token" id="configure-enterprise-controls-token" className="control-group">
							<label>
								<strong>{providerShortName} API Token</strong>
							</label>
							<label>
								Please provide an <Link href={helpUrl}>API Token</Link> we can use to access your{" "}
								{providerShortName} projects and issues.
								{scopes && scopes.length && (
									<span>
										&nbsp;Your API Token should have the following scopes:{" "}
										<b>{scopes.join(", ")}</b>.
									</span>
								)}
							</label>
							<input
								ref={initialInput}
								className="input-text control"
								type="password"
								name="token"
								tabIndex={tabIndex()}
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
								tabIndex={tabIndex()}
								type="submit"
								loading={loading}
							>
								Submit
							</Button>
							<Button
								id="discard-button"
								className="control-button cancel"
								tabIndex={tabIndex()}
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
