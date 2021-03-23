"use strict";
import * as qs from "querystring";
import { MessageType } from "../api/apiProvider";
import { Logger } from "../logger";
import {
	CreateThirdPartyCardRequest,
	FetchThirdPartyBoardsRequest,
	FetchThirdPartyBoardsResponse,
	FetchThirdPartyCardsRequest,
	FetchThirdPartyCardsResponse,
	MoveThirdPartyCardRequest,
	YouTrackBoard,
	YouTrackCard,
	YouTrackConfigurationData,
	YouTrackCreateCardRequest,
	YouTrackCreateCardResponse,
	YouTrackUser
} from "../protocol/agent.protocol";
import { CSMe, CSYouTrackProviderInfo } from "../protocol/api.protocol";
import { log, lspProvider } from "../system";
import { ThirdPartyIssueProviderBase } from "./provider";

@lspProvider("youtrack")
export class YouTrackProvider extends ThirdPartyIssueProviderBase<CSYouTrackProviderInfo> {
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
			"Content-Type": "application/json"
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

	@log()
	async getBoards(request: FetchThirdPartyBoardsRequest): Promise<FetchThirdPartyBoardsResponse> {
		// have to force connection here because we need accessToken to even create our request
		await this.ensureConnected();
		const response = await this.get<YouTrackBoard[]>(
			`/admin/projects?${qs.stringify({
				fields: "id,name,shortName"
			})}`
		);
		return {
			boards: response.body.map(board => {
				return {
					id: board.id,
					name: board.name,
					singleAssignee: true
				};
			})
		};
	}

	@log()
	async getCards(request: FetchThirdPartyCardsRequest): Promise<FetchThirdPartyCardsResponse> {
		// have to force connection here because we need accessToken to even create our request
		await this.ensureConnected();
		const response = await this.get<YouTrackCard[]>(
			`/issues?${qs.stringify({
				fields: "id,idReadable,modified,summary,description",
				query: "for: me state:unresolved"
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
					body: card.description
				};
			})
		};
	}

	@log()
	async createCard(request: CreateThirdPartyCardRequest) {
		const data = request.data as YouTrackCreateCardRequest;
		const response = await this.post<{}, YouTrackCreateCardResponse>(
			`/issues?${qs.stringify({
				fields: "id,idReadable"
			})}`,
			{
				summary: data.name,
				description: data.description,
				project: {
					id: data.boardId
				}
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
		const { body } = await this.get<YouTrackUser[]>(
			`/admin/users/?${qs.stringify({
				fields: "id,name,fullName"
			})}`
		);
		return { users: body.map(u => ({ ...u, displayName: u.fullName })) };
	}

	@log()
	async configure(request: YouTrackConfigurationData) {
		await this.session.api.setThirdPartyProviderToken({
			providerId: this.providerConfig.id,
			host: request.host,
			token: request.token,
			data: {
				baseUrl: request.baseUrl
			}
		});

		// FIXME - this rather sucks as a way to ensure we have the access token
		return new Promise<void>(resolve => {
			this.session.api.onDidReceiveMessage(e => {
				if (e.type !== MessageType.Users) return;

				const me = e.data.find((u: any) => u.id === this.session.userId) as CSMe | null | undefined;
				if (me == null) return;

				const providerInfo = this.getProviderInfo(me);
				if (providerInfo == null || !providerInfo.accessToken) return;

				resolve();
			});
		});
	}
}
