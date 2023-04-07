import { CodeStreamState } from "@codestream/webview/store";
import { useAppDispatch, useAppSelector, useDidMount } from "@codestream/webview/utilities/hooks";
import React, { useRef, useState } from "react";
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
	const initialInput = useRef<HTMLInputElement>(null);
	const [connectCode, setConnectCode] = useState<string>("");

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
		HostApi.instance
			.send(GenerateMSTeamsConnectCodeRequestType, {})
			.then((response: GenerateMSTeamsConnectCodeResponse) => {
				setConnectCode(response.connectCode);
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
			<form className="standard-form vscroll" onSubmit={onSubmit}>
				<div className="panel-header">
					<CancelButton onClick={() => dispatch(closePanel())} />
					<span className="panel-title">Connect {displayName}</span>
				</div>
				<fieldset className="form-body" disabled={inactive}>
					{renderError()}
					<div id="controls">
						<div key="token" id="configure-enterprise-controls-token" className="control-group">
							<label>
								<strong>Connect to Microsoft Teams</strong>
							</label>
							<label>
								In your Microsoft Teams account, send a private message to the CodeStream bot with
								the `signin` command. Copy and paste the code below into the response to the bot.
								Once the bot has validated your token, you can click "Connect to Teams" to complete
								the process.
							</label>
							<label>
								<strong>{connectCode}</strong>
							</label>
							<label>
								Code expired? <Link>Generate a new one</Link>
							</label>
						</div>
						<div className="button-group">
							<Button
								id="discard-button"
								className="control-button cancel"
								tabIndex={tabIndex()}
								type="button"
								onClick={e => onSubmit(e)}
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
