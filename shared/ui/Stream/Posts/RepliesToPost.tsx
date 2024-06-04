import { CollaborationComment } from "@codestream/protocols/agent";
import { CodeStreamState } from "@codestream/webview/store";
import {
	currentNrUserIdSelector,
	currentUserIsAdminSelector,
	getTeamMates,
} from "@codestream/webview/store/users/reducer";
import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import { mapFilter } from "@codestream/webview/utils";
import React, { useCallback } from "react";
import { confirmPopup } from "../Confirm";
import Menu from "../Menu";
import { Reply } from "./Reply";
import { MenuItem } from "@codestream/webview/src/components/controls/InlineMenu";

export const RepliesToPost = (props: { comments: CollaborationComment[] }) => {
	const dispatch = useAppDispatch();
	const currentUserId = useAppSelector((state: CodeStreamState) => state.session.userId!);
	const currentNrUserId = useAppSelector(currentNrUserIdSelector);
	const currentUserIsAdmin = useAppSelector(currentUserIsAdminSelector);
	const allUsers = useAppSelector((state: CodeStreamState) => state.users);
	const teamMates = useAppSelector((state: CodeStreamState) => getTeamMates(state));
	const [editingPostId, setEditingPostId] = React.useState<string | undefined>();

	const getMenuItems = useCallback(
		(comment: CollaborationComment) => {
			const menuItems: MenuItem[] = [];

			if (comment.creator.userId === currentNrUserId) {
				menuItems.push({ label: "Edit", key: "edit" }); //action: () => setEditingPostId(reply.id) });
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
		[currentUserId, currentUserIsAdmin]
	);

	let idx = 0;

	return (
		<>
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
						<Reply
							author={allUsers[comment.creator.userId]}
							comment={comment}
							editingPostId={editingPostId}
							renderMenu={renderMenu}
						/>
					</React.Fragment>
				);
			})}
		</>
	);
};
