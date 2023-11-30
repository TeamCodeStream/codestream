import React, { useState } from "react";
import { shallowEqual } from "react-redux";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { CodeStreamState } from "../store";
import { ErrorRow } from "./Observability";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import { HostApi } from "@codestream/webview/webview-api";
import { EditorRevealSymbolRequestType } from "@codestream/protocols/webview";
import { WebviewPanels } from "@codestream/protocols/api";
import {
	closeAllPanels,
	openPanel,
	setCurrentObservabilityAnomaly,
} from "@codestream/webview/store/context/actions";
import Tooltip from "./Tooltip";
import {
	DetectionMethod,
	ObservabilityAnomaly,
	ObservabilityRepo,
} from "@codestream/protocols/agent";

interface Props {
	observabilityAnomalies: ObservabilityAnomaly[];
	observabilityRepo: ObservabilityRepo;
	detectionMethod?: DetectionMethod;
	entityGuid?: string;
	title?: string;
	collapseDefault?: boolean;
	noAnomaly?: boolean;
}

export const ObservabilityAnomaliesGroup = React.memo((props: Props) => {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const clmSettings = state.preferences.clmSettings || {};
		return {
			clmSettings,
		};
	}, shallowEqual);
	const [numToShow, setNumToShow] = useState(5);

	const getRoundedPercentage = ratio => {
		const percentage = (ratio - 1) * 100;
		const factor = Math.pow(10, 2);
		return Math.floor(percentage * factor) / factor;
	};

	const getTypeAndValueOutput = (type: "errorRate" | "duration", ratio) => {
		if (props.noAnomaly) return <div></div>;
		const roundedPercentage = getRoundedPercentage(ratio);
		let roundedPercentageText =
			roundedPercentage > 0 ? `${roundedPercentage}%+` : `${roundedPercentage}%+`;

		return (
			<div
				style={{
					overflow: "visible",
					marginLeft: "auto",
					textAlign: "right",
					paddingLeft: "2.5px",
					direction: "rtl",
					width: "40%",
				}}
			>
				<span
					style={{
						color: "red",
					}}
				>
					{roundedPercentageText}
				</span>
				<span
					style={{
						paddingRight: "5px",
					}}
					className="subtle"
				>
					{getAnomalyTypeLabel(type)}
				</span>
			</div>
		);
	};

	const getAnomalyTypeLabel = (type: "errorRate" | "duration") => {
		switch (type) {
			case "duration":
				return "avg duration";
			case "errorRate":
				return "error rate";
			default:
				return "";
		}
	};

	const hasMoreAnomaliesToShow = props.observabilityAnomalies.length > numToShow;

	function handleClickTelemetry() {
		const event = {
			"Detection Method": props.detectionMethod ?? "<unknown>",
			Language: props.observabilityAnomalies[0]?.language ?? "<unknown>",
		};

		console.debug("CLM Anomaly Clicked", event);

		HostApi.instance.track("CLM Anomaly Clicked", event);
	}

	function handleClick(anomaly: ObservabilityAnomaly) {
		handleClickTelemetry();
		HostApi.instance.send(EditorRevealSymbolRequestType, {
			codeFilepath: anomaly.codeAttrs?.codeFilepath,
			codeNamespace: anomaly.codeAttrs?.codeNamespace,
			codeFunction: anomaly.codeAttrs?.codeFunction,
			language: anomaly.language,
		});
		dispatch(closeAllPanels());
		dispatch(setCurrentObservabilityAnomaly(anomaly, props.entityGuid!));
		dispatch(openPanel(WebviewPanels.ObservabilityAnomaly));
	}

	return (
		<>
			{
				<>
					{props.observabilityAnomalies.length == 0 ? (
						<ErrorRow
							customPadding={"0 10px 0 50px"}
							title={"No anomalies found"}
							icon="thumbsup"
						/>
					) : (
						<>
							{props.observabilityAnomalies.slice(0, numToShow).map((anomaly, index) => {
								return (
									<>
										<Row
											style={{
												padding: "0 10px 0 42px",
											}}
											className={"pr-row"}
											onClick={e => {
												handleClick(anomaly);
											}}
										>
											<Tooltip
												title={<div style={{ overflowWrap: "break-word" }}>{anomaly.text}</div>}
												placement="topRight"
												delay={1}
											>
												<div
													style={{
														width: "60%",
														textAlign: "left",
														marginRight: "auto",
														direction: "rtl",
													}}
												>
													<bdi>
														<span>&#x200e;{anomaly.text}</span>
													</bdi>
												</div>
											</Tooltip>

											<div>{getTypeAndValueOutput(anomaly.type, anomaly.ratio)}</div>
										</Row>
										{anomaly.children &&
											anomaly.children
												.sort((a, b) => b.ratio - a.ratio)
												.map(child => {
													return (
														<Row
															style={{
																padding: "0 10px 0 42px",
															}}
															className={"pr-row"}
															onClick={e => {
																handleClick(child);
															}}
														>
															<Tooltip
																title={
																	<div style={{ overflowWrap: "break-word" }}>{child.text}</div>
																}
																placement="topRight"
																delay={1}
															>
																<div
																	style={{
																		width: "60%",
																		marginLeft: "10px",
																		textAlign: "left",
																		marginRight: "auto",
																		direction: "rtl",
																	}}
																>
																	<bdi>
																		<span>&#x200e;{child.text}</span>
																	</bdi>
																</div>
															</Tooltip>

															<div>{getTypeAndValueOutput(child.type, child.ratio)}</div>
														</Row>
													);
												})}
									</>
								);
							})}
						</>
					)}
					{hasMoreAnomaliesToShow && (
						<div
							style={{ padding: "0px 10px 0px 50px", cursor: "pointer" }}
							onClick={() => {
								const newNumToShow = numToShow + 5;
								setNumToShow(newNumToShow);
							}}
						>
							Show More
						</div>
					)}
				</>
			}
		</>
	);
});
