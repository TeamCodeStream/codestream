import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "../store";
import styled from "styled-components";
import { CSMe } from "@codestream/protocols/api";
import { CreateCodemarkIcons } from "./CreateCodemarkIcons";
import ScrollBox from "./ScrollBox";
import Icon from "./Icon";
import { Tabs, Tab } from "../src/components/Tabs";
import Timestamp from "./Timestamp";
import copy from "copy-to-clipboard";
import { Link } from "./Link";
import {
	clearCurrentPullRequest,
	setCurrentPullRequest,
	setCurrentReview
} from "../store/context/actions";
import CancelButton from "./CancelButton";
import { useDidMount } from "../utilities/hooks";
import { HostApi } from "../webview-api";
import {
	FetchThirdPartyPullRequestPullRequest,
	GetReposScmRequestType,
	ReposScm,
	ExecuteThirdPartyTypedType,
	SwitchBranchRequestType,
	DidChangeDataNotificationType,
	ChangeDataType,
	FetchThirdPartyPullRequestResponse
} from "@codestream/protocols/agent";
import {
	PRHeader,
	PRTitle,
	PRStatus,
	PRStatusButton,
	PRStatusMessage,
	PRAuthor,
	PRAction,
	PRBranch,
	PRBadge,
	PRPlusMinus,
	PREditTitle,
	PRActionButtons,
	PRCommentCard,
	PRSubmitReviewButton,
	PRIAmRequested
} from "./PullRequestComponents";
import { LoadingMessage } from "../src/components/LoadingMessage";
import { Modal } from "./Modal";
import { bootstrapReviews } from "../store/reviews/actions";
import { PullRequestConversationTab } from "./PullRequestConversationTab";
import { PullRequestCommitsTab } from "./PullRequestCommitsTab";
import * as reviewSelectors from "../store/reviews/reducer";
import { PullRequestFilesChangedTab } from "./PullRequestFilesChangedTab";
import { FloatingLoadingMessage } from "../src/components/FloatingLoadingMessage";
import { Button } from "../src/components/Button";
import MessageInput from "./MessageInput";
import { RadioGroup, Radio } from "../src/components/RadioGroup";
import Tooltip from "./Tooltip";
import { PullRequestFinishReview } from "./PullRequestFinishReview";
import {
	getPullRequestConversationsFromProvider,
	clearPullRequestFiles,
	getPullRequestConversations,
	clearPullRequestCommits,
	api
} from "../store/providerPullRequests/actions";
import {
	getCurrentProviderPullRequest,
	getProviderPullRequestRepo
} from "../store/providerPullRequests/reducer";
import { confirmPopup } from "./Confirm";

export const WidthBreakpoint = "630px";

const Root = styled.div`
	@media only screen and (max-width: ${WidthBreakpoint}) {
		.wide-text {
			display: none;
		}
	}
	a {
		text-decoration: none;
		&:hover {
			color: var(--text-color-info);
		}
	}
	.mine {
		background: rgba(90, 127, 255, 0.08);
	}
	.codestream .stream & ul.contains-task-list {
		margin: 0 !important;
		padding: 0 !important;
		white-space: normal;
		li.task-list-item {
			margin: 0 !important;
			padding: 3px 0 3px 30px !important;
			list-style: none;
			input {
				margin-left: -30px;
			}
		}
	}
`;

interface ReposScmPlusName extends ReposScm {
	name: string;
}

const EMPTY_HASH = {};
const EMPTY_ARRAY = [];

export type autoCheckedMergeabilityStatus = "UNCHECKED" | "CHECKED" | "UNKNOWN";

export const PullRequest = () => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const currentUser = state.users[state.session.userId!] as CSMe;
		const team = state.teams[state.context.currentTeamId];
		const providerPullRequests = state.providerPullRequests.pullRequests;
		const currentPullRequest = getCurrentProviderPullRequest(state);
		return {
			providerPullRequests: providerPullRequests,
			reviewsState: state.reviews,
			reviews: reviewSelectors.getAllReviews(state),
			currentUser,
			currentPullRequestProviderId: state.context.currentPullRequest
				? state.context.currentPullRequest.providerId
				: undefined,
			currentPullRequestId: state.context.currentPullRequest
				? state.context.currentPullRequest.id
				: undefined,
			currentPullRequest: currentPullRequest,
			composeCodemarkActive: state.context.composeCodemarkActive,
			team,
			textEditorUri: state.editorContext.textEditorUri,
			reposState: state.repos,
			checkoutBranch: state.context.pullRequestCheckoutBranch,
			currentRepo: getProviderPullRequestRepo(state)
		};
	});

	const [activeTab, setActiveTab] = useState(1);
	const [ghRepo, setGhRepo] = useState<any>(EMPTY_HASH);
	const [isLoadingPR, setIsLoadingPR] = useState(false);
	const [isLoadingMessage, setIsLoadingMessage] = useState("");
	const [isLoadingBranch, setIsLoadingBranch] = useState(false);
	const [pr, setPr] = useState<FetchThirdPartyPullRequestPullRequest | undefined>();
	const [openRepos, setOpenRepos] = useState<ReposScmPlusName[]>(EMPTY_ARRAY);
	const [editingTitle, setEditingTitle] = useState(false);
	const [savingTitle, setSavingTitle] = useState(false);
	const [title, setTitle] = useState("");
	const [currentRepoChanged, setCurrentRepoChanged] = useState(false);
	const [finishReviewOpen, setFinishReviewOpen] = useState(false);
	const [autoCheckedMergeability, setAutoCheckedMergeability] = useState<
		autoCheckedMergeabilityStatus
	>("UNCHECKED");

	const exit = async () => {
		await dispatch(clearCurrentPullRequest());
	};

	const PRError = styled.div`
		padding: 0px 15px 20px 15px;
		display: flex;
		align-items: center;
		> .icon {
			flex-grow: 0;
			flex-shrink: 0;
			display: inline-block;
			margin-right: 15px;
			transform: scale(1.5);
			color: #ff982d;
		}
		> div {
			color: #ff982d;
			flex-grow: 10;
			display: flex;
			align-items: center;
			button {
				margin-left: auto;
			}
		}
		strong {
			font-weight: normal;
			color: var(--text-color-highlight);
		}
		a {
			text-decoration: none;
			color: var(--text-color-highlight);
			&:hover {
				color: var(--text-color-info) !important;
			}
		}
	`;

	const _assignState = pr => {
		if (!pr) return;
		setGhRepo(pr.repository);
		setPr(pr.repository.pullRequest);
		setTitle(pr.repository.pullRequest.title);
		setEditingTitle(false);
		setSavingTitle(false);
		setIsLoadingPR(false);
		setIsLoadingMessage("");
	};

	useEffect(() => {
		const providerPullRequests =
			derivedState.providerPullRequests[derivedState.currentPullRequestProviderId!];
		if (providerPullRequests) {
			let data = providerPullRequests[derivedState.currentPullRequestId!];
			if (data) {
				_assignState(data.conversations);
			}
		}
	}, [
		derivedState.currentPullRequestProviderId,
		derivedState.currentPullRequestId,
		derivedState.providerPullRequests
	]);

	const initialFetch = async (message?: string) => {
		if (message) setIsLoadingMessage(message);
		setIsLoadingPR(true);

		const response = (await dispatch(
			getPullRequestConversations(
				derivedState.currentPullRequestProviderId!,
				derivedState.currentPullRequestId!
			)
		)) as any;
		_assignState(response);
	};

	/**
	 * Called after an action that requires us to re-fetch from the provider
	 * @param message
	 */
	const fetch = async (message?: string) => {
		if (message) setIsLoadingMessage(message);
		setIsLoadingPR(true);

		const response = (await dispatch(
			getPullRequestConversationsFromProvider(pr!.providerId, derivedState.currentPullRequestId!)
		)) as any;
		_assignState(response);
	};

	/**
	 * This is called when a user clicks the "reload" button.
	 * with a "hard-reload" we need to refresh the conversation and file data
	 * @param message
	 */
	const reload = async (message?: string) => {
		console.log("PullRequest is reloading");
		if (message) setIsLoadingMessage(message);
		setIsLoadingPR(true);
		const response = (await dispatch(
			getPullRequestConversationsFromProvider(pr!.providerId, derivedState.currentPullRequestId!)
		)) as any;
		_assignState(response);

		// just clear the files and commits data -- it will be fetched if necessary (since it has its own api call)
		dispatch(
			clearPullRequestFiles(
				derivedState.currentPullRequestProviderId!,
				derivedState.currentPullRequestId!
			)
		);
		dispatch(
			clearPullRequestCommits(
				derivedState.currentPullRequestProviderId!,
				derivedState.currentPullRequestId!
			)
		);
	};

	const checkout = async () => {
		if (!pr) return;
		setIsLoadingBranch(true);
		const result = await HostApi.instance.send(SwitchBranchRequestType, {
			branch: pr!.headRefName,
			repoId: derivedState.currentRepo ? derivedState.currentRepo.id : ""
		});
		if (result.error) {
			console.warn("ERROR FROM SET BRANCH: ", result.error);
			confirmPopup({
				title: "Git Error",
				className: "wide",
				message: (
					<div className="monospace" style={{ fontSize: "11px" }}>
						{result.error}
					</div>
				),
				centered: false,
				buttons: [{ label: "OK", className: "control-button" }]
			});
			setIsLoadingBranch(false);
			return;
		} else {
			setIsLoadingBranch(false);
			getOpenRepos();
		}
		// i don't think we need to reload here, do we?
		// fetch("Reloading...");
	};

	useEffect(() => {
		if (pr && pr.headRefName && derivedState.checkoutBranch) {
			checkout();
			// clear the branch flag
			dispatch(setCurrentPullRequest(pr.providerId, pr.id));
		}
	}, [pr && pr.headRefName, derivedState.checkoutBranch]);

	const hasRepoOpen = useMemo(() => {
		return pr && openRepos.find(_ => _.name === pr.repository.name);
	}, [pr, openRepos]);

	useEffect(() => {
		if (!pr) return;

		const _didChangeDataNotification = HostApi.instance.on(
			DidChangeDataNotificationType,
			(e: any) => {
				if (e.type === ChangeDataType.Commits) {
					getOpenRepos().then(_ => {
						const currentOpenRepo = openRepos.find(_ => _.name === pr.repository.name);
						setCurrentRepoChanged(
							!!(e.data.repo && currentOpenRepo && currentOpenRepo.currentBranch == pr.headRefName)
						);
					});
				}
			}
		);

		return () => {
			_didChangeDataNotification && _didChangeDataNotification.dispose();
		};
	}, [openRepos, pr]);

	const cantCheckoutReason = useMemo(() => {
		if (pr) {
			const currentRepo = openRepos.find(_ => _.name === pr.repository.name);
			if (!currentRepo) {
				return `You don't have the ${pr.repository.name} repo open in your IDE`;
			}
			if (currentRepo.currentBranch == pr.headRefName) {
				return `You are on the ${pr.headRefName} branch`;
			}
			return "";
		} else {
			return "PR not loaded";
		}
	}, [pr, openRepos, currentRepoChanged]);

	const saveTitle = async () => {
		setIsLoadingMessage("Saving Title...");
		setSavingTitle(true);

		await dispatch(api("updatePullRequestTitle", { title }));
		fetch();
	};

	const getOpenRepos = async () => {
		const { reposState } = derivedState;
		const response = await HostApi.instance.send(GetReposScmRequestType, {
			inEditorOnly: true,
			includeCurrentBranches: true
		});
		if (response && response.repositories) {
			const repos = response.repositories.map(repo => {
				const id = repo.id || "";
				return { ...repo, name: reposState[id] ? reposState[id].name : "" };
			});
			setOpenRepos(repos);
		}
	};

	const linkHijacker = (e: any) => {
		if (e && e.target.tagName === "A" && e.target.text === "Changes reviewed on CodeStream") {
			const review = Object.values(derivedState.reviews).find(
				_ => _.permalink === e.target.href.replace("?src=GitHub", "")
			);
			if (review) {
				e.preventDefault();
				e.stopPropagation();
				dispatch(clearCurrentPullRequest());
				dispatch(setCurrentReview(review.id));
			}
		}
	};

	useEffect(() => {
		document.addEventListener("click", linkHijacker);
		return () => {
			document.removeEventListener("click", linkHijacker);
		};
	}, [derivedState.reviews]);

	const numComments = useMemo(() => {
		if (!pr || !pr.timelineItems || !pr.timelineItems.nodes) return 0;
		const reducer = (accumulator, node) => {
			let count = 0;
			if (!node || !node.__typename) return accumulator;
			const typename = node.__typename;
			if (typename && typename.indexOf("Comment") > -1) count = 1;
			if (typename === "PullRequestReview") {
				// pullrequestreview can have a top-level comment,
				// and multiple comment threads.
				if (node.body) count++; // top-level comment (optional)
				count += node.comments.nodes.length; // threads
				node.comments.nodes.forEach(c => {
					// each thread can have replies
					if (c.replies) count += c.replies.length;
				});
			}
			return count + accumulator;
		};
		return pr.timelineItems.nodes.reduce(reducer, 0);
	}, [pr]);

	useDidMount(() => {
		if (!derivedState.reviewsState.bootstrapped) {
			dispatch(bootstrapReviews());
		}
		getOpenRepos();
		initialFetch().then(_ => {
			HostApi.instance.track("PR Details Viewed", {
				Host: derivedState.currentPullRequestProviderId
			});
		});
	});

	const _checkMergeabilityStatus = async () => {
		if (!pr) return undefined;
		try {
			const response = (await dispatch(
				api("getPullRequestLastUpdated", {}, { preventClearError: true })
			)) as any;
			if (pr && response && response.mergeable !== pr.mergeable) {
				console.log(
					"getPullRequestLastUpdated is updating (mergeable)",
					pr.mergeable,
					response.mergeable
				);
				reload();
				return response.mergeable !== "UNKNOWN";
			}
		} catch (ex) {
			console.error(ex);
		}
		return undefined;
	};
	const checkMergeabilityStatus = useCallback(() => {
		_checkMergeabilityStatus();
	}, [pr, derivedState.currentPullRequestId]);

	let interval;
	let intervalCounter = 0;
	useEffect(() => {
		interval && clearInterval(interval);
		if (pr) {
			if (autoCheckedMergeability === "UNCHECKED" && pr.mergeable === "UNKNOWN") {
				console.log("PullRequest pr mergeable is UNKNOWN");
				setTimeout(() => {
					_checkMergeabilityStatus().then(_ => {
						setAutoCheckedMergeability(_ ? "CHECKED" : "UNKNOWN");
					});
				}, 5000);
			}
			interval = setInterval(async () => {
				if (intervalCounter >= 120) {
					interval && clearInterval(interval);
					intervalCounter = 0;
					console.warn(`stopped getPullRequestLastUpdated interval counter=${intervalCounter}`);
					return;
				}
				try {
					const response = (await dispatch(
						api("getPullRequestLastUpdated", {}, { preventClearError: true })
					)) as any;
					if (pr && response && response.updatedAt !== pr.updatedAt) {
						console.log(
							"getPullRequestLastUpdated is updating",
							response.updatedAt,
							pr.updatedAt,
							intervalCounter
						);
						intervalCounter = 0;
						reload();
						clearInterval(interval);
					} else {
						intervalCounter++;
					}
				} catch (ex) {
					console.error(ex);
					interval && clearInterval(interval);
				}
			}, 60000); //60000 === 1 minute
		}

		return () => {
			interval && clearInterval(interval);
		};
	}, [pr, autoCheckedMergeability]);

	const iAmRequested = useMemo(() => {
		if (pr) {
			return pr.reviewRequests.nodes.find(
				request => request.requestedReviewer && request.requestedReviewer.login === pr.viewer.login
			);
		}
		return false;
	}, [pr]);

	console.warn("PR: ", pr);
	// console.warn("REPO: ", ghRepo);
	if (!pr) {
		return (
			<div style={{ display: "flex", height: "100vh", alignItems: "center" }}>
				<LoadingMessage>Loading Pull Request...</LoadingMessage>
			</div>
		);
	} else {
		const statusIcon = pr.state === "OPEN" || pr.state === "CLOSED" ? "pull-request" : "git-merge";
		const action = pr.merged ? "merged " : "wants to merge ";

		// console.log(pr.files);
		// console.log(pr.commits);
		return (
			<Root className="panel full-height">
				<CreateCodemarkIcons narrow onebutton />
				{isLoadingMessage && <FloatingLoadingMessage>{isLoadingMessage}</FloatingLoadingMessage>}
				<PRHeader>
					{iAmRequested && activeTab == 1 && (
						<PRIAmRequested>
							<div>
								<b>{pr.author.login}</b> requested your review on this pull request.
							</div>
							<Button
								variant="success"
								size="compact"
								onClick={() => {
									setActiveTab(4);
								}}
							>
								Add your review
							</Button>
						</PRIAmRequested>
					)}
					<PRTitle className={editingTitle ? "editing" : ""}>
						{editingTitle ? (
							<PREditTitle>
								<input
									id="title-input"
									name="title"
									value={title}
									className="input-text control"
									autoFocus
									type="text"
									onChange={e => setTitle(e.target.value)}
									placeholder=""
								/>
								<Button onClick={saveTitle} isLoading={savingTitle}>
									Save
								</Button>
								<Button
									variant="secondary"
									onClick={() => {
										setTitle("");
										setSavingTitle(false);
										setEditingTitle(false);
									}}
								>
									Cancel
								</Button>
							</PREditTitle>
						) : (
							<>
								{title || pr.title}{" "}
								<Tooltip title="Open on GitHub" placement="top">
									<span>
										<Link href={pr.url}>
											#{pr.number}
											<Icon name="link-external" className="open-external" />
										</Link>
									</span>
								</Tooltip>
							</>
						)}
					</PRTitle>
					<PRStatus>
						<PRStatusButton
							disabled
							fullOpacity
							variant={
								pr.isDraft
									? "neutral"
									: pr.state === "OPEN"
									? "success"
									: pr.state === "MERGED"
									? "merged"
									: pr.state === "CLOSED"
									? "destructive"
									: "primary"
							}
						>
							<Icon name={statusIcon} />
							{pr.isDraft ? "Draft" : pr.state ? pr.state.toLowerCase() : ""}
						</PRStatusButton>
						<PRStatusMessage>
							<PRAuthor>{pr.author.login}</PRAuthor>
							<PRAction>
								{action} {pr.commits && pr.commits.totalCount} commits into{" "}
								<Link href={`${pr.repoUrl}/tree/${pr.baseRefName}`}>
									<PRBranch>
										{pr.repository.name}:{pr.baseRefName}
									</PRBranch>
								</Link>
								{" from "}
								<Link href={`${pr.repoUrl}/tree/${pr.headRefName}`}>
									<PRBranch>{pr.headRefName}</PRBranch>
								</Link>{" "}
								<Icon
									title="Copy"
									placement="bottom"
									name="copy"
									className="clickable"
									onClick={e => copy(pr.baseRefName)}
								/>
							</PRAction>
							<Timestamp time={pr.createdAt} relative />
						</PRStatusMessage>
						<PRActionButtons>
							{pr.viewerCanUpdate && (
								<span>
									<Icon
										title="Edit Title"
										trigger={["hover"]}
										delay={1}
										onClick={() => {
											setTitle(pr.title);
											setEditingTitle(true);
										}}
										placement="bottom"
										name="pencil"
									/>
								</span>
							)}
							{isLoadingBranch ? (
								<Icon name="sync" className="spin" />
							) : (
								<span className={cantCheckoutReason ? "disabled" : ""}>
									<Icon
										title={
											<>
												Checkout Branch
												{cantCheckoutReason && (
													<div className="subtle smaller" style={{ maxWidth: "200px" }}>
														Disabled: {cantCheckoutReason}
													</div>
												)}
											</>
										}
										trigger={["hover"]}
										delay={1}
										onClick={checkout}
										placement="bottom"
										name="repo"
									/>
								</span>
							)}
							<span>
								<Icon
									title="Reload"
									trigger={["hover"]}
									delay={1}
									onClick={() => reload("Reloading...")}
									placement="bottom"
									className={`${isLoadingPR ? "spin" : ""}`}
									name="refresh"
								/>
							</span>
						</PRActionButtons>
					</PRStatus>
					{derivedState.currentPullRequest &&
						derivedState.currentPullRequest.error &&
						derivedState.currentPullRequest.error.message && (
							<PRError>
								<Icon name="alert" />
								<div>{derivedState.currentPullRequest.error.message}</div>
							</PRError>
						)}
					<Tabs style={{ marginTop: 0 }}>
						<Tab onClick={e => setActiveTab(1)} active={activeTab == 1}>
							<Icon name="comment" />
							<span className="wide-text">Conversation</span>
							<PRBadge>{numComments}</PRBadge>
						</Tab>
						<Tab onClick={e => setActiveTab(2)} active={activeTab == 2}>
							<Icon name="git-commit" />
							<span className="wide-text">Commits</span>
							<PRBadge>{pr.commits.totalCount}</PRBadge>
						</Tab>
						{/*
		<Tab onClick={e => setActiveTab(3)} active={activeTab == 3}>
			<Icon name="check" />
			<span className="wide-text">Checks</span>
			<PRBadge>{pr.numChecks}</PRBadge>
		</Tab>
		 */}
						<Tab onClick={e => setActiveTab(4)} active={activeTab == 4}>
							<Icon name="plus-minus" />
							<span className="wide-text">Files Changed</span>
							<PRBadge>{pr.files.totalCount}</PRBadge>
						</Tab>

						{pr.pendingReview ? (
							<PRSubmitReviewButton>
								<Button variant="success" onClick={() => setFinishReviewOpen(!finishReviewOpen)}>
									Finish<span className="wide-text"> review</span>
									<PRBadge>
										{pr.pendingReview.comments ? pr.pendingReview.comments.totalCount : 0}
									</PRBadge>
									<Icon name="chevron-down" />
								</Button>
								{finishReviewOpen && (
									<PullRequestFinishReview
										pr={pr}
										mode="dropdown"
										fetch={fetch}
										setIsLoadingMessage={setIsLoadingMessage}
										setFinishReviewOpen={setFinishReviewOpen}
									/>
								)}
							</PRSubmitReviewButton>
						) : (
							<PRPlusMinus>
								<span className="added">
									+
									{!pr.files
										? 0
										: pr.files.nodes
												.map(_ => _.additions)
												.reduce((acc, val) => acc + val)
												.toString()
												.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
								</span>{" "}
								<span className="deleted">
									-
									{!pr.files
										? 0
										: pr.files.nodes
												.map(_ => _.deletions)
												.reduce((acc, val) => acc + val)
												.toString()
												.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
								</span>
							</PRPlusMinus>
						)}
					</Tabs>
				</PRHeader>
				{!derivedState.composeCodemarkActive && (
					<ScrollBox>
						<div className="channel-list vscroll" style={{ paddingTop: "10px" }}>
							{activeTab === 1 && (
								<PullRequestConversationTab
									pr={pr}
									ghRepo={ghRepo}
									fetch={fetch}
									autoCheckedMergeability={autoCheckedMergeability}
									checkMergeabilityStatus={checkMergeabilityStatus}
									setIsLoadingMessage={setIsLoadingMessage}
								/>
							)}
							{activeTab === 2 && <PullRequestCommitsTab pr={pr} ghRepo={ghRepo} fetch={fetch} />}
							{activeTab === 4 && (
								<PullRequestFilesChangedTab
									key="files-changed"
									pr={pr}
									fetch={fetch}
									setIsLoadingMessage={setIsLoadingMessage}
								/>
							)}
						</div>
					</ScrollBox>
				)}
			</Root>
		);
	}
};
