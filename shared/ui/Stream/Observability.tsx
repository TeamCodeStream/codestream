import {
	DidChangeObservabilityDataNotificationType,
	EntityAccount,
	EntityGoldenMetrics,
	ERROR_GENERIC_USE_ERROR_MESSAGE,
	ERROR_NR_INSUFFICIENT_API_KEY,
	GetAlertViolationsResponse,
	GetEntityCountRequestType,
	GetObservabilityAnomaliesRequestType,
	GetObservabilityErrorAssignmentsRequestType,
	GetObservabilityErrorAssignmentsResponse,
	GetObservabilityErrorsRequestType,
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
} from "@codestream/protocols/agent";
import cx from "classnames";
import { head as _head, isEmpty, isEmpty as _isEmpty, isNil as _isNil } from "lodash-es";
import React, { useEffect, useState } from "react";
import { shallowEqual } from "react-redux";
import styled from "styled-components";

import { ObservabilityRelatedWrapper } from "@codestream/webview/Stream/ObservabilityRelatedWrapper";
import { CurrentMethodLevelTelemetry } from "@codestream/webview/store/context/types";
import { HealthIcon } from "@codestream/webview/src/components/HealthIcon";
import {
	HostDidChangeWorkspaceFoldersNotificationType,
	OpenUrlRequestType,
	RefreshEditorsCodeLensRequestType,
} from "@codestream/protocols/webview";
import { SecurityIssuesWrapper } from "@codestream/webview/Stream/SecurityIssuesWrapper";
import { ObservabilityServiceLevelObjectives } from "@codestream/webview/Stream/ObservabilityServiceLevelObjectives";
import { WebviewPanels } from "../ipc/webview.protocol.common";
import { Button } from "../src/components/Button";
import {
	NoContent,
	PaneBody,
	PaneHeader,
	PaneNode,
	PaneNodeName,
	PaneState,
} from "../src/components/Pane";
import { CodeStreamState } from "../store";
import { configureAndConnectProvider } from "../store/providers/actions";
import { isConnected } from "../store/providers/reducer";
import {
	useAppDispatch,
	useAppSelector,
	useDidMount,
	useInterval,
	usePrevious,
} from "../utilities/hooks";
import { HostApi } from "../webview-api";
import { openPanel, setUserPreference } from "./actions";
import { ALERT_SEVERITY_COLORS } from "./CodeError/index";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import { EntityAssociator } from "./EntityAssociator";
import Icon from "./Icon";
import { Provider } from "./IntegrationsPanel";
import { Link } from "./Link";
import { ObservabilityAddAdditionalService } from "./ObservabilityAddAdditionalService";
import { ObservabilityCurrentRepo } from "./ObservabilityCurrentRepo";
import { ObservabilityErrorWrapper } from "./ObservabilityErrorWrapper";
import { ObservabilityGoldenMetricDropdown } from "./ObservabilityGoldenMetricDropdown";
import Timestamp from "./Timestamp";
import Tooltip from "./Tooltip";
import { WarningBox } from "./WarningBox";

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

export const ErrorRow = (props: {
	title: string;
	subtle?: string;
	tooltip?: string;
	timestamp?: number;
	isLoading?: boolean;
	url?: string;
	onClick?: Function;
	customPadding?: any;
	icon?: "alert" | "thumbsup";
}) => {
	const derivedState = useAppSelector((state: CodeStreamState) => {
		return {
			ideName: encodeURIComponent(state.ide.name || ""),
		};
	}, shallowEqual);

	return (
		<Row
			className="pr-row"
			onClick={e => {
				props.onClick && props.onClick();
			}}
			style={{ padding: props.customPadding ? props.customPadding : "0 10px 0 40px" }}
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
					<>
						<span>{props.title}</span>
						{props.subtle && <span className="subtle-tight"> {props.subtle}</span>}
					</>
				</Tooltip>
			</div>
			<div className="icons">
				{props.url && (
					<span
						onClick={e => {
							e.preventDefault();
							e.stopPropagation();
							HostApi.instance.send(OpenUrlRequestType, {
								url:
									props.url +
									`&utm_source=codestream&utm_medium=ide-${derivedState.ideName}&utm_campaign=error_group_link`,
							});
						}}
					>
						<Icon
							name="globe"
							className="clickable"
							title="View on New Relic"
							placement="bottomLeft"
							delay={1}
						/>
					</span>
				)}

				{props.timestamp && <Timestamp time={props.timestamp} relative abbreviated />}
			</div>
		</Row>
	);
};

const EMPTY_HASH = {};
const EMPTY_ARRAY = [];
let hasLoadedOnce = false;

export const Observability = React.memo((props: Props) => {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { providers = {}, preferences } = state;
		const newRelicIsConnected =
			providers["newrelic*com"] && isConnected(state, { id: "newrelic*com" });
		const activeO11y = preferences.activeO11y;
		return {
			sessionStart: state.context.sessionStart,
			newRelicIsConnected,
			activeO11y,
			observabilityRepoEntities: preferences.observabilityRepoEntities || EMPTY_ARRAY,
			showGoldenSignalsInEditor: state.configs.showGoldenSignalsInEditor,
			isVS: state.ide.name === "VS",
			hideCodeLevelMetricsInstructions: state.preferences.hideCodeLevelMetricsInstructions,
			currentMethodLevelTelemetry: (state.context.currentMethodLevelTelemetry ||
				{}) as CurrentMethodLevelTelemetry,
			textEditorUri: state.editorContext.textEditorUri,
			scmInfo: state.editorContext.scmInfo,
		};
	}, shallowEqual);

	const NO_ERRORS_ACCESS_ERROR_MESSAGE = "403";
	const GENERIC_ERROR_MESSAGE = "There was an error loading this data.";

	const [noErrorsAccess, setNoErrorsAccess] = useState<string | undefined>(undefined);
	const [loadingErrors, setLoadingErrors] = useState<{ [repoId: string]: boolean } | undefined>(
		undefined
	);
	const [genericError, setGenericError] = useState<string | undefined>(undefined);
	const [loadingAssignmentErrorsClick, setLoadingAssignmentErrorsClick] = useState<{
		[errorGroupGuid: string]: boolean;
	}>({});
	const [loadingAssigments, setLoadingAssigments] = useState<boolean>(false);
	const [hasEntities, setHasEntities] = useState<boolean>(false);
	const [repoForEntityAssociator, setRepoForEntityAssociator] = useState<any>({});
	const [loadingEntities, setLoadingEntities] = useState<boolean>(false);
	const [observabilityAnomalies, setObservabilityAnomalies] =
		useState<GetObservabilityAnomaliesResponse>({
			responseTime: [],
			errorRate: [],
			throughput: [],
		});
	const [observabilityAssignments, setObservabilityAssignments] = useState<
		ObservabilityErrorCore[]
	>([]);
	const [observabilityErrors, setObservabilityErrors] = useState<ObservabilityRepoError[]>([]);
	const [observabilityErrorsError, setObservabilityErrorsError] = useState<string>();
	const [observabilityRepos, setObservabilityRepos] = useState<ObservabilityRepo[]>([]);
	const [loadingPane, setLoadingPane] = useState<string | undefined>();
	const [entityGoldenMetrics, setEntityGoldenMetrics] = useState<EntityGoldenMetrics>();
	const [entityGoldenMetricsErrors, setEntityGoldenMetricsErrors] = useState<string[]>([]);
	const [serviceLevelObjectives, setServiceLevelObjectives] = useState<
		ServiceLevelObjectiveResult[]
	>([]);
	const [serviceLevelObjectiveError, setServiceLevelObjectiveError] = useState<string>();
	const [hasServiceLevelObjectives, setHasServiceLevelObjectives] = useState<boolean>(false);
	const [expandedEntity, setExpandedEntity] = useState<string | undefined>();
	const [pendingTelemetryCall, setPendingTelemetryCall] = useState<boolean>(false);
	const [currentRepoId, setCurrentRepoId] = useState<string>();
	const [loadingGoldenMetrics, setLoadingGoldenMetrics] = useState<boolean>(false);
	const [showCodeLevelMetricsBroadcastIcon, setShowCodeLevelMetricsBroadcastIcon] =
		useState<boolean>(false);
	const [currentEntityAccounts, setCurrentEntityAccounts] = useState<EntityAccount[] | undefined>(
		[]
	);
	const [currentObsRepo, setCurrentObsRepo] = useState<ObservabilityRepo | undefined>();
	const [recentAlertViolations, setRecentAlertViolations] = useState<
		GetAlertViolationsResponse | undefined
	>();
	const [recentAlertViolationsError, setRecentAlertViolationsError] = useState<string>();
	const previousNewRelicIsConnected = usePrevious(derivedState.newRelicIsConnected);

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
		dispatch(setUserPreference({ prefPath: ["activeO11y", repoId], value: entityGuid }));
	}

	//@TODO: probably depreciated/candidate for deletion and cleanup
	const loading = (repoIdOrRepoIds: string | string[], isLoading: boolean) => {
		if (Array.isArray(repoIdOrRepoIds)) {
			setLoadingErrors(
				repoIdOrRepoIds.reduce(function (map, obj) {
					map[obj] = isLoading;
					return map;
				}, {})
			);
		} else {
			setLoadingErrors({
				...loadingErrors,
				[repoIdOrRepoIds]: isLoading,
			});
		}
	};

	const loadAssignments = () => {
		setLoadingAssigments(true);

		HostApi.instance
			.send(GetObservabilityErrorAssignmentsRequestType, {})
			.then((_: GetObservabilityErrorAssignmentsResponse) => {
				setObservabilityAssignments(_.items);
				setLoadingAssigments(false);
				setNoErrorsAccess(undefined);
			})
			.catch(ex => {
				setLoadingAssigments(false);
				if (ex.code === ERROR_NR_INSUFFICIENT_API_KEY) {
					HostApi.instance.track("NR Access Denied", {
						Query: "GetObservabilityErrorAssignments",
					});
					setNoErrorsAccess(NO_ERRORS_ACCESS_ERROR_MESSAGE);
				} else if (ex.code === ERROR_GENERIC_USE_ERROR_MESSAGE) {
					setNoErrorsAccess(ex.message || GENERIC_ERROR_MESSAGE);
				} else {
					setGenericError(ex.message || GENERIC_ERROR_MESSAGE);
				}
			});
	};

	const doRefresh = async (force: boolean = false) => {
		if (!derivedState.newRelicIsConnected) return;

		setGenericError(undefined);
		setLoadingEntities(true);
		loadAssignments();

		try {
			await fetchObservabilityRepos(force);
			await getEntityCount();
		} finally {
			setLoadingEntities(false);
		}

		await getObservabilityErrors();
	};

	const getObservabilityErrors = async () => {
		if (currentRepoId) {
			loading(currentRepoId, true);
			try {
				const response = await HostApi.instance.send(GetObservabilityErrorsRequestType, {
					filters: buildFilters([currentRepoId]),
				});

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
					HostApi.instance.track("NR Access Denied", {
						Query: "GetObservabilityErrors",
					});
					setNoErrorsAccess(NO_ERRORS_ACCESS_ERROR_MESSAGE);
				} else if (err.code === ERROR_GENERIC_USE_ERROR_MESSAGE) {
					setNoErrorsAccess(err.message || GENERIC_ERROR_MESSAGE);
				} else {
					setGenericError(err.message || GENERIC_ERROR_MESSAGE);
				}
			} finally {
				loading(currentRepoId, false);
			}
		}
	};

	const getEntityCount = async () => {
		try {
			const { entityCount } = await HostApi.instance.send(GetEntityCountRequestType, {});
			setHasEntities(entityCount > 0);
		} catch (err) {
			setGenericError(err?.message || GENERIC_ERROR_MESSAGE);
		} finally {
			setLoadingEntities(false);
		}
	};

	const _useDidMount = async (force = false) => {
		if (!derivedState.newRelicIsConnected) return;
		setGenericError(undefined);
		loadAssignments();
		await fetchObservabilityRepos(force);
		await getEntityCount();
	};

	useDidMount(() => {
		_useDidMount(false);

		const disposable = HostApi.instance.on(HostDidChangeWorkspaceFoldersNotificationType, () => {
			_useDidMount();
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
						// fetchAnomalies(e.data.entityGuid, e.data.repoId);
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
		if (
			_isEmpty(derivedState.observabilityRepoEntities) &&
			derivedState.currentMethodLevelTelemetry?.newRelicEntityGuid
		) {
			handleClickCLMBroadcast(derivedState.currentMethodLevelTelemetry?.newRelicEntityGuid);
		}
	}, [derivedState.observabilityRepoEntities]);

	// Update golden metrics every 5 minutes
	useInterval(() => {
		fetchGoldenMetrics(expandedEntity, true);
		fetchServiceLevelObjectives(expandedEntity);
		// fetchAnomalies(e.data.entityGuid, e.data.repoId);
	}, 300000);

	/*
	 *	After initial load, every time repo context changes, do telemetry tracking
	 */
	useEffect(() => {
		if (hasLoadedOnce) {
			callObservabilityTelemetry();
		}
	}, [currentEntityAccounts]);

	/*
	 *	State telemetry tracking for the obervability panel
	 */
	const callObservabilityTelemetry = () => {
		setTimeout(() => {
			let telemetryStateValue;
			// "No Entities" - We don’t find any entities on NR and are showing the instrument-your-app message.
			if (!hasEntities && !genericError) {
				telemetryStateValue = "No Entities";
			}
			// "No Services" - There are entities but the current repo isn’t associated with one, so we’re
			// 				   displaying the repo-association prompt.
			if (hasEntities && !_isEmpty(repoForEntityAssociator)) {
				telemetryStateValue = "No Services";
			}
			// "Services" - We’re displaying one or more services for the current repo.
			if (currentEntityAccounts && currentEntityAccounts?.length !== 0 && hasEntities) {
				telemetryStateValue = "Services";
			}

			// "Not Connected" - not connected to NR, this goes away with UID completion
			if (!derivedState.newRelicIsConnected) {
				telemetryStateValue = "Not Connected";
			}

			if (!isEmpty(telemetryStateValue)) {
				HostApi.instance.track("O11y Rendered", {
					State: telemetryStateValue,
				});
			}

			if (expandedEntity) {
				callServiceClickedTelemetry();
			}
		}, 1000);
	};

	const callServiceClickedTelemetry = () => {
		try {
			let currentRepoErrors = observabilityErrors?.find(
				_ => _ && _.repoId === currentRepoId
			)?.errors;
			let filteredCurrentRepoErrors = currentRepoErrors?.filter(_ => _.entityId === expandedEntity);
			let filteredAssigments = observabilityAssignments?.filter(_ => _.entityId === expandedEntity);

			HostApi.instance.track("NR Service Clicked", {
				"Errors Listed": !_isEmpty(filteredCurrentRepoErrors) || !_isEmpty(filteredAssigments),
				"SLOs Listed": hasServiceLevelObjectives,
			});
			setPendingTelemetryCall(false);
		} catch (ex) {
			console.error(ex);
		}
	};

	async function fetchObservabilityRepos(force: boolean, repoId?: string, entityGuid?: string) {
		if (repoId) {
			loading(repoId, true);
		}
		setLoadingEntities(true);

		const hasFilter = entityGuid && repoId;
		const filters = hasFilter ? [{ repoId, entityGuid }] : undefined;

		return HostApi.instance
			.send(GetObservabilityReposRequestType, {
				filters,
				force,
			})
			.then(response => {
				if (response.repos) {
					if (hasFilter) {
						const existingObservabilityRepos = observabilityRepos.filter(_ => _.repoId !== repoId);
						existingObservabilityRepos.push(response.repos[0]);
						setObservabilityRepos(existingObservabilityRepos);
					} else {
						setObservabilityRepos(response.repos);
					}
				}
			})
			.catch(ex => {
				if (ex.code === ERROR_NR_INSUFFICIENT_API_KEY) {
					HostApi.instance.track("NR Access Denied", {
						Query: "GetObservabilityRepos",
					});
					setNoErrorsAccess(NO_ERRORS_ACCESS_ERROR_MESSAGE);
				} else if (ex.code === ERROR_GENERIC_USE_ERROR_MESSAGE) {
					setNoErrorsAccess(ex.message || GENERIC_ERROR_MESSAGE);
				}
			})
			.finally(() => {
				if (repoId) {
					loading(repoId, false);
				}
			});
	}

	const fetchObservabilityErrors = (entityGuid: string, repoId) => {
		loading(repoId, true);
		setLoadingPane(expandedEntity);

		HostApi.instance
			.send(GetObservabilityErrorsRequestType, {
				filters: [{ repoId: repoId, entityGuid: entityGuid }],
			})
			.then(response => {
				if (isNRErrorResponse(response.error)) {
					setObservabilityErrorsError(response.error.error.message ?? response.error.error.type);
				} else {
					setObservabilityErrorsError(undefined);
				}
				if (response.repos) {
					setObservabilityErrors(response.repos);
				}
				loading(repoId, false);
				setLoadingPane(undefined);
			})
			.catch(_ => {
				console.warn(_);
				loading(repoId, false);
				setLoadingPane(undefined);
			});
	};

	const fetchAnomalies = (entityGuid: string, repoId) => {
		loading(repoId, true);
		setLoadingPane(expandedEntity);

		HostApi.instance
			.send(GetObservabilityAnomaliesRequestType, {
				entityGuid,
			})
			.then(response => {
				setObservabilityAnomalies(response);
				// if (response?.repos) {
				// 	const existingObservabilityErrors = observabilityErrors.filter(_ => _?.repoId !== repoId);
				// 	existingObservabilityErrors.push(response.repos[0]);
				// 	setObservabilityErrors(existingObservabilityErrors!);
				// }
				loading(repoId, false);
				setLoadingPane(undefined);
			})
			.catch(_ => {
				console.warn(_);
				loading(repoId, false);
				setLoadingPane(undefined);
			});
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
				fetchRecentAlertViolations: true,
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

				if (isNRErrorResponse(response.recentAlertViolations)) {
					errors.push(
						response.recentAlertViolations.error.message ??
							response.recentAlertViolations.error.type
					);
				} else {
					setRecentAlertViolations(response.recentAlertViolations);
					setRecentAlertViolationsError(undefined);
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
		if (entityGuid) {
			const response = await HostApi.instance.send(GetServiceLevelObjectivesRequestType, {
				entityGuid: entityGuid,
			});

			if (isNRErrorResponse(response.error)) {
				setServiceLevelObjectiveError(response.error.error.message ?? response.error.error.type);
			} else {
				setServiceLevelObjectiveError(undefined);
			}

			if (response?.serviceLevelObjectives) {
				setServiceLevelObjectives(response.serviceLevelObjectives);
				setHasServiceLevelObjectives(true);
			} else {
				setServiceLevelObjectives([]);
				setHasServiceLevelObjectives(false);
			}
		} else {
			setServiceLevelObjectives([]);
			setHasServiceLevelObjectives(false);
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
			setExpandedEntity(entityGuid);
		}

		setTimeout(() => {
			setPendingTelemetryCall(true);
		}, 500);
	};

	// Telemetry calls post clicking service and loading of errors
	useEffect(() => {
		if (
			pendingTelemetryCall &&
			expandedEntity &&
			!_isNil(loadingErrors) &&
			Object.keys(loadingErrors).some(k => !loadingErrors[k]) &&
			!loadingAssigments
		) {
			callServiceClickedTelemetry();
		}
	}, [loadingErrors, loadingAssigments]);

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
			fetchGoldenMetrics(expandedEntity, true);
			fetchServiceLevelObjectives(expandedEntity);
			fetchObservabilityErrors(expandedEntity, currentRepoId);
			// fetchAnomalies(e.data.entityGuid, e.data.repoId);
		}
	}, [expandedEntity]);

	/*
	 *	When current repo changes in IDE, set new entity accounts
	 *  and fetch corresponding errors
	 */
	useEffect(() => {
		if (!_isEmpty(currentRepoId) && !_isEmpty(observabilityRepos)) {
			const _currentEntityAccounts = observabilityRepos.find(or => {
				return or.repoId === currentRepoId;
			})?.entityAccounts;

			setCurrentEntityAccounts(_currentEntityAccounts);

			if (_currentEntityAccounts && _currentEntityAccounts.length > 0 && currentRepoId) {
				// const wasEmpty = _isEmpty(expandedEntity);
				const userPrefExpanded = activeO11y?.[currentRepoId];
				const _expandedEntity = userPrefExpanded
					? userPrefExpanded
					: _currentEntityAccounts[0].entityGuid;
				setExpandedEntity(_expandedEntity);
			}
		}
	}, [currentRepoId, observabilityRepos]);

	/*
	 *	When all parts of the observability panel are done loading
	 *  and a user is connected to NR, fire off a tracking event
	 */
	useEffect(() => {
		if (
			!_isNil(loadingErrors) &&
			// Checks if any value in loadingErrors object is false
			Object.keys(loadingErrors).some(k => !loadingErrors[k]) &&
			!loadingAssigments &&
			hasLoadedOnce === false
		) {
			hasLoadedOnce = true;

			callObservabilityTelemetry();
		}
	}, [loadingErrors, loadingAssigments]);

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
				setRepoForEntityAssociator({});
			}

			if (currentRepo) {
				setCurrentObsRepo(currentRepo);
			}

			// Show CLM broadcast icon if needed
			if (!isNRErrorResponse(currentRepo?.hasCodeLevelMetricSpanData)) {
				// Only change status of broadcast icon if response wasn't an error
				if (
					currentRepo &&
					currentRepo.hasCodeLevelMetricSpanData &&
					currentRepo.entityAccounts &&
					currentRepo.entityAccounts.length > 1
				) {
					setShowCodeLevelMetricsBroadcastIcon(true);
				} else {
					setShowCodeLevelMetricsBroadcastIcon(false);
				}
			}
		}
	}, [currentRepoId, observabilityRepos, loadingEntities, derivedState.textEditorUri]);

	// If a user adds a newly cloned repo into their IDE, we need to refetch observability Repos
	useEffect(() => {
		if (!_isEmpty(currentRepoId) && !_isEmpty(observabilityRepos)) {
			const currentRepo = _head(observabilityRepos.filter(_ => _.repoId === currentRepoId));
			if (!currentRepo) {
				HostApi.instance
					.send(GetObservabilityReposRequestType, { force: true })
					.then((_: GetObservabilityReposResponse) => {
						setObservabilityRepos(_.repos || []);
					});
			}
		}
	}, [derivedState.scmInfo]);

	useEffect(() => {
		if (!_isEmpty(currentRepoId) && _isEmpty(observabilityRepos)) {
			doRefresh(true);
		}
	}, [currentRepoId, observabilityRepos]);

	const handleSetUpMonitoring = (event: React.SyntheticEvent) => {
		event.preventDefault();
		dispatch(openPanel(WebviewPanels.OnboardNewRelic));
	};

	const { activeO11y } = derivedState;

	return (
		<Root>
			<PaneHeader
				title="Observability"
				id={WebviewPanels.Observability}
				subtitle={
					<ObservabilityCurrentRepo
						observabilityRepos={observabilityRepos}
						currentRepoCallback={setCurrentRepoId}
					/>
				}
			>
				{derivedState.newRelicIsConnected ? (
					<Icon
						name="refresh"
						title="Refresh"
						placement="bottom"
						delay={1}
						onClick={e => {
							doRefresh(true);
						}}
					/>
				) : (
					<>&nbsp;</>
				)}
			</PaneHeader>
			{props.paneState !== PaneState.Collapsed && (
				<PaneBody key={"observability"}>
					<div style={{ padding: "0 10px 0 20px" }}></div>
					{derivedState.newRelicIsConnected ? (
						<>
							<PaneNode>
								{loadingEntities ? (
									<ErrorRow
										isLoading={true}
										title="Loading..."
										customPadding={"0 10px 0 20px"}
									></ErrorRow>
								) : (
									<>
										{genericError && (
											<GenericWrapper>
												<GenericCopy>{genericError}</GenericCopy>
											</GenericWrapper>
										)}
										{!hasEntities && !genericError && (
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
										{_isEmpty(currentRepoId) &&
											_isEmpty(repoForEntityAssociator) &&
											!genericError && (
												<NoContent>
													<p>
														Open a source file to see how your code is performing.{" "}
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
																"https://docs.newrelic.com/docs/codestream/how-use-codestream/performance-monitoring#code-level",
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
										{observabilityRepos.length == 0 && (
											<>
												{loadingErrors && Object.keys(loadingErrors).length > 0 && (
													<>
														<PaneNodeName
															title="Recent errors"
															id="newrelic-errors-empty"
														></PaneNodeName>

														<ErrorRow title="No repositories found"></ErrorRow>
													</>
												)}
											</>
										)}

										{currentEntityAccounts &&
											currentEntityAccounts?.length !== 0 &&
											hasEntities && (
												<>
													{currentEntityAccounts
														.filter(_ => _)
														.map((ea, index) => {
															const _observabilityRepo = observabilityRepos.find(
																_ => _.repoId === currentRepoId
															);

															if (_observabilityRepo) {
																const _alertSeverity = ea?.alertSeverity || "";
																const alertSeverityColor = ALERT_SEVERITY_COLORS[_alertSeverity];
																const collapsed = expandedEntity !== ea.entityGuid;
																const currentObservabilityRepoEntity =
																	derivedState.observabilityRepoEntities.find(ore => {
																		return ore.repoId === currentRepoId;
																	});
																const isSelectedCLM =
																	ea.entityGuid === currentObservabilityRepoEntity?.entityGuid;
																return (
																	<>
																		<PaneNodeName
																			title={
																				<div
																					style={{
																						display: "flex",
																						alignItems: "center",
																					}}
																				>
																					<HealthIcon color={alertSeverityColor} />
																					<div>
																						<span>{ea.entityName}</span>
																						<span
																							className="subtle"
																							style={{
																								fontSize: "11px",
																								verticalAlign: "bottom",
																							}}
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
																						HostApi.instance.track("Open Service Summary on NR", {
																							Section: "Golden Metrics",
																						});
																						HostApi.instance.send(OpenUrlRequestType, {
																							url: ea.url!,
																						});
																					}}
																				/>
																			)}
																			{showCodeLevelMetricsBroadcastIcon && (
																				<Icon
																					style={{
																						display: "inlineBlock",
																						color: isSelectedCLM
																							? "var(--text-color-highlight)"
																							: "inherit",
																						opacity: isSelectedCLM ? "1" : "inherit",
																					}}
																					name="broadcast"
																					className={cx("clickable", {
																						"icon-override-actions-visible": !isSelectedCLM,
																					})}
																					title={
																						isSelectedCLM ? (
																							<span>
																								Displaying{" "}
																								<Link
																									useStopPropagation={true}
																									href="https://docs.newrelic.com/docs/codestream/how-use-codestream/performance-monitoring#code-level"
																								>
																									code level metrics
																								</Link>{" "}
																								for this service
																							</span>
																						) : (
																							<span>
																								View{" "}
																								<Link
																									useStopPropagation={true}
																									href="https://docs.newrelic.com/docs/codestream/how-use-codestream/performance-monitoring#code-level"
																								>
																									code level metrics
																								</Link>{" "}
																								for this service
																							</span>
																						)
																					}
																					placement="bottomLeft"
																					delay={1}
																					onClick={e => {
																						e.preventDefault();
																						e.stopPropagation();
																						handleClickCLMBroadcast(ea.entityGuid, e);
																					}}
																				/>
																			)}
																		</PaneNodeName>
																		{!collapsed && (
																			<>
																				{ea.entityGuid === loadingPane ? (
																					<>
																						<ErrorRow
																							isLoading={true}
																							title="Loading..."
																						></ErrorRow>
																					</>
																				) : (
																					<>
																						<>
																							<ObservabilityGoldenMetricDropdown
																								entityGoldenMetrics={entityGoldenMetrics}
																								loadingGoldenMetrics={loadingGoldenMetrics}
																								errors={entityGoldenMetricsErrors}
																								recentAlertViolations={
																									recentAlertViolations ? recentAlertViolations : {}
																								}
																							/>
																							{hasServiceLevelObjectives && (
																								<>
																									<ObservabilityServiceLevelObjectives
																										serviceLevelObjectives={serviceLevelObjectives}
																										errorMsg={serviceLevelObjectiveError}
																									/>
																								</>
																							)}
																							{currentRepoId && (
																								<SecurityIssuesWrapper
																									currentRepoId={currentRepoId}
																									entityGuid={ea.entityGuid}
																									accountId={ea.accountId}
																								/>
																							)}
																							{currentRepoId && (
																								<>
																									<ObservabilityRelatedWrapper
																										currentRepoId={currentRepoId}
																										entityGuid={ea.entityGuid}
																									/>
																								</>
																							)}
																							{ea.domain === "APM" && (
																								<>
																									{observabilityErrors?.find(
																										oe => oe?.repoId === _observabilityRepo?.repoId
																									) && (
																										<>
																											<ObservabilityErrorWrapper
																												observabilityErrors={observabilityErrors}
																												observabilityRepo={_observabilityRepo}
																												observabilityAssignments={
																													observabilityAssignments
																												}
																												entityGuid={ea.entityGuid}
																												noAccess={noErrorsAccess}
																												errorMsg={observabilityErrorsError}
																											/>
																										</>
																									)}
																								</>
																							)}
																							{/*<ObservabilityAnomaliesWrapper*/}
																							{/*	observabilityAnomalies={observabilityAnomalies}*/}
																							{/*	observabilityRepo={_observabilityRepo}*/}
																							{/*	entityGuid={ea.entityGuid}*/}
																							{/*	noAccess={noErrorsAccess}*/}
																							{/*/>*/}
																						</>
																					</>
																				)}
																			</>
																		)}
																	</>
																);
															} else {
																return null;
															}
														})}
													<>
														{currentObsRepo && (
															<ObservabilityAddAdditionalService
																onSuccess={async e => {
																	doRefresh(true);
																}}
																remote={currentObsRepo.repoRemote}
																remoteName={currentObsRepo.repoName}
																servicesToExcludeFromSearch={currentEntityAccounts}
															/>
														)}
													</>
												</>
											)}
										{hasEntities && (
											<>
												{!_isEmpty(repoForEntityAssociator) && (
													<>
														<EntityAssociator
															label={
																<span>
																	Associate this repo with an entity on New Relic in order to see
																	telemetry. Or,{" "}
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
																HostApi.instance.track("NR Entity Association", {
																	"Repo ID": repoForEntityAssociator.repoId,
																});

																_useDidMount(true);
															}}
															remote={repoForEntityAssociator.repoRemote}
															remoteName={repoForEntityAssociator.repoName}
														/>
													</>
												)}
											</>
										)}
									</>
								)}
							</PaneNode>
						</>
					) : (
						<>
							<div className="filters" style={{ padding: "0 20px 10px 20px" }}>
								<span>
									Connect to New Relic to see how your code is performing and identify issues.{" "}
									<Link href="https://docs.newrelic.com/docs/codestream/how-use-codestream/performance-monitoring/">
										Learn more.
									</Link>
									{/* <Tooltip title="Connect later on the Integrations page" placement="top">
										<Linkish
											onClick={() =>
												dispatch(setUserPreference({ prefPath: ["skipConnectObservabilityProviders"], value: true }))
											}
										>
											Skip this step.
										</Linkish>
									</Tooltip> */}
								</span>
							</div>

							<div style={{ padding: "0 20px 20px 20px" }}>
								<Provider
									appendIcon
									style={{ maxWidth: "23em" }}
									key="newrelic"
									onClick={() =>
										dispatch(configureAndConnectProvider("newrelic*com", "Observability Section"))
									}
								>
									<span
										style={{
											fontSize: "smaller",
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
										}}
									>
										<Icon name="newrelic" />
										Connect to New Relic
									</span>
								</Provider>
							</div>
						</>
					)}
				</PaneBody>
			)}
		</Root>
	);
});
