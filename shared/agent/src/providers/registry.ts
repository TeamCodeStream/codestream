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
	FetchThirdPartyRepoMatchToFossaRequest,
	FetchThirdPartyRepoMatchToFossaRequestType,
	FetchThirdPartyRepoMatchToFossaResponse,
	FetchThirdPartyVulnerabilitiesRequestType,
	FetchThirdPartyVulnerabilitiesResponse,
	MoveThirdPartyCardRequest,
	MoveThirdPartyCardRequestType,
	MoveThirdPartyCardResponse,
	RemoveEnterpriseProviderRequest,
	RemoveEnterpriseProviderRequestType,
	UpdateThirdPartyStatusRequest,
	UpdateThirdPartyStatusRequestType,
	UpdateThirdPartyStatusResponse,
} from "@codestream/protocols/agent";
import { CSMe } from "@codestream/protocols/api";
import { Logger } from "../logger";
import { CodeStreamSession } from "../session";
import { getProvider, getRegisteredProviders, log, lsp, lspHandler } from "../system";
import { getNrDirectives } from "./newrelic/nrContainer";
import {
	ThirdPartyBuildProvider,
	ThirdPartyCodeAnalyzerProvider,
	ThirdPartyIssueProvider,
	ThirdPartyPostProvider,
	ThirdPartyProvider,
} from "./provider";

@lsp
export class ThirdPartyProviderRegistry {
	private session: CodeStreamSession | undefined = undefined;

	initialize(session: CodeStreamSession) {
		this.session = session;
		return this;
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
}
