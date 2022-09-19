// TODO de-dupe from agent project
export interface Directive {
	type:
		| "addApprovedBy"
		| "addLegacyCommentReply"
		| "addNode"
		| "addNodes"
		| "addPendingReview"
		| "addPullRequestComment"
		| "addReaction"
		| "addReply"
		| "addReview"
		| "addReviewCommentNodes"
		| "addReviewThreads"
		| "removeComment"
		| "removeNode"
		| "removePendingReview"
		| "removePullRequestReview"
		| "removeRequestedReviewer"
		| "removeReaction"
		| "removeApprovedBy"
		| "resolveReviewThread"
		| "setLabels"
		| "unresolveReviewThread"
		| "updateDiscussionNote"
		| "updateNode"
		| "updateNodes"
		| "updatePullRequest"
		| "updatePendingReviewCommentsCount"
		| "updatePullRequestReview"
		| "updatePullRequestReviewers"
		| "updatePullRequestReviewCommentNode"
		| "updatePullRequestReviewThreadComment"
		| "updatePullRequestFileNode"
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
