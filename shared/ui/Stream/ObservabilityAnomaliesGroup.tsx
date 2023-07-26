import React, { useState } from "react";
import { shallowEqual } from "react-redux";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { CodeStreamState } from "../store";
import { ErrorRow } from "./Observability";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { HostApi } from "@codestream/webview/webview-api";
import { EditorRevealSymbolRequestType, WebviewPanels } from "@codestream/protocols/webview";
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
	const [expanded, setExpanded] = useState<boolean>(props.collapseDefault ? false : true);
	const [numToShow, setNumToShow] = useState(5);

	const getRoundedPercentage = ratio => {
		const percentage = (ratio - 1) * 100;
		const factor = Math.pow(10, 2);
		return Math.floor(percentage * factor) / factor;
	};

	const getRoundedPercentageOutput = ratio => {
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
					width: "10%",
				}}
			>
				<span
					style={{
						color: "red",
					}}
				>
					{roundedPercentageText}
				</span>
			</div>
		);
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
			codeFilepath: anomaly.codeFilepath,
			codeNamespace: anomaly.codeNamespace,
			codeFunction: anomaly.codeFunction,
			language: anomaly.language,
		});
		if (!props.noAnomaly) {
			dispatch(closeAllPanels());
			dispatch(setCurrentObservabilityAnomaly(anomaly, props.entityGuid!));
			dispatch(openPanel(WebviewPanels.ObservabilityAnomaly));
		}
	}

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 40px",
				}}
				className={"pr-row"}
				onClick={() => setExpanded(!expanded)}
			>
				{expanded && <Icon name="chevron-down-thin" />}
				{!expanded && <Icon name="chevron-right-thin" />}
				<span style={{ marginLeft: "2px" }}>{props.title}</span>
			</Row>
			{expanded && (
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
													width: "75%",
													textAlign: "left",
													marginRight: "auto",
													direction: "rtl",
												}}
											>
												<span>{anomaly.text}</span>
											</div>
										</Tooltip>

										{getRoundedPercentageOutput(anomaly.ratio)}
									</Row>
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
			)}
		</>
	);
});
