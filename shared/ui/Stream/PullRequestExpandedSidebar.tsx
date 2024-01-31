import { FetchThirdPartyPullRequestPullRequest } from "@codestream/protocols/agent";
import { useAppDispatch } from "@codestream/webview/utilities/hooks";
import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { WebviewModals } from "../ipc/webview.protocol.common";
import { openModal, setCurrentPullRequest } from "../store/context/actions";
import { api } from "../store/providerPullRequests/thunks";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { PullRequestFilesChangedTab } from "./PullRequestFilesChangedTab";
import { PullRequestDetailsLoading } from "@codestream/webview/Stream/PullRequestLoading";
export const ReviewButton = styled.div`
	color: white;
	background-color: #24a100;
	width: 50px;
	text-align: center;
	margin-left: auto;
	border-radius: 5px;
	margin-right: 8px;
`;

// @TODO: update with more specific types
interface PullRequestExpandedSidebarProps {
	pullRequest: any;
	thirdPartyPrObject?: any;
	loadingThirdPartyPrObject: boolean;
	fetchOnePR?: any;
	prCommitsRange?: any;
	setPrCommitsRange?: any;
}

export const PullRequestExpandedSidebar = (props: PullRequestExpandedSidebarProps) => {
	const dispatch = useAppDispatch();
	const [submittingReview, setSubmittingReview] = useState(false);

	const handleRowClick = e => {
		e.stopPropagation();
		const { pullRequest, thirdPartyPrObject } = props;

		// if (thirdPartyPrObject) {
		// 	HostApi.instance.track("PR Details Viewed", {
		// 		Host: thirdPartyPrObject?.providerId,
		// 		"Host Version": thirdPartyPrObject?.supports?.version?.version || "0.0.0",
		// 	});
		// }

		let prId;
		if (
			pullRequest?.providerId === "gitlab*com" ||
			pullRequest?.providerId === "gitlab/enterprise" ||
			pullRequest?.providerId === "bitbucket*org"
		) {
			prId = pullRequest?.idComputed || pullRequest?.id;
		} else {
			prId = pullRequest?.id;
		}

		dispatch(setCurrentPullRequest(pullRequest.providerId, prId, "", "", "details"));
	};

	const handleReviewClick = e => {
		e.stopPropagation();
		dispatch(openModal(WebviewModals.FinishReview));
	};

	const reviewCount = useMemo(() => {
		return props.thirdPartyPrObject?.pendingReview?.comments?.totalCount;
	}, [props.thirdPartyPrObject?.pendingReview?.comments?.totalCount]);

	const handleSubmitReview = async e => {
		e.preventDefault();
		e.stopPropagation();
		setSubmittingReview(true);
		// HostApi.instance.track("PR Review Finished", {
		// 	Host: props?.thirdPartyPrObject?.providerId,
		// 	"Review Type": "APPROVE",
		// });
		await dispatch(
			api({
				method: "submitReview",
				params: {
					eventType: "APPROVE",
				},
			})
		);
		setSubmittingReview(false);
	};

	return (
		<>
			<Row onClick={e => handleRowClick(e)} style={{ padding: "0 0 0 45px" }}>
				<div>
					<Icon name="git-branch" style={{ marginRight: "2px" }} />
					PR Details
				</div>
				<div>
					{props?.thirdPartyPrObject && (
						<>
							{props?.thirdPartyPrObject?.providerId !== "bitbucket*org" && (
								<>
									{props?.thirdPartyPrObject?.providerId === "gitlab*com" ||
									props?.thirdPartyPrObject?.providerId === "gitlab/enterprise" ? (
										<>
											{reviewCount > 0 && !submittingReview && (
												<ReviewButton
													style={{ width: "120px" }}
													onClick={e => handleSubmitReview(e)}
												>
													<span className="wide-text">Submit Review ({reviewCount})</span>
												</ReviewButton>
											)}
											{submittingReview && (
												<ReviewButton
													onClick={e => {
														e.preventDefault();
														e.stopPropagation();
													}}
													style={{ width: "120px" }}
												>
													<span className="wide-text">
														<Icon style={{ top: "-1px" }} className="spin" name="sync" />
													</span>
												</ReviewButton>
											)}
										</>
									) : (
										<ReviewButton
											style={{ width: reviewCount ? "70px" : "50px" }}
											onClick={e => handleReviewClick(e)}
										>
											<span className="wide-text">
												Review {reviewCount > 0 && <> ({reviewCount})</>}
											</span>
										</ReviewButton>
									)}
								</>
							)}
						</>
					)}
				</div>
			</Row>
			{props.loadingThirdPartyPrObject && !props.thirdPartyPrObject && (
				<PullRequestDetailsLoading />
			)}
			{props.thirdPartyPrObject && (
				<>
					<PullRequestFilesChangedTab
						key="files-changed"
						pr={props.thirdPartyPrObject as FetchThirdPartyPullRequestPullRequest}
						fetch={() => {
							props.fetchOnePR(props.thirdPartyPrObject.providerId, props.thirdPartyPrObject.id);
						}}
						setIsLoadingMessage={() => {}}
						sidebarView={true}
						prCommitsRange={props.prCommitsRange}
						setPrCommitsRange={props.setPrCommitsRange}
					/>
				</>
			)}
		</>
	);
};
