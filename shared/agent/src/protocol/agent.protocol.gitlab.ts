"use strict";

export interface GitLabCreateCardRequest {
	repoName: string;
	title: string;
	description: string;
	assignee: { id: string };
}

export interface GitLabCreateCardResponse {
	id: string;
	web_url: string;
}

export interface GitLabFetchBoardsRequest {
	organizationId?: string;
}

export interface GitLabBoard {
	id: string;
	name: string;
	path?: string;
}

export interface GitLabFetchBoardsResponse {
	boards: GitLabBoard[];
}

export interface GitLabFetchListsRequest {
	boardId: string;
}

export interface GitLabList {
	id: string;
	name: string;
	closed: boolean;
	idBoard: string;
	pos: number;
	subscribed: boolean;
}

export interface GitLabFetchListsResponse {
	lists: GitLabList[];
}

export interface GitLabMergeRequestWrapper {
	error: any;
	currentUser: any;
	project: {
		mergeRequest: GitLabMergeRequest;
	};
}

export interface GitLabMergeRequest {
	approvedBy: {
		nodes: {
			avatarUrl: string;
			name: string;
			login: string;
		};
	};
	author: {
		avatarUrl: string;
		name: string;
		login: string;
		id: string;
	};
	baseRefName: string;
	baseRefOid: string;
	changesCount: number;
	commitCount: number;
	createdAt: string;
	description: string;
	diffRefs: any;
	discussionLocked: boolean;
	discussions: {
		pageInfo: {
			endCursor: string;
			hasNextPage: boolean;
		};
		nodes: {
			createdAt: string;
			id: string;
			_pending?: boolean;
			notes?: {
				nodes: {
					id: string;
					author: {
						name: string;
						login: string;
						avatarUrl: string;
					};
					body: string;
					position: any;
					createdAt: string;
				}[];
			};
			resolved: boolean;
			resolvable: boolean;
		}[];
	};
	downvotes: number;
	headRefName: string;
	headRefOid: string;
	id: string;
	idComputed: string;
	iid: string;
	isDraft: boolean;
	merged: boolean;
	mergedAt: string;
	number: number;
	pendingReview: {
		comments: {
			totalCount: number;
		};
	};
	projectId: string;
	// CS providerId
	providerId: string;
	reactionGroups: {
		content: string;
		data: {
			awardable_id: number;
			id: number;
			name: string;
			user: {
				id: number;
				avatar_url: string;
				login: string;
			};
		}[];
	}[];
	reference: string;
	references: {
		full: string;
	};
	repository: {
		name: string;
		nameWithOwner: string;
		url: string;
	};
	resolvable: boolean;
	resolved: boolean;
	sourceBranch: string;
	state: string;
	sourceProject: any;
	targetBranch: string;
	title: string;

	upvotes: number;
	url: string;
	userDiscussionsCount: number;
	userPermissions: {
		canMerge: boolean;
	};
	viewer: {
		id: string;
		name: string;
		login: string;
		avatarUrl: string;
	};
	webUrl: string;
	workInProgress: boolean;
	baseWebUrl: string;
	// forceRemoveSourceBranch: boolean;
	// squashOnMerge: boolean;
}
