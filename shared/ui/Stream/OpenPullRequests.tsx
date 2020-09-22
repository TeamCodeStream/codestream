import React, { useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import * as userSelectors from "../store/users/reducer";
import * as providerSelectors from "../store/providers/reducer";
import { CodeStreamState } from "../store";
import { Row } from "./CrossPostIssueControls/IssueDropdown";
import Icon from "./Icon";
import { PRHeadshot } from "../src/components/Headshot";
import { setCurrentReview, setCurrentPullRequest } from "../store/context/actions";
import Tooltip from "./Tooltip";
import Timestamp from "./Timestamp";
import { isConnected } from "../store/providers/reducer";
import { HostApi } from "../webview-api";
import {
	ReposScm,
	GetMyPullRequestsResponse,
	ExecuteThirdPartyRequestUntypedType,
	QueryThirdPartyRequestType,
	DidChangeDataNotificationType,
	ChangeDataType
} from "@codestream/protocols/agent";
import { OpenUrlRequestType, WebviewPanels } from "@codestream/protocols/webview";
import { Button } from "../src/components/Button";
import { getMyPullRequests, openPullRequestByUrl } from "../store/providerPullRequests/actions";
import { PRBranch } from "./PullRequestComponents";
import { PRHeadshotName } from "../src/components/HeadshotName";
import styled from "styled-components";
import Tag from "./Tag";
import { setUserPreference } from "./actions";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";
import { confirmPopup } from "./Confirm";
import { ConfigurePullRequestQuery } from "./ConfigurePullRequestQuery";
import { DEFAULT_QUERIES } from "../store/preferences/reducer";
import { ConfigurePullRequestQuerySettings } from "./ConfigurePullRequestQuerySettings";
import { PullRequestQuery } from "@codestream/protocols/api";
import { configureAndConnectProvider } from "../store/providers/actions";
import {
	PaneHeader,
	PaneBody,
	NoContent,
	PaneNode,
	PaneNodeName,
	PaneState
} from "../src/components/Pane";
import { Provider, IntegrationButtons } from "./IntegrationsPanel";
import { usePrevious } from "../utilities/hooks";

const Root = styled.div`
	height: 100%;
	.pr-row {
		padding-left: 40px;
		.selected-icon {
			left: 20px;
		}
	}
`;

export const PullRequestTooltip = (props: { pr: GetMyPullRequestsResponse }) => {
	const { pr } = props;
	const statusIcon =
		pr.isDraft || pr.state === "OPEN" || pr.state === "CLOSED" ? "pull-request" : "git-merge";

	const color = pr.isDraft
		? "gray"
		: pr.state === "OPEN"
		? "green"
		: pr.state === "MERGED"
		? "purple"
		: pr.state === "CLOSED"
		? "red"
		: "blue";

	return (
		<div>
			<div style={{ maxWidth: "400px", padding: "10px" }}>
				{pr.headRepository && pr.headRepository.nameWithOwner}{" "}
				<Timestamp time={pr.createdAt} relative />
				<div style={{ marginTop: "10px" }}>
					<div style={{ display: "flex" }}>
						<Icon
							name={statusIcon}
							className={`margin-right ${color}-color`}
							style={{ marginTop: "2px" }}
						/>
						<div>
							<span style={{ fontSize: "larger" }}>
								<span className="highlight">{pr.title}</span>{" "}
								<span className="subtle">#{pr.number}</span>
							</span>
							<div className="subtle" style={{ margin: "2px 0 10px 0", fontSize: "larger" }}>
								{(pr.bodyText || "").substr(0, 300)}
							</div>
							<div className="monospace" style={{ fontSize: "smaller" }}>
								<PRBranch>{pr.baseRefName}&nbsp;</PRBranch>
								<span style={{ verticalAlign: "3px" }}>
									<Icon name="arrow-left" />
								</span>
								<PRBranch>&nbsp;{pr.headRefName}</PRBranch>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div
				style={{
					margin: "5px -5px 0 -5px",
					padding: "15px 15px 0 15px",
					borderTop: "1px solid rgba(0, 0, 0, 0.1)"
				}}
			>
				<PRHeadshotName person={pr.author} size={16} />
				opened
			</div>
		</div>
	);
};

const ConnectToCodeHost = styled.div`
	// margin: 10px 20px 0 20px;
	button {
		margin: 0 10px 10px 0;
	}
`;

interface Props {
	openRepos: ReposScm[];
	state: PaneState;
}

export function OpenPullRequests(props: Props) {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { session, preferences } = state;

		const currentUserId = session.userId!;
		const repos = props.openRepos.map(repo => {
			const id = repo.id || "";
			return { ...repo, name: state.repos[id] ? state.repos[id].name : "" };
		});

		const queries = preferences.pullRequestQueries || DEFAULT_QUERIES;

		// FIXME hardcoded github
		const hasPRSupportedRepos = repos.filter(r => r.providerGuess === "github").length > 0;

		const prSupportedProviders = providerSelectors.getSupportedPullRequestHosts(state);
		const prConnectedProviders = prSupportedProviders.filter(_ => isConnected(state, { id: _.id }));

		return {
			queries,
			teamTagsHash: userSelectors.getTeamTagsHash(state),
			repos,
			currentUserId,
			isPRSupportedCodeHostConnected: prConnectedProviders.length > 0,
			hasPRSupportedRepos,
			openReposOnly: !preferences.pullRequestQueryShowAllRepos,
			showLabels: !preferences.pullRequestQueryHideLabels,
			PRSupportedProviders: prSupportedProviders,
			PRConnectedProviders: prConnectedProviders
		};
	});

	const { queries } = derivedState;

	const [loadFromUrlQuery, setLoadFromUrlQuery] = React.useState("");
	const [loadFromUrlOpen, setLoadFromUrlOpen] = React.useState(false);
	const [loadFromUrlError, setLoadFromUrlError] = React.useState("");

	const [pullRequestGroups, setPullRequestGroups] = React.useState<{
		[providerId: string]: GetMyPullRequestsResponse[][];
	}>({});
	const [isLoadingPRs, setIsLoadingPRs] = React.useState(false);
	const [isLoadingPRGroup, setIsLoadingPRGroup] = React.useState<number | undefined>(undefined);
	const [editingQuery, setEditingQuery] = React.useState<
		{ providerId: string; index: number } | undefined
	>(undefined);
	const [configureQuerySettings, setConfigureQuerySettings] = React.useState(false);
	const previousConfigureQuerySettings = usePrevious(configureQuerySettings);

	const setQueries = (providerId, queries) => {
		dispatch(setUserPreference(["pullRequestQueries", providerId], [...queries]));
		// dispatch(setUserPreference(["pullRequestQueries"], null));
	};

	useEffect(() => {
		const disposable = HostApi.instance.on(DidChangeDataNotificationType, (e: any) => {
			if (e.type === ChangeDataType.PullRequests) {
				fetchPRs(queries);
			}
		});
		return () => {
			disposable.dispose();
		};
	});

	useEffect(() => {
		// if previously we were editing... and now we're not fetch the PRs...
		if (previousConfigureQuerySettings && !configureQuerySettings) {
			fetchPRs(derivedState.queries, { force: true });
		}
	}, [derivedState.openReposOnly, derivedState.showLabels]);

	const fetchPRs = useCallback(
		async (theQueries, options?: { force?: boolean }) => {
			setIsLoadingPRs(true);
			let count: number | undefined = undefined;
			try {
				const newGroups = {};
				console.warn("Loading the PRs...", theQueries);
				for (const connectedProvider of derivedState.PRConnectedProviders) {
					const queriesByProvider: PullRequestQuery[] =
						theQueries[connectedProvider.id] || DEFAULT_QUERIES[connectedProvider.id];
					const queryStrings = Object.values(queriesByProvider).map(_ => _.query);
					console.warn("Loading the PRs... in the loop", queryStrings);
					try {
						const response: any = await dispatch(
							getMyPullRequests(
								connectedProvider.id,
								queryStrings,
								derivedState.openReposOnly,
								options,
								true
							)
						);
						if (response && response.length) {
							count = 0;
							response.forEach(group => (count += group.length));

							console.warn("GOT SOME PULLS BACK: ", response);
							newGroups[connectedProvider.id] = response;
						}
					} catch (ex) {
						console.error(ex);
					}
				}
				console.warn("SETTING TO: ", newGroups);
				setPullRequestGroups(newGroups);
			} catch (ex) {
				console.error(ex);
				// if (ex && ex.indexOf('"message":"Bad credentials"') > -1) {
				// 	// show message about re-authing?
				// }
			} finally {
				setIsLoadingPRs(false);

				HostApi.instance.track("PR List Rendered", {
					"List State": count === undefined ? "No Auth" : count > 0 ? "PRs Listed" : "No PRs",
					"PR Count": count,
					Host: derivedState.PRConnectedProviders
						? derivedState.PRConnectedProviders.map(_ => _.id)[0]
						: undefined
				});
			}
		},
		[
			editingQuery,
			configureQuerySettings,
			derivedState.PRConnectedProviders,
			derivedState.openReposOnly
		]
	);

	useMemo(() => {
		if (derivedState.isPRSupportedCodeHostConnected) {
			fetchPRs(queries);
		}
	}, [derivedState.isPRSupportedCodeHostConnected]);

	const addQuery = () => editQuery("", -1);
	const editQuery = (providerId: string, index: number) => {
		setEditingQuery({ providerId, index });
	};
	const reloadQuery = async (providerId, index) => {
		setIsLoadingPRGroup(index);
		try {
			const q = queries[providerId][index];
			const response: any = await dispatch(
				getMyPullRequests(providerId, [q.query], derivedState.openReposOnly, { force: true }, true)
			);
			if (response && response.length) {
				const newGroups = { ...pullRequestGroups };
				newGroups[providerId][index] = response[0];
				setPullRequestGroups(newGroups);
			}
		} catch (ex) {
			console.error(ex);
			// if (ex && ex.indexOf('"message":"Bad credentials"') > -1) {
			// 	// show message about re-authing?
			// }
		} finally {
			setIsLoadingPRGroup(undefined);
		}
	};

	const deleteQuery = (providerId, index) => {
		confirmPopup({
			title: "Are you sure?",
			message: "Do you want to delete this query?" + index,
			centered: true,
			buttons: [
				{ label: "Go Back", className: "control-button" },
				{
					label: "Delete Query",
					className: "delete",
					action: async () => {
						const newQueries = [...queries[providerId]];
						newQueries.splice(index, 1);
						setQueries(providerId, newQueries);
						const newGroups = [...pullRequestGroups[providerId]];
						newGroups.splice(index, 1);
						setPullRequestGroups({ ...pullRequestGroups, providerId: newGroups });
					}
				}
			]
		});
	};
	const toggleQueryHidden = (e, providerId, index) => {
		if (e.target.closest(".actions")) return;
		const newQueries = [...queries[providerId]];
		newQueries[index].hidden = !newQueries[index].hidden;
		setQueries(providerId, newQueries);
	};

	const save = (providerId: string, name: string, query: string) => {
		// FIXME hard-coded github
		const newQuery = {
			providerId,
			name,
			query,
			hidden: false
		};
		let queriesByProvider = queries[providerId];
		let newQueries = queriesByProvider ? [...queriesByProvider] : [];

		if (editingQuery && editingQuery.index !== undefined && editingQuery.index > -1) {
			// it's an edit
			newQueries[editingQuery.index] = newQuery;
		} else {
			// it's new
			newQueries = [...newQueries, newQuery];
		}
		setQueries(providerId, newQueries);
		setEditingQuery(undefined);
		fetchPRs({ ...queries, [providerId]: newQueries }, { force: true });
	};

	const goPR = async (url: string) => {
		setLoadFromUrlError("");
		const response = (await dispatch(openPullRequestByUrl(url))) as { error?: string };
		if (response && response.error) {
			setLoadFromUrlError(response.error);
			const er = document.getElementById("error-row");
			er && er.scrollIntoView({ behavior: "smooth" });
		}
	};

	useEffect(() => {
		if (!loadFromUrlOpen) {
			setLoadFromUrlError("");
		}
	}, [loadFromUrlOpen]);

	const totalPRs = useMemo(() => {
		let total = 0;
		Object.values(pullRequestGroups).forEach(group =>
			group.forEach(list => (total += list.length))
		);
		return total;
	}, [pullRequestGroups]);

	if (!derivedState.isPRSupportedCodeHostConnected && !derivedState.hasPRSupportedRepos)
		return null;

	return (
		<Root>
			{editingQuery && (
				<ConfigurePullRequestQuery
					query={
						editingQuery.providerId
							? queries[editingQuery.providerId][editingQuery.index]
							: undefined
					}
					save={save}
					onClose={() => setEditingQuery(undefined)}
					openReposOnly={derivedState.openReposOnly}
					prConnectedProviders={derivedState.PRConnectedProviders}
				/>
			)}
			{configureQuerySettings && (
				<ConfigurePullRequestQuerySettings onClose={() => setConfigureQuerySettings(false)} />
			)}
			{(derivedState.isPRSupportedCodeHostConnected || derivedState.hasPRSupportedRepos) && (
				<>
					<PaneHeader
						title="Pull Requests"
						id={WebviewPanels.OpenPullRequests}
						isLoading={isLoadingPRs}
						count={totalPRs}
					>
						<Icon
							onClick={() => fetchPRs(queries, { force: true })}
							name="refresh"
							className={`spinnable ${isLoadingPRs ? "spin" : ""}`}
							title="Refresh"
							placement="bottom"
							delay={1}
						/>
						<Icon onClick={addQuery} name="plus" title="Add Query" placement="bottom" delay={1} />
						<Icon
							onClick={() => setConfigureQuerySettings(true)}
							name="gear"
							title="Configure"
							placement="bottom"
							delay={1}
						/>
					</PaneHeader>
					{props.state !== PaneState.Collapsed && (
						<PaneBody>
							{derivedState.hasPRSupportedRepos && !derivedState.isPRSupportedCodeHostConnected && (
								<>
									<NoContent>Connect to GitHub to see your PRs</NoContent>
									<IntegrationButtons noBorder>
										{derivedState.PRSupportedProviders.map(provider => {
											const providerDisplay = PROVIDER_MAPPINGS[provider.name];
											if (providerDisplay) {
												return (
													<Provider
														key={provider.id}
														onClick={() =>
															dispatch(configureAndConnectProvider(provider.id, "Sidebar"))
														}
													>
														<Icon name={providerDisplay.icon} />
														{providerDisplay.displayName}
													</Provider>
												);
											} else return null;
										})}
									</IntegrationButtons>
								</>
							)}
							{derivedState.PRConnectedProviders.map(connectedProvider => {
								const providerId = connectedProvider.id;
								const providerQueries: PullRequestQuery[] =
									queries[providerId] || DEFAULT_QUERIES[connectedProvider.id];
								return Object.values(providerQueries).map((query: PullRequestQuery, index) => {
									const providerGroups = pullRequestGroups[providerId];
									const prGroup = providerGroups && providerGroups[index];
									const count = prGroup ? prGroup.length : 0;
									return (
										<PaneNode key={index}>
											<PaneNodeName
												onClick={e => toggleQueryHidden(e, providerId, index)}
												title={query.name}
												collapsed={query.hidden}
												count={count}
												isLoading={isLoadingPRs || index === isLoadingPRGroup}
											>
												<Icon
													title="Reload Query"
													delay={0.5}
													placement="bottom"
													name="refresh"
													className="clickable"
													onClick={() => reloadQuery(providerId, index)}
												/>
												<Icon
													title="Edit Query"
													delay={0.5}
													placement="bottom"
													name="pencil"
													className="clickable"
													onClick={() => editQuery(providerId, index)}
												/>
												<Icon
													title="Delete Query"
													delay={0.5}
													placement="bottom"
													name="trash"
													className="clickable"
													onClick={() => deleteQuery(providerId, index)}
												/>
											</PaneNodeName>
											{!query.hidden &&
												prGroup &&
												prGroup.map((pr, index) => {
													const selected = derivedState.repos.find(repo => {
														return (
															repo.currentBranch === pr.headRefName &&
															pr.headRepository &&
															repo.name === pr.headRepository.name
														);
													});
													return (
														<Tooltip
															key={"pr-tt-" + pr.id + index}
															title={<PullRequestTooltip pr={pr} />}
															delay={1}
															placement="top"
														>
															<Row
																key={"pr-" + pr.id}
																className={selected ? "pr-row selected" : "pr-row"}
																onClick={() => {
																	dispatch(setCurrentPullRequest(pr.providerId, pr.id));

																	HostApi.instance.track("PR Clicked", {
																		Host: pr.providerId
																	});
																}}
															>
																<div>
																	{selected && (
																		<Icon name="arrow-right" className="selected-icon" />
																	)}
																	<PRHeadshot person={pr.author} />
																</div>
																<div>
																	<span>
																		{pr.title} #{pr.number}
																	</span>
																	{pr.labels &&
																		pr.labels.nodes.length > 0 &&
																		derivedState.showLabels && (
																			<span className="cs-tag-container">
																				{pr.labels.nodes.map((_, index) => (
																					<Tag
																						key={index}
																						tag={{ label: _.name, color: `#${_.color}` }}
																					/>
																				))}
																			</span>
																		)}
																	<span className="subtle">{pr.bodyText || pr.body}</span>
																</div>
																<div className="icons">
																	<span
																		onClick={e => {
																			e.preventDefault();
																			e.stopPropagation();
																			HostApi.instance.send(OpenUrlRequestType, {
																				url: pr.url
																			});
																		}}
																	>
																		<Icon
																			name="globe"
																			className="clickable"
																			title="View on GitHub"
																			placement="bottomLeft"
																			delay={1}
																		/>
																	</span>
																	<Icon
																		name="review"
																		className="clickable"
																		title="Review Changes"
																		placement="bottomLeft"
																		delay={1}
																	/>
																	<Timestamp time={pr.createdAt} relative abbreviated />
																</div>
															</Row>
														</Tooltip>
													);
												})}
										</PaneNode>
									);
								});
							})}

							{derivedState.isPRSupportedCodeHostConnected && (
								<>
									<Row
										key="load"
										className={loadFromUrlOpen ? "no-hover" : ""}
										onClick={() => {
											setLoadFromUrlOpen(true);
											document.getElementById("pr-search-input")!.focus();
										}}
									>
										<div>
											<Icon name="link" />
										</div>
										<div>
											<input
												id="pr-search-input"
												placeholder="Load PR from URL"
												type="text"
												style={{ background: "transparent", width: "100%" }}
												value={loadFromUrlQuery}
												onChange={e => setLoadFromUrlQuery(e.target.value)}
												onKeyDown={e => {
													if (e.key == "Escape") {
														setLoadFromUrlQuery("");
													}
													if (e.key == "Enter") {
														goPR(loadFromUrlQuery);
													}
												}}
												onBlur={e => setLoadFromUrlOpen(false)}
											/>
										</div>
										{(loadFromUrlQuery || loadFromUrlOpen) && (
											<div className="go-pr">
												<Button
													className="go-pr"
													size="compact"
													onClick={() => goPR(loadFromUrlQuery)}
												>
													Go
												</Button>
											</div>
										)}
									</Row>
									{loadFromUrlError && (
										<Row id="error-row" key="url-error" className={"no-hover"}>
											<div>
												<Icon name="alert" />
											</div>
											<div title={loadFromUrlError}>{loadFromUrlError}</div>
										</Row>
									)}
								</>
							)}
						</PaneBody>
					)}
				</>
			)}
		</Root>
	);
}
