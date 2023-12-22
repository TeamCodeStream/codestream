import React, { useMemo, useState } from "react";
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
import Icon from "./Icon";
import styled from "styled-components";
import { isEmpty as _isEmpty } from "lodash-es";

interface Props {
	observabilityAnomalies: ObservabilityAnomaly[];
	observabilityRepo: ObservabilityRepo;
	detectionMethod?: DetectionMethod;
	entityGuid?: string;
	title?: string;
	collapseDefault?: boolean;
	noAnomaly?: boolean;
}

const TransactionIconSpan = styled.span`
	padding-top: 3px;
	margin-right: 4px;
`;

const FilePathWrapper = styled.div`
	display: flex;
	align-items: baseline;
`;

const FilePathMiddleSection = styled.span`
	overflow: hidden;
	height: inherit;
	flex: 0 1 auto;
	white-space: nowrap;
	direction: rtl;
	text-overflow: ellipsis;
	text-overflow: "...";
	min-width: 14px;
`;

export const ObservabilityAnomaliesGroup = React.memo((props: Props) => {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const clmSettings = state.preferences.clmSettings || {};
		return {
			clmSettings,
		};
	}, shallowEqual);
	const [numToShow, setNumToShow] = useState(5);
	const [hoveredRowIndex, setHoveredRowIndex] = useState<string | undefined>(undefined);
	const hasMoreAnomaliesToShow = props.observabilityAnomalies.length > numToShow;

	const handleClickTelemetry = () => {
		const event = {
			"Detection Method": props.detectionMethod ?? "<unknown>",
			Language: props.observabilityAnomalies[0]?.language ?? "<unknown>",
		};

		console.debug("CLM Anomaly Clicked", event);

		HostApi.instance.track("CLM Anomaly Clicked", event);
	};

	const handleClick = (anomaly: ObservabilityAnomaly) => {
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
	};

	const formatFilePath = (filepath: String) => {
		const sections = filepath.split("/");
		const first = sections[0];
		const middle = sections.slice(1, -1).join("/");
		const last = sections[sections.length - 1];

		return (
			<FilePathWrapper>
				<span>
					{first}
					{!_isEmpty(middle) && <>/</>}
				</span>
				{!_isEmpty(middle) && <FilePathMiddleSection>{middle}</FilePathMiddleSection>}
				<span>/{last}</span>
			</FilePathWrapper>
		);
	};

	const getAnomalyTypeLabel = (type: "errorRate" | "duration") => {
		switch (type) {
			case "duration":
				return "Average Duration";
			case "errorRate":
				return "Error Rate";
			default:
				return "";
		}
	};

	const getRoundedPercentage = ratio => {
		const percentage = (ratio - 1) * 100;
		const factor = Math.pow(10, 2);
		return Math.floor(percentage * factor) / factor;
	};

	const tooltipContent = anomaly => {
		const roundedPercentage = getRoundedPercentage(anomaly.ratio);
		let roundedPercentageText =
			roundedPercentage > 0 ? `+${roundedPercentage}%` : `+${roundedPercentage}%`;
		const anomalyTypeText = getAnomalyTypeLabel(anomaly.type);

		return (
			<div>
				<div style={{ overflowWrap: "break-word", marginBottom: "4px" }}>{anomaly.text}</div>
				<div>
					{anomalyTypeText}: <span style={{ color: "red" }}>{roundedPercentageText}</span>
				</div>
			</div>
		);
	};

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
											onMouseEnter={() => {
												setHoveredRowIndex(`parent_${index}`);
											}}
											onMouseLeave={() => {
												setHoveredRowIndex(undefined);
											}}
										>
											<TransactionIconSpan>
												<Icon className="subtle" name="transaction" />
											</TransactionIconSpan>
											<Tooltip title={tooltipContent(anomaly)} placement="topRight" delay={1}>
												{formatFilePath(anomaly.text)}
											</Tooltip>

											<AnomalyIcon
												anomaly={anomaly}
												noAnomaly={props?.noAnomaly}
												isHovered={hoveredRowIndex === `parent_${index}` ? true : false}
											/>
										</Row>
										{anomaly.children &&
											anomaly.children
												.sort((a, b) => b.ratio - a.ratio)
												.map((child, childIndex) => {
													return (
														<Row
															style={{
																padding: "0 10px 0 54px",
															}}
															className={"pr-row"}
															onClick={e => {
																handleClick(child);
															}}
															onMouseEnter={() => {
																setHoveredRowIndex(`child_${index}_${childIndex}`);
															}}
															onMouseLeave={() => {
																setHoveredRowIndex(undefined);
															}}
														>
															<TransactionIconSpan>
																<span>&nbsp;</span>
															</TransactionIconSpan>
															<Tooltip title={tooltipContent(child)} placement="topRight" delay={1}>
																{formatFilePath(child.text)}
															</Tooltip>
															<AnomalyIcon
																anomaly={anomaly}
																noAnomaly={props?.noAnomaly}
																isHovered={
																	hoveredRowIndex === `child_${index}_${childIndex}` ? true : false
																}
															/>
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

interface AnomalyIconsProps {
	anomaly: ObservabilityAnomaly;
	noAnomaly?: boolean;
	isHovered: boolean;
}
const AnomalyIcon = React.memo((props: AnomalyIconsProps) => {
	const getAnomalyTypeLabel = (type: "errorRate" | "duration") => {
		switch (type) {
			case "duration":
				return "clock";
			case "errorRate":
				return "alert";
			default:
				return "";
		}
	};

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
		const iconName = getAnomalyTypeLabel(type);

		return (
			<div
				style={{
					overflow: "visible",
					marginLeft: "auto",
					textAlign: "right",
					direction: "rtl",
					width: "40%",
				}}
			>
				<span
					style={{
						color: "red",
						display: "inline-block",
						minWidth: "66px",
					}}
				>
					{roundedPercentageText}
				</span>
				<Icon
					style={{
						transform: "scale(0.8)",
						marginLeft: "0px",
						display: "inline-block",
						paddingLeft: "2px",
					}}
					className="subtle"
					name={iconName}
				/>
			</div>
		);
	};

	const iconContent = useMemo(() => {
		return (
			<>
				{props.isHovered ? (
					<span
						onClick={e => {
							e.preventDefault();
							e.stopPropagation();
						}}
					>
						<Icon
							name="globe"
							className="clickable"
							title="View on New Relic"
							placement="bottomLeft"
							delay={1}
						/>
					</span>
				) : (
					<div>{getTypeAndValueOutput(props.anomaly.type, props.anomaly.ratio)}</div>
				)}
			</>
		);
	}, [props.isHovered, props.anomaly.type, props.anomaly.ratio, props.noAnomaly]);

	return (
		<div style={{ paddingLeft: "0px" }} className="icons">
			{iconContent}
		</div>
	);
});
