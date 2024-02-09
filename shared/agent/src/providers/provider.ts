"use strict";
import {
	AddEnterpriseProviderRequest,
	AddEnterpriseProviderResponse,
	CreateThirdPartyCardRequest,
	CreateThirdPartyCardResponse,
	CreateThirdPartyPostRequest,
	CreateThirdPartyPostResponse,
	DeleteThirdPartyPostRequest,
	DeleteThirdPartyPostResponse,
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
	FetchThirdPartyRepoMatchToFossaRequest,
	FetchThirdPartyRepoMatchToFossaResponse,
	FetchThirdPartyCodeAnalyzersRequest,
	IssueParams,
	MoveThirdPartyCardRequest,
	MoveThirdPartyCardResponse,
	ProviderConfigurationData,
	RemoveEnterpriseProviderRequest,
	ThirdPartyDisconnect,
	ThirdPartyProviderConfig,
	UpdateThirdPartyStatusRequest,
	UpdateThirdPartyStatusResponse,
	FetchThirdPartyLicenseDependenciesResponse,
	FetchThirdPartyVulnerabilitiesResponse,
} from "@codestream/protocols/agent";
import { CSMe, CSProviderInfos } from "@codestream/protocols/api";
import { Response } from "undici";

import { SessionContainer } from "../container";
import { GitRemote, GitRepository } from "../git/gitService";
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
	["fossa", "FOSSA"],
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
	deletePost(request: DeleteThirdPartyPostRequest): Promise<DeleteThirdPartyPostResponse>;

	getChannels(request: FetchThirdPartyChannelsRequest): Promise<FetchThirdPartyChannelsResponse>;
}

export interface ThirdPartyProviderSupportsStatus {
	updateStatus(request: UpdateThirdPartyStatusRequest): Promise<UpdateThirdPartyStatusResponse>;
}

export interface ThirdPartyProviderSupportsBuilds {
	fetchBuilds(request: FetchThirdPartyBuildsRequest): Promise<FetchThirdPartyBuildsResponse>;
}

export interface ThirdPartyProviderSupportsCodeAnalyzers {
	fetchLicenseDependencies(
		request: FetchThirdPartyCodeAnalyzersRequest,
		params: IssueParams
	): Promise<FetchThirdPartyLicenseDependenciesResponse>;

	fetchVulnerabilities(
		request: FetchThirdPartyCodeAnalyzersRequest,
		params: IssueParams
	): Promise<FetchThirdPartyVulnerabilitiesResponse>;

	fetchIsRepoMatch(
		request: FetchThirdPartyRepoMatchToFossaRequest
	): Promise<FetchThirdPartyRepoMatchToFossaResponse>;
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

export namespace ThirdPartyCodeAnalyzerProvider {
	export function supportsCodeAnalysis(
		provider: ThirdPartyCodeAnalyzerProvider
	): provider is ThirdPartyCodeAnalyzerProvider & ThirdPartyProviderSupportsCodeAnalyzers {
		return (
			(provider as any).fetchIsRepoMatch !== undefined &&
			(provider as any).fetchLicenseDependencies !== undefined &&
			(provider as any).fetchVulnerabilities !== undefined
		);
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
}

export interface ThirdPartyPostProvider extends ThirdPartyProvider {
	supportsSharing(): this is ThirdPartyPostProvider & ThirdPartyProviderSupportsPosts;

	supportsStatus(): this is ThirdPartyPostProvider & ThirdPartyProviderSupportsStatus;
}

export interface ThirdPartyBuildProvider extends ThirdPartyProvider {
	supportsBuilds(): this is ThirdPartyBuildProvider & ThirdPartyProviderSupportsBuilds;
}

export interface ThirdPartyCodeAnalyzerProvider extends ThirdPartyProvider {
	supportsCodeAnalysis(): this is ThirdPartyCodeAnalyzerProvider &
		ThirdPartyProviderSupportsCodeAnalyzers;
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
