export interface Directives {
	directives: {
		type:
			| "addApprovedBy"
			| "addNode"
			| "addNodes"
			| "addReaction"
			| "removeNode"
			| "removeReaction"
			| "removeApprovedBy"
			| "resolveReviewThread"
			| "unresolveReviewThread"
			| "updateNode"
			| "updatePullRequest"
			| "updatePullRequestReview"
			| "updatePullRequestReviewers"
			| "updatePullRequestReviewComment"
			| "updatePullRequestReviewCommentNode";
		data: any;
	}[];
}
