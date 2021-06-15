import React, { useState } from "react";
import { PRCommentCard, ButtonRow } from "./PullRequestComponents";
import MessageInput from "./MessageInput";
import { RadioGroup, Radio } from "../src/components/RadioGroup";
import { useDispatch } from "react-redux";
import { HostApi } from "..";
import { Button } from "../src/components/Button";
import Tooltip from "./Tooltip";
import { api } from "../store/providerPullRequests/actions";
import { replaceHtml } from "../utils";
import { FetchThirdPartyPullRequestPullRequest } from "@codestream/protocols/agent";
import { confirmPopup } from "./Confirm";

export const PullRequestFinishReview = (props: {
	pr:
		| {
				providerId: string;
				viewerDidAuthor: boolean;
				pendingReview?: {
					id: string;
					author: {
						login: string;
						avatarUrl: string;
					};
					comments?: {
						totalCount: number;
					};
				};
		  }
		| FetchThirdPartyPullRequestPullRequest;
	mode: "dropdown" | "timeline";
	setIsLoadingMessage: Function;
	setFinishReviewOpen?: Function;
}) => {
	const dispatch = useDispatch();
	const [reviewText, setReviewText] = useState("");
	const [submittingReview, setSubmittingReview] = useState(false);
	const [reviewType, setReviewType] = useState<"COMMENT" | "APPROVE" | "REQUEST_CHANGES">(
		"COMMENT"
	);
	const [isPreviewing, setIsPreviewing] = useState(false);

	const { pr, mode, setIsLoadingMessage, setFinishReviewOpen } = props;

	const supportsFinishReviewTypes = !pr.providerId.includes("gitlab");

	const submitReview = async e => {
		setIsLoadingMessage("Submitting Review...");
		setSubmittingReview(true);
		HostApi.instance.track("PR Review Finished", {
			Host: pr.providerId,
			"Review Type": reviewType
		});
		await dispatch(
			api("submitReview", {
				eventType: reviewType,
				text: replaceHtml(reviewText)
			})
		);
		setFinishReviewOpen && setFinishReviewOpen(false);
		setIsLoadingMessage("");
	};

	const cancelReview = async (e, id) => {
		setIsLoadingMessage("Canceling Review...");
		await dispatch(
			api("deletePullRequestReview", {
				pullRequestReviewId: id
			})
		);
		setFinishReviewOpen && setFinishReviewOpen(false);
		setIsLoadingMessage("");
	};

	const pendingCommentCount =
		pr && pr.pendingReview && pr.pendingReview.comments ? pr.pendingReview.comments.totalCount : 0;

	return (
		<PRCommentCard className={`add-comment finish-review-${mode}`}>
			<div
				style={{
					margin: "5px 0 15px 0",
					border: isPreviewing ? "none" : "1px solid var(--base-border-color)"
				}}
			>
				<MessageInput
					autoFocus
					multiCompose
					text={reviewText}
					placeholder="Leave a comment"
					onChange={setReviewText}
					onSubmit={submitReview}
					setIsPreviewing={value => setIsPreviewing(value)}
				/>
				<div style={{ clear: "both" }}></div>
			</div>
			{!isPreviewing && supportsFinishReviewTypes && (
				<RadioGroup
					name="approval"
					selectedValue={reviewType}
					onChange={value => setReviewType(value)}
				>
					<Radio value={"COMMENT"}>
						Comment
						<div className="subtle">Submit general feedback without explicit approval.</div>
					</Radio>
					<Radio disabled={pr.viewerDidAuthor} value={"APPROVE"}>
						<Tooltip
							title={
								pr.viewerDidAuthor
									? "Pull request authors can't approve their own pull request"
									: ""
							}
							placement="top"
						>
							<span>
								Approve
								<div className="subtle">Submit feedback and approve merging these changes. </div>
							</span>
						</Tooltip>
					</Radio>
					<Radio disabled={pr.viewerDidAuthor} value={"REQUEST_CHANGES"}>
						<Tooltip
							title={
								pr.viewerDidAuthor
									? "Pull request authors can't request changes on their own pull request"
									: ""
							}
							placement="top"
						>
							<span>
								{" "}
								Request Changes
								<div className="subtle">Submit feedback that must be addressed before merging.</div>
							</span>
						</Tooltip>
					</Radio>
				</RadioGroup>
			)}
			{!isPreviewing && (
				<ButtonRow>
					<Button
						disabled={!pendingCommentCount && !supportsFinishReviewTypes}
						isLoading={submittingReview}
						onClick={submitReview}
					>
						Submit<span className="wide-text"> review</span>
					</Button>
					{pendingCommentCount > 0 && (
						<Button
							variant="secondary"
							onClick={e => {
								confirmPopup({
									title: "Are you sure?",
									message: "Pending review comments will be lost.",
									centered: true,
									buttons: [
										{ label: "Go Back", className: "control-button" },
										{
											label: "Cancel Review ",
											className: "delete",
											wait: true,
											action: () => {
												cancelReview(e, pr.pendingReview?.id);
											}
										}
									]
								});
							}}
						>
							Cancel review
						</Button>
					)}
					<div className="subtle" style={{ margin: "10px 0 0 10px" }}>
						{pendingCommentCount} pending comment{pendingCommentCount == 1 ? "" : "s"}
					</div>
				</ButtonRow>
			)}
		</PRCommentCard>
	);
};
