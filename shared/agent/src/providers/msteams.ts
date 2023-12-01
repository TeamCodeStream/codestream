"use strict";
import { sortBy } from "lodash";
import {
	CreateThirdPartyPostRequest,
	CreateThirdPartyPostResponse,
	FetchThirdPartyChannelsRequest,
	FetchThirdPartyChannelsResponse,
	ThirdPartyDisconnect,
	GenerateMSTeamsConnectCodeRequestType,
	GenerateMSTeamsConnectCodeRequest,
	GenerateMSTeamsConnectCodeResponse,
	AgentOpenUrlRequestType,
} from "@codestream/protocols/agent";
import { CSMSTeamsProviderInfo } from "@codestream/protocols/api";

import { SessionContainer } from "../container";
import { log, lspHandler, lspProvider } from "../system";
import { ThirdPartyPostProviderBase } from "./thirdPartyPostProviderBase";
import { Logger } from "../logger";

@lspProvider("msteams")
export class MSTeamsProvider extends ThirdPartyPostProviderBase<CSMSTeamsProviderInfo> {
	get displayName() {
		return "MSTeams";
	}

	get name() {
		return "msteams";
	}

	get headers() {
		return {
			// this is unused
			Authorization: "",
		};
	}

	private _multiProviderInfo: CSMSTeamsProviderInfo | undefined;

	onConnecting() {
		const env = SessionContainer.instance().session.environmentName;
		let appId;
		if (env?.match(/eu/i)) {
			Logger.log(`Environment ${env} matched EU, connecting to EU-based MSTeams app`);
			appId = "dd1a9bf7-fd98-453c-af49-021f71e8aa55";
		} else {
			Logger.log(`Environment ${env} did not match EU, connecting to US-based MSTeams app`);
			appId = "7cf49ab7-8b65-4407-b494-f02b525eef2b";
		}
		void SessionContainer.instance().session.agent.sendRequest(AgentOpenUrlRequestType, {
			url: `https://teams.microsoft.com/l/app/${appId}`,
		});
	}

	@log()
	@lspHandler(GenerateMSTeamsConnectCodeRequestType)
	async generateMSTeamsConnectCode(
		request: GenerateMSTeamsConnectCodeRequest
	): Promise<GenerateMSTeamsConnectCodeResponse> {
		const { session } = SessionContainer.instance();

		return await session.api.generateMSTeamsConnectCode(request);
	}

	protected async onConnected(providerInfo: CSMSTeamsProviderInfo) {
		super.onConnected(providerInfo);
		this._multiProviderInfo = providerInfo;
	}

	protected async onDisconnected(request?: ThirdPartyDisconnect) {
		if (!request || !request.providerTeamId) return;

		if (this._multiProviderInfo && this._multiProviderInfo.multiple) {
			delete this._multiProviderInfo.multiple[request.providerTeamId];
		}
	}

	getConnectionData() {
		const data = super.getConnectionData();
		return { ...data, sharing: true };
	}

	async refreshToken(request?: { providerTeamId?: string }) {
		// override as it's not required
	}

	@log()
	async getChannels(
		request: FetchThirdPartyChannelsRequest
	): Promise<FetchThirdPartyChannelsResponse> {
		// fetching the channels will check to see if it's connected or not
		const response = await this.session.api.fetchMsTeamsConversations({
			tenantId: request.providerTeamId,
		});
		const channels = sortBy(
			response.msteams_conversations.map((_: any) => {
				return {
					id: _.conversationId,
					name: `${_.teamName}/${_.channelName}`,
					type: "channel",
				};
			}),
			[_ => _.name]
		);
		return {
			channels: channels,
		};
	}

	@log()
	async createPost(request: CreateThirdPartyPostRequest): Promise<CreateThirdPartyPostResponse> {
		if (request.channelId) {
			const result = await this.session.api.triggerMsTeamsProactiveMessage({
				codemarkId: request.codemark && request.codemark.id,
				reviewId: request.review && request.review.id,
				providerTeamId: request.providerTeamId,
				channelId: request.channelId,
			});
		}
		return {
			post: undefined,
		};
	}
}
