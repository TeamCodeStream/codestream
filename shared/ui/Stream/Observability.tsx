import {
	DidChangeObservabilityDataNotificationType,
	EntityAccount,
	ERROR_GENERIC_USE_ERROR_MESSAGE,
	ERROR_NR_INSUFFICIENT_API_KEY,
	GetAlertViolationsResponse,
	GetEntityCountRequestType,
	GetObservabilityErrorAssignmentsRequestType,
	GetObservabilityErrorAssignmentsResponse,
	GetObservabilityErrorsRequestType,
	GetObservabilityReposRequestType,
	GetObservabilityReposResponse,
	GetServiceLevelObjectivesRequestType,
	GetServiceLevelTelemetryRequestType,
	GoldenMetricsResult,
	ObservabilityErrorCore,
	ObservabilityRepo,
	ObservabilityRepoError,
	ServiceLevelObjectiveResult,
} from "@codestream/protocols/agent";
import {
	HostDidChangeWorkspaceFoldersNotificationType,
	OpenUrlRequestType,
} from "@codestream/protocols/webview";
import { RefreshEditorsCodeLensRequestType } from "@codestream/webview/ipc/host.protocol";
import { CurrentMethodLevelTelemetry } from "@codestream/webview/store/context/types";
import cx from "classnames";
import { head as _head, isEmpty, isEmpty as _isEmpty, isNil as _isNil } from "lodash-es";
import React, { useEffect, useState } from "react";
import { shallowEqual } from "react-redux";
import styled from "styled-components";

import { ObservabilityServiceLevelObjectives } from "@codestream/webview/Stream/ObservabilityServiceLevelObjectives";
import { HealthIcon } from "@codestream/webview/src/components/HealthIcon";
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
			<div>{props.isLoading ? <Icon className="spin" name="sync" /> : <Icon name="alert" />}</div>
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
		const hiddenPaneNodes = preferences.hiddenPaneNodes || EMPTY_HASH;
		return {
			sessionStart: state.context.sessionStart,
			newRelicIsConnected,
			hiddenPaneNodes,
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
	const [observabilityAssignments, setObservabilityAssignments] = useState<
		ObservabilityErrorCore[]
	>([]);
	const [observabilityErrors, setObservabilityErrors] = useState<ObservabilityRepoError[]>([]);
	const [observabilityRepos, setObservabilityRepos] = useState<ObservabilityRepo[]>([]);
	const [loadingPane, setLoadingPane] = useState<string | null>("");
	const [goldenMetrics, setGoldenMetrics] = useState<GoldenMetricsResult[]>([]);
	const [goldenMetricTransactionType, setGoldenMetricTransactionType] = useState<string>("Web");
	const [serviceLevelObjectives, setServiceLevelObjectives] = useState<
		ServiceLevelObjectiveResult[]
	>([]);
	const [loadingServiceLevelObjectives, setLoadingServiceLevelObjectives] =
		useState<boolean>(false);
	const [hasServiceLevelObjectives, setHasServiceLevelObjectives] = useState<boolean>(false);
	const [newRelicUrl, setNewRelicUrl] = useState<string | undefined>("");
	const [expandedEntity, setExpandedEntity] = useState<string | null>(null);
	const [pendingTelemetryCall, setPendingTelemetryCall] = useState<boolean>(false);
	const [currentEntityAccountIndex, setCurrentEntityAccountIndex] = useState<string | null>(null);
	const [currentRepoId, setCurrentRepoId] = useState<string>("");
	const [loadingGoldenMetrics, setLoadingGoldenMetrics] = useState<boolean>(false);
	// const [loadingCLMBroadcast, setLoadingCLMBroadcast] = useState<boolean>(false);
	const [showCodeLevelMetricsBroadcastIcon, setShowCodeLevelMetricsBroadcastIcon] =
		useState<boolean>(false);
	const [currentEntityAccounts, setCurrentEntityAccounts] = useState<EntityAccount[] | undefined>(
		[]
	);
	const [currentObsRepo, setCurrentObsRepo] = useState<ObservabilityRepo | undefined>();
	const [recentAlertViolations, setRecentAlertViolations] = useState<
		GetAlertViolationsResponse | undefined
	>();
	const previousHiddenPaneNodes = usePrevious(derivedState.hiddenPaneNodes);
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

	const _useDidMount = async (force = false) => {
		if (!derivedState.newRelicIsConnected) return;

		setGenericError(undefined);
		setLoadingEntities(true);
		loadAssignments();
		processCurrentEntityAccountIndex();

		let repoIds: string[] = [];
		let reposResponse: GetObservabilityReposResponse | undefined;
		try {
			reposResponse = await HostApi.instance.send(GetObservabilityReposRequestType, { force });
			setObservabilityRepos(reposResponse.repos || []);
			repoIds = reposResponse.repos?.filter(r => r.repoId).map(r => r.repoId!) || [];

			const hiddenRepos = Object.keys(hiddenPaneNodes)
				.filter(_ => {
					return _.indexOf("newrelic-errors-in-repo-") === 0 && hiddenPaneNodes[_] === true;
				})
				.map(r => r.replace("newrelic-errors-in-repo-", ""));
			repoIds = repoIds.filter(r => !hiddenRepos.includes(r));
			loading(repoIds, true);
		} catch (err) {
			setGenericError(err?.message || GENERIC_ERROR_MESSAGE);
		}

		try {
			const { entityCount } = await HostApi.instance.send(GetEntityCountRequestType, {});

			setHasEntities(entityCount > 0);
		} catch (err) {
			setGenericError(err?.message || GENERIC_ERROR_MESSAGE);
		} finally {
			setLoadingEntities(false);
		}

		if (repoIds.length) {
			try {
				const response = await HostApi.instance.send(GetObservabilityErrorsRequestType, {
					filters: buildFilters(repoIds),
				});

				if (response?.repos) {
					setObservabilityErrors(response.repos!);
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
			}
		}
		loading(repoIds, false);
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

	useEffect(() => {
		if (!derivedState.newRelicIsConnected) return;

		if (previousHiddenPaneNodes) {
			Object.keys(derivedState.hiddenPaneNodes).forEach(_ => {
				if (_.indexOf("newrelic-errors-in-repo-") > -1) {
					const repoId = _.replace("newrelic-errors-in-repo-", "");
					if (derivedState.hiddenPaneNodes[_] === false && previousHiddenPaneNodes[_] === true) {
						loading(repoId, true);

						HostApi.instance
							.send(GetObservabilityErrorsRequestType, { filters: buildFilters([repoId]) })
							.then(response => {
								if (response?.repos) {
									const existingObservabilityErrors = observabilityErrors.filter(
										_ => _.repoId !== repoId
									);
									existingObservabilityErrors.push(response.repos[0]);
									setObservabilityErrors(existingObservabilityErrors);
								}
								loading(repoId, false);
							})
							.catch(ex => {
								loading(repoId, false);
								if (ex.code === ERROR_NR_INSUFFICIENT_API_KEY) {
									HostApi.instance.track("NR Access Denied", {
										Query: "GetObservabilityErrors",
									});
									setNoErrorsAccess(NO_ERRORS_ACCESS_ERROR_MESSAGE);
								} else if (ex.code === ERROR_GENERIC_USE_ERROR_MESSAGE) {
									setNoErrorsAccess(ex.message || GENERIC_ERROR_MESSAGE);
								}
							});
					}
				}
			});
		}
	}, [derivedState.hiddenPaneNodes]);

	// Update golden metrics every 5 minutes
	useInterval(() => {
		fetchGoldenMetrics(expandedEntity, true);
		fetchServiceLevelObjectives(expandedEntity, true);
	}, 300000);

	const processCurrentEntityAccountIndex = () => {
		const expandedRepoEntityNode = Object.keys(derivedState.hiddenPaneNodes).filter(k => {
			return (
				!_isEmpty(k.match(/[0-9]+newrelic-errors-in-repo/gi)) &&
				derivedState.hiddenPaneNodes[k] === false
			);
		})[0];

		if (expandedRepoEntityNode) {
			setCurrentEntityAccountIndex(expandedRepoEntityNode.match(/^\d+/)![0]);
			// If none are expanded, default open the top one
		} else {
			setCurrentEntityAccountIndex("0");
		}
	};

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
		}, 1000);
	};

	const fetchObservabilityRepos = (entityGuid?: string, repoId?, force = false) => {
		loading(repoId, true);
		setLoadingEntities(true);

		return HostApi.instance
			.send(GetObservabilityReposRequestType, {
				filters: [{ repoId: repoId, entityGuid: entityGuid }],
				force,
			})
			.then(response => {
				if (response?.repos) {
					const existingObservabilityRepos = observabilityRepos.filter(_ => _.repoId !== repoId);
					existingObservabilityRepos.push(response.repos[0]);
					setObservabilityRepos(existingObservabilityRepos!);
				}
				setLoadingEntities(false);
				loading(repoId, false);
			})
			.catch(ex => {
				loading(repoId, false);
				if (ex.code === ERROR_NR_INSUFFICIENT_API_KEY) {
					HostApi.instance.track("NR Access Denied", {
						Query: "GetObservabilityRepos",
					});
					setNoErrorsAccess(NO_ERRORS_ACCESS_ERROR_MESSAGE);
					setLoadingEntities(false);
				} else if (ex.code === ERROR_GENERIC_USE_ERROR_MESSAGE) {
					setNoErrorsAccess(ex.message || GENERIC_ERROR_MESSAGE);
				}
			});
	};

	const fetchObservabilityErrors = (entityGuid: string, repoId) => {
		loading(repoId, true);
		setLoadingPane(expandedEntity);

		HostApi.instance
			.send(GetObservabilityErrorsRequestType, {
				filters: [{ repoId: repoId, entityGuid: entityGuid }],
			})
			.then(response => {
				if (response?.repos) {
					const existingObservabilityErrors = observabilityErrors.filter(_ => _?.repoId !== repoId);
					existingObservabilityErrors.push(response.repos[0]);
					setObservabilityErrors(existingObservabilityErrors!);
				}
				loading(repoId, false);
				setLoadingPane(null);
			})
			.catch(_ => {
				console.warn(_);
				loading(repoId, false);
				setLoadingPane(null);
			});
	};

	const fetchGoldenMetrics = async (
		entityGuid?: string | null,
		noLoadingSpinner?: boolean,
		force = false
	) => {
		if (entityGuid) {
			if (!noLoadingSpinner) {
				setLoadingGoldenMetrics(true);
			}
			const response = await HostApi.instance.send(GetServiceLevelTelemetryRequestType, {
				newRelicEntityGuid: entityGuid,
				repoId: currentRepoId,
				fetchRecentAlertViolations: true,
			});
			if (response?.goldenMetrics) {
				setGoldenMetrics(response.goldenMetrics);
				setGoldenMetricTransactionType(response.goldenMetricTransactionType || "Web");
				setRecentAlertViolations(response.recentAlertViolations);
				setNewRelicUrl(response.newRelicUrl);
			}
			setLoadingGoldenMetrics(false);
		}
	};

	const fetchServiceLevelObjectives = async (
		entityGuid?: string | null,
		noLoadingSpinner?: boolean
	) => {
		if (entityGuid) {
			if (!noLoadingSpinner) {
				setLoadingServiceLevelObjectives(true);
			}
			const response = await HostApi.instance.send(GetServiceLevelObjectivesRequestType, {
				entityGuid: entityGuid,
			});
			if (response?.serviceLevelObjectives) {
				setServiceLevelObjectives(response.serviceLevelObjectives);
				setHasServiceLevelObjectives(true);
			}
			setLoadingServiceLevelObjectives(false);
		}
	};

	const handleClickTopLevelService = (e, id, entityGuid) => {
		e.preventDefault();
		e.stopPropagation();

		if (loadingPane) {
			return;
		}

		const collapsed = derivedState.hiddenPaneNodes[id] || true;

		let filteredPaneNodes = getFilteredPaneNodes(id);

		Object.keys(filteredPaneNodes).map(function (key) {
			let hiddenPaneNodeString = key;
			let n = hiddenPaneNodeString.lastIndexOf("-");
			let repoIdFromHiddenPane = hiddenPaneNodeString.substring(n + 1);
			if (filteredPaneNodes[key] === false && currentRepoId === repoIdFromHiddenPane) {
				dispatch(setUserPreference({ prefPath: ["hiddenPaneNodes"], value: { [key]: true } }));
			}
		});
		dispatch(setUserPreference({ prefPath: ["hiddenPaneNodes"], value: { [id]: !collapsed } }));
		if (entityGuid === expandedEntity) {
			setExpandedEntity(null);
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
			let currentRepoErrors = observabilityErrors.find(_ => _.repoId === currentRepoId)?.errors;
			let filteredCurrentRepoErrors = currentRepoErrors?.filter(_ => _.entityId === expandedEntity);
			let filteredAssigments = observabilityAssignments?.filter(_ => _.entityId === expandedEntity);

			HostApi.instance.track("NR Service Clicked", {
				"Errors Listed": !_isEmpty(filteredCurrentRepoErrors) || !_isEmpty(filteredAssigments),
			});
			setPendingTelemetryCall(false);
		}
	}, [loadingErrors, loadingAssigments]);

	const getFilteredPaneNodes = id => {
		return Object.keys(derivedState.hiddenPaneNodes)
			.filter(k => {
				if (k === id) {
					return false;
				}
				return !_isEmpty(k.match(/[0-9]+newrelic-errors-in-repo/gi));
			})
			.reduce((newData, k) => {
				newData[k] = derivedState.hiddenPaneNodes[k];
				return newData;
			}, {});
	};

	const handleClickCLMBroadcast = (entityGuid, e?) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
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

	/*
	 *	When current repo changes in IDE, set new entity accounts
	 *  and fetch corresponding errors
	 */
	useEffect(() => {
		if (!_isEmpty(currentRepoId) && !_isEmpty(observabilityRepos)) {
			const _currentEntityAccounts = observabilityRepos.find(or => {
				if (or?.repoId) {
					return or?.repoId === currentRepoId;
				}
				return false;
			})?.entityAccounts;

			setCurrentEntityAccounts(_currentEntityAccounts);

			if (_currentEntityAccounts && !_isEmpty(_currentEntityAccounts)) {
				let _entityGuid = expandedEntity || "";

				// Only triggers conditional occurs during _useOnMount
				if (_isEmpty(_entityGuid) && currentEntityAccountIndex) {
					let __entityGuid = _currentEntityAccounts[currentEntityAccountIndex]?.entityGuid;
					fetchGoldenMetrics(__entityGuid, true);
					fetchServiceLevelObjectives(__entityGuid, true);
					setExpandedEntity(__entityGuid);
					setCurrentEntityAccountIndex(null);
					// Set user observabilityRepoEntities preference to expanded entity if one doesnt exist
					// otherwise, set to first entity in entity account list if observabilityRepoEntities is empty
					if (!_isEmpty(__entityGuid) && derivedState.observabilityRepoEntities.length === 0) {
						handleClickCLMBroadcast(__entityGuid);
					} else if (
						_isEmpty(__entityGuid) &&
						derivedState.observabilityRepoEntities.length === 0 &&
						_currentEntityAccounts.length > 0
					) {
						handleClickCLMBroadcast(_currentEntityAccounts[0]?.entityGuid);
					}
				}

				if (!_isEmpty(_entityGuid)) {
					fetchObservabilityErrors(_entityGuid, currentRepoId);
					fetchGoldenMetrics(_entityGuid, true);
					fetchServiceLevelObjectives(_entityGuid, true);
				}
			}
		}
	}, [currentRepoId, observabilityRepos, expandedEntity, currentEntityAccountIndex]);

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

	const handleSetUpMonitoring = (event: React.SyntheticEvent) => {
		event.preventDefault();
		dispatch(openPanel(WebviewPanels.OnboardNewRelic));
	};

	const { hiddenPaneNodes } = derivedState;

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
							_useDidMount(true);
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
										{_isEmpty(currentRepoId) && _isEmpty(repoForEntityAssociator) && !genericError && (
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
											observabilityRepos?.find(_ => _.hasCodeLevelMetricSpanData) && (
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
														{!hiddenPaneNodes["newrelic-errors-empty"] && (
															<ErrorRow title="No repositories found"></ErrorRow>
														)}
													</>
												)}
											</>
										)}

										{currentEntityAccounts && currentEntityAccounts?.length !== 0 && hasEntities && (
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
															const paneId =
																index + "newrelic-errors-in-repo-" + _observabilityRepo.repoId;
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
																		id={paneId}
																		labelIsFlex={true}
																		onClick={e =>
																			handleClickTopLevelService(e, paneId, ea.entityGuid)
																		}
																		collapsed={collapsed}
																		showChildIconOnCollapse={true}
																		actionsVisibleIfOpen={true}
																	>
																		{newRelicUrl && (
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
																						url: newRelicUrl,
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
																					<ErrorRow isLoading={true} title="Loading..."></ErrorRow>
																				</>
																			) : (
																				<>
																					{!hiddenPaneNodes[
																						index +
																							"newrelic-errors-in-repo-" +
																							_observabilityRepo.repoId
																					] && (
																						<>
																							<ObservabilityGoldenMetricDropdown
																								goldenMetrics={goldenMetrics}
																								goldenMetricTransactionType={
																									goldenMetricTransactionType
																								}
																								loadingGoldenMetrics={loadingGoldenMetrics}
																								recentAlertViolations={
																									recentAlertViolations ? recentAlertViolations : {}
																								}
																							/>
																							{hasServiceLevelObjectives && (
																								<>
																									<ObservabilityServiceLevelObjectives
																										serviceLevelObjectives={serviceLevelObjectives}
																										loadingServiceLevelObjectives={
																											loadingServiceLevelObjectives
																										}
																									/>
																								</>
																							)}
																							{
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
																											/>
																										</>
																									)}
																								</>
																							}
																						</>
																					)}
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
																_useDidMount(true);
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

																await fetchObservabilityRepos(
																	e.entityGuid,
																	repoForEntityAssociator.repoId,
																	true
																);
																fetchObservabilityErrors(
																	e.entityGuid,
																	repoForEntityAssociator.repoId
																);
																fetchGoldenMetrics(e.entityGuid);
																fetchServiceLevelObjectives(e.entityGuid);
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
									Connect to New Relic to see errors and debug issues.{" "}
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
