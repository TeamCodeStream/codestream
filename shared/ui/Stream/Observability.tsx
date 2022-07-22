import {
	forEach as _forEach,
	isEmpty as _isEmpty,
	isNil as _isNil,
	keyBy as _keyBy,
	head as _head
} from "lodash-es";
import React, { useEffect, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import styled, { withTheme } from "styled-components";

import {
	DidChangeObservabilityDataNotificationType,
	EntityAccount,
	ERROR_NR_INSUFFICIENT_API_KEY,
	GetObservabilityEntitiesRequestType,
	GetObservabilityErrorAssignmentsRequestType,
	GetObservabilityErrorAssignmentsResponse,
	GetObservabilityErrorsRequestType,
	GetObservabilityReposRequestType,
	GetObservabilityReposResponse,
	ObservabilityErrorCore,
	ObservabilityRepo,
	ObservabilityRepoError,
	GetMethodLevelTelemetryRequestType
} from "@codestream/protocols/agent";
import {
	HostDidChangeWorkspaceFoldersNotificationType,
	OpenUrlRequestType
} from "@codestream/protocols/webview";
import { RefreshEditorsCodeLensRequestType } from "@codestream/webview/ipc/host.protocol";

import { WebviewPanels } from "../ipc/webview.protocol.common";
import { Button } from "../src/components/Button";
import { InlineMenu } from "../src/components/controls/InlineMenu";
import { PaneBody, PaneHeader, PaneNode, PaneNodeName, PaneState } from "../src/components/Pane";
import { CodeStreamState } from "../store";
import { configureAndConnectProvider, disconnectProvider } from "../store/providers/actions";
import { isConnected } from "../store/providers/reducer";
import { useDidMount, useInterval, usePrevious } from "../utilities/hooks";
import { HostApi } from "../webview-api";
import { openPanel, setUserPreference } from "./actions";
import cx from "classnames";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import { EntityAssociator } from "./EntityAssociator";
import Icon from "./Icon";
import { Provider } from "./IntegrationsPanel";
import { Link } from "./Link";
import Timestamp from "./Timestamp";
import Tooltip from "./Tooltip";
import { WarningBox } from "./WarningBox";
import { CurrentMethodLevelTelemetry } from "@codestream/webview/store/context/types";
import { ALERT_SEVERITY_COLORS } from "./CodeError/index";
import { ObservabilityCurrentRepo } from "./ObservabilityCurrentRepo";
import { ObservabilityGoldenMetricDropdown } from "./ObservabilityGoldenMetricDropdown";
import { ObservabilityErrorWrapper } from "./ObservabilityErrorWrapper";

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

const NoEntitiesWrapper = styled.div`
	margin: 5px 20px 5px 20px;
`;

const NoEntitiesCopy = styled.div`
	margin: 5px 0 10px 0;
`;

const EntityHealth = styled.div<{ backgroundColor: string }>`
	background-color: ${props => (props.backgroundColor ? props.backgroundColor : "white")};
	width: 10px;
	height: 10px;
	margin-right: 4px;
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
	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			ideName: encodeURIComponent(state.ide.name || "")
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
									`&utm_source=codestream&utm_medium=ide-${derivedState.ideName}&utm_campaign=error_group_link`
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
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
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
				{}) as CurrentMethodLevelTelemetry
		};
	}, shallowEqual);

	const [noAccess, setNoAccess] = useState<boolean>(false);
	const [loadingErrors, setLoadingErrors] = useState<{ [repoId: string]: boolean } | undefined>(
		undefined
	);
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
	const [goldenMetrics, setGoldenMetrics] = useState<any>([]);
	const [newRelicUrl, setNewRelicUrl] = useState<string | undefined>("");
	const [expandedEntity, setExpandedEntity] = useState<string | null>(null);
	const [currentEntityAccountIndex, setCurrentEntityAccountIndex] = useState<string | null>(null);
	const [currentRepoId, setCurrentRepoId] = useState<string>("");
	const [loadingGoldenMetrics, setLoadingGoldenMetrics] = useState<boolean>(false);
	// const [loadingCLMBroadcast, setLoadingCLMBroadcast] = useState<boolean>(false);
	const [showCodeLevelMetricsBroadcastIcon, setShowCodeLevelMetricsBroadcastIcon] = useState<
		boolean
	>(false);
	const [currentEntityAccounts, setCurrentEntityAccounts] = useState<EntityAccount[] | undefined>(
		[]
	);
	const previousHiddenPaneNodes = usePrevious(derivedState.hiddenPaneNodes);
	const previousNewRelicIsConnected = usePrevious(derivedState.newRelicIsConnected);

	const buildFilters = (repoIds: string[]) => {
		return repoIds.map(repoId => {
			const repoEntity = derivedState.observabilityRepoEntities.find(_ => _.repoId === repoId);
			if (repoEntity) {
				return {
					repoId: repoId,
					entityGuid: repoEntity.entityGuid
				};
			}
			return {
				repoId: repoId
			};
		});
	};

	//@TODO: probably depreciated/candidate for deletion and cleanup
	const loading = (repoIdOrRepoIds: string | string[], isLoading: boolean) => {
		if (Array.isArray(repoIdOrRepoIds)) {
			setLoadingErrors(
				repoIdOrRepoIds.reduce(function(map, obj) {
					map[obj] = isLoading;
					return map;
				}, {})
			);
		} else {
			setLoadingErrors({
				...loadingErrors,
				[repoIdOrRepoIds]: isLoading
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
				setNoAccess(false);
			})
			.catch(ex => {
				setLoadingAssigments(false);
				if (ex.code === ERROR_NR_INSUFFICIENT_API_KEY) {
					HostApi.instance.track("NR Access Denied", {
						Query: "GetObservabilityErrorAssignments"
					});
					setNoAccess(true);
				}
			});
	};

	const _useDidMount = (force: boolean = false) => {
		if (!derivedState.newRelicIsConnected) return;

		setLoadingEntities(true);
		loadAssignments();
		processCurrentEntityAccountIndex();

		HostApi.instance
			.send(GetObservabilityReposRequestType, {})
			.then((_: GetObservabilityReposResponse) => {
				setObservabilityRepos(_.repos || []);
				let repoIds = _.repos?.filter(r => r.repoId).map(r => r.repoId!) || [];
				const hiddenRepos = Object.keys(hiddenPaneNodes)
					.filter(_ => {
						return _.indexOf("newrelic-errors-in-repo-") === 0 && hiddenPaneNodes[_] === true;
					})
					.map(r => r.replace("newrelic-errors-in-repo-", ""));
				repoIds = repoIds.filter(r => !hiddenRepos.includes(r));
				loading(repoIds, true);
				HostApi.instance
					.send(GetObservabilityErrorsRequestType, {
						filters: buildFilters(repoIds)
					})
					.then(response => {
						if (response?.repos) {
							setObservabilityErrors(response.repos!);
						}
						HostApi.instance
							.send(GetObservabilityEntitiesRequestType, {
								appNames: response?.repos?.map(r => r.repoName),
								resetCache: force
							})
							.then(_ => {
								setHasEntities(!_isEmpty(_.entities));
								setLoadingEntities(false);
							});
						loading(repoIds, false);
					})
					.catch(ex => {
						loading(repoIds, false);
						if (ex.code === ERROR_NR_INSUFFICIENT_API_KEY) {
							HostApi.instance.track("NR Access Denied", {
								Query: "GetObservabilityErrors"
							});
							setNoAccess(true);
						}
					});
			});
	};

	useDidMount(() => {
		_useDidMount();

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
										Query: "GetObservabilityErrors"
									});
									setNoAccess(true);
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

	const fetchObservabilityRepos = (entityGuid: string, repoId) => {
		loading(repoId, true);
		setLoadingEntities(true);

		return HostApi.instance
			.send(GetObservabilityReposRequestType, {
				filters: [{ repoId: repoId, entityGuid: entityGuid }]
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
						Query: "GetObservabilityRepos"
					});
					setNoAccess(true);
					setLoadingEntities(false);
				}
			});
	};

	const fetchObservabilityErrors = (entityGuid: string, repoId) => {
		loading(repoId, true);
		setLoadingPane(expandedEntity);

		HostApi.instance
			.send(GetObservabilityErrorsRequestType, {
				filters: [{ repoId: repoId, entityGuid: entityGuid }]
			})
			.then(response => {
				if (response?.repos) {
					const existingObservabilityErrors = observabilityErrors.filter(_ => _.repoId !== repoId);
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

	const fetchGoldenMetrics = async (entityGuid?: string | null, noLoadingSpinner?: boolean) => {
		if (entityGuid) {
			if (!noLoadingSpinner) {
				setLoadingGoldenMetrics(true);
			}
			const response = await HostApi.instance.send(GetMethodLevelTelemetryRequestType, {
				newRelicEntityGuid: entityGuid,
				repoId: currentRepoId
			});
			if (response?.goldenMetrics) {
				setGoldenMetrics(response.goldenMetrics);
				setNewRelicUrl(response.newRelicUrl);
			}
			setLoadingGoldenMetrics(false);
		}
	};

	const handleClickErrorsInRepo = (e, id, entityGuid) => {
		e.preventDefault();
		e.stopPropagation();

		if (loadingPane) {
			return;
		}

		const collapsed = derivedState.hiddenPaneNodes[id] || true;

		let filteredPaneNodes = getFilteredPaneNodes(id);

		Object.keys(filteredPaneNodes).map(function(key) {
			if (filteredPaneNodes[key] === false) {
				dispatch(setUserPreference(["hiddenPaneNodes"], { [key]: true }));
			}
		});
		dispatch(setUserPreference(["hiddenPaneNodes"], { [id]: !collapsed }));

		if (entityGuid === expandedEntity) {
			setExpandedEntity(null);
		} else {
			setExpandedEntity(entityGuid);
		}
	};

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

	const settingsMenuItems = [
		{
			label: "Instrument my App",
			key: "instrument",
			action: () => dispatch(openPanel(WebviewPanels.OnboardNewRelic))
		},
		{ label: "-" },
		{
			label: "Disconnect",
			key: "disconnect",
			action: () => dispatch(disconnectProvider("newrelic*com", "Sidebar"))
		}
	];

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
			entityGuid: entityGuid
		});
		dispatch(setUserPreference(["observabilityRepoEntities"], newPreferences));

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
				return or.repoId === currentRepoId;
			})?.entityAccounts;

			setCurrentEntityAccounts(_currentEntityAccounts);

			if (_currentEntityAccounts && !_isEmpty(_currentEntityAccounts)) {
				let _entityGuid = expandedEntity || "";

				// Only triggers conditional occurs during _useOnMount
				if (_isEmpty(_entityGuid) && currentEntityAccountIndex) {
					let __entityGuid = _currentEntityAccounts[currentEntityAccountIndex]?.entityGuid;
					fetchGoldenMetrics(__entityGuid);
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
					fetchGoldenMetrics(_entityGuid);
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
			derivedState.newRelicIsConnected &&
			hasLoadedOnce === false
		) {
			hasLoadedOnce = true;

			let errorCount = 0,
				unassociatedRepoCount = 0,
				hasObservabilityErrors = false;

			// Count all errors for each element of observabilityErrors
			// Also set to hasObservability errors to true if nested errors array is populated
			_forEach(observabilityErrors, oe => {
				if (oe?.errors?.length) {
					errorCount += oe.errors.length;
					hasObservabilityErrors = true;
				}
			});

			_forEach(observabilityRepos, ore => {
				if (!ore.hasRepoAssociation) {
					unassociatedRepoCount++;
				}
			});

			HostApi.instance.track("NR Error List Rendered", {
				"Errors Listed": !_isEmpty(observabilityAssignments) || hasObservabilityErrors,
				"Assigned Errors": observabilityAssignments.length,
				"Repo Errors": errorCount,
				"Unassociated Repos": unassociatedRepoCount
			});
		}
	}, [loadingErrors, loadingAssigments]);

	useEffect(() => {
		if (!_isEmpty(currentRepoId) && !_isEmpty(observabilityRepos)) {
			const currentRepo = _head(observabilityRepos.filter(_ => _.repoId === currentRepoId));

			// Show repo entity associator UI if needed
			if (
				currentRepo &&
				!currentRepo.hasRepoAssociation &&
				!observabilityErrors?.find(
					oe => oe?.repoId === currentRepo?.repoId && oe?.errors.length > 0
				)
			) {
				setRepoForEntityAssociator(currentRepo);
			} else {
				setRepoForEntityAssociator({});
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
	}, [currentRepoId, observabilityRepos]);

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
					<>
						<Icon
							name="refresh"
							title="Refresh"
							placement="bottom"
							delay={1}
							onClick={e => {
								_useDidMount(true);
							}}
						/>
						<InlineMenu
							title="Connected to New Relic"
							key="settings-menu"
							className="subtle no-padding"
							noFocusOnSelect
							noChevronDown
							items={settingsMenuItems}
						>
							<Icon name="gear" title="Settings" placement="bottom" delay={1} />
						</InlineMenu>
					</>
				) : (
					<>&nbsp;</>
				)}
			</PaneHeader>
			{props.paneState !== PaneState.Collapsed && (
				<PaneBody key={"observability"}>
					<div style={{ padding: "0 10px 0 20px" }}></div>
					{derivedState.newRelicIsConnected ? (
						<>
							{noAccess ? (
								<div style={{ padding: "0 20px 20px 20px" }}>
									<span>
										Your New Relic account doesn’t have access to the integration with CodeStream.
										Contact your New Relic admin to upgrade.
									</span>
								</div>
							) : (
								<>
									<PaneNode>
										{loadingEntities && (
											<ErrorRow
												isLoading={true}
												title="Loading..."
												customPadding={"0 10px 0 20px"}
											></ErrorRow>
										)}
										{!loadingEntities && !hasEntities && (
											<NoEntitiesWrapper>
												<NoEntitiesCopy>
													Set up application performance monitoring for your project so that you can
													discover and investigate errors with CodeStream
												</NoEntitiesCopy>
												<Button style={{ width: "100%" }} onClick={handleSetUpMonitoring}>
													Set Up Monitoring
												</Button>
											</NoEntitiesWrapper>
										)}
										{!loadingEntities &&
											!derivedState.hideCodeLevelMetricsInstructions &&
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
																"https://docs.newrelic.com/docs/codestream/how-use-codestream/performance-monitoring#code-level"
														}
													]}
													dismissCallback={e => {
														dispatch(setUserPreference(["hideCodeLevelMetricsInstructions"], true));
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

										{!loadingEntities &&
											currentEntityAccounts &&
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
																const paneId =
																	index + "newrelic-errors-in-repo-" + _observabilityRepo.repoId;
																const collapsed = expandedEntity !== ea.entityGuid;
																const currentObservabilityRepoEntity = derivedState.observabilityRepoEntities.find(
																	ore => {
																		return ore.repoId === currentRepoId;
																	}
																);
																const isSelectedCLM =
																	ea.entityGuid === currentObservabilityRepoEntity?.entityGuid;
																return (
																	<>
																		<PaneNodeName
																			title={
																				<div style={{ display: "flex", alignItems: "center" }}>
																					<EntityHealth backgroundColor={alertSeverityColor} />
																					<div>
																						<span>{ea.entityName}</span>
																						<span
																							className="subtle"
																							style={{ fontSize: "11px", verticalAlign: "bottom" }}
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
																				handleClickErrorsInRepo(e, paneId, ea.entityGuid)
																			}
																			collapsed={collapsed}
																			showChildIconOnCollapse={true}
																			actionsVisibleIfOpen={true}
																		>
																			{newRelicUrl && (
																				<Icon
																					name="globe"
																					className={cx("clickable", {
																						"icon-override-actions-visible": true
																					})}
																					title="View on New Relic"
																					placement="bottomLeft"
																					delay={1}
																					onClick={e => {
																						e.preventDefault();
																						e.stopPropagation();
																						HostApi.instance.send(OpenUrlRequestType, {
																							url: newRelicUrl
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
																						opacity: isSelectedCLM ? "1" : "inherit"
																					}}
																					name="broadcast"
																					className={cx("clickable", {
																						"icon-override-actions-visible": !isSelectedCLM
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
																						{!hiddenPaneNodes[
																							index +
																								"newrelic-errors-in-repo-" +
																								_observabilityRepo.repoId
																						] && (
																							<>
																								<ObservabilityGoldenMetricDropdown
																									goldenMetrics={goldenMetrics}
																									loadingGoldenMetrics={loadingGoldenMetrics}
																								/>

																								{observabilityErrors?.find(
																									oe =>
																										oe?.repoId === _observabilityRepo?.repoId &&
																										oe?.errors.length > 0
																								) ? (
																									<>
																										<ObservabilityErrorWrapper
																											observabilityErrors={observabilityErrors}
																											observabilityRepo={_observabilityRepo}
																											observabilityAssignments={
																												observabilityAssignments
																											}
																											entityGuid={ea.entityGuid}
																										/>
																									</>
																								) : _observabilityRepo.hasRepoAssociation ? (
																									<ErrorRow title="No errors to display" />
																								) : (
																									<>
																										{/* @TODO rework this conditional, this part will never be triggered */}
																									</>
																								)}
																							</>
																						)}
																					</>
																				)}
																			</>
																		)}
																	</>
																);
															} else return null;
														})}
												</>
											)}
										{!loadingEntities && hasEntities && (
											<>
												{!_isEmpty(repoForEntityAssociator) && (
													<>
														<EntityAssociator
															label={
																<span>
																	Associate this repo with an entity on New Relic in order to see
																	errors. Or,{" "}
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
																	"Repo ID": repoForEntityAssociator.repoId
																});

																await fetchObservabilityRepos(
																	e.entityGuid,
																	repoForEntityAssociator.repoId
																);
																fetchObservabilityErrors(
																	e.entityGuid,
																	repoForEntityAssociator.repoId
																);
																fetchGoldenMetrics(e.entityGuid);
															}}
															remote={repoForEntityAssociator.repoRemote}
															remoteName={repoForEntityAssociator.repoName}
														/>
													</>
												)}
											</>
										)}
									</PaneNode>
								</>
							)}
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
												dispatch(setUserPreference(["skipConnectObservabilityProviders"], true))
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
											whiteSpace: "nowrap"
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
