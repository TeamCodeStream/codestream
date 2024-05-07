import React, { useEffect, useState } from "react";
import Icon from "./Icon";
import { useAppDispatch, useAppSelector } from "../utilities/hooks";
import { PaneNode, PaneNodeName } from "../src/components/Pane";
import { RepoHeader } from "./Observability";
import { EntityAssociator } from "./EntityAssociator";
import { setCurrentServiceSearchEntity } from "../store/context/actions";
import { CodeStreamState } from "../store";
import { ObservabilityServiceEntity } from "./ObservabilityServiceEntity";
import { HostApi } from "../webview-api";
import { ALERT_SEVERITY_COLORS } from "./CodeError/index";
import {
	EntityAccount,
	GetObservabilityEntityByGuidRequestType,
	EntityGoldenMetrics,
	GetObservabilityAnomaliesResponse,
	ObservabilityErrorCore,
	ObservabilityRepoError,
	GetIssuesResponse,
	ServiceLevelObjectiveResult,
	GetObservabilityErrorsWithoutReposRequestType,
	isNRErrorResponse,
} from "@codestream/protocols/agent";
import { useDidMount } from "../utilities/hooks";

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
	const [errors, setErrors] = useState<ObservabilityRepoError[]>([]);
	const [loadingErrors, setLoadingErrors] = useState<boolean>(false);
	const [errorsError, setErrorsError] = useState<string | undefined>(undefined);
	const [entityAccount, setEntityAccount] = useState<EntityAccount | undefined>(undefined);
	const [loadingEntityAccount, setLoadingEntityAccount] = useState<boolean>(false);

	const derivedState = useAppSelector((state: CodeStreamState) => {
		return {
			currentServiceSearchEntity: state.context.currentServiceSearchEntity,
			recentErrorsTimeWindow: state.preferences.codeErrorTimeWindow,
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
		recentIssues,
		serviceLevelObjectiveError,
		serviceLevelObjectives,
		setIsVulnPresent,
		showErrors,
		setExpandedEntityCallback,
	} = props;

	useDidMount(() => {
		if (derivedState.currentServiceSearchEntity) {
			fetchEntityAccount(derivedState.currentServiceSearchEntity);
		}
	});

	useEffect(() => {
		if (entityAccount) {
			fetchErrors();
		}
	}, [entityAccount]);

	const fetchEntityAccount = async entityGuid => {
		setLoadingEntityAccount(true);
		const response = await HostApi.instance.send(GetObservabilityEntityByGuidRequestType, {
			id: entityGuid,
		});
		setLoadingEntityAccount(false);
		setEntityAccount(response.entity);
	};

	const fetchErrors = async () => {
		if (entityAccount) {
			setLoadingErrors(true);
			const response = await HostApi.instance.send(GetObservabilityErrorsWithoutReposRequestType, {
				accountId: entityAccount.accountId,
				entityGuid: entityAccount.entityGuid,
				entityType: entityAccount.type,
				timeWindow: derivedState.recentErrorsTimeWindow,
			});
			setLoadingErrors(false);

			if (isNRErrorResponse(response.error)) {
				setErrorsError(response.error.error.message ?? response.error.error.type);
			} else {
				setErrorsError(undefined);
			}

			if (response?.repos) {
				setErrors(response.repos);
			}
		}
	};

	const _alertSeverity = entityAccount?.alertSeverity || "";
	const alertSeverityColor = ALERT_SEVERITY_COLORS[_alertSeverity];

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
							alertSeverityColor={alertSeverityColor}
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
							observabilityErrors={errors}
							observabilityErrorsError={errorsError}
							recentIssues={recentIssues}
							serviceLevelObjectiveError={serviceLevelObjectiveError}
							serviceLevelObjectives={serviceLevelObjectives}
							setIsVulnPresent={setIsVulnPresent}
							showErrors={errors && !errorsError ? true : false}
							isServiceSearch={true}
						/>
					</>
				)}
			</PaneNode>
		</>
	);
});
