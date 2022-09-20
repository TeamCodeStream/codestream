"use strict";
import { GraphQLClient } from "graphql-request";
import Cache from "timed-cache";
import { Logger } from "../logger";
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
	ThirdPartyProviderCard,
} from "../protocol/agent.protocol";
import { CSLinearProviderInfo } from "../protocol/api.protocol";
import { log, lspProvider } from "../system";
import { QueryLogger } from "./queryLogger";
import { ThirdPartyIssueProviderBase } from "./thirdPartyIssueProviderBase";

@lspProvider("linear")
export class LinearProvider extends ThirdPartyIssueProviderBase<CSLinearProviderInfo> {
	private _linearUserInfo: LinearUser | undefined;
	private _queryLogger: QueryLogger = {
		graphQlApi: { fns: {} },
		restApi: { rateLimits: {}, fns: {} },
	};
	private _teamProjectCache: Cache | undefined;
	private _teamProjectsCacheKey = "teamProjects";

	get displayName() {
		return "Linear";
	}

	get name() {
		return "linear";
	}

	get headers() {
		return {
			"Content-Type": "application/json",
			"Linear-Token": this.accessToken!,
		};
	}

	async onConnected(providerInfo?: CSLinearProviderInfo) {
		super.onConnected(providerInfo);
		// @ts-ignore
		this._teamProjectCache = new Cache({ defaultTtl: 300 * 1000 }); //5 minutes
		this._linearUserInfo = await this.getMemberInfo();
	}

	@log()
	async onDisconnected(request?: ThirdPartyDisconnect) {
		// delete the graphql client so it will be reconstructed if a new token is applied
		delete this._client;
		delete this._linearUserInfo;
		this._teamProjectCache?.clear();
		this._queryLogger = {
			graphQlApi: { fns: {} },
			restApi: { rateLimits: {}, fns: {} },
		};
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
			Authorization: `Bearer ${this.accessToken}`,
		});

		return this._client;
	}

	async query<T>(query: string, variables: any = undefined) {
		let response;
		try {
			response = await (await this.client()).rawRequest<any>(query, variables);
		} catch (ex) {
			throw ex;
		} finally {
			try {
				const headers = response?.headers || new Map();
				const defaultLimit = "500";
				const rateLimit = {
					limit: parseInt(headers.get("x-ratelimit-requests-limit") || defaultLimit, 10),
					remaining: parseInt(headers.get("x-ratelimit-requests-remaining") || defaultLimit, 10),
					cost: parseInt(headers.get("x-complexity") || "1", 10),
					resetAt: new Date(parseFloat(headers.get("x-ratelimit-requests-reset"))),
				};

				this._queryLogger.graphQlApi.rateLimit = {
					remaining: rateLimit.remaining,
					resetAt: rateLimit.resetAt.toISOString(),
				};
				const e = new Error();
				if (e.stack) {
					let functionName;
					try {
						functionName = e.stack
							.split("\n")
							.filter(_ => _.indexOf("LinearProvider") > -1 && _.indexOf(".query") === -1)![0]
							.match(/LinearProvider\.(\w+)/)![1];
					} catch (err) {
						functionName = "unknown";
					}
					this._queryLogger.graphQlApi.rateLimit.last = {
						name: functionName,
						cost: rateLimit.cost,
					};
					if (!this._queryLogger.graphQlApi.fns[functionName]) {
						this._queryLogger.graphQlApi.fns[functionName] = {
							count: 1,
							cumulativeCost: rateLimit.cost,
							averageCost: rateLimit.cost,
						};
					} else {
						const existing = this._queryLogger.graphQlApi.fns[functionName];
						existing.count++;
						existing.cumulativeCost += rateLimit.cost;
						existing.averageCost = Math.floor(existing.cumulativeCost / existing.count);
						this._queryLogger.graphQlApi.fns[functionName] = existing;
					}
				}
				Logger.debug("LINEAR rateLimit", rateLimit);
				if (rateLimit.remaining < 100) {
					Logger.warn(`${this.providerConfig.id} rateLimit low ${rateLimit.remaining}`);
					Logger.warn(JSON.stringify(this._queryLogger, null, 4));
				}
			} catch (err) {
				Logger.warn(err);
			}
		}
		return response?.data as T;
	}

	async mutate<T>(query: string, variables: any = undefined) {
		return (await this.client()).request<T>(query, variables);
	}

	@log()
	async getCards(request: FetchThirdPartyCardsRequest): Promise<FetchThirdPartyCardsResponse> {
		try {
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
					id: this._linearUserInfo!.id,
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
						branchName: issue.branchName,
					};
				});

			cards.sort((a, b) => {
				return a.modifiedAt - b.modifiedAt;
			});

			return { cards };
		} catch (error) {
			Logger.error(error, "Uncaught error fetching linear cards");
			return { cards: [] };
		}
	}

	@log()
	async getTeams(request: { force?: boolean }): Promise<LinearTeam[]> {
		// get teams AND project metadata
		const teamProjects = await this.getTeamProjects(request);
		return teamProjects;
	}

	@log()
	async getBoards(request: FetchThirdPartyBoardsRequest): Promise<FetchThirdPartyBoardsResponse> {
		try {
			await this.ensureConnected();

			const teams = await this.getTeams(request);
			teams.sort((a, b) => {
				return a.name.localeCompare(b.name);
			});
			let boards: ThirdPartyProviderBoard[] = [];
			for (const team of teams) {
				boards.push({ id: `${team.id}_`, name: `${team.name}/No Project` });

				let projects: LinearProject[] = [];
				if (team.projects) {
					projects = (team.projects?.nodes as LinearProject[]) || [];
					projects.sort((a, b) => {
						return a.name.localeCompare(b.name);
					});
				}

				boards = [
					...boards,
					...projects.map(project => {
						return {
							...project,
							id: `${team.id}_${project.id}`,
							name: `${team.name}/${project.name}`,
						};
					}),
				];
			}
			return { boards };
		} catch (error) {
			Logger.error(error, "Uncaught error fetching linear boards");
			return { boards: [] };
		}
	}

	@log()
	async createCard(request: CreateThirdPartyCardRequest) {
		await this.ensureConnected();

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
			assigneeId,
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

	private async getTeamProjects(
		request: { force?: boolean } = { force: false }
	): Promise<LinearTeam[]> {
		try {
			if (!request || !request.force) {
				const exists = this._teamProjectCache?.get(this._teamProjectsCacheKey);
				Logger.debug("LINEAR got teamProjects from cache");
				if (exists) {
					return exists;
				}
			}
			const response = await this.query<{ teams: { nodes: LinearTeam[] } }>(
				`query GetTeamsAndProjects { 
				teams { 
					nodes { 
						id 
						name
						projects {
							nodes {
								id
								name
							}
						}
					} 
				}
			}`
			);
			this._teamProjectCache?.put(this._teamProjectsCacheKey, response.teams.nodes);
			Logger.debug("LINEAR cached teamProjects");
			return response.teams.nodes!;
		} catch (error) {
			Logger.error(error, "Error getting teamProjects");
		}
		return [];
	}

	private async getMemberInfo(): Promise<LinearUser> {
		const response = await this.query<{ viewer: LinearUser }>("query { viewer { id name email } }");
		return response.viewer;
	}
}
