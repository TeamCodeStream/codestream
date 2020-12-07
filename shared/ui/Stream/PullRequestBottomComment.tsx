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
import { replaceHtml } from "../utils";

interface Props {
	pr: FetchThirdPartyPullRequestPullRequest;
	setIsLoadingMessage: Function;
	__onDidRender: Function;
	className?: string;
}

export const PullRequestBottomComment = styled((props: Props) => {
	const dispatch = useDispatch();
	const { pr, setIsLoadingMessage } = props;
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
	const [isLoadingComment, setIsLoadingComment] = useState(false);
	const [isLoadingCommentAndClose, setIsLoadingCommentAndClose] = useState(false);

	const trackComment = type => {
		HostApi.instance.track("PR Comment Added", {
			Host: pr.providerId,
			"Comment Type": type
		});
	};

	const onCommentClick = async (event?: React.SyntheticEvent) => {
		setIsLoadingComment(true);
		trackComment("Comment");
		await dispatch(
			api("createPullRequestComment", {
				text: replaceHtml(text)
			})
		);
		setText("");
		setIsLoadingComment(false);
	};

	const onCommentAndCloseClick = async e => {
		setIsLoadingMessage("Closing...");
		setIsLoadingCommentAndClose(true);
		trackComment("Comment and Close");
		await dispatch(
			api("createPullRequestCommentAndClose", {
				text: replaceHtml(text)
			})
		);
		setText("");
		dispatch(removeFromMyPullRequests(pr.providerId, derivedState.currentPullRequestId!));
		setIsLoadingCommentAndClose(false);
	};

	const onCommentAndReopenClick = async e => {
		setIsLoadingMessage("Reopening...");
		setIsLoadingCommentAndClose(true);
		trackComment("Comment and Reopen");
		await dispatch(
			api("createPullRequestCommentAndReopen", {
				text: replaceHtml(text)
			})
		);
		setText("");
		setIsLoadingCommentAndClose(false);
	};

	const map = {
		OFF_TOPIC: "off-topic",
		SPAM: "spam",
		TOO_HEATED: "too heated",
		RESOLVED: "resolved"
	};

	return (
		<PRComment>
			<PRHeadshot size={40} person={pr.viewer}></PRHeadshot>
			<PRCommentCard className="add-comment">
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
								placeholder="Add Comment..."
								onChange={setText}
								onSubmit={onCommentClick}
								__onDidRender={stuff => props.__onDidRender(stuff)}
							/>
						</div>
						<ButtonRow>
							{pr.state === "CLOSED" ? (
								<div style={{ textAlign: "right", flexGrow: 1 }}>
									<Button
										disabled={pr.merged}
										isLoading={isLoadingCommentAndClose}
										onClick={onCommentAndReopenClick}
										variant="secondary"
									>
										{text ? "Reopen and comment" : "Reopen pull request"}
									</Button>

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
										<Button isLoading={isLoadingComment} onClick={onCommentClick} disabled={!text}>
											Comment
										</Button>
									</Tooltip>
								</div>
							) : (
								<div style={{ textAlign: "right", flexGrow: 1 }}>
									{!pr.merged && (
										<Button
											isLoading={isLoadingCommentAndClose}
											onClick={onCommentAndCloseClick}
											variant="secondary"
										>
											<Icon name="issue-closed" className="red-color margin-right" />
											{text ? "Close and comment" : "Close pull request"}
										</Button>
									)}
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
										<Button isLoading={isLoadingComment} onClick={onCommentClick} disabled={!text}>
											Comment
										</Button>
									</Tooltip>
								</div>
							)}
						</ButtonRow>
					</>
				)}
			</PRCommentCard>
		</PRComment>
	);
})``;
