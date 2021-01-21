import styled from "styled-components";
import cx from "classnames";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "@codestream/webview/store";
import { getThreadPosts } from "@codestream/webview/store/posts/reducer";
import { getTeamMates, findMentionedUserIds } from "@codestream/webview/store/users/reducer";
import React from "react";
import { createPost, deletePost, fetchThread } from "../actions";
import { replaceHtml, mapFilter } from "@codestream/webview/utils";
import { PostPlus } from "@codestream/protocols/agent";
import { confirmPopup } from "../Confirm";
import { Reply } from "./Reply";
import Menu from "../Menu";
import MessageInput, { AttachmentField } from "../MessageInput";
import Button from "../Button";
import { groupBy } from "lodash-es";
import { Dispatch } from "@codestream/webview/store/common";
import { useDidMount } from "@codestream/webview/utilities/hooks";

const ComposeWrapper = styled.div.attrs(() => ({
	className: "compose codemark-compose"
}))`
	&&& {
		padding: 0 !important;
	}
`;

const InlineMessageContainer = styled.div`
	padding: 10px 25px 0 50px !important;
	margin-top: -15px; // need to make up for the bottom margin from the preceding reply
`;

export const RepliesToPostContext = React.createContext({
	setReplyingToPostId(postId: string) {},
	setEditingPostId(postId: string) {}
});

export const RepliesToPost = (props: { streamId: string; parentPostId: string }) => {
	const dispatch = useDispatch<Dispatch>();
	const currentUserId = useSelector((state: CodeStreamState) => state.session.userId!);
	const replies = useSelector((state: CodeStreamState) =>
		getThreadPosts(state, props.streamId, props.parentPostId, true)
	);
	const nestedRepliesByParent = React.useMemo(() => {
		const nestedReplies = replies.filter(r => r.parentPostId !== props.parentPostId);
		return groupBy(nestedReplies, "parentPostId");
	}, [replies]);
	const allUsers = useSelector((state: CodeStreamState) => state.users);
	const teamMates = useSelector((state: CodeStreamState) => getTeamMates(state));
	const [replyingToPostId, setReplyingToPostId] = React.useState<string | null>();
	const [editingPostId, setEditingPostId] = React.useState<string | undefined>();
	const [newReplyText, setNewReplyText] = React.useState("");
	const [attachments, setAttachments] = React.useState<AttachmentField[]>([]);
	const [isLoading, setIsLoading] = React.useState(false);

	const contextValue = React.useMemo(
		() => ({
			setReplyingToPostId: setReplyingToPostId as any,
			setEditingPostId: setEditingPostId as any
		}),
		[]
	);

	useDidMount(() => {
		dispatch(fetchThread(props.streamId, props.parentPostId));
	});

	const submit = async () => {
		// don't create empty replies
		if (newReplyText.length === 0) return;

		setIsLoading(true);
		await dispatch(
			createPost(
				props.streamId,
				replyingToPostId!,
				replaceHtml(newReplyText)!,
				null,
				findMentionedUserIds(teamMates, newReplyText),
				{ files: attachments }
			)
		);
		setIsLoading(false);
		setNewReplyText("");
		setAttachments([]);
		setReplyingToPostId(undefined);
	};

	const getMenuItems = (reply: PostPlus) => {
		const menuItems: any[] = [];

		menuItems.push({ label: "Reply", key: "reply", action: () => setReplyingToPostId(reply.id) });
		if (reply.creatorId === currentUserId) {
			menuItems.push({ label: "Edit", key: "edit", action: () => setEditingPostId(reply.id) });
			menuItems.push({
				label: "Delete",
				key: "delete",
				action: () => {
					confirmPopup({
						title: "Are you sure?",
						message: "Deleting a post cannot be undone.",
						centered: true,
						buttons: [
							{ label: "Go Back", className: "control-button" },
							{
								label: "Delete Post",
								className: "delete",
								wait: true,
								action: () => {
									dispatch(deletePost(reply.streamId, reply.id));
								}
							}
						]
					});
				}
			});
		}

		return menuItems;
	};

	return (
		<RepliesToPostContext.Provider value={contextValue}>
			{mapFilter(replies, reply => {
				if (reply.parentPostId != null && nestedRepliesByParent.hasOwnProperty(reply.parentPostId))
					return null;
				const menuItems = getMenuItems(reply as any);
				return (
					<React.Fragment key={reply.id}>
						<Reply
							author={allUsers[reply.creatorId]}
							post={reply}
							editingPostId={editingPostId}
							nestedReplies={nestedRepliesByParent[reply.id] as any}
							renderMenu={(target, close) => (
								<Menu target={target} action={close} items={menuItems} />
							)}
						/>
						{reply.id === replyingToPostId && (
							<InlineMessageContainer>
								<ComposeWrapper>
									<MessageInput
										text={newReplyText}
										onChange={setNewReplyText}
										onSubmit={submit}
										multiCompose
										autoFocus
										attachments={attachments}
										setAttachments={setAttachments}
									/>
								</ComposeWrapper>
								<div style={{ display: "flex", justifyContent: "flex-end" }}>
									<Button
										className="control-button cancel"
										style={{
											// fixed width to handle the isLoading case
											width: "80px",
											margin: "10px 10px"
										}}
										onClick={() => {
											setReplyingToPostId(undefined);
											setNewReplyText("");
										}}
									>
										Cancel
									</Button>
									<Button
										style={{
											// fixed width to handle the isLoading case
											width: "80px",
											margin: "10px 0"
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
							</InlineMessageContainer>
						)}
					</React.Fragment>
				);
			})}
		</RepliesToPostContext.Provider>
	);
};
