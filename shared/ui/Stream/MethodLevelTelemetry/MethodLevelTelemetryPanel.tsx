import {
	GetMethodLevelTelemetryRequestType,
	GetMethodLevelTelemetryResponse,
	TelemetryRequestType
} from "@codestream/protocols/agent";
import { HostApi } from "@codestream/webview/webview-api";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import { PanelHeader } from "../../src/components/PanelHeader";
import { closePanel } from "../actions";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import CancelButton from "../CancelButton";
import { CodeStreamState } from "@codestream/webview/store";
import Icon from "../Icon";
import { Link } from "../Link";

const Root = styled.div``;

export const MethodLevelTelemetryPanel = () => {
	const dispatch = useDispatch();

	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			currentMethodLevelTelemetry: state.context.currentMethodLevelTelemetry
		};
	});

	const [telemetryResponse, setTelemetryResponse] = useState<
		GetMethodLevelTelemetryResponse | undefined
	>(undefined);
	const [loading, setLoading] = useState<boolean>(false);

	useDidMount(() => {
		HostApi.instance.send(TelemetryRequestType, {
			eventName: "Method Level Telemetry Viewed",
			properties: {}
		});
		(async () => {
			setLoading(true);
			try {
				const response = await HostApi.instance.send(GetMethodLevelTelemetryRequestType, {
					languageId: derivedState.currentMethodLevelTelemetry.languageId,
					filePath: derivedState.currentMethodLevelTelemetry.filePath,
					functionName: derivedState.currentMethodLevelTelemetry.functionName,
					options: {
						includeThroughput: true,
						includeAverageDuration: true,
						includeErrorRate: true
					}
				});

				setTelemetryResponse(response);
				console.log(response);
			} catch (ex) {
				console.warn(ex);
			} finally {
				setLoading(false);
			}
		})();
	});

	return (
		<Root className="full-height-codemark-form">
			<PanelHeader
				title={derivedState.currentMethodLevelTelemetry.functionName + " telemetry"}
			></PanelHeader>
			<CancelButton onClick={() => dispatch(closePanel())} />

			<span className="plane-container">
				<div className="codemark-form-container">
					<div className="codemark-form standard-form vscroll" id="code-comment-form">
						{loading ? (
							<>
								<Icon name="sync" loading={true} />
							</>
						) : (
							<div>
								<div>
									<b>Entity:</b> {telemetryResponse?.newRelicEntityName}
								</div>
								<div>
									<b>Repo:</b> {telemetryResponse?.repo?.name}
								</div>
								<div>
									<b>File:</b> {derivedState?.currentMethodLevelTelemetry.filePath}
								</div>
								<div>
									<br />
									<div>
										<img src="https://via.placeholder.com/500x300" />
									</div>
									<div>
										<img src="https://via.placeholder.com/500x300" />
									</div>
									<div>
										<img src="https://via.placeholder.com/500x300" />
									</div>
									<br />
								</div>
								{telemetryResponse && (
									<div>
										<br />
										<Link className="external-link" href={telemetryResponse.newRelicUrl}>
											View service summary on New Relic One <Icon name="link-external" />
										</Link>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</span>
		</Root>
	);
};
