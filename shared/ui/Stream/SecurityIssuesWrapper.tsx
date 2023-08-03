import {
	CriticalityType,
	ERROR_VM_NOT_SETUP,
	GetLibraryDetailsType,
	LibraryDetails,
	RiskSeverity,
	riskSeverityList,
	Vuln,
} from "@codestream/protocols/agent";
import { isEmpty, lowerCase } from "lodash-es";
import React, { useState } from "react";
import styled from "styled-components";

import { Link } from "@codestream/webview/Stream/Link";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { HostApi } from "@codestream/webview/webview-api";
import { ErrorRow } from "@codestream/webview/Stream/Observability";
import { MarkdownText } from "@codestream/webview/Stream/MarkdownText";
import { Modal } from "@codestream/webview/Stream/Modal";
import { InlineMenu, MenuItem } from "@codestream/webview/src/components/controls/InlineMenu";
import { SmartFormattedList } from "@codestream/webview/Stream/SmartFormattedList";
import { useRequestType } from "@codestream/webview/utilities/hooks";
import { ResponseError } from "vscode-jsonrpc";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import Tooltip from "./Tooltip";
import { ObservabilityLoadingVulnerabilities } from "@codestream/webview/Stream/ObservabilityLoading";

interface Props {
	currentRepoId: string;
	entityGuid: string;
	accountId: number;
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

export const SecurityIssuesWrapper = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(false);
	const [selectedItems, setSelectedItems] = useState<RiskSeverity[]>(["CRITICAL", "HIGH"]);
	const [rows, setRows] = useState<number | undefined | "all">(undefined);

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
		expanded,
	);

	function handleSelect(severity: RiskSeverity) {
		if (selectedItems.includes(severity)) {
			setSelectedItems(selectedItems.filter(_ => _ !== severity));
		} else {
			setSelectedItems([...selectedItems, severity]);
		}
	}

	const additional = data ? data.totalRecords - data.recordCount : undefined;

	const menuItems: MenuItem[] = riskSeverityList.map(severity => {
		return {
			label: lowerCase(severity),
			key: severity,
			checked: selectedItems.includes(severity),
			action: () => handleSelect(severity),
		};
	});

	function loadAll() {
		setRows("all");
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
		[error],
	);

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
			>
				{expanded && <Icon name="chevron-down-thin" />}
				{!expanded && <Icon name="chevron-right-thin" />}
				<span style={{ marginLeft: "2px", marginRight: "5px" }}>Vulnerabilities</span>
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
			{expanded && !loading && data && data.totalRecords === 0 && (
				<Row style={{ padding: "0 10px 0 49px" }}>👍 No vulnerabilities found</Row>
			)}
		</>
	);
});
