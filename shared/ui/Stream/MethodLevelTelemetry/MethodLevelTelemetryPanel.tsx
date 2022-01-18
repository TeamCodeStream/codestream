import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from "recharts";
import styled from "styled-components";

import {
	GetMethodLevelTelemetryRequestType,
	GetMethodLevelTelemetryResponse,
	TelemetryRequestType,
	WarningOrError
} from "@codestream/protocols/agent";
import { DelayedRender } from "@codestream/webview/Container/DelayedRender";
import { LoadingMessage } from "@codestream/webview/src/components/LoadingMessage";
import { CodeStreamState } from "@codestream/webview/store";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import { HostApi } from "@codestream/webview/webview-api";

import { PanelHeader } from "../../src/components/PanelHeader";
import { closePanel, setUserPreference } from "../actions";
import CancelButton from "../CancelButton";
import { Dropdown } from "../Dropdown";
import Icon from "../Icon";
import { Link } from "../Link";
import { WarningBox } from "../WarningBox";

const Root = styled.div``;

export const MethodLevelTelemetryPanel = () => {
	const dispatch = useDispatch();

	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			currentMethodLevelTelemetry: state.context.currentMethodLevelTelemetry,
			methodLevelTelemetryRepoEntities:
				(state.users[state.session.userId!].preferences || {}).methodLevelTelemetryRepoEntities ||
				{}
		};
	});

	const [telemetryResponse, setTelemetryResponse] = useState<
		GetMethodLevelTelemetryResponse | undefined
	>(undefined);
	const [loading, setLoading] = useState<boolean>(false);
	const [warningOrErrors, setWarningOrErrors] = useState<WarningOrError[] | undefined>(undefined);

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
				console.warn(response);
			} catch (ex) {
				setWarningOrErrors([{ message: ex.toString() }]);
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
				<div className="codemark-form-container" style={{ paddingTop: "7px" }}>
					<div className="standard-form vscroll">
						{warningOrErrors ? (
							<WarningBox items={warningOrErrors} />
						) : (
							<>
								{loading ? (
									<>
										<DelayedRender>
											<div style={{ display: "flex", alignItems: "center" }}>
												<LoadingMessage>Loading Telemetry...</LoadingMessage>
											</div>
										</DelayedRender>
									</>
								) : (
									<div>
										<div>
											<b>Entity:</b>{" "}
											{telemetryResponse && (
												<Dropdown
													selectedValue={telemetryResponse.newRelicEntityName!}
													items={telemetryResponse.newRelicEntityAccounts!.map((item, i) => {
														return {
															label: item.entityName,
															key: item.entityGuid + "-" + i,
															checked:
																item.entityGuid ===
																derivedState.methodLevelTelemetryRepoEntities[
																	telemetryResponse.repo.id
																],
															action: () => {
																let newPref = {};
																newPref[telemetryResponse.repo.id] = item.entityGuid;
																dispatch(
																	setUserPreference(["methodLevelTelemetryRepoEntities"], {
																		...derivedState.methodLevelTelemetryRepoEntities,
																		...newPref
																	})
																);
															}
														};
													})}
												/>
											)}
										</div>
										<div>
											<b>Repo:</b> {telemetryResponse?.repo?.name}
										</div>
										<div>
											<b>File:</b> {derivedState?.currentMethodLevelTelemetry.filePath}
										</div>
										<div>
											<br />
											{telemetryResponse &&
												telemetryResponse.goldenMetrics &&
												telemetryResponse.goldenMetrics.map(_ => {
													return (
														<div style={{ width: "500px", height: "300px" }}>
															<LineChart
																width={500}
																height={300}
																data={_.result}
																margin={{
																	top: 5,
																	right: 30,
																	left: 20,
																	bottom: 5
																}}
															>
																<CartesianGrid strokeDasharray="3 3" />
																<XAxis dataKey="endTimeSeconds" />
																<YAxis dataKey={_.title} />
																<Tooltip />
																<Legend />
																<Line
																	type="monotone"
																	dataKey={_.title}
																	stroke="#8884d8"
																	activeDot={{ r: 8 }}
																/>
															</LineChart>
														</div>
													);
												})}

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
							</>
						)}
					</div>
				</div>
			</span>
		</Root>
	);
};
