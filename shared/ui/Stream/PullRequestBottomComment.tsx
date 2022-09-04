import { useAppDispatch, useAppSelector } from "@codestream/webview/utilities/hooks";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Icon from "./Icon";
import styled from "styled-components";
import { PRComment, PRCommentCard } from "./PullRequestComponents";
import Tooltip from "./Tooltip";
import { HostApi } from "../webview-api";
import {
	ChangeDataType,
	DidChangeDataNotificationType,
	FetchThirdPartyPullRequestPullRequest,
} from "@codestream/protocols/agent";
import { PRHeadshot } from "../src/components/Headshot";
import MessageInput from "./MessageInput";
import { ButtonRow } from "../src/components/Dialog";
import { Button } from "../src/components/Button";
import { api } from "../store/providerPullRequests/thunks";
import { replaceHtml } from "../utils";
import { DropdownButton, DropdownButtonItems } from "./DropdownButton";
import { CodeStreamState } from "../store";
import { getPRLabel } from "../store/providers/reducer";

interface Props {
	pr: FetchThirdPartyPullRequestPullRequest | any;
	setIsLoadingMessage: Function;
	__onDidRender: Function;
	className?: string;
}

export const PullRequestBottomComment = styled((props: Props) => {
	const dispatch = useAppDispatch();
	const { pr, setIsLoadingMessage } = props;

	const derivedState = useAppSelector((state: CodeStreamState) => {
		return {
			prLabel: getPRLabel(state),
		};
	});

	const [text, setText] = useState("");
	const [isLoadingComment, setIsLoadingComment] = useState(false);
	const [isLoadingCommentAndClose, setIsLoadingCommentAndClose] = useState(false);
	const [isPreviewing, setIsPreviewing] = useState(false);

	const trackComment = type => {
		HostApi.instance.track("PR Comment Added", {
			Host: pr.providerId,
			"Comment Type": type,
		});
	};

	const onCommentClick = async (event?: React.SyntheticEvent) => {
		setIsLoadingComment(true);
		trackComment("Comment");
		if (commentType === "thread")
			await dispatch(
				api({ method: "createPullRequestThread", params: { text: replaceHtml(text) } })
			);
		else
			await dispatch(
				api({ method: "createPullRequestComment", params: { text: replaceHtml(text) } })
			);
		setText("");
		setIsLoadingComment(false);
	};

	const onCommentAndCloseClick = async e => {
		setIsLoadingMessage("Closing...");
		setIsLoadingCommentAndClose(true);
		trackComment("Comment and Close");
		await dispatch(
			api({
				method: "createPullRequestCommentAndClose",
				params: {
					text: replaceHtml(text),
					startThread: commentType === "thread",
				},
			})
		);

		HostApi.instance.emit(DidChangeDataNotificationType.method, {
			type: ChangeDataType.PullRequests,
		});
		setText("");
		setIsLoadingMessage("");
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
			api({
				method: "createPullRequestCommentAndReopen",
				params: {
					text: replaceHtml(text),
					startThread: commentType === "thread",
				},
			})
		);

		HostApi.instance.emit(DidChangeDataNotificationType.method, {
			type: ChangeDataType.PullRequests,
		});
		setText("");
		setIsLoadingMessage("");
		setTimeout(() => {
			// create a small buffer for the provider to incorporate this change before re-fetching
			setIsLoadingCommentAndClose(false);
		}, 50);
	};

	const map = {
		OFF_TOPIC: "off-topic",
		SPAM: "spam",
		TOO_HEATED: "too heated",
		RESOLVED: "resolved",
	};

	const [commentType, setCommentType] = useState("comment");
	const isGitLab = pr.providerId.includes("gitlab");
	const commentItems: DropdownButtonItems[] = [];
	if (isGitLab) {
		commentItems.push({
			label: "Comment",
			key: "comment",
			checked: commentType === "comment",
			subtext: (
				<span>
					Add a general comment
					<br />
					to this merge request.
				</span>
			),
			onSelect: () => setCommentType("comment"),
			action: () => onCommentClick(),
		});

		if (pr.supports?.resolvingNotes) {
			commentItems.push({ label: "-" });
			commentItems.push({
				label: "Start thread",
				key: "thread",
				checked: commentType === "thread",
				subtext: (
					<span>
						Discuss a specific suggestion or
						<br />
						question that needs to be resolved.
					</span>
				),
				onSelect: () => setCommentType("thread"),
				action: () => onCommentClick(),
			});
		}
	}

	const submitButton = (
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
			key="submit-tt"
		>
			{isGitLab && commentItems.length > 1 ? (
				<DropdownButton
					key="gitlab-dd"
					isLoading={isLoadingComment}
					disabled={!text}
					splitDropdown
					selectedKey={commentType}
					items={commentItems}
				>
					Comment
				</DropdownButton>
			) : (
				<Button isLoading={isLoadingComment} onClick={onCommentClick} disabled={!text} key="button">
					Comment
				</Button>
			)}
		</Tooltip>
	);

	const reopenButton = (
		<Button
			disabled={pr.merged}
			isLoading={isLoadingCommentAndClose}
			onClick={onCommentAndReopenClick}
			variant="secondary"
			key="reopen"
		>
			{text ? (
				commentType === "thread" ? (
					<>
						Start thread &amp; reopen
						<span className="wide-text"> {derivedState.prLabel.pullrequest}</span>
					</>
				) : (
					"Reopen and comment"
				)
			) : (
				`Reopen ${derivedState.prLabel.pullrequest}`
			)}
		</Button>
	);

	const closeButton = pr.merged ? null : (
		<Button
			isLoading={isLoadingCommentAndClose}
			onClick={onCommentAndCloseClick}
			variant="secondary"
			key="close"
		>
			<Icon name="issue-closed" className="red-color margin-right" />
			{text ? (
				commentType === "thread" ? (
					<>
						Start thread &amp; close
						<span className="wide-text"> {derivedState.prLabel.pullrequest}</span>
					</>
				) : (
					"Close and comment"
				)
			) : (
				`Close ${derivedState.prLabel.pullrequest}`
			)}
		</Button>
	);

	const spacer = <div style={{ width: "10px", display: "inline-block" }} />;
	const buttons =
		pr.state.toLowerCase() === "closed"
			? [reopenButton, spacer, submitButton]
			: [closeButton, spacer, submitButton];

	return (
		<PRComment className={props.className}>
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
								fontFamily: "var(--font-family)",
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
							<div
								style={{
									textAlign: isGitLab ? "left" : "right",
									flexGrow: 1,
									flexWrap: "wrap",
									justifyContent: "flex-end",
									whiteSpace: "normal", // required for wrap
								}}
							>
								{isGitLab ? [...buttons].reverse() : buttons}
							</div>
						)}
					</>
				)}
			</PRCommentCard>
		</PRComment>
	);
})`
	button {
		margin-top: 10px !important;
	}
`;
