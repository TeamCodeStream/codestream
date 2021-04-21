export interface Directive {
	type:
		| "addApprovedBy"
		| "addLegacyCommentReply"
		| "addNode"
		| "addNodes"
		| "addPendingReview"
		| "addReaction"
		| "addReply"
		| "addReview"
		| "addReviewCommentNodes"
		| "addReviewThreads"
		| "removeComment"
		| "removeNode"
		| "removePendingReview"
		| "removePullRequestReview"
		| "removeReaction"
		| "removeApprovedBy"
		| "resolveReviewThread"
		| "setLabels"
		| "unresolveReviewThread"
		| "updateDiscussionNote"
		| "updateNode"
		| "updateNodes"
		| "updatePullRequest"
		| "updatePullRequestReview"
		| "updatePullRequestReviewers"
		| "updatePullRequestReviewCommentNode"
		| "updatePullRequestReviewThreadComment"
		| "updateReview"
		| "updateReviewCommentsCount"
		| "updateReviewers"
		| "updateReviewThreads"
		| "reviewSubmitted";
	data: any;
}

export interface Directives {
	directives: Directive[];
}
