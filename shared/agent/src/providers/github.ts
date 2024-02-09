"use strict";
import { performance } from "perf_hooks";
import * as qs from "querystring";

import { GraphQLClient } from "graphql-request";
import { isEmpty as _isEmpty } from "lodash";
import { Headers, Response } from "undici";
import { URI } from "vscode-uri";
import {
	CreateThirdPartyCardRequest,
	FetchThirdPartyBoardsRequest,
	FetchThirdPartyBoardsResponse,
	FetchThirdPartyCardsRequest,
	FetchThirdPartyCardsResponse,
	FetchThirdPartyCardWorkflowRequest,
	FetchThirdPartyCardWorkflowResponse,
	GitHubBoard,
	GitHubCreateCardRequest,
	GitHubCreateCardResponse,
	GitHubUser,
	Labels,
	MoveThirdPartyCardRequest,
	MoveThirdPartyCardResponse,
	ProviderConfigurationData,
	ProviderGetForkedReposResponse,
	ReportingMessageType,
	ThirdPartyDisconnect,
	ThirdPartyProviderCard,
	ThirdPartyProviderConfig,
} from "@codestream/protocols/agent";
import { CSGitHubProviderInfo } from "@codestream/protocols/api";

import { CodeStreamSession } from "session";
import { InternalError, ReportSuppressedMessages } from "../agentError";
import { Container } from "../container";
import { GitRemoteLike } from "../git/models/remote";
import { toRepoName } from "../git/utils";
import { Logger } from "../logger";
import { log, lspProvider } from "../system";
import { customFetch } from "../system/fetchCore";
import { TraceLevel } from "../types";
import {
	ApiResponse,
	getOpenedRepos,
	getRemotePaths,
	ThirdPartyProviderSupportsIssues,
} from "./provider";
import { QueryLogger, RateLimit } from "./queryLogger";
import { ThirdPartyIssueProviderBase } from "./thirdPartyIssueProviderBase";
import { ProviderVersion } from "./types";

interface GitHubRepo {
	id: string;
	full_name: string;
	path: string;
	has_issues: boolean;
}

type ReviewState = "PENDING" | "APPROVED" | "CHANGES_REQUESTED" | "DISMISSED" | "COMMENTED";

interface GithubSelfResponse {
	viewer: {
		login: string;
	};
}

interface PRResponse {
	viewer: {
		id: string;
		login: string;
	};
	search: {
		edges: {
			node: {
				id: string;
				createdAt: number;
				url: string;
				title: string;
				closed: boolean;
				merged: boolean;
				viewerDidAuthor: boolean;
				viewerLatestReviewRequest?: {
					asCodeOwner: boolean;
					requestedReviewer?: {
						login?: string;
						id?: string;
					};
				};
				reviews: {
					nodes: {
						createdAt: string;
						state: ReviewState;
						author: {
							login: string;
						};
					}[];
				};
				baseRefName: string;
				headRefName: string;
				author: {
					login: string;
					avatarUrl: string;
				};
				body: string;
				bodyText: string;
				number: number;
				updatedAt: string;
				state: string;
				lastEditedAt: string;
				labels: Labels;
				headRepository?: {
					name: string;
					nameWithOwner: string;
				};
				isDraft?: boolean;
			};
		}[];
	};
}

const diffHunkRegex = /^@@ -([\d]+)(?:,([\d]+))? \+([\d]+)(?:,([\d]+))? @@/;

@lspProvider("github")
export class GitHubProvider
	extends ThirdPartyIssueProviderBase<CSGitHubProviderInfo>
	implements ThirdPartyProviderSupportsIssues
{
	constructor(
		public readonly session: CodeStreamSession,
		protected readonly providerConfig: ThirdPartyProviderConfig
	) {
		super(session, providerConfig);
	}

	_queryLogger: QueryLogger = {
		graphQlApi: { fns: {} },
		restApi: { rateLimits: {}, fns: {} },
	};

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
	private _reviewersCache: Map<
		{ owner: string; repo: string },
		{ avatarUrl: string; id: string; login: string; name?: string }[]
	> = new Map();
	private _githubLoginCache = new Map<string, string>();

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
			Accept: "application/vnd.github.v3+json, application/vnd.github.inertia-preview+json",
		};
	}

	get graphQlBaseUrl() {
		return `${this.baseUrl}/graphql`;
	}

	protected async client(): Promise<GraphQLClient> {
		if (this._client === undefined) {
			const options = {
				agent: this._httpsAgent ?? undefined,
				fetch: customFetch,
			};
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
			Accept: "application/vnd.github.merge-info-preview+json",
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
		this._githubLoginCache.clear();
		this._knownRepos.clear();
		this._reviewersCache.clear();
		return super.onDisconnected(request);
	}

	async ensureInitialized() {}

	async verifyConnection(config: ProviderConfigurationData): Promise<void> {
		await this.restGet<GitHubUser>("/user");
	}

	protected async getVersion(): Promise<ProviderVersion> {
		try {
			if (this._version == null) {
				// GitHub cloud doesn't report their version via the api.
				// Instead, use a large major number so we don't fall into any bad
				// paths when using the semver package
				this._version = {
					version: "999.0.0",
					asArray: [999, 0, 0],
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

	async query<T = any>(query: string, variables: any = undefined): Promise<T> {
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
					Logger.debug("GH rateLimit", response.rateLimit);
					this._queryLogger.graphQlApi.rateLimit = {
						remaining: response.rateLimit.remaining,
						resetAt: response.rateLimit.resetAt,
						resetInMinutes: Math.floor(
							(new Date(new Date(response.rateLimit.resetAt).toString()).getTime() -
								new Date().getTime()) /
								1000 /
								60
						),
					};
					const e = new Error();
					if (e.stack) {
						let functionName = "unknown";
						try {
							const filtered = e.stack
								.split("\n")
								.filter(
									_ =>
										(_.includes("GitHubProvider") || _.includes("GitHubEnterpriseProvider")) &&
										!_.includes(".query")
								);
							if (!_isEmpty(filtered)) {
								const match = filtered[0].match(/GitHub(Enterprise)?Provider\.(\w+)/);
								if (match && match.length > 2) {
									functionName = match[2];
								}
							}
						} catch (err) {
							Logger.warn(err.message);
						}
						this._queryLogger.graphQlApi.rateLimit.last = {
							name: functionName,
							cost: response.rateLimit.cost,
						};
						if (!this._queryLogger.graphQlApi.fns[functionName]) {
							this._queryLogger.graphQlApi.fns[functionName] = {
								count: 1,
								cumulativeCost: response.rateLimit.cost,
								averageCost: response.rateLimit.cost,
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
		const rateLimitHeaders = this._getRestRateLimitHeaders(response.response.headers);
		if (rateLimitHeaders) {
			this._traceRestRateLimits(rateLimitHeaders, "restGet");
		}

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

	_getRestRateLimitHeaders(headers: Headers): RateLimit | null {
		try {
			const rateLimit = parseInt(headers.get("x-ratelimit-limit")!, 10);
			const rateLimitUsed = parseInt(headers.get("x-ratelimit-used")!, 10);
			const rateLimitRemaining = parseInt(headers.get("x-ratelimit-remaining")!, 10);
			const rateLimitResetTime = new Date(parseInt(headers.get("x-ratelimit-reset")!, 10) * 1000);
			const rateLimitResource = headers.get("x-ratelimit-resource")!;

			return {
				rateLimit,
				rateLimitUsed,
				rateLimitRemaining,
				rateLimitResetTime,
				rateLimitResource,
			};
		} catch (e) {
			Logger.warn("Error getting rate limit stats", e);
		}
		return null;
	}

	_traceRestRateLimits(rateLimitHeaders: RateLimit, httpMethod: "restPost" | "restGet") {
		const { rateLimitResource, rateLimitResetTime, rateLimitRemaining, rateLimit } =
			rateLimitHeaders;
		Logger.log(
			`${rateLimitResource} limit used ${rateLimitRemaining} of ${rateLimit}, reset at ${rateLimitResetTime}`
		);
		try {
			this._queryLogger.restApi.rateLimits[rateLimitResource] = rateLimitHeaders;
			const e = new Error();
			if (e.stack) {
				let functionName;
				try {
					functionName = e.stack
						.split("\n")
						.filter(
							_ =>
								_.indexOf("GitHubProvider") > -1 &&
								_.indexOf(`GitHubProvider.${httpMethod}`) === -1 &&
								_.indexOf("_traceRestRateLimits") === -1
						)![0]
						.match(/GitHubProvider\.(\w+)/)![1];
				} catch (ex) {
					functionName = "unknown";
				}

				if (!this._queryLogger.restApi.fns[functionName]) {
					this._queryLogger.restApi.fns[functionName] = {
						count: 1,
						averageCost: 0,
						cumulativeCost: 0,
					};
				} else {
					const existing = this._queryLogger.restApi.fns[functionName];
					existing.count++;
					this._queryLogger.restApi.fns[functionName] = existing;
				}
			}
			const remainingPercent =
				(rateLimitHeaders.rateLimitRemaining / rateLimitHeaders.rateLimit) * 100;
			if (rateLimitHeaders.rateLimitRemaining === 0) {
				Container.instance().errorReporter.reportMessage({
					type: ReportingMessageType.Error,
					source: "agent",
					message: "GH rate limit exceeded",
					extra: {
						stats: this._queryLogger,
					},
				});
			} else if (Logger.level === TraceLevel.Debug || remainingPercent < 15) {
				Logger.log(JSON.stringify(this._queryLogger, null, 2));
			}
		} catch (err) {
			console.warn(err);
		}
	}

	async restGet<T extends object>(url: string) {
		const response = await this.get<T>(url);

		const rateLimitHeaders = this._getRestRateLimitHeaders(response.response.headers);
		if (rateLimitHeaders) {
			this._traceRestRateLimits(rateLimitHeaders, "restGet");
		}

		return response;
	}

	canConfigure() {
		return true;
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
				path: r.path,
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
							apiIdentifier: repo.full_name,
						};
					})
			);
		}

		return {
			boards,
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

		const filter = request.customFilter || "archived:false is:issue is:open assignee:@me";

		try {
			const url = `/search/issues?${qs.stringify({ q: filter, sort: "updated" })}`;
			const result = await this.restGet<any>(url);
			const items = result.body.items;
			const cards: ThirdPartyProviderCard[] = items.map((card: any) => {
				return {
					id: card.id,
					url: card.html_url,
					title: card.title,
					modifiedAt: new Date(card.updated_at).getTime(),
					tokenId: card.number,
					idBoard: card.repository ? card.repository.id : "",
					comments: card.comments,
					body: card.body,
				};
			});
			return { cards };
		} catch (e) {
			Logger.log("Error from GitHub: ", JSON.stringify(e, null, 4));
			return { cards: [] };
		}
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
				assignees: (data.assignees! || []).map(a => a.login),
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
					avatarUrl: u.avatar_url,
				})),
			};
		} catch (ex) {
			// can't get assignable users for repos you don't have access to
			Logger.warn(ex);
		}
		return {
			users: [],
		};
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
					name: name,
				}
			);

			// if this is a fork, get the forks of the parent
			if (response.repository.parent && !recurseFailsafe) {
				Logger.log("Getting parent forked repos");
				const result = await this.getForkedRepos({ remote: response.repository.parent.url }, true);
				return {
					parent: result.parent,
					forks: result.forks,
					self: { ...response.repository, owner: owner },
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
				self: response.repository,
			};
		} catch (ex) {
			return this.handleProviderError(ex, request);
		}
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

	private _isMatchingRemotePredicate = (r: GitRemoteLike) => r.domain === "github.com";

	getIsMatchingRemotePredicate() {
		return this._isMatchingRemotePredicate;
	}

	protected async getMe() {
		return "@me";
	}
}
