import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { isEqual } from "lodash-es";
import * as providerSelectors from "../store/providers/reducer";
import { CodeStreamState } from "../store";
import { Row } from "./CrossPostIssueControls/IssueDropdown";
import Icon from "./Icon";
import { PRHeadshot } from "../src/components/Headshot";
import {
	setCreatePullRequest,
	setCurrentPullRequest,
	setNewPostEntry
} from "../store/context/actions";
import Tooltip from "./Tooltip";
import Timestamp from "./Timestamp";
import { HostApi } from "../webview-api";
import {
	ReposScm,
	GetMyPullRequestsResponse,
	DidChangeDataNotificationType,
	ChangeDataType,
	FetchProviderDefaultPullRequestsType,
	ThirdPartyProviderConfig,
	UpdateTeamSettingsRequestType
} from "@codestream/protocols/agent";
import {
	NewPullRequestNotificationType,
	OpenUrlRequestType,
	WebviewPanels
} from "@codestream/protocols/webview";
import { Button } from "../src/components/Button";
import { getMyPullRequests, openPullRequestByUrl } from "../store/providerPullRequests/actions";
import { PRBranch } from "./PullRequestComponents";
import { PRHeadshotName } from "../src/components/HeadshotName";
import styled from "styled-components";
import Tag from "./Tag";
import { setUserPreference, openPanel } from "./actions";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";
import { confirmPopup } from "./Confirm";
import { ConfigurePullRequestQuery } from "./ConfigurePullRequestQuery";
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
import { useDidMount, usePrevious } from "../utilities/hooks";
import { getMyPullRequests as getMyPullRequestsSelector } from "../store/providerPullRequests/reducer";
import { InlineMenu } from "../src/components/controls/InlineMenu";
import { getPRLabel } from "../store/providers/reducer";

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

export const PullRequestIcon = (props: { pr: GetMyPullRequestsResponse }) => {
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

	return <Icon name={statusIcon} className={`${color}-color`} style={{ marginRight: "5px" }} />;
};

interface Props {
	openRepos: ReposScm[];
	paneState: PaneState;
}

const EMPTY_HASH = {} as any;
const EMPTY_HASH_2 = {} as any;

let hasRenderedOnce = false;
const e: ThirdPartyProviderConfig[] = [];

export const OpenPullRequests = React.memo((props: Props) => {
	const dispatch = useDispatch();
	const mountedRef = useRef(false);
	const derivedState = useSelector((state: CodeStreamState) => {
		const { preferences, repos } = state;

		const team = state.teams[state.context.currentTeamId];
		const teamSettings = team.settings ? team.settings : EMPTY_HASH;
		const adminIds = team.adminIds || [];
		const isCurrentUserAdmin = adminIds.includes(state.session.userId!);

		const prSupportedProviders = providerSelectors
			.getSupportedPullRequestHosts(state)
			.filter(
				provider => !teamSettings.limitCodeHost || teamSettings.codeHostProviders[provider.id]
			);
		const prConnectedProviders = providerSelectors.getConnectedSupportedPullRequestHosts(state);
		const prConnectedProvidersWithErrors = prConnectedProviders.filter(_ => _.hasAccessTokenError);
		const prConnectedProvidersLength = prConnectedProviders.length;
		const myPullRequests = getMyPullRequestsSelector(state);
		return {
			repos,
			teamSettings,
			teamId: team.id,
			isCurrentUserAdmin,
			pullRequestQueries: state.preferences.pullRequestQueries,
			myPullRequests,
			isPRSupportedCodeHostConnected: prConnectedProvidersLength > 0,
			PRSupportedProviders: prSupportedProviders,
			PRConnectedProviders: prConnectedProviders,
			PRConnectedProvidersCount: prConnectedProvidersLength,
			GitLabConnectedProviders: providerSelectors.getConnectedGitLabHosts(state),
			PRConnectedProvidersWithErrors: prConnectedProvidersWithErrors,
			PRConnectedProvidersWithErrorsCount: prConnectedProvidersWithErrors.length,
			allRepos:
				preferences.pullRequestQueryShowAllRepos == null
					? true
					: preferences.pullRequestQueryShowAllRepos,
			hideLabels: preferences.pullRequestQueryHideLabels,
			hideDescriptions: preferences.pullRequestQueryHideDescriptions,
			prLabel: getPRLabel(state),
			pullRequestProviderHidden: preferences.pullRequestProviderHidden || EMPTY_HASH_2
		};
	}, shallowEqual);

	const openReposWithName = props.openRepos.map(repo => {
		const id = repo.id || "";
		return { ...repo, name: derivedState.repos[id] ? derivedState.repos[id].name : "" };
	});

	// FIXME hardcoded github
	const hasPRSupportedRepos =
		openReposWithName.filter(r => r.providerGuess === "github" || r.providerGuess === "gitlab")
			.length > 0;
	// console.log(hasPRSupportedRepos, openReposWithName);

	const { PRConnectedProviders, pullRequestProviderHidden, prLabel } = derivedState;
	const [queries, setQueries] = React.useState({});
	const [defaultQueries, setDefaultQueries] = React.useState({});
	const [loadFromUrlQuery, setLoadFromUrlQuery] = React.useState({});
	const [loadFromUrlOpen, setLoadFromUrlOpen] = React.useState("");
	const [prError, setPrError] = React.useState("");

	const [pullRequestGroups, setPullRequestGroups] = React.useState<{
		[providerId: string]: GetMyPullRequestsResponse[][];
	}>({});

	const [isLoadingPRs, setIsLoadingPRs] = React.useState(false);
	const [isLoadingPRGroup, setIsLoadingPRGroup] = React.useState<number | undefined>(undefined);
	const [editingQuery, setEditingQuery] = React.useState<
		{ providerId: string; index: number } | undefined
	>(undefined);
	const previousPRConnectedProvidersWithErrorsCount = usePrevious<number>(
		derivedState.PRConnectedProvidersWithErrorsCount
	);
	const previousPRConnectedProvidersCount = usePrevious<number>(
		derivedState.PRConnectedProvidersCount
	);

	const saveQueries = (providerId, queries) => {
		dispatch(setUserPreference(["pullRequestQueries", providerId], [...queries]));
	};

	const fetchPRs = useCallback(
		async (
			theQueries,
			options?: { force?: boolean; alreadyLoading?: boolean },
			src: string | undefined = undefined
		) => {
			if (!options || options.alreadyLoading !== true) {
				setIsLoadingPRs(true);
			}

			let count: number | undefined = undefined;
			let activePrListedCount = 0;
			let activePrListedIndex: number | undefined = undefined;
			try {
				const newGroups = {};
				setPrError("");
				// console.warn("Loading the PRs...", theQueries);
				for (const connectedProvider of PRConnectedProviders) {
					const queriesByProvider: PullRequestQuery[] =
						theQueries[connectedProvider.id] || defaultQueries[connectedProvider.id];
					const queryStrings = Object.values(queriesByProvider).map(_ => _.query);
					activePrListedIndex = queriesByProvider.findIndex(
						_ => _?.name === "Waiting on my Review"
					);
					// console.warn("Loading the PRs... in the loop", queryStrings);
					try {
						const response: any = await dispatch(
							getMyPullRequests(
								connectedProvider.id,
								queryStrings,
								!derivedState.allRepos,
								options,
								true
							)
						);
						if (response && response.length) {
							count = 0;
							response.forEach(group => (count += group.length));

							const twoWeekAgoTimestamp = +new Date(Date.now() - 12096e5);
							if (activePrListedIndex >= 0) {
								activePrListedCount = response[activePrListedIndex].filter(
									activePr => activePr.createdAt > twoWeekAgoTimestamp
								).length;
							}
							// console.warn("GOT SOME PULLS BACK: ", response);
							newGroups[connectedProvider.id] = response;
						}
					} catch (ex) {
						setPrError(typeof ex === "string" ? ex : ex.message);
						console.error(ex);
					}
				}
				setPullRequestGroups(newGroups);
			} catch (ex) {
				console.error(ex);
				setPrError(typeof ex === "string" ? ex : ex.message);
				// if (ex && ex.indexOf('"message":"Bad credentials"') > -1) {
				// 	// show message about re-authing?
				// }
			} finally {
				setIsLoadingPRs(false);

				if (!hasRenderedOnce) {
					HostApi.instance.track("PR List Rendered", {
						"List State":
							count === undefined
								? "No Auth"
								: count > 0
								? activePrListedCount > 0
									? "Active PRs Listed"
									: "PRs Listed"
								: "No PRs",
						"PR Count": count,
						Host: PRConnectedProviders ? PRConnectedProviders.map(_ => _.id)[0] : undefined
					});
					hasRenderedOnce = true;
				}
			}
		},
		[defaultQueries, editingQuery, PRConnectedProviders, derivedState.allRepos]
	);

	useEffect(() => {
		const disposable = HostApi.instance.on(DidChangeDataNotificationType, (e: any) => {
			if (e.type === ChangeDataType.PullRequests) {
				console.warn("OpenPullRequests: ChangeDataType.PullRequests", e);
				setIsLoadingPRs(true);
				setTimeout(() => {
					// kind of a hack to ensure that the provider's search api
					// has all the latest data after a PR is merged/opened/closed
					fetchPRs(queries, { force: true, alreadyLoading: true }, "dataChanged");
				}, 4000);
			}
		});
		return () => {
			disposable.dispose();
		};
	}, [queries]);

	useEffect(() => {
		const disposable = setInterval(() => {
			fetchPRs(queries, { force: true, alreadyLoading: true }, "interval");
		}, 300000); // every 5 minutes

		return () => {
			clearInterval(disposable);
		};
	}, [queries]);

	useEffect(() => {
		const newGroups = {};
		for (const connectedProvider of PRConnectedProviders) {
			if (derivedState.myPullRequests && derivedState.myPullRequests[connectedProvider.id]) {
				newGroups[connectedProvider.id] = derivedState.myPullRequests[connectedProvider.id].data;
			}
		}
		setPullRequestGroups(newGroups);
	}, [derivedState.myPullRequests]);

	useEffect(() => {
		if (!mountedRef.current) return;
		const newQueries = {
			...defaultQueries,
			...(derivedState.pullRequestQueries || {})
		};
		// need to check if it was new/editing pullRequestQueries or just updating other preferences
		if (!isEqual(queries, newQueries)) {
			setQueries(newQueries);
		}
	}, [derivedState.pullRequestQueries]);

	useDidMount(() => {
		(async () => {
			const defaultQueriesResponse: any = (await HostApi.instance.send(
				FetchProviderDefaultPullRequestsType,
				{}
			)) as any;
			if (defaultQueriesResponse) {
				// Update default queries for users in a non-destructive way
				if (derivedState.pullRequestQueries) {
					Object.keys(derivedState.pullRequestQueries).forEach(provider => {
						// Little shimmy to update old gitlab default filters to our new syntax
						let shouldUpdate = false;
						derivedState.pullRequestQueries![provider].forEach((query, index) => {
							if (provider === "gitlab*com" || provider === "gitlab/enterprise") {
								if (
									query.name === "Waiting on my Review" &&
									query.query === "state:opened reviewer_username:@me"
								) {
									derivedState.pullRequestQueries![provider][index].query =
										"state=opened&reviewer_username=@me&scope=all";
									shouldUpdate = true;
								}
								if (
									query.name === "Assigned to Me" &&
									query.query === "state:opened scope:assigned_to_me"
								) {
									derivedState.pullRequestQueries![provider][index].query =
										"state=opened&scope=assigned_to_me";
									shouldUpdate = true;
								}
								if (
									query.name === "Created by Me" &&
									query.query === "state:opened scope:created_by_me"
								) {
									derivedState.pullRequestQueries![provider][index].query =
										"state=opened&scope=created_by_me";
									shouldUpdate = true;
								}
								if (query.name === "Recent" && query.query === "recent") {
									derivedState.pullRequestQueries![provider][index].query =
										"scope=created_by_me&per_page=5";
									shouldUpdate = true;
								}
							}
						});
						if (shouldUpdate) {
							saveQueries(provider, derivedState.pullRequestQueries![provider]);
						}
					});
				}

				const queries = {
					...defaultQueriesResponse,
					...(derivedState.pullRequestQueries || {})
				};
				// let results = {};
				// // massage the data for any old data formats
				// Object.keys(queries || {}).forEach(p => {
				// 	results[p] = [];
				// 	Object.values(queries[p] || {}).forEach(_ => {
				// 		results[p].push(_);
				// 	});
				// });
				setQueries(queries);
				setDefaultQueries(defaultQueriesResponse);
				fetchPRs(queries, undefined, "useDidMount").then(_ => {
					mountedRef.current = true;
				});
			}
		})();
	});

	useMemo(() => {
		if (!mountedRef.current) return;
		if (
			previousPRConnectedProvidersCount != null &&
			previousPRConnectedProvidersCount + 1 === derivedState.PRConnectedProvidersCount
		) {
			fetchPRs(queries, { force: true }, "PRConnectedProvidersLength");
		}
	}, [queries, derivedState.PRConnectedProvidersCount]);

	useEffect(() => {
		if (!mountedRef.current) return;
		fetchPRs(queries, { force: true }, "allRepos");
	}, [queries, derivedState.allRepos]);

	useEffect(() => {
		if (!mountedRef.current) return;
		if (
			previousPRConnectedProvidersWithErrorsCount != null &&
			previousPRConnectedProvidersWithErrorsCount - 1 ===
				derivedState.PRConnectedProvidersWithErrorsCount
		) {
			fetchPRs(queries, { force: true }, "previousPRConnectedProvidersWithErrorsCount");
		}
	}, [queries, derivedState.PRConnectedProvidersWithErrorsCount]);

	const addQuery = () => editQuery("", -1);
	const editQuery = (providerId: string, index: number) => {
		setEditingQuery({ providerId, index });
	};
	const reloadQuery = async (providerId, index) => {
		setIsLoadingPRGroup(index);
		try {
			const q = queries[providerId][index];
			const response: any = await dispatch(
				getMyPullRequests(providerId, [q.query], !derivedState.allRepos, { force: true }, true)
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
			message: "Do you want to delete this query?",
			centered: true,
			buttons: [
				{ label: "Go Back", className: "control-button" },
				{
					label: "Delete Query",
					className: "delete",
					action: async () => {
						const newQueries = [...queries[providerId]];
						newQueries.splice(index, 1);
						saveQueries(providerId, newQueries);
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
		const providerQueries = queries[providerId] || defaultQueries[providerId];
		const newQueries = [...providerQueries];
		newQueries[index].hidden = !newQueries[index].hidden;
		saveQueries(providerId, newQueries);
	};

	const toggleProviderHidden = (e, providerId) => {
		dispatch(
			setUserPreference(
				["pullRequestProviderHidden", providerId],
				!pullRequestProviderHidden[providerId]
			)
		);
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
		saveQueries(providerId, newQueries);
		setEditingQuery(undefined);
		fetchPRs({ ...queries, [providerId]: newQueries }, { force: true }, "save");
	};

	const goPR = async (url: string, providerId: string) => {
		setPrError("");
		const response = (await dispatch(openPullRequestByUrl(url))) as { error?: string };

		// fix https://trello.com/c/Gp0lsDub/4874-loading-pr-from-url-leaves-the-url-populated
		setLoadFromUrlQuery({ ...loadFromUrlQuery, [providerId]: "" });

		if (response && response.error) {
			setPrError(response.error);
			const er = document.getElementById("error-row");
			er && er.scrollIntoView({ behavior: "smooth" });
		}
	};

	useEffect(() => {
		if (!loadFromUrlOpen) {
			setPrError("");
		}
	}, [loadFromUrlOpen]);

	const totalPRs = useMemo(() => {
		let total = 0;
		Object.values(pullRequestGroups).forEach(group =>
			group.forEach(list => (total += list.length))
		);
		return total;
	}, [pullRequestGroups]);

	const settingsMenuItems = [
		{
			label: "Only show PRs from open repos",
			key: "repo-only",
			checked: !derivedState.allRepos,
			action: () =>
				dispatch(setUserPreference(["pullRequestQueryShowAllRepos"], !derivedState.allRepos))
		},
		{
			label: "Show Descriptions",
			key: "show-descriptions",
			checked: !derivedState.hideDescriptions,
			action: () =>
				dispatch(
					setUserPreference(["pullRequestQueryHideDescriptions"], !derivedState.hideDescriptions)
				)
		},
		{
			label: "Show Labels",
			key: "show-labels",
			checked: !derivedState.hideLabels,
			action: () =>
				dispatch(setUserPreference(["pullRequestQueryHideLabels"], !derivedState.hideLabels))
		}
	] as any;
	if (derivedState.isCurrentUserAdmin) {
		if (derivedState.GitLabConnectedProviders.length > 0) {
			settingsMenuItems.push({ label: "-" });
			settingsMenuItems.push({
				checked: derivedState.teamSettings.gitLabMultipleAssignees || false,
				label: "Allow Multiple Assignees & Reviewers",
				subtext: "Requires paid GitLab account",
				key: "multiple",
				action: () => {
					HostApi.instance.send(UpdateTeamSettingsRequestType, {
						teamId: derivedState.teamId,
						settings: {
							gitLabMultipleAssignees: !derivedState.teamSettings.gitLabMultipleAssignees
						}
					});
				}
			});
		}
	}

	if (!derivedState.isPRSupportedCodeHostConnected && !hasPRSupportedRepos) return null;
	if (!queries || Object.keys(queries).length === 0) return null;

	const renderQueryGroup = providerId => {
		const providerQueries: PullRequestQuery[] = queries[providerId] || defaultQueries[providerId];

		return (
			<>
				{derivedState.isPRSupportedCodeHostConnected && (
					<>
						<Row
							key="load"
							className={loadFromUrlOpen === providerId ? "no-hover pr-search" : "pr-search"}
							onClick={() => {
								setLoadFromUrlOpen(providerId);
								document.getElementById(`pr-search-input-${providerId}`)!.focus();
							}}
						>
							<div style={{ paddingRight: 0 }}>
								<Icon name="chevron-right-thin" style={{ margin: "0 2px 0 -2px" }} />
							</div>
							<div id="pr-search-input-wrapper">
								<input
									id={`pr-search-input-${providerId}`}
									className="pr-search-input"
									placeholder={`Load ${prLabel.PR} from URL`}
									type="text"
									style={{ background: "transparent", width: "100%" }}
									value={loadFromUrlQuery[providerId]}
									onChange={e =>
										setLoadFromUrlQuery({ ...loadFromUrlQuery, [providerId]: e.target.value })
									}
									onKeyDown={e => {
										if (e.key == "Escape") {
											setLoadFromUrlQuery({ ...loadFromUrlQuery, [providerId]: "" });
										}
										if (e.key == "Enter") {
											goPR(loadFromUrlQuery[providerId], providerId);
										}
									}}
									onBlur={e => setLoadFromUrlOpen("")}
								/>
							</div>
							{(loadFromUrlQuery[providerId] || loadFromUrlOpen === providerId) && (
								<div className="go-pr">
									<Button
										className="go-pr"
										size="compact"
										onClick={() => goPR(loadFromUrlQuery[providerId], providerId)}
									>
										Go
									</Button>
								</div>
							)}
						</Row>
						{prError && (
							<Row id="error-row" key="pr-error" className={"no-hover wrap"}>
								<div>
									<Icon name="alert" />
								</div>
								<div title={prError}>{prError}</div>
							</Row>
						)}
					</>
				)}
				{Object.values(providerQueries).map((query: PullRequestQuery, index) => {
					const providerGroups = pullRequestGroups[providerId];
					const prGroup = providerGroups && providerGroups[index];
					const count = prGroup ? prGroup.length : 0;
					return (
						<PaneNode key={index}>
							<PaneNodeName
								onClick={e => toggleQueryHidden(e, providerId, index)}
								title={query?.name || "Unnamed"}
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
								prGroup.map((pr: any, index) => {
									if (providerId === "github*com" || providerId === "github/enterprise") {
										const selected = openReposWithName.find(repo => {
											return (
												repo.currentBranch === pr.headRefName &&
												pr.headRepository &&
												repo?.name === pr.headRepository?.name
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
														{selected && <Icon name="arrow-right" className="selected-icon" />}
														<PRHeadshot person={pr.author} />
													</div>
													<div>
														<span>
															#{pr.number} {pr.title}
														</span>
														{pr.labels &&
															pr.labels.nodes &&
															pr.labels.nodes.length > 0 &&
															!derivedState.hideLabels && (
																<span className="cs-tag-container">
																	{pr.labels.nodes.map((_, index) => (
																		<Tag
																			key={index}
																			tag={{ label: _?.name, color: `#${_?.color}` }}
																		/>
																	))}
																</span>
															)}
														{!derivedState.hideDescriptions && (
															<span className="subtle">{pr.bodyText || pr.body}</span>
														)}
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
									} else if (providerId === "gitlab*com" || providerId === "gitlab/enterprise") {
										const selected = false;
										// const selected = openReposWithName.find(repo => {
										// 	return (
										// 		repo.currentBranch === pr.headRefName &&
										// 		pr.headRepository &&
										// 		repo.name === pr.headRepository.name
										// 	);
										// });
										return (
											<Row
												key={"pr-" + pr.base_id}
												className={selected ? "pr-row selected" : "pr-row"}
												onClick={() => {
													dispatch(setCurrentPullRequest(pr.providerId, pr.id));

													HostApi.instance.track("PR Clicked", {
														Host: pr.providerId
													});
												}}
											>
												<div>
													{selected && <Icon name="arrow-right" className="selected-icon" />}
													<PRHeadshot
														person={{
															login: pr.author.login,
															avatarUrl: pr.author.avatar_url
														}}
													/>
												</div>
												<div>
													<span>
														!{pr.number} {pr.title}
													</span>
													{pr.labels &&
														pr.labels &&
														pr.labels.length > 0 &&
														!derivedState.hideLabels && (
															<span className="cs-tag-container">
																{pr.labels.map((_, index) => (
																	<Tag key={index} tag={{ label: _?.name, color: `${_?.color}` }} />
																))}
															</span>
														)}
													{!derivedState.hideDescriptions && (
														<span className="subtle">{pr.description}</span>
													)}
												</div>
												<div className="icons">
													<span
														onClick={e => {
															e.preventDefault();
															e.stopPropagation();
															HostApi.instance.send(OpenUrlRequestType, {
																url: pr.web_url
															});
														}}
													>
														<Icon
															name="globe"
															className="clickable"
															title="View on GitLab"
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
													<Timestamp time={pr.created_at} relative abbreviated />
													{pr.user_notes_count > 0 && (
														<span
															className="badge"
															style={{ margin: "0 0 0 10px", flexGrow: 0, flexShrink: 0 }}
														>
															{pr.user_notes_count}
														</span>
													)}
												</div>
											</Row>
										);
									} else return undefined;
								})}
						</PaneNode>
					);
				})}
			</>
		);
	};

	const renderDisplayHost = host => {
		return host.startsWith("http://")
			? host.split("http://")[1]
			: host.startsWith("https://")
			? host.split("https://")[1]
			: host;
	};

	// console.warn("rendering pr list...");
	// console.warn("CONNECT: ", PRConnectedProviders);
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
					openReposOnly={!derivedState.allRepos}
					prConnectedProviders={PRConnectedProviders}
				/>
			)}
			{(derivedState.isPRSupportedCodeHostConnected || hasPRSupportedRepos) && (
				<>
					<PaneHeader
						title={prLabel.PullRequests + (prLabel.PullRequests.includes("erge") ? " (BETA)" : "")}
						id={WebviewPanels.OpenPullRequests}
						isLoading={isLoadingPRs}
						count={totalPRs}
					>
						{derivedState.isPRSupportedCodeHostConnected && (
							<Icon
								onClick={() => fetchPRs(queries, { force: true }, "refresh")}
								name="refresh"
								className={`spinnable ${isLoadingPRs ? "spin" : ""}`}
								title="Refresh"
								placement="bottom"
								delay={1}
							/>
						)}
						<Icon
							onClick={() => {
								dispatch(setCreatePullRequest());
								dispatch(setNewPostEntry("Status"));
								dispatch(openPanel(WebviewPanels.NewPullRequest));
							}}
							name="plus"
							title={`New ${prLabel.PullRequest}`}
							placement="bottom"
							delay={1}
						/>
						{derivedState.isPRSupportedCodeHostConnected && (
							<Icon
								onClick={addQuery}
								name="filter"
								title="Add Query"
								placement="bottom"
								delay={1}
							/>
						)}
						<InlineMenu
							key="settings-menu"
							className="subtle no-padding"
							noFocusOnSelect
							noChevronDown
							items={settingsMenuItems}
						>
							<Icon name="gear" title="Settings" placement="bottom" delay={1} />
						</InlineMenu>
					</PaneHeader>
					{props.paneState !== PaneState.Collapsed && (
						<PaneBody>
							{hasPRSupportedRepos && !derivedState.isPRSupportedCodeHostConnected && (
								<>
									<NoContent>Connect to GitHub or GitLab to see your PRs</NoContent>
									<IntegrationButtons noBorder>
										{derivedState.PRSupportedProviders.map(provider => {
											if (!provider) return null;
											const providerDisplay = PROVIDER_MAPPINGS[provider.name];
											if (providerDisplay) {
												return (
													<Provider
														key={provider.id}
														onClick={() =>
															dispatch(configureAndConnectProvider(provider.id, "PRs Section"))
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
							{PRConnectedProviders.length > 1
								? PRConnectedProviders.map((provider, index) => {
										const providerId = provider.id;
										const display = PROVIDER_MAPPINGS[provider.name];
										const displayName = provider.isEnterprise
											? `${display.displayName} - ${renderDisplayHost(provider.host)}`
											: display.displayName;
										const collapsed = pullRequestProviderHidden[providerId];
										return (
											<PaneNode key={index}>
												<PaneNodeName
													onClick={e => toggleProviderHidden(e, providerId)}
													title={displayName}
													collapsed={collapsed}
													count={0}
													isLoading={isLoadingPRs || index === isLoadingPRGroup}
												></PaneNodeName>
												{!collapsed && renderQueryGroup(provider.id)}
											</PaneNode>
										);
								  })
								: PRConnectedProviders.map(provider => renderQueryGroup(provider.id))}
						</PaneBody>
					)}
				</>
			)}
		</Root>
	);
});
