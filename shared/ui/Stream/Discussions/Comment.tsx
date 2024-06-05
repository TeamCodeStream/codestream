import { CollaborationComment, NewRelicErrorGroup } from "@codestream/protocols/agent";
import { Headshot } from "@codestream/webview/src/components/Headshot";
import { ProfileLink } from "@codestream/webview/src/components/ProfileLink";
import { CodeStreamState } from "@codestream/webview/store";
import {
	codestreamUserFromNrUserId,
	getTeamMembers,
	getTeamTagsHash,
} from "@codestream/webview/store/users/reducer";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { escapeHtml, replaceHtml } from "@codestream/webview/utils";
import cx from "classnames";
import React, { forwardRef, Ref, useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import styled from "styled-components";
import Button from "../Button";
import { KebabIcon } from "../Codemark/BaseCodemark";
import Icon from "../Icon";
import { MarkdownText } from "../MarkdownText";
import { MessageInput } from "../MessageInput";
import { AddReactionIcon } from "../Reactions";
import { FunctionToEdit } from "@codestream/webview/store/codeErrors/types";
import { CSCodeError, CSUser } from "@codestream/protocols/api";
import { setPostReplyCallback } from "@codestream/webview/store/codeErrors/api/apiResolver";
import { createComment } from "../actions";
import { AskGrok } from "../NRAI/AskGrok";
import Tooltip from "../Tooltip";
import { ButtonRow } from "@codestream/webview/src/components/Dialog";

const AuthorInfo = styled.div`
	display: flex;
	align-items: flex-start;

	${Headshot} {
		margin-right: 7px;
		flex-shrink: 0;
	}

	.emote {
		font-weight: normal;
		padding-left: 4px;
	}
`;

const Root = styled.div`
	padding-bottom: 10px;
	padding-top: 10px;
	display: flex;
	flex-direction: column;
	position: relative;
	// not sure if there is a better way to deal with this,
	// but if the headshot is taller than the copy (i.e. in
	// a zero-height post such as an emote) we end up with
	// too little padding between the reply and the one below
	// since the other reply has a 5px extra padding from that body
	min-height: 35px;

	${AuthorInfo} {
		font-weight: 700;
	}

	.icon.reply {
		margin-left: 5px;
		margin-right: 10px;
		vertical-align: -2px;
	}

	${AddReactionIcon} {
		vertical-align: -2px;
		margin-left: 5px;
		margin-right: 5px;
	}

	.bar-left-not-last-child {
		width: 2px;
		height: 100%;
		position: absolute;
		top: 0px;
		left: 9px;
		background: var(--text-color);
		opacity: 0.25;
	}

	.bar-left-last-child {
		width: 2px;
		height: 27px;
		position: absolute;
		top: 0px;
		left: 9px;
		background: var(--text-color);
		opacity: 0.25;
	}

	.bar-left-connector {
		width: 19px;
		height: 2px;
		position: absolute;
		top: 25px;
		left: 11px;
		background: var(--text-color);
		opacity: 0.25;
	}

	.related {
		margin: 10px 0;
	}
`;

export const CommentBody = styled.span`
	display: flex;
	flex-direction: column;
	position: relative;

	.kebab,
	.icon.reply,
	${AddReactionIcon} {
		visibility: hidden;
	}

	:hover .kebab,
	:hover .icon.reply,
	:hover ${AddReactionIcon} {
		visibility: visible;
	}

	:hover .icon.reply,
	:hover ${AddReactionIcon} {
		opacity: 0.6;
	}

	:hover .icon.reply:hover,
	:hover ${AddReactionIcon}:hover {
		opacity: 1;
	}

	.bar-left-parent {
		width: 2px;
		height: calc(100% - 20px);
		position: absolute;
		top: 20px;
		left: 9px;
		background: var(--text-color);
		opacity: 0.25;
	}
`;

export const MarkdownContent = styled.div`
	margin-left: 27px;
	display: flex;
	flex-direction: column;

	> *:not(:last-child) {
		margin-bottom: 10px;
	}
`;

const ComposeWrapper = styled.div.attrs(() => ({
	className: "compose codemark-compose",
}))`
	&&& {
		padding: 0 !important;
		padding-left: 25px !important;
	}
`;

export interface CommentProps {
	comment: CollaborationComment;
	editingCommentId?: string;

	file?: string;
	functionToEdit?: FunctionToEdit;
	codeErrorId?: string;
	errorGroup?: NewRelicErrorGroup;
	renderMenu?: (target: any, onClose: () => void) => React.ReactNode;
	className?: string;
	threadId?: string; // only set for nested replies
}

export type CommentInputProps = {
	codeError: CSCodeError;
	setGrokRequested: () => void;
	showGrok: boolean;
	threadId: string;
};

export const CommentInput = (props: CommentInputProps) => {
	const dispatch = useAppDispatch();
	const [text, setText] = useState("");
	const [isAskGrokOpen, setIsAskGrokOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const demoMode = useAppSelector((state: CodeStreamState) => state.codeErrors.demoMode);

	const postDemoReply = useCallback((text: string) => {
		setText(text);
	}, []);

	useMemo(() => {
		if (demoMode.enabled) {
			setPostReplyCallback(postDemoReply);
		}
	}, [postDemoReply]);

	const submit = async () => {
		if (text.length === 0) return;

		//props.setGrokRequested();
		setIsLoading(true);

		await dispatch(createComment(replaceHtml(text)!, props.threadId));

		setIsLoading(false);
		setText("");
		//setAttachments([]);
	};

	return (
		<>
			{isAskGrokOpen && <AskGrok setText={setText} onClose={() => setIsAskGrokOpen(false)} />}
			<MessageInput
				multiCompose
				text={text}
				placeholder="Add a comment..."
				onChange={setText}
				onSubmit={submit}
				//attachments={attachments}
				//attachmentContainerType="reply"
				//setAttachments={setAttachments}
				suggestGrok={props.showGrok}
			/>
			<ButtonRow
				style={{
					margin: 0,
					display: "flex",
					flexDirection: "row-reverse",
					justifyContent: "space-between",
				}}
			>
				<Tooltip
					title={
						<span>
							Submit Comment
							<span className="keybinding extra-pad">
								{navigator.appVersion.includes("Macintosh") ? "⌘" : "Ctrl"} ENTER
							</span>
						</span>
					}
					placement="bottomRight"
					delay={1}
				>
					<Button disabled={text.length === 0} onClick={submit} loading={isLoading}>
						Comment
					</Button>
				</Tooltip>
				{props.showGrok && (
					<Button style={{ marginLeft: 0 }} onClick={() => setIsAskGrokOpen(true)}>
						<Icon name="nrai" />
						<span style={{ paddingLeft: "4px" }}>Ask AI</span>
					</Button>
				)}
			</ButtonRow>
		</>
	);
};

export const Comment = forwardRef((props: CommentProps, ref: Ref<HTMLDivElement>) => {
	const [menuState, setMenuState] = React.useState<{
		open: boolean;
		target?: any;
	}>({ open: false, target: undefined });

	const [isLoading, setIsLoading] = React.useState(false);
	const teamMembers = useSelector((state: CodeStreamState) => getTeamMembers(state));
	const teamTagsById = useSelector((state: CodeStreamState) => getTeamTagsHash(state));
	const author = useSelector((state: CodeStreamState) =>
		codestreamUserFromNrUserId(state.users, props.comment.creator.userId)
	) as CSUser | undefined;

	const submit = async () => {
		// TODO CONSIDER -
		// Should we delete the comment altogether if they delete all the text and submit?
		if (newReplyText.length === 0) return;

		setIsLoading(true);

		// TODO COLLAB-ERRORS: Comment Editing
		// await dispatch(
		// 	editPost(
		// 		post.streamId,
		// 		post.id,
		// 		replaceHtml(newReplyText)!,
		// 		findMentionedUserIds(teamMembers, newReplyText)
		// 	)
		// );

		reset();
		setIsLoading(false);
	};

	const reset = () => {
		setNewReplyText(escapedPostText);
	};

	const isForGrok = false; // !isPending(props.post) && props.post.forGrok;
	const postText = props.comment.body;
	const escapedPostText = escapeHtml(postText);
	const [newReplyText, setNewReplyText] = React.useState(escapedPostText);

	const renderedMenu =
		props.renderMenu &&
		menuState.open &&
		props.renderMenu(menuState.target, () => setMenuState({ open: false }));

	// TODO COLLAB-ERRORS: Emotes for what, exactly?
	// const renderEmote = () => {
	// 	let matches = (props.comment.body || "").match(/^\/me\s+(.*)/);
	// 	if (matches) {
	// 		return <MarkdownText text={matches[1]} className="emote" inline={true}></MarkdownText>;
	// 	} else return null;
	// };
	// const emote = renderEmote();
	const isEditing = props.comment.id === props.editingCommentId;
	//const author = props.author || { username: "???" };

	return (
		<Root ref={ref} className={props.className}>
			<div className="bar-left-connector" />
			<CommentBody>
				<AuthorInfo style={{ fontWeight: 700 }}>
					{author && (
						<ProfileLink id={author.id || ""}>
							<Headshot size={20} person={author} />{" "}
						</ProfileLink>
					)}
					<span className="reply-author">
						{props.comment.creator.name}
						{/* {emote} */}
					</span>
					<div style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
						{renderedMenu}
						{props.renderMenu && (
							<KebabIcon
								className="kebab"
								onClick={e => {
									e.preventDefault();
									e.stopPropagation();
									if (menuState.open) {
										setMenuState({ open: false });
									} else {
										setMenuState({ open: true, target: e.currentTarget });
									}
								}}
							>
								<Icon name="kebab-vertical" className="clickable" />
							</KebabIcon>
						)}
					</div>
				</AuthorInfo>

				{isEditing && (
					<>
						<ComposeWrapper>
							<MessageInput
								text={escapedPostText}
								onChange={setNewReplyText}
								onSubmit={submit}
								multiCompose
								autoFocus
							/>
						</ComposeWrapper>
						<div style={{ display: "flex", justifyContent: "flex-end" }}>
							<Button
								className="control-button cancel"
								style={{
									// fixed width to handle the isLoading case
									width: "80px",
									margin: "10px 10px",
								}}
								onClick={reset}
							>
								Cancel
							</Button>
							<Button
								style={{
									// fixed width to handle the isLoading case
									width: "80px",
									margin: "10px 0",
								}}
								className={cx("control-button", { cancel: newReplyText.length === 0 })}
								type="submit"
								disabled={newReplyText.length === 0}
								onClick={submit}
								loading={isLoading}
							>
								Submit
							</Button>
						</div>
					</>
				)}

				{/* {isForGrok && props.errorGroup && (
					<NrAiComponent
						codeErrorId={props.codeErrorId}
						post={props.post as PostPlus}
						errorGroup={props.errorGroup}
						postText={postText}
						file={props.file!}
						functionToEdit={props.functionToEdit}
					/>
				)} */}

				{isEditing || isForGrok ? null : (
					<>
						<MarkdownContent className="reply-content-container">
							<MarkdownText
								text={postText}
								includeCodeBlockCopy={props.comment.creator.name === "AI"}
								className="reply-markdown-content"
							/>
						</MarkdownContent>
					</>
				)}
			</CommentBody>
		</Root>
	);
});
