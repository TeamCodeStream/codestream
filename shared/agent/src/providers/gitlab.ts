"use strict";
import { toRepoName } from "../git/utils";
import { GraphQLClient } from "graphql-request";
import { flatten } from "lodash-es";
import { Response } from "node-fetch";
import * as paths from "path";
import * as qs from "querystring";
import { URI } from "vscode-uri";
import { SessionContainer } from "../container";
import { GitRemoteLike } from "../git/models/remote";
import { GitRepository } from "../git/models/repository";
import { Logger, TraceLevel } from "../logger";
import { InternalError, ReportSuppressedMessages } from "../agentError";

import {
	CreateThirdPartyCardRequest,
	DidChangePullRequestCommentsNotificationType,
	DocumentMarker,
	FetchThirdPartyBoardsRequest,
	FetchThirdPartyBoardsResponse,
	FetchThirdPartyCardsRequest,
	FetchThirdPartyCardsResponse,
	GetMyPullRequestsRequest,
	GetMyPullRequestsResponse,
	GitLabBoard,
	GitLabCreateCardRequest,
	GitLabCreateCardResponse,
	MoveThirdPartyCardRequest
} from "../protocol/agent.protocol";
import {
	CodemarkType,
	CSGitLabProviderInfo,
	CSLocationArray,
	CSReferenceLocation
} from "../protocol/api.protocol";
import { log, lspProvider, Strings } from "../system";
import {
	getRemotePaths,
	ProviderCreatePullRequestRequest,
	ProviderCreatePullRequestResponse,
	ProviderGetRepoInfoResponse,
	PullRequestComment,
	REFRESH_TIMEOUT,
	ThirdPartyIssueProviderBase
} from "./provider";
import { Directives } from "./directives";

interface GitLabProject {
	path_with_namespace: any;
	id: string;
	path: string;
	issues_enabled: boolean;
}

interface GitLabUser {
	id: string;
	name: string;
}

@lspProvider("gitlab")
export class GitLabProvider extends ThirdPartyIssueProviderBase<CSGitLabProviderInfo> {
	private _gitlabUserId: string | undefined;
	private _projectsByRemotePath = new Map<string, GitLabProject>();

	get displayName() {
		return "GitLab";
	}

	get name() {
		return "gitlab";
	}

	get headers(): any {
		return {
			Authorization: `Bearer ${this.accessToken}`,
			"Content-Type": "application/json"
		};
	}

	protected getPRExternalContent(comment: PullRequestComment) {
		return {
			provider: {
				name: this.displayName,
				icon: "gitlab",
				id: this.providerConfig.id
			},
			subhead: `#${comment.pullRequest.id}`,
			actions: [
				{
					label: "Open Note",
					uri: comment.url
				},
				{
					label: `Open Merge Request #${comment.pullRequest.id}`,
					uri: comment.pullRequest.url
				}
			]
		};
	}

	async onConnected(providerInfo?: CSGitLabProviderInfo) {
		super.onConnected(providerInfo);
		this._gitlabUserId = await this.getMemberId();
		this._projectsByRemotePath = new Map<string, GitLabProject>();
	}

	@log()
	async getBoards(request: FetchThirdPartyBoardsRequest): Promise<FetchThirdPartyBoardsResponse> {
		await this.ensureConnected();
		const openProjects = await this.getOpenProjectsByRemotePath();

		let boards: GitLabBoard[];
		if (openProjects.size > 0) {
			const gitLabProjects = Array.from(openProjects.values());
			boards = gitLabProjects
				.filter(p => p.issues_enabled)
				.map(p => ({
					id: p.id,
					name: p.path_with_namespace,
					path: p.path,
					singleAssignee: true // gitlab only allows a single assignee per issue (at least it only shows one in the UI)
				}));
		} else {
			let gitLabProjects: { [key: string]: string }[] = [];
			try {
				let apiResponse = await this.get<{ [key: string]: string }[]>(
					`/projects?min_access_level=20&with_issues_enabled=true`
				);
				gitLabProjects = apiResponse.body;

				let nextPage: string | undefined;
				while ((nextPage = this.nextPage(apiResponse.response))) {
					apiResponse = await this.get<{ [key: string]: string }[]>(nextPage);
					gitLabProjects = gitLabProjects.concat(apiResponse.body);
				}
			} catch (err) {
				Logger.error(err);
				debugger;
			}
			boards = gitLabProjects.map(p => {
				return {
					...p,
					id: p.id,
					name: p.path_with_namespace,
					path: p.path,
					singleAssignee: true // gitlab only allows a single assignee per issue (at least it only shows one in the UI)
				};
			});
		}

		return {
			boards
		};
	}

	private async getOpenProjectsByRemotePath() {
		const { git } = SessionContainer.instance();
		const gitRepos = await git.getRepositories();
		const openProjects = new Map<string, GitLabProject>();

		for (const gitRepo of gitRepos) {
			const remotes = await git.getRepoRemotes(gitRepo.path);
			for (const remote of remotes) {
				if (this.getIsMatchingRemotePredicate()(remote) && !openProjects.has(remote.path)) {
					let gitlabProject = this._projectsByRemotePath.get(remote.path);

					if (!gitlabProject) {
						try {
							const response = await this.get<GitLabProject>(
								`/projects/${encodeURIComponent(remote.path)}`
							);
							gitlabProject = {
								...response.body,
								path: gitRepo.path
							};
							this._projectsByRemotePath.set(remote.path, gitlabProject);
						} catch (err) {
							Logger.error(err);
							debugger;
						}
					}

					if (gitlabProject) {
						openProjects.set(remote.path, gitlabProject);
					}
				}
			}
		}
		return openProjects;
	}

	@log()
	async createCard(request: CreateThirdPartyCardRequest) {
		await this.ensureConnected();

		const data = request.data as GitLabCreateCardRequest;
		const card: { [key: string]: any } = {
			title: data.title,
			description: data.description
		};
		if (data.assignee) {
			// GitLab allows for multiple assignees in the API, but only one appears in the UI
			card.assignee_ids = [data.assignee.id];
		}
		const response = await this.post<{}, GitLabCreateCardResponse>(
			`/projects/${encodeURIComponent(data.repoName)}/issues?${qs.stringify(card)}`,
			{}
		);
		return { ...response.body, url: response.body.web_url };
	}

	// FIXME
	@log()
	async moveCard(request: MoveThirdPartyCardRequest) {}

	@log()
	async getCards(request: FetchThirdPartyCardsRequest): Promise<FetchThirdPartyCardsResponse> {
		await this.ensureConnected();

		const { body } = await this.get<any[]>(
			`/issues?${qs.stringify({
				state: "opened",
				scope: "assigned_to_me"
			})}`
		);
		const cards = body.map(card => {
			return {
				id: card.id,
				url: card.web_url,
				title: card.title,
				modifiedAt: new Date(card.updated_at).getTime(),
				tokenId: card.iid,
				body: card.description
			};
		});
		return { cards };
	}

	private async getMemberId() {
		const userResponse = await this.get<{ id: string; [key: string]: any }>(`/user`);
		return userResponse.body.id;
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
		await this.ensureConnected();

		const response = await this.get<GitLabUser[]>(`/projects/${request.boardId}/users`);
		return { users: response.body.map(u => ({ ...u, displayName: u.name })) };
	}

	@log()
	async getPullRequestDocumentMarkers({
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

	private _commentsByRepoAndPath = new Map<
		string,
		{ expiresAt: number; comments: Promise<PullRequestComment[]> }
	>();

	private _isMatchingRemotePredicate = (r: GitRemoteLike) => r.domain === "gitlab.com";
	getIsMatchingRemotePredicate() {
		return this._isMatchingRemotePredicate;
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

	protected getOwnerFromRemote(remote: string): { owner: string; name: string } {
		// HACKitude yeah, sorry
		const uri = URI.parse(remote);
		const split = uri.path.split("/");

		// the project name is the last item
		let name = split.pop();
		// gitlab & enterprise can use project groups + subgroups
		const owner = split.filter(_ => _ !== "" && _ != null);
		if (name != null) {
			name = toRepoName(name);
		}

		return {
			owner: owner.join("/"),
			name: name!
		};
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
			const { owner, name } = this.getOwnerFromRemote(request.remote);

			const repoInfo = await this.getRepoInfo({ remote: request.remote });
			if (repoInfo && repoInfo.error) {
				return {
					error: repoInfo.error
				};
			}

			const createPullRequestResponse = await this.post<
				GitLabCreateMergeRequestRequest,
				GitLabCreateMergeRequestResponse
			>(
				`/projects/${encodeURIComponent(`${owner}/${name}`)}/merge_requests`,
				{
					title: request.title,
					source_branch: request.headRefName,
					target_branch: request.baseRefName,
					description: this.createDescription(request)
				},
				{
					// couldn't get this post to work without
					// this additional header
					"Content-Type": "application/json"
				}
			);
			const title = `#${createPullRequestResponse.body.iid} ${createPullRequestResponse.body.title}`;

			return {
				title: title,
				url: createPullRequestResponse.body.web_url
			};
		} catch (ex) {
			Logger.error(ex, `${this.displayName}: createPullRequest`, {
				remote: request.remote,
				baseRefName: request.baseRefName,
				headRefName: request.headRefName
			});
			return {
				error: {
					type: "PROVIDER",
					message: `${this.displayName}: ${ex.message}`
				}
			};
		}
	}

	async getRepoInfo(request: { remote: string }): Promise<ProviderGetRepoInfoResponse> {
		let owner;
		let name;
		try {
			({ owner, name } = this.getOwnerFromRemote(request.remote));

			let projectResponse;
			try {
				projectResponse = await this.get<GitLabProjectInfoResponse>(
					`/projects/${encodeURIComponent(`${owner}/${name}`)}`
				);
			} catch (ex) {
				Logger.error(ex, `${this.displayName}: failed to get projects`, {
					owner: owner,
					name: name,
					hasProviderInfo: this._providerInfo != null
				});
				return {
					error: {
						type: "PROVIDER",
						message: ex.message
					}
				};
			}
			let mergeRequestsResponse;
			try {
				mergeRequestsResponse = await this.get<GitLabMergeRequestInfoResponse[]>(
					`/projects/${encodeURIComponent(`${owner}/${name}`)}/merge_requests?state=opened`
				);
			} catch (ex) {
				Logger.error(ex, `${this.displayName}: failed to get merge_requests`, {
					owner: owner,
					name: name,
					hasProviderInfo: this._providerInfo != null
				});
				return {
					error: {
						type: "PROVIDER",
						message: ex.message
					}
				};
			}

			return {
				id: (projectResponse.body.iid || projectResponse.body.id)!.toString(),
				defaultBranch: projectResponse.body.default_branch,
				pullRequests: mergeRequestsResponse.body.map(_ => {
					return {
						id: _.iid.toString(),
						url: _.web_url,
						baseRefName: _.target_branch,
						headRefName: _.source_branch
					};
				})
			};
		} catch (ex) {
			Logger.error(ex, `${this.displayName}: getRepoInfo failed`, {
				owner: owner,
				name: name,
				hasProviderInfo: this._providerInfo != null
			});

			return {
				error: {
					type: "PROVIDER",
					message: ex.message
				}
			};
		}
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
			super.invalidatePullRequestDocumentMarkersCache();

			const remotePaths = await getRemotePaths(
				repo,
				this.getIsMatchingRemotePredicate(),
				this._projectsByRemotePath
			);

			const commentsPromise: Promise<PullRequestComment[]> =
				remotePaths != null
					? this._getCommentsForPathCore(filePath, relativePath, remotePaths)
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
		remotePaths: string[]
	): Promise<PullRequestComment[]> {
		const comments = [];

		for (const remotePath of remotePaths) {
			const prs = await this._getPullRequests(remotePath);

			const prComments = (
				await Promise.all(prs.map(pr => this._getPullRequestComments(remotePath, pr, relativePath)))
			).reduce((group, current) => group.concat(current), []);

			comments.push(...prComments);
		}

		// If we have any comments, fire a notification
		if (comments.length !== 0) {
			void SessionContainer.instance().documentMarkers.fireDidChangeDocumentMarkers(
				URI.file(filePath).toString(),
				"codemarks"
			);
		}

		return comments;
	}

	private async _getPullRequests(remotePath: string): Promise<GitLabPullRequest[]> {
		return flatten(
			await Promise.all([
				this._getPullRequestsByState(remotePath, "opened"),
				this._getPullRequestsByState(remotePath, "merged")
			])
		);
	}

	private async _getPullRequestsByState(
		remotePath: string,
		state: string
	): Promise<GitLabPullRequest[]> {
		const prs: GitLabPullRequest[] = [];

		try {
			let url: string | undefined = `/projects/${encodeURIComponent(
				remotePath
			)}/merge_requests?state=${state}`;
			do {
				const apiResponse = await this.get<GitLabPullRequest[]>(url);
				prs.push(...apiResponse.body);
				url = this.nextPage(apiResponse.response);
			} while (url);
		} catch (ex) {
			Logger.error(ex);
		}

		return prs;
	}

	private async _getPullRequestComments(
		remotePath: string,
		pr: GitLabPullRequest,
		relativePath: string
	): Promise<PullRequestComment[]> {
		let gitLabComments: GitLabPullRequestComment[] = [];

		try {
			let apiResponse = await this.get<GitLabPullRequestComment[]>(
				`/projects/${encodeURIComponent(remotePath)}/merge_requests/${pr.iid}/notes`
			);
			gitLabComments = apiResponse.body;

			let nextPage: string | undefined;
			while ((nextPage = this.nextPage(apiResponse.response))) {
				apiResponse = await this.get<GitLabPullRequestComment[]>(nextPage);
				gitLabComments = gitLabComments.concat(apiResponse.body);
			}
		} catch (ex) {
			Logger.error(ex);
		}

		return gitLabComments
			.filter(c => !c.system && c.position != null && c.position.new_path === relativePath)
			.map(glComment => {
				return {
					id: glComment.id.toString(),
					author: {
						id: glComment.author.id.toString(),
						nickname: glComment.author.name
					},
					path: glComment.position.new_path,
					text: glComment.body,
					code: "",
					commit: glComment.position.head_sha,
					originalCommit: glComment.position.base_sha,
					line: glComment.position.new_line,
					originalLine: glComment.position.old_line,
					url: `${pr.web_url}#note_${glComment.id}`,
					createdAt: new Date(glComment.created_at).getTime(),
					pullRequest: {
						id: pr.iid,
						url: pr.web_url,
						isOpen: pr.state === "opened",
						targetBranch: pr.target_branch,
						sourceBranch: pr.source_branch
					}
				};
			});
	}

	async getMyPullRequests(
		request: GetMyPullRequestsRequest
	): Promise<GetMyPullRequestsResponse[][] | undefined> {
		void (await this.ensureConnected());

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
					Logger.log(`getMyPullRequests: request.isOpen=true, but no repos found, returning empty`);
					return [];
				}
			} catch (ex) {
				Logger.error(ex);
			}
		}

		let queries = request.queries;

		// https://docs.gitlab.com/ee/api/merge_requests.html
		const items = await Promise.all(
			queries.map(_ => {
				const exploded = _.split(" ")
					.map(q => {
						const kvp = q.split(":");
						return `${encodeURIComponent(kvp[0])}=${encodeURIComponent(kvp[1])}`;
					})
					.join("&");

				return this.get<any>(`/merge_requests/?${exploded}&with_labels_details=true`);
			})
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
		const response: any[][] = [];
		items.forEach((item: any, index) => {
			if (item && item.body) {
				response[index] = item.body
					.filter((_: any) => _.id)
					.map((pr: { created_att: string }) => ({
						...pr,
						providerId: this.providerConfig?.id,
						createdAt: new Date(pr.created_att).getTime()
					}));

				if (!queries[index].match(/\bsort:/)) {
					response[index] = response[index].sort(
						(a: { created_at: number }, b: { created_at: number }) => b.created_at - a.created_at
					);
				}
			}
		});

		return response;
	}

	get graphQlBaseUrl() {
		return `${this.baseUrl.replace("/v4", "")}/graphql`;
	}
	protected _client: GraphQLClient | undefined;
	protected async client(): Promise<GraphQLClient> {
		if (this._client === undefined) {
			this._client = new GraphQLClient(this.graphQlBaseUrl);
		}
		if (!this.accessToken) {
			throw new Error("Could not get a GitLab personal access token");
		}

		this._client.setHeaders({
			Authorization: `Bearer ${this.accessToken}`
		});

		return this._client;
	}

	_isSuppressedException(ex: any): ReportSuppressedMessages | undefined {
		const networkErrors = [
			"ENOTFOUND",
			"ETIMEDOUT",
			"EAI_AGAIN",
			"ECONNRESET",
			"ECONNREFUSED",
			"ENETDOWN",
			"ENETUNREACH",
			"socket disconnected before secure",
			"socket hang up"
		];

		if (ex.message && networkErrors.some(e => ex.message.match(new RegExp(e)))) {
			return ReportSuppressedMessages.NetworkError;
		} else if (
			(ex.message && ex.message.match(/GraphQL Error \(Code: 404\)/)) ||
			(this.providerConfig.id === "gitlab/enterprise" &&
				ex.response &&
				ex.response.error &&
				ex.response.error.toLowerCase().indexOf("cookies must be enabled to use gitlab") > -1)
		) {
			return ReportSuppressedMessages.ConnectionError;
		} else if (
			(ex.response && ex.response.message === "Bad credentials") ||
			(ex.response &&
				ex.response.errors instanceof Array &&
				ex.response.errors.find((e: any) => e.type === "FORBIDDEN"))
		) {
			return ReportSuppressedMessages.AccessTokenInvalid;
		} else {
			return undefined;
		}
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

		let response;
		try {
			response = await (await this.client()).request<any>(query, variables);
		} catch (ex) {
			Logger.warn("GitLab query caught:", ex);
			const exType = this._isSuppressedException(ex);
			if (exType !== undefined) {
				// if (exType !== ReportSuppressedMessages.NetworkError) {
				// 	// we know about this error, and we want to give the user a chance to correct it
				// 	// (but throwing up a banner), rather than logging the error to sentry
				// 	this.session.api.setThirdPartyProviderInfo({
				// 		providerId: this.providerConfig.id,
				// 		data: {
				// 			tokenError: {
				// 				error: ex,
				// 				occurredAt: Date.now(),
				// 				isConnectionError: exType === ReportSuppressedMessages.ConnectionError
				// 			}
				// 		}
				// 	});
				// 	delete this._client;
				// }
				// this throws the error but won't log to sentry (for ordinary network errors that seem temporary)
				throw new InternalError(exType, { error: ex });
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
									(_.indexOf("GitLabProvider") > -1 ||
										_.indexOf("GitLabEnterpriseProvider") > -1) &&
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
									(_.indexOf("GitLabProvider") > -1 ||
										_.indexOf("GitLabEnterpriseProvider") > -1) &&
									_.indexOf(".mutate") === -1
							)![0]
							.match(/GitLabProvider\.(\w+)/)![1];
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

	_pullRequestCache: Map<string, any> = new Map();

	@log()
	async getPullRequest(request: any): Promise<any> {
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

		let response = {} as any;
		try {
			const q = `query {
				project(fullPath: "bcanzanella/foo") {
				  name
				  # this returns merge request
				  mergeRequest(iid: "2") {
					id
					iid					
					createdAt,
					title
					webUrl	
					state
					author {
						username
					  }
					  commitCount
					  sourceProject{
						name
						webUrl					   
						fullPath
					  }
					discussions {
					  nodes {
						createdAt
						id
						notes {
						  nodes {
							author {
							  username
							  avatarUrl
							}
							body
							bodyHtml
							confidential
							createdAt
							discussion {
							  id
							  replyId
							  createdAt
							}
							id
							position{
							  x
							  y
							  newLine
							  newPath
							  oldLine
							  oldPath
							  filePath
							}
							project {
							  name
							}
							resolvable
							resolved
							resolvedAt
							resolvedBy {
							  username
							  avatarUrl
							}
							system
							systemNoteIconName
							updatedAt
							userPermissions {
							  readNote
							  resolveNote
							  awardEmoji
							  createNote
							}
						  }
						}
						replyId
						resolvable
						resolved
						resolvedAt
						resolvedBy{
						  username
						  avatarUrl
						}
					  }
					}
				  }
				  
				  
			  
				  
				}
			  }`;
			// let timelineQueryResponse;
			// if (request.owner == null && request.repo == null) {
			// 	const data = await this.getRepoOwnerFromPullRequestId(request.pullRequestId);
			// 	repoOwner = data.owner;
			// 	repoName = data.name;
			// } else {
			// 	repoOwner = request.owner!;
			// 	repoName = request.repo!;
			// }
			// const pullRequestNumber = await this.getPullRequestNumber(request.pullRequestId);
			// do {
			// 	timelineQueryResponse = await this.pullRequestTimelineQuery(
			// 		repoOwner,
			// 		repoName,
			// 		pullRequestNumber,
			// 		timelineQueryResponse &&
			// 			timelineQueryResponse.repository.pullRequest &&
			// 			timelineQueryResponse.repository.pullRequest.timelineItems.pageInfo &&
			// 			timelineQueryResponse.repository.pullRequest.timelineItems.pageInfo.endCursor
			// 	);
			// 	if (timelineQueryResponse === undefined) break;
			// 	response = timelineQueryResponse;

			// 	allTimelineItems = allTimelineItems.concat(
			// 		timelineQueryResponse.repository.pullRequest.timelineItems.nodes
			// 	);
			// } while (timelineQueryResponse.repository.pullRequest.timelineItems.pageInfo.hasNextPage);

			const response = await this.query(q);
			response.project.mergeRequest.providerId = this.providerConfig?.id;

			return response;
		} catch (ex) {
			Logger.error(ex);
		}
		// if (response?.repository?.pullRequest) {
		// 	const { repos } = SessionContainer.instance();
		// 	const prRepo = await this.getPullRequestRepo(
		// 		await repos.get(),
		// 		response.repository.pullRequest
		// 	);

		// 	if (prRepo?.id) {
		// 		try {
		// 			const prForkPointSha = await scmManager.getForkPointRequestType({
		// 				repoId: prRepo.id,
		// 				baseSha: response.repository.pullRequest.baseRefOid,
		// 				headSha: response.repository.pullRequest.headRefOid
		// 			});

		// 			response.repository.pullRequest.forkPointSha = prForkPointSha?.sha;
		// 		} catch (err) {
		// 			Logger.error(err, `Could not find forkPoint for repoId=${prRepo.id}`);
		// 		}
		// 	}
		// }
		// if (response?.repository?.pullRequest?.timelineItems != null) {
		// 	response.repository.pullRequest.timelineItems.nodes = allTimelineItems;
		// }
		// response.repository.pullRequest.repoUrl = response.repository.url;
		// response.repository.pullRequest.baseUrl = response.repository.url.replace(
		// 	response.repository.resourcePath,
		// 	""
		// );

		// response.repository.repoOwner = repoOwner!;
		// response.repository.repoName = repoName!;

		// response.repository.pullRequest.providerId = this.providerConfig.id;
		// response.repository.providerId = this.providerConfig.id;

		this._pullRequestCache.set(request.pullRequestId, response);
		return response;
	}

	@log()
	async createPullRequestComment(request: {
		pullRequestId: string;
		text: string;
	}): Promise<Directives> {
		const response = (await this.mutate(
			`mutation CreateNote($noteableId:ID!, $body:String!, $iid:String!){
			createNote(input: {noteableId:$noteableId, body:$body}){
				clientMutationId
				note{
					project {
						mergeRequest(iid: $iid) {						 
							discussions(last:5) {
						nodes {
						  createdAt
						  id
						  notes {
							nodes {
							  author {
								username
								avatarUrl
							  }
							  body
							  bodyHtml
							  confidential
							  createdAt
							  discussion {
								id
								replyId
								createdAt
							  }
							  id
							  position {
								x
								y
								newLine
								newPath
								oldLine
								oldPath
								filePath
							  }
							  project {
								name
							  }
							  resolvable
							  resolved
							  resolvedAt
							  resolvedBy {
								username
								avatarUrl
							  }
							  system
							  systemNoteIconName
							  updatedAt
							  userPermissions {
								readNote
								resolveNote
								awardEmoji
								createNote
							  }
							}
						  }
						  replyId
						  resolvable
						  resolved
						  resolvedAt
						  resolvedBy {
							username
							avatarUrl
						  }
						}
					 
						  }
						}
					  }
					id      
					body
					createdAt
					confidential
					author {
					  username
					  avatarUrl
					}
					updatedAt
					userPermissions{
					  adminNote
					  awardEmoji
					  createNote
					  readNote
					  resolveNote
					  
					}      
				  }			
			}
		  }`,
			{
				noteableId: `gid://gitlab/MergeRequest/${request.pullRequestId}`,
				body: request.text,
				iid: "2"
			}
		)) as any;

		const addedNode = response.createNote.note.project.mergeRequest.discussions.nodes.find(
			(_: any) => {
				if (_.notes.nodes.find((x: any) => x.id === response.createNote.note.id)) {
					return _;
				}
				return undefined;
			}
		);
		return {
			directives: [
				// {
				// 	type: "updatePullRequest",
				// 	data: response.addComment.commentEdge.node.pullRequest
				// },
				{
					type: "addNode",
					data: addedNode
				}
			]
		};
	}

	async deletePullRequestComment(request: {
		id: string;
		pullRequestId: string;
	}): Promise<Directives | undefined> {
		const query = `mutation DestroyNote($id: ID!){
			destroyNote(input:{id:$id}){
			  clientMutationId 
			  note {
				id          
			  }
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
}

interface GitLabPullRequest {
	id: number;
	iid: number;
	title: string;
	web_url: string;
	state: string;
	target_branch: string;
	source_branch: string;
}

interface GitLabPullRequestComment {
	id: number;
	type: string;
	body: string;
	attachment?: any;
	author: GitLabPullRequestCommentAuthor;
	created_at: string;
	updated_at: string;
	system: boolean;
	noteable_id: number;
	noteable_type: string;
	position: GitLabPullRequestCommentPosition;
	resolvable: boolean;
	resolved: boolean;
	resolved_by?: string;
	noteable_iid: number;
}

interface GitLabPullRequestCommentAuthor {
	id: number;
	name: string;
	username: string;
	state: string;
	avatar_url: string;
	web_url: string;
}

interface GitLabPullRequestCommentPosition {
	base_sha: string;
	start_sha: string;
	head_sha: string;
	old_path: string;
	new_path: string;
	position_type: string;
	old_line?: number;
	new_line: number;
}

interface GitLabCreateMergeRequestRequest {
	title: string;
	source_branch: string;
	target_branch: string;
	description?: string;
}

interface GitLabCreateMergeRequestResponse {
	iid: string;
	title: string;
	web_url: string;
}

interface GitLabProjectInfoResponse {
	iid?: number;
	id?: number;
	default_branch: string;
}

interface GitLabMergeRequestInfoResponse {
	iid: number;
	web_url: string;
	source_branch: string;
	target_branch: string;
}
