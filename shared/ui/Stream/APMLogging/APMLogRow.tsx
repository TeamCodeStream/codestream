import React from "react";
import styled from "styled-components";
import Timestamp from "../Timestamp";

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
	width: 79%;
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
}) => {
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

	return (
		<>
			<RowContainer>
				<TimestampData>
					<LogSeverity style={{ backgroundColor: logSeverityToColor[props.severity] }} />
					<Timestamp time={props.timestamp} expandedTime={true} />
				</TimestampData>
				<MessageData>{props.message}</MessageData>
			</RowContainer>
		</>
	);
};
