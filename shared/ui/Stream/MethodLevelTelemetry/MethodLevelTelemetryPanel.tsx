import { TelemetryRequestType } from "@codestream/protocols/agent";
import {
	clearDynamicLogging,
	pixieDynamicLoggingCancel
} from "@codestream/webview/store/dynamicLogging/actions";

import { HostApi } from "@codestream/webview/webview-api";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import { PanelHeader } from "../../src/components/PanelHeader";
import { closePanel } from "../actions";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import CancelButton from "../CancelButton";
import { CodeStreamState } from "@codestream/webview/store";

const Root = styled.div``;

export const MethodLevelTelemetryPanel = () => {
	const dispatch = useDispatch();

	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			currentMethodLevelTelemetry: state.context.currentMethodLevelTelemetry
		};
	});

	useDidMount(() => {
		HostApi.instance.send(TelemetryRequestType, {
			eventName: "Method Level Telemetry Viewed",
			properties: {}
		});
	});

	return (
		<Root className="full-height-codemark-form">
			<PanelHeader title={`Method Level Telemetry`}></PanelHeader>
			<CancelButton onClick={() => dispatch(closePanel())} />

			<span className="plane-container">
				<div className="codemark-form-container">
					<div className="codemark-form standard-form vscroll" id="code-comment-form">
						<div>
							<b>Entity</b> <select style={{ width: "100px" }}></select>
						</div>
						<div>
							<b>Repo:</b> asdf
						</div>
						<div>
							<b>File:</b> WorkloadUpdateCheese.java
						</div>
						<pre>{JSON.stringify(derivedState.currentMethodLevelTelemetry)}</pre>
						<div>charts and stuff</div>
					</div>
				</div>
			</span>
		</Root>
	);
};
