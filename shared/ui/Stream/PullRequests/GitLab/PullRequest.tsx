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
	getPullRequestExactId,
	getPullRequestId
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
import { PropsWithTheme } from "@codestream/webview/src/themes";
import { GetReposScmResponse } from "../../../protocols/agent/agent.protocol";
import { PRHeadshotName } from "@codestream/webview/src/components/HeadshotName";
import { DropdownButton } from "../../Review/DropdownButton";
import { OpenUrlRequestType } from "@codestream/protocols/webview";

const Root = styled.div`
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
	${PRHeadshotName} {
		font-weight: bold;
	}
	${PRHeader} {
		margin-top: 10px;
		margin-bottom: 20px;
	}
	${PRTitle} {
		margin-top: 10px;
		margin-bottom: 15px;
	}
	${PRStatusButton} {
		border-radius: 4px;
	}
	${PRBranch} {
		color: var(--text-color-info);
	}
`;

const Container = styled.div`
	display: flex;
	flex-direction: row;
	height: 100%;
`;
const Left = styled.div`
	flex-grow: 1;
`;
const Right = styled.div`
	width: 200px;
	border-left: 1px solid #333;
	padding: 3px;
`;

const Header = styled.div`
	margin-right: 35px;
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

const BigRoundImg = styled.span`
	img {
		border-radius: 50%;
		margin: 0px 15px 0px 10px;
		vertical-align: middle;
		height: 40px;
	}
`;

const Role = styled.span`
	border-radius: 15px;
	color: #666;
	border: 1px solid #cfcfcf;
	padding: 0px 10px 0px 10px;
`;

const AsideBlock = styled.div`
	padding: 5px 5px 20px 15px;
	margin: 10px;
	border-bottom: 1px solid #cfcfcf;
`;

const Box = styled.div`
	padding: 10px;
	margin: 0px 5px 10px 5px;
	border: 1px solid #dbdbdb;
	border-radius: 4px;
`;

const Reply = styled.div`
	background: red;
`;

const OutlineBox = styled.div`
	align-items: center;
	border-radius: 5px;
	border: 1px solid var(--base-border-color);
	padding: 10px;
	margin: 0 20px 20px 20px;
	display: flex;
	.right {
		margin-left: auto;
	}
	.bigger {
		display: inline-block;
		transform: scale(1.5);
		margin: 0 15px 0 10px;
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
		const currentPullRequestIdExact = getPullRequestExactId(state);
		const providerPullRequestLastUpdated = getCurrentProviderPullRequestLastUpdated(state);
		return {
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

		if (pr) dispatch(setCurrentPullRequest(pr.providerId, pr.idComputed));
	};

	const _assignState = _pr => {
		if (!_pr) return;
		if (!_pr.project) {
			console.warn("possible bad request");
		}
		// TODO is this needed??
		//setGhRepo(pr.repository);
		setTitle(_pr.project.mergeRequest.title);
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

	const pr: {
		providerId: string;
		pendingReview: {
			comments: {
				totalCount: number;
			};
		};
		idComputed: string;
		isDraft?: boolean;
		id: string;
		iid: string;
		title: string;
		createdAt: string;
		webUrl: string;
		state: string;
		url: string;
		author: {
			name: string;
			username: string;
			avatarUrl: string;
		};
		headRefName: string;
		sourceBranch: string;
		targetBranch: string;
		commitCount: number;
		changesCount: number;
		discussions: {
			nodes: {}[];
		};
		files: {
			nodes: any[];
		};
		repository: {
			name: string;
			nameWithOwner: string;
			url: string;
		};
	} = useMemo(() => {
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
		if (!derivedState.currentPullRequest || !derivedState.currentPullRequest.conversations)
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
					<LoadingMessage>Loading Merge Request...</LoadingMessage>
				</div>
			);
		}
	}

	const stateMap = {
		opened: "open",
		closed: "closed",
		merged: "merged"
	};
	console.warn("PR: ", pr);
	return (
		<ThemeProvider theme={addViewPreferencesToTheme}>
			<Root className="panel full-height">
				<CreateCodemarkIcons narrow onebutton />
				{isLoadingMessage && <FloatingLoadingMessage>{isLoadingMessage}</FloatingLoadingMessage>}
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
							Opened <Timestamp className="no-padding" time={pr.createdAt} relative /> by{" "}
							<PRHeadshotName person={pr.author} />
							{/* <Role className="ml-5">Maintainer</Role> */}
						</div>
						<div style={{ marginLeft: "auto" }}>
							<DropdownButton
								variant="secondary"
								splitDropdown
								items={[
									{ label: "Edit", key: "edit" },
									{ label: "Mark as draft", key: "draft" },
									{ label: "Close", key: "close" }
								]}
							>
								Edit
							</DropdownButton>
						</div>
					</Header>
					<PRTitle>
						{pr.title}{" "}
						<Tooltip title="Open on GitLab" placement="top">
							<span>
								<Link href={pr.url}>
									#{pr.iid}
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
					<Tabs style={{ marginTop: 0 }}>
						<Tab onClick={e => setActiveTab(1)} active={activeTab == 1}>
							<Icon className="narrow-text" name="comment" />
							<span className="wide-text">Overview</span>
							<PRBadge>{numComments}</PRBadge>
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
							<PRPlusMinus>
								<span className="added">
									+
									{!pr.files
										? 0
										: pr.files.nodes
												.map(_ => _.additions)
												.reduce((acc, val) => acc + val, 0)
												.toString()
												.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
								</span>{" "}
								<span className="deleted">
									-
									{!pr.files
										? 0
										: pr.files.nodes
												.map(_ => _.deletions)
												.reduce((acc, val) => acc + val, 0)
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
								// <PullRequestConversationTab
								// 	ghRepo={ghRepo}
								// 	fetch={fetch}
								// 	autoCheckedMergeability={autoCheckedMergeability}
								// 	checkMergeabilityStatus={() => {}}
								// 	setIsLoadingMessage={setIsLoadingMessage}
								// />
								<>
									{pr && (
										<OutlineBox>
											<Icon name="pull-request" className="bigger" />
											<div>
												<b>Request to merge</b>{" "}
												<Link href={`${pr.repository.url}/-/tree/${pr.sourceBranch}`}>
													<PRBranch>{pr.sourceBranch}</PRBranch>
												</Link>{" "}
												<b>into</b>{" "}
												<Link href={`${pr.repository.url}/-/tree/${pr.targetBranch}`}>
													<PRBranch>{pr.targetBranch}</PRBranch>
												</Link>
											</div>
											<div className="right">
												<Button className="margin-right-10" variant="secondary">
													{isLoadingBranch ? (
														<Icon name="sync" className="spin" />
													) : (
														<span onClick={checkout}>
															<Tooltip
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
																placement="top"
															>
																<span>
																	<Icon className="narrow-text" name="git-branch" />
																	<span className="wide-text">Check out branch</span>
																</span>
															</Tooltip>
														</span>
													)}
												</Button>
												<DropdownButton
													title="Download as"
													variant="secondary"
													items={[
														{
															label: "Email patches",
															key: "email",
															action: () => {
																HostApi.instance.send(OpenUrlRequestType, {
																	url: `${pr.repository.url}/-/merge_requests/${pr.iid}.patch`
																});
															}
														},
														{
															label: "Plain diff",
															key: "plain",
															action: () => {
																HostApi.instance.send(OpenUrlRequestType, {
																	url: `${pr.repository.url}/-/merge_requests/${pr.iid}.diff`
																});
															}
														}
													]}
												>
													<Icon name="download" title="Download..." placement="top" />
												</DropdownButton>
											</div>
										</OutlineBox>
									)}
									<Container>
										<Left>
											{pr.discussions.nodes.map((_: any) => {
												if (_.type === "merge-request") {
													return (
														<div>
															{_.createdAt}
															mr: <pre>{JSON.stringify(_, null, 2)}</pre>
															<br />
															<br />
														</div>
													);
												} else if (_.type === "milestone") {
													return (
														<div>
															{_.milestone}
															label:<pre>{JSON.stringify(_, null, 2)}</pre>
															<br />
															<br />
														</div>
													);
												} else if (_.type === "label") {
													return (
														<div>
															{_.createdAt}
															label:<pre>{JSON.stringify(_, null, 2)}</pre>
															<br />
															<br />
														</div>
													);
												} else if (_.notes && _.notes.nodes && _.notes.nodes.length) {
													return (
														<Box>
															{_.notes.nodes.map(x => {
																return (
																	<>
																		<BigRoundImg>
																			<img
																				style={{ float: "left" }}
																				alt="headshot"
																				src={x.author.avatarUrl}
																			/>
																		</BigRoundImg>
																		{/* <div style={{ float: "right" }}>
																		<Role>Maintainer</Role> 
																			(S) (R) (Edit) (dots)
																		</div>*/}
																		<div>
																			<b>{x.author.name}</b> @{x.author.username} &middot;{" "}
																			<Timestamp time={x.createdAt} />
																		</div>
																		<div style={{ paddingTop: "15px" }}>
																			{x.body}
																			<br /> id: {x.id}
																			<br />
																			iid {x.iid}
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
																				deleteThis!
																			</a>
																			<br />
																			<pre>{JSON.stringify(x, null, 2)}</pre>
																		</div>
																	</>
																);
															})}
														</Box>
													);
												} else {
													console.warn("why here?", _);
													return undefined;
												}
											})}
											<PullRequestBottomComment
												pr={pr}
												setIsLoadingMessage={setIsLoadingMessage}
												__onDidRender={__onDidRender}
											/>
										</Left>
										{/* <Right>
											<AsideBlock>
												<div>
													0 Assignees <span style={{ float: "right" }}>Edit</span>
												</div>
												<div>None - assign yourself</div>
											</AsideBlock>
											<AsideBlock>
												<div>
													Milestone <span style={{ float: "right" }}>Edit</span>
												</div>
												<div>None</div>
											</AsideBlock>
										</Right> */}
									</Container>
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
					<PullRequestFileComments
						pr={pr as any}
						fetch={fetch}
						setIsLoadingMessage={setIsLoadingMessage}
						commentId={derivedState.currentPullRequestCommentId}
						quote={() => {}}
						onClose={closeFileComments}
					/>
				)}
			</Root>
		</ThemeProvider>
	);
};
