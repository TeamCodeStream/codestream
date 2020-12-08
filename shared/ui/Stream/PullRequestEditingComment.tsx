import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "../store";
import styled from "styled-components";
import { PRButtonRow } from "./PullRequestComponents";
import { FetchThirdPartyPullRequestPullRequest } from "@codestream/protocols/agent";
import MessageInput from "./MessageInput";
import { CSMe } from "@codestream/protocols/api";
import { Button } from "../src/components/Button";
import { confirmPopup } from "./Confirm";
import { api } from "../store/providerPullRequests/actions";

interface Props {
	pr: FetchThirdPartyPullRequestPullRequest;
	setIsLoadingMessage: Function;
	className?: string;
	id: string;
	type: "PR" | "ISSUE" | "REVIEW" | "REVIEW_COMMENT";
	done: Function;
	text: string;
}

export const PullRequestEditingComment = styled((props: Props) => {
	const dispatch = useDispatch();
	const { pr, setIsLoadingMessage, type, id, done } = props;
	const [text, setText] = useState(props.text);

	const handleEdit = async () => {
		setIsLoadingMessage("Updating Comment...");
		try {
			if (text == "" || text == props.text) return;

			await dispatch(
				api(
					type === "REVIEW_COMMENT"
						? "updateReviewComment"
						: type === "ISSUE"
						? "updateIssueComment"
						: type === "PR"
						? "updatePullRequestBody"
						: "updateReview",
					{
						pullRequestId: pr.id,
						id,
						body: text
					}
				)
			);

			setText("");
			done();
		} catch (ex) {
			console.warn(ex);
		} finally {
			setIsLoadingMessage();
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
						}
					}
				]
			});
		}
	};

	const map = {
		OFF_TOPIC: "off-topic",
		SPAM: "spam",
		TOO_HEATED: "too heated",
		RESOLVED: "resolved"
	};

	return (
		<>
			<div style={{ border: "1px solid var(--base-border-color)" }}>
				<MessageInput
					autoFocus
					multiCompose
					text={text}
					onChange={value => setText(value)}
					onSubmit={handleEdit}
				/>
			</div>
			<PRButtonRow>
				<Button variant="secondary" onClick={handleCancelEdit}>
					Cancel
				</Button>
				<Button variant="primary" onClick={handleEdit}>
					Update comment
				</Button>
			</PRButtonRow>
		</>
	);
})``;
