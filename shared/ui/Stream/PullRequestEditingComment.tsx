import { useAppDispatch } from "@codestream/webview/utilities/hooks";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import styled from "styled-components";
import { PRButtonRow } from "./PullRequestComponents";
import {
	FetchThirdPartyPullRequestPullRequest,
	GitLabMergeRequest,
} from "@codestream/protocols/agent";
import MessageInput from "./MessageInput";
import { Button } from "../src/components/Button";
import { confirmPopup } from "./Confirm";
import { api } from "../store/providerPullRequests/thunks";
import { replaceHtml } from "../utils";

interface Props {
	pr: FetchThirdPartyPullRequestPullRequest | GitLabMergeRequest;
	setIsLoadingMessage: Function;
	className?: string;
	id: string;
	isPending: boolean;
	type: "PR" | "ISSUE" | "REVIEW" | "REVIEW_COMMENT";
	done: Function;
	text: string;
}

export const PullRequestEditingComment = styled((props: Props) => {
	const dispatch = useAppDispatch();
	const { pr, setIsLoadingMessage, type, id, done } = props;
	const [text, setText] = useState(props.text);
	const [isPreviewing, setIsPreviewing] = useState(false);

	const handleEdit = async () => {
		setIsLoadingMessage("Updating Comment...");
		try {
			if (text == "" || text == props.text) return;

			await dispatch(
				api({
					method:
						type === "REVIEW_COMMENT"
							? "updateReviewComment"
							: type === "ISSUE"
							? "updateIssueComment"
							: type === "PR"
							? "updatePullRequestBody"
							: "updateReview",
					params: {
						pullRequestId: "idComputed" in pr ? pr.idComputed : pr.id,
						id,
						isPending: props.isPending,
						body: replaceHtml(text),
					},
				})
			);

			setText("");
			done();
		} catch (ex) {
			console.warn(ex);
		} finally {
			setIsLoadingMessage("");
		}
	};

	const handleCancelEdit = async () => {
		if (text == null || text == undefined || text == props.text) {
			done();
			return;
		}
		if (text.length > 0) {
			confirmPopup({
				title: "Are you sure?",
				message: "",
				centered: true,
				buttons: [
					{ label: "Go Back", className: "control-button" },
					{
						label: "Discard Edits",
						className: "delete",
						wait: true,
						action: () => {
							setText("");
							done();
						},
					},
				],
			});
		}
	};

	return (
		<>
			<div style={{ border: isPreviewing ? "none" : "1px solid var(--base-border-color)" }}>
				<MessageInput
					autoFocus
					multiCompose
					text={text}
					onChange={value => setText(value)}
					onSubmit={handleEdit}
					setIsPreviewing={value => setIsPreviewing(value)}
				/>
			</div>
			{!isPreviewing && (
				<PRButtonRow>
					<Button variant="secondary" onClick={handleCancelEdit}>
						Cancel
					</Button>
					<Button variant="primary" onClick={handleEdit}>
						Update comment
					</Button>
				</PRButtonRow>
			)}
		</>
	);
})``;
