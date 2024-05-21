import React, { useState } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { setUserPreference } from "./actions";
import { useAppSelector, useAppDispatch } from "../utilities/hooks";
import { CodeStreamState } from "@codestream/webview/store";
import {
	EntityGoldenMetrics,
	ServiceLevelObjectiveResult,
	RecentIssue,
} from "@codestream/protocols/agent";
import { ObservabilityGoldenMetricDropdown } from "./ObservabilityGoldenMetricDropdown";
import { ObservabilityServiceLevelObjectives } from "./ObservabilityServiceLevelObjectives";
import { ObservabilityRelatedWrapper } from "./ObservabilityRelatedWrapper";
import { ObservabilityAlertViolations } from "./ObservabilityAlertViolations";

interface Props {
	entityGoldenMetrics?: EntityGoldenMetrics;
	loadingGoldenMetrics: boolean;
	entityGoldenMetricsErrors: string[];
	recentIssues?: RecentIssue[];
	entityGuid: string;
	accountId: number;
	domain?: string;
	hasServiceLevelObjectives: boolean;
	serviceLevelObjectives: ServiceLevelObjectiveResult[];
	serviceLevelObjectiveError?: string;
	currentRepoId: string;
	isServiceSearch?: boolean;
}

export const ObservabilitySummary = React.memo((props: Props) => {
	const dispatch = useAppDispatch();
	const [isExpanded, setIsExpanded] = useState<boolean>(false);

	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { preferences } = state;
		const summaryIsExpanded = preferences?.summaryIsExpanded ?? false;
		return {
			summaryIsExpanded,
		};
	});

	const handleRowOnClick = () => {
		if (props.isServiceSearch) {
			setIsExpanded(!isExpanded);
		} else {
			const { summaryIsExpanded } = derivedState;
			dispatch(
				setUserPreference({
					prefPath: ["summaryIsExpanded"],
					value: !summaryIsExpanded,
				})
			);
		}
	};

	const unmetObjectives = props.serviceLevelObjectives.filter(v => v.result === "UNDER");
	const percentChange = props.entityGoldenMetrics?.metrics.reduce(
		(change: number | undefined, gm) => {
			switch (gm.name) {
				case "errorRate":
					return props.entityGoldenMetrics?.pillsData?.errorRateData?.percentChange;
				case "responseTimeMs":
					return props.entityGoldenMetrics?.pillsData?.responseTimeData?.percentChange;
				default:
					return change;
			}
		},
		undefined
	);
	const showWarningIcon =
		unmetObjectives.length > 0 ||
		(percentChange && percentChange >= 0) ||
		(props.recentIssues && props.recentIssues.length > 0);

	const expanded = props.isServiceSearch ? isExpanded : derivedState.summaryIsExpanded;

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 30px",
				}}
				className={"pr-row"}
				onClick={() => handleRowOnClick()}
			>
				{expanded && <Icon name="chevron-down-thin" />}
				{!expanded && <Icon name="chevron-right-thin" />}

				<span
					data-testid={`summary-${props.entityGuid}`}
					style={{ marginLeft: "2px", marginRight: "5px" }}
				>
					Summary
				</span>
				{showWarningIcon && (
					<Icon name="alert" style={{ color: "rgb(188,20,24)" }} className="alert" delay={1} />
				)}
			</Row>
			{expanded && (
				<>
					<ObservabilityAlertViolations
						issues={props.recentIssues}
						customPadding={"2px 10px 2px 40px"}
						entityGuid={props.entityGuid}
					/>
					<ObservabilityGoldenMetricDropdown
						entityGoldenMetrics={props.entityGoldenMetrics}
						loadingGoldenMetrics={props.loadingGoldenMetrics}
						errors={props.entityGoldenMetricsErrors}
						entityGuid={props.entityGuid}
						accountId={props.accountId}
						isServiceSearch={props.isServiceSearch}
					/>
					{props.hasServiceLevelObjectives && props.domain !== "INFRA" && (
						<ObservabilityServiceLevelObjectives
							serviceLevelObjectives={props.serviceLevelObjectives}
							errorMsg={props.serviceLevelObjectiveError}
						/>
					)}
					{props.currentRepoId && props.domain !== "INFRA" && (
						<ObservabilityRelatedWrapper
							accountId={props.accountId}
							currentRepoId={props.currentRepoId}
							entityGuid={props.entityGuid}
						/>
					)}
				</>
			)}
		</>
	);
});
