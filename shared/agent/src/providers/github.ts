"use strict";
import { GitRemoteLike, GitRepository } from "git/gitService";
import { GraphQLClient } from "graphql-request";
import { Response } from "node-fetch";
import * as paths from "path";
import { performance } from "perf_hooks";
import * as qs from "querystring";
import semver from "semver";
import { CodeStreamSession } from "session";
import { URI } from "vscode-uri";
import { InternalError, ReportSuppressedMessages } from "../agentError";
import { SessionContainer } from "../container";
import { toRepoName } from "../git/utils";
import { Logger } from "../logger";
import {
	CreateThirdPartyCardRequest,
	DidChangePullRequestCommentsNotificationType,
	DocumentMarker,
	FetchReposResponse,
	FetchThirdPartyBoardsRequest,
	FetchThirdPartyBoardsResponse,
	FetchThirdPartyCardsRequest,
	FetchThirdPartyCardsResponse,
	FetchThirdPartyCardWorkflowRequest,
	FetchThirdPartyCardWorkflowResponse,
	FetchThirdPartyPullRequestCommitsRequest,
	FetchThirdPartyPullRequestCommitsResponse,
	FetchThirdPartyPullRequestFilesResponse,
	FetchThirdPartyPullRequestPullRequest,
	FetchThirdPartyPullRequestRequest,
	FetchThirdPartyPullRequestResponse,
	GetMyPullRequestsRequest,
	GetMyPullRequestsResponse,
	GitHubBoard,
	GitHubCreateCardRequest,
	GitHubCreateCardResponse,
	GitHubUser,
	MergeMethod,
	MoveThirdPartyCardRequest,
	MoveThirdPartyCardResponse,
	ProviderConfigurationData,
	ProviderGetForkedReposResponse,
	ThirdPartyDisconnect,
	ThirdPartyProviderCard,
	ThirdPartyProviderConfig
} from "../protocol/agent.protocol";
import { CSGitHubProviderInfo, CSRepository } from "../protocol/api.protocol";
import { Arrays, Dates, Functions, log, lspProvider, Strings } from "../system";
import { Directive, Directives } from "./directives";
import {
	ApiResponse,
	getOpenedRepos,
	getRemotePaths,
	ProviderCreatePullRequestRequest,
	ProviderCreatePullRequestResponse,
	ProviderGetRepoInfoResponse,
	ProviderVersion,
	PullRequestComment,
	REFRESH_TIMEOUT,
	ThirdPartyIssueProviderBase,
	ThirdPartyProviderSupportsIssues,
	ThirdPartyProviderSupportsPullRequests
} from "./provider";

interface GitHubRepo {
	id: string;
	full_name: string;
	path: string;
	has_issues: boolean;
}

export function cheese(): Function {
	return (target: Function) => {
		return target;
	};
}

const diffHunkRegex = /^@@ -([\d]+)(?:,([\d]+))? \+([\d]+)(?:,([\d]+))? @@/;

@lspProvider("github")
export class GitHubProvider extends ThirdPartyIssueProviderBase<CSGitHubProviderInfo>
	implements ThirdPartyProviderSupportsIssues, ThirdPartyProviderSupportsPullRequests {
	constructor(
		public readonly session: CodeStreamSession,
		protected readonly providerConfig: ThirdPartyProviderConfig
	) {
		super(session, providerConfig);
	}

	async getRemotePaths(repo: any, _projectsByRemotePath: any): Promise<string[] | undefined> {
		// TODO don't need this ensureConnected -- doesn't hit api
		await this.ensureConnected();
		const remotePaths = await getRemotePaths(
			repo,
			this.getIsMatchingRemotePredicate(),
			_projectsByRemotePath
		);
		return remotePaths;
	}

	private _knownRepos = new Map<string, GitHubRepo>();
	_pullRequestCache: Map<string, FetchThirdPartyPullRequestResponse> = new Map();
	_reviewersCache: Map<
		{ owner: string; repo: string },
		{ avatarUrl: string; id: string; login: string; name?: string }[]
	> = new Map();

	get displayName() {
		return "GitHub";
	}

	get name() {
		return "github";
	}

	get icon() {
		return "mark-github";
	}

	get headers() {
		return {
			Authorization: `token ${this.accessToken}`,
			"user-agent": "CodeStream",
			Accept: "application/vnd.github.v3+json, application/vnd.github.inertia-preview+json"
		};
	}

	protected getPRExternalContent(comment: PullRequestComment) {
		return {
			provider: {
				name: this.displayName,
				icon: "mark-github",
				id: this.providerConfig.id
			},
			subhead: `#${comment.pullRequest.id}`,
			externalId: comment.pullRequest.externalId,
			externalChildId: comment.id,
			externalType: "PullRequest",
			title: comment.pullRequest.title,
			diffHunk: comment.diffHunk,
			actions: []
		};
	}

	get graphQlBaseUrl() {
		return `${this.baseUrl}/graphql`;
	}

	protected async client(): Promise<GraphQLClient> {
		if (this._client === undefined) {
			const options: { [key: string]: any } = {};
			if (this._httpsAgent) {
				options.agent = this._httpsAgent;
			}
			this._client = new GraphQLClient(this.graphQlBaseUrl, options);
		}
		if (!this.accessToken) {
			throw new Error("Could not get a GitHub personal access token");
		}

		// set accessToken on a per-usage basis... possible for accessToken
		// to be revoked from the source (github.com) and a stale accessToken
		// could be cached in the _client instance.
		this._client.setHeaders({
			Authorization: `Bearer ${this.accessToken}`,
			Accept: "application/vnd.github.merge-info-preview+json"
		});

		return this._client;
	}

	async onConnected(providerInfo?: CSGitHubProviderInfo) {
		super.onConnected(providerInfo);
		this._knownRepos = new Map<string, GitHubRepo>();
	}

	@log()
	async onDisconnected(request?: ThirdPartyDisconnect) {
		// delete the graphql client so it will be reconstructed if a new token is applied
		delete this._client;
		super.onDisconnected(request);
	}

	async ensureInitialized() {}

	protected async getVersion(): Promise<ProviderVersion> {
		try {
			if (this._version == null) {
				// GitHub cloud doesn't report their version via the api.
				// Instead, use a large major number so we don't fall into any bad
				// paths when using the semver package
				this._version = {
					version: "999.0.0",
					asArray: [999, 0, 0]
				};
				Logger.log(
					`GitHub getVersion - ${this.providerConfig.id} version=${this._version.version}`
				);
			}
		} catch (ex) {
			Logger.error(ex);
			this._version = this.DEFAULT_VERSION;
		}
		return this._version;
	}

	_queryLogger: {
		restApi: {
			rateLimit?: { remaining: number; limit: number; used: number; reset: number };
			fns: any;
		};
		graphQlApi: {
			rateLimit?: {
				remaining: number;
				resetAt: string;
				resetInMinutes: number;
				last?: { name: string; cost: number };
			};
			fns: any;
		};
	} = {
		graphQlApi: { fns: {} },
		restApi: { fns: {} }
	};

	async query<T = any>(query: string, variables: any = undefined) {
		if (this._providerInfo && this._providerInfo.tokenError) {
			delete this._client;
			throw new InternalError(ReportSuppressedMessages.AccessTokenInvalid);
		}

		const starting = performance.now();
		let response: any;
		try {
			response = await (await this.client()).request<T>(query, variables);
		} catch (ex) {
			Logger.warn(`GitHub query caught (elapsed=${performance.now() - starting}ms):`, ex);
			const exType = this._isSuppressedException(ex);
			if (exType !== undefined) {
				this.trySetThirdPartyProviderInfo(ex, exType);

				// this throws the error but won't log to sentry (for ordinary network errors that seem temporary)
				throw new InternalError(exType, { error: ex });
			} else {
				// this is an unexpected error, throw the exception normally
				throw ex;
			}
		} finally {
			try {
				if (response && response.rateLimit) {
					this._queryLogger.graphQlApi.rateLimit = {
						remaining: response.rateLimit.remaining,
						resetAt: response.rateLimit.resetAt,
						resetInMinutes: Math.floor(
							(new Date(new Date(response.rateLimit.resetAt).toString()).getTime() -
								new Date().getTime()) /
								1000 /
								60
						)
					};
					const e = new Error();
					if (e.stack) {
						let functionName;
						try {
							functionName = e.stack
								.split("\n")
								.filter(
									_ =>
										(_.indexOf("GitHubProvider") > -1 ||
											_.indexOf("GitHubEnterpriseProvider") > -1) &&
										_.indexOf(".query") === -1
								)![0]
								.match(/GitHub[Enterprise]?Provider\.(\w+)/)![1];
						} catch (err) {
							functionName = "unknown";
							Logger.warn(err);
						}
						this._queryLogger.graphQlApi.rateLimit.last = {
							name: functionName,
							cost: response.rateLimit.cost
						};
						if (!this._queryLogger.graphQlApi.fns[functionName]) {
							this._queryLogger.graphQlApi.fns[functionName] = {
								count: 1,
								cumulativeCost: response.rateLimit.cost,
								averageCost: response.rateLimit.cost
							};
						} else {
							const existing = this._queryLogger.graphQlApi.fns[functionName];
							existing.count++;
							existing.cumulativeCost += response.rateLimit.cost;
							existing.averageCost = Math.floor(existing.cumulativeCost / existing.count);
							this._queryLogger.graphQlApi.fns[functionName] = existing;
						}
					}

					if (response.rateLimit.remaining < 500) {
						Logger.warn(`${this.providerConfig.id} rateLimit low ${response.rateLimit.remaining}`);
						Logger.warn(JSON.stringify(this._queryLogger, null, 4));
					}
				}
			} catch (err) {
				Logger.warn(err);
			}
		}

		return response;
	}

	async mutate<T>(query: string, variables: any = undefined) {
		return (await this.client()).request<T>(query, variables);
	}

	async restPost<T extends object, R extends object>(url: string, variables: any) {
		const response = await this.post<T, R>(url, variables);
		// if (
		// 	response &&
		// 	response.response &&
		// 	response.response.headers &&
		// 	Logger.level === TraceLevel.Debug
		// ) {
		// 	try {
		// 		const rateLimit: any = {};
		// 		["limit", "remaining", "used", "reset"].forEach(key => {
		// 			try {
		// 				rateLimit[key] = parseInt(
		// 					response.response.headers.get(`x-ratelimit-${key}`) as string,
		// 					10
		// 				);
		// 			} catch (e) {
		// 				Logger.warn(e);
		// 			}
		// 		});

		// 		this._queryLogger.restApi.rateLimit = rateLimit;

		// 		const e = new Error();
		// 		if (e.stack) {
		// 			let functionName;
		// 			try {
		// 				functionName = e.stack
		// 					.split("\n")
		// 					.filter(
		// 						_ => _.indexOf("GitHubProvider") > -1 && _.indexOf("GitHubProvider.restPost") === -1
		// 					)![0]
		// 					.match(/GitHubProvider\.(\w+)/)![1];
		// 			} catch (ex) {
		// 				functionName = "unknown";
		// 			}

		// 			if (!this._queryLogger.restApi.fns[functionName]) {
		// 				this._queryLogger.restApi.fns[functionName] = {
		// 					count: 1
		// 				};
		// 			} else {
		// 				const existing = this._queryLogger.restApi.fns[functionName];
		// 				existing.count++;
		// 				this._queryLogger.restApi.fns[functionName] = existing;
		// 			}
		// 		}

		// 		Logger.log(JSON.stringify(this._queryLogger, null, 4));
		// 	} catch (err) {
		// 		console.warn(err);
		// 	}
		// }

		return response;
	}

	async get<T extends object>(
		url: string,
		headers: { [key: string]: any } | undefined = undefined,
		options: { [key: string]: any } | undefined = undefined
	): Promise<ApiResponse<T>> {
		// override the base to add additional error handling
		let response;
		try {
			response = await super.get<T>(url, headers, options);
		} catch (ex) {
			Logger.warn(`${this.providerConfig.name} query caught:`, ex);
			const exType = this._isSuppressedException(ex);
			if (exType !== undefined) {
				// this throws the error but won't log to sentry (for ordinary network errors that seem temporary)
				throw new InternalError(exType, { error: ex });
			} else {
				// this is an unexpected error, throw the exception normally
				throw ex;
			}
		}

		return response;
	}

	async restGet<T extends object>(url: string) {
		const response = await this.get<T>(url);
		// if (
		// 	response &&
		// 	response.response &&
		// 	response.response.headers &&
		// 	Logger.level === TraceLevel.Debug
		// ) {
		// 	try {
		// 		const rateLimit: any = {};
		// 		["limit", "remaining", "used", "reset"].forEach(key => {
		// 			try {
		// 				rateLimit[key] = parseInt(
		// 					response.response.headers.get(`x-ratelimit-${key}`) as string,
		// 					10
		// 				);
		// 			} catch (e) {
		// 				Logger.warn(e);
		// 			}
		// 		});

		// 		this._queryLogger.restApi.rateLimit = rateLimit;

		// 		const e = new Error();
		// 		if (e.stack) {
		// 			let functionName;
		// 			try {
		// 				functionName = e.stack
		// 					.split("\n")
		// 					.filter(
		// 						_ => _.indexOf("GitHubProvider") > -1 && _.indexOf("GitHubProvider.restGet") === -1
		// 					)![0]
		// 					.match(/GitHubProvider\.(\w+)/)![1];
		// 			} catch (ex) {
		// 				functionName = "unknown";
		// 			}

		// 			if (!this._queryLogger.restApi.fns[functionName]) {
		// 				this._queryLogger.restApi.fns[functionName] = {
		// 					count: 1
		// 				};
		// 			} else {
		// 				const existing = this._queryLogger.restApi.fns[functionName];
		// 				existing.count++;
		// 				this._queryLogger.restApi.fns[functionName] = existing;
		// 			}
		// 		}

		// 		Logger.log(JSON.stringify(this._queryLogger, null, 4));
		// 	} catch (err) {
		// 		console.warn(err);
		// 	}
		// }

		return response;
	}

	@log()
	async configure(request: ProviderConfigurationData) {
		await this.session.api.setThirdPartyProviderToken({
			providerId: this.providerConfig.id,
			token: request.token,
			data: request.data
		});
		this.session.updateProviders();
	}

	@log()
	async getBoards(request: FetchThirdPartyBoardsRequest): Promise<FetchThirdPartyBoardsResponse> {
		void (await this.ensureConnected());

		const openReposMap = await getOpenedRepos<GitHubRepo>(
			this.getIsMatchingRemotePredicate(),
			p => this.restGet<GitHubRepo>(`/repos/${p}`),
			this._knownRepos
		);

		const openRepos = Array.from(openReposMap.values());
		const boards: GitHubBoard[] = openRepos
			.filter(r => r.has_issues)
			.map(r => ({
				id: r.id,
				name: r.full_name,
				apiIdentifier: r.full_name,
				path: r.path
			}));

		if (boards.length === 0) {
			const userRepos: { [key: string]: string }[] = [];
			try {
				let url: string | undefined = "/user/repos";
				do {
					const apiResponse = await this.restGet<{ [key: string]: string }[]>(url);
					userRepos.push(...apiResponse.body);
					url = this.nextPage(apiResponse.response);
				} while (url);
			} catch (err) {
				Logger.error(err);
				debugger;
			}
			userRepos.sort((b1, b2) => b1.full_name.localeCompare(b2.full_name));
			boards.push(
				...userRepos
					.filter(r => r.has_issues && !boards.find(b => b.id === r.id))
					.map(repo => {
						return {
							...repo,
							id: repo.id,
							name: repo.full_name,
							apiIdentifier: repo.full_name
						};
					})
			);
		}

		return {
			boards
		};
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

		try {
			const url = request.customFilter
				? `/search/issues?${qs.stringify({
						q: request.customFilter,
						sort: "updated"
				  })}`
				: "/issues";
			const result = await this.restGet<any>(url);
			const items = request.customFilter ? result.body.items : result.body;
			const cards: ThirdPartyProviderCard[] = items.map((card: any) => {
				return {
					id: card.id,
					url: card.html_url,
					title: card.title,
					modifiedAt: new Date(card.updated_at).getTime(),
					tokenId: card.number,
					idBoard: card.repository ? card.repository.id : "",
					comments: card.comments,
					body: card.body
				};
			});
			return { cards };
		} catch (e) {
			Logger.log("Error from GitHub: ", JSON.stringify(e, null, 4));
			return { cards: [] };
		}
	}

	async getPullRequestRepo(
		allRepos: FetchReposResponse,
		pullRequest: FetchThirdPartyPullRequestPullRequest
	): Promise<CSRepository | undefined> {
		let currentRepo: CSRepository | undefined = undefined;
		try {
			const repoName = pullRequest.repository.name.toLowerCase();
			const repoUrl = pullRequest.repository.url.toLowerCase();
			const repos = allRepos.repos;

			const matchingRepos = repos.filter(_ =>
				_.remotes.some(
					r =>
						r.normalizedUrl &&
						r.normalizedUrl.length > 2 &&
						r.normalizedUrl.match(/([a-zA-Z0-9]+)/) &&
						repoUrl.indexOf(r.normalizedUrl.toLowerCase()) > -1
				)
			);
			if (matchingRepos.length === 1) {
				currentRepo = matchingRepos[0];
			} else {
				let matchingRepos2 = repos.filter(_ => _.name && _.name.toLowerCase() === repoName);
				if (matchingRepos2.length !== 1) {
					matchingRepos2 = repos.filter(_ =>
						_.remotes.some(r => repoUrl.indexOf(r.normalizedUrl.toLowerCase()) > -1)
					);
					if (matchingRepos2.length === 1) {
						currentRepo = matchingRepos2[0];
					} else {
						Logger.warn(`Could not find repo for repoName=${repoName} repoUrl=${repoUrl}`);
					}
				} else {
					currentRepo = matchingRepos2[0];
				}
			}
		} catch (error) {}
		return currentRepo;
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

		const { scm: scmManager } = SessionContainer.instance();
		const version = await this.getVersion();

		let response = {} as FetchThirdPartyPullRequestResponse;
		let repoOwner: string | undefined = undefined;
		let repoName: string | undefined = undefined;
		let allTimelineItems: any = [];
		try {
			let timelineQueryResponse;
			if (request.owner == null && request.repo == null) {
				const data = await this.getRepoOwnerFromPullRequestId(request.pullRequestId);
				repoOwner = data.owner;
				repoName = data.name;
			} else {
				repoOwner = request.owner!;
				repoName = request.repo!;
			}
			const pullRequestNumber = await this.getPullRequestNumber(request.pullRequestId);
			do {
				timelineQueryResponse = await this.pullRequestTimelineQuery(
					repoOwner,
					repoName,
					pullRequestNumber,
					timelineQueryResponse &&
						timelineQueryResponse?.repository?.pullRequest?.timelineItems?.pageInfo?.endCursor
				);
				if (timelineQueryResponse === undefined) break;
				response = timelineQueryResponse;

				if (timelineQueryResponse?.repository?.pullRequest?.timelineItems?.nodes) {
					allTimelineItems = allTimelineItems.concat(
						timelineQueryResponse.repository.pullRequest.timelineItems.nodes
					);
				}
			} while (
				timelineQueryResponse?.repository?.pullRequest?.timelineItems?.pageInfo?.hasNextPage ===
				true
			);

			if (response?.repository?.pullRequest) {
				// break up the main query to get around https://github.com/TeamCodeStream/codestream/issues/546
				const response2 = (await this.query<any>(
					`query pr($owner:String!, $name:String!, $pullRequestNumber:Int!) {
					rateLimit {
					  limit
					  cost
					  remaining
					  resetAt
					}
					repository(name:$name, owner:$owner) {
					  pullRequest(number:$pullRequestNumber) {
						files(first: 100) {
							totalCount
							nodes {
							  path
							  deletions
							  additions
							}
						}
						commits(last: 1) {
							totalCount
							${this._transform(`[
								nodes {
								  commit {
									statusCheckRollup {
										state
										contexts(first: 100) {
											nodes {
												... on CheckRun {
													__typename
													conclusion
													status
													name
													title
													detailsUrl
													startedAt
													completedAt
													checkSuite {
													  app {
														logoUrl(size: 40)
														slug
													  }
													}
												}
												... on StatusContext {
													__typename
													avatarUrl(size: 40)
													context
													description
													state
													targetUrl
												}
											}
										}
									}
								  }
								}:>=3.0.0]`)}
						}
					}
				}
				  }`,
					{
						owner: repoOwner,
						name: repoName,
						pullRequestNumber: pullRequestNumber
					}
				)) as FetchThirdPartyPullRequestResponse;
				response.repository.pullRequest.files = response2.repository.pullRequest.files;
				response.repository.pullRequest.commits = response2.repository.pullRequest.commits;

				const { repos } = SessionContainer.instance();
				const prRepo = await this.getPullRequestRepo(
					await repos.get(),
					response.repository.pullRequest
				);

				if (prRepo?.id) {
					try {
						const prForkPointSha = await scmManager.getForkPointRequestType({
							repoId: prRepo.id,
							baseSha: response.repository.pullRequest.baseRefOid,
							headSha: response.repository.pullRequest.headRefOid
						});

						response.repository.pullRequest.forkPointSha = prForkPointSha?.sha;
					} catch (err) {
						Logger.error(err, `Could not find forkPoint for repoId=${prRepo.id}`);
					}
				}

				if (response.repository.pullRequest.timelineItems != null) {
					response.repository.pullRequest.timelineItems.nodes = allTimelineItems;
				}
				response.repository.pullRequest.repoUrl = response.repository.url;
				response.repository.pullRequest.baseUrl = response.repository.url.replace(
					response.repository.resourcePath,
					""
				);

				response.repository.repoOwner = repoOwner!;
				response.repository.repoName = repoName!;

				response.repository.pullRequest.providerId = this.providerConfig.id;
				response.repository.providerId = this.providerConfig.id;
				response.repository.pullRequest.supports = {
					version: version
				};
				this._pullRequestCache.set(request.pullRequestId, response);
			}
		} catch (ex) {
			Logger.error(ex, "getPullRequest", {
				request: request
			});
			return {
				error: {
					message: ex.message
				}
			} as any;
		}

		Logger.log("getPullRequest returning", {
			id: request.pullRequestId,
			repository: response.repository.pullRequest.repository
		});
		return response;
	}

	@log()
	async createCard(request: CreateThirdPartyCardRequest) {
		void (await this.ensureConnected());

		const data = request.data as GitHubCreateCardRequest;
		const response = await this.restPost<{}, GitHubCreateCardResponse>(
			`/repos/${data.repoName}/issues`,
			{
				title: data.title,
				body: data.description,
				assignees: (data.assignees! || []).map(a => a.login)
			}
		);
		return { ...response.body, url: response.body.html_url };
	}

	@log()
	async moveCard(request: MoveThirdPartyCardRequest): Promise<MoveThirdPartyCardResponse> {
		return { success: false };
	}

	private nextPage(response: Response): string | undefined {
		const linkHeader = response.headers.get("Link") || "";
		if (linkHeader.trim().length === 0) return undefined;
		const links = linkHeader.split(",");
		for (const link of links) {
			const [rawUrl, rawRel] = link.split(";");
			const url = rawUrl.trim();
			const rel = rawRel.trim();
			if (rel === `rel="next"`) {
				const baseUrl = this.baseUrl;
				return url.substring(1, url.length - 1).replace(baseUrl, "");
			}
		}
		return undefined;
	}

	@log()
	async getAssignableUsers(request: { boardId: string }) {
		void (await this.ensureConnected());

		try {
			const { body } = await this.restGet<GitHubUser[]>(`/repos/${request.boardId}/collaborators`);
			return {
				users: body.map(u => ({
					...u,
					id: u.id,
					displayName: u.login,
					avatarUrl: u.avatar_url
				}))
			};
		} catch (ex) {
			// can't get assignable users for repos you don't have access to
			Logger.warn(ex);
		}
		return {
			users: []
		};
	}

	@log()
	async createPullRequest(
		request: ProviderCreatePullRequestRequest
	): Promise<ProviderCreatePullRequestResponse | undefined> {
		try {
			const repositoryId = request.providerRepositoryId;
			if (!repositoryId) {
				throw new Error("providerRepositoryId missing");
			}

			void (await this.ensureConnected());

			if (!(await this.isPRCreationApiCompatible())) {
				return {
					error: {
						type: "UNKNOWN",
						message: "PR Api is not compatible"
					}
				};
			}

			/**
			 *
			 * creating a payload for a forked repo looks like this:
			 *
			 * {
			 *  // id of the parent repo
			 *	"repositoryId": "MqEwOlJlcG9zaXRrcnkxMjMzOTY2nDI=",
			 *	"baseRefName": "master",
			 *	"title": "myTitle",
			 *  // this is the weird part...
			 *	"headRefName": "bcanzanella:myBranch",
			 *	"body": "myBody"
			 * }
			 *
			 * creating a payload for a non-forked repo looks like this:
			 *
			 * {
			 *  // id of the self repo
			 *	"repositoryId": "aqEwOqJlcG9zaXRrcnkxMjMzOTY2nDI=",
			 *	"baseRefName": "master",
			 *	"title": "myTitle",
			 *	"headRefName": "myBranch",
			 *	"body": "myBody"
			 * }
			 */

			const createPullRequestResponse = await this.mutate<GitHubCreatePullRequestResponse>(
				`mutation CreatePullRequest($repositoryId:ID!, $baseRefName:String!, $headRefName:String!, $title:String!, $body:String!) {
					__typename
					createPullRequest(input: {repositoryId: $repositoryId, baseRefName: $baseRefName, headRefName: $headRefName, title: $title, body: $body}) {
					  pullRequest {
							number,
							id,
							url,
							title
						}
					}
				  }`,
				{
					repositoryId: repositoryId,
					baseRefName: request.baseRefName,
					title: request.title,
					headRefName: request.isFork
						? `${request.headRefRepoOwner}:${request.headRefName}`
						: request.headRefName,
					body: this.createDescription(request)
				}
			);
			const pullRequest = createPullRequestResponse.createPullRequest.pullRequest;

			return {
				url: pullRequest.url,
				id: pullRequest.id,
				title: `#${pullRequest.number} ${pullRequest.title}`
			};
		} catch (ex) {
			Logger.error(ex, `${this.displayName}: createPullRequest`, {
				remote: request.remote,
				baseRefName: request.baseRefName,
				headRefName: request.headRefName
			});
			let errorMessage =
				ex.response && ex.response.errors ? ex.response.errors[0].message : "Unknown error";
			errorMessage = `${this.displayName}: ${errorMessage}`;
			return {
				error: {
					type: "PROVIDER",
					message: errorMessage
				}
			};
		}
	}

	@log()
	async getRepoInfo(request: { remote: string }): Promise<ProviderGetRepoInfoResponse> {
		try {
			const { owner, name } = this.getOwnerFromRemote(request.remote);

			const response = await this.query<any>(
				`query getRepoInfo($owner:String!, $name:String!) {
					rateLimit {
						cost
						resetAt
						remaining
						limit
					}
					repository(owner:$owner, name:$name) {
				   		id
						isFork
				   		defaultBranchRef {
							name
				   		}
						nameWithOwner
						pullRequests(first: 25, orderBy: {field: CREATED_AT, direction: DESC}, states: OPEN) {
							totalCount
							nodes {
								id
								url
								title
								state
								createdAt
								baseRefName
								headRefName
								headRepository { nameWithOwner }
							}
						}
					}
			  	}
			  `,
				{
					owner: owner,
					name: name
				}
			);
			const result = {
				id: response.repository.id,
				isFork: response.repository.isFork,
				nameWithOwner: response.repository.nameWithOwner,
				defaultBranch: response.repository.defaultBranchRef.name,
				pullRequests: response.repository.pullRequests.nodes.map((_: any) => ({
					..._,
					nameWithOwner: _.headRepository.nameWithOwner
				})),
				owner: owner,
				name: name
			};
			return result;
		} catch (ex) {
			return this.handleProviderError(ex, request);
		}
	}

	async getForkedRepos(
		request: { remote: string },
		recurseFailsafe?: boolean
	): Promise<ProviderGetForkedReposResponse> {
		try {
			const { owner, name } = this.getOwnerFromRemote(request.remote);

			const response = await this.query<any>(
				`query getForkedRepos($owner:String!, $name:String!) {
					rateLimit {
						cost
						resetAt
						remaining
						limit
					}
					repository(owner:$owner, name:$name) {
				   		id
						name
						nameWithOwner
						url
						parent {
							id
							nameWithOwner
							url
						}
						defaultBranchRef {
							name
						}
						refs(first: 100, refPrefix: "refs/heads/") {
						   nodes {
							 name
						   }
						}
					    forks(first: 50, orderBy: {field: CREATED_AT, direction: DESC}) {
							pageInfo {
								startCursor
								endCursor
								hasNextPage
							}
							nodes {
								id
								name
								nameWithOwner
								owner {
									login
								}
								defaultBranchRef {
									name
								}
								refs(first: 100, refPrefix: "refs/heads/") {
									nodes {
									  name
									}
								}
							}
						}
				  	}
				}
			  `,
				{
					owner: owner,
					name: name
				}
			);

			// if this is a fork, get the forks of the parent
			if (response.repository.parent && !recurseFailsafe) {
				Logger.log("Getting parent forked repos");
				const result = await this.getForkedRepos({ remote: response.repository.parent.url }, true);
				return {
					parent: result.parent,
					forks: result.forks,
					self: { ...response.repository, owner: owner }
				};
			}

			const forks = response.repository.forks.nodes.sort((a: any, b: any) => {
				if (b.nameWithOwner < a.nameWithOwner) return 1;
				if (a.nameWithOwner < b.nameWithOwner) return -1;
				return 0;
			});
			return {
				parent: response.repository,
				forks: forks.map((_: any) => ({ ..._, owner: _.owner.login })),
				self: response.repository
			};
		} catch (ex) {
			return this.handleProviderError(ex, request);
		}
	}

	protected getOwnerFromRemote(remote: string): { owner: string; name: string } {
		// HACKitude yeah, sorry
		const uri = URI.parse(remote);
		const split = uri.path.split("/");
		const owner = split[1];
		const name = toRepoName(split[2]);
		return {
			owner,
			name
		};
	}

	private _isMatchingRemotePredicate = (r: GitRemoteLike) => r.domain === "github.com";
	getIsMatchingRemotePredicate() {
		return this._isMatchingRemotePredicate;
	}

	private _prQueryRateLimit:
		| {
				limit: number;
				cost: number;
				remaining: number;
				resetAt: Date;
		  }
		| undefined;

	private _prTimelineQueryRateLimit:
		| {
				limit: number;
				cost: number;
				remaining: number;
				resetAt: Date;
		  }
		| undefined;

	async getLabels(request: { owner: string; repo: string }) {
		const response = await this.query<any>(
			`query getLabels($owner:String!, $name:String!) {
				rateLimit {
					cost
					resetAt
					remaining
					limit
				}
				repository(owner:$owner, name:$name) {
				  id
				  labels(first: 50) {
					nodes {
					  color
					  name
					  id
					  description
					}
				  }
				}
			  }`,
			{
				owner: request.owner,
				name: request.repo
			}
		);
		return response.repository.labels.nodes;
	}

	async getProjects(request: { owner: string; repo: string }) {
		const query = await this.query<any>(
			`query GetProjects($owner:String!, $name:String!) {
				rateLimit {
					cost
					resetAt
					remaining
					limit
				}
				repository(owner:$owner, name:$name) {
				  id
				  projects(first: 50) {
					edges {
					  node {
						id
						name
					  }
					}
				  }
			    }
			  }`,
			{
				owner: request.owner,
				name: request.repo
			}
		);
		return query.repository.projects.edges.map((_: any) => _.node);
	}

	async getMilestones(request: { owner: string; repo: string }) {
		const query = await this.query<any>(
			`query GetMilestones($owner:String!, $name:String!) {
				rateLimit {
					cost
					resetAt
					remaining
					limit
				}
				repository(owner:$owner, name:$name) {
				  id
				  milestones(first: 50) {
					edges {
					  node {
						id
						title
						description
						dueOn
					  }
					}
				  }
			    }
			  }`,
			{
				owner: request.owner,
				name: request.repo
			}
		);
		return query.repository.milestones.edges.map((_: any) => _.node);
	}

	async getReviewers(request: { owner: string; repo: string }) {
		const cached = this._reviewersCache.get(request);
		if (cached) {
			return cached;
		}
		let queryResponse;
		let allReviewers: any = [];
		do {
			queryResponse = await this.getReviewersQuery(
				request,
				queryResponse && queryResponse?.repository?.collaborators?.pageInfo.endCursor
			);
			if (queryResponse === undefined) break;
			if (queryResponse?.repository?.collaborators?.nodes) {
				allReviewers = allReviewers.concat(queryResponse.repository.collaborators.nodes);
			}
		} while (queryResponse?.repository?.collaborators?.pageInfo?.hasNextPage === true);
		this._reviewersCache.set(request, allReviewers);

		return allReviewers;
	}

	async getReviewersQuery(request: { owner: string; repo: string }, cursor?: string) {
		const query = await this.query<any>(
			`query FindReviewers($owner:String!, $name:String!${cursor ? ", $cursor:String" : ""})  {
				rateLimit {
					cost
					resetAt
					remaining
					limit
				}
				repository(owner:$owner, name:$name) {
				  id
				  collaborators(first: 100 ${cursor ? "after:$cursor" : ""}) {
					nodes {
					  avatarUrl
					  id
					  name
					  login
					}
					pageInfo {
						endCursor
						hasNextPage
					}
				  }
				}
			  }`,
			{
				owner: request.owner,
				name: request.repo,
				cursor: cursor
			}
		);

		return query;
	}

	async markPullRequestReadyForReview(request: {
		pullRequestId: string;
		isReady: boolean;
	}): Promise<Directives | undefined> {
		if (request.isReady) {
			const response = await this.mutate<any>(
				`mutation MarkPullRequestReadyForReview($pullRequestId:ID!) {
				markPullRequestReadyForReview(input: {pullRequestId: $pullRequestId}) {
					  clientMutationId
					  pullRequest{
						isDraft
						updatedAt
						state
					  }
					}
				  }`,
				{
					pullRequestId: request.pullRequestId
				}
			);

			return this.handleResponse(request.pullRequestId, {
				directives: [
					{ type: "updatePullRequest", data: response.markPullRequestReadyForReview.pullRequest }
				]
			});
		} else {
			// const query = `mutation UpdateDraft($pullRequestId:ID!, $isDraft:Boolean!) {
			// 	updatePullRequest(input: {pullRequestId: $pullRequestId, isDraft:$isDraft}) {
			// 		  clientMutationId
			// 		}
			// 	  }`;
			// const response = await this.mutate<any>(query, {
			// 	pullRequestId: request.pullRequestId,
			// 	isDraft: request.isDraft
			// });
			// return response;
			return undefined;
		}
	}

	async setLabelOnPullRequest(request: {
		pullRequestId: string;
		labelId: string;
		onOff: boolean;
	}): Promise<Directives> {
		const method = request.onOff ? "addLabelsToLabelable" : "removeLabelsFromLabelable";
		const Method = request.onOff ? "AddLabelsToLabelable" : "RemoveLabelsFromLabelable";
		const query = `mutation ${Method}($labelableId: ID!,$labelIds:[ID!]!) {
			${method}(input: {labelableId:$labelableId, labelIds:$labelIds}) {
				clientMutationId
				labelable {
					... on PullRequest {
					  updatedAt
					  labels(first: 10) {
						nodes {
						  color
						  description
						  name
						  id
						}
					  }
					  timelineItems(last: 1, itemTypes: [LABELED_EVENT, UNLABELED_EVENT]) {
						nodes {
						  ... on LabeledEvent {
							__typename
							id
							actor {
							  login
							  avatarUrl
							}
							label {
							  id
							  name
							  description
							  color
							}
							createdAt
						  }
						  ... on UnlabeledEvent {
							id
							__typename
							actor {
							  login
							  avatarUrl
							}
							label {
							  id
							  name
							  description
							  color
							}
							createdAt
						  }
						}
					  }
					}
				  }
				}
			  }`;

		const response = await this.mutate<any>(query, {
			labelableId: request.pullRequestId,
			labelIds: request.labelId
		});

		return this.handleResponse(request.pullRequestId, {
			directives: [
				{
					type: "updatePullRequest",
					data: {
						labels: response[method].labelable.labels,
						updatedAt: response[method].labelable.updatedAt
					}
				},
				{ type: "addNode", data: response[method].labelable.timelineItems.nodes[0] }
			]
		});
	}

	async setAssigneeOnPullRequest(request: {
		pullRequestId: string;
		assigneeId: string;
		onOff: boolean;
	}): Promise<Directives> {
		const method = request.onOff ? "addAssigneesToAssignable" : "removeAssigneesFromAssignable";
		const Method = request.onOff ? "AddAssigneesFromAssignable" : "RemoveAssigneesFromAssignable";
		const query = `mutation ${Method}($assignableId:ID!, $assigneeIds:[ID!]!) {
			${method}(input: {assignableId:$assignableId, assigneeIds:$assigneeIds}) {
				  clientMutationId
				  assignable {
					assignees(first: 10) {
					  nodes {
						bio
						avatarUrl(size: 20)
						id
						name
						login
					  }
					}
					... on PullRequest {
					  id
					  timelineItems(last: 1, itemTypes: [ASSIGNED_EVENT, UNASSIGNED_EVENT]) {
						  nodes {
							... on AssignedEvent {
							  __typename
							  id
							  actor {
								login
								avatarUrl
							  }
							  createdAt
							  assignee {
								... on User {
								  id
								  email
								  login
								}
							  }
							}
							... on UnassignedEvent {
							  __typename
							  id
							  actor {
								login
								avatarUrl
							  }
							  createdAt
							  assignee {
								... on User {
								  id
								  email
								  login
								}
							  }
							}
						}
					  }
					}
				  }
				}
			  }`;

		const response = await this.mutate<any>(query, {
			assignableId: request.pullRequestId,
			assigneeIds: request.assigneeId
		});

		return this.handleResponse(request.pullRequestId, {
			directives: [
				{
					type: "updatePullRequest",
					data: {
						assignees: response[method].assignable.assignees,
						updatedAt: response[method].assignable.updatedAt
					}
				},
				{
					type: "addNode",
					data: response[method].assignable.timelineItems.nodes[0]
				}
			]
		});
	}

	async setAssigneeOnIssue(request: { issueId: string; assigneeId: string; onOff: boolean }) {
		// does not require return directives
		const method = request.onOff ? "addAssigneesToAssignable" : "removeAssigneesFromAssignable";
		const Method = request.onOff ? "AddAssigneesFromAssignable" : "RemoveAssigneesFromAssignable";
		const query = `mutation ${Method}($assignableId: ID!,$assigneeIds:[ID!]!) {
			${method}(input: {assignableId: $assignableId, assigneeIds:$assigneeIds}) {
				  clientMutationId
				}
			  }`;

		const response = await this.mutate<any>(query, {
			assignableId: request.issueId,
			assigneeIds: request.assigneeId
		});
		return response;
	}

	async toggleReaction(request: {
		pullRequestId: string;
		subjectId: string;
		content: string;
		onOff: boolean;
	}): Promise<Directives> {
		const method = request.onOff ? "addReaction" : "removeReaction";
		const Method = request.onOff ? "AddReaction" : "RemoveReaction";
		const query = `mutation ${Method}($subjectId: ID!, $content:ReactionContent!) {
			${method}(input: {subjectId: $subjectId, content:$content}) {
				  clientMutationId
				  subject {
					... on PullRequestReviewComment {
						__typename
						id
					}
					... on PullRequestReview {
						__typename
						id
					}
					... on IssueComment {
						__typename
						id
					}
					... on CommitComment {
						__typename
						id
					}
					... on TeamDiscussionComment {
						__typename
						id
					}
					... on PullRequest {
						__typename
						id
					}
					... on Issue {
						__typename
						id
					}
					}
					reaction {
					content
					user {
						login
					}
					}
				}
			  }`;

		const response = await this.mutate<any>(query, {
			subjectId: request.subjectId,
			content: request.content
		});

		return this.handleResponse(request.pullRequestId, {
			directives: [
				{
					type: request.onOff ? "addReaction" : "removeReaction",
					data: response[method]
				}
			]
		});
	}

	async updatePullRequestSubscription(request: {
		pullRequestId: string;
		onOff: boolean;
	}): Promise<Directives> {
		const response = await this.mutate<any>(
			`mutation UpdateSubscription($subscribableId:ID!, $state:SubscriptionState!) {
			updateSubscription(input: {subscribableId: $subscribableId, state:$state}) {
				  clientMutationId
				   subscribable {
					... on PullRequest {
						id
						updatedAt
						viewerSubscription
						}
					}
				}
			  }`,
			{
				subscribableId: request.pullRequestId,
				state: request.onOff ? "SUBSCRIBED" : "UNSUBSCRIBED"
			}
		);

		return this.handleResponse(request.pullRequestId, {
			directives: [
				{ type: "updatePullRequest", data: response.updateSubscription.subscribable.pullRequest }
			]
		});
	}

	async updateIssueComment(request: {
		pullRequestId: string;
		id: string;
		body: string;
	}): Promise<Directives> {
		const response = await this.mutate<any>(
			`mutation UpdateComment($id:ID!, $body:String!) {
			updateIssueComment(input: {id: $id, body:$body}) {
				clientMutationId
				issueComment {
					id,
					includesCreatedEdit,
					body,
					bodyHTML,
					bodyText
					}
				}
			  }`,
			{
				id: request.id,
				body: request.body
			}
		);

		return this.handleResponse(request.pullRequestId, {
			directives: [
				{
					type: "updateNode",
					data: response.updateIssueComment.issueComment
				}
			]
		});
	}

	async updateReviewComment(request: {
		pullRequestId: string;
		id: string;
		body: string;
	}): Promise<Directives> {
		const response = await this.mutate<any>(
			`mutation UpdateComment($pullRequestReviewCommentId: ID!, $body: String!) {
			updatePullRequestReviewComment(input: {pullRequestReviewCommentId: $pullRequestReviewCommentId, body: $body}) {
			  clientMutationId
			  pullRequestReviewComment {
				id
				includesCreatedEdit
				body
				bodyHTML
				bodyText
				pullRequestReview {
				  id
				}
			  }
			}
		  }
		  `,
			{
				pullRequestReviewCommentId: request.id,
				body: request.body
			}
		);

		return this.handleResponse(request.pullRequestId, {
			directives: [
				{
					type: "updatePullRequestReviewThreadComment",
					data: response.updatePullRequestReviewComment.pullRequestReviewComment
				},
				{
					type: "updatePullRequestReviewCommentNode",
					data: response.updatePullRequestReviewComment.pullRequestReviewComment
				}
			]
		});
	}

	async updateReview(request: {
		pullRequestId: string;
		id: string;
		body: string;
	}): Promise<Directives> {
		const response = await this.mutate<any>(
			`mutation UpdateComment($pullRequestReviewId:ID!, $body:String!) {
			updatePullRequestReview(input: {pullRequestReviewId: $pullRequestReviewId, body:$body}) {
				  clientMutationId
				     pullRequestReview {
						bodyText
						bodyHTML
						body
						includesCreatedEdit
						id
					}
				}
			  }`,
			{
				pullRequestReviewId: request.id,
				body: request.body
			}
		);

		return this.handleResponse(request.pullRequestId, {
			directives: [
				{
					type: "updatePullRequestReview",
					data: response.updatePullRequestReview.pullRequestReview
				}
			]
		});
	}

	async updatePullRequestBody(request: {
		pullRequestId: string;
		id: string;
		body: string;
	}): Promise<Directives> {
		const response = await this.mutate<any>(
			`mutation UpdateComment($pullRequestId:ID!, $body:String!) {
			updatePullRequest(input: {pullRequestId: $pullRequestId, body:$body}) {
				  clientMutationId
				    pullRequest {
						body
						bodyHTML
						bodyText
						includesCreatedEdit
						updatedAt
					}
				}
			  }`,
			{
				pullRequestId: request.id,
				body: request.body
			}
		);

		return this.handleResponse(request.pullRequestId, {
			directives: [{ type: "updatePullRequest", data: response.updatePullRequest.pullRequest }]
		});
	}

	protected async addPullRequestReview(request: {
		pullRequestId: string;
	}): Promise<{
		addPullRequestReview: {
			pullRequestReview: {
				id: string;
			};
		};
	}> {
		const response = await this.mutate<any>(
			`mutation AddPullRequestReview($pullRequestId:ID!) {
		addPullRequestReview(input: {pullRequestId: $pullRequestId}) {
			clientMutationId
			pullRequestReview {
			  id
			}
		  }
		}`,
			{
				pullRequestId: request.pullRequestId
			}
		);
		return response;
	}

	/**
	 * Returns the reviewId (if it exists) for the specificed pull request (there can only be 1 review per pull request per user)
	 * @param request
	 */
	async getPullRequestReviewId(request: { pullRequestId: string }) {
		const metaData = await this.getRepoOwnerFromPullRequestId(request.pullRequestId);

		const response = await this.query<any>(
			`query GetPullRequestReviewId($owner:String!, $name:String!, $pullRequestNumber:Int!) {
			rateLimit {
				cost
				resetAt
				remaining
				limit
			}
			viewer {
			  login
			}
			repository(owner:$owner, name:$name) {
			  pullRequest(number:$pullRequestNumber) {
				reviews(states: PENDING, first: 50) {
				  nodes {
					id
					createdAt
					author {
					  login
					}
				  }
				}
			  }
			}
		  }
		  `,
			metaData
		);
		if (!response) return undefined;

		const user = response.viewer.login;
		// find the first pending review
		const lastPendingReview = response.repository?.pullRequest?.reviews?.nodes.find(
			(_: any) => _.author.login === user
		);

		return lastPendingReview ? lastPendingReview.id : undefined;
	}

	async createPullRequestReviewComment(request: {
		pullRequestId: string;
		pullRequestReviewId?: string;
		text: string;
		filePath?: string;
		position?: number;
	}): Promise<Directives> {
		const v = await this.getVersion();

		let query;
		if (!request.pullRequestReviewId) {
			request.pullRequestReviewId = await this.getPullRequestReviewId(request);
			if (!request.pullRequestReviewId) {
				const result = await this.addPullRequestReview(request);
				if (result?.addPullRequestReview?.pullRequestReview?.id) {
					request.pullRequestReviewId = result.addPullRequestReview.pullRequestReview.id;
				}
			}
		}
		if (v && semver.lt(v.version, "2.21.0")) {
			query = `mutation AddPullRequestReviewComment($text:String!, $pullRequestReviewId:ID!, $filePath:String, $position:Int) {
				addPullRequestReviewComment(input: {body:$text, pullRequestReviewId:$pullRequestReviewId, path:$filePath, position:$position}) {
				  clientMutationId
				}
			  }
			  `;
		} else {
			query = `mutation AddPullRequestReviewComment($text:String!, $pullRequestId:ID!, $filePath:String, $position:Int) {
				addPullRequestReviewComment(input: {body:$text, pullRequestId:$pullRequestId, path:$filePath, position:$position}) {
				  clientMutationId
				}
			  }`;
		}

		Logger.log(`commenting:createPullRequestReviewComment`, {
			query: query,
			request: request
		});

		void (await this.mutate<any>(query, request));

		const ownerData = await this.getRepoOwnerFromPullRequestId(request.pullRequestId);
		const graphResults = await this.fetchUpdatedReviewCommentData(ownerData);

		this.mapPullRequestModel(graphResults);

		const directives = [
			{
				type: "updatePullRequest",
				data: {
					updatedAt: graphResults.repository.pullRequest.updatedAt,
					pendingReview: graphResults.repository.pullRequest.pendingReview
				} as any
			}
		] as any;

		if (graphResults?.repository?.pullRequest) {
			const pr = graphResults.repository.pullRequest;
			if (pr.reviews) {
				const review = pr.reviews.nodes.find((_: any) => _.id === request.pullRequestReviewId);
				directives.push({
					type: "addReview",
					data: review
				});
				directives.push({
					type: "updateReviewCommentsCount",
					data: review
				});
				if (review) {
					directives.push({
						type: "addReviewThreads",
						data: pr.reviewThreads.edges
					});
				}
			}
			if (pr.timelineItems) {
				directives.push({
					type: "addReviewCommentNodes",
					data: pr.timelineItems.nodes
				});
			}
		}

		this.updateCache(request.pullRequestId, {
			directives: directives
		});
		this.session.agent.sendNotification(DidChangePullRequestCommentsNotificationType, {
			pullRequestId: request.pullRequestId,
			filePath: request.filePath
		});
		return {
			directives: directives
		};
	}

	async createPullRequestReviewThread(request: {
		pullRequestId: string;
		pullRequestReviewId?: string;
		text: string;
		filePath?: string;
		position?: number;
		startLine?: number;
		endLine?: number;
		side?: string;
	}): Promise<Directives> {
		const v = await this.getVersion();

		let query;

		if (!request.pullRequestReviewId) {
			request.pullRequestReviewId = await this.getPullRequestReviewId(request);
			if (!request.pullRequestReviewId) {
				const result = await this.addPullRequestReview(request);
				if (result?.addPullRequestReview?.pullRequestReview?.id) {
					request.pullRequestReviewId = result.addPullRequestReview.pullRequestReview.id;
				}
			}
		}

		let response;
		if (v && semver.lt(v.version, "2.21.0")) {
			query = `mutation AddPullRequestReviewThread($text:String!, $pullRequestReviewId:ID!, $filePath:String, $startLine:Int, $endLine:Int, $side:String) {
				addPullRequestReviewThread(input: {body:$text, pullRequestReviewId:$pullRequestReviewId, path:$filePath, startLine:$startLine, line:$endLine, side:$side}) {
				  clientMutationId
				}
			  }
			  `;
		} else {
			if (!request.side) request.side = "right";
			request.side = request.side.toUpperCase();

			if (request.startLine != null && request.startLine === request.endLine) {
				query = `mutation AddPullRequestReviewThread($text:String!, $pullRequestId:ID!, $filePath:String!, $endLine:Int!, $side:DiffSide) {
					addPullRequestReviewThread(input: {body:$text, pullRequestId:$pullRequestId, path:$filePath, line:$endLine, side:$side}) {
					  clientMutationId
					  thread {
						  id
					  }
					}
				  }`;
			} else {
				query = `mutation AddPullRequestReviewThread($text:String!, $pullRequestId:ID!, $filePath:String!, $startLine:Int, $endLine:Int!, $side:DiffSide) {
				addPullRequestReviewThread(input: {body:$text, pullRequestId:$pullRequestId, path:$filePath, startLine:$startLine, line:$endLine, side:$side}) {
				  clientMutationId
				  thread {
					  id
				  }
				}
			  }`;
			}
		}

		response = await this.mutate<{
			addPullRequestReviewThread: {
				thread: {
					id: string;
				};
			};
		}>(query, request);

		if (!response?.addPullRequestReviewThread?.thread?.id) {
			Logger.warn("addPullRequestReviewThread:response", {
				response,
				version: v
			});
			throw new Error("Unable to add comment");
		} else {
			Logger.log("addPullRequestReviewThread:response", {
				response,
				version: v
			});
		}

		const ownerData = await this.getRepoOwnerFromPullRequestId(request.pullRequestId);
		const graphResults = await this.fetchUpdatedReviewCommentData(ownerData);

		this.mapPullRequestModel(graphResults);

		const directives = [
			{
				type: "updatePullRequest",
				data: {
					updatedAt: graphResults.repository.pullRequest.updatedAt,
					pendingReview: graphResults.repository.pullRequest.pendingReview
				} as any
			}
		] as any;

		if (graphResults?.repository?.pullRequest) {
			const pr = graphResults.repository.pullRequest;
			if (pr.reviews) {
				const review = pr.reviews.nodes.find((_: any) => _.id === request.pullRequestReviewId);
				directives.push({
					type: "addReview",
					data: review
				});
				directives.push({
					type: "updateReviewCommentsCount",
					data: review
				});
				if (review) {
					directives.push({
						type: "addReviewThreads",
						data: pr.reviewThreads.edges
					});
				}
			}
			if (pr.timelineItems) {
				directives.push({
					type: "addReviewCommentNodes",
					data: pr.timelineItems.nodes
				});
			}
		}

		this.updateCache(request.pullRequestId, {
			directives: directives
		});
		this.session.agent.sendNotification(DidChangePullRequestCommentsNotificationType, {
			pullRequestId: request.pullRequestId,
			filePath: request.filePath
		});
		return {
			directives: directives
		};
	}

	private async fetchUpdatedReviewCommentData(ownerData: {
		owner: string;
		name: string;
		pullRequestNumber: number;
	}) {
		// while this is large, its cost is only 1
		return this.query<any>(
			`query pr($owner: String!, $name: String!, $pullRequestNumber: Int!) {
				rateLimit {
				  limit
				  cost
				  remaining
				  resetAt
				}
				viewer {
				  id
				  login
				  avatarUrl
				}
				repository(name: $name, owner: $owner) {
				  id
				  url
				  resourcePath
				  pullRequest(number: $pullRequestNumber) {
					id
					updatedAt
					reviewThreads(last: 4) {
					  edges {
						node {
						  id
						  isResolved
						  viewerCanResolve
						  viewerCanUnresolve
						  comments(last: 30) {
							totalCount
							nodes {
							  author {
								login
								avatarUrl
							  }
							  authorAssociation
							  body
							  bodyHTML
							  createdAt
							  id
							  includesCreatedEdit
							  isMinimized
							  minimizedReason
							  outdated
							  replyTo {
								id
							  }
							  resourcePath
							  reactionGroups {
								content
								users(first: 1) {
								  nodes {
									login
								  }
								}
							  }
							  viewerCanUpdate
							  viewerCanReact
							  viewerCanDelete
							}
						  }
						}
					  }
					}
					number
					state
					reviews(last: 10, states: [PENDING]) {
					  nodes {
						id
						databaseId
						createdAt
						comments(last: 1) {
						  totalCount
						}
						author {
						  login
						  avatarUrl
						  ... on User {
							id
						  }
						}
						authorAssociation
						state
						commit {
						  oid
						}
					  }
					}
					timelineItems(last: 3, itemTypes: [PULL_REQUEST_REVIEW]) {
					  totalCount
					  __typename
					  nodes {
						... on PullRequestReview {
						  __typename
						  id
						  author {
							login
							avatarUrl
						  }
						  authorAssociation
						  body
						  bodyText
						  bodyHTML
						  createdAt
						  databaseId
						  includesCreatedEdit
						  lastEditedAt
						  state
						  viewerDidAuthor
						  viewerCanUpdate
						  viewerCanReact
						  viewerCanDelete
						  reactionGroups {
							content
							users(last: 1) {
							  nodes {
								login
							  }
							}
						  }
						  resourcePath
						  comments(last: 20) {
							nodes {
							  author {
								login
								avatarUrl
							  }
							  authorAssociation
							  body
							  bodyText
							  bodyHTML
							  createdAt
							  databaseId
							  draftedAt
							  diffHunk
							  id
							  includesCreatedEdit
							  isMinimized
							  lastEditedAt
							  minimizedReason
							  publishedAt
							  state
							  replyTo {
								diffHunk
								id
								body
								bodyText
								bodyHTML
							  }
							  commit {
								message
								messageBody
								messageHeadline
								oid
							  }
							  editor {
								login
								avatarUrl
							  }
							  outdated
							  path
							  position
							  pullRequestReview {
								body
								bodyText
								bodyHTML
							  }
							  reactionGroups {
								content
								users(last: 1) {
								  nodes {
									login
								  }
								}
							  }
							  resourcePath
							  viewerCanUpdate
							  viewerCanReact
							  viewerCanDelete
							}
						  }
						  authorAssociation
						  bodyHTML
						}
					  }
					}
				  }
				}
			  }`,
			ownerData
		);
	}

	private async fetchPendingReviews(ownerData: {
		owner: string;
		name: string;
		pullRequestNumber: number;
	}) {
		// costs 1
		return this.query<any>(
			`query pr($owner: String!, $name: String!, $pullRequestNumber: Int!) {
				rateLimit {
				  limit
				  cost
				  remaining
				  resetAt
				}
				viewer {
					id
					login
					avatarUrl
				}
				repository(name: $name, owner: $owner) {
				  pullRequest(number: $pullRequestNumber) {
					reviews(states: PENDING, last: 50) {
					  nodes {
						id
						databaseId
						createdAt
						comments(last: 2) {
						  totalCount
						}
						author {
						  login
						  avatarUrl
						  ... on User {
							id
						  }
						}
					  }
					}
				  }
				}
			  }`,
			ownerData
		);
	}

	/**
	 * Maps the pull request data into a format that is easier for the client to handle
	 *
	 * @param {FetchThirdPartyPullRequestResponse} response
	 * @memberof GitHubProvider
	 */
	mapPullRequestModel(response: FetchThirdPartyPullRequestResponse) {
		// this is sheer insanity... there's no way to get replies to parent comments
		// as a child object of that comment. all replies are treated as `reviewThreads`
		// and they live on the parent `pullRequest` object. below, we're stiching together
		// comments and any replies (as a `replies` object) that might exist for those comments.
		// MORE here: https://github.community/t/bug-v4-graphql-api-trouble-retrieving-pull-request-review-comments/13708/2

		if (
			response.repository.pullRequest.timelineItems.nodes &&
			response.repository &&
			response.repository.pullRequest &&
			response.repository.pullRequest.reviewThreads &&
			response.repository.pullRequest.reviewThreads.edges
		) {
			// find all the PullRequestReview timelineItems as we will attach
			// additional data to them
			for (const timelineItem of response.repository.pullRequest.timelineItems.nodes.filter(
				(_: any) => _.__typename === "PullRequestReview"
			)) {
				if (!timelineItem.comments) continue;
				for (const comment of timelineItem.comments.nodes) {
					// a parent comment has a null replyTo
					if (comment.replyTo != null) continue;

					let replies: any = [];
					let threadId;
					let isResolved;
					let viewerCanResolve;
					let viewerCanUnresolve;
					for (const reviewThread of response.repository.pullRequest.reviewThreads.edges) {
						if (reviewThread.node.comments.nodes.length > 1) {
							for (const reviewThreadComment of reviewThread.node.comments.nodes) {
								if (reviewThreadComment.id === comment.id) {
									threadId = reviewThread.node.id;
									isResolved = reviewThread.node.isResolved;
									viewerCanResolve = reviewThread.node.viewerCanResolve;
									viewerCanUnresolve = reviewThread.node.viewerCanUnresolve;
									// find all the comments except the parent
									replies = replies.concat(
										reviewThread.node.comments.nodes.filter(
											(_: any) => _.id !== reviewThreadComment.id
										)
									);
									break;
								}
							}
						} else if (reviewThread.node.comments.nodes.length === 1) {
							const reviewThreadComment = reviewThread.node.comments.nodes[0];
							if (reviewThreadComment.id === comment.id) {
								threadId = reviewThread.node.id;
								isResolved = reviewThread.node.isResolved;
								viewerCanResolve = reviewThread.node.viewerCanResolve;
								viewerCanUnresolve = reviewThread.node.viewerCanUnresolve;
							}
						}
					}
					if (timelineItem.comments.nodes.length) {
						comment.threadId = threadId;
						comment.isResolved = isResolved;
						comment.viewerCanResolve = viewerCanResolve;
						comment.viewerCanUnresolve = viewerCanUnresolve;
						if (replies.length) {
							comment.replies = replies;
						}
					}
				}
			}
		}

		// note the graphql for this.. it's the _first_ X not the _last_ X
		// you'd think last would mean the last as in most recent, but it's actually the opposite
		if (response.repository.pullRequest.reviews && response.repository.pullRequest.reviews.nodes) {
			// here we're looking for your last pending review as you can only have 1 pending review
			// per user per PR
			const myPendingReview = response.repository.pullRequest.reviews.nodes.find(
				(_: any) => _.state === "PENDING" && _.author.id === response.viewer.id
			);
			if (myPendingReview) {
				// only returns your pending reviews
				response.repository.pullRequest.pendingReview = myPendingReview;
			}
		}
		response.repository.pullRequest.viewer = { ...response.viewer };
	}

	async deletePullRequestReview(request: {
		pullRequestId: string;
		pullRequestReviewId: string;
	}): Promise<Directives> {
		await this.mutate<any>(
			`mutation DeletePullRequestReview($pullRequestReviewId:ID!) {
			deletePullRequestReview(input: {pullRequestReviewId: $pullRequestReviewId}){
			  clientMutationId
			}
		  }`,
			{
				pullRequestReviewId: request.pullRequestReviewId
			}
		);

		const directives: Directive[] = [
			{
				type: "updatePullRequest",
				data: {
					updatedAt: Dates.toUtcIsoNow()
				}
			},
			{
				type: "removePendingReview",
				data: null
			},
			{
				type: "removePullRequestReview",
				data: {
					id: request.pullRequestReviewId
				}
			}
		];

		this.updateCache(request.pullRequestId, {
			directives: directives
		});

		this.session.agent.sendNotification(DidChangePullRequestCommentsNotificationType, {
			pullRequestId: request.pullRequestId
		});

		return {
			directives: directives
		};
	}

	async getPendingReview(request: {
		pullRequestId: string;
	}): Promise<
		| {
				pullRequestReviewId: string;
		  }
		| undefined
	> {
		const existingReview = await this.query<any>(
			`query ExistingReviews($pullRequestId:ID!) {
				rateLimit {
					cost
					resetAt
					remaining
					limit
				}
				node(id: $pullRequestId) {
					... on PullRequest {
						id
						reviews(last: 100) {
							nodes {
								state
								id
								viewerDidAuthor
							}
						}
					}
				}
		 	 }
		  `,
			{
				pullRequestId: request.pullRequestId
			}
		);

		const review = existingReview?.node?.reviews?.nodes?.find(
			(_: any) => _.viewerDidAuthor && _.state === "PENDING"
		);
		return review ? { pullRequestReviewId: review?.id } : undefined;
	}

	async submitReview(request: {
		pullRequestId: string;
		text: string;
		eventType: string;
		// used with old servers
		pullRequestReviewId?: string;
	}): Promise<Directives> {
		// TODO add directives
		if (!request.eventType) {
			request.eventType = "COMMENT";
		}
		if (
			request.eventType !== "COMMENT" &&
			request.eventType !== "APPROVE" &&
			// for some reason I cannot get DISMISS to work...
			// request.eventType !== "DISMISS" &&
			request.eventType !== "REQUEST_CHANGES"
		) {
			throw new Error("Invalid eventType");
		}
		const v = await this.getVersion();
		let existingReview = await this.getPendingReview(request);
		if (!existingReview) {
			const existingReviewResponse = await this.mutate<any>(
				`mutation AddPullRequestReview($pullRequestId:ID!) {
					addPullRequestReview(input: {pullRequestId: $pullRequestId, body: ""}) {
						clientMutationId
						pullRequestReview {
      						id
    					}
					}
			  	}`,
				{
					pullRequestId: request.pullRequestId
				}
			);
			existingReview = {
				pullRequestReviewId: existingReviewResponse.addPullRequestReview.pullRequestReview.id
			};
		}

		let submitReviewResponse;
		if (v && semver.lt(v.version, "2.21.0")) {
			submitReviewResponse = await this.mutate<any>(
				`mutation SubmitPullRequestReview($pullRequestReviewId: ID!, $body: String, $eventName: PullRequestReviewEvent!) {
				submitPullRequestReview(input: {event: $eventName, body: $body, pullRequestReviewId: $pullRequestReviewId}) {
				  clientMutationId
				  pullRequestReview {
					id
					databaseId
					createdAt
					comments(first: 1) {
					  totalCount
					}
					author {
					  login
					  avatarUrl
					  ... on User {
						id
					  }
					}
					authorAssociation
					state
					commit {
					  oid
					}
				  }
				}
			  }`,
				{
					pullRequestReviewId: existingReview.pullRequestReviewId,
					body: request.text,
					eventName: request.eventType
				}
			);
		} else {
			submitReviewResponse = await this.mutate<any>(
				`mutation SubmitPullRequestReview($pullRequestId: ID!, $body: String, $eventName: PullRequestReviewEvent!) {
				submitPullRequestReview(input: {event: $eventName, body: $body, pullRequestId: $pullRequestId}) {
				  clientMutationId
				  pullRequestReview {
					id
					databaseId
					createdAt
					comments(first: 1) {
					  totalCount
					}
					author {
					  login
					  avatarUrl
					  ... on User {
						id
					  }
					}
					authorAssociation
					state
					commit {
					  oid
					}
				  }
				}
			  }`,
				{
					pullRequestId: request.pullRequestId,
					body: request.text,
					eventName: request.eventType
				}
			);
		}
		const ownerData = await this.getRepoOwnerFromPullRequestId(request.pullRequestId);
		const updatedPullRequest = (await this.query(
			`query pr($owner: String!, $name: String!, $pullRequestNumber: Int!) {
				rateLimit {
				  limit
				  cost
				  remaining
				  resetAt
				}
				viewer {
					login
				}
				repository(name: $name, owner: $owner) {
				  pullRequest(number: $pullRequestNumber) {
					updatedAt
					reviewThreads(last: 20) {
					  edges {
						node {
						  id
						  isResolved
						  viewerCanResolve
						  viewerCanUnresolve
						}
					  }
					}
					state
					timelineItems(last: 10, itemTypes: [PULL_REQUEST_REVIEW]) {
					  totalCount
					  __typename
					  nodes {
						... on PullRequestReview {
							__typename
							id
							author {
							  login
							  avatarUrl
							}
							authorAssociation
							body
							bodyText
							bodyHTML
							createdAt
							databaseId
							includesCreatedEdit
							lastEditedAt
							state
							viewerDidAuthor
							viewerCanUpdate
							viewerCanReact
							viewerCanDelete
							reactionGroups {
							  content
							  users(last: 1) {
								nodes {
								  login
								}
							  }
							}
							resourcePath
							comments(last: 20) {
							  nodes {
								author {
								  login
								  avatarUrl
								}
								authorAssociation
								body
								bodyText
								bodyHTML
								createdAt
								databaseId
								draftedAt
								diffHunk
								id
								includesCreatedEdit
								isMinimized
								lastEditedAt
								minimizedReason
								publishedAt
								state
								replyTo {
								  diffHunk
								  id
								  body
								  bodyText
								  bodyHTML
								}
								commit {
								  message
								  messageBody
								  messageHeadline
								  oid
								}
								editor {
								  login
								  avatarUrl
								}
								outdated
								path
								position
								pullRequestReview {
								  body
								  bodyText
								  bodyHTML
								}
								reactionGroups {
								  content
								  users(last: 1) {
									nodes {
									  login
									}
								  }
								}
								resourcePath
								viewerCanUpdate
								viewerCanReact
								viewerCanDelete
							  }
							}
							authorAssociation
							bodyHTML
						  }
					  }
					}
				  }
				}
			  }
		  `,
			ownerData
		)) as {
			viewer: {
				login: string;
			};
			repository: {
				pullRequest: {
					reviewThreads: {
						edges: any[];
					};
					timelineItems: {
						totalCount: string;
						__typename: string;
						nodes: any[];
					};
				};
			};
		};

		const reviewTimelineItem =
			existingReview &&
			existingReview.pullRequestReviewId &&
			updatedPullRequest.repository.pullRequest.timelineItems.nodes.find(
				_ => _.id === existingReview!.pullRequestReviewId
			);

		return this.handleResponse(request.pullRequestId, {
			directives: [
				{
					type: "updatePullRequest",
					data: {
						updatedAt: Dates.toUtcIsoNow()
					}
				},
				{
					type: "addNodes",
					data: updatedPullRequest.repository.pullRequest.timelineItems.nodes
				},
				{
					type: "updateReviewThreads",
					data: updatedPullRequest.repository.pullRequest.reviewThreads.edges
				},
				{
					type: "updateReview",
					data: submitReviewResponse.submitPullRequestReview.pullRequestReview
				},
				{
					type: "reviewSubmitted",
					data: {
						pullRequestReview: {
							id: existingReview.pullRequestReviewId
						},
						updates: {
							body: reviewTimelineItem.body,
							bodyHTML: reviewTimelineItem.bodyHTML,
							bodyText: reviewTimelineItem.bodyText,
							state: reviewTimelineItem.state
						},
						comments: reviewTimelineItem?.comments.nodes.map((_: any) => {
							return {
								id: _.id,
								state: _.state
							};
						})
					}
				},
				{ type: "removePendingReview", data: null },
				{
					type: "removeRequestedReviewer",
					data: {
						login: updatedPullRequest.viewer?.login
					}
				}
			]
		});
	}

	/**
	 * Returns a string only if it satisfies the current version (GHE only)
	 *
	 * @param {string} query
	 * @return {*}  {string}
	 * @memberof GitHubProvider
	 */
	_transform(query: string): string {
		if (!query) return "";
		const v = this._version?.version;
		query = query.replace(
			/\[([\s\S]+?)\:([>=<]+)(\d+\.\d+\.\d+)\]/g,
			(substring: string, ...args: any[]) => {
				if (v) {
					const comparer = args[1];
					if (comparer === "<") {
						return semver.lt(v, args[2]) ? args[0] : "";
					} else if (comparer === ">") {
						return semver.gt(v, args[2]) ? args[0] : "";
					} else if (comparer === ">=") {
						return semver.gte(v, args[2]) ? args[0] : "";
					} else if (comparer === "<=") {
						return semver.lte(v, args[2]) ? args[0] : "";
					} else {
						return "";
					}
				}
				return args[0];
			}
		);
		return query;
	}

	private buildSearchQuery(query: string, limit: number) {
		return `query Search {
			rateLimit {
				limit
				cost
				remaining
				resetAt
			}
			search(query: "${query}", type: ISSUE, last: ${limit}) {
			edges {
			  node {
				... on PullRequest {
					url
					title
					createdAt
					baseRefName
					headRefName
					headRepository {
						name
						nameWithOwner
					}
					author {
						login
						avatarUrl(size: 20)
						url
					}
					body
					bodyText
					number
					state
					${this._transform(`[isDraft:>=2.21.0]`)}
					updatedAt
					lastEditedAt
					id
					headRefName
					headRepository {
						name
					}
					labels(first: 10) {
						nodes {
							color
							description
							name
							id
						}
					}
				  }
			  }
			}
		  }
		}`;
	}

	// _getMyPullRequestsCache = new Map<string, GetMyPullRequestsResponse[][]>();
	async getMyPullRequests(
		request: GetMyPullRequestsRequest
	): Promise<GetMyPullRequestsResponse[][] | undefined> {
		void (await this.ensureConnected());
		// const cacheKey = JSON.stringify({ ...request, providerId: this.providerConfig.id });
		// if (!request.force) {
		// 	const cached = this._getMyPullRequestsCache.get(cacheKey);
		// 	if (cached) {
		// 		Logger.debug(`github getMyPullRequests got from cache, key=${cacheKey}`);
		// 		return cached!;
		// 	} else {
		// 		Logger.debug(`github getMyPullRequests cache miss, key=${cacheKey}`);
		// 	}
		// } else {
		// 	Logger.debug(`github getMyPullRequests removed from cache, key=${cacheKey}`);
		// 	this._getMyPullRequestsCache.delete(cacheKey);
		// }
		let repoQuery =
			request && request.owner && request.repo ? `repo:${request.owner}/${request.repo} ` : "";
		if (request.isOpen) {
			try {
				const repos = await this.getOpenedRepos();
				if (repos.length) {
					repoQuery = repos.map(_ => `repo:${_}`).join(" ") + " ";
				} else {
					Logger.warn(
						`getMyPullRequests: request.isOpen=true, but no repos found, returning empty`
					);
					return [];
				}
			} catch (ex) {
				Logger.warn(ex);
			}
		}

		const queries = request.queries;

		const queriesSafe = request.queries.map(query => query.replace(/["']/g, '\\"'));

		// NOTE: there is also `reviewed-by` which `review-requested` translates to after the user
		// has started or completed the review.

		// const queries = [
		// 	{ name: "Local PR Branches", query: `is:pr author:@me` },
		// 	{ name: "Waiting on my Review", query: `is:pr review-requested:@me` },
		// 	{ name: "Assigned to Me", query: `is:pr assignee:@me` },
		// 	{ name: "Created by Me", query: `is:pr author:@me` }
		// ];

		const providerId = this.providerConfig?.id;
		// see: https://docs.github.com/en/github/searching-for-information-on-github/searching-issues-and-pull-requests
		const items = await Promise.all(
			queriesSafe.map(_query => {
				let query = _query;
				let limit = 100;
				// recent is kind of a magic string, where we just look
				// for some random PR activity to at least show you
				// something. if you have the repo query checked, and
				// we can query by repo, then use that. otherwise github
				// needs at least one qualifier so we query for PRs
				// that you were the author of
				// https://trello.com/c/XIg6MKWy/4813-add-4th-default-pr-query-recent
				if (query === "recent") {
					if (repoQuery.length > 0) {
						query = "is:pr";
					} else {
						query = "is:pr author:@me";
					}
					limit = 5;
				}

				// if a user has put a "repo:X/Y" in their query, don't add the repoQuery as specified by the request.isOpen option
				const finalQuery = query.indexOf("repo:") > -1 ? query : repoQuery + query;
				if (query !== finalQuery) {
					Logger.log(
						`getMyPullRequests providerId="${providerId}" finalQuery="${finalQuery}" query=${query}`
					);
				} else {
					Logger.log(`getMyPullRequests providerId="${providerId}" finalQuery="${finalQuery}"`);
				}
				return this.query<any>(this.buildSearchQuery(finalQuery, limit));
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
			if (item && item.search && item.search.edges) {
				response[index] = item.search.edges
					.map((_: any) => _.node)
					.filter((_: any) => _.id)
					.map((pr: { createdAt: string }) => ({
						...pr,
						providerId: providerId,
						createdAt: new Date(pr.createdAt).getTime()
					}));
				if (!queries[index].match(/\bsort:/)) {
					response[index] = response[index].sort(
						(a: { createdAt: number }, b: { createdAt: number }) => b.createdAt - a.createdAt
					);
				}
			}
		});

		// this._getMyPullRequestsCache.set(cacheKey, response);
		return response;
	}

	protected async getMe() {
		return "@me";
	}

	async getPullRequestLastUpdated(request: { pullRequestId: string }) {
		const response = await this.query<any>(
			`query GetPullRequestLastUpdated($pullRequestId:ID!) {
				rateLimit {
					cost
					resetAt
					remaining
					limit
				}
				node(id:$pullRequestId) {
						... on PullRequest {
							updatedAt
							mergeable
						  }
						}
				  }`,
			{
				pullRequestId: request.pullRequestId
			}
		);
		return {
			updatedAt: response && response.node ? response.node.updatedAt : undefined,
			mergeable: response && response.node ? response.node.mergeable : undefined
		};
	}

	async getPullRequestIdFromUrl(request: { url: string }) {
		// since we only the url for the PR -- parse it out for the
		// data we need.
		const uri = URI.parse(request.url);
		const path = uri.path.split("/");
		const owner = path[1];
		const repo = path[2];
		const pullRequestNumber = parseInt(path[4], 10);
		const pullRequestInfo = await this.query<any>(
			`query FindPullRequest($owner:String!, $name:String!, $pullRequestNumber:Int!) {
				rateLimit {
					cost
					resetAt
					remaining
					limit
				}
				repository(owner:$owner, name:$name) {
					pullRequest(number: $pullRequestNumber) {
						id
					  }
					}
				}`,
			{
				owner: owner,
				name: repo,
				pullRequestNumber: pullRequestNumber
			}
		);
		try {
			return pullRequestInfo.repository.pullRequest.id;
		} catch (ex) {
			Logger.warn(ex, "Ensure you have the correct scopes");
			throw ex;
		}
	}

	async getIssueIdFromUrl(request: { url: string }) {
		// since we only have the url for the Issue -- parse it out for the
		// data we need.
		const uri = URI.parse(request.url);
		const path = uri.path.split("/");
		const owner = path[1];
		const repo = path[2];
		const issueNumber = parseInt(path[4], 10);
		const issueInfo = await this.query<any>(
			`query FindIssue($owner:String!, $name:String!, $issueNumber:Int!) {
				rateLimit {
					cost
					resetAt
					remaining
					limit
				}
					repository(owner:$owner name:$name) {
					  issue(number: $issueNumber) {
						id
						number
						title
						body
					  }
					}
					viewer {
						login
						id
					}
				  }`,
			{
				owner: owner,
				name: repo,
				issueNumber: issueNumber
			}
		);
		// Logger.log("Fired off a query: ", JSON.stringify(issueInfo, null, 4));
		// const issue = issueInfo.repository.issue;
		// issue.viewer = issueInfo.viewer;
		// translate to our card shape
		const { repository } = issueInfo;
		const { issue } = repository;
		const card = {
			id: issue.id,
			tokenId: issue.number,
			number: issue.number,
			title: issue.title,
			body: issue.body,
			url: request.url,
			providerIcon: "mark-github"
		};
		return { ...card, viewer: issueInfo.viewer };
	}

	async toggleMilestoneOnPullRequest(request: {
		pullRequestId: string;
		milestoneId: string;
		onOff: boolean;
	}): Promise<Directives> {
		const query = `mutation UpdatePullRequest($pullRequestId:ID!, $milestoneId: ID) {
			updatePullRequest(input: {pullRequestId: $pullRequestId, milestoneId: $milestoneId}) {
				  clientMutationId
				  pullRequest {
					updatedAt
					milestone {
					  id
					  title
					  state
					  description
					  number
					}
					timelineItems(last: 1, itemTypes: [MILESTONED_EVENT,DEMILESTONED_EVENT]) {
					  nodes {
						  ... on MilestonedEvent {
							__typename
							id
							actor {
								login
								avatarUrl
								resourcePath
								url
							}
							createdAt
							milestoneTitle
						}
						... on DemilestonedEvent {
						  __typename
						  id
						  actor {
							login
							avatarUrl
							resourcePath
							url
						  }
						  milestoneTitle
						  createdAt
						}
					  }
					}
				  }
				}
			  }`;

		// remove it by setting it to null
		const response = await this.mutate<any>(query, {
			pullRequestId: request.pullRequestId,
			milestoneId: request.onOff ? request.milestoneId : null
		});

		return this.handleResponse(request.pullRequestId, {
			directives: [
				{
					type: "updatePullRequest",
					data: { milestone: response.updatePullRequest.pullRequest.milestone }
				},
				{ type: "addNode", data: response.updatePullRequest.pullRequest.timelineItems.nodes[0] }
			]
		});
	}

	async toggleProjectOnPullRequest(request: {
		pullRequestId: string;
		projectId: string;
		onOff: boolean;
	}): Promise<Directives> {
		const metadata = await this.getPullRequestMetadata(request.pullRequestId);
		const projectIds = new Set(metadata.projectCards.map(_ => _.project.id));
		const query = `mutation UpdatePullRequest($pullRequestId:ID!, $projectIds: [ID!]) {
			updatePullRequest(input: {pullRequestId: $pullRequestId, projectIds: $projectIds}) {
				  clientMutationId
				  pullRequest {
					updatedAt
					projectCards(first: 10) {
						nodes {
						  id
						  note
						  state
						  project {
							name
							id
						  }
						}
					  }
				  }
				}
			  }`;
		if (request.onOff) {
			projectIds.add(request.projectId);
		} else {
			projectIds.delete(request.projectId);
		}

		const response = await this.mutate<any>(query, {
			pullRequestId: request.pullRequestId,
			projectIds: [...projectIds]
		});

		return this.handleResponse(request.pullRequestId, {
			directives: [
				{
					type: "updatePullRequest",
					data: {
						projectCards: response.updatePullRequest.pullRequest.projectCards,
						updatedAt: response.updatePullRequest.pullRequest.updatedAt
					}
				}
			]
		});
	}

	async updatePullRequestTitle(request: {
		pullRequestId: string;
		title: string;
	}): Promise<Directives> {
		const query = `mutation UpdatePullRequest($pullRequestId:ID!, $title: String) {
			updatePullRequest(input: {pullRequestId: $pullRequestId, title: $title}) {
				  clientMutationId
				  pullRequest {
					title
					updatedAt
				  }
				}
			  }`;

		const response = await this.mutate<any>(query, {
			pullRequestId: request.pullRequestId,
			title: request.title
		});

		return this.handleResponse(request.pullRequestId, {
			directives: [
				{
					type: "updatePullRequest",
					data: response.updatePullRequest.pullRequest
				}
			]
		});
	}

	async mergePullRequest(request: {
		pullRequestId: string;
		mergeMethod: MergeMethod;
	}): Promise<Directives> {
		if (!request.mergeMethod) throw new Error("InvalidMergeMethod");
		const mergeMethods = new Set(["MERGE", "REBASE", "SQUASH"]);
		if (!mergeMethods.has(request.mergeMethod)) throw new Error("InvalidMergeMethod");

		const query = `mutation MergePullRequest($pullRequestId:ID!) {
			mergePullRequest(input: {pullRequestId: $pullRequestId, mergeMethod: ${request.mergeMethod}}) {
				  clientMutationId
				  pullRequest {
					state
					mergeable
					merged
					mergedAt
					updatedAt
					timelineItems(last: 10) {
					  nodes {
						... on ReferencedEvent {
						  id
						  __typename
						  actor {
							login
							avatarUrl
						  }
						  commit {
							messageBody
							messageHeadline
							status {
							  state
							}
							oid
							abbreviatedOid
							author {
							  avatarUrl
							  name
							  user {
								login
							  }
							}
							committer {
							  avatarUrl
							  name
							  user {
								login
							  }
							}
						  }
						}
						... on MergedEvent {
						  __typename
						  id
						  actor {
							login
							avatarUrl
						  }
						  mergeRefName
						  createdAt
						  commit {
							abbreviatedOid
						  }
						}
						... on ClosedEvent {
						  __typename
						  id
						  actor {
							login
							avatarUrl
						  }
						  createdAt
						}
					  }
					}
				  }
				}
			  }`;
		const response = await this.mutate<any>(query, {
			pullRequestId: request.pullRequestId
		});

		const pullRequestData = {
			canBeRebased: false,
			mergeStateStatus: "UNKNOWN",
			mergeable: response.mergePullRequest.pullRequest.mergeable,
			merged: response.mergePullRequest.pullRequest.merged,
			mergedAt: response.mergePullRequest.pullRequest.mergedAt,
			state: response.mergePullRequest.pullRequest.state,
			updatedAt: response.mergePullRequest.pullRequest.updatedAt
		};

		return this.handleResponse(request.pullRequestId, {
			directives: [
				{ type: "updatePullRequest", data: pullRequestData },
				{ type: "addNodes", data: response.mergePullRequest.pullRequest.timelineItems.nodes }
			]
		});
	}

	async lockPullRequest(request: {
		pullRequestId: string;
		lockReason: string;
	}): Promise<Directives> {
		// OFF_TOPIC, TOO_HEATED, SPAM
		const response = await this.mutate<any>(
			`mutation LockPullRequest($lockableId:ID!, $lockReason:LockReason) {
				lockLockable(input: {lockableId:$lockableId, lockReason:$lockReason}) {
				  clientMutationId
				  lockedRecord {
					... on PullRequest {
					  locked
					  activeLockReason
					  updatedAt
					}
				  }
				}
			  }`,
			{
				lockableId: request.pullRequestId,
				lockReason: request.lockReason
			}
		);

		return this.handleResponse(request.pullRequestId, {
			directives: [
				{
					type: "updatePullRequest",
					data: response.lockLockable.lockedRecord
				}
			]
		});
	}

	async unlockPullRequest(request: { pullRequestId: string }): Promise<Directives> {
		const response = await this.mutate<any>(
			`mutation UnlockPullRequest($pullRequestId:ID!) {
				unlockLockable(input: {lockableId: $pullRequestId}) {
				  clientMutationId
				  unlockedRecord {
					... on PullRequest {
					  locked
					  activeLockReason
					  updatedAt
					}
				  }
				}
			  }`,
			{
				pullRequestId: request.pullRequestId
			}
		);

		return this.handleResponse(request.pullRequestId, {
			directives: [
				{
					type: "updatePullRequest",
					data: response.unlockLockable.unlockedRecord
				}
			]
		});
	}

	async getReviewersForPullRequest(request: { pullRequestId: string }) {
		const ownerData = await this.getRepoOwnerFromPullRequestId(request.pullRequestId);
		const response = await this.query<any>(
			`query GetReviewersForPullRequest($owner:String!, $name:String!, $pullRequestNumber:Int!) {
				rateLimit {
					cost
					resetAt
					remaining
					limit
				}
			repository(name:$name, owner:$owner) {
			  pullRequest(number: $pullRequestNumber) {
				id
				reviewRequests(first: 25) {
				  edges {
					node {
					  id
					  requestedReviewer {
						... on User {
						  id
						  avatarUrl
						  login
						}
					  }
					}
				  }
				}
			  }
			}
		  }`,
			{
				name: ownerData.name,
				owner: ownerData.owner,
				pullRequestNumber: ownerData.pullRequestNumber
			}
		);
		return response?.repository?.pullRequest?.reviewRequests?.edges.map(
			(_: any) => _.node.requestedReviewer.id
		);
	}

	async addReviewerToPullRequest(request: {
		pullRequestId: string;
		userId: string;
	}): Promise<Directives> {
		const currentReviewers = await this.getReviewersForPullRequest(request);
		const response = await this.mutate<any>(
			`mutation RequestReviews($pullRequestId:ID!, $userIds:[ID!]!) {
				requestReviews(input: {pullRequestId:$pullRequestId, userIds:$userIds}) {
			  clientMutationId
			  pullRequest {
				updatedAt
				reviewRequests(last: 10) {
				  nodes {
					requestedReviewer {
					  ... on User {
						id
						avatarUrl
						login
						email
					  }
					}
				  }
				}
				timelineItems(last: 1, itemTypes: REVIEW_REQUESTED_EVENT) {
				  nodes {
					... on ReviewRequestedEvent {
					  __typename
					  id
					  actor {
						login
						avatarUrl
					  }
					  createdAt
					  requestedReviewer {
						... on User {
						  id
						  avatarUrl
						  login
						  avatarUrl
						}
					  }
					}
				  }
				}
			  }
			}
		  }`,
			{
				pullRequestId: request.pullRequestId,
				userIds: (currentReviewers || []).concat(request.userId)
			}
		);

		return this.handleResponse(request.pullRequestId, {
			directives: [
				{
					type: "updatePullRequest",
					data: { updatedAt: response.requestReviews.pullRequest.updatedAt }
				},
				{
					type: "updatePullRequestReviewers",
					data: response.requestReviews.pullRequest.reviewRequests.nodes
				},
				{
					type: "addNode",
					data: response.requestReviews.pullRequest.timelineItems.nodes[0]
				}
			]
		});
	}

	async removeReviewerFromPullRequest(request: {
		pullRequestId: string;
		userId: string;
	}): Promise<Directives> {
		const currentReviewers = await this.getReviewersForPullRequest(request);
		const response = await this.mutate<any>(
			`mutation RequestReviews($pullRequestId:ID!, $userIds:[ID!]!) {
				requestReviews(input: {pullRequestId:$pullRequestId, userIds:$userIds}) {
			  clientMutationId
			  pullRequest {
				updatedAt
				reviewRequests(last: 10) {
				  nodes {
					requestedReviewer {
					  ... on User {
						id
						avatarUrl
						login
						email
					  }
					}
				  }
				}
			  }
			}
		  }`,
			{
				pullRequestId: request.pullRequestId,
				userIds: (currentReviewers || []).filter((_: string) => _ !== request.userId)
			}
		);

		return this.handleResponse(request.pullRequestId, {
			directives: [
				{
					type: "updatePullRequest",
					data: { updatedAt: response.requestReviews.pullRequest.updatedAt }
				},
				{
					type: "updatePullRequestReviewers",
					data: response.requestReviews.pullRequest.reviewRequests.nodes
				}
			]
		});
	}

	async createPullRequestCommentAndClose(request: {
		pullRequestId: string;
		text: string;
	}): Promise<Directives> {
		const directives: any = [];

		if (request.text) {
			const response1 = await this.mutate<any>(
				`mutation AddCommentToPullRequest($pullRequestId:ID!, $body:String!) {
				addComment(input: {subjectId: $pullRequestId, body:$body}) {
				  clientMutationId
				  timelineEdge {
					node {
					  ... on IssueComment {
						__typename
						id
						author {
						  login
						  avatarUrl
						}
						authorAssociation
						body
						bodyText
						bodyHTML
						createdAt
						includesCreatedEdit
						isMinimized
						minimizedReason
						reactionGroups {
						  content
						  users(first: 10) {
							nodes {
							  login
							}
						  }
						}
						resourcePath
						viewerCanUpdate
						viewerCanReact
						viewerCanDelete
					  }
					}
				  }
				}
			  }`,
				{
					pullRequestId: request.pullRequestId,
					body: request.text
				}
			);

			directives.push({
				type: "addNode",
				data: response1.addComment.timelineEdge.node
			});
		}

		const response2 = await this.mutate<any>(
			`mutation ClosePullRequest($pullRequestId:ID!) {
			closePullRequest(input: {pullRequestId: $pullRequestId}) {
				  clientMutationId
				  pullRequest {
					state
					mergeable
					merged
					mergedAt
					updatedAt
					timelineItems(last: 10) {
						nodes {
						  ... on ClosedEvent {
							__typename
							id
							actor {
							  login
							  avatarUrl
							}
							createdAt
						  }
						}
					  }
				  }
				}
			}`,
			{
				pullRequestId: request.pullRequestId
			}
		);

		directives.push({
			type: "updatePullRequest",
			data: {
				mergeable: response2.closePullRequest.pullRequest.mergeable,
				merged: response2.closePullRequest.pullRequest.merged,
				mergedAt: response2.closePullRequest.pullRequest.mergedAt,
				state: response2.closePullRequest.pullRequest.state,
				updatedAt: response2.closePullRequest.pullRequest.updatedAt
			}
		});
		directives.push({
			type: "addNodes",
			data: response2.closePullRequest.pullRequest.timelineItems.nodes
		});

		return this.handleResponse(request.pullRequestId, {
			directives: directives
		});
	}

	async createPullRequestCommentAndReopen(request: {
		pullRequestId: string;
		text: string;
	}): Promise<Directives> {
		const directives: any = [];

		if (request.text) {
			const response1 = await this.mutate<any>(
				`mutation AddCommentToPullRequest($pullRequestId:ID!, $body:String!) {
				addComment(input: {subjectId: $pullRequestId, body:$body}) {
				  clientMutationId
				  timelineEdge {
					node {
					  ... on IssueComment {
						__typename
						id
						author {
						  login
						  avatarUrl
						}
						authorAssociation
						body
						bodyText
						bodyHTML
						createdAt
						includesCreatedEdit
						isMinimized
						minimizedReason
						reactionGroups {
						  content
						  users(first: 10) {
							nodes {
							  login
							}
						  }
						}
						resourcePath
						viewerCanUpdate
						viewerCanReact
						viewerCanDelete
					  }
					}
				  }
				}
			  }`,
				{
					pullRequestId: request.pullRequestId,
					body: request.text
				}
			);

			directives.push({
				type: "addNode",
				data: response1.addComment.timelineEdge.node
			});
		}

		const response2 = await this.mutate<any>(
			`mutation ReopenPullRequest($pullRequestId:ID!) {
			reopenPullRequest(input: {pullRequestId: $pullRequestId}) {
				  clientMutationId
				  pullRequest {
					state
					mergeable
					merged
					mergedAt
					updatedAt
					timelineItems(last: 1) {
						nodes {
						  ... on ReopenedEvent {
							id
							__typename
							actor {
							  login
							  avatarUrl
							}
							createdAt
						  }
						}
					  }
				  }
				}
			}`,
			{
				pullRequestId: request.pullRequestId
			}
		);
		directives.push({
			type: "updatePullRequest",
			data: {
				mergeable: response2.reopenPullRequest.pullRequest.mergeable,
				merged: response2.reopenPullRequest.pullRequest.merged,
				mergedAt: response2.reopenPullRequest.pullRequest.mergedAt,
				state: response2.reopenPullRequest.pullRequest.state,
				updatedAt: response2.reopenPullRequest.pullRequest.updatedAt
			}
		});
		directives.push({
			type: "addNodes",
			data: response2.reopenPullRequest.pullRequest.timelineItems.nodes
		});

		return this.handleResponse(request.pullRequestId, {
			directives: directives
		});
	}

	async resolveReviewThread(request: {
		pullRequestId: string;
		threadId: string;
	}): Promise<Directives> {
		const response = await this.mutate<any>(
			`mutation ResolveReviewThread($threadId:ID!) {
				resolveReviewThread(input: {threadId:$threadId}) {
				  clientMutationId
				  thread {
					isResolved
					viewerCanResolve
					viewerCanUnresolve
					id
				  }
				}
			}`,
			{
				threadId: request.threadId
			}
		);
		const thread = response.resolveReviewThread.thread;
		return this.handleResponse(request.pullRequestId, {
			directives: [
				{
					type: "resolveReviewThread",
					data: {
						isResolved: thread.isResolved,
						viewerCanResolve: thread.viewerCanResolve,
						viewerCanUnresolve: thread.viewerCanUnresolve,
						threadId: thread.id
					}
				}
			]
		});
	}

	async unresolveReviewThread(request: {
		pullRequestId: string;
		threadId: string;
	}): Promise<Directives> {
		const response = await this.mutate<any>(
			`mutation UnresolveReviewThread($threadId:ID!) {
				unresolveReviewThread(input: {threadId:$threadId}) {
				  clientMutationId
				  thread {
					isResolved
					viewerCanResolve
					viewerCanUnresolve
					id
				  }
				}
			}`,
			{
				threadId: request.threadId
			}
		);
		const thread = response.unresolveReviewThread.thread;

		return this.handleResponse(request.pullRequestId, {
			directives: [
				{
					type: "unresolveReviewThread",
					data: {
						isResolved: thread.isResolved,
						viewerCanResolve: thread.viewerCanResolve,
						viewerCanUnresolve: thread.viewerCanUnresolve,
						threadId: thread.id
					}
				}
			]
		});
	}

	async addComment(request: {
		pullRequestId: string;
		subjectId: string;
		text: string;
	}): Promise<Directives> {
		const response = await this.mutate<any>(
			`mutation AddComment($subjectId:ID!,$body:String!) {
				addComment(input: {subjectId:$subjectId, body:$body}) {
				  clientMutationId
				  timelineEdge {
					node {
					  ... on IssueComment {
						__typename
						id
						author {
						  login
						  avatarUrl
						}
						authorAssociation
						body
						bodyText
						bodyHTML
						createdAt
						includesCreatedEdit
						isMinimized
						minimizedReason
						reactionGroups {
						  content
						  users(first: 1) {
							nodes {
							  login
							}
						  }
						}
						resourcePath
						viewerCanUpdate
						viewerCanReact
						viewerCanDelete
					  }
					}
				  }
				}
			}`,
			{
				subjectId: request.subjectId,
				body: request.text
			}
		);

		return this.handleResponse(request.pullRequestId, {
			directives: [
				{
					type: "updatePullRequest",
					data: {
						updatedAt: Dates.toUtcIsoNow()
					}
				},
				{
					type: "addNode",
					data: response.addComment.timelineEdge.node
				}
			]
		});
	}

	@log()
	async createCommitComment(request: {
		pullRequestId: string;
		sha: string;
		text: string;
		path: string;
		startLine: number;
		// use endLine for multi-line comments
		endLine?: number;
		// used for old servers
		position?: number;
	}): Promise<Directives> {
		// https://github.community/t/feature-commit-comments-for-a-pull-request/13986/9
		const ownerData = await this.getRepoOwnerFromPullRequestId(request.pullRequestId);
		let payload;
		if (this._version && semver.lt(this._version.version, "2.20.0")) {
			// old servers dont have line/start_line
			// https://docs.github.com/en/enterprise-server@2.19/rest/reference/pulls#create-a-review-comment-for-a-pull-request-alternative
			payload = {
				body: request.text,
				commit_id: request.sha,
				path: request.path,
				position: request.position!
			} as any;
		} else {
			// enterprise 2.20.X and beyond allows this
			// https://docs.github.com/en/enterprise-server@2.20/rest/reference/pulls#create-a-review-comment-for-a-pull-request
			payload = {
				body: request.text,
				commit_id: request.sha,
				side: "RIGHT",
				path: request.path
			} as any;
			if (request.endLine != null && request.endLine !== request.startLine) {
				payload.start_line = request.startLine;
				payload.line = request.endLine;
			} else {
				payload.line = request.startLine;
			}
		}

		Logger.log(`commenting:createCommitComment`, {
			ownerData: ownerData,
			request: request,
			payload: payload
		});

		const data = await this.restPost<any, any>(
			`/repos/${ownerData.owner}/${ownerData.name}/pulls/${ownerData.pullRequestNumber}/comments`,
			payload
		);

		const graphResults = await this.fetchUpdatedReviewCommentData(ownerData);
		this.mapPullRequestModel(graphResults);

		const directives = [
			{
				type: "updatePullRequest",
				data: {
					updatedAt: graphResults.repository.pullRequest.updatedAt
				}
			}
		] as any;

		if (graphResults?.repository?.pullRequest) {
			const pr = graphResults.repository.pullRequest;
			if (pr.reviews) {
				const review = pr.reviews.nodes.find(
					(_: any) => _.databaseId === data.body.pull_request_review_id
				);
				directives.push({
					type: "addReview",
					data: review
				});

				if (review) {
					directives.push({
						type: "addReviewThreads",
						data: pr.reviewThreads.edges
					});
				}
			}
			if (pr.timelineItems) {
				directives.push({
					type: "addNodes",
					data: pr.timelineItems.nodes
				});
			}
		}
		this.updateCache(request.pullRequestId, {
			directives: directives
		});
		this.session.agent.sendNotification(DidChangePullRequestCommentsNotificationType, {
			pullRequestId: request.pullRequestId
		});

		return {
			directives: directives
		};
	}

	async createCommitByPositionComment(request: {
		pullRequestId: string;
		sha: string;
		text: string;
		position: number;
		path: string;
	}) {
		// https://github.community/t/feature-commit-comments-for-a-pull-request/13986/9
		const ownerData = await this.getRepoOwnerFromPullRequestId(request.pullRequestId);
		const data = await this.restPost<any, any>(
			`/repos/${ownerData.owner}/${ownerData.name}/pulls/${ownerData.pullRequestNumber}/comments`,
			{
				body: request.text,
				commit_id: request.sha,
				side: "RIGHT",
				path: request.path,
				position: request.position
			}
		);
		return data.body;
	}

	private _createReactionGroups() {
		return [
			"THUMBS_UP",
			"THUMBS_DOWN",
			"LAUGH",
			"HOORAY",
			"CONFUSED",
			"HEART",
			"ROCKET",
			"EYES"
		].map(type => {
			return {
				content: type,
				users: {
					nodes: []
				}
			};
		});
	}

	async createCommentReply(request: {
		pullRequestId: string;
		parentId: string;
		commentId: string;
		text: string;
	}): Promise<Directives> {
		// https://docs.github.com/en/rest/reference/pulls#create-a-reply-for-a-review-comment
		const ownerData = await this.getRepoOwnerFromPullRequestId(request.pullRequestId);
		const data = await this.restPost<any, any>(
			`/repos/${ownerData.owner}/${ownerData.name}/pulls/${ownerData.pullRequestNumber}/comments/${request.commentId}/replies`,
			{
				body: request.text
			}
		);
		// GH doesn't provide a way to add comment replies via the graphQL api
		// see https://stackoverflow.com/questions/55708085/is-there-a-way-to-reply-to-pull-request-review-comments-with-the-github-api-v4
		// below, we're crafting a response that looks like what graphQL would give us
		const body = data.body;

		return this.handleResponse(request.pullRequestId, {
			directives: [
				{
					type: "updatePullRequest",
					data: {
						updatedAt: Dates.toUtcIsoNow()
					}
				},
				{
					type: "addLegacyCommentReply",
					data: {
						// this isn't normally part of the response, but it's
						// the databaseId of the parent comment
						_inReplyToId: body.in_reply_to_id,
						author: {
							login: body.user.login,
							avatarUrl: body.user.avatar_url
						},
						authorAssociation: body.author_association,
						body: body.body,
						bodyText: body.body,
						createdAt: body.created_at,
						id: body.node_id,
						replyTo: {
							id: body.node_id
						},
						reactionGroups: this._createReactionGroups(),
						viewerCanUpdate: true,
						viewerCanReact: true,
						viewerCanDelete: true
					}
				}
			]
		});
	}

	async createPullRequestComment(request: {
		pullRequestId: string;
		text: string;
	}): Promise<Directives> {
		// TODO move all that added code into a shared location
		const query = `mutation AddCommentToPullRequest($subjectId:ID!, $body:String!) {
				addComment(input: {subjectId: $subjectId, body:$body}) {
					clientMutationId
					commentEdge {
						node {
						  pullRequest {
							updatedAt
						  }
						}
					  }
				   		timelineEdge {
							node {
								... on IssueComment {
									__typename
									id
									author {
										login
										avatarUrl
									}
									authorAssociation
									body
									bodyText
									bodyHTML
									createdAt
									includesCreatedEdit
									isMinimized
									minimizedReason
									reactionGroups {
										content
										users(first: 1) {
												nodes {
													login
												}
											}
									}
									resourcePath
									viewerCanUpdate
									viewerCanReact
									viewerCanDelete
								}
							}
						}
					}
			  	}`;

		const response = await this.mutate<any>(query, {
			subjectId: request.pullRequestId,
			body: request.text
		});

		// NOTE must use the commentEdge to get the PR
		// and not from the subject, as the subject data is stale
		// at this point

		return this.handleResponse(request.pullRequestId, {
			directives: [
				{
					type: "updatePullRequest",
					data: response.addComment.commentEdge.node.pullRequest
				},
				{
					type: "addNode",
					data: response.addComment.timelineEdge.node
				}
			]
		});
	}

	async createPullRequestInlineComment(request: {
		pullRequestId: string;
		text: string;
		rightSha: string;
		filePath: string;
		startLine: number;
		position?: number;
	}) {
		const result = await this.createCommitComment({
			pullRequestId: request.pullRequestId,
			sha: request.rightSha,
			text: request.text || "",
			path: request.filePath,
			startLine: request.startLine,
			position: request.position
		});

		return result;
	}

	async createPullRequestInlineReviewComment(request: {
		pullRequestId: string;
		text: string;
		filePath: string;
		position: number;
	}) {
		const result = await this.createPullRequestReviewComment({
			pullRequestId: request.pullRequestId,
			text: request.text || "",
			filePath: request.filePath,
			position: request.position
		});

		return result;
	}

	async deletePullRequestComment(request: {
		id: string;
		pullRequestId: string;
		type: "ISSUE_COMMENT" | "REVIEW_COMMENT";
	}): Promise<Directives | undefined> {
		const method =
			request.type === "ISSUE_COMMENT" ? "deleteIssueComment" : "deletePullRequestReviewComment";

		const query = `mutation DeleteCommentFromPullRequest($id: ID!) {
				${method}(input: {id: $id}) {
				  clientMutationId
				}
			  }`;

		await this.mutate<any>(query, {
			id: request.id
		});

		const directives = [
			{
				type: "updatePullRequest",
				data: {
					updatedAt: Dates.toUtcIsoNow()
				}
			}
		] as any;
		if (request.type === "REVIEW_COMMENT") {
			directives.push({
				type: "removeComment",
				data: {
					id: request.id
				}
			});
			const ownerData = await this.getRepoOwnerFromPullRequestId(request.pullRequestId);
			const pendingReviews = await this.fetchPendingReviews(ownerData);
			const viewerId = pendingReviews?.viewer?.id;
			const myPendingReview = pendingReviews?.repository?.pullRequest?.reviews?.nodes.find(
				(_: any) => _.author.id === viewerId
			);
			if (!myPendingReview) {
				directives.push({
					type: "removePendingReview",
					data: null
				});
			} else {
				directives.push({
					type: "updateReviewCommentsCount",
					data: myPendingReview
				});
			}
		} else {
			directives.push({
				type: "removeNode",
				data: {
					id: request.id
				}
			});
		}
		this.updateCache(request.pullRequestId, {
			directives: directives
		});

		this.session.agent.sendNotification(DidChangePullRequestCommentsNotificationType, {
			pullRequestId: request.pullRequestId,
			commentId: request.id
		});

		return {
			directives: directives
		};
	}

	_pullRequestIdCache: Map<
		string,
		{
			pullRequestNumber: number;
			name: string;
			owner: string;
		}
	> = new Map<
		string,
		{
			pullRequestNumber: number;
			name: string;
			owner: string;
		}
	>();

	async getRepoOwnerFromPullRequestId(
		pullRequestId: string
	): Promise<{
		pullRequestNumber: number;
		name: string;
		owner: string;
	}> {
		if (this._pullRequestIdCache.has(pullRequestId)) {
			return this._pullRequestIdCache.get(pullRequestId)!;
		}

		const query = `query GetRepoIdFromPullRequestId($id: [ID!]!) {
			rateLimit {
				limit
				cost
				remaining
				resetAt
			}
			nodes(ids: $id) {
			  ... on PullRequest {
				number
				repository {
				  name
				  owner {
					login
				  }
				}
			  }
			}
		  }`;
		const response = await this.query<any>(query, {
			id: pullRequestId
		});

		const data = {
			pullRequestNumber: response.nodes[0].number,
			name: response.nodes[0].repository.name,
			owner: response.nodes[0].repository.owner.login
		};
		this._pullRequestIdCache.set(pullRequestId, data);

		return data;
	}

	async getPullRequestNumber(id: string) {
		if (this._pullRequestIdCache.has(id)) {
			return this._pullRequestIdCache.get(id)?.pullRequestNumber!;
		}
		const query = `query getNode($id: ID!) {
			rateLimit {
				limit
				cost
				remaining
				resetAt
			}
			node(id: $id) {
			 ... on PullRequest {
				number
			  }
			}
		  }`;
		const response = await this.query<any>(query, {
			id: id
		});
		return response.node.number;
	}

	async getPullRequestMetadata(
		id: string
	): Promise<{
		number: number;
		milestone: { id: string };
		projectCards: {
			id: string;
			project: {
				id: string;
				name: string;
			};
		}[];
	}> {
		const query = `query($id:ID!){
			rateLimit {
			  limit
			  cost
			  remaining
			  resetAt
			}
			node(id: $id) {
			  ... on PullRequest {
				number
				projectCards(first: 25) {
				  nodes {
					id
					project {
					  id
					  name
					}
				  }
				}
				milestone {
				  id
				}
			  }
			}
		  }
		  `;
		const response = await this.query<any>(query, {
			id: id
		});
		return {
			number: response.node.number,
			milestone: response.node.milestone,
			projectCards:
				response.node.projectCards && response.node.projectCards.nodes
					? response.node.projectCards.nodes
					: []
		};
	}

	async getPullRequestFilesChanged(request: {
		pullRequestId: string;
	}): Promise<FetchThirdPartyPullRequestFilesResponse[]> {
		const ownerData = await this.getRepoOwnerFromPullRequestId(request.pullRequestId);

		// https://developer.github.com/v3/pulls/#list-pull-requests-files
		const changedFiles: FetchThirdPartyPullRequestFilesResponse[] = [];
		try {
			let url:
				| string
				| undefined = `/repos/${ownerData.owner}/${ownerData.name}/pulls/${ownerData.pullRequestNumber}/files`;
			do {
				const apiResponse = await this.restGet<
					{
						sha: string;
						filename: string;
						previous_filename?: string;
						status: string;
						additions: number;
						changes: number;
						deletions: number;
						patch?: string;
					}[]
				>(url);
				changedFiles.push(
					...apiResponse.body.map(_ => {
						const previousFilename = _.previous_filename;
						delete _.previous_filename;
						return {
							..._,
							previousFilename: previousFilename
						};
					})
				);
				url = this.nextPage(apiResponse.response);
			} while (url);
		} catch (err) {
			Logger.error(err);
			debugger;
		}

		return changedFiles;
	}

	_timelineQueryItemsString!: string;
	get getTimelineQueryItemsString() {
		if (this._timelineQueryItemsString) return this._timelineQueryItemsString;

		// NOTE, all of the commented out timeline items below are ones
		// we do not currently show in the UI
		const items = [
			// 	`... on AddedToProjectEvent {
			// 	__typename
			//   }`,
			`... on AssignedEvent {
			__typename
			id
			actor {
			  login
			  avatarUrl
			}
			createdAt
			assignee {
			  ... on User {
				id
				email
				login
			  }
			}
		  }`,
			// 	`... on AutomaticBaseChangeFailedEvent {
			// 	__typename
			//   }`,
			// 	`... on AutomaticBaseChangeSucceededEvent {
			// 	__typename
			//   }`,
			// 	`... on BaseRefChangedEvent {
			// 	__typename
			//   }`,
			`... on BaseRefForcePushedEvent {
			__typename
			id
			actor {
			  login
			  avatarUrl
			}
			beforeCommit {
			  abbreviatedOid
			}
			afterCommit {
			  abbreviatedOid
			}
			createdAt
			ref {
			  name
			}
		  }`,
			`... on ClosedEvent {
			__typename
			id
			actor {
			  login
			  avatarUrl
			}
			createdAt
		  }`,
			// 	`... on CommentDeletedEvent {
			// 	__typename
			// 	actor {
			// 	  login
			// 	  avatarUrl
			// 	}
			//   }`,
			// 	`... on ConnectedEvent {
			// 	__typename
			//   }`,
			this._transform(`[... on ConvertToDraftEvent {
				__typename
				id
				createdAt
				actor {
				  login
				  avatarUrl
				}
			  }:>=2.21.0]`),
			// 	`... on ConvertedNoteToIssueEvent {
			// 	__typename
			// 	id
			//   }`,
			// 	`... on CrossReferencedEvent {
			// 	__typename
			// 	id
			// 	actor {
			// 	  login
			// 	  avatarUrl
			// 	}
			//   }`,
			`... on DemilestonedEvent {
			__typename
			id
			actor {
			  login
			  avatarUrl
			  resourcePath
			  url
			}
			milestoneTitle
			createdAt
		  }`,
			// 	`... on DeployedEvent {
			// 	__typename
			// 	id
			//   }`,
			// 	`... on DeploymentEnvironmentChangedEvent {
			// 	__typename
			// 	id
			//   }`,
			// 	`... on DisconnectedEvent {
			// 	__typename
			// 	id
			//   }`,
			`... on HeadRefDeletedEvent {
			__typename
			id
			actor {
			  login
			  avatarUrl
			}
		  }`,
			`... on HeadRefForcePushedEvent {
			__typename
			id
			actor {
			  login
			  avatarUrl
			}
			beforeCommit {
			  abbreviatedOid
			}
			afterCommit {
			  abbreviatedOid
			}
			createdAt
			ref {
			  name
			}
		  }`,
			// 	`... on HeadRefRestoredEvent {
			// 	__typename
			//   }`,
			`... on IssueComment {
			__typename
			id
			author {
			  login
			  avatarUrl
			}
			authorAssociation
			body
			bodyText
			bodyHTML
			createdAt
			includesCreatedEdit
			isMinimized
			minimizedReason
			reactionGroups {
			  content
			  users(first: 10) {
				nodes {
				  login
				}
			  }
			}
			resourcePath
			viewerCanUpdate
			viewerCanReact
			viewerCanDelete
		}`,
			`... on LabeledEvent {
			__typename
			id
			label {
			  name
			  description
			  color
			}
			actor {
			  login
			  avatarUrl
			}
			createdAt
		  }`,
			`... on LockedEvent {
			__typename
			id
			actor {
			  login
			  avatarUrl
			}
			lockReason
			createdAt
		  }`,
			`... on MarkedAsDuplicateEvent {
			__typename
			id
		  }`,
			`... on MentionedEvent {
			__typename
			id
			actor {
			  login
			  avatarUrl
			}
			createdAt
		  }`,
			`... on MergedEvent {
			__typename
			id
			actor {
			  login
			  avatarUrl
			}
			mergeRefName
			createdAt
			commit {
			  abbreviatedOid
			}
		  }`,
			`... on MilestonedEvent {
			__typename
			id
			actor {
			  login
			  avatarUrl
			  resourcePath
			  url
			}
			createdAt
			milestoneTitle
		  }`,
			// 	`... on MovedColumnsInProjectEvent {
			// 	__typename
			//   }`,
			// 	`... on PinnedEvent {
			// 	__typename
			//   }`,
			`... on PullRequestCommit {
			__typename
			id
			commit {
			  changedFiles
			  author {
				avatarUrl
				name
				user {
				  login
				}
			  }
			  committer {
				avatarUrl
				name
				user {
				  login
				}
			  }
			  id
			  message
			  messageBody
			  messageHeadline
			  messageHeadlineHTML
			  messageBodyHTML
			  abbreviatedOid
			  authoredDate
			  ${this._transform(`[statusCheckRollup {
			  	state
			  }:>=3.0.0]`)}
			}
		  }`,
			// 	`... on PullRequestCommitCommentThread {
			// 	__typename
			//   }`,
			`... on PullRequestReview {
			__typename
			id
			author {
			  login
			  avatarUrl
			}
			authorAssociation
			body
			bodyText
			bodyHTML
			createdAt
			databaseId
			includesCreatedEdit
			lastEditedAt
			state
			viewerDidAuthor
			viewerCanUpdate
			viewerCanReact
			viewerCanDelete
			reactionGroups {
				content
				users(first: 10) {
				  nodes {
					login
				  }
				}
			  }
		 	resourcePath
			comments(first: 15) {
			  nodes {
				author {
				  login
				  avatarUrl
				}
				authorAssociation
				body
				bodyText
				bodyHTML
				createdAt
				databaseId
				draftedAt
				diffHunk
				id
				includesCreatedEdit
				isMinimized
				lastEditedAt
				minimizedReason
				publishedAt
				state
				replyTo {
				  diffHunk
				  id
				  body
				  bodyText
				  bodyHTML
				}
				commit {
				  message
				  messageBody
				  messageHeadline
				  oid
				}
				editor {
				  login
				  avatarUrl
				}
				outdated
				path
				position
				pullRequestReview {
				  body
				  bodyText
				  bodyHTML
				}
				reactionGroups {
				  content
				  users(first: 10) {
					nodes {
					  login
					}
				  }
				}
				resourcePath
				viewerCanUpdate
				viewerCanReact
				viewerCanDelete
			  }
			}
			authorAssociation
			bodyHTML
		  }`,
			// 	`... on PullRequestReviewThread {
			// 	__typename
			//   }`,
			`... on PullRequestRevisionMarker {
			__typename
			createdAt
			pullRequest {
			  state
			}
			lastSeenCommit {
			  abbreviatedOid
			  status {
				state
			  }
			}
		  }`,
			this._transform(`[... on ReadyForReviewEvent {
			__typename
			id
			createdAt
			actor {
			  login
			  avatarUrl
			}
		  }:>=2.21.0]`),
			`... on ReferencedEvent {
			__typename
			id
			actor {
			  login
			  avatarUrl
			}
			commit {
			  messageBody
			  messageHeadline
			  status {
				state
			  }
			  oid
			  abbreviatedOid
			  author {
				avatarUrl
				name
				user {
				  login
				}
			  }
			  committer {
				avatarUrl
				name
				user {
				  login
				}
			  }
			}
		  }`,
			// 	`... on RemovedFromProjectEvent {
			// 	__typename
			//   }`,
			`... on RenamedTitleEvent {
			__typename
			id
			actor {
			  login
			  avatarUrl
			}
			currentTitle
			previousTitle
			createdAt
		  }`,
			`... on ReopenedEvent {
			__typename
			id
			actor {
			  login
			  avatarUrl
			}
			createdAt
		  }`,
			`... on ReviewDismissedEvent {
			__typename
			id
			actor {
				login
				avatarUrl
			}
			dismissalMessage
			review {
			  author {
				login
			  }
			}
		  }`,
			// 	`... on ReviewRequestRemovedEvent {
			// 	__typename
			//   }`,
			`... on ReviewRequestedEvent {
			__typename
			id
			actor {
			  login
			  avatarUrl
			}
			createdAt
			requestedReviewer {
				... on User {
					id
					login
					avatarUrl
				}
			}
		  }`,
			// 	`... on SubscribedEvent {
			// 	__typename
			//   }`,
			// 	`... on TransferredEvent {
			// 	__typename
			//   }`,
			`... on UnassignedEvent {
			__typename
			id
			actor {
			  login
			  avatarUrl
			}
			createdAt
			assignee {
			  ... on User {
				id
				email
				login
			  }
			}
		  }`,
			`... on UnlabeledEvent {
			__typename
			id
			label {
			  color
			  name
			  description
			}
			actor {
			  login
			  avatarUrl
			}
			createdAt
		  }`,
			`... on UnlockedEvent {
			__typename
			id
			actor {
			  login
			  avatarUrl
			}
			createdAt
		  }`
			// 	`... on UnmarkedAsDuplicateEvent {
			// 	__typename
			//   }`,
			// 	`... on UnpinnedEvent {
			// 	__typename
			//   }`,
			// 	`... on UnsubscribedEvent {
			// 	__typename
			//   }`,
			// 	`... on UserBlockedEvent {
			// 	__typename
			//   }`
		];

		this._timelineQueryItemsString = items.join("\n");
		return this._timelineQueryItemsString;
	}

	async pullRequestTimelineQuery(
		owner: string,
		repo: string,
		pullRequestNumber: number,
		cursor?: string
	): Promise<FetchThirdPartyPullRequestResponse | undefined> {
		const cc = Logger.getCorrelationContext();

		// If we are or will be over the rate limit, wait until it gets reset
		if (
			this._prTimelineQueryRateLimit !== undefined &&
			this._prTimelineQueryRateLimit.remaining - this._prTimelineQueryRateLimit.cost < 0
		) {
			// TODO: Probably should send a notification to the webview here

			// If we are currently paging, just give up and return what we have
			if (cursor === undefined) return undefined;

			await Functions.wait(this._prTimelineQueryRateLimit.resetAt.getTime() - new Date().getTime());
		}

		// TODO: Need to page if there are more than 100 review threads
		try {
			const query = `query pr($owner:String!, $name:String!, $pullRequestNumber:Int!${
				cursor ? ", $cursor:String" : ""
			}) {
				rateLimit {
				  limit
				  cost
				  remaining
				  resetAt
				}
				viewer {
				  id
				  login
				  avatarUrl
				}
				repository(name:$name, owner:$owner) {
				  id
				  url
				  resourcePath
				  pullRequest(number:$pullRequestNumber) {
					id
					repository {
						name
  						nameWithOwner
  						url
					}
					body
					bodyHTML
					baseRefName
					baseRefOid
					author {
					  login
					  avatarUrl
					}
					authorAssociation
					createdAt
					activeLockReason
					includesCreatedEdit
					${this._transform(`
					[isDraft:>=2.21.0]
					[reviewDecision:>=2.21.0]
					`)}
					locked
					resourcePath
					viewerSubscription
					viewerDidAuthor
					viewerCanUpdate
					reviewThreads(first: 50) {
						edges {
						  node {
							id
							isResolved
							viewerCanResolve
							viewerCanUnresolve
							comments(first: 50) {
							  totalCount
							  nodes {
								author {
								  login
								  avatarUrl
								}
								authorAssociation
								body
								bodyHTML
								createdAt
								id
								includesCreatedEdit
								isMinimized
								minimizedReason
								outdated
								replyTo {
								  id
								}
								resourcePath
								reactionGroups {
								  content
								  users(first: 10) {
								    nodes {
									  login
									}
								  }
								}
								viewerCanUpdate
								viewerCanReact
								viewerCanDelete
							  }
							}
						  }
						}
					}
					headRefName
					headRepositoryOwner {
						login
					}
					headRepository {
						isFork
						name
						url
					}
					headRefOid
					labels(first: 10) {
					  nodes {
						color
						description
						name
						id
					  }
					}
					number
					state
					reactionGroups {
					  content
					  users(first: 10) {
						nodes {
						  login
						}
					  }
					}
					... on PullRequest {
					  reviewRequests(first: 10) {
						nodes {
						  requestedReviewer {
							... on User {
							  id
							  login
							  avatarUrl
							}
						  }
						}
					  }
					  reviews(first: 50) {
						nodes {
						  id
						  databaseId
						  createdAt
						  comments(first:100) {
							totalCount
						  }
						  author {
							login
							avatarUrl
							... on User {
								id
							}
						  }
						  authorAssociation
						  state
						  commit {
						  	oid
						  }
						}
					  }
					}
					timelineItems(first:150 ${cursor ? `,after:$cursor` : ""}) {
					  totalCount
					  pageInfo {
						startCursor
						endCursor
						hasNextPage
					  }
					  __typename
					  nodes {
						  ${this.getTimelineQueryItemsString}
					  }
					}
					milestone {
					  title
					  state
					  number
					  id
					  description
					}
					participants(first: 10) {
					  nodes {
						login
						avatarUrl(size: 20)
					  }
					}
					assignees(first: 10) {
					  nodes {
						bio
						avatarUrl(size: 20)
						id
						name
						login
					  }
					}
					projectCards(first: 10) {
					  nodes {
						id
						note
						state
						project {
						  name
						  id
						}
					  }
					}
					mergeable
					merged
					mergedAt
					canBeRebased
					mergeStateStatus
					title
					url
					updatedAt
				  }
				  rebaseMergeAllowed
				  squashMergeAllowed
				  mergeCommitAllowed
				  ${this._transform(`
				  [viewerDefaultMergeMethod:>=3.0.0]				  
				  `)}				   
				  viewerPermission
				  branchProtectionRules(first:100) {
				  	nodes {
				  		requiredApprovingReviewCount
				  		matchingRefs(first:100) {
				  			nodes {
				  				name
				  			}
				  		}
				  	}
				  }
				}
			  }`;
			const response = (await this.query<any>(query, {
				owner: owner,
				name: repo,
				pullRequestNumber: pullRequestNumber,
				cursor: cursor
			})) as FetchThirdPartyPullRequestResponse;
			if (response.rateLimit) {
				this._prTimelineQueryRateLimit = {
					cost: response.rateLimit.cost,
					limit: response.rateLimit.limit,
					remaining: response.rateLimit.remaining,
					resetAt: new Date(response.rateLimit.resetAt)
				};
			}

			this.mapPullRequestModel(response);

			Logger.debug(
				`pullRequestTimelineQuery rateLimit=${JSON.stringify(response.rateLimit)} cursor=${cursor}`
			);
			return response;
		} catch (ex) {
			Logger.error(ex, cc);

			// If we are currently paging, just give up and return what we have
			if (cursor !== undefined) return undefined;

			throw ex;
		}
	}

	async getPullRequestCommits(
		request: FetchThirdPartyPullRequestCommitsRequest
	): Promise<FetchThirdPartyPullRequestCommitsResponse> {
		const data = await this.getRepoOwnerFromPullRequestId(request.pullRequestId);
		const pullRequestNumber = await this.getPullRequestNumber(request.pullRequestId);

		const query = await this.query<any>(
			`query pr($owner:String!, $name:String!, $pullRequestNumber:Int!) {
				  rateLimit {
					limit
					cost
					remaining
					resetAt
				  }
				  repository(name: $name, owner: $owner) {
					id
					pullRequest(number: $pullRequestNumber) {
					  id
					  repository {
						name
						nameWithOwner
						url
					  }
					  commits(first: 250) {
						totalCount
						nodes {
						  commit {
							abbreviatedOid
							author {
							  avatarUrl(size: 20)
							  name
							  user {
								login
							  }
							}
							committer {
							  avatarUrl(size: 20)
							  name
							  user {
								login
							  }
							}
							message
							authoredDate
							oid
						  }
						}
					  }
					}
				  }
				}`,
			{
				owner: data.owner,
				name: data.name,
				pullRequestNumber
			}
		);
		return query.repository.pullRequest.commits.nodes.map((_: any) => _.commit);
	}

	async prQuery(
		owner: string,
		repo: string,
		cursor?: string
	): Promise<GitHubPullRequests | undefined> {
		const cc = Logger.getCorrelationContext();

		// If we are or will be over the rate limit, wait until it gets reset
		if (
			this._prQueryRateLimit !== undefined &&
			this._prQueryRateLimit.remaining - this._prQueryRateLimit.cost < 0
		) {
			// TODO: Probably should send a notification to the webview here

			// If we are currently paging, just give up and return what we have
			if (cursor === undefined) return undefined;

			await Functions.wait(this._prQueryRateLimit.resetAt.getTime() - new Date().getTime());
		}

		// TODO: Need to page if there are more than 100 review threads
		try {
			const query = `query pr($owner:String!, $repo:String!${cursor ? `, $cursor:String` : ""}) {
				repository(name: $repo, owner: $owner) {
					pullRequests(states: [OPEN, MERGED], first: 100, orderBy: { field: UPDATED_AT, direction: DESC }${
						cursor ? `, after: $cursor` : ""
					}) {
						totalCount
						pageInfo {
							startCursor
							endCursor
							hasNextPage
						}
						nodes {
							id
							title
							number
							url
							state
							baseRefName
							headRefName
							reviewThreads(first: 100) {
								totalCount
								pageInfo {
									startCursor
									endCursor
									hasNextPage
								}
								nodes {
									id
									isResolved
									comments(first: 1) {
										totalCount
										nodes {
											author {
												login
											}
											authorAssociation
											body
											bodyText
											bodyHTML
											createdAt
											url
											path
											commit {
												oid
											}
											originalCommit {
												oid
											}
											originalPosition
											diffHunk
											position
											outdated
											state
										}
									}
								}
							}
						}
					}
				},
				rateLimit {
					limit
					cost
					remaining
					resetAt
				}
			}`;

			const response = await this.query<GetPullRequestsResponse>(query, {
				owner: owner,
				repo: repo,
				cursor: cursor
			});

			if (response.rateLimit) {
				this._prQueryRateLimit = {
					cost: response.rateLimit.cost,
					limit: response.rateLimit.limit,
					remaining: response.rateLimit.remaining,
					resetAt: new Date(response.rateLimit.resetAt)
				};
			}

			return response.repository.pullRequests;
		} catch (ex) {
			Logger.error(ex, cc);

			// If we are currently paging, just give up and return what we have
			if (cursor !== undefined) return undefined;

			throw ex;
		}
	}

	// protected async handleErrorResponse(response: Response): Promise<Error> {
	// 	const ex = await super.handleErrorResponse(response);
	// 	this.trySetThirdPartyProviderInfo(ex);
	// 	return ex;
	// }

	private handleResponse(pullRequestId: string, directives: Directives) {
		this.updateCache(pullRequestId, directives);

		return directives;
	}

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
			if (directive.type === "addReaction") {
				if (directive.data.subject.__typename === "PullRequest") {
					pr.reactionGroups
						.find((_: any) => _.content === directive.data.reaction.content)
						.users.nodes.push(directive.data.reaction.user);
				} else {
					const node = pr.timelineItems.nodes.find(_ => _.id === directive.data.subject.id);
					if (node) {
						node.reactionGroups
							.find((_: any) => _.content === directive.data.reaction.content)
							.users.nodes.push(directive.data.reaction.user);
					}
				}
			} else if (directive.type === "removeReaction") {
				if (directive.data.subject.__typename === "PullRequest") {
					pr.reactionGroups.find(
						(_: any) => _.content === directive.data.reaction.content
					).users.nodes = pr.reactionGroups
						.find((_: any) => _.content === directive.data.reaction.content)
						.users.nodes.filter((_: any) => _.login !== directive.data.reaction.user.login);
				} else {
					const node = pr.timelineItems.nodes.find(_ => _.id === directive.data.subject.id);
					if (node) {
						node.reactionGroups.find(
							(_: any) => _.content === directive.data.reaction.content
						).users.nodes = node.reactionGroups
							.find((_: any) => _.content === directive.data.reaction.content)
							.users.nodes.filter((_: any) => _.login !== directive.data.reaction.user.login);
					}
				}
			} else if (directive.type === "removeComment") {
				for (const node of pr.timelineItems.nodes) {
					if (node.comments?.nodes?.length) {
						node.comments.nodes = node.comments.nodes.filter(
							(_: any) => _.id !== directive.data.id
						);
						for (const comments of node.comments.nodes) {
							if (comments.replies) {
								comments.replies = comments.replies.filter((_: any) => _.id !== directive.data.id);
							}
						}
					}
				}
			} else if (directive.type === "removePullRequestReview") {
				if (directive.data.id) {
					pr.reviews.nodes = pr.reviews.nodes.filter(_ => _.id !== directive.data.id);
					pr.timelineItems.nodes = pr.timelineItems.nodes.filter(_ => _.id !== directive.data.id);
				}
			} else if (directive.type === "removeNode") {
				pr.timelineItems.nodes = pr.timelineItems.nodes.filter(_ => _.id !== directive.data.id);
			} else if (directive.type === "updateNode") {
				const node = pr.timelineItems.nodes.find(_ => _.id === directive.data.id);
				if (node) {
					for (const key in directive.data) {
						node[key] = directive.data[key];
					}
				}
			} else if (directive.type === "addNode") {
				if (!directive.data.id) continue;
				const node = pr.timelineItems.nodes.find(_ => _.id === directive.data.id);
				if (!node) {
					pr.timelineItems.nodes.push(directive.data);
				}
			} else if (directive.type === "addNodes") {
				for (const newNode of directive.data) {
					if (!newNode.id) continue;
					const node = pr.timelineItems.nodes.find((_: any) => _.id === newNode.id);
					if (!node) {
						pr.timelineItems.nodes.push(newNode);
					}
				}
			} else if (directive.type === "addReviewCommentNodes") {
				for (const newNode of directive.data) {
					if (!newNode.id) continue;
					const node = pr.timelineItems.nodes.find((_: any) => _.id === newNode.id);
					if (node) {
						for (const c of newNode.comments.nodes) {
							if (node.comments.nodes.find((_: any) => _.id === c.id) == null) {
								node.comments.nodes.push(c);
							}
						}
					} else {
						pr.timelineItems.nodes.push(newNode);
					}
				}
			} else if (directive.type === "addLegacyCommentReply") {
				for (const node of pr.timelineItems.nodes) {
					if (!node.comments) continue;
					for (const comment of node.comments.nodes) {
						if (directive.data._inReplyToId === comment.databaseId) {
							if (!comment.replies) comment.replies = [];
							comment.replies.push(directive.data);
							break;
						}
					}
				}
			} else if (directive.type === "removePendingReview") {
				pr.pendingReview = undefined;
			} else if (directive.type === "removeRequestedReviewer") {
				if (pr.reviewRequests?.nodes) {
					pr.reviewRequests.nodes = pr.reviewRequests.nodes.filter(
						_ => _.requestedReviewer?.login !== directive.data.login
					);
				}
			} else if (directive.type === "addReview") {
				if (!directive.data) continue;
				if (pr.reviews.nodes.find(_ => _.id === directive.data.id) == null) {
					pr.reviews.nodes.push(directive.data);
				}
			} else if (directive.type === "updateReviewCommentsCount") {
				if (!directive.data) continue;
				if (pr.pendingReview && pr.pendingReview.comments) {
					pr.pendingReview.comments.totalCount = directive.data.comments.totalCount;
				}
			} else if (directive.type === "addReviewThreads") {
				if (!directive.data) continue;
				for (const d of directive.data) {
					if (pr.reviewThreads.edges.find(_ => _.node.id === d.node.id) == null) {
						pr.reviewThreads.edges.push(d);
					}
				}
			} else if (directive.type === "updatePullRequestReviewThreadComment") {
				let done = false;
				for (const edge of pr.reviewThreads.edges) {
					if (!edge.node.comments) continue;

					for (const comment of edge.node.comments.nodes) {
						if (comment.id === directive.data.id) {
							for (const key in directive.data) {
								(comment as any)[key] = directive.data[key];
							}
							done = true;
						}
						if (done) break;
					}
					if (done) break;
				}
			} else if (directive.type === "updatePullRequestReviewCommentNode") {
				const node = pr.timelineItems.nodes.find(_ => _.id === directive.data.pullRequestReview.id);
				if (node && node.comments) {
					for (const comment of node.comments.nodes) {
						if (comment.id !== directive.data.id) continue;

						for (const key in directive.data) {
							comment[key] = directive.data[key];
						}
						break;
					}
				}
			} else if (directive.type === "reviewSubmitted") {
				const node = pr.timelineItems.nodes.find(_ => _.id === directive.data.pullRequestReview.id);
				if (node) {
					for (const key of Object.keys(directive.data.updates)) {
						node[key] = directive.data.updates[key];
					}

					if (node.comments) {
						for (const comment of directive.data.comments) {
							const existingComment = node.comments.nodes.find((_: any) => _.id === comment.id);
							if (existingComment) {
								existingComment.state = comment.state;
							}
						}
					}
				}
			} else if (directive.type === "updatePullRequestReview") {
				const node = pr.timelineItems.nodes.find(_ => _.id === directive.data.id);
				if (node) {
					for (const key in directive.data) {
						node[key] = directive.data[key];
					}
				}
			} else if (directive.type === "updatePullRequestReviewers") {
				pr.reviewRequests.nodes.length = 0;
				for (const data of directive.data) {
					pr.reviewRequests.nodes.push(data);
				}
			} else if (directive.type === "updatePullRequest") {
				for (const key in directive.data) {
					if (directive.data[key] && Array.isArray(directive.data[key].nodes)) {
						// clear out the array, but keep its reference
						(pr as any)[key].nodes.length = 0;
						for (const n of directive.data[key].nodes) {
							(pr as any)[key].nodes.push(n);
						}
					} else {
						(pr as any)[key] = directive.data[key];
					}
				}
			} else if (directive.type === "updateReview") {
				if (!pr.reviews?.nodes) {
					pr.reviews.nodes = [];
				}
				if (pr.reviews.nodes) {
					pr.reviews.nodes = pr.reviews.nodes.filter(_ => _.id !== directive.data.id);
					pr.reviews.nodes.push(directive.data);
				}
			} else if (directive.type === "updateReviewThreads") {
				if (pr.reviewThreads) {
					for (const d of directive.data) {
						const found = pr.reviewThreads.edges.find(_ => _.node.id === d.node.id);
						if (found) {
							found.node.viewerCanResolve = d.node.viewerCanResolve;
						}
					}
				}
			} else if (
				directive.type === "resolveReviewThread" ||
				directive.type === "unresolveReviewThread"
			) {
				const nodeWrapper = pr.reviewThreads.edges.find(_ => _.node.id === directive.data.threadId);
				if (nodeWrapper && nodeWrapper.node) {
					for (const key in directive.data) {
						(nodeWrapper.node as any)[key] = directive.data[key];
					}
				}

				const reviews = pr.timelineItems.nodes.filter(_ => _.__typename === "PullRequestReview");
				if (reviews) {
					for (const review of reviews) {
						for (const comment of review.comments.nodes) {
							if (comment.threadId !== directive.data.threadId) continue;

							for (const key in directive.data) {
								comment[key] = directive.data[key];
							}

							break;
						}
					}
				}
			}
		}
	}
}

interface GitHubPullRequest {
	title: string;
	number: number;
	id: string;
	url: string;
	state: string;
	baseRefName: string;
	headRefName: string;
	reviewThreads: {
		totalCount: number;
		pageInfo: {
			startCursor: string;
			endCursor: string;
			hasNextPage: boolean;
		};
		nodes: {
			id: string;
			isResolved: boolean;
			viewerCanResolve: boolean;
			viewerCanUnresolve: boolean;
			comments: {
				totalCount: number;
				nodes: {
					author: {
						login: string;
					};
					bodyText: string;
					createdAt: string;
					url: string;
					path: string;
					commit: {
						oid: string;
					};
					originalCommit: {
						oid: string;
					};
					originalPosition: number;
					diffHunk: string;
					position: number | null;
					outdated: boolean;
				}[];
			};
		}[];
	};
}

interface GitHubPullRequests {
	totalCount: number;
	pageInfo: {
		startCursor: string;
		endCursor: string;
		hasNextPage: boolean;
	};
	nodes: GitHubPullRequest[];
}

interface GetPullRequestsResponse {
	repository: {
		pullRequests: GitHubPullRequests;
	};
	rateLimit: {
		limit: number;
		cost: number;
		remaining: number;
		resetAt: string;
	};
}

interface GitHubCreatePullRequestResponse {
	createPullRequest: {
		pullRequest: {
			number: number;
			title: string;
			url: string;
			id: string;
		};
	};
}
