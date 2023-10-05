import React from "react";
import { ALERT_SEVERITY_COLORS } from "./CodeError/index";
import styled from "styled-components";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import { HostApi } from "@codestream/webview/webview-api";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { RecentIssue } from "@codestream/protocols/agent";
import Tooltip from "./Tooltip";

interface Props {
	issues?: RecentIssue[];
	customPadding?: string;
}

export const ObservabilityAlertViolations = React.memo((props: Props) => {
	const { issues, customPadding } = props;

	const EntityHealth = styled.div<{ backgroundColor: string }>`
		background-color: ${props => (props.backgroundColor ? props.backgroundColor : "white")};
		width: 10px;
		height: 10px;
		display: inline-block;
		margin-right: 4px;
		margin-top: 4px;
	`;

	const handleRowClick = (e, violationUrl) => {
		e.preventDefault();
		HostApi.instance.send(OpenUrlRequestType, { url: violationUrl });
	};

	return (
		<>
			{issues?.map(_ => {
				return (
					<Row
						style={{
							padding: customPadding ? customPadding : "2px 10px 2px 60px",
						}}
						className={"pr-row"}
						onClick={e => {
							handleRowClick(e, _.deepLinkUrl);
						}}
					>
						<EntityHealth backgroundColor={ALERT_SEVERITY_COLORS[_.priority!]} />
						<Tooltip placement="topRight" title={_.title} delay={1}>
							<div style={{ minWidth: "0", padding: "0" }}>{_.title}</div>
						</Tooltip>
					</Row>
				);
			})}
		</>
	);
});
