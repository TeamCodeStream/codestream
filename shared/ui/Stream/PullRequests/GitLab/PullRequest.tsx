import { CSMe } from "@codestream/protocols/api";
import { FloatingLoadingMessage } from "@codestream/webview/src/components/FloatingLoadingMessage";
import { Tabs, Tab } from "@codestream/webview/src/components/Tabs";
import { CodeStreamState } from "@codestream/webview/store";
import {
	getCurrentProviderPullRequest,
	getCurrentProviderPullRequestLastUpdated,
	getPullRequestExactId,
	getPullRequestId
} from "../../../store/providerPullRequests/reducer";
import { LoadingMessage } from "../../../src/components/LoadingMessage";

import { getPreferences } from "../../../store/users/reducer";
import Tooltip from "../../Tooltip";
import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import * as reviewSelectors from "../../../store/reviews/reducer";
import styled, { ThemeProvider } from "styled-components";
import Icon from "../../Icon";
import { Button } from "../../../src/components/Button";
import { Link } from "../../Link";
import { autoCheckedMergeabilityStatus } from "../../PullRequest";
import { PullRequestCommitsTab } from "../../PullRequestCommitsTab";
import {
	FetchThirdPartyPullRequestPullRequest,
	GetReposScmRequestType,
	GitLabMergeRequest
} from "@codestream/protocols/agent";
import {
	PRBadge,
	PRBranch,
	PRError,
	PRHeader,
	PRPlusMinus,
	PRSelectorButtons,
	PRStatusButton,
	PRSubmitReviewButton,
	PRTitle
} from "../../PullRequestComponents";
import { PullRequestFileComments } from "../../PullRequestFileComments";
import { PullRequestFilesChangedTab } from "../../PullRequestFilesChangedTab";
import { PullRequestFinishReview } from "../../PullRequestFinishReview";
import Timestamp from "../../Timestamp";
import {
	api,
	getPullRequestConversations,
	getPullRequestConversationsFromProvider
} from "../../../store/providerPullRequests/actions";
import { HostApi } from "../../../webview-api";
import { clearCurrentPullRequest, setCurrentPullRequest } from "../../../store/context/actions";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import { bootstrapReviews } from "@codestream/webview/store/reviews/actions";
import { PullRequestBottomComment } from "../../PullRequestBottomComment";
import { GetReposScmResponse } from "../../../protocols/agent/agent.protocol";
import { PRHeadshotName } from "@codestream/webview/src/components/HeadshotName";
import { PRHeadshot } from "@codestream/webview/src/components/Headshot";
import { DropdownButton } from "../../Review/DropdownButton";
import { ApproveBox } from "./ApproveBox";
import { MergeBox } from "./MergeBox";
import { ReactAndDisplayOptions } from "./ReactAndDisplayOptions";
import { SummaryBox } from "./SummaryBox";
import { RightActionBar } from "./RightActionBar";
import { MarkdownText } from "../../MarkdownText";
import { EditPullRequest } from "./EditPullRequest";
import CancelButton from "../../CancelButton";
import { Timeline } from "./Timeline";
import { PRAuthorBadges } from "../../PullRequestConversationTab";

export const PullRequestRoot = styled.div`
	position: absolute;
	width: 100%;
	background: var(-app-background-color) !important;
	span.narrow-text {
		display: none !important;
	}
	@media only screen and (max-width: ${props => props.theme.breakpoint}) {
		.wide-text {
			display: none;
		}
		span.narrow-text {
			display: inline-block !important;
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
	b {
		color: var(--text-color-highlight);
	}
	${PRHeadshotName} {
		img {
			border-radius: 50%;
		}
	}
	${PRHeadshot} {
		img {
			border-radius: 50%;
		}
	}
	${PRHeader} {
		margin-top: 20px;
		margin-bottom: 0px;
	}
	${PRTitle} {
		margin-top: 10px;
		margin-bottom: 5px;
		color: var(--text-color-highlight);
	}
	${PRStatusButton} {
		border-radius: 4px;
	}
	${PRBranch} {
		color: var(--text-color-info);
	}
	button {
		border-radius: 4px;
	}
	button.narrow {
		padding: 1px 3px !important;
	}
	.icon.circled {
		display: inline-flex;
		height: 30px;
		width: 30px;
		border-radius: 15px;
		place-items: center;
		justify-content: center;
		color: var(--text-color-subtle);
		border: 1px solid var(--base-border-color);
		margin: 0 10px 0 15px;
		vertical-align: -3px;
		svg {
			opacity: 0.7;
		}
	}
`;

const Left = styled.div`
	pre.stringify {
		font-size: 10px;
		background: var(--app-background-color);
		padding: 10px;
		overflow: auto;
	}
	width: 100%;
	padding-right: 48px;
	min-height: 100%;
`;

const Header = styled.div`
	display: flex;
`;

const RoundImg = styled.span`
	img {
		border-radius: 50%;
		padding-left: 2px;
		vertical-align: middle;
		height: 25px;
	}
`;

const Role = styled.span`
	border-radius: 15px;
	color: #666;
	border: 1px solid #cfcfcf;
	padding: 0px 10px 0px 10px;
`;

const Reply = styled.div`
	background: red;
`;

export const OutlineBox = styled.div`
	border-radius: 5px;
	border: 1px solid var(--base-border-color);
	margin: 0 20px 15px 20px;
	position: relative;
	& + &:after {
		content: "";
		display: block;
		position: absolute;
		height: 15px;
		width: 1px;
		left: 30px;
		top: -15px;
		background: var(--base-border-color);
	}
`;

export const FlexRow = styled.div`
	align-items: center;
	padding: 10px;
	display: flex;
	flex-wrap: wrap;
	.right {
		margin-left: auto;
		white-space: nowrap;
	}
	.bigger {
		display: inline-block;
		transform: scale(1.5);
		margin: 0 15px 0 12px;
		opacity: 0.7;
	}
	.overlap {
		position: absolute !important;
		top: -5px;
		right: 5px;
		display: inline-block;
		transform: scale(0.75);
	}
	.pad-left {
		padding-left: 10px;
	}
	.action-button {
		width: 75px;
	}
	.disabled {
		cursor: not-allowed;
	}
	textarea {
		margin: 5px 0 5px 0;
		width: 100% !important;
		height: 75px;
	}
`;

const Description = styled.div`
	margin: 20px;
`;

const TabActions = styled.div`
	margin-top: -5px;
	margin-left: auto;
`;

const EMPTY_HASH = {};
const EMPTY_ARRAY = [];
let insertText;
let insertNewline;
let focusOnMessageInput;

export const PullRequest = () => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const { preferences } = state;
		const currentUser = state.users[state.session.userId!] as CSMe;
		const team = state.teams[state.context.currentTeamId];
		const providerPullRequests = state.providerPullRequests.pullRequests;
		const currentPullRequest = getCurrentProviderPullRequest(state);
		const currentPullRequestIdExact = getPullRequestExactId(state);
		const providerPullRequestLastUpdated = getCurrentProviderPullRequestLastUpdated(state);
		const order: "oldest" | "newest" = preferences.pullRequestTimelineOrder || "oldest";
		const filter: "comments" | "history" | "all" = preferences.pullRequestTimelineFilter || "all";

		return {
			order,
			filter,
			viewPreference: (getPreferences(state) || {}).pullRequestView || "auto",
			providerPullRequests: providerPullRequests,
			reviewsState: state.reviews,
			reviews: reviewSelectors.getAllReviews(state),
			currentUser,
			currentPullRequestProviderId: state.context.currentPullRequest
				? state.context.currentPullRequest.providerId
				: undefined,
			currentPullRequestId: getPullRequestId(state),
			currentPullRequestIdExact: currentPullRequestIdExact,
			currentPullRequestCommentId: state.context.currentPullRequest
				? state.context.currentPullRequest.commentId
				: undefined,
			currentPullRequest: currentPullRequest,
			currentPullRequestLastUpdated: providerPullRequestLastUpdated,
			composeCodemarkActive: state.context.composeCodemarkActive,
			team,
			textEditorUri: state.editorContext.textEditorUri,
			reposState: state.repos,
			checkoutBranch: state.context.pullRequestCheckoutBranch
		};
	});

	const [activeTab, setActiveTab] = useState(1);
	const [isEditing, setIsEditing] = useState(false);
	const [isLoadingPR, setIsLoadingPR] = useState(false);
	const [isLoadingMessage, setIsLoadingMessage] = useState("");
	const [generalError, setGeneralError] = useState("");

	const [rightOpen, setRightOpen] = useState(false);
	const [openRepos, setOpenRepos] = useState<any[]>(EMPTY_ARRAY);
	const [editingTitle, setEditingTitle] = useState(false);
	const [savingTitle, setSavingTitle] = useState(false);
	const [title, setTitle] = useState("");
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

		if (pr) dispatch(setCurrentPullRequest(pr.providerId, pr.idComputed));
	};

	const _assignState = _pr => {
		if (!_pr) return;
		if (!_pr.project) {
			console.warn("possible bad request");
		}
		// TODO is this needed??
		//setGhRepo(pr.repository);
		if (_pr && _pr.project) setTitle(_pr.project.mergeRequest.title);
		setEditingTitle(false);
		setSavingTitle(false);
		setIsLoadingPR(false);
		setIsLoadingMessage("");
	};

	const getOpenRepos = async () => {
		const { reposState } = derivedState;
		const response: GetReposScmResponse = await HostApi.instance.send(GetReposScmRequestType, {
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
			let data = providerPullRequests[derivedState.currentPullRequestIdExact!];
			if (data) {
				_assignState(data.conversations);
			} else {
				console.warn(`could not find match for idExact=${derivedState.currentPullRequestIdExact}`);
			}
		}
	}, [
		derivedState.currentPullRequestProviderId,
		derivedState.currentPullRequestIdExact,
		derivedState.providerPullRequests
	]);

	const pr: GitLabMergeRequest = useMemo(() => {
		return derivedState.currentPullRequest &&
			derivedState.currentPullRequest.conversations &&
			derivedState.currentPullRequest.conversations.project
			? derivedState.currentPullRequest.conversations.project.mergeRequest
			: undefined;
	}, [derivedState.currentPullRequest]);

	const initialFetch = async (message?: string) => {
		if (message) setIsLoadingMessage(message);
		setIsLoadingPR(true);

		const response = (await dispatch(
			getPullRequestConversations(
				derivedState.currentPullRequestProviderId!,
				derivedState.currentPullRequestId!
			)
		)) as any;
		setGeneralError("");
		if (response.error) {
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
				derivedState.currentPullRequestId!
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
		if (
			!derivedState.currentPullRequest ||
			!derivedState.currentPullRequest.conversations ||
			!derivedState.currentPullRequest.conversations.project
		)
			return 0;
		const _pr = derivedState.currentPullRequest.conversations.project.mergeRequest;
		if (!_pr || !_pr.discussions || !_pr.discussions.nodes) return 0;
		const reducer = (accumulator, node) => {
			if (node && node.notes && node.notes.nodes && node.notes.nodes.length) {
				return node.notes.nodes.length + accumulator;
			}
			return accumulator;
		};
		return _pr.discussions.nodes.reduce(reducer, 0);
	}, [derivedState.currentPullRequest]);

	const statusIcon =
		pr && (pr.state === "OPEN" || pr.state === "CLOSED") ? "pull-request" : "git-merge";

	const unresolvedComments = useMemo(() => {
		if (!pr || !pr.discussions || !pr.discussions.nodes) return 0;
		return pr.discussions.nodes.filter(_ => _.resolvable && !_.resolved).length;
	}, [pr]);

	if (!pr) {
		if (generalError) {
			return (
				<div style={{ display: "flex", height: "100vh", alignItems: "center" }}>
					<div style={{ textAlign: "center" }}>Error: {generalError}</div>
				</div>
			);
		} else {
			return (
				<div
					style={{
						display: "flex",
						height: "100vh",
						alignItems: "center",
						background: "var(--sidebar-background)"
					}}
				>
					<div style={{ position: "absolute", top: "20px", right: "20px" }}>
						<CancelButton onClick={() => dispatch(clearCurrentPullRequest())} />
					</div>
					<LoadingMessage>Loading Merge Request...</LoadingMessage>
				</div>
			);
		}
	}

	const toggleWorkInProgress = async () => {
		const onOff = !pr.workInProgress;
		setIsLoadingMessage(onOff ? "Marking as draft..." : "Marking as ready...");
		await dispatch(
			api("setWorkInProgressOnPullRequest", {
				onOff
			})
		);
	};

	const edit = () => setIsEditing(true);

	const reopen = async () => {
		setIsLoadingMessage("Reopening...");
		await dispatch(api("createPullRequestCommentAndReopen", { text: "" }));
	};

	const close = async () => {
		setIsLoadingMessage("Closing...");
		await dispatch(api("createPullRequestCommentAndClose", { text: "" }));
	};

	const { order, filter } = derivedState;

	const stateMap = {
		opened: "open",
		closed: "closed",
		merged: "merged"
	};
	console.warn("PR: ", pr);

	const bottomComment = (
		<div style={{ margin: "0 20px" }}>
			<PullRequestBottomComment
				pr={pr}
				setIsLoadingMessage={setIsLoadingMessage}
				__onDidRender={__onDidRender}
			/>
		</div>
	);

	return (
		<ThemeProvider theme={addViewPreferencesToTheme}>
			<PullRequestRoot className="gitlab">
				{isLoadingMessage && <FloatingLoadingMessage>{isLoadingMessage}</FloatingLoadingMessage>}
				{isEditing && (
					<EditPullRequest
						pr={pr}
						setIsEditing={setIsEditing}
						setIsLoadingMessage={setIsLoadingMessage}
					/>
				)}
				<Left>
					<PRHeader>
						<Header>
							<div style={{ marginRight: "10px" }}>
								<PRStatusButton
									disabled
									fullOpacity
									size="compact"
									variant={
										pr.isDraft
											? "neutral"
											: pr.state === "opened"
											? "success"
											: pr.state === "merged"
											? "merged"
											: pr.state === "closed"
											? "destructive"
											: "primary"
									}
								>
									{pr.isDraft ? "Draft" : stateMap[pr.state]}
								</PRStatusButton>
								{pr.discussionLocked && (
									<PRStatusButton
										className="narrow"
										disabled
										fullOpacity
										size="compact"
										variant="warning"
									>
										<Icon name="lock" style={{ margin: 0 }} />
									</PRStatusButton>
								)}
								Opened{" "}
								<Timestamp
									className="no-padding"
									time={pr.createdAt}
									relative
									showTooltip
									placement="bottom"
								/>{" "}
								by <PRHeadshotName person={pr.author} />
								<PRAuthorBadges
									pr={(pr as unknown) as FetchThirdPartyPullRequestPullRequest}
									node={pr}
								/>
								{/* <Role className="ml-5">Maintainer</Role> */}
							</div>
							<div style={{ marginLeft: "auto" }}>
								{pr.state === "closed" ? (
									<DropdownButton
										variant="secondary"
										splitDropdown
										splitDropdownInstantAction
										selectedKey="edit"
										items={[
											{ label: "Edit", key: "edit", action: edit },
											{ label: "Reopen", key: "reopen", action: reopen }
										]}
									>
										Edit
									</DropdownButton>
								) : (
									<DropdownButton
										variant="secondary"
										splitDropdown
										splitDropdownInstantAction
										items={[
											{ label: "Edit", key: "edit", action: edit },
											{
												label: pr.workInProgress ? "Mark as ready" : "Mark as draft",
												key: "draft",
												action: () => toggleWorkInProgress()
											},
											{ label: "Close", key: "close", action: close }
										]}
									>
										Edit
									</DropdownButton>
								)}
							</div>
						</Header>
						<PRTitle>
							{pr.title}{" "}
							<Tooltip title="Open on GitLab" placement="top">
								<span>
									<Link href={pr.webUrl}>
										!{pr.number}
										<Icon name="link-external" className="open-external" />
									</Link>
								</span>
							</Tooltip>
						</PRTitle>
						{derivedState.currentPullRequest &&
							derivedState.currentPullRequest.error &&
							derivedState.currentPullRequest.error.message && (
								<PRError>
									<Icon name="alert" />
									<div>{derivedState.currentPullRequest.error.message}</div>
								</PRError>
							)}
					</PRHeader>
					<div
						className="sticky"
						style={{
							position: "sticky",
							background: "var(--app-background-color)",
							zIndex: 20,
							top: 0,
							paddingTop: "10px"
						}}
					>
						<Tabs style={{ margin: "0 20px 10px 20px" }}>
							<Tab onClick={e => setActiveTab(1)} active={activeTab == 1}>
								<Icon className="narrow-text" name="comment" />
								<span className="wide-text">Overview</span>
								<PRBadge>{pr.userDiscussionsCount}</PRBadge>
							</Tab>
							<Tab onClick={e => setActiveTab(2)} active={activeTab == 2}>
								<Icon className="narrow-text" name="git-commit" />
								<span className="wide-text">Commits</span>
								<PRBadge>{(pr && pr.commitCount) || 0}</PRBadge>
							</Tab>

							<Tab onClick={e => setActiveTab(4)} active={activeTab == 4}>
								<Icon className="narrow-text" name="plus-minus" />
								<span className="wide-text">Changes</span>
								<PRBadge>{(pr && pr.changesCount) || 0}</PRBadge>
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
											pr={pr as any}
											mode="dropdown"
											fetch={fetch}
											setIsLoadingMessage={setIsLoadingMessage}
											setFinishReviewOpen={setFinishReviewOpen}
										/>
									)}
								</PRSubmitReviewButton>
							) : (
								<TabActions>
									<PRSelectorButtons>
										<Tooltip placement="top" title="7 unresolved threads">
											<span className="label">
												{unresolvedComments}
												<span className="wide-text"> unresolved</span>
											</span>
										</Tooltip>
										<span onClick={() => {}}>
											<Icon name="plus" title="Resolve all threads in new issue" placement="top" />
										</span>
										<span onClick={() => {}}>
											<Icon
												name="comment-go"
												title="Jump to next unresolved thread"
												placement="top"
											/>
										</span>
										<span onClick={() => {}}>
											<Icon name="chevron-up-thin" title="Collapse all threads" placement="top" />
										</span>
									</PRSelectorButtons>
								</TabActions>
							)}
						</Tabs>
					</div>
					{!derivedState.composeCodemarkActive && (
						<>
							{activeTab === 1 && pr && (
								<>
									{pr.description && (
										<Description>
											<MarkdownText text={pr.description.replace(/<\/?sup>/g, "")} />
										</Description>
									)}
									<SummaryBox pr={pr} openRepos={openRepos} getOpenRepos={getOpenRepos} />
									<ApproveBox pr={pr} />
									<MergeBox pr={pr} setIsLoadingMessage={setIsLoadingMessage} />
									<ReactAndDisplayOptions pr={pr} setIsLoadingMessage={setIsLoadingMessage} />
									{order === "newest" && bottomComment}
									<Timeline
										pr={pr}
										order={order}
										filter={filter}
										setIsLoadingMessage={setIsLoadingMessage}
									/>
									{order === "oldest" && bottomComment}
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
						</>
					)}
					{!derivedState.composeCodemarkActive && derivedState.currentPullRequestCommentId && (
						<PullRequestFileComments
							pr={pr as any}
							fetch={fetch}
							setIsLoadingMessage={setIsLoadingMessage}
							commentId={derivedState.currentPullRequestCommentId}
							quote={() => {}}
							onClose={closeFileComments}
						/>
					)}
				</Left>
				<RightActionBar
					pr={pr}
					rightOpen={rightOpen}
					setRightOpen={setRightOpen}
					setIsLoadingMessage={setIsLoadingMessage}
				/>
			</PullRequestRoot>
		</ThemeProvider>
	);
};
