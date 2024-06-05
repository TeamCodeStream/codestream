import { CollaborationComment } from "@codestream/protocols/agent";
import { CodeStreamState } from "@codestream/webview/store";
import {
	currentNrUserIdSelector,
	currentUserIsAdminSelector,
} from "@codestream/webview/store/users/reducer";
import { useAppSelector } from "@codestream/webview/utilities/hooks";
import { mapFilter } from "@codestream/webview/utils";
import React, { useCallback } from "react";
import { confirmPopup } from "../Confirm";
import Menu from "../Menu";
import { Comment } from "./Comment";
import { MenuItem } from "@codestream/webview/src/components/controls/InlineMenu";

export interface DiscussionThreadProps {
	threadId: string;
	comments: CollaborationComment[];
}

export const DiscussionThread = (props: DiscussionThreadProps) => {
	const currentUserId = useAppSelector((state: CodeStreamState) => state.session.userId!);
	const currentNrUserId = useAppSelector(currentNrUserIdSelector);
	const currentUserIsAdmin = useAppSelector(currentUserIsAdminSelector);
	const [editingCommentId, setEditingCommentId] = React.useState<string | undefined>();

	const getMenuItems = useCallback(
		(comment: CollaborationComment) => {
			const menuItems: MenuItem[] = [];

			if (comment.creator.userId === currentNrUserId) {
				menuItems.push({
					label: "Edit",
					key: "edit",
					action: () => setEditingCommentId(comment.id),
				});
			}
			if (comment.creator.userId === currentNrUserId || currentUserIsAdmin) {
				menuItems.push({
					label: "Delete",
					key: "delete",
					action: () => {
						confirmPopup({
							title: "Are you sure?",
							message: "Deleting a comment cannot be undone.",
							centered: true,
							buttons: [
								{ label: "Go Back", className: "control-button" },
								{
									label: "Delete Post",
									className: "delete",
									wait: true,
									// TODO COLLAB-ERROS: Delete Single Comment
									// action: () => {
									// 	dispatch(
									// 		deletePostApi({
									// 			streamId: reply.streamId,
									// 			postId: reply.id,
									// 			sharedTo: reply.sharedTo,
									// 		})
									// 	);
									// },
								},
							],
						});
					},
				});
			}

			return menuItems;
		},
		[currentUserId, currentUserIsAdmin, currentNrUserId]
	);

	let idx = 0;

	return (
		<React.Fragment key={props.threadId}>
			{mapFilter(props.comments, (comment: CollaborationComment) => {
				idx++;
				const menuItems = getMenuItems(comment);
				const renderMenu =
					menuItems.length === 0
						? undefined
						: (target, close) => {
								return <Menu target={target} action={close} items={menuItems} />;
						  };

				return (
					<React.Fragment key={comment.id}>
						<Comment
							comment={comment}
							editingCommentId={editingCommentId}
							renderMenu={renderMenu}
						/>
					</React.Fragment>
				);
			})}
		</React.Fragment>
	);
};
