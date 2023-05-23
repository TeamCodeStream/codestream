"use strict";
import * as qs from "querystring";

import { flatten } from "lodash-es";
import { URI } from "vscode-uri";
import {
	BitbucketBoard,
	BitbucketCard,
	BitbucketCreateCardRequest,
	BitbucketCreateCardResponse,
	BitbucketParticipantRole,
	CreateThirdPartyCardRequest,
	DidChangePullRequestCommentsNotificationType,
	FetchAssignableUsersAutocompleteRequest,
	FetchAssignableUsersResponse,
	FetchThirdPartyBoardsRequest,
	FetchThirdPartyBoardsResponse,
	FetchThirdPartyCardsRequest,
	FetchThirdPartyCardsResponse,
	FetchThirdPartyCardWorkflowRequest,
	FetchThirdPartyCardWorkflowResponse,
	FetchThirdPartyPullRequestCommitsResponse,
	FetchThirdPartyPullRequestFilesResponse,
	FetchThirdPartyPullRequestRequest,
	FetchThirdPartyPullRequestResponse,
	GetMyPullRequestsRequest,
	GetMyPullRequestsResponse,
	MoveThirdPartyCardRequest,
	MoveThirdPartyCardResponse,
	ProviderGetForkedReposResponse,
	ThirdPartyDisconnect,
	ThirdPartyProviderCard,
	ThirdPartyPullRequestComments,
} from "@codestream/protocols/agent";
import { CSBitbucketProviderInfo } from "@codestream/protocols/api";

import { GitRemoteLike } from "git/gitService";
import { SessionContainer } from "../container";
import { toRepoName } from "../git/utils";
import { Logger } from "../logger";
import { Dates, log, lspProvider } from "../system";
import { Directive, Directives } from "./directives";
import {
	ApiResponse,
	getOpenedRepos,
	getRemotePaths,
	ProviderCreatePullRequestRequest,
	ProviderCreatePullRequestResponse,
	ProviderGetRepoInfoResponse,
	ProviderPullRequestInfo,
	PullRequestComment,
	ThirdPartyProviderSupportsIssues,
	ThirdPartyProviderSupportsPullRequests,
} from "./provider";
import { ThirdPartyIssueProviderBase } from "./thirdPartyIssueProviderBase";
import { toUtcIsoNow } from "@codestream/utils/system/date";

interface BitbucketRepo {
	uuid: string;
	full_name: string;
	path: string;
	owner: {
		display_name: string;
		links: {
			self: {
				href: string;
			};
			avatar: {
				href: string;
			};
			html: {
				href: string;
			};
		};
		type: string;
		uuid: string;
		account_id: string;
		nickname: string;
		username: string;
	};
	has_issues: boolean;
	mainbranch?: {
		name?: string;
		type?: string;
	};
	parent?: any;
}

interface BitbucketCurrentUser {
	display_name: string;
	links: {
		self: {
			href: string;
		};
		avatar: {
			href: string;
		};
		repositories: {
			href: string;
		};
		snippets: {
			href: string;
		};
		html: {
			href: string;
		};
		hooks: {
			href: string;
		};
	};
	created_on: string;
	type: string;
	uuid: string;
	username: string;
	is_staff: boolean;
	account_id: string;
	nickname: string;
	account_status: string;
}

interface BitbucketAuthor {
	type: string;
	raw: string;
	user: {
		account_id: string;
		display_name: string;
		links?: {
			self?: {
				href: string;
			};
			avatar?: {
				href: string;
			};
			html?: {
				href: string;
			};
		};
		type: string;
		uuid: string;
		nickname: string;
	};
}

interface BitbucketWorkspacesRequestResponse {
	type: string;
	user: {
		display_name: string;
		links: {
			avatar: {
				href: string;
			};
		};
		type: string;
		uuid: string;
		account_id: string;
		nickname: string;
	};
	workspace: {
		type: string;
		uuid: string;
		name: string;
		slug: string;
		links: {
			avatar: {
				href: string;
			};
		};
	};
	links: {
		self: {
			href: string;
		};
	};
	added_on: string;
	permission: string;
	last_accessed: string;
}
[];

interface BitbucketReposInWorkspace {
	type: string;
	full_name: string;
	links: {
		self: {
			href: string;
		};
		html: {
			href: string;
		};
		avatar: {
			href: string;
		};
		pullrequests: {
			href: string;
		};
		commits: {
			href: string;
		};
		forks: {
			href: string;
		};
		watchers: {
			href: string;
		};
		branches: {
			href: string;
		};
		tags: {
			href: string;
		};
		downloads: {
			href: string;
		};
		source: {
			href: string;
		};
		clone: [
			{
				name: string;
				href: string;
			},
			{
				name: string;
				href: string;
			}
		];
		hooks: {
			href: string;
		};
	};
	name: string;
	slug: string;
	description: string;
	scm: string;
	website: null;
	owner: {
		display_name: string;
		links: {
			self: {
				href: string;
			};
			avatar: {
				href: string;
			};
			html: {
				href: string;
			};
		};
		type: string;
		uuid: string;
		account_id: string;
		nickname: string;
	};
	workspace: {
		type: string;
		uuid: string;
		name: string;
		slug: string;
		links: {
			avatar: {
				href: string;
			};
			html: {
				href: string;
			};
			self: {
				href: string;
			};
		};
	};
	is_private: false;
	project: {
		type: string;
		key: string;
		uuid: string;
		name: string;
		links: {
			self: {
				href: string;
			};
			html: {
				href: string;
			};
			avatar: {
				href: string;
			};
		};
	};
	fork_policy: string;
	created_on: string;
	updated_on: string;
	size: number;
	language: string;
	has_issues: boolean;
	has_wiki: boolean;
	uuid: string;
	mainbranch: {
		name: string;
		type: string;
	};
	override_settings: {
		default_merge_strategy: boolean;
		branching_model: boolean;
	};
}

interface BitbucketRepoFull extends BitbucketRepo {
	type?: string;
	full_name: string;
	isApproved?: boolean;
	isRequested?: boolean;
	links: {
		self: {
			href: string;
		};
		html: {
			href: string;
		};
		avatar: {
			href: string;
		};
		pullrequests: {
			href: string;
		};
		commits: {
			href: string;
		};
		forks: {
			href: string;
		};
		watchers: {
			href: string;
		};
		branches: {
			href: string;
		};
		tags: {
			href: string;
		};
		downloads: {
			href: string;
		};
		source: {
			href: string;
		};
		clone: [
			{
				name: string;
				href: string;
			},
			{
				name: string;
				href: string;
			}
		];
		hooks: {
			href: string;
		};
	};
	/* The name of the repository */
	name: string;
	slug: string;
	description: string;
	scm: string;
	website: string;

	workspace: {
		type: string;
		uuid: string;
		name: string;
		slug: string;
		links: {
			avatar: {
				href: string;
			};
			html: {
				href: string;
			};
			self: {
				href: string;
			};
		};
	};
	is_private: boolean;
	project: {
		type: string;
		key: string;
		uuid: string;
		name: string;
		links: {
			self: {
				href: string;
			};
			html: {
				href: string;
			};
			avatar: {
				href: string;
			};
		};
	};
	fork_policy: string;
	created_on: Date;
	updated_on: Date;
	size: number;
	language: string;
	has_issues: boolean;
	has_wiki: boolean;
	uuid: string;
	mainbranch: {
		name: string;
		type: string;
	};
	override_settings: {
		default_merge_strategy: boolean;
		branching_model: boolean;
	};
	author: BitbucketAuthor;
	participants: BitbucketUnfilteredParticipants[];
	reviewers?: BitbucketReviewers[];
}

interface BitbucketPullRequestComment2 {
	id: number;
	author: {
		login: string;
	};
	deleted: boolean;
	inline: {
		from: number | undefined;
		to: number | undefined;
		path: string;
	};
	type: string;
	file: string;
	bodyHtml: string;
	bodyText: string;
	state: string;
	parent?: {
		id: number;
	};
	replies?: BitbucketPullRequestComment2[];
}

interface BitbucketMergeRequest {
	message: string;
	close_source_branch?: boolean;
	merge_strategy?: string;
}

interface BitbucketSubmitReviewRequestResponse {
	approved: boolean;
	state: string;
	participated_on: Date;
	user: {
		uuid: string;
		links: {
			avatar: {
				href: string;
			};
		};
	};
}

interface BitbucketSubmitReviewRequest {
	type: string;
}

interface BitbucketDeclinePullRequest {
	type: string;
}

interface BitBucketCreateCommentRequest {
	content: {
		raw: string;
	};
	inline?: {
		to: number;
		path: string;
	};
	parent?: {
		id: number;
	};
}

interface TimelineItem {
	pull_request: {
		type: string;
		id: number;
		title: string;
		links: {
			self: {
				href: string;
			};
			html: {
				href: string;
			};
		};
	};
	comment: {
		id: number;
		created_on: string;
		updated_on: string;
		content: {
			type: string;
			raw: string;
			markup: string;
			html: string;
		};
		user: {
			display_name: string;
			links: {
				self: {
					href: string;
				};
				avatar: {
					href: string;
				};
				html: {
					href: string;
				};
			};
			type: string;
			uuid: string;
			account_id: string;
			nickname: string;
		};
		deleted: boolean;
		inline?: {};
		type: string;
		links: {
			self: {
				href: string;
			};
			html: {
				href: string;
			};
		};
		pullrequest: {
			type: string;
			id: number;
			title: string;
			links: {
				self: {
					href: string;
				};
				html: {
					href: string;
				};
			};
		};
	};
}

interface BitbucketPullRequestComment {
	id: number;
	created_on: string;
	content: {
		raw: string;
		html: string;
	};
	user: {
		account_id: string;
		display_name: string;
		nickname: string;
		links?: {
			avatar?: {
				href?: string;
			};
		};
	};
	deleted: boolean;
	inline?: {
		from?: number | undefined;
		to?: number | undefined;
		path?: string;
	};
	type: string;
	file?: string;
	bodyHtml?: string;
	bodyText?: string;
	state?: string;
	parent?: {
		id: number;
	};
	children?: [BitbucketPullRequestComment];
}
interface BitbucketPullRequestCommit {
	abbreviatedOid: string;
	/* Author & Committer are the same for Bitbucket */
	author: BitbucketAuthor;
	/* Author & Committer are the same for Bitbucket */
	committer: BitbucketAuthor;
	message: string;
	date: string;
	hash: string;
	links: {
		html: {
			href: string;
		};
		patch: {
			href: string;
		};
	};
}

interface BitbucketPermission {
	permission: string;
	repository: BitbucketRepo;
}

interface BitbucketUser {
	uuid: string;
	display_name: string;
	account_id: string;
	username: string;
}

interface BitbucketWorkspaceMembers {
	type?: string;
	user: {
		display_name: string;
		links: {
			self: {
				href: string;
			};
			avatar: {
				href: string;
			};
			html: {
				href: string;
			};
		};
		type: string;
		uuid: string;
		account_id: string;
		nickname: string;
	};
	workspace?: {
		type: string;
		uuid: string;
		name: string;
		slug: string;
		links: {
			avatar: {
				href: string;
			};
			html: {
				href: string;
			};
			self: {
				href: string;
			};
		};
	};
	links?: {
		self: {
			href: string;
		};
	};
}
[];

interface BitbucketReviewers {
	display_name: string;
	links: {
		self: {
			href: string;
		};
		avatar: {
			href: string;
		};
		html: {
			href: string;
		};
	};
	type: string;
	uuid: string;
	account_id: string;
	nickname: string;
}
[];

interface BitbucketUpdateReviewerRequest {
	reviewers: BitbucketReviewers[];
}

interface BitbucketMergeRequestResponse {
	comment_count: number;
	task_count: number;
	type: string;
	id: number;
	title: string;
	description: string;
	rendered: {
		title: {
			type: string;
			raw: string;
			markup: string;
			html: string;
		};
		description: {
			type: string;
			raw: string;
			markup: string;
			html: string;
		};
	};
	state: string;
	merge_commit: {
		type: string;
		hash: string;
		date: string;
		author: {
			type: string;
			raw: string;
			user: {
				display_name: string;
				links: {
					avatar: {
						href: string;
					};
				};
				type: string;
				uuid: string;
				account_id: string;
				nickname: string;
			};
		};
		message: string;
		summary: {
			type: string;
			raw: string;
			markup: string;
			html: string;
		};
		links: {
			html: {
				href: string;
			};
		};
	};
	close_source_branch: false;
	closed_by: {
		display_name: string;
		links: {
			avatar: {
				href: string;
			};
		};
		type: string;
		uuid: string;
		account_id: string;
		nickname: string;
	};
	author: BitbucketAuthor;
	reason: string;
	created_on: string;
	updated_on: string;
	closed_on: string;
	destination: {
		branch: {
			name: string;
		};
		commit: {
			type: string;
			hash: string;
			links: {
				self: {
					href: string;
				};
				html: {
					href: string;
				};
			};
		};
		repository: {
			type: string;
			full_name: string;
			links: {
				avatar: {
					href: string;
				};
			};
			name: string;
			uuid: string;
		};
	};
	source: {
		branch: {
			name: string;
		};
		commit: {
			type: string;
			hash: string;
			links: {
				html: {
					href: string;
				};
			};
		};
		repository: {
			type: string;
			full_name: string;
			links: {
				avatar: {
					href: string;
				};
			};
			name: string;
			uuid: string;
		};
	};
	reviewers: BitbucketReviewers[];
	participants: BitbucketUnfilteredParticipants[];
	links: {
		html: {
			href: string;
		};
	};
	summary: {
		type: string;
		raw: string;
		markup: string;
		html: string;
	};
}

interface BitbucketUserPermissionsRequest {
	repository: {
		type: string;
		full_name: string;
		links: {
			self: {
				href: string;
			};
			html: {
				href: string;
			};
			avatar: {
				href: string;
			};
		};
		name: string;
		uuid: string;
	};
	type: string;
	permission: string;
	user: {
		display_name: string;
		links: {
			self: {
				href: string;
			};
			avatar: {
				href: string;
			};
			html: {
				href: string;
			};
		};
		type: string;
		uuid: string;
		account_id: string;
		nickname: string;
	};
}
[];

interface BitbucketRepositoriesRequestResponse {
	type: string;
	full_name: string;
	links: {
		avatar: {
			href: string;
		};
	};
	name: string;
	slug: string;
	description: string;
	scm: string;
	owner: {
		display_name: string;
		links: {
			avatar: {
				href: string;
			};
		};
		type: string;
		uuid: string;
		account_id: string;
		nickname: string;
	};
	workspace: {
		type: string;
		uuid: string;
		name: string;
		slug: string;
		links: {
			avatar: {
				href: string;
			};
		};
	};
	is_private: boolean;
	project: {
		type: string;
		key: string;
		uuid: string;
		name: string;
		links: {
			avatar: {
				href: string;
			};
		};
	};
	fork_policy: string;
	created_on: string;
	updated_on: string;
	size: number;
	language: string;
	has_issues: boolean;
	has_wiki: boolean;
	uuid: string;
	mainbranch: {
		name: string;
		type: string;
	};
	override_settings: {
		default_merge_strategy: boolean;
		branching_model: boolean;
	};
}
[];

interface BitbucketPullRequests {
	comment_count: number;
	task_count: number;
	type: string;
	id: number;
	title: string;
	description: string;
	state: string;
	merge_commit: null;
	close_source_branch: boolean;
	closed_by: null;
	author: {
		display_name: string;
		links: {
			avatar: {
				href: string;
			};
		};
		type: string;
		uuid: string;
		account_id: string;
		nickname: string;
	};
	reason: string;
	created_on: string;
	updated_on: string;
	destination: {
		branch: {
			name: string;
		};
		commit: {
			type: string;
			hash: string;
			links: {
				html: {
					href: string;
				};
			};
		};
		repository: {
			type: string;
			full_name: string;
			links: {
				avatar: {
					href: string;
				};
			};
			name: string;
			uuid: string;
		};
	};
	source: {
		branch: {
			name: string;
		};
		commit: {
			type: string;
			hash: string;
			links: {
				html: {
					href: string;
				};
			};
		};
		repository: {
			type: string;
			full_name: string;
			links: {
				avatar: {
					href: string;
				};
			};
			name: string;
			uuid: string;
		};
	};
	links: {
		html: {
			href: string;
		};
	};
	summary: {
		type: string;
		raw: string;
		markup: string;
		html: string;
	};
}
[];

interface BitbucketPullRequest {
	comment_count: number;
	task_count: number;
	type: string;
	id: number;
	title: string;
	description: string;
	rendered: {
		title: {
			type: string;
			raw: string;
			markup: string;
			html: string;
		};
		description: {
			type: string;
			raw: string;
			markup: string;
			html: string;
		};
	};
	state: string;
	merge_commit?: {
		type: string;
		hash: string;
		links: {
			html: {
				href: string;
			};
		};
	};
	close_source_branch?: boolean;
	closed_by?: {
		display_name: string;
		links: {
			avatar: {
				href: string;
			};
			html: {
				href: string;
			};
		};
		type: string;
		uuid: string;
		account_id: string;
		nickname: string;
	};
	author: {
		display_name: string;
		links: {
			avatar: {
				href: string;
			};
			html: {
				href: string;
			};
		};
		type: string;
		uuid: string;
		account_id: string;
		nickname: string;
	};
	reason: string;
	created_on: string;
	updated_on: string;
	destination: {
		branch: {
			name: string;
		};
		commit: {
			type: string;
			hash: string;
			links: {
				html: {
					href: string;
				};
			};
		};
		repository: {
			type: string;
			full_name: string;
			links: {
				avatar: {
					href: string;
				};
				html: {
					href: string;
				};
			};
			name: string;
			uuid: string;
		};
	};
	source: {
		branch: {
			name: string;
		};
		commit: {
			type: string;
			hash: string;
			links: {
				html: {
					href: string;
				};
			};
		};
		repository: {
			type: string;
			full_name: string;
			links: {
				avatar: {
					href: string;
				};
				html: {
					href: string;
				};
			};
			name: string;
			uuid: string;
		};
	};
	reviewers?: BitbucketReviewers[];
	participants: BitbucketUnfilteredParticipants[];
	links: {
		html: {
			href: string;
		};
	};
	summary: {
		type: string;
		raw: string;
		markup: string;
		html: string;
	};
}

interface BitbucketUpdateDescription {
	description: string;
}

export interface BitbucketUnfilteredParticipants {
	type?: string;
	user: {
		display_name: string;
		links: {
			avatar: {
				href: string;
			};
		};
		type?: string;
		uuid: string;
		account_id: string;
		nickname: string;
	};
	role: BitbucketParticipantRole;
	approved: boolean;
	state?: string; //"approved" | "changes_requested"
	participated_on: string;
}
[];

interface BitbucketUpdateTitleRequest {
	title: string;
}

interface BitbucketDiffStat {
	type: string;
	lines_added: number;
	lines_removed: number;
	status: string;
	old: {
		path: string;
		type: string;
		escaped_path: string;
		links: {
			self: {
				href: string;
			};
		};
	};
	new: {
		path: string;
		type: string;
		escaped_path: string;
		links: {
			self: {
				href: string;
			};
		};
	};
}

interface BitbucketCodeBlock {}

interface BitbucketValues<T> {
	values: T;
	next: string;
}
/**
 * BitBucket provider
 * @see https://developer.atlassian.com/bitbucket/api/2/reference/
 */
@lspProvider("bitbucket")
export class BitbucketProvider
	extends ThirdPartyIssueProviderBase<CSBitbucketProviderInfo>
	implements ThirdPartyProviderSupportsIssues, ThirdPartyProviderSupportsPullRequests
{
	private _knownRepos = new Map<string, BitbucketRepo>();
	private _reposWithIssues: BitbucketRepo[] = [];
	private _currentBitbucketUsers = new Map<string, BitbucketCurrentUser>();

	get displayName() {
		return "Bitbucket";
	}

	get name() {
		return "bitbucket";
	}

	get headers() {
		return {
			Authorization: `Bearer ${this.accessToken}`,
			"Content-Type": "application/json",
		};
	}

	async getCurrentUser(): Promise<BitbucketCurrentUser> {
		await this.ensureConnected();

		const data = await this.get<BitbucketCurrentUser>(`/user`);

		const currentUser = {
			display_name: data.body.display_name,
			links: {
				self: {
					href: data.body.links.self.href,
				},
				avatar: {
					href: data.body.links.avatar.href,
				},
				repositories: {
					href: data.body.links.repositories.href,
				},
				snippets: {
					href: data.body.links.snippets.href,
				},
				html: {
					href: data.body.links.html.href,
				},
				hooks: {
					href: data.body.links.hooks.href,
				},
			},
			created_on: data.body.created_on,
			type: data.body.type,
			uuid: data.body.uuid,
			username: data.body.username,
			is_staff: data.body.is_staff,
			account_id: data.body.account_id,
			nickname: data.body.nickname,
			account_status: data.body.account_status,
		};
		return currentUser;
	}

	getPRExternalContent(comment: PullRequestComment) {
		return {
			provider: {
				name: this.displayName,
				icon: this.name,
				id: this.providerConfig.id,
			},
			subhead: `#${comment.pullRequest.id}`,
			actions: [
				{
					label: "Open Comment",
					uri: comment.url,
				},
				{
					label: `Open Merge Request #${comment.pullRequest.id}`,
					uri: comment.pullRequest.url,
				},
			],
		};
	}

	async onConnected(providerInfo?: CSBitbucketProviderInfo) {
		super.onConnected(providerInfo);
		this._knownRepos = new Map<string, BitbucketRepo>();
	}

	@log()
	async onDisconnected(request?: ThirdPartyDisconnect) {
		this._knownRepos.clear();
		this._reposWithIssues = [];
		this._pullRequestCache.clear();
		return super.onDisconnected(request);
	}

	@log()
	async getBoards(request?: FetchThirdPartyBoardsRequest): Promise<FetchThirdPartyBoardsResponse> {
		void (await this.ensureConnected());

		const openRepos = await getOpenedRepos<BitbucketRepo>(
			r => r.domain === "bitbucket.org",
			p => this.get<BitbucketRepo>(`/repositories/${p}`),
			this._knownRepos
		);

		let boards: BitbucketBoard[];
		if (openRepos.size > 0) {
			const bitbucketRepos = Array.from(openRepos.values());
			boards = bitbucketRepos
				.filter(r => r.has_issues)
				.map(r => ({
					id: r.uuid,
					name: r.full_name,
					apiIdentifier: r.full_name,
					path: r.path,
					singleAssignee: true, // bitbucket issues only allow one assignee
				}));
		} else {
			let bitbucketRepos: BitbucketRepo[] = [];
			try {
				let apiResponse = await this.get<BitbucketValues<BitbucketPermission[]>>(
					`/user/permissions/repositories?${qs.stringify({
						fields: "+values.repository.has_issues",
					})}`
				);
				bitbucketRepos = apiResponse.body.values.map(p => p.repository);
				while (apiResponse.body.next) {
					apiResponse = await this.get<BitbucketValues<BitbucketPermission[]>>(
						apiResponse.body.next
					);
					bitbucketRepos = bitbucketRepos.concat(apiResponse.body.values.map(p => p.repository));
				}
			} catch (err) {
				Logger.error(err);
				debugger;
			}
			bitbucketRepos = bitbucketRepos.filter(r => r.has_issues);
			this._reposWithIssues = [...bitbucketRepos];
			boards = bitbucketRepos.map(r => {
				return {
					...r,
					id: r.uuid,
					name: r.full_name,
					apiIdentifier: r.full_name,
					singleAssignee: true, // bitbucket issues only allow one assignee
				};
			});
		}

		return { boards };
	}

	// FIXME -- implement this
	async getCardWorkflow(
		request: FetchThirdPartyCardWorkflowRequest
	): Promise<FetchThirdPartyCardWorkflowResponse> {
		return { workflow: [] };
	}

	@log()
	async getCards(request: FetchThirdPartyCardsRequest): Promise<FetchThirdPartyCardsResponse> {
		void (await this.ensureConnected());

		const cards: ThirdPartyProviderCard[] = [];
		if (this._reposWithIssues.length === 0) await this.getBoards();
		await Promise.all(
			this._reposWithIssues.map(async repo => {
				const { body } = await this.get<{ uuid: string; [key: string]: any }>(
					`/repositories/${repo.full_name}/issues`
				);
				// @ts-ignore
				body.values.forEach(card => {
					cards.push({
						id: card.id,
						url: card.links.html.href,
						title: card.title,
						modifiedAt: new Date(card.updated_on).getTime(),
						tokenId: card.id,
						body: card.content ? card.content.raw : "",
					});
				});
			})
		);
		return { cards };
	}

	@log()
	async createCard(request: CreateThirdPartyCardRequest) {
		void (await this.ensureConnected());

		const data = request.data as BitbucketCreateCardRequest;
		const cardData: { [key: string]: any } = {
			title: data.title,
			content: {
				raw: data.description,
				markup: "markdown",
			},
		};
		if (data.assignee) {
			cardData.assignee = { uuid: data.assignee.uuid };
		}
		const response = await this.post<{}, BitbucketCreateCardResponse>(
			`/repositories/${data.repoName}/issues`,
			cardData
		);
		let card = response.body;
		let issueResponse;
		try {
			const strippedPath = card.links.self.href.split(this.baseUrl)[1];
			issueResponse = await this.get<BitbucketCard>(strippedPath);
		} catch (err) {
			Logger.error(err);
			return card;
		}
		card = issueResponse.body;
		card.url = card.links.html!.href;
		return card;
	}

	@log()
	async moveCard(request: MoveThirdPartyCardRequest): Promise<MoveThirdPartyCardResponse> {
		return { success: false };
	}

	private async getMemberId() {
		const userResponse = await this.get<{ uuid: string; [key: string]: any }>(`/user`);

		return userResponse.body.uuid;
	}

	@log()
	async getAssignableUsers(request: { boardId: string }) {
		void (await this.ensureConnected());

		try {
			const repoResponse = await this.get<BitbucketRepo>(`/repositories/${request.boardId}`);
			if (repoResponse.body.owner.type === "team") {
				let members: BitbucketUser[] = [];
				let apiResponse = await this.get<BitbucketValues<BitbucketUser[]>>(
					`/users/${repoResponse.body.owner.username}/members`
				);
				members = apiResponse.body.values;
				while (apiResponse.body.next) {
					apiResponse = await this.get<BitbucketValues<BitbucketUser[]>>(apiResponse.body.next);
					members = members.concat(apiResponse.body.values);
				}

				return {
					users: members.map(u => ({ ...u, id: u.account_id, displayName: u.display_name })),
				};
			} else {
				const userResponse = await this.get<BitbucketUser>("/user");
				const user = userResponse.body;
				return { users: [{ ...user, id: user.account_id, displayName: user.display_name }] };
			}
		} catch (ex) {
			Logger.error(ex);
			return { users: [] };
		}
	}

	@log()
	async getAssignableUsersAutocomplete(
		request: FetchAssignableUsersAutocompleteRequest
	): Promise<FetchAssignableUsersResponse> {
		return { users: [] };
	}

	private isPRApproved = (participants: BitbucketUnfilteredParticipants[]) => {
		//returns false or true
		if (participants.length) {
			const participantLength = participants.length;
			const approvedParticipants = participants.filter(
				(_: { approved: boolean; state?: string }) => _.approved && _.state === "approved"
			);
			const isApproved = participantLength == approvedParticipants?.length;
			return isApproved;
		}
		return false;
	};

	private excludeNonActiveParticipants = (participants: BitbucketUnfilteredParticipants[]) => {
		const nonReviewers = participants.filter(
			(_: { role: BitbucketParticipantRole }) => _.role !== BitbucketParticipantRole.Reviewer
		);
		const filteredParticipants = nonReviewers.filter((_: { state?: string }) => _.state !== null);
		return filteredParticipants;
	};

	private separateReviewers = (participants: BitbucketUnfilteredParticipants[]) => {
		const reviewers = participants.filter(
			(_: { role: BitbucketParticipantRole }) => _.role !== BitbucketParticipantRole.Participant
		);
		return reviewers;
	};

	private isChangesRequested = (participants: any) => {
		if (participants.length) {
			const changesRequestedParticipants = participants.filter(
				(_: { approved: boolean; state?: string }) => !_.approved && _.state === "changes_requested"
			);
			if (changesRequestedParticipants.length) {
				return true;
			}
		}
		return false;
	};

	@log()
	async getPullRequest(
		request: FetchThirdPartyPullRequestRequest
	): Promise<FetchThirdPartyPullRequestResponse> {
		await this.ensureConnected();

		if (request.force) {
			this._pullRequestCache.delete(request.pullRequestId);
		} else {
			const cached = this._pullRequestCache.get(request.pullRequestId);
			if (cached) {
				return cached;
			}
		}
		let response: FetchThirdPartyPullRequestResponse;
		try {
			const { pullRequestId, repoWithOwner } = this.parseId(request.pullRequestId);
			const repoSplit = repoWithOwner.split("/");
			const workspace = repoSplit[0];

			const pr = await this.get<BitbucketPullRequest>(
				`/repositories/${repoWithOwner}/pullrequests/${pullRequestId}`
			);

			const comments = await this.get<BitbucketValues<BitbucketPullRequestComment[]>>(
				`/repositories/${repoWithOwner}/pullrequests/${pullRequestId}/comments?pagelen=100`
			);

			const timeline = await this.get<BitbucketValues<TimelineItem[]>>(
				`/repositories/${repoWithOwner}/pullrequests/${pullRequestId}/activity?pagelen=50`
			);

			const commits = await this.get<BitbucketValues<BitbucketPullRequestCommit[]>>(
				`/repositories/${repoWithOwner}/pullrequests/${pullRequestId}/commits`
			);

			const diffstat = await this.get<BitbucketValues<BitbucketDiffStat[]>>(
				`/repositories/${repoWithOwner}/pullrequests/${pullRequestId}/diffstat`
			);

			const members = await this.get<BitbucketValues<BitbucketWorkspaceMembers[]>>(
				`/workspaces/${workspace}/members`
			);

			//get all users who have a permission of greater than read
			const permissions = await this.get<BitbucketValues<BitbucketUserPermissionsRequest[]>>(
				`/user/permissions/repositories?q=permission>"read"`
			);

			const userResponse = await this.getCurrentUser();

			const isViewerCanUpdate = () => {
				return !!permissions.body.values.find(
					(_: { user: { account_id: string } }) => _.user.account_id === userResponse.account_id
				);
			};

			let lines_added_total = 0;
			let lines_removed_total = 0;
			diffstat.body.values.forEach(diff => {
				lines_added_total += diff.lines_added;
				lines_removed_total += diff.lines_removed;
			});

			const viewerCanUpdate = isViewerCanUpdate();

			const commit_count = commits.body.values.length;

			const listToTree: any = (
				arr: { id: string; replies: any[]; parent: { id: string } }[] = []
			) => {
				let map: any = {};
				let res: any = [];
				for (let i = 0; i < arr.length; i++) {
					if (!arr[i].replies) {
						arr[i].replies = [];
					}
					map[arr[i].id] = i;
					if (!arr[i].parent) {
						res.push(arr[i]);
					} else {
						arr[map[arr[i].parent.id]].replies.push(arr[i]);
					}
				}

				return res;
			};

			const viewer = {
				id: userResponse.account_id,
				login: userResponse.display_name,
				avatarUrl: userResponse.links.avatar.href,
				viewerDidAuthor: userResponse.account_id === pr.body.author.account_id,
			};

			const filterComments = comments.body.values
				.filter(_ => !_.deleted)
				.map((_: BitbucketPullRequestComment) => {
					return this.mapComment(_, viewer.id);
				}) as ThirdPartyPullRequestComments<BitbucketPullRequestComment2>;

			const treeComments = listToTree(filterComments);

			const repoWithOwnerSplit = repoWithOwner.split("/");

			const mappedTimelineItems = timeline.body.values
				.filter(_ => _.comment && !_.comment.deleted && !_.comment.inline)
				.map(_ => {
					return this.mapTimelineComment(_.comment, viewer.id);
				});
			mappedTimelineItems.sort(
				(a: { createdAt: string }, b: { createdAt: string }) =>
					new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
			);

			const { repos } = SessionContainer.instance();
			const allRepos = await repos.get();

			const { currentRepo } = await this.getProviderRepo({
				repoName: repoWithOwnerSplit[1].toLowerCase(),
				repoUrl: pr.body.source?.repository?.links?.html?.href.toLowerCase(),
				repos: allRepos.repos,
			});

			const isViewerDidAuthor = () => {
				if (userResponse.account_id === pr.body.author.account_id) {
					return true;
				} else {
					return false;
				}
			};

			const newParticipantsArray = this.excludeNonActiveParticipants(pr.body.participants);
			const newReviewersArray = this.separateReviewers(pr.body.participants);

			const isApproved = this.isPRApproved(newParticipantsArray);

			const viewerDidAuthor = isViewerDidAuthor();

			response = {
				viewer: viewer,
				repository: {
					id: pr.body.id + "",
					url: pr.body.source?.repository?.links?.html?.href,
					// FIXME - we made it conform to GH's PR shape - see PullRequestFilesChanged.tsx
					prRepoId: currentRepo?.id,
					// TODO start
					resourcePath: "",
					rebaseMergeAllowed: true,
					squashMergeAllowed: true,
					mergeCommitAllowed: true,
					viewerDefaultMergeMethod: "MERGE",
					viewerPermission: "READ",
					// TODO end
					repoOwner: repoWithOwnerSplit[0],
					repoName: repoWithOwnerSplit[1],
					providerId: this.providerConfig.id,
					branchProtectionRules: undefined,
					pullRequest: {
						createdAt: pr.body.created_on,
						baseRefOid: pr.body.destination.commit.hash,
						headRefOid: pr.body.source.commit.hash,
						baseRefName: pr.body.destination.branch.name,
						headRefName: pr.body.source.branch.name,
						author: {
							login: pr.body.author.display_name,
							avatarUrl: pr.body.author.links.avatar,
							id: pr.body.author.account_id,
						},
						comments: treeComments || [],
						description: pr.body.description,
						additions: lines_added_total,
						deletions: lines_removed_total,
						number: pr.body.id,
						idComputed: JSON.stringify({
							id: pr.body.id,
							pullRequestId: pr.body.id,
							repoWithOwner: repoWithOwner,
						}),
						providerId: this.providerConfig.id,
						commits: {
							totalCount: commit_count,
						},
						repository: {
							name: repoWithOwnerSplit[1],
							nameWithOwner: repoWithOwner,
							url: pr.body.source?.repository?.links?.html?.href,
							prRepoId: currentRepo?.id,
						},
						state: pr.body.state,
						title: pr.body.title,
						timelineItems: {
							nodes: mappedTimelineItems,
						},
						participants: {
							nodes: newParticipantsArray,
						},
						participantsUnfiltered: {
							nodes: pr.body.participants,
						},
						reviewers: {
							nodes: newReviewersArray,
						},
						members: {
							nodes: members.body.values,
						},
						url: pr.body.links.html.href,
						viewer: viewer,
						viewerDidAuthor: viewerDidAuthor,
						viewerCanUpdate: viewerCanUpdate,
						isApproved: isApproved,
						id: pr.body.id,
						updatedAt: pr.body.updated_on,
					} as any, //TODO: make this work
				},
			};

			this._pullRequestCache.set(request.pullRequestId, response);
		} catch (ex) {
			Logger.error(ex, "getPullRequest", {
				request: request,
			});
			return {
				error: {
					message: ex.message,
				},
			} as any;
		}

		Logger.log("getPullRequest returning", {
			id: request.pullRequestId,
			repository: response.repository.pullRequest.repository,
		});

		return response;
	}

	async mergePullRequest(request: {
		pullRequestId: string;
		repoWithOwner: string;
		mergeMessage: string;
		mergeMethod: string;
		closeSourceBranch?: boolean;
		prParticipants: BitbucketUnfilteredParticipants;
	}): Promise<Directives | undefined | { error: string }> {
		const payload: BitbucketMergeRequest = {
			message: request.mergeMessage,
			merge_strategy: request.mergeMethod,
			close_source_branch: request.closeSourceBranch || false,
		};
		Logger.log(`commenting:pullRequestMerge`, {
			request: request,
			payload: payload,
		});

		try {
			const { pullRequestId, repoWithOwner } = this.parseId(request.pullRequestId);
			const response = await this.post<BitbucketMergeRequest, BitbucketMergeRequestResponse>(
				`/repositories/${repoWithOwner}/pullrequests/${pullRequestId}/merge`,
				payload
			);

			const directives: Directive[] = [
				{
					type: "updatePullRequest",
					data: {
						updatedAt: new Date().getTime() as any,
						state: response.body.state,
					},
				},
			];

			return {
				directives: directives,
			};
		} catch (error) {
			Logger.error(error);
			return { error: error.message };
		}
	}

	async createPullRequestCommentAndClose(request: {
		pullRequestId: string;
		text: string;
	}): Promise<Directives> {
		const directives: any = [];
		const { pullRequestId, repoWithOwner } = this.parseId(request.pullRequestId);

		if (request.text) {
			this.createPullRequestComment(request);
		}

		const payload: { type: string } = {
			type: "pullrequest",
		};

		const response2 = await this.post<BitbucketDeclinePullRequest, BitbucketMergeRequestResponse>(
			`/repositories/${repoWithOwner}/pullrequests/${pullRequestId}/decline`,
			payload
		);

		directives.push({
			type: "updatePullRequest",
			data: {
				state: response2.body.state,
				updatedAt: response2.body.updated_on,
			},
		});

		return this.handleResponse(request.pullRequestId, {
			directives: directives,
		});
	}

	async updatePullRequestBody(request: {
		pullRequestId: string;
		id?: string;
		body: string;
	}): Promise<Directives> {
		const payload: { description: string } = {
			description: request.body,
		};

		Logger.log(`commenting:updatingPRDescription`, {
			request: request,
			payload: payload,
		});

		const { pullRequestId, repoWithOwner } = this.parseId(request.pullRequestId);
		const response = await this.put<BitbucketUpdateDescription, BitbucketPullRequest>(
			`/repositories/${repoWithOwner}/pullrequests/${pullRequestId}`,
			payload
		);
		const directives: Directive[] = [
			{
				type: "updatePullRequest",
				data: {
					description: response.body.description as string,
					updatedAt: new Date().getTime() as any,
				},
			},
		];

		this.updateCache(request.pullRequestId, {
			directives: directives,
		});

		return {
			directives: directives,
		};
	}

	async updatePullRequestTitle(request: {
		pullRequestId: string;
		id: string;
		title: string;
	}): Promise<Directives> {
		const payload: { title: string } = {
			title: request.title,
		};

		Logger.log(`commenting:updatingPRTitle`, {
			request: request,
			payload: payload,
		});

		const { pullRequestId, repoWithOwner } = this.parseId(request.pullRequestId);
		const response = await this.put<BitbucketUpdateTitleRequest, BitbucketPullRequest>(
			`/repositories/${repoWithOwner}/pullrequests/${pullRequestId}`,
			payload
		);
		const directives: Directive[] = [
			{
				type: "updatePullRequest",
				data: {
					title: response.body.title as string,
					updatedAt: new Date().getTime() as any,
				},
			},
		];

		this.updateCache(request.pullRequestId, {
			directives: directives,
		});

		return {
			directives: directives,
		};
	}

	//this is for deleting a pullrequest comment
	async deletePullRequestComment(request: {
		pullRequestId: string;
		id: string;
		isPending?: string;
		body: string;
	}): Promise<Directives> {
		Logger.log(`commenting:deletePRComment`, {
			request: request,
		});
		const { pullRequestId, repoWithOwner } = this.parseId(request.pullRequestId);
		// DELETE /2.0/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/comments/{comment_id}
		const response = await this.delete<BitBucketCreateCommentRequest>(
			`/repositories/${repoWithOwner}/pullrequests/${pullRequestId}/comments/${request.id}`
		);

		const directives: Directive[] = [
			{
				type: "updatePullRequest",
				data: {
					updatedAt: new Date().getTime() as any,
				},
			},
			{
				type: "removeNode",
				data: {
					id: request.id,
				},
			},
		];

		this.updateCache(request.pullRequestId, {
			directives: directives,
		});

		return {
			directives: directives,
		};
	}

	//this is for updating pullrequest comments
	async updateIssueComment(request: {
		pullRequestId: string;
		id: string;
		isPending?: string;
		body: string;
	}): Promise<Directives> {
		const payload = {
			content: {
				raw: request.body,
			},
		};
		Logger.log(`commenting:updatingPRComment`, {
			request: request,
			payload: payload,
		});
		const { pullRequestId, repoWithOwner } = this.parseId(request.pullRequestId);
		// PUT /2.0/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/comments/{comment_id}
		const response = await this.put<BitBucketCreateCommentRequest, BitbucketPullRequestComment>(
			`/repositories/${repoWithOwner}/pullrequests/${pullRequestId}/comments/${request.id}`,
			payload
		);
		const directives: Directive[] = [
			{
				type: "updatePullRequest",
				data: {
					updatedAt: new Date().getTime() as any,
				},
			},
			{
				type: "updateNode",
				data: this.mapTimelineComment(response.body, response.body.user.account_id),
			},
		];

		this.updateCache(request.pullRequestId, {
			directives: directives,
		});

		return {
			directives: directives,
		};
	}

	async createPullRequestComment(request: {
		pullRequestId: string;
		sha?: string;
		text: string;
	}): Promise<Directives> {
		const payload = {
			content: {
				raw: request.text,
			},
		};

		Logger.log(`commenting:createPullRequestComment`, {
			request: request,
			payload: payload,
		});

		const { pullRequestId, repoWithOwner } = this.parseId(request.pullRequestId);
		const response = await this.post<BitBucketCreateCommentRequest, BitbucketPullRequestComment>(
			`/repositories/${repoWithOwner}/pullrequests/${pullRequestId}/comments`,
			payload
		);

		const directives: Directive[] = [
			{
				type: "updatePullRequest",
				data: {
					updatedAt: new Date().getTime() as any,
				},
			},
			{
				type: "addPullRequestComment",
				data: this.mapTimelineComment(response.body, response.body.user.account_id),
			},
		];

		this.updateCache(request.pullRequestId, {
			directives: directives,
		});

		return {
			directives: directives,
		};
	}

	@log()
	async getPullRequestCommits(request: {
		pullRequestId: string;
	}): Promise<FetchThirdPartyPullRequestCommitsResponse[]> {
		const { pullRequestId, repoWithOwner } = this.parseId(request.pullRequestId);
		const items = await this.get<BitbucketValues<BitbucketPullRequestCommit[]>>(
			`/repositories/${repoWithOwner}/pullrequests/${pullRequestId}/commits`
		);

		const response = items.body.values.map(commit => {
			let alternateName = commit.author?.raw?.split(" ");
			const author = {
				name: commit.author?.user?.display_name || alternateName[0],

				avatarUrl:
					//@ts-ignore
					commit.author?.user?.links?.avatar?.href || commit.repository?.links?.avatar?.href,
				user: {
					login: commit.author?.user?.display_name || alternateName[0],
					avatarUrl:
						//@ts-ignore
						commit.author?.user?.links?.avatar?.href || commit.repository?.links?.avatar?.href,
				},
			};
			return {
				abbreviatedOid: commit.hash.substring(0, 7),
				author: author,
				committer: author,
				message: commit.message,
				authoredDate: commit.date,
				oid: commit.hash,
				url: commit.links?.html?.href,
			} as FetchThirdPartyPullRequestCommitsResponse;
		});
		return response;
	}

	async removeReviewerFromPullRequest(request: {
		reviewerId: string;
		pullRequestId: string;
		fullname: string;
	}): Promise<Directives> {
		const pr = await this.get<BitbucketPullRequest>(
			`/repositories/${request.fullname}/pullrequests/${request.pullRequestId}`
		);

		let newReviewers: BitbucketReviewers[] = [];

		if (pr.body.reviewers?.length === 1) {
			newReviewers = [];
		} else {
			//remove that reviewer
			pr.body.reviewers?.filter(_ => {
				if (_.account_id !== request.reviewerId) {
					newReviewers.push(_);
				}
			});
		}

		const payload = {
			reviewers: newReviewers,
		};
		Logger.log(`commenting:removeRequestedReviewer`, {
			request: request,
			payload: payload,
		});

		const response = await this.put<BitbucketUpdateReviewerRequest, BitbucketPullRequest>(
			`/repositories/${request.fullname}/pullrequests/${request.pullRequestId}`,
			payload
		);

		const directives: Directive[] = [
			{
				type: "updatePullRequest",
				data: {
					updatedAt: Dates.toUtcIsoNow(),
				},
			},
			{
				type: "removeRequestedReviewer",
				data: {
					participants: response.body.participants,
				},
			},
		];
		return {
			directives: directives,
		};
	}

	async addReviewerToPullRequest(request: {
		reviewerId: string;
		pullRequestId: string;
		fullname: string;
	}): Promise<Directives> {
		const pr = await this.get<BitbucketPullRequest>(
			`/repositories/${request.fullname}/pullrequests/${request.pullRequestId}`
		);

		const repoSplit = request.fullname.split("/");
		const workspace = repoSplit[0];

		const members = await this.get<BitbucketValues<BitbucketWorkspaceMembers[]>>(
			`/workspaces/${workspace}/members`
		);

		//get user info from members
		let userInfo = pr.body.reviewers;
		const selectedUser = request.reviewerId;
		if (userInfo) {
			members.body.values.find(_ => {
				if (_.user.account_id === selectedUser) {
					userInfo?.push(_.user);
				}
			});
		}

		const newReviewers = userInfo;

		const payload = {
			reviewers: newReviewers ?? [],
		};
		Logger.log(`commenting:addRequestedReviewer`, {
			request: request,
			payload: payload,
		});

		const response = await this.put<BitbucketUpdateReviewerRequest, BitbucketPullRequest>(
			`/repositories/${request.fullname}/pullrequests/${request.pullRequestId}`,
			payload
		);

		const directives: Directive[] = [
			{
				type: "updatePullRequest",
				data: {
					updatedAt: Dates.toUtcIsoNow(),
				},
			},
			{
				type: "updateReviewers",
				data: {
					participants: response.body.participants,
				},
			},
		];
		return {
			directives: directives,
		};
	}

	//since bb doesn't have a concept of review, this is bb version of submitReview (approve/unapprove, request-changes)
	async submitReview(request: {
		pullRequestId: string;
		// text: string;
		eventType: string;
		// used with old servers
		pullRequestReviewId?: string;
		userId: string;
		participants: BitbucketUnfilteredParticipants[];
		repoWithOwner: string;
		viewerRole: string;
	}): Promise<Directives> {
		const payload: { type: string } = {
			type: request.eventType,
		};
		Logger.log(`commenting:pullrequestsubmitreview`, {
			request: request,
			payload: payload,
		});

		let response: any = {}; //TODO: fix this any!

		//TODO: try-catch on the delete
		if (request.eventType === "changes-requested") {
			//to un-request changes you have to run a delete
			response = await this.delete<BitbucketSubmitReviewRequest>(
				`/repositories/${request.repoWithOwner}/pullrequests/${request.pullRequestId}/request-changes`
			);
			//bitbucket doesn't return anything on this delete
			return this.handleResponse(request.pullRequestId, {
				directives: [
					{
						type: "updatePullRequest",
						data: {
							updatedAt: Dates.toUtcIsoNow(),
						},
					},
					{
						type: "removePendingReview",
						data: {
							user: {
								account_id: request.userId,
							},
							state: null,
							participated_on: toUtcIsoNow(),
							approved: false,
							role: request.viewerRole,
						},
					},
				],
			});
		}
		if (request.eventType === "request-changes") {
			response = await this.post<
				//returns the reviewer who requested changes
				BitbucketSubmitReviewRequest,
				BitbucketSubmitReviewRequestResponse
			>(
				`/repositories/${request.repoWithOwner}/pullrequests/${request.pullRequestId}/${request.eventType}`,
				payload
			);

			return this.handleResponse(request.pullRequestId, {
				directives: [
					{
						type: "updatePullRequest",
						data: {
							updatedAt: Dates.toUtcIsoNow(),
						},
					},
					{
						type: "addRequestChanges",
						data: {
							user: {
								display_name: response.body.user.display_name,
								account_id: response.body.user.account_id,
								nickname: response.body.user.nickname,
								links: {
									avatar: {
										href: response.body.user.links.avatar.href,
									},
								},
							},
							approved: response.body.approved,
							state: response.body.state,
							participated_on: response.body.participated_on,
							role: response.body.role,
						},
					},
				],
			});
		}
		if (request.eventType === "unapprove") {
			//to unapprove you have to run a delete
			response = await this.delete<BitbucketSubmitReviewRequest>(
				`/repositories/${request.repoWithOwner}/pullrequests/${request.pullRequestId}/approve`
			);
			//bitbucket doesn't return anything on this delete
			return this.handleResponse(request.pullRequestId, {
				directives: [
					{
						type: "updatePullRequest",
						data: {
							updatedAt: Dates.toUtcIsoNow(),
						},
					},
					{
						type: "removeApprovedBy",
						data: {
							user: {
								account_id: request.userId,
							},
							state: null,
							participated_on: toUtcIsoNow(),
							approved: false,
							role: request.viewerRole,
						},
					},
				],
			});
		}
		if (request.eventType === "approve") {
			response = await this.post<
				//returns the information for the person added
				BitbucketSubmitReviewRequest,
				BitbucketSubmitReviewRequestResponse
			>(
				`/repositories/${request.repoWithOwner}/pullrequests/${request.pullRequestId}/${request.eventType}`,
				payload
			);

			return this.handleResponse(request.pullRequestId, {
				directives: [
					{
						type: "updatePullRequest",
						data: {
							updatedAt: Dates.toUtcIsoNow(),
						},
					},
					{
						type: "addApprovedBy",
						data: {
							user: {
								display_name: response.body.user.display_name,
								account_id: response.body.user.account_id,
								nickname: response.body.user.nickname,
								links: {
									avatar: {
										href: response.body.user.links.avatar.href,
									},
								},
							},
							approved: response.body.approved,
							state: response.body.state,
							participated_on: response.body.participated_on,
							role: response.body.role,
						},
					},
				],
			});
		}
		throw new Error(`Unknown request type: ${request.eventType}`);
	}

	async getPullRequestLastUpdated(request: { pullRequestId: string }) {
		const { pullRequestId, repoWithOwner } = this.parseId(request.pullRequestId);
		const pr = await this.get<BitbucketPullRequest>(
			`/repositories/${repoWithOwner}/pullrequests/${pullRequestId}`
		);

		return {
			updatedAt: pr.body.updated_on,
		};
	}

	async getPullRequestFilesChanged(request: {
		pullRequestId: string;
	}): Promise<FetchThirdPartyPullRequestFilesResponse[]> {
		const { pullRequestId, repoWithOwner } = this.parseId(request.pullRequestId);

		const items = await this.get<BitbucketValues<BitbucketDiffStat[]>>(
			`/repositories/${repoWithOwner}/pullrequests/${pullRequestId}/diffstat`
		);

		const commits = await this.get<BitbucketValues<BitbucketPullRequestCommit[]>>(
			`/repositories/${repoWithOwner}/pullrequests/${pullRequestId}/commits`
		);

		const response = items.body.values.map(file => {
			return commits.body.values.map(commit => {
				return {
					sha: commit.hash,
					filename: file.new?.path,
					previousFilename: file.old?.path,
					status: file.status,
					additions: file?.lines_added,
					changes: 0, //TODO: check documentation
					deletions: file?.lines_removed,
					patch: commit.links?.patch?.href,
				};
			});
		});
		return flatten(response);
	}

	private mapComment(
		_: BitbucketPullRequestComment,
		viewerId: string
	): BitbucketPullRequestComment2 {
		const viewerCanUpdate = () => {
			if (_.user.account_id === viewerId) {
				return true;
			} else {
				return false;
			}
		};
		const bool = viewerCanUpdate();
		return {
			..._,
			file: _.inline?.path,
			bodyHtml: _.content?.html,
			bodyText: _.content?.raw,
			state: _.type,
			viewerCanUpdate: bool,
			viewerCanDelete: bool,
			id: _.id,
			deleted: _.deleted,
			author: {
				login: _.user.display_name,
				name: _.user.display_name,
				id: _.user.account_id,
				avatarUrl: _.user.links?.avatar?.href,
			},
		} as BitbucketPullRequestComment2;
	}

	private mapTimelineComment(comment: BitbucketPullRequestComment, viewerId: string) {
		const user = comment?.user;
		const viewerCanUpdate = () => {
			if (user.account_id === viewerId) {
				return true;
			} else {
				return false;
			}
		};
		const bool = viewerCanUpdate();
		return {
			author: {
				avatarUrl: user?.links?.avatar?.href,
				name: user?.display_name,
				login: user?.display_name,
				id: user.account_id,
			},
			viewerCanUpdate: bool,
			viewerCanDelete: bool,
			bodyText: comment.content?.raw,
			createdAt: comment.created_on,
			file: comment.inline?.path,
			bodyHtml: comment.content.html,
			state: comment.type,
			id: comment.id,
			deleted: comment.deleted,
		};
	}

	async getRemotePaths(repo: any, _projectsByRemotePath: any) {
		// TODO don't need this ensureConnected -- doesn't hit api
		await this.ensureConnected();
		const remotePaths = await getRemotePaths(
			repo,
			this.getIsMatchingRemotePredicate(),
			_projectsByRemotePath
		);
		return remotePaths;
	}

	getOwnerFromRemote(remote: string): { owner: string; name: string } {
		// HACKitude yeah, sorry
		const uri = URI.parse(remote);
		const split = uri.path.split("/");
		const owner = split[1];
		const name = toRepoName(split[2]);
		return {
			owner,
			name,
		};
	}

	async getPullRequestIdFromUrl(request: { url: string }) {
		// url string looks like: https://bitbucket.org/{workspace}/{repo_slug}/pull-requests/{pull_request_id}

		const { owner, name } = this.getOwnerFromRemote(request.url);

		const uri = URI.parse(request.url);
		const path = uri.path.split("/");

		const repoWithOwner = owner + "/" + name;
		const pullRequestId = path[4];

		const idComputed = JSON.stringify({
			id: pullRequestId,
			pullRequestId: pullRequestId,
			repoWithOwner: repoWithOwner,
		});
		return idComputed;
	}

	async getPullRequestsContainigSha(
		repoIdentifier: { owner: string; name: string }[],
		sha: string
	): Promise<any[]> {
		return [];
	}

	async createPullRequest(
		request: ProviderCreatePullRequestRequest
	): Promise<ProviderCreatePullRequestResponse | undefined> {
		void (await this.ensureConnected());

		try {
			const repoInfo = await this.getRepoInfo({ remote: request.remote });
			if (repoInfo && repoInfo.error) {
				return {
					error: repoInfo.error,
				};
			}
			const { owner, name } = this.getOwnerFromRemote(request.remote);
			let createPullRequestResponse;
			if (request.isFork) {
				createPullRequestResponse = await this.post<
					BitBucketCreatePullRequestRequest,
					BitBucketCreatePullRequestResponse
				>(`/repositories/${request.baseRefRepoNameWithOwner}/pullrequests`, {
					source: {
						branch: { name: request.headRefName },
						repository: {
							full_name: request.headRefRepoNameWithOwner,
						},
					},
					destination: {
						branch: { name: request.baseRefName },
						repository: {
							full_name: request.baseRefRepoNameWithOwner,
						},
					},
					title: request.title,
					description: this.createDescription(request),
				});
			} else {
				createPullRequestResponse = await this.post<
					BitBucketCreatePullRequestRequest,
					BitBucketCreatePullRequestResponse
				>(`/repositories/${owner}/${name}/pullrequests`, {
					source: { branch: { name: request.headRefName } },
					destination: { branch: { name: request.baseRefName } },
					title: request.title,
					description: this.createDescription(request),
				});
			}

			const title = `#${createPullRequestResponse.body.id} ${createPullRequestResponse.body.title}`;
			return {
				id: JSON.stringify({
					id: createPullRequestResponse.body.id,
					pullRequestId: createPullRequestResponse.body.id,
					repoWithOwner: `${owner}/${name}`,
				}),
				url: createPullRequestResponse.body.links.html.href,
				title: title,
			};
		} catch (ex) {
			Logger.error(ex, `${this.displayName}: createPullRequest`, {
				remote: request.remote,
				head: request.headRefName,
				base: request.baseRefName,
			});
			let message = ex.message;
			if (message.indexOf("credentials lack one or more required privilege scopes") > -1) {
				message +=
					"\n\nYou may need to disconnect and reconnect your Bitbucket for CodeStream integration to create your first Pull Request.";
			}
			return {
				error: {
					type: "PROVIDER",
					message: `${this.displayName}: ${message}`,
				},
			};
		}
	}

	@log()
	async getRepoInfo(request: { remote: string }): Promise<ProviderGetRepoInfoResponse> {
		try {
			const { owner, name } = this.getOwnerFromRemote(request.remote);
			const repoResponse = await this.get<BitbucketRepo>(`/repositories/${owner}/${name}`);
			const pullRequestResponse = await this.get<BitbucketValues<BitbucketPullRequest[]>>(
				`/repositories/${owner}/${name}/pullrequests?state=OPEN`
			);
			let pullRequests: ProviderPullRequestInfo[] = [];
			if (pullRequestResponse && pullRequestResponse.body && pullRequestResponse.body.values) {
				pullRequests = pullRequestResponse.body.values.map(_ => {
					return {
						id: _.id + "",
						url: _.links!.html!.href,
						baseRefName: _.destination.branch.name,
						headRefName: _.source.branch.name,
						nameWithOwner: _.source.repository.full_name,
					} as ProviderPullRequestInfo;
				});
			}
			return {
				id: repoResponse.body.uuid,
				owner,
				name,
				nameWithOwner: `${owner}/${name}`,
				isFork: repoResponse.body.parent != null,
				defaultBranch:
					repoResponse.body &&
					repoResponse.body.mainbranch &&
					repoResponse.body.mainbranch.name &&
					repoResponse.body.mainbranch.type === "branch"
						? repoResponse.body.mainbranch.name
						: undefined,
				pullRequests: pullRequests,
			};
		} catch (ex) {
			return this.handleProviderError(ex, request);
		}
	}

	async getForkedRepos(request: { remote: string }): Promise<ProviderGetForkedReposResponse> {
		try {
			const { owner, name } = this.getOwnerFromRemote(request.remote);

			const repoResponse = await this.get<BitbucketRepo>(`/repositories/${owner}/${name}`);

			const parentOrSelfProject = repoResponse.body.parent
				? repoResponse.body.parent
				: repoResponse.body;

			const branchesByProjectId = new Map<string, any[]>();
			if (repoResponse.body.parent) {
				const branchesResponse = await this.get<any[]>(
					`/repositories/${repoResponse.body.parent.full_name}/refs`
				);
				branchesByProjectId.set(repoResponse.body.parent.uuid, branchesResponse.body.values as any);
			}
			const branchesResponse = await this.get<any[]>(
				`/repositories/${repoResponse.body.full_name}/refs`
			);
			branchesByProjectId.set(repoResponse.body.uuid, branchesResponse.body.values as any);

			const forksResponse = await this.get<any>(
				`/repositories/${parentOrSelfProject.full_name}/forks`
			);

			for (const project of forksResponse.body.values) {
				const branchesResponse = await this.get<any[]>(`/repositories/${project.full_name}/refs`);
				branchesByProjectId.set(project.uuid, branchesResponse.body.values as any);
			}

			const response = {
				self: {
					nameWithOwner: repoResponse.body.full_name,
					owner: owner,
					id: repoResponse.body.uuid,
					refs: {
						nodes: branchesByProjectId
							.get(repoResponse.body.uuid)!
							.map(branch => ({ name: branch.name })),
					},
				},
				forks: (forksResponse?.body?.values).map((fork: any) => ({
					nameWithOwner: fork.full_name,
					owner: fork.slug,
					id: fork.uuid,
					refs: {
						nodes: branchesByProjectId.get(fork.uuid)!.map(branch => ({ name: branch.name })),
					},
				})),
			} as ProviderGetForkedReposResponse;
			if (repoResponse.body.parent) {
				response.parent = {
					nameWithOwner: parentOrSelfProject.full_name,
					owner: parentOrSelfProject.full_name,
					id: parentOrSelfProject.uuid,
					refs: {
						nodes: branchesByProjectId
							.get(parentOrSelfProject.uuid)!
							.map(branch => ({ name: branch.name })),
					},
				};
			}
			return response;
		} catch (ex) {
			return this.handleProviderError(ex, request);
		}
	}

	private _isMatchingRemotePredicate = (r: GitRemoteLike) => r.domain === "bitbucket.org";
	getIsMatchingRemotePredicate() {
		return this._isMatchingRemotePredicate;
	}

	private _mergeSort(arr: any[]) {
		if (arr.length <= 1) return arr;
		let mid = Math.floor(arr.length / 2);
		let left: any = this._mergeSort(arr.slice(0, mid));
		let right: any = this._mergeSort(arr.slice(mid));
		return this._merge(left, right);
	}

	private _merge(arr1: any[], arr2: any[]) {
		let results = [];
		let i = 0;
		let j = 0;
		while (i < arr1.length && j < arr2.length) {
			if (arr2[j].created_on < arr1[i].created_on) {
				results.push(arr1[i]);
				i++;
			} else {
				results.push(arr2[j]);
				j++;
			}
		}
		while (i < arr1.length) {
			results.push(arr1[i]);
			i++;
		}
		while (j < arr2.length) {
			results.push(arr2[j]);
			j++;
		}
		return results;
	}

	private async _getFullNames(): Promise<{ fullname: string }[]> {
		//get all workspaces for a user: user/permissions/workspaces
		let array: { fullname: string }[] = [];
		const reposInWorkspace = await this.get<BitbucketValues<BitbucketWorkspacesRequestResponse[]>>(
			`/user/permissions/workspaces`
		);
		//values.workspace.slug
		const repoSlugs = reposInWorkspace.body.values.map(
			(workspace: { workspace: { slug: string } }) => {
				return { slug: workspace.workspace.slug };
			}
		); //array of the workspace slugs for current user

		for (let i = 0; i < repoSlugs.length; i++) {
			const response = await this.get<BitbucketValues<BitbucketRepositoriesRequestResponse[]>>(
				`/repositories/${repoSlugs[i].slug}`
			);

			//if response.body.values is more than 1, there are more than one repos.
			if (response.body.values.length > 1) {
				response.body.values.forEach((repo: { full_name: string }) => {
					array.push({ fullname: repo.full_name });
				});
			} else if (response.body.values.length === 1) {
				if (response.body.values[0].full_name) {
					array.push({ fullname: response.body.values[0].full_name });
				}
			}
		}
		return array;
	}

	private _setUpResponse(array: BitbucketPullRequest[]) {
		const providerId = this.providerConfig?.id;
		if (array.length) {
			const response = array.map(item => {
				return {
					author: {
						avatarUrl: item.author.links.avatar.href,
						login: item.author.display_name,
					},
					baseRefName: item.destination.branch.name,
					body: item.summary.html,
					bodyText: item.summary.raw,
					createdAt: new Date(item.created_on).getTime(),
					headRefName: item.source.branch.name,
					headRepository: {
						name: item.source.repository.name,
						nameWithOwner: item.source.repository.full_name,
					},
					id: item.id + "",
					idComputed: JSON.stringify({
						id: item.id,
						pullRequestId: item.id,
						repoWithOwner: item.source.repository.full_name,
					}),
					lastEditedAt: item.updated_on,
					labels: {
						nodes: [],
					},
					number: item.id,
					providerId: providerId,
					state: item.state,
					title: item.title,
					updatedAt: item.updated_on,
					url: item.links.html.href,
				} as GetMyPullRequestsResponse;
			});
			return response;
		} else {
			return [];
		}
	}

	private async _getDefaultReviewers(
		fullnameArr: { fullname: string }[],
		usernameResponse: ApiResponse<BitbucketUser>,
		query: string
	): Promise<GetMyPullRequestsResponse[]> {
		let array: BitbucketPullRequests[] = [];
		for (let i = 0; i < fullnameArr.length; i++) {
			const pullrequests = await this.get<BitbucketValues<BitbucketPullRequests[]>>(
				`/repositories/${fullnameArr[i].fullname}/pullrequests?${query}`
			);

			for (let j = 0; j < pullrequests.body.values.length; j++) {
				const PRid = pullrequests.body.values[j].id;
				const individualPRs = await this.get<BitbucketValues<BitbucketPullRequest>>(
					`/repositories/${fullnameArr[i].fullname}/pullrequests/${PRid}`
				);
				//@ts-ignore
				if (individualPRs.body.reviewers?.length) {
					//@ts-ignore
					const foundSelf = individualPRs.body.reviewers?.find(
						(_: { account_id: string }) => _.account_id === usernameResponse.body.account_id
					);
					if (foundSelf) {
						array.push(pullrequests.body.values[j]);
						array = flatten(array);
					}
				}
			}
		}
		//sort through array so it's in order
		//loop through array and map with the object below
		const setUpArray = this._mergeSort(array);
		const response = this._setUpResponse(setUpArray);
		return response;
	}

	private async _getRecents(
		fullnameArr: { fullname: string }[],
		query: string
	): Promise<GetMyPullRequestsResponse[]> {
		let array: any[] = [];
		for (let i = 0; i < fullnameArr.length; i++) {
			const recents = await this.get<BitbucketValues<BitbucketPullRequests[]>>(
				`/repositories/${fullnameArr[i].fullname}/pullrequests?${query}`
			);

			if (recents.body.values.length > 1) {
				recents.body.values.forEach(repo => {
					array.push(repo);
				});
			} else if (recents.body.values.length === 1) {
				if (recents.body.values[0]) {
					array.push(recents.body.values);
					array = flatten(array);
				}
			}
		}
		//sort the array and take the top 5
		//array[i].updated_on
		const sortedRecents = this._mergeSort(array);
		const fiveMostRecent = sortedRecents.slice(0, 5);
		const response = this._setUpResponse(fiveMostRecent);
		return response;
	}

	private async _getPRsByMe(username: string, query: string): Promise<GetMyPullRequestsResponse[]> {
		const array: BitbucketPullRequests[] = [];
		const createdByMe = await this.get<BitbucketValues<BitbucketPullRequests[]>>(
			`/pullrequests/${username}?${query}`
		);
		createdByMe.body.values.forEach(_ => {
			array.push(_);
		});
		const setUpArray = this._mergeSort(array);
		const response = this._setUpResponse(setUpArray);
		return response;
	}

	private async _PRsByMeinCurrentRepo(
		fullNames: { fullname: string }[],
		usernameResponse: ApiResponse<BitbucketUser>,
		query: string
	): Promise<GetMyPullRequestsResponse[]> {
		const array = [];
		for (let i = 0; i < fullNames.length; i++) {
			const pullrequests = await this.get<BitbucketValues<BitbucketPullRequests[]>>(
				`/repositories/${fullNames[i].fullname}/pullrequests?${query}` //note this is hardcoded
			);
			const foundSelf = pullrequests.body.values.find(
				(_: { author: { account_id: string } }) =>
					_.author.account_id === usernameResponse.body.account_id
			);
			if (foundSelf) {
				array.push(foundSelf);
			}
		} //get all the prs, then check if author is current user
		const setUpArray = this._mergeSort(array);
		const response = this._setUpResponse(setUpArray);
		return response;
	}

	async getMyPullRequests(
		request: GetMyPullRequestsRequest
	): Promise<GetMyPullRequestsResponse[][] | undefined> {
		void (await this.ensureConnected());
		// call to /user to get the username
		const usernameResponse = await this.get<BitbucketUser>("/user");
		if (!usernameResponse) {
			Logger.warn("getMyPullRequests user not found");
			return undefined;
		}

		let queryCollection: string[] = [];
		request.prQueries.forEach((_, index) => {
			let querySelection = "null";
			if (_.query) {
				let parsedQuery = qs.parse(_.query);
				if (parsedQuery && parsedQuery["with_default_reviewer"] === "true") {
					delete parsedQuery["with_default_reviewer"];
					querySelection = "defaultReviewer";
					_.query = qs.stringify(parsedQuery);
				} else if (parsedQuery && parsedQuery["recent"] === "true") {
					delete parsedQuery["recent"];
					querySelection = "recent";
					_.query = qs.stringify(parsedQuery);
				}
			}
			queryCollection.push(querySelection);
		});

		const username = usernameResponse.body.username;
		const queriesSafe = request.prQueries.map(query =>
			query.query.replace(/["']/g, '\\"').replace("@me", username)
		);

		let reposWithOwners: string[] = [];
		if (request.isOpen) {
			try {
				reposWithOwners = await this.getOpenedRepos();
				if (!reposWithOwners.length) {
					Logger.log(`getMyPullRequests: request.isOpen=true, but no repos found, returning empty`);
					return [];
				}
			} catch (ex) {
				Logger.warn(ex);
			}
		}

		const response: GetMyPullRequestsResponse[][] = [];

		if (reposWithOwners.length) {
			const fullNames: { fullname: string }[] = [];
			for (const repo of reposWithOwners) {
				fullNames.push({ fullname: repo });
			}
			const defaultReviewerPRs = await this._getDefaultReviewers(
				fullNames,
				usernameResponse,
				queriesSafe[0]
			); //NOTE: this is hardcoded, so if the order of the queries changes this should change too
			const byMeinCurrentRepo = await this._PRsByMeinCurrentRepo(
				fullNames,
				usernameResponse,
				queriesSafe[1]
			);
			const fiveMostRecentPRs = await this._getRecents(fullNames, queriesSafe[2]); //NOTE: this is hardcoded, so if the order of the queries changes this should change too
			response.push(defaultReviewerPRs);
			response.push(byMeinCurrentRepo);
			response.push(fiveMostRecentPRs);
		} else {
			const fullNames = await this._getFullNames();
			const defaultReviewerPRs = await this._getDefaultReviewers(
				fullNames,
				usernameResponse,
				queriesSafe[0]
			); //NOTE: this is hardcoded, so if the order of the queries changes this should change too
			const PRsByMe = await this._getPRsByMe(username, queriesSafe[1]); //note this is hardcoded
			const fiveMostRecentPRs = await this._getRecents(fullNames, queriesSafe[2]); //NOTE: this is hardcoded, so if the order of the queries changes this should change too
			response.push(defaultReviewerPRs);
			response.push(PRsByMe);
			response.push(fiveMostRecentPRs);
		}
		return response;
	}

	async getPullRequestReviewId(request: { pullRequestId: string }): Promise<string | undefined> {
		// BB doesn't support review objects
		return undefined;
	}

	@log()
	async createCommitComment(request: {
		pullRequestId: string;
		sha: string;
		text: string;
		path: string;
		startLine: number;
		// use endLine for multi-line comments
		// endLine?: number;
		// used for certain old providers
		position?: number;
	}): Promise<Directives> {
		const payload: BitBucketCreateCommentRequest = {
			content: {
				raw: request.text,
			},
			inline: {
				to: request.startLine,
				path: request.path,
			},
		};

		Logger.log(`commenting:createCommitComment`, {
			request: request,
			payload: payload,
		});

		const { pullRequestId, repoWithOwner } = this.parseId(request.pullRequestId);
		const response = await this.post<BitBucketCreateCommentRequest, BitbucketPullRequestComment>(
			`/repositories/${repoWithOwner}/pullrequests/${pullRequestId}/comments`,
			payload
		);

		const directives: Directive[] = [
			{
				type: "updatePullRequest",
				data: {
					updatedAt: new Date().getTime() as any,
				},
			},
			{
				type: "addNode",
				data: this.mapComment(response.body, response.body.user.account_id),
			},
		];

		this.updateCache(request.pullRequestId, {
			directives: directives,
		});

		this.session.agent.sendNotification(DidChangePullRequestCommentsNotificationType, {
			pullRequestId: request.pullRequestId,
			filePath: request.path,
		});
		return {
			directives: directives,
		};
	}

	async createCommentReply(request: {
		pullRequestId: string;
		parentId: number;
		commentId: number;
		text: string;
	}): Promise<Directives> {
		const payload: BitBucketCreateCommentRequest = {
			content: {
				raw: request.text,
			},
			parent: {
				id: request.commentId,
			},
		};

		Logger.log(`commenting:createCommentReply`, {
			request: request,
			payload: payload,
		});

		const { pullRequestId, repoWithOwner } = this.parseId(request.pullRequestId);
		const response = await this.post<BitBucketCreateCommentRequest, BitbucketPullRequestComment>(
			`/repositories/${repoWithOwner}/pullrequests/${pullRequestId}/comments`,
			payload
		);

		const directives: Directive[] = [
			{
				type: "updatePullRequest",
				data: {
					updatedAt: new Date().getTime(),
				},
			},
			{
				type: "addReply",
				data: this.mapComment(response.body, response.body.user.account_id),
			},
		];

		return this.handleResponse(request.pullRequestId, {
			directives: directives,
		});
	}

	private handleResponse(pullRequestId: string, directives: Directives) {
		this.updateCache(pullRequestId, directives);

		return directives;
	}

	private _pullRequestCache: Map<string, FetchThirdPartyPullRequestResponse> = new Map();

	private updateCache(pullRequestId: string, directives: Directives) {
		if (!directives?.directives) {
			Logger.warn(`Attempting to update cache without directives. id=${pullRequestId}`);
			return;
		}
		const prWrapper = this._pullRequestCache.get(pullRequestId);
		if (!prWrapper) {
			Logger.warn(`Attempting to update cache without PR. id=${pullRequestId}`);
			return;
		}
		const pr = prWrapper.repository?.pullRequest;
		if (!pr) {
			Logger.warn(`Attempting to update cache without PR object. id=${pullRequestId}`);
			return;
		}
		/**
		 *
		 *  KEEP THIS IN SYNC WITH providerPullReqests/reducer.ts
		 *
		 */
		for (const directive of directives.directives) {
			if (directive.type === "updatePullRequest") {
				for (const key in directive.data) {
					(pr as any)[key] = directive.data[key];
				}
			} else if (directive.type === "addApprovedBy") {
				//this is for approve
				// go through the array of participants, match the uuid, then do update
				const uuid = directive.data.user.account_id;
				const foundUser = pr.participantsUnfiltered.nodes.findIndex(
					_ => _.user?.account_id === uuid
				);
				if (foundUser != -1) {
					pr.participantsUnfiltered.nodes[foundUser].state = directive.data.state;
					pr.participantsUnfiltered.nodes[foundUser].approved = directive.data.approved;
					pr.participantsUnfiltered.nodes[foundUser].participated_on =
						directive.data.participated_on;
					pr.participantsUnfiltered.nodes[foundUser].role = directive.data.role;
				} else {
					pr.participantsUnfiltered.nodes.push({
						user: {
							account_id: uuid,
							nickname: directive.data.user.nickname,
							display_name: directive.data.user.display_name,
							links: {
								avatar: {
									href: directive.data.user.links.avatar.href,
								},
							},
						},
						state: directive.data.state,
						approved: directive.data.approved,
						participated_on: directive.data.participated_on,
						role: directive.data.role,
					});
				}
				const nonReviewers = pr.participantsUnfiltered.nodes.filter(
					_ => _.role !== BitbucketParticipantRole.Reviewer
				);
				const filteredParticipants = nonReviewers.filter(_ => _.state !== null);
				const reviewers = pr.participantsUnfiltered.nodes.filter(
					_ => _.role !== BitbucketParticipantRole.Participant
				);
				//update participants with filteredParticipants & update reviewers with reviewers
				pr.participants.nodes = filteredParticipants;
				pr.reviewers.nodes = reviewers;
			} else if (directive.type === "removeApprovedBy") {
				//this is for unapprove
				const uuid = directive.data.user.account_id;
				const foundUser = pr.participantsUnfiltered.nodes.findIndex(
					_ => _.user?.account_id === uuid
				);
				if (foundUser != -1) {
					pr.participantsUnfiltered.nodes[foundUser].state = directive.data.state;
					pr.participantsUnfiltered.nodes[foundUser].approved = directive.data.approved;
					pr.participantsUnfiltered.nodes[foundUser].participated_on =
						directive.data.participated_on;
					pr.participantsUnfiltered.nodes[foundUser].role = directive.data.role;
				}
				const nonReviewers = pr.participantsUnfiltered.nodes.filter(
					_ => _.role !== BitbucketParticipantRole.Reviewer
				);
				const filteredParticipants = nonReviewers.filter(_ => _.state !== null);
				const reviewers = pr.participantsUnfiltered.nodes.filter(
					_ => _.role !== BitbucketParticipantRole.Participant
				);
				//update participants with filteredParticipants & update reviewers with reviewers
				pr.participants.nodes = filteredParticipants;
				pr.reviewers.nodes = reviewers;
			} else if (directive.type === "addRequestChanges") {
				//This is for request changes
				const uuid = directive.data.user.account_id;
				const foundUser = pr.participantsUnfiltered.nodes.findIndex(
					_ => _.user?.account_id === uuid
				);
				if (foundUser !== -1) {
					pr.participantsUnfiltered.nodes[foundUser].state = directive.data.state;
					pr.participantsUnfiltered.nodes[foundUser].approved = directive.data.approved;
					pr.participantsUnfiltered.nodes[foundUser].participated_on =
						directive.data.participated_on;
					pr.participantsUnfiltered.nodes[foundUser].role = directive.data.role;
				} else {
					pr.participantsUnfiltered.nodes.push({
						user: {
							account_id: uuid,
							nickname: directive.data.user.nickname,
							display_name: directive.data.user.display_name,
							links: {
								avatar: {
									href: directive.data.user.links.avatar.href,
								},
							},
						},
						state: directive.data.state,
						approved: directive.data.approved,
						participated_on: directive.data.participated_on,
						role: directive.data.role,
					});
				}
				const nonReviewers = pr.participantsUnfiltered.nodes.filter(
					_ => _.role !== BitbucketParticipantRole.Reviewer
				);
				const filteredParticipants = nonReviewers.filter(_ => _.state !== null);
				const reviewers = pr.participantsUnfiltered.nodes.filter(
					_ => _.role !== BitbucketParticipantRole.Participant
				);
				//update participants with filteredParticipants & update reviewers with reviewers
				pr.participants.nodes = filteredParticipants;
				pr.reviewers.nodes = reviewers;
			} else if (directive.type === "removePendingReview") {
				//removing the requested changes
				const uuid = directive.data.user.account_id;
				const foundUser = pr.participantsUnfiltered.nodes.findIndex(
					_ => _.user?.account_id === uuid
				);
				if (foundUser !== -1) {
					pr.participantsUnfiltered.nodes[foundUser].state = directive.data.state;
					pr.participantsUnfiltered.nodes[foundUser].approved = directive.data.approved;
					pr.participantsUnfiltered.nodes[foundUser].participated_on =
						directive.data.participated_on;
					pr.participantsUnfiltered.nodes[foundUser].role = directive.data.role;
				}
				const nonReviewers = pr.participantsUnfiltered.nodes.filter(
					_ => _.role !== BitbucketParticipantRole.Reviewer
				);
				const filteredParticipants = nonReviewers.filter(_ => _.state !== null);
				const reviewers = pr.participantsUnfiltered.nodes.filter(
					_ => _.role !== BitbucketParticipantRole.Participant
				);
				//update participants with filteredParticipants & update reviewers with reviewers
				pr.participants.nodes = filteredParticipants;
				pr.reviewers.nodes = reviewers;
			} else if (directive.type === "removeRequestedReviewer") {
				const nonReviewers = directive.data.participants.filter(
					(_: { role: BitbucketParticipantRole }) => _.role !== BitbucketParticipantRole.Reviewer
				);
				const filteredParticipants = nonReviewers.filter(
					(_: { state?: string }) => _.state !== null
				);
				const reviewers = directive.data.participants.filter(
					(_: { role: BitbucketParticipantRole }) => _.role !== BitbucketParticipantRole.Participant
				);
				//update participants with filteredParticipants & update reviewers with reviewers
				pr.participants.nodes = filteredParticipants;
				pr.participantsUnfiltered.nodes = directive.data.participants;
				pr.reviewers.nodes = reviewers;
			} else if (directive.type === "updateReviewers") {
				const nonReviewers = directive.data.participants.filter(
					(_: { role: BitbucketParticipantRole }) => _.role !== BitbucketParticipantRole.Reviewer
				);
				const filteredParticipants = nonReviewers.filter(
					(_: { state?: string }) => _.state !== null
				);
				const reviewers = directive.data.participants.filter(
					(_: { role: BitbucketParticipantRole }) => _.role !== BitbucketParticipantRole.Participant
				);
				//update participants with filteredParticipants & update reviewers with reviewers
				pr.participants.nodes = filteredParticipants;
				pr.participantsUnfiltered.nodes = directive.data.participants;
				pr.reviewers.nodes = reviewers;
			} else if (directive.type === "addNode") {
				pr.comments = pr.comments || [];
				pr.comments.push(directive.data);
			} else if (directive.type === "addPullRequestComment") {
				pr.timelineItems = pr.timelineItems || {};
				pr.timelineItems.nodes = pr.timelineItems.nodes || [];
				pr.timelineItems.nodes.push(directive.data);
			} else if (directive.type === "updateNode") {
				const node = pr.timelineItems.nodes.find(_ => _.id === directive.data.id);
				if (node) {
					for (const key in directive.data) {
						node[key] = directive.data[key];
					}
				}
			} else if (directive.type === "removeNode") {
				if (!directive.data.id) continue;

				let nodeIndex = 0;
				let nodeRemoveIndex = -1;
				for (const node of pr.timelineItems.nodes) {
					if (node.id === directive.data.id) {
						// is an outer node
						nodeRemoveIndex = nodeIndex;
						break;
					}

					nodeIndex++;
				}
				if (nodeRemoveIndex > -1) {
					pr.timelineItems.nodes.splice(nodeRemoveIndex, 1);
				}
			} else if (directive.type === "addReply") {
				pr.comments = pr.comments || [];
				const findParent = function (
					items: { id: number; replies: any[] }[],
					data: { parent: { id: number } }
				) {
					for (const item of items) {
						if (item.id === data.parent.id) {
							item.replies = item.replies || [];
							item.replies.push(data);
							return;
						}
						if (item.replies?.length) {
							findParent(item.replies, data);
						}
					}
				};
				if (directive?.data?.parent?.id) {
					findParent(pr.comments, directive.data);
				} else {
					console.warn("missing parent.id", directive);
				}
			}
		}
	}

	parseId(pullRequestId: string): { id: string; pullRequestId: string; repoWithOwner: string } {
		const parsed = JSON.parse(pullRequestId);
		return {
			id: parsed.id || parsed.pullRequestId,
			pullRequestId: parsed.pullRequestId,
			repoWithOwner: parsed.repoWithOwner,
		};
	}
}

interface BitBucketCreatePullRequestRequest {
	source: {
		branch: {
			name: string;
		};
		repository?: {
			full_name?: string;
		};
	};

	destination: {
		branch: {
			name: string;
		};
		repository?: {
			full_name?: string;
		};
	};
	title: string;
	description?: string;
}

interface BitBucketCreatePullRequestResponse {
	id: string;
	links: { html: { href: string } };
	number: number;
	title: string;
}
