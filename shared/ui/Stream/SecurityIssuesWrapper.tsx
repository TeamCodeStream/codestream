import {
	SeverityType,
	ERROR_VM_NOT_SETUP,
	GetLibraryDetailsType,
	LibraryDetails,
	RiskSeverity,
	riskSeverityList,
	Vulnerability,
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
import { useRequestType } from "@codestream/webview/utilities/hooks";
import { ResponseError } from "vscode-jsonrpc";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import Tooltip from "./Tooltip";
import { ObservabilityLoadingVulnerabilities } from "@codestream/webview/Stream/ObservabilityLoading";
import { setUserPreference } from "./actions";
import { useAppSelector, useAppDispatch } from "../utilities/hooks";
import { CodeStreamState } from "@codestream/webview/store";
import { setPreferences } from "../store/preferences/actions";
import { MetaDescription, MetaLabel } from "./Codemark/BaseCodemark";

interface Props {
	currentRepoId: string;
	entityGuid: string;
	accountId: number;
	setHasVulnerabilities: (value: boolean) => void;
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

function criticalityToRiskSeverity(riskSeverity: SeverityType): RiskSeverity {
	switch (riskSeverity) {
		case "CRITICAL":
			return "CRITICAL";
		case "HIGH":
			return "HIGH";
		case "MODERATE":
			return "MEDIUM";
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

function VulnerabilityView(props: {
	accountId: number;
	entityGuid: string;
	vulnerability: Vulnerability;
	onClose: () => void;
}) {
	const { vulnerability: vuln } = props;
	HostApi.instance.track("codestream/vulnerability_link clicked", {
		entity_guid: props.entityGuid,
		account_id: props.accountId,
		target: "vulnerability",
		event_type: "click",
	});
	return (
		<div className="codemark-form-container">
			<div className="codemark-form standard-form vscroll">
				<div className="form-body">
					<Row
						className="pr-row"
						style={{ padding: "10px 0" }}
						onClick={() => {
							if (vuln.url) {
								HostApi.instance.send(OpenUrlRequestType, {
									url: vuln.url,
								});
							}
						}}
					>
						<div>
							<Icon style={{ transform: "scale(0.9)" }} name="lock" />
						</div>

						<div className="title">{vuln.title}</div>

						<Icon title="Open on web" className="clickable" name="globe" />
					</Row>

					<div style={{ margin: "10px 0 10px 0" }}>
						<MetaLabel>Severity: {vuln.severity}</MetaLabel>
						<MetaLabel>CVE Id: {vuln.cveId}</MetaLabel>
						<MetaLabel>CVSS score: {vuln.score}</MetaLabel>
						<MetaLabel>CVSS vector: {vuln.vector}</MetaLabel>
					</div>
					<MetaDescription style={{ paddingTop: "10px" }}>
						<MarkdownText
							className="less-space"
							text={vuln.description}
							isHtml={true}
							inline={false}
						/>
					</MetaDescription>
				</div>
			</div>
		</div>
	);
}

function VulnerabilityRow(props: {
	accountId: number;
	entityGuid: string;
	vulnerability: Vulnerability;
}) {
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
				<div>{props.vulnerability.title}</div>
				<Severity severity={criticalityToRiskSeverity(props.vulnerability.severity)} />
			</Row>
			{expanded && (
				<Modal
					translucent
					onClose={() => {
						setExpanded(false);
					}}
				>
					<VulnerabilityView
						vulnerability={props.vulnerability}
						accountId={props.accountId}
						entityGuid={props.entityGuid}
						onClose={() => setExpanded(false)}
					/>
				</Modal>
			)}
		</>
	);
}

function LibraryRow(props: { accountId: number; entityGuid: string; library: LibraryDetails }) {
	const [expanded, setExpanded] = useState<boolean>(false);
	const { library } = props;
	const subtleText = library.suggestedVersion
		? `${library.version} -> ${library.suggestedVersion} (${library.vulnerabilities.length})`
		: `${library.version} (${library.vulnerabilities.length})`;
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
				<Severity severity={criticalityToRiskSeverity(library.highestSeverity)} />
			</Row>
			{expanded &&
				library.vulnerabilities.map(vuln => (
					<VulnerabilityRow
						accountId={props.accountId}
						entityGuid={props.entityGuid}
						vulnerability={vuln}
					/>
				))}
		</>
	);
}

export const SecurityIssuesWrapper = React.memo((props: Props) => {
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { preferences } = state;

		const securityIssuesDropdownIsExpanded = preferences?.securityIssuesDropdownIsExpanded ?? false;

		const vulnerabilitySeverityFilter = preferences?.vulnerabilitySeverityFilter;

		return {
			securityIssuesDropdownIsExpanded,
			vulnerabilitySeverityFilter,
		};
	});
	const [expanded, setExpanded] = useState<boolean>(false);
	const [selectedItems, setSelectedItems] = useState<RiskSeverity[]>(
		derivedState.vulnerabilitySeverityFilter || ["CRITICAL", "HIGH"]
	);
	const [rows, setRows] = useState<number | undefined | "all">(undefined);
	const dispatch = useAppDispatch();

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

	function handleSelect(severity: RiskSeverity) {
		let itemsToSelect;
		if (selectedItems.includes(severity)) {
			itemsToSelect = selectedItems.filter(_ => _ !== severity);
		} else {
			itemsToSelect = [...selectedItems, severity];
		}
		setSelectedItems(itemsToSelect);
		dispatch(
			setPreferences({
				vulnerabilitySeverityFilter: itemsToSelect,
			})
		);
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
		[error]
	);

	useEffect(() => {
		if (data && data.totalRecords > 0) {
			props.setHasVulnerabilities(true);
		}
	}, [data, props.setHasVulnerabilities]);

	const warningTooltip =
		data && data.totalRecords === 1 ? "1 vulnerability" : `${data?.totalRecords} vulnerabilities`;

	const handleRowOnClick = () => {
		const { securityIssuesDropdownIsExpanded } = derivedState;

		dispatch(
			setUserPreference({
				prefPath: ["securityIssuesDropdownIsExpanded"],
				value: !securityIssuesDropdownIsExpanded,
			})
		);
	};

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 30px",
					alignItems: "baseline",
				}}
				className="vuln"
				onClick={() => handleRowOnClick()}
				data-testid={`security-issues-dropdown`}
			>
				{derivedState.securityIssuesDropdownIsExpanded && <Icon name="chevron-down-thin" />}
				{!derivedState.securityIssuesDropdownIsExpanded && <Icon name="chevron-right-thin" />}
				<span
					data-testid={`vulnerabilities-${props.entityGuid}`}
					style={{ marginLeft: "2px", marginRight: "5px" }}
				>
					Vulnerabilities
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
			{loading && derivedState.securityIssuesDropdownIsExpanded && (
				<ObservabilityLoadingVulnerabilities />
			)}
			{error && derivedState.securityIssuesDropdownIsExpanded && getErrorDetails(error)}
			{derivedState.securityIssuesDropdownIsExpanded &&
				!loading &&
				data &&
				data.totalRecords > 0 && (
					<>
						{data.libraries.map(library => {
							return (
								<LibraryRow
									accountId={props.accountId}
									entityGuid={props.entityGuid}
									library={library}
								/>
							);
						})}
						<Additional onClick={loadAll} additional={additional} />
					</>
				)}
			{derivedState.securityIssuesDropdownIsExpanded &&
				!loading &&
				data &&
				data.totalRecords === 0 && (
					<Row data-testid={`no-vulnerabilties-found`} style={{ padding: "0 10px 0 49px" }}>
						👍 No vulnerabilities found
					</Row>
				)}
		</>
	);
});
