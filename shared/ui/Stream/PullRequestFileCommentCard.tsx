import {
	PRActionIcons,
	PRButtonRow,
	PRCodeCommentBody,
	PRCodeCommentWrapper,
	PRThreadedCommentHeader
} from "./PullRequestComponents";
import React, { PropsWithChildren, useState, useEffect } from "react";
import Timestamp from "./Timestamp";
import Icon from "./Icon";
import { MarkdownText } from "./MarkdownText";
import {
	FetchThirdPartyPullRequestPullRequest,
	GetReposScmRequestType
} from "@codestream/protocols/agent";
import { PRAuthorBadges } from "./PullRequestConversationTab";
import { PullRequestReactButton, PullRequestReactions } from "./PullRequestReactions";
import { PullRequestCommentMenu } from "./PullRequestCommentMenu";
import { PullRequestMinimizedComment } from "./PullRequestMinimizedComment";
import { PullRequestEditingComment } from "./PullRequestEditingComment";
import { PullRequestReplyComment } from "./PullRequestReplyComment";
import { Button } from "../src/components/Button";
import { api } from "../store/providerPullRequests/actions";
import { useDispatch, useSelector } from "react-redux";
import { GHOST } from "./PullRequestTimelineItems";
import { prettyPrintOne } from "code-prettify";
import { escapeHtml } from "../utils";
import * as Path from "path-browserify";
import styled from "styled-components";
import { HostApi } from "..";
import { CodeStreamState } from "@codestream/webview/store";
import { CompareLocalFilesRequestType } from "../ipc/host.protocol";
import {
	getProviderPullRequestCollaborators,
	getProviderPullRequestRepo,
	getPullRequestId
} from "../store/providerPullRequests/reducer";
import {
	EditorHighlightRangeRequestType,
	EditorRevealRangeRequestType
} from "@codestream/protocols/webview";
import { EditorScrollToNotificationType } from "../ipc/webview.protocol";
import { Range, Position } from "vscode-languageserver-types";
import { useDidMount } from "../utilities/hooks";
import { isEmpty } from "lodash-es";

const PRBranchContainer = styled.div`
	display: inline-block;
	font-family: Menlo, Consolas, "DejaVu Sans Mono", monospace;
	color: var(--text-color-subtle);
`;

const CodeBlockContainerIcons = styled.div`
	display: flex;
	margin-bottom: 5px;
	color: var(--text-color-subtle) !important;
`;

interface Props {
	pr: FetchThirdPartyPullRequestPullRequest;
	mode?: string;
	setIsLoadingMessage: Function;
	review: any;
	comment: any;
	author: any;
	skipResolvedCheck?: boolean;
	isFirst?: boolean;
	fileInfo?: any;
	prCommitsRange?: string[];
	cardIndex: any;
	commentRef: any;
	clickedComment: boolean;
}

export const PullRequestFileCommentCard = (props: PropsWithChildren<Props>) => {
	const {
		review,
		cardIndex,
		prCommitsRange,
		fileInfo,
		comment,
		author,
		setIsLoadingMessage,
		pr,
		commentRef,
		clickedComment
	} = props;
	const dispatch = useDispatch();
	const myRef = React.useRef(null);

	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			providerPullRequests: state.providerPullRequests.pullRequests,
			pullRequestFilesChangedMode: state.preferences.pullRequestFilesChangedMode || "files",
			currentPullRequestProviderId: state.context.currentPullRequest
				? state.context.currentPullRequest.providerId
				: undefined,
			currentPullRequestId: state.context.currentPullRequest
				? state.context.currentPullRequest.id
				: undefined,
			currentRepo: getProviderPullRequestRepo(state),
			pullRequestId: getPullRequestId(state),
			documentMarkers: state.documentMarkers[state.editorContext.textEditorUri || ""] || [],
			textEditorUri: state.editorContext.textEditorUri,
			collaborators: getProviderPullRequestCollaborators(state)
		};
	});

	const [openComments, setOpenComments] = useState({});
	const [pendingComments, setPendingComments] = useState({});
	const [editingComments, setEditingComments] = useState({});
	const [expandedComments, setExpandedComments] = useState({});
	const [isResolving, setIsResolving] = useState(false);
	const [currentRepoRoot, setCurrentRepoRoot] = useState("");
	const [pendingLineNavigation, setPendingLineNavigation] = useState(false);
	const [pendingLineNavigationAndUriChange, setPendingLineNavigationAndUriChange] = useState(false);
	const [commentRange, setCommentRange] = useState({});

	useDidMount(() => {
		if (clickedComment) {
			handleDiffClick();
			//@ts-ignore
			myRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	});

	useEffect(() => {
		if (
			derivedState.documentMarkers.length > 0 &&
			// all files in array will have same file value
			derivedState.documentMarkers[0]?.file === fileInfo?.filename
		) {
			let _docMarkers = derivedState.documentMarkers;
			//@ts-ignore
			_docMarkers.sort((a, b) => (a?.range?.start?.line > b?.range?.start?.line ? 1 : -1));
			const marker = _docMarkers[cardIndex];
			//@ts-ignore
			setCommentRange(marker?.range);
		}
	}, [derivedState.documentMarkers]);

	//This hook and the one below it are similar.  This one handles
	//navigating to a new line after a diff click if the uri is already
	//open/doesn't change in the IDE.  Will not hit the navigate-to-line endpoint
	//unless all conditionals are met, and sets pendingLineNavigation to false
	//regardless.
	useEffect(() => {
		async function navigateToLineNumber() {
			const { textEditorUri } = derivedState;
			const isDiff = textEditorUri?.startsWith("codestream-diff://");
			if (textEditorUri && isDiff && !isEmpty(commentRange)) {
				await HostApi.instance.notify(EditorScrollToNotificationType, {
					uri: textEditorUri,
					//@ts-ignore
					position: Position.create(commentRange?.start?.line, 0)
				});
				setPendingLineNavigationAndUriChange(false);
			}
			setPendingLineNavigation(false);
		}

		if (pendingLineNavigation) {
			navigateToLineNumber();
		}
	}, [pendingLineNavigation]);

	//This hook and the one above it are similar.  This one handles
	//navigating to a new line after a diff click if the uri is not open/changes
	//from a different one in the IDE
	useEffect(() => {
		async function navigateToLineNumber() {
			const { textEditorUri } = derivedState;
			const isDiff = textEditorUri?.startsWith("codestream-diff://");
			if (textEditorUri && isDiff && !isEmpty(commentRange)) {
				await HostApi.instance.notify(EditorScrollToNotificationType, {
					uri: textEditorUri,
					//@ts-ignore
					position: Position.create(commentRange?.start?.line, 0)
				});
				setPendingLineNavigationAndUriChange(false);
			}
		}

		if (pendingLineNavigationAndUriChange) {
			navigateToLineNumber();
		}
	}, [derivedState.textEditorUri, commentRange]);

	const handleDiffClick = async () => {
		const request = {
			baseBranch: pr.baseRefName,
			baseSha: pr.baseRefOid,
			headBranch: pr.headRefName,
			headSha: pr.headRefOid,
			filePath: fileInfo?.filename,
			previousFilePath: fileInfo?.previousFilename,
			repoId: derivedState.currentRepo!.id!,
			context: pr
				? {
						pullRequest: {
							providerId: pr.providerId,
							id: derivedState.pullRequestId,
							collaborators: derivedState.collaborators
						}
				  }
				: undefined
		};
		try {
			await HostApi.instance.send(CompareLocalFilesRequestType, request);
		} catch (err) {
			console.warn(err);
		}

		HostApi.instance.track("PR Diff Viewed", {
			Host: pr && pr.providerId
		});

		setPendingLineNavigation(true);
		setPendingLineNavigationAndUriChange(true);
	};

	const handleOpenFile = async () => {
		let repoRoot = currentRepoRoot;
		if (!repoRoot) {
			const response = await HostApi.instance.send(GetReposScmRequestType, {
				inEditorOnly: false
			});
			if (!response.repositories) return;

			const repoIdToCheck = derivedState.currentRepo ? derivedState.currentRepo.id : undefined;
			if (repoIdToCheck) {
				const currentRepoInfo = response.repositories.find(r => r.id === repoIdToCheck);
				if (currentRepoInfo) {
					setCurrentRepoRoot(currentRepoInfo.path);
					repoRoot = currentRepoInfo.path;
				}
			}
		}

		const _lineNumber = lineNumber();
		const path = comment?.path || comment?.position?.filePath || "";

		if (repoRoot && _lineNumber) {
			HostApi.instance.send(EditorRevealRangeRequestType, {
				uri: Path.join("file://", repoRoot, path),
				range: Range.create(_lineNumber, 0, _lineNumber, 9999)
			});
		}

		HostApi.instance.track("PR Jump to Local File", {
			Host: pr && pr.providerId
		});
	};

	const handleResolve = async (e, threadId) => {
		try {
			setIsResolving(true);
			await dispatch(
				api("resolveReviewThread", {
					threadId: threadId
				})
			);
		} catch (ex) {
			console.warn(ex);
		} finally {
			setIsResolving(false);
		}
	};

	const handleUnresolve = async (e, threadId) => {
		try {
			setIsResolving(true);
			await dispatch(
				api("unresolveReviewThread", {
					threadId: threadId
				})
			);
		} catch (ex) {
			console.warn(ex);
		} finally {
			setIsResolving(false);
		}
	};

	let insertText: Function;
	let insertNewline: Function;
	let focusOnMessageInput: Function;

	const __onDidRender = functions => {
		insertText = functions.insertTextAtCursor;
		insertNewline = functions.insertNewlineAtCursor;
		focusOnMessageInput = functions.focus;
	};

	const quote = text => {
		if (!insertText) return;
		handleTextInputFocus(comment.databaseId);
		focusOnMessageInput &&
			focusOnMessageInput(() => {
				insertText && insertText(text.replace(/^/gm, "> ") + "\n");
				insertNewline && insertNewline();
			});
	};

	const codeBlock = () => {
		const path = comment?.path || comment?.position?.filePath || "";
		let extension = Path.extname(path).toLowerCase();
		let diffHunk = comment?.diffHunk || review?.diffHunk || comment?.position?.patch || "";

		if (extension.startsWith(".")) {
			extension = extension.substring(1);
		}

		const codeHTML = prettyPrintOne(escapeHtml(diffHunk), extension, lineNumber());
		return (
			<pre
				className="code prettyprint"
				data-scrollable="true"
				dangerouslySetInnerHTML={{ __html: codeHTML }}
				onClick={handleDiffClick}
			/>
		);
	};

	const lineNumber = () => {
		let rightLine = 0;

		if (!comment || !review) {
			return "";
		}

		let diffHunk = comment?.diffHunk || review?.diffHunk || comment?.position?.patch || "";
		let diffHunkNewLineLength = diffHunk.split("\n").length - 1;

		diffHunk.split("\n").map(d => {
			const matches = d.match(/@@ \-(\d+).*? \+(\d+)/);
			if (matches) {
				rightLine = parseInt(matches[2]);
			}
		});

		if (rightLine) {
			return rightLine;
		} else {
			return "";
		}
	};

	if (
		!props.skipResolvedCheck &&
		comment.isResolved &&
		!expandedComments[`resolved-${comment.id}`]
	) {
		return (
			<PullRequestMinimizedComment
				reason={"This conversation was marked as resolved"}
				isResolved
				onClick={() => expandComment(`resolved-${comment.id}`)}
				key={`min-${comment.id}`}
			/>
		);
	}

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

	return (
		<div ref={myRef} id={`comment_card_${comment.id}`}>
			<PRCodeCommentWrapper>
				<PRCodeCommentBody>
					{review.isMinimized && !expandedComments[review.id] ? (
						<PullRequestMinimizedComment
							reason={review.minimizedReason}
							onClick={() => expandComment(review.id)}
						/>
					) : comment.isMinimized && !expandedComments[comment.id] ? (
						<PullRequestMinimizedComment
							reason={comment.minimizedReason}
							onClick={() => expandComment(comment.id)}
						/>
					) : (
						<>
							<PRThreadedCommentHeader>
								<b>{(comment.author || GHOST).login}</b>
								<Timestamp time={comment.createdAt} relative />
								<PRActionIcons>
									<PRAuthorBadges pr={pr} node={comment} isPending={review.state === "PENDING"} />
									<PullRequestReactButton
										pr={pr}
										targetId={comment.id}
										setIsLoadingMessage={setIsLoadingMessage}
										reactionGroups={comment.reactionGroups}
									/>
									<PullRequestCommentMenu
										pr={pr}
										setIsLoadingMessage={setIsLoadingMessage}
										node={comment}
										nodeType="REVIEW_COMMENT"
										viewerCanDelete={comment.viewerCanDelete}
										setEdit={setEditingComment}
										quote={quote}
										isPending={review.state === "PENDING"}
									/>
								</PRActionIcons>
							</PRThreadedCommentHeader>
							{editingComments[comment.id] ? (
								<PullRequestEditingComment
									pr={pr}
									setIsLoadingMessage={setIsLoadingMessage}
									id={comment.id}
									isPending={comment.state === "PENDING"}
									type={"REVIEW_COMMENT"}
									text={pendingComments[comment.id]}
									done={() => doneEditingComment(comment.id)}
								/>
							) : (
								<>
									<MarkdownText
										text={
											comment.bodyHTML
												? comment.bodyHTML
												: comment.bodyHtml
												? comment.bodyHtml
												: comment.bodyText
										}
										isHtml={comment.bodyHTML || comment.bodyHtml ? true : false}
										inline
									/>
									<div style={{ marginTop: "10px" }}>
										<CodeBlockContainerIcons>
											<div>
												<Icon name="git-branch" />
												<PRBranchContainer>{pr.baseRefName}</PRBranchContainer>
											</div>
											<div style={{ marginLeft: "auto" }}>
												<span
													style={{ color: "var(--text-color-subtle)" }}
													onClick={e => {
														handleDiffClick();
														HostApi.instance.track("PR Jump to Diff", {
															Host: pr && pr.providerId
														});
													}}
												>
													<Icon
														name="diff"
														title="Show Comment in Diff"
														placement="bottom"
														className="clickable"
														delay={1}
													/>
												</span>
											</div>
											<div style={{ marginLeft: "5px" }}>
												{pr && pr.url && (
													<span
														onClick={handleOpenFile}
														style={{ color: "var(--text-color-subtle)" }}
													>
														<Icon
															title="Open Local File"
															placement="bottom"
															name="goto-file"
															className="clickable"
															delay={1}
														/>
													</span>
												)}
											</div>
										</CodeBlockContainerIcons>
										{codeBlock()}
									</div>
								</>
							)}
						</>
					)}
				</PRCodeCommentBody>
				<PullRequestReactions
					pr={pr}
					targetId={comment.id}
					setIsLoadingMessage={setIsLoadingMessage}
					reactionGroups={comment.reactionGroups}
				/>
				{comment.replies &&
					comment.replies.map((c, i) => {
						if (c.isMinimized && !expandedComments[c.id]) {
							return (
								<PullRequestMinimizedComment
									reason={c.minimizedReason}
									className="threaded"
									onClick={() => expandComment(c.id)}
								/>
							);
						}

						return (
							<div key={i}>
								<PRCodeCommentBody>
									<PRThreadedCommentHeader>
										<b>{(c.author || GHOST).login}</b>
										<Timestamp time={c.createdAt} relative />
										{c.includesCreatedEdit ? <> • edited</> : ""}
										<PRActionIcons>
											<PRAuthorBadges pr={pr} node={c} />
											<PullRequestReactButton
												pr={pr}
												targetId={c.id}
												setIsLoadingMessage={setIsLoadingMessage}
												reactionGroups={c.reactionGroups}
											/>
											<PullRequestCommentMenu
												pr={pr}
												setIsLoadingMessage={setIsLoadingMessage}
												node={c}
												nodeType="REVIEW_COMMENT"
												viewerCanDelete={c.viewerCanDelete}
												setEdit={setEditingComment}
												quote={quote}
												isPending={review.state === "PENDING"}
											/>
										</PRActionIcons>
									</PRThreadedCommentHeader>
									{editingComments[c.id] ? (
										<PullRequestEditingComment
											pr={pr}
											setIsLoadingMessage={setIsLoadingMessage}
											id={c.id}
											isPending={c.state === "PENDING"}
											type={"REVIEW_COMMENT"}
											text={pendingComments[c.id]}
											done={() => doneEditingComment(c.id)}
										/>
									) : (
										<MarkdownText
											text={c.bodyHTML ? c.bodyHTML : c.bodyHtml ? c.bodyHtml : c.bodyText}
											isHtml={c.bodyHTML || c.bodyHtml ? true : false}
											inline
										/>
									)}
								</PRCodeCommentBody>
								<PullRequestReactions
									pr={pr}
									targetId={c.id}
									setIsLoadingMessage={setIsLoadingMessage}
									reactionGroups={c.reactionGroups}
								/>
							</div>
						);
					})}
				{review.state !== "PENDING" && (
					<PRButtonRow className="align-left">
						{/* 
						GitHub doesn't allow replies on existing comments
						when there is a pending review 
					*/}
						{pr.providerId.includes("gitlab") ||
							(!pr.pendingReview && (
								<>
									<PullRequestReplyComment
										pr={pr}
										mode={props.mode}
										noHeadshot={true}
										/* GitLab-specific */
										parentId={comment?.discussion?.id}
										databaseId={comment.databaseId}
										isOpen={openComments[comment.databaseId]}
										__onDidRender={__onDidRender}
										oneRow={true}
									>
										{comment.isResolved && comment.viewerCanUnresolve && (
											<Button
												variant="secondary"
												isLoading={isResolving}
												onClick={e => handleUnresolve(e, comment.threadId)}
												style={{ marginRight: "10px " }}
											>
												Unresolve
											</Button>
										)}
										{!comment.isResolved && comment.viewerCanResolve && (
											<Button
												variant="secondary"
												isLoading={isResolving}
												onClick={e => handleResolve(e, comment.threadId)}
												style={{ marginRight: "10px " }}
											>
												Resolve
											</Button>
										)}
									</PullRequestReplyComment>
								</>
							))}
					</PRButtonRow>
				)}
			</PRCodeCommentWrapper>
		</div>
	);
};
