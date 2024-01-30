import React, { useState } from "react";
import styled from "styled-components";
import Timestamp from "../Timestamp";
import Icon from "@codestream/webview/Stream/Icon";
import { isEmpty as _isEmpty } from "lodash-es";
import { HostApi } from "@codestream/webview/webview-api";
import { LogResult } from "@codestream/protocols/agent";
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
	width: 80%;
	font-family: "Menlo", "Consolas", monospace;
`;

const RowContainer = styled.div`
	display: flex;
`;

const ShowMoreContainer = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
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

const hiddenColumns = ["log_summary", "expandedContent"];

export const APMLogRow = (props: {
	timestamp: string;
	severity: string;
	message: string;
	accountId?: number;
	entityGuid?: string;
	logRowData: LogResult;
	showMore?: boolean;
	updateData: Function;
	index: number;
	expandedContent: any;
}) => {
	const [isExpanded, setIsExpanded] = useState(false);

	if (props.showMore) {
		return (
			<ShowMoreContainer>
				<span
					onClick={() => {
						trackTelemetry();
					}}
				>
					Show More
				</span>
			</ShowMoreContainer>
		);
	}

	const trackTelemetry = () => {
		HostApi.instance.track("codestream/expand_button clicked", {
			entity_guid: `${props.entityGuid}`,
			account_id: `${props.accountId}`,
			event_type: "click",
		});
	};

	const handleClickExpand = () => {
		let updatedJsx;
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

		props.updateData(props.index, updatedJsx);
	};

	return (
		<>
			<RowContainer>
				<TimestampData>
					<Icon
						onClick={handleClickExpand}
						name={props.expandedContent ? "chevron-down-thin" : "chevron-right-thin"}
						style={{ cursor: "pointer", marginRight: "2px" }}
					/>
					<Tooltip content={props.severity.toLowerCase()} delay={0.5}>
						<LogSeverity
							style={{ backgroundColor: logSeverityToColor[props.severity.toLowerCase()] }}
						/>
					</Tooltip>
					<Timestamp time={props.timestamp} expandedTime={true} />
				</TimestampData>
				{!props.expandedContent && <MessageData>{props.message}</MessageData>}
				{props.expandedContent && <MessageData>{props.expandedContent}</MessageData>}
			</RowContainer>
		</>
	);
};
