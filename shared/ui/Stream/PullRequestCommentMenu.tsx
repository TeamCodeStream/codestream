import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "../store";
import Icon from "./Icon";
import Menu from "./Menu";
import { emojify } from "./Markdowner";
import styled from "styled-components";
import { PRReactions, PRReaction } from "./PullRequestComponents";
import Tooltip from "./Tooltip";
import { SmartFormattedList } from "./SmartFormattedList";
import { HostApi } from "../webview-api";
import { ExecuteThirdPartyTypedType } from "@codestream/protocols/agent";
import { DropdownButton } from "./Review/DropdownButton";
import { InlineMenu } from "../src/components/controls/InlineMenu";
import copy from "copy-to-clipboard";
import { confirmPopup } from "./Confirm";
import { api } from "../store/providerPullRequests/actions";

interface CommentMenuProps {
	pr: any;
	node: any;
	nodeType: "ISSUE_COMMENT" | "ROOT_COMMENT" | "REVIEW_COMMENT" | "REVIEW";
	viewerCanDelete?: boolean;
	setEdit?: Function;
	quote?: Function;
	isPending?: boolean;
	fetch: Function;
	setIsLoadingMessage: Function;
}

export const PullRequestCommentMenu = (props: CommentMenuProps) => {
	const { pr, node, setEdit, quote, isPending, fetch, setIsLoadingMessage } = props;
	const dispatch = useDispatch();
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
								api("deletePullRequestReview", {
									pullRequestReviewId: node.id
								})
							);
							fetch();
						} else {
							await dispatch(
								api("deletePullRequestComment", {
									type: props.nodeType,
									id: node.id,
									pullRequestId: pr.id
								})
							);
						}
					}
				}
			]
		});
	};

	const items: any[] = [];

	if (node.resourcePath) {
		items.push({
			label: "Copy Link",
			key: "copy",
			action: () => copy(pr.baseUrl + node.resourcePath)
		});
	}

	if (!isPending && quote) {
		items.push({ label: "Quote Reply", key: "quote", action: () => quote(node.body) });
	}

	if (node.viewerCanUpdate && setEdit) {
		items.push({ label: "-" });
		items.push({
			label: "Edit",
			key: "edit",
			action: () => {
				if (setEdit) setEdit(node, true);
			}
		});
	}

	if (props.viewerCanDelete) {
		items.push({
			label: "Delete",
			key: "delete",
			destructive: true,
			action: () => deleteComment()
		});
	}

	if (items.length === 0) return null;
	else
		return (
			<InlineMenu noChevronDown noFocusOnSelect items={items}>
				<Icon name="kebab-horizontal" className="clickable" />
			</InlineMenu>
		);
};
