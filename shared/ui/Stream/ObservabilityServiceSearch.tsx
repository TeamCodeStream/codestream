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
import { ALERT_SEVERITY_COLORS } from "./CodeError/CodeError.Types";
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
	TelemetryData,
} from "@codestream/protocols/agent";
import { useDidMount } from "../utilities/hooks";
import { isEmpty as _isEmpty } from "lodash-es";
import { CodeErrorTimeWindow } from "@codestream/protocols/api";

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
	setExpandedEntityUserPrefCallback: Function;
	setCurrentRepoIdCallback: Function;
	expandedEntity?: string;
	doRefreshCallback: Function;
	isVulnPresent: boolean;
}

export const ObservabilityServiceSearch = React.memo((props: Props) => {
	const dispatch = useAppDispatch();
	const [errors, setErrors] = useState<ObservabilityRepoError[]>([]);
	const [loadingErrors, setLoadingErrors] = useState<boolean>(false);
	const [errorsError, setErrorsError] = useState<string | undefined>(undefined);
	const [entityAccount, setEntityAccount] = useState<EntityAccount | undefined>(undefined);
	const [loadingEntityAccount, setLoadingEntityAccount] = useState<boolean>(false);

	const derivedState = useAppSelector((state: CodeStreamState) => {
		const timeWindow =
			state.preferences.codeErrorTimeWindow &&
			Object.values(CodeErrorTimeWindow).includes(state.preferences.codeErrorTimeWindow)
				? state.preferences.codeErrorTimeWindow
				: CodeErrorTimeWindow.ThreeDays;

		return {
			currentServiceSearchEntity: state.context.currentServiceSearchEntity,
			recentErrorsTimeWindow: timeWindow,
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
		recentIssues,
		serviceLevelObjectiveError,
		serviceLevelObjectives,
		setIsVulnPresent,
		setExpandedEntityCallback,
		expandedEntity,
		setExpandedEntityUserPrefCallback,
		setCurrentRepoIdCallback,
		doRefreshCallback,
		isVulnPresent,
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
		if (entityAccount && entityAccount.entityType) {
			setLoadingErrors(true);
			const response = await HostApi.instance.send(GetObservabilityErrorsWithoutReposRequestType, {
				accountId: entityAccount.accountId,
				entityGuid: entityAccount.entityGuid,
				entityType: entityAccount.entityType,
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

			const telemetryData: TelemetryData = {
				entity_guid: entityAccount?.entityGuid,
				account_id: entityAccount?.accountId,
				meta_data: `errors_listed: ${
					response?.repos && response.repos.length > 0 && response.repos[0].errors.length > 0
				}`,
				meta_data_2: `slos_listed: ${hasServiceLevelObjectives}`,
				meta_data_3: `vulnerabilities_listed: ${isVulnPresent}`,
				meta_data_4: `anomalies_listed: ${!_isEmpty(observabilityAnomalies)}`,
				meta_data_5: "entry_point: service_search",
				event_type: "modal_display",
			};

			HostApi.instance.track("codestream/service displayed", telemetryData);
		}
	};

	const _alertSeverity = entityAccount?.alertSeverity || "";
	const alertSeverityColor = ALERT_SEVERITY_COLORS[_alertSeverity];

	const observabilityServiceEntityProps = {
		alertSeverityColor,
		anomalyDetectionSupported,
		calculatingAnomalies,
		collapsed: expandedEntity !== derivedState.currentServiceSearchEntity,
		currentRepoId,
		ea: entityAccount,
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
		observabilityErrors: errors,
		observabilityErrorsError: errorsError,
		recentIssues,
		serviceLevelObjectiveError,
		serviceLevelObjectives,
		setIsVulnPresent,
		showErrors: errors && !errorsError ? true : false,
		isServiceSearch: true,
		setExpandedEntityCallback,
		setExpandedEntityUserPrefCallback,
		setCurrentRepoIdCallback,
		doRefreshCallback,
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
									margin: "1px 2px 0px 2px",
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
					collapsed={false}
					showChildIconOnCollapse={true}
					actionsVisibleIfOpen={true}
					customPadding="2px 10px 2px 4px"
					noChevron={true}
				></PaneNodeName>

				<EntityAssociator
					isSidebarView={true}
					onSuccess={async e => {
						setExpandedEntityCallback(e.entityGuid);
						dispatch(setCurrentServiceSearchEntity(e.entityGuid));
						fetchEntityAccount(e.entityGuid);
					}}
					isServiceSearch={true}
				/>

				{!loadingEntityAccount && entityAccount && currentServiceSearchEntity && (
					<>
						<ObservabilityServiceEntity {...observabilityServiceEntityProps} />
					</>
				)}
			</PaneNode>
		</>
	);
});
