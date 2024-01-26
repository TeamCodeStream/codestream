import React, { useState } from "react";
import styled from "styled-components";
import Timestamp from "../Timestamp";
import Icon from "@codestream/webview/Stream/Icon";
import { isEmpty as _isEmpty } from "lodash-es";

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
	fatal: "#df2d24",
	error: "#df2d24",
	warn: "#ffd23d",
	info: "#0c74df",
	trace: "",
	debug: "",
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

export const APMLogRow = (props: {
	timestamp: string;
	severity: string;
	message: string;
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
						console.warn("clicked Show More");
					}}
				>
					Show More
				</span>
			</ShowMoreContainer>
		);
	}

	const handleClickExpand = () => {
		let updatedJsx;
		if (_isEmpty(props.expandedContent)) {
			updatedJsx = (
				<div>
					hello world expanded <br />
					hello world expanded <br />
					hello world expanded <br />
					hello world expanded <br />
					hello world expanded <br />
					hello world expanded <br />
					hello world expanded <br />
					hello world expanded <br />
					hello world expanded <br />
					hello world expanded <br />
					hello world expanded <br />
					hello world expanded <br />
				</div>
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
					<LogSeverity style={{ backgroundColor: logSeverityToColor[props.severity] }} />
					<Timestamp time={props.timestamp} expandedTime={true} />
				</TimestampData>
				{!props.expandedContent && <MessageData>{props.message}</MessageData>}
				{props.expandedContent && <MessageData>{props.expandedContent}</MessageData>}
			</RowContainer>
		</>
	);
};
