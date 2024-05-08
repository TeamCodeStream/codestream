import React from "react";
import { shallowEqual } from "react-redux";
import cx from "classnames";
import Icon from "./Icon";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import { CodeStreamState } from "@codestream/webview/store";
import { useAppSelector } from "../utilities/hooks";
import { PaneNodeName } from "../src/components/Pane";
import { HealthIcon } from "@codestream/webview/src/components/HealthIcon";
import {
	EntityAccount,
	EntityGoldenMetrics,
	ObservabilityErrorCore,
	ObservabilityRepo,
	GetObservabilityAnomaliesResponse,
	ServiceLevelObjectiveResult,
	GetIssuesResponse,
	ObservabilityRepoError,
} from "@codestream/protocols/agent";
import { CurrentMethodLevelTelemetry } from "@codestream/webview/store/context/types";
import { HostApi } from "../webview-api";
import { ObservabilityLoadingServiceEntity } from "@codestream/webview/Stream/ObservabilityLoading";
import { ObservabilitySummary } from "./ObservabilitySummary";
import { ObservabilityAnomaliesWrapper } from "@codestream/webview/Stream/ObservabilityAnomaliesWrapper";
import { SecurityIssuesWrapper } from "@codestream/webview/Stream/SecurityIssuesWrapper";
import { ObservabilityErrorWrapper } from "./ObservabilityErrorWrapper";
import { OpenUrlRequestType, OpenEditorViewNotificationType } from "@codestream/protocols/webview";
import { RepositoryAssociatorServiceSearch } from "./RepositoryAssociatorServiceSearch";

interface Props {
	alertSeverityColor: string;
	anomalyDetectionSupported: boolean;
	calculatingAnomalies: boolean;
	collapsed: boolean;
	currentRepoId: string;
	ea: EntityAccount;
	entityGoldenMetrics?: EntityGoldenMetrics;
	entityGoldenMetricsErrors: string[];
	errorInboxError?: string;
	handleClickTopLevelService: Function;
	hasServiceLevelObjectives: boolean;
	loadingGoldenMetrics: boolean;
	loadingPane?: string;
	noErrorsAccess?: string;
	observabilityAnomalies: GetObservabilityAnomaliesResponse;
	observabilityAssignments: ObservabilityErrorCore[];
	observabilityErrors: ObservabilityRepoError[];
	observabilityErrorsError?: string;
	observabilityRepo?: ObservabilityRepo;
	recentIssues?: GetIssuesResponse;
	serviceLevelObjectiveError?: string;
	serviceLevelObjectives: ServiceLevelObjectiveResult[];
	setIsVulnPresent: Function;
	showErrors: boolean;
	isServiceSearch?: boolean;
}

export const ObservabilityServiceEntity = React.memo((props: Props) => {
	const {
		alertSeverityColor,
		anomalyDetectionSupported,
		calculatingAnomalies,
		collapsed,
		currentRepoId,
		ea,
		entityGoldenMetrics,
		entityGoldenMetricsErrors,
		errorInboxError,
		handleClickTopLevelService,
		hasServiceLevelObjectives,
		loadingGoldenMetrics,
		loadingPane,
		noErrorsAccess,
		observabilityAnomalies,
		observabilityAssignments,
		observabilityErrors,
		observabilityErrorsError,
		observabilityRepo,
		recentIssues,
		serviceLevelObjectiveError,
		serviceLevelObjectives,
		setIsVulnPresent,
		showErrors,
		isServiceSearch,
	} = props;

	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { preferences } = state;
		const serviceSearchDropdownIsExpanded = preferences?.serviceSearchDropdownIsExpanded ?? false;
		return {
			serviceSearchDropdownIsExpanded,
			currentMethodLevelTelemetry: (state.context.currentMethodLevelTelemetry ||
				{}) as CurrentMethodLevelTelemetry,
			showLogSearch: state.ide.name === "VSC" || state.ide.name === "JETBRAINS",
			ideName: state.ide.name,
		};
	}, shallowEqual);

	return (
		<>
			<PaneNodeName
				data-testid={`entity-name-${ea.entityGuid}`}
				title={
					<div
						style={{
							display: "flex",
							alignItems: "center",
						}}
					>
						<HealthIcon color={alertSeverityColor} />
						<div>
							<span data-testid={`entity-name-${ea.entityGuid}`}>{ea.entityName}</span>
							<span
								className="subtle"
								style={{
									fontSize: "11px",
									verticalAlign: "bottom",
								}}
								data-testid={`entity-account-name-${ea.entityGuid}`}
							>
								{ea.accountName && ea.accountName.length > 25
									? ea.accountName.substr(0, 25) + "..."
									: ea.accountName}
								{ea?.displayName ? ` (${ea?.displayName})` : ""}
							</span>
						</div>
					</div>
				}
				id={ea.entityGuid}
				labelIsFlex={true}
				onClick={e => handleClickTopLevelService(e, ea.entityGuid)}
				collapsed={collapsed}
				showChildIconOnCollapse={true}
				actionsVisibleIfOpen={true}
			>
				{ea.url && (
					<Icon
						name="globe"
						className={cx("clickable", {
							"icon-override-actions-visible": true,
						})}
						title="View on New Relic"
						placement="bottomLeft"
						delay={1}
						onClick={e => {
							e.preventDefault();
							e.stopPropagation();
							HostApi.instance.track("codestream/newrelic_link clicked", {
								entity_guid: derivedState.currentMethodLevelTelemetry.newRelicEntityGuid,
								account_id: derivedState.currentMethodLevelTelemetry.newRelicAccountId,
								meta_data: "destination: apm_service_summary",
								meta_data_2: `codestream_section: golden_metrics`,
								event_type: "click",
							});
							HostApi.instance.send(OpenUrlRequestType, {
								url: ea.url!,
							});
						}}
					/>
				)}
			</PaneNodeName>
			{!collapsed && (
				<>
					{ea.entityGuid === loadingPane ? (
						<>
							<ObservabilityLoadingServiceEntity />
						</>
					) : (
						<>
							<>
								<RepositoryAssociatorServiceSearch />
								<ObservabilitySummary
									entityGoldenMetrics={entityGoldenMetrics}
									loadingGoldenMetrics={loadingGoldenMetrics}
									entityGoldenMetricsErrors={entityGoldenMetricsErrors}
									recentIssues={recentIssues?.recentIssues}
									entityGuid={ea.entityGuid}
									accountId={ea.accountId}
									serviceLevelObjectives={serviceLevelObjectives}
									serviceLevelObjectiveError={serviceLevelObjectiveError}
									domain={ea?.domain}
									currentRepoId={currentRepoId}
									hasServiceLevelObjectives={hasServiceLevelObjectives}
								/>
								{anomalyDetectionSupported && (
									<ObservabilityAnomaliesWrapper
										accountId={ea.accountId}
										observabilityAnomalies={observabilityAnomalies}
										observabilityRepo={observabilityRepo}
										entityGuid={ea.entityGuid}
										entityName={ea.entityName}
										noAccess={noErrorsAccess}
										calculatingAnomalies={calculatingAnomalies}
										distributedTracingEnabled={ea?.distributedTracingEnabled}
										languageAndVersionValidation={ea?.languageAndVersionValidation}
									/>
								)}
								{showErrors && (
									<>
										{isServiceSearch && (
											<>
												<ObservabilityErrorWrapper
													errorInboxError={errorInboxError}
													observabilityErrors={observabilityErrors}
													observabilityRepo={observabilityRepo}
													observabilityAssignments={observabilityAssignments}
													entityGuid={ea.entityGuid}
													noAccess={noErrorsAccess}
													errorMsg={observabilityErrorsError}
													domain={ea?.domain}
													isServiceSearch={true}
												/>
											</>
										)}
										{!isServiceSearch && (
											<>
												{observabilityErrors?.find(
													oe => oe?.repoId === observabilityRepo?.repoId
												) && (
													<>
														<ObservabilityErrorWrapper
															errorInboxError={errorInboxError}
															observabilityErrors={observabilityErrors}
															observabilityRepo={observabilityRepo}
															observabilityAssignments={observabilityAssignments}
															entityGuid={ea.entityGuid}
															noAccess={noErrorsAccess}
															errorMsg={observabilityErrorsError}
															domain={ea?.domain}
														/>
													</>
												)}
											</>
										)}
									</>
								)}
								{(currentRepoId || isServiceSearch) && ea?.domain === "APM" && (
									<SecurityIssuesWrapper
										entityGuid={ea.entityGuid}
										accountId={ea.accountId}
										setHasVulnerabilities={setIsVulnPresent}
									/>
								)}

								{derivedState.showLogSearch && (ea?.domain === "APM" || ea?.domain === "EXT") && (
									<Row
										style={{
											padding: "2px 10px 2px 30px",
										}}
										className={"pr-row"}
										onClick={e => {
											e.preventDefault();
											e.stopPropagation();

											HostApi.instance.notify(OpenEditorViewNotificationType, {
												panel: "logs",
												title: "Logs",
												entityGuid: ea.entityGuid,
												entryPoint: "tree_view",
												ide: {
													name: derivedState.ideName,
												},
											});
										}}
									>
										<span data-testid={`view-logs-${ea.entityGuid}`} style={{ marginLeft: "2px" }}>
											<Icon style={{ marginRight: "4px" }} name="logs" title="View Logs" />
											View Logs
										</span>
									</Row>
								)}
							</>
						</>
					)}
				</>
			)}
		</>
	);
});
