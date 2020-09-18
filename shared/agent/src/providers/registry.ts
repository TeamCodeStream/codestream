"use strict";
import { differenceWith } from "lodash-es";
import { CSMe } from "protocol/api.protocol";
import { URI } from "vscode-uri";
import { SessionContainer } from "../container";
import { Logger } from "../logger";
import {
	AddEnterpriseProviderRequest,
	AddEnterpriseProviderRequestType,
	AddEnterpriseProviderResponse,
	ChangeDataType,
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
	DidChangeDataNotificationType,
	DisconnectThirdPartyProviderRequest,
	DisconnectThirdPartyProviderRequestType,
	DisconnectThirdPartyProviderResponse,
	ExecuteThirdPartyRequest,
	ExecuteThirdPartyRequestUntypedType,
	FetchAssignableUsersRequest,
	FetchAssignableUsersRequestType,
	FetchThirdPartyBoardsRequest,
	FetchThirdPartyBoardsRequestType,
	FetchThirdPartyBoardsResponse,
	FetchThirdPartyCardsRequest,
	FetchThirdPartyCardsRequestType,
	FetchThirdPartyCardsResponse,
	FetchThirdPartyCardWorkflowRequest,
	FetchThirdPartyCardWorkflowRequestType,
	FetchThirdPartyCardWorkflowResponse,
	FetchThirdPartyChannelsRequest,
	FetchThirdPartyChannelsRequestType,
	FetchThirdPartyChannelsResponse,
	FetchThirdPartyPullRequestCommitsRequest,
	FetchThirdPartyPullRequestCommitsType,
	FetchThirdPartyPullRequestRequest,
	FetchThirdPartyPullRequestRequestType,
	GetMyPullRequestsResponse,
	MoveThirdPartyCardRequest,
	MoveThirdPartyCardRequestType,
	MoveThirdPartyCardResponse, PullRequestsChangedData,
	QueryThirdPartyRequest,
	QueryThirdPartyRequestType,
	RemoveEnterpriseProviderRequest,
	RemoveEnterpriseProviderRequestType,
	UpdateThirdPartyStatusRequest,
	UpdateThirdPartyStatusRequestType,
	UpdateThirdPartyStatusResponse
} from "../protocol/agent.protocol";
import { CodeStreamSession } from "../session";
import { getProvider, getRegisteredProviders, log, lsp, lspHandler } from "../system";
import {
	ProviderCreatePullRequestRequest,
	ProviderCreatePullRequestResponse,
	ProviderGetRepoInfoRequest,
	ThirdPartyIssueProvider,
	ThirdPartyPostProvider,
	ThirdPartyProvider,
	ThirdPartyProviderSupportsPullRequests
} from "./provider";

// NOTE: You must include all new providers here, otherwise the webpack build will exclude them
export * from "./trello";
export * from "./jira";
export * from "./jiraserver";
export * from "./github";
export * from "./githubEnterprise";
export * from "./gitlab";
export * from "./gitlabEnterprise";
export * from "./asana";
export * from "./bitbucket";
export * from "./bitbucketServer";
export * from "./youtrack";
export * from "./azuredevops";
export * from "./slack";
export * from "./msteams";
export * from "./okta";

const PR_QUERIES = [
	{
		name: "is waiting on your review",
		query: `is:pr is:open review-requested:@me`
	},
	{
		name: "was assigned to you",
		query: `is:pr is:open assignee:@me`
	}
];

interface ProviderPullRequests {
	providerName: string;
	queriedPullRequests: GetMyPullRequestsResponse[][];
}

@lsp
export class ThirdPartyProviderRegistry {
	private _lastProvidersPRs: ProviderPullRequests[] | undefined;
	private _pollingInterval: NodeJS.Timer | undefined;

	constructor(public readonly session: CodeStreamSession) {
		this._pollingInterval = setInterval(this.pullRequestsStateHandler.bind(this), 60000);
	}

	private async pullRequestsStateHandler() {
		const user = await this.session.api.getMe();

		const providers = this.getConnectedProviders(user.user, (p): p is ThirdPartyIssueProvider &
			ThirdPartyProviderSupportsPullRequests => {
			const thirdPartyIssueProvider = p as ThirdPartyIssueProvider;
			const name = thirdPartyIssueProvider.getConfig().name;
			return name === "github" || name === "github_enterprise";
		});

		const providersPullRequests: ProviderPullRequests[] = [];

		for (const provider of providers) {
			const pullRequests = await provider.getMyPullRequests({
				queries: PR_QUERIES.map(_ => _.query)
			});

			if (pullRequests) {
				providersPullRequests.push({
					providerName: provider.name,
					queriedPullRequests: pullRequests
				});
			}
		}

		const newProvidersPRs = this.getProvidersPRsDiff(providersPullRequests);
		this._lastProvidersPRs = providersPullRequests;

		this.fireNewPRsNotifications(newProvidersPRs);
	}

	private getProvidersPRsDiff = (providersPRs: ProviderPullRequests[]): ProviderPullRequests[] => {
		const newProvidersPRs: ProviderPullRequests[] = [];
		if (this._lastProvidersPRs === undefined) {
			return [];
		}

		providersPRs.map(providerPRs => {
			const previousProviderPRs = this._lastProvidersPRs?.find(_ => _.providerName === providerPRs.providerName);
			if (!previousProviderPRs) {
				return;
			}

			const queriedPullRequests: GetMyPullRequestsResponse[][] = [];
			providerPRs.queriedPullRequests.map((pullRequests: GetMyPullRequestsResponse[], index: number) => {
				queriedPullRequests.push(
					differenceWith(
						pullRequests,
						previousProviderPRs.queriedPullRequests[index],
						(value, other) => value.id === other.id
					)
				);
			});

			newProvidersPRs.push({
				providerName: providerPRs.providerName,
				queriedPullRequests
			});
		});

		return newProvidersPRs;
	}

	private fireNewPRsNotifications(providersPRs: ProviderPullRequests[]) {
		const prNotificationMessages: PullRequestsChangedData[] = [];

		providersPRs.map(_ => _.queriedPullRequests.map((pullRequests: GetMyPullRequestsResponse[], queryIndex: number) => {
				prNotificationMessages.push(
					...pullRequests.map(pullRequest => ({
						queryName: PR_QUERIES[queryIndex].name,
						pullRequest
					}))
				);
			})
		);

		if (prNotificationMessages.length > 0) {
			SessionContainer.instance().session.agent.sendNotification(DidChangeDataNotificationType, {
				type: ChangeDataType.PullRequests,
				data: prNotificationMessages
			});
		}
	}

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

		await provider.configure(request.data);
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

		await provider.disconnect(request);
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

		if (issueProvider.getCards) return issueProvider.getCards(request);
		else return Promise.resolve({ cards: [] });
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

		if (issueProvider.getCardWorkflow) return issueProvider.getCardWorkflow(request);
		else return Promise.resolve({ workflow: [] });
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
			typeof pullRequestProvider.supportsPullRequests !== "function" ||
			!pullRequestProvider.supportsPullRequests()
		) {
			throw new Error(`Provider(${provider.name}) doesn't support pull requests`);
		}

		const response = await pullRequestProvider.createPullRequest(request);
		return response;
	}

	async getRepoInfo(request: ProviderGetRepoInfoRequest) {
		const provider = getProvider(request.providerId);
		if (provider === undefined) {
			throw new Error(`No registered provider for '${request.providerId}'`);
		}

		const pullRequestProvider = provider as ThirdPartyIssueProvider;
		if (
			pullRequestProvider == null ||
			typeof pullRequestProvider.supportsPullRequests !== "function" ||
			!pullRequestProvider.supportsPullRequests()
		) {
			throw new Error(`Provider(${provider.name}) doesn't support pull requests`);
		}

		// TODO clean it up remote here

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
		prefix: (context, args) => `${context.prefix}:${args.method}`
	})
	@lspHandler(ExecuteThirdPartyRequestUntypedType)
	async executeMethod(request: ExecuteThirdPartyRequest) {
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
			const response = (provider as any)[request.method](request.params);
			result = await response;
		} catch (ex) {
			Logger.error(ex, "executeMethod failed", {
				method: request.method
			});
			throw ex;
		}
		return result;
	}

	@log({
		prefix: (context, args) => `${context.prefix}:${args.method}`
	})
	@lspHandler(QueryThirdPartyRequestType)
	async queryThirdParty(request: QueryThirdPartyRequest) {
		try {
			if (!request || !request.url) return undefined;
			if (!request.url.toLowerCase().startsWith("http")) return undefined;

			const uri = URI.parse(request.url);
			const providers = getRegisteredProviders();
			for (const provider of providers.filter(_ => {
				const provider = _ as ThirdPartyIssueProvider & ThirdPartyProviderSupportsPullRequests;
				try {
					return provider.supportsPullRequests != undefined && provider.supportsPullRequests();
				} catch {
					return false;
				}
			})) {
				try {
					const thirdPartyIssueProvider = provider as ThirdPartyIssueProvider &
						ThirdPartyProviderSupportsPullRequests;
					if (
						thirdPartyIssueProvider.getIsMatchingRemotePredicate()({
							domain: uri.authority
						})
					) {
						return {
							providerId: provider.getConfig().id
						};
					}
				} catch (err) {
					Logger.debug(err, "queryThirdParty failed", {
						url: request.url
					});
				}
			}
		} catch (ex) {
			Logger.error(ex, "queryThirdParty failed", {
				url: request.url
			});
		}
		return undefined;
	}

	private getPullRequestProvider(
		provider: ThirdPartyProvider
	): ThirdPartyIssueProvider & ThirdPartyProviderSupportsPullRequests {
		const pullRequestProvider = provider as ThirdPartyIssueProvider;
		if (
			pullRequestProvider == null ||
			typeof pullRequestProvider.supportsPullRequests !== "function" ||
			!pullRequestProvider.supportsPullRequests()
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
}
