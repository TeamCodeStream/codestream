import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import React, { useState } from "react";
import styled from "styled-components";
import { PRComment, PRCommentCard } from "./PullRequestComponents";
import Tooltip from "./Tooltip";
import { FetchThirdPartyPullRequestPullRequest } from "@codestream/protocols/agent";
import { MessageInput } from "./MessageInput";
import { ButtonRow } from "../src/components/Dialog";
import { Button } from "../src/components/Button";
import { api } from "../store/providerPullRequests/thunks";
import { replaceHtml } from "../utils";
import { CodeStreamState } from "../store";
import { getPRLabel } from "../store/providers/reducer";

interface Props {
	pr: FetchThirdPartyPullRequestPullRequest;
	mode?: string;
	contents?: string;
	filename: string;
	oldLineNumber?: number | undefined;
	lineNumber?: number | undefined;
	lineOffsetInHunk: number;
	setIsLoadingMessage: Function;
	__onDidRender: Function;
	className?: string;
	onClose: Function;
}

export const PullRequestInlineComment = styled((props: Props) => {
	const dispatch = useAppDispatch();
	const { pr, filename, oldLineNumber, lineNumber, lineOffsetInHunk, setIsLoadingMessage } = props;

	const derivedState = useAppSelector((state: CodeStreamState) => {
		return {
			prLabel: getPRLabel(state),
		};
	});

	const [text, setText] = useState("");
	const [isLoadingSingleComment, setIsLoadingSingleComment] = useState(false);
	const [isLoadingStartReview, setIsLoadingStartReview] = useState(false);
	const [isPreviewing, setIsPreviewing] = useState(false);

	const trackComment = type => {
		// HostApi.instance.track("PR Comment Added", {
		// 	Host: pr.providerId,
		// 	"Comment Type": type,
		// });
	};

	const addSingleComment = async e => {
		setIsLoadingMessage("Adding Comment...");
		setIsLoadingSingleComment(true);
		trackComment("Inline Single Comment");
		await dispatch(
			api({
				method: "createPullRequestInlineComment",
				params: {
					filePath: filename,
					oldLineNumber: oldLineNumber,
					startLine: lineNumber,
					text: replaceHtml(text),
					leftSha: pr.baseRefOid,
					rightSha: pr.headRefOid,
					// old servers
					position: lineOffsetInHunk,
					metadata: {
						contents: props.contents,
						fileWithUrl: filename,
						startLine: lineNumber,
						// only single line comments
						endLine: lineNumber,
					},
				},
			})
		);
		setText("");
		setIsLoadingMessage("");
		setIsLoadingSingleComment(false);
		props.onClose();
	};

	const startReview = async e => {
		setIsLoadingMessage("Starting Review...");
		setIsLoadingStartReview(true);
		trackComment("Inline Review Comment");

		await dispatch(
			api({
				method: "createPullRequestInlineReviewComment",
				params: {
					filePath: filename,
					position: lineOffsetInHunk,
					oldLineNumber: oldLineNumber,
					startLine: lineNumber,
					text: replaceHtml(text),
					leftSha: pr.baseRefOid,
					sha: pr.headRefOid,
				},
			})
		);
		setText("");
		setIsLoadingMessage("");
		setIsLoadingStartReview(false);
		props.onClose();
	};

	const map = {
		OFF_TOPIC: "off-topic",
		SPAM: "spam",
		TOO_HEATED: "too heated",
		RESOLVED: "resolved",
	};

	const marginWidth = pr.providerId.includes("gitlab") ? "110px" : "80px";
	return (
		<PRComment
			style={{
				margin: "15px",
				maxWidth: `min(600px, calc(100vw - ${marginWidth}))`,
			}}
		>
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
						<div
							style={{
								margin: "5px 0 0 0",
								border: isPreviewing ? "none" : "1px solid var(--base-border-color)",
								fontFamily: "var(--font-family)",
							}}
						>
							<MessageInput
								multiCompose
								autoFocus
								text={text}
								placeholder="Leave a comment"
								onChange={setText}
								onSubmit={startReview}
								setIsPreviewing={value => setIsPreviewing(value)}
								__onDidRender={stuff => props.__onDidRender(stuff)}
							/>
							<div style={{ clear: "both" }}></div>
						</div>
						{!isPreviewing && (
							<ButtonRow>
								<Button onClick={() => props.onClose()} variant="secondary">
									Cancel
								</Button>

								<Button
									isLoading={isLoadingSingleComment}
									onClick={addSingleComment}
									disabled={(pr && pr.pendingReview != null) || !text}
								>
									{derivedState.prLabel.AddSingleComment}
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
									<Button isLoading={isLoadingStartReview} onClick={startReview} disabled={!text}>
										{pr.pendingReview ? "Add to review" : "Start a review"}
									</Button>
								</Tooltip>
							</ButtonRow>
						)}
					</>
				)}
			</PRCommentCard>
		</PRComment>
	);
})``;
