import {
	forEach as _forEach,
	isEmpty as _isEmpty,
	isNil as _isNil,
	keyBy as _keyBy
} from "lodash-es";
import React, { useEffect, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import styled from "styled-components";

import {
	DidChangeObservabilityDataNotificationType,
	EntityAccount,
	ERROR_NR_INSUFFICIENT_API_KEY,
	GetObservabilityEntitiesRequestType,
	GetObservabilityErrorAssignmentsRequestType,
	GetObservabilityErrorAssignmentsResponse,
	GetObservabilityErrorGroupMetadataRequestType,
	GetObservabilityErrorGroupMetadataResponse,
	GetObservabilityErrorsRequestType,
	GetObservabilityReposRequestType,
	GetObservabilityReposResponse,
	ObservabilityErrorCore,
	ObservabilityRepo,
	ObservabilityRepoError,
	ReposScm,
	GetMethodLevelTelemetryRequestType,
	GetMethodLevelTelemetryResponse
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
import { openErrorGroup } from "../store/codeErrors/actions";
import { configureAndConnectProvider, disconnectProvider } from "../store/providers/actions";
import { isConnected } from "../store/providers/reducer";
import { useDidMount, usePrevious } from "../utilities/hooks";
import { HostApi } from "../webview-api";
import { openPanel, setUserPreference } from "./actions";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import { EntityAssociator } from "./EntityAssociator";
import Icon from "./Icon";
import { Provider } from "./IntegrationsPanel";
import { Link } from "./Link";
import Timestamp from "./Timestamp";
import Tooltip from "./Tooltip";
import { WarningBox } from "./WarningBox";
import { CurrentMethodLevelTelemetry } from "@codestream/webview/store/context/types";
import { ObservabilityCurrentRepo } from "./ObservabilityCurrentRepo";
import { ObservabilityErrorDropdown } from "./ObservabilityErrorDropdown";
import { ObservabilityGoldenMetricDropdown } from "./ObservabilityGoldenMetricDropdown";
import { ObservabilityAssignmentsDropdown } from "./ObservabilityAssignmentsDropdown";

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

export const ErrorRow = (props: {
	title: string;
	subtle?: string;
	tooltip?: string;
	timestamp?: number;
	isLoading?: boolean;
	url?: string;
	onClick?: Function;
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
	const [loadingEntities, setLoadingEntities] = useState<boolean>(false);
	const [observabilityAssignments, setObservabilityAssignments] = useState<
		ObservabilityErrorCore[]
	>([]);
	const [observabilityErrors, setObservabilityErrors] = useState<ObservabilityRepoError[]>([]);
	const [observabilityRepos, setObservabilityRepos] = useState<ObservabilityRepo[]>([]);
	const [currentRepoId, setCurrentRepoId] = useState<string>("");
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

	const fetchObservabilityRepos = (entityGuid: string, repoId) => {
		loading(repoId, true);

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

				loading(repoId, false);
			})
			.catch(ex => {
				loading(repoId, false);
				if (ex.code === ERROR_NR_INSUFFICIENT_API_KEY) {
					HostApi.instance.track("NR Access Denied", {
						Query: "GetObservabilityRepos"
					});
					setNoAccess(true);
				}
			});
	};

	const fetchObservabilityErrors = (entityGuid: string, repoId) => {
		loading(repoId, true);

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
			})
			.catch(_ => {
				console.warn(_);
				loading(repoId, false);
			});
	};

	const fetchGoldenMetrics = async (entityGuid: string) => {
		const response = await HostApi.instance.send(GetMethodLevelTelemetryRequestType, {
			newRelicEntityGuid: entityGuid,
			metricTimesliceNameMapping: derivedState.currentMethodLevelTelemetry
				.metricTimesliceNameMapping!,
			repoId: currentRepoId
		});
		console.warn(response);
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
				const _entityGuid = _currentEntityAccounts[0]?.entityGuid;

				fetchObservabilityErrors(_entityGuid, currentRepoId);
				// fetchGoldenMetrics(_entityGuid);

				const newPreferences = derivedState.observabilityRepoEntities.filter(
					_ => _.repoId !== currentRepoId
				);
				newPreferences.push({
					repoId: currentRepoId,
					entityGuid: _entityGuid
				});
				dispatch(setUserPreference(["observabilityRepoEntities"], newPreferences));
				// update the IDEs
				HostApi.instance.send(RefreshEditorsCodeLensRequestType, {});
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
				if (oe.errors.length) {
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

	const inlineMenuEntityItems = or => {
		let items = or.entityAccounts.map((ea, index) => {
			let checked = false;
			// if we dont have a setting for this, we choose the first one
			if (derivedState.observabilityRepoEntities.length === 0 && index === 0) {
				checked = true;
			} else {
				const setting = derivedState.observabilityRepoEntities.find(
					_ => _.repoId === or.repoId && _.entityGuid === ea.entityGuid
				);
				checked = !!setting;
			}
			return {
				label: ea.entityName,
				searchLabel: ea.entityName,
				subtle: `${
					ea.accountName && ea.accountName.length > 25
						? ea.accountName.substr(0, 25) + "..."
						: ea.accountName
				}${ea.domain ? ` (${ea.domain})` : ""}`,
				key: ea.entityGuid,
				action: () => {
					fetchObservabilityErrors(ea.entityGuid, or.repoId);
					const newPreferences = derivedState.observabilityRepoEntities.filter(
						_ => _.repoId !== or.repoId
					);
					newPreferences.push({
						repoId: or.repoId,
						entityGuid: ea.entityGuid
					});
					dispatch(setUserPreference(["observabilityRepoEntities"], newPreferences));
					// update the IDEs
					HostApi.instance.send(RefreshEditorsCodeLensRequestType, {});
				},
				checked: checked
			};
		});

		// didn't find any checked items, check the first
		if (items.length && !items.find(_ => _.checked)) {
			items[0].checked = true;
		}

		if (items.length >= 5) {
			items.unshift({ label: "-" });
			items.unshift({ type: "search", placeholder: "Search...", action: "search" });
		}

		return items;
	};

	const handleSetUpMonitoring = (event: React.SyntheticEvent) => {
		event.preventDefault();
		dispatch(openPanel(WebviewPanels.OnboardNewRelic));
	};

	const { hiddenPaneNodes } = derivedState;

	console.warn("eric observabilityRepos", observabilityRepos);
	console.warn("eric observabilityErrors", observabilityErrors);
	console.warn("eric currentRepo", currentRepoId);
	console.warn("eric currentEntityAccounts", currentEntityAccounts);

	return (
		<Root>
			<PaneHeader
				title="Observability"
				id={WebviewPanels.Observability}
				subtitle={<ObservabilityCurrentRepo currentRepoCallback={setCurrentRepoId} />}
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
										{loadingEntities && <ErrorRow isLoading={true} title="Loading..."></ErrorRow>}
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

										{currentEntityAccounts && currentEntityAccounts?.length !== 0 && hasEntities && (
											<>
												{currentEntityAccounts
													.filter(_ => _)
													.map(ea => {
														const _observabilityRepo = observabilityRepos.find(
															_ => _.repoId === currentRepoId
														);
														if (_observabilityRepo) {
															return (
																<>
																	<PaneNodeName
																		title={ea.entityName}
																		id={"newrelic-errors-in-repo-" + _observabilityRepo.repoId}
																	/>
																	{loadingErrors && loadingErrors[_observabilityRepo.repoId] ? (
																		<>
																			<ErrorRow isLoading={true} title="Loading..."></ErrorRow>
																		</>
																	) : (
																		<>
																			{!hiddenPaneNodes[
																				"newrelic-errors-in-repo-" + _observabilityRepo.repoId
																			] && (
																				<>
																					{observabilityErrors?.find(
																						oe =>
																							oe?.repoId === _observabilityRepo?.repoId &&
																							oe?.errors.length > 0
																					) ? (
																						<>
																							<ObservabilityGoldenMetricDropdown />

																							<ObservabilityErrorDropdown
																								observabilityErrors={observabilityErrors}
																								observabilityRepo={_observabilityRepo}
																							/>

																							<ObservabilityAssignmentsDropdown
																								observabilityAssignments={observabilityAssignments}
																							/>
																						</>
																					) : _observabilityRepo.hasRepoAssociation ? (
																						<ErrorRow title="No errors to display" />
																					) : (
																						<EntityAssociator
																							label="Associate this repo with an entity on New Relic in order to see errors"
																							onSuccess={async e => {
																								HostApi.instance.track("NR Entity Association", {
																									"Repo ID": _observabilityRepo.repoId
																								});

																								await fetchObservabilityRepos(
																									e.entityGuid,
																									_observabilityRepo.repoId
																								);
																								fetchObservabilityErrors(
																									e.entityGuid,
																									_observabilityRepo.repoId
																								);
																							}}
																							remote={_observabilityRepo.repoRemote}
																							remoteName={_observabilityRepo.repoName}
																						/>
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
