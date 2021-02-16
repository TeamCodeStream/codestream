"use strict";
import { GraphQLClient } from "graphql-request";
import { flatten } from "lodash-es";
import { Response } from "node-fetch";
import * as paths from "path";
import * as qs from "querystring";
import { URI } from "vscode-uri";
import { SessionContainer } from "../container";
import { GitRemoteLike } from "../git/models/remote";
import { GitRepository } from "../git/models/repository";
import { toRepoName } from "../git/utils";
import { Logger } from "../logger";

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
	MoveThirdPartyCardRequest
} from "../protocol/agent.protocol";
import { CSGitLabProviderInfo } from "../protocol/api.protocol";
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
					.map((pr: { created_at: string; id: string }) => ({
						...pr,
						id: `gid://gitlab/MergeRequest/${pr.id}`,
						providerId: this.providerConfig?.id,
						createdAt: new Date(pr.created_at).getTime()
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
		} else if (ex.message && ex.message.match(/GraphQL Error \(Code: 404\)/)) {
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
				if (exType !== ReportSuppressedMessages.NetworkError) {
					// we know about this error, and we want to give the user a chance to correct it
					// (but throwing up a banner), rather than logging the error to sentry
					this.session.api.setThirdPartyProviderInfo({
						providerId: this.providerConfig.id,
						data: {
							tokenError: {
								error: ex,
								occurredAt: Date.now(),
								isConnectionError: exType === ReportSuppressedMessages.ConnectionError
							}
						}
					});
					delete this._client;
				}
				// this throws the error but won't log to sentry (for ordinary network errors that seem temporary)
				throw new InternalError(exType, { error: ex });
			} else {
				// this is an unexpected error, throw the exception normally
				throw ex;
			}
		}

		return response;
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

	_pullRequestCache: Map<
		string,
		{
			project: {
				name: string;
				mergeRequest: {
					id: string;
					iid: string;
				};
			};
		}
	> = new Map();

	@log()
	async getPullRequest(request: { pullRequestId: string; force?: boolean }): Promise<any> {
		let projectFullPath;
		let iid;
		let actualPullRequestId;
		if (request.pullRequestId) {
			const parsed = JSON.parse(request.pullRequestId);
			actualPullRequestId = parsed.id;
			projectFullPath = parsed.full.split("!")[0];
			iid = parsed.full.split("!")[1];
		}

		// const { scm: scmManager } = SessionContainer.instance();
		await this.ensureConnected();

		if (request.force) {
			this._pullRequestCache.delete(actualPullRequestId);
		} else {
			const cached = this._pullRequestCache.get(actualPullRequestId);
			if (cached) {
				return cached;
			}
		}

		let response = {} as any;
		try {
			const q = `query GetPullRequest($fullPath:ID!, $iid:String!) {
				project(fullPath: $fullPath) {
				  name
				  mergeRequest(iid: $iid) {
					id
					iid
					createdAt
					sourceBranch
					targetBranch
					title
					webUrl
					state
					mergedAt
					reference
					projectId
					author {
						name
						username
						avatarUrl
					}
					diffRefs {
						baseSha
						headSha
						startSha
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
							  name
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

			response = await this.query(q, {
				fullPath: projectFullPath,
				iid: iid.toString()
			});

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
			response.project.mergeRequest.url = response.project.mergeRequest.sourceProject.webUrl;
			response.project.mergeRequest.merged = !!response.project.mergeRequest.mergedAt;
			// build this so that it aligns with what the REST api created
			response.project.mergeRequest.references = {
				full: `${response.project.mergeRequest.sourceProject.fullPath}${response.project.mergeRequest.reference}`
			};

			const mergeRequestFullId = JSON.stringify({
				id: response.project.mergeRequest.id,
				full: response.project.mergeRequest.references.full
			});
			response.project.mergeRequest.idComputed = mergeRequestFullId;
			response.project.mergeRequest.discussions.nodes.forEach((_: any) => {
				if (_.notes && _.notes.nodes && _.notes.nodes.length) {
					_.notes.nodes.forEach((n: any) => {
						if (n.discussion && n.discussion.id) {
							// hijack the "databaseId" that github uses
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
			this._pullRequestCache.set(actualPullRequestId, response);

			(
				await Promise.all([
					this._projectEvents(projectFullPath, iid),
					this._labelEvents(projectFullPath, iid),
					this._milestoneEvents(projectFullPath, iid)
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
		let projectFullPath;
		let iid;
		if (request.pullRequestId) {
			const parsed = JSON.parse(request.pullRequestId);
			projectFullPath = parsed.full.split("!")[0];
			iid = parsed.full.split("!")[1];
		}

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
	async createPullRequestComment(request: {
		pullRequestId: string;
		text: string;
		noteableId?: string;
		projectFullPath?: string;
		iid?: string;
	}): Promise<Directives> {
		let noteableId;
		if (request.pullRequestId) {
			const parsed = JSON.parse(request.pullRequestId);
			noteableId = parsed.id;
			request.projectFullPath = parsed.full.split("!")[0];
			request.iid = parsed.full.split("!")[1];
		}
		request.noteableId = noteableId;

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
		pullRequestId: string;
	}): Promise<Directives | undefined> {
		const noteId = request.id;
		let actualPullRequestId;

		if (request.pullRequestId) {
			const parsed = JSON.parse(request.pullRequestId);
			actualPullRequestId = parsed.id;
		}

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

		this._pullRequestCache.delete(actualPullRequestId);
		this.session.agent.sendNotification(DidChangePullRequestCommentsNotificationType, {
			pullRequestId: actualPullRequestId,
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

	async createPullRequestCommentAndClose(request: { pullRequestId: string; text: string }) {
		const parsed = JSON.parse(request.pullRequestId);
		const projectFullPath = parsed.full.split("!")[0];
		const iid = parsed.full.split("!")[1];

		let directives: any = [];

		if (request.text) {
			const response1 = await this.createPullRequestComment({ ...request, iid: iid });
			if (response1.directives) {
				directives = directives.concat(response1.directives);
			}
		}

		// https://docs.gitlab.com/ee/api/merge_requests.html#update-mr
		const mergeRequestUpdatedResponse = await this.restPut<
			{ state_event: string },
			{
				merge_status: string;
				merged_at: any;
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
			data: await this._projectEvents(projectFullPath, iid)
		});

		return {
			directives: directives
		};
	}

	async createPullRequestCommentAndReopen(request: {
		pullRequestId: string;
		text: string;
	}): Promise<any> {
		const parsed = JSON.parse(request.pullRequestId);
		const projectFullPath = parsed.full.split("!")[0];
		const iid = parsed.full.split("!")[1];

		let directives: any = [];

		if (request.text) {
			const response1 = await this.createPullRequestComment({ ...request, iid: iid });
			if (response1.directives) {
				directives = directives.concat(response1.directives);
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
			data: await this._projectEvents(projectFullPath, iid)
		});

		return {
			directives: directives
		};
	}

	async getPullRequestCommits(
		request: FetchThirdPartyPullRequestCommitsRequest
	): Promise<FetchThirdPartyPullRequestCommitsResponse[]> {
		const parsed = JSON.parse(request.pullRequestId);
		request.pullRequestId = parsed.id;
		const projectFullPath = parsed.full.split("!")[0];
		const iid = parsed.full.split("!")[1];

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
				// commitId: _.id,
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

	async getPullRequestFilesChanged(request: {
		pullRequestId: string;
	}): Promise<FetchThirdPartyPullRequestFilesResponse[]> {
		// https://developer.github.com/v3/pulls/#list-pull-requests-files
		const changedFiles: FetchThirdPartyPullRequestFilesResponse[] = [];
		const parsed = JSON.parse(request.pullRequestId);
		request.pullRequestId = parsed.id;
		const projectFullPath = parsed.full.split("!")[0];
		const iid = parsed.full.split("!")[1];

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

	async getPullRequestReviewId(request: { pullRequestId: string }) {
		//TODO?
		return undefined;
	}

	async createPullRequestInlineComment(request: {
		pullRequestId: string;
		text: string;
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
			sha: request.rightSha
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
		const parsed = JSON.parse(request.pullRequestId);
		const actualPullRequestId = parsed.id;
		const projectFullPath = parsed.full.split("!")[0];
		const iid = parsed.full.split("!")[1];

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

		this._pullRequestCache.delete(actualPullRequestId);
		this.session.agent.sendNotification(DidChangePullRequestCommentsNotificationType, {
			pullRequestId: actualPullRequestId
		});

		return data.body;
	}

	private async _projectEvents(projectFullPath: string, iid: string) {
		const projectEvents = ((await this.restGet(
			`/projects/${encodeURIComponent(projectFullPath)}/events`
		))!.body as any[])
			// exclude the "comment" events as those exist in discussion/notes
			.filter(
				_ =>
					/*_.target_iid.toString() === iid && */ _.action_name !== "commented on" &&
					_.action_name !== "pushed to"
			)
			.map(_ => {
				return {
					type: "merge-request",
					author: _.author,
					action: _.action_name,
					createdAt: _.created_at,
					id: _.id,
					projectId: _.project_id,
					targetId: _.target_id,
					targetTitle: _.target_title,
					targetType: _.target_type
				};
			});
		return projectEvents;
	}

	private async _milestoneEvents(projectFullPath: string, iid: string) {
		const milestoneEvents = ((await this.restGet(
			`/projects/${encodeURIComponent(
				projectFullPath
			)}/merge_requests/${iid}/resource_milestone_events`
		))!.body as any[]).map(_ => {
			return {
				type: "milestone",
				createdAt: _.created_at,
				action: _.action,
				id: _.id,
				label: _.label,
				resourceType: _.resource_type,
				user: _.user
			};
		});
		return milestoneEvents;
	}

	private async _labelEvents(projectFullPath: string, iid: string) {
		const labelEvents = ((await this.restGet(
			`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}/resource_label_events`
		))!.body as any[]).map(_ => {
			return {
				type: "label",
				createdAt: _.created_at,
				action: _.action,
				id: _.id,
				label: _.label,
				resourceType: _.resource_type,
				user: _.user
			};
		});
		return labelEvents;
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
	references: {
		full: string;
	};
}
