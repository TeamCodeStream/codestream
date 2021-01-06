import { CSMe } from "@codestream/protocols/api";
import { InlineMenu } from "@codestream/webview/src/components/controls/InlineMenu";
import { FloatingLoadingMessage } from "@codestream/webview/src/components/FloatingLoadingMessage";
import { Tabs, Tab } from "@codestream/webview/src/components/Tabs";
import { CodeStreamState } from "@codestream/webview/store";
import copy from "copy-to-clipboard";
import {
	getCurrentProviderPullRequest,
	getCurrentProviderPullRequestLastUpdated,
	getProviderPullRequestRepo2,
	isAnHourOld
} from "../../../store/providerPullRequests/reducer";
import { LoadingMessage } from "../../../src/components/LoadingMessage";

import { getPreferences } from "../../../store/users/reducer";
import Tooltip from "../../Tooltip";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import * as reviewSelectors from "../../../store/reviews/reducer";
import styled, { ThemeProvider } from "styled-components";
import { setUserPreference } from "../../actions";
import { CreateCodemarkIcons } from "../../CreateCodemarkIcons";
import Icon from "../../Icon";
import { Button } from "../../../src/components/Button";
import { Link } from "../../Link";
import { confirmPopup } from "../../Confirm";
import { autoCheckedMergeabilityStatus } from "../../PullRequest";
import { PullRequestCommitsTab } from "../../PullRequestCommitsTab";
import {
	FetchThirdPartyPullRequestPullRequest,
	GetReposScmRequestType,
	ReposScm,
	SwitchBranchRequestType,
	DidChangeDataNotificationType,
	ChangeDataType
} from "@codestream/protocols/agent";
import {
	PRAction,
	PRActionButtons,
	PRAuthor,
	PRBadge,
	PRBranch,
	PRCommentCard,
	PREditTitle,
	PRError,
	PRHeader,
	PRIAmRequested,
	PRPlusMinus,
	PRPreamble,
	PRStatus,
	PRStatusButton,
	PRStatusMessage,
	PRSubmitReviewButton,
	PRTitle
} from "../../PullRequestComponents";
import { PullRequestConversationTab } from "../../PullRequestConversationTab";
import { PullRequestFileComments } from "../../PullRequestFileComments";
import { PullRequestFilesChangedTab } from "../../PullRequestFilesChangedTab";
import { PullRequestFinishReview } from "../../PullRequestFinishReview";
import ScrollBox from "../../ScrollBox";
import Timestamp from "../../Timestamp";
import {
	api,
	getPullRequestConversations,
	getPullRequestConversationsFromProvider
} from "../../../store/providerPullRequests/actions";
import { HostApi } from "../../../webview-api";
import {
	clearCurrentPullRequest,
	setCurrentPullRequest,
	setCurrentReview
} from "../../../store/context/actions";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import { bootstrapReviews } from "@codestream/webview/store/reviews/actions";
import { PullRequestBottomComment } from "../../PullRequestBottomComment";

const Root = styled.div`
	@media only screen and (max-width: ${props => props.theme.breakpoint}) {
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
const EMPTY_HASH = {};
const EMPTY_ARRAY = [];
let insertText;
let insertNewline;
let focusOnMessageInput;

export const PullRequest = () => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const currentUser = state.users[state.session.userId!] as CSMe;
		const team = state.teams[state.context.currentTeamId];
		const providerPullRequests = state.providerPullRequests.pullRequests;
		const currentPullRequest = getCurrentProviderPullRequest(state);
		const providerPullRequestLastUpdated = getCurrentProviderPullRequestLastUpdated(state);
		return {
			viewPreference: getPreferences(state).pullRequestView || "auto",
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
			currentPullRequestCommentId: state.context.currentPullRequest
				? state.context.currentPullRequest.commentId
				: undefined,
			currentPullRequestMetadata: state.context.currentPullRequest
				? state.context.currentPullRequest.metadata
				: undefined,
			currentPullRequest: currentPullRequest,
			currentPullRequestLastUpdated: providerPullRequestLastUpdated,
			composeCodemarkActive: state.context.composeCodemarkActive,
			team,
			textEditorUri: state.editorContext.textEditorUri,
			reposState: state.repos,
			checkoutBranch: state.context.pullRequestCheckoutBranch,
			currentRepo: getProviderPullRequestRepo2(state)
		};
	});
	const [activeTab, setActiveTab] = useState(1);
	const [ghRepo, setGhRepo] = useState<any>(EMPTY_HASH);
	const [isLoadingPR, setIsLoadingPR] = useState(false);
	const [isLoadingMessage, setIsLoadingMessage] = useState("");
	const [generalError, setGeneralError] = useState("");
	const [isLoadingBranch, setIsLoadingBranch] = useState(false);
	const [pr, setPr] = useState<{
		providerId: string;
		id: string;
		iid: string;
		title: string;
		createdAt: string;
		webUrl: string;
		state: string;
		author: {
			username: string;
		};
		commitCount: string;
		discussions: {
			nodes: {}[];
		};
	}>();
	const [openRepos, setOpenRepos] = useState<any[]>(EMPTY_ARRAY);
	const [editingTitle, setEditingTitle] = useState(false);
	const [savingTitle, setSavingTitle] = useState(false);
	const [title, setTitle] = useState("");
	const [currentRepoChanged, setCurrentRepoChanged] = useState(false);
	const [finishReviewOpen, setFinishReviewOpen] = useState(false);
	const [autoCheckedMergeability, setAutoCheckedMergeability] = useState<
		autoCheckedMergeabilityStatus
	>("UNCHECKED");

	const breakpoints = {
		auto: "630px",
		"side-by-side": "10px",
		vertical: "100000px"
	};
	const addViewPreferencesToTheme = theme => ({
		...theme,
		breakpoint: breakpoints[derivedState.viewPreference]
	});

	const saveTitle = async () => {
		setIsLoadingMessage("Saving Title...");
		setSavingTitle(true);
		await dispatch(api("updatePullRequestTitle", { title }));
		setSavingTitle(false);
	};

	const closeFileComments = () => {
		// note we're passing no value for the 3rd argument, which clears
		// the commentId
		if (pr) dispatch(setCurrentPullRequest(pr.providerId, pr.id));
	};

	const _assignState = pr => {
		if (!pr) return;
		//setGhRepo(pr.repository);
		setPr(pr.project.mergeRequest);
		setTitle(pr.project.mergeRequest.title);
		setEditingTitle(false);
		setSavingTitle(false);
		setIsLoadingPR(false);
		setIsLoadingMessage("");
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

	useEffect(() => {
		const providerPullRequests =
			derivedState.providerPullRequests[derivedState.currentPullRequestProviderId!];
		if (providerPullRequests) {
			let data = providerPullRequests[derivedState.currentPullRequestId!];
			if (data) {
				if (isAnHourOld(data.conversationsLastFetch)) {
					console.warn(`pr id=${derivedState.currentPullRequestId} is too old, resetting`);
					// setPR to undefined to trigger loader
					setPr(undefined);
				} else {
					_assignState(data.conversations);
				}
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
				derivedState.currentPullRequestId!,
				derivedState.currentPullRequestMetadata!
			)
		)) as any;
		setGeneralError("");
		if (response.error) {
			// FIXME do something with it
			setIsLoadingPR(false);
			setIsLoadingMessage("");
			setGeneralError(response.error);
		} else {
			console.warn(response);
			_assignState(response);
		}
	};

	/**
	 * Called after an action that requires us to re-fetch from the provider
	 * @param message
	 */
	const fetch = async (message?: string) => {
		if (message) setIsLoadingMessage(message);
		setIsLoadingPR(true);

		const response = (await dispatch(
			getPullRequestConversationsFromProvider(
				derivedState.currentPullRequestProviderId!,
				derivedState.currentPullRequestId!,
				derivedState.currentPullRequestMetadata!
			)
		)) as any;
		_assignState(response);
	};

	const __onDidRender = functions => {
		insertText = functions.insertTextAtCursor;
		insertNewline = functions.insertNewlineAtCursor;
		focusOnMessageInput = functions.focus;
	};

	const reload = async (message?: string) => {
		// console.log("PullRequest is reloading");
		// if (message) setIsLoadingMessage(message);
		// setIsLoadingPR(true);
		// const response = (await dispatch(
		// 	getPullRequestConversationsFromProvider(
		// 		derivedState.currentPullRequestProviderId!,
		// 		derivedState.currentPullRequestId!
		// 	)
		// )) as any;
		// _assignState(response);
		// // just clear the files and commits data -- it will be fetched if necessary (since it has its own api call)
		// dispatch(
		// 	clearPullRequestFiles(
		// 		derivedState.currentPullRequestProviderId!,
		// 		derivedState.currentPullRequestId!
		// 	)
		// );
		// dispatch(
		// 	clearPullRequestCommits(
		// 		derivedState.currentPullRequestProviderId!,
		// 		derivedState.currentPullRequestId!
		// 	)
		// );
	};

	const numComments = useMemo(() => {
		if (!pr || !pr.discussions || !pr.discussions.nodes) return 0;
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
		return pr.discussions.nodes.reduce(reducer, 0);
	}, [pr]);

	const statusIcon =
		pr && (pr.state === "OPEN" || pr.state === "CLOSED") ? "pull-request" : "git-merge";

	if (!pr) {
		if (generalError) {
			return (
				<div style={{ display: "flex", height: "100vh", alignItems: "center" }}>
					<div style={{ textAlign: "center" }}>Error: {generalError}</div>
				</div>
			);
		} else {
			return (
				<div style={{ display: "flex", height: "100vh", alignItems: "center" }}>
					<LoadingMessage>Loading Pull Request...</LoadingMessage>
				</div>
			);
		}
	}

	return (
		<ThemeProvider theme={addViewPreferencesToTheme}>
			<Root className="panel full-height">
				<CreateCodemarkIcons narrow onebutton />
				{isLoadingMessage && <FloatingLoadingMessage>{isLoadingMessage}</FloatingLoadingMessage>}
				<PRHeader>
					{/* {iAmRequested && activeTab == 1 && (
						<PRIAmRequested>
							<div>
								<b>{pr.author.login}</b> requested your review
								<span className="wide-text"> on this pull request</span>.
							</div>
							<Button
								variant="success"
								size="compact"
								onClick={() => {
									setActiveTab(4);
								}}
							>
								Add <span className="wide-text">your</span> review
							</Button>
						</PRIAmRequested>
					)} */}
					<PRPreamble>
						<PRStatusButton
							disabled
							fullOpacity
							// variant={
							// 	pr.isDraft
							// 		? "neutral"
							// 		: pr.state === "OPEN"
							// 		? "success"
							// 		: pr.state === "MERGED"
							// 		? "merged"
							// 		: pr.state === "CLOSED"
							// 		? "destructive"
							// 		: "primary"
							// }
						>
							<Icon name={statusIcon} />
							{pr && pr.state}
						</PRStatusButton>
						Opened <Timestamp time={pr.createdAt} relative /> by {pr.author.username}
					</PRPreamble>
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
								<Tooltip title="Open on GitLab" placement="top">
									<span>
										<Link href={pr.webUrl}>
											#{pr.iid}
											<Icon name="link-external" className="open-external" />
										</Link>
									</span>
								</Tooltip>
							</>
						)}
					</PRTitle>
					<PRStatus>
						<a
							href="#"
							onClick={e => {
								e.preventDefault();
								dispatch(
									api("toggleReaction", {
										subjectId: "ASd",
										content: "+1",
										onOff: true
									})
								);
							}}
						>
							+1
						</a>
						{/* <PRStatusMessage>
							<PRAuthor>{pr.author.username}</PRAuthor>
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
						</PRStatusMessage> */}
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
							<PRBadge>{pr && pr.commitCount}</PRBadge>
						</Tab>

						<Tab onClick={e => setActiveTab(4)} active={activeTab == 4}>
							<Icon name="plus-minus" />
							<span className="wide-text">Files Changed</span>
						</Tab>
					</Tabs>
				</PRHeader>
				{!derivedState.composeCodemarkActive && (
					<ScrollBox>
						<div className="channel-list vscroll" style={{ paddingTop: "10px" }}>
							{activeTab === 1 && (
								// <PullRequestConversationTab
								// 	ghRepo={ghRepo}
								// 	fetch={fetch}
								// 	autoCheckedMergeability={autoCheckedMergeability}
								// 	checkMergeabilityStatus={() => {}}
								// 	setIsLoadingMessage={setIsLoadingMessage}
								// />
								<>
									{pr.discussions.nodes.map((_: any) => {
										return _.notes.nodes.map(x => {
											return (
												<div>
													<img src={x.author.avatarUrl} />
													{x.createdAt}
													<div>{x.body}</div>
													<div>
														id: {x.id}
														<br />
														iid {x.iid}
													</div>
													<a
														href="#"
														onClick={e => {
															e.preventDefault();
															dispatch(
																api("deletePullRequestComment", {
																	id: x.id
																})
															);
														}}
													>
														delete
													</a>
												</div>
											);
										});
									})}
									<PullRequestBottomComment
										pr={pr}
										setIsLoadingMessage={setIsLoadingMessage}
										__onDidRender={__onDidRender}
									/>
								</>
							)}
							{activeTab === 2 && <PullRequestCommitsTab pr={pr} />}
							{activeTab === 4 && (
								<PullRequestFilesChangedTab
									key="files-changed"
									pr={pr as any}
									fetch={fetch}
									setIsLoadingMessage={setIsLoadingMessage}
								/>
							)}
						</div>
					</ScrollBox>
				)}
				{!derivedState.composeCodemarkActive && derivedState.currentPullRequestCommentId && (
					// <PullRequestFileComments
					// 	pr={pr}
					// 	fetch={fetch}
					// 	setIsLoadingMessage={setIsLoadingMessage}
					// 	commentId={derivedState.currentPullRequestCommentId}
					// 	quote={() => {}}
					// 	onClose={closeFileComments}
					// />
					<></>
				)}
			</Root>
		</ThemeProvider>
	);
};
