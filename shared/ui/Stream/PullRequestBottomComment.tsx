import React, { useState } from "react";
import { useDispatch } from "react-redux";
import Icon from "./Icon";
import styled from "styled-components";
import { PRComment, PRCommentCard } from "./PullRequestComponents";
import Tooltip from "./Tooltip";
import { HostApi } from "../webview-api";
import {
	ChangeDataType,
	DidChangeDataNotificationType,
	FetchThirdPartyPullRequestPullRequest
} from "@codestream/protocols/agent";
import { PRHeadshot } from "../src/components/Headshot";
import MessageInput from "./MessageInput";
import { ButtonRow } from "../src/components/Dialog";
import { Button } from "../src/components/Button";
import { api } from "../store/providerPullRequests/actions";
import { replaceHtml } from "../utils";

interface Props {
	pr: FetchThirdPartyPullRequestPullRequest | any;
	setIsLoadingMessage: Function;
	__onDidRender: Function;
	className?: string;
}

export const PullRequestBottomComment = styled((props: Props) => {
	const dispatch = useDispatch();
	const { pr, setIsLoadingMessage } = props;

	const [text, setText] = useState("");
	const [isLoadingComment, setIsLoadingComment] = useState(false);
	const [isLoadingCommentAndClose, setIsLoadingCommentAndClose] = useState(false);
	const [isPreviewing, setIsPreviewing] = useState(false);

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

		HostApi.instance.emit(DidChangeDataNotificationType.method, {
			type: ChangeDataType.PullRequests
		});
		setText("");
		setTimeout(() => {
			// create a small buffer for the provider to incorporate this change before re-fetching
			setIsLoadingCommentAndClose(false);
		}, 50);
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

		HostApi.instance.emit(DidChangeDataNotificationType.method, {
			type: ChangeDataType.PullRequests
		});
		setText("");
		setTimeout(() => {
			// create a small buffer for the provider to incorporate this change before re-fetching
			setIsLoadingCommentAndClose(false);
		}, 50);
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
						<div
							style={{
								margin: "5px 0 0 0",
								border: isPreviewing ? "none" : "1px solid var(--base-border-color)",
								fontFamily: "var(--font-family)"
							}}
						>
							<MessageInput
								multiCompose
								text={text}
								placeholder="Add Comment..."
								onChange={setText}
								onSubmit={onCommentClick}
								setIsPreviewing={value => setIsPreviewing(value)}
								__onDidRender={stuff => props.__onDidRender(stuff)}
							/>
							<div style={{ clear: "both" }}></div>
						</div>
						{!isPreviewing && (
							<ButtonRow>
								{pr.state.toLowerCase() === "closed" ? (
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
											<Button
												isLoading={isLoadingComment}
												onClick={onCommentClick}
												disabled={!text}
											>
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
											<Button
												isLoading={isLoadingComment}
												onClick={onCommentClick}
												disabled={!text}
											>
												Comment
											</Button>
										</Tooltip>
									</div>
								)}
							</ButtonRow>
						)}
					</>
				)}
			</PRCommentCard>
		</PRComment>
	);
})``;
