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
	error?: {
		message: string;
	};
	/* mix this in from another call `id` doesn't exist on all instances */
	currentUser: {
		name: string;
		login: string;
		avatarUrl: string;
		id: string;
	};
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
	/* cross-compatibility property with GitHub */
	databaseId?: number | string;
	state?: string;
	system?: boolean;
	systemNoteIconName: string;
	label?: {
		color: string;
		title: string;
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
		oldLine?: number;
		newPath: string;
		newLine: number;
		diffRefs?: any;
		patch?: string;
	};
	resolved: boolean;
	discussion: {
		id?: string;
		replyId?: string;
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
			oldLine?: number;
			newPath: string;
			newLine: number;
			diffRefs?: any;
			patch?: string;
		};
	}[];
	userPermissions: {
		adminNote?: boolean;
		readNote?: boolean;
		resolveNote?: boolean;
		awardEmoji?: boolean;
		createNote?: boolean;
	};
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
	replyId?: string;
}

export interface GitLabUser {
	avatarUrl: string;
	name: string;
	login: string;
	id: string;
}

export interface GitLabLabel {
	id: string;
	color: string;
	title: string;
	description?: string;
}

interface Project {
	/* Project name (Sentence case with spaces) aka "Foo Bar" */
	name: string;
	/* url-like project name as a path aka "foo-bar" */
	path: string;
	fullPath: string;
	webUrl: string;
}

export interface GitLabMergeRequest {
	/**
	 * this might not exist in all versions, was missing in 13.2.3
	 */
	approvedBy?: {
		nodes: {
			avatarUrl: string;
			name: string;
			login: string;
		}[];
	};
	/* this property is part of a paid offering */
	// approvalsRequired?: boolean;
	/* this property is part of a paid offering */
	// approvalsLeft?: number;
	/** Decides if the MR author can approve the MR or not
	 *
	 * this will be undefined for older GL instances
	 */
	approvalsAuthorCanApprove?: boolean;
	/* this might not exist in all editions via the graph query*/
	author: GitLabUser;
	/* this might not exist in all editions via the graph query*/
	assignees: {
		nodes: GitLabUser[];
	};
	baseRefName: string;
	baseRefOid: string;
	changesCount: number;
	/* this might not exist in all editions*/
	commitCount?: number;
	createdAt: string;
	/* this might not exist in all editions*/
	currentUserTodos?: {
		nodes: {
			/* this might not exist in all editions (we don't actually use it)
				throws an error on 13.9.3-ee*/
			// action
			body: string;
			id: string;
			targetType: string;
			state: string;
		}[];
	};
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
		nodes: GitLabLabel[];
	};
	merged: boolean;
	mergeableDiscussionsState: boolean;
	/* this might not exist in all editions*/
	mergedAt?: string;
	mergeWhenPipelineSucceeds: boolean;
	milestone?: {
		title: string;
		id: string;
		webPath: string;
		dueDate: string;
	};
	number: number;
	overflow?: boolean;
	participants: {
		nodes: GitLabUser[];
	};
	headPipeline?: {
		/**
		 * this is the numeric id from the gid
		 */
		id: string;
		/**
		 * this is the gid://
		 */
		gid: string;
		/* this might not exist in all editions
			we can craft this in other ways
		*/
		// path: string;
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
		/* this might not exist in all editions */
		stages?: {
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
		sha?: string;
		/* link to the pipeline in the web
		this is a computed property */
		webUrl?: string;
	};
	pendingReview?: {
		id: string;
		author: {
			login: string;
			avatarUrl: string;
		};
		comments?: {
			totalCount: number;
		};
	};
	project: Project;
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
	reviewers?: {
		nodes?: {
			id: number;
			name: string;
			login: string;
			avatarUrl: string;
		}[];
	};
	sourceBranch: string;
	state: string;
	/**
	 * it's possible that a source project can be removed
	 *
	 * @type {Project}
	 * @memberof GitLabMergeRequest
	 */
	sourceProject?: Project;
	subscribed: boolean;
	targetBranch: string;
	timeEstimate: number;
	totalTimeSpent: number;
	title: string;
	updatedAt: string;
	upvotes: number;
	url: string;
	/* this might not exist in all editions*/
	userDiscussionsCount: number;
	userPermissions: {
		adminMergeRequest: boolean;
		/* this might not exist in all editions*/
		canMerge?: boolean;
		canApprove?: boolean;
		canAssign?: boolean;
	};
	viewer: {
		id: string;
		name: string;
		login: string;
		avatarUrl: string;
		viewerCanDelete?: boolean;
	};
	viewerDidAuthor: boolean;
	webUrl: string;
	workInProgress: boolean;
	baseWebUrl: string;

	/**
	 * This is a property used by CodeStream
	 */
	supports: {
		/**
		 * private property, mainly for informative/debugging uses
		 */
		version: {
			version: string;
		};
		reviewers?: boolean;
		resolvingNotes?: boolean;
		// approvalsRequired?: boolean;
		approvedBy?: boolean;
		approvals?: boolean;
		currentUserTodos?: boolean;
	};
}
