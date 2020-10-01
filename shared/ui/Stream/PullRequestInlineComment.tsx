import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { CodeStreamState } from "../store";
import Icon from "./Icon";
import styled from "styled-components";
import { PRComment, PRCommentCard } from "./PullRequestComponents";
import Tooltip from "./Tooltip";
import { HostApi } from "../webview-api";
import { FetchThirdPartyPullRequestPullRequest } from "@codestream/protocols/agent";
import { PRHeadshot } from "../src/components/Headshot";
import MessageInput from "./MessageInput";
import { CSMe } from "@codestream/protocols/api";
import { ButtonRow } from "../src/components/Dialog";
import { Button } from "../src/components/Button";
import { api, removeFromMyPullRequests } from "../store/providerPullRequests/actions";

interface Props {
	pr: FetchThirdPartyPullRequestPullRequest;
	setIsLoadingMessage: Function;
	fetch: Function;
	__onDidRender: Function;
	className?: string;
	onClose: Function;
}

export const PullRequestInlineComment = styled((props: Props) => {
	const dispatch = useDispatch();
	const { pr, fetch, setIsLoadingMessage } = props;
	const derivedState = useSelector((state: CodeStreamState) => {
		const currentUser = state.users[state.session.userId!] as CSMe;
		return {
			currentUser,
			currentPullRequestId: state.context.currentPullRequest
				? state.context.currentPullRequest.id
				: undefined
		};
	});

	const [text, setText] = useState("");
	const [isLoadingSingleComment, setIsLoadingSingleComment] = useState(false);
	const [isLoadingStartReview, setIsLoadingStartReview] = useState(false);

	const trackComment = type => {
		HostApi.instance.track("PR Comment Added", {
			Host: pr.providerId,
			"Comment Type": type
		});
	};

	const addSingleComment = async e => {
		setIsLoadingMessage("Adding Comment...");
		setIsLoadingSingleComment(true);
		trackComment("Inline Single Comment");
		// await api("createPullRequestCommentAndClose", {
		// 	text: text
		// });
		setText("");
		fetch().then(() => {
			dispatch(removeFromMyPullRequests(pr.providerId, derivedState.currentPullRequestId!));
			setIsLoadingSingleComment(false);
		});
	};

	const startReview = async e => {
		setIsLoadingMessage("Starting Review...");
		setIsLoadingStartReview(true);
		trackComment("Inline Start Review");
		// await api("createPullRequestCommentAndClose", {
		// 	text: text
		// });
		setText("");
		fetch().then(() => {
			dispatch(removeFromMyPullRequests(pr.providerId, derivedState.currentPullRequestId!));
			setIsLoadingStartReview(false);
		});
	};

	const map = {
		OFF_TOPIC: "off-topic",
		SPAM: "spam",
		TOO_HEATED: "too heated",
		RESOLVED: "resolved"
	};

	return (
		<PRComment>
			<PRCommentCard className="no-headshot no-arrow">
				{pr.locked ? (
					<>
						This conversation has been locked{" "}
						{map[pr.activeLockReason] ? (
							<>
								as <b>{map[pr.activeLockReason]}</b>
							</>
						) : (
							""
						)}{" "}
						and limited to collaborators
					</>
				) : (
					<>
						<div style={{ margin: "5px 0 0 0", border: "1px solid var(--base-border-color)" }}>
							<MessageInput
								multiCompose
								text={text}
								placeholder="Leave a comment"
								onChange={setText}
								onSubmit={startReview}
								__onDidRender={stuff => props.__onDidRender(stuff)}
							/>
						</div>
						<ButtonRow>
							<div style={{ textAlign: "right", flexGrow: 1 }}>
								<Button onClick={() => props.onClose()} variant="secondary">
									Cancel
								</Button>

								<Button
									isLoading={isLoadingSingleComment}
									onClick={addSingleComment}
									disabled={!text}
								>
									Add single comment
								</Button>
								<Tooltip
									title={
										<span>
											Submit Comment
											<span className="keybinding extra-pad">
												{navigator.appVersion.includes("Macintosh") ? "⌘" : "Alt"} ENTER
											</span>
										</span>
									}
									placement="bottomRight"
									delay={1}
								>
									<Button isLoading={isLoadingStartReview} onClick={startReview} disabled={!text}>
										Start a review
									</Button>
								</Tooltip>
							</div>
						</ButtonRow>
					</>
				)}
			</PRCommentCard>
		</PRComment>
	);
})``;
