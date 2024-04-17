import React from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { setUserPreference } from "./actions";
import { useAppSelector, useAppDispatch } from "../utilities/hooks";
import { CodeStreamState } from "@codestream/webview/store";

import { ObservabilityGoldenMetricDropdown } from "./ObservabilityGoldenMetricDropdown";
import { ObservabilityServiceLevelObjectives } from "./ObservabilityServiceLevelObjectives";
import { ObservabilityRelatedWrapper } from "./ObservabilityRelatedWrapper";
import { ObservabilityAlertViolations } from "./ObservabilityAlertViolations";

//@TODO replace anys
interface Props {
	entityGoldenMetrics?: any;
	loadingGoldenMetrics: boolean;
	entityGoldenMetricsErrors: any;
	recentIssues: any;
	entityGuid: string;
	accountId: number;
	domain: string | undefined;
	hasServiceLevelObjectives: boolean;
	serviceLevelObjectives: any;
	serviceLevelObjectiveError: any;
	currentRepoId: string;
}

export const ObservabilitySummary = React.memo((props: Props) => {
	const dispatch = useAppDispatch();

	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { preferences } = state;
		const summaryIsExpanded = preferences?.summaryIsExpanded ?? false;
		return {
			summaryIsExpanded,
		};
	});

	const handleRowOnClick = () => {
		const { summaryIsExpanded } = derivedState;
		dispatch(
			setUserPreference({
				prefPath: ["summaryIsExpanded"],
				value: !summaryIsExpanded,
			})
		);
	};

	const unmetObjectives = props.serviceLevelObjectives.filter(v => v.result === "UNDER");
	const percentChange = props.entityGoldenMetrics?.metrics.reduce((change, gm) => {
		switch (gm.name) {
			case "errorRate":
				return props.entityGoldenMetrics?.pillsData?.errorRateData?.percentChange;
			case "responseTimeMs":
				return props.entityGoldenMetrics?.pillsData?.responseTimeData?.percentChange;
			default:
				return change;
		}
	}, undefined);
	const showWarningIcon =
		unmetObjectives.length > 0 ||
		(percentChange && percentChange >= 0) ||
		props.recentIssues.length > 0;

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 30px",
				}}
				className={"pr-row"}
				onClick={() => handleRowOnClick()}
			>
				{derivedState.summaryIsExpanded && <Icon name="chevron-down-thin" />}
				{!derivedState.summaryIsExpanded && <Icon name="chevron-right-thin" />}
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
			{derivedState.summaryIsExpanded && (
				<>
					<ObservabilityAlertViolations
						issues={props.recentIssues?.recentIssues}
						customPadding={"2px 10px 2px 27px"}
						entityGuid={props.entityGuid}
					/>
					<ObservabilityGoldenMetricDropdown
						entityGoldenMetrics={props.entityGoldenMetrics}
						loadingGoldenMetrics={props.loadingGoldenMetrics}
						errors={props.entityGoldenMetricsErrors}
						recentIssues={props.recentIssues ? props.recentIssues : {}}
						entityGuid={props.entityGuid}
						accountId={props.accountId}
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
