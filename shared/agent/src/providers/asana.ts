"use strict";
import * as qs from "querystring";
import { Logger } from "../logger";
import {
	AsanaCard,
	AsanaCreateCardRequest,
	AsanaCreateCardResponse,
	AsanaList,
	AsanaProject,
	AsanaUser,
	AsanaWorkspace,
	CreateThirdPartyCardRequest,
	FetchAssignableUsersAutocompleteRequest,
	FetchAssignableUsersResponse,
	FetchThirdPartyBoardsRequest,
	FetchThirdPartyBoardsResponse,
	FetchThirdPartyCardsRequest,
	FetchThirdPartyCardsResponse,
	MoveThirdPartyCardRequest,
	ThirdPartyDisconnect,
	ThirdPartyProviderBoard
} from "../protocol/agent.protocol";
import { CSAsanaProviderInfo } from "../protocol/api.protocol";
import { log, lspProvider } from "../system";
import { ThirdPartyIssueProviderBase } from "./provider";

interface AsanaProjectData {
	data: AsanaProject;
}

interface AsanaUsersData {
	data: AsanaUser[];
}

@lspProvider("asana")
export class AsanaProvider extends ThirdPartyIssueProviderBase<CSAsanaProviderInfo> {
	private _asanaUser: AsanaUser | undefined;

	get displayName() {
		return "Asana";
	}

	get name() {
		return "asana";
	}

	get headers() {
		return {
			Authorization: `Bearer ${this.accessToken}`
		};
	}

	async onConnected(providerInfo?: CSAsanaProviderInfo) {
		await super.onConnected(providerInfo);
		this._asanaUser = await this.getMe(true);
	}

	@log()
	async onDisconnected(request?: ThirdPartyDisconnect) {
		delete this._asanaUser;
		return super.onDisconnected(request);
	}

	@log()
	async getBoards(request: FetchThirdPartyBoardsRequest): Promise<FetchThirdPartyBoardsResponse> {
		await this.ensureConnected();

		const workspaces = await this.getWorkspaces();
		let projects: AsanaProject[] = [];
		for (const workspace of workspaces) {
			const workspaceProjects = await this.getWorkspaceProjects(workspace);
			projects = projects.concat(workspaceProjects);
		}

		const boards: ThirdPartyProviderBoard[] = [];
		for (const project of projects) {
			const board: ThirdPartyProviderBoard = {
				id: project.gid,
				name: project.name,
				lists: [],
				singleAssignee: true // asana cards allow only a single assignee
			};

			if (project.layout !== "board") {
				board.lists.push({
					id: undefined!,
					name: "No Section"
				});
			}

			for (const section of project.sections) {
				const list: AsanaList = {
					id: section.gid,
					name: section.name
				};
				board.lists.push(list);
			}

			boards.push(board);
		}

		boards.sort((a, b) => {
			const nameA = a.name.toLowerCase();
			const nameB = b.name.toLowerCase();
			if (nameA < nameB) {
				return -1;
			}
			if (nameA > nameB) {
				return 1;
			}
			return 0;
		});

		return { boards };
	}

	private async getWorkspaces(): Promise<AsanaWorkspace[]> {
		let workspaces: AsanaWorkspace[] = [];

		try {
			let apiResponse = await this.get<{ data: AsanaWorkspace[]; next_page: any }>(
				`/api/1.0/workspaces?${qs.stringify({
					limit: 100
				})}`
			);
			workspaces = apiResponse.body.data;

			let nextPage: string | undefined;
			while ((nextPage = this.nextPage(apiResponse.body))) {
				apiResponse = await this.get<{ data: AsanaWorkspace[]; next_page: any }>(nextPage);
				workspaces = workspaces.concat(apiResponse.body.data);
			}
		} catch (err) {
			Logger.error(err);
			debugger;
		}

		return workspaces;
	}

	private async getWorkspaceProjects(workspace: AsanaWorkspace): Promise<AsanaProject[]> {
		let projects: AsanaProject[] = [];

		try {
			let apiResponse = await this.get<{ data: AsanaProject[]; next_page: any }>(
				`/api/1.0/workspaces/${workspace.gid}/projects?${qs.stringify({
					opt_fields: "layout,name,sections,sections.name",
					archived: false,
					limit: 100
				})}`
			);
			projects = apiResponse.body.data;

			let nextPage: string | undefined;
			while ((nextPage = this.nextPage(apiResponse.body))) {
				apiResponse = await this.get<{ data: AsanaProject[]; next_page: any }>(nextPage);
				projects = projects.concat(apiResponse.body.data);
			}
		} catch (err) {
			Logger.error(err);
			debugger;
		}

		return projects;
	}

	private async getWorkspaceTasks(workspace: AsanaWorkspace): Promise<AsanaCard[]> {
		let cards: AsanaCard[] = [];

		// https://developers.asana.com/docs/tasks
		try {
			let apiResponse = await this.get<{ data: AsanaCard[]; next_page: any }>(
				`/api/1.0/tasks?${qs.stringify({
					opt_fields: "url,name,modified_at,notes,memberships.section.gid,comments",
					workspace: workspace.gid,
					assignee: this._asanaUser?.gid,
					completed_since: "now",
					archived: false,
					limit: 100
				})}`
			);
			cards = apiResponse.body.data;

			let nextPage: string | undefined;
			while ((nextPage = this.nextPage(apiResponse.body))) {
				apiResponse = await this.get<{ data: AsanaCard[]; next_page: any }>(nextPage);
				cards = cards.concat(apiResponse.body.data);
			}
		} catch (err) {
			Logger.error(err);
			debugger;
		}

		return cards.map(card => {
			return { ...card, workspaceGid: workspace.gid };
		});
	}

	@log()
	async getCards(request: FetchThirdPartyCardsRequest): Promise<FetchThirdPartyCardsResponse> {
		const workspaces = await this.getWorkspaces();
		let tasks: AsanaCard[] = [];
		for (const workspace of workspaces) {
			const workspaceTasks = await this.getWorkspaceTasks(workspace);
			tasks = tasks.concat(workspaceTasks);
		}

		// Logger.log("ASANA: ", JSON.stringify(tasks, null, 4));
		const cards = tasks.map(task => {
			const { memberships = [] } = task;
			return {
				id: task.gid,
				url: `${this.baseUrl}/0/${task.workspaceGid}/${task.gid}`,
				title: task.name,
				modifiedAt: new Date(task.modified_at).getTime(),
				idList: memberships[0] && memberships[0].section ? memberships[0].section.gid : "",
				tokenId: task.gid,
				body: task.notes
			};
		});
		// Logger.log("ASANA: ", JSON.stringify(cards, null, 4));
		return { cards };
	}

	@log()
	async createCard(request: CreateThirdPartyCardRequest) {
		await this.ensureConnected();

		const data = request.data as AsanaCreateCardRequest;
		// apparently, this is the syntax: https://forum.asana.com/t/how-create-task-with-membership-via-api/10481/15
		const cardData = {
			data: {
				name: data.name,
				html_notes: data.description,
				projects: data.boardId,
				memberships: [
					{
						project: data.boardId && data.boardId.toString(),
						section: data.listId && data.listId.toString()
					}
				],
				assignee: data.assignee || undefined
			}
		};
		const response = await this.post<{}, AsanaCreateCardResponse>(`/api/1.0/tasks`, cardData);
		const card = response.body.data;
		card.url = `${this.baseUrl}/0/${card.projects[0].gid}/${card.gid}`;
		return card;
	}

	@log()
	async moveCard(request: MoveThirdPartyCardRequest) {}

	private async getMe(dontEnsureConnected: boolean = false): Promise<AsanaUser> {
		const userResponse = await this.get<{ data: AsanaUser }>(
			`/api/1.0/users/me`,
			{},
			{},
			!dontEnsureConnected
		);
		return userResponse.body.data;
	}

	private nextPage(responseBody: { next_page: any }): string | undefined {
		if (!responseBody.next_page) {
			return;
		}

		return "/api/1.0" + responseBody.next_page.path;
	}

	@log()
	async getAssignableUsers(request: { boardId: string }) {
		await this.ensureConnected();

		const response = await this.get<AsanaProjectData>(`/api/1.0/projects/${request.boardId}`);
		const team = response.body.data.team;
		let userResponse;
		if (team) {
			userResponse = await this.get<AsanaUsersData>(
				`/api/1.0/teams/${team.gid}/users?${qs.stringify({ opt_fields: "name,email" })}`
			);
		} else {
			userResponse = await this.get<AsanaUsersData>(
				`/api/1.0/workspaces/${response.body.data.workspace.gid}/users?${qs.stringify({
					opt_fields: "name,email"
				})}`
			);
		}
		return { users: userResponse.body.data.map(u => ({ ...u, displayName: u.name, id: u.gid })) };
	}
}
