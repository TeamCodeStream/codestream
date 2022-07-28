"use strict";
import { GraphQLClient } from "graphql-request";
import {
	CreateThirdPartyCardRequest,
	FetchThirdPartyBoardsRequest,
	FetchThirdPartyBoardsResponse,
	FetchThirdPartyCardsRequest,
	FetchThirdPartyCardsResponse,
	LinearCreateCardRequest,
	LinearIssue,
	LinearProject,
	LinearTeam,
	LinearUser,
	MoveThirdPartyCardRequest,
	ThirdPartyDisconnect,
	ThirdPartyProviderBoard,
	ThirdPartyProviderCard
} from "../protocol/agent.protocol";
import { CSLinearProviderInfo } from "../protocol/api.protocol";
import { log, lspProvider } from "../system";
import { ThirdPartyIssueProviderBase } from "./thirdPartyIssueProviderBase";

@lspProvider("linear")
export class LinearProvider extends ThirdPartyIssueProviderBase<CSLinearProviderInfo> {
	private _linearUserInfo: LinearUser | undefined;
	private _linearTeams: LinearTeam[] | undefined;

	get displayName() {
		return "Linear";
	}

	get name() {
		return "linear";
	}

	get headers() {
		return {
			"Content-Type": "application/json",
			"Linear-Token": this.accessToken!
		};
	}

	async onConnected(providerInfo?: CSLinearProviderInfo) {
		super.onConnected(providerInfo);
		this._linearUserInfo = await this.getMemberInfo();
	}

	@log()
	async onDisconnected(request?: ThirdPartyDisconnect) {
		// delete the graphql client so it will be reconstructed if a new token is applied
		delete this._client;
		delete this._linearUserInfo;
		delete this._linearTeams;
		return super.onDisconnected(request);
	}

	get graphQlBaseUrl() {
		return `${this.baseUrl}/graphql`;
	}

	protected _client: GraphQLClient | undefined;
	protected async client(): Promise<GraphQLClient> {
		if (this._client === undefined) {
			this._client = new GraphQLClient(this.graphQlBaseUrl);
		}
		if (!this.accessToken) {
			throw new Error("Could not get a Linear access token");
		}

		this._client.setHeaders({
			Authorization: `Bearer ${this.accessToken}`
		});

		return this._client;
	}

	async query<T = any>(query: string, variables: any = undefined) {
		return (await this.client()).request<any>(query, variables);
	}

	async mutate<T>(query: string, variables: any = undefined) {
		return (await this.client()).request<T>(query, variables);
	}

	@log()
	async getCards(request: FetchThirdPartyCardsRequest): Promise<FetchThirdPartyCardsResponse> {
		await this.ensureConnected();

		const response = await this.query<{ user: { assignedIssues: { nodes: LinearIssue[] } } }>(
			`query GetCards($id: String!) {
				user(id: $id) {
					assignedIssues {
						nodes {
							id
							title
							updatedAt
							url
							identifier
							branchName
							description
							state {
								name
							}
						}
					}
				}
			}`,
			{
				id: this._linearUserInfo!.id
			}
		);

		const cards: ThirdPartyProviderCard[] = response.user.assignedIssues.nodes
			.filter((issue: LinearIssue) => {
				return issue.state.name !== "Done" && issue.state.name !== "Canceled";
			})
			.map((issue: LinearIssue) => {
				return {
					id: issue.id,
					url: issue.url,
					title: `${issue.identifier} ${issue.title}`,
					modifiedAt: new Date(issue.updatedAt).getTime(),
					tokenId: issue.identifier,
					body: issue.description,
					branchName: issue.branchName
				};
			});

		cards.sort((a, b) => {
			return a.modifiedAt - b.modifiedAt;
		});

		return { cards };
	}

	@log()
	async getTeams(): Promise<LinearTeam[]> {
		const response = await this.query<{ teams: { nodes: LinearTeam[] } }>(
			"query { teams { nodes { id name } } }"
		);
		this._linearTeams = response.teams.nodes;
		return this._linearTeams!;
	}

	@log()
	async getBoards(request: FetchThirdPartyBoardsRequest): Promise<FetchThirdPartyBoardsResponse> {
		await this.ensureConnected();

		const teams = await this.getTeams();
		teams.sort((a, b) => {
			return a.name.localeCompare(b.name);
		});
		let boards: ThirdPartyProviderBoard[] = [];
		for (const team of teams) {
			boards.push({ id: `${team.id}_`, name: `${team.name}/No Project` });
			const response = await this.query<{ data: { issues: { nodes: LinearProject[] } } }>(
				`query GetBoards($teamId: String!) {
				team(id: $teamId) {
					projects {
						nodes {
							id
							name
						}
					}
				}
			}`,
				{
					teamId: team.id
				}
			);

			const projects = response.team.projects.nodes as LinearProject[];
			projects.sort((a, b) => {
				return a.name.localeCompare(b.name);
			});

			boards = [
				...boards,
				...projects.map(project => {
					return {
						...project,
						id: `${team.id}_${project.id}`,
						name: `${team.name}/${project.name}`
					};
				})
			];
		}
		return { boards };
	}

	@log()
	async createCard(request: CreateThirdPartyCardRequest) {
		await this.ensureConnected();

		if (this._linearTeams === undefined) {
			await this.getTeams();
		}
		const data = request.data as LinearCreateCardRequest;
		const id = data.projectId;
		const [teamId, projectId] = id.split("_");
		const assigneeId = (data.assignees && data.assignees[0] && data.assignees[0].id) || null;
		const query = `
			mutation CreateIssue($title:String!, $description:String!, $teamId:String!, $projectId:String, $assigneeId:String) {
				issueCreate(
					input: {
						title: $title
						description: $description
						teamId: $teamId
						projectId: $projectId
						assigneeId: $assigneeId
					}
				) {
					success
					issue {
						id
						title
						url
						identifier
					}
				}
			}
		`;
		const vars: { [key: string]: string | null } = {
			title: data.name.trim(),
			description: data.description.trim(),
			teamId: teamId,
			projectId: projectId || null,
			assigneeId
		};
		const response = await this.query<{ issueCreate: { issue: LinearIssue } }>(query, vars);
		return response.issueCreate.issue;
	}

	@log()
	async moveCard(request: MoveThirdPartyCardRequest) {
		return { success: false };
	}

	@log()
	async getAssignableUsers(request: { boardId: string }) {
		await this.ensureConnected();

		const response = await this.query<{ users: { nodes: LinearUser[] } }>(
			"query { users { nodes { id name email } } }"
		);
		return { users: response.users.nodes.map((u: LinearUser) => ({ ...u, displayName: u.name })) };
	}

	private async getMemberInfo(): Promise<LinearUser> {
		const response = await this.query<{ viewer: LinearUser }>("query { viewer { id name email } }");
		return response.viewer;
	}
}
