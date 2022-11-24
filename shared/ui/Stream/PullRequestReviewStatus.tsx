import { FetchThirdPartyPullRequestPullRequest } from "@codestream/protocols/agent";
import { CSMe } from "@codestream/protocols/api";
import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";

import { PRHeadshotName } from "../src/components/HeadshotName";
import { CodeStreamState } from "../store";
import Icon from "./Icon";
import { PRIconButton } from "./PullRequestComponents";

export const PRStatusRow = styled.div`
	position: relative;
	display: flex;
	align-items: flex-start;
	border-bottom: 1px solid var(--base-border-color);
	margin: 0 -15px 10px -15px;
	padding: 0 15px 10px 15px;
	.middle {
		margin: 0 10px;
	}
	.right {
		margin-left: auto;
	}
`;

export const PRShortStatusRow = styled.div`
	position: relative;
	display: flex;
	align-items: center;
	border-bottom: 1px solid var(--base-border-color);
	margin: -10px -15px 10px -15px;
	padding: 5px 15px 5px 15px;
	.middle {
		margin: 0 10px;
	}
	.right {
		margin-left: auto;
	}
	${PRHeadshotName} {
		position: relative !important;
		padding-right: 0 !important;
		padding-bottom: 0 !important;
		font-weight: bold;
	}
`;

export const Donut = styled.div<{ degrees: number }>`
	width: 30px;
	height: 30px;
	border-radius: 50%;
	position: relative;

	/* fixes a minor clipping issue in Chrome */
	background-origin: border-box;
	background-image: conic-gradient(#7aba5d ${props => props.degrees}deg, #d73a4a 0);
	mask: radial-gradient(circle, transparent 10px, white 10px);
`;

export const ColorDonut = styled.div<{ green: number; red: number; yellow: number; gray: number }>`
	width: 30px;
	height: 30px;
	border-radius: 50%;
	position: relative;

	/* fixes a minor clipping issue in Chrome */
	background-origin: border-box;
	background-image: conic-gradient(
		#7aba5d 0 ${props => props.green}deg,
		#d73a4a ${props => props.green}deg ${props => props.green + props.red}deg,
		yellow ${props => props.green + props.red}deg
			${props => props.green + props.red + props.yellow}deg,
		gray ${props => props.green + props.red + props.yellow}deg 360deg
	);
	mask: radial-gradient(circle, transparent 10px, white 10px);
`;

export const PullRequestReviewStatus = (props: {
	pr: FetchThirdPartyPullRequestPullRequest;
	opinionatedReviews: any[];
}) => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const currentUser = state.users[state.session.userId!] as CSMe;
		const team = state.teams[state.context.currentTeamId];
		return {
			currentUser,
			currentPullRequestId: state.context.currentPullRequest
				? state.context.currentPullRequest.id
				: undefined,
			composeCodemarkActive: state.context.composeCodemarkActive,
			team,
		};
	});

	const [requestedOpen, setRequestedOpen] = useState(false);
	const [approvedOpen, setApprovedOpen] = useState(false);
	const [pendingOpen, setPendingOpen] = useState(false);

	const { pr, opinionatedReviews = [] } = props;
	const pendingReviewers = pr.reviewRequests.nodes;
	const pendingReviewersTeams = pendingReviewers.filter(_ => !_.requestedReviewer).length;

	const reviewState = useMemo(() => {
		const approvals = opinionatedReviews.filter(review => review.state === "APPROVED");
		const changeRequests = opinionatedReviews.filter(
			review => review.state === "CHANGES_REQUESTED"
		);
		const totalReviews = approvals.length + changeRequests.length;
		const degrees = totalReviews === 0 ? 0 : (360 * approvals.length) / totalReviews;
		return {
			approvals,
			changeRequests,
			totalReviews,
			degrees,
		};
	}, [pr]);

	return (
		<>
			{pr.mergeStateStatus !== "BLOCKED" && (
				<>
					{reviewState.totalReviews === 0 && pendingReviewers.length > 0 && (
						<PRStatusRow>
							<PRIconButton className="green-background">
								<Icon name="check" />
							</PRIconButton>
							<div className="middle">
								<h1>Review Requested</h1>
								Review has been requested on this pull request.
							</div>
						</PRStatusRow>
					)}
					{reviewState.changeRequests.length === 0 && reviewState.totalReviews > 0 && (
						<PRStatusRow>
							<PRIconButton className="green-background">
								<Icon name="check" />
							</PRIconButton>
							<div className="middle">
								<h1>Changes Approved</h1>
								{reviewState.approvals.length == 1
									? "1 approving review"
									: `${reviewState.approvals.length} approving reviews`}
							</div>
						</PRStatusRow>
					)}
					{reviewState.changeRequests.length > 0 && (
						<PRStatusRow>
							<Donut degrees={reviewState.degrees} />
							<div className="middle">
								{reviewState.changeRequests.length > 0 ? (
									<>
										<h1>Changes Requested</h1>
										{reviewState.changeRequests.length == 1
											? "1 review "
											: `${reviewState.changeRequests.length} reviews `}
										requesting changes
									</>
								) : (
									<></>
								)}
							</div>
						</PRStatusRow>
					)}
				</>
			)}
			{reviewState.changeRequests.length > 0 && (
				<PRShortStatusRow className="clickable" onClick={() => setRequestedOpen(!requestedOpen)}>
					<PRIconButton>
						<Icon name="plus-minus" className="red-color" />
					</PRIconButton>
					<b className="middle">
						{reviewState.changeRequests.length == 1
							? "1 change "
							: `${reviewState.changeRequests.length} changes `}
						requested
					</b>
					<Icon className="right clickable" name={requestedOpen ? "chevron-up" : "chevron-down"} />
				</PRShortStatusRow>
			)}
			{requestedOpen && (
				<PRShortStatusRow>
					<div style={{ width: "30px", height: "30px" }} />
					<div className="middle">
						{reviewState.changeRequests.map(review => (
							<div style={{ padding: "5px 0" }}>
								<PRHeadshotName person={review.author} />{" "}
								<span className="subtle">requested changes</span>
							</div>
						))}
					</div>
				</PRShortStatusRow>
			)}
			{reviewState.approvals.length > 0 && (
				<PRShortStatusRow className="clickable" onClick={() => setApprovedOpen(!approvedOpen)}>
					<PRIconButton>
						<Icon name="check" className="green-color" />
					</PRIconButton>
					<b className="middle">
						{reviewState.approvals.length == 1
							? "1 approval"
							: `${reviewState.approvals.length} approvals`}
					</b>
					<Icon className="right clickable" name={approvedOpen ? "chevron-up" : "chevron-down"} />
				</PRShortStatusRow>
			)}
			{approvedOpen && (
				<PRShortStatusRow>
					<div style={{ width: "30px", height: "30px" }} />
					<div className="middle">
						{reviewState.approvals.map(review => (
							<div style={{ padding: "5px 0" }}>
								<PRHeadshotName person={review.author} />{" "}
								<span className="subtle">approved these changes</span>
							</div>
						))}
					</div>
				</PRShortStatusRow>
			)}
			{pendingReviewers.length > 0 && (
				<PRShortStatusRow className="clickable" onClick={() => setPendingOpen(!pendingOpen)}>
					<PRIconButton>
						<Icon name="person" />
					</PRIconButton>
					<b className="middle">
						{pendingReviewers.length == 1
							? "1 pending reviewer"
							: `${pendingReviewers.length} pending reviewers`}
					</b>
					<Icon className="right clickable" name={pendingOpen ? "chevron-up" : "chevron-down"} />
				</PRShortStatusRow>
			)}
			{pendingOpen && (
				<PRShortStatusRow>
					<div style={{ width: "30px", height: "30px" }} />
					<div className="middle">
						{pendingReviewersTeams && (
							<div style={{ padding: "5px 0" }}>
								<b>
									{pendingReviewersTeams} {pendingReviewersTeams === 1 ? "team" : "teams"}
								</b>{" "}
								<span className="subtle">
									{pendingReviewersTeams === 1 ? "was" : "were"} requested for review
								</span>
							</div>
						)}
						{pendingReviewers
							.filter(review => review.requestedReviewer)
							.map(review => (
								<div style={{ padding: "5px 0" }}>
									<PRHeadshotName person={review.requestedReviewer} />{" "}
									<span className="subtle">was requested for review</span>
								</div>
							))}
					</div>
				</PRShortStatusRow>
			)}
		</>
	);
};
