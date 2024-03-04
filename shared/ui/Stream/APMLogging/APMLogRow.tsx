import React, { useState, useRef } from "react";
import styled from "styled-components";
import Timestamp from "../Timestamp";
import Icon from "@codestream/webview/Stream/Icon";
import { isEmpty as _isEmpty } from "lodash-es";
import { HostApi } from "@codestream/webview/webview-api";
import { LogResult, LogResultSpecialColumns } from "@codestream/protocols/agent";
import copy from "copy-to-clipboard";
import Tooltip from "../Tooltip";

const LogSeverity = styled.span`
	border-radius: 1px;
	box-sizing: border-box;
	display: flex;
	height: 8px;
	position: relative;
	width: 8px;
	overflow: hidden;
	margin-top: 5px;
`;

const logSeverityToColor = {
	severe: "#df2d24",
	fatal: "#df2d24",
	error: "#df2d24",

	warn: "#ffd23d",
	warning: "#ffd23d",

	info: "#0c74df",
	trace: "#0c74df",
	debug: "#0c74df",
};

const TimestampData = styled.div`
	width: 20%;
	display: flex;
`;

const MessageData = styled.div`
	width: 78%;
	font-family: "Menlo", "Consolas", monospace;
`;

const RowContainer = styled.div`
	display: flex;
	padding: 1em;
	border-right: 1px solid var(--base-border-color);
`;

const ShowMoreContainer = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
`;

const ShowSurroundingHeader = styled.div`
	background-color: var(--button-background-color);
	color: var(--text-color-highlight);
	padding: 0.5em;
	display: flex;
	justify-content: space-between;
`;

const ActionContainer = styled.div`
	display: flex;
	border: 1px solid var(--base-border-color);
	border-radius: 4px;
	padding: 0.4em;
`;

const HoverContainer = styled.div`
	cursor: pointer;
	position: absolute;
	top: 4px;
	right: 6px;
	background-color: var(--app-background-color-hover);
	box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
`;

const DetailViewTable = styled.div`
	width: 100%;
	display: flex;
	flex-direction: column;
	border: 1px solid var(--base-border-color);

	.row {
		display: flex;

		.cell {
			padding: 10px;
		}

		.heading {
			flex: 1;
			word-break: break-all;
			background: var(--base-background-color);
			border-right: 1px solid var(--base-border-color);
			border-bottom: 1px solid var(--base-border-color);
			font-weight: bold;
		}

		.data {
			flex: 3;
			border-bottom: 1px solid var(--base-border-color);
			word-break: break-all;

			.copy {
				display: none;

				&:hover {
					cursor: pointer;
				}
			}

			&:hover {
				.copy {
					display: inline-block;
				}
			}
		}
	}
`;

const hiddenColumns = [
	"expandedContent",
	LogResultSpecialColumns.message,
	LogResultSpecialColumns.severity,
	LogResultSpecialColumns.summary,
];

export const APMLogRow = (props: {
	timestamp: string;
	severity: string;
	message: string;
	accountId?: number;
	entityGuid?: string;
	logRowData: LogResult;
	showMore?: boolean;
	updateExpandedContent: Function;
	updateShowSurrounding: Function;
	isShowSurrounding: string;
	index: number;
	expandedContent: any;
	enableShowSurrounding: boolean;
}) => {
	const elementRef = useRef(null);

	const [isHovered, setIsHovered] = useState(false);
	const handleMouseEnter = () => {
		setIsHovered(true);
	};

	const handleMouseLeave = () => {
		setIsHovered(false);
	};

	if (props.showMore) {
		return (
			<ShowMoreContainer>
				<span onClick={() => {}}>Show More</span>
			</ShowMoreContainer>
		);
	}

	const trackTelemetry = () => {
		HostApi.instance.track("codestream/logs/expand_button clicked", {
			entity_guid: `${props.entityGuid}`,
			account_id: props.accountId,
			event_type: "click",
		});
	};

	const handleClickExpand = () => {
		let updatedJsx;

		trackTelemetry();

		if (_isEmpty(props.expandedContent)) {
			const keys = Object.keys(props.logRowData).sort();

			updatedJsx = (
				<DetailViewTable>
					{keys.map(k => {
						if (hiddenColumns.includes(k)) {
							return;
						}

						return (
							<div className="row">
								<div className="cell heading">{k}</div>
								<div className="cell data">
									{props.logRowData[k]}{" "}
									<Icon
										name="copy"
										className="copy"
										title="Copy"
										onClick={() => {
											copy(props.logRowData[k]);
										}}
									></Icon>
								</div>
							</div>
						);
					})}
				</DetailViewTable>
			);
		} else {
			updatedJsx = undefined;
		}

		props.updateExpandedContent(props.index, updatedJsx);
	};

	const handleClickShowSurrounding = () => {
		props.updateShowSurrounding(props.index, "show");
	};

	const handleClickCloseSurrounding = () => {
		props.updateShowSurrounding(props.index, "reset");
	};

	const handkeClickCopyJson = () => {
		if (props.logRowData) {
			copy(JSON.stringify(props.logRowData, null, 2));
		}
	};

	return (
		<>
			{props.isShowSurrounding === "true" && (
				<>
					<ShowSurroundingHeader>
						<span style={{ marginRight: "4px" }}> Selected Log</span>
						<span style={{ cursor: "pointer" }}>
							<Icon
								onClick={handleClickCloseSurrounding}
								name="x"
								style={{ cursor: "pointer" }}
								title="Close"
							/>
						</span>
					</ShowSurroundingHeader>

					<RowContainer
						style={{ backgroundColor: "var(--app-background-color-hover" }}
						onMouseEnter={handleMouseEnter}
						onMouseLeave={handleMouseLeave}
					>
						<TimestampData>
							<Icon
								onClick={handleClickExpand}
								name={props.expandedContent ? "chevron-down-thin" : "chevron-right-thin"}
								style={{ cursor: "pointer", marginRight: "2px" }}
							/>
							<Tooltip content={props?.severity?.toLowerCase()} delay={0.5}>
								<LogSeverity
									style={{
										backgroundColor:
											logSeverityToColor[props?.severity?.toLowerCase()] || "#0c74df",
									}}
								/>
							</Tooltip>
							<Timestamp time={props.timestamp} expandedTime={true} />
						</TimestampData>
						<MessageData>{props.expandedContent || props.message}</MessageData>
					</RowContainer>
				</>
			)}

			{props.isShowSurrounding !== "true" && (
				<RowContainer onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
					<TimestampData>
						<Icon
							onClick={handleClickExpand}
							name={props.expandedContent ? "chevron-down-thin" : "chevron-right-thin"}
							style={{ cursor: "pointer", marginRight: "2px" }}
						/>
						<Tooltip content={props?.severity?.toLowerCase()} delay={0.5}>
							<LogSeverity
								style={{
									backgroundColor: logSeverityToColor[props?.severity?.toLowerCase()] || "#0c74df",
								}}
							/>
						</Tooltip>
						<Timestamp time={props.timestamp} expandedTime={true} />
					</TimestampData>
					<MessageData>{props.expandedContent || props.message}</MessageData>

					{isHovered && (
						<HoverContainer>
							<ActionContainer>
								<div>
									<Icon
										onClick={handkeClickCopyJson}
										name="copy"
										style={{ cursor: "pointer" }}
										title="Copy JSON"
										delay={1}
										className="clickable"
									/>
								</div>
								{props.enableShowSurrounding && (
									<div style={{ marginLeft: "8px" }}>
										<Icon
											onClick={handleClickShowSurrounding}
											name="resize-vertical-rounded"
											style={{ cursor: "pointer" }}
											title="Show Surrounding Logs"
											delay={1}
											className="clickable"
										/>
									</div>
								)}
							</ActionContainer>
						</HoverContainer>
					)}
				</RowContainer>
			)}
		</>
	);
};
