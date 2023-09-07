import React, { useState } from "react";

import Tooltip from "@codestream/webview/Stream/Tooltip";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";

interface Props {
	logs?: string[];
	logsError?: string;
	entityGuid?: string;
	loadingLogs: boolean;
}

export const LogRow = (props: { logEntry: string }) => {
	return (
		<Row className={"pr-row no-shrink"} style={{ padding: "0 10px 0 50px" }}>
			<div>
				<Tooltip delay={1} placement="bottom">
					<span>{props.logEntry}</span>
				</Tooltip>
			</div>

			<div className={"icons"}></div>
		</Row>
	);
};

export const ObservabilityLogsWrapper = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(false);
	const { logs, logsError, entityGuid } = props;

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 30px",
				}}
				className={"pr-row"}
				onClick={() => setExpanded(!expanded)}
			>
				{expanded && <Icon name="chevron-down-thin" />}
				{!expanded && <Icon name="chevron-right-thin" />}
				<span style={{ marginLeft: "2px", marginRight: "5px" }}>Logs</span>
				{logsError && <Icon name="alert" className="alert" title={logsError} delay={1} />}
			</Row>
			{expanded && (
				<>
					{logs?.map((logEntry, index) => {
						return <LogRow logEntry={logEntry} />;
					})}
				</>
			)}
		</>
	);
});
