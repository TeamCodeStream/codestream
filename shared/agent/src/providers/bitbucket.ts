"use strict";
import { GitRemoteLike } from "git/gitService";
import { flatten } from "lodash";
import * as qs from "querystring";
import { URI } from "vscode-uri";
import { toRepoName } from "../git/utils";
import { Logger } from "../logger";
import {
	BitbucketBoard,
	BitbucketCard,
	BitbucketCreateCardRequest,
	BitbucketCreateCardResponse,
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
} from "../protocol/agent.protocol";
import { CSBitbucketProviderInfo } from "../protocol/api.protocol";
import { log, lspProvider } from "../system";
import { Directive, Directives } from "./directives";
import {
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
interface BitbucketRepoFull extends BitbucketRepo {
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
		html: string;
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

interface BitbucketPullRequest {
	viewer: {
		id: number;
		login: string;
		avatarUrl: string;
	};
	author: {
		links: {
			avatar: {
				href: string;
			};
		};
		display_name: BitbucketAuthor;
	};
	created_on: string;
	description?: string;
	destination: {
		branch: {
			name: string;
		};
		commit: {
			hash: string;
		};
	};
	id: number;
	links: {
		html: {
			href: string;
		};
	};
	source: {
		branch: {
			name: string;
		};
		commit: {
			hash: string;
		};
		repository: BitbucketRepoFull;
	};
	summary: {
		html: string;
		raw: string;
	};
	state: string;
	title: string;
	updated_on: string;
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

			const pr = await this.get<BitbucketPullRequest>(
				`/repositories/${repoWithOwner}/pullrequests/${pullRequestId}`
			);

			const comments = await this.get<BitbucketValues<BitbucketPullRequestComment[]>>(
				`/repositories/${repoWithOwner}/pullrequests/${pullRequestId}/comments?pagelen=100`
			);

			const timeline = await this.get<BitbucketValues<TimelineItem[]>>(
				`/repositories/${repoWithOwner}/pullrequests/${pullRequestId}/activity`
			);

			const userResponse = await this.getCurrentUser();

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

			const filterComments = comments.body.values
				.filter(_ => !_.deleted)
				.map((_: BitbucketPullRequestComment) => {
					return this.mapComment(_);
				}) as ThirdPartyPullRequestComments<BitbucketPullRequestComment2>;

			const treeComments = listToTree(filterComments);

			const repoWithOwnerSplit = repoWithOwner.split("/");

			const mappedTimelineItems = timeline.body.values
				.filter(_ => _.comment && !_.comment.deleted && !_.comment.inline)
				.map(_ => {
					return this.mapTimelineComment(_.comment);
				});
			mappedTimelineItems.sort(
				(a: { createdAt: string }, b: { createdAt: string }) =>
					new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
			);

			const viewer = {
				id: userResponse.account_id,
				login: userResponse.username,
				avatarUrl: userResponse.links.avatar.href,
			};

			response = {
				viewer: viewer,
				repository: {
					id: pr.body.id + "",
					url: pr.body.source?.repository?.links?.html?.href,
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
						baseRefOid: pr.body.destination.commit.hash,
						headRefOid: pr.body.source.commit.hash,
						author: {
							login: pr.body.author.display_name,
							avatarUrl: pr.body.author.links.avatar,
						},
						comments: treeComments || [],
						description: pr.body.description,
						number: pr.body.id,
						idComputed: JSON.stringify({
							id: pr.body.id,
							pullRequestId: pr.body.id,
							repoWithOwner: repoWithOwner,
						}),
						providerId: this.providerConfig.id,
						repository: {
							name: repoWithOwnerSplit[1],
							nameWithOwner: repoWithOwner,
							url: pr.body.source?.repository?.links?.html?.href,
						},
						state: pr.body.state,
						title: pr.body.title,
						timelineItems: {
							nodes: mappedTimelineItems,
						},
						url: pr.body.links.html.href,
						viewer: viewer,
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
		message: string;
		mergeStrategy: string;
		closeSourceBranch?: boolean;
	}): Promise<Directives> {
		const payload: BitbucketMergeRequest = {
			message: request.message,
			merge_strategy: request.mergeStrategy,
			close_source_branch: request.closeSourceBranch || false,
		};
		Logger.log(`commenting:pullRequestMerge`, {
			request: request,
			payload: payload,
		});

		const { pullRequestId, repoWithOwner } = this.parseId(request.pullRequestId);
		const response = await this.post<BitbucketMergeRequest, any>(
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
	}

	async createPullRequestComment(request: {
		pullRequestId: string;
		sha: string;
		text: string;
	}): Promise<Directives> {
		const payload: BitBucketCreateCommentRequest = {
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
				data: this.mapTimelineComment(response.body),
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
			const author = {
				name: commit.author.user?.display_name,
				avatarUrl: commit.author.user.links?.avatar?.href,
				user: {
					login: commit.author.user?.display_name,
					avatarUrl: commit.author.user.links?.avatar?.href,
				},
			};
			return {
				abbreviatedOid: commit.hash.substring(0, 7),
				author: author,
				committer: author,
				message: commit.message,
				authoredDate: commit.date,
				oid: commit.hash,
				url: commit.links.html,
			} as FetchThirdPartyPullRequestCommitsResponse;
		});
		return response;
	}

	async getPullRequestFilesChanged(request: {
		pullRequestId: string;
	}): Promise<FetchThirdPartyPullRequestFilesResponse[]> {
		const { pullRequestId, repoWithOwner } = this.parseId(request.pullRequestId);

		const items = await this.get<BitbucketValues<BitbucketDiffStat[]>>(
			`/repositories/${repoWithOwner}/pullrequests/${pullRequestId}/diffstat`
		);

		// const diffHunk = await this.get<BitbucketValues<BitbucketCodeBlock[]>>(
		// 	`/repositories/${repoWithOwner}/pullrequests/${pullRequestId}/diff`
		// );

		const response = items.body.values.map(file => {
			return {
				sha: "", //TODO: fix this
				filename: file.new?.path,
				previousFilename: file.old?.path,
				status: file.status,
				// TODO start
				additions: file?.lines_added,
				changes: 0, //TODO: check documentation
				deletions: file?.lines_removed,
				patch: "",
				// TODO end
			} as FetchThirdPartyPullRequestFilesResponse;
		});
		return response;
	}

	private mapComment(_: BitbucketPullRequestComment): BitbucketPullRequestComment2 {
		return {
			..._,
			file: _.inline?.path,
			bodyHtml: _.content?.html,
			bodyText: _.content?.raw,
			state: _.type,
			author: {
				login: _.user.display_name,
			},
		} as BitbucketPullRequestComment2;
	}

	private mapTimelineComment(comment: BitbucketPullRequestComment) {
		const user = comment?.user;
		return {
			author: {
				avatarUrl: user?.links?.avatar?.href,
				name: user?.display_name,
				login: user?.display_name,
			},
			bodyText: comment.content?.raw,
			createdAt: comment.created_on,
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

		const providerId = this.providerConfig?.id;
		const items = await Promise.all(
			queriesSafe.map(async query => {
				// TODO fix below
				const results = {
					body: {
						values: [] as BitbucketPullRequest[],
					},
				};

				if (reposWithOwners.length) {
					for (const repo of reposWithOwners) {
						results.body.values.push(
							(
								await this.get<BitbucketValues<BitbucketPullRequest[]>>(
									`/repositories/${repo}/pullrequests?${query}`
								)
							)?.body?.values as any
						);
					}
					results.body.values = flatten(results.body.values);
					return results;
				} else {
					// the baseUrl will be applied inside the this.get, it normally looks like https://api.bitbucket.org/2.0
					return this.get<BitbucketValues<BitbucketPullRequest[]>>(
						`/pullrequests/${username}?${query}`
					);
				}
			})
		).catch(ex => {
			Logger.error(ex, "getMyPullRequests");
			let errString;
			if (ex.response) {
				errString = JSON.stringify(ex.response);
			} else {
				errString = ex.message;
			}
			throw new Error(errString);
		});
		const response: GetMyPullRequestsResponse[][] = [];
		items.forEach((item, index) => {
			if (item?.body?.values?.length) {
				response[index] = item.body.values.map(pr => {
					const lastEditedString = new Date(pr.updated_on).getTime() + "";
					return {
						author: {
							avatarUrl: pr.author.links.avatar.href,
							login: username,
						},
						baseRefName: pr.destination.branch.name,
						body: pr.summary.html,
						bodyText: pr.summary.raw,
						createdAt: new Date(pr.created_on).getTime(),
						headRefName: pr.source.branch.name,
						headRepository: {
							name: pr.source.repository.name,
							nameWithOwner: pr.source.repository.full_name,
						},
						id: pr.id + "",
						idComputed: JSON.stringify({
							id: pr.id,
							pullRequestId: pr.id,
							repoWithOwner: pr.source.repository.full_name,
						}),
						lastEditedAt: lastEditedString,
						labels: {
							nodes: [],
						},
						number: pr.id,
						providerId: providerId,
						state: pr.state,
						title: pr.title,
						updatedAt: lastEditedString,
						url: pr.links.html.href,
					} as GetMyPullRequestsResponse;
				});
				if (!request.prQueries[index].query.match(/\bsort:/)) {
					response[index] = response[index].sort(
						(a: { createdAt: number }, b: { createdAt: number }) => b.createdAt - a.createdAt
					);
				}
			}
		});

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
				data: this.mapComment(response.body),
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
				data: this.mapComment(response.body),
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
			} else if (directive.type === "addNode") {
				pr.comments = pr.comments || [];
				pr.comments.push(directive.data);
			} else if (directive.type === "addPullRequestComment") {
				pr.timelineItems = pr.timelineItems || {};
				pr.timelineItems.nodes = pr.timelineItems.nodes || [];
				pr.timelineItems.nodes.push(directive.data);
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
