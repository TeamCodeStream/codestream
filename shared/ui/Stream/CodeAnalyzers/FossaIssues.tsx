import React, { useState } from "react";
import { lowerCase, upperCase } from "lodash-es";
import styled from "styled-components";
import {
	LicenseDependencyIssue,
	VulnSeverity,
	VulnerabilityIssue,
} from "@codestream/protocols/agent";
import Icon from "../Icon";
import Tooltip from "../Tooltip";
import { Row } from "../CrossPostIssueControls/IssuesPane";

const StyledSpan = styled.span`
	margin-left: 2px;
	margin-right: 5px;
`;

interface Props {
	issues: LicenseDependencyIssue[];
	vulnIssues: VulnerabilityIssue[];
}

const severityColorMap: Record<VulnSeverity, string> = {
	CRITICAL: "#f52222",
	HIGH: "#F5554B",
	MEDIUM: "#F0B400",
	LOW: "#0776e5",
	UNKNOWN: "#ee8608",
};

function LicenseDependencyRow(props: { licenseDependency }) {
	const { licenseDependency } = props;
	const { source } = licenseDependency;
	const licenseText = licenseDependency.license ? licenseDependency.license : "No license found";
	const licenseIssueText = `${licenseText} in ${source.name} (${source.version})`;

	return (
		<>
			<Row style={{ padding: "0 10px 0 30px" }} className={"pr-row"}>
				<div></div>
				<div>
					<Tooltip placement="bottom" title={licenseIssueText} delay={1}>
						<span>{licenseIssueText}</span>
					</Tooltip>
				</div>
			</Row>
		</>
	);
}

function Severity(props: { severity: VulnSeverity }) {
	return (
		<div className="icons" style={{ color: severityColorMap[props.severity] }}>
			{lowerCase(props.severity)}
		</div>
	);
}

function criticalityToRiskSeverity(riskSeverity: VulnSeverity): VulnSeverity {
	switch (upperCase(riskSeverity)) {
		case "CRITICAL":
			return "CRITICAL";
		case "HIGH":
			return "HIGH";
		case "MEDIUM":
			return "MEDIUM";
		case "LOW":
			return "LOW";
		case "UNKNOWN":
			return "UNKNOWN";
		default:
			return "LOW";
	}
}

function LibraryRow(props: { vuln }) {
	const [expanded, setExpanded] = useState<boolean>(false);
	const { vuln } = props;

	const subtleText = vuln.remediation
		? `${vuln.source.version} -> ${vuln.remediation}`
		: `${vuln.source.version}`;
	const tooltipText = vuln.remediation
		? `Recommended fix: upgrade ${vuln.source.version} to ${vuln.remediation}`
		: undefined;

	return (
		<>
			<Row
				style={{ padding: "0 10px 0 30px" }}
				className={"pr-row"}
				onClick={() => {
					setExpanded(!expanded);
				}}
			>
				<div>
					{expanded && <Icon name="chevron-down-thin" />}
					{!expanded && <Icon name="chevron-right-thin" />}
				</div>
				<div>
					{vuln.source.name}{" "}
					<Tooltip placement="bottom" title={tooltipText} delay={1}>
						<span className="subtle">{subtleText}</span>
					</Tooltip>
				</div>
				<Severity severity={criticalityToRiskSeverity(vuln.severity)} />
			</Row>
			{expanded && <VulnRow vuln={vuln} />}
		</>
	);
}

function VulnRow(props: { vuln }) {
	return (
		<>
			<Row style={{ padding: "0 10px 0 40px" }} className={"pr-row"}>
				<div></div>
				<div>{props.vuln.title}</div>
			</Row>
		</>
	);
}

export const FossaIssues = React.memo((props: Props) => {
	const [licenseDepExpanded, setLicenseDepExpanded] = useState<boolean>(false);
	const [vulnExpanded, setVulnExpanded] = useState<boolean>(false);

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 20px",
					alignItems: "baseline",
				}}
				className="vuln"
				onClick={() => {
					setVulnExpanded(!vulnExpanded);
				}}
			>
				{vulnExpanded && <Icon name="chevron-down-thin" />}
				{!vulnExpanded && <Icon name="chevron-right-thin" />}
				<span style={{ marginLeft: "2px", marginRight: "5px" }}>Vulnerabilities</span>
			</Row>
			{vulnExpanded && props.vulnIssues && props.vulnIssues.length > 0 && (
				<>
					{props.vulnIssues.map(vuln => {
						return <LibraryRow vuln={vuln} />;
					})}
				</>
			)}
			{vulnExpanded && props.vulnIssues && props.vulnIssues.length === 0 && (
				<Row style={{ padding: "0 10px 0 30px" }}>
					<div>👍 No vulnerability issues found</div>
				</Row>
			)}
			<Row
				style={{
					padding: "2px 10px 2px 20px",
					alignItems: "baseline",
				}}
				className="licenseDep"
				onClick={() => {
					setLicenseDepExpanded(!licenseDepExpanded);
				}}
			>
				{licenseDepExpanded && <Icon name="chevron-down-thin" />}
				{!licenseDepExpanded && <Icon name="chevron-right-thin" />}
				<StyledSpan>License Dependencies</StyledSpan>
			</Row>
			{licenseDepExpanded && props.issues?.length > 0 && (
				<>
					{props.issues.map(issue => {
						return <LicenseDependencyRow licenseDependency={issue} />;
					})}
				</>
			)}
			{licenseDepExpanded && props.issues?.length === 0 && (
				<Row style={{ padding: "0 10px 0 30px" }}>
					<div>👍 No license dependency issues found</div>
				</Row>
			)}
		</>
	);
});
