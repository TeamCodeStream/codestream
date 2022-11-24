"use strict";
import * as qs from "querystring";

import {
	CreateThirdPartyCardRequest,
	FetchThirdPartyBoardsRequest,
	FetchThirdPartyBoardsResponse,
	FetchThirdPartyCardsRequest,
	FetchThirdPartyCardsResponse,
	MoveThirdPartyCardRequest,
	ShortcutCreateCardRequest,
	ShortcutCreateCardResponse,
	ShortcutMember,
	ShortcutProject,
	ShortcutSelf,
	ShortcutStory,
	ThirdPartyDisconnect,
	ThirdPartyProviderCard,
} from "@codestream/protocols/agent";
import { CSShortcutProviderInfo } from "@codestream/protocols/api";

import { Logger } from "../logger";
import { log, lspProvider } from "../system";
import { ThirdPartyIssueProviderBase } from "./thirdPartyIssueProviderBase";

@lspProvider("shortcut")
export class ShortcutProvider extends ThirdPartyIssueProviderBase<CSShortcutProviderInfo> {
	private _shortcutUserInfo: Promise<ShortcutSelf> | undefined;

	get displayName() {
		return "Shortcut";
	}

	get name() {
		return "shortcut";
	}

	get headers() {
		return {
			"Content-Type": "application/json",
			"Shortcut-Token": this.accessToken!,
		};
	}

	canConfigure() {
		return true;
	}

	async onConnected(providerInfo?: CSShortcutProviderInfo) {
		super.onConnected(providerInfo);
		this._shortcutUserInfo = this.getMemberInfo();
	}

	@log()
	async onDisconnected(request?: ThirdPartyDisconnect) {
		delete this._shortcutUserInfo;
		return super.onDisconnected(request);
	}

	@log()
	async getBoards(request: FetchThirdPartyBoardsRequest): Promise<FetchThirdPartyBoardsResponse> {
		await this.ensureConnected();

		const response = await this.get<ShortcutProject[]>("/projects");
		return { boards: response.body };
	}

	@log()
	async getCards(request: FetchThirdPartyCardsRequest): Promise<FetchThirdPartyCardsResponse> {
		await this.ensureConnected();

		try {
			if (!request.customFilter) {
				const shortcutUserInfo = await this._shortcutUserInfo;
				request.customFilter = `is:story owner:${shortcutUserInfo!.mention_name} !is:done`;
			}
			const url = `/search?${qs.stringify({ query: request.customFilter })}`;
			const result = await this.get<any>(url);
			const stories = result.body.stories.data;
			const cards: ThirdPartyProviderCard[] = stories.map((story: ShortcutStory) => {
				return {
					id: story.id,
					url: story.app_url,
					title: story.name,
					modifiedAt: new Date(story.updated_at).getTime(),
					tokenId: story.id,
					body: story.description,
				};
			});

			cards.sort((a, b) => {
				return a.modifiedAt - b.modifiedAt;
			});
			return { cards };
		} catch (e) {
			Logger.log("Error from Shortcut: ", JSON.stringify(e, null, 4));
			return { cards: [] };
		}
	}

	@log()
	async createCard(request: CreateThirdPartyCardRequest) {
		await this.ensureConnected();

		const data = request.data as ShortcutCreateCardRequest;
		const body = {
			project_id: data.projectId,
			name: data.name,
			description: data.description,
			owner_ids: (data.assignees! || []).map(a => a.id),
			story_type: "bug",
		};
		const response = await this.post<{}, ShortcutCreateCardResponse>(`/stories`, body);
		return { ...response.body, url: response.body.app_url };
	}

	@log()
	async moveCard(request: MoveThirdPartyCardRequest) {
		return { success: false };
	}

	@log()
	async getAssignableUsers(request: { boardId: string }) {
		await this.ensureConnected();
		const { body } = await this.get<ShortcutMember[]>("/members");
		const users = body.filter(u => !u.profile.deactivated);
		return { users: users.map(u => ({ ...u, displayName: u.profile.name })) };
	}

	private async getMemberInfo(): Promise<ShortcutSelf> {
		const response = await this.get<ShortcutSelf>("/member");
		return response.body;
	}
}
