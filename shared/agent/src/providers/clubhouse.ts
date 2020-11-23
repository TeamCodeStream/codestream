"use strict";
import { url } from "inspector";
import * as qs from "querystring";
import { Logger } from "../logger";
import {
	ClubhouseConfigurationData,
	ClubhouseCreateCardRequest,
	ClubhouseCreateCardResponse,
	ClubhouseMember,
	ClubhouseProject,
	ClubhouseSelf,
	ClubhouseStory,
	CreateThirdPartyCardRequest,
	FetchThirdPartyBoardsRequest,
	FetchThirdPartyBoardsResponse,
	FetchThirdPartyCardsRequest,
	FetchThirdPartyCardsResponse,
	MoveThirdPartyCardRequest,
	ThirdPartyProviderCard
} from "../protocol/agent.protocol";
import { CSClubhouseProviderInfo } from "../protocol/api.protocol";
import { log, lspProvider } from "../system";
import { ApiResponse, ThirdPartyIssueProviderBase } from "./provider";

@lspProvider("clubhouse")
export class ClubhouseProvider extends ThirdPartyIssueProviderBase<CSClubhouseProviderInfo> {
	private _clubhouseUserInfo: ClubhouseSelf | undefined;

	get displayName() {
		return "Clubhouse";
	}

	get name() {
		return "clubhouse";
	}

	get headers() {
		return {
			"Content-Type": "application/json",
			"Clubhouse-Token": this.accessToken!
		};
	}

	@log()
	async configure(request: ClubhouseConfigurationData) {
		await this.session.api.setThirdPartyProviderToken({
			providerId: this.providerConfig.id,
			token: request.token
		});
	}

	async onConnected() {
		this._clubhouseUserInfo = await this.getMemberInfo();
	}

	@log()
	async getBoards(request: FetchThirdPartyBoardsRequest): Promise<FetchThirdPartyBoardsResponse> {
		await this.ensureConnected();

		const response = await this.get<ClubhouseProject[]>("/projects");
		return { boards: response.body };
	}

	@log()
	async getCards(request: FetchThirdPartyCardsRequest): Promise<FetchThirdPartyCardsResponse> {
		await this.ensureConnected();

		try {
			if (!request.customFilter) {
				request.customFilter = `is:story owner:${this._clubhouseUserInfo!.mention_name}`;
			}
			const url = `/search?${qs.stringify({ query: request.customFilter })}`;
			const result = await this.get<any>(url);
			const stories = result.body.stories.data;
			const cards: ThirdPartyProviderCard[] = stories.map((story: ClubhouseStory) => {
				return {
					id: story.id,
					url: story.app_url,
					title: story.name,
					modifiedAt: new Date(story.updated_at).getTime(),
					tokenId: story.id,
					body: story.description
				};
			});

			cards.sort((a, b) => {
				return a.modifiedAt - b.modifiedAt;
			});
			return { cards };
		} catch (e) {
			Logger.log("Error from Clubhouse: ", JSON.stringify(e, null, 4));
			return { cards: [] };
		}
	}

	@log()
	async createCard(request: CreateThirdPartyCardRequest) {
		await this.ensureConnected();

		const data = request.data as ClubhouseCreateCardRequest;
		const body = {
			project_id: data.projectId,
			name: data.name,
			description: data.description,
			owner_ids: (data.assignees! || []).map(a => a.id)
		};
		const response = await this.post<{}, ClubhouseCreateCardResponse>(
			`/stories`,
			body
		);
		return { ...response.body, url: response.body.app_url };
	}

	@log()
	async moveCard(request: MoveThirdPartyCardRequest) {
		return { success: false };
	}

	@log()
	async getAssignableUsers(request: { boardId: string }) {
		await this.ensureConnected();
		const { body } = await this.get<ClubhouseMember[]>("/members");
		const users = body.filter(u => !u.profile.deactivated);
		return { users: body.map(u => ({ ...u, displayName: u.profile.name })) };
	}

	private async getMemberInfo(): Promise<ClubhouseSelf> {
		const response = await this.get<ClubhouseSelf>("/member");
		return response.body;
	}
}
