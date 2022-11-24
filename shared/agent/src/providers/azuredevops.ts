"use strict";
import * as qs from "querystring";

import {
	AzureDevOpsCreateCardRequest,
	AzureDevOpsCreateCardResponse,
	AzureDevOpsProject,
	AzureDevOpsTeam,
	AzureDevOpsUser,
	CreateThirdPartyCardRequest,
	FetchThirdPartyBoardsRequest,
	FetchThirdPartyBoardsResponse,
	FetchThirdPartyCardsRequest,
	FetchThirdPartyCardsResponse,
	MoveThirdPartyCardRequest,
	ThirdPartyProviderBoard,
	ThirdPartyProviderCard,
	ThirdPartyProviderUser,
} from "@codestream/protocols/agent";
import { CSAzureDevOpsProviderInfo } from "@codestream/protocols/api";

import { Logger } from "../logger";
import { log, lspProvider } from "../system";
import { ThirdPartyIssueProviderBase } from "./thirdPartyIssueProviderBase";

interface AzureDevOpsProfile {
	emailAddress: string;
	displayName: string;
	[key: string]: any;
}

interface AzureDevOpsWorkItem {
	id: number;
	url: string;
	fields: {
		"System.Title": string;
		"System.ChangedDate": string;
		"System.Description": string;
		"System.TeamProject": string;
	};
}

@lspProvider("azuredevops")
export class AzureDevOpsProvider extends ThirdPartyIssueProviderBase<CSAzureDevOpsProviderInfo> {
	get displayName() {
		return "Azure DevOps";
	}

	get name() {
		return "azuredevops";
	}

	get apiPath() {
		const organization = (this._providerInfo && this._providerInfo.organization) || "";
		return `/${organization}`;
	}

	get headers() {
		return {
			Authorization: `Bearer ${this.accessToken}`,
		};
	}

	@log()
	async getBoards(request: FetchThirdPartyBoardsRequest): Promise<FetchThirdPartyBoardsResponse> {
		await this.ensureConnected();

		let boards: ThirdPartyProviderBoard[] = [];
		try {
			const response = await this.get<{ value: AzureDevOpsProject[] }>(
				`/_apis/projects?${qs.stringify({
					"api-version": "5.0",
				})}`
			);
			boards = response.body.value.map(project => {
				return {
					id: project.id,
					name: project.name,
					singleAssignee: true,
				};
			});
			boards.sort((a, b) => {
				return a.name.localeCompare(b.name);
			});
		} catch (err) {
			Logger.error(err);
			debugger;
		}
		return { boards };
	}

	@log()
	async getCards(request: FetchThirdPartyCardsRequest): Promise<FetchThirdPartyCardsResponse> {
		await this.ensureConnected();

		let cards: ThirdPartyProviderCard[] = [];
		try {
			const wiql =
				"Select ID, System.Title, System.Description, State, [Team Project] " +
				"From WorkItems " +
				"Where State NOT IN ('Closed','Done','Completed','Inactive','Removed') " +
				"And [Assigned To] = @Me " +
				"Order By [Changed Date] Desc";
			const { body } = (await this.post(
				`/_apis/wit/wiql?${qs.stringify({
					"api-version": "5.0",
				})}`,
				{ query: wiql },
				{ "Content-Type": "application/json" }
			)) as { body: { workItems: AzureDevOpsWorkItem[] } };
			if (body && body.workItems) {
				const ids = body.workItems.map(workItem => workItem.id).slice(0, 200);
				const response = (await this.get(
					`/_apis/wit/workitems?${qs.stringify({
						ids: ids.join(","),
						"api-version": "5.0",
					})}`
				)) as { body: { count: number; value: AzureDevOpsWorkItem[] } };
				if (response.body && response.body.value) {
					cards = response.body.value.map(workItem => {
						return {
							id: workItem.id.toString(),
							tokenId: workItem.id.toString(),
							url: `${this.baseUrl}/${workItem.fields["System.TeamProject"]}/_workitems/edit/${workItem.id}`,
							title: workItem.fields["System.Title"],
							modifiedAt: new Date(workItem.fields["System.ChangedDate"]).getTime(),
							body: workItem.fields["System.Description"],
						};
					});
				}
			}
		} catch (err) {
			Logger.error(err);
			debugger;
		}
		return { cards };
	}

	@log()
	async createCard(request: CreateThirdPartyCardRequest) {
		await this.ensureConnected();

		const data = request.data as AzureDevOpsCreateCardRequest;
		const cardData: { [key: string]: any }[] = [
			{
				op: "add",
				path: "/fields/System.title",
				from: null,
				value: data.title,
			},
			{
				op: "add",
				path: "/fields/System.description",
				from: null,
				value: data.description,
			},
		];

		if (data.assignee) {
			cardData.push({
				op: "add",
				path: "/fields/System.AssignedTo",
				from: null,
				value: data.assignee.id,
			});
		}

		const response = await this.post<{}, AzureDevOpsCreateCardResponse>(
			`/${request.data.boardId}/_apis/wit/workitems/$Issue?${qs.stringify({
				"api-version": "5.0",
			})}`,
			cardData,
			{ "Content-Type": "application/json-patch+json" }
		);

		const card = response.body;
		card.url = response.body._links && response.body._links.html && response.body._links.html.href;
		return card;
	}

	@log()
	async moveCard(request: MoveThirdPartyCardRequest) {}

	@log()
	async getAssignableUsers(request: { boardId: string }) {
		await this.ensureConnected();

		let users: ThirdPartyProviderUser[] = [];

		try {
			const response = await this.get<{ value: AzureDevOpsTeam[] }>(
				`/_apis/projects/${request.boardId}/teams?${qs.stringify({
					"api-version": "5.0",
				})}`
			);

			await Promise.all(
				response.body.value.map(async team => {
					const userResponse = await this.get<{ value: AzureDevOpsUser[] }>(
						`/_apis/projects/${request.boardId}/teams/${team.id}/members?${qs.stringify({
							"api-version": "5.0",
						})}`
					);

					const uniqueUsers = userResponse.body.value.filter(user => {
						return !users.find(u => u.id === user.identity.uniqueName);
					});

					users = [
						...users,
						...uniqueUsers.map(user => {
							return {
								id: user.identity.uniqueName,
								displayName: user.identity.displayName,
							};
						}),
					];
				})
			);
		} catch (ex) {
			Logger.error(ex);
			debugger;
		}
		users.sort((a, b) => {
			return a.displayName.localeCompare(b.displayName);
		});
		return { users };
	}

	canConfigure() {
		return true;
	}

	private async getMe(): Promise<AzureDevOpsProfile> {
		const userResponse = await this.get<AzureDevOpsProfile>(
			"https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=5.0",
			{},
			{ absoluteUrl: true }
		);
		return userResponse.body;
	}
}
