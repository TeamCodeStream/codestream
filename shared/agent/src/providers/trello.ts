"use strict";
import * as qs from "querystring";

import {
	CreateThirdPartyCardRequest,
	FetchThirdPartyBoardsRequest,
	FetchThirdPartyBoardsResponse,
	FetchThirdPartyCardsRequest,
	FetchThirdPartyCardsResponse,
	MoveThirdPartyCardRequest,
	MoveThirdPartyCardResponse,
	ThirdPartyDisconnect,
	TrelloBoard,
	TrelloCard,
	TrelloCreateCardRequest,
	TrelloCreateCardResponse,
	TrelloMember,
} from "@codestream/protocols/agent";
import { CSTrelloProviderInfo } from "@codestream/protocols/api";

import { log, lspProvider } from "../system";
import { ThirdPartyIssueProviderBase } from "./thirdPartyIssueProviderBase";

@lspProvider("trello")
export class TrelloProvider extends ThirdPartyIssueProviderBase<CSTrelloProviderInfo> {
	private _trelloUserId: string | undefined;
	private _listNames: { [id: string]: string } = {};

	get displayName() {
		return "Trello";
	}

	get name() {
		return "trello";
	}

	get headers() {
		return {};
	}

	private get apiKey() {
		return this._providerInfo && this._providerInfo.apiKey;
	}

	async onConnected(providerInfo?: CSTrelloProviderInfo) {
		await super.onConnected(providerInfo);
		this._trelloUserId = await this.getMemberId(true);
	}

	@log()
	async onDisconnected(request?: ThirdPartyDisconnect) {
		delete this._trelloUserId;
		this._listNames = {};
		return super.onDisconnected(request);
	}

	@log()
	async getBoards(request: FetchThirdPartyBoardsRequest): Promise<FetchThirdPartyBoardsResponse> {
		// have to force connection here because we need apiKey and accessToken to even create our request
		await this.ensureConnected();

		const response = await this.get<TrelloBoard[]>(
			`/members/${this._trelloUserId}/boards?${qs.stringify({
				filter: "open",
				fields: "id,name,desc,descData,closed,idOrganization,pinned,url,labelNames,starred",
				lists: "open",
				key: this.apiKey,
				token: this.accessToken,
			})}`
		);

		const boards = request.organizationId
			? response.body.filter(b => b.idOrganization === request.organizationId)
			: response.body;

		boards.forEach(board => {
			board.lists.forEach(list => {
				this._listNames[list.id] = list.name;
			});
		});
		return { boards };
	}

	async selfAssignCard(request: { cardId: string }) {
		await this.ensureConnected();

		const response = await this.put<{}, any>(
			`/cards/${request.cardId}?${qs.stringify({
				idMembers: this._trelloUserId,
				key: this.apiKey,
				token: this.accessToken,
			})}`,
			{}
		);
		return response.body;
	}

	@log()
	async getCards(request: FetchThirdPartyCardsRequest): Promise<FetchThirdPartyCardsResponse> {
		// have to force connection here because we need apiKey and accessToken to even create our request
		await this.ensureConnected();

		const response = await this.get<TrelloCard[]>(
			`/members/${this._trelloUserId}/cards?${qs.stringify({
				cards: "open",
				filter: "open",
				fields: "id,name,desc,url,idList,idBoard,idOrganization,dateLastActivity,shortLink,idShort",
				key: this.apiKey,
				token: this.accessToken,
			})}`
		);

		const cards = (
			request.organizationId
				? response.body.filter(c => c.idOrganization === request.organizationId)
				: response.body
		).map(card => {
			return {
				id: card.id,
				title: card.name,
				body: card.desc,
				url: card.url,
				modifiedAt: new Date(card.dateLastActivity).getTime(),
				tokenId: card.shortLink,
				idList: card.idList,
				listName: this._listNames[card.idList],
				idBoard: card.idBoard,
			};
		});
		return { cards };
	}

	@log()
	async createCard(request: CreateThirdPartyCardRequest) {
		await this.ensureConnected();

		const data = request.data as TrelloCreateCardRequest; // TODO Don't undo the API contract - properly use either agent.protocol.trello or agent.protocol.providers
		const response = await this.post<{}, TrelloCreateCardResponse>(
			`/cards?${qs.stringify({
				idList: data.listId,
				name: data.name,
				desc: data.description,
				key: this.apiKey,
				idMembers: (data.assignees! || []).map(a => a.id),
				token: this.accessToken,
			})}`,
			{}
		);
		return response.body;
	}

	@log()
	async moveCard(request: MoveThirdPartyCardRequest) {
		await this.ensureConnected();

		const response = await this.put<{}, MoveThirdPartyCardResponse>(
			`/cards/${request.cardId}?${qs.stringify({
				idList: request.listId,
				key: this.apiKey,
				token: this.accessToken,
			})}`,
			{}
		);
		return response.body;
	}

	@log()
	async getAssignableUsers(request: { boardId: string }) {
		await this.ensureConnected();

		const { body } = await this.get<TrelloMember[]>(
			`/boards/${request.boardId}/members?${qs.stringify({
				key: this.apiKey,
				token: this.accessToken,
				fields: "id,email,username,fullName",
			})}`
		);
		return { users: body.map(u => ({ ...u, displayName: u.fullName })) };
	}

	private async getMemberId(dontEnsureConnected: boolean = false) {
		const tokenResponse = await this.get<{ idMember: string; [key: string]: any }>(
			`/token/${this.accessToken}?${qs.stringify({ key: this.apiKey, token: this.accessToken })}`,
			{},
			{},
			!dontEnsureConnected
		);
		return tokenResponse.body.idMember;
	}
}
