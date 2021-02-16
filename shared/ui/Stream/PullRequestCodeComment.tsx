import { CompareLocalFilesRequestType } from "@codestream/protocols/webview";
import { getProviderPullRequestRepo } from "@codestream/webview/store/providerPullRequests/reducer";
import {
	PRActionIcons,
	PRButtonRow,
	PRCodeCommentBody,
	PRCodeCommentWrapper,
	PRThreadedCommentHeader
} from "./PullRequestComponents";
import React, { PropsWithChildren, useCallback, useState } from "react";
import { PRHeadshot, Headshot } from "../src/components/Headshot";
import Timestamp from "./Timestamp";
import Icon from "./Icon";
import { MarkdownText } from "./MarkdownText";
import { FetchThirdPartyPullRequestPullRequest } from "@codestream/protocols/agent";
import { PRAuthorBadges } from "./PullRequestConversationTab";
import { PullRequestReactButton, PullRequestReactions } from "./PullRequestReactions";
import { PullRequestCommentMenu } from "./PullRequestCommentMenu";
import { PullRequestMinimizedComment } from "./PullRequestMinimizedComment";
import { PullRequestEditingComment } from "./PullRequestEditingComment";
import { PullRequestReplyComment } from "./PullRequestReplyComment";
import { Button } from "../src/components/Button";
import { api } from "../store/providerPullRequests/actions";
import { useDispatch } from "react-redux";
import { GHOST } from "./PullRequestTimelineItems";

const ReviewIcons = {
	APPROVED: <Icon name="check" className="circled green" />,
	CHANGES_REQUESTED: <Icon name="plus-minus" className="circled red" />,
	COMMENTED: <Icon name="eye" className="circled" />,
	DISMISSED: <Icon name="x" className="circled" />,
	PENDING: <Icon name="eye" className="circled" />
};

interface Props {
	pr: FetchThirdPartyPullRequestPullRequest;
	mode?: string;
	setIsLoadingMessage: Function;
	fetch: Function;
	item: any;
	comment: any;
	author: any;
	skipResolvedCheck?: boolean;
}

export const PullRequestCodeComment = (props: PropsWithChildren<Props>) => {
	const { item, comment, author, setIsLoadingMessage, pr } = props;
	const dispatch = useDispatch();

	const [openComments, setOpenComments] = useState({});
	const [pendingComments, setPendingComments] = useState({});
	const [editingComments, setEditingComments] = useState({});
	const [expandedComments, setExpandedComments] = useState({});
	const [isResolving, setIsResolving] = useState(false);

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
				insertText && insertText(text.replace(/^/gm, "> "));
				insertNewline && insertNewline();
			});
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
	return (
		<PRCodeCommentWrapper>
			<PRCodeCommentBody>
				{item.isMinimized && !expandedComments[item.id] ? (
					<PullRequestMinimizedComment
						reason={item.minimizedReason}
						onClick={() => expandComment(item.id)}
					/>
				) : comment.isMinimized && !expandedComments[comment.id] ? (
					<PullRequestMinimizedComment
						reason={comment.minimizedReason}
						onClick={() => expandComment(comment.id)}
					/>
				) : (
					<>
						<PRHeadshot key={comment.id} size={30} person={comment.author || GHOST} />
						<PRThreadedCommentHeader>
							{author.login}
							<Timestamp time={comment.createdAt} />
							<PRActionIcons>
								<PRAuthorBadges pr={pr} node={comment} isPending={item.state === "PENDING"} />
								<PullRequestReactButton
									pr={pr}
									targetId={comment.id}
									setIsLoadingMessage={setIsLoadingMessage}
									reactionGroups={comment.reactionGroups}
								/>
								<PullRequestCommentMenu
									pr={pr}
									fetch={props.fetch}
									setIsLoadingMessage={setIsLoadingMessage}
									node={comment}
									nodeType="REVIEW_COMMENT"
									viewerCanDelete={comment.viewerCanDelete}
									setEdit={setEditingComment}
									quote={quote}
									isPending={item.state === "PENDING"}
								/>
							</PRActionIcons>
						</PRThreadedCommentHeader>
						{editingComments[comment.id] ? (
							<PullRequestEditingComment
								pr={pr}
								setIsLoadingMessage={setIsLoadingMessage}
								id={comment.id}
								type={"REVIEW_COMMENT"}
								text={pendingComments[comment.id]}
								done={() => doneEditingComment(comment.id)}
							/>
						) : (
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
								<PRHeadshot key={c.id + i} size={30} person={c.author || GHOST} />
								<PRThreadedCommentHeader>
									<b>{(c.author || GHOST).login}</b>
									<Timestamp time={c.createdAt} />
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
											fetch={props.fetch}
											setIsLoadingMessage={setIsLoadingMessage}
											node={c}
											nodeType="REVIEW_COMMENT"
											viewerCanDelete={c.viewerCanDelete}
											setEdit={setEditingComment}
											quote={quote}
											isPending={item.state === "PENDING"}
										/>
									</PRActionIcons>
								</PRThreadedCommentHeader>
								{editingComments[c.id] ? (
									<PullRequestEditingComment
										pr={pr}
										setIsLoadingMessage={setIsLoadingMessage}
										id={c.id}
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
			{item.state !== "PENDING" && (
				<>
					<PullRequestReplyComment
						pr={pr}
						mode={props.mode}
						fetch={props.fetch}
						databaseId={comment.databaseId}
						isOpen={openComments[comment.databaseId]}
						__onDidRender={__onDidRender}
					/>
					<div style={{ height: "15px" }}></div>
					{comment.isResolved && comment.viewerCanUnresolve && (
						<PRButtonRow className="align-left border-top">
							<Button
								variant="secondary"
								isLoading={isResolving}
								onClick={e => handleUnresolve(e, comment.threadId)}
							>
								Unresolve conversation
							</Button>
						</PRButtonRow>
					)}
					{!comment.isResolved && comment.viewerCanResolve && (
						<PRButtonRow className="align-left border-top">
							<Button
								variant="secondary"
								isLoading={isResolving}
								onClick={e => handleResolve(e, comment.threadId)}
							>
								Resolve conversation
							</Button>
						</PRButtonRow>
					)}
				</>
			)}
		</PRCodeCommentWrapper>
	);
};
