export interface Directives {
	directives: {
		type:
			| "addApprovedBy"
			| "addLegacyCommentReply"
			| "addNode"
			| "addNodes"
			| "addReviewCommentNodes"
			| "addReaction"
			| "addReply"
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
			| "updatePullRequestReviewComment"
			| "updatePullRequestReviewCommentNode";
		data: any;
	}[];
}
