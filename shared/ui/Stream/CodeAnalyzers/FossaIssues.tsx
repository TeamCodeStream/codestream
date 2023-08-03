import React, { useState, Dispatch, SetStateAction } from "react";
import { lowerCase, capitalize } from "lodash-es";
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
import { CardTitle } from "@codestream/webview/Stream/SecurityIssuesWrapper";

interface Props {
	licDepIssues: LicenseDependencyIssue[];
	licDepError: string | undefined;
	vulnIssues: VulnerabilityIssue[];
	vulnError: string | undefined;
}

type LibraryWithVulnRowFunction = (props: { issue: VulnerabilityIssue }) => JSX.Element;
type LicenseDependencyRowFunction = (props: { issue: LicenseDependencyIssue }) => JSX.Element;

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
	displays: {
		label: string;
		description: string | string[];
		link?: boolean;
	}[];
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
								const { label, description, link } = display;
								return (
									<div>
										<b>{label}: </b>
										{description instanceof Array ? (
											<ul style={{ paddingLeft: "15px", marginTop: "5px" }}>
												{description.map(desc => {
													return (
														<>
															{link && (
																<li>
																	<Link href={desc}>{desc}</Link>
																</li>
															)}
															{!link && <li>{desc}</li>}
														</>
													);
												})}
											</ul>
										) : (
											<>
												{link && <Link href={description}>{description}</Link>}
												{!link && description}
											</>
										)}
									</div>
								);
							})}
						</div>
						{details && (
							<>
								<h3 style={{ margin: 0 }}>Details</h3>
								<div>
									<MarkdownText className="less-space" text={details} inline={false} />
								</div>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

const Issues = (props: {
	cn: string;
	expanded: boolean;
	title: string;
	issueType: string;
	issues: VulnerabilityIssue[] | LicenseDependencyIssue[];
	error: string | undefined;
	setExpanded: Dispatch<SetStateAction<boolean>>;
	IssueComponent: LibraryWithVulnRowFunction | LicenseDependencyRowFunction;
}) => {
	const { cn, expanded, title, issueType, issues, error, setExpanded, IssueComponent } = props;
	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 20px",
					alignItems: "baseline",
				}}
				className={cn}
				onClick={() => {
					setExpanded(!expanded);
				}}
			>
				{expanded && <Icon name="chevron-down-thin" />}
				{!expanded && <Icon name="chevron-right-thin" />}
				<span style={{ marginLeft: "2px", marginRight: "5px" }}>{title}</span>
			</Row>
			{expanded && issues.length > 0 && (
				<>
					{issues.map(issue => {
						return <IssueComponent issue={issue} />;
					})}
				</>
			)}
			{expanded && !error && issues.length === 0 && (
				<Row style={{ padding: "0 10px 0 30px" }}>
					<div>{`👍 No ${issueType} issues found`}</div>
				</Row>
			)}
			{expanded && error && issues.length === 0 && (
				<ErrorRow title={error} customPadding={"0 10px 0 30px"} />
			)}
		</>
	);
};

function LibraryWithVulnRow(props: { issue: VulnerabilityIssue }) {
	const [expanded, setExpanded] = useState<boolean>(false);
	const vuln = props.issue;

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
			<Row
				style={{ padding: "0 10px 0 45px" }}
				className={"pr-row"}
				onClick={() => {
					setExpanded(!expanded);
				}}
			>
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
						title={vuln.title}
						details={vuln.details}
						displays={[
							{ label: "Dependency", description: vuln.source.name },
							{ label: "Remediation Advice", description: vuln.remediation },
							{ label: "CVE", description: vuln.cve },
							{
								label: "Affected Project:",
								description: vuln.projects[0]?.title ?? "",
								link: true,
							},
							{ label: "CWE", description: vuln.cwes.join(", ") },
							{ label: "CVSS Score", description: JSON.stringify(vuln.cvss) },
							{ label: "CVSS Severity", description: capitalize(vuln.severity) },
							{
								label: "Dependency Depths",
								description: vuln.depths?.direct ? "Direct" : "Transitive",
							},
							{ label: "References", description: vuln.references, link: true },
						]}
						onClose={() => setExpanded(false)}
					/>
				</Modal>
			)}
		</>
	);
}

function LicenseDependencyRow(props: { issue: LicenseDependencyIssue }) {
	const [expanded, setExpanded] = useState<boolean>(false);
	const licenseDependency = props.issue;
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
							{ label: "Dependency", description: licenseDependency.source.name },
							{ label: "Issue Type", description: licenseDependency.type.split("_").join(" ") },
							{ label: "License", description: licenseDependency.license },
							{
								label: "Affected Project",
								description: licenseDependency.projects[0]?.title ?? "",
								link: true,
							},
							{
								label: "Dependency Depths",
								description: licenseDependency.depths.direct ? "Direct" : "Transitive",
							},
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
			<Issues
				cn={"vuln"}
				expanded={vulnExpanded}
				title={"Vulnerabilities"}
				issueType={"vulnerability"}
				issues={vulnIssues}
				error={vulnError}
				setExpanded={setVulnExpanded}
				IssueComponent={LibraryWithVulnRow}
			></Issues>

			<Issues
				cn={"licenseDep"}
				expanded={licenseDepExpanded}
				title={"License Dependencies"}
				issueType={"license dependency"}
				issues={licDepIssues}
				error={licDepError}
				setExpanded={setLicenseDepExpanded}
				IssueComponent={LicenseDependencyRow}
			></Issues>
		</>
	);
});
