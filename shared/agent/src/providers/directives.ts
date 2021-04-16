export interface Directive {
	type:
		| "addApprovedBy"
		| "addLegacyCommentReply"
		| "addNode"
		| "addNodes"
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
		| "updatePullRequest"
		| "updatePullRequestReview"
		| "updatePullRequestReviewers"
		| "updatePullRequestReviewCommentNode"
		| "updatePullRequestReviewThreadComment"
		| "updateReview"
		| "updateReviewCommentsCount"
		| "updateReviewThreads"
		| "reviewSubmitted";
	data: any;
}

export interface Directives {
	directives: Directive[];
}
