import React, { useState } from "react";
import Icon from "../../Icon";
import { MarkdownText } from "../../MarkdownText";
import { PullRequestReplyComment } from "../../PullRequestReplyComment";
import Tag from "../../Tag";
import Timestamp from "../../Timestamp";
import Tooltip from "../../Tooltip";
import { ActionBox, OutlineBox } from "./PullRequest";
import { FetchThirdPartyPullRequestPullRequest } from "@codestream/protocols/agent";
import { PRHeadshot } from "@codestream/webview/src/components/Headshot";
import styled from "styled-components";

interface Props {
	pr: any;
	filter: "history" | "comments" | "all";
	order: "oldest" | "newest";
}

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
	padding: 10px;
	${PRHeadshot} {
		position: absolute;
		left: 0;
		top: 0;
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
`;

let insertText;
let insertNewline;
let focusOnMessageInput;

export const Timeline = (props: Props) => {
	const { pr, order, filter } = props;
	let discussions = order === "oldest" ? pr.discussions.nodes : [...pr.discussions.nodes].reverse();
	if (filter === "history") discussions = discussions.filter(_ => !isComment(_));
	else if (filter === "comments") discussions = discussions.filter(_ => isComment(_));

	const iconMap = {
		user: "person",
		"pencil-square": "pencil",
		commit: "git-commit",
		"lock-open": "unlock",
		lock: "lock",
		timer: "clock",
		unapproval: "x",
		approval: "check",
		fork: "git-branch"
	};

	const __onDidRender = functions => {
		insertText = functions.insertTextAtCursor;
		insertNewline = functions.insertNewlineAtCursor;
		focusOnMessageInput = functions.focus;
	};

	const isComment = _ => _.notes && _.notes.nodes && _.notes.nodes.length;

	const printNote = note => {
		if (note.system) {
			return (
				<ActionBox>
					<Icon
						name={iconMap[note.systemNoteIconName] || "blank"}
						className="circled"
						title={<pre className="stringify">{JSON.stringify(note, null, 2)}</pre>}
					/>
					<div>
						<b>{note.author.name}</b> @{note.author.login} <MarkdownText inline text={note.body} />
						<Timestamp relative time={note.createdAt} />
					</div>
				</ActionBox>
			);
		}
		const replies = note.replies || [];
		return (
			<OutlineBox style={{ padding: "10px" }}>
				{note.author && (
					<>
						<Tooltip title={<pre className="stringify">{JSON.stringify(note, null, 2)}</pre>}>
							<BigRoundImg>
								<img style={{ float: "left" }} alt="headshot" src={note.author.avatarUrl} />
							</BigRoundImg>
						</Tooltip>
						<div>
							<b>{note.author.name}</b> @{note.author.login} &middot;{" "}
							<Timestamp relative time={note.createdAt} />
						</div>
					</>
				)}
				{!note.author && <pre className="stringify">{JSON.stringify(note, null, 2)}</pre>}

				<div style={{ paddingTop: "10px" }}>
					<MarkdownText text={note.body} />
				</div>
				{note.resolvable && (
					<>
						{replies.length > 0 && (
							<Collapse>
								<Icon name="chevron-down-thin" /> Collapse replies
							</Collapse>
						)}
						{replies.map(reply => {
							return (
								<>
									{reply.author && (
										<>
											<Tooltip
												title={<pre className="stringify">{JSON.stringify(note, null, 2)}</pre>}
											>
												<BigRoundImg>
													<img
														style={{ float: "left" }}
														alt="headshot"
														src={reply.author.avatarUrl}
													/>
												</BigRoundImg>
											</Tooltip>
											<div>
												<b>{reply.author.name}</b> @{reply.author.login} &middot;{" "}
												<Timestamp relative time={reply.createdAt} />
											</div>
										</>
									)}

									<div style={{ paddingTop: "10px" }}>
										<MarkdownText text={reply.body} />
									</div>
								</>
							);
						})}
						<ReplyForm>
							<PullRequestReplyComment
								pr={(pr as unknown) as FetchThirdPartyPullRequestPullRequest}
								mode={note}
								fetch={fetch}
								databaseId={note.id}
								isOpen={false}
								__onDidRender={__onDidRender}
							/>
						</ReplyForm>
					</>
				)}
			</OutlineBox>
		);
	};

	return (
		<>
			{discussions.map((_: any, index: number) => {
				if (_.type === "merge-request") {
					if (_.action === "opened") {
						return (
							<ActionBox key={index}>
								<Icon
									name="reopen"
									className="circled"
									title={<pre className="stringify">{JSON.stringify(_, null, 2)}</pre>}
								/>
								<div>
									<b>{_.author.name}</b> @{_.author.login} reopened
									<Timestamp relative time={_.createdAt} />
								</div>
							</ActionBox>
						);
					} else if (_.action === "closed") {
						return (
							<ActionBox key={index}>
								<Icon
									name="minus-circle"
									className="circled"
									title={<pre className="stringify">{JSON.stringify(_, null, 2)}</pre>}
								/>
								<div>
									<b>{_.author.name}</b> @{_.author.login} closed
									<Timestamp relative time={_.createdAt} />
								</div>
							</ActionBox>
						);
					} else if (_.action === "approved") {
						return (
							<ActionBox key={index}>
								<Icon
									name="check"
									className="circled"
									title={<pre className="stringify">{JSON.stringify(_, null, 2)}</pre>}
								/>
								<div>
									<b>{_.author.name}</b> @{_.author.login} approved this merge request
									<Timestamp relative time={_.createdAt} />
								</div>
							</ActionBox>
						);
					} else if (_.action === "unapproved") {
						return (
							<ActionBox key={index}>
								<Icon
									name="minus-circle"
									className="circled"
									title={<pre className="stringify">{JSON.stringify(_, null, 2)}</pre>}
								/>
								<div>
									<b>{_.author.name}</b> @{_.author.login} unapproved this merge request
									<Timestamp relative time={_.createdAt} />
								</div>
							</ActionBox>
						);
					}
					return (
						<div>
							unknown merge-request node:
							<br />
							<pre className="stringify">{JSON.stringify(_, null, 2)}</pre>
							<br />
							<br />
						</div>
					);
				} else if (_.type === "milestone") {
					if (_.action === "removed")
						return (
							<ActionBox key={index}>
								<Icon
									name="clock"
									className="circled"
									title={<pre className="stringify">{JSON.stringify(_, null, 2)}</pre>}
								/>
								<div>
									<b>{_.author.name}</b> @{_.author.login} removed milestone{" "}
									<Timestamp relative time={_.createdAt} />
								</div>
							</ActionBox>
						);
					else
						return (
							<ActionBox key={index}>
								<Icon
									name="clock"
									className="circled"
									title={<pre className="stringify">{JSON.stringify(_, null, 2)}</pre>}
								/>
								<div>
									<b>{_.author.name}</b> @{_.author.login} changed milestone{" "}
									<Timestamp relative time={_.createdAt} />
								</div>
							</ActionBox>
						);
				} else if (_.type === "label") {
					if (_.action === "removed")
						return (
							<ActionBox key={index}>
								<Icon
									name="tag"
									className="circled"
									title={<pre className="stringify">{JSON.stringify(_, null, 2)}</pre>}
								/>
								<div>
									<b>{_.author.name}</b> @{_.author.login} removed label{" "}
									<Tag tag={{ label: _.label.name, color: `${_.label.color}` }} />
									<Timestamp relative time={_.createdAt} />
								</div>
							</ActionBox>
						);
					else
						return (
							<ActionBox key={index}>
								<Icon
									name="tag"
									className="circled"
									title={<pre className="stringify">{JSON.stringify(_, null, 2)}</pre>}
								/>
								<div>
									<b>{_.author.name}</b> @{_.author.login} added label{" "}
									<Tag tag={{ label: _.label.name, color: `${_.label.color}` }} />
									<Timestamp relative time={_.createdAt} />
								</div>
							</ActionBox>
						);
				} else if (_.notes && _.notes.nodes && _.notes.nodes.length > 0) {
					return (
						<>
							{/* <pre className="stringify">{JSON.stringify(_, null, 2)}</pre> */}
							{_.notes.nodes.map(note => printNote(note))}
						</>
					);
				} else {
					// console.warn("why here?", _);
					return printNote(_);
				}
			})}
		</>
	);
};
