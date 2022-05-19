"use strict";
import { sortBy } from "lodash-es";
import * as qs from "querystring";
import { Container, SessionContainer } from "../container";
import { Logger } from "../logger";
import {
	CreateJiraCardRequest,
	CreateThirdPartyCardRequest,
	FetchAssignableUsersAutocompleteRequest,
	FetchAssignableUsersResponse,
	FetchThirdPartyBoardsRequest,
	FetchThirdPartyBoardsResponse,
	FetchThirdPartyCardsRequest,
	FetchThirdPartyCardsResponse,
	JiraBoard,
	JiraCard,
	JiraUser,
	MoveThirdPartyCardRequest,
	ReportingMessageType,
	ThirdPartyDisconnect,
	ThirdPartyProviderCard
} from "../protocol/agent.protocol";
import { CSJiraProviderInfo } from "../protocol/api.protocol";
import { Iterables, log, lspProvider } from "../system";
import { ThirdPartyIssueProviderBase } from "./provider";

type AccessibleResourcesResponse = { id: string; name: string; url: string }[];

interface JiraProject {
	id: string;
	name: string;
}

interface IssueTypeDescriptor {
	name: string;
	iconUrl: string;
	fields: { [name: string]: { required: boolean; hasDefaultValue: boolean } };
}

interface JiraProjectMeta extends JiraProject {
	issuetypes: IssueTypeDescriptor[];
}

interface JiraProjectsMetaResponse {
	projects: JiraProjectMeta[];
}

interface ProjectSearchResponse {
	values: JiraProject[];
	nextPage?: string;
	isLast: boolean;
	total: number;
}

interface CardSearchResponse {
	issues: JiraCard[];
	nextPage?: string;
	isLast: boolean;
	total: number;
}

// this doesn't work because of a JIRA bug
// https://community.atlassian.com/t5/Jira-questions/Paging-is-broken-for-user-search-queries/qaq-p/712071
// interface UserSearchResponse {
// 	users: JiraUser[];
// 	nextPage?: string;
// 	isLast: boolean;
// 	total: number;
// }

interface CreateJiraIssueResponse {
	id: string;
	key: string;
	self: string;
}

export const makeCardFromJira = (card: any, webUrl: string, parentId?: string) => {
	const { fields = {} } = card;
	const subtasks =
		fields.subtasks && fields.subtasks.length
			? fields.subtasks.map((subtask: any) => makeCardFromJira(subtask, webUrl, card.id))
			: [];
	return {
		id: card.id,
		url: `${webUrl}/browse/${card.key}`,
		title: `${card.key} ${fields.summary}`,
		modifiedAt: new Date(fields.updated).getTime(),
		tokenId: card.key,
		body: fields.description,
		idList: fields.status ? fields.status.id : "",
		listName: fields.status ? fields.status.name : "",
		lists: card.transitions,
		priorityName: fields.priority ? fields.priority.name : "",
		priorityIcon: fields.priority ? fields.priority.iconUrl : "",
		typeIcon: fields.issuetype ? fields.issuetype.iconUrl : "",
		subtasks,
		parentId
	};
};

@lspProvider("jira")
export class JiraProvider extends ThirdPartyIssueProviderBase<CSJiraProviderInfo> {
	private _urlAddon = "";
	private _webUrl = "";
	private boards: JiraBoard[] = [];
	private domain?: string;
	private _workspaces: string[] | undefined;

	get displayName() {
		return "Jira";
	}

	get name() {
		return "jira";
	}

	get baseUrl() {
		if (this._providerInfo && this._providerInfo.isApiToken && this._providerInfo.data?.baseUrl) {
			return this._providerInfo.data.baseUrl;
		}
		return `${super.baseUrl}${this._urlAddon}`;
	}

	get headers() {
		const headers: { [key: string]: string } = {
			Accept: "application/json",
			"Content-Type": "application/json"
		};
		if (this._providerInfo?.isApiToken) {
			const email = this._providerInfo?.data?.email || SessionContainer.instance().session.email;
			const auth = Buffer.from(`${email}:${this.accessToken}`).toString("base64");
			headers["Authorization"] = `Basic ${auth}`; // this is lame AF
		} else {
			headers["Authorization"] = `Bearer ${this.accessToken}`;
		}
		return headers;
	}

	async onConnected(providerInfo?: CSJiraProviderInfo) {
		await super.onConnected(providerInfo);
		if (this._providerInfo?.isApiToken) {
			this._webUrl = this._providerInfo?.data?.baseUrl || "";
			Logger.log("jira using api token with webUrl", this._webUrl);
			return;
		}
		if (this._urlAddon?.length > 0) {
			return;
		}

		// Infinite loop if get also does ensureConnected() so pass flag to disable check
		const response = await this.get<AccessibleResourcesResponse>(
			"/oauth/token/accessible-resources",
			undefined,
			undefined,
			false
		);

		Logger.debug("Jira: Accessible Resources are", response.body);

		if (response.body.length === 0) {
			Container.instance().errorReporter.reportMessage({
				type: ReportingMessageType.Error,
				message: "Jira access does not include any jira sites",
				source: "agent"
			});
			throw new Error("Jira access does not include any jira sites");
		}

		// FIXME: this is problematic, user may be in multiple workspaces and
		// we're assuming the first one here
		this._workspaces = response.body.map(_ => _.id);
		this._urlAddon = `/ex/jira/${response.body[0].id}`;
		this._webUrl = response.body[0].url;

		Logger.debug(`Jira: api url is ${this._urlAddon}`);
	}

	async onDisconnected(request?: ThirdPartyDisconnect) {
		this._urlAddon = "";
		this._webUrl = "";
		delete this.domain;
		this.boards = [];
		return super.onDisconnected(request);
	}

	canConfigure() {
		return true;
	}

	@log()
	async getBoards(request: FetchThirdPartyBoardsRequest): Promise<FetchThirdPartyBoardsResponse> {
		if (this.boards.length > 0) return { boards: this.boards };
		try {
			Logger.debug("Jira: fetching projects");
			const jiraBoards: JiraBoard[] = [];
			let nextPage: string | undefined = "/rest/api/2/project/search";
			let pageNum = 0;

			while (nextPage) {
				try {
					const { body }: { body: ProjectSearchResponse } = await this.get<ProjectSearchResponse>(
						nextPage
					);
					Logger.debug(`Jira: got ${body.values.length} projects`);

					// For explanation on this commented out code, see the definition of the isCompatibleProject() method, below
					/*
					await Promise.all(
						body.values.map(async project => {
							const board = await this.isCompatibleProject(project);
							if (board) {
								jiraBoards.push(board);
							}
						})
					);
					*/

					jiraBoards.push(...(await this.filterBoards(body.values)));

					Logger.debug(`Jira: is last page? ${body.isLast} - nextPage ${body.nextPage}`);
					if (body.nextPage) {
						nextPage = body.nextPage.substring(body.nextPage.indexOf("/rest/api/2"));
						pageNum++;
					} else {
						Logger.debug("Jira: there are no more projects");
						nextPage = undefined;
					}
				} catch (e) {
					const message = e instanceof Error ? e.message : JSON.stringify(e);
					Container.instance().errorReporter.reportMessage({
						type: ReportingMessageType.Error,
						message: `Jira: Error fetching jira projects: ${nextPage}`,
						source: "agent",
						extra: {
							message,
							nextPage,
							pageNum,
							baseUrl: this.baseUrl,
							workspaces: this._workspaces
						}
					});
					Logger.error(e, message);
					Logger.debug("Jira: Stopping project search");
					nextPage = undefined;
				}
			}

			Logger.debug(`Jira: total compatible projects: ${jiraBoards.length}`);

			this.boards = sortBy(jiraBoards, board => board.name.toLowerCase());

			return { boards: this.boards };
		} catch (error) {
			debugger;
			Container.instance().errorReporter.reportMessage({
				type: ReportingMessageType.Error,
				message: "Jira: Error fetching jira boards",
				source: "agent",
				extra: {
					message: error.message,
					baseUrl: this.baseUrl,
					workspaces: this._workspaces
				}
			});
			Logger.error(error, "Error fetching jira boards");
			return { boards: [] };
		}
	}

	private async filterBoards(projects: JiraProject[]): Promise<JiraBoard[]> {
		Logger.debug("Jira: Filtering for compatible projects");
		try {
			const response = await this.get<JiraProjectsMetaResponse>(
				`/rest/api/2/issue/createmeta?${qs.stringify({
					projectIds: projects.map(p => p.id).join(","),
					expand: "projects.issuetypes.fields"
				})}`
			);
			return this.getCompatibleBoards(response.body);
		} catch (error) {
			Container.instance().errorReporter.reportMessage({
				type: ReportingMessageType.Error,
				message: "Jira: Error fetching issue metadata for projects",
				source: "agent",
				extra: {
					message: error.message,
					baseUrl: this.baseUrl,
					workspaces: this._workspaces
				}
			});
			Logger.error(
				error,
				"Jira: Error fetching issue metadata for boards. Couldn't determine compatible projects"
			);
			return [];
		}
	}

	private getCompatibleBoards(meta: JiraProjectsMetaResponse) {
		const boards = meta.projects.map(project => {
			const board: Partial<JiraBoard> = { id: project.id, name: project.name, issueTypeIcons: {} };

			const issueTypes = Array.from(
				Iterables.filterMap(project.issuetypes, type => {
					if (type.fields.summary && type.fields.description) {
						const hasOtherRequiredFields = Object.entries(type.fields).find(
							([name, attributes]) =>
								name !== "summary" &&
								name !== "description" &&
								name !== "issuetype" &&
								name !== "project" &&
								attributes.required &&
								!attributes.hasDefaultValue
						);

						board.issueTypeIcons[type.name] = type.iconUrl;

						if (type.fields.assignee === undefined) {
							board.assigneesDisabled = true;
						} else {
							board.assigneesRequired = type.fields.assignee.required;
						}
						return hasOtherRequiredFields ? undefined : type.name;
					}
					return undefined;
				})
			);

			board.issueTypes = issueTypes;
			board.singleAssignee = true; // all jira cards have a single assignee?
			return board as JiraBoard;
		});
		return boards;
	}

	@log()
	async getCards(request: FetchThirdPartyCardsRequest): Promise<FetchThirdPartyCardsResponse> {
		// /rest/api/2/search?jql=assignee=currentuser()
		// https://developer.atlassian.com/server/jira/platform/jira-rest-api-examples/
		// why don't we get assignees for subtasks?
		// https://community.atlassian.com/t5/Jira-questions/Can-you-use-the-JIRA-REST-API-to-show-more-subtask-fields/qaq-p/816963

		try {
			Logger.debug("Jira: fetching cards");
			const jiraCards: JiraCard[] = [];
			let pageNum = 0;
			const queryString = qs.stringify({
				jql:
					request.customFilter ||
					"assignee=currentuser() AND NOT((status in (Closed, Done, Resolved)) OR resolution != Unresolved)",
				expand: "transitions,names",
				fields: "summary,description,updated,subtasks,status,issuetype,priority,assignee"
			});
			let nextPage: string | undefined = `/rest/api/2/search?${queryString}`;
			let errorMessage: string | undefined;

			while (nextPage !== undefined) {
				try {
					const { body }: { body: CardSearchResponse } = await this.get<CardSearchResponse>(
						nextPage
					);
					// Logger.debug("GOT CARDS: " + JSON.stringify(body, null, 4));
					jiraCards.push(...body.issues);

					Logger.debug(`Jira: is last page? ${body.isLast} - nextPage ${body.nextPage}`);
					if (body.nextPage) {
						nextPage = body.nextPage.substring(body.nextPage.indexOf("/rest/api/2"));
						pageNum++;
					} else {
						Logger.debug("Jira: there are no more cards");
						nextPage = undefined;
					}
				} catch (e) {
					errorMessage = e instanceof Error ? e.message : JSON.stringify(e);
					Container.instance().errorReporter.reportMessage({
						type: ReportingMessageType.Error,
						message: "Jira: Error fetching jira cards",
						source: "agent",
						extra: {
							message: errorMessage,
							queryString,
							nextPage,
							pageNum,
							baseUrl: this.baseUrl,
							workspaces: this._workspaces
						}
					});
					Logger.error(e, errorMessage);
					Logger.debug("Jira: Stopping card search");
					nextPage = undefined;
				}
			}

			Logger.debug(`Jira: total cards: ${jiraCards.length}`);
			const cards: ThirdPartyProviderCard[] = [];
			jiraCards.forEach(card => cards.push(makeCardFromJira(card, this._webUrl)));
			const response: FetchThirdPartyCardsResponse = { cards };
			if (errorMessage) {
				response.error = { message: errorMessage };
			}
			return response;
		} catch (error) {
			debugger;
			const message = error instanceof Error ? error.message : JSON.stringify(error);
			Container.instance().errorReporter.reportMessage({
				type: ReportingMessageType.Error,
				message: "Jira: Uncaught error fetching jira cards",
				source: "agent",
				extra: {
					message,
					baseUrl: this.baseUrl,
					workspaces: this._workspaces
				}
			});
			Logger.error(error, "Uncaught error fetching jira cards");
			return { cards: [] };
		}
	}

	@log()
	async createCard(request: CreateThirdPartyCardRequest) {
		const data = request.data as CreateJiraCardRequest;
		// using /api/2 because 3 returns nonsense errors for the same request
		const body: { [k: string]: any } = {
			fields: {
				project: {
					id: data.project
				},
				issuetype: {
					name: data.issueType
				},
				summary: data.summary,
				description: data.description
			}
		};

		if (data.assignees && data.assignees.length > 0) {
			body.fields.assignee = { accountId: data.assignees[0].accountId };
		}
		const response = await this.post<typeof body, CreateJiraIssueResponse>(
			"/rest/api/2/issue",
			body
		);
		return {
			id: response.body.id,
			url: `${this._webUrl}/browse/${response.body.key}`
		};
	}

	@log()
	async moveCard(request: MoveThirdPartyCardRequest) {
		try {
			Logger.debug("Jira: moving card");
			const response = await this.post(`/rest/api/2/issue/${request.cardId}/transitions`, {
				transition: { id: request.listId }
			});
			// Logger.debug("Got a response: " + JSON.stringify(response, null, 4));
			return response;
		} catch (error) {
			debugger;
			Container.instance().errorReporter.reportMessage({
				type: ReportingMessageType.Error,
				message: "Jira: Error moving jira card",
				source: "agent",
				extra: {
					message: error.message,
					baseUrl: this.baseUrl,
					workspaces: this._workspaces
				}
			});
			Logger.error(error, "Error moving jira card");
			return {};
		}
	}

	// apparently there's no way to get more than 1000 users
	// https://community.atlassian.com/t5/Jira-questions/Paging-is-broken-for-user-search-queries/qaq-p/712071
	@log()
	async getAssignableUsers(request: { boardId: string }) {
		const { body } = await this.get<JiraUser[]>(
			`/rest/api/2/user/assignable/search?${qs.stringify({
				project: request.boardId,
				maxResults: 1000
			})}`
		);
		return { users: body.map(u => ({ ...u, id: u.accountId })) };
	}

	@log()
	async getAssignableUsersAutocomplete(
		request: FetchAssignableUsersAutocompleteRequest
	): Promise<FetchAssignableUsersResponse> {
		const { body } = await this.get<JiraUser[]>(
			`/rest/api/2/user/assignable/search?${qs.stringify({
				query: request.search,
				project: request.boardId,
				maxResults: 50
			})}`
		);
		return { users: body.map(u => ({ ...u, id: u.accountId })) };
	}
}
