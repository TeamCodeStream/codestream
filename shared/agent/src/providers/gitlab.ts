"use strict";
import { parsePatch } from "diff";
import { print } from "graphql";
import { GraphQLClient } from "graphql-request";
import { merge } from "lodash";
import { flatten, groupBy } from "lodash-es";
import { Response } from "node-fetch";
import * as paths from "path";
import * as qs from "querystring";
import semver from "semver";
import * as nodeUrl from "url";
import { URI } from "vscode-uri";
import { InternalError, ReportSuppressedMessages } from "../agentError";
import { Container, SessionContainer } from "../container";
import { GitRemoteLike } from "../git/models/remote";
import { GitRepository } from "../git/models/repository";
import { ParsedDiffWithMetadata, toRepoName, translatePositionToLineNumber } from "../git/utils";
import { Logger } from "../logger";
import {
	CreateThirdPartyCardRequest,
	DidChangePullRequestCommentsNotificationType,
	DiscussionNode,
	DocumentMarker,
	FetchThirdPartyBoardsRequest,
	FetchThirdPartyBoardsResponse,
	FetchThirdPartyCardsRequest,
	FetchThirdPartyCardsResponse,
	FetchThirdPartyCardWorkflowRequest,
	FetchThirdPartyCardWorkflowResponse,
	FetchThirdPartyPullRequestCommitsRequest,
	FetchThirdPartyPullRequestCommitsResponse,
	FetchThirdPartyPullRequestFilesResponse,
	GetMyPullRequestsRequest,
	GetMyPullRequestsResponse,
	GitLabBoard,
	GitLabCreateCardRequest,
	GitLabCreateCardResponse,
	GitLabLabel,
	GitLabMergeRequest,
	GitLabMergeRequestWrapper,
	MoveThirdPartyCardRequest,
	MoveThirdPartyCardResponse,
	Note,
	ThirdPartyProviderConfig
} from "../protocol/agent.protocol";
import { CSGitLabProviderInfo } from "../protocol/api.protocol";
import { CodeStreamSession } from "../session";
import { Dates, log, lspProvider, Strings } from "../system";
import { gate } from "../system/decorators/gate";
import { Directive, Directives } from "./directives";
import mergeRequestNoteMutation from "./gitlab/createMergeRequestNote.graphql";
import { GraphqlQueryBuilder } from "./gitlab/graphqlQueryBuilder";
import mergeRequest0Query from "./gitlab/mergeRequest0.graphql";
import mergeRequest1Query from "./gitlab/mergeRequest1.graphql";
import mergeRequestDiscussionQuery from "./gitlab/mergeRequestDiscussions.graphql";
import {
	ApiResponse,
	getRemotePaths,
	ProviderCreatePullRequestRequest,
	ProviderCreatePullRequestResponse,
	ProviderGetForkedReposResponse,
	ProviderGetRepoInfoResponse,
	ProviderVersion,
	PullRequestComment,
	REFRESH_TIMEOUT,
	ThirdPartyIssueProviderBase,
	ThirdPartyProviderSupportsIssues
} from "./provider";

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
export class GitLabProvider extends ThirdPartyIssueProviderBase<CSGitLabProviderInfo>
	implements ThirdPartyProviderSupportsIssues {
	/** version used when a query to get the version fails */
	private static defaultUnknownVersion = "0.0.0";

	private _projectsByRemotePath = new Map<string, GitLabProject>();
	private _assignableUsersCache = new Map<string, any>();
	private readonly gitLabReviewStore: GitLabReviewStore;
	private readonly graphqlQueryBuilder: GraphqlQueryBuilder;

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
		this.gitLabReviewStore = new GitLabReviewStore();
		this.graphqlQueryBuilder = new GraphqlQueryBuilder(providerConfig.id);
	}

	async ensureInitialized() {
		await this.getCurrentUser();
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

	@log()
	async getCards(request: FetchThirdPartyCardsRequest): Promise<FetchThirdPartyCardsResponse> {
		await this.ensureConnected();

		const url = request.customFilter ? "/issues?" + request.customFilter : "/issues";

		try {
			const response = await this.get<any[]>(url);
			const cards = response.body.map(card => {
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
		} catch (ex) {
			return {
				cards: [],
				badRequest: true
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
				avatarUrl: this.avatarUrl(u.avatar_url)
			}));
		});
		this._assignableUsersCache.set(request.boardId, { users });
		return { users };
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

			const sourceBranch = request.headRefName.includes(":")
				? request.headRefName.split(":")[1]
				: request.headRefName;

			const createPullRequestResponse = await this.post<
				GitLabCreateMergeRequestRequest,
				GitLabCreateMergeRequestResponse
			>(
				`/projects/${encodeURIComponent(`${owner}/${name}`)}/merge_requests`,
				{
					title: request.title,
					source_branch: sourceBranch,
					target_branch: request.baseRefName,
					target_project_id: request.providerRepositoryId,
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
					full: createPullRequestResponse.body.references.full,
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

	async getForkedRepos(request: { remote: string }): Promise<ProviderGetForkedReposResponse> {
		try {
			const { remote } = request;
			const { owner, name } = this.getOwnerFromRemote(request.remote);

			const projectResponse = await this.get<GitLabProject>(
				`/projects/${encodeURIComponent(`${owner}/${name}`)}`
			);
			const parentProject = projectResponse.body.forked_from_project
				? projectResponse.body.forked_from_project
				: projectResponse.body;

			const branchesByProjectId = new Map<number, GitLabBranch[]>();
			const branchesResponse = await this.get<GitLabBranch[]>(
				`/projects/${encodeURIComponent(parentProject.path_with_namespace)}/repository/branches`
			);
			branchesByProjectId.set(parentProject.id, branchesResponse.body);

			const forksResponse = await this.get<GitLabProject[]>(
				`/projects/${encodeURIComponent(parentProject.path_with_namespace)}/forks`
			);
			for (const project of forksResponse.body) {
				const branchesResponse = await this.get<GitLabBranch[]>(
					`/projects/${encodeURIComponent(project.path_with_namespace)}/repository/branches`
				);
				branchesByProjectId.set(project.id, branchesResponse.body);
			}

			return {
				parent: {
					nameWithOwner: parentProject.path_with_namespace,
					owner: {
						login: parentProject.namespace.path
					},
					id: parentProject.id,
					refs: {
						nodes: branchesByProjectId.get(parentProject.id)!.map(branch => ({ name: branch.name }))
					}
				},
				forks: forksResponse.body.map(fork => ({
					nameWithOwner: fork.path_with_namespace,
					owner: {
						login: fork.namespace.path
					},
					id: fork.id,
					refs: {
						nodes: branchesByProjectId.get(fork.id)!.map(branch => ({ name: branch.name }))
					}
				}))
			};
		} catch (ex) {
			Logger.error(ex, `${this.providerConfig.id}: getForkedRepos`, {
				remote: request.remote
			});
			let errorMessage =
				ex.response && ex.response.errors
					? ex.response.errors[0].message
					: `Unknown ${this.providerConfig.name} error`;
			errorMessage = `${this.providerConfig.name}: ${errorMessage}`;
			return {
				error: {
					type: "PROVIDER",
					message: errorMessage
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
		const currentUser = await this.getCurrentUser();
		const currentVersion = await this.getVersion();
		if (!currentVersion.isDefault && semver.lt(currentVersion.version, "12.0.0")) {
			// InternalErrors don't get sent to sentry
			throw new InternalError(`${this.displayName} ${currentVersion.version} is not yet supported`);
		}

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

		const queries = request.queries.map(query =>
			query === "recent" ? "scope:created_by_me per_page:5" : query
		);

		let items;
		const promises: Promise<ApiResponse<any>>[] = [];
		const createQueryString = (query: string) =>
			query
				.trim()
				.split(" ")
				.map(kvp => this.toKeyValuePair(kvp, currentUser))
				.join("&");

		if (repos.length) {
			// https://docs.gitlab.com/ee/api/merge_requests.html
			const buildUrl = (repo: string, query: string) => {
				return `/projects/${encodeURIComponent(repo)}/merge_requests?${createQueryString(
					query
				)}&with_labels_details=true`;
			};

			for (const query of queries) {
				const splits = query.split(",");
				if (splits.length > 1) {
					let results: any = { body: {} };
					const splitPromises = [];
					for (const split of splits) {
						for (const repo of repos) {
							splitPromises.push(this.get<any>(buildUrl(repo, split)));
						}
					}
					const resolveSplitPromises = await Promise.all(splitPromises);
					// merge the results of the split promises so that it appears as if it's 1 query
					results = merge(results, ...resolveSplitPromises);
					promises.push(new Promise(resolve => resolve(results)));
				} else {
					splits.forEach(split => {
						repos.forEach(repo => {
							promises.push(this.get<any>(buildUrl(repo, split)));
						});
					});
				}
			}
		} else {
			const buildUrl = (query: string) => {
				return `/merge_requests?${createQueryString(query)}&with_labels_details=true`;
			};

			for (const query of queries) {
				const splits = query.split(",");
				if (splits.length > 1) {
					let results: any = { body: {} };
					const splitPromises = [];
					for (const split of splits) {
						splitPromises.push(this.get<any>(buildUrl(split)));
					}
					const resolveSplitPromises = await Promise.all(splitPromises);
					// merge the results of the split promises so that it appears as if it's 1 query
					results = merge(results, ...resolveSplitPromises);
					promises.push(new Promise(resolve => resolve(results)));
				} else {
					splits.forEach(split => {
						promises.push(this.get<any>(buildUrl(split)));
					});
				}
			}
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

				if (queries[index] && !queries[index].match(/\bsort:/)) {
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
				isDefault: versionOrDefault === GitLabProvider.defaultUnknownVersion
			} as ProviderVersion;

			Logger.log(
				`${this.providerConfig.id} getVersion - ${this.providerConfig.id} version=${JSON.stringify(
					version
				)}`
			);

			Container.instance().errorReporter.reportBreadcrumb({
				message: `${this.providerConfig.id} getVersion`,
				data: {
					...version
				}
			});
		} catch (ex) {
			Logger.warn(`${this.providerConfig.id} getVersion`, {
				error: ex
			});
			version = this.DEFAULT_VERSION;
		}

		this._providerVersions.set(this.providerConfig.id, version);
		return version;
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
					error: ex
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
			avatarUrl: data.body.avatar_url
		} as GitLabCurrentUser;

		currentUser = this.toAuthorAbsolutePath(currentUser);
		this._currentGitlabUsers.set(this.providerConfig.id, currentUser);

		Logger.log(`getCurrentUser ${JSON.stringify(currentUser)} for id=${this.providerConfig.id}`);
		return currentUser;
	}

	_pullRequestCache: Map<string, GitLabMergeRequestWrapper> = new Map();
	_ignoredFeatures: Map<"approvals", boolean> = new Map();

	async getReviewers(request: { pullRequestId: string }) {
		const { projectFullPath } = this.parseId(request.pullRequestId);

		const users = await this.getAssignableUsers({ boardId: encodeURIComponent(projectFullPath) });
		return users;
	}

	@log()
	async getPullRequest(request: {
		pullRequestId: string;
		accessRawDiffs?: boolean;
		force?: boolean;
	}): Promise<GitLabMergeRequestWrapper> {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		void (await this.ensureConnected());

		if (request.force) {
			this._pullRequestCache.delete(request.pullRequestId);
		} else {
			const cached = this._pullRequestCache.get(request.pullRequestId);
			if (cached) {
				return cached;
			}
		}

		const currentUser = await this.getCurrentUser();
		const providerVersion = await this.getVersion();

		let response = {} as GitLabMergeRequestWrapper;
		try {
			let discussions: DiscussionNode[] = [];
			let i = 0;
			const args = {
				fullPath: projectFullPath,
				iid: iid.toString()
			};
			const queryText0 = await this.graphqlQueryBuilder.build(
				providerVersion!.version!,
				mergeRequest0Query,
				"GetPullRequest"
			);

			// NOTE we are running TWO queries since they're kind of heavy and some GL instances
			// have been known to crash. oops.
			const response0 = await this.query(queryText0, args);
			discussions = discussions.concat(response0.project.mergeRequest.discussions.nodes);
			if (response0.project.mergeRequest.discussions.pageInfo?.hasNextPage) {
				let after = response0.project.mergeRequest.discussions.pageInfo.endCursor;
				const discussionQuery = await this.graphqlQueryBuilder.build(
					providerVersion!.version!,
					mergeRequestDiscussionQuery,
					"GetMergeRequestDiscussions"
				);

				while (true) {
					const paginated = await this.query(discussionQuery, {
						...args,
						after: after,
						first: 100
					});
					discussions = discussions.concat(paginated.project.mergeRequest.discussions.nodes);
					if (paginated.project.mergeRequest.discussions.pageInfo?.hasNextPage) {
						after = paginated.project.mergeRequest.discussions.pageInfo.endCursor;
						i++;
						Logger.log(`getPullRequest paginating discussions ${i}`);
					} else {
						break;
					}
				}
			}

			const queryText1 = await this.graphqlQueryBuilder.build(
				providerVersion!.version!,
				mergeRequest1Query,
				"GetPullRequest1"
			);

			const response1 = await this.query(queryText1, args);
			response = merge(
				{
					project: {
						mergeRequest: {
							discussions: {
								nodes: []
							}
						}
					}
				},
				response0,
				response1
			);
			response.currentUser = {
				...currentUser,
				id: `gid://gitlab/User/${currentUser.id}`
			};

			response.project.mergeRequest.discussions.nodes = discussions;

			// merge request settings
			const mergeRequest = await this.restGet<{
				diverged_commits_count: number;
				changes_count?: string;
				merged_at: string | undefined;
				author: {
					id: number;
					name: string;
					username: string;
					avatar_url: string;
				};
				assignees?: {
					name: string;
					username: string;
					id: number;
					avatar_url: string;
				}[];
			}>(
				`/projects/${encodeURIComponent(
					projectFullPath
				)}/merge_requests/${iid}?include_diverged_commits_count=true`
			);
			response.project.mergeRequest.divergedCommitsCount =
				mergeRequest.body.diverged_commits_count || 0;

			if (response.project?.mergeRequest?.headPipeline) {
				response.project.mergeRequest.headPipeline.gid =
					response.project.mergeRequest.headPipeline.id;
				response.project.mergeRequest.headPipeline.id = response.project.mergeRequest.headPipeline.id.replace(
					"gid://gitlab/Ci::Pipeline/",
					""
				);
				response.project.mergeRequest.headPipeline.webUrl = `${this.baseWebUrl}/${response.project.mergeRequest.project.fullPath}/-/pipelines/${response.project.mergeRequest.headPipeline.id}`;
			}
			if (!response.project.mergeRequest.author && mergeRequest.body.author) {
				response.project.mergeRequest.author = {
					avatarUrl: mergeRequest.body.author.avatar_url,
					name: mergeRequest.body.author.name,
					login: mergeRequest.body.author.username,
					id: `gid://gitlab/User/${mergeRequest.body.author.id}`
				};
			}
			if (!response.project.mergeRequest.mergedAt && mergeRequest.body.merged_at) {
				response.project.mergeRequest.mergedAt = mergeRequest.body.merged_at;
			}

			// assignees from graphql don't exist on <= 12.10.x
			// get it from REsT api
			response.project.mergeRequest.assignees = {
				nodes:
					mergeRequest.body?.assignees?.map(_ => {
						return {
							avatarUrl: _.avatar_url,
							name: _.name,
							login: _.username,
							id: `gid://gitlab/User/${_.id}`
						};
					}) || []
			};

			// massage the authors to get a fully qualified url
			this.toAuthorAbsolutePath(response.project.mergeRequest.author);
			[
				response.project.mergeRequest.approvedBy,
				response.project.mergeRequest.assignees,
				response.project.mergeRequest.participants,
				response.project.mergeRequest.reviewers
			].forEach(_ => {
				if (_?.nodes) {
					_.nodes.forEach((node: any) => {
						this.toAuthorAbsolutePath(node);
					});
				}
			});

			// project settings
			const project = await this.restGet<{
				merge_method: string;
				only_allow_merge_if_all_discussions_are_resolved: boolean;
				only_allow_merge_if_pipeline_succeeds: boolean;
				allow_merge_on_skipped_pipeline: boolean;
			}>(`/projects/${encodeURIComponent(projectFullPath)}`);

			response.project.mergeMethod = project.body.merge_method!;
			response.project.allowMergeOnSkippedPipeline = project.body.allow_merge_on_skipped_pipeline;
			response.project.onlyAllowMergeIfAllDiscussionsAreResolved =
				project.body.only_allow_merge_if_all_discussions_are_resolved;
			response.project.onlyAllowMergeIfPipelineSucceeds =
				project.body.only_allow_merge_if_pipeline_succeeds;

			const users = await this.getAssignableUsers({ boardId: encodeURIComponent(projectFullPath) });

			// if you are part of the project, you will see the approve box UI
			// from there there can be further restrictions
			response.project.mergeRequest.userPermissions.canAssign = response.project.mergeRequest.userPermissions.canApprove = !!users?.users.find(
				(_: any) => _.username === response.currentUser.login
			);

			try {
				if (this._ignoredFeatures.get("approvals") !== true) {
					// approval settings
					const approvals = await this.restGet<{
						merge_requests_author_approval: boolean;
					}>(`/projects/${encodeURIComponent(projectFullPath)}/approvals`);
					response.project.mergeRequest.approvalsAuthorCanApprove =
						approvals.body.merge_requests_author_approval;
				}
			} catch (ex) {
				Logger.warn("approvals", { error: ex });
				this._ignoredFeatures.set("approvals", true);
				Logger.log("Ignoring 'approvals'");
			}

			const base_id = this.fromMergeRequestGid(response.project.mergeRequest.id);
			// build this so that it aligns with what the REST api created
			response.project.mergeRequest.references = {
				full: `${projectFullPath}!${iid}`
			};
			const mergeRequestFullId = JSON.stringify({
				id: base_id,
				full: response.project.mergeRequest.references.full
			});

			// NOTE the following are _supposed_ to exist on the graph results, butttt
			// if they're null, try and fetch them from the commits
			if (response.project.mergeRequest.commitCount == null) {
				response.project.mergeRequest.commitCount = (
					await this.getPullRequestCommits({
						providerId: this.providerConfig.id,
						pullRequestId: mergeRequestFullId
					})
				)?.length;
			}

			const { filesChanged, overflow } = await this.getPullRequestFilesChangedCore({
				pullRequestId: mergeRequestFullId
			});
			if (typeof mergeRequest.body.changes_count === "string") {
				// The API is supposed to return overflow: true in cases like this, but this is not
				// happening on the cloud, so we attempt to get the information form changes_count first
				const changesCount = mergeRequest.body.changes_count;
				response.project.mergeRequest.changesCount = parseInt(changesCount, 10) || 0;
				response.project.mergeRequest.overflow = changesCount.indexOf("+") >= 0;
			} else {
				response.project.mergeRequest.changesCount = filesChanged?.length;
				response.project.mergeRequest.overflow = overflow;
			}

			// awards are "reactions" aka "emojis"
			const awards = await this.restGet<any>(
				`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}/award_emoji`
			);
			// massage awards into a model we want
			const grouped = groupBy(awards.body, (_: { name: string }) => _.name);
			response.project.mergeRequest.reactionGroups =
				Object.keys(grouped).map(_ => {
					const data = grouped[_];
					data.forEach(r => {
						r.user.login = r.user.username;
						r.user.avatarUrl = this.avatarUrl(r.user.avatar_url);
					});
					return { content: _, data };
				}) || [];

			response.project.mergeRequest = {
				...response.project.mergeRequest,
				providerId: this.providerConfig?.id,
				baseRefOid:
					response.project.mergeRequest.diffRefs && response.project.mergeRequest.diffRefs.baseSha,
				baseRefName: response.project.mergeRequest.targetBranch,
				headRefOid:
					response.project.mergeRequest.diffRefs && response.project.mergeRequest.diffRefs.headSha,
				headRefName: response.project.mergeRequest.sourceBranch,
				repository: {
					name: response.project.mergeRequest.project.path,
					nameWithOwner: response.project.mergeRequest.project.fullPath,
					url: response.project.mergeRequest.project.webUrl
				},
				number: parseInt(response.project.mergeRequest.iid, 10),
				url: response.project.mergeRequest.project.webUrl,
				baseWebUrl: this.baseWebUrl,
				merged: !!response.project.mergeRequest.mergedAt,
				idComputed: mergeRequestFullId,
				viewer: {
					id: response.currentUser.id,
					login: response.currentUser.login,
					name: response.currentUser.name,
					avatarUrl: this.avatarUrl(response.currentUser.avatarUrl),
					// we don't really have a great mapping here...
					viewerCanDelete: response.project.mergeRequest.userPermissions.adminMergeRequest
				}
			};

			await this.mapPullRequestModel(
				response,
				filesChanged,
				new GitLabId(projectFullPath, iid),
				currentUser
			);

			if (response.project.mergeRequest.author) {
				response.project.mergeRequest.viewerDidAuthor =
					response.project.mergeRequest.author.login == response.currentUser.login;
			}
			// get all timeline events
			(
				await Promise.all([
					this.getLabelEvents(projectFullPath, iid),
					this.getMilestoneEvents(projectFullPath, iid),
					this.getStateEvents(projectFullPath, iid)
				]).catch(ex => {
					Logger.error(ex);
					throw ex;
				})
			).forEach(_ => response.project.mergeRequest.discussions.nodes.push(..._));

			// sort all the nodes
			response.project.mergeRequest.discussions.nodes.sort((a: DiscussionNode, b: DiscussionNode) =>
				a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
			);

			response.project.mergeRequest.supports = this.graphqlQueryBuilder.getOrCreateSupportMatrix(
				providerVersion
			);

			response.project.mergeRequest.description = this.enhanceMarkdownBlock(
				response.project.mergeRequest.description,
				projectFullPath
			);

			this._pullRequestCache.set(request.pullRequestId, response);
		} catch (ex) {
			Logger.error(ex, "getMergeRequest", {
				...request
			});
			return {
				error: {
					message: ex.message
				}
			} as any;
		}

		return response;
	}

	private enhanceDiscussions(
		nodes: DiscussionNode[],
		projectFullPath: string,
		parsedPatches: Map<string, ParsedDiffWithMetadata>,
		filesChanged: FetchThirdPartyPullRequestFilesResponse[]
	) {
		if (!nodes) return;

		nodes.forEach((discussionNode: DiscussionNode) => {
			if (discussionNode.notes?.nodes?.length) {
				discussionNode.notes.nodes.forEach((note: any) => {
					this.enhanceNote(note, projectFullPath, parsedPatches, filesChanged);
				});
				discussionNode.notes.nodes[0].replies = discussionNode.notes.nodes.filter(
					(dn: DiscussionNode) => dn.id != discussionNode.notes?.nodes[0].id
				) as any;
				// remove all the replies from the parent (they're now on replies)
				discussionNode.notes.nodes.length = 1;
				discussionNode.notes.nodes[0].replies?.forEach(reply => {
					reply.position = discussionNode.notes!.nodes[0].position;
				});
			}
		});
	}

	private enhanceNote(
		note: Note,
		projectFullPath: string,
		parsedPatches: Map<string, ParsedDiffWithMetadata>,
		filesChanged: FetchThirdPartyPullRequestFilesResponse[]
	) {
		if (note.discussion && note.discussion.id) {
			// HACK hijack the "databaseId" that github uses
			note.databaseId = note.discussion.id
				.replace("gid://gitlab/DiffDiscussion/", "")
				.replace("gid://gitlab/IndividualNoteDiscussion/", "");

			this.toAuthorAbsolutePath(note.author);
		}

		if (note.body != null) {
			note.body = this.enhanceMarkdownBlock(note.body, projectFullPath);
		}
		if (note.bodyText != null) {
			note.bodyText = this.enhanceMarkdownBlock(note.bodyText, projectFullPath);
		}
		if (note.bodyHtml != null) {
			note.bodyHtml = this.enhanceHtmlBlock(note.bodyHtml, projectFullPath);
		}
		if (note.position?.newPath && filesChanged?.length) {
			try {
				let processedPatch = parsedPatches.get(note.position.newPath);
				if (!processedPatch) {
					const found = filesChanged.find(_ => _.filename === note.position.newPath);
					if (found?.patch) {
						processedPatch = translatePositionToLineNumber(parsePatch(found.patch)[0]);
						if (processedPatch) {
							parsedPatches.set(note.position.newPath, processedPatch);
						}
					}
				}
				if (processedPatch?.hunks && processedPatch.hunks.length > 0) {
					const lines = processedPatch?.hunks[0].linesWithMetadata
						.filter(
							_ =>
								_.lineNumber &&
								_.lineNumber <= note.position.newLine &&
								_.lineNumber >= note.position.newLine - 7
						)
						.map(_ => _.line);
					const length = lines?.length || 1;
					const start = note.position.newLine + 1 - length;
					const header = `@@ -${start},${length} +${start},${note.position.newLine} @@`;
					note.position.patch = header + "\n" + lines?.join("\n");
				}
			} catch (ex) {
				Logger.warn("getMergeRequest diffs", {
					error: ex
				});
			}
		}

		return note;
	}

	private async mapPullRequestModel(
		response: GitLabMergeRequestWrapper,
		filesChanged: FetchThirdPartyPullRequestFilesResponse[],
		glId: GitLabId,
		currentUser: GitLabCurrentUser
	) {
		// add reviews
		const pendingReview = await this.gitLabReviewStore.get(glId);
		if (pendingReview?.comments?.length) {
			const commentsAsDiscussionNodes = pendingReview.comments.map(_ => {
				return this.gitLabReviewStore.mapToDiscussionNode(_, currentUser);
			});
			response.project.mergeRequest.discussions.nodes = response.project.mergeRequest.discussions.nodes.concat(
				commentsAsDiscussionNodes
			);
			response.project.mergeRequest.pendingReview = {
				id: "undefined",
				author: commentsAsDiscussionNodes[0].notes?.nodes[0].author!,
				comments: {
					totalCount: pendingReview.comments.length
				}
			};
		}

		this.enhanceDiscussions(
			response.project.mergeRequest.discussions.nodes,
			response.project.mergeRequest.repository.nameWithOwner,
			new Map<string, ParsedDiffWithMetadata>(),
			filesChanged
		);
	}

	@log()
	async createCommentReply(request: {
		pullRequestId: string;
		parentId: string;
		text: string;
	}): Promise<Directives> {
		if (!request.parentId) throw new Error("ParentId missing");
		const providerVersion = await this.getVersion();

		const { id } = this.parseId(request.pullRequestId);
		let noteableId = "NoteableID";
		let discussionId = "DiscussionID";
		if (semver.lt(providerVersion.version, "13.6.4")) {
			noteableId = discussionId = "ID";
		}
		const response = await this.query<any>(
			`mutation createNote($noteableId: ${noteableId}!, $discussionId: ${discussionId}!, $body: String!) {
			createNote(input: {noteableId: $noteableId, discussionId: $discussionId, body: $body}) {
			  clientMutationId
			  note {
				author {
					name
					login: username
					avatarUrl
				  }
				  body
				  bodyHtml
				  createdAt
				  discussion {
					id
					replyId
					createdAt
				  }
				  id
				  resolvable
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
		  }
		  `,
			{
				// mergeRequest
				noteableId: this.toMergeRequestGid(id),
				// the parent discussion
				discussionId: request.parentId,
				body: request.text
			}
		);
		this.toAuthorAbsolutePath(response.createNote.note.author);
		return this.handleResponse(request.pullRequestId, {
			directives: [
				{
					type: "updatePullRequest",
					data: {
						updatedAt: Dates.toUtcIsoNow()
					}
				},
				{
					type: "updateReviewCommentsCount",
					data: 1
				},
				// "resolved" doesn't exist on GL 12.10
				{ type: "addReply", data: { ...response.createNote.note, resolved: false } }
			]
		});
	}

	@log()
	async createPullRequestThread(request: {
		pullRequestId: string;
		text: string;
	}): Promise<Directives> {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		try {
			const data = await this.restPost<
				{
					body: string;
				},
				{
					id: string;
				}
			>(`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}/discussions`, {
				body: request.text
			});
			const body = data.body;
			const id = body.id;

			const response = (await this.query(print(mergeRequestDiscussionQuery), {
				fullPath: projectFullPath,
				iid: iid.toString(),
				last: 5
			})) as GitLabMergeRequestWrapper;

			const node = response?.project?.mergeRequest?.discussions?.nodes.find(
				_ => _.id === `gid://gitlab/Discussion/${id}`
			);
			if (node) {
				this.ensureAvatarAbsolutePathRecurse(node);
				return this.handleResponse(request.pullRequestId, {
					directives: [
						{
							type: "updatePullRequest",
							data: {
								updatedAt: Dates.toUtcIsoNow()
							}
						},
						{ type: "addNode", data: node }
					]
				});
			} else {
				// if for some reason the id can't be found, the client can de-dupe
				this.ensureAvatarAbsolutePathRecurse(response?.project?.mergeRequest?.discussions || {});
				return this.handleResponse(request.pullRequestId, {
					directives: [
						{
							type: "updatePullRequest",
							data: {
								updatedAt: Dates.toUtcIsoNow()
							}
						},
						{ type: "addNodes", data: response?.project?.mergeRequest?.discussions.nodes || [] }
					]
				});
			}
		} catch (ex) {
			Logger.error(ex, "createPullRequestThread");
			throw ex;
		}
	}

	@log()
	async getPullRequestReviewId(request: { pullRequestId: string }): Promise<boolean | undefined> {
		const { iid, projectFullPath } = this.parseId(request.pullRequestId);
		const exists = await this.gitLabReviewStore.exists(new GitLabId(projectFullPath, iid));
		return exists;
	}

	@log()
	async createPullRequestInlineReviewComment(request: {
		pullRequestId: string;
		text: string;
		filePath: string;
		oldLineNumber?: number | undefined;
		startLine?: number;
		position: number;
		leftSha?: string;
		sha?: string;
	}) {
		return this.createPullRequestReviewComment(request);
	}

	@log()
	async addComment(request: {
		pullRequestId: string;
		subjectId: string;
		text: string;
	}): Promise<Directives> {
		const { projectFullPath, iid, id } = this.parseId(request.subjectId);
		await this.mutate(
			`mutation CreateNote($noteableId:ID!, $body:String!){
				createNote(input: {noteableId:$noteableId, body:$body}){
					clientMutationId
		  	}
		}`,
			{
				noteableId: this.toMergeRequestGid(id),
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
					type: "addNodes",
					data: await this.getLastDiscussions(projectFullPath, iid)
				}
			]
		});
	}

	@log()
	async createPullRequestReviewComment(request: {
		pullRequestId: string;
		pullRequestReviewId?: string;
		text: string;
		filePath?: string;
		oldLineNumber?: number | undefined;
		startLine?: number;
		endLine?: number;
		position?: number;
		leftSha?: string;
		sha?: string;
	}): Promise<Directives> {
		const { id, iid, projectFullPath } = this.parseId(request.pullRequestId);

		Logger.log(`createPullRequestReviewComment project=${projectFullPath} iid=${iid}`, {
			request: request
		});

		await this.gitLabReviewStore.add(new GitLabId(projectFullPath, iid), {
			...request,
			createdAt: new Date().toISOString()
		});

		const directives: Directive[] = [
			{
				type: "updatePullRequest",
				data: {
					updatedAt: Dates.toUtcIsoNow()
				}
			},
			{
				type: "updateReviewCommentsCount",
				data: 1
			}
		];
		const pendingReview = await this.gitLabReviewStore.get(new GitLabId(projectFullPath, iid));
		if (pendingReview?.comments?.length) {
			const currentUser = await this.getCurrentUser();
			const commentsAsDiscussionNodes = pendingReview.comments.map(_ => {
				return this.gitLabReviewStore.mapToDiscussionNode(_, currentUser);
			});

			const { filesChanged } = await this.getPullRequestFilesChangedCore({
				pullRequestId: request.pullRequestId
			});
			if (filesChanged?.length) {
				this.enhanceDiscussions(
					commentsAsDiscussionNodes,
					projectFullPath,
					new Map<string, ParsedDiffWithMetadata>(),
					filesChanged
				);
			}
			directives.push({
				type: "addNodes",
				data: commentsAsDiscussionNodes
			});

			directives.push({
				type: "addPendingReview",
				data: {
					id: "undefined",
					author: commentsAsDiscussionNodes[0].notes?.nodes[0].author!,
					comments: {
						totalCount: pendingReview.comments.length
					}
				}
			});
		}

		this.updateCache(request.pullRequestId, {
			directives: directives
		});
		this.session.agent.sendNotification(DidChangePullRequestCommentsNotificationType, {
			pullRequestId: id,
			filePath: request.filePath
		});

		return {
			directives: directives
		};
	}

	@log()
	async submitReview(request: {
		pullRequestId: string;
		text: string;
		eventType: string;
		// used with old servers
		pullRequestReviewId?: string;
	}) {
		const { id, iid, projectFullPath } = this.parseId(request.pullRequestId);

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

		const existingReviewComments = await this.gitLabReviewStore.get(
			new GitLabId(projectFullPath, iid)
		);
		let directives: Directive[] = [];
		if (existingReviewComments?.comments?.length) {
			for (const comment of existingReviewComments.comments) {
				try {
					directives.push({
						type: "removeNode",
						data: {
							id: comment.id
						}
					});
					directives = directives.concat(
						(
							await this.createPullRequestInlineComment({
								...comment,
								pullRequestId: request.pullRequestId
							})
						)?.directives
					);
				} catch (ex) {
					Logger.warn(ex, "Failed to add commit");
				}
			}
			await this.gitLabReviewStore.deleteReview(new GitLabId(projectFullPath, iid));
			directives.push({
				type: "removePendingReview",
				data: null
			});
		}

		if (request.text) {
			directives = directives.concat(
				(
					await this.createPullRequestComment({
						pullRequestId: request.pullRequestId,
						text: request.text,
						noteableId: id
					})
				)?.directives
			);
		}

		return this.handleResponse(request.pullRequestId, {
			directives: directives
		});
	}

	@log()
	async updatePullRequestSubscription(request: {
		pullRequestId: string;
		onOff: boolean;
	}): Promise<Directives> {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		const type = request.onOff ? "subscribe" : "unsubscribe";
		const data = await this.restPost<{}, { subscribed: string }>(
			`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}/${type}`,
			{}
		);

		return this.handleResponse(request.pullRequestId, {
			directives: [
				{
					type: "updatePullRequest",
					data: {
						updatedAt: Dates.toUtcIsoNow(),
						subscribed: data.body.subscribed
					}
				}
			]
		});
	}

	@log()
	async setReviewersOnPullRequest(request: {
		ids: string[];
		pullRequestId: string;
	}): Promise<Directives> {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);
		const data = await this.restPut<{ reviewer_ids: number[] }, { reviewers: any[] }>(
			`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}`,
			{
				reviewer_ids: request.ids
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
					type: "addNodes",
					data: await this.getLastDiscussions(projectFullPath, iid)
				},
				{
					type: "updateReviewers",
					data: data.body.reviewers.map(_ => {
						return { ..._, login: _.username, avatarUrl: this.avatarUrl(_.avatar_url) };
					})
				}
			]
		});
	}

	@log()
	async setAssigneeOnPullRequest(request: {
		pullRequestId: string;
		ids: number[] | undefined;
	}): Promise<Directives | undefined> {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		try {
			const requestBody: {
				assignee_id?: string;
				assignee_ids?: string;
			} = {};
			if (!request.ids || !request.ids.length) {
				requestBody.assignee_id = "0";
			} else {
				if (request.ids.length > 1) {
					requestBody.assignee_ids = request.ids.join(",");
				} else {
					requestBody.assignee_id = request.ids[0] + "";
				}
			}

			const { body } = await this.restPut<any, any>(
				`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}`,
				requestBody
			);
			return this.handleResponse(request.pullRequestId, {
				directives: [
					{
						type: "updatePullRequest",
						data: {
							updatedAt: Dates.toUtcIsoNow(),
							assignees: {
								nodes: body.assignees.map((assignee: any) => {
									return {
										...assignee,
										id: `gid://gitlab/User/${assignee.id}}`,
										login: assignee.username,
										avatarUrl: this.avatarUrl(assignee.avatar_url)
									};
								})
							}
						}
					}
				]
			});
		} catch (err) {
			Logger.error(err);
			debugger;
		}
		return undefined;
	}

	async lockPullRequest(request: { pullRequestId: string }): Promise<Directives> {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		const data = await this.restPut<{}, { discussion_locked: boolean }>(
			`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}`,
			{ discussion_locked: true }
		);

		return this.handleResponse(request.pullRequestId, {
			directives: [
				{
					type: "updatePullRequest",
					data: {
						updatedAt: Dates.toUtcIsoNow(),
						discussionLocked: data.body.discussion_locked
					}
				}
			]
		});
	}

	async unlockPullRequest(request: { pullRequestId: string }): Promise<Directives> {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		const data = await this.restPut<{}, { discussion_locked: boolean }>(
			`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}`,
			{ discussion_locked: false }
		);

		return this.handleResponse(request.pullRequestId, {
			directives: [
				{
					type: "updatePullRequest",
					data: {
						updatedAt: Dates.toUtcIsoNow(),
						discussionLocked: data.body.discussion_locked
					}
				}
			]
		});
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
		availableLabels: GitLabLabel[];
		milestoneId: string;
		assigneeIds: string;
		reviewerIds?: string;
		// deleteSourceBranch?: boolean;
		// squashCommits?: boolean;
	}): Promise<Directives | undefined> {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		try {
			const updateReviewers = request.reviewerIds != undefined;
			const requestBody: {
				target_branch: string;
				title: string;
				description: string;
				labels: string;
				assignee_id?: string;
				assignee_ids?: string;
				reviewer_ids?: string;
				milestone_id: string;
			} = {
				target_branch: request.targetBranch,
				title: request.title,
				description: request.description,
				labels: request.labels,
				assignee_id: request.assigneeIds || "0",
				milestone_id: request.milestoneId
				// squash: !!request.squashCommits
			};
			if (request.assigneeIds.includes(",")) {
				delete requestBody.assignee_id;
				requestBody.assignee_ids = request.assigneeIds;
			}
			if (updateReviewers) {
				requestBody.reviewer_ids = request.reviewerIds || "0";
			}
			const { body } = await this.restPut<any, any>(
				`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}`,
				requestBody
			);
			Logger.log("editPullRequest response: " + JSON.stringify(body, null, 4));
			const milestone = body.milestone || null;
			if (milestone) {
				milestone.createdAt = milestone.created_at;
				milestone.dueDate = milestone.due_date;
			}
			return this.handleResponse(request.pullRequestId, {
				directives: [
					{
						type: "updatePullRequest",
						data: {
							updatedAt: Dates.toUtcIsoNow(),
							title: body.title,
							workInProgress: body.work_in_progress,
							description: this.enhanceMarkdownBlock(request.description, projectFullPath),
							targetBranch: body.target_branch,
							assignees: {
								nodes: body.assignees.map((assignee: any) => {
									return {
										...assignee,
										id: `gid://gitlab/User/${assignee.id}`,
										login: assignee.username,
										avatarUrl: this.avatarUrl(assignee.avatar_url)
									};
								})
							},
							reviewers: updateReviewers
								? {
										nodes: body.reviewers.map((reviewer: any) => {
											return {
												...reviewer,
												login: reviewer.username,
												avatarUrl: this.avatarUrl(reviewer.avatar_url)
											};
										})
								  }
								: undefined,
							milestone,
							labels: {
								nodes: body.labels
									.map((labelTitle: string) => {
										return request.availableLabels.find(label => label.title === labelTitle);
									})
									.filter(Boolean)
							}
							// squashOnMerge: body.squash
							// shouldRemoveSourceBranch: body.force_remove_source_branch
						}
					},
					{
						type: "addNodes",
						data: await this.getMilestoneEvents(projectFullPath, iid)
					}
				]
			});
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

		return this.handleResponse(request.pullRequestId, {
			directives: [
				{
					type: "updatePullRequest",
					data: {
						updatedAt: Dates.toUtcIsoNow(),
						currentUserTodos: {
							nodes: [data.body]
						}
					}
				}
			]
		});
	}

	async markToDoDone(request: { id: string; pullRequestId: string }): Promise<Directives> {
		const { id } = this.parseId(request.pullRequestId);

		const todoId = request.id.toString().replace(/.*Todo\//, "");
		const data = await this.restPost<{}, { state: string }>(`/todos/${todoId}/mark_as_done`, {});

		return this.handleResponse(request.pullRequestId, {
			directives: [
				{
					type: "updatePullRequest",
					data: {
						updatedAt: Dates.toUtcIsoNow(),
						currentUserTodos: {
							nodes: [data.body]
						}
					}
				}
			]
		});
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

		const providerVersion = await this.getVersion();
		const queryText = await this.graphqlQueryBuilder.build(
			providerVersion!.version!,
			mergeRequestNoteMutation,
			"CreateMergeRequestNote"
		);

		const response = (await this.mutate(queryText, {
			noteableId: request.noteableId,
			body: request.text,
			iid: request.iid!.toString()
		})) as {
			createNote: {
				note: {
					id: string;
					project: {
						mergeRequest: GitLabMergeRequest;
					};
				};
			};
		};

		// find the nested node/note
		const addedNode = response.createNote.note.project.mergeRequest.discussions.nodes.find(
			(_: any) => {
				return _.notes.nodes.find((n: any) => n.id === response.createNote.note.id);
			}
		);

		const result: Directives = {
			directives: [
				{
					type: "updatePullRequest",
					data: {
						updatedAt: response.createNote.note.project.mergeRequest.updatedAt
					}
				}
			]
		};

		if (addedNode) {
			this.ensureAvatarAbsolutePathRecurse(addedNode);
			result.directives.push({
				type: "addNode",
				data: addedNode
			});
		}

		return this.handleResponse(request.pullRequestId, result);
	}

	async resolveReviewThread(request: {
		id: string;
		onOff: boolean;
		type: string;
		pullRequestId: string;
	}): Promise<Directives | undefined> {
		const noteId = request.id;
		const response = await this.mutate<any>(
			`
		mutation DiscussionToggleResolve($id:ID!, $resolve: Boolean!) {
			discussionToggleResolve(input:{id:$id, resolve:$resolve}) {
				  clientMutationId
					  discussion {
						id
						resolvedAt
						resolved
						resolvable
						resolvedBy {
							  login: username
							  avatarUrl
						}
						notes {
							nodes {
							  id
							  resolvable
							  resolved
							}
						}
					  }
				  }
			  }`,
			{
				id: noteId,
				resolve: request.onOff
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
					type: "updateNode",
					data: response.discussionToggleResolve.discussion
				}
			]
		});
	}

	@log()
	async updateReviewComment(request: {
		id: string;
		body: string;
		isPending: boolean;
		pullRequestId: string;
	}): Promise<Directives> {
		if (!request.isPending) {
			return this.updateIssueComment(request);
		}
		const { id, iid, projectFullPath } = this.parseId(request.pullRequestId);

		const comment = await this.gitLabReviewStore.updateComment(
			new GitLabId(projectFullPath, iid),
			request.id,
			request.body
		);

		if (comment) {
			this._pullRequestCache.delete(id);
			this.session.agent.sendNotification(DidChangePullRequestCommentsNotificationType, {
				pullRequestId: id,
				filePath: comment.filePath
			});

			return {
				directives: [
					{
						type: "updateDiscussionNote",
						data: {
							body: comment.text,
							bodyHtml: comment.text,
							discussion: {
								id: request.id
							},
							id: request.id
						}
					}
				]
			};
		}

		return { directives: [] };
	}

	@log()
	async deletePullRequestComment(request: {
		id: string;
		type: string;
		isPending: boolean;
		pullRequestId: string;
		parentId?: string;
	}): Promise<Directives | undefined> {
		const noteId = request.id;
		const { id, iid, projectFullPath } = this.parseId(request.pullRequestId);

		let directives: Directive[] = [];
		if (request.isPending) {
			const review = await this.gitLabReviewStore.deleteComment(
				new GitLabId(projectFullPath, iid),
				request.id
			);
			if (review?.comments?.length === 0) {
				directives.push({
					type: "removePendingReview",
					data: null
				});
			}
			directives.push({
				type: "updatePendingReviewCommentsCount",
				data: -1
			});
		} else {
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
		}

		directives = directives.concat([
			{
				type: "updatePullRequest",
				data: {
					updatedAt: Dates.toUtcIsoNow()
				}
			},
			{
				type: "removeNode",
				data: {
					id: request.id
				}
			},
			{
				type: "updateReviewCommentsCount",
				data: -1
			}
		]);
		const directivesResponse: Directives = {
			directives: directives
		};

		this.updateCache(request.pullRequestId, directivesResponse);
		this.session.agent.sendNotification(DidChangePullRequestCommentsNotificationType, {
			pullRequestId: id,
			commentId: noteId
		});

		return directivesResponse;
	}

	@log()
	async createPullRequestCommentAndClose(request: {
		pullRequestId: string;
		text: string;
		startThread: boolean;
	}): Promise<Directives> {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);
		let directives: any = [];

		if (request.text) {
			if (request.startThread) {
				const response1 = await this.createPullRequestThread({ ...request });
				if (response1.directives) {
					directives = directives.concat(response1.directives);
				}
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
			data: await this.getStateEvents(projectFullPath, iid)
		});

		return this.handleResponse(request.pullRequestId, {
			directives: directives
		});
	}

	@log()
	async createPullRequestCommentAndReopen(request: {
		pullRequestId: string;
		text: string;
		startThread: boolean;
	}): Promise<Directives> {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		let directives: any = [];

		if (request.text) {
			if (request.startThread) {
				const response1 = await this.createPullRequestThread({ ...request });
				if (response1.directives) {
					directives = directives.concat(response1.directives);
				}
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
			data: await this.getStateEvents(projectFullPath, iid)
		});

		return this.handleResponse(request.pullRequestId, {
			directives: directives
		});
	}

	@log()
	async getPullRequestCommits(
		request: FetchThirdPartyPullRequestCommitsRequest
	): Promise<FetchThirdPartyPullRequestCommitsResponse[]> {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		const projectFullPathEncoded = encodeURIComponent(projectFullPath);
		const url = `/projects/${projectFullPathEncoded}/merge_requests/${iid}/commits?per_page=100`;
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

	@log()
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
			return this.handleResponse(request.pullRequestId, {
				directives: [
					{
						type: "updatePullRequest",
						data: {
							updatedAt: Dates.toUtcIsoNow(),
							milestone: response.body.milestone
						}
					}
				]
			});
		} catch (err) {
			Logger.error(err);
			debugger;
		}
		return undefined;
	}

	@log()
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

			return this.handleResponse(request.pullRequestId, {
				directives: [
					{
						type: "updatePullRequest",
						data: {
							updatedAt: Dates.toUtcIsoNow(),
							workInProgress: response.mergeRequestSetWip.mergeRequest.workInProgress,
							title: response.mergeRequestSetWip.mergeRequest.title
						}
					}
				]
			});
		} catch (err) {
			Logger.error(err);
			debugger;
		}
		return undefined;
	}

	@log()
	async setLabelOnPullRequest(request: {
		pullRequestId: string;
		labelIds: string[];
		onOff: boolean;
	}): Promise<Directives | undefined> {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		try {
			const providerVersion = await this.getVersion();
			// newwer mutations use a custom LabelID type
			const response = await this.mutate<any>(
				`mutation MergeRequestSetLabels($projectPath: ID!, $iid: String!, $labelIds: [${
					semver.lt(providerVersion.version, "13.6.4") ? "ID" : "LabelID"
				}!]!) {
					mergeRequestSetLabels(input: {projectPath: $projectPath, iid: $iid, labelIds: $labelIds}) {
					  mergeRequest {
						labels(last: 100) {
						  nodes {
							id
							color
							title
						  }
						}
					  }
					}
				  }`,
				{
					projectPath: projectFullPath,
					iid: iid,
					labelIds: request.labelIds
				}
			);

			return this.handleResponse(request.pullRequestId, {
				directives: [
					{
						type: "updatePullRequest",
						data: { updatedAt: Dates.toUtcIsoNow() }
					},
					{
						type: "setLabels",
						data: response.mergeRequestSetLabels.mergeRequest.labels
					},
					{
						type: "addNodes",
						data: await this.getLabelEvents(projectFullPath, iid)
					}
				]
			});
		} catch (err) {
			Logger.error(err);
			debugger;
		}
		return undefined;
	}

	@log()
	async toggleReaction(request: {
		pullRequestId: string;
		subjectId: string;
		content: string;
		onOff: boolean;
		id?: string;
	}): Promise<Directives | undefined> {
		const { projectFullPath, iid, id } = this.parseId(request.pullRequestId);

		try {
			let url = `/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}`;
			if (request.subjectId && request.subjectId != id) url += `/notes/${request.subjectId}`;
			url += "/award_emoji";

			if (request.onOff) {
				const response = await this.restPost<{ name: string }, any>(`${url}`, {
					name: request.content
				});
				response.body.user.login = response.body.user.username;
				response.body.user.avatarUrl = this.avatarUrl(response.body.user.avatar_url);
				return this.handleResponse(request.pullRequestId, {
					directives: [
						{
							type: "updatePullRequest",
							data: { updatedAt: Dates.toUtcIsoNow() }
						},
						{
							// FIXME -- if the subjectId is a note, update the note
							type: "addReaction",
							data: response.body
						}
					]
				});
			} else {
				if (!request.id) throw new Error("MissingId");

				// with DELETEs we don't get a JSON response
				const response = await this.restDelete<String>(`${url}/${request.id}`, {
					useRawResponse: true
				});
				if (response.body === "") {
					const currentUser = await this.getCurrentUser();
					return this.handleResponse(request.pullRequestId, {
						directives: [
							{
								type: "updatePullRequest",
								data: { updatedAt: Dates.toUtcIsoNow() }
							},
							{
								// FIXME -- if the subjectId is a note, update the note
								type: "removeReaction",
								data: {
									content: request.content,
									login: currentUser?.login
								}
							}
						]
					});
				}
			}
		} catch (err) {
			Logger.error(err);
			debugger;
		}
		return undefined;
	}

	@log()
	async getPullRequestFilesChanged(request: {
		pullRequestId: string;
		accessRawDiffs?: boolean;
	}): Promise<FetchThirdPartyPullRequestFilesResponse[]> {
		const response = await this.getPullRequestFilesChangedCore(request);
		return response.filesChanged;
	}

	@log()
	private async getPullRequestFilesChangedCore(request: {
		pullRequestId: string;
		accessRawDiffs?: boolean;
	}): Promise<{ overflow?: boolean; filesChanged: FetchThirdPartyPullRequestFilesResponse[] }> {
		const filesChanged: FetchThirdPartyPullRequestFilesResponse[] = [];
		let overflow = false;
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		try {
			const query = request.accessRawDiffs ? "?access_raw_diffs=true" : "";
			const url: string | undefined = `/projects/${encodeURIComponent(
				projectFullPath
			)}/merge_requests/${iid}/changes${query}`;

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
				overflow?: boolean;
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
			filesChanged.push(...mappped);

			overflow = apiResponse.body.overflow === true;
		} catch (err) {
			Logger.error(err);
			debugger;
		}

		return {
			overflow,
			filesChanged
		};
	}

	@log()
	async cancelMergeWhenPipelineSucceeds(request: {
		pullRequestId: string;
	}): Promise<Directives | undefined> {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		try {
			await this.restPost<any, any>(
				`/projects/${encodeURIComponent(
					projectFullPath
				)}/merge_requests/${iid}/cancel_merge_when_pipeline_succeeds`,
				{}
			);
			return this.handleResponse(request.pullRequestId, {
				directives: [
					{
						type: "updatePullRequest",
						data: {
							updatedAt: Dates.toUtcIsoNow(),
							mergeWhenPipelineSucceeds: false
						}
					}
				]
			});
		} catch (ex) {
			Logger.error(ex);
		}
		return undefined;
	}

	@log()
	async mergePullRequest(request: {
		pullRequestId: string;
		message: string;
		deleteSourceBranch?: boolean;
		squashCommits?: boolean;
		mergeWhenPipelineSucceeds?: boolean;
		includeMergeRequestDescription: boolean;
	}): Promise<Directives | undefined> {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		try {
			const mergeResponse = await this.restPut<any, any>(
				`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}/merge`,
				{
					merge_commit_message: request.message,
					squash: request.squashCommits,
					merge_when_pipeline_succeeds: request.mergeWhenPipelineSucceeds,
					should_remove_source_branch: request.deleteSourceBranch
				}
			);

			const response: Directives = {
				directives: [
					{
						type: "addNodes",
						data: await this.getStateEvents(projectFullPath, iid)
					}
				]
			};

			if (mergeResponse.body.merge_when_pipeline_succeeds) {
				// only updating the future state..
				response.directives.push({
					type: "updatePullRequest",
					data: {
						state: mergeResponse.body.state,
						mergeWhenPipelineSucceeds: mergeResponse.body.merge_when_pipeline_succeeds,
						updatedAt: mergeResponse.body.updated_at
					}
				});
			} else {
				response.directives.push({
					type: "updatePullRequest",
					data: {
						merged: true,
						state: mergeResponse.body.state,
						mergedAt: mergeResponse.body.merged_at,
						updatedAt: mergeResponse.body.updated_at
					}
				});
			}
			return this.handleResponse(request.pullRequestId, response);
		} catch (ex) {
			Logger.warn(ex.message, ex);
			throw new Error("Failed to accept merge request.");
		}
	}

	@log()
	async createPullRequestInlineComment(request: {
		pullRequestId: string;
		text: string;
		sha?: string;
		leftSha: string;
		rightSha: string;
		filePath: string;
		oldLineNumber?: number | undefined;
		startLine: number;
		position?: number;
		metadata?: any;
	}): Promise<Directives> {
		return this.createCommitComment({
			...request,
			path: request.filePath,
			sha: request.sha || request.rightSha
		});
	}

	@log()
	async createCommitComment(request: {
		pullRequestId: string;
		// leftSha
		leftSha: string;
		// rightSha
		sha: string;
		text: string;
		path: string;
		oldLineNumber?: number | undefined;
		startLine?: number | undefined;
		// use endLine for multi-line comments
		endLine?: number;
		// used for old servers
		position?: number;
		metadata?: {
			contents: string;
			fileWithUrl: string;
			startLine: number;
			endLine: number;
		};
	}): Promise<Directives> {
		let projectFullPath, id, iid;
		try {
			({ projectFullPath, id, iid } = this.parseId(request.pullRequestId));

			const payload = {
				body: request.text,
				position: {
					base_sha: request.leftSha,
					head_sha: request.sha,
					start_sha: request.leftSha,
					position_type: "text",
					new_path: request.path,
					new_line: request.endLine ? request.endLine : request.startLine
				}
			};

			if (request.oldLineNumber != null) {
				// seems related to this https://gitlab.com/gitlab-org/gitlab/-/issues/281143
				(payload.position as any).old_line = request.oldLineNumber;
			}

			Logger.log(`createCommitComment project=${projectFullPath} iid=${iid}`, {
				payload: payload
			});
			// https://docs.gitlab.com/ee/api/discussions.html#create-new-merge-request-thread
			await this.restPost<any, any>(
				`/projects/${encodeURIComponent(projectFullPath)}/merge_requests/${iid}/discussions`,
				payload
			);
			const directives: Directives = {
				directives: [
					{
						type: "updatePullRequest",
						data: {
							updatedAt: Dates.toUtcIsoNow()
						}
					},
					{
						type: "updateReviewCommentsCount",
						data: 1
					},
					{
						type: "addNodes",
						data: await this.getLastDiscussions(projectFullPath, iid, 2)
					}
				]
			};
			this.updateCache(request.pullRequestId, directives);
			this.session.agent.sendNotification(DidChangePullRequestCommentsNotificationType, {
				pullRequestId: id
			});

			return directives;
		} catch (ex) {
			// lines that are _slightly_ outside the context of a diff (yet are still in the hunks)
			// are not allowed and they return a bizzare error message...
			// retry as a comment not attached to a line of code
			if (ex?.message?.indexOf("must be a valid line code") > -1) {
				Logger.warn(`createCommitCommentLineCodeError`, {
					request: request,
					error: ex
				});
				const metadata = request.metadata;
				if (metadata) {
					return this.addComment({
						pullRequestId: request.pullRequestId,
						subjectId: request.pullRequestId,
						text: `${request.text || ""}\n\n\`\`\`\n${metadata.contents}\n\`\`\`
						\n${metadata.fileWithUrl} (Line${
							metadata.startLine === metadata.endLine
								? ` ${metadata.startLine}`
								: `s ${metadata.startLine}-${metadata.endLine}`
						})`
					});
				} else {
					return this.addComment({
						pullRequestId: request.pullRequestId,
						subjectId: request.pullRequestId,
						text: request.text
					});
				}
			} else {
				Logger.error(ex, `createCommitComment`, {
					request: request
				});

				throw ex;
			}
		}
	}

	@log()
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
				// but you can approve many times. just ignore it.
				Logger.warn(ex.message);
			}
		}

		const lastDiscussions = await this.getLastDiscussions(projectFullPath, iid);
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
					data: lastDiscussions
				},
				{
					type: type,
					data:
						response &&
						response.body.approved_by.map(
							(_: { user: { avatar_url: string; username: string; name: string } }) => {
								return {
									avatarUrl: this.avatarUrl(_.user.avatar_url),
									login: _.user.username,
									name: _.user.name
								};
							}
						)
				}
			]
		});
	}

	@log()
	async deletePullRequestReview(request: {
		pullRequestId: string;
		pullRequestReviewId: string;
	}): Promise<any> {
		const { id, iid, projectFullPath } = this.parseId(request.pullRequestId);

		const gid = new GitLabId(projectFullPath, iid);
		const review = await this.gitLabReviewStore.get(gid);
		const directives: Directives = {
			directives: [
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
			]
		};
		if (review?.comments) {
			review.comments.forEach(_ => {
				directives.directives.push(
					{
						type: "removeNode",
						data: {
							id: _.id
						}
					},
					{
						type: "updateReviewCommentsCount",
						data: -1
					}
				);
			});
		}
		await this.gitLabReviewStore.deleteReview(gid);

		this.updateCache(request.pullRequestId, directives);
		this.session.agent.sendNotification(DidChangePullRequestCommentsNotificationType, {
			pullRequestId: id
		});
		return directives;
	}

	async getPullRequestIdFromUrl(request: { url: string }) {
		// since we only the url for the PR -- parse it out for the
		// data we need.
		const uri = URI.parse(request.url);
		const path = uri.path.split("/");
		const id = [];
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

	@log()
	async updateIssueComment(request: {
		id: string;
		body: string;
		isPending: boolean;
		pullRequestId: string;
	}): Promise<Directives> {
		// detect if this review comment
		if (request.isPending) {
			return this.updateReviewComment(request);
		}
		const { projectFullPath } = this.parseId(request.pullRequestId);
		const providerVersion = await this.getVersion();
		// newwer mutations use a custom NoteID type
		const response = await this.mutate<any>(
			`mutation UpdateNote($id: ${
				semver.lt(providerVersion.version, "13.6.4") ? "ID" : "NoteID"
			}!, $body: String!) {
			updateNote(input: {id: $id, body: $body}) {
			  clientMutationId
			  note {
				updatedAt
				body
				bodyHtml
				id
				discussion {
       			 id
      			}
			  }
			}
		  }
		  `,
			{
				id: request.id,
				body: request.body
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
					type: "updateDiscussionNote",
					data: this.enhanceNote(
						response.updateNote.note as Note,
						projectFullPath,
						new Map<string, ParsedDiffWithMetadata>(),
						[]
					)
				}
			]
		});
	}

	async getPullRequestLastUpdated(request: { pullRequestId: string }) {
		const { projectFullPath, iid } = this.parseId(request.pullRequestId);

		const response = await this.query<any>(
			`
			query GetUpdatedAt($fullPath: ID!, $iid: String!) {
				project(fullPath: $fullPath) {
					mergeRequest(iid: $iid) {
						updatedAt
					}
				}
			}
			`,
			{
				fullPath: projectFullPath,
				iid: iid
			}
		);

		return {
			updatedAt: response?.project?.mergeRequest?.updatedAt
		};
	}

	private async getLastDiscussions(projectFullPath: string, iid: string, last: number = 3) {
		const providerVersion = await this.getVersion();
		const discussionQuery = await this.graphqlQueryBuilder.build(
			providerVersion!.version!,
			mergeRequestDiscussionQuery,
			"GetMergeRequestDiscussions"
		);

		const lastDiscussions = ((await this.query(discussionQuery, {
			fullPath: projectFullPath,
			iid: iid.toString(),
			last: last
		})) as GitLabMergeRequestWrapper).project?.mergeRequest.discussions.nodes;
		this.ensureAvatarAbsolutePathRecurse(lastDiscussions);

		if (lastDiscussions?.length) {
			try {
				const { filesChanged } = await this.getPullRequestFilesChangedCore({
					pullRequestId: JSON.stringify({ full: `${projectFullPath}!${iid}` })
				});
				if (filesChanged?.length) {
					this.enhanceDiscussions(
						lastDiscussions,
						projectFullPath,
						new Map<string, ParsedDiffWithMetadata>(),
						filesChanged
					);
				}
			} catch (ex) {
				Logger.warn("failed to attach patch diffs", ex);
			}
		}
		return lastDiscussions;
	}

	private async getMilestoneEvents(
		projectFullPath: string,
		iid: string
	): Promise<DiscussionNode[]> {
		try {
			// this endpoint doesn't exist on 12.10
			const providerVersion = await this.getVersion();
			if (!providerVersion.isDefault && semver.lt(providerVersion.version, "13.6.4")) {
				return [];
			}

			return this._paginateRestResponse(
				`/projects/${encodeURIComponent(
					projectFullPath
				)}/merge_requests/${iid}/resource_milestone_events`,
				data => {
					return data.map(_ => {
						return {
							id: _.id,
							createdAt: _.created_at,
							notes: {
								nodes: [
									{
										createdAt: _.created_at,
										system: true,
										systemNoteIconName: `milestone-${_.action}`,
										author: this.fromRestUser(_.user),
										body: `${_.action === "add" ? "added" : "removed"}`,
										milestone: {
											title: _.milestone.title,
											url: _.milestone.web_url
										}
									}
								]
							}
						};
					});
				}
			).catch(_ => {
				return [];
			});
		} catch (ex) {
			return [];
		}
	}

	private async getLabelEvents(projectFullPath: string, iid: string): Promise<DiscussionNode[]> {
		try {
			// this endpoint doesn't exist on 12.10
			const providerVersion = await this.getVersion();
			if (!providerVersion.isDefault && semver.lt(providerVersion.version, "13.6.4")) {
				return [];
			}
			return this._paginateRestResponse(
				`/projects/${encodeURIComponent(
					projectFullPath
				)}/merge_requests/${iid}/resource_label_events`,
				data => {
					return data
						.filter(_ => _.label)
						.map(_ => {
							return {
								id: _.id,
								createdAt: _.created_at,
								notes: {
									nodes: [
										{
											createdAt: _.created_at,
											system: true,
											systemNoteIconName: `label-${_.action}`,
											author: this.fromRestUser(_.user),
											body: `${_.action === "add" ? "added" : "removed"}`,
											label: {
												description: _.label.description,
												color: _.label.color,
												title: _.label.name
											}
										}
									]
								}
							};
						});
				}
			).catch(_ => {
				return [];
			});
		} catch (ex) {
			return [];
		}
	}

	private async getStateEvents(projectFullPath: string, iid: string): Promise<DiscussionNode[]> {
		try {
			// this endpoint doesn't exist on 12.10
			const providerVersion = await this.getVersion();
			if (!providerVersion.isDefault && semver.lt(providerVersion.version, "13.6.4")) {
				return [];
			}
			return this._paginateRestResponse(
				`/projects/${encodeURIComponent(
					projectFullPath
				)}/merge_requests/${iid}/resource_state_events`,
				data => {
					return data.map(_ => {
						return {
							id: _.id,
							createdAt: _.created_at,
							notes: {
								nodes: [
									{
										createdAt: _.created_at,
										system: true,
										systemNoteIconName: `merge-request-${_.state}`,
										author: this.fromRestUser(_.user),
										body: _.state
									}
								]
							}
						};
					});
				}
			).catch(_ => {
				return [];
			});
		} catch (ex) {
			return [];
		}
	}

	/**
	 * Adds fully-qualified URLs to a text property.
	 * Only required when sending to the webview
	 *
	 * @private
	 * @param {string} str
	 * @param {string} projectFullPath
	 * @return {string}
	 * @memberof GitLabProvider
	 */
	private enhanceMarkdownBlock(str: string, projectFullPath: string): string {
		if (!str || !projectFullPath) return str;

		return str.replace(/\[.+?\]\((\/uploads\/.+?)\)/g, (match, group1) => {
			return match.replace(group1, `${this.baseWebUrl}/${projectFullPath}${group1}`);
		});
	}
	/**
	 * Adds fully-qualified URLs to an html property.
	 * Only required when sending to the webview
	 * @private
	 * @param {string} str
	 * @param {string} projectFullPath
	 * @return {string}
	 * @memberof GitLabProvider
	 */
	private enhanceHtmlBlock(str: string, projectFullPath: string): string {
		if (!str || !projectFullPath) return str;

		// gitlab's images look like <img src="base64enCoded" data-src="actualImagePath.jpg" />
		// we need to adjust them and add an optional base url
		// we don't care about the original <img> tag since this will later
		// get converted into markdown which only supports a limited set of <img> attrs
		const result = str.replace(
			/<img\s[^>]*?data\-src\s*=\s*['\"]([^'\"]*?)['\"][^>]*?>/g,
			(match, group1) => {
				if (group1[0] === "/" && group1.indexOf("/uploads/") > -1) {
					return `<img src="${this.baseWebUrl}${group1}" />`;
				}
				return `<img src="${group1}" />`;
			}
		);

		return result;
	}

	private avatarUrl(url: string) {
		return url?.startsWith("/") ? `${this.baseWebUrl}${url}` : url;
	}

	private fromRestUser(user: { [key: string]: any }) {
		user.login = user.username;
		user.avatarUrl = this.avatarUrl(user.avatar_url);
		delete user.username;
		delete user.avatar_url;
		return user;
	}

	private toKeyValuePair(q: string, currentUser: GitLabCurrentUser) {
		const kvp = q.split(/:|=/);
		let value = kvp[1];
		if (value === "@me" && currentUser) {
			value = currentUser.login;
		}
		return `${encodeURIComponent(kvp[0])}=${encodeURIComponent(value)}`;
	}

	private toMergeRequestGid(id: string) {
		return `gid://gitlab/MergeRequest/${id}`;
	}

	private fromMergeRequestGid(gid: string) {
		return gid.replace("gid://gitlab/MergeRequest/", "");
	}

	private toAuthorAbsolutePath(author: any): GitLabCurrentUser {
		if (author?.avatarUrl?.indexOf("/") === 0) {
			// no really great way to handle this...
			author.avatarUrl = `${this.baseWebUrl}${author.avatarUrl}`;
		}
		return author;
	}

	private ensureAvatarAbsolutePathRecurse(obj: any | any[]) {
		if (!obj) return;
		if (Array.isArray(obj)) {
			obj.forEach(o => {
				this.ensureAvatarAbsolutePathRecurse(o);
			});
		} else {
			for (const k in obj) {
				if (typeof obj[k] === "object") {
					this.ensureAvatarAbsolutePathRecurse(obj[k]);
				} else if (k === "avatarUrl") {
					if (obj?.avatarUrl?.indexOf("/") === 0) {
						obj.avatarUrl = `${this.baseWebUrl}${obj.avatarUrl}`;
					}
				}
			}
		}
	}

	parseId(pullRequestId: string) {
		const parsed = JSON.parse(pullRequestId);
		// https://gitlab.com/gitlab-org/gitlab/-/blob/1cb9fe25/doc/api/README.md#id-vs-iid
		// id - Is unique across all issues and is used for any API call
		// iid - Is unique only in scope of a single project. When you browse issues or merge requests with the Web UI, you see the iid
		return {
			id: parsed.id,
			projectFullPath: parsed.full.split("!")[0],
			iid: parsed.full.split("!")[1]
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

	async handleResponse(pullRequestId: string, directives: Directives) {
		this.updateCache(pullRequestId, directives);
		return directives;
	}

	private updateCache(pullRequestId: string, directives: Directives) {
		const prWrapper = this._pullRequestCache.get(pullRequestId);
		if (!prWrapper) {
			return;
		}
		const pr = prWrapper.project?.mergeRequest;
		if (!pr) {
			return;
		}
		for (const directive of directives.directives) {
			/**
			 *
			 *  KEEP THIS IN SYNC WITH providerPullReqests/reducer.ts
			 *
			 */
			if (directive.type === "addApprovedBy") {
				if (pr.approvedBy) {
					for (const d of directive.data) {
						if (!pr.approvedBy.nodes.find(_ => _.login === d.login)) {
							pr.approvedBy.nodes.push(d);
						}
					}
				}
			} else if (directive.type === "removeApprovedBy") {
				if (pr.approvedBy) {
					pr.approvedBy.nodes.length = 0;
					for (const d of directive.data) {
						pr.approvedBy.nodes.push(d);
					}
				}
			} else if (directive.type === "addNode") {
				const node = pr.discussions.nodes.find(_ => _.id === directive.data.id);
				if (!node) {
					pr.discussions.nodes.push(directive.data);
				}
			} else if (directive.type === "addNodes") {
				// if (!directive.data.id) continue;
				for (const d of directive.data) {
					if (!d.id) {
						console.warn("missing id");
						continue;
					}
					const node = pr.discussions.nodes.find(_ => _.id === d.id);
					if (!node) {
						pr.discussions.nodes.push(d);
					}
				}
			} else if (directive.type === "addPendingReview") {
				if (!directive.data) continue;
				pr.pendingReview = directive.data;
			} else if (directive.type === "removePendingReview") {
				pr.pendingReview = undefined;
			} else if (directive.type === "addReaction") {
				const reaction = pr.reactionGroups.find(_ => _.content === directive.data.name);
				if (reaction) {
					reaction.data.push(directive.data);
				} else {
					pr.reactionGroups.push({ content: directive.data.name, data: [directive.data] });
				}
			} else if (directive.type === "addReply") {
				if (
					directive.data.discussion.id &&
					directive.data.discussion.id.indexOf("gitlab/Discussion") > -1
				) {
					const discussionId = directive.data.discussion.id.split("/").slice(-1)[0];
					const nodeToUpdate = pr.discussions.nodes.find((_: DiscussionNode) => {
						const idAsString = _.id + "";
						const discussionNodeId = idAsString.split("/").slice(-1)[0];
						return (
							idAsString.indexOf("gitlab/IndividualNoteDiscussion") > -1 &&
							discussionId === discussionNodeId
						);
					});

					if (nodeToUpdate) {
						nodeToUpdate.id = directive.data.discussion.id;
						nodeToUpdate.replyId = directive.data.discussion.id;
						nodeToUpdate.resolvable = true;
						const firstNode = nodeToUpdate?.notes?.nodes[0];
						if (firstNode) {
							firstNode.id = firstNode.id.replace("/Note/", "/DiscussionNote/");
							firstNode.resolvable = true;
							firstNode.discussion.id = directive.data.discussion.id;
							firstNode.discussion.replyId = directive.data.discussion.replyId;
						}
					}
				}
				const discussionNode = pr.discussions.nodes.find(
					(_: DiscussionNode) => _.id === directive.data.discussion.id
				);
				if (discussionNode) {
					const firstNode = discussionNode?.notes?.nodes[0];
					if (firstNode) {
						if (firstNode.replies == null) {
							firstNode.replies = [directive.data];
						} else if (!firstNode.replies.find(_ => _.id === directive.data.id)) {
							firstNode.replies.push(directive.data);
						}
					} else {
						console.warn("Could not find node", discussionNode);
					}
				}
			} else if (directive.type === "removeNode") {
				if (!directive.data.id) continue;

				let nodeIndex = 0;
				let nodeRemoveIndex = -1;
				for (const node of pr.discussions.nodes) {
					if (node.id === directive.data.id) {
						// is an outer node
						nodeRemoveIndex = nodeIndex;
						break;
					}
					if (node.notes && node.notes.nodes.length) {
						const index = node.notes.nodes.findIndex(_ => _.id === directive.data.id);
						if (index === 0) {
							if (node.notes.nodes[0].replies && node.notes.nodes[0].replies.length) {
								if (node.notes.nodes[0].replies) {
									// attach the position object on the root to all the replies
									for (const reply of node.notes.nodes[0].replies) {
										if (!reply) continue;
										reply.position = node.notes.nodes[0].position;
									}
								}
								// get the original replies
								const originalReplies = node.notes.nodes[0].replies;
								// remove the first reply (it will become the "root" node)
								const shifted = node.notes.nodes[0].replies?.splice(0, 1);
								// take old first reply and set it as the first note node
								node.notes.nodes.splice(0, 1, shifted[0] as any);
								// attach the modified replies back to the new "root" node
								node.notes.nodes[0].replies = originalReplies || [];
							} else {
								// not one of the replies, it's the root, just remove it
								node.notes.nodes = node.notes.nodes.filter(_ => _.id !== directive.data.id);
							}
						} else {
							node.notes.nodes = node.notes.nodes.filter(_ => _.id !== directive.data.id);
							for (const notesWithReplies of node.notes.nodes) {
								if (notesWithReplies.replies && notesWithReplies.replies.length) {
									notesWithReplies.replies = notesWithReplies.replies.filter(
										_ => _.id !== directive.data.id
									);
								}
							}
						}
					}

					nodeIndex++;
				}
				if (nodeRemoveIndex > -1) {
					pr.discussions.nodes.splice(nodeRemoveIndex, 1);
				}
			} else if (directive.type === "updateDiscussionNote") {
				const discussionNode = pr.discussions.nodes.find(
					(_: DiscussionNode) => _.id === directive.data.discussion.id
				);
				if (discussionNode) {
					const note = discussionNode?.notes?.nodes.find(_ => _.id === directive.data.id);
					if (note) {
						const keys = Object.keys(directive.data).filter(_ => _ !== "discussion" && _ !== "id");
						for (const k of keys) {
							(note as any)[k] = directive.data[k];
						}
					}
					// typescript is killing me here...
					else if (
						discussionNode.notes?.nodes &&
						discussionNode.notes.nodes.length > 0 &&
						discussionNode.notes.nodes[0] &&
						discussionNode.notes.nodes[0].replies?.length
					) {
						const reply = discussionNode!.notes!.nodes![0]?.replies?.find(
							_ => _.id === directive.data.id
						);
						if (reply) {
							const keys = Object.keys(directive.data).filter(
								_ => _ !== "discussion" && _ !== "id"
							);
							for (const k of keys) {
								(reply as any)[k] = directive.data[k];
							}
						}
					}
				}
			} else if (directive.type === "updateNode") {
				const node = pr.discussions.nodes.find((_: any) => _.id === directive.data.id);
				if (node) {
					for (const key in directive.data) {
						if (key === "notes") {
							for (const note of directive.data.notes.nodes) {
								if (node.notes) {
									const existingNote = node.notes.nodes.find(_ => _.id === note.id);
									if (existingNote) {
										for (const k in note) {
											(existingNote as any)[k] = note[k];
										}
									}
								}
							}
						} else {
							(node as any)[key] = directive.data[key];
						}
					}
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
			} else if (directive.type === "updatePendingReviewCommentsCount") {
				// ensure no negatives
				if (pr.pendingReview && pr.pendingReview.comments) {
					pr.pendingReview.comments.totalCount = Math.max(
						(pr.pendingReview.comments.totalCount || 0) + directive.data,
						0
					);
				}
			} else if (directive.type === "updateReviewCommentsCount") {
				// ensure no negatives
				pr.userDiscussionsCount = Math.max((pr.userDiscussionsCount || 0) + directive.data, 0);
			} else if (directive.type === "updateReviewers") {
				if (pr.reviewers && pr.reviewers.nodes) {
					if (pr.reviewers && !pr.reviewers.nodes) {
						pr.reviewers.nodes = [];
					} else {
						pr.reviewers.nodes.length = 0;
					}
					for (const reviewer of directive.data) {
						pr.reviewers.nodes.push(reviewer);
					}
				}
			} else if (directive.type === "removeReaction") {
				const group = pr.reactionGroups.find(_ => _.content === directive.data.content);
				if (group) {
					group.data = group.data.filter(_ => _.user.login !== directive.data.login);
					if (group.data.length === 0) {
						pr.reactionGroups = pr.reactionGroups.filter(_ => _.content !== directive.data.content);
					}
				}
			} else if (directive.type === "setLabels") {
				pr.labels.nodes = directive.data.nodes;
			}
		}
	}
}

interface GitLabReview {
	version: string;
	comments: any[];
}

class GitLabId {
	constructor(private projectFullPath: string, private iid: string) {}

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
					path: path
				})
			)?.contents;
			const data = JSON.parse(current || "{}") || ({} as GitLabReview);
			comment = {
				...comment,
				startLine: comment.endLine ? comment.endLine : comment.startLine,
				id: new Date().getTime().toString()
			};
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

	async get(id: GitLabId): Promise<GitLabReview | undefined> {
		try {
			const { textFiles } = SessionContainer.instance();
			const path = this.buildPath(id);
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

	async exists(id: GitLabId) {
		try {
			const { textFiles } = SessionContainer.instance();
			const path = this.buildPath(id);
			const data = await textFiles.readTextFile({
				path: path
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
					contents: JSON.stringify(review)
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
				path: path
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
					contents: JSON.stringify(review)
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
							createNote: true
						},
						id: id,
						author: {
							name: user.name,
							login: user.login,
							avatarUrl: user.avatarUrl
						},
						resolved: false,
						resolvable: true,
						systemNoteIconName: "",
						discussion: {
							id: _.createdAt
						},
						state: "PENDING",
						body: _.text,
						bodyText: _.text,
						createdAt: _.createdAt,
						position: {
							oldLine: _.oldLineNumber,
							oldPath: _.filePath,
							newPath: _.filePath,
							newLine: _.startLine
						}
					}
				]
			}
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
