import { CodeStreamState } from "@codestream/webview/store";
import { useAppDispatch, useAppSelector, useDidMount } from "@codestream/webview/utilities/hooks";
import React, { useState } from "react";
import { configureProvider, connectProvider, ViewLocation } from "../store/providers/actions";
import { Link } from "./Link";
import { closePanel } from "./actions";
import Button from "./Button";
import CancelButton from "./CancelButton";
import { HostApi } from "../webview-api";

import {
	GenerateMSTeamsConnectCodeRequestType,
	GenerateMSTeamsConnectCodeResponse,
} from "@codestream/protocols/agent";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";

interface Props {
	providerId: string;
	originLocation: ViewLocation | string;
}

export default function ConfigureMSTeamsPanel(props: Props) {
	const [connectCode, setConnectCode] = useState<string>("");
	const [isLoading, setIsLoading] = useState(false);

	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { providers } = state;
		const provider = providers[props.providerId];
		const providerDisplay = PROVIDER_MAPPINGS[provider.name];
		return { provider, providerDisplay };
	});
	const dispatch = useAppDispatch();

	useDidMount(() => {
		generateConnectCode();
	});

	const generateConnectCode = () => {
		setIsLoading(true);
		HostApi.instance
			.send(GenerateMSTeamsConnectCodeRequestType, {})
			.then((response: GenerateMSTeamsConnectCodeResponse) => {
				setConnectCode(response.connectCode);
			})
			.finally(() => {
				setIsLoading(false);
			});
	};

	const onSubmit = async e => {
		e.preventDefault();
		const { providerId } = props;

		await dispatch(configureProvider(providerId, {}));
		await dispatch(connectProvider(providerId, props.originLocation));
		await dispatch(closePanel());
	};

	const renderError = () => {};

	const tabIndex = (): any => {};

	const inactive = false;
	const { providerDisplay } = derivedState;
	const { displayName } = providerDisplay;

	return (
		<div className="panel configure-provider-panel">
			<form className="standard-form vscroll">
				<div className="panel-header">
					<CancelButton onClick={() => dispatch(closePanel())} />
					<span className="panel-title">Connect {displayName}</span>
				</div>
				<fieldset className="form-body" disabled={inactive}>
					{renderError()}
					<div id="controls">
						<div key="token" id="configure-msteams-connection-token" className="control-group">
							<label>
								Copy the follwing sign-in code and then click the button below to install the
								CodeStream app in your Teams organization.
							</label>

							<div
								style={{
									alignContent: "center",
									textAlign: "center",
									marginTop: "20px",
									marginBottom: "20px",
								}}
							>
								<strong>{connectCode}</strong>
							</div>

							<label>
								Code expired? <Link onClick={() => generateConnectCode()}>Generate a new one</Link>
							</label>
						</div>
						<div className="button-group">
							<Button
								id="save-button"
								className="control-button"
								tabIndex={tabIndex()}
								type="button"
								onClick={e => onSubmit(e)}
								loading={isLoading}
							>
								Connect to Teams
							</Button>
						</div>
					</div>
				</fieldset>
			</form>
		</div>
	);
}
