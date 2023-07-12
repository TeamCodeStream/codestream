import React, { useState } from "react";
import { lowerCase } from "lodash-es";
import styled from "styled-components";
import { LicenseDependency, riskSeverityList, RiskSeverity } from "@codestream/protocols/agent";
import Icon from "../Icon";
import Tooltip from "../Tooltip";
import { Row } from "../CrossPostIssueControls/IssuesPane";
import { MenuItem } from "@codestream/webview/src/components/controls/InlineMenu";

const StyledSpan = styled.span`
	margin-left: 2px;
	margin-right: 5px;
`;

interface Props {
	issues: LicenseDependency[];
}

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

export const FossaIssues = React.memo((props: Props) => {
	const [licenseDepExpanded, setLicenseDepExpanded] = useState<boolean>(false);
	const [selectedItems, setSelectedItems] = useState<RiskSeverity[]>(["CRITICAL", "HIGH"]);

	function handleSelect(severity: RiskSeverity) {
		if (selectedItems.includes(severity)) {
			setSelectedItems(selectedItems.filter(_ => _ !== severity));
		} else {
			setSelectedItems([...selectedItems, severity]);
		}
	}

	const menuItems: MenuItem[] = riskSeverityList.map(severity => {
		return {
			label: lowerCase(severity),
			key: severity,
			checked: selectedItems.includes(severity),
			action: () => handleSelect(severity),
		};
	});

	return (
		<>
			<Row
				style={{
					padding: "0px 10px 0px 20px",
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
					{/* <Additional onClick={loadAll} additional={additional} /> */}
				</>
			)}
			{licenseDepExpanded && props.issues?.length === 0 && (
				<Row style={{ padding: "0 10px 0 49px" }}>👍 No license dependency issues found</Row>
			)}
		</>
	);
});
