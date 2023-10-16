import React from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import { HostApi } from "@codestream/webview/webview-api";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { RecentIssue } from "@codestream/protocols/agent";
import Tooltip from "./Tooltip";

interface Props {
	issues?: RecentIssue[];
	customPadding?: string;
	entityGuid?: string;
}

export const ObservabilityAlertViolations = React.memo((props: Props) => {
	const { issues, customPadding } = props;

	const severityBackgroundColorMap = {
		Critical: "#fee5e5",
		High: "#f7dfca",
		Medium: "#fdf2c4",
		Low: "#e7e9e9",
	};

	const severityColorMap = {
		Critical: "#b00f0a",
		High: "#a14e02",
		Medium: "#8e6806",
		Low: "#535e65",
	};

	function criticalityToRiskSeverity(riskSeverity) {
		switch (riskSeverity) {
			case "CRITICAL":
				return "Critical";
			case "HIGH":
				return "High";
			case "MODERATE":
				return "Medium";
			case "MEDIUM":
				return "Medium";
			default:
				return "Low";
		}
	}

	function Severity(props: { severity }) {
		return (
			<div className="icons">
				<span
					style={{
						color: severityColorMap[props.severity],
						borderRadius: "3px",
						backgroundColor: severityBackgroundColorMap[props.severity],
						padding: "1px 2px 1px 2px",
					}}
				>
					{props.severity}
				</span>
			</div>
		);
	}

	const handleRowClick = (e, violationUrl) => {
		e.preventDefault();
		HostApi.instance.track("Issue Clicked", { "Entity GUID": props.entityGuid });
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
							handleRowClick(e, _.url);
						}}
					>
						<div></div>{" "}
						{/* this extra div is for the inherited flexbox properties; we need the 3 */}
						<Tooltip placement="topRight" title={_.title!} delay={1}>
							<div style={{ minWidth: "0", padding: "5" }}>{_.title!}</div>
						</Tooltip>
						<Severity severity={criticalityToRiskSeverity(_.priority!)} />
					</Row>
				);
			})}
		</>
	);
});
