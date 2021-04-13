export interface Directives {
	directives: {
		type:
			| "addApprovedBy"
			| "addLegacyCommentReply"
			| "addNode"
			| "addNodes"
			| "addReaction"
			| "addReply"
			| "removeNode"
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
