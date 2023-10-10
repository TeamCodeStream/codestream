import React from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import { HostApi } from "@codestream/webview/webview-api";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { RecentIssue, RiskSeverity } from "@codestream/protocols/agent";
import Tooltip from "./Tooltip";
import { lowerCase } from "lodash-es";

interface Props {
	issues?: RecentIssue[];
	customPadding?: string;
}

export const ObservabilityAlertViolations = React.memo((props: Props) => {
	const { issues, customPadding } = props;

	const severityBackgroundColorMap: Record<RiskSeverity, string> = {
		CRITICAL: "#f8a6a6",
		HIGH: "#e0b484",
		MEDIUM: "#fae29a",
		INFO: "#9ec9f5",
		LOW: "#bcbcbc",
		UNKNOWN: "#ffffff",
	};

	const severityColorMap: Record<RiskSeverity, string> = {
		CRITICAL: "#8d0d04",
		HIGH: "#513405",
		MEDIUM: "#8c6b05",
		INFO: "#0776e5",
		LOW: "#444444",
		UNKNOWN: "#000000",
	};

	function criticalityToRiskSeverity(riskSeverity): RiskSeverity {
		switch (riskSeverity) {
			case "CRITICAL":
				return "CRITICAL";
			case "HIGH":
				return "HIGH";
			case "MODERATE":
				return "MEDIUM";
			case "MEDIUM":
				return "MEDIUM";
			case "LOW":
				return "LOW";
			case "INFO":
				return "INFO";
			case "UNKNOWN":
				return "UNKNOWN";
			default:
				return "LOW";
		}
	}

	function Severity(props: { severity: RiskSeverity }) {
		// const riskSeverity = calculateRisk(props.score);
		// style={{color: severityColorMap[props.severity]}}
		return (
			<div
				className="icons"
				style={{
					color: severityColorMap[props.severity],
					borderRadius: "3px",
					backgroundColor: severityBackgroundColorMap[props.severity],
					marginRight: "5px",
					marginLeft: "5px",
				}}
			>
				{lowerCase(props.severity)}
			</div>
		);
	}

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
							handleRowClick(e, _.deepLinkUrl![0]);
						}}
					>
						<Severity severity={criticalityToRiskSeverity(_.priority!)} />
						<Tooltip placement="topRight" title={_.title!} delay={1}>
							<div style={{ minWidth: "0", padding: "5" }}>{_.title!}</div>
						</Tooltip>
					</Row>
				);
			})}
		</>
	);
});
