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
		mergeRequestsEnabled: boolean;
		mergeRequestsFfOnlyEnabled: boolean;
		removeSourceBranchAfterMerge: boolean;
		onlyAllowMergeIfPipelineSucceeds: boolean;
		allowMergeOnSkippedPipeline: boolean;
		onlyAllowMergeIfAllDiscussionsAreResolved: boolean;
		/*
		merge:
		Merge commit
		Every merge creates a merge commit

		rebase_merge:
		Merge commit with semi-linear history
		Every merge creates a merge commit
		Fast-forward merges only
		When conflicts arise the user is given the option to rebase

		ff:
		Fast-forward merge
		No merge commits are created
		Fast-forward merges only
		When conflicts arise the user is given the option to rebase */
		mergeMethod?: "ff" | "rebase_merge" | "merge" | string | undefined;
		mergeRequest: GitLabMergeRequest;
	};
}

export interface Note {
	_pending?: boolean;
	id: string;
	author: {
		name: string;
		login: string;
		avatarUrl: string;
	};
	/* backward compat */
	databaseId?: number | string;
	state?: string;
	system?: boolean;
	systemNoteIconName: string;
	label?: {
		color: string;
		name: string;
	};
	milestone?: {
		title: string;
		url: string;
	};
	body: string;
	bodyText: string;
	bodyHtml?: string;
	createdAt: string;
	position: {
		oldPath: string;
		newPath: string;
		newLine: number;
		diffRefs?: any;
		patch?: string;
	};
	resolved: boolean;
	discussion: {
		id?: string;
	};
	resolvable: boolean;
	reactionGroups?: {
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
	replies?: {
		_pending?: boolean;
		id: string;
		author: {
			name: string;
			login: string;
			avatarUrl: string;
		};
		state: string;
		body: string;
		bodyText: string;
		createdAt: string;
		position: {
			oldPath: string;
			newPath: string;
			newLine: string;
		};
	}[];
}

export interface DiscussionNode {
	_pending?: boolean;
	type?: string;
	id: string;
	createdAt: string;
	notes?: {
		nodes: Note[];
	};
	resolved: boolean;
	resolvable: boolean;
}

export interface GitLabMergeRequest {
	approvedBy: {
		nodes: {
			avatarUrl: string;
			name: string;
			login: string;
		}[];
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
		nodes: DiscussionNode[];
	};
	divergedCommitsCount: number;
	downvotes: number;
	headRefName: string;
	headRefOid: string;
	id: string;
	idComputed: string;
	iid: string;
	isDraft: boolean;
	labels: {
		nodes: {
			id: string;
			color: string;
			textColor: string;
			title: string;
		}[];
	};
	merged: boolean;
	mergeableDiscussionsState: boolean;
	mergedAt: string;
	mergeWhenPipelineSucceeds: boolean;
	number: number;
	pipelines?: {
		nodes: {
			id: string;
			status:
				| "CREATED"
				| "WAITING_FOR_RESOURCE"
				| "PREPARING"
				| "PENDING"
				| "RUNNING"
				| "FAILED"
				| "SUCCESS"
				| "CANCELED"
				| "SKIPPED"
				| "MANUAL"
				| "SCHEDULED"
				| string;
			stages: {
				nodes: {
					name: string;
					detailedStatus: {
						label: string;
						tooltip: string;
					};
				}[];
			};
			detailedStatus: {
				icon: string;
				label: string;
				text: string;
				tooltip: string;
			};
			/* this is the branch ref
			merged in from REST 
			*/
			sha?: string;
			/* this is the branch ref
			merged in from REST 
			*/
			ref?: string;
			/* link to the pipeline in the web
			merged in from REST 
			*/
			webUrl?: string;
		}[];
	};
	pendingReview: {
		comments: {
			totalCount: number;
		};
	};
	projectId: string;
	/* CS providerId */
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
		adminMergeRequest: boolean;
		canMerge: boolean;
	};
	viewer: {
		id: string;
		name: string;
		login: string;
		avatarUrl: string;
		viewerCanDelete?: boolean;
	};
	webUrl: string;
	workInProgress: boolean;
	baseWebUrl: string;
	// forceRemoveSourceBranch: boolean;
	// squashOnMerge: boolean;
}
