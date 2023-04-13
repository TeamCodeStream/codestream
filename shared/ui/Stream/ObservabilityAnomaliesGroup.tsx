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

interface Props {
	observabilityAnomalies?: any;
	observabilityRepo?: any;
	entityGuid?: string;
	title?: string;
}
export const ObservabilityAnomaliesGroup = React.memo((props: Props) => {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const clmSettings = state.preferences.clmSettings || {};
		return {
			clmSettings,
		};
	}, shallowEqual);
	const [expanded, setExpanded] = useState<boolean>(true);
	const [showMoreExpanded, setShowMoreExpanded] = useState<boolean>(false);

	const getRoundedPercentage = ratio => {
		const percentage = (ratio - 1) * 100;
		const factor = Math.pow(10, 2);
		return Math.floor(percentage * factor) / factor;
	};

	const getRoundedPercentageOutput = ratio => {
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
						color:
							roundedPercentage > derivedState.clmSettings.minimumChangeValue ? "red" : "default",
					}}
				>
					{roundedPercentageText}
				</span>
			</div>
		);
	};

	const primaryAnomalies = props.observabilityAnomalies?.slice(0, 5);
	const secondaryAnomalies = props.observabilityAnomalies?.slice(5, 10);

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
					{primaryAnomalies.length == 0 ? (
						<ErrorRow
							customPadding={"0 10px 0 50px"}
							title={"No anomalies found"}
							icon="thumbsup"
						/>
					) : (
						<>
							{primaryAnomalies.map(anomaly => {
								return (
									<Row
										style={{
											padding: "0 10px 0 42px",
										}}
										className={"pr-row"}
										onClick={e => {
											HostApi.instance.send(EditorRevealSymbolRequestType, {
												className: anomaly.className,
												functionName: anomaly.functionName,
											});
											dispatch(closeAllPanels());
											dispatch(setCurrentObservabilityAnomaly(anomaly, props.entityGuid!));
											dispatch(openPanel(WebviewPanels.ObservabilityAnomaly));
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
					{secondaryAnomalies.length > 0 && (
						<>
							{!showMoreExpanded && (
								<div
									style={{ padding: "0px 10px 0px 50px", cursor: "pointer" }}
									onClick={() => setShowMoreExpanded(true)}
								>
									Show More
								</div>
							)}
							{showMoreExpanded && (
								<>
									{secondaryAnomalies.map(anomaly => {
										return (
											<Row
												style={{
													padding: "0 10px 0 42px",
												}}
												className={"pr-row"}
												onClick={e => {
													HostApi.instance.send(EditorRevealSymbolRequestType, {
														className: anomaly.className,
														functionName: anomaly.functionName,
													});
													dispatch(closeAllPanels());
													dispatch(setCurrentObservabilityAnomaly(anomaly, props.entityGuid!));
													dispatch(openPanel(WebviewPanels.ObservabilityAnomaly));
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
						</>
					)}
				</>
			)}
		</>
	);
});
