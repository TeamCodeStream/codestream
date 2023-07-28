import React, { useState } from "react";
import { lowerCase, capitalize } from "lodash-es";
import styled from "styled-components";
import {
	LicenseDependencyIssue,
	VulnSeverity,
	VulnerabilityIssue,
} from "@codestream/protocols/agent";
import Icon from "../Icon";
import Tooltip from "../Tooltip";
import { Link } from "@codestream/webview/Stream/Link";
import { Row } from "../CrossPostIssueControls/IssuesPane";
import { ErrorRow } from "@codestream/webview/Stream/Observability";
import { Modal } from "@codestream/webview/Stream/Modal";
import { MarkdownText } from "@codestream/webview/Stream/MarkdownText";

interface Props {
	licDepIssues: LicenseDependencyIssue[] | null;
	licDepError: string | null;
	vulnIssues: VulnerabilityIssue[] | null;
	vulnError: string | null;
}

const StyledSpan = styled.span`
	margin-left: 2px;
	margin-right: 5px;
`;

const CardTitle = styled.div`
	font-size: 16px;
	line-height: 20px;
	display: flex;
	justify-content: flex-start;
	width: 100%;
	margin-left: -28px;

	.title {
		flex-grow: 3;
	}

	.icon,
	.stream .icon,
	.ticket-icon {
		display: block;
		transform: scale(1.25);
		margin-top: 2px;
		padding: 0 8px 0 3px;
		vertical-align: -2px;
	}

	& + & {
		margin-left: 20px;
	}

	.link-to-ticket {
		.icon {
			padding: 0 8px;
			margin-left: 0;
		}
	}
`;

const severityColorMap: Record<VulnSeverity, string> = {
	critical: "#f52222",
	high: "#F5554B",
	medium: "#F0B400",
	low: "#0776e5",
	unknown: "#ee8608",
};

function Severity(props: { severity: VulnSeverity }) {
	return (
		<div className="icons" style={{ color: severityColorMap[props.severity] }}>
			{lowerCase(props.severity)}
		</div>
	);
}

function criticalityToRiskSeverity(riskSeverity: VulnSeverity): VulnSeverity {
	switch (riskSeverity) {
		case "critical":
			return "critical";
		case "high":
			return "high";
		case "medium":
			return "medium";
		case "low":
			return "low";
		case "unknown":
			return "unknown";
		default:
			return "low";
	}
}

function ModalView(props: {
	displays: (string | boolean)[][];
	title: string;
	details: string;
	onClose: () => void;
}) {
	const { displays, title, details } = props;

	return (
		<div className="codemark-form-container">
			<div className="codemark-form standard-form vscroll">
				<div className="form-body" style={{ padding: "20px 5px 20px 28px" }}>
					<div className="contents">
						<CardTitle>
							<Icon name="lock" className="ticket-icon" />
							<div className="title">{title}</div>
						</CardTitle>
						<div style={{ margin: "10px 0", whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
							{displays.map(display => {
								const [title, description, link] = display;
								return (
									<div>
										<b>{title} </b>
										{link && <Link href={`${description}`}>{description}</Link>}
										{!link && description}
									</div>
								);
							})}
						</div>
						<div>
							<MarkdownText className="less-space" text={details} inline={false} />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function LibraryWithVulnRow(props: { vuln: VulnerabilityIssue }) {
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
				<Severity severity={criticalityToRiskSeverity(vuln.severity ?? "unknown")} />
			</Row>
			{expanded && <VulnRow vuln={vuln} />}
		</>
	);
}

function VulnRow(props: { vuln: VulnerabilityIssue }) {
	const [expanded, setExpanded] = useState<boolean>(false);
	const { vuln } = props;
	return (
		<>
			<Row style={{ padding: "0 10px 0 40px" }} className={"pr-row"}>
				<div></div>
				<div>{props.vuln.title}</div>
			</Row>
			{expanded && (
				<Modal
					translucent
					onClose={() => {
						setExpanded(false);
					}}
				>
					<ModalView
						title={vuln.title ?? ""}
						details={vuln.details ?? ""}
						displays={[
							["Dependency:", "vuln.source?.name"],
							["Remediation Advice:", vuln.remediation ?? ""],
							["CVSS Severity:", capitalize(vuln.severity) ?? ""],
							["CVE", vuln.cve ?? ""],
							["CVSS score:", JSON.stringify(vuln.cvss) ?? ""],
							["Affected Project:", vuln.projects[0]?.title ?? "", true],
							["Reference(s):", vuln.source?.url, true],
							["Dependency Depths:", vuln.depths?.direct ? "Direct" : "Transitive"],
						]}
						onClose={() => setExpanded(false)}
					/>
				</Modal>
			)}
		</>
	);
}

function LicenseDependencyRow(props: { licenseDependency: LicenseDependencyIssue }) {
	const [expanded, setExpanded] = useState<boolean>(false);
	const { licenseDependency } = props;
	const { source } = licenseDependency;
	const licenseText = licenseDependency.license ? licenseDependency.license : "No license found";
	const licenseIssueText = `${licenseText} in ${source.name} (${source.version})`;

	return (
		<>
			<Row
				style={{ padding: "0 10px 0 30px" }}
				className={"pr-row"}
				onClick={() => {
					setExpanded(!expanded);
				}}
			>
				<div></div>
				<div>
					<Tooltip placement="bottom" title={licenseIssueText} delay={1}>
						<span>{licenseIssueText}</span>
					</Tooltip>
				</div>
			</Row>
			{expanded && (
				<Modal
					translucent
					onClose={() => {
						setExpanded(false);
					}}
				>
					<ModalView
						title={`${capitalize(licenseDependency.source.name)}: ${licenseDependency.license}`}
						details={licenseDependency.details ?? ""}
						displays={[
							["Dependency:", licenseDependency.source.name ?? ""],
							["Issue Type: ", licenseDependency.type.split("_").join(" ")],
							["License: ", licenseDependency.license ?? ""],
							["Affected Project:", licenseDependency.projects[0]?.title ?? "", true],
							["Dependency Depths:", licenseDependency.depths?.direct ? "Direct" : "Transitive"],
						]}
						onClose={() => setExpanded(false)}
					/>
				</Modal>
			)}
		</>
	);
}

export const FossaIssues = React.memo((props: Props) => {
	const [licenseDepExpanded, setLicenseDepExpanded] = useState<boolean>(false);
	const [vulnExpanded, setVulnExpanded] = useState<boolean>(false);
	const { vulnIssues, vulnError, licDepIssues, licDepError } = props;
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
			{vulnExpanded && vulnIssues?.length && (
				<>
					{vulnIssues.map(vuln => {
						return <LibraryWithVulnRow vuln={vuln} />;
					})}
				</>
			)}
			{vulnExpanded && vulnIssues && vulnIssues.length === 0 && (
				<Row style={{ padding: "0 10px 0 40px" }}>👍 No vulnerabilities found</Row>
			)}
			{vulnExpanded && vulnError && (
				<ErrorRow title="Error fetching data from FOSSA" customPadding={"0 10px 0 40px"} />
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
			{licenseDepExpanded && licDepIssues && licDepIssues?.length && (
				<>
					{licDepIssues.map(issue => {
						return <LicenseDependencyRow licenseDependency={issue} />;
					})}
				</>
			)}
			{licenseDepExpanded && licDepIssues && licDepIssues.length === 0 && (
				<Row style={{ padding: "0 10px 0 40px" }}>👍 No license dependency issues found</Row>
			)}
			{licenseDepExpanded && licDepError && (
				<ErrorRow title="Error fetching data from FOSSA" customPadding={"0 10px 0 40px"} />
			)}
		</>
	);
});
