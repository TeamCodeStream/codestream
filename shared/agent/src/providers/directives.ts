export interface Directives {
	directives: {
		type:
			| "addNode"
			| "addNodes"
			| "addReaction"
			| "removeNode"
			| "removeReaction"
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
