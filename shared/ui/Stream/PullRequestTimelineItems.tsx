import { CompareLocalFilesRequestType } from "@codestream/protocols/webview";
import { getProviderPullRequestRepo } from "@codestream/webview/store/providerPullRequests/reducer";
import {
	PRComment,
	PRCommentCard,
	PRCommentHeader,
	PRAuthor,
	PRActionIcons,
	PRCommentBody,
	PRTimelineItem,
	PRTimelineItemBody,
	PRBranch,
	PRActionCommentCard,
	PRCodeComment,
	PRThreadedCommentCard,
	PRCodeCommentPatch,
	PRKebabIcon,
	PRIconOutdated
} from "./PullRequestComponents";
import React, { PropsWithChildren, useCallback, useState } from "react";
import { PRHeadshot, Headshot } from "../src/components/Headshot";
import Timestamp from "./Timestamp";
import Icon from "./Icon";
import { MarkdownText } from "./MarkdownText";
import {
	FetchThirdPartyPullRequestPullRequest,
	GetReposScmRequestType
} from "@codestream/protocols/agent";
import Tag from "./Tag";
import { Link } from "./Link";
import { PRHeadshotName } from "../src/components/HeadshotName";
import { PRAuthorBadges } from "./PullRequestConversationTab";
import * as Path from "path-browserify";
import { PullRequestReactButton, PullRequestReactions } from "./PullRequestReactions";
import { HostApi } from "../webview-api";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "../store";
import { CSMe } from "@codestream/protocols/api";
import { SmartFormattedList } from "./SmartFormattedList";
import { PullRequestCommentMenu } from "./PullRequestCommentMenu";
import { PullRequestMinimizedComment } from "./PullRequestMinimizedComment";
import { PullRequestPatch } from "./PullRequestPatch";
import { PullRequestFinishReview } from "./PullRequestFinishReview";
import { PullRequestEditingComment } from "./PullRequestEditingComment";
import { api } from "../store/providerPullRequests/actions";
import { PullRequestCodeComment } from "./PullRequestCodeComment";
import * as path from "path-browserify";
import { Range } from "vscode-languageserver-types";
import { EditorRevealRangeRequestType } from "@codestream/protocols/webview";
import Tooltip from "./Tooltip";

export const GHOST = {
	login: "ghost",
	avatarUrl:
		"https://avatars2.githubusercontent.com/u/10137?s=460&u=b1951d34a583cf12ec0d3b0781ba19be97726318&v=4"
};

const ReviewIcons = {
	APPROVED: <Icon name="check" className="circled green" />,
	CHANGES_REQUESTED: <Icon name="plus-minus" className="circled red" />,
	COMMENTED: <Icon name="eye" className="circled" />,
	DISMISSED: <Icon name="x" className="circled" />,
	PENDING: <Icon name="eye" className="circled" />
};

interface Props {
	pr: FetchThirdPartyPullRequestPullRequest;
	setIsLoadingMessage: Function;
	fetch: Function;
	quote: Function;
}

export const PullRequestTimelineItems = (props: PropsWithChildren<Props>) => {
	const { pr, setIsLoadingMessage, fetch } = props;
	if (!pr || !pr.timelineItems) return null;
	const dispatch = useDispatch();

	const [reviewOption, setReviewOption] = useState("COMMENT");
	const [reviewOptionText, setReviewOptionText] = useState("");
	const [openComments, setOpenComments] = useState({});
	const [pendingComments, setPendingComments] = useState({});
	const [editingComments, setEditingComments] = useState({});
	const [expandedComments, setExpandedComments] = useState({});

	// const [pendingComment, setPendingComment] = useState("");
	// const submitReview = async (event?: React.SyntheticEvent) => {
	// 	await dispatch(api(
	// 		"submitReview",

	// 		{
	// 			text: reviewOptionText,
	// 			eventType: reviewOption
	// 		}
	// 	));
	// 	props.fetch();
	// };

	// const cancelReview = async (event?: React.SyntheticEvent) => {
	// 	await dispatch(api(
	// 		"submitReview",

	// 		{
	// 			text: reviewOptionText,
	// 			eventType: "DISMISS"
	// 		}
	// 	));

	// 	props.fetch();
	// };

	const doneEditingComment = id => {
		setEditingComments({ ...editingComments, [id]: false });
	};

	const handleTextInputFocus = async (databaseCommentId: number) => {
		setOpenComments({
			...openComments,
			[databaseCommentId]: true
		});
	};

	const setEditingComment = (comment, value) => {
		setEditingComments({
			...editingComments,
			[comment.id]: value
		});
		setPendingComments({
			...pendingComments,
			[comment.id]: value ? comment.body : ""
		});
	};

	const expandComment = id => {
		setExpandedComments({
			...expandedComments,
			[id]: !expandedComments[id]
		});
	};

	const derivedState = useSelector((state: CodeStreamState) => {
		const currentUser = state.users[state.session.userId!] as CSMe;
		return {
			currentUser,
			currentRepo: getProviderPullRequestRepo(state)
		};
	});

	const [currentRepoRoot, setCurrentRepoRoot] = React.useState("");

	const timelineNodes = pr.timelineItems.nodes;
	return (
		<div>
			<PRComment style={{ marginTop: "10px" }}>
				<PRHeadshot person={pr.author} size={40} />
				<PRCommentCard className="dark-header">
					<PRCommentHeader>
						<div>
							<PRAuthor>{pr.author.login}</PRAuthor> commented{" "}
							<Timestamp time={pr.createdAt!} relative />
							{pr.includesCreatedEdit ? <> • edited</> : ""}
						</div>
						<PRActionIcons>
							<PRAuthorBadges pr={pr} node={pr} />
							<PullRequestReactButton
								pr={pr}
								targetId={pr.id}
								setIsLoadingMessage={setIsLoadingMessage}
								reactionGroups={pr.reactionGroups}
							/>
							<PullRequestCommentMenu
								pr={pr}
								node={pr}
								nodeType={"ROOT_COMMENT"}
								fetch={fetch}
								setIsLoadingMessage={setIsLoadingMessage}
								setEdit={setEditingComment}
								quote={props.quote}
							/>
						</PRActionIcons>
					</PRCommentHeader>
					<PRCommentBody>
						{editingComments[pr.id] ? (
							<PullRequestEditingComment
								pr={pr}
								setIsLoadingMessage={setIsLoadingMessage}
								id={pr.id}
								type={"PR"}
								text={pendingComments[pr.id]}
								done={() => doneEditingComment(pr.id)}
							/>
						) : pr.bodyHTML || pr.body ? (
							<MarkdownText
								text={pr.bodyHTML ? pr.bodyHTML : pr.body}
								isHtml={pr.bodyHTML ? true : false}
								inline
							/>
						) : (
							<i>No description provided.</i>
						)}
					</PRCommentBody>

					<PullRequestReactions
						pr={pr}
						targetId={pr.id}
						setIsLoadingMessage={setIsLoadingMessage}
						reactionGroups={pr.reactionGroups}
					/>
				</PRCommentCard>
			</PRComment>

			{timelineNodes.map((item, index) => {
				const author = item.author || GHOST;
				// console.warn("ITEM: ", index, item);
				switch (item.__typename) {
					case "IssueComment":
						return (
							<PRComment key={index}>
								<PRHeadshot key={index} size={40} person={author} />
								<PRCommentCard className={`dark-header${item.isMinimized ? " no-arrow" : ""}`}>
									{item.isMinimized && !expandedComments[item.id] ? (
										<PullRequestMinimizedComment
											reason={item.minimizedReason}
											onClick={() => expandComment(item.id)}
										/>
									) : (
										<>
											<PRCommentHeader>
												<div>
													<PRAuthor>{author.login}</PRAuthor> commented{" "}
													<Timestamp time={item.createdAt!} relative />
													{item.includesCreatedEdit ? <> • edited</> : ""}
												</div>
												<PRActionIcons>
													<PRAuthorBadges pr={pr} node={item} />
													<PullRequestReactButton
														pr={pr}
														targetId={item.id}
														setIsLoadingMessage={setIsLoadingMessage}
														reactionGroups={item.reactionGroups}
													/>
													<PullRequestCommentMenu
														pr={pr}
														fetch={fetch}
														setIsLoadingMessage={setIsLoadingMessage}
														node={item}
														nodeType="ISSUE_COMMENT"
														viewerCanDelete={item.viewerCanDelete}
														setEdit={setEditingComment}
														quote={props.quote}
													/>
												</PRActionIcons>
											</PRCommentHeader>
											<PRCommentBody>
												{editingComments[item.id] ? (
													<PullRequestEditingComment
														pr={pr}
														setIsLoadingMessage={setIsLoadingMessage}
														id={item.id}
														type={"ISSUE"}
														text={pendingComments[item.id]}
														done={() => doneEditingComment(item.id)}
													/>
												) : (
													<MarkdownText
														text={item.bodyHTML ? item.bodyHTML : item.bodyText}
														isHtml={item.bodyHTML ? true : false}
														inline
													/>
												)}
											</PRCommentBody>
											<PullRequestReactions
												pr={pr}
												targetId={item.id}
												setIsLoadingMessage={setIsLoadingMessage}
												reactionGroups={item.reactionGroups}
											/>
										</>
									)}
								</PRCommentCard>
							</PRComment>
						);
					case "PullRequestReview": {
						const reviewIcon = ReviewIcons[item.state];
						return (
							<PRComment key={index} className={`review-${item.state}`}>
								<PRTimelineItem key={index}>
									<PRHeadshot key={index} size={40} person={author} />
									{reviewIcon}
									<PRTimelineItemBody>
										<PRAuthor>{author.login}</PRAuthor>{" "}
										{item.state === "APPROVED" && "approved this review"}
										{item.state === "CHANGES_REQUESTED" && "requested changes"}
										{item.state === "COMMENTED" && "reviewed"}
										{item.state === "DISMISSED" && "dismissed this review"}
										{item.state === "PENDING" && "started a review"}
										<Timestamp time={item.createdAt!} relative />
									</PRTimelineItemBody>
								</PRTimelineItem>
								{item.state === "PENDING" && (
									<PullRequestFinishReview
										pr={pr}
										mode="timeline"
										fetch={fetch}
										setIsLoadingMessage={setIsLoadingMessage}
									/>
								)}
								{item.bodyHTML && (
									<PRActionCommentCard className="dark-header">
										{item.isMinimized && !expandedComments[item.id] ? (
											<PullRequestMinimizedComment
												reason={item.minimizedReason}
												onClick={() => expandComment(item.id)}
											/>
										) : (
											<>
												<PRCommentHeader>
													<div>
														<PRAuthor>{author.login}</PRAuthor> commented{" "}
														<Timestamp time={item.createdAt!} relative />
														{item.includesCreatedEdit ? <> • edited</> : ""}
													</div>
													<PRActionIcons>
														<PRAuthorBadges pr={pr} node={item} />
														<PullRequestReactButton
															pr={pr}
															targetId={item.id}
															setIsLoadingMessage={setIsLoadingMessage}
															reactionGroups={item.reactionGroups}
														/>
														<PullRequestCommentMenu
															pr={pr}
															fetch={fetch}
															setIsLoadingMessage={setIsLoadingMessage}
															node={item}
															nodeType="REVIEW"
															viewerCanDelete={item.viewerCanDelete && item.state === "PENDING"}
															setEdit={setEditingComment}
															quote={props.quote}
															isPending={item.state === "PENDING"}
														/>
													</PRActionIcons>
												</PRCommentHeader>

												<PRCommentBody>
													{editingComments[item.id] ? (
														<PullRequestEditingComment
															pr={pr}
															setIsLoadingMessage={setIsLoadingMessage}
															id={item.id}
															type={"REVIEW"}
															text={pendingComments[item.id]}
															done={() => doneEditingComment(item.id)}
														/>
													) : (
														<MarkdownText
															text={item.bodyHTML ? item.bodyHTML : item.bodyText}
															isHtml={item.bodyHTML ? true : false}
															inline
														/>
													)}
												</PRCommentBody>
												<PullRequestReactions
													pr={pr}
													targetId={item.id}
													setIsLoadingMessage={setIsLoadingMessage}
													reactionGroups={item.reactionGroups}
												/>
											</>
										)}
									</PRActionCommentCard>
								)}
								{item.comments && item.comments.nodes && (
									<>
										{item.comments.nodes.map((comment, commentIndex) => {
											if (comment.isResolved && !expandedComments[`resolved-${comment.id}`]) {
												return (
													<PullRequestMinimizedComment
														reason={comment.path}
														isResolved
														className="outline"
														onClick={() => expandComment(`resolved-${comment.id}`)}
														key={`min-${comment.id}`}
													/>
												);
											}
											let extension = Path.extname(comment.path).toLowerCase();
											if (extension.startsWith(".")) {
												extension = extension.substring(1);
											}

											let startLine = 1;
											if (comment.diffHunk) {
												// this data looks like this => `@@ -234,3 +234,20 @@`
												const match = comment.diffHunk.match("@@ (.+) (.+) @@");
												if (match && match.length >= 2) {
													try {
														// the @@ line is actually not the first line... so subtract 1
														startLine = parseInt(match[2].split(",")[0].replace("+", ""), 10) - 1;
													} catch {}
												}
											}

											const openFile = async filePath => {
												let repoRoot = currentRepoRoot;
												if (!repoRoot) {
													const response = await HostApi.instance.send(GetReposScmRequestType, {
														inEditorOnly: false
													});
													if (!response.repositories) return;
													const currentRepoInfo = response.repositories.find(
														r => r.id === derivedState.currentRepo!.id
													);
													if (currentRepoInfo) {
														setCurrentRepoRoot(currentRepoInfo.path);
														repoRoot = currentRepoInfo.path;
													}
												}

												const result = await HostApi.instance.send(EditorRevealRangeRequestType, {
													uri: path.join("file://", repoRoot, filePath),
													range: Range.create(startLine, 0, startLine, 0)
												});

												// if (!result.success) {
												// 	setErrorMessage("Could not open file");
												// }

												HostApi.instance.track("PR File Viewed From Timeline", {
													Host: props.pr && props.pr.providerId
												});
											};

											const goDiff = async filePath => {
												const request = {
													baseBranch: pr.baseRefName,
													baseSha: pr.forkPointSha || "",
													headBranch: props.pr.headRefName,
													headSha: props.pr.headRefOid,
													filePath,
													repoId: derivedState.currentRepo!.id!
												};

												try {
													await HostApi.instance.send(CompareLocalFilesRequestType, request);
												} catch (err) {}
											};

											return (
												<PRThreadedCommentCard key={commentIndex}>
													<PRCodeComment>
														<div className="row-with-icon-actions monospace ellipsis-left-container no-hover with-action-icons">
															<Icon name="file" />
															<span className="file-info ellipsis-left">
																<Tooltip title="Open Diff" placement="bottom" delay={1}>
																	<bdi
																		dir="ltr"
																		className={pr.forkPointSha ? "link" : ""}
																		onClick={
																			pr.forkPointSha
																				? async e => {
																						e.preventDefault();
																						goDiff(comment.path);
																				  }
																				: undefined
																		}
																	>
																		{comment.path}
																	</bdi>
																</Tooltip>
															</span>
															{comment.outdated && <PRIconOutdated>Outdated</PRIconOutdated>}
															<div className="actions" style={{ right: 0 }}>
																<Link
																	href={pr.url.replace(
																		/\/pull\/\d+$/,
																		`/blob/${pr.headRefOid}/${comment.path}`
																	)}
																>
																	<Icon
																		title="Open File on Remote"
																		placement="bottom"
																		name="link-external"
																		className="clickable margin-right"
																	/>
																</Link>
																<Icon
																	name="goto-file"
																	className="clickable"
																	title="Open Local File"
																	placement="bottom"
																	delay={1}
																	onClick={async e => {
																		e.stopPropagation();
																		e.preventDefault();
																		openFile(comment.path);
																	}}
																/>
															</div>
														</div>
														<PRCodeCommentPatch>
															<PullRequestPatch
																patch={comment.diffHunk}
																filename={comment.path}
																truncateLargePatches
															/>
														</PRCodeCommentPatch>
														<PullRequestCodeComment
															pr={pr}
															fetch={fetch}
															setIsLoadingMessage={setIsLoadingMessage}
															item={item}
															comment={comment}
															author={author}
															skipResolvedCheck
														/>
													</PRCodeComment>
												</PRThreadedCommentCard>
											);
										})}
									</>
								)}
							</PRComment>
						);
					}
					case "ReviewRequestedEvent": {
						return (
							<PRTimelineItem key={index} className="tall">
								<Icon name="review" className="circled" />
								<PRTimelineItemBody>
									<PRHeadshotName key={index} person={item.actor} />
									requested a review from{" "}
									<b>{item.requestedReviewer ? item.requestedReviewer.login : "a team"}</b>
									<Timestamp time={item.createdAt!} relative />
								</PRTimelineItemBody>
							</PRTimelineItem>
						);
					}
					case "PullRequestCommit": {
						// look ahead to see how many commits there are in a row
						let futureCommitCount = 0;
						let i = index + 1;
						let authors: string[] = [];
						if (index == 0 || timelineNodes[index - 1].__typename !== "PullRequestCommit") {
							authors.push(item.commit.author.name);
							while (
								timelineNodes[i] &&
								timelineNodes[i] &&
								timelineNodes[i].__typename === "PullRequestCommit"
							) {
								authors.push(timelineNodes[i].commit.author.name);
								futureCommitCount++;
								i++;
							}
						}
						const { author, committer } = item.commit;

						return (
							<div key={index}>
								{futureCommitCount > 0 && (
									<PRTimelineItem key={`commits-{index}`} className="tall-top">
										<Icon name="repo-push" className="circled" />
										<PRTimelineItemBody>
											<SmartFormattedList value={[...new Set(authors)]} /> added{" "}
											{futureCommitCount + 1} commits
											<Timestamp time={item.commit.authoredDate!} relative />
										</PRTimelineItemBody>
									</PRTimelineItem>
								)}
								<PRTimelineItem key={index}>
									<Icon name="git-commit" />
									<PRHeadshot key={index} size={20} person={author} />
									{committer && author.name !== committer.name && (
										<PRHeadshot className="left-pad" size={20} person={committer} />
									)}

									<PRTimelineItemBody>
										<div className="monospace left-pad break-word">
											<Link
												href={`${pr.url}/commits/${item.commit.abbreviatedOid}`}
												className="monospace"
											>
												<MarkdownText inline excludeOnlyEmoji text={item.commit.message || ""} />
											</Link>
										</div>
									</PRTimelineItemBody>
									<div className="monospace sha">
										<Link
											href={`${pr.url}/commits/${item.commit.abbreviatedOid}`}
											className="monospace"
										>
											{item.commit.abbreviatedOid}
										</Link>
									</div>
								</PRTimelineItem>
							</div>
						);
					}
					case "ReferencedEvent": {
						const commitUrl = pr.url.replace(
							/\/pull\/\d+$/,
							`/commit/${item.commit.abbreviatedOid}`
						);
						const { author, committer } = item.commit;
						return (
							<>
								<PRTimelineItem key={index} className="tall">
									<Icon name="cross-reference" className="circled" />
									<PRTimelineItemBody>
										<PRHeadshotName key={index} person={item.actor} />
										added a commit that referenced this pull request
										<Timestamp time={item.createdAt!} relative />
										<div style={{ display: "flex", alignItems: "flex-start", marginTop: "10px" }}>
											<PRHeadshot key={index} size={20} person={author} />
											{committer && author.name !== committer.name && (
												<PRHeadshot className="left-pad" size={20} person={committer} />
											)}
											<div className="monospace left-pad">
												<Link href={commitUrl} className="monospace">
													<MarkdownText
														inline
														excludeOnlyEmoji
														text={item.commit.messageHeadline || ""}
													/>
												</Link>
												<PRKebabIcon onClick={() => expandComment(item.commit.abbreviatedOid)}>
													<Icon name="kebab-horizontal" className="no-flex clickable" />
												</PRKebabIcon>

												{expandedComments[item.commit.abbreviatedOid] && (
													<>
														<br />
														<br />
														<MarkdownText
															inline
															excludeOnlyEmoji
															text={item.commit.messageBody || ""}
														/>
													</>
												)}
											</div>
											<div className="monospace sha">
												<Link href={commitUrl} className="monospace">
													{item.commit.abbreviatedOid}
												</Link>
											</div>
										</div>
									</PRTimelineItemBody>
								</PRTimelineItem>
							</>
						);
					}
					case "AssignedEvent": {
						return (
							<PRTimelineItem key={index} className="tall">
								<Icon name="person" className="circled" />
								<PRTimelineItemBody>
									<PRHeadshotName key={index} size={20} person={item.actor} />
									{item.actor.login === item.assignee.login ? (
										"self-assigned this"
									) : (
										<>
											assigned <b>{item.assignee.login}</b>
										</>
									)}

									<Timestamp time={item.createdAt!} relative />
								</PRTimelineItemBody>
							</PRTimelineItem>
						);
					}
					case "UnassignedEvent": {
						return (
							<PRTimelineItem key={index} className="tall">
								<Icon name="person" className="circled" />
								<PRTimelineItemBody>
									<PRHeadshotName key={index} person={item.actor} />
									unassigned <b>{item.assignee.login}</b>
									<Timestamp time={item.createdAt!} relative />
								</PRTimelineItemBody>
							</PRTimelineItem>
						);
					}
					case "MergedEvent": {
						return (
							<PRTimelineItem key={index} className="tall">
								<Icon name="git-merge" className="circled" />
								<PRTimelineItemBody>
									<PRHeadshotName key={index} person={item.actor} />
									merged commit <PRBranch>{item.commit.abbreviatedOid}</PRBranch> into{" "}
									<PRBranch>{item.mergeRefName}</PRBranch>
									<Timestamp time={item.createdAt!} relative />
								</PRTimelineItemBody>
							</PRTimelineItem>
						);
					}
					case "LabeledEvent": {
						return (
							<PRTimelineItem key={index} className="tall">
								<Icon name="tag" className="circled" />
								<PRTimelineItemBody>
									<PRHeadshotName key={index} person={item.actor} />
									added
									<Tag tag={{ label: item.label.name, color: `#${item.label.color}` }} />
									<Timestamp time={item.createdAt!} relative />
								</PRTimelineItemBody>
							</PRTimelineItem>
						);
					}
					case "UnlabeledEvent": {
						return (
							<PRTimelineItem key={index} className="tall">
								<Icon name="tag" className="circled" />
								<PRTimelineItemBody>
									<PRHeadshotName key={index} person={item.actor} />
									removed
									<Tag tag={{ label: item.label.name, color: `#${item.label.color}` }} />
									<Timestamp time={item.createdAt!} relative />
								</PRTimelineItemBody>
							</PRTimelineItem>
						);
					}
					case "RenamedTitleEvent": {
						return (
							<PRTimelineItem key={index} className="tall">
								<Icon name="pencil" className="circled" />
								<PRTimelineItemBody>
									<PRHeadshotName key={index} person={item.actor} />
									changed the title <s>{item.previousTitle}</s> {item.currentTitle}
									<Timestamp time={item.createdAt!} relative />
								</PRTimelineItemBody>
							</PRTimelineItem>
						);
					}
					case "LockedEvent": {
						const map = {
							OFF_TOPIC: "off-topic",
							SPAM: "spam",
							TOO_HEATED: "too heated",
							RESOLVED: "resolved"
						};
						return (
							<PRTimelineItem key={index} className="tall">
								<Icon name="lock" className="circled gray" />
								<PRTimelineItemBody>
									<PRHeadshotName key={index} person={item.actor} />
									locked{" "}
									{map[item.lockReason] ? (
										<>
											as <b>{map[item.lockReason]}</b>
										</>
									) : (
										""
									)}{" "}
									and limited conversation to collaborators
									<Timestamp time={item.createdAt!} relative />
								</PRTimelineItemBody>
							</PRTimelineItem>
						);
					}
					case "UnlockedEvent": {
						return (
							<PRTimelineItem key={index} className="tall">
								<Icon name="key" className="circled gray" />
								<PRTimelineItemBody>
									<PRHeadshotName key={index} person={item.actor} />
									unlocked this conversation
									<Timestamp time={item.createdAt!} relative />
								</PRTimelineItemBody>
							</PRTimelineItem>
						);
					}
					case "ClosedEvent": {
						if (pr.state === "MERGED") {
							return (
								<div key={index}>
									<PRTimelineItem key={index} className="tall">
										<Icon name="git-merge" className="circled purple" />
										<PRTimelineItemBody>
											<PRHeadshotName key={index} person={item.actor} />
											merged this
											<Timestamp time={item.createdAt!} relative />
										</PRTimelineItemBody>
									</PRTimelineItem>
									{/* <PRFoot /> */}
								</div>
							);
						} else {
							return (
								<div key={index}>
									<PRTimelineItem key={index} className="tall">
										<Icon name="circle-slash" className="circled red" />
										<PRTimelineItemBody>
											<PRHeadshotName key={index} person={item.actor} />
											closed this
											<Timestamp time={item.createdAt!} relative />
										</PRTimelineItemBody>
									</PRTimelineItem>
									{/* <PRFoot /> */}
								</div>
							);
						}
					}
					case "ReopenedEvent": {
						return (
							<PRTimelineItem key={index} className="tall">
								<Icon name="circle" className="circled green" />
								<PRTimelineItemBody>
									<PRHeadshotName key={index} person={item.actor} />
									reopened this
									<Timestamp time={item.createdAt!} relative />
								</PRTimelineItemBody>
							</PRTimelineItem>
						);
					}
					case "MilestonedEvent": {
						return (
							<PRTimelineItem key={index} className="tall">
								<Icon name="milestone" className="circled" />
								<PRTimelineItemBody>
									<PRHeadshotName key={index} person={item.actor} />
									added this to the <b>{item.milestoneTitle}</b> milestone
									<Timestamp time={item.createdAt!} relative />
								</PRTimelineItemBody>
							</PRTimelineItem>
						);
					}
					case "DemilestonedEvent": {
						return (
							<PRTimelineItem key={index} className="tall">
								<Icon name="milestone" className="circled" />
								<PRTimelineItemBody>
									<PRHeadshotName key={index} person={item.actor} />
									removed milestone <b>{item.milestoneTitle}</b>
									<Timestamp time={item.createdAt!} relative />
								</PRTimelineItemBody>
							</PRTimelineItem>
						);
					}
					case "HeadRefForcePushedEvent":
					case "BaseRefForcePushedEvent": {
						return (
							<PRTimelineItem key={index} className="tall">
								<Icon name="milestone" className="circled" />
								<PRTimelineItemBody>
									<PRHeadshotName key={index} person={item.actor} />
									force-pushed the{" "}
									{item.ref && item.ref.name && <PRBranch>{item.ref.name}</PRBranch>} branch from{" "}
									<PRBranch>{item.beforeCommit.abbreviatedOid}</PRBranch> to{" "}
									<PRBranch>{item.afterCommit.abbreviatedOid}</PRBranch>
									<Timestamp time={item.createdAt!} relative />
								</PRTimelineItemBody>
							</PRTimelineItem>
						);
					}
					case "ReviewDismissedEvent": {
						return (
							<>
								<PRTimelineItem key={index} className="tall">
									<Icon name="x" className="circled" />
									<PRTimelineItemBody>
										<PRHeadshotName key={index} person={item.actor} />
										dismissed <b>{item.review.author.login}</b>'s review
										<Timestamp time={item.createdAt!} relative />
										<PRActionCommentCard className="dark-header shift-left">
											{item.dismissalMessage}
										</PRActionCommentCard>
									</PRTimelineItemBody>
								</PRTimelineItem>
							</>
						);
					}
					default: {
						console.warn(`timelineItem not found: ${item.__typename} item is: `, item);
						return null;
					}
				}
			})}
		</div>
	);
};
