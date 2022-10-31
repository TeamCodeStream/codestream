"use strict";
import * as qs from "querystring";
import {
	CreateThirdPartyCardRequest,
	FetchThirdPartyBoardsRequest,
	FetchThirdPartyBoardsResponse,
	FetchThirdPartyCardsRequest,
	FetchThirdPartyCardsResponse,
	MoveThirdPartyCardRequest,
	ProviderConfigurationData,
	ThirdPartyDisconnect,
	YouTrackBoard,
	YouTrackCard,
	YouTrackCreateCardRequest,
	YouTrackCreateCardResponse,
	YouTrackUser,
} from "../protocol/agent.protocol";
import { CSYouTrackProviderInfo } from "../protocol/api.protocol";
import { log, lspProvider } from "../system";
import { ThirdPartyIssueProviderBase } from "./thirdPartyIssueProviderBase";

@lspProvider("youtrack")
export class YouTrackProvider extends ThirdPartyIssueProviderBase<CSYouTrackProviderInfo> {
	_assignableUsers: YouTrackUser[] | undefined;

	get displayName() {
		return "YouTrack";
	}

	get name() {
		return "youtrack";
	}

	get headers() {
		return {
			Authorization: `Bearer ${this.accessToken}`,
			Accept: "application/json",
			"Content-Type": "application/json",
		};
	}

	get myUrl() {
		let url =
			(this._providerInfo && this._providerInfo.data && this._providerInfo.data.baseUrl) || "";
		if (url.endsWith("/hub")) {
			url = url.split("/hub")[0];
		} else if (url.endsWith("/youtrack")) {
			url = url.split("/youtrack")[0];
		}
		return url;
	}

	get apiPath() {
		return "/youtrack/api";
	}

	get baseUrl() {
		return `${this.myUrl}${this.apiPath}`;
	}

	protected async onDisconnected(request?: ThirdPartyDisconnect) {
		delete this._assignableUsers;
	}

	async verifyConnection(config: ProviderConfigurationData) {
		await this.getAssignableUsers({ boardId: "" });
	}

	@log()
	async getBoards(request: FetchThirdPartyBoardsRequest): Promise<FetchThirdPartyBoardsResponse> {
		// have to force connection here because we need accessToken to even create our request
		await this.ensureConnected();
		const response = await this.get<YouTrackBoard[]>(
			`/admin/projects?${qs.stringify({ fields: "id,name,shortName" })}`
		);
		return {
			boards: response.body.map(board => {
				return {
					id: board.id,
					name: board.name,
					singleAssignee: true,
				};
			}),
		};
	}

	@log()
	async getCards(request: FetchThirdPartyCardsRequest): Promise<FetchThirdPartyCardsResponse> {
		// have to force connection here because we need accessToken to even create our request
		await this.ensureConnected();
		const response = await this.get<YouTrackCard[]>(
			`/issues?${qs.stringify({
				fields: "id,idReadable,modified,summary,description",
				query: "assignee: me state:unresolved",
			})}`
		);
		const url =
			(this._providerInfo && this._providerInfo.data && this._providerInfo.data.baseUrl) || "";

		return {
			cards: response.body.map(card => {
				// Logger.warn("GOT A CARD: " + JSON.stringify(card, null, 4));
				return {
					id: card.id,
					url: `${url}/youtrack/issue/${card.idReadable}`,
					title: card.summary,
					modifiedAt: card.modified * 1000,
					tokenId: card.idReadable,
					body: card.description,
				};
			}),
		};
	}

	@log()
	async createCard(request: CreateThirdPartyCardRequest) {
		const data = request.data as YouTrackCreateCardRequest;
		const response = await this.post<{}, YouTrackCreateCardResponse>(
			`/issues?${qs.stringify({
				fields: "id,idReadable",
			})}`,
			{
				summary: data.name,
				description: data.description,
				project: {
					id: data.boardId,
				},
			}
		);
		const card = response.body;
		card.url = `${this.myUrl}/youtrack/issue/${card.idReadable}`;
		return card;
	}

	@log()
	async moveCard(request: MoveThirdPartyCardRequest) {}

	@log()
	async getAssignableUsers(request: { boardId: string }) {
		if (this._assignableUsers) return { users: this._assignableUsers };

		const { body } = await this.get<YouTrackUser[]>(
			`/admin/users/?${qs.stringify({
				fields: "id,name,fullName",
			})}`
		);
		this._assignableUsers = body.map(u => ({ ...u, displayName: u.fullName }));
		return { users: this._assignableUsers };
	}

	canConfigure() {
		return true;
	}
}
