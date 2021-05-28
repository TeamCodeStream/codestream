import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Icon from "../../Icon";
import { MarkdownText } from "../../MarkdownText";
import { PullRequestReplyComment } from "../../PullRequestReplyComment";
import Timestamp from "../../Timestamp";
import Tooltip from "../../Tooltip";
import { OutlineBox } from "./PullRequest";
import {
	Note,
	DiscussionNode,
	FetchThirdPartyPullRequestPullRequest,
	GitLabMergeRequest
} from "@codestream/protocols/agent";
import { PRHeadshot } from "@codestream/webview/src/components/Headshot";
import styled from "styled-components";
import { PullRequestCommentMenu } from "../../PullRequestCommentMenu";
import { PRActionIcons, PRCodeCommentReplyInput } from "../../PullRequestComponents";
import { PRAuthorBadges } from "../../PullRequestConversationTab";
import { Link } from "../../Link";
import { PullRequestEditingComment } from "../../PullRequestEditingComment";
import { PullRequestReactButton, PullRequestReactions } from "./PullRequestReactions";
import { Button } from "@codestream/webview/src/components/Button";
import { PullRequestPatch } from "../../PullRequestPatch";
import copy from "copy-to-clipboard";
import { HostApi } from "@codestream/webview/webview-api";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { api } from "../../../store/providerPullRequests/actions";
import Tag from "../../Tag";

const ActionBox = styled.div`
	margin: 0 20px 15px 20px;
	position: relative;
	display: flex;
	align-items: flex-start;

	.circled {
		flex-shrink: 0;
	}

	&:after {
		content: "";
		display: block;
		position: absolute;
		height: calc(100% - 15px);
		width: 1px;
		left: 30px;
		top: 30px;
		background: var(--base-border-color);
	}
`;

const ActionBody = styled.div`
	padding-top: 5px;
`;

const BigRoundImg = styled.span`
	img {
		border-radius: 50%;
		margin: 0px 15px 0px 0px;
		vertical-align: middle;
		height: 30px;
	}
`;

const ReplyForm = styled.div`
	background: var(--base-background-color);
	border-top: 1px solid var(--base-border-color);
	border-radius: 0 0 4px 4px;
	margin: 10px -10px -10px -10px;
	padding: 10px 10px 10px 10px;
	display: flex;
	align-items: flex-start;
	button {
		margin-left: 10px;
		flex-grow: 0;
	}
	${PRHeadshot} {
		position: absolute;
		left: 0;
		top: 0;
	}
	@media only screen and (max-width: ${props => props.theme.breakpoint}) {
		${PRHeadshot} {
			display: none;
		}
	}
	${PullRequestReplyComment} {
		flex-grow: 1;
	}
	${PRCodeCommentReplyInput} {
		border-radius: 4px;
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
	&.nth-reply {
		padding-top: 15px;
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

const MultiButton = styled.div`
	button:first-of-type {
		border-top-right-radius: 0 !important;
		border-bottom-right-radius: 0 !important;
	}
	button:last-of-type {
		border-top-left-radius: 0 !important;
		border-bottom-left-radius: 0 !important;
	}
	button + button {
		margin-left: 1px !important;
	}
`;

let insertText = {};
let insertNewline = {};
let focusOnMessageInput = {};

interface Props {
	pr: GitLabMergeRequest;
	filter: "history" | "comments" | "all";
	order: "oldest" | "newest";
	setIsLoadingMessage: Function;
	collapseAll?: boolean;
}

const EMPTY_HASH = {};
const EMPTY_HASH_1 = {};
const EMPTY_HASH_2 = {};
const EMPTY_HASH_3 = {};

export const Timeline = (props: Props) => {
	const isComment = (_: DiscussionNode) => _.notes?.nodes?.find(n => !n.system && n.discussion?.id);
	const { pr, order, filter, setIsLoadingMessage } = props;
	let discussions = order === "oldest" ? pr.discussions.nodes : [...pr.discussions.nodes].reverse();
	if (filter === "history") discussions = discussions.filter(_ => !isComment(_));
	else if (filter === "comments") discussions = discussions.filter(_ => isComment(_));

	const dispatch = useDispatch();

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
		"merge-request-unapproved": "minus-circle"
	};

	const __onDidRender = (functions, id) => {
		insertText[id] = functions.insertTextAtCursor;
		insertNewline[id] = functions.insertNewlineAtCursor;
		focusOnMessageInput[id] = functions.focus;
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

	const [editingComments, setEditingComments] = useState(EMPTY_HASH_1);
	const [pendingComments, setPendingComments] = useState(EMPTY_HASH_2);
	const [hiddenComments, setHiddenComments] = useState(EMPTY_HASH_3);

	const doneEditingComment = id => {
		setEditingComments({ ...editingComments, [id]: false });
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

	useEffect(() => {
		if (props.collapseAll) {
			const hidden = {};
			discussions.forEach(discussion => {
				if (discussion.notes && discussion.notes.nodes) {
					discussion.notes.nodes.forEach(node => {
						hidden[node.id] = true;
					});
				}
			});
			setHiddenComments(hidden);
		} else {
			setHiddenComments({});
		}
	}, [props.collapseAll]);

	const printCodeCommentHeader = note => {
		return (
			<React.Fragment key={`note-${note.id}`}>
				<OutlineBoxHeader style={{ flexWrap: "nowrap" }}>
					{note.author && (
						<div style={{ flexGrow: 1 }}>
							<BigRoundImg>
								<img style={{ float: "left" }} alt="headshot" src={note.author.avatarUrl} />
							</BigRoundImg>
							<div>
								<b>{note.author.name}</b> @{note.author.login} started a thread on the diff
								<Timestamp relative time={note.createdAt} />
								<br />
								Last updated <Timestamp relative time={note.updatedAt} />
							</div>
						</div>
					)}

					<PRActionIcons>
						<ToggleThread
							onClick={() => {
								setHiddenComments({ ...hiddenComments, [note.id]: !hiddenComments[note.id] });
							}}
						>
							<Icon name={hiddenComments[note.id] ? "chevron-down-thin" : "chevron-up-thin"} />{" "}
							Toggle thread
						</ToggleThread>
					</PRActionIcons>
				</OutlineBoxHeader>
				{!hiddenComments[note.id] && (
					<React.Fragment key="collapse">
						<Collapse>
							<Icon name="file" /> {note.position.newPath}{" "}
							<Icon
								name="copy"
								onClick={() => copy(note.position.newPath)}
								title="Copy file path"
								placement="top"
							/>
						</Collapse>
						<CodeCommentPatch>
							<PullRequestPatch
								noHeader={true}
								patch={note.position.patch}
								filename={note.position.newPath}
								truncateLargePatches
							/>
						</CodeCommentPatch>
					</React.Fragment>
				)}
			</React.Fragment>
		);
	};

	const printComment = (
		note: Note,
		parent: any,
		index: number,
		isResolvable?: boolean,
		resolved?: boolean
	) => {
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
						<PRAuthorBadges
							pr={(pr as unknown) as FetchThirdPartyPullRequestPullRequest}
							node={note}
							isPending={note.state === "PENDING"}
						/>
						{isResolvable && pr.supports?.resolvingNotes && (
							<Icon
								name={resolvingNote === note.discussion.id ? "sync" : "check-circle"}
								className={`clickable ${resolvingNote === note.discussion.id ? "spin" : ""} ${
									resolved ? "green-color" : ""
								}`}
								title="Resolve thread"
								placement="bottom"
								onClick={() => resolveNote(note.discussion.id, !note.resolved)}
							/>
						)}

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
						/>
					</PRActionIcons>
				</OutlineBoxHeader>

				<CommentBody>
					{editingComments[note.id] ? (
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
						<>
							<MarkdownText
								text={
									note.bodyHtml
										? note.bodyHtml
												.replace(/\<table /g, '<table class="gitlab-table" ')
												.replace(/\<pre.+?\>/g, "<pre>")
										: note.body
								}
								isHtml={note.bodyHtml != null}
							/>
							<PullRequestReactions
								pr={pr}
								targetId={note.id}
								setIsLoadingMessage={setIsLoadingMessage}
								reactionGroups={note.reactionGroups}
							/>
						</>
					)}
				</CommentBody>
			</Comment>
		);
	};

	const [openComments, setOpenComments] = useState({});

	const repliesSummary = replies => {
		const lastReply = replies[replies.length - 1];
		return (
			<>
				<Link>{replies.length === 1 ? "1 reply" : `${replies.length} replies`}</Link>
				{lastReply.author && (
					<>
						{" "}
						Last reply by {lastReply.author.name || lastReply.author.login}{" "}
						<Timestamp relative time={lastReply.createdAt} />
					</>
				)}
			</>
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

	const [resolvingNote, setResolvingNote] = useState("");
	const resolveNote = async (id, shouldResolve) => {
		setResolvingNote(id);
		await dispatch(api("resolveReviewThread", { id, onOff: shouldResolve }));
		setResolvingNote("");
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

	const printNote = (note: Note) => {
		if (note.system) {
			let label;
			let wrapper;
			if (note.bodyHtml) {
				// if we have html, we need to parse out the text.
				// get the message from the first node in the bodyHtml
				try {
					const wrapper = document.createElement("div");
					wrapper.innerHTML = note.bodyHtml || "";
					label = wrapper.children[0].textContent || "";
				} catch (ex) {
					label = note.body || "";
				}
			} else {
				label = note.body;
			}
			if (note.systemNoteIconName?.indexOf("label-") > -1) {
				return (
					<ActionBox key={note.id}>
						<Icon name="tag" className="circled" />
						<ActionBody>
							<b>{note.author?.name}</b> @{note.author?.login} {note.body} a label{" "}
							{note.label && (
								<Tag tag={{ label: note.label.title, color: `${note.label.color}` }} />
							)}
							<Timestamp className="no-padding" relative time={note.createdAt} />
						</ActionBody>
					</ActionBox>
				);
			} else if (note.systemNoteIconName?.indexOf("merge-request-") > -1) {
				return (
					<ActionBox key={note.id}>
						<Icon name={iconMap[note.systemNoteIconName] || "blank"} className="circled" />
						<ActionBody>
							<b>{note.author?.name}</b> @{note.author?.login} {note.body} merge request
							<Timestamp relative time={note.createdAt} />
						</ActionBody>
					</ActionBox>
				);
			} else if (note.systemNoteIconName?.indexOf("milestone-") > -1) {
				return (
					<ActionBox key={note.id}>
						<Icon name="clock" className="circled" />
						<ActionBody>
							<b>{note.author?.name}</b> @{note.author?.login} {note.body} a milestone{" "}
							<Link href={note.milestone?.url}>%{note.milestone?.title}</Link>
							<Timestamp relative time={note.createdAt} />
						</ActionBody>
					</ActionBox>
				);
			} else if (note.systemNoteIconName === "commit") {
				let otherChildren;
				if (wrapper) {
					wrapper.children[0].remove();
					fixAnchorTags(wrapper.children);
					otherChildren = Array.from(wrapper.children).map((_: any, index: number) => {
						const text = _.outerHTML.replace(/>\n/g, ">").replace(/\n\n/g, "");
						return <MarkdownText inline text={text} isHtml={true} key={index} />;
					});
				}

				return (
					<ActionBox key={note.id}>
						<Icon name={iconMap[note.systemNoteIconName] || "blank"} className="circled" />
						<ActionBody>
							<b>{note.author?.name}</b> @{note.author?.login} <MarkdownText inline text={label} />
							<Timestamp relative time={note.createdAt} />
							<div>{otherChildren}</div>
						</ActionBody>
					</ActionBox>
				);
			}
			return (
				<ActionBox key={note.id}>
					<Icon name={iconMap[note.systemNoteIconName] || "blank"} className="circled" />
					<ActionBody>
						<b>{note.author?.name}</b> @{note.author?.login} <MarkdownText inline text={label} />
						<Timestamp relative time={note.createdAt} />
					</ActionBody>
				</ActionBox>
			);
		}

		// force all notes to be resolvable
		const isResolvable = true;
		const className = isResolvable && !note.resolved ? "unresolved-thread-start" : "";
		// if it's a review thread, and the thread is collapsed, just
		// render the header
		if (note.position && hiddenComments[note.id])
			return (
				<OutlineBox style={{ padding: "10px" }} key={note.id} className={className}>
					{printCodeCommentHeader(note)}
				</OutlineBox>
			);

		const replies = note.replies || [];
		return (
			<OutlineBox style={{ padding: "10px" }} key={note.id} className={className}>
				{note.position && printCodeCommentHeader(note)}
				{printComment(note, undefined, 0, isResolvable, note.resolved)}
				{isResolvable && (
					<>
						{replies.length > 0 && !note.position && (
							<Collapse
								className={hiddenComments[note.id] ? "collapsed" : ""}
								onClick={() => {
									setHiddenComments({ ...hiddenComments, [note.id]: !hiddenComments[note.id] });
								}}
							>
								<Icon name={hiddenComments[note.id] ? "chevron-right-thin" : "chevron-down-thin"} />{" "}
								{hiddenComments[note.id] ? repliesSummary(replies) : "Collapse replies"}
							</Collapse>
						)}
						{!hiddenComments[note.id] &&
							replies.map((reply, index) => printComment(reply as any, note, index + 1))}
						{!hiddenComments[note.id] && note.state !== "PENDING" && (
							<ReplyForm>
								<PullRequestReplyComment
									pr={(pr as unknown) as FetchThirdPartyPullRequestPullRequest}
									databaseId={note.id}
									parentId={note.discussion.id}
									isOpen={openComments[note.id]}
									__onDidRender={functions => {
										__onDidRender(functions, note.id);
									}}
								/>

								{pr.supports?.resolvingNotes && note.resolved && (
									<Button
										variant="secondary"
										onClick={() => resolveNote(note.discussion.id, false)}
										isLoading={resolvingNote === note.discussion.id}
									>
										Unresolve<span className="wide-text"> thread</span>
									</Button>
								)}
								{pr.supports?.resolvingNotes && !note.resolved && (
									<MultiButton>
										<Button
											variant="secondary"
											onClick={() => resolveNote(note.discussion.id, true)}
											isLoading={resolvingNote === note.discussion.id}
										>
											Resolve<span className="wide-text"> thread</span>
										</Button>
										<Button
											variant="secondary"
											narrow
											onClick={() =>
												HostApi.instance.send(OpenUrlRequestType, {
													url: `${pr.repository.url}/-/issues/new?discussion_to_resolve=${note.databaseId}&merge_request_to_resolve_discussions_of=${pr.number}`
												})
											}
										>
											<Icon
												name="plus"
												title="Resolve this thread in a new issue"
												placement="topRight"
												align={{ offset: [28, -5] }}
											/>
										</Button>
									</MultiButton>
								)}
							</ReplyForm>
						)}
					</>
				)}
			</OutlineBox>
		);
	};

	return (
		<>
			{discussions.map((discussionNode: DiscussionNode, index: number) => {
				if (
					discussionNode.notes &&
					discussionNode.notes.nodes &&
					discussionNode.notes.nodes.length
				) {
					return (
						<React.Fragment key={index}>
							{discussionNode.notes.nodes.map(note => printNote(note))}
						</React.Fragment>
					);
				} else {
					console.warn("why here?", discussionNode);
					return null; //printNote(discussionNode);
				}
			})}
			<div
				style={{
					height: "1px",
					background: "var(--base-border-color)",
					margin: "0 20px 30px 20px"
				}}
			/>
		</>
	);
};
