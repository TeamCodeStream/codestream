import {
	CollaborationComment,
	CreateCollaborationCommentRequestType,
	DeleteCollaborationCommentRequestType,
	UpdateCollaborationCommentRequestType,
} from "@codestream/protocols/agent";
import { Headshot } from "@codestream/webview/src/components/Headshot";
import { CodeStreamState } from "@codestream/webview/store";
import { useAppSelector, useDidMount } from "@codestream/webview/utilities/hooks";
import { escapeHtml, replaceHtml, transformMentions } from "@codestream/webview/utils";
import React, { forwardRef, Ref, useState } from "react";
import styled from "styled-components";
import Icon from "../Icon";
import { MarkdownText } from "../MarkdownText";
import { MessageInput } from "../MessageInput";
import { AddReactionIcon } from "../Reactions";
import { CSCodeError, CSUser } from "@codestream/protocols/api";
import { AskGrok } from "../NRAI/AskGrok";
import Tooltip from "../Tooltip";
import { ButtonRow } from "@codestream/webview/src/components/Dialog";
import { Button } from "@codestream/webview/src/components/Button";
import { MenuItem } from "@codestream/webview/src/components/controls/InlineMenu";
import {
	currentNrUserIdSelector,
	currentUserIsAdminSelector,
} from "@codestream/webview/store/users/reducer";
import { HostApi } from "@codestream/webview/webview-api";
import { useDispatch } from "react-redux";

export const AuthorInfo = styled.div`
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

export const Root = styled.div`
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
	isLoading?: boolean;
}

export type CommentInputProps = {
	errorGroupGuid: string;
	entityGuid: string;
	codeError: CSCodeError;
	useNrAi: boolean;
	threadId: string;
	isLoading?: boolean;
};

export const CommentInput = (props: CommentInputProps) => {
	const dispatch = useDispatch();
	const [text, setText] = useState("");

	const [isAskGrokOpen, setIsAskGrokOpen] = useState(false);

	const derivedState = useAppSelector((state: CodeStreamState) => {
		return {
			isLoading: props.isLoading ?? false,
		};
	});

	const createComment = async () => {
		if (text.length === 0) return;

		const textForNr = transformMentions(text);

		const response = await HostApi.instance.send(CreateCollaborationCommentRequestType, {
			entityGuid: props.entityGuid,
			errorGroupGuid: props.errorGroupGuid,
			threadId: props.threadId,
			body: textForNr,
		});

		if (response.nrError) {
			// TODO do something with the error
		}

		if (response.comment) {
			// dispatch(addComment(response.comment)); // Obsolete with websocket handling new messages
			setText("");
		}
	};

	return (
		<>
			{isAskGrokOpen && <AskGrok setText={setText} onClose={() => setIsAskGrokOpen(false)} />}
			<MessageInput
				multiCompose
				text={text}
				placeholder="Add a comment..."
				onChange={setText}
				onSubmit={createComment}
				suggestGrok={props.useNrAi}
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
					<Button
						disabled={text.length === 0}
						onClick={createComment}
						isLoading={derivedState.isLoading}
					>
						Comment
					</Button>
				</Tooltip>
				{props.useNrAi && (
					<Button
						style={{ marginLeft: 0 }}
						onClick={() => setIsAskGrokOpen(true)}
						isLoading={derivedState.isLoading}
					>
						<Icon name="nrai" />
						<span style={{ paddingLeft: "4px" }}>Ask AI</span>
					</Button>
				)}
			</ButtonRow>
		</>
	);
};

export const Comment = forwardRef((props: CommentProps, ref: Ref<HTMLDivElement>) => {
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { users } = state;
		let authorAsUser: CSUser | undefined;

		for (let user of Object.values(users)) {
			if (user.nrUserId === props.comment.creator.userId) {
				authorAsUser = user;
				break;
			}
		}

		return {
			author: authorAsUser,
			isLoading: props.isLoading ?? false,
		};
	});
	const currentUserId = useAppSelector((state: CodeStreamState) => state.session.userId!);
	const currentNrUserId = useAppSelector(currentNrUserIdSelector);
	const currentUserIsAdmin = useAppSelector(currentUserIsAdminSelector);

	const [isEditing, setIsEditing] = useState<boolean>(false);
	const [newReplyText, setNewReplyText] = useState<string>("");
	const postText = props.comment.body;
	const escapedPostText = escapeHtml(postText);

	useDidMount(() => {
		setNewReplyText(escapedPostText);
	});

	const deleteComment = async () => {
		const response = await HostApi.instance.send(DeleteCollaborationCommentRequestType, {
			commentId: props.comment.id,
		});
	};

	const updateComment = async () => {
		const response = await HostApi.instance.send(UpdateCollaborationCommentRequestType, {
			commentId: props.comment.id,
			body: replaceHtml(newReplyText)!,
		});
	};

	const menuItems: MenuItem[] = [];

	// Need to line up user IDs.
	// currentUserIsAdmin is not a good check for this as it doesn't seem to match NR1 expectations.
	//
	// if (props.comment.creator.userId === currentNrUserId || currentUserIsAdmin) {
	// 	menuItems.push({
	// 		label: "Edit",
	// 		key: "edit",
	// 		action: () => setIsEditing(true),
	// 	});
	// }

	// Need to line up user IDs.
	// currentUserIsAdmin is not a good check for this as it doesn't seem to match NR1 expectations.
	//
	// if (props.comment.creator.userId === currentNrUserId || currentUserIsAdmin) {
	// 	menuItems.push({
	// 		label: "Delete",
	// 		key: "delete",
	// 		action: () => {
	// 			confirmPopup({
	// 				title: "Are you sure?",
	// 				message: "Deleting a comment cannot be undone.",
	// 				centered: true,
	// 				buttons: [
	// 					{ label: "Go Back", className: "control-button" },
	// 					{
	// 						label: "Delete Comment",
	// 						className: "delete",
	// 						wait: true,
	// 						action: async () => {
	// 							await deleteComment();
	// 						},
	// 					},
	// 				],
	// 			});
	// 		},
	// 	});
	// }

	const [menuState, setMenuState] = React.useState<{
		open: boolean;
		target?: any;
	}>({ open: false, target: undefined });

	const cancelEdit = () => {
		setNewReplyText(escapedPostText);
		setIsEditing(false);
	};

	return (
		<Root ref={ref}>
			<CommentBody>
				<AuthorInfo style={{ fontWeight: 700 }}>
					{props.comment.creator && <Headshot size={20} person={props.comment.creator} />}
					<span className="reply-author">{props.comment.creator.name}</span>
					{/* <div style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
						{menuState.open && (
							<Menu
								target={menuState.target}
								action={() => setMenuState({ open: false })}
								items={menuItems}
								align="dropdownRight"
							/>
						)}
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
					</div> */}
				</AuthorInfo>

				{isEditing && (
					<>
						<ComposeWrapper>
							<MessageInput
								text={escapedPostText}
								onChange={setNewReplyText}
								onSubmit={updateComment}
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
								onClick={cancelEdit}
							>
								Cancel
							</Button>
							<Button
								style={{
									// fixed width to handle the isLoading case
									width: "80px",
									margin: "10px 0",
								}}
								className="control-button"
								disabled={newReplyText.length === 0}
								onClick={updateComment}
							>
								Submit
							</Button>
						</div>
					</>
				)}

				{!isEditing && (
					<MarkdownContent className="reply-content-container">
						<MarkdownText
							text={postText}
							includeCodeBlockCopy={props.comment.creator.name === "AI"}
							className="reply-markdown-content"
						/>
					</MarkdownContent>
				)}
			</CommentBody>
		</Root>
	);
});
