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
import { ErrorMessage } from "../../../src/components/ErrorMessage";
import { CreateCodemarkIcons } from "../../CreateCodemarkIcons";
import { getPreferences } from "../../../store/users/reducer";
import Tooltip from "../../Tooltip";
import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled, { ThemeProvider } from "styled-components";
import Icon from "../../Icon";
import { Button } from "../../../src/components/Button";
import { Link } from "../../Link";
import { PullRequestCommitsTab } from "../../PullRequestCommitsTab";
import {
	ChangeDataType,
	DidChangeDataNotificationType,
	FetchThirdPartyPullRequestPullRequest,
	GetReposScmRequestType,
	GitLabMergeRequest,
	GitLabMergeRequestWrapper
} from "@codestream/protocols/agent";
import {
	PRActionIcons,
	PRBadge,
	PRBranch,
	PRBranchTruncated,
	PRError,
	PRHeader,
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
	clearPullRequestCommits,
	clearPullRequestFiles,
	getPullRequestCommitsFromProvider,
	getPullRequestConversations,
	getPullRequestConversationsFromProvider,
	getPullRequestFilesFromProvider
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
import { PipelineBox } from "./PipelineBox";
import { OpenUrlRequestType } from "@codestream/protocols/webview";

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
	${PRBranchTruncated} {
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
	${PRActionIcons} {
		display: inline-flex;
	}
	${PRStatusButton} {
		margin-bottom: 5px;
	}
`;

export const OutlineBox = styled.div`
	border-radius: 5px;
	border: 1px solid var(--base-border-color);
	margin: 0 20px 15px 20px;
	position: relative;
	:after {
		content: "";
		display: block;
		position: absolute;
		height: 15px;
		width: 1px;
		left: 30px;
		top: 100%;
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
	.row-icon {
		flex-grow: 0;
		flex-basis: min-content;
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
	.pl5 {
		padding-left: 5px;
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
	.action-button-wrapper {
		align-items: center;
		display: flex;
		flex-wrap: no-wrap;	
		@media only screen and (max-width: 350px) {
			flex-wrap: wrap;
			justify-content: center;
			.action-button {
				margin-top: 10px;
			}
		}
	}
`;

const Description = styled.div`
	margin: 20px;
`;

const TabActions = styled.div`
	margin-top: -5px;
	margin-left: auto;
`;

const stateMap = {
	opened: "open",
	closed: "closed",
	merged: "merged"
};

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
		const currentPullRequest = getCurrentProviderPullRequest(state);
		const currentPullRequestIdExact = getPullRequestExactId(state);
		const providerPullRequestLastUpdated = getCurrentProviderPullRequestLastUpdated(state);
		const order: "oldest" | "newest" = preferences.pullRequestTimelineOrder || "oldest";
		const filter: "comments" | "history" | "all" = preferences.pullRequestTimelineFilter || "all";
		return {
			order,
			filter,
			viewPreference: (getPreferences(state) || {}).pullRequestView || "auto",
			reviewsStateBootstrapped: state.reviews.bootstrapped,
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

	const [didMount, setDidMount] = useState(false);
	const [activeTab, setActiveTab] = useState(1);
	const [isEditing, setIsEditing] = useState(false);
	const [isLoadingPR, setIsLoadingPR] = useState(false);
	const [isLoadingMessage, setIsLoadingMessage] = useState("");
	const [generalError, setGeneralError] = useState("");
	const [collapseAll, setCollapseAll] = useState(false);

	const [rightOpen, setRightOpen] = useState(false);
	const [openRepos, setOpenRepos] = useState<any[]>(EMPTY_ARRAY);
	const [editingTitle, setEditingTitle] = useState(false);
	const [savingTitle, setSavingTitle] = useState(false);
	const [title, setTitle] = useState("");
	const [finishReviewOpen, setFinishReviewOpen] = useState(false);
	const [dynamicKey, setDynamicKey] = useState("");
	const [prCommitsRange, setPrCommitsRange] = useState<string[]>([]);

	const breakpoints = {
		auto: "630px",
		"side-by-side": "10px",
		vertical: "100000px"
	};
	const addViewPreferencesToTheme = theme => ({
		...theme,
		breakpoint: breakpoints[derivedState.viewPreference]
	});

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

	let interval;
	let intervalCounter = 0;
	useDidMount(() => {
		interval && clearInterval(interval);
		if (!derivedState.reviewsStateBootstrapped) {
			dispatch(bootstrapReviews());
		}
		let _didChangeDataNotification;
		getOpenRepos();
		initialFetch().then((_: GitLabMergeRequestWrapper | undefined) => {
			HostApi.instance.track("PR Details Viewed", {
				Host: derivedState.currentPullRequestProviderId,
				"Host Version": _?.project?.mergeRequest?.supports?.version?.version || "0.0.0"
			});

			_didChangeDataNotification = HostApi.instance.on(DidChangeDataNotificationType, (e: any) => {
				if (e.type === ChangeDataType.Commits) {
					reload("Updating...");
				}
			});
			setDidMount(true);
		});

		return () => {
			_didChangeDataNotification && _didChangeDataNotification.dispose();
		};
	});

	useEffect(() => {
		// don't run this until we have mounted
		if (!didMount) return;

		interval && clearInterval(interval);
		interval = setInterval(async () => {
			try {
				if (intervalCounter >= 60) {
					// two hours
					interval && clearInterval(interval);
					intervalCounter = 0;
					console.warn(`stopped getPullRequestLastUpdated interval counter=${intervalCounter}`);
					return;
				}

				const response = (await dispatch(
					api(
						"getPullRequestLastUpdated",
						{},
						{ preventClearError: true, preventErrorReporting: true }
					)
				)) as any;
				if (
					derivedState.currentPullRequest &&
					derivedState.currentPullRequestLastUpdated &&
					response &&
					response.updatedAt &&
					derivedState.currentPullRequestLastUpdated &&
					// if more than 5 seconds "off""
					(Date.parse(response.updatedAt) -
						Date.parse(derivedState.currentPullRequestLastUpdated)) /
						1000 >
						5
				) {
					console.warn(
						"getPullRequestLastUpdated is updating",
						response.updatedAt,
						derivedState.currentPullRequestLastUpdated,
						intervalCounter
					);
					intervalCounter = 0;
					fetch();
					clearInterval(interval);
				} else {
					intervalCounter++;
					console.log("incrementing counter", intervalCounter);
				}
			} catch (ex) {
				console.error(ex);
				interval && clearInterval(interval);
			}
		}, 120000); //120000 === 2 minute interval

		return () => {
			interval && clearInterval(interval);
		};
	}, [didMount, derivedState.currentPullRequestLastUpdated, derivedState.currentPullRequest]);

	const pr: GitLabMergeRequest =
		derivedState.currentPullRequest?.conversations?.project?.mergeRequest;

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
		if (response.error && response.error.message) {
			setIsLoadingPR(false);
			setIsLoadingMessage("");
			setGeneralError(response.error.message);
			console.error(response.error.message);
			return undefined;
		} else {
			console.warn(response);
			_assignState(response);
			return response;
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

	const reload = async (message?: string) => {
		console.log("MergeRequest is reloading");
		fetch(message);

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
		// we can force the child components to update
		// by changing part of its key attribute
		setDynamicKey(new Date().getTime().toString());
	};

	const __onDidRender = functions => {
		insertText = functions.insertTextAtCursor;
		insertNewline = functions.insertNewlineAtCursor;
		focusOnMessageInput = functions.focus;
	};

	// const numComments = useMemo(() => {
	// 	if (
	// 		!derivedState.currentPullRequest ||
	// 		!derivedState.currentPullRequest.conversations ||
	// 		!derivedState.currentPullRequest.conversations.project
	// 	)
	// 		return 0;
	// 	const _pr = derivedState.currentPullRequest.conversations.project.mergeRequest;
	// 	if (!_pr || !_pr.discussions || !_pr.discussions.nodes) return 0;
	// 	const reducer = (accumulator, node) => {
	// 		if (node && node.notes && node.notes.nodes && node.notes.nodes.length) {
	// 			return node.notes.nodes.length + accumulator;
	// 		}
	// 		return accumulator;
	// 	};
	// 	return _pr.discussions.nodes.reduce(reducer, 0);
	// }, [pr, pr?.updatedAt]);

	const scrollToDiv = div => {
		if (!div) return;
		const modalRoot = document.getElementById("modal-root");
		if (modalRoot) {
			// the 60 is because of the height of the sticky header; we want to give the
			// div a little space at the top
			const y = div.getBoundingClientRect().top + modalRoot.children[0].scrollTop - 60;
			modalRoot.children[0].scrollTo({ top: y, behavior: "smooth" });
		}

		// start the outline 500ms later, to give it time to scroll into view
		setTimeout(() => div.classList.add("highlight-outline"), 500);
		// remove the class once animation stops in case we need to add it back again later
		setTimeout(() => div.classList.remove("highlight-outline"), 2000);
	};

	const [threadIndex, setThreadIndex] = useState(0);
	const jumpToNextThread = () => {
		const threads = document.getElementsByClassName("unresolved-thread-start");
		const div = threads[threadIndex] || threads[0]; // if we're off the edge go back to beginning
		scrollToDiv(div);
		setThreadIndex(threadIndex >= threads.length - 1 ? 0 : threadIndex + 1);
	};

	const [unresolvedThreads, resolvedThreads] = (() => {
		if (!pr || !pr.discussions || !pr.discussions.nodes) return [0, 0];
		return [
			pr.discussions.nodes.filter(_ => _.resolvable && !_.resolved).length,
			pr.discussions.nodes.filter(_ => _.resolvable && _.resolved).length
		];
	})();

	const toggleWorkInProgress = async () => {
		const onOff = !pr.workInProgress;
		setIsLoadingMessage(onOff ? "Marking as draft..." : "Marking as ready...");
		await dispatch(
			api("setWorkInProgressOnPullRequest", {
				onOff
			})
		);
		setIsLoadingMessage("");
	};

	const edit = () => setIsEditing(true);

	const reopen = async () => {
		setIsLoadingMessage("Reopening...");
		await dispatch(api("createPullRequestCommentAndReopen", { text: "" }));
		setIsLoadingMessage("");
	};

	const close = async () => {
		setIsLoadingMessage("Closing...");
		await dispatch(api("createPullRequestCommentAndClose", { text: "" }));
		setIsLoadingMessage("");
	};

	const { order, filter } = derivedState;

	console.warn("PR: ", pr);

	if (!pr) {
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
				{generalError && (
					<ErrorMessage>
						Error Loading Pull Request:
						<br />
						<div style={{ overflow: "auto", width: "100%", height: "7vh" }}>
							{generalError.replace(/\\t/g, "     ").replace(/\\n/g, "")}
						</div>
					</ErrorMessage>
				)}
				{!generalError && <LoadingMessage>Loading Merge Request...</LoadingMessage>}
			</div>
		);
	}

	const bottomComment = (
		<div style={{ margin: "0 20px" }}>
			<PullRequestBottomComment
				pr={pr}
				setIsLoadingMessage={setIsLoadingMessage}
				__onDidRender={__onDidRender}
			/>
		</div>
	);

	const closeRight = () => setRightOpen(false);

	// hijacks links to user profiles which have HREFs like "/ppezaris"
	const hijackUserLinks = event => {
		const href: string = event?.target?.getAttribute("HREF");
		const dataset = event?.target?.dataset;
		if (href && dataset?.referenceType === "user" && dataset?.user) {
			event.preventDefault();
			const url = href.toLowerCase().startsWith("http") ? href : `${pr.baseWebUrl}/${href}`;
			HostApi.instance.send(OpenUrlRequestType, { url });
		}
	};

	return (
		<ThemeProvider theme={addViewPreferencesToTheme}>
			<PullRequestRoot className="gitlab" onClick={hijackUserLinks}>
				<CreateCodemarkIcons narrow onebutton />
				{isLoadingMessage && <FloatingLoadingMessage>{isLoadingMessage}</FloatingLoadingMessage>}
				{isEditing && (
					<EditPullRequest
						pr={pr}
						setIsEditing={setIsEditing}
						setIsLoadingMessage={setIsLoadingMessage}
					/>
				)}
				<Left onClick={closeRight}>
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
								{pr.state === "opened" ? "Opened " : "Created "}
								<Timestamp
									className="no-padding"
									time={pr.createdAt}
									relative
									showTooltip
									placement="bottom"
								/>{" "}
								by <PRHeadshotName person={pr.author} fullName />
								<PRActionIcons>
									<PRAuthorBadges
										pr={(pr as unknown) as FetchThirdPartyPullRequestPullRequest}
										node={pr}
									/>
								</PRActionIcons>
								{/* <Role className="ml-5">Maintainer</Role> */}
							</div>
							{pr.userPermissions.adminMergeRequest && (
								<div style={{ marginLeft: "auto" }}>
									{pr.state === "closed" ? (
										<DropdownButton
											variant="secondary"
											size="compactwide"
											splitDropdown
											splitDropdownInstantAction
											selectedKey="edit"
											align="dropdownRight"
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
											size="compactwide"
											splitDropdown
											splitDropdownInstantAction
											align="dropdownRight"
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
							)}
						</Header>
						{!pr.sourceProject && (
							<PRError>
								<Icon name="alert" />
								<div>The source project for this merge request has been removed.</div>
							</PRError>
						)}
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
								<PRBadge>
									{(pr && pr.changesCount) || 0}
									{pr && pr.overflow ? "+" : ""}
								</PRBadge>
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
											setIsLoadingMessage={setIsLoadingMessage}
											setFinishReviewOpen={setFinishReviewOpen}
										/>
									)}
								</PRSubmitReviewButton>
							) : unresolvedThreads > 0 ? (
								<TabActions>
									<PRSelectorButtons>
										<Tooltip placement="top" title={`${unresolvedThreads} unresolved threads`}>
											<span className="label">
												{unresolvedThreads}
												<span className="wide-text"> unresolved</span>
											</span>
										</Tooltip>
										<span>
											<Link
												href={`${pr.repository.url}/-/issues/new?merge_request_to_resolve_discussions_of=${pr.number}`}
											>
												<Icon
													className="clickable"
													name="plus"
													title="Resolve all threads in new issue"
													placement="top"
												/>
											</Link>
										</span>
										<span onClick={jumpToNextThread}>
											<Icon
												className="clickable"
												name="comment-go"
												title="Jump to next unresolved thread"
												placement="top"
											/>
										</span>
										<span onClick={() => setCollapseAll(!collapseAll)}>
											<Icon
												className="clickable"
												name={collapseAll ? "chevron-down-thin" : "chevron-up-thin"}
												title={collapseAll ? "Expand all threads" : "Collapse all threads"}
												placement="top"
											/>
										</span>
									</PRSelectorButtons>
								</TabActions>
							) : resolvedThreads > 0 ? (
								<TabActions>
									<PRSelectorButtons>
										<span className="label">
											<Icon name="check-circle" className="green-color margin-right" />
											All <span className="wide-text">threads </span>resolved
										</span>
										<span onClick={() => setCollapseAll(!collapseAll)}>
											<Icon
												name={collapseAll ? "chevron-down-thin" : "chevron-up-thin"}
												title={collapseAll ? "Expand all threads" : "Collapse all threads"}
												placement="top"
											/>
										</span>
									</PRSelectorButtons>
								</TabActions>
							) : null}
						</Tabs>
					</div>
					{!derivedState.composeCodemarkActive && (
						<>
							{activeTab === 1 && pr && (
								<>
									{pr.description && (
										<Description>
											<MarkdownText
												text={pr.description
													.replace(/<!--[\s\S]*?-->/g, "")
													.replace(/<\/?sup>/g, "")}
											/>
										</Description>
									)}
									<SummaryBox pr={pr} openRepos={openRepos} getOpenRepos={getOpenRepos} />
									<ApproveBox pr={pr} />
									<PipelineBox pr={pr} setIsLoadingMessage={setIsLoadingMessage} />
									<MergeBox pr={pr} setIsLoadingMessage={setIsLoadingMessage} />
									<ReactAndDisplayOptions pr={pr} setIsLoadingMessage={setIsLoadingMessage} />
									{order === "newest" && bottomComment}
									<Timeline
										pr={pr}
										order={order}
										filter={filter}
										setIsLoadingMessage={setIsLoadingMessage}
										collapseAll={collapseAll}
									/>
									{order === "oldest" && bottomComment}
								</>
							)}
							{activeTab === 2 && <PullRequestCommitsTab key={"commits-" + dynamicKey} pr={pr} />}
							{activeTab === 4 && (
								<PullRequestFilesChangedTab
									key={"files-changed-" + dynamicKey}
									pr={pr as any}
									setIsLoadingMessage={setIsLoadingMessage}
									prCommitsRange={prCommitsRange}
									setPrCommitsRange={setPrCommitsRange}
								/>
							)}
						</>
					)}
					{!derivedState.composeCodemarkActive && derivedState.currentPullRequestCommentId && (
						<PullRequestFileComments
							pr={pr as any}
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
					onRefreshClick={reload}
				/>
			</PullRequestRoot>
		</ThemeProvider>
	);
};
