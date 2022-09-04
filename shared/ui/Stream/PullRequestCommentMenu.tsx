import { useAppDispatch } from "@codestream/webview/utilities/hooks";
import React from "react";
import { useDispatch } from "react-redux";
import Icon from "./Icon";
import { InlineMenu } from "../src/components/controls/InlineMenu";
import copy from "copy-to-clipboard";
import { confirmPopup } from "./Confirm";
import { api } from "../store/providerPullRequests/thunks";

interface CommentMenuProps {
	pr: any;
	node: any;
	nodeType: "ISSUE_COMMENT" | "ROOT_COMMENT" | "REVIEW_COMMENT" | "REVIEW";
	viewerCanDelete?: boolean;
	parentId?: string;
	setEdit?: Function;
	quote?: Function;
	isPending?: boolean;
	setIsLoadingMessage: Function;
}

export const PullRequestCommentMenu = (props: CommentMenuProps) => {
	const { pr, node, setEdit, quote, isPending, setIsLoadingMessage } = props;

	// console.warn("MENU IS: ", props);

	const dispatch = useAppDispatch();
	const deleteComment = () => {
		confirmPopup({
			title: "Are you sure?",
			message: "",
			centered: true,
			buttons: [
				{ label: "Go Back", className: "control-button" },
				{
					label: "Delete",
					className: "delete",
					wait: true,
					action: async () => {
						setIsLoadingMessage("Deleting Comment...");

						if (props.nodeType === "REVIEW") {
							await dispatch(
								api({
									method: "deletePullRequestReview",
									params: {
										pullRequestReviewId: node.id,
										parentId: props.parentId,
									},
								})
							);
						} else {
							await dispatch(
								api({
									method: "deletePullRequestComment",
									params: {
										type: props.nodeType,
										isPending: props.isPending,
										parentId: props.parentId,
										id: node.id,
									},
								})
							);
						}
						setIsLoadingMessage("");
					},
				},
			],
		});
	};

	const items: any[] = [];

	if (node.resourcePath) {
		items.push({
			label: "Copy Link",
			key: "copy",
			action: () => copy(pr.baseUrl + node.resourcePath),
		});
	}

	if (!isPending && quote) {
		items.push({ label: "Quote Reply", key: "quote", action: () => quote(node.body) });
	}

	if (
		(node.viewerCanUpdate ||
			node.state === "PENDING" ||
			(node.userPermissions && node.userPermissions.adminNote)) &&
		setEdit
	) {
		if (items.length > 0) items.push({ label: "-" });
		items.push({
			label: "Edit",
			key: "edit",
			action: () => {
				if (setEdit) setEdit(node, true);
			},
		});
	}

	if (props.viewerCanDelete || (node.userPermissions && node.userPermissions.adminNote)) {
		items.push({
			label: "Delete",
			key: "delete",
			destructive: true,
			action: () => deleteComment(),
		});
	}

	if (items.length === 0) return null;
	else
		return (
			<InlineMenu noChevronDown noFocusOnSelect items={items}>
				<Icon name="kebab-vertical" className="clickable" />
			</InlineMenu>
		);
};
