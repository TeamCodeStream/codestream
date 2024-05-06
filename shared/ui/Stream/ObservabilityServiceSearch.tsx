import React from "react";
import Icon from "./Icon";
import { useAppDispatch, useAppSelector } from "../utilities/hooks";
import { PaneNode, PaneNodeName } from "../src/components/Pane";
import { RepoHeader } from "./Observability";
import { EntityAssociator } from "./EntityAssociator";
import { setCurrentServiceSearchEntity } from "../store/context/actions";
import { CodeStreamState } from "../store";
import { ObservabilityServiceEntity } from "./ObservabilityServiceEntity";
import {
	EntityAccount,
	GetObservabilityEntityByGuidRequestType,
	EntityGoldenMetrics,
	GetObservabilityAnomaliesResponse,
	ObservabilityErrorCore,
	ObservabilityRepoError,
	ObservabilityRepo,
	GetIssuesResponse,
	ServiceLevelObjectiveResult,
} from "@codestream/protocols/agent";
import { HostApi } from "../webview-api";

interface Props {
	anomalyDetectionSupported: boolean;
	calculatingAnomalies: boolean;
	currentRepoId: string;
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
	setExpandedEntityCallback: Function;
	expandedEntity?: string;
}

export const ObservabilityServiceSearch = React.memo((props: Props) => {
	const dispatch = useAppDispatch();
	const [entityAccount, setEntityAccount] = React.useState<EntityAccount | undefined>(undefined);
	const [loadingEntityAccount, setLoadingEntityAccount] = React.useState<boolean>(false);

	const derivedState = useAppSelector((state: CodeStreamState) => {
		return {
			currentServiceSearchEntity: state.context.currentServiceSearchEntity,
		};
	});

	const { currentServiceSearchEntity } = derivedState;

	const {
		anomalyDetectionSupported,
		calculatingAnomalies,
		currentRepoId,
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
		setExpandedEntityCallback,
	} = props;

	const fetchEntityAccount = async entityGuid => {
		setLoadingEntityAccount(true);
		const response = await HostApi.instance.send(GetObservabilityEntityByGuidRequestType, {
			id: entityGuid,
		});
		setLoadingEntityAccount(false);
		setEntityAccount(response.entity);
	};

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
						fetchEntityAccount(e.entityGuid);
					}}
					isServiceSearch={true}
				/>

				{!loadingEntityAccount && entityAccount && (
					<>
						<ObservabilityServiceEntity
							alertSeverityColor={"red"}
							anomalyDetectionSupported={anomalyDetectionSupported}
							calculatingAnomalies={calculatingAnomalies}
							collapsed={false}
							currentRepoId={currentRepoId}
							ea={entityAccount}
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
							recentIssues={recentIssues}
							serviceLevelObjectiveError={serviceLevelObjectiveError}
							serviceLevelObjectives={serviceLevelObjectives}
							setIsVulnPresent={setIsVulnPresent}
							showErrors={showErrors}
						/>
					</>
				)}
				{/* {false && (
					<ObservabilityServiceEntity
						alertSeverityColor={alertSeverityColor}
						anomalyDetectionSupported={anomalyDetectionSupported}
						calculatingAnomalies={calculatingAnomalies}
						collapsed={collapsed}
						currentRepoId={currentRepoId}
						ea={entityAccount}
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
