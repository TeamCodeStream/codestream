import React, { useEffect, useState } from "react";
import { useSelector, useDispatch, shallowEqual } from "react-redux";
import { PaneHeader, PaneBody, PaneState, PaneNode, PaneNodeName } from "../src/components/Pane";
import { WebviewPanels } from "../ipc/webview.protocol.common";
import { CodeStreamState } from "../store";
import { isConnected } from "../store/providers/reducer";
import { Provider } from "./IntegrationsPanel";
import { configureAndConnectProvider, disconnectProvider } from "../store/providers/actions";
import Icon from "./Icon";
import Tooltip from "./Tooltip";
import { openPanel, setUserPreference } from "./actions";
import { Row } from "./CrossPostIssueControls/IssueDropdown";
import { HostApi } from "../webview-api";
import {
	HostDidChangeWorkspaceFoldersNotificationType,
	OpenUrlRequestType
} from "@codestream/protocols/webview";
import Timestamp from "./Timestamp";
import styled from "styled-components";
import { InlineMenu } from "../src/components/controls/InlineMenu";
import { useDidMount, usePrevious } from "../utilities/hooks";
import {
	EntityAccount,
	ObservabilityErrorCore,
	GetObservabilityErrorAssignmentsRequestType,
	GetObservabilityErrorAssignmentsResponse,
	GetObservabilityErrorsRequestType,
	GetObservabilityErrorGroupMetadataResponse,
	GetObservabilityErrorGroupMetadataRequestType,
	GetObservabilityReposRequestType,
	GetObservabilityReposResponse,
	ObservabilityRepo,
	ObservabilityRepoError,
	DidChangeObservabilityDataNotificationType
} from "@codestream/protocols/agent";

import { forEach as _forEach, isEmpty as _isEmpty, isNil as _isNil, keyBy as _keyBy } from "lodash-es";
import { openErrorGroup } from "../store/codeErrors/actions";
import { EntityAssociator } from "./EntityAssociator";
import { Link } from "./Link";

interface Props {
	paneState: PaneState;
}

const EMPTY_HASH = {};

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

const ErrorRow = (props: {
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
							title="View on New Relic One"
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

const EMPTY_ARRAY = [];
let hasRenderedOnce = false;

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
			observabilityRepoEntities: preferences.observabilityRepoEntities || EMPTY_ARRAY
		};
	}, shallowEqual);

	const [loadingErrors, setLoadingErrors] = useState<{ [repoId: string]: boolean } | undefined>(
		undefined
	);
	const [loadingAssignmentErrorsClick, setLoadingAssignmentErrorsClick] = useState<{
		[errorGroupGuid: string]: boolean;
	}>({});
	const [loadingAssigments, setLoadingAssigments] = useState<boolean>(false);
	const [observabilityAssignments, setObservabilityAssignments] = useState<
		ObservabilityErrorCore[]
	>([]);
	const [observabilityErrors, setObservabilityErrors] = useState<ObservabilityRepoError[]>([]);
	const [observabilityRepos, setObservabilityRepos] = useState<ObservabilityRepo[]>([]);
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
		if (hiddenPaneNodes["newrelic-errors-assigned-to-me"] !== true) {
			setLoadingAssigments(true);

			HostApi.instance
				.send(GetObservabilityErrorAssignmentsRequestType, {})
				.then((_: GetObservabilityErrorAssignmentsResponse) => {
					setObservabilityAssignments(_.items);
					setLoadingAssigments(false);
				});
		}
	};

	const _useDidMount = () => {
		if (!derivedState.newRelicIsConnected) return;

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

				if (repoIds.length) {
					loading(repoIds, true);

					HostApi.instance
						.send(GetObservabilityErrorsRequestType, {
							filters: buildFilters(repoIds)
						})
						.then(response => {
							if (response?.repos) {
								setObservabilityErrors(response.repos!);
							}
							loading(repoIds, false);
						});
				}
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
					if (
						!observabilityErrors.find(_ => _.repoId === repoId) &&
						derivedState.hiddenPaneNodes[_] === false &&
						previousHiddenPaneNodes[_] === true
					) {
						loading(repoId, true);

						HostApi.instance
							.send(GetObservabilityErrorsRequestType, { filters: buildFilters([repoId]) })
							.then(response => {
								if (response?.repos) {
									setObservabilityErrors(response.repos!);
								}
								loading(repoId, false);
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

	const buildSelectedLabel = (repoId: string, entityAccounts: EntityAccount[]) => {
		const selected = derivedState.observabilityRepoEntities.find(_ => _.repoId === repoId);
		if (selected) {
			const found = entityAccounts.find(_ => _.entityGuid === selected.entityGuid);
			if (found) {
				return found.entityName;
			}
		} else if (entityAccounts?.length) {
			return entityAccounts[0].entityName;
		}
		return "(select)";
	};

	const renderAssignments = () => {
		return (
			<>
				<PaneNodeName
					title="Errors assigned to me"
					id="newrelic-errors-assigned-to-me"
				></PaneNodeName>
				<>
					{!hiddenPaneNodes["newrelic-errors-assigned-to-me"] && (
						<>
							{loadingAssigments ? (
								<>
									<ErrorRow isLoading={true} title="Loading..."></ErrorRow>
								</>
							) : (
								<>
									{observabilityAssignments.length == 0 ? (
										<>
											<ErrorRow title={"No errors to display"}></ErrorRow>
										</>
									) : (
										<>
											{observabilityAssignments.map(_ => {
												return (
													<ErrorRow
														title={_.errorClass}
														isLoading={loadingAssignmentErrorsClick[_.errorGroupGuid]}
														tooltip={_.message}
														url={_.errorGroupUrl}
														onClick={async e => {
															setLoadingAssignmentErrorsClick({
																...loadingAssignmentErrorsClick,
																[_.errorGroupGuid]: true
															});
															try {
																const response = (await HostApi.instance.send(
																	GetObservabilityErrorGroupMetadataRequestType,
																	{ errorGroupGuid: _.errorGroupGuid }
																)) as GetObservabilityErrorGroupMetadataResponse;
																if (response) {
																	dispatch(
																		openErrorGroup(_.errorGroupGuid, response.occurrenceId, {
																			remote: response.remote,
																			sessionStart: derivedState.sessionStart,
																			pendingEntityId: response.entityId,
																			occurrenceId: response.occurrenceId,
																			pendingErrorGroupGuid: _.errorGroupGuid,
																			openType: "Observability Section"
																		})
																	);
																} else {
																	console.error("could not open error group");
																}
															} catch (ex) {
																console.error(ex);
															} finally {
																setLoadingAssignmentErrorsClick({
																	...loadingAssignmentErrorsClick,
																	[_.errorGroupGuid]: false
																});
															}
														}}
													></ErrorRow>
												);
											})}
										</>
									)}
								</>
							)}
						</>
					)}
				</>
			</>
		);
	};

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
			hasRenderedOnce === false
		) {
			hasRenderedOnce = true;

			const hasErrors = 
				!_isEmpty(observabilityErrors) ||
				!_isEmpty(observabilityAssignments);
			
			// Count all errors for each element of observabilityErrors
			let errorCount = 0;
			_forEach(observabilityErrors, oe => {
				errorCount += oe.errors.length;
			});
				
			HostApi.instance.track("NR Error List Rendered", {
				"Errors Listed": hasErrors, 
				"Assigned Errors": observabilityAssignments.length, 
				"Repo Errors": errorCount, 
				"Unassociated Repos": observabilityRepos.length, 
			});
		}
	}, [loadingErrors, loadingAssigments]);

	const { hiddenPaneNodes } = derivedState;
	return (
		<Root>
			<PaneHeader title="Observability" id={WebviewPanels.Observability} count={"Preview"}>
				{derivedState.newRelicIsConnected ? (
					<>
						<Icon
							name="refresh"
							title="Refresh"
							placement="bottom"
							delay={1}
							onClick={e => {
								_useDidMount();
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
				<PaneBody>
					<div style={{ padding: "0 10px 0 20px" }}></div>
					{derivedState.newRelicIsConnected ? (
						<>
							<PaneNode>
								{renderAssignments()}
								{observabilityRepos.length == 0 ? (
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
								) : (
									<>
										{observabilityRepos.map((or: ObservabilityRepo) => {
											return (
												<>
													<PaneNodeName
														title={"Recent errors in " + or.repoName}
														id={"newrelic-errors-in-repo-" + or.repoId}
														subtitle={
															!or.entityAccounts || or.entityAccounts.length < 2 ? (
																undefined
															) : (
																<>
																	<InlineMenu
																		key="codemark-display-options"
																		className="subtle no-padding"
																		noFocusOnSelect
																		preventMenuStopPropagation={true}
																		items={or.entityAccounts.map((ea, index) => {
																			let checked = false;
																			// if we dont have a setting for this, we choose the first one
																			if (
																				Object.keys(derivedState.observabilityRepoEntities || {})
																					.length === 0 &&
																				index === 0
																			) {
																				checked = true;
																			} else {
																				const setting = derivedState.observabilityRepoEntities.find(
																					_ =>
																						_.repoId === or.repoId && _.entityGuid === ea.entityGuid
																				);
																				checked = !!setting;
																			}
																			return {
																				label: ea.entityName,
																				subtle:
																					ea.accountName && ea.accountName.length > 25
																						? ea.accountName.substr(0, 25) + "..."
																						: ea.accountName,
																				key: ea.entityGuid,
																				//icon: <Icon name="file" />,
																				action: () => {
																					fetchObservabilityErrors(ea.entityGuid, or.repoId);
																					const newPreferences = derivedState.observabilityRepoEntities.filter(
																						_ => _.repoId !== or.repoId
																					);
																					newPreferences.push({
																						repoId: or.repoId,
																						entityGuid: ea.entityGuid
																					});
																					dispatch(
																						setUserPreference(
																							["observabilityRepoEntities"],
																							newPreferences
																						)
																					);
																				},
																				checked: checked
																			};
																		})}
																		title="Entities"
																	>
																		{buildSelectedLabel(or.repoId, or.entityAccounts)}
																	</InlineMenu>
																</>
															)
														}
													></PaneNodeName>
													{loadingErrors && loadingErrors[or.repoId] ? (
														<>
															<ErrorRow isLoading={true} title="Loading..."></ErrorRow>
														</>
													) : (
														<>
															{!hiddenPaneNodes["newrelic-errors-in-repo-" + or.repoId] && (
																<>
																	{observabilityErrors?.find(
																		oe => oe.repoId === or.repoId && oe.errors.length > 0
																	) ? (
																		<>
																			{observabilityErrors
																				.filter(oe => oe.repoId === or.repoId)
																				.map(ugh => {
																					return ugh.errors.map(err => {
																						return (
																							<ErrorRow
																								title={`${err.errorClass} (${err.count})`}
																								tooltip={err.message}
																								subtle={err.message}
																								timestamp={err.lastOccurrence}
																								url={err.errorGroupUrl}
																								onClick={e => {
																									dispatch(
																										openErrorGroup(
																											err.errorGroupGuid,
																											err.occurrenceId,
																											{
																												timestamp: err.lastOccurrence,
																												remote: or.repoRemote,
																												sessionStart: derivedState.sessionStart,
																												pendingEntityId: err.entityId,
																												occurrenceId: err.occurrenceId,
																												pendingErrorGroupGuid: err.errorGroupGuid,
																												src: "Observability Section"
																											}
																										)
																									);
																								}}
																							/>
																						);
																					});
																				})}
																		</>
																	) : or.hasRepoAssociation ? (
																		<ErrorRow title="No errors to display" />
																	) : (
																		<EntityAssociator
																			onSuccess={async e => {
																				HostApi.instance.track("NR Entity Association", {
																					"Repo ID": or.repoId
																				});

																				await fetchObservabilityRepos(e.entityGuid, or.repoId);
																				fetchObservabilityErrors(e.entityGuid, or.repoId);
																			}}
																			remote={or.repoRemote}
																			remoteName={or.repoName}
																		/>
																	)}
																</>
															)}
														</>
													)}
												</>
											);
										})}
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
										Connect to New Relic One
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
