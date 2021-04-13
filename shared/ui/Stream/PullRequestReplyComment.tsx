import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import styled from "styled-components";
import { PRButtonRow, PRCodeCommentReply, PRCodeCommentReplyInput } from "./PullRequestComponents";
import { HostApi } from "../webview-api";
import { FetchThirdPartyPullRequestPullRequest } from "@codestream/protocols/agent";
import MessageInput from "./MessageInput";
import { Button } from "../src/components/Button";
import { confirmPopup } from "./Confirm";
import { PRHeadshot } from "../src/components/Headshot";
import { api } from "../store/providerPullRequests/actions";
import { replaceHtml } from "../utils";

interface Props {
	pr: FetchThirdPartyPullRequestPullRequest;
	mode?: string;
	className?: string;
	databaseId: string;
	parentId?: string;
	isOpen: boolean;
	__onDidRender: Function;
}

export const PullRequestReplyComment = styled((props: Props) => {
	const { pr, databaseId, parentId } = props;
	const dispatch = useDispatch();

	const [text, setText] = useState("");
	const [open, setOpen] = useState(props.isOpen);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isPreviewing, setIsPreviewing] = useState(false);

	useEffect(() => setOpen(props.isOpen), [props.isOpen]);

	const handleComment = async () => {
		try {
			if (text == null || text == "") return;
			setIsSubmitting(true);

			HostApi.instance.track("PR Comment Added", {
				Host: pr.providerId,
				"Comment Type": "Single Reply"
			});

			await dispatch(
				api("createCommentReply", {
					parentId: parentId,
					commentId: databaseId,
					text: replaceHtml(text)
				})
			);

			setText("");
			setOpen(false);
		} catch (ex) {
			console.warn(ex);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCancelComment = async () => {
		if (text == null || text == undefined || text == "") {
			setOpen(false);
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
						label: "Discard Comment",
						className: "delete",
						wait: true,
						action: () => {
							setText("");
							setOpen(false);
						}
					}
				]
			});
		}
	};

	return (
		<PRCodeCommentReply className={props.className}>
			<PRHeadshot size={30} person={pr.viewer} />

			<PRCodeCommentReplyInput className={open ? "open-comment" : ""} onClick={() => setOpen(true)}>
				<MessageInput
					multiCompose
					text={text}
					placeholder="Reply..."
					onChange={value => setText(value)}
					onSubmit={handleComment}
					setIsPreviewing={value => setIsPreviewing(value)}
					__onDidRender={stuff => props.__onDidRender(stuff)}
				/>
			</PRCodeCommentReplyInput>
			{open && !isPreviewing && (
				<PRButtonRow>
					<Button variant="secondary" onClick={handleCancelComment}>
						Cancel
					</Button>

					<Button variant="primary" isLoading={isSubmitting} onClick={handleComment}>
						Comment
					</Button>
				</PRButtonRow>
			)}
		</PRCodeCommentReply>
	);
})``;
