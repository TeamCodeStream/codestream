"use strict";
import {
	AddEnterpriseProviderRequest,
	AddEnterpriseProviderRequestType,
	AddEnterpriseProviderResponse,
	ConfigureThirdPartyProviderRequest,
	ConfigureThirdPartyProviderRequestType,
	ConfigureThirdPartyProviderResponse,
	ConnectThirdPartyProviderRequest,
	ConnectThirdPartyProviderRequestType,
	ConnectThirdPartyProviderResponse,
	CreateThirdPartyCardRequest,
	CreateThirdPartyCardRequestType,
	CreateThirdPartyCardResponse,
	CreateThirdPartyPostRequest,
	CreateThirdPartyPostRequestType,
	CreateThirdPartyPostResponse,
	DeleteThirdPartyPostRequest,
	DeleteThirdPartyPostRequestType,
	DeleteThirdPartyPostResponse,
	DisconnectThirdPartyProviderRequest,
	DisconnectThirdPartyProviderRequestType,
	DisconnectThirdPartyProviderResponse,
	ExecuteThirdPartyRequest,
	ExecuteThirdPartyRequestUntypedType,
	FetchAssignableUsersAutocompleteRequest,
	FetchAssignableUsersAutocompleteRequestType,
	FetchAssignableUsersRequest,
	FetchAssignableUsersRequestType,
	FetchProviderDefaultPullRequest,
	FetchProviderDefaultPullRequestsType,
	FetchProviderDefaultPullResponse,
	FetchThirdPartyBoardsRequest,
	FetchThirdPartyBoardsRequestType,
	FetchThirdPartyBoardsResponse,
	FetchThirdPartyBuildsRequest,
	FetchThirdPartyBuildsRequestType,
	FetchThirdPartyBuildsResponse,
	FetchThirdPartyCardsRequest,
	FetchThirdPartyCardsRequestType,
	FetchThirdPartyCardsResponse,
	FetchThirdPartyCardWorkflowRequest,
	FetchThirdPartyCardWorkflowRequestType,
	FetchThirdPartyCardWorkflowResponse,
	FetchThirdPartyChannelsRequest,
	FetchThirdPartyChannelsRequestType,
	FetchThirdPartyChannelsResponse,
	FetchThirdPartyCodeAnalyzersRequest,
	FetchThirdPartyLicenseDependenciesRequestType,
	FetchThirdPartyLicenseDependenciesResponse,
	FetchThirdPartyPullRequestCommitsRequest,
	FetchThirdPartyPullRequestCommitsType,
	FetchThirdPartyPullRequestRequest,
	FetchThirdPartyPullRequestRequestType,
	FetchThirdPartyRepoMatchToFossaRequest,
	FetchThirdPartyRepoMatchToFossaRequestType,
	FetchThirdPartyRepoMatchToFossaResponse,
	FetchThirdPartyVulnerabilitiesRequestType,
	FetchThirdPartyVulnerabilitiesResponse,
	GetMyPullRequestsResponse,
	MoveThirdPartyCardRequest,
	MoveThirdPartyCardRequestType,
	MoveThirdPartyCardResponse,
	PRProviderQueries,
	QueryThirdPartyRequest,
	QueryThirdPartyRequestType,
	RemoveEnterpriseProviderRequest,
	RemoveEnterpriseProviderRequestType,
	UpdateThirdPartyStatusRequest,
	UpdateThirdPartyStatusRequestType,
	UpdateThirdPartyStatusResponse,
} from "@codestream/protocols/agent";
import { CSMe } from "@codestream/protocols/api";
import { differenceWith } from "lodash";
import semver from "semver";
import { URI } from "vscode-uri";

import { SessionContainer } from "../container";
import { Logger } from "../logger";
import { CodeStreamSession } from "../session";
import { getProvider, getRegisteredProviders, log, lsp, lspHandler } from "../system";
import { GitLabEnterpriseProvider } from "./gitlabEnterprise";
import {
	ProviderCreatePullRequestRequest,
	ProviderCreatePullRequestResponse,
	ProviderGetRepoInfoRequest,
	ThirdPartyBuildProvider,
	ThirdPartyCodeAnalyzerProvider,
	ThirdPartyIssueProvider,
	ThirdPartyPostProvider,
	ThirdPartyProvider,
	ThirdPartyProviderSupportsPullRequests,
	ThirdPartyProviderSupportsViewingPullRequests,
} from "./provider";
import { getNrDirectives } from "./newrelic/nrContainer";

const PR_QUERIES: PRProviderQueries = {
	"gitlab*com": [
		{
			providerId: "gitlab*com",
			name: "is waiting on your review",
			query: `state=opened&reviewer_username=@me&scope=all`,
		},
		{
			providerId: "gitlab*com",
			name: "was assigned to you",
			query: `state=opened&scope=assigned_to_me`,
		},
	],
	"gitlab/enterprise": [
		{
			providerId: "gitlab/enterprise",
			name: "was assigned to you",
			query: `state=opened&scope=assigned_to_me`,
		},
	],
	"github*com": [
		{
			providerId: "github*com",
			name: "is waiting on your review",
			query: `is:pr is:open review-requested:@me -author:@me`,
		},
		{
			providerId: "github*com",
			name: "was assigned to you",
			query: `is:pr is:open assignee:@me -author:@me`,
		},
	],
	"github/enterprise": [
		{
			providerId: "github/enterprise",
			name: "is waiting on your review",
			query: `is:pr is:open review-requested:@me -author:@me`,
		},
		{
			providerId: "github/enterprise",
			name: "was assigned to you",
			query: `is:pr is:open assignee:@me -author:@me`,
		},
	],
	"bitbucket*org": [
		{
			providerId: "bitbucket*org",
			name: "Waiting on my Review",
			query: `with_default_reviewer=true&state=OPEN`,
		},
	],
};

interface ProviderPullRequests {
	providerId: string;
	queriedPullRequests: GetMyPullRequestsResponse[][];
}

export const ASSIGNED_TO_ME = "Assigned to Me";
export const WAITING_ON_REVIEW = "Waiting on my Review";
export const CREATED_BY_ME = "Created by Me";
const RECENT = "Recent";

@lsp
export class ThirdPartyProviderRegistry {
	private _lastProvidersPRs: ProviderPullRequests[] | undefined;
	private _queriedPRsAgeLimit?: { providerId: string; ageLimit: number[] }[] | undefined;
	private session: CodeStreamSession | undefined = undefined;

	initialize(session: CodeStreamSession) {
		this.session = session;
		return this;
	}

	private getProvidersPRsDiff = (providersPRs: ProviderPullRequests[]): ProviderPullRequests[] => {
		const newProvidersPRs: ProviderPullRequests[] = [];
		if (this._lastProvidersPRs === undefined) {
			this._queriedPRsAgeLimit = providersPRs.map(providerPRs => {
				const ageLimit = providerPRs.queriedPullRequests.map(
					(pullRequests: GetMyPullRequestsResponse[], index: number) => {
						if (pullRequests.length > 0) {
							return pullRequests[pullRequests.length - 1].createdAt;
						}
						return 0;
					}
				);
				return {
					providerId: providerPRs.providerId,
					ageLimit,
				};
			});
			return [];
		}

		providersPRs.map(providerPRs => {
			const previousProviderPRs = this._lastProvidersPRs?.find(
				_ => _.providerId === providerPRs.providerId
			);
			if (!previousProviderPRs) {
				return;
			}

			const queriedPullRequests: GetMyPullRequestsResponse[][] = [];
			providerPRs.queriedPullRequests.map(
				(pullRequests: GetMyPullRequestsResponse[], index: number) => {
					const ageLimit = this._queriedPRsAgeLimit?.find(
						_ => _.providerId === providerPRs.providerId
					);
					const actualPRs = pullRequests.filter(
						pr => pr.createdAt >= (ageLimit ? ageLimit.ageLimit[index] : 0)
					);
					queriedPullRequests.push(
						differenceWith(
							actualPRs,
							previousProviderPRs.queriedPullRequests[index],
							(value, other) => value.id === other.id
						)
					);
				}
			);

			newProvidersPRs.push({
				providerId: providerPRs.providerId,
				queriedPullRequests,
			});
		});

		return newProvidersPRs;
	};

	@log()
	@lspHandler(ConnectThirdPartyProviderRequestType)
	async connect(
		request: ConnectThirdPartyProviderRequest
	): Promise<ConnectThirdPartyProviderResponse> {
		const provider = getProvider(request.providerId);
		if (provider === undefined) {
			throw new Error(`No registered provider for '${request.providerId}'`);
		}
		await provider.connect();
		return {};
	}

	@log()
	@lspHandler(ConfigureThirdPartyProviderRequestType)
	async configure(
		request: ConfigureThirdPartyProviderRequest
	): Promise<ConfigureThirdPartyProviderResponse> {
		const provider = getProvider(request.providerId);
		if (provider === undefined) {
			throw new Error(`No registered provider for '${request.providerId}'`);
		}

		await provider.configure(request.data, request.verify);
		return {};
	}

	@log()
	@lspHandler(AddEnterpriseProviderRequestType)
	async addEnterpriseProvider(
		request: AddEnterpriseProviderRequest
	): Promise<AddEnterpriseProviderResponse> {
		const provider = getProvider(request.providerId);
		if (provider === undefined) {
			throw new Error(`No registered provider for '${request.providerId}'`);
		}
		return await provider.addEnterpriseHost(request);
	}

	@log()
	@lspHandler(RemoveEnterpriseProviderRequestType)
	async removeEnterpriseProvider(request: RemoveEnterpriseProviderRequest): Promise<void> {
		const provider = getProvider(request.providerId);
		if (provider === undefined) {
			throw new Error(`No registered provider for '${request.providerId}'`);
		}
		await provider.removeEnterpriseHost(request);
	}

	@log()
	@lspHandler(DisconnectThirdPartyProviderRequestType)
	async disconnect(
		request: DisconnectThirdPartyProviderRequest
	): Promise<DisconnectThirdPartyProviderResponse> {
		const provider = getProvider(request.providerId);
		if (provider === undefined) return {};

		const subProviders = provider.getConfig().subProviders;
		await provider.disconnect(request);
		if (subProviders && subProviders.length > 0) {
			for (const subProvider of subProviders) {
				await this.disconnect({
					providerId: subProvider.id,
					providerTeamId: request.providerTeamId,
				});
			}
		}
		return {};
	}

	@log()
	@lspHandler(FetchAssignableUsersRequestType)
	fetchAssignableUsers(request: FetchAssignableUsersRequest) {
		const provider = getProvider(request.providerId);
		if (provider === undefined) {
			throw new Error(`No registered provider for '${request.providerId}'`);
		}
		const issueProvider = provider as ThirdPartyIssueProvider;
		if (
			issueProvider == null ||
			typeof issueProvider.supportsIssues !== "function" ||
			!issueProvider.supportsIssues()
		) {
			throw new Error(`Provider(${provider.name}) doesn't support issues`);
		}

		return issueProvider.getAssignableUsers(request);
	}

	@log()
	@lspHandler(FetchAssignableUsersAutocompleteRequestType)
	fetchAssignableUsersAutocomplete(request: FetchAssignableUsersAutocompleteRequest) {
		const provider = getProvider(request.providerId);
		if (provider === undefined) {
			throw new Error(`No registered provider for '${request.providerId}'`);
		}
		const issueProvider = provider as ThirdPartyIssueProvider;
		if (
			issueProvider == null ||
			typeof issueProvider.supportsIssues !== "function" ||
			!issueProvider.supportsIssues()
		) {
			throw new Error(`Provider(${provider.name}) doesn't support issues`);
		}

		return issueProvider.getAssignableUsersAutocomplete(request);
	}

	@log()
	@lspHandler(FetchThirdPartyBoardsRequestType)
	fetchBoards(request: FetchThirdPartyBoardsRequest): Promise<FetchThirdPartyBoardsResponse> {
		const provider = getProvider(request.providerId);
		if (provider === undefined) {
			throw new Error(`No registered provider for '${request.providerId}'`);
		}
		const issueProvider = provider as ThirdPartyIssueProvider;
		if (
			issueProvider == null ||
			typeof issueProvider.supportsIssues !== "function" ||
			!issueProvider.supportsIssues()
		) {
			throw new Error(`Provider(${provider.name}) doesn't support issues`);
		}

		return issueProvider.getBoards(request);
	}

	@log()
	@lspHandler(FetchThirdPartyCardsRequestType)
	fetchCards(request: FetchThirdPartyCardsRequest): Promise<FetchThirdPartyCardsResponse> {
		const provider = getProvider(request.providerId);
		if (provider === undefined) {
			throw new Error(`No registered provider for '${request.providerId}'`);
		}
		const issueProvider = provider as ThirdPartyIssueProvider;
		if (
			issueProvider == null ||
			typeof issueProvider.supportsIssues !== "function" ||
			!issueProvider.supportsIssues()
		) {
			throw new Error(`Provider(${provider.name}) doesn't support issues`);
		}

		if (issueProvider.getCards) {
			return issueProvider.getCards(request);
		} else {
			return Promise.resolve({ cards: [] });
		}
	}

	@log()
	@lspHandler(FetchThirdPartyCardWorkflowRequestType)
	fetchCardWorkflow(
		request: FetchThirdPartyCardWorkflowRequest
	): Promise<FetchThirdPartyCardWorkflowResponse> {
		const provider = getProvider(request.providerId);
		if (provider === undefined) {
			throw new Error(`No registered provider for '${request.providerId}'`);
		}
		const issueProvider = provider as ThirdPartyIssueProvider;
		if (
			issueProvider == null ||
			typeof issueProvider.supportsIssues !== "function" ||
			!issueProvider.supportsIssues()
		) {
			throw new Error(`Provider(${provider.name}) doesn't support issues`);
		}

		if (issueProvider.getCardWorkflow) {
			return issueProvider.getCardWorkflow(request);
		} else {
			return Promise.resolve({ workflow: [] });
		}
	}

	@log()
	@lspHandler(CreateThirdPartyCardRequestType)
	createCard(request: CreateThirdPartyCardRequest): Promise<CreateThirdPartyCardResponse> {
		const provider = getProvider(request.providerId);
		if (provider === undefined) {
			throw new Error(`No registered provider for '${request.providerId}'`);
		}
		const issueProvider = provider as ThirdPartyIssueProvider;
		if (
			issueProvider == null ||
			typeof issueProvider.supportsIssues !== "function" ||
			!issueProvider.supportsIssues()
		) {
			throw new Error(`Provider(${provider.name}) doesn't support issues`);
		}

		return issueProvider.createCard(request);
	}

	@log()
	@lspHandler(MoveThirdPartyCardRequestType)
	moveCard(request: MoveThirdPartyCardRequest): Promise<MoveThirdPartyCardResponse> {
		const provider = getProvider(request.providerId);
		if (provider === undefined) {
			throw new Error(`No registered provider for '${request.providerId}'`);
		}
		const issueProvider = provider as ThirdPartyIssueProvider;
		if (
			issueProvider == null ||
			typeof issueProvider.supportsIssues !== "function" ||
			!issueProvider.supportsIssues()
		) {
			throw new Error(`Provider(${provider.name}) doesn't support issues`);
		}

		return issueProvider.moveCard(request);
	}

	@log()
	@lspHandler(FetchThirdPartyChannelsRequestType)
	async getChannels(
		request: FetchThirdPartyChannelsRequest
	): Promise<FetchThirdPartyChannelsResponse> {
		const provider = getProvider(request.providerId);
		if (provider === undefined) {
			throw new Error(`No registered provider for '${request.providerId}'`);
		}

		const postProvider = provider as ThirdPartyPostProvider;
		if (
			postProvider == null ||
			typeof postProvider.supportsSharing !== "function" ||
			!postProvider.supportsSharing()
		) {
			throw new Error(`Provider(${provider.name}) doesn't support sharing`);
		}

		return postProvider.getChannels(request);
	}

	@log()
	@lspHandler(UpdateThirdPartyStatusRequestType)
	async updateStatus(
		request: UpdateThirdPartyStatusRequest
	): Promise<UpdateThirdPartyStatusResponse> {
		const provider = getProvider(request.providerId);
		if (provider === undefined) {
			throw new Error(`No registered provider for '${request.providerId}'`);
		}

		const statusProvider = provider as ThirdPartyPostProvider;
		if (
			statusProvider == null ||
			typeof statusProvider.supportsStatus !== "function" ||
			!statusProvider.supportsStatus()
		) {
			throw new Error(`Provider(${provider.name}) doesn't support updating status`);
		}

		return statusProvider.updateStatus(request);
	}

	@log()
	@lspHandler(CreateThirdPartyPostRequestType)
	async createPost(request: CreateThirdPartyPostRequest): Promise<CreateThirdPartyPostResponse> {
		const provider = getProvider(request.providerId);
		if (provider === undefined) {
			throw new Error(`No registered provider for '${request.providerId}'`);
		}

		const postProvider = provider as ThirdPartyPostProvider;
		if (
			postProvider == null ||
			typeof postProvider.supportsSharing !== "function" ||
			!postProvider.supportsSharing()
		) {
			throw new Error(`Provider(${provider.name}) doesn't support sharing`);
		}

		const response = await postProvider.createPost(request);
		return response;
	}

	@log()
	@lspHandler(DeleteThirdPartyPostRequestType)
	async deletePost(request: DeleteThirdPartyPostRequest): Promise<DeleteThirdPartyPostResponse> {
		const provider = getProvider(request.providerId);
		if (provider === undefined) {
			throw new Error(`No registered provider for '${request.providerId}'`);
		}

		const postProvider = provider as ThirdPartyPostProvider;
		if (
			postProvider == null ||
			typeof postProvider.supportsSharing !== "function" ||
			!postProvider.supportsSharing()
		) {
			throw new Error(`Provider(${provider.name}) doesn't support sharing`);
		}

		const response = await postProvider.deletePost(request);
		return response;
	}

	async createPullRequest(
		request: ProviderCreatePullRequestRequest
	): Promise<ProviderCreatePullRequestResponse | undefined> {
		const provider = getProvider(request.providerId);
		if (provider === undefined) {
			throw new Error(`No registered provider for '${request.providerId}'`);
		}

		const pullRequestProvider = provider as ThirdPartyIssueProvider;
		if (
			pullRequestProvider == null ||
			typeof pullRequestProvider.supportsCreatingPullRequests !== "function" ||
			!pullRequestProvider.supportsCreatingPullRequests()
		) {
			throw new Error(`Provider(${provider.name}) doesn't support pull requests`);
		}
		const response = await pullRequestProvider.createPullRequest(request);
		return response;
	}

	async getRepoInfo(request: ProviderGetRepoInfoRequest) {
		// this is used in the create pr flow hence the check for create
		const provider = getProvider(request.providerId);
		if (provider === undefined) {
			throw new Error(`No registered provider for '${request.providerId}'`);
		}

		const pullRequestProvider = provider as ThirdPartyIssueProvider;
		if (
			pullRequestProvider == null ||
			typeof pullRequestProvider.supportsCreatingPullRequests !== "function" ||
			!pullRequestProvider.supportsCreatingPullRequests()
		) {
			throw new Error(`Provider(${provider.name}) doesn't support pull requests`);
		}

		const response = await pullRequestProvider.getRepoInfo(request);
		return response;
	}

	@log()
	@lspHandler(FetchThirdPartyPullRequestRequestType)
	async getPullRequest(request: FetchThirdPartyPullRequestRequest) {
		const provider = getProvider(request.providerId);
		if (provider === undefined) {
			throw new Error(`No registered provider for '${request.providerId}'`);
		}

		const pullRequestProvider = this.getPullRequestProvider(provider);
		const response = await pullRequestProvider.getPullRequest(request);
		return response;
	}

	@log()
	@lspHandler(FetchThirdPartyPullRequestCommitsType)
	async getPullRequestCommits(request: FetchThirdPartyPullRequestCommitsRequest) {
		const provider = getProvider(request.providerId);
		if (provider === undefined) {
			throw new Error(`No registered provider for '${request.providerId}'`);
		}

		const pullRequestProvider = this.getPullRequestProvider(provider);
		const response = await pullRequestProvider.getPullRequestCommits(request);
		return response;
	}

	@log({
		prefix: (context, args) => `${context.prefix}:${args.method}`,
	})
	@lspHandler(ExecuteThirdPartyRequestUntypedType)
	async executeMethod(request: ExecuteThirdPartyRequest) {
		if (request.providerId === "newrelic*com") {
			const nrDirectives = getNrDirectives();
			if (nrDirectives) {
				return (nrDirectives as any)[request.method](request.params);
			}
		}
		const provider = getProvider(request.providerId);
		if (provider === undefined) {
			throw new Error(`No registered provider for '${request.providerId}'`);
		}
		let result = undefined;
		try {
			try {
				await provider.ensureConnected();
			} catch (err) {
				Logger.error(err, `ensureConnected failed for ${request.providerId}`);
			}
			try {
				await provider.ensureInitialized();
			} catch (err) {
				Logger.error(err, `ensureInitialized failed for ${request.providerId}`);
			}
			const response = (provider as any)[request.method](request.params);
			result = await response;
		} catch (ex) {
			Logger.error(ex, "executeMethod failed", {
				method: request.method,
			});
			throw ex;
		}
		return result;
	}

	@log({
		prefix: (context, args) => `${context.prefix}:${args.method}`,
	})
	@lspHandler(QueryThirdPartyRequestType)
	async queryThirdParty(request: QueryThirdPartyRequest) {
		if (!request || !request.url) {
			Logger.warn(`queryThirdParty: no url found, returning`);
			return undefined;
		}
		try {
			const uri = URI.parse(request.url);
			const providers = getRegisteredProviders();
			for (const provider of providers.filter(_ => {
				const provider = _ as ThirdPartyIssueProvider &
					ThirdPartyProviderSupportsViewingPullRequests;
				try {
					return (
						provider.supportsViewingPullRequests != undefined &&
						provider.supportsViewingPullRequests()
					);
				} catch {
					return false;
				}
			})) {
				try {
					const thirdPartyIssueProvider = provider as ThirdPartyIssueProvider &
						ThirdPartyProviderSupportsPullRequests;
					let isConnected;
					try {
						// this can throw -- ignore failures
						await provider.ensureConnected();
						isConnected = true;
					} catch {}
					if (!isConnected) continue;

					const fn = thirdPartyIssueProvider.getIsMatchingRemotePredicate();
					if (fn && fn({ domain: uri.authority, uri: uri })) {
						const id = provider.getConfig().id;
						Logger.log(
							`queryThirdParty: found matching provider for ${uri.authority}. providerId=${id}`
						);
						return {
							providerId: id,
						};
					}
				} catch (err) {
					// only warn the log here as `fn` might fail.
					Logger.warn(err, "queryThirdParty: provider failed", {
						url: request.url,
					});
				}
			}
		} catch (ex) {
			Logger.error(ex, "queryThirdParty: generic failure", {
				url: request.url,
			});
		}

		Logger.log(`queryThirdParty: no matching provider found for ${request.url}`);
		return undefined;
	}

	@log()
	@lspHandler(FetchThirdPartyBuildsRequestType)
	async fetchBuilds(request: FetchThirdPartyBuildsRequest): Promise<FetchThirdPartyBuildsResponse> {
		const provider = getProvider(request.providerId);
		if (provider === undefined) {
			throw new Error(`No registered provider for '${request.providerId}'`);
		}

		const buildProvider = provider as ThirdPartyBuildProvider;
		if (
			buildProvider == null ||
			typeof buildProvider.supportsBuilds !== "function" ||
			!buildProvider.supportsBuilds()
		) {
			throw new Error(`Provider(${provider.name}) doesn't support builds`);
		}

		const response = await buildProvider.fetchBuilds(request);
		return response;
	}

	@log()
	@lspHandler(FetchThirdPartyLicenseDependenciesRequestType)
	async fetchLicenseDependencies(
		request: FetchThirdPartyCodeAnalyzersRequest
	): Promise<FetchThirdPartyLicenseDependenciesResponse> {
		const provider = getProvider(request.providerId);
		if (provider === undefined) {
			throw new Error(`No registered provider for '${request.providerId}'`);
		}

		const codeAnalyzersProvider = provider as ThirdPartyCodeAnalyzerProvider;
		if (
			codeAnalyzersProvider == null ||
			typeof codeAnalyzersProvider.supportsCodeAnalysis !== "function" ||
			!codeAnalyzersProvider.supportsCodeAnalysis()
		) {
			throw new Error(`Provider(${provider.name}) doesn't support code analyzers`);
		}

		const response = await codeAnalyzersProvider.fetchLicenseDependencies(request, {
			category: "licensing",
			type: "project",
			page: request.pageNumber,
		});

		return response;
	}

	@log()
	@lspHandler(FetchThirdPartyVulnerabilitiesRequestType)
	async fetchVulnerabilities(
		request: FetchThirdPartyCodeAnalyzersRequest
	): Promise<FetchThirdPartyVulnerabilitiesResponse> {
		const provider = getProvider(request.providerId);
		if (provider === undefined) {
			throw new Error(`No registered provider for '${request.providerId}'`);
		}

		const codeAnalyzersProvider = provider as ThirdPartyCodeAnalyzerProvider;
		if (
			codeAnalyzersProvider == null ||
			typeof codeAnalyzersProvider.supportsCodeAnalysis !== "function" ||
			!codeAnalyzersProvider.supportsCodeAnalysis()
		) {
			throw new Error(`Provider(${provider.name}) doesn't support code analyzers`);
		}

		const response = await codeAnalyzersProvider.fetchVulnerabilities(request, {
			category: "vulnerability",
			sort: "package_asc",
			type: "project",
			page: request.pageNumber,
		});
		return response;
	}

	@log()
	@lspHandler(FetchThirdPartyRepoMatchToFossaRequestType)
	async fetchIsRepoMatch(
		request: FetchThirdPartyRepoMatchToFossaRequest
	): Promise<FetchThirdPartyRepoMatchToFossaResponse> {
		const provider = getProvider(request.providerId);
		if (provider === undefined) {
			throw new Error(`No registered provider for '${request.providerId}'`);
		}

		const codeAnalyzersProvider = provider as ThirdPartyCodeAnalyzerProvider;
		if (
			codeAnalyzersProvider == null ||
			typeof codeAnalyzersProvider.supportsCodeAnalysis !== "function" ||
			!codeAnalyzersProvider.supportsCodeAnalysis()
		) {
			throw new Error(`Provider(${provider.name}) doesn't support code analyzers`);
		}

		const response = await codeAnalyzersProvider.fetchIsRepoMatch(request);
		return response;
	}

	@log()
	@lspHandler(FetchProviderDefaultPullRequestsType)
	async getProviderDefaultPullRequestQueries(
		_request: FetchProviderDefaultPullRequest
	): Promise<FetchProviderDefaultPullResponse> {
		const response: FetchProviderDefaultPullResponse = {
			"github*com": [
				{
					providerId: "github*com",
					name: WAITING_ON_REVIEW,
					query: `is:pr is:open review-requested:@me`,
					hidden: false,
				},
				{
					providerId: "github*com",
					name: ASSIGNED_TO_ME,
					query: `is:pr is:open assignee:@me`,
					hidden: false,
				},
				{
					providerId: "github*com",
					name: CREATED_BY_ME,
					query: `is:pr is:open author:@me`,
					hidden: false,
				},
				{
					providerId: "github*com",
					name: RECENT,
					query: `recent`,
					hidden: false,
				},
			],
			"github/enterprise": [
				{
					providerId: "github/enterprise",
					name: WAITING_ON_REVIEW,
					query: `is:pr is:open review-requested:@me`,
					hidden: false,
				},
				{
					providerId: "github/enterprise",
					name: ASSIGNED_TO_ME,
					query: `is:pr is:open assignee:@me`,
					hidden: false,
				},
				{
					providerId: "github/enterprise",
					name: CREATED_BY_ME,
					query: `is:pr is:open author:@me`,
					hidden: false,
				},
				{
					providerId: "github/enterprise",
					name: RECENT,
					query: `recent`,
					hidden: false,
				},
			],
			"gitlab*com": [
				{
					providerId: "gitlab*com",
					name: WAITING_ON_REVIEW,
					query: `state=opened&reviewer_username=@me&scope=all`,
					hidden: false,
				},
				{
					providerId: "gitlab*com",
					name: ASSIGNED_TO_ME,
					query: `state=opened&scope=assigned_to_me`,
					hidden: false,
				},
				{
					providerId: "gitlab*com",
					name: CREATED_BY_ME,
					query: `state=opened&scope=created_by_me`,
					hidden: false,
				},
				{
					providerId: "gitlab*com",
					name: RECENT,
					query: `state=opened&reviewer_username=@me&scope=all,state=opened&scope=assigned_to_me,state=opened&scope=created_by_me`,
					hidden: false,
				},
			],
			"gitlab/enterprise": [
				{
					providerId: "gitlab/enterprise",
					name: ASSIGNED_TO_ME,
					query: `state=opened&scope=assigned_to_me`,
					hidden: false,
				},
				{
					providerId: "gitlab/enterprise",
					name: CREATED_BY_ME,
					query: `state=opened&scope=created_by_me`,
					hidden: false,
				},
				{
					providerId: "gitlab/enterprise",
					name: RECENT,
					query: `state=opened&reviewer_username=@me&scope=all,state=opened&scope=assigned_to_me,state=opened&scope=created_by_me`,
					hidden: false,
				},
			],
			"bitbucket*org": [
				//https://api.bitbucket.org//2.0/
				{
					providerId: "bitbucket*org",
					name: "Waiting on my Review",
					query: `with_default_reviewer=true&state=OPEN`,
					hidden: false,
				},
				{
					providerId: "bitbucket*org",
					name: "Created by Me",
					query: `state=OPEN`,
					hidden: false,
				},
				{
					providerId: "bitbucket*org",
					name: "Recent",
					query: `recent=true&state=OPEN&state=MERGED&state=DECLINED&state=SUPERSEDED&pagelen=5`,
					hidden: false,
				},
			],
		};
		try {
			const user = await SessionContainer.instance().users.getMe();
			const providers = await this.getConnectedPullRequestProviders(user!);
			const gitlabEnterprise = providers?.find(_ => _.getConfig().id === "gitlab/enterprise");
			if (gitlabEnterprise) {
				const version = await (gitlabEnterprise as any as GitLabEnterpriseProvider).getVersion();
				if (version && version.version && semver.lt(version.version, "13.8.0")) {
					// if doesn't support reviewers, change the first query
					response["gitlab/enterprise"][0] = {
						providerId: "gitlab/enterprise",
						name: "All Open MRs",
						query: `state:opened scope:all`,
						hidden: false,
					};
				}
			}
		} catch (ex) {
			Logger.warn("getProviderDefaultPullRequestQueries", {
				error: ex,
			});
		}
		return response;
	}

	getPullRequestProvider(
		provider: ThirdPartyProvider
	): ThirdPartyIssueProvider & ThirdPartyProviderSupportsViewingPullRequests {
		const pullRequestProvider = provider as ThirdPartyIssueProvider;
		if (
			pullRequestProvider == null ||
			typeof pullRequestProvider.supportsViewingPullRequests !== "function" ||
			!pullRequestProvider.supportsViewingPullRequests()
		) {
			throw new Error(`Provider(${provider.name}) doesn't support pull requests`);
		}
		return pullRequestProvider;
	}

	getProviders(): ThirdPartyProvider[];
	getProviders<T extends ThirdPartyProvider>(predicate: (p: ThirdPartyProvider) => p is T): T[];
	getProviders(predicate?: (p: ThirdPartyProvider) => boolean) {
		const providers = getRegisteredProviders();
		if (predicate === undefined) return providers;

		return providers.filter(predicate);
	}

	getConnectedProviders(user: CSMe): ThirdPartyProvider[];
	getConnectedProviders<T extends ThirdPartyProvider>(
		user: CSMe,
		predicate: (p: ThirdPartyProvider) => p is T
	): T[];
	getConnectedProviders<T extends ThirdPartyProvider>(
		user: CSMe,
		predicate?: (p: ThirdPartyProvider) => boolean
	) {
		return this.getProviders(
			(p): p is T => p.isConnected(user) && (predicate == null || predicate(p))
		);
	}

	providerSupportsPullRequests(providerId?: string) {
		try {
			if (!providerId) return false;
			const providers = this.getProviders().filter(
				(_: ThirdPartyProvider) => _.getConfig().id === providerId
			);
			if (!providers || !providers.length) return false;
			return this.getPullRequestProvider(providers[0]);
		} catch {
			return false;
		}
	}

	/**
	 * Given a user, return if there are any providers connected
	 * that support PullRequest creation
	 *
	 * @param user
	 */
	async getConnectedPullRequestProviders(
		user: CSMe
	): Promise<(ThirdPartyProvider & ThirdPartyProviderSupportsPullRequests)[]> {
		const connectedProviders = this.getConnectedProviders(
			user,
			(p): p is ThirdPartyProvider & ThirdPartyProviderSupportsPullRequests => {
				const thirdPartyProvider = p as ThirdPartyProvider;
				const name = thirdPartyProvider.getConfig().name;
				return (
					name === "github" ||
					name === "gitlab" ||
					name === "github_enterprise" ||
					name === "gitlab_enterprise" ||
					name === "bitbucket" ||
					name === "bitbucket_server"
				);
			}
		);
		return connectedProviders;
	}
}
