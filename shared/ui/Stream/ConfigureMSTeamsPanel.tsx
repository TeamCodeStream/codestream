import { CodeStreamState } from "@codestream/webview/store";
import { useAppDispatch, useAppSelector, useDidMount } from "@codestream/webview/utilities/hooks";
import React, { SyntheticEvent, useState } from "react";
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
import Icon from "./Icon";
import copy from "copy-to-clipboard";
import { shallowEqual } from "react-redux";

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
	}, shallowEqual);

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

	const handleClickCopy = (e: SyntheticEvent, contentToCopy: string) => {
		e.stopPropagation();
		e.preventDefault();
		copy(contentToCopy);
	};

	const onSubmit = async (e: SyntheticEvent) => {
		e.preventDefault();
		const { providerId } = props;

		await dispatch(configureProvider(providerId, {}));
		await dispatch(connectProvider(providerId, props.originLocation));
		await dispatch(closePanel());
	};

	const renderError = () => {};

	const { providerDisplay } = derivedState;
	const { displayName } = providerDisplay;

	return (
		<div className="panel configure-provider-panel">
			<form className="standard-form vscroll">
				<div className="panel-header">
					<CancelButton onClick={() => dispatch(closePanel())} />
					<span className="panel-title">Connect {displayName}</span>
				</div>
				<fieldset className="form-body">
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
								<span>
									<strong>{connectCode}</strong>
									<Icon
										title="Copy"
										placement="bottom"
										name="copy"
										className="clickable"
										onClick={e => handleClickCopy(e, connectCode)}
										delay={1}
										style={{ marginLeft: "2px" }}
									/>
								</span>
							</div>

							<label>
								Code expired? <Link onClick={() => generateConnectCode()}>Generate a new one</Link>
							</label>
						</div>
						<div className="button-group">
							<Button
								id="save-button"
								className="control-button"
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
