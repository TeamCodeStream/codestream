import {
	ChangeDataType,
	DidChangeDataNotificationType,
	FetchProviderDefaultPullRequestsType,
	FetchProviderDefaultPullResponse,
	FetchThirdPartyPullRequestPullRequest,
	FetchThirdPartyPullRequestResponse,
	GetMyPullRequestsResponse,
	GetReposScmRequestType,
	GitLabMergeRequest,
	ReposScm,
	SwitchBranchRequestType,
	UpdateTeamSettingsRequestType,
	RemoteType,
} from "@codestream/protocols/agent";
import { PullRequestQuery } from "@codestream/protocols/api";
import copy from "copy-to-clipboard";
import { isEmpty, isEqual } from "lodash-es";
import React, { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { shallowEqual } from "react-redux";
import styled from "styled-components";

import { OpenUrlRequestType, ReviewCloseDiffRequestType } from "@codestream/protocols/webview";
import { WebviewPanels } from "@codestream/webview/ipc/webview.protocol.common";
import { setPaneMaximized } from "@codestream/webview/Stream/actions";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { disposePoll, fluctuatePoll } from "@codestream/webview/utils";
import { logError } from "../logger";
import { Button } from "../src/components/Button";
import { InlineMenu } from "../src/components/controls/InlineMenu";
import { PRHeadshot } from "../src/components/Headshot";
import { PRHeadshotName } from "../src/components/HeadshotName";
import {
	NoContent,
	PaneBody,
	PaneHeader,
	PaneNode,
	PaneNodeName,
	PaneState,
} from "../src/components/Pane";
import { CodeStreamState } from "../store";
import {
	clearCurrentPullRequest,
	setCreatePullRequest,
	setCurrentPullRequest,
	setNewPostEntry,
} from "../store/context/actions";
import {
	getCurrentProviderPullRequest,
	getMyPullRequests as getMyPullRequestsSelector,
	getPullRequestExactId,
	getPullRequestId,
	removePullRequest,
} from "../store/providerPullRequests/slice";
import {
	getMyPullRequests,
	getPullRequestConversationsFromProvider,
	openPullRequestByUrl,
	PRRequest,
} from "../store/providerPullRequests/thunks";
import { configureAndConnectProvider } from "../store/providers/actions";
import * as providerSelectors from "../store/providers/reducer";
import { getPRLabel } from "../store/providers/reducer";
import { useDidMount, usePrevious } from "../utilities/hooks";
import { HostApi } from "../webview-api";
import { openPanel, setUserPreference } from "./actions";
import { ConfigurePullRequestQuery } from "./ConfigurePullRequestQuery";
import { confirmPopup } from "./Confirm";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";
import Icon from "./Icon";
import { IntegrationButtons, Provider } from "./IntegrationsPanel";
import { PRBranch } from "./PullRequestComponents";
import { PullRequestExpandedSidebar } from "./PullRequestExpandedSidebar";
import Tag from "./Tag";
import Timestamp from "./Timestamp";

const Root = styled.div`
	height: 100%;
	.pr-row {
		padding-left: 30px;
		.selected-icon {
			left: 20px;
		}
	}
	${PaneNode} ${PaneNode} {
		${PaneNodeName} {
			padding-left: 30px;
		}
		.pr-row {
			padding-left: 35px;
			.selected-icon {
				left: 40px;
			}
		}
		.files-changed-list-dropdown {
			padding-left: 45px;
		}
		.files-changed-list .row-with-icon-actions {
			padding-left: 100px;
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
		padding-left: 30px;
	}
	div.go-pr {
		padding: 0;
		margin-left: auto;
		button {
			margin-top: 0px;
		}
	}
	.files-changed-list-dropdown {
		padding-left: 45px;
	}
	.files-changed-list .row-with-icon-actions {
		padding-left: 80px;
	}
`;

const PrErrorText = styled.small`
	display: block;
	padding-left: 16px;
`;

interface ReposScmPlusName extends ReposScm {
	name: string;
}

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
					borderTop: "1px solid rgba(0, 0, 0, 0.1)",
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

let hasRenderedOnce = false;

export const OpenPullRequests = React.memo((props: Props) => {
	const dispatch = useAppDispatch();
	const mountedRef = useRef(false);
	const prFromUrlInput = useRef<HTMLInputElement>(null);
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { preferences, repos, context } = state;

		const team = state.teams[state.context.currentTeamId];
		const teamSettings = team.settings;
		const adminIds = team.adminIds || [];
		const isCurrentUserAdmin = adminIds.includes(state.session.userId!);

		const prSupportedProviders = providerSelectors
			.getSupportedPullRequestHosts(state)
			.filter(
				provider => !teamSettings?.limitCodeHost || teamSettings?.codeHostProviders?.[provider.id]
			);
		const prConnectedProviders = providerSelectors.getConnectedSupportedPullRequestHosts(state);
		const prConnectedProvidersWithErrors = prConnectedProviders.filter(_ => _.hasAccessTokenError);
		const prConnectedProvidersLength = prConnectedProviders.length;
		const myPullRequests = getMyPullRequestsSelector(state);
		const expandedPullRequestId =
			context.currentPullRequest &&
			context.currentPullRequest.view === "sidebar-diffs" &&
			context.currentPullRequest.id;
		const currentPullRequest = getCurrentProviderPullRequest(state);
		const expandedPullRequestGroupIndex = context.currentPullRequest?.groupIndex;
		const panePreferences = preferences.sidebarPanes || {};
		const settings = panePreferences["open-pull-requests"] || {};
		return {
			repos,
			teamSettings,
			teamId: team.id,
			isCurrentUserAdmin,
			pullRequestQueries: state.preferences.pullRequestQueries,
			reviewsStateBootstrapped: state.reviews.bootstrapped,
			myPullRequests,
			// Currently always showing, regardless of provider, might be reverted in future
			isPRSupportedCodeHostConnected: prConnectedProvidersLength > 0,
			// isPRSupportedCodeHostConnected: true,
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
			hideDiffs: preferences.pullRequestQueryHideDiffs,
			hideDescriptions: preferences.pullRequestQueryHideDescriptions,
			prLabel: getPRLabel(state),
			pullRequestProviderHidden: preferences.pullRequestProviderHidden || {},
			expandedPullRequestId,
			currentPullRequestProviderId: state.context.currentPullRequest
				? state.context.currentPullRequest.providerId
				: undefined,
			currentPullRequestCommentId: state.context.currentPullRequest
				? state.context.currentPullRequest.commentId
				: undefined,
			currentPullRequestSource: state.context.currentPullRequest
				? state.context.currentPullRequest.source
				: undefined,
			currentPullRequest: currentPullRequest,
			expandedPullRequestGroupIndex,
			currentPullRequestFromContext: context.currentPullRequest,
			providerPullRequests: state.providerPullRequests.pullRequests,
			currentPullRequestId: getPullRequestId(state),
			currentPullRequestIdExact: getPullRequestExactId(state),
			reposState: state.repos,
			maximized: settings.maximized,
		};
	}, shallowEqual);

	const { PRConnectedProviders, pullRequestProviderHidden, prLabel } = derivedState;
	const [queries, setQueries] = React.useState<FetchProviderDefaultPullResponse>({});
	const [defaultQueries, setDefaultQueries] = React.useState<FetchProviderDefaultPullResponse>({});
	const [loadFromUrlQuery, setLoadFromUrlQuery] = React.useState({});
	const [loadFromUrlOpen, setLoadFromUrlOpen] = React.useState("");
	const [prError, setPrError] = useReducer(
		(state, action: { provider: string; error?: string }) => ({
			...state,
			[action.provider]: action.error,
		}),
		{}
	);
	const [prCommitsRange, setPrCommitsRange] = React.useState<string[]>([]);
	const [openRepos, setOpenRepos] = React.useState<ReposScmPlusName[]>([]);
	const [currentGroupIndex, setCurrentGroupIndex] = React.useState();
	const [prFromUrlLoading, setPrFromUrlLoading] = React.useState(false);
	const [prFromUrl, setPrFromUrl] = React.useState<
		FetchThirdPartyPullRequestPullRequest | GitLabMergeRequest | undefined
	>();
	const [prFromUrlProviderId, setPrFromUrlProviderId] = React.useState<string | undefined>();

	const [isLoadingPRs, setIsLoadingPRs] = useReducer(
		(state, action: { provider: string; isLoading: boolean }) => {
			if (action.provider === "*") return {};
			return {
				...state,
				[action.provider]: action.isLoading,
			};
		},
		{}
	);
	const [isLoadingPRGroup, setIsLoadingPRGroup] = React.useState<number | undefined>(undefined);
	const [individualLoadingPR, setIndividualLoadingPR] = React.useState("");

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
		dispatch(
			setUserPreference({ prefPath: ["pullRequestQueries", providerId], value: [...queries] })
		);
	};

	const fetchPRs = useCallback(
		async (
			theQueries: FetchProviderDefaultPullResponse,
			options?: { force?: boolean; alreadyLoading?: boolean },
			src: string | undefined = undefined
		) => {
			let count: number | undefined = undefined;
			let activePrListedCount = 0;
			let activePrListedIndex: number | undefined = undefined;
			try {
				// console.warn("Loading the PRs...", theQueries);
				for (const connectedProvider of PRConnectedProviders) {
					setIsLoadingPRs({ provider: connectedProvider.id, isLoading: true });
					setPrError({ provider: connectedProvider.id });
					if (connectedProvider.id?.includes("bitbucket")) continue;

					const queriesByProvider: PullRequestQuery[] =
						theQueries[connectedProvider.id] || defaultQueries[connectedProvider.id];
					if (!queriesByProvider) {
						continue;
					}

					activePrListedIndex = queriesByProvider?.findIndex(
						_ => _?.name === "Waiting on my Review"
					);
					// console.warn("Loading the PRs... in the loop", queryStrings);
					try {
						const prRequest: PRRequest = {
							providerId: connectedProvider.id,
							queries: queriesByProvider,
							openReposOnly: !derivedState.allRepos,
							options,
							throwOnError: true,
						};
						const response = await dispatch(getMyPullRequests(prRequest)).unwrap();
						if (response && response.length) {
							count = 0;
							response.forEach(group => (count! += group.length));

							const twoWeekAgoTimestamp = +new Date(Date.now() - 12096e5);
							if (activePrListedIndex >= 0) {
								activePrListedCount = response[activePrListedIndex].filter(
									activePr => activePr.createdAt > twoWeekAgoTimestamp
								).length;
							}
							// Previously called setPullRequestGroups(updatedPullRequestGroups);
							// But derivedState.myPullRequests updates automatically when getMyPullRequests called
						}
					} catch (ex) {
						setPrError({
							provider: connectedProvider.id,
							error: typeof ex === "string" ? ex : ex.message,
						});
						console.error(ex);
					} finally {
						setIsLoadingPRs({ provider: connectedProvider.id, isLoading: false });
					}
				}
			} catch (ex) {
				console.error(ex);
				setPrError(typeof ex === "string" ? ex : ex.message);
				// if (ex && ex.indexOf('"message":"Bad credentials"') > -1) {
				// 	// show message about re-authing?
				// }
			} finally {
				setIsLoadingPRs({ provider: "*", isLoading: false });

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
						Host: PRConnectedProviders ? PRConnectedProviders.map(_ => _.id)[0] : undefined,
					});
					hasRenderedOnce = true;
				}
			}
		},
		[
			defaultQueries,
			editingQuery,
			PRConnectedProviders,
			derivedState.allRepos,
			derivedState.myPullRequests,
		]
	);

	useEffect(() => {
		if (props.paneState === PaneState.Open) {
			fetchPRs(queries, { force: true, alreadyLoading: true }, "panelOpened");
		}
	}, [props.paneState]);

	useEffect(() => {
		const disposable = HostApi.instance.on(DidChangeDataNotificationType, (e: any) => {
			if (e.type === ChangeDataType.PullRequests) {
				console.warn("OpenPullRequests: ChangeDataType.PullRequests", e);
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

	/* 
   TODO Fix this effect disposing / recreating every run of fetchPRs 
   received notification codestream/didChangeData from host on user object
   which triggers PRConnectedProviders / getConnectedSupportedPullRequestHosts selector
   with no changed data
   */
	useEffect(() => {
		const disposable = fluctuatePoll(() => {
			fetchPRs(queries, { force: true, alreadyLoading: true }, "interval");
		}, 60000); // every 1 minute

		return () => {
			disposePoll(disposable);
		};
	}, [queries, fetchPRs]);

	useEffect(() => {
		HostApi.instance.send(ReviewCloseDiffRequestType, {});
	}, [derivedState.expandedPullRequestId]);

	useEffect(() => {
		if (!mountedRef.current) return;
		const newQueries: FetchProviderDefaultPullResponse = {
			...defaultQueries,
			...(derivedState.pullRequestQueries || {}),
		};
		// need to check if it was new/editing pullRequestQueries or just updating other preferences
		if (!isEqual(queries, newQueries)) {
			setQueries(newQueries);
		}
	}, [derivedState.pullRequestQueries]);

	useDidMount(() => {
		(async () => {
			const defaultQueriesResponse: FetchProviderDefaultPullResponse = await HostApi.instance.send(
				FetchProviderDefaultPullRequestsType,
				{}
			);
			if (defaultQueriesResponse) {
				// Update default queries for users in a non-destructive way
				if (derivedState.pullRequestQueries) {
					patchQueries(defaultQueriesResponse, derivedState.pullRequestQueries, saveQueries);
				}

				const queries = {
					...defaultQueriesResponse,
					...(derivedState.pullRequestQueries || {}),
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
				getOpenRepos();
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
	const reloadQuery = async (providerId: string, index: number) => {
		setIsLoadingPRGroup(index);
		try {
			const q = queries[providerId][index];
			await dispatch(
				getMyPullRequests({
					providerId,
					queries: [q],
					openReposOnly: !derivedState.allRepos,
					options: { force: true },
					throwOnError: true,
					test: false,
					index: index,
				})
			).unwrap();
			// No longer calling set`PullRequestGroups - updatePullRequestFilter action already does this
		} catch (ex) {
			console.error(ex);
			// if (ex && ex.indexOf('"message":"Bad credentials"') > -1) {
			// 	// show message about re-authing?
			// }
		} finally {
			setIsLoadingPRGroup(undefined);
		}
	};

	const deleteQuery = (providerId: string, index: number) => {
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
						// Delete of PR query result by index
						dispatch(removePullRequest({ providerId, index }));
					},
				},
			],
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
			setUserPreference({
				prefPath: ["pullRequestProviderHidden", providerId],
				value: !pullRequestProviderHidden[providerId],
			})
		);
	};

	const save = (providerId: string, name: string, query: string) => {
		// FIXME hard-coded github
		const newQuery = {
			providerId,
			name,
			query,
			hidden: false,
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

	// user loads PR/MR from URL
	const goPR = async (url: string, providerId: string) => {
		setPrError({ provider: providerId });
		setPrFromUrlProviderId(providerId);
		setPrFromUrlLoading(true);
		const response = (await dispatch(
			openPullRequestByUrl({
				url,
				options: { providerId, groupIndex: "-1" },
			})
		)) as {
			error?: string;
		};
		// fix https://trello.com/c/Gp0lsDub/4874-loading-pr-from-url-leaves-the-url-populated
		setLoadFromUrlQuery({ ...loadFromUrlQuery, [providerId]: "" });

		prFromUrlInput?.current?.blur();

		HostApi.instance.track("PR Load from URL", {
			Host: providerId,
		});

		if (response && response.error) {
			setPrFromUrlLoading(false);
			setPrError({ provider: providerId, error: response.error });
		}
	};

	useEffect(() => {
		if (
			derivedState.expandedPullRequestGroupIndex === "-1" &&
			derivedState.currentPullRequestFromContext?.providerId &&
			derivedState.currentPullRequestFromContext?.id
		) {
			fetchOnePR(
				derivedState.currentPullRequestFromContext?.providerId,
				derivedState.currentPullRequestFromContext?.id
			);
		}
	}, [derivedState.expandedPullRequestGroupIndex, derivedState.currentPullRequestFromContext]);

	// Handle case where user opens PR from toast notifcation.
	useEffect(() => {
		if (!expandedPR && !individualLoadingPR && derivedState.currentPullRequestProviderId) {
			fetchOnePR(derivedState.currentPullRequestProviderId, derivedState.currentPullRequestId);
		}
	}, [derivedState.currentPullRequestId]);

	const totalPRs = useMemo(() => {
		let total = 0;
		const myPullRequests = derivedState.myPullRequests;
		if (myPullRequests) {
			Object.values(myPullRequests)?.forEach(group =>
				group.forEach(list => (total += list.length))
			);
		}
		return total;
	}, [derivedState.myPullRequests]);

	const clickPR = (pr, groupIndex, queryName) => {
		if (!derivedState.maximized) {
			dispatch(setPaneMaximized("open-pull-requests", !derivedState.maximized));
		}

		// if we have an expanded PR diffs in the sidebar, collapse it
		if (pr.id === derivedState.expandedPullRequestId) {
			dispatch(clearCurrentPullRequest());
		} else {
			// otherwise, either open the PR details or show the diffs,
			// depending on the user's preference
			if (pr?.providerId && pr?.id) {
				const view = derivedState.hideDiffs ? "details" : "sidebar-diffs";
				let prId;
				if (
					pr.providerId === "gitlab*com" ||
					pr.providerId === "gitlab/enterprise" ||
					pr.providerId === "bitbucket*org"
				) {
					prId = pr.idComputed || pr.id;
				} else {
					prId = pr.id;
				}

				dispatch(setCurrentPullRequest(pr.providerId, prId, "", "", view, groupIndex));
				setCurrentGroupIndex(groupIndex);
				fetchOnePR(pr.providerId, prId);

				const nonCustomQueries = [
					"Waiting on my Review",
					"Assigned to Me",
					"Created by Me",
					"Recent",
					"From URL",
				];
				let telemetryQueryName = queryName;
				if (!nonCustomQueries.includes(queryName)) {
					telemetryQueryName = "Custom";
				}

				HostApi.instance.track("PR Clicked", {
					Host: pr.providerId,
					Section: telemetryQueryName || "",
				});
			}
		}
	};

	const fetchOnePR = async (providerId: string, pullRequestId: string) => {
		if (providerId && pullRequestId) {
			//GL ids can be a stringified object, order of parameters can fluctuate.  So a
			//simple string comparison is not sufficent, we have to convert to an object if possible
			//and extract the id param.  For everything else that is not GL, we just use the standard pr.id
			let prId = expandedPrIdObject(pullRequestId);
			setIndividualLoadingPR(prId);
			await dispatch(getPullRequestConversationsFromProvider({ providerId, id: pullRequestId }));
			setIndividualLoadingPR("");
		}
	};

	const parseRawUrlFromRemote = (remotes: RemoteType[]) => {
		return remotes?.map(_ => {
			if (!_?.rawUrl) return;
			const lastDotIndex = _.rawUrl?.lastIndexOf(".");
			let rawUrlWithoutDot: string;
			if (lastDotIndex === -1) {
				rawUrlWithoutDot = _.rawUrl || "";
			} else {
				rawUrlWithoutDot = _.rawUrl?.substring(0, lastDotIndex) || "";
			}
			const splitRawUrlWithoutDot = rawUrlWithoutDot.split("/");
			return splitRawUrlWithoutDot[splitRawUrlWithoutDot.length - 1];
		});
	};

	const getCurrentRepo = pr => {
		return openRepos.find(_ => {
			const nameFromPr = pr.headRepository?.name?.toLowerCase();
			if (!nameFromPr) return false;
			let nameFoundInPrToCheckout: string | undefined;
			if (_?.remotes && !isEmpty(_?.remotes)) {
				const parsedRemoteNamesFromRawUrl = parseRawUrlFromRemote(_.remotes).filter(Boolean);
				nameFoundInPrToCheckout =
					parsedRemoteNamesFromRawUrl?.find(_ => _ === nameFromPr) || undefined;
			}
			return (
				_?.name?.toLowerCase() === nameFromPr ||
				_?.folder?.name?.toLowerCase() === nameFromPr ||
				!isEmpty(nameFoundInPrToCheckout)
			);
		});
	};

	const checkout = async (event, prToCheckout, cantCheckoutReason) => {
		event.preventDefault();
		event.stopPropagation();
		if (!prToCheckout || cantCheckoutReason) return;

		const currentRepo = getCurrentRepo(prToCheckout);

		const repoId = currentRepo?.id || "";
		const result = await HostApi.instance.send(SwitchBranchRequestType, {
			branch: prToCheckout!.headRefName,
			repoId: repoId,
		});
		if (result.error) {
			logError(result.error, {
				branch: prToCheckout.headRefName,
				repoId: repoId,
				prRepository: prToCheckout!.repository,
			});

			confirmPopup({
				title: "Git Error",
				className: "wide",
				message: (
					<div className="monospace" style={{ fontSize: "11px" }}>
						{result.error}
					</div>
				),
				centered: false,
				buttons: [{ label: "OK", className: "control-button" }],
			});
		} else {
			getOpenRepos();
		}
	};

	const expandedPrIdObject = str => {
		try {
			return JSON.parse(str).id;
		} catch (e) {
			return str;
		}
	};

	const cantCheckoutReason = prToCheckout => {
		if (prToCheckout) {
			const currentRepo = getCurrentRepo(prToCheckout);

			if (!currentRepo) {
				return `You don't have the ${prToCheckout.headRepository?.name} repo open in your IDE`;
			}

			if (currentRepo.currentBranch == prToCheckout.headRefName) {
				return `You are on the ${prToCheckout.headRefName} branch`;
			}

			// branch is in a fork
			const isFork =
				prToCheckout.headRepository?.isFork ||
				!prToCheckout.url.includes(prToCheckout.headRepository?.nameWithOwner);

			if (isFork) {
				const headRepositoryLabel =
					prToCheckout.headRepository?.nameWithOwner ??
					`${prToCheckout.headRepositoryOwner?.login}/${prToCheckout.headRepository?.name}`;
				return `The source branch for this PR is located on the ${headRepositoryLabel} fork`;
			}

			return "";
		} else {
			return "PR not loaded";
		}

		// if (pr) {
		// 	const currentRepo = openRepos.find(
		// 		_ => _?.name?.toLowerCase() === pr.repository?.name?.toLowerCase()
		// 	);
		// 	if (!currentRepo) {
		// 		return `You don't have the ${pr.repository?.name} repo open in your IDE`;
		// 	}
		// 	if (currentRepo.currentBranch == pr.headRefName) {
		// 		return `You are on the ${pr.headRefName} branch`;
		// 	}
		// 	return "";
		// } else {
		// 	return "PR not loaded";
		// }
	};

	/**
	 * This is called when a user clicks the "reload" button.
	 * with a "hard-reload" we need to refresh the conversation and file data
	 * @param event
	 * @param message
	 */
	const reload = async (e, pr) => {
		e.stopPropagation();
		fetchOnePR(pr.providerId!, pr.idComputed || pr.id);
	};

	const handleClickCopy = (e, prUrl) => {
		e.stopPropagation();
		e.preventDefault();
		copy(prUrl);
	};

	const getOpenRepos = async () => {
		const { reposState } = derivedState;
		const response = await HostApi.instance.send(GetReposScmRequestType, {
			inEditorOnly: true,
			includeCurrentBranches: true,
			includeRemotes: true,
		});
		if (response && response.repositories) {
			const repos = response.repositories.map(repo => {
				const id = repo.id || "";
				return { ...repo, name: reposState[id] ? reposState[id].name : "" };
			});
			setOpenRepos(repos);
		}
	};

	const renderPrGroup = (providerId, pr, index, groupIndex, queryName) => {
		let prId, expandedPrId;

		if ((pr?.base_id || pr?.idComputed) && derivedState.expandedPullRequestId) {
			if (pr?.base_id) {
				prId = pr.base_id;
			}
			if (pr?.idComputed) {
				prId = expandedPrIdObject(pr?.idComputed);
			}
			expandedPrId = expandedPrIdObject(derivedState.expandedPullRequestId);
		} else {
			prId = pr.id;
			expandedPrId = derivedState.expandedPullRequestId;
		}

		const expanded =
			prId == expandedPrId &&
			(derivedState.expandedPullRequestGroupIndex === groupIndex ||
				currentGroupIndex === groupIndex ||
				// -2 value is from toast notification since there is no way to tell what group index
				// it is in.  On -2 group index we ignore matching and just set expanded
				// @TODO: handle edge case where PR from toast notification is in multiple
				// query results that are expanded
				derivedState.expandedPullRequestGroupIndex === "-2");

		const isLoadingPR = prId === individualLoadingPR;
		const chevronIcon = derivedState.hideDiffs ? null : expanded ? (
			<Icon name="chevron-down-thin" style={{ marginRight: "2px" }} />
		) : (
			<Icon name="chevron-right-thin" style={{ marginRight: "2px" }} />
		);

		if (providerId === "github*com" || providerId === "github/enterprise") {
			const selected = openRepos.find(repo => {
				return (
					repo.currentBranch === pr.headRefName &&
					pr.headRepository &&
					repo?.name === pr.headRepository?.name
				);
			});
			return (
				<>
					<Row
						key={`pr_${prId}_${groupIndex}_${providerId}`}
						className={selected ? "pr-row selected" : "pr-row"}
						onClick={() => clickPR(pr, groupIndex, queryName)}
					>
						<div style={{ display: "flex" }}>
							{chevronIcon}
							{pr.author && <PRHeadshot person={pr.author} />}
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
											<Tag key={index} tag={{ label: _?.name, color: `#${_?.color}` }} />
										))}
									</span>
								)}
						</div>
						<div className="icons">
							<span
								onClick={e => {
									e.preventDefault();
									e.stopPropagation();
									HostApi.instance.send(OpenUrlRequestType, {
										url: pr.url,
									});
								}}
							>
								<Icon
									name="link-external"
									className="clickable"
									title="View on GitHub"
									placement="bottomLeft"
									delay={1}
								/>
							</span>
							<Icon
								title="Copy"
								placement="bottom"
								name="copy"
								className="clickable"
								onClick={e => handleClickCopy(e, pr.url)}
								delay={1}
							/>

							<span className={cantCheckoutReason(pr) ? "disabled" : ""}>
								<Icon
									title={
										<>
											Checkout Branch
											{cantCheckoutReason(pr) && (
												<div className="subtle smaller" style={{ maxWidth: "200px" }}>
													Disabled: {cantCheckoutReason(pr)}
												</div>
											)}
										</>
									}
									trigger={["hover"]}
									onClick={e => checkout(e, pr, cantCheckoutReason(pr))}
									placement="bottom"
									name="git-branch"
									delay={1}
									className="clickable"
								/>
							</span>
							<span>
								<Icon
									title="Reload"
									trigger={["hover"]}
									delay={1}
									onClick={e => {
										if (isLoadingPR) {
											console.warn("reloading pr, cancelling...");
											return;
										}
										reload(e, pr);
									}}
									placement="bottom"
									className={`${isLoadingPR ? "spin" : ""}`}
									name="refresh"
								/>
							</span>
							{groupIndex === "-1" && (
								<Icon
									title="Remove"
									placement="bottom"
									name="x"
									className="clickable"
									onClick={e => {
										e.preventDefault();
										e.stopPropagation();
										setPrFromUrl(undefined);
									}}
									delay={1}
								/>
							)}
							<Timestamp time={pr.createdAt} relative abbreviated />
						</div>
					</Row>
					{expanded && (
						<PullRequestExpandedSidebar
							key={`pr_detail_row_${index}`}
							pullRequest={pr}
							thirdPartyPrObject={expandedPR}
							loadingThirdPartyPrObject={isLoadingPR}
							fetchOnePR={fetchOnePR}
							prCommitsRange={prCommitsRange}
							setPrCommitsRange={setPrCommitsRange}
						/>
					)}
				</>
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
				<>
					<Row
						key={`pr_${prId}_${groupIndex}_${providerId}`}
						className={selected ? "pr-row selected" : "pr-row"}
						onClick={() => clickPR(pr, groupIndex, queryName)}
					>
						<div style={{ display: "flex" }}>
							{" "}
							{chevronIcon}
							<PRHeadshot
								person={{
									login: pr.author.login,
									avatarUrl: pr.author.avatar_url || pr.author.avatarUrl,
								}}
							/>
						</div>
						<div>
							<span>
								!{pr.number} {pr.title}
							</span>
							{pr.labels && pr.labels && pr.labels.length > 0 && !derivedState.hideLabels && (
								<span className="cs-tag-container">
									{pr.labels.map((_, index) => (
										<Tag key={index} tag={{ label: _?.name, color: `${_?.color}` }} />
									))}
								</span>
							)}
							{!derivedState.hideDescriptions && <span className="subtle">{pr.description}</span>}
						</div>
						<div className="icons">
							<span
								onClick={e => {
									e.preventDefault();
									e.stopPropagation();
									HostApi.instance.send(OpenUrlRequestType, {
										url: pr.web_url,
									});
								}}
							>
								<Icon
									name="link-external"
									className="clickable"
									title="View on Gitlab"
									placement="bottomLeft"
									delay={1}
								/>
							</span>
							<Icon
								title="Copy"
								placement="bottom"
								name="copy"
								className="clickable"
								onClick={e => handleClickCopy(e, pr.web_url)}
								delay={1}
							/>
							<span>
								<Icon
									title="Reload"
									trigger={["hover"]}
									delay={1}
									onClick={e => {
										if (isLoadingPR) {
											console.warn("reloading pr, cancelling...");
											return;
										}
										reload(e, pr);
									}}
									placement="bottom"
									className={`${isLoadingPR ? "spin" : ""}`}
									name="refresh"
								/>
							</span>
							{groupIndex === "-1" && (
								<Icon
									title="Remove"
									placement="bottom"
									name="x"
									className="clickable"
									onClick={e => {
										e.preventDefault();
										e.stopPropagation();
										setPrFromUrl(undefined);
									}}
									delay={1}
								/>
							)}
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
					{expanded && (
						<PullRequestExpandedSidebar
							key={`pr_detail_row_${prId}_${groupIndex}_${providerId}`}
							pullRequest={pr}
							thirdPartyPrObject={expandedPR}
							loadingThirdPartyPrObject={isLoadingPR}
							fetchOnePR={fetchOnePR}
							prCommitsRange={prCommitsRange}
							setPrCommitsRange={setPrCommitsRange}
						/>
					)}
				</>
			);
		} else if (providerId === "bitbucket*org") {
			const selected = openRepos.find(repo => {
				return (
					repo.currentBranch === pr.headRefName &&
					pr.headRepository &&
					repo?.name === pr.headRepository?.name
				);
			});
			return (
				<>
					<Row
						key={`pr_${prId}_${groupIndex}_${providerId}`}
						className={selected ? "pr-row selected" : "pr-row"}
						onClick={e => {
							clickPR(pr, groupIndex, queryName);
						}}
					>
						<div style={{ display: "flex" }}>
							{chevronIcon}
							{pr.author && <PRHeadshot person={pr.author} />}
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
											<Tag key={index} tag={{ label: _?.name, color: `#${_?.color}` }} />
										))}
									</span>
								)}
						</div>
						<div className="icons">
							<span
								onClick={e => {
									e.preventDefault();
									e.stopPropagation();
									HostApi.instance.send(OpenUrlRequestType, {
										url: pr.url,
									});
								}}
							>
								<Icon
									name="link-external"
									className="clickable"
									title="View on Bitbucket"
									placement="bottomLeft"
									delay={1}
								/>
							</span>
							<Icon
								title="Copy"
								placement="bottom"
								name="copy"
								className="clickable"
								onClick={e => handleClickCopy(e, pr.url)}
								delay={1}
							/>

							<span className={cantCheckoutReason(pr) ? "disabled" : ""}>
								<Icon
									title={
										<>
											Checkout Branch
											{cantCheckoutReason(pr) && (
												<div className="subtle smaller" style={{ maxWidth: "200px" }}>
													Disabled: {cantCheckoutReason(pr)}
												</div>
											)}
										</>
									}
									trigger={["hover"]}
									onClick={e => checkout(e, pr, cantCheckoutReason(pr))}
									placement="bottom"
									name="git-branch"
									delay={1}
									className="clickable"
								/>
							</span>
							<span>
								<Icon
									title="Reload"
									trigger={["hover"]}
									delay={1}
									onClick={e => {
										if (isLoadingPR) {
											console.warn("reloading pr, cancelling...");
											return;
										}
										reload(e, pr);
									}}
									placement="bottom"
									className={`${isLoadingPR ? "spin" : ""}`}
									name="refresh"
								/>
							</span>
							{groupIndex === "-1" && (
								<Icon
									title="Remove"
									placement="bottom"
									name="x"
									className="clickable"
									onClick={e => {
										e.preventDefault();
										e.stopPropagation();
										setPrFromUrl(undefined);
									}}
									delay={1}
								/>
							)}
							<Timestamp time={pr.createdAt} relative abbreviated />
						</div>
					</Row>
					{expanded && (
						<PullRequestExpandedSidebar
							key={`pr_detail_row_${index}`}
							pullRequest={pr}
							thirdPartyPrObject={expandedPR}
							loadingThirdPartyPrObject={isLoadingPR}
							fetchOnePR={fetchOnePR}
							prCommitsRange={prCommitsRange}
							setPrCommitsRange={setPrCommitsRange}
						/>
					)}
				</>
			);
		} else {
			return undefined;
		}
	};

	useEffect(() => {
		const providerPullRequests =
			derivedState.providerPullRequests[derivedState.currentPullRequestProviderId!];
		if (providerPullRequests) {
			let data = providerPullRequests[derivedState.currentPullRequestIdExact!];
			if (data) {
				return;
			}
		}

		if (
			!providerPullRequests &&
			derivedState.currentPullRequestProviderId! &&
			derivedState.currentPullRequestId
		) {
			fetchOnePR(derivedState.currentPullRequestProviderId!, derivedState.currentPullRequestId);
			console.warn(`could not find match for idExact=${derivedState.currentPullRequestIdExact}`);
		}
	}, [
		derivedState.currentPullRequestProviderId,
		derivedState.currentPullRequestIdExact,
		derivedState.providerPullRequests,
	]);

	const expandedPR = useMemo(() => {
		if (!derivedState.currentPullRequest || derivedState.hideDiffs) {
			return undefined;
		}
		const conversations: FetchThirdPartyPullRequestResponse | undefined =
			derivedState.currentPullRequest.conversations;
		if (!conversations) {
			return undefined;
		}
		if (conversations.project && conversations.project.mergeRequest) {
			if (derivedState.expandedPullRequestGroupIndex === "-1") {
				setPrFromUrl(conversations.project.mergeRequest);
				setPrFromUrlLoading(false);
			}

			return conversations.project.mergeRequest;
		}

		if (conversations.repository && conversations.repository.pullRequest) {
			if (derivedState.expandedPullRequestGroupIndex === "-1") {
				setPrFromUrl(conversations.repository.pullRequest);
				setPrFromUrlLoading(false);
			}
			return conversations.repository.pullRequest;
		}

		return undefined;
	}, [derivedState.currentPullRequest, derivedState.hideDiffs]);

	const settingsMenuItems = [
		{
			label: "Only show PRs from open repos",
			key: "repo-only",
			checked: !derivedState.allRepos,
			action: () =>
				dispatch(
					setUserPreference({
						prefPath: ["pullRequestQueryShowAllRepos"],
						value: !derivedState.allRepos,
					})
				),
		},
		{
			label: "Show Descriptions",
			key: "show-descriptions",
			checked: !derivedState.hideDescriptions,
			action: () =>
				dispatch(
					setUserPreference({
						prefPath: ["pullRequestQueryHideDescriptions"],
						value: !derivedState.hideDescriptions,
					})
				),
		},
		{
			label: "Show Labels",
			key: "show-labels",
			checked: !derivedState.hideLabels,
			action: () =>
				dispatch(
					setUserPreference({
						prefPath: ["pullRequestQueryHideLabels"],
						value: !derivedState.hideLabels,
					})
				),
		},
		// Not using this for now
		// {
		// 	label: "Show Diffs in Sidebar",
		// 	key: "show-diffs",
		// 	checked: !derivedState.hideDiffs,
		// 	action: () =>
		// 		dispatch(setUserPreference({ prefPath: ["pullRequestQueryHideDiffs"], value: !derivedState.hideDiffs }))
		// }
	] as any;
	if (derivedState.isCurrentUserAdmin) {
		if (derivedState.GitLabConnectedProviders.length > 0) {
			settingsMenuItems.push({ label: "-" });
			settingsMenuItems.push({
				checked: derivedState.teamSettings?.gitLabMultipleAssignees ?? false,
				label: "Allow Multiple Assignees & Reviewers",
				subtext: "Requires paid GitLab account",
				key: "multiple",
				action: () => {
					HostApi.instance.send(UpdateTeamSettingsRequestType, {
						teamId: derivedState.teamId,
						settings: {
							gitLabMultipleAssignees: !derivedState.teamSettings?.gitLabMultipleAssignees,
						},
					});
				},
			});
		}
	}

	// if (!derivedState.isPRSupportedCodeHostConnected && !hasPRSupportedRepos) return null;
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
									ref={prFromUrlInput}
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
											(e.target as HTMLInputElement).blur();
											goPR(loadFromUrlQuery[providerId], providerId);
										}
									}}
									onBlur={e => {
										setLoadFromUrlOpen("");
										setPrError({ provider: providerId });
									}}
								/>
							</div>
							{(loadFromUrlQuery[providerId] || loadFromUrlOpen === providerId) && (
								<div className="go-pr">
									<Button
										className="go-pr"
										size="compact"
										onClick={e => {
											prFromUrlInput?.current?.blur();
											goPR(loadFromUrlQuery[providerId], providerId);
										}}
									>
										Go
									</Button>
								</div>
							)}
						</Row>
						{prError[providerId] && (
							<Row
								style={{
									display: "block",
									paddingRight: "8px",
								}}
								id="error-row"
								key="pr-error"
								className={"no-hover wrap error-message"}
							>
								<PrErrorText title={prError[providerId]}>{prError[providerId]}</PrErrorText>
							</Row>
						)}
						{prFromUrlLoading && prFromUrlProviderId === providerId && (
							<div style={{ marginLeft: "30px" }}>
								<Icon className={"spin"} name="refresh" /> Loading...
							</div>
						)}
						{!isEmpty(prFromUrl) && !prFromUrlLoading && prFromUrlProviderId === providerId && (
							<>{renderPrGroup(prFromUrl?.providerId, prFromUrl, "-1", "-1", "From URL")}</>
						)}
					</>
				)}
				{Object.values(providerQueries).map((query: PullRequestQuery, index) => {
					const groupIndex = index.toString();
					if (isEmpty(derivedState.myPullRequests)) {
						return;
					}
					const providerGroups = derivedState.myPullRequests[providerId];
					const prGroup = providerGroups && providerGroups[index];
					const count = prGroup ? prGroup.length : 0;
					return (
						<PaneNode>
							<PaneNodeName
								onClick={e => toggleQueryHidden(e, providerId, index)}
								title={query?.name || "Unnamed"}
								collapsed={query.hidden}
								count={count}
								isLoading={isLoadingPRs[providerId] || index === isLoadingPRGroup}
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
									return renderPrGroup(providerId, pr, index, groupIndex, query?.name);
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

	const isLoadingAnyPRs = !!Object.values(isLoadingPRs).find(_ => _);

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
			<>
				<PaneHeader
					title={prLabel.PullRequests}
					id={WebviewPanels.OpenPullRequests}
					isLoading={isLoadingAnyPRs}
					count={totalPRs}
				>
					{derivedState.isPRSupportedCodeHostConnected && (
						<Icon
							onClick={() => fetchPRs(queries, { force: true }, "refresh")}
							name="refresh"
							className={`spinnable ${isLoadingAnyPRs ? "spin" : ""}`}
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
						<Icon onClick={addQuery} name="filter" title="Add Query" placement="bottom" delay={1} />
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
					<PaneBody key={"openpullrequests"}>
						{!derivedState.isPRSupportedCodeHostConnected && (
							<>
								{/* eventually need for Bitbucket*/}
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
										} else {
											return null;
										}
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
										<PaneNode key={`${providerId}_${index}`}>
											<PaneNodeName
												onClick={e => toggleProviderHidden(e, providerId)}
												title={displayName}
												collapsed={collapsed}
												count={0}
												isLoading={isLoadingPRs[providerId] || index === isLoadingPRGroup}
											></PaneNodeName>
											{!collapsed && renderQueryGroup(provider.id)}
										</PaneNode>
									);
							  })
							: PRConnectedProviders.map(provider => renderQueryGroup(provider.id))}
					</PaneBody>
				)}
			</>
		</Root>
	);

	function patchQueries(
		defaultQueries: FetchProviderDefaultPullResponse,
		pullRequestQueries: FetchProviderDefaultPullResponse,
		saveQueries: (providerId, queries) => void
	) {
		Object.keys(pullRequestQueries).forEach(provider => {
			// Little shimmy to update old default filters to our new syntax
			let shouldUpdate = false;
			pullRequestQueries![provider].forEach((query, index) => {
				if (provider === "gitlab*com" || provider === "gitlab/enterprise") {
					if (
						query.name === "Waiting on my Review" &&
						query.query === "state:opened reviewer_username:@me scope:all"
					) {
						pullRequestQueries![provider][index].query =
							"state=opened&reviewer_username=@me&scope=all";
						shouldUpdate = true;
					}
					if (
						query.name === "Assigned to Me" &&
						query.query === "state:opened scope:assigned_to_me"
					) {
						pullRequestQueries![provider][index].query = "state=opened&scope=assigned_to_me";
						shouldUpdate = true;
					}
					if (
						query.name === "Created by Me" &&
						query.query === "state:opened scope:created_by_me"
					) {
						pullRequestQueries![provider][index].query = "state=opened&scope=created_by_me";
						shouldUpdate = true;
					}
					if (query.name === "Recent" && query.query === "recent") {
						pullRequestQueries![provider][index].query = "scope=created_by_me&per_page=5";
						shouldUpdate = true;
					}
				}
				if (provider === "github*com" || provider === "github/enterprise") {
					if (
						query.name === "Waiting on my Review" &&
						query.query === "is:pr is:open involves:@me"
					) {
						const replacementQuery = defaultQueries[provider].find(
							_ => _.name === "Waiting on my Review"
						)?.query;
						if (replacementQuery) {
							pullRequestQueries![provider][index].query = replacementQuery;
							shouldUpdate = true;
						}
					}
				}
			});
			if (shouldUpdate) {
				saveQueries(provider, pullRequestQueries![provider]);
			}
		});
	}
});
