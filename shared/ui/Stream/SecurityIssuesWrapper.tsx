import {
	CriticalityType,
	CsecDataLibrary,
	ERROR_VM_NOT_SETUP,
	GetCsecLibraryDetailsType,
	GetLibraryDetailsType,
	LibraryDetails,
	RiskSeverity,
	riskSeverityList,
	Vuln,
} from "@codestream/protocols/agent";
import { isEmpty, lowerCase } from "lodash-es";
import React, { useEffect, useState } from "react";
import styled from "styled-components";

import { Link } from "@codestream/webview/Stream/Link";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { HostApi } from "@codestream/webview/webview-api";
import { ErrorRow } from "@codestream/webview/Stream/Observability";
import { MarkdownText } from "@codestream/webview/Stream/MarkdownText";
import { Modal } from "@codestream/webview/Stream/Modal";
import { InlineMenu, MenuItem } from "@codestream/webview/src/components/controls/InlineMenu";
import { SmartFormattedList } from "@codestream/webview/Stream/SmartFormattedList";
import { useCsecRequestType, useRequestType } from "@codestream/webview/utilities/hooks";
import { ResponseError } from "vscode-jsonrpc";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import Tooltip from "./Tooltip";
import { ObservabilityLoadingVulnerabilities } from "@codestream/webview/Stream/ObservabilityLoading";

interface Props {
	currentRepoId: string;
	entityGuid: string;
	accountId: number;
	setHasVulnerabilities: (value: boolean) => void;
	setHasCsecVulnerabilities: (value: boolean) => void;
}

function isResponseUrlError<T>(obj: unknown): obj is ResponseError<{ url: string }> {
	if (!obj) {
		return false;
	}
	const anyobj = obj as any;
	return (
		Object.prototype.hasOwnProperty.call(obj, "code") &&
		Object.prototype.hasOwnProperty.call(obj, "message") &&
		Object.prototype.hasOwnProperty.call(obj, "data") &&
		Object.prototype.hasOwnProperty.call(anyobj.data, "url")
	);
}

export const CardTitle = styled.div`
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

const severityColorMap: Record<RiskSeverity, string> = {
	CRITICAL: "#f52222",
	HIGH: "#F5554B",
	MEDIUM: "#F0B400",
	INFO: "#0776e5",
	LOW: "#0776e5",
	UNKNOWN: "#ee8608",
};

function criticalityToRiskSeverity(riskSeverity: CriticalityType): RiskSeverity {
	switch (riskSeverity) {
		case "CRITICAL":
			return "CRITICAL";
		case "HIGH":
			return "HIGH";
		case "MODERATE":
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
		<div className="icons" style={{ color: severityColorMap[props.severity] }}>
			{lowerCase(props.severity)}
		</div>
	);
}

function Additional(props: { onClick: () => void; additional?: number }) {
	return props.additional && props.additional > 0 ? (
		<Row
			onClick={props.onClick}
			style={{
				padding: "0 10px 0 42px",
			}}
		>
			<div>
				<Icon style={{ transform: "scale(0.9)" }} name="plus" />
			</div>
			<div>See additional {props.additional} vulnerabilities</div>
		</Row>
	) : null;
}

function CsecAdditional(props: { onClick: () => void; csecAdditional?: number }) {
	return props.csecAdditional && props.csecAdditional > 0 ? (
		<Row
			onClick={props.onClick}
			style={{
				padding: "0 10px 0 42px",
			}}
		>
			<div>
				<Icon style={{ transform: "scale(0.9)" }} name="plus" />
			</div>
			<div>See additional {props.csecAdditional} exploitable vulnerabilities</div>
		</Row>
	) : null;
}

function VulnView(props: { vuln: Vuln; onClose: () => void }) {
	const { vuln } = props;
	HostApi.instance.track("Vulnerability Clicked");
	return (
		<div className="codemark-form-container">
			<div className="codemark-form standard-form vscroll">
				<div className="form-body" style={{ padding: "20px 5px 20px 28px" }}>
					<div className="contents">
						<CardTitle>
							<Icon name="lock" className="ticket-icon" />
							<div className="title">{vuln.title}</div>
							<div
								className="link-to-ticket"
								onClick={() => {
									if (vuln.url) {
										HostApi.instance.send(OpenUrlRequestType, {
											url: vuln.url,
										});
									}
								}}
							>
								<Icon title="Open on web" className="clickable" name="globe" />
							</div>
						</CardTitle>
						<div style={{ margin: "10px 0" }}>
							<div>
								<b>Fix version(s): </b>
								{vuln.remediation.join(", ")}
							</div>
							<div>
								<b>Criticality: </b>
								{vuln.criticality}
							</div>
							<div>
								<b>Issue Id: </b> {vuln.issueId}
							</div>
							<div>
								<b>Source: </b> {vuln.source}
							</div>
							<div>
								<b>CVSS score: </b> {vuln.score}
							</div>
							<div>
								<b>CVSS vector: </b> <span style={{ fontSize: "80%" }}>{vuln.vector}</span>
							</div>
						</div>
						<div>
							<MarkdownText className="less-space" text={vuln.description} inline={false} />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function CsecVulnView(props: { csecVuln: CsecDataLibrary; onClose: () => void }) {
	const { csecVuln } = props;
	HostApi.instance.track("Csec Vulnerability Clicked");
	return (
		<div className="codemark-form-container">
			<div className="codemark-form standard-form vscroll">
				<div className="form-body" style={{ padding: "20px 5px 20px 28px" }}>
					<div className="contents">
						<CardTitle>
							<Icon name="lock" className="ticket-icon" />
							<div className="title">{csecVuln.vulnerabilityType}</div>
							<div
								className="link-to-ticket"
								onClick={() => {
									if (csecVuln.url) {
										HostApi.instance.send(OpenUrlRequestType, {
											url: csecVuln.url,
										});
									}
								}}
							>
								<Icon title="Open on web" className="clickable" name="globe" />
							</div>
						</CardTitle>
						<div style={{ margin: "10px 0" }}>
							<div>
								<b>Severity: </b>
								{csecVuln.severityLevel}
							</div>
							<div>
								<b>Issue Id: </b>
								{csecVuln.incidentId}
							</div>
							<div>
								<b>Trace: </b> {csecVuln.traceId}
							</div>
							<div>
								<b>Detection Time: </b> {csecVuln.vulnerabilityDetectionTimestamp}
							</div>
							<div>
								<b>File Name: </b> {csecVuln.userFileName}
							</div>
							<div>
								<b>Url: </b> <span style={{ fontSize: "80%" }}>{csecVuln.url}</span>
							</div>
							<div>
								<b>Line Number: </b> <span style={{ fontSize: "80%" }}>{csecVuln.lineNumber}</span>
							</div>
							<div>
								<b>Method Name: </b>{" "}
								<span style={{ fontSize: "80%" }}>{csecVuln.userMethodName}</span>
							</div>
						</div>
						<div>
							<MarkdownText className="less-space" text={csecVuln.status} inline={false} />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function VulnRow(props: { vuln: Vuln }) {
	const [expanded, setExpanded] = useState<boolean>(false);

	return (
		<>
			<Row
				style={{ padding: "0 10px 0 64px" }}
				className={"pr-row"}
				onClick={() => {
					setExpanded(!expanded);
				}}
			>
				<div>
					<Icon style={{ transform: "scale(0.9)" }} name="lock" />
				</div>
				<div>{props.vuln.title}</div>
				<Severity severity={criticalityToRiskSeverity(props.vuln.criticality)} />
			</Row>
			{expanded && (
				<Modal
					translucent
					onClose={() => {
						setExpanded(false);
					}}
				>
					<VulnView vuln={props.vuln} onClose={() => setExpanded(false)} />
				</Modal>
			)}
		</>
	);
}

function CsecVulnRow(props: { csecVuln: CsecDataLibrary }) {
	const [csecExpanded, setCsecExpanded] = useState<boolean>(false);

	return (
		<>
			<Row
				style={{ padding: "0 10px 0 64px" }}
				className={"pr-row"}
				onClick={() => {
					setCsecExpanded(!csecExpanded);
				}}
			>
				<div>
					<Icon style={{ transform: "scale(0.9)" }} name="lock" />
				</div>
				<div>{props.csecVuln.vulnerabilityType}</div>
				<Severity severity={criticalityToRiskSeverity(props.csecVuln.severityLevel)} />
			</Row>
			{csecExpanded && (
				<Modal
					translucent
					onClose={() => {
						setCsecExpanded(false);
					}}
				>
					<CsecVulnView csecVuln={props.csecVuln} onClose={() => setCsecExpanded(false)} />
				</Modal>
			)}
		</>
	);
}

function LibraryRow(props: { library: LibraryDetails }) {
	const [expanded, setExpanded] = useState<boolean>(false);
	const { library } = props;
	const subtleText = library.suggestedVersion
		? `${library.version} -> ${library.suggestedVersion} (${library.vulns.length})`
		: `${library.version} (${library.vulns.length})`;
	const tooltipText = library.suggestedVersion
		? `Recommended fix: upgrade ${library.version} to ${library.suggestedVersion}`
		: undefined;

	return (
		<>
			<Row
				style={{ padding: "0 10px 0 42px" }}
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
					{library.name}{" "}
					<Tooltip placement="bottom" title={tooltipText} delay={1}>
						<span className="subtle">{subtleText}</span>
					</Tooltip>
				</div>
				<Severity severity={criticalityToRiskSeverity(library.highestCriticality)} />
			</Row>
			{expanded && library.vulns.map(vuln => <VulnRow vuln={vuln} />)}
		</>
	);
}

function CsecLibraryRow(props: { csecLibrary: CsecDataLibrary }) {
	const [csecExpanded, setCsecExpanded] = useState<boolean>(false);
	const { csecLibrary } = props;
	const subtleText = csecLibrary.vulnerabilityCaseType;
	const tooltipText = csecLibrary.sourceMethod;

	return (
		<>
			<Row
				style={{ padding: "0 10px 0 42px" }}
				className={"pr-row"}
				onClick={() => {
					setCsecExpanded(!csecExpanded);
				}}
			>
				<div>
					{csecExpanded && <Icon name="chevron-down-thin" />}
					{!csecExpanded && <Icon name="chevron-right-thin" />}
				</div>
				<div>
					{csecLibrary.vulnerabilityType}{" "}
					<Tooltip placement="bottom" title={tooltipText} delay={1}>
						<span className="subtle">{subtleText}</span>
					</Tooltip>
				</div>
				<Severity severity={criticalityToRiskSeverity(csecLibrary.severityLevel)} />
			</Row>
			{csecExpanded && <CsecVulnRow csecVuln={csecLibrary} />}
		</>
	);
}

export const SecurityIssuesWrapper = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(false);
	const [selectedItems, setSelectedItems] = useState<RiskSeverity[]>(["CRITICAL", "HIGH"]);
	const [rows, setRows] = useState<number | undefined | "all">(undefined);
	const [csecExpanded, setCsecExpanded] = useState<boolean>(false);
	const [csecSelectedItems, setCsecSelectedItems] = useState<RiskSeverity[]>(["CRITICAL", "HIGH"]);
	const [csecRows, setCsecRows] = useState<number | undefined | "all">(undefined);

	const { loading, data, error } = useRequestType<
		typeof GetLibraryDetailsType,
		ResponseError<void>
	>(
		GetLibraryDetailsType,
		{
			entityGuid: props.entityGuid,
			accountId: props.accountId,
			severityFilter: isEmpty(selectedItems) ? undefined : selectedItems,
			rows,
		},
		[selectedItems, props.entityGuid, rows, expanded],
		true
	);

	const { csecLoading, csecData, csecError } = useCsecRequestType<
		typeof GetCsecLibraryDetailsType,
		ResponseError<void>
	>(
		GetCsecLibraryDetailsType,
		{
			entityGuid: props.entityGuid,
			accountId: props.accountId,
			severityFilter: isEmpty(csecSelectedItems) ? undefined : csecSelectedItems,
			rows,
		},
		[csecSelectedItems, props.entityGuid, csecRows, csecExpanded],
		true
	);

	function handleSelect(severity: RiskSeverity) {
		if (selectedItems.includes(severity)) {
			setSelectedItems(selectedItems.filter(_ => _ !== severity));
		} else {
			setSelectedItems([...selectedItems, severity]);
		}
	}

	function handleCsecSelect(severity: RiskSeverity) {
		if (csecSelectedItems.includes(severity)) {
			setCsecSelectedItems(csecSelectedItems.filter(_ => _ !== severity));
		} else {
			setCsecSelectedItems([...csecSelectedItems, severity]);
		}
	}

	const additional = data ? data.totalRecords - data.recordCount : undefined;

	const csecAdditional = csecData ? csecData.totalRecords - csecData.recordCount : undefined;

	const menuItems: MenuItem[] = riskSeverityList.map(severity => {
		return {
			label: lowerCase(severity),
			key: severity,
			checked: selectedItems.includes(severity),
			action: () => handleSelect(severity),
		};
	});

	const csecMenuItems: MenuItem[] = riskSeverityList.map(severity => {
		return {
			label: lowerCase(severity),
			key: severity,
			checked: csecSelectedItems.includes(severity),
			action: () => handleCsecSelect(severity),
		};
	});

	function loadAll() {
		setRows("all");
	}

	function csecLoadAll() {
		setCsecRows("all");
	}

	const getErrorDetails = React.useCallback(
		(error: Error): JSX.Element => {
			const unexpectedError = (
				<ErrorRow title="Error fetching data from New Relic" customPadding={"0 10px 0 42px"} />
			);
			if (isResponseUrlError(error)) {
				if (error.code === ERROR_VM_NOT_SETUP) {
					return (
						<div
							style={{
								padding: "0px 10px 0px 49px",
							}}
						>
							<span>Get started with </span>
							<Link href={error.data!.url}>vulnerability management</Link>
						</div>
					);
				} else {
					return unexpectedError;
				}
			}
			return unexpectedError;
		},
		[error]
	);

	const getCsecErrorDetails = React.useCallback(
		(csecError: Error): JSX.Element => {
			const unexpectedError = (
				<ErrorRow title="Error fetching data from New Relic" customPadding={"0 10px 0 42px"} />
			);
			if (isResponseUrlError(csecError)) {
				if (csecError.code === ERROR_VM_NOT_SETUP) {
					return (
						<div
							style={{
								padding: "0px 10px 0px 49px",
							}}
						>
							<span>Get started with </span>
							<Link href={csecError.data!.url}>vulnerability management</Link>
						</div>
					);
				} else {
					return unexpectedError;
				}
			}
			return unexpectedError;
		},
		[csecError]
	);

	useEffect(() => {
		if (data && data.totalRecords > 0) {
			props.setHasVulnerabilities(true);
		}
	}, [data, props.setHasVulnerabilities]);

	useEffect(() => {
		if (csecData && csecData.totalRecords > 0) {
			props.setHasCsecVulnerabilities(true);
		}
	}, [csecData, props.setHasCsecVulnerabilities]);

	const warningTooltip =
		data && data.totalRecords === 1
			? "1 vulnerable library"
			: `${data?.totalRecords} vulnerable libraries`;

	const csecWarningTooltip =
		csecData && csecData.totalRecords === 1
			? "1 exploitable vulnerability"
			: `${csecData?.totalRecords} exploitable vulnerabilities`;

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 30px",
					alignItems: "baseline",
				}}
				className="vuln"
				onClick={() => {
					setExpanded(!expanded);
				}}
				data-testid={`security-issues-dropdown`}
			>
				{expanded && <Icon name="chevron-down-thin" />}
				{!expanded && <Icon name="chevron-right-thin" />}
				<span
					data-testid={`vulnerabilities-${props.entityGuid}`}
					style={{ marginLeft: "2px", marginRight: "5px" }}
				>
					Vulnerable Libraries
				</span>

				{data && data.totalRecords > 0 && (
					<Icon
						name="alert"
						style={{ color: "rgb(188,20,24)", paddingRight: "5px" }}
						className="alert"
						title={warningTooltip}
						delay={1}
						data-testid={`vulnerabilities-alert-icon`}
					/>
				)}
				<InlineMenu
					title="Filter Items"
					preventMenuStopPropagation={true}
					items={menuItems}
					align="bottomRight"
					isMultiSelect={true}
					dontCloseOnSelect={true}
					className="dropdown"
				>
					<SmartFormattedList
						value={isEmpty(selectedItems) ? ["All"] : selectedItems.map(lowerCase)}
					/>
				</InlineMenu>
			</Row>
			{loading && expanded && <ObservabilityLoadingVulnerabilities />}
			{error && expanded && getErrorDetails(error)}
			{expanded && !loading && data && data.totalRecords > 0 && (
				<>
					{data.libraries.map(library => {
						return <LibraryRow library={library} />;
					})}
					<Additional onClick={loadAll} additional={additional} />
				</>
			)}
			{expanded && !loading && data && !data.totalRecords && (
				<Row data-testid={`no-vulnerabilties-found`} style={{ padding: "0 10px 0 49px" }}>
					👍 No vulnerable libraries found
				</Row>
			)}
			<Row
				style={{
					padding: "2px 10px 2px 30px",
					alignItems: "baseline",
				}}
				className="vuln"
				onClick={() => {
					setCsecExpanded(!csecExpanded);
				}}
				data-testid={`security-issues-dropdown`}
			>
				{csecExpanded && <Icon name="chevron-down-thin" />}
				{!csecExpanded && <Icon name="chevron-right-thin" />}
				<span
					data-testid={`vulnerabilities-${props.entityGuid}`}
					style={{ marginLeft: "2px", marginRight: "5px" }}
				>
					Exploitable Vulnerabilities
				</span>

				{csecData && csecData.totalRecords > 0 && (
					<Icon
						name="alert"
						style={{ color: "rgb(188,20,24)", paddingRight: "5px" }}
						className="alert"
						title={csecWarningTooltip}
						delay={1}
						data-testid={`vulnerabilities-alert-icon`}
					/>
				)}
				<InlineMenu
					title="Filter Items"
					preventMenuStopPropagation={true}
					items={csecMenuItems}
					align="bottomRight"
					isMultiSelect={true}
					dontCloseOnSelect={true}
					className="dropdown"
				>
					<SmartFormattedList
						value={isEmpty(csecSelectedItems) ? ["All"] : csecSelectedItems.map(lowerCase)}
					/>
				</InlineMenu>
			</Row>
			{csecLoading && csecExpanded && <ObservabilityLoadingVulnerabilities />}
			{csecError && csecExpanded && getCsecErrorDetails(csecError)}
			{csecExpanded && !csecLoading && csecData && csecData.totalRecords > 0 && (
				<>
					{csecData.libraries.map(library => {
						return <CsecLibraryRow csecLibrary={library} />;
					})}
					<CsecAdditional onClick={csecLoadAll} csecAdditional={csecAdditional} />
				</>
			)}
			{csecExpanded && !csecLoading && csecData && !csecData.totalRecords && (
				<Row data-testid={`no-vulnerabilties-found`} style={{ padding: "0 10px 0 49px" }}>
					👍 No exploitable vulnerabilities found
				</Row>
			)}
		</>
	);
});
