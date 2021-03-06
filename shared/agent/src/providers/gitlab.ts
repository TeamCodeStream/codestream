"use strict";
import { GraphQLClient } from "graphql-request";
import { flatten, groupBy } from "lodash-es";
import { Response } from "node-fetch";
import * as paths from "path";
import * as qs from "querystring";
import * as nodeUrl from "url";
import { URI } from "vscode-uri";
import { SessionContainer } from "../container";
import { GitRemoteLike } from "../git/models/remote";
import { GitRepository } from "../git/models/repository";
import { toRepoName } from "../git/utils";
import { Logger } from "../logger";
import { Dates } from "../system";

import { InternalError, ReportSuppressedMessages } from "../agentError";

import {
	CreateThirdPartyCardRequest,
	DidChangePullRequestCommentsNotificationType,
	DocumentMarker,
	FetchThirdPartyBoardsRequest,
	FetchThirdPartyBoardsResponse,
	FetchThirdPartyCardsRequest,
	FetchThirdPartyCardsResponse,
	FetchThirdPartyPullRequestCommitsRequest,
	FetchThirdPartyPullRequestCommitsResponse,
	FetchThirdPartyPullRequestFilesResponse,
	GetMyPullRequestsRequest,
	GetMyPullRequestsResponse,
	GitLabBoard,
	GitLabCreateCardRequest,
	GitLabCreateCardResponse,
	MoveThirdPartyCardRequest,
	ThirdPartyProviderConfig
} from "../protocol/agent.protocol";
import { CSGitLabProviderInfo } from "../protocol/api.protocol";
import { log, lspProvider, Strings } from "../system";
import {
	ApiResponse,
	getRemotePaths,
	ProviderCreatePullRequestRequest,
	ProviderCreatePullRequestResponse,
	ProviderGetRepoInfoResponse,
	PullRequestComment,
	REFRESH_TIMEOUT,
	ThirdPartyIssueProviderBase
} from "./provider";
import { Directives } from "./directives";
import { CodeStreamSession } from "session";
import { RepositoryLocator } from "git/repositoryLocator";

interface GitLabProject {
	path_with_namespace: any;
	id: string;
	path: string;
	issues_enabled: boolean;
}

interface GitLabUser {
	id: string;
	name: string;
	avatar_url: string;
}

interface GitLabCurrentUser {
	avatarUrl: string;
	id: string;
	login: string;
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
	private gitLabReviewStore: GitLabReviewStore;

	constructor(session: CodeStreamSession, providerConfig: ThirdPartyProviderConfig) {
		super(session, providerConfig);
		this.gitLabReviewStore = new GitLabReviewStore();
	}

	protected getPRExternalContent(comment: PullRequestComment) {
		return {
			provider: {
				name: this.displayName,
				icon: "gitlab",
				id: this.providerConfig.id
			},
			subhead: `!${comment.pullRequest.id}`,
			externalId: comment.pullRequest.externalId,
			externalChildId: comment.id,
			externalType: "PullRequest",
			title: comment.pullRequest.title,
			diffHunk: comment.diffHunk,
			actions: []
			// subhead: `#${comment.pullRequest.id}`,
			// actions: [
			// 	{
			// 		label: "Open Note",
			// 		uri: comment.url
			// 	},
			// 	{
			// 		label: `Open Merge Request !${comment.pullRequest.id}`,
			// 		uri: comment.pullRequest.url
			// 	}
			// ]
		};
	}

	async onConnected(providerInfo?: CSGitLabProviderInfo) {
		super.onConnected(providerInfo);
		this._gitlabUserId = await this.getMemberId();
		this._projectsByRemotePath = new Map<string, GitLabProject>();
	}

	@log()
	async getBoards(): Promise<FetchThirdPartyBoardsResponse> {
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
	async moveCard() {}

	@log()
	async getCards(): Promise<FetchThirdPartyCardsResponse> {
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
				url: createPullRequestResponse.body.web_url,
				id: JSON.stringify({
					full: `${owner}/${name}${createPullRequestResponse.body.reference}`,
					id: createPullRequestResponse.body.id
				})
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
						id: JSON.stringify({ full: _.references.full, id: _.iid.toString() }),
						iid: _.iid.toString(),
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
				// Logger.log("Got ack" + JSON.stringify(apiResponse, null, 4));
				prs.push(...apiResponse.body);
				url = this.nextPage(apiResponse.response);
			} while (url);
		} catch (ex) {
			Logger.error(ex);
		}

		prs.forEach(pr => (pr.number = pr.iid));
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
						nickname: glComment.author.name,
						login: glComment.author.name
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
						externalId: JSON.stringify({ full: pr.references?.full, id: pr.id }),
						url: pr.web_url,
						isOpen: pr.state === "opened",
						targetBranch: pr.target_branch,
						sourceBranch: pr.source_branch,
						title: pr.title
					}
				};
			});
	}

	async getMyPullRequests(
		request: GetMyPullRequestsRequest
	): Promise<GetMyPullRequestsResponse[][] | undefined> {
		void (await this.ensureConnected());

		let repos: string[] = [];
		if (request.isOpen) {
			try {
				repos = await this.getOpenedRepos();
				if (!repos.length) {
					Logger.log(`getMyPullRequests: request.isOpen=true, but no repos found, returning empty`);
					return [];
				}
			} catch (ex) {
				Logger.warn(ex);
			}
		}

		let queries = request.queries;

		let items;
		let promises: Promise<ApiResponse<any>>[] = [];
		if (repos.length) {
			// https://docs.gitlab.com/ee/api/merge_requests.html
			queries.forEach(query => {
				const exploded = query
					.split(" ")
					.map(q => this.toKeyValuePair(q))
					.join("&");

				repos.forEach(repo => {
					promises.push(
						this.get<any>(
							`/projects/${encodeURIComponent(
								repo
							)}/merge_requests?${exploded}&with_labels_details=true`
						)
					);
				});
			});
		} else {
			promises = queries.map(_ => {
				return this.get<any>(
					`/merge_requests?${_.split(" ")
						.map(q => this.toKeyValuePair(q))
						.join("&")}&with_labels_details=true`
				);
			});
		}

		items = await Promise.all(promises).catch(ex => {
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
					.map(
						(pr: {
							created_at: string;
							id: string;
							iid: string;
							references: { full: string };
						}) => ({
							...pr,
							base_id: pr.id,
							// along the way, this id will need to be baked
							// (used in toast notifications which later needs a singular id)
							id: JSON.stringify({ full: pr.references.full, id: pr.id }),
							providerId: this.providerConfig?.id,
							createdAt: new Date(pr.created_at).getTime(),
							number: parseInt(pr.iid, 10)
						})
					);

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

	protected async client(): Promise<GraphQLClient> {
		if (this._client === undefined) {
			const options: { [key: string]: any } = {};
			if (this._httpsAgent) {
				options.agent = this._httpsAgent;
			}
			this._client = new GraphQLClient(this.graphQlBaseUrl, options);
		}
		if (!this.accessToken) {
			throw new Error("Could not get a GitLab personal access token");
		}

		this._client.setHeaders({
			Authorization: `Bearer ${this.accessToken}`
		});

		return this._client;
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
				if (exType !== ReportSuppressedMessages.NetworkError) {
					this.trySetThirdPartyProviderInfo(ex, exType);
				}
				// this throws the error but won't log to sentry (for ordinary network errors that seem temporary)
				throw new InternalError(exType, { error: ex });
			} else {
				// this is an unexpected error, throw the exception normally
				throw ex;
			}
		}

		return response as T;
	}

	async mutate<T>(query: string, variables: any = undefined) {
		return (await this.client()).request<T>(query, variables);
	}

	async restGet<T extends object>(url: string) {
		return this.get<T>(url);
	}

	async restPost<T extends object, R extends object>(url: string, variables: any) {
		return this.post<T, R>(url, variables);
	}

	async restPut<T extends object, R extends object>(url: string, variables: any) {
		return this.put<T, R>(url, variables);
	}
	async restDelete<R extends object>(url: string, options: { useRawResponse: boolean }) {
		return this.delete<R>(url, {}, options);
	}

	_currentGitlabUser?: GitLabCurrentUser;

	async currentUser() {
		if (!this._currentGitlabUser) {
			const data = await this.query<any>(`
			{
				currentUser {
					id
					login:username
					name
					avatarUrl
				}
			}`);
			this._currentGitlabUser = data.currentUser;
		}
		return this._currentGitlabUser;
	}

	_pullRequestCache: Map<
		string,
		// TODO fix this up -- there's a definition below
		any
		// {
		// 	project: {
		// 		name: string;
		// 		mergeRequest: {
		// 			id: string;
		// 			iid: string;
		// 		};
		// 	};
		// }
	> = new Map();

	async getReviewers(request: { pullRequestId: string }) {
		const { projectFullPath } = this.parseId(request.pullRequestId);

		const response = await this.restGet<GitLabUser[]>(
			`/projects/${encodeURIComponent(projectFullPath)}/users`
		);
		return {
			users: response.body.map(u => ({ ...u, avatarUrl: u.avatar_url, displayName: u.name }))
		};
	}

	@log()
	async getPullRequest(request: { pullRequestId: string; force?: boolean }): Promise<any> {
		const { projectFullPath, id, iid } = this.parseId(request.pullRequestId);

		// const { scm: scmManager } = SessionContainer.instance();
		await this.ensureConnected();

		if (request.force) {
			this._pullRequestCache.delete(id);
		} else {
			const cached = this._pullRequestCache.get(id);
			if (cached) {
				return cached;
			}
		}

		let response = {} as {
			currentUser: any;
			project: {
				mergeRequest: {
					approvedBy: {
						nodes: {
							avatarUrl: string;
							name: string;
							login: string;
						};
					};
					baseRefName: string;
					baseRefOid: string;
					changesCount: number;
					commitCount: number;
					createdAt: string;
					diffRefs: any;
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
						}[];
					};
					notes: {
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
						}[];
					};
					downvotes: number;
					headRefName: string;
					headRefOid: string;
					id: string;
					idComputed: string;
					iid: string;
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
					sourceBranch: string;
					state: string;
					sourceProject: any;
					targetBranch: string;
					title: string;

					upvotes: number;
					url: string;
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
				};
			};
		};
		try {
			const q = `query GetPullRequest($fullPath: ID!, $iid: String!, $after:String) {
				currentUser {
				  name
				  login: username
				  avatarUrl
				  id
				}
				project(fullPath: $fullPath) {
				  name
				  mergeRequest(iid: $iid) {
					approvedBy {
					  nodes {
						avatarUrl
						name
						login: username
					  }
					}
					id
					iid
					createdAt
					sourceBranch
					targetBranch
					title
					description
					webUrl
					state
					mergedAt
					workInProgress
					reference
					projectId
					author {
					  name
					  login: username
					  avatarUrl
					}
					diffRefs {
					  baseSha
					  headSha
					  startSha
					}
					commitCount
					sourceProject {
					  name
					  webUrl
					  fullPath
					}
					upvotes
					downvotes
					milestone {
					  title
					  id
					  webPath
					  dueDate
					}
					subscribed
					userDiscussionsCount
					discussionLocked
					forceRemoveSourceBranch
					assignees(last: 100) {
					  nodes {
						id
						name
						login: username
						avatarUrl
					  }
					}
					participants(last: 100) {
					  nodes {
						id
						name
						login: username
						avatarUrl
					  }
					}
					labels(last: 100) {
					  nodes {
						id
						color
						textColor
						title
					  }
					}
					currentUserTodos(last: 100) {
					  nodes {
						action
						body
						id
						targetType
						state
					  }
					}
					timeEstimate
					totalTimeSpent
					discussions(first:100, after:$after) {
					  pageInfo{
						endCursor
						hasNextPage
					  }
					  nodes {
						createdAt
						id
						notes {
						  nodes {
							author {
							  name
							  login: username
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
							  login: username
							  avatarUrl
							}
							system
							systemNoteIconName
							updatedAt
							userPermissions {
							  adminNote
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
						  login: username
						  avatarUrl
						}
					  }
					}
				  }
				}
			  }
			  `;
			let discussions: any[] = [];
			let after = "";
			while (true) {
				response = await this.query(q, {
					fullPath: projectFullPath,
					iid: iid.toString(),
					after: after
				});
				discussions = discussions.concat(response.project.mergeRequest.discussions.nodes);
				if (response.project.mergeRequest.discussions.pageInfo?.hasNextPage) {
					after = response.project.mergeRequest.discussions.pageInfo.endCursor;
				} else {
					break;
				}
			}
			const base_id = this.fromMergeRequestGid(response.project.mergeRequest.id);
			// build this so that it aligns with what the REST api created
			response.project.mergeRequest.references = {
				full: `${response.project.mergeRequest.sourceProject.fullPath}${response.project.mergeRequest.reference}`
			};
			const mergeRequestFullId = JSON.stringify({
				id: base_id,
				full: response.project.mergeRequest.references.full
			});
			response.project.mergeRequest.discussions.nodes = discussions;

			// NOTE the following are _supposed_ to exist on the graph results, butttt they're null
			response.project.mergeRequest.commitCount = (
				await this.getPullRequestCommits({
					providerId: this.providerConfig.id,
					pullRequestId: mergeRequestFullId
				})
			)?.length;
			response.project.mergeRequest.changesCount = (
				await this.getPullRequestFilesChanged({ pullRequestId: mergeRequestFullId })
			)?.length;

			response.project.mergeRequest.viewer = {
				id: response.currentUser.id,
				login: response.currentUser.login,
				name: response.currentUser.name,
				avatarUrl: response.currentUser.avatarUrl
			};
			// awards are "reactions" aka "emojis"
			const awards = await this.restGet<any>(
				`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}/award_emoji`
			);
			const grouped = groupBy(awards.body, (_: { name: string }) => _.name);
			response.project.mergeRequest.reactionGroups =
				Object.keys(grouped).map(_ => {
					const data = grouped[_];
					data.forEach(r => {
						r.user.login = r.user.username;
						r.user.avatarUrl = r.user.avatar_url;
					});
					return { content: _, data };
				}) || [];
			// const restMR = await this.restGet<any>(
			// `/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}`
			// );
			// response.project.mergeRequest.squashOnMerge = restMR.body.squash;
			response.project.mergeRequest.providerId = this.providerConfig?.id;
			response.project.mergeRequest.baseRefOid =
				response.project.mergeRequest.diffRefs && response.project.mergeRequest.diffRefs.baseSha;
			response.project.mergeRequest.baseRefName = response.project.mergeRequest.targetBranch;
			response.project.mergeRequest.headRefOid =
				response.project.mergeRequest.diffRefs && response.project.mergeRequest.diffRefs.headSha;
			response.project.mergeRequest.headRefName = response.project.mergeRequest.sourceBranch;
			response.project.mergeRequest.repository = {
				name: response.project.mergeRequest.sourceProject.name,
				nameWithOwner: response.project.mergeRequest.sourceProject.fullPath,
				url: response.project.mergeRequest.sourceProject.webUrl
			};
			response.project.mergeRequest.number = parseInt(response.project.mergeRequest.iid, 10);
			response.project.mergeRequest.url = response.project.mergeRequest.sourceProject.webUrl;
			response.project.mergeRequest.baseWebUrl = this.baseWebUrl;
			response.project.mergeRequest.merged = !!response.project.mergeRequest.mergedAt;

			response.project.mergeRequest.idComputed = mergeRequestFullId;
			response.project.mergeRequest.discussions.nodes.forEach((_: any) => {
				if (_.notes && _.notes.nodes && _.notes.nodes.length) {
					_.notes.nodes.forEach((n: any) => {
						if (n.discussion && n.discussion.id) {
							// HACK hijack the "databaseId" that github uses
							n.databaseId = n.discussion.id
								.replace("gid://gitlab/DiffDiscussion/", "")
								.replace("gid://gitlab/IndividualNoteDiscussion/", "");
							n.mergeRequestIdComputed = mergeRequestFullId;
						}
					});
					_.notes.nodes[0].replies = _.notes.nodes.filter((x: any) => x.id != _.notes.nodes[0].id);
					// remove all the replies from the parent (they're now on replies)
					_.notes.nodes.length = 1;
				}
			});
			this._pullRequestCache.set(id, response);
			const pendingReview = await this.gitLabReviewStore.get(base_id);
			if (pendingReview?.comments?.length) {
				response.project.mergeRequest.pendingReview = {
					comments: {
						totalCount: pendingReview.comments.length
					}
				};
				const user = (await this.currentUser())!;
				response.project.mergeRequest.discussions.nodes = response.project.mergeRequest.discussions.nodes.concat(
					pendingReview.comments.map(_ => {
						return this.gitLabReviewStore.mapToDiscussionNode(_, user);
					})
				);
			}

			(
				await Promise.all([
					this.getProjectEvents(
						projectFullPath,
						iid,
						Dates.fromIsoToYearMonthDay(response.project.mergeRequest.createdAt)
					),
					this.getLabelEvents(projectFullPath, iid),
					this.getMilestoneEvents(projectFullPath, iid)
				]).catch(ex => {
					Logger.error(ex);
					throw ex;
				})
			).forEach(_ => response.project.mergeRequest.discussions.nodes.push(..._));

			response.project.mergeRequest.discussions.nodes.sort((a: any, b: any) =>
				a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
			);
		} catch (ex) {
			Logger.error(ex);
		}

		return response;

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
	}

	@log()
	async createCommentReply(request: { pullRequestId: string; commentId: string; text: string }) {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);
		const data = await this.restPost(
			`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}/discussions/${
				request.commentId
			}/notes`,
			{
				body: request.text
			}
		);
		return data.body;
	}

	@log()
	async createPullRequestThread(request: { pullRequestId: string; text: string }) {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		const data = await this.restPost(
			`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}/discussions`,
			{ body: request.text }
		);
		return data.body;
	}

	// private _pendingReviewStore: Map<string, any[]> = new Map<string, any[]>();

	@log()
	async getPullRequestReviewId(request: { pullRequestId: string }) {
		const { id } = this.parseId(request.pullRequestId);
		const existing = this.gitLabReviewStore.exists(id);
		return existing;
	}

	async createPullRequestInlineReviewComment(request: {
		pullRequestId: string;
		text: string;
		filePath: string;
		startLine?: number;
		position: number;
		leftSha?: string;
		sha?: string;
	}) {
		const result = await this.createPullRequestReviewComment(request);
		return result;
	}

	async createPullRequestReviewComment(request: {
		pullRequestId: string;
		pullRequestReviewId?: string;
		text: string;
		filePath?: string;
		startLine?: number;
		position?: number;
		leftSha?: string;
		sha?: string;
	}) {
		const { id } = this.parseId(request.pullRequestId);

		this.gitLabReviewStore.add(id, {
			...request,
			createdAt: new Date().toISOString()
		});

		this._pullRequestCache.delete(id);
		this.session.agent.sendNotification(DidChangePullRequestCommentsNotificationType, {
			pullRequestId: id,
			filePath: request.filePath
		});

		return true;
	}

	async submitReview(request: {
		pullRequestId: string;
		text: string;
		eventType: string;
		// used with old servers
		pullRequestReviewId?: string;
	}) {
		const { id } = this.parseId(request.pullRequestId);

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

		const existingReviewComments = await this.gitLabReviewStore.get(id);
		if (existingReviewComments?.comments?.length) {
			for (const comment of existingReviewComments.comments) {
				try {
					await this.createPullRequestInlineComment({
						...comment,
						pullRequestId: request.pullRequestId
					});
				} catch (ex) {
					Logger.warn(ex, "Failed to add commit");
				}
			}
			await this.gitLabReviewStore.deleteReview(id);
		}

		if (request.text) {
			await this.createPullRequestComment({
				pullRequestId: request.pullRequestId,
				text: request.text,
				noteableId: id
			});
		}

		return true;
	}

	async updatePullRequestSubscription(request: { pullRequestId: string; onOff: boolean }) {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		const type = request.onOff ? "subscribe" : "unsubscribe";
		const data = await this.restPost<{}, { subscribed: string }>(
			`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}/${type}`,
			{}
		);

		return {
			directives: [
				{
					type: "updatePullRequest",
					data: {
						subscribed: data.body.subscribed
					}
				}
			]
		};
	}

	async setAssigneeOnPullRequest(request: { pullRequestId: string; login: string }) {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		try {
			const response = await this.mutate<any>(
				`mutation MergeRequestSetAssignees($projectPath: ID!, $iid: String!, $assignees: [String!]!) {
				mergeRequestSetAssignees(input: {projectPath: $projectPath, iid: $iid, assigneeUsernames: $assignees}) {
				  mergeRequest {
					title
					assignees(last: 100) {
						nodes {
						  id
						  name
						  login:username
						  avatarUrl
						}
					  }
				  }
				}
			  }
			  `,
				{
					projectPath: projectFullPath,
					iid: iid,
					assignees: [request.login]
				}
			);

			return {
				directives: [
					{
						type: "updatePullRequest",
						data: {
							assignees: response.mergeRequestSetAssignees.mergeRequest.assignees
						}
					}
				]
			};
		} catch (err) {
			Logger.error(err);
			debugger;
		}
		return undefined;
	}

	parseId(pullRequestId: string) {
		const parsed = JSON.parse(pullRequestId);
		return {
			id: parsed.id,
			projectFullPath: parsed.full.split("!")[0],
			iid: parsed.full.split("!")[1]
		};
	}

	async lockPullRequest(request: { pullRequestId: string }): Promise<Directives> {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		const data = await this.restPut<{}, { discussion_locked: boolean }>(
			`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}`,
			{ discussion_locked: true }
		);

		return {
			directives: [
				{
					type: "updatePullRequest",
					data: {
						discussionLocked: data.body.discussion_locked
					}
				}
			]
		};
	}

	async unlockPullRequest(request: { pullRequestId: string }): Promise<Directives> {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		const data = await this.restPut<{}, { discussion_locked: boolean }>(
			`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}`,
			{ discussion_locked: false }
		);

		return {
			directives: [
				{
					type: "updatePullRequest",
					data: {
						discussionLocked: data.body.discussion_locked
					}
				}
			]
		};
	}

	async remoteBranches(request: { pullRequestId: string }) {
		const { projectFullPath } = this.parseId(request.pullRequestId);

		const data = await this.restGet(
			`/projects/${encodeURIComponent(projectFullPath)}/repository/branches`
		);

		return data.body;
	}

	async updatePullRequest(request: {
		pullRequestId: string;
		targetBranch: string;
		title: string;
		description: string;
		labels: string;
		milestoneId: string;
		assigneeId: string;
		// deleteSourceBranch?: boolean;
		// squashCommits?: boolean;
	}): Promise<Directives | undefined> {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		try {
			const { body } = await this.restPut<any, any>(
				`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}`,
				{
					target_branch: request.targetBranch,
					title: request.title,
					description: request.description,
					labels: request.labels,
					assignee_id: request.assigneeId,
					milestone_id: request.milestoneId
					// squash: !!request.squashCommits
				}
			);
			// Logger.log("editPullRequest response: " + JSON.stringify(body, null, 4));
			const milestone = body.milestone || null;
			if (milestone) {
				milestone.createdAt = milestone.created_at;
				milestone.dueDate = milestone.due_date;
			}
			return {
				directives: [
					{
						type: "updatePullRequest",
						data: {
							title: body.title,
							workInProgress: body.work_in_progress,
							description: body.description,
							targetBranch: body.target_branch,
							assignees: {
								nodes: body.assignees.map((assignee: any) => {
									return { ...assignee, avatarUrl: assignee.avatar_url };
								})
							},
							milestone
							// squashOnMerge: body.squash
							// shouldRemoveSourceBranch: body.force_remove_source_branch
						}
					}
				]
			};
		} catch (ex) {
			Logger.warn(ex.message);
		}
		return undefined;
	}

	async createToDo(request: { pullRequestId: string }): Promise<Directives> {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		const data = await this.restPost<{}, { state: string }>(
			`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}/todo`,
			{}
		);

		return {
			directives: [
				{
					type: "updatePullRequest",
					data: {
						currentUserTodos: {
							nodes: [data.body]
						}
					}
				}
			]
		};
	}

	async markToDoDone(request: { id: string }): Promise<Directives> {
		const id = request.id.toString().replace(/.*Todo\//, "");
		const data = await this.restPost<{}, { state: string }>(`/todos/${id}/mark_as_done`, {});

		return {
			directives: [
				{
					type: "updatePullRequest",
					data: {
						currentUserTodos: {
							nodes: [data.body]
						}
					}
				}
			]
		};
	}

	async getMilestones(request: { pullRequestId: string }) {
		const { projectFullPath } = this.parseId(request.pullRequestId);

		const data = await this.restGet(`/projects/${encodeURIComponent(projectFullPath)}/milestones`);
		return data.body;
	}

	async getLabels(request: { pullRequestId: string }) {
		const { projectFullPath } = this.parseId(request.pullRequestId);

		const { body = [] } = await this.restGet<any[]>(
			`/projects/${encodeURIComponent(projectFullPath)}/labels`
		);
		return body.map(label => {
			return { ...label, title: label.name };
		});
	}

	@log()
	async createPullRequestComment(request: {
		pullRequestId: string;
		text: string;
		noteableId?: string;
		projectFullPath?: string;
		iid?: string;
	}): Promise<Directives> {
		let noteableId;

		const { projectFullPath, id, iid } = this.parseId(request.pullRequestId);
		request.projectFullPath = projectFullPath;
		request.iid = iid;
		noteableId = id;
		request.noteableId = this.toMergeRequestGid(noteableId);

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
									login:username
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
									login:username
									avatarUrl
								}
								system
								systemNoteIconName
								updatedAt
								userPermissions {
										adminNote
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
									login:username
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
					  login:username
					  avatarUrl
					}
					updatedAt
					userPermissions {
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
				noteableId: request.noteableId,
				body: request.text,
				iid: request.iid!.toString()
			}
		)) as any;

		// find the nested node/note
		const addedNode = response.createNote.note.project.mergeRequest.discussions.nodes.find(
			(_: any) => {
				return _.notes.nodes.find((n: any) => n.id === response.createNote.note.id);
			}
		);

		return {
			directives: [
				{
					type: "addNode",
					data: addedNode
				}
			]
		};
	}

	async deletePullRequestComment(request: {
		id: string;
		type: string;
		pullRequestId: string;
	}): Promise<Directives | undefined> {
		const noteId = request.id;
		const { id } = this.parseId(request.pullRequestId);
		const query = `
				mutation DestroyNote($id:ID!) {
					destroyNote(input:{id:$id}) {
			  			clientMutationId 
			  				note {
								id
			  				}
						}
		  			}`;

		await this.mutate<any>(query, {
			id: noteId
		});

		this._pullRequestCache.delete(id);
		this.session.agent.sendNotification(DidChangePullRequestCommentsNotificationType, {
			pullRequestId: id,
			commentId: noteId
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

	async createPullRequestCommentAndClose(request: {
		pullRequestId: string;
		text: string;
		startThread: boolean;
	}) {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);
		let directives: any = [];

		if (request.text) {
			if (request.startThread) {
				// if (response1.directives) {
				// directives = directives.concat(response1.directives);
				// }
			} else {
				const response1 = await this.createPullRequestComment({ ...request, iid: iid });
				if (response1.directives) {
					directives = directives.concat(response1.directives);
				}
			}
		}

		// https://docs.gitlab.com/ee/api/merge_requests.html#update-mr
		const mergeRequestUpdatedResponse = await this.restPut<
			{ state_event: string },
			{
				merge_status: string;
				merged_at: any;
				created_at: string;
				state: string;
				updated_at: any;
				closed_at: any;
				closed_by: any;
			}
		>(`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}`, {
			state_event: "close"
		});

		const body = mergeRequestUpdatedResponse.body;
		directives.push({
			type: "updatePullRequest",
			data: {
				mergedAt: body.merged_at,
				mergeStatus: body.merge_status,
				state: body.state,
				updatedAt: body.updated_at,
				closedAt: body.closed_at,
				closedBy: body.closed_by
			}
		});

		directives.push({
			type: "addNodes",
			data: await this.getProjectEvents(
				projectFullPath,
				iid,
				Dates.fromIsoToYearMonthDay(body.created_at)
			)
		});

		return {
			directives: directives
		};
	}

	async createPullRequestCommentAndReopen(request: {
		pullRequestId: string;
		text: string;
		startThread: boolean;
	}): Promise<any> {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		let directives: any = [];

		if (request.text) {
			if (request.startThread) {
				// if (response1.directives) {
				// directives = directives.concat(response1.directives);
				// }
			} else {
				const response1 = await this.createPullRequestComment({ ...request, iid: iid });
				if (response1.directives) {
					directives = directives.concat(response1.directives);
				}
			}
		}

		// https://docs.gitlab.com/ee/api/merge_requests.html#update-mr
		const mergeRequestUpdatedResponse = await this.restPut<
			{ state_event: string },
			{
				merged_at: any;
				merge_status: string;
				state: string;
				updated_at: any;
				closed_at: any;
				closed_by: any;
				created_at: any;
			}
		>(`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}`, {
			state_event: "reopen"
		});

		const body = mergeRequestUpdatedResponse.body;
		directives.push({
			type: "updatePullRequest",
			data: {
				mergedAt: body.merged_at,
				mergeStatus: body.merge_status,
				state: body.state,
				updatedAt: body.updated_at,
				closedAt: body.closed_at,
				closedBy: body.closed_by
			}
		});
		directives.push({
			type: "addNodes",
			data: await this.getProjectEvents(
				projectFullPath,
				iid,
				Dates.fromIsoToYearMonthDay(body.created_at)
			)
		});

		return {
			directives: directives
		};
	}

	async getPullRequestCommits(
		request: FetchThirdPartyPullRequestCommitsRequest
	): Promise<FetchThirdPartyPullRequestCommitsResponse[]> {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		const projectFullPathEncoded = encodeURIComponent(projectFullPath);
		const url = `/projects/${projectFullPathEncoded}/merge_requests/${iid}/commits`;
		const query = await this.restGet<
			{
				author_email: string;
				author_name: string;
				authored_date: string;
				committed_date: string;
				committer_email: string;
				committer_name: string;
				created_at: string;
				id: string;
				message: string;
				parent_ids?: string[];
				short_id: string;
				title: string;
				web_url: string;
			}[]
		>(url);

		return query.body.map(_ => {
			const authorAvatarUrl = Strings.toGravatar(_.author_email);
			let commiterAvatarUrl = authorAvatarUrl;
			if (_.author_email !== _.committer_email) {
				commiterAvatarUrl = Strings.toGravatar(_.committer_email);
			}
			return {
				oid: _.id,
				abbreviatedOid: _.short_id,
				author: {
					name: _.author_name,
					avatarUrl: authorAvatarUrl,
					user: {
						login: _.author_name
					}
				},
				committer: {
					name: _.committer_name,
					avatarUrl: commiterAvatarUrl,
					user: {
						login: _.committer_name
					}
				},
				message: _.message,
				authoredDate: _.authored_date,
				url: _.web_url
			};
		});
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

	async toggleMilestoneOnPullRequest(request: {
		pullRequestId: string;
		milestoneId: string;
	}): Promise<Directives | undefined> {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		try {
			const response = await this.restPut<{ name: string }, any>(
				`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}`,
				{
					milestone_id: request.milestoneId
				}
			);
			return {
				directives: [
					{
						type: "updatePullRequest",
						data: {
							milestone: response.body.milestone
						}
					}
				]
			};
		} catch (err) {
			Logger.error(err);
			debugger;
		}
		return undefined;
	}

	async setWorkInProgressOnPullRequest(request: {
		pullRequestId: string;
		onOff: boolean;
	}): Promise<Directives | undefined> {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		try {
			const response = await this.mutate<any>(
				`mutation MergeRequestSetWip($projectPath: ID!, $iid: String!, $wip: Boolean!) {
					mergeRequestSetWip(input: {projectPath: $projectPath, iid: $iid, wip: $wip}) {
					  mergeRequest {
						title
						workInProgress
					  }
					}
				  }
				  `,
				{
					projectPath: projectFullPath,
					iid: iid,
					wip: request.onOff
				}
			);

			return {
				directives: [
					{
						type: "updatePullRequest",
						data: {
							workInProgress: response.mergeRequestSetWip.mergeRequest.workInProgress,
							title: response.mergeRequestSetWip.mergeRequest.title
						}
					}
				]
			};
		} catch (err) {
			Logger.error(err);
			debugger;
		}
		return undefined;
	}

	async setLabelOnPullRequest(request: {
		pullRequestId: string;
		labelIds: string[];
		onOff: boolean;
	}): Promise<Directives | undefined> {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		try {
			const response = await this.mutate<any>(
				`mutation MergeRequestSetLabels($projectPath: ID!, $iid: String!, $labelIds: [LabelID!]!) {
					mergeRequestSetLabels(input: {projectPath: $projectPath, iid: $iid, labelIds: $labelIds}) {
					  mergeRequest {
						labels(last: 100) {
						  nodes {
							id
							color
							textColor
							title
						  }
						}
					  }
					}
				  }
				  `,
				{
					projectPath: projectFullPath,
					iid: iid,
					labelIds: request.labelIds
				}
			);

			return {
				directives: [
					{
						type: "setLabels",
						data: response.mergeRequestSetLabels.mergeRequest.labels
					}
				]
			};
		} catch (err) {
			Logger.error(err);
			debugger;
		}
		return undefined;
	}

	async toggleReaction(request: {
		pullRequestId: string;
		subjectId: string;
		content: string;
		onOff: boolean;
		id?: string;
	}): Promise<Directives | undefined> {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		try {
			if (request.onOff) {
				const response = await this.restPost<
					{
						name: string;
					},
					any
				>(`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}/award_emoji`, {
					name: request.content
				});
				response.body.user.login = response.body.user.username;
				response.body.user.avatarUrl = response.body.user.avatar_url;
				return {
					directives: [
						{
							type: "addReaction",
							data: response.body
						}
					]
				};
			} else {
				if (!request.id) throw new Error("MissingId");

				// with DELETEs we don't get a JSON response
				const response = await this.restDelete<String>(
					`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}/award_emoji/${
						request.id
					}`,
					{
						useRawResponse: true
					}
				);
				const user = await this.currentUser();
				if (response.body === "") {
					return {
						directives: [
							{
								type: "removeReaction",
								data: {
									content: request.content,
									login: user?.login
								}
							}
						]
					};
				}
			}
		} catch (err) {
			Logger.error(err);
			debugger;
		}
		return undefined;
	}

	async getPullRequestFilesChanged(request: {
		pullRequestId: string;
	}): Promise<FetchThirdPartyPullRequestFilesResponse[]> {
		// https://developer.github.com/v3/pulls/#list-pull-requests-files
		const changedFiles: FetchThirdPartyPullRequestFilesResponse[] = [];
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		try {
			const url: string | undefined = `/projects/${encodeURIComponent(
				projectFullPath
			)}/merge_requests/${iid}/changes`;

			const apiResponse = await this.restGet<{
				diff_refs: {
					base_sha: string;
					head_sha: string;
					start_sha: string;
				};
				changes: {
					sha: string;
					old_path: string;
					new_path: string;
					diff?: string;
				}[];
			}>(url);
			const mappped: FetchThirdPartyPullRequestFilesResponse[] = apiResponse.body.changes.map(_ => {
				return {
					sha: _.sha,
					status: "",
					additions: 0,
					changes: 0,
					deletions: 0,
					filename: _.new_path,
					patch: _.diff,
					diffRefs: apiResponse.body.diff_refs
				};
			});
			changedFiles.push(...mappped);
		} catch (err) {
			Logger.error(err);
			debugger;
		}

		return changedFiles;
	}

	async mergePullRequest(request: {
		pullRequestId: string;
		message: string;
		deleteSourceBranch?: boolean;
		squashCommits?: boolean;
		includeMergeRequestDescription: boolean;
	}): Promise<Directives | undefined> {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		try {
			const response = await this.restPut<any, any>(
				`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}/merge`,
				{
					merge_commit_message: request.message,
					squash: request.squashCommits,
					should_remove_source_branch: request.deleteSourceBranch
				}
			);
			// Logger.log(JSON.stringify(response));
			return {
				directives: [
					{
						type: "updatePullRequest",
						data: {
							merged: true,
							state: response.body.state,
							mergedAt: response.body.merged_at,
							updatedAt: response.body.updated_at
						}
					}
				]
			};
		} catch (ex) {
			Logger.warn(ex.message);
		}
		return undefined;
	}

	async createPullRequestInlineComment(request: {
		pullRequestId: string;
		text: string;
		sha?: string;
		leftSha: string;
		rightSha: string;
		filePath: string;
		startLine: number;
		position?: number;
		metadata?: any;
	}) {
		const result = await this.createCommitComment({
			...request,
			path: request.filePath,
			sha: request.sha || request.rightSha
		});
		return result;
	}

	async createCommitComment(request: {
		pullRequestId: string;
		// leftSha
		leftSha: string;
		// rightSha
		sha: string;
		text: string;
		path: string;
		startLine: number;
		// use endLine for multi-line comments
		endLine?: number;
		// used for old servers
		position?: number;
	}) {
		const { projectFullPath, id, iid } = this.parseId(request.pullRequestId);

		const payload = {
			body: request.text,
			position: {
				base_sha: request.leftSha,
				head_sha: request.sha,
				start_sha: request.leftSha,
				position_type: "text",
				new_path: request.path,
				new_line: request.startLine
			}
		};

		const data = await this.restPost<any, any>(
			`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}/discussions`,
			payload
		);

		this._pullRequestCache.delete(id);
		this.session.agent.sendNotification(DidChangePullRequestCommentsNotificationType, {
			pullRequestId: id
		});

		return data.body;
	}

	public async togglePullRequestApproval(request: {
		pullRequestId: string;
		approve: boolean;
	}): Promise<Directives | undefined> {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		let response;
		const type: any = request.approve ? "addApprovedBy" : "removeApprovedBy";

		// NOTE there's no graphql for these
		if (request.approve) {
			response = await this.restPost<any, any>(
				`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}/approve`,
				{}
			);
		} else {
			try {
				response = await this.restPost<any, any>(
					`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}/unapprove`,
					{}
				);
			} catch (ex) {
				// this will throw a 404 error if it's alreay been unapproved
				// but you can approve many times
				Logger.warn(ex.message);
			}
		}

		return {
			directives: [
				{
					type: type,
					data:
						response &&
						response.body.approved_by.map(
							(_: { user: { avatar_url: string; username: string; name: string } }) => {
								return {
									avatarUrl: _.user.avatar_url,
									login: _.user.username,
									name: _.user.name
								};
							}
						)
				}
			]
		};
	}

	async deletePullRequestReview(request: {
		pullRequestId: string;
		pullRequestReviewId: string;
	}): Promise<any> {
		const { id } = this.parseId(request.pullRequestId);

		await this.gitLabReviewStore.deleteReview(id);

		this._pullRequestCache.delete(id);
		this.session.agent.sendNotification(DidChangePullRequestCommentsNotificationType, {
			pullRequestId: id
		});
		return true;
	}

	async getPullRequestIdFromUrl(request: { url: string }) {
		// since we only the url for the PR -- parse it out for the
		// data we need.
		const uri = URI.parse(request.url);
		const path = uri.path.split("/");
		let id = [];
		// both are valid
		// http://gitlab.codestream.us/my-group/my-subgroup/baz/-/merge_requests/1
		// http://gitlab.codestream.us/project/repo/-/merge_requests/1
		for (let i = 0; i < path.length; i++) {
			const current = path[i];
			if (!current) continue;
			if (current === "-") break;
			id.push(current);
		}

		const iid = path[path.length - 1];
		const fullPath = id.join("/");
		const pullRequestInfo = await this.query<any>(
			`query getId($fullPath: ID!, $iid: String!) {
				project(fullPath: $fullPath) {
				  webUrl
				  name
				  mergeRequest(iid: $iid) {
					id
				  }
				}
			  }
			  `,
			{
				fullPath: fullPath,
				iid: iid
			}
		);
		try {
			return JSON.stringify({
				full: `${fullPath}!${iid}`,
				id: this.fromMergeRequestGid(pullRequestInfo.project.mergeRequest.id)
			});
		} catch (ex) {
			Logger.warn(ex);
			throw ex;
		}
	}

	private async getProjectEvents(
		projectFullPath: string,
		iid: string,
		/* formatted as YYYY-MM-DD */
		after?: string
	): Promise<any[]> {
		// after = https://docs.gitlab.com/ee/api/events.html#date-formatting
		// only care about events after the MR was created
		let url = `/projects/${encodeURIComponent(projectFullPath)}/events?target_type=merge_request`;
		if (after) {
			url += `&after=${after}`;
		}
		return this._paginateRestResponse(url, data => {
			return data
				.filter(
					_ => _.target_iid && _.target_iid.toString() === iid && _.target_type === "MergeRequest"
				)
				.map(_ => {
					return {
						type: "merge-request",
						author: this.fromRestUser(_.author),
						action: _.action_name,
						createdAt: _.created_at,
						id: _.id,
						projectId: _.project_id,
						targetId: _.target_id,
						targetIid: _.target_iid,
						targetTitle: _.target_title,
						targetType: _.target_type
					};
				});
		});
	}

	private async getMilestoneEvents(projectFullPath: string, iid: string) {
		return this._paginateRestResponse(
			`/projects/${encodeURIComponent(
				projectFullPath
			)}/merge_requests/${iid}/resource_milestone_events`,
			data => {
				return data.map(_ => {
					return {
						type: "milestone",
						createdAt: _.created_at,
						action: _.action,
						id: _.id,
						label: _.label,
						resourceType: _.resource_type,
						author: this.fromRestUser(_.user)
					};
				});
			}
		);
	}

	private async getLabelEvents(projectFullPath: string, iid: string) {
		return this._paginateRestResponse(
			`/projects/${encodeURIComponent(
				projectFullPath
			)}/merge_requests/${iid}/resource_label_events`,
			data => {
				return data.map(_ => {
					return {
						type: "label",
						createdAt: _.created_at,
						action: _.action,
						id: _.id,
						label: _.label,
						resourceType: _.resource_type,
						author: this.fromRestUser(_.user)
					};
				});
			}
		);
	}

	private fromRestUser(user: { [key: string]: any }) {
		user.login = user.username;
		user.avatarUrl = user.avatar_url;
		delete user.username;
		delete user.avatar_url;
		return user;
	}

	private toKeyValuePair(q: string) {
		const kvp = q.split(":");
		return `${encodeURIComponent(kvp[0])}=${encodeURIComponent(kvp[1])}`;
	}

	private toMergeRequestGid(id: string) {
		return `gid://gitlab/MergeRequest/${id}`;
	}

	private fromMergeRequestGid(gid: string) {
		return gid.replace("gid://gitlab/MergeRequest/", "");
	}

	private async _paginateRestResponse(url: string, map: (data: any[]) => any[]) {
		let page: string | null = "1";
		let results: any[] = [];

		const parsed = new nodeUrl.URL(url, "codestream://");

		while (true) {
			parsed.searchParams.set("page", page);
			const requestUrl = parsed.pathname + "?" + parsed.searchParams.toString();
			const response = await this.restGet<any>(requestUrl);
			results = results.concat(map(response.body as any[]));
			const nextPage = response.response.headers.get("x-next-page");
			if (nextPage === page || !nextPage) {
				break;
			} else {
				page = nextPage;
			}
		}
		return results;
	}
}

interface GitLabReview {
	version: string;
	comments: any[];
}

class GitLabReviewStore {
	private path: string = "gitlab-review";
	private version: string = "1.0.0";

	private buildPath(reviewId: string) {
		return this.path + "-" + reviewId + ".json";
	}

	async add(reviewId: string, comment: any) {
		try {
			const { textFiles } = SessionContainer.instance();
			const path = this.buildPath(reviewId);
			const current = (
				await textFiles.readTextFile({
					path: path
				})
			)?.contents;
			const data = JSON.parse(current || "{}") || ({} as GitLabReview);
			if (data && data.comments) {
				data.comments.push(comment);
			} else {
				data.version = this.version;
				data.comments = [comment];
			}
			await textFiles.writeTextFile({
				path: path,
				contents: JSON.stringify(data)
			});

			return true;
		} catch (ex) {
			Logger.error(ex);
		}
		return false;
	}

	async get(reviewId: string): Promise<GitLabReview | undefined> {
		try {
			const { textFiles } = SessionContainer.instance();
			const path = this.buildPath(reviewId);
			const current = (
				await textFiles.readTextFile({
					path: path
				})
			)?.contents;
			const data = JSON.parse(current || "{}") as GitLabReview;
			return data;
		} catch (ex) {
			Logger.error(ex);
		}
		return undefined;
	}

	async exists(reviewId: string) {
		try {
			const { textFiles } = SessionContainer.instance();
			const path = this.buildPath(reviewId);
			const data = await textFiles.readTextFile({
				path: path
			});
			return !!data?.contents;
		} catch (ex) {
			Logger.error(ex);
		}
		return undefined;
	}

	updateComment() {
		// TODO
	}

	async deleteReview(reviewId: string) {
		try {
			const { textFiles } = SessionContainer.instance();
			const path = this.buildPath(reviewId);
			await textFiles.deleteTextFile({
				path: path
			});

			return true;
		} catch (ex) {
			Logger.error(ex);
		}
		return false;
	}

	deleteComment() {
		// TODO
	}

	mapToDiscussionNode(_: any, user: GitLabCurrentUser) {
		return {
			_pending: true,
			id: "undefined",
			createdAt: _.createdAt,
			notes: {
				nodes: [
					{
						_pending: true,
						author: {
							name: user.name,
							login: user.login,
							avatarUrl: user.avatarUrl
						},
						state: "PENDING",
						body: _.text,
						bodyText: _.text,
						createdAt: _.createdAt,
						id: "undefined",
						position: {
							oldPath: _.filePath,
							newPath: _.filePath,
							newLine: _.startLine
						}
					}
				]
			}
		};
	}
}

interface GitLabPullRequest {
	id: number;
	iid: number;
	number: number;
	title: string;
	web_url: string;
	state: string;
	target_branch: string;
	source_branch: string;
	references?: {
		short: string;
		relative: string;
		full: string;
	};
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
	login: string;
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
	id: string;
	iid: string;
	title: string;
	reference: string;
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
	references: {
		full: string;
	};
}
