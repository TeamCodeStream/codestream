"use strict";
import {
	AddEnterpriseProviderRequest,
	AddEnterpriseProviderResponse,
	CreateThirdPartyCardRequest,
	CreateThirdPartyCardResponse,
	CreateThirdPartyPostRequest,
	CreateThirdPartyPostResponse,
	DeleteThirdPartyPostRequest,
	FetchAssignableUsersAutocompleteRequest,
	FetchAssignableUsersRequest,
	FetchAssignableUsersResponse,
	FetchThirdPartyBoardsRequest,
	FetchThirdPartyBoardsResponse,
	FetchThirdPartyBuildsRequest,
	FetchThirdPartyBuildsResponse,
	FetchThirdPartyCardsRequest,
	FetchThirdPartyCardsResponse,
	FetchThirdPartyCardWorkflowRequest,
	FetchThirdPartyCardWorkflowResponse,
	FetchThirdPartyChannelsRequest,
	FetchThirdPartyChannelsResponse,
	FetchThirdPartyPullRequestCommitsRequest,
	FetchThirdPartyPullRequestCommitsResponse,
	FetchThirdPartyPullRequestRequest,
	FetchThirdPartyPullRequestResponse,
	GetMyPullRequestsRequest,
	GetMyPullRequestsResponse,
	MoveThirdPartyCardRequest,
	MoveThirdPartyCardResponse,
	ProviderConfigurationData,
	RemoveEnterpriseProviderRequest,
	ThirdPartyDisconnect,
	ThirdPartyProviderConfig,
	UpdateThirdPartyStatusRequest,
	UpdateThirdPartyStatusResponse,
} from "@codestream/protocols/agent";
import { CSMe, CSProviderInfos } from "@codestream/protocols/api";
import { Response } from "node-fetch";

import { SessionContainer } from "../container";
import { GitRemote, GitRemoteLike, GitRepository } from "../git/gitService";
import { Logger } from "../logger";

export const providerDisplayNamesByNameKey = new Map<string, string>([
	["asana", "Asana"],
	["bitbucket", "Bitbucket"],
	["bitbucket_server", "Bitbucket Server"],
	["github", "GitHub"],
	["github_enterprise", "GitHub Enterprise"],
	["gitlab", "GitLab"],
	["gitlab_enterprise", "GitLab Self-Managed"],
	["jira", "Jira"],
	["jiraserver", "Jira Server"],
	["trello", "Trello"],
	["youtrack", "YouTrack"],
	["azuredevops", "Azure DevOps"],
	["slack", "Slack"],
	["msteams", "Microsoft Teams"],
	["okta", "Okta"],
	["shortcut", "Shortcut"],
	["linear", "Linear"],
	["newrelic", "New Relic"],
	["circleci", "Circle CI"],
]);

export interface ThirdPartyProviderSupportsIssues {
	getBoards(request: FetchThirdPartyBoardsRequest): Promise<FetchThirdPartyBoardsResponse>;

	getCards(request: FetchThirdPartyCardsRequest): Promise<FetchThirdPartyCardsResponse>;

	getCardWorkflow(
		request: FetchThirdPartyCardWorkflowRequest
	): Promise<FetchThirdPartyCardWorkflowResponse>;

	moveCard(request: MoveThirdPartyCardRequest): Promise<MoveThirdPartyCardResponse>;

	getAssignableUsers(request: FetchAssignableUsersRequest): Promise<FetchAssignableUsersResponse>;

	getAssignableUsersAutocomplete(
		request: FetchAssignableUsersAutocompleteRequest
	): Promise<FetchAssignableUsersResponse>;

	createCard(request: CreateThirdPartyCardRequest): Promise<CreateThirdPartyCardResponse>;
}

export interface ThirdPartyProviderSupportsPosts {
	createPost(request: CreateThirdPartyPostRequest): Promise<CreateThirdPartyPostResponse>;
	deletePost(request: DeleteThirdPartyPostRequest): Promise<DeleteThirdPartyPostRequest>;

	getChannels(request: FetchThirdPartyChannelsRequest): Promise<FetchThirdPartyChannelsResponse>;
}

export interface ThirdPartyProviderSupportsStatus {
	updateStatus(request: UpdateThirdPartyStatusRequest): Promise<UpdateThirdPartyStatusResponse>;
}

export interface ThirdPartyProviderSupportsPullRequests {
	getRepoInfo(request: ProviderGetRepoInfoRequest): Promise<ProviderGetRepoInfoResponse>;

	getIsMatchingRemotePredicate(): (remoteLike: GitRemoteLike) => boolean;

	getRemotePaths(repo: GitRepository, _projectsByRemotePath: any): any;
	getOwnerFromRemote(remote: string): { owner: string; name: string };
	getPullRequestsContainigSha(
		repoIdentifier: { owner: string; name: string }[],
		sha: string
	): Promise<any[]>;
}

export interface ThirdPartyProviderSupportsCreatingPullRequests
	extends ThirdPartyProviderSupportsPullRequests {
	createPullRequest(
		request: ProviderCreatePullRequestRequest
	): Promise<ProviderCreatePullRequestResponse | undefined>;
}

export interface ThirdPartyProviderSupportsViewingPullRequests
	extends ThirdPartyProviderSupportsPullRequests {
	getPullRequest(
		request: FetchThirdPartyPullRequestRequest
	): Promise<FetchThirdPartyPullRequestResponse>;

	getPullRequestCommits(
		request: FetchThirdPartyPullRequestCommitsRequest
	): Promise<FetchThirdPartyPullRequestCommitsResponse>;

	getMyPullRequests(
		request: GetMyPullRequestsRequest
	): Promise<GetMyPullRequestsResponse[][] | undefined>;
}

export interface ThirdPartyProviderSupportsBuilds {
	fetchBuilds(request: FetchThirdPartyBuildsRequest): Promise<FetchThirdPartyBuildsResponse>;
}

export namespace ThirdPartyIssueProvider {
	export function supportsIssues(
		provider: ThirdPartyProvider
	): provider is ThirdPartyProvider & ThirdPartyProviderSupportsIssues {
		return (
			(provider as any).getBoards !== undefined &&
			(provider as any).getAssignableUsers !== undefined &&
			(provider as any).createCard !== undefined
		);
	}

	export function supportsViewingPullRequests(
		provider: ThirdPartyProvider
	): provider is ThirdPartyProvider & ThirdPartyProviderSupportsPullRequests {
		return (provider as any).getMyPullRequests !== undefined;
	}

	export function supportsCreatingPullRequests(
		provider: ThirdPartyProvider
	): provider is ThirdPartyProvider & ThirdPartyProviderSupportsPullRequests {
		return (provider as any).createPullRequest !== undefined;
	}
}

export namespace ThirdPartyPostProvider {
	export function supportsSharing(
		provider: ThirdPartyPostProvider
	): provider is ThirdPartyPostProvider & ThirdPartyProviderSupportsPosts {
		return (provider as any).createPost !== undefined;
	}

	export function supportsStatus(
		provider: ThirdPartyProvider
	): provider is ThirdPartyProvider & ThirdPartyProviderSupportsStatus {
		return (provider as any).updateStatus !== undefined;
	}
}

export namespace ThirdPartyBuildProvider {
	export function supportsBuilds(
		provider: ThirdPartyBuildProvider
	): provider is ThirdPartyBuildProvider & ThirdPartyProviderSupportsBuilds {
		return (provider as any).fetchBuilds !== undefined;
	}
}

export interface ThirdPartyProvider {
	readonly name: string;
	readonly displayName: string;
	readonly icon: string;
	hasTokenError?: boolean;

	connect(): Promise<void>;

	canConfigure(): boolean;

	configure(data: ProviderConfigurationData, verify?: boolean): Promise<boolean>;

	disconnect(request: ThirdPartyDisconnect): Promise<void>;

	addEnterpriseHost(request: AddEnterpriseProviderRequest): Promise<AddEnterpriseProviderResponse>;

	removeEnterpriseHost(request: RemoveEnterpriseProviderRequest): Promise<void>;

	getConfig(): ThirdPartyProviderConfig;

	isConnected(me: CSMe): boolean;

	ensureConnected(request?: { providerTeamId?: string }): Promise<void>;

	verifyConnection(config: ProviderConfigurationData): Promise<void>;

	/**
	 * Do any kind of pre-fetching work, like getting an API version number
	 *
	 * @return {*}  {Promise<void>}
	 * @memberof ThirdPartyProvider
	 */
	ensureInitialized(): Promise<void>;
}

export interface ThirdPartyIssueProvider extends ThirdPartyProvider {
	supportsIssues(): this is ThirdPartyIssueProvider & ThirdPartyProviderSupportsIssues;

	supportsViewingPullRequests(): this is ThirdPartyIssueProvider &
		ThirdPartyProviderSupportsViewingPullRequests;

	supportsCreatingPullRequests(): this is ThirdPartyIssueProvider &
		ThirdPartyProviderSupportsCreatingPullRequests;
}

export interface ThirdPartyPostProvider extends ThirdPartyProvider {
	supportsSharing(): this is ThirdPartyPostProvider & ThirdPartyProviderSupportsPosts;

	supportsStatus(): this is ThirdPartyPostProvider & ThirdPartyProviderSupportsStatus;
}

export interface ThirdPartyBuildProvider extends ThirdPartyProvider {
	supportsBuilds(): this is ThirdPartyBuildProvider & ThirdPartyProviderSupportsBuilds;
}

export interface ApiResponse<T> {
	body: T;
	response: Response;
}

// timeout for providers in minutes
export const REFRESH_TIMEOUT = 30;

interface RefreshableProviderInfo {
	expiresAt: number;
	refreshToken: string;
}

export function isRefreshable<TProviderInfo extends CSProviderInfos>(
	providerInfo: TProviderInfo
): providerInfo is TProviderInfo & RefreshableProviderInfo {
	return typeof (providerInfo as any).expiresAt === "number";
}

export interface ProviderVersion {
	/**
	 * Semantic version, aka X.Y.Z
	 *
	 * @type {string}
	 * @memberof ProviderVersion
	 */
	version: string;
	/**
	 * version as an array
	 *
	 * @type {number[]}
	 * @memberof ProviderVersion
	 */
	asArray: number[];
	/**
	 * optional revision information, GitLab has this
	 *
	 * @type {string}
	 * @memberof ProviderVersion
	 */
	revision?: string;
	/**
	 * optional edition information like "ee". Gitlab has this
	 *
	 * @type {string}
	 * @memberof ProviderVersion
	 */
	edition?: string;

	/**
	 * true if the version is 0.0.0
	 */
	isDefault?: boolean;

	/**
	 * true if we're not able to get a version from the api
	 */
	isLowestSupportedVersion?: boolean;
}

export interface PullRequestComment {
	author: {
		id: string;
		nickname: string;
		username?: string;
	};
	createdAt: number;
	id: string;
	path: string;
	pullRequest: {
		id: number;
		externalId?: string;
		title?: string;
		url: string;
		isOpen: boolean;
		targetBranch: string;
		sourceBranch: string;
	};
	text: string;
	code: string;
	url: string;

	commit: string;
	originalCommit?: string;
	line: number;
	originalLine?: number;
	diffHunk?: string;
	outdated?: boolean;
}

export async function getOpenedRepos<R>(
	predicate: (remote: GitRemote) => boolean,
	queryFn: (path: string) => Promise<ApiResponse<R>>,
	remoteRepos: Map<string, R>
): Promise<Map<string, R>> {
	const openRepos = new Map<string, R>();

	const { git } = SessionContainer.instance();
	const gitRepos = await git.getRepositories();

	for (const gitRepo of gitRepos) {
		const remotes = await git.getRepoRemotes(gitRepo.path);
		for (const remote of remotes) {
			if (!openRepos.has(remote.path) && predicate(remote)) {
				let remoteRepo = remoteRepos.get(remote.path);
				if (remoteRepo == null) {
					try {
						const response = await queryFn(remote.path);
						remoteRepo = {
							...response.body,
							path: gitRepo.path,
						};
						remoteRepos.set(remote.path, remoteRepo);
					} catch (ex) {
						Logger.error(ex);
						debugger;
					}
				}

				if (remoteRepo != null) {
					openRepos.set(remote.path, remoteRepo);
				}
			}
		}
	}

	return openRepos;
}

export async function getRemotePaths<R extends { path: string }>(
	repo: GitRepository | undefined,
	predicate: (remote: GitRemote) => boolean,
	remoteRepos: Map<string, R>
): Promise<string[] | undefined> {
	try {
		if (repo === undefined) return undefined;

		const remotesPromise = repo.getRemotes();

		const remotePaths = [];
		for (const [path, remoteRepo] of remoteRepos.entries()) {
			if (remoteRepo.path === repo.path) {
				remotePaths.push(path);
			}
		}
		if (remotePaths.length) return remotePaths;

		const remotes = await remotesPromise;
		return remotes.filter(predicate).map(r => r.path);
	} catch (ex) {
		return undefined;
	}
}

export interface ProviderGetRepoInfoRequest {
	providerId: string;
	remote: string;
}

export interface ProviderPullRequestInfo {
	id: string;
	url: string;
	nameWithOwner?: string;
	baseRefName: string;
	headRefName: string;
}

export interface ProviderGetRepoInfoResponse {
	/**
	 * id of the repository from the provider
	 */
	id?: string;
	/**
	 * in github.com/TeamCodeStream/codestream this is TeamCodeStream/codestream
	 */
	nameWithOwner?: string;
	/**
	 * in github.com/TeamCodeStream/codestream this is TeamCodeStream
	 */
	owner?: string;
	/**
	 * in github.com/TeamCodeStream/codestream this is codestream
	 */
	name?: string;
	/**
	 * is this repo forked
	 */
	isFork?: boolean;
	/**
	 * defaultBranch: main, master, something else
	 */
	defaultBranch?: string;
	/**
	 * currently open pull requests
	 */
	pullRequests?: ProviderPullRequestInfo[];

	error?: { message?: string; type: string };
	// used for some providers
	key?: string;
}

export interface ProviderCreatePullRequestRequest {
	/** CodeStream providerId, aka github*com, gitlab*com, etc. */
	providerId: string;
	/** certain providers require their internal repo Id */
	providerRepositoryId?: string;
	/** is the repo a fork? */
	isFork?: boolean;
	/** to look up the repo ID on the provider  */
	remote: string;
	/** PR title */
	title: string;
	/** PR description (optional) */
	description?: string;
	/** base branch name, or the branch that will accept the PR */
	baseRefName: string;
	/** in github.com/TeamCodeStream/codestream this is TeamCodeStream/codestream */
	baseRefRepoNameWithOwner?: string;
	/** head branch name, or the branch you have been working on and want to merge somewhere */
	headRefName: string;
	/** in github.com/TeamCodeStream/codestream this is TeamCodeStream, some providers, like GitHub need this for forks */
	headRefRepoOwner?: string;
	/** in github.com/TeamCodeStream/codestream this is TeamCodeStream/codestream */
	headRefRepoNameWithOwner?: string;
	/** additional data */
	metadata: {
		reviewPermalink?: string;
		reviewers?: { name: string }[];
		approvedAt?: number;
		addresses?: { title: string; url: string }[];
	};
	/**  name of the user's IDE */
	ideName?: string;
}

export interface ProviderCreatePullRequestResponse {
	url?: string;
	title?: string;
	id?: string;
	error?: { message?: string; type: string };
}

export interface RepoPullRequestProvider {
	repo: GitRepository;
	providerId: string;
	providerName: string;
	provider: ThirdPartyProvider & ThirdPartyProviderSupportsPullRequests;
	remotes: GitRemote[];
}
