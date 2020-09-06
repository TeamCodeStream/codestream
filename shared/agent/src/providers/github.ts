"use strict";
import { GitRemoteLike, GitRepository } from "git/gitService";
import { GraphQLClient } from "graphql-request";
import { uniqBy as _uniqBy } from "lodash-es";
import { Response } from "node-fetch";
import * as paths from "path";
import * as qs from "querystring";
import { CodeStreamSession } from "session";
import { URI } from "vscode-uri";
import { MarkerLocation } from "../api/extensions";
import { SessionContainer } from "../container";
import { Logger } from "../logger";
import { Markerish, MarkerLocationManager } from "../managers/markerLocationManager";
import { findBestMatchingLine, MAX_RANGE_VALUE } from "../markerLocation/calculator";
import {
	CreateThirdPartyCardRequest,
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
	FetchThirdPartyPullRequestPullRequest,
	FetchThirdPartyPullRequestRequest,
	FetchThirdPartyPullRequestResponse,
	GetMyPullRequestsResponse,
	GitHubBoard,
	GitHubCreateCardRequest,
	GitHubCreateCardResponse,
	GitHubUser,
	MergeMethod,
	MoveThirdPartyCardRequest,
	MoveThirdPartyCardResponse,
	ThirdPartyProviderCard,
	ThirdPartyProviderConfig
} from "../protocol/agent.protocol";
import { CodemarkType, CSGitHubProviderInfo, CSReferenceLocation, CSRepository } from "../protocol/api.protocol";
import { Arrays, Functions, log, lspProvider, Strings } from "../system";
import {
	getOpenedRepos,
	getRemotePaths,
	ProviderCreatePullRequestRequest,
	ProviderCreatePullRequestResponse,
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
		await this.ensureConnected();
		const remotePaths = await getRemotePaths(
			repo,
			this.getIsMatchingRemotePredicate(),
			_projectsByRemotePath
		);
		return remotePaths;
	}

	private _githubUserId: string | undefined;
	private _knownRepos = new Map<string, GitHubRepo>();

	get displayName() {
		return "GitHub";
	}

	get name() {
		return "github";
	}

	get headers() {
		return {
			Authorization: `token ${this.accessToken}`,
			"user-agent": "CodeStream",
			Accept: "application/vnd.github.v3+json, application/vnd.github.inertia-preview+json"
		};
	}

	protected isPRApiCompatible(): Promise<boolean> {
		return Promise.resolve(true);
	}

	get graphQlBaseUrl() {
		return `${this.baseUrl}/graphql`;
	}

	private _client: GraphQLClient | undefined;
	protected get client(): GraphQLClient {
		if (this._client === undefined) {
			if (!this.accessToken) {
				throw new Error("No GitHub personal access token could be found");
			}

			this._client = new GraphQLClient(this.graphQlBaseUrl, {
				headers: {
					Authorization: `Bearer ${this.accessToken}`,
					// Add `Accept` header To access PullRequest.mergeStateStatus and PullRequest.canBeRebased schema members
					// https://docs.github.com/en/graphql/overview/schema-previews#merge-info-preview
					Accept: "application/vnd.github.merge-info-preview+json"
				}
			});
		}
		return this._client;
	}

	async onConnected() {
		this._githubUserId = await this.getMemberId();
		this._knownRepos = new Map<string, GitHubRepo>();
	}

	@log()
	async getBoards(request: FetchThirdPartyBoardsRequest): Promise<FetchThirdPartyBoardsResponse> {
		void (await this.ensureConnected());

		const openReposMap = await getOpenedRepos<GitHubRepo>(
			this.getIsMatchingRemotePredicate(),
			p => this.get<GitHubRepo>(`/repos/${p}`),
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
					const apiResponse = await this.get<{ [key: string]: string }[]>(url);
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
			const result = await this.get<any>(url);
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

	@log()
	private async _getPullRequestRepo(
		pullRequest: FetchThirdPartyPullRequestPullRequest
	): Promise<CSRepository | undefined> {
		let currentRepo: CSRepository | undefined = undefined;
		const { repos } = SessionContainer.instance();

		const repoName = pullRequest.repository.name.toLowerCase();
		const repoUrl = pullRequest.repository.url.toLowerCase();
		const allRepos = await repos.get();

		let matchingRepos = allRepos.repos.filter(_ => _.name && _.name.toLowerCase() === repoName);
		if (matchingRepos.length !== 1) {
			matchingRepos = matchingRepos.filter(_ =>
				_.remotes.some(r => repoUrl.indexOf(r.normalizedUrl.toLowerCase()) > -1)
			);
			if (matchingRepos.length === 1) {
				currentRepo = matchingRepos[0];
			} else {
				console.warn(`Could not find repo for repoName=${repoName} repoUrl=${repoUrl}`);
			}
		} else {
			currentRepo = matchingRepos[0];
		}
		return currentRepo;
	}

	@log()
	async getPullRequest(
		request: FetchThirdPartyPullRequestRequest
	): Promise<FetchThirdPartyPullRequestResponse> {
		const { scm: scmManager } = SessionContainer.instance();
		await this.ensureConnected();
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
			const prRepo = await this._getPullRequestRepo(response.repository.pullRequest);

			if (prRepo?.id) {
				const prForkPointSha = await scmManager.getForkPointRequestType({
					repoId: prRepo.id,
					baseSha: response.repository.pullRequest.baseRefOid,
					headSha: response.repository.pullRequest.headRefOid
				});

				response.repository.pullRequest.forkPointSha = prForkPointSha?.sha;
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
		return response;
	}

	@log()
	async createCard(request: CreateThirdPartyCardRequest) {
		void (await this.ensureConnected());

		const data = request.data as GitHubCreateCardRequest;
		const response = await this.post<{}, GitHubCreateCardResponse>(
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
		void (await this.ensureConnected());

		const { body } = await this.get<GitHubUser[]>(`/repos/${request.boardId}/collaborators`);
		return { users: body.map(u => ({ ...u, id: u.id, displayName: u.login })) };
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
		void (await this.ensureConnected());

		const documentMarkers: DocumentMarker[] = [];

		if (!(await this.isPRApiCompatible())) return documentMarkers;

		const { git, session } = SessionContainer.instance();

		const repo = await git.getRepositoryByFilePath(uri.fsPath);
		if (repo === undefined) return documentMarkers;

		const comments = await this._getCommentsForPath(uri.fsPath, repo);
		if (comments === undefined) return documentMarkers;

		const commentsById: { [id: string]: PullRequestComment } = Object.create(null);
		const markersByCommit = new Map<string, Markerish[]>();
		const trackingBranch = await git.getTrackingBranch(uri);

		for (const c of comments) {
			Logger.log(`GitHub.getPullRequestDocumentMarkers: processing comment ${c.id}`);

			if (
				c.pullRequest.isOpen &&
				c.pullRequest.targetBranch !== trackingBranch?.shortName &&
				c.pullRequest.sourceBranch !== trackingBranch?.shortName
			) {
				continue;
			}

			let rev;
			let line;
			if (c.line !== -1 && (await git.isValidReference(repo.path, c.commit))) {
				rev = c.commit;
				line = c.line;
			} else if (
				c.originalLine !== -1 &&
				c.originalCommit &&
				(await git.isValidReference(repo.path, c.originalCommit))
			) {
				rev = c.originalCommit!;
				line = c.originalLine;
			}

			if (rev == undefined || line === undefined || line === -1) {
				Logger.log(
					`GitHub.getPullRequestDocumentMarkers: could not get position information comment ${c.id} from PR`
				);
				Logger.log(
					`GitHub.getPullRequestDocumentMarkers: attempting to determine current revision for content-based calculation`
				);
				rev = await git.getFileCurrentRevision(uri);
				if (!rev) {
					Logger.log(
						`GitHub.getPullRequestDocumentMarkers: could not determine current revision for file ${uri.fsPath}`
					);
					continue;
				}

				Logger.log(
					`GitHub.getPullRequestDocumentMarkers: attempting to determine current revision for content-based calculation`
				);
				const contents = await git.getFileContentForRevision(uri, rev);
				if (!contents) {
					Logger.log(
						`GitHub.getPullRequestDocumentMarkers: could not read contents of ${uri.fsPath}@${rev} from git`
					);
					continue;
				}

				Logger.log(
					`GitHub.getPullRequestDocumentMarkers: calculating comment line via content analysis`
				);
				line = await findBestMatchingLine(contents, c.code, c.line);
			}

			Logger.log(
				`GitHub.getPullRequestDocumentMarkers: comment ${c.id} located at line ${line}, commit ${rev}`
			);

			let markers = markersByCommit.get(rev);
			if (markers === undefined) {
				markers = [];
				markersByCommit.set(rev, markers);
			}

			commentsById[c.id] = c;
			if (line !== -1) {
				const referenceLocation: CSReferenceLocation = {
					commitHash: rev,
					location: [line, 1, line, MAX_RANGE_VALUE, undefined],
					flags: {
						canonical: true
					}
				};
				markers.push({
					id: c.id,
					referenceLocations: [referenceLocation]
				});
			} else {
				Logger.log(
					`GitHub.getPullRequestDocumentMarkers: could not find current location for comment ${c.url}`
				);
			}
		}

		const locations = await MarkerLocationManager.computeCurrentLocations(uri, markersByCommit);

		const teamId = session.teamId;

		for (const [id, location] of Object.entries(locations.locations)) {
			const comment = commentsById[id];

			documentMarkers.push({
				id: id,
				codemarkId: undefined,
				fileUri: uri.toString(),
				fileStreamId: streamId,
				// postId: undefined!,
				// postStreamId: undefined!,
				repoId: repoId!,
				teamId: teamId,
				file: uri.fsPath,
				// commitHashWhenCreated: revision!,
				// locationWhenCreated: MarkerLocation.toArray(location),
				modifiedAt: new Date(comment.createdAt).getTime(),
				code: "",

				createdAt: new Date(comment.createdAt).getTime(),
				creatorId: comment.author.id,
				creatorName: comment.author.nickname,
				externalContent: {
					provider: {
						name: this.displayName,
						icon: "mark-github"
					},
					subhead: `#${comment.pullRequest.id}`,
					externalId: comment.pullRequest.externalId,
					externalType: "PullRequest",
					title: comment.pullRequest.title,
					diffHunk: comment.diffHunk,
					actions: []
				},
				range: MarkerLocation.toRange(location),
				location: location,
				summary: comment.text,
				summaryMarkdown: `\n\n${Strings.escapeMarkdown(comment.text)}`,
				type: CodemarkType.Comment
			});
		}

		return documentMarkers;
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

			const repoInfo = await this.getRepoInfo({ remote: request.remote });
			if (repoInfo && repoInfo.error) {
				return {
					error: repoInfo.error
				};
			}

			const createPullRequestResponse = await this.client.request<GitHubCreatePullRequestResponse>(
				`mutation CreatePullRequest($repositoryId:String!, $baseRefName:String!, $headRefName:String!, $title:String!, $body:String!) {
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
					repositoryId: repoInfo!.id,
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

			const response = await this.client.request<any>(
				`query getRepoInfo($owner:String!, $name:String!) {
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
	private async _getCommentsForPath(
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
		const query = await this.client.request<any>(
			`query getLabels($owner:String!, $name:String!) {
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
		const query = await this.client.request<any>(
			`query GetProjects($owner:String!, $name:String!) {
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
		const query = await this.client.request<any>(
			`query GetMilestones($owner:String!, $name:String!) {
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
		const query = await this.client.request<any>(
			`query FindReviewers($owner:String!, $name:String!)  {
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

	async setIsDraftPullRequest(request: { pullRequestId: string; isDraft: boolean }) {
		if (!request.isDraft) {
			const query = `mutation MarkPullRequestReadyForReview($pullRequestId: String!) {
				markPullRequestReadyForReview(input: {pullRequestId: $pullRequestId}) {
					  clientMutationId
					}
				  }`;

			const response = await this.client.request<any>(query, {
				pullRequestId: request.pullRequestId
			});
			return response;
		} else {
			// const query = `mutation UpdateDraft($pullRequestId: String!, $isDraft:Boolean!) {
			// 	updatePullRequest(input: {pullRequestId: $pullRequestId, isDraft:$isDraft}) {
			// 		  clientMutationId
			// 		}
			// 	  }`;
			// const response = await this.client.request<any>(query, {
			// 	pullRequestId: request.pullRequestId,
			// 	isDraft: request.isDraft
			// });
			// return response;
		}
	}

	async setLabelOnPullRequest(request: { pullRequestId: string; labelId: string; onOff: boolean }) {
		const method = request.onOff ? "addLabelsToLabelable" : "removeLabelsFromLabelable";
		const Method = request.onOff ? "AddLabelsToLabelable" : "RemoveLabelsFromLabelable";
		const query = `mutation ${Method}($labelableId: String!,$labelIds:String!) {
			${method}(input: {labelableId: $labelableId, labelIds:$labelIds}) {
				  clientMutationId
				}
			  }`;

		const response = await this.client.request<any>(query, {
			labelableId: request.pullRequestId,
			labelIds: request.labelId
		});
		return response;
	}

	async setAssigneeOnPullRequest(request: {
		pullRequestId: string;
		assigneeId: string;
		onOff: boolean;
	}) {
		const method = request.onOff ? "addAssigneesToAssignable" : "removeAssigneesFromAssignable";
		const Method = request.onOff ? "AddAssigneesFromAssignable" : "RemoveAssigneesFromAssignable";
		const query = `mutation ${Method}($assignableId: String!,$assigneeIds:String!) {
			${method}(input: {assignableId: $assignableId, assigneeIds:$assigneeIds}) {
				  clientMutationId
				}
			  }`;

		const response = await this.client.request<any>(query, {
			assignableId: request.pullRequestId,
			assigneeIds: request.assigneeId
		});
		return response;
	}

	async setAssigneeOnIssue(request: { issueId: string; assigneeId: string; onOff: boolean }) {
		const method = request.onOff ? "addAssigneesToAssignable" : "removeAssigneesFromAssignable";
		const Method = request.onOff ? "AddAssigneesFromAssignable" : "RemoveAssigneesFromAssignable";
		const query = `mutation ${Method}($assignableId: String!,$assigneeIds:String!) {
			${method}(input: {assignableId: $assignableId, assigneeIds:$assigneeIds}) {
				  clientMutationId
				}
			  }`;

		const response = await this.client.request<any>(query, {
			assignableId: request.issueId,
			assigneeIds: request.assigneeId
		});
		return response;
	}

	async toggleReaction(request: { subjectId: string; content: string; onOff: boolean }) {
		const method = request.onOff ? "addReaction" : "removeReaction";
		const Method = request.onOff ? "AddReaction" : "RemoveReaction";
		const query = `mutation ${Method}($subjectId: String!,$content:String!) {
			${method}(input: {subjectId: $subjectId, content:$content}) {
				  clientMutationId
				}
			  }`;

		const response = await this.client.request<any>(query, {
			subjectId: request.subjectId,
			content: request.content
		});
		return response;
	}

	async updatePullRequestSubscription(request: { pullRequestId: string; onOff: boolean }) {
		const query = `mutation UpdateSubscription($subscribableId: String!,$state:String!) {
			updateSubscription(input: {subscribableId: $subscribableId, state:$state}) {
				  clientMutationId
				}
			  }`;

		const response = await this.client.request<any>(query, {
			subscribableId: request.pullRequestId,
			state: request.onOff ? "SUBSCRIBED" : "UNSUBSCRIBED"
		});
		return response;
	}

	async updateIssueComment(request: { id: string; body: string }) {
		const query = `mutation UpdateComment($id: String!, $body:String!) {
			updateIssueComment(input: {id: $id, body:$body}) {
				  clientMutationId
				}
			  }`;

		const response = await this.client.request<any>(query, {
			id: request.id,
			body: request.body
		});
		return response;
	}

	async updateReviewComment(request: { id: string; body: string }) {
		const query = `mutation UpdateComment($pullRequestReviewCommentId: String!, $body:String!) {
			updatePullRequestReviewComment(input: {pullRequestReviewCommentId: $pullRequestReviewCommentId, body:$body}) {
				  clientMutationId
				}
			  }`;

		const response = await this.client.request<any>(query, {
			pullRequestReviewCommentId: request.id,
			body: request.body
		});
		return response;
	}

	async updateReview(request: { id: string; body: string }) {
		const query = `mutation UpdateComment($pullRequestReviewId: String!, $body:String!) {
			updatePullRequestReview(input: {pullRequestReviewId: $pullRequestReviewId, body:$body}) {
				  clientMutationId
				}
			  }`;

		const response = await this.client.request<any>(query, {
			pullRequestReviewId: request.id,
			body: request.body
		});
		return response;
	}

	async updatePullRequestBody(request: { id: string; body: string }) {
		const query = `mutation UpdateComment($pullRequestId: String!, $body:String!) {
			updatePullRequest(input: {pullRequestId: $pullRequestId, body:$body}) {
				  clientMutationId
				}
			  }`;

		const response = await this.client.request<any>(query, {
			pullRequestId: request.id,
			body: request.body
		});
		return response;
	}

	async addPullRequestReview(request: { pullRequestId: string }) {
		const query = `
		mutation AddPullRequestReview($pullRequestId:String!) {
		addPullRequestReview(input: {pullRequestId: $pullRequestId}) {
			clientMutationId
			pullRequestReview {
			  id
			}
		  }
		}`;
		const response = await this.client.request<any>(query, {
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
		const response = await this.client.request<any>(query, metaData);
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
			query = `mutation AddPullRequestReviewComment($text:String!, $pullRequestId:String!, $pullRequestReviewId:String!, $filePath:String, $position:Int) {
			addPullRequestReviewComment(input: {body:$text, pullRequestId:$pullRequestId, pullRequestReviewId:$pullRequestReviewId, path:$filePath, position:$position}) {
			  clientMutationId
			}
		  }
		  `;
		} else {
			request.pullRequestReviewId = await this.getPullRequestReviewId(request);
			query = `mutation AddPullRequestReviewComment($text:String!, $pullRequestId:String!, $filePath:String, $position:Int) {
				addPullRequestReviewComment(input: {body:$text, pullRequestId:$pullRequestId, path:$filePath, position:$position}) {
				  clientMutationId
				}
			  }
			  `;
		}
		const response = await this.client.request<any>(query, request);
		return response;
	}

	async deletePullRequestReview(request: { pullRequestId: string; pullRequestReviewId: string }) {
		const query = `mutation DeletePullRequestReview($pullRequestReviewId:String!) {
			deletePullRequestReview(input: {pullRequestReviewId: $pullRequestReviewId}){
			  clientMutationId
			}
		  }
		  `;
		const response = await this.client.request<any>(query, {
			pullRequestReviewId: request.pullRequestReviewId
		});
		return response;
	}

	async submitReview(request: { pullRequestId: string; text: string; eventType: string }) {
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

		const query = `mutation SubmitPullRequestReview($pullRequestId:String!, $body:String) {
			submitPullRequestReview(input: {event: ${request.eventType}, body: $body, pullRequestId: $pullRequestId}){
			  clientMutationId
			}
		  }
		  `;
		const response = await this.client.request<any>(query, {
			pullRequestId: request.pullRequestId,
			body: request.text
		});
		return response;
	}

	// async closePullRequest(request: { pullRequestId: string }) {
	// 	const query = `mutation ClosePullRequest($pullRequestId: String!) {
	// 		closePullRequest(input: {pullRequestId: $pullRequestId}) {
	// 			  clientMutationId
	// 			}
	// 		  }`;

	// 	const response = await this.client.request<any>(query, {
	// 		pullRequestId: request.pullRequestId
	// 	});
	// 	return true;
	// }

	_getMyPullRequestsCache = new Map<string, GetMyPullRequestsResponse[]>();
	async getMyPullRequests(request: {
		owner: string;
		repo: string;
		isOpen?: boolean;
		force?: boolean;
	}): Promise<GetMyPullRequestsResponse[] | undefined> {
		const cacheKey = [request.owner, request.repo, request.isOpen].join("-");
		if (!request.force) {
			const cached = this._getMyPullRequestsCache.get(cacheKey);
			if (cached) {
				Logger.debug(`github getMyPullRequests got from cache, key=${cacheKey}`);
				return cached!;
			} else {
				Logger.debug(`github getMyPullRequests cache miss, key=${cacheKey}`);
			}
		} else {
			Logger.debug(`github getMyPullRequests removed from cache, key=${cacheKey}`);
			this._getMyPullRequestsCache.delete(cacheKey);
		}
		let results: any = [];
		const repoQuery =
			request && request.owner && request.repo ? `repo:${request.owner}/${request.repo} ` : "";
		const isOpenQuery = request && request.isOpen === true ? "is:open " : "";

		const query = (q: string) => `query Search {
			rateLimit {
				limit
				cost
				remaining
				resetAt
			}
			search(query: "${q}", type: ISSUE, last: 100) {
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
					isDraft
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
		// NOTE: there is also `reviewed-by` which `review-requested` translates to after the user
		// has started or completed the review.

		// see: https://docs.github.com/en/github/searching-for-information-on-github/searching-issues-and-pull-requests
		const items = await Promise.all([
			this.client.request<any>(query(`${repoQuery}${isOpenQuery}is:pr author:@me`)),
			this.client.request<any>(query(`${repoQuery}${isOpenQuery}is:pr assignee:@me`)),
			this.client.request<any>(query(`${repoQuery}${isOpenQuery}is:pr review-requested:@me`)),
			this.client.request<any>(query(`${repoQuery}${isOpenQuery}is:pr reviewed-by:@me`))
		]).catch(ex => {
			Logger.error(ex);
			throw new Error(ex.response ? JSON.stringify(ex.response) : ex.message);
		});

		for (const item of items) {
			if (item && item.search && item.search.edges) {
				results = results.concat(item.search.edges.map((_: any) => _.node));
			}
			if (item.rateLimit) {
				Logger.debug(`github getMyPullRequests rateLimit=${JSON.stringify(item.rateLimit)}`);
			}
		}

		results = _uniqBy(results, (_: { id: string }) => _.id);
		const response: GetMyPullRequestsResponse[] = results
			.map((pr: { createdAt: string }) => ({
				...pr,
				providerId: this.providerConfig?.id,
				createdAt: new Date(pr.createdAt).getTime()
			}))
			.sort((a: { createdAt: number }, b: { createdAt: number }) => b.createdAt - a.createdAt);
		this._getMyPullRequestsCache.set(cacheKey, response);
		return response;
	}

	async getPullRequestLastUpdated(request: { pullRequestId: string }) {
		const response = await this.client.request<any>(
			`query GetPullRequestLastUpdated($pullRequestId:ID!) {
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
		const pullRequestInfo = await this.client.request<any>(
			`query FindPullRequest($owner:String!,$name:String!,$pullRequestNumber:Int!) {
					repository(owner:$owner name:$name) {
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
		return pullRequestInfo.repository.pullRequest.id;
	}

	async getIssueIdFromUrl(request: { url: string }) {
		// since we only have the url for the Issue -- parse it out for the
		// data we need.
		const uri = URI.parse(request.url);
		const path = uri.path.split("/");
		const owner = path[1];
		const repo = path[2];
		const issueNumber = parseInt(path[4], 10);
		const issueInfo = await this.client.request<any>(
			`query FindIssue($owner:String!,$name:String!,$issueNumber:Int!) {
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
		const { repository, viewer } = issueInfo;
		const { issue } = repository;
		const card = {
			id: issue.id,
			number: issue.number,
			label: issue.title,
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
	}) {
		const query = `mutation UpdatePullRequest($pullRequestId: String!, $milestoneId: String) {
			updatePullRequest(input: {pullRequestId: $pullRequestId, milestoneId: $milestoneId}) {
				  clientMutationId
				}
			  }`;

		// remove it by setting it to null
		const response = await this.client.request<any>(query, {
			pullRequestId: request.pullRequestId,
			milestoneId: request.onOff ? request.milestoneId : null
		});
		return response;
	}

	async toggleProjectOnPullRequest(request: {
		pullRequestId: string;
		projectId: string;
		onOff: boolean;
	}) {
		const metadata = await this.getPullRequestMetadata(request.pullRequestId);
		const projectIds = new Set(metadata.projectCards.map(_ => _.project.id));
		const query = `mutation UpdatePullRequest($pullRequestId: String!, $projectIds: [String]) {
			updatePullRequest(input: {pullRequestId: $pullRequestId, projectIds: $projectIds}) {
				  clientMutationId
				}
			  }`;
		if (request.onOff) {
			projectIds.add(request.projectId);
		} else {
			projectIds.delete(request.projectId);
		}

		const response = await this.client.request<any>(query, {
			pullRequestId: request.pullRequestId,
			projectIds: [...projectIds]
		});
		return response;
	}

	async updatePullRequestTitle(request: { pullRequestId: string; title: string }) {
		const query = `mutation UpdatePullRequest($pullRequestId: String!, $title: String) {
			updatePullRequest(input: {pullRequestId: $pullRequestId, title: $title}) {
				  clientMutationId
				}
			  }`;

		const response = await this.client.request<any>(query, {
			pullRequestId: request.pullRequestId,
			title: request.title
		});
		return response;
	}

	async mergePullRequest(request: { pullRequestId: string; mergeMethod: MergeMethod }) {
		if (!request.mergeMethod) throw new Error("InvalidMergeMethod");
		const mergeMethods = new Set(["MERGE", "REBASE", "SQUASH"]);
		if (!mergeMethods.has(request.mergeMethod)) throw new Error("InvalidMergeMethod");

		const query = `mutation MergePullRequest($pullRequestId: String!) {
			mergePullRequest(input: {pullRequestId: $pullRequestId, mergeMethod: ${request.mergeMethod}}) {
				  clientMutationId
				}
			  }`;

		const response = await this.client.request<any>(query, {
			pullRequestId: request.pullRequestId
		});
		return true;
	}

	async lockPullRequest(request: { pullRequestId: string; lockReason: string }) {
		// OFF_TOPIC, TOO_HEATED, SPAM
		await this.client.request<any>(
			`mutation LockPullRequest($pullRequestId: String!, $lockReason:String!) {
				lockLockable(input: {lockableId: $pullRequestId, lockReason:$lockReason}) {
				  clientMutationId
				}
			  }`,
			{
				pullRequestId: request.pullRequestId,
				lockReason: request.lockReason
			}
		);

		return true;
	}

	async unlockPullRequest(request: { pullRequestId: string }) {
		await this.client.request<any>(
			`mutation UnlockPullRequest($pullRequestId: String!) {
				unlockLockable(input: {lockableId: $pullRequestId}) {
				  clientMutationId
				}
			  }`,
			{
				pullRequestId: request.pullRequestId
			}
		);

		return true;
	}

	async getReviewersForPullRequest(request: { pullRequestId: string }) {
		const ownerData = await this.getRepoOwnerFromPullRequestId(request.pullRequestId);
		const response = await this.client.request<any>(
			`query GetReviewersForPullRequest($owner:String!, $name:String!, $pullRequestNumber:Int!) {
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

	async addReviewerToPullRequest(request: { pullRequestId: string; userId: string }) {
		const currentReviewers = await this.getReviewersForPullRequest(request);
		const response = await this.client.request<any>(
			`mutation RequestReviews($pullRequestId: String!, $userIds:[String!]!) {
				requestReviews(input: {pullRequestId:$pullRequestId, userIds:$userIds}) {
			  clientMutationId
			}
		  }`,
			{
				pullRequestId: request.pullRequestId,
				userIds: (currentReviewers || []).concat(request.userId)
			}
		);
		return response;
	}

	async removeReviewerFromPullRequest(request: { pullRequestId: string; userId: string }) {
		const currentReviewers = await this.getReviewersForPullRequest(request);
		const response = await this.client.request<any>(
			`mutation RequestReviews($pullRequestId: String!, $userIds:[String!]!) {
				requestReviews(input: {pullRequestId:$pullRequestId, userIds:$userIds}) {
			  clientMutationId
			}
		  }`,
			{
				pullRequestId: request.pullRequestId,
				userIds: (currentReviewers || []).filter((_: string) => _ !== request.userId)
			}
		);
		return response;
	}

	async createPullRequestCommentAndClose(request: { pullRequestId: string; text: string }) {
		if (request.text) {
			await this.client.request<any>(
				`mutation AddCommentToPullRequest($pullRequestId: String!, $body:String!) {
				addComment(input: {subjectId: $pullRequestId, body:$body}) {
				  clientMutationId
				}
			  }`,
				{
					pullRequestId: request.pullRequestId,
					body: request.text
				}
			);
		}

		await this.client.request<any>(
			`mutation ClosePullRequest($pullRequestId: String!) {
			closePullRequest(input: {pullRequestId: $pullRequestId}) {
				  clientMutationId
				}
			}`,
			{
				pullRequestId: request.pullRequestId
			}
		);

		return true;
	}

	async createPullRequestCommentAndReopen(request: { pullRequestId: string; text: string }) {
		if (request.text) {
			await this.client.request<any>(
				`mutation AddCommentToPullRequest($pullRequestId: String!, $body:String!) {
				addComment(input: {subjectId: $pullRequestId, body:$body}) {
				  clientMutationId
				}
			  }`,
				{
					pullRequestId: request.pullRequestId,
					body: request.text
				}
			);
		}

		await this.client.request<any>(
			`mutation ReopenPullRequest($pullRequestId: String!) {
			reopenPullRequest(input: {pullRequestId: $pullRequestId}) {
				  clientMutationId
				}
			}`,
			{
				pullRequestId: request.pullRequestId
			}
		);

		return true;
	}

	async resolveReviewThread(request: { threadId: string }) {
		const response = await this.client.request<any>(
			`mutation ResolveReviewThread($threadId:String!) {
				resolveReviewThread(input: {threadId:$threadId}) {
				  clientMutationId
				}
			}`,
			{
				threadId: request.threadId
			}
		);
		return response;
	}

	async unresolveReviewThread(request: { threadId: string }) {
		const response = await this.client.request<any>(
			`mutation UnresolveReviewThread($threadId:String!) {
				unresolveReviewThread(input: {threadId:$threadId}) {
				  clientMutationId
				}
			}`,
			{
				threadId: request.threadId
			}
		);
		return response;
	}

	async addComment(request: { subjectId: string; text: string }) {
		const response = await this.client.request<any>(
			`mutation AddComment($subjectId:String!,$body:String!) {
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
	}) {
		// https://github.community/t/feature-commit-comments-for-a-pull-request/13986/9
		const ownerData = await this.getRepoOwnerFromPullRequestId(request.pullRequestId);
		const payload = {
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

		const data = await this.post<any, any>(
			`/repos/${ownerData.owner}/${ownerData.name}/pulls/${ownerData.pullRequestNumber}/comments`,
			payload
		);
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
		const data = await this.post<any, any>(
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
		const data = await this.post<any, any>(
			`/repos/${ownerData.owner}/${ownerData.name}/pulls/${ownerData.pullRequestNumber}/comments/${request.commentId}/replies`,
			{
				body: request.text
			}
		);
		return data.body;
	}

	async createPullRequestComment(request: { pullRequestId: string; text: string }) {
		const query = `mutation AddCommentToPullRequest($subjectId: String!, $body: String!) {
				addComment(input: {subjectId: $subjectId, body:$body}) {
				  clientMutationId
				}
			  }`;

		const response = await this.client.request<any>(query, {
			subjectId: request.pullRequestId,
			body: request.text
		});
		return true;
	}

	async deletePullRequestComment(request: {
		id: string;
		type: "ISSUE_COMMENT" | "REVIEW_COMMENT";
	}) {
		const method =
			request.type === "ISSUE_COMMENT" ? "deleteIssueComment" : "deletePullRequestReviewComment";
		const query = `mutation DeleteCommentFromPullRequest($id: String!) {
				${method}(input: {id: $id}) {
				  clientMutationId
				}
			  }`;

		await this.client.request<any>(query, {
			id: request.id
		});
		return true;
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
		const response = await this.client.request<any>(query, {
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
		const response = await this.client.request<any>(query, {
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
		const response = await this.client.request<any>(query, {
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
				const apiResponse = await this.get<FetchThirdPartyPullRequestFilesResponse[]>(url);
				changedFiles.push(...apiResponse.body);
				url = this.nextPage(apiResponse.response);
			} while (url);
		} catch (err) {
			Logger.error(err);
			debugger;
		}

		return changedFiles;

		// const data = await this.get<any>(
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
			`... on ConvertToDraftEvent {
			__typename
			actor {
			  login
			  avatarUrl
			}
		  }`,
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
			actor {
			  login
			  avatarUrl
			  resourcePath
			  url
			}
			id
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
			actor {
			  login
			  avatarUrl
			}
		  }`,
			`... on HeadRefForcePushedEvent {
			__typename
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
			actor {
			  login
			  avatarUrl
			}
			lockReason
			createdAt
		  }`,
			`... on MarkedAsDuplicateEvent {
			__typename
		  }`,
			`... on MentionedEvent {
			__typename
			actor {
			  login
			  avatarUrl
			}
			createdAt
		  }`,
			`... on MergedEvent {
			__typename
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
			  id
			__typename
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
			}
		  }`,
			`... on RemovedFromProjectEvent {
			__typename
		  }`,
			`... on RenamedTitleEvent {
			__typename
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
			actor {
			  login
			  avatarUrl
			}
			createdAt
		  }`,
			`... on ReviewDismissedEvent {
			__typename
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
			actor {
			  login
			  avatarUrl
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
					isDraft
					locked
					resourcePath
					reviewDecision
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
				}
			  }`;
			const response = (await this.client.request<any>(query, {
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

		const query = await this.client.request<any>(
			`query pr($owner: String!, $name: String!, $pullRequestNumber: Int!) {
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
			const query = `query pr($owner: String!, $repo: String!) {
				repository(name: $repo, owner: $owner${cursor ? `after: $cursor` : ""}) {
					pullRequests(states: [OPEN, MERGED], first: 100, orderBy: { field: UPDATED_AT, direction: DESC }) {
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

			const response = await this.client.request<GetPullRequestsResponse>(query, {
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
