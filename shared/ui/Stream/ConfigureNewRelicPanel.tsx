import { CodeStreamState } from "@codestream/webview/store";
import { ViewLocation } from "@codestream/webview/store/providers/actions";
import ConfigureNewRelic from "@codestream/webview/Stream/ConfigureNewRelic";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { closePanel } from "./actions";
import CancelButton from "./CancelButton";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";

interface Props {
	providerId: string;
	originLocation: ViewLocation | string;
}

export default function ConfigureNewRelicPanel(props: Props) {
	const dispatch = useDispatch();

	const derivedState = useSelector((state: CodeStreamState) => {
		const { providers } = state;
		const provider = providers[props.providerId];
		const providerDisplay = PROVIDER_MAPPINGS[provider.name];
		return { providerDisplay };
	});

	const close = () => {
		dispatch(closePanel());
	};

	const { providerId } = props;
	const { displayName } = derivedState.providerDisplay;
	return (
		<div className="panel configure-provider-panel">
			<ConfigureNewRelic
				headerChildren={
					<div className="panel-header">
						<CancelButton onClick={() => dispatch(closePanel())} />
						<span className="panel-title">Connect to {displayName}</span>
					</div>
				}
				providerId={providerId}
				onClose={close}
				onSubmited={close}
				originLocation={props.originLocation}
				showSignupUrl={false}
			/>
		</div>
	);
}
