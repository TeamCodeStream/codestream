import React from "react";
import Icon from "./Icon";
import { useAppDispatch, useAppSelector } from "../utilities/hooks";
import { PaneNode, PaneNodeName } from "../src/components/Pane";
import { RepoHeader } from "./Observability";
import { EntityAssociator } from "./EntityAssociator";
import { setCurrentServiceSearchEntity } from "../store/context/actions";
import { CodeStreamState } from "../store";

interface Props {
	// alertSeverityColor: string;
	// anomalyDetectionSupported: boolean;
	// calculatingAnomalies: boolean;
	// collapsed: boolean;
	// currentRepoId: string;
	// ea: EntityAccount;
	// entityGoldenMetrics?: EntityGoldenMetrics;
	// entityGoldenMetricsErrors: string[];
	// errorInboxError?: string;
	// handleClickTopLevelService: Function;
	// hasServiceLevelObjectives: boolean;
	// loadingGoldenMetrics: boolean;
	// loadingPane?: string;
	// noErrorsAccess?: string;
	// observabilityAnomalies: GetObservabilityAnomaliesResponse;
	// observabilityAssignments: ObservabilityErrorCore[];
	// observabilityErrors: ObservabilityRepoError[];
	// observabilityErrorsError?: string;
	// observabilityRepo?: ObservabilityRepo;
	// recentIssues?: GetIssuesResponse;
	// serviceLevelObjectiveError?: string;
	// serviceLevelObjectives: ServiceLevelObjectiveResult[];
	// setIsVulnPresent: Function;
	// showErrors: boolean;
	setExpandedEntityCallback: Function;
	expandedEntity?: string;
}

export const ObservabilityServiceSearch = React.memo((props: Props) => {
	const dispatch = useAppDispatch();

	const derivedState = useAppSelector((state: CodeStreamState) => {
		return {
			currentServiceSearchEntity: state.context.currentServiceSearchEntity,
		};
	});

	const { currentServiceSearchEntity } = derivedState;

	const {
		// alertSeverityColor,
		// anomalyDetectionSupported,
		// calculatingAnomalies,
		// collapsed,
		// currentRepoId,
		// ea,
		// entityGoldenMetrics,
		// entityGoldenMetricsErrors,
		// errorInboxError,
		// handleClickTopLevelService,
		// hasServiceLevelObjectives,
		// loadingGoldenMetrics,
		// loadingPane,
		// noErrorsAccess,
		// observabilityAnomalies,
		// observabilityAssignments,
		// observabilityErrors,
		// observabilityErrorsError,
		// observabilityRepo,
		// recentIssues,
		// serviceLevelObjectiveError,
		// serviceLevelObjectives,
		// setIsVulnPresent,
		// showErrors,
		setExpandedEntityCallback,
	} = props;

	// @TODO - Eric: need a setExpandedEntity callback passed here, that will kick off everything
	// It looks like currentRepoId is required for that, but I think its not and can be bypassed.
	// maybe setExpandedEntity('service-search') and modify the useEffect conditional.  Will probably
	// also need to add something to redux, like currentServiceSearchEntity or something. That way
	// on collapse we continue to show it.

	console.warn("eric", currentServiceSearchEntity);

	return (
		<>
			<PaneNode>
				<PaneNodeName
					data-testid={`observability-service-search`}
					title={
						<RepoHeader>
							<Icon
								style={{ transform: "scale(0.7)", display: "inline-block", marginLeft: "1px" }}
								name="search"
							/>{" "}
							<span
								style={{
									fontSize: "11px",
									fontWeight: "bold",
									margin: "1px 2px 0px 0px",
								}}
							>
								SERVICE SEARCH
							</span>
							<span
								style={{
									fontSize: "11px",
									marginTop: "1px",
									paddingLeft: "2px",
								}}
								className="subtle"
							></span>
						</RepoHeader>
					}
					labelIsFlex={true}
					onClick={e => {}}
					collapsed={false}
					showChildIconOnCollapse={true}
					actionsVisibleIfOpen={true}
					customPadding="2px 10px 2px 19px"
					noChevron={true}
				></PaneNodeName>

				<EntityAssociator
					isSidebarView={true}
					onSuccess={async e => {
						console.warn(e);
						setExpandedEntityCallback(e.entityGuid);
						dispatch(setCurrentServiceSearchEntity(e.entityGuid));
					}}
					isServiceSearch={true}
				/>

				{/* {false && (
					<ObservabilityServiceEntity
						alertSeverityColor={alertSeverityColor}
						anomalyDetectionSupported={anomalyDetectionSupported}
						calculatingAnomalies={calculatingAnomalies}
						collapsed={collapsed}
						currentRepoId={currentRepoId}
						ea={ea}
						entityGoldenMetrics={entityGoldenMetrics}
						entityGoldenMetricsErrors={entityGoldenMetricsErrors}
						errorInboxError={errorInboxError}
						handleClickTopLevelService={handleClickTopLevelService}
						hasServiceLevelObjectives={hasServiceLevelObjectives}
						loadingGoldenMetrics={loadingGoldenMetrics}
						loadingPane={loadingPane}
						noErrorsAccess={noErrorsAccess}
						observabilityAnomalies={observabilityAnomalies}
						observabilityAssignments={observabilityAssignments}
						observabilityErrors={observabilityErrors}
						observabilityErrorsError={observabilityErrorsError}
						observabilityRepo={_observabilityRepo}
						recentIssues={recentIssues}
						serviceLevelObjectiveError={serviceLevelObjectiveError}
						serviceLevelObjectives={serviceLevelObjectives}
						setIsVulnPresent={setIsVulnPresent}
						showErrors={showErrors}
					/>
				)} */}
			</PaneNode>
		</>
	);
});
