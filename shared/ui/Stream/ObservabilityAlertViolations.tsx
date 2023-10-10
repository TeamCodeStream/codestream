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

	const severityColorMap: Record<RiskSeverity, string> = {
		CRITICAL: "#FF0000",
		HIGH: "#ee8608",
		MEDIUM: "#f1c232",
		INFO: "#0776e5",
		LOW: "#bcbcbc",
		UNKNOWN: "#ee8608",
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
					color: "white",
					borderRadius: "3px",
					backgroundColor: severityColorMap[props.severity],
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
