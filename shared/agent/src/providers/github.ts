"use strict";
import * as fs from "fs";
import { GitRemoteLike, GitRepository } from "git/gitService";
import { GraphQLClient } from "graphql-request";
import { Response } from "node-fetch";
import * as paths from "path";
import * as qs from "querystring";
import { CodeStreamSession } from "session";
import { URI } from "vscode-uri";
import { InternalError, ReportSuppressedMessages } from "../agentError";
import { SessionContainer } from "../container";
import { Logger, TraceLevel } from "../logger";
import {
	CreateThirdPartyCardRequest,
	DidChangePullRequestCommentsNotificationType,
	DocumentMarker,
	EnterpriseConfigurationData,
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
	ThirdPartyDisconnect,
	ThirdPartyProviderCard,
	ThirdPartyProviderConfig
} from "../protocol/agent.protocol";

import semver from "semver";
import { CSGitHubProviderInfo, CSRepository } from "../protocol/api.protocol";
import { Arrays, Functions, log, lspProvider, Strings } from "../system";
import {
	getOpenedRepos,
	getRemotePaths,
	ProviderCreatePullRequestRequest,
	ProviderCreatePullRequestResponse,
	ProviderGetForkedReposResponse,
	ProviderGetRepoInfoResponse,
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

enum GitHubExceptionType {
	Unknown = "UNKNOWN",
	Credentials = "CREDENTIALS",
	Connection = "CONNECTION"
};

interface Directives {
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

	private _knownRepos = new Map<string, GitHubRepo>();
	_pullRequestCache: Map<string, FetchThirdPartyPullRequestResponse> = new Map();

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

	/**
	 * The version of the GitHub api... note this is only set for enterprise
	 *
	 * @protected
	 * @type {(string | undefined)}
	 * @memberof GitHubProvider
	 */
	protected _version: string | undefined;

	protected _client: GraphQLClient | undefined;
	protected async client(): Promise<GraphQLClient> {
		if (this._client === undefined) {
			this._client = new GraphQLClient(this.graphQlBaseUrl);
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

	async onConnected() {
		this._knownRepos = new Map<string, GitHubRepo>();
	}

	@log()
	async onDisconnected(request?: ThirdPartyDisconnect) {
		// delete the graphql client so it will be reconstructed if a new token is applied
		delete this._client;
		super.onDisconnected(request);
	}

	async ensureInitialized() {}

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

	_isKnownException (ex: any): GitHubExceptionType {
		if ((
			ex.message &&
			ex.message.match(/reason: connect ECONNREFUSED/)
		) ||
		(
			ex.message &&
			ex.message.match(/reason: getaddrinfo ENOTFOUND/)
		) ||
		(
			ex.message &&
			ex.message.match(/GraphQL Error \(Code: 404\)/)
		) ||
		(
			this.providerConfig.id === "github/enterprise" &&
			ex.response &&
			ex.response.error &&
			ex.response.error.toLowerCase().indexOf("cookies must be enabled to use github") > -1
		)) {
			return GitHubExceptionType.Connection
		} else if ((
			ex.response &&
			ex.response.message === "Bad credentials"
		) ||
		(
			ex.response &&
			ex.response.errors instanceof Array &&
			ex.response.errors.find((e: any) => e.type === "FORBIDDEN")
		)) {
			return GitHubExceptionType.Credentials;
		} else {
			return GitHubExceptionType.Unknown;
		}
	}

	async query<T = any>(query: string, variables: any = undefined) {
		if (this._providerInfo && this._providerInfo.tokenError) {
			delete this._client;
			throw new InternalError(ReportSuppressedMessages.AccessTokenInvalid);
		}

		let response;
		try {
			response = await (await this.client()).request<any>(query, variables);
		} catch (ex) {
			const exType = this._isKnownException(ex);
			if (exType !== GitHubExceptionType.Unknown) {
				// we know about this error, and we want to give the user a chance to correct it
				// (but throwing up a banner), rather than logging the error to sentry
				this.session.api.setThirdPartyProviderInfo({
					providerId: this.providerConfig.id,
					data: {
						tokenError: {
							error: ex,
							occurredAt: Date.now(),
							isConnectionError: exType === GitHubExceptionType.Connection
						}
					}
				});
				delete this._client;
				throw new InternalError(ReportSuppressedMessages.AccessTokenInvalid, { error: ex });
			} else {
				// this is an unexpected error, throw the exception normally
				throw ex;
			}
		}

		try {
			if (Logger.level === TraceLevel.Debug && response && response.rateLimit) {
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
							.match(/GitHubProvider\.(\w+)/)![1];
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

				Logger.log(JSON.stringify(this._queryLogger, null, 4));
			}
		} catch (err) {
			Logger.warn(err);
		}

		return response;
	}

	async mutate<T>(query: string, variables: any = undefined) {
		const response = await (await this.client()).request<T>(query, variables);
		if (Logger.level === TraceLevel.Debug) {
			try {
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
									_.indexOf(".mutate") === -1
							)![0]
							.match(/GitHubProvider\.(\w+)/)![1];
					} catch (err) {
						Logger.warn(err);
						functionName = "unknown";
					}
					if (!this._queryLogger.graphQlApi.rateLimit) {
						this._queryLogger.graphQlApi.rateLimit = {
							remaining: -1,
							resetAt: "",
							resetInMinutes: -1
						};
					}
					this._queryLogger.graphQlApi.rateLimit.last = {
						name: functionName,
						// mutate costs are 1
						cost: 1
					};
					if (!this._queryLogger.graphQlApi.fns[functionName]) {
						this._queryLogger.graphQlApi.fns[functionName] = {
							count: 1
						};
					} else {
						const existing = this._queryLogger.graphQlApi.fns[functionName];
						existing.count++;

						this._queryLogger.graphQlApi.fns[functionName] = existing;
					}
				}

				Logger.log(JSON.stringify(this._queryLogger, null, 4));
			} catch (err) {
				Logger.warn(err);
			}
		}
		return response;
	}

	async restPost<T extends object, R extends object>(url: string, variables: any) {
		const response = await this.post<T, R>(url, variables);
		if (
			response &&
			response.response &&
			response.response.headers &&
			Logger.level === TraceLevel.Debug
		) {
			try {
				const rateLimit: any = {};
				["limit", "remaining", "used", "reset"].forEach(key => {
					try {
						rateLimit[key] = parseInt(
							response.response.headers.get(`x-ratelimit-${key}`) as string,
							10
						);
					} catch (e) {
						Logger.warn(e);
					}
				});

				this._queryLogger.restApi.rateLimit = rateLimit;

				const e = new Error();
				if (e.stack) {
					let functionName;
					try {
						functionName = e.stack
							.split("\n")
							.filter(
								_ => _.indexOf("GitHubProvider") > -1 && _.indexOf("GitHubProvider.restPost") === -1
							)![0]
							.match(/GitHubProvider\.(\w+)/)![1];
					} catch (ex) {
						functionName = "unknown";
					}

					if (!this._queryLogger.restApi.fns[functionName]) {
						this._queryLogger.restApi.fns[functionName] = {
							count: 1
						};
					} else {
						const existing = this._queryLogger.restApi.fns[functionName];
						existing.count++;
						this._queryLogger.restApi.fns[functionName] = existing;
					}
				}

				Logger.log(JSON.stringify(this._queryLogger, null, 4));
			} catch (err) {
				console.warn(err);
			}
		}

		return response;
	}

	async restGet<T extends object>(url: string) {
		const response = await this.get<T>(url);
		if (
			response &&
			response.response &&
			response.response.headers &&
			Logger.level === TraceLevel.Debug
		) {
			try {
				const rateLimit: any = {};
				["limit", "remaining", "used", "reset"].forEach(key => {
					try {
						rateLimit[key] = parseInt(
							response.response.headers.get(`x-ratelimit-${key}`) as string,
							10
						);
					} catch (e) {
						Logger.warn(e);
					}
				});

				this._queryLogger.restApi.rateLimit = rateLimit;

				const e = new Error();
				if (e.stack) {
					let functionName;
					try {
						functionName = e.stack
							.split("\n")
							.filter(
								_ => _.indexOf("GitHubProvider") > -1 && _.indexOf("GitHubProvider.restGet") === -1
							)![0]
							.match(/GitHubProvider\.(\w+)/)![1];
					} catch (ex) {
						functionName = "unknown";
					}

					if (!this._queryLogger.restApi.fns[functionName]) {
						this._queryLogger.restApi.fns[functionName] = {
							count: 1
						};
					} else {
						const existing = this._queryLogger.restApi.fns[functionName];
						existing.count++;
						this._queryLogger.restApi.fns[functionName] = existing;
					}
				}

				Logger.log(JSON.stringify(this._queryLogger, null, 4));
			} catch (err) {
				console.warn(err);
			}
		}

		return response;
	}

	@log()
	async configure(request: EnterpriseConfigurationData) {
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
				_.remotes.some(r => r.normalizedUrl && repoUrl.indexOf(r.normalizedUrl.toLowerCase()) > -1)
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
						console.error(`Could not find repo for repoName=${repoName} repoUrl=${repoUrl}`);
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
		const { scm: scmManager } = SessionContainer.instance();
		await this.ensureConnected();

		if (request.force) {
			this._pullRequestCache.delete(request.pullRequestId);
		} else {
			const cached = this._pullRequestCache.get(request.pullRequestId);
			if (cached) {
				return cached;
			}
		}

		let response = {} as FetchThirdPartyPullRequestResponse;
		let repoOwner: string;
		let repoName: string;
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
						timelineQueryResponse.repository.pullRequest &&
						timelineQueryResponse.repository.pullRequest.timelineItems.pageInfo &&
						timelineQueryResponse.repository.pullRequest.timelineItems.pageInfo.endCursor
				);
				if (timelineQueryResponse === undefined) break;
				response = timelineQueryResponse;

				allTimelineItems = allTimelineItems.concat(
					timelineQueryResponse.repository.pullRequest.timelineItems.nodes
				);
			} while (timelineQueryResponse.repository.pullRequest.timelineItems.pageInfo.hasNextPage);
		} catch (ex) {
			Logger.error(ex);
		}
		if (response?.repository?.pullRequest) {
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
		}
		if (response?.repository?.pullRequest?.timelineItems != null) {
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

		this._pullRequestCache.set(request.pullRequestId, response);
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
	getPullRequestDocumentMarkers({
		uri,
		repoId,
		streamId
	}: {
		uri: URI;
		repoId: string | undefined;
		streamId: string;
	}): Promise<DocumentMarker[]> {
		return super.getPullRequestDocumentMarkersCore({ uri, repoId, streamId });
	}

	@log()
	async createPullRequest(
		request: ProviderCreatePullRequestRequest
	): Promise<ProviderCreatePullRequestResponse | undefined> {
		try {
			void (await this.ensureConnected());

			if (!(await this.isPRApiCompatible())) {
				return {
					error: {
						type: "UNKNOWN",
						message: "PR Api is not compatible"
					}
				};
			}

			let repositoryId = "";
			if (request.providerRepositoryId) {
				repositoryId = request.providerRepositoryId;
			} else {
				const repoInfo = await this.getRepoInfo({ remote: request.remote });
				if (repoInfo && repoInfo.id) {
					repositoryId = repoInfo.id;
				} else {
					return {
						error: repoInfo.error
					};
				}
			}

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
					headRefName: request.headRefName,
					body: this.createDescription(request)
				}
			);
			const pullRequest = createPullRequestResponse.createPullRequest.pullRequest;
			const title = `#${pullRequest.number} ${pullRequest.title}`;
			return {
				url: pullRequest.url,
				id: pullRequest.id,
				title: title
			};
		} catch (ex) {
			Logger.error(ex, "GitHub: createPullRequest", {
				remote: request.remote,
				baseRefName: request.baseRefName,
				headRefName: request.headRefName
			});
			let errorMessage =
				ex.response && ex.response.errors ? ex.response.errors[0].message : "Unknown error";
			errorMessage = `GitHub: ${errorMessage}`;
			return {
				error: {
					type: "PROVIDER",
					message: errorMessage
				}
			};
		}
	}

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
				   		defaultBranchRef {
							name
				   		}
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
			return {
				id: response.repository.id,
				defaultBranch: response.repository.defaultBranchRef.name,
				pullRequests: response.repository.pullRequests.nodes
			};
		} catch (ex) {
			Logger.error(ex, "GitHub: getRepoInfo", {
				remote: request.remote
			});
			let errorMessage =
				ex.response && ex.response.errors ? ex.response.errors[0].message : "Unknown GitHub error";
			errorMessage = `GitHub: ${errorMessage}`;
			return {
				error: {
					type: "PROVIDER",
					message: errorMessage
				}
			};
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
						parent {
							id
							nameWithOwner
						}
						defaultBranchRef {
							name
						}
						refs(first: 100, refPrefix: "refs/heads/") {
						   nodes {
							 name
							 target {
							   ... on Commit {
								 oid
								 committedDate
							   }
							 }
						   }
						}
					    forks(first: 50, orderBy: {field: CREATED_AT, direction: DESC}) {
							totalCount
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
									  target {
										... on Commit {
										  oid
										  committedDate
										}
									  }
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
				const result = await this.getForkedRepos(
					// this use of "example.com" is just to provide the URL parser something to parse
					{ remote: "https://example.com/" + response.repository.parent.nameWithOwner },
					true
				);
				return {
					parent: result.parent,
					forks: result.forks
				};
			}

			const forks = response.repository.forks.nodes.sort((a: any, b: any) => {
				if (b.nameWithOwner < a.nameWithOwner) return 1;
				if (a.nameWithOwner < b.nameWithOwner) return -1;
				return 0;
			});
			return {
				parent: response.repository,
				forks
			};
		} catch (ex) {
			Logger.error(ex, "GitHub: getRepoInfo", {
				remote: request.remote
			});
			let errorMessage =
				ex.response && ex.response.errors ? ex.response.errors[0].message : "Unknown GitHub error";
			errorMessage = `GitHub: ${errorMessage}`;
			return {
				error: {
					type: "PROVIDER",
					message: errorMessage
				}
			};
		}
	}

	protected getOwnerFromRemote(remote: string): { owner: string; name: string } {
		// HACKitude yeah, sorry
		const uri = URI.parse(remote);
		const split = uri.path.split("/");
		const owner = split[1];
		const name = split[2].replace(".git", "");
		return {
			owner,
			name
		};
	}

	private _commentsByRepoAndPath = new Map<
		string,
		{ expiresAt: number; comments: Promise<PullRequestComment[]> }
	>();
	private _prsByRepo = new Map<string, { expiresAt: number; prs: Promise<GitHubPullRequest[]> }>();

	private _isMatchingRemotePredicate = (r: GitRemoteLike) => r.domain === "github.com";
	getIsMatchingRemotePredicate() {
		return this._isMatchingRemotePredicate;
	}

	@log()
	protected async getCommentsForPath(
		filePath: string,
		repo: GitRepository
	): Promise<PullRequestComment[] | undefined> {
		const cc = Logger.getCorrelationContext();

		try {
			const relativePath = Strings.normalizePath(paths.relative(repo.path, filePath));
			const cacheKey = `${repo.path}|${relativePath}`;

			const cachedComments = this._commentsByRepoAndPath.get(cacheKey);
			if (cachedComments !== undefined && cachedComments.expiresAt > new Date().getTime()) {
				// NOTE: Keep this await here, so any errors are caught here
				return await cachedComments.comments;
			}

			const remotePath = await getRemotePaths(
				repo,
				this.getIsMatchingRemotePredicate(),
				this._knownRepos
			);

			const commentsPromise: Promise<PullRequestComment[]> =
				remotePath != null
					? this._getCommentsForPathCore(filePath, relativePath, remotePath, repo.path)
					: Promise.resolve([]);
			this._commentsByRepoAndPath.set(cacheKey, {
				expiresAt: new Date().setMinutes(new Date().getMinutes() + REFRESH_TIMEOUT),
				comments: commentsPromise
			});

			// Since we aren't cached, we want to just kick of the request to get the comments (which will fire a notification)
			// This could probably be enhanced to wait for the commentsPromise for a short period of time (maybe 1s?) to see if it will complete, to avoid the notification roundtrip for fast requests
			return undefined;
		} catch (ex) {
			Logger.error(ex, cc);
			return undefined;
		}
	}

	private async _getCommentsForPathCore(
		filePath: string,
		relativePath: string,
		remotePaths: string[],
		repoPath: string
	): Promise<PullRequestComment[]> {
		let prs: GitHubPullRequest[];

		const cachedPRs = this._prsByRepo.get(repoPath);

		if (cachedPRs !== undefined && cachedPRs.expiresAt > new Date().getTime()) {
			prs = await cachedPRs.prs;
		} else {
			const prsPromise = this._getPullRequests(remotePaths);
			this._prsByRepo.set(repoPath, {
				expiresAt: new Date().setMinutes(new Date().getMinutes() + REFRESH_TIMEOUT),
				prs: prsPromise
			});

			prs = await prsPromise;
		}

		const comments: PullRequestComment[] = [];

		for (const pr of prs) {
			if (pr.reviewThreads.totalCount === 0) continue;

			let comment: PullRequestComment;
			let prComment;
			for (const rt of pr.reviewThreads.nodes) {
				if (rt.comments.totalCount === 0) continue;

				prComment = rt.comments.nodes[0];
				if (prComment.path !== relativePath) continue;

				comment = {
					id: rt.id,
					author: {
						id: prComment.author.login,
						nickname: prComment.author.login
					},
					path: prComment.path,
					text: prComment.bodyText,
					code: "",
					commit: prComment.outdated ? prComment.originalCommit.oid : prComment.commit.oid,
					originalCommit: prComment.originalCommit.oid,
					line: prComment.position || prComment.originalPosition,
					originalLine: prComment.originalPosition,
					url: prComment.url,
					createdAt: new Date(prComment.createdAt).getTime(),
					pullRequest: {
						id: pr.number,
						title: pr.title,
						externalId: pr.id,
						url: pr.url,
						isOpen: pr.state === "OPEN",
						targetBranch: pr.baseRefName,
						sourceBranch: pr.headRefName
					},
					diffHunk: prComment.diffHunk,
					outdated: prComment.outdated
				};

				const diffLines = comment.diffHunk!.split("\n");
				// Get rid of the hunk header
				diffLines.shift();

				// Since we can't trust the positions from GitHub, we "calc" them by counting the number of original/new lines in the diff hunk
				// Because the diff hunk that GitHub returns always ends at the commented on line
				const originalPosition =
					Arrays.count(diffLines, l => l.startsWith("-") || l.startsWith(" ")) - 1;
				const position = Arrays.count(diffLines, l => l.startsWith("+") || l.startsWith(" ")) - 1;

				// Get the code from the diff hunk
				comment.code = diffLines[diffLines.length - 1] || "";
				if (comment.code) {
					// Strip off the diff hunk +/-
					comment.code = comment.code.substr(1);
				}

				// Since the provided line numbers are offsets in the diff hunk, add the diff hunk line to the offset line
				const match = diffHunkRegex.exec(comment.diffHunk!);
				if (match == null) continue;

				const [, originalLine, , line] = match;

				comment.originalLine! = Number(originalLine) + originalPosition;
				comment.line = Number(line) + position;

				comments.push(comment);
			}
		}

		// If we have any comments, fire a notification
		if (comments.length !== 0) {
			SessionContainer.instance().documentMarkers.fireDidChangeDocumentMarkers(
				URI.file(filePath).toString(),
				"codemarks"
			);
		}

		return comments;
	}

	private async _getPullRequests(remotePaths: string[]) {
		const prs = [];

		for (const remotePath of remotePaths) {
			try {
				const [owner, repo] = remotePath.split("/");
				let response;
				do {
					response = await this.prQuery(owner, repo, response && response.pageInfo.endCursor);
					if (response === undefined) break;

					prs.push(...response.nodes);
				} while (response.pageInfo.hasNextPage);
			} catch (ex) {
				Logger.error(ex);
			}
		}

		return prs;
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
		const query = await this.query<any>(
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
		return query.repository.labels.nodes;
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
		const query = await this.query<any>(
			`query FindReviewers($owner:String!, $name:String!)  {
				rateLimit {
					cost
					resetAt
					remaining
					limit
				}
				repository(owner:$owner, name:$name) {
				  id
				  collaborators(first: 50) {
					nodes {
					  avatarUrl
					  id
					  name
					  login
					}
				  }
				}
			  }`,
			{
				owner: request.owner,
				name: request.repo
			}
		);

		return query.repository.collaborators.nodes;
	}

	async markPullRequestReadyForReview(request: {
		pullRequestId: string;
		isReady: boolean;
	}): Promise<Directives | undefined> {
		if (request.isReady) {
			const query = `mutation MarkPullRequestReadyForReview($pullRequestId:ID!) {
				markPullRequestReadyForReview(input: {pullRequestId: $pullRequestId}) {
					  clientMutationId
					  pullRequest{
						isDraft
						updatedAt
						state
					  }
					}
				  }`;

			const response = await this.mutate<any>(query, {
				pullRequestId: request.pullRequestId
			});
			return {
				directives: [
					{ type: "updatePullRequest", data: response.markPullRequestReadyForReview.pullRequest }
				]
			};
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

		return {
			directives: [
				{ type: "updatePullRequest", data: { labels: response[method].labelable.labels } },
				{ type: "addNode", data: response[method].labelable.timelineItems.nodes[0] }
			]
		};
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
		return {
			directives: [
				{
					type: "updatePullRequest",
					data: { assignees: response[method].assignable.assignees }
				},
				{
					type: "addNode",
					data: response[method].assignable.timelineItems.nodes[0]
				}
			]
		};
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

		return {
			directives: [
				{
					type: request.onOff ? "addReaction" : "removeReaction",
					data: response[method]
				}
			]
		};
	}

	async updatePullRequestSubscription(request: {
		pullRequestId: string;
		onOff: boolean;
	}): Promise<Directives> {
		const query = `mutation UpdateSubscription($subscribableId:ID!, $state:SubscriptionState!) {
			updateSubscription(input: {subscribableId: $subscribableId, state:$state}) {
				  clientMutationId
				   subscribable {
					... on PullRequest {
						id
						viewerSubscription
						}
					}
				}
			  }`;

		const response = await this.mutate<any>(query, {
			subscribableId: request.pullRequestId,
			state: request.onOff ? "SUBSCRIBED" : "UNSUBSCRIBED"
		});
		return {
			directives: [
				{ type: "updatePullRequest", data: response.updateSubscription.subscribable.pullRequest }
			]
		};
	}

	async updateIssueComment(request: { id: string; body: string }): Promise<Directives> {
		const query = `mutation UpdateComment($id:ID!, $body:String!) {
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
			  }`;

		const response = await this.mutate<any>(query, {
			id: request.id,
			body: request.body
		});

		return {
			directives: [
				{
					type: "updateNode",
					data: response.updateIssueComment.issueComment
				}
			]
		};
	}

	async updateReviewComment(request: { id: string; body: string }): Promise<Directives> {
		const query = `mutation UpdateComment($pullRequestReviewCommentId: ID!, $body: String!) {
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
		  `;

		const response = await this.mutate<any>(query, {
			pullRequestReviewCommentId: request.id,
			body: request.body
		});
		return {
			directives: [
				{
					type: "updatePullRequestReviewComment",
					data: response.updatePullRequestReviewComment.pullRequestReviewComment
				},
				{
					type: "updatePullRequestReviewCommentNode",
					data: response.updatePullRequestReviewComment.pullRequestReviewComment
				}
			]
		};
	}

	async updateReview(request: { id: string; body: string }): Promise<Directives> {
		const query = `mutation UpdateComment($pullRequestReviewId:ID!, $body:String!) {
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
			  }`;

		const response = await this.mutate<any>(query, {
			pullRequestReviewId: request.id,
			body: request.body
		});
		return {
			directives: [
				{
					type: "updatePullRequestReview",
					data: response.updatePullRequestReview.pullRequestReview
				}
			]
		};
	}

	async updatePullRequestBody(request: { id: string; body: string }): Promise<Directives> {
		const query = `mutation UpdateComment($pullRequestId:ID!, $body:String!) {
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
			  }`;

		const response = await this.mutate<any>(query, {
			pullRequestId: request.id,
			body: request.body
		});
		return {
			directives: [{ type: "updatePullRequest", data: response.updatePullRequest.pullRequest }]
		};
	}

	async addPullRequestReview(request: {
		pullRequestId: string;
	}): Promise<{
		addPullRequestReview: {
			pullRequestReview: {
				id: string;
			};
		};
	}> {
		// TODO add directives
		const query = `
		mutation AddPullRequestReview($pullRequestId:ID!) {
		addPullRequestReview(input: {pullRequestId: $pullRequestId}) {
			clientMutationId
			pullRequestReview {
			  id
			}
		  }
		}`;
		const response = await this.mutate<any>(query, {
			pullRequestId: request.pullRequestId
		});
		return response;
	}

	/**
	 * Returns the reviewId (if it exists) for the specificed pull request (there can only be 1 review per pull request per user)
	 * @param request
	 */
	async getPullRequestReviewId(request: { pullRequestId: string }) {
		const metaData = await this.getRepoOwnerFromPullRequestId(request.pullRequestId);
		const query = `query GetPullRequestReviewId($owner:String!, $name:String!, $pullRequestNumber:Int!) {
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
		  `;
		const response = await this.query<any>(query, metaData);
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
	}) {
		let query;
		if (request.pullRequestReviewId) {
			query = `mutation AddPullRequestReviewComment($text:String!, $pullRequestId:ID!, $pullRequestReviewId:ID!, $filePath:String, $position:Int) {
					addPullRequestReviewComment(input: {body:$text, pullRequestId:$pullRequestId, pullRequestReviewId:$pullRequestReviewId, path:$filePath, position:$position}) {
					  clientMutationId
					}
				  }
				  `;
		} else {
			request.pullRequestReviewId = await this.getPullRequestReviewId(request);
			if (!request.pullRequestReviewId) {
				const result = await this.addPullRequestReview(request);
				if (result?.addPullRequestReview?.pullRequestReview?.id) {
					request.pullRequestReviewId = result.addPullRequestReview.pullRequestReview.id;
				}
			}
			query = `mutation AddPullRequestReviewComment($text:String!, $pullRequestId:ID!, $filePath:String, $position:Int) {
					addPullRequestReviewComment(input: {body:$text, pullRequestId:$pullRequestId, path:$filePath, position:$position}) {
					  clientMutationId
					}
				  }
				  `;
		}

		const response = await this.mutate<any>(query, request);

		this._pullRequestCache.delete(request.pullRequestId);
		this.session.agent.sendNotification(DidChangePullRequestCommentsNotificationType, {
			pullRequestId: request.pullRequestId,
			filePath: request.filePath
		});

		return response;
	}

	async deletePullRequestReview(request: { pullRequestId: string; pullRequestReviewId: string }) {
		const query = `mutation DeletePullRequestReview($pullRequestReviewId:ID!) {
			deletePullRequestReview(input: {pullRequestReviewId: $pullRequestReviewId}){
			  clientMutationId
			}
		  }
		  `;
		const response = await this.mutate<any>(query, {
			pullRequestReviewId: request.pullRequestReviewId
		});

		this._pullRequestCache.delete(request.pullRequestId);
		this.session.agent.sendNotification(DidChangePullRequestCommentsNotificationType, {
			pullRequestId: request.pullRequestId
		});

		return response;
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
	}) {
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

		const existingReview = await this.getPendingReview(request);
		if (!existingReview) {
			void (await this.mutate<any>(
				`mutation AddPullRequestReview($pullRequestId:ID!) {
					addPullRequestReview(input: {pullRequestId: $pullRequestId, body: ""}) {
						clientMutationId
					}
			  	}`,
				{
					pullRequestId: request.pullRequestId
				}
			));
		}
		const query = `mutation SubmitPullRequestReview($pullRequestId:ID!, $body:String) {
			submitPullRequestReview(input: {event: ${request.eventType}, body: $body, pullRequestId: $pullRequestId}){
			  clientMutationId
			}
		  }
		  `;
		const response = await this.mutate<any>(query, {
			pullRequestId: request.pullRequestId,
			body: request.text
		});

		return response;
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
		const v = this._version;
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
				const { scm, providerRegistry } = SessionContainer.instance();
				const reposResponse = await scm.getRepos({ inEditorOnly: true, includeProviders: true });
				const repos = [];
				if (reposResponse?.repositories) {
					for (const repo of reposResponse.repositories) {
						if (repo.remotes) {
							for (const remote of repo.remotes) {
								const urlToTest = `anything://${remote.domain}/${remote.path}`;
								const results = await providerRegistry.queryThirdParty({ url: urlToTest });
								if (results && results.providerId === this.providerConfig.id) {
									const ownerData = this.getOwnerFromRemote(urlToTest);
									if (ownerData) {
										repos.push(`${ownerData.owner}/${ownerData.name}`);
									}
								}
							}
						}
					}
				}
				if (repos.length) {
					repoQuery = repos.map(_ => `repo:${_}`).join(" ") + " ";
				} else {
					return [];
				}
			} catch (ex) {
				Logger.error(ex);
			}
		}

		const queries = request.queries;
		const buildQuery = (query: string, repoQuery: string) => {
			const limit = query === "recent" ? 5 : 100;
			// recent is kind of a magic string, where we just look
			// for some random PR activity to at least show you
			// something. if you have the repo query checked, and
			// we can query by repo, then use that. otherwise github
			// needs at least one qualifier so we query for PRs
			// that you were the author of
			// https://trello.com/c/XIg6MKWy/4813-add-4th-default-pr-query-recent
			if (query === "recent") {
				if (repoQuery.length > 0) query = "is:pr";
				else query = "is:pr author:@me";
			}
			return `query Search {
			rateLimit {
				limit
				cost
				remaining
				resetAt
			}
			search(query: "${repoQuery}${query}", type: ISSUE, last: ${limit}) {
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
		};
		// NOTE: there is also `reviewed-by` which `review-requested` translates to after the user
		// has started or completed the review.

		// const queries = [
		// 	{ name: "Local PR Branches", query: `is:pr author:@me` },
		// 	{ name: "Waiting on my Review", query: `is:pr review-requested:@me` },
		// 	{ name: "Assigned to Me", query: `is:pr assignee:@me` },
		// 	{ name: "Created by Me", query: `is:pr author:@me` }
		// ];

		// see: https://docs.github.com/en/github/searching-for-information-on-github/searching-issues-and-pull-requests
		const items = await Promise.all(
			queries.map(_ => this.query<any>(buildQuery(_, repoQuery)))
		).catch(ex => {
			Logger.error(ex);
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
						providerId: this.providerConfig?.id,
						createdAt: new Date(pr.createdAt).getTime()
					}));
				if (!queries[index].match(/\bsort:/)) {
					response[index] = response[index].sort(
						(a: { createdAt: number }, b: { createdAt: number }) => b.createdAt - a.createdAt
					);
				}
			}
			// if (item.rateLimit) {
			// 	Logger.debug(`github getMyPullRequests rateLimit=${JSON.stringify(item.rateLimit)}`);
			// }
		});
		// results = _uniqBy(results, (_: { id: string }) => _.id);
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
		Logger.log("Fired off a query: ", JSON.stringify(issueInfo, null, 4));
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
		return {
			directives: [
				{
					type: "updatePullRequest",
					data: { milestone: response.updatePullRequest.pullRequest.milestone }
				},
				{ type: "addNode", data: response.updatePullRequest.pullRequest.timelineItems.nodes[0] }
			]
		};
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
		return {
			directives: [
				{
					type: "updatePullRequest",
					data: { projectCards: response.updatePullRequest.pullRequest.projectCards }
				}
			]
		};
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
		return {
			directives: [
				{
					type: "updatePullRequest",
					data: response.updatePullRequest.pullRequest
				}
			]
		};
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

		return {
			directives: [
				{ type: "updatePullRequest", data: pullRequestData },
				{ type: "addNodes", data: response.mergePullRequest.pullRequest.timelineItems.nodes }
			]
		};
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
					}
				  }
				}
			  }`,
			{
				lockableId: request.pullRequestId,
				lockReason: request.lockReason
			}
		);

		return {
			directives: [
				{
					type: "updatePullRequest",
					data: response.lockLockable.lockedRecord
				}
			]
		};
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
					}
				  }
				}
			  }`,
			{
				pullRequestId: request.pullRequestId
			}
		);

		return {
			directives: [
				{
					type: "updatePullRequest",
					data: response.unlockLockable.unlockedRecord
				}
			]
		};
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
		return {
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
		};
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
		return {
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
		};
	}

	async createPullRequestCommentAndClose(request: {
		pullRequestId: string;
		text: string;
	}): Promise<Directives> {
		const directives: any = [];
		const response = { directives: directives };
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

		return response;
	}

	async createPullRequestCommentAndReopen(request: {
		pullRequestId: string;
		text: string;
	}): Promise<Directives> {
		const directives: any = [];
		const response = { directives: directives };
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

		return response;
	}

	async resolveReviewThread(request: { threadId: string }): Promise<Directives> {
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
		return {
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
		};
	}

	async unresolveReviewThread(request: { threadId: string }): Promise<Directives> {
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
		return {
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
		};
	}

	async addComment(request: { subjectId: string; text: string }) {
		// does not require return directives
		const response = await this.mutate<any>(
			`mutation AddComment($subjectId:ID!,$body:String!) {
				addComment(input: {subjectId:$subjectId, body:$body}) {
				  clientMutationId
				}
			}`,
			{
				subjectId: request.subjectId,
				body: request.text
			}
		);
		return response;
	}

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
	}) {
		// https://github.community/t/feature-commit-comments-for-a-pull-request/13986/9
		const ownerData = await this.getRepoOwnerFromPullRequestId(request.pullRequestId);
		let payload;
		if (this._version && semver.lt(this._version, "2.20.0")) {
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
		const data = await this.restPost<any, any>(
			`/repos/${ownerData.owner}/${ownerData.name}/pulls/${ownerData.pullRequestNumber}/comments`,
			payload
		);

		this._pullRequestCache.delete(request.pullRequestId);
		this.session.agent.sendNotification(DidChangePullRequestCommentsNotificationType, {
			pullRequestId: request.pullRequestId
		});

		return data.body;
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

	async createCommentReply(request: { pullRequestId: string; commentId: string; text: string }) {
		// https://developer.github.com/v3/pulls/comments/#create-a-reply-for-a-review-comment
		const ownerData = await this.getRepoOwnerFromPullRequestId(request.pullRequestId);
		const data = await this.restPost<any, any>(
			`/repos/${ownerData.owner}/${ownerData.name}/pulls/${ownerData.pullRequestNumber}/comments/${request.commentId}/replies`,
			{
				body: request.text
			}
		);
		return data.body;
	}

	async createPullRequestComment(request: {
		pullRequestId: string;
		text: string;
	}): Promise<Directives> {
		// TODO move all that added code into a shared location
		const query = `mutation AddCommentToPullRequest($subjectId:ID!, $body:String!) {
				addComment(input: {subjectId: $subjectId, body:$body}) {
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
			  	}`;

		const response = await this.mutate<any>(query, {
			subjectId: request.pullRequestId,
			body: request.text
		});

		return {
			directives: [
				{
					type: "addNode",
					data: response.addComment.timelineEdge.node
				}
			]
		};
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

		this._pullRequestCache.delete(request.pullRequestId);
		this.session.agent.sendNotification(DidChangePullRequestCommentsNotificationType, {
			pullRequestId: request.pullRequestId,
			commentId: request.id
		});

		if (request.type === "ISSUE_COMMENT") {
			return {
				directives: [
					{
						type: "removeNode",
						data: {
							id: request.id
						}
					}
				]
			};
		}
		// TODO
		return undefined;
		// return {
		// 	directive: "remove",
		// 	data: {
		// 		id: request.id
		// 	}
		// };
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
				const apiResponse = await this.restGet<FetchThirdPartyPullRequestFilesResponse[]>(url);
				changedFiles.push(...apiResponse.body);
				url = this.nextPage(apiResponse.response);
			} while (url);
		} catch (err) {
			Logger.error(err);
			debugger;
		}

		return changedFiles;

		// const data = await this.restGet<any>(
		// 	`/repos/${ownerData.owner}/${ownerData.name}/pulls/${ownerData.pullRequestNumber}/files`
		// );
		// return data.body;

		// const pullRequestReviewId = await this.getPullRequestReviewId(request);
		// return {
		// 	files: data.body,
		// 	context: {
		// 		pullRequest: {
		// 			userCurrentReviewId: pullRequestReviewId
		// 		}
		// 	}
		// };
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
				actor {
				  login
				  avatarUrl
				}
			  }:>2.20.0]`),
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
			// 	`... on ReadyForReviewEvent {
			// 	__typename
			//   }`,
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
					[isDraft:>2.20.0]
					[reviewDecision:>2.20.0]
					`)}
					locked
					resourcePath
					viewerSubscription
					viewerDidAuthor
					viewerCanUpdate
					files(first: 100) {
						totalCount
						nodes {
						  path
						  deletions
						  additions
						}
					}
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
					commits(first: 100) {
						totalCount
					  }
					headRefName
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
			if (
				response.repository.pullRequest.reviews &&
				response.repository.pullRequest.reviews.nodes
			) {
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
