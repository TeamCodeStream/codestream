"use strict";
import * as qs from "querystring";
import * as nodeUrl from "url";

import { GraphQLClient } from "graphql-request";
import { Response } from "undici";
import { URI } from "vscode-uri";
import {
	CreateThirdPartyCardRequest,
	DiscussionNode,
	FetchThirdPartyBoardsRequest,
	FetchThirdPartyBoardsResponse,
	FetchThirdPartyCardsRequest,
	FetchThirdPartyCardsResponse,
	FetchThirdPartyCardWorkflowRequest,
	FetchThirdPartyCardWorkflowResponse,
	GitLabBoard,
	GitLabCreateCardRequest,
	GitLabCreateCardResponse,
	MoveThirdPartyCardRequest,
	MoveThirdPartyCardResponse,
	ProviderConfigurationData,
	ProviderGetForkedReposResponse,
	ThirdPartyDisconnect,
	ThirdPartyProviderConfig,
} from "@codestream/protocols/agent";
import { CSGitLabProviderInfo } from "@codestream/protocols/api";

import { InternalError, ReportSuppressedMessages } from "../agentError";
import { Container, SessionContainer } from "../container";
import { GitRemoteLike } from "../git/models/remote";
import { toRepoName } from "../git/utils";
import { Logger } from "../logger";
import { CodeStreamSession } from "../session";
import { log, lspProvider } from "../system";
import { gate } from "../system/decorators/gate";
import { customFetch } from "../system/fetchCore";

import { ApiResponse, getRemotePaths, ThirdPartyProviderSupportsIssues } from "./provider";
import { ThirdPartyIssueProviderBase } from "./thirdPartyIssueProviderBase";
import { ProviderVersion } from "./types";

interface GitLabProject {
	path_with_namespace: any;
	namespace: {
		path: string;
	};
	id: number;
	path: string;
	issues_enabled: boolean;
	forked_from_project?: GitLabProject;
}

interface GitLabCurrentUser {
	avatarUrl: string;
	id: number;
	login: string;
	name: string;
}

interface GitLabBranch {
	name: string;
}

@lspProvider("gitlab")
export class GitLabProvider
	extends ThirdPartyIssueProviderBase<CSGitLabProviderInfo>
	implements ThirdPartyProviderSupportsIssues
{
	/** version used when a query to get the version fails */
	private static defaultUnknownVersion = "0.0.0";
	protected LOWEST_SUPPORTED_VERSION = {
		version: "13.6.4",
		asArray: [13, 6, 4],
		isDefault: false,
		isLowestSupportedVersion: true,
	};

	private _projectsByRemotePath = new Map<string, GitLabProject>();
	private _assignableUsersCache = new Map<string, any>();

	get displayName() {
		return "GitLab";
	}

	get name() {
		return "gitlab";
	}

	get headers(): any {
		return {
			Authorization: `Bearer ${this.accessToken}`,
			"Content-Type": "application/json",
		};
	}

	get apiPath() {
		return "/api/v4";
	}

	get baseUrl() {
		return `${this.baseWebUrl}${this.apiPath}`;
	}

	get baseWebUrl() {
		return `https://gitlab.com`;
	}

	constructor(session: CodeStreamSession, providerConfig: ThirdPartyProviderConfig) {
		super(session, providerConfig);
	}

	async ensureInitialized() {
		await this.getCurrentUser();
	}

	canConfigure() {
		return true;
	}

	async verifyConnection(config: ProviderConfigurationData): Promise<void> {
		await this.verifyConnectionWithCurrentUserQuery();
	}

	async onConnected(providerInfo?: CSGitLabProviderInfo) {
		await super.onConnected(providerInfo);
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
					id: p.id.toString(),
					name: p.path_with_namespace,
					path: p.path,
					singleAssignee: true, // gitlab only allows a single assignee per issue (at least it only shows one in the UI)
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
			}
			boards = gitLabProjects.map(p => {
				return {
					...p,
					id: p.id,
					name: p.path_with_namespace,
					path: p.path,
					singleAssignee: true, // gitlab only allows a single assignee per issue (at least it only shows one in the UI)
				};
			});
		}

		return {
			boards,
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
								path: gitRepo.path,
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
			description: data.description,
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
	async moveCard(request: MoveThirdPartyCardRequest): Promise<MoveThirdPartyCardResponse> {
		// may want to implement this later, but for now just returns false
		return { success: false };
	}

	// FIXME
	async getCardWorkflow(
		request: FetchThirdPartyCardWorkflowRequest
	): Promise<FetchThirdPartyCardWorkflowResponse> {
		// may want to come back and implement
		return { workflow: [] };
	}

	replaceMe(filter: any, currentUser: GitLabCurrentUser) {
		if (filter?.assignee_username && filter["assignee_username"] === "@me") {
			filter["assignee_username"] = currentUser.login;
		}
		if (filter?.assignee_id && filter["assignee_id"] === "@me") {
			filter["assignee_id"] = currentUser.id;
		}
		if (filter?.author_username && filter["author_username"] === "@me") {
			filter["author_username"] = currentUser.login;
		}
		if (filter?.author_id && filter["author_id"] === "@me") {
			filter["author_id"] = currentUser.id;
		}
		if (filter?.reviewer_username && filter["reviewer_username"] === "@me") {
			filter["reviewer_username"] = currentUser.login;
		}
		if (filter?.reviewer_id && filter["reviewer_id"] === "@me") {
			filter["reviewer_id"] = currentUser.id;
		}
	}

	@log()
	async getCards(request: FetchThirdPartyCardsRequest): Promise<FetchThirdPartyCardsResponse> {
		await this.ensureConnected();
		const currentUser = await this.getCurrentUser();

		const filter = request.customFilter
			? JSON.parse(JSON.stringify(qs.parse(request.customFilter)))
			: undefined;

		// Replace @me
		if (filter && currentUser) this.replaceMe(filter, currentUser);

		if (filter && filter.scope) {
			filter["scope"] = "all";
		}
		let url;
		if (filter?.project_id) {
			const projectId = filter["project_id"];
			delete filter["project_id"];
			url = `/projects/${projectId}/issues?${qs.stringify(filter)}`;
		} else if (filter?.group_id) {
			const groupId = filter["group_id"];
			delete filter["group_id"];
			url = `/groups/${groupId}/issues?${qs.stringify(filter)}`;
		} else {
			url = filter
				? "/issues?" + qs.stringify(filter)
				: "/issues?state=opened&scope=assigned_to_me";
		}

		try {
			const response = await this.get<any[]>(url);
			const cards = response.body.map(card => {
				return {
					id: card.id,
					url: card.web_url,
					title: card.title,
					modifiedAt: new Date(card.updated_at).getTime(),
					tokenId: card.iid,
					body: card.description,
				};
			});
			return { cards };
		} catch (ex) {
			return {
				cards: [],
				error: ex,
			};
		}
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

	@gate()
	@log()
	async getAssignableUsers(request: { boardId: string }) {
		await this.ensureConnected();
		const data = this._assignableUsersCache.get(request.boardId);
		if (data) {
			return data;
		}

		const users = await this._paginateRestResponse(`/projects/${request.boardId}/users`, data => {
			return data.map(u => ({
				...u,
				displayName: u.username,
				login: u.username,
			}));
		});
		this._assignableUsersCache.set(request.boardId, { users });
		return { users };
	}

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

	getOwnerFromRemote(remote: string): { owner: string; name: string } {
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
			name: name!,
		};
	}

	private _pullRequestsContainingShaCache = new Map<string, any[]>();
	async getPullRequestsContainigSha(
		repoIdentifiers: { owner: string; name: string }[],
		sha: string
	): Promise<any[]> {
		const cached = this._pullRequestsContainingShaCache.get(sha);
		if (cached) return cached;

		const result = [];
		for (const repoIdentifier of repoIdentifiers) {
			const { owner, name } = repoIdentifier;
			try {
				const url = `/projects/${encodeURIComponent(
					`${owner}/${name}`
				)}/repository/commits/${sha}/merge_requests`;
				const mrs = await this.get<any>(url);
				for (const mr of mrs.body as any[]) {
					result.push({
						id: mr.id,
						title: mr.title,
						url: mr.web_url,
					});
				}
			} catch (ex) {
				Logger.warn(ex);
			}
		}
		this._pullRequestsContainingShaCache.set(sha, result);

		return result;
	}

	async getForkedRepos(request: { remote: string }): Promise<ProviderGetForkedReposResponse> {
		try {
			const { owner, name } = this.getOwnerFromRemote(request.remote);

			const projectResponse = await this.get<GitLabProject>(
				`/projects/${encodeURIComponent(`${owner}/${name}`)}`
			);
			const parentProject = projectResponse.body.forked_from_project
				? projectResponse.body.forked_from_project
				: projectResponse.body;

			const branchesByProjectId = new Map<number, GitLabBranch[]>();
			if (projectResponse.body.forked_from_project) {
				const branchesResponse = await this.get<GitLabBranch[]>(
					`/projects/${encodeURIComponent(
						projectResponse.body.forked_from_project.path_with_namespace
					)}/repository/branches`
				);
				branchesByProjectId.set(projectResponse.body.forked_from_project.id, branchesResponse.body);
			}

			const branchesResponse = await this.get<GitLabBranch[]>(
				`/projects/${encodeURIComponent(
					projectResponse.body.path_with_namespace
				)}/repository/branches`
			);
			branchesByProjectId.set(projectResponse.body.id, branchesResponse.body);

			const forksResponse = await this.get<GitLabProject[]>(
				`/projects/${encodeURIComponent(parentProject.path_with_namespace)}/forks`
			);
			for (const project of forksResponse.body) {
				const branchesResponse = await this.get<GitLabBranch[]>(
					`/projects/${encodeURIComponent(project.path_with_namespace)}/repository/branches`
				);
				branchesByProjectId.set(project.id, branchesResponse.body);
			}

			const response = {
				self: {
					nameWithOwner: projectResponse.body.path_with_namespace,
					owner: owner,
					id: projectResponse.body.id,
					refs: {
						nodes: branchesByProjectId
							.get(projectResponse.body.id)!
							.map(branch => ({ name: branch.name })),
					},
				},
				forks: forksResponse.body.map(fork => ({
					nameWithOwner: fork.path_with_namespace,
					owner: fork.namespace.path,
					id: fork.id,
					refs: {
						nodes: branchesByProjectId.get(fork.id)!.map(branch => ({ name: branch.name })),
					},
				})),
			} as ProviderGetForkedReposResponse;
			if (projectResponse.body.forked_from_project) {
				response.parent = {
					nameWithOwner: parentProject.path_with_namespace,
					owner: parentProject.namespace.path,
					id: parentProject.id,
					refs: {
						nodes: branchesByProjectId
							.get(parentProject.id)!
							.map(branch => ({ name: branch.name })),
					},
				};
			}
			return response;
		} catch (ex) {
			return this.handleProviderError(ex, request);
		}
	}

	get graphQlBaseUrl() {
		return `${this.baseUrl.replace("/v4", "")}/graphql`;
	}

	private _providerVersions = new Map<string, ProviderVersion>();

	@gate()
	async getVersion(): Promise<ProviderVersion> {
		let version;
		try {
			// a user could be connected to both GL and GL self-managed
			version = this._providerVersions.get(this.providerConfig.id);
			if (version) return version;

			const response = await this.get<{
				version: string;
				revision: string;
			}>("/version");

			const split = response.body.version.split("-");
			const versionOrDefault = split[0] || GitLabProvider.defaultUnknownVersion;
			version = {
				version: versionOrDefault,
				asArray: versionOrDefault.split(".").map(Number),
				edition: split.length > 1 ? split[1] : undefined,
				revision: response.body.revision,
				isDefault: versionOrDefault === GitLabProvider.defaultUnknownVersion,
			} as ProviderVersion;

			Logger.log(
				`${this.providerConfig.id} getVersion - ${this.providerConfig.id} version=${JSON.stringify(
					version
				)}`
			);

			Container.instance().errorReporter.reportBreadcrumb({
				message: `${this.providerConfig.id} getVersion`,
				data: {
					...version,
				},
			});
		} catch (ex) {
			Logger.warn(
				`${this.providerConfig.id} getVersion failed, defaulting to lowest supporting version`,
				{
					error: ex,
					lowestSupportedVersion: this.LOWEST_SUPPORTED_VERSION,
				}
			);
			version = this.LOWEST_SUPPORTED_VERSION;
		}

		this._providerVersions.set(this.providerConfig.id, version);
		return version;
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
			throw new Error("Could not get a GitLab personal access token");
		}

		this._client.setHeaders({
			Authorization: `Bearer ${this.accessToken}`,
		});

		return this._client;
	}

	async query<T = any>(query: string, variables: any = undefined) {
		if (this._providerInfo && this._providerInfo.tokenError) {
			delete this._client;
			throw new InternalError(ReportSuppressedMessages.AccessTokenInvalid);
		}

		let response;
		try {
			response = await (await this.client()).rawRequest<any>(query, variables);
		} catch (ex) {
			const exType = this._isSuppressedException(ex);
			if (exType !== undefined) {
				Logger.warn("GitLab query caught:", ex);
				if (exType !== ReportSuppressedMessages.NetworkError) {
					this.trySetThirdPartyProviderInfo(ex, exType);
				}
				// this throws the error but won't log to sentry (for ordinary network errors that seem temporary)
				throw new InternalError(exType, { error: ex });
			} else {
				Logger.warn("GitLab query error:", {
					error: JSON.stringify(ex, Object.getOwnPropertyNames(ex)),
				});

				if (ex.response?.data) {
					return ex.response.data as T;
				}
				// this is an unexpected error, throw the exception normally
				throw ex;
			}
		}

		return response.data as T;
	}

	async mutate<T>(query: string, variables: any = undefined) {
		return (await this.client()).request<T>(query, variables);
	}

	async get<T extends object>(url: string): Promise<ApiResponse<T>> {
		// override the base to add additional error handling
		let response;
		try {
			response = await super.get<T>(url);
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

	// For GLSM we need to verify with graphql instead of the rest API.  This is because
	// GLSM has project tokens that could potentially be used and allow for rest api
	// authentication, but will not work when we eventually have to use graphql.
	async verifyConnectionWithCurrentUserQuery() {
		const response = await this.query<any>(
			`{
				currentUser {
					id
				}
			}			  
			`,
			{}
		);
		if (!response.currentUser) throw new Error("PAT could not fetch currentUser");
		return response.currentUser;
	}
	/**
	 * Gets the current user based on the GL providerId
	 *
	 * @memberof GitLabProvider
	 */
	_currentGitlabUsers = new Map<string, GitLabCurrentUser>();
	@gate()
	async getCurrentUser(): Promise<GitLabCurrentUser> {
		let currentUser = this._currentGitlabUsers.get(this.providerConfig.id);
		if (currentUser) return currentUser;

		const data = await this.restGet<{
			id: number;
			username: string;
			name: string;
			avatar_url: string;
		}>("/user");
		currentUser = {
			id: data.body.id,
			login: data.body.username,
			name: data.body.name,
			avatarUrl: data.body.avatar_url,
		} as GitLabCurrentUser;

		currentUser = this.toAuthorAbsolutePath(currentUser);
		this._currentGitlabUsers.set(this.providerConfig.id, currentUser);

		Logger.log(`getCurrentUser ${JSON.stringify(currentUser)} for id=${this.providerConfig.id}`);
		return currentUser;
	}

	private toAuthorAbsolutePath(author: any): GitLabCurrentUser {
		if (author?.avatarUrl?.indexOf("/") === 0) {
			// no really great way to handle this...
			author.avatarUrl = `${this.baseWebUrl}${author.avatarUrl}`;
		}
		return author;
	}

	onDisconnected(request: ThirdPartyDisconnect) {
		this._currentGitlabUsers.clear();
		this._projectsByRemotePath.clear();
		this._assignableUsersCache.clear();
		this._ignoredFeatures.clear();

		return super.onDisconnected(request);
	}

	_ignoredFeatures: Map<"approvals", boolean> = new Map();

	async getReviewers(request: { pullRequestId: string }) {
		const { projectFullPath } = this.parseId(request.pullRequestId);

		const users = await this.getAssignableUsers({ boardId: encodeURIComponent(projectFullPath) });
		return users;
	}

	parseId(pullRequestId: string) {
		const parsed = JSON.parse(pullRequestId);
		// https://gitlab.com/gitlab-org/gitlab/-/blob/1cb9fe25/doc/api/README.md#id-vs-iid
		// id - Is unique across all issues and is used for any API call
		// iid - Is unique only in scope of a single project. When you browse issues or merge requests with the Web UI, you see the iid
		return {
			id: parsed.id,
			projectFullPath: parsed.full.split("!")[0],
			iid: parsed.full.split("!")[1],
		};
	}

	private async _paginateRestResponse(url: string, map: (data: any[]) => any[]) {
		let page: string | null = "1";
		let results: any[] = [];

		// url is only a path here and need this scheme for parsing
		const parsed = new nodeUrl.URL(url, "codestream://");

		while (true) {
			parsed.searchParams.set("page", page);
			const requestUrl = `${parsed.pathname}?${parsed.searchParams.toString()}&per_page=100`;
			const response = await this.restGet<any>(requestUrl);
			results = results.concat(map(response.body as any[]));
			// Logger.warn("RESPONSE: " + JSON.stringify(response.body, null, 4));
			const nextPage = response.response.headers.get("x-next-page");
			if (nextPage === page || !nextPage) {
				break;
				// } else if (parseInt(page, 10) > 10) {
				// 	break;
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

class GitLabId {
	constructor(
		private projectFullPath: string,
		private iid: string
	) {}

	/**
	 * creates a file-system safe path string
	 *
	 * @return {*}
	 * @memberof GitLabId
	 */
	asString() {
		return `${this.projectFullPath.replace(/\//g, "-")}-${this.iid}`.toLocaleLowerCase();
	}
}

class GitLabReviewStore {
	private path: string = "gitlab-review";
	private version: string = "1.0.0";

	private buildPath(id: GitLabId) {
		return this.path + "-" + id.asString() + ".json";
	}

	async add(id: GitLabId, comment: any) {
		try {
			const { textFiles } = SessionContainer.instance();
			const path = this.buildPath(id);
			const current = (
				await textFiles.readTextFile({
					path: path,
				})
			)?.contents;
			const data = JSON.parse(current || "{}") || ({} as GitLabReview);
			comment = {
				...comment,
				startLine: comment.endLine ? comment.endLine : comment.startLine,
				id: new Date().getTime().toString(),
			};
			if (data && data.comments) {
				data.comments.push(comment);
			} else {
				data.version = this.version;
				data.comments = [comment];
			}
			await textFiles.writeTextFile({
				path: path,
				contents: JSON.stringify(data),
			});

			return true;
		} catch (ex) {
			Logger.error(ex);
		}
		return false;
	}

	async get(id: GitLabId): Promise<GitLabReview | undefined> {
		try {
			const { textFiles } = SessionContainer.instance();
			const path = this.buildPath(id);
			const current = (
				await textFiles.readTextFile({
					path: path,
				})
			)?.contents;
			const data = JSON.parse(current || "{}") as GitLabReview;
			return data;
		} catch (ex) {
			Logger.error(ex);
		}
		return undefined;
	}

	async exists(id: GitLabId) {
		try {
			const { textFiles } = SessionContainer.instance();
			const path = this.buildPath(id);
			const data = await textFiles.readTextFile({
				path: path,
			});
			if (!data || !data.contents) return false;

			const review = JSON.parse(data.contents || "{}") as GitLabReview;
			return review?.comments?.length > 0;
		} catch (ex) {
			Logger.error(ex);
		}
		return undefined;
	}

	async updateComment(id: GitLabId, commentId: string, text: string) {
		const review = await this.get(id);
		if (review) {
			const comment = review.comments?.find(_ => _.id === commentId);
			if (comment) {
				comment.text = text;
				const { textFiles } = SessionContainer.instance();
				const path = this.buildPath(id);
				await textFiles.writeTextFile({
					path: path,
					contents: JSON.stringify(review),
				});

				return comment;
			}
		}

		return false;
	}

	async deleteReview(id: GitLabId) {
		try {
			const { textFiles } = SessionContainer.instance();
			const path = this.buildPath(id);
			await textFiles.deleteTextFile({
				path: path,
			});

			return true;
		} catch (ex) {
			Logger.error(ex);
		}
		return false;
	}

	async deleteComment(id: GitLabId, commentId: string) {
		const review = await this.get(id);
		if (review) {
			review.comments = review.comments.filter(_ => _.id !== commentId);
			if (review.comments.length) {
				const { textFiles } = SessionContainer.instance();
				const path = this.buildPath(id);
				await textFiles.writeTextFile({
					path: path,
					contents: JSON.stringify(review),
				});
			} else {
				// if we aren't left with any comments... just delete the review/file
				await this.deleteReview(id);
			}
			return review;
		}

		return undefined;
	}

	mapToDiscussionNode(_: any, user: GitLabCurrentUser): DiscussionNode {
		const id = (_.id || new Date().getTime()).toString();
		const dn = {
			_pending: true,
			id: id,
			createdAt: _.createdAt,
			resolved: false,
			resolvable: false,
			notes: {
				nodes: [
					{
						_pending: true,
						userPermissions: {
							adminNote: true,
							readNote: true,
							resolveNote: true,
							awardEmoji: true,
							createNote: true,
						},
						id: id,
						author: {
							name: user.name,
							login: user.login,
							avatarUrl: user.avatarUrl,
						},
						resolved: false,
						resolvable: true,
						systemNoteIconName: "",
						discussion: {
							id: _.createdAt,
						},
						state: "PENDING",
						body: _.text,
						bodyText: _.text,
						createdAt: _.createdAt,
						position: {
							oldLine: _.oldLineNumber,
							oldPath: _.filePath,
							newPath: _.filePath,
							newLine: _.startLine,
						},
					},
				],
			},
		};

		return dn;
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
	line_range: {
		start: {
			new_line: number;
		};
	};
}

interface GitLabCreateMergeRequestRequest {
	title: string;
	source_branch: string;
	target_branch: string;
	target_project_id?: string;
	description?: string;
}

interface GitLabCreateMergeRequestResponse {
	id: string;
	iid: string;
	title: string;
	reference: string;
	references: {
		full: string;
	};
	web_url: string;
}

interface GitLabProjectInfoResponse {
	iid: number;
	id: number;
	default_branch: string;
	forked_from_project: GitLabProject | undefined;
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
