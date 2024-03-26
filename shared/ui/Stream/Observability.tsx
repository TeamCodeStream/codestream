import {
	DidChangeObservabilityDataNotificationType,
	EntityAccount,
	EntityGoldenMetrics,
	ERROR_GENERIC_USE_ERROR_MESSAGE,
	ERROR_NR_INSUFFICIENT_API_KEY,
	GetEntityCountRequestType,
	GetObservabilityAnomaliesRequestType,
	GetObservabilityErrorAssignmentsRequestType,
	GetObservabilityReposRequestType,
	GetObservabilityReposResponse,
	GetServiceLevelObjectivesRequestType,
	GetServiceLevelTelemetryRequestType,
	ObservabilityErrorCore,
	ObservabilityRepo,
	GetObservabilityAnomaliesResponse,
	ObservabilityRepoError,
	ServiceLevelObjectiveResult,
	isNRErrorResponse,
	GetIssuesResponse,
	TelemetryData,
	GetFileScmInfoRequestType,
	GetFileScmInfoResponse,
	GetReposScmRequestType,
	ReposScm,
} from "@codestream/protocols/agent";
import cx from "classnames";
import { head as _head, isEmpty as _isEmpty, isNil as _isNil } from "lodash-es";
import React, { useEffect, useMemo, useState } from "react";
import { shallowEqual } from "react-redux";
import styled from "styled-components";
import { fetchDocumentMarkers } from "../store/documentMarkers/actions";
import { setEditorContext } from "../store/editorContext/actions";
import { isNotOnDisk } from "../utils";

import { ObservabilityRelatedWrapper } from "@codestream/webview/Stream/ObservabilityRelatedWrapper";
import { ObservabilityPreview } from "@codestream/webview/Stream/ObservabilityPreview";
import {
	ObservabilityLoadingServiceEntities,
	ObservabilityLoadingServiceEntity,
} from "@codestream/webview/Stream/ObservabilityLoading";
import { CurrentMethodLevelTelemetry } from "@codestream/webview/store/context/types";
import {
	setCurrentEntityGuid,
	setEntityAccounts,
	setRefreshAnomalies,
} from "../store/context/actions";

import { HealthIcon } from "@codestream/webview/src/components/HealthIcon";
import {
	HostDidChangeWorkspaceFoldersNotificationType,
	OpenUrlRequestType,
	RefreshEditorsCodeLensRequestType,
	OpenEditorViewNotificationType,
} from "@codestream/protocols/webview";
import { SecurityIssuesWrapper } from "@codestream/webview/Stream/SecurityIssuesWrapper";
import { ObservabilityServiceLevelObjectives } from "@codestream/webview/Stream/ObservabilityServiceLevelObjectives";
import { WebviewPanels, CLMSettings, DEFAULT_CLM_SETTINGS } from "@codestream/protocols/api";
import { Button } from "../src/components/Button";
import { NoContent, PaneNode, PaneNodeName, PaneState } from "../src/components/Pane";
import { CodeStreamState } from "../store";
import { isConnected } from "../store/providers/reducer";
import {
	useAppDispatch,
	useAppSelector,
	useDidMount,
	useInterval,
	useMemoizedState,
	usePrevious,
} from "../utilities/hooks";
import { HostApi } from "../webview-api";
import { openPanel, setUserPreference } from "./actions";
import { ALERT_SEVERITY_COLORS } from "./CodeError/index";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import { EntityAssociator } from "./EntityAssociator";
import Icon from "./Icon";
import { Link } from "./Link";
import { ObservabilityAddAdditionalService } from "./ObservabilityAddAdditionalService";
import { ObservabilityErrorWrapper } from "./ObservabilityErrorWrapper";
import { ObservabilityGoldenMetricDropdown } from "./ObservabilityGoldenMetricDropdown";
import Timestamp from "./Timestamp";
import Tooltip from "./Tooltip";
import { WarningBox } from "./WarningBox";
import { ObservabilityAnomaliesWrapper } from "@codestream/webview/Stream/ObservabilityAnomaliesWrapper";
import { throwIfError } from "@codestream/webview/store/common";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { ObservabilityAlertViolations } from "./ObservabilityAlertViolations";
import { parseId } from "../utilities/newRelic";
import { bootstrapNrCapabilities } from "../store/nrCapabilities/thunks";
import { doGetObservabilityErrors } from "@codestream/webview/store/codeErrors/thunks";
import {
	demoEntityId,
	setApiCurrentEntityId,
	setApiCurrentRepoId,
	setApiDemoMode,
	setApiNrAiUserId,
	setApiUserId,
} from "@codestream/webview/store/codeErrors/api/apiResolver";
import { getNrAiUserId } from "@codestream/webview/store/users/reducer";
import { setDemoMode } from "@codestream/webview/store/codeErrors/actions";

interface Props {
	paneState: PaneState;
}

const Root = styled.div`
	height: 100%;

	.pr-row {
		padding-left: 40px;

		.selected-icon {
			left: 20px;
		}
	}

	${PaneNode} ${PaneNode} {
		${PaneNodeName} {
			padding-left: 40px;
		}

		.pr-row {
			padding-left: 60px;

			.selected-icon {
				left: 40px;
			}
		}
	}

	#pr-search-input-wrapper .pr-search-input {
		margin: -3px 0 !important;
		padding: 3px 0 !important;

		&:focus {
			padding: 3px 5px !important;
		}

		&:focus::placeholder {
			opacity: 0 !important;
		}

		&:not(:focus) {
			cursor: pointer;
			border: none !important;
		}

		&::placeholder {
			opacity: 1 !important;
			color: var(--text-color);
		}

		&:hover::placeholder {
			color: var(--text-color-highlight);
		}
	}

	${PaneNode} .pr-search {
		padding-left: 40px;
	}

	div.go-pr {
		padding: 0;
		margin-left: auto;

		button {
			margin-top: 0px;
		}
	}
`;

const GenericWrapper = styled.div`
	margin: 5px 20px 5px 20px;
`;

const GenericCopy = styled.div`
	margin: 5px 0 10px 0;
`;

const SubtleRight = styled.time`
	color: var(--text-color-subtle);
	font-weight: normal;
	padding-left: 5px;

	&.no-padding {
		padding-left: 0;
	}
`;
const RepoHeader = styled.span`
	color: var(--text-color-highlight);
	display: flex;
	margin-left: -4px;
`;

type TelemetryState = "no_entities" | "no_services" | "services" | "Not Connected";

export const ErrorRow = (props: {
	title: string;
	subtle?: string;
	tooltip?: string;
	timestamp?: number;
	alternateSubtleRight?: string;
	isLoading?: boolean;
	url?: string;
	onClick?: Function;
	customPadding?: any;
	icon?: "alert" | "thumbsup";
	dataTestId?: string;
}) => {
	const ideName = useAppSelector((state: CodeStreamState) =>
		encodeURIComponent(state.ide.name || "")
	);
	const nrAiUserId = useAppSelector(getNrAiUserId);
	const userId = useAppSelector((state: CodeStreamState) => state.session.userId);
	const demoMode = useAppSelector((state: CodeStreamState) => state.codeErrors.demoMode);

	useMemo(() => {
		if (nrAiUserId && demoMode.enabled) {
			setApiNrAiUserId(nrAiUserId);
		}
	}, [nrAiUserId, demoMode.enabled]);

	useMemo(() => {
		if (userId && demoMode.enabled) {
			setApiUserId(userId);
		}
	}, [userId, demoMode.enabled]);

	return (
		<Row
			className="pr-row error-row"
			onClick={e => {
				props.onClick && props.onClick();
			}}
			style={{ padding: props.customPadding ? props.customPadding : "0 10px 0 40px" }}
			data-testid={props.dataTestId}
		>
			<div>
				{props.isLoading ? (
					<Icon className="spin" name="sync" />
				) : props.icon === "thumbsup" ? (
					"👍"
				) : (
					<Icon name="alert" />
				)}
			</div>
			<div>
				<Tooltip title={props.tooltip} delay={1} placement="bottom">
					<div>
						<span>{props.title}</span>
						{props.subtle && <span className="subtle-tight"> {props.subtle}</span>}
					</div>
				</Tooltip>
			</div>
			<div className="icons">
				{props.url && (
					<span
						onClick={e => {
							e.preventDefault();
							e.stopPropagation();
							HostApi.instance.track("codestream/newrelic_link clicked", {
								meta_data: "destination: error_group",
								meta_data_2: `codestream_section: error`,
								event_type: "click",
							});
							HostApi.instance.send(OpenUrlRequestType, {
								url: `${props.url}&utm_source=codestream&utm_medium=ide-${ideName}&utm_campaign=error_group_link`,
							});
						}}
					>
						<Icon name="globe" title="View on New Relic" placement="bottomLeft" delay={1} />
					</span>
				)}

				{props.timestamp && <Timestamp time={props.timestamp} relative abbreviated />}
				{!props.timestamp && props.alternateSubtleRight && (
					<SubtleRight>{props.alternateSubtleRight}</SubtleRight>
				)}
			</div>
		</Row>
	);
};

// EXT for Otel, INFRA for AWSLambda
const ALLOWED_ENTITY_ACCOUNT_DOMAINS_FOR_ERRORS = ["APM", "BROWSER"];
const EMPTY_ARRAY = [];

export const Observability = React.memo((props: Props) => {
	const dispatch = useAppDispatch();
	let hasLoadedOnce = false;
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { providers = {}, preferences } = state;
		const newRelicIsConnected =
			providers["newrelic*com"] && isConnected(state, { id: "newrelic*com" });
		const activeO11y = preferences.activeO11y;
		const clmSettings = state.preferences.clmSettings || {};

		let isO11yPaneOnly = true;
		if (isFeatureEnabled(state, "showCodeAnalyzers")) {
			isO11yPaneOnly = false;
		}

		const team = state.teams[state.context.currentTeamId] || {};
		const company =
			!_isEmpty(state.companies) && !_isEmpty(team) ? state.companies[team.companyId] : undefined;

		return {
			sessionStart: state.context.sessionStart,
			newRelicIsConnected,
			activeO11y,
			observabilityRepoEntities: preferences.observabilityRepoEntities || EMPTY_ARRAY,
			showGoldenSignalsInEditor: state?.configs?.showGoldenSignalsInEditor,
			ideName: state.ide.name,
			isVS: state.ide.name === "VS",
			isVsCode: state.ide.name === "VSC",
			hideCodeLevelMetricsInstructions: state.preferences.hideCodeLevelMetricsInstructions,
			currentMethodLevelTelemetry: (state.context.currentMethodLevelTelemetry ||
				{}) as CurrentMethodLevelTelemetry,
			textEditorUri: state.editorContext.textEditorUri,
			scmInfo: state.editorContext.scmInfo,
			anomaliesNeedRefresh: state.context.anomaliesNeedRefresh,
			clmSettings,
			recentErrorsTimeWindow: state.preferences.codeErrorTimeWindow,
			currentObservabilityAnomalyEntityGuid: state.context.currentObservabilityAnomalyEntityGuid,
			isO11yPaneOnly,
			company,
			showLogSearch: state.ide.name === "VSC" || state.ide.name === "JETBRAINS",
			demoMode: state.codeErrors.demoMode,
		};
	}, shallowEqual);

	const NO_ERRORS_ACCESS_ERROR_MESSAGE = "403";
	const GENERIC_ERROR_MESSAGE = "There was an error loading this data.";

	const [noErrorsAccess, setNoErrorsAccess] = useState<string | undefined>(undefined);
	const [loadingObservabilityErrors, setLoadingObservabilityErrors] = useState<boolean>(false);
	const [genericError, setGenericError] = useState<string>();
	const [errorInboxError, setErrorInboxError] = useState<string>();
	const [loadingAssignmentErrorsClick, setLoadingAssignmentErrorsClick] = useState<{
		[errorGroupGuid: string]: boolean;
	}>({});
	const [loadingAssignments, setLoadingAssignments] = useState<boolean>(false);
	const [hasEntities, setHasEntities] = useState<boolean>(false);
	const [repoForEntityAssociator, setRepoForEntityAssociator] = useState<
		ObservabilityRepo | undefined
	>(undefined);
	const [loadingEntities, setLoadingEntities] = useState<string | undefined>(undefined);
	const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
	const [didMount, setDidMount] = useState<boolean>(false);
	const [observabilityReposLoaded, setObservabilityReposLoaded] = useState<boolean>(false);
	const [observabilityAnomalies, setObservabilityAnomalies] =
		useState<GetObservabilityAnomaliesResponse>({
			responseTime: [],
			errorRate: [],
			didNotifyNewAnomalies: false,
		});
	const [observabilityAssignments, setObservabilityAssignments] = useState<
		ObservabilityErrorCore[]
	>([]);
	const [observabilityErrors, setObservabilityErrors] = useState<ObservabilityRepoError[]>([]);
	const [observabilityErrorsError, setObservabilityErrorsError] = useState<string>();
	const [observabilityRepos, setObservabilityRepos] = useState<ObservabilityRepo[]>([]);
	const [loadingPane, setLoadingPane] = useState<string | undefined>();
	const [calculatingAnomalies, setCalculatingAnomalies] = useState<boolean>(false);
	const [entityGoldenMetrics, setEntityGoldenMetrics] = useState<EntityGoldenMetrics>();
	const [entityGoldenMetricsErrors, setEntityGoldenMetricsErrors] = useState<string[]>([]);
	const [serviceLevelObjectives, setServiceLevelObjectives] = useState<
		ServiceLevelObjectiveResult[]
	>([]);
	const [serviceLevelObjectiveError, setServiceLevelObjectiveError] = useState<string>();
	const [hasServiceLevelObjectives, setHasServiceLevelObjectives] = useState<boolean>(false);
	const [expandedEntity, setExpandedEntity] = useState<string | undefined>();
	const [pendingServiceClickedTelemetryCall, setPendingServiceClickedTelemetryCall] =
		useState<boolean>(false);
	const [currentRepoId, setCurrentRepoId] = useMemoizedState<string | undefined>(undefined);
	const [loadingGoldenMetrics, setLoadingGoldenMetrics] = useState<boolean>(false);
	const [loadingServiceLevelObjectives, setLoadingServiceLevelObjectives] =
		useState<boolean>(false);
	const [showCodeLevelMetricsBroadcastIcon, setShowCodeLevelMetricsBroadcastIcon] =
		useState<boolean>(false);
	const [currentEntityAccounts, setCurrentEntityAccounts] = useState<EntityAccount[] | undefined>(
		[]
	);
	const [currentObsRepo, setCurrentObsRepo] = useState<ObservabilityRepo | undefined>();
	const [recentIssues, setRecentIssues] = useState<GetIssuesResponse | undefined>();
	const [recentIssuesError, setRecentIssuesError] = useState<string>();
	const previousNewRelicIsConnected = usePrevious(derivedState.newRelicIsConnected);
	const [anomalyDetectionSupported, setAnomalyDetectionSupported] = useState<boolean>(true);
	const [isVulnPresent, setIsVulnPresent] = useState(false);
	const { activeO11y } = derivedState;

	const buildFilters = (repoIds: string[]) => {
		return repoIds.map(repoId => {
			const repoEntity = derivedState.observabilityRepoEntities.find(_ => _.repoId === repoId);
			if (repoEntity) {
				return {
					repoId: repoId,
					entityGuid: repoEntity.entityGuid,
				};
			}
			return {
				repoId: repoId,
			};
		});
	};

	function setExpandedEntityUserPref(repoId: string, entityGuid: string | undefined) {
		dispatch(setCurrentEntityGuid(entityGuid!));
		dispatch(setUserPreference({ prefPath: ["activeO11y", repoId], value: entityGuid }));
	}

	const loadAssignments = async () => {
		setLoadingAssignments(true);
		setErrorInboxError(undefined);
		try {
			const response = await HostApi.instance.send(GetObservabilityErrorAssignmentsRequestType, {});
			throwIfError(response);
			setObservabilityAssignments(response.items);
			setLoadingAssignments(false);
			setNoErrorsAccess(undefined);
		} catch (ex) {
			setLoadingAssignments(false);
			if (ex.code === ERROR_NR_INSUFFICIENT_API_KEY) {
				HostApi.instance.track("codestream/o11y_fetch failed", {
					meta_data: `query: GetObservabilityErrorAssignments`,
					event_type: "response",
				});
				setNoErrorsAccess(NO_ERRORS_ACCESS_ERROR_MESSAGE);
			} else if (ex.code === ERROR_GENERIC_USE_ERROR_MESSAGE) {
				setNoErrorsAccess(ex.message || GENERIC_ERROR_MESSAGE);
			} else {
				setErrorInboxError(GENERIC_ERROR_MESSAGE);
			}
		} finally {
			setLoadingAssignments(false);
		}
	};

	const doRefresh = async (force = false) => {
		if (!derivedState.newRelicIsConnected) return;

		setGenericError(undefined);
		setLoadingEntities(currentRepoId);
		setIsRefreshing(true);

		try {
			await Promise.all([loadAssignments(), fetchObservabilityRepos(force), getEntityCount(true)]);
		} finally {
		}

		await getObservabilityErrors();
		if (expandedEntity && currentRepoId) {
			fetchAnomalies(expandedEntity, currentRepoId);
		}
		setLoadingEntities(undefined);
		setIsRefreshing(false);
	};

	const getObservabilityErrors = async () => {
		if (currentRepoId) {
			setLoadingObservabilityErrors(true);
			try {
				const response = await dispatch(
					doGetObservabilityErrors({
						filters: buildFilters([currentRepoId]),
						timeWindow: derivedState.recentErrorsTimeWindow,
					})
				).unwrap();

				if (isNRErrorResponse(response.error)) {
					setObservabilityErrorsError(response.error.error.message ?? response.error.error.type);
				} else {
					setObservabilityErrorsError(undefined);
				}

				if (response?.repos) {
					setObservabilityErrors(response.repos);
				}
			} catch (err) {
				if (err.code === ERROR_NR_INSUFFICIENT_API_KEY) {
					HostApi.instance.track("codestream/o11y_fetch failed", {
						meta_data: `query: GetObservabilityErrors`,
						event_type: "response",
					});
					setNoErrorsAccess(NO_ERRORS_ACCESS_ERROR_MESSAGE);
				} else if (err.code === ERROR_GENERIC_USE_ERROR_MESSAGE) {
					setNoErrorsAccess(err.message || GENERIC_ERROR_MESSAGE);
				} else {
					setGenericError(err.message || GENERIC_ERROR_MESSAGE);
				}
			} finally {
				setLoadingObservabilityErrors(false);
			}
		}
	};

	const _bootstrapNrCapabilities = async () => {
		dispatch(bootstrapNrCapabilities());
	};

	const getEntityCount = async (force = false) => {
		try {
			const { entityCount } = await HostApi.instance.send(GetEntityCountRequestType, { force });
			console.debug(`o11y: entityCount ${entityCount}`);
			setHasEntities(entityCount > 0);
		} catch (err) {
			setGenericError(err?.message || GENERIC_ERROR_MESSAGE);
		}
	};

	const _useDidMount = async (force = false) => {
		if (!derivedState.newRelicIsConnected) {
			setDidMount(true);
			return;
		}

		setGenericError(undefined);
		setLoadingEntities(currentRepoId);
		try {
			await Promise.all([
				loadAssignments(),
				fetchObservabilityRepos(force),
				getEntityCount(true),
				_bootstrapNrCapabilities(),
			]);
			console.debug(`o11y: Promise.all finished`);
		} finally {
			setLoadingEntities(undefined);
			setDidMount(true);
		}
	};

	useDidMount(() => {
		_useDidMount(false);

		const disposable = HostApi.instance.on(HostDidChangeWorkspaceFoldersNotificationType, () => {
			_useDidMount(true);
		});
		const disposable1 = HostApi.instance.on(
			DidChangeObservabilityDataNotificationType,
			(e: any) => {
				if (e.type === "Assignment") {
					setTimeout(() => {
						loadAssignments();
					}, 2500);
				} else if (e.type === "RepositoryAssociation") {
					setTimeout(() => {
						_useDidMount();
					}, 2500);
				} else if (e.type === "Entity") {
					if (!e.data) return;

					setTimeout(() => {
						fetchObservabilityErrors(e.data.entityGuid, e.data.repoId);
						fetchGoldenMetrics(e.data.entityGuid);
						fetchServiceLevelObjectives(e.data.entityGuid);
						fetchAnomalies(e.data.entityGuid, e.data.repoId);
					}, 2500);
				}
			}
		);

		return () => {
			disposable && disposable.dispose();
			disposable1 && disposable1.dispose();
		};
	});

	useEffect(() => {
		// must use a type check for === false or we might get a double update when previousNewRelicIsConnected is undefined (before its set)
		if (derivedState.newRelicIsConnected && previousNewRelicIsConnected === false) {
			_useDidMount();
		}
	}, [derivedState.newRelicIsConnected]);

	useEffect(() => {
		if (derivedState.anomaliesNeedRefresh) {
			fetchAnomalies(expandedEntity!, currentRepoId);
		}
	}, [derivedState.anomaliesNeedRefresh]);

	useEffect(() => {
		if (
			_isEmpty(derivedState.observabilityRepoEntities) &&
			derivedState.currentMethodLevelTelemetry?.newRelicEntityGuid
		) {
			handleClickCLMBroadcast(derivedState.currentMethodLevelTelemetry?.newRelicEntityGuid);
		}
	}, [derivedState.observabilityRepoEntities]);

	useEffect(() => {
		const entityGuid = derivedState.currentObservabilityAnomalyEntityGuid;
		if (!_isEmpty(currentRepoId) && !_isEmpty(observabilityRepos) && !_isEmpty(entityGuid)) {
			const _currentEntityAccounts = observabilityRepos.find(or => {
				return or.repoId === currentRepoId;
			})?.entityAccounts;

			setCurrentEntityAccounts(_currentEntityAccounts);

			if (_currentEntityAccounts && _currentEntityAccounts.length > 0 && currentRepoId) {
				const userPrefExpanded = activeO11y?.[currentRepoId];
				const _expandedEntity = userPrefExpanded
					? userPrefExpanded
					: _currentEntityAccounts[0].entityGuid;

				if (_expandedEntity !== entityGuid) {
					setExpandedEntity(entityGuid);
					if (entityGuid === demoEntityId) {
						doSetDemoMode(true);
					}
				}
			}
		}
	}, [derivedState.currentObservabilityAnomalyEntityGuid]);

	// Update golden metrics every 5 minutes
	useInterval(() => {
		fetchGoldenMetrics(expandedEntity, true);
		fetchServiceLevelObjectives(expandedEntity);
		// fetchAnomalies(expandedEntity || "", currentRepoId);
	}, 300000);

	/*
	 *	After initial load, every time repo context changes, do telemetry tracking
	 */
	useEffect(() => {
		if (hasLoadedOnce) {
			console.debug("o11y: callObservabilityTelemetry from useEffect currentEntityAccounts");
			callObservabilityTelemetry();
		}
	}, [currentEntityAccounts]);

	/*
	 *	State telemetry tracking for the obervability panel
	 */
	const callObservabilityTelemetry = () => {
		// Allow for react setStates to finish, I found it easier to simply use a timeout
		// than having this call be reliant on multiple variables to be set given the
		// complicated nature of this component, and since its telemetry tracking, the delay
		// is not user facing.

		let telemetryStateValue: TelemetryState | undefined = undefined;
		// "No Entities" - We don’t find any entities on NR and are showing the instrument-your-app message.
		console.debug(
			`o11y: hasEntities ${hasEntities} and repoForEntityAssociator ${
				repoForEntityAssociator !== undefined
			} and currentEntityAccounts ${!_isEmpty(
				currentEntityAccounts
			)} and genericError ${JSON.stringify(genericError)}`
		);
		if (!hasEntities && !genericError) {
			telemetryStateValue = "no_entities";
		}
		// "No Services" - There are entities but the current repo isn’t associated with one, so we’re
		//  displaying the repo-association prompt.
		if (hasEntities && !_isEmpty(repoForEntityAssociator)) {
			telemetryStateValue = "no_services";
		}
		// "Services" - We’re displaying one or more services for the current repo.
		if (currentEntityAccounts && currentEntityAccounts?.length !== 0 && hasEntities) {
			telemetryStateValue = "services";
		}

		// "Not Connected" - not connected to NR, this goes away with UID completion
		if (!derivedState.newRelicIsConnected) {
			telemetryStateValue = "Not Connected";
		}

		if (!_isEmpty(telemetryStateValue)) {
			console.debug("o11y: O11y Rendered", telemetryStateValue);
			const properties: TelemetryData = {
				meta_data: `state: ${telemetryStateValue}`,
				event_type: "modal_display",
			};
			if (telemetryStateValue === "no_services") {
				properties.meta_data_2 = `meta: {
					hasEntities: ${hasEntities},
					hasRepoForEntityAssociator: ${!_isEmpty(repoForEntityAssociator)},
					currentEntityAccounts: ${currentEntityAccounts?.length ?? -1},
					observabilityRepoCount: ${observabilityRepos?.length ?? -1},
				}`;
			}
			HostApi.instance.track("codestream/o11y displayed", properties);
		}
	};

	const callServiceClickedTelemetry = () => {
		console.debug("o11y: callServiceClickedTelemetry");
		try {
			const currentRepoErrors = observabilityErrors?.find(_ => _ && _.repoId === currentRepoId)
				?.errors;
			const filteredCurrentRepoErrors = currentRepoErrors?.filter(
				_ => _.entityId === expandedEntity
			);
			const filteredAssignments = observabilityAssignments?.filter(
				_ => _.entityId === expandedEntity
			);
			const hasAnomalies =
				observabilityAnomalies.errorRate.length > 0 ||
				observabilityAnomalies.responseTime.length > 0;

			const entity = derivedState.observabilityRepoEntities.find(_ => _.repoId === currentRepoId);

			const account = currentEntityAccounts?.find(_ => _.entityGuid === entity?.entityGuid);

			const telemetryData: TelemetryData = {
				entity_guid: entity?.entityGuid,
				account_id: account?.accountId,
				meta_data: `errors_listed: ${
					!_isEmpty(filteredCurrentRepoErrors) || !_isEmpty(filteredAssignments)
				}`,
				meta_data_2: `slos_listed: ${hasServiceLevelObjectives}`,
				meta_data_4: `anomalies_listed: ${hasAnomalies}`,
				meta_data_3: `vulnerabilities_listed: ${isVulnPresent}`,
				event_type: "modal_display",
			};

			console.debug(`o11y: NR Service Clicked`, telemetryData);

			HostApi.instance.track("codestream/service displayed", telemetryData);
			setPendingServiceClickedTelemetryCall(false);
		} catch (ex) {
			console.error(ex);
		}
	};

	useEffect(() => {
		if (
			pendingServiceClickedTelemetryCall &&
			!hasLoadedOnce &&
			didMount &&
			!loadingEntities &&
			currentEntityAccounts
		) {
			setPendingServiceClickedTelemetryCall(false);
			callServiceClickedTelemetry();
		}
	}, [
		pendingServiceClickedTelemetryCall,
		hasLoadedOnce,
		didMount,
		loadingEntities,
		currentEntityAccounts,
	]);

	async function fetchObservabilityRepos(force: boolean, repoId?: string, entityGuid?: string) {
		setLoadingEntities(currentRepoId);
		setObservabilityReposLoaded(false);
		console.debug(
			`o11y: fetchObservabilityRepos started force ${force} repoId ${repoId} entityGuid ${entityGuid}`
		);

		const hasFilter = entityGuid && repoId;
		const filters = hasFilter ? [{ repoId, entityGuid }] : undefined;

		try {
			const response = await HostApi.instance.send(GetObservabilityReposRequestType, {
				filters,
				force,
				isVsCode: derivedState.isVsCode,
				isMultiRegion: !_isEmpty(derivedState?.company)
					? derivedState?.company?.isMultiRegion
					: undefined,
			});
			if (response.repos) {
				if (hasFilter) {
					const existingObservabilityRepos = observabilityRepos.filter(_ => _.repoId !== repoId);
					existingObservabilityRepos.push(response.repos[0]);
					console.debug(`o11y: fetchObservabilityRepos calling setObservabilityRepos (existing)`);
					setObservabilityRepos(existingObservabilityRepos);
				} else {
					console.debug(`o11y: fetchObservabilityRepos calling setObservabilityRepos (response)`);
					setObservabilityRepos(response.repos);
				}
				setObservabilityReposLoaded(true);
			}
		} catch (ex) {
			console.debug(`o11y: fetchObservabilityRepos nope`, ex);
			if (ex.code === ERROR_NR_INSUFFICIENT_API_KEY) {
				HostApi.instance.track("codestream/o11y_fetch failed", {
					meta_data: `query: GetObservabilityRepos`,
					event_type: "response",
				});
				setNoErrorsAccess(NO_ERRORS_ACCESS_ERROR_MESSAGE);
			} else if (ex.code === ERROR_GENERIC_USE_ERROR_MESSAGE) {
				setNoErrorsAccess(ex.message || GENERIC_ERROR_MESSAGE);
			}
			setObservabilityReposLoaded(true);
		}
	}

	function doSetDemoMode(value: boolean) {
		dispatch(setDemoMode(value));
		setApiDemoMode(value);
		if (currentRepoId) {
			setApiCurrentRepoId(currentRepoId);
		}
		if (expandedEntity) {
			setApiCurrentEntityId(expandedEntity);
		}
	}

	useEffect(() => {
		if (derivedState.demoMode.count >= 1 && expandedEntity && currentRepoId) {
			console.debug(`demoMode fetchObservabilityErrors ${derivedState.demoMode}`);
			if (derivedState.demoMode.enabled) {
				setApiCurrentRepoId(currentRepoId);
				setApiCurrentEntityId(expandedEntity);
			}
			fetchObservabilityErrors(expandedEntity, currentRepoId);
		}
	}, [derivedState.demoMode]);

	const fetchObservabilityErrors = async (entityGuid: string, repoId) => {
		setLoadingObservabilityErrors(true);
		setLoadingPane(expandedEntity);

		try {
			const response = await dispatch(
				doGetObservabilityErrors({
					filters: [{ repoId: repoId, entityGuid: entityGuid }],
					timeWindow: derivedState.recentErrorsTimeWindow,
				})
			).unwrap();
			if (isNRErrorResponse(response.error)) {
				setObservabilityErrorsError(response.error.error.message ?? response.error.error.type);
			} else {
				setObservabilityErrorsError(undefined);
			}
			if (response.repos) {
				setObservabilityErrors(response.repos);
			}
		} catch (ex) {
			console.warn(ex);
			setLoadingPane(undefined);
		} finally {
			setLoadingObservabilityErrors(false);
			setLoadingPane(undefined);
		}
	};

	const fetchAnomalies = async (entityGuid: string, repoId) => {
		dispatch(setRefreshAnomalies(false));
		setCalculatingAnomalies(true);

		try {
			const clmSettings = derivedState?.clmSettings as CLMSettings;
			const response = await HostApi.instance.send(GetObservabilityAnomaliesRequestType, {
				entityGuid,
				sinceDaysAgo: parseInt(
					!_isNil(clmSettings?.compareDataLastValue)
						? clmSettings?.compareDataLastValue
						: DEFAULT_CLM_SETTINGS.compareDataLastValue
				),
				baselineDays: parseInt(
					!_isNil(clmSettings?.againstDataPrecedingValue)
						? clmSettings?.againstDataPrecedingValue
						: DEFAULT_CLM_SETTINGS.againstDataPrecedingValue
				),
				sinceLastRelease: !_isNil(clmSettings?.compareDataLastReleaseValue)
					? clmSettings?.compareDataLastReleaseValue
					: DEFAULT_CLM_SETTINGS.compareDataLastReleaseValue,
				minimumErrorRate: parseFloat(
					!_isNil(clmSettings?.minimumErrorRateValue)
						? clmSettings?.minimumErrorRateValue
						: DEFAULT_CLM_SETTINGS.minimumErrorRateValue
				),
				minimumResponseTime: parseFloat(
					!_isNil(clmSettings?.minimumAverageDurationValue)
						? clmSettings?.minimumAverageDurationValue
						: DEFAULT_CLM_SETTINGS.minimumAverageDurationValue
				),
				minimumSampleRate: parseFloat(
					!_isNil(clmSettings?.minimumBaselineValue)
						? clmSettings?.minimumBaselineValue
						: DEFAULT_CLM_SETTINGS.minimumBaselineValue
				),
				minimumRatio:
					parseFloat(
						!_isNil(clmSettings?.minimumChangeValue)
							? clmSettings?.minimumChangeValue
							: DEFAULT_CLM_SETTINGS.minimumChangeValue
					) /
						100 +
					1,
			});

			if (response && response.isSupported === false) {
				setAnomalyDetectionSupported(false);
			} else {
				setAnomalyDetectionSupported(true);
				setObservabilityAnomalies(response);
				dispatch(setRefreshAnomalies(false));
			}
		} catch (ex) {
			console.error("Failed to fetch anomalies", ex);
			dispatch(setRefreshAnomalies(false));
		} finally {
			setCalculatingAnomalies(false);
		}
	};

	const fetchGoldenMetrics = async (
		entityGuid?: string,
		noLoadingSpinner?: boolean,
		force = false
	) => {
		if (entityGuid && currentRepoId) {
			if (!noLoadingSpinner) {
				setLoadingGoldenMetrics(true);
			}
			const response = await HostApi.instance.send(GetServiceLevelTelemetryRequestType, {
				newRelicEntityGuid: entityGuid,
				repoId: currentRepoId,
				fetchRecentIssues: true,
				force,
			});

			if (response) {
				const errors: string[] = [];
				// Don't erase previous results on an error
				if (isNRErrorResponse(response.entityGoldenMetrics)) {
					errors.push(
						response.entityGoldenMetrics.error.message ?? response.entityGoldenMetrics.error.type
					);
				} else {
					setEntityGoldenMetrics(response.entityGoldenMetrics);
				}

				if (isNRErrorResponse(response.recentIssues)) {
					errors.push(response.recentIssues.error.message ?? response.recentIssues.error.type);
				} else {
					setRecentIssues(response.recentIssues);
					setRecentIssuesError(undefined);
				}
				setEntityGoldenMetricsErrors(errors);
			} else {
				console.warn(`fetchGoldenMetrics no response`);
				// TODO this is usually Missing entities error - do something
			}

			setLoadingGoldenMetrics(false);
		}
	};

	const fetchServiceLevelObjectives = async (entityGuid?: string | null) => {
		setLoadingServiceLevelObjectives(true);
		try {
			if (entityGuid) {
				const response = await HostApi.instance.send(GetServiceLevelObjectivesRequestType, {
					entityGuid: entityGuid,
				});

				if (isNRErrorResponse(response?.error)) {
					setServiceLevelObjectiveError(
						response.error?.error?.message ?? response.error?.error?.type
					);
				} else {
					setServiceLevelObjectiveError(undefined);
				}

				if (response?.serviceLevelObjectives && response.serviceLevelObjectives.length > 0) {
					setServiceLevelObjectives(response.serviceLevelObjectives);
					setHasServiceLevelObjectives(true);
				} else {
					console.debug(`o11y: no service level objectives`);
					setServiceLevelObjectives([]);
					setHasServiceLevelObjectives(false);
				}
			} else {
				console.debug(`o11y: no service level objectives (no entityGuid)`);
				setServiceLevelObjectives([]);
				setHasServiceLevelObjectives(false);
			}
		} finally {
			setLoadingServiceLevelObjectives(false);
		}
	};

	const handleClickTopLevelService = (e, entityGuid) => {
		e.preventDefault();
		e.stopPropagation();

		if (loadingPane) {
			return;
		}

		if (currentRepoId) {
			const currentExpandedEntityGuid = derivedState?.activeO11y?.[currentRepoId];

			const collapsed = currentExpandedEntityGuid && currentExpandedEntityGuid === entityGuid;

			if (!collapsed) {
				setExpandedEntityUserPref(currentRepoId, entityGuid);
			}
		}

		if (entityGuid === expandedEntity) {
			setExpandedEntity(undefined);
		} else {
			setTimeout(() => {
				setPendingServiceClickedTelemetryCall(true);
			}, 500);
			setExpandedEntity(entityGuid);
			if (entityGuid === demoEntityId) {
				doSetDemoMode(true);
			}
		}
	};

	const handleClickCLMBroadcast = (entityGuid, e?) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}

		if (!currentRepoId) {
			return;
		}

		const newPreferences = derivedState.observabilityRepoEntities.filter(
			_ => _.repoId !== currentRepoId
		);
		newPreferences.push({
			repoId: currentRepoId,
			entityGuid: entityGuid,
		});
		dispatch(setUserPreference({ prefPath: ["observabilityRepoEntities"], value: newPreferences }));

		// update the IDEs
		setTimeout(() => {
			HostApi.instance.send(RefreshEditorsCodeLensRequestType, {});
		}, 2500);
	};

	// Separate useEffect to prevent duplicate requests
	useEffect(() => {
		if (expandedEntity && currentRepoId) {
			setExpandedEntityUserPref(currentRepoId, expandedEntity);
			fetchGoldenMetrics(expandedEntity, true);
			fetchServiceLevelObjectives(expandedEntity);
			fetchObservabilityErrors(expandedEntity, currentRepoId);
			fetchAnomalies(expandedEntity, currentRepoId);
			handleClickCLMBroadcast(expandedEntity);
		}
	}, [expandedEntity]);

	useEffect(() => {
		if (derivedState.recentErrorsTimeWindow && expandedEntity && currentRepoId) {
			fetchObservabilityErrors(expandedEntity, currentRepoId);
		}
	}, [derivedState.recentErrorsTimeWindow]);

	/*
	 *	When current repo changes in IDE, set new entity accounts
	 *  and fetch corresponding errors
	 */
	useEffect(() => {
		if (!_isEmpty(currentRepoId) && !_isEmpty(observabilityRepos)) {
			const _currentEntityAccounts = observabilityRepos.find(or => {
				return or.repoId === currentRepoId;
			})?.entityAccounts;

			console.debug(
				`o11y: useEffect [currentRepoId, observabilityRepos] calling setCurrentEntityAccounts ${JSON.stringify(
					_currentEntityAccounts
				)}`
			);
			setCurrentEntityAccounts(_currentEntityAccounts);

			if (_currentEntityAccounts && _currentEntityAccounts.length > 0 && currentRepoId) {
				// const wasEmpty = _isEmpty(expandedEntity);
				const userPrefExpanded = activeO11y?.[currentRepoId];
				const _expandedEntity = userPrefExpanded
					? userPrefExpanded
					: _currentEntityAccounts[0].entityGuid;
				setExpandedEntity(_expandedEntity);
				if (_expandedEntity === demoEntityId) {
					doSetDemoMode(true);
				}
			}
			// setLoadingEntities(undefined);
		}
	}, [currentRepoId, observabilityRepos]);

	/*
	 *	When all parts of the observability panel are done loading
	 *  and a user is connected to NR, fire off a tracking event
	 */
	useEffect(() => {
		console.debug(
			`o11y: useEffect (callObservabilityTelemetry)
			didMount: ${didMount} 
			hasLoadedOnce: ${hasLoadedOnce} 
			loadingEntities: ${loadingEntities} 
			currentEntityAccounts: ${JSON.stringify(currentEntityAccounts)}`
		);
		if (!hasLoadedOnce && didMount && !loadingEntities && currentEntityAccounts) {
			hasLoadedOnce = true;
			console.debug("o11y: callObservabilityTelemetry from useEffect main");
			callObservabilityTelemetry();
			// Expand top repo by default if no currentRepoId is set from editor context
			setTimeout(() => {
				if (!currentRepoId && !_isEmpty(observabilityRepos) && observabilityRepos[0]?.repoId) {
					setCurrentRepoId(observabilityRepos[0].repoId);
				}
			}, 2500);
		}
	}, [loadingEntities, didMount, currentEntityAccounts]);

	useEffect(() => {
		if (!_isEmpty(currentRepoId) && !_isEmpty(observabilityRepos)) {
			const currentRepo = _head(observabilityRepos.filter(_ => _.repoId === currentRepoId));

			// Show repo entity associator UI if needed
			if (
				currentRepo &&
				(!currentRepo.hasRepoAssociation || currentRepo.entityAccounts.length < 1) &&
				!observabilityErrors?.find(
					oe => oe?.repoId === currentRepo?.repoId && oe?.errors.length > 0
				)
			) {
				setRepoForEntityAssociator(currentRepo);
			} else {
				setRepoForEntityAssociator(undefined);
			}

			if (currentRepo) {
				setCurrentObsRepo(currentRepo);
				setLoadingEntities(undefined);
			}
		}
	}, [currentRepoId, observabilityRepos, loadingEntities, derivedState.textEditorUri]);

	// If a user adds a newly cloned repo into their IDE, we need to refetch observability Repos
	useEffect(() => {
		if (!_isEmpty(currentRepoId) && !_isEmpty(observabilityRepos)) {
			setObservabilityReposLoaded(false);
			const currentRepo = _head(observabilityRepos.filter(_ => _.repoId === currentRepoId));
			if (!currentRepo) {
				HostApi.instance
					.send(GetObservabilityReposRequestType, { force: true })
					.then((_: GetObservabilityReposResponse) => {
						console.debug(
							`o11y: useEffect on scmInfo calling setObservabilityRepos ${JSON.stringify(_.repos)}`
						);
						setObservabilityRepos(_.repos || []);
						setObservabilityReposLoaded(true);
					});
			}
		}
	}, [derivedState.scmInfo]);

	useEffect(() => {
		const entityAccounts = observabilityRepos.flatMap(or => {
			return or.entityAccounts;
		});
		dispatch(setEntityAccounts(entityAccounts));
	}, [observabilityRepos]);

	useEffect(() => {
		if (!_isEmpty(currentRepoId) && _isEmpty(observabilityRepos) && didMount) {
			console.debug(`o11y: useEffect [currentRepoId, observabilityRepos] calling doRefresh(force)`);
			doRefresh(true);
		}
	}, [currentRepoId, observabilityRepos]);

	const handleSetUpMonitoring = (event: React.SyntheticEvent) => {
		event.preventDefault();
		dispatch(openPanel(WebviewPanels.OnboardNewRelic));
	};

	useEffect(() => {
		if (String(derivedState.textEditorUri).length > 0) {
			onFileChanged();
		}
	}, [observabilityRepos, derivedState.textEditorUri]);

	const onFileChanged = async (checkBranchUpdate = false) => {
		let { scmInfo, textEditorUri } = derivedState;

		const getRepoName = (repo: ReposScm, scmInfo: GetFileScmInfoResponse | undefined) => {
			let repoName;
			if (repo.folder.name) {
				repoName = repo.folder.name;
			}

			if (!repoName && repo.path) {
				repoName = repo.path.substring(repo.path.lastIndexOf("/") + 1);
			}

			if (!repoName && scmInfo?.scm?.repoPath) {
				repoName = scmInfo?.scm?.repoPath.substring(scmInfo?.scm?.repoPath.lastIndexOf("/") + 1);
			}

			return repoName;
		};

		const setCurrentRepo = (repo: ReposScm, scmInfo: GetFileScmInfoResponse | undefined) => {
			if (!isRefreshing) {
				const repoName = getRepoName(repo, scmInfo);
				const currentRepoId = repo.id || scmInfo?.scm?.repoId;

				console.debug(
					`o11y: currentRepoContext: setting currentRepoCallback currentRepo?.id  ${repo.id} scmInfo?.scm?.repoId ${scmInfo?.scm?.repoId}`
				);
				setCurrentRepoId(currentRepoId);
				dispatch(
					setUserPreference({
						prefPath: ["currentO11yRepoId"],
						value: currentRepoId,
					})
				);
			}
		};

		// case: no file open, or non-file document open, and no previous repo set
		if (textEditorUri === undefined || isNotOnDisk(textEditorUri)) {
			if (currentRepoId === undefined) {
				const reposResponse = await HostApi.instance.send(GetReposScmRequestType, {
					inEditorOnly: true,
				});
				if (reposResponse.repositories) {
					const currentRepo = reposResponse.repositories[0];
					setCurrentRepo(currentRepo, scmInfo);
				}
			}
			return;
		}

		// case: file opened from different repo
		if (!scmInfo || scmInfo.uri !== textEditorUri || checkBranchUpdate) {
			if (textEditorUri) {
				scmInfo = await HostApi.instance.send(GetFileScmInfoRequestType, {
					uri: textEditorUri,
				});
			}

			const reposResponse = await HostApi.instance.send(GetReposScmRequestType, {
				inEditorOnly: true,
			});
			const currentRepo = reposResponse.repositories?.find(
				repo => repo.id === scmInfo?.scm?.repoId
			);
			await dispatch(setEditorContext({ scmInfo }));
			if (currentRepo) {
				setCurrentRepo(currentRepo, scmInfo);
			}
		}

		await fetchDocumentMarkers(textEditorUri);
	};

	return (
		<Root>
			<div style={{ overflowY: "hidden" }}>
				{observabilityReposLoaded &&
					_isEmpty(currentRepoId) &&
					_isEmpty(repoForEntityAssociator) &&
					_isEmpty(observabilityRepos) &&
					!genericError && (
						<NoContent>
							<p>
								Open a repository to see how your code is performing.{" "}
								<a href="https://docs.newrelic.com/docs/codestream/how-use-codestream/performance-monitoring#observability-in-IDE">
									Learn more.
								</a>
							</p>
						</NoContent>
					)}
			</div>

			{observabilityRepos.map(repo => {
				const repoIsCollapsed = currentRepoId !== repo.repoId;
				const isLoadingCurrentRepo =
					loadingEntities === repo.repoId || (isRefreshing && !repoIsCollapsed);
				return (
					<>
						<PaneNode>
							<PaneNodeName
								data-testid={`observability-repo-id-${repo.repoId}`}
								title={
									<RepoHeader>
										<Icon
											style={{ transform: "scale(0.7)", display: "inline-block" }}
											name="repo"
										/>{" "}
										<span
											style={{
												fontSize: "11px",
												fontWeight: "bold",
												margin: "1px 2px 0px 0px",
											}}
										>
											{repo.repoName?.toUpperCase()}
										</span>
										<span
											style={{
												fontSize: "11px",
												marginTop: "1px",
												paddingLeft: "2px",
											}}
											className="subtle"
										>
											{repo.entityAccounts.length === 0 ? "" : <>({repo.entityAccounts.length})</>}
										</span>
									</RepoHeader>
								}
								id={repo.repoId}
								labelIsFlex={true}
								onClick={e => {
									if (repo.repoId === currentRepoId) {
										e.preventDefault();
										e.stopPropagation();
										setCurrentRepoId(undefined);
									} else {
										setCurrentRepoId(repo.repoId);
										setLoadingEntities(repo.repoId);
									}
								}}
								collapsed={repoIsCollapsed && !isLoadingCurrentRepo}
								showChildIconOnCollapse={true}
								actionsVisibleIfOpen={true}
								customPadding="2px 10px 2px 4px"
							>
								{derivedState.newRelicIsConnected && !repoIsCollapsed ? (
									<Icon
										name="refresh"
										title="Refresh"
										placement="bottom"
										delay={1}
										className={cx("clickable", {
											"icon-override-actions-visible": true,
										})}
										onClick={e => {
											e.preventDefault();
											e.stopPropagation();
											setCurrentRepoId(repo.repoId);
											setLoadingEntities(repo.repoId);
											doRefresh(true);
										}}
									/>
								) : (
									<>&nbsp;</>
								)}
							</PaneNodeName>
							{isLoadingCurrentRepo ? (
								<ObservabilityLoadingServiceEntities />
							) : (
								<>
									{genericError && !repoIsCollapsed && (
										<GenericWrapper>
											<GenericCopy>{genericError}</GenericCopy>
										</GenericWrapper>
									)}
									{!_isEmpty(currentRepoId) &&
										!_isEmpty(repoForEntityAssociator) &&
										!hasEntities &&
										!repoIsCollapsed &&
										!genericError && (
											<GenericWrapper>
												<GenericCopy>
													Set up application performance monitoring for your project so that you can
													discover and investigate errors with CodeStream
												</GenericCopy>
												<Button style={{ width: "100%" }} onClick={handleSetUpMonitoring}>
													Set Up Monitoring
												</Button>
											</GenericWrapper>
										)}

									{!repoIsCollapsed &&
										_isEmpty(currentRepoId) &&
										_isEmpty(repoForEntityAssociator) &&
										!genericError && (
											<NoContent>
												<p>
													Open a repository to see how your code is performing.{" "}
													<a href="https://docs.newrelic.com/docs/codestream/how-use-codestream/performance-monitoring#observability-in-IDE">
														Learn more.
													</a>
												</p>
											</NoContent>
										)}
									{!derivedState.hideCodeLevelMetricsInstructions &&
										!derivedState.showGoldenSignalsInEditor &&
										derivedState.isVS &&
										observabilityRepos?.find(
											_ =>
												!isNRErrorResponse(_.hasCodeLevelMetricSpanData) &&
												_.hasCodeLevelMetricSpanData
										) && (
											<WarningBox
												style={{ margin: "20px" }}
												items={[
													{
														message: `Enable CodeLenses to see code-level metrics. 
														Go to Tools > Options > Text Editor > All Languages > CodeLens or [learn more about code-level metrics]`,
														helpUrl:
															"https://docs.newrelic.com/docs/codestream/observability/code-level-metrics",
													},
												]}
												dismissCallback={e => {
													dispatch(
														setUserPreference({
															prefPath: ["hideCodeLevelMetricsInstructions"],
															value: true,
														})
													);
												}}
											/>
										)}

									{!repoIsCollapsed &&
										repo.entityAccounts &&
										repo.entityAccounts?.length !== 0 &&
										hasEntities && (
											<>
												{repo.entityAccounts
													.filter(_ => _)
													.map(ea => {
														const _observabilityRepo = observabilityRepos.find(
															_ => _.repoId === currentRepoId
														);

														const _alertSeverity = ea?.alertSeverity || "";
														const alertSeverityColor = ALERT_SEVERITY_COLORS[_alertSeverity];
														const collapsed = expandedEntity !== ea.entityGuid;
														const showErrors = ea?.domain
															? ALLOWED_ENTITY_ACCOUNT_DOMAINS_FOR_ERRORS.includes(ea.domain)
															: false;
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
																				<span data-testid={`entity-name-${ea.entityGuid}`}>
																					{ea.entityName}
																				</span>
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
																					{ea?.domain ? ` (${ea?.domain})` : ""}
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
																					entity_guid:
																						derivedState.currentMethodLevelTelemetry
																							.newRelicEntityGuid,
																					account_id:
																						derivedState.currentMethodLevelTelemetry
																							.newRelicAccountId,
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
																					<ObservabilityAlertViolations
																						issues={recentIssues?.recentIssues}
																						customPadding={"2px 10px 2px 27px"}
																						entityGuid={ea.entityGuid}
																					/>
																					<ObservabilityGoldenMetricDropdown
																						entityGoldenMetrics={entityGoldenMetrics}
																						loadingGoldenMetrics={loadingGoldenMetrics}
																						errors={entityGoldenMetricsErrors}
																						recentIssues={recentIssues ? recentIssues : {}}
																						entityGuid={ea.entityGuid}
																						accountId={ea.accountId}
																					/>
																					{hasServiceLevelObjectives && ea?.domain !== "INFRA" && (
																						<ObservabilityServiceLevelObjectives
																							serviceLevelObjectives={serviceLevelObjectives}
																							errorMsg={serviceLevelObjectiveError}
																						/>
																					)}
																					{anomalyDetectionSupported && (
																						<ObservabilityAnomaliesWrapper
																							accountId={ea.accountId}
																							observabilityAnomalies={observabilityAnomalies}
																							observabilityRepo={_observabilityRepo}
																							entityGuid={ea.entityGuid}
																							entityName={ea.entityName}
																							noAccess={noErrorsAccess}
																							calculatingAnomalies={calculatingAnomalies}
																							distributedTracingEnabled={
																								ea?.distributedTracingEnabled
																							}
																							languageAndVersionValidation={
																								ea?.languageAndVersionValidation
																							}
																						/>
																					)}

																					{showErrors && (
																						<>
																							{observabilityErrors?.find(
																								oe => oe?.repoId === _observabilityRepo?.repoId
																							) && (
																								<>
																									<ObservabilityErrorWrapper
																										errorInboxError={errorInboxError}
																										observabilityErrors={observabilityErrors}
																										observabilityRepo={_observabilityRepo}
																										observabilityAssignments={
																											observabilityAssignments
																										}
																										entityGuid={ea.entityGuid}
																										noAccess={noErrorsAccess}
																										errorMsg={observabilityErrorsError}
																										domain={ea?.domain}
																									/>
																								</>
																							)}
																						</>
																					)}
																					{currentRepoId && ea?.domain === "APM" && (
																						<SecurityIssuesWrapper
																							currentRepoId={currentRepoId}
																							entityGuid={ea.entityGuid}
																							accountId={ea.accountId}
																							setHasVulnerabilities={setIsVulnPresent}
																						/>
																					)}
																					{currentRepoId && ea?.domain !== "INFRA" && (
																						<ObservabilityRelatedWrapper
																							accountId={ea.accountId}
																							currentRepoId={currentRepoId}
																							entityGuid={ea.entityGuid}
																						/>
																					)}

																					{derivedState.showLogSearch &&
																						(ea?.domain === "APM" || ea?.domain === "EXT") && (
																							<Row
																								style={{
																									padding: "2px 10px 2px 30px",
																								}}
																								className={"pr-row"}
																								onClick={e => {
																									e.preventDefault();
																									e.stopPropagation();

																									HostApi.instance.notify(
																										OpenEditorViewNotificationType,
																										{
																											panel: "logs",
																											title: "Logs",
																											entityGuid: ea.entityGuid,
																											entryPoint: "tree_view",
																											ide: {
																												name: derivedState.ideName,
																											},
																										}
																									);
																								}}
																							>
																								<span
																									data-testid={`view-logs-${ea.entityGuid}`}
																									style={{ marginLeft: "2px" }}
																								>
																									<Icon
																										style={{ marginRight: "4px" }}
																										name="logs"
																										title="View Logs"
																									/>
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
													})}
												<>
													{currentObsRepo && (
														<ObservabilityAddAdditionalService
															onSuccess={async e => {
																console.debug(
																	`o11y: ObservabilityAddAdditionalService calling doRefresh(force)`
																);
																doRefresh(true);
																HostApi.instance.track("codestream/entity_association succeeded", {
																	entity_guid: e?.entityGuid,
																	account_id: parseId(e?.entityGuid)?.accountId,
																	event_type: "response",
																	meta_data: "first_association: false",
																});
																setExpandedEntity(e?.entityGuid);
															}}
															remote={currentObsRepo.repoRemote}
															remoteName={currentObsRepo.repoName}
															servicesToExcludeFromSearch={currentEntityAccounts}
														/>
													)}
												</>
											</>
										)}
									{hasEntities && !repoIsCollapsed && (
										<>
											{repoForEntityAssociator && (
												<>
													<EntityAssociator
														isSidebarView={true}
														label={
															<span>
																Select the service on New Relic that is built from this repository
																to see how it's performing. Or,{" "}
																<Link
																	onClick={() => {
																		dispatch(openPanel(WebviewPanels.OnboardNewRelic));
																	}}
																>
																	set up instrumentation.
																</Link>
															</span>
														}
														onSuccess={async e => {
															HostApi.instance.track("codestream/entity_association succeeded", {
																entity_guid: e?.entityGuid,
																account_id: parseId(e?.entityGuid)?.accountId,
																event_type: "response",
																meta_data: "first_association: true",
															});
															_useDidMount(true);
															setExpandedEntity(e?.entityGuid);
														}}
														remote={repoForEntityAssociator.repoRemote}
														remoteName={repoForEntityAssociator.repoName}
													/>
													<ObservabilityPreview />
												</>
											)}
										</>
									)}
								</>
							)}
						</PaneNode>
					</>
				);
			})}
		</Root>
	);
});
