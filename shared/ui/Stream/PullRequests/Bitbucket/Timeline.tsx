import React, { useEffect, useState } from "react";
import { MarkdownText } from "../../MarkdownText";
import Timestamp from "../../Timestamp";

import styled from "styled-components";
import { PRActionIcons } from "../../PullRequestComponents";

import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { HostApi } from "@codestream/webview/webview-api";

const BigRoundImg = styled.span`
	img {
		border-radius: 50%;
		margin: 0px 15px 0px 0px;
		vertical-align: middle;
		height: 30px;
	}
`;

const Collapse = styled.div`
	background: var(--base-background-color);
	border-top: 1px solid var(--base-border-color);
	border-bottom: 1px solid var(--base-border-color);
	padding: 10px;
	margin: 10px -10px;
	cursor: pointer;
	&:hover {
		background: var(--app-background-color-hover);
	}
	&.collapsed {
		margin: 10px -10px -10px -10px;
		border-bottom: none;
		border-radius: 0 0 4px 4px;
	}
`;

export const OutlineBoxHeader = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: top;
	border-radius: 4px 4px 0 0;
	padding-left: 40px;
	position: relative;
	${BigRoundImg} {
		position: absolute;
		left: 0;
		top: 0;
	}
`;

const ToggleThread = styled.span`
	cursor: pointer;
`;

const Comment = styled.div`
	position: relative;
	padding-left: 15px;
	&.nth-reply {
		padding-top: 15px;
		padding-left: 15px;
	}
`;

const CodeCommentPatch = styled.div`
	margin: -10px -10px 15px -10px;
	border-bottom: 1px solid var(--base-border-color);
	.codemark.inline & {
		margin 10px 0;
		border: 1px solid var(--base-border-color);
	}
	.pr-patch {
		border: none;
	}
`;

const CommentBody = styled.div`
	padding: 5px 0 5px 40px;
`;

let insertText = {};
let insertNewline = {};
let focusOnMessageInput = {};

interface Props {
	pr: any;
	setIsLoadingMessage: Function;
	collapseAll?: boolean;
}

const EMPTY_HASH_3 = {};

export const Timeline = (props: Props) => {
	const { pr } = props;
	let discussions = pr.timelineItems?.nodes || [];

	const iconMap = {
		user: "person",
		"pencil-square": "pencil",
		commit: "git-commit",
		"lock-open": "unlock",
		lock: "lock",
		timer: "clock",
		unapproval: "x",
		approval: "check",
		fork: "git-branch",
		"comment-dots": "comment",
		"git-merge": "git-merge",
		comment: "comment",
		// label-*, milestone-*, merge-request-* are mapped from legacy data
		"label-remove": "tag",
		"label-add": "tag",
		"milestone-remove": "clock",
		"milestone-add": "clock",
		"merge-request-reopened": "reopen",
		"merge-request-closed": "minus-circle",
		"merge-request-merged": "git-merge",
		"merge-request-approved": "check",
		"merge-request-unapproved": "minus-circle",
	};

	const quote = (text, id) => {
		if (!insertText) return;
		focusOnMessageInput &&
			focusOnMessageInput[id] &&
			focusOnMessageInput[id](() => {
				insertText && insertText[id](text.replace(/^/gm, "> ") + "\n");
				insertNewline && insertNewline[id]();
			});
	};

	// const [editingComments, setEditingComments] = useState(EMPTY_HASH_1);
	// const [pendingComments, setPendingComments] = useState(EMPTY_HASH_2);
	const [hiddenComments, setHiddenComments] = useState(EMPTY_HASH_3);

	// const doneEditingComment = id => {
	// 	setEditingComments({ ...editingComments, [id]: false });
	// };

	// const setEditingComment = (comment, value) => {
	// 	setEditingComments({
	// 		...editingComments,
	// 		[comment.id]: value
	// 	});
	// 	setPendingComments({
	// 		...pendingComments,
	// 		[comment.id]: value ? comment.body : ""
	// 	});
	// };

	// useEffect(() => {
	// 	if (props.collapseAll) {
	// 		const hidden = {};
	// 		discussions.forEach(discussion => {
	// 			if (discussion.notes && discussion.notes.nodes) {
	// 				discussion.notes.nodes.forEach(node => {
	// 					hidden[node.id] = true;
	// 				});
	// 			}
	// 		});
	// 		setHiddenComments(hidden);
	// 	} else {
	// 		setHiddenComments({});
	// 	}
	// }, [props.collapseAll]);

	const printComment = (note: any, index: number) => {
		return (
			<Comment className={index === 0 ? "first-reply" : "nth-reply"} key={"comment-" + index}>
				<OutlineBoxHeader>
					{note.author && (
						<BigRoundImg>
							<img style={{ float: "left" }} alt="headshot" src={note.author.avatarUrl} />
						</BigRoundImg>
					)}
					{note.author && (
						<div style={{ flexGrow: 1 }}>
							<div>
								<b>{note.author.name}</b> @{note.author.login} &middot;{" "}
								<Timestamp relative time={note.createdAt} />
							</div>
						</div>
					)}

					<PRActionIcons>
						{/* <PRAuthorBadges
							pr={(pr as unknown) as FetchThirdPartyPullRequestPullRequest}
							node={note}
							isPending={note.state === "PENDING"}
						/> */}
						{/* {isResolvable && pr.supports?.resolvingNotes && (
							<Icon
								name={resolvingNote === note.discussion.id ? "sync" : "check-circle"}
								className={`clickable ${resolvingNote === note.discussion.id ? "spin" : ""} ${
									resolved ? "green-color" : ""
								}`}
								title="Resolve thread"
								placement="bottom"
								onClick={() => resolveNote(note.discussion.id, !note.resolved)}
							/>
						)} */}
						{/* 
						<PullRequestCommentMenu
							pr={pr}
							setIsLoadingMessage={setIsLoadingMessage}
							node={note}
							parentId={note.discussion?.id}
							nodeType="ROOT_COMMENT"
							viewerCanDelete={note.state === "PENDING"}
							setEdit={setEditingComment}
							quote={
								isResolvable
									? text => {
											const id = parent ? parent.id : note.id;
											quote(text, id);
											setOpenComments({
												...openComments,
												[id]: true
											});
									  }
									: undefined
							}
							isPending={note.state === "PENDING"}
						/> */}
					</PRActionIcons>
				</OutlineBoxHeader>

				<CommentBody>
					{/* {editingComments[note.id] ? (
						<PullRequestEditingComment
							pr={pr}
							setIsLoadingMessage={setIsLoadingMessage}
							id={note.id}
							type={"ISSUE"}
							isPending={note.state === "PENDING"}
							text={pendingComments[note.id]}
							done={() => doneEditingComment(note.id)}
						/>
					) : (
						<> */}
					<MarkdownText
						text={
							note.bodyHtml
								? note.bodyHtml
										.replace(/\<table /g, '<table class="gitlab-table" ')
										.replace(/\<pre.+?\>/g, "<pre>")
										.replace(/(?=((?!<\/a).)*<img.+?<\/a>)href="/g, `href=\"${pr.baseWebUrl}`)
								: note.bodyText
						}
						isHtml={note.bodyHtml != null}
					/>
					{/* <PullRequestReactions
								pr={pr}
								targetId={note.id}
								setIsLoadingMessage={setIsLoadingMessage}
								reactionGroups={note.reactionGroups}
							/> */}
					{/* </>
					)} */}
				</CommentBody>
			</Comment>
		);
	};

	const linkHijacker = (e: any) => {
		if (
			e &&
			e.target &&
			e.target.tagName === "A" &&
			(e.target.text === "Compare with previous version" ||
				e.target.classList.contains("gfm-commit"))
		) {
			e.preventDefault();
			HostApi.instance.send(OpenUrlRequestType, { url: e.target.getAttribute("href")! });
			e.stopPropagation();
		}
	};

	useEffect(() => {
		document.addEventListener("click", linkHijacker);
		return () => {
			document.removeEventListener("click", linkHijacker);
		};
	}, []);

	const fixAnchorTags = (children: HTMLCollection) => {
		Array.from(children).forEach((c: Element) => {
			if (c.tagName === "A") {
				let href = c.getAttribute("href");
				if (href && href.indexOf("http") !== 0) {
					href = `${pr.baseWebUrl}${href}`;
					c.setAttribute("href", href);
				}
			}
			if (c.children) {
				fixAnchorTags(c.children);
			}
		});
	};

	return (
		<>
			{discussions?.length &&
				discussions.map((discussionNode: any, index: number) => {
					return <React.Fragment key={index}>{printComment(discussionNode, index)}</React.Fragment>;
				})}
			<div
				style={{
					height: "1px",
					background: "var(--base-border-color)",
					margin: "0 20px 30px 20px",
				}}
			/>
		</>
	);
};
