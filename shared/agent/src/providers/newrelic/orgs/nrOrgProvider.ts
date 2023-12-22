import { lsp, lspHandler } from "../../../system/decorators/lsp";
import {
	GetNewRelicAccountsRequestType,
	GetNewRelicAccountsResponse,
	GetNewRelicUrlRequest,
	GetNewRelicUrlRequestType,
	GetNewRelicUrlResponse,
	GetNewRelicUsersRequest,
	GetNewRelicUsersRequestType,
	GetNewRelicUsersResponse,
	UpdateAzureFullNameRequest,
	UpdateAzureFullNameRequestType,
	UpdateAzureFullNameResponse,
	UpdateNewRelicOrgIdRequest,
	UpdateNewRelicOrgIdRequestType,
	UpdateNewRelicOrgIdResponse,
} from "@codestream/protocols/agent";
import { log } from "../../../system/decorators/log";
import { SessionContainer } from "../../../container";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import { ApiProvider } from "../../../api/apiProvider";
import { NrApiConfig } from "../nrApiConfig";
import { ContextLogger } from "../../contextLogger";

@lsp
export class NrOrgProvider {
	constructor(
		private graphqlClient: NewRelicGraphqlClient,
		private api: ApiProvider,
		private nrApiConfig: NrApiConfig
	) {}

	@log()
	private async getOrgId(): Promise<number | undefined> {
		try {
			const response = await this.graphqlClient.query<{
				actor: {
					organization: {
						id: number;
					};
				};
			}>(
				`{
					actor {
						organization {
							id
						}
					}
				}`,
				{}
			);
			return response?.actor?.organization?.id;
		} catch (ex) {
			ContextLogger.warn("getOrgId " + ex.message, {
				error: ex,
			});
		}

		return undefined;
	}
	@lspHandler(UpdateNewRelicOrgIdRequestType)
	@log()
	async updateOrgId(request: UpdateNewRelicOrgIdRequest): Promise<UpdateNewRelicOrgIdResponse> {
		const orgId = await this.getOrgId();
		const team = await SessionContainer.instance().teams.getByIdFromCache(request.teamId);
		const company =
			team && (await SessionContainer.instance().companies.getByIdFromCache(team.companyId));
		if (orgId && company) {
			ContextLogger.log(`Associating company ${company.id} with NR org ${orgId}`);
			await this.api.addCompanyNewRelicInfo(company.id, undefined, [orgId]);
		}

		return {
			orgId,
		};
	}

	@lspHandler(UpdateAzureFullNameRequestType)
	@log()
	async setFullName(
		request: UpdateAzureFullNameRequest
	): Promise<UpdateAzureFullNameResponse | undefined> {
		try {
			const userId = (await this.graphqlClient.getUserId()) || undefined;

			const response = await this.setFullNameMutation({
				userId,
				newFullName: request.fullName!,
			});

			return { fullName: response?.userManagementUpdateUser?.user?.name };
		} catch (ex) {
			ContextLogger.error(ex);
		}

		return undefined;
	}

	private setFullNameMutation(request: { userId: number | undefined; newFullName: string }) {
		return this.graphqlClient.query(
			`mutation userManagementUpdateUser($name: String!, $id: ID!) {
				userManagementUpdateUser(updateUserOptions: {name: $name, id: $id}) {
				  user {
					name
				  }
				}
			  }			  
		  	`,
			{
				name: request.newFullName,
				id: request.userId,
			}
		);
	}

	@lspHandler(GetNewRelicUrlRequestType)
	@log()
	async getNewRelicUrl(request: GetNewRelicUrlRequest): Promise<GetNewRelicUrlResponse> {
		return { newRelicUrl: this.productEntityRedirectUrl(request.entityGuid) };
	}

	@lspHandler(GetNewRelicAccountsRequestType)
	@log()
	async getAccounts(): Promise<GetNewRelicAccountsResponse> {
		try {
			const response = await this.graphqlClient.query<{
				actor: {
					accounts: { id: number; name: string }[];
				};
			}>(`{
				actor {
					accounts {
						id,
						name
					}
				}
			}`);
			return response.actor;
		} catch (e) {
			ContextLogger.error(e, "getAccounts");
			throw e;
		}
	}

	@lspHandler(GetNewRelicUsersRequestType)
	@log()
	async getUsers(request: GetNewRelicUsersRequest): Promise<GetNewRelicUsersResponse> {
		try {
			const query = request.search ? `search: "${request.search}"` : "";
			const cursor = request.nextCursor || "null";
			const response = await this.graphqlClient.query<{
				actor: {
					users: {
						userSearch: {
							users: { email: string; name: string }[];
							nextCursor?: string;
						};
					};
				};
			}>(`{
				actor {
					users {
						userSearch(query: {scope: {${query}}}, cursor: ${cursor}) {
							users {
								email
								name
							}
							nextCursor
						}
					}
				}
			}`);
			return response.actor.users.userSearch;
		} catch (e) {
			ContextLogger.error(e, "getUsers");
			throw e;
		}
	}

	productEntityRedirectUrl(entityGuid: string) {
		return `${this.nrApiConfig.productUrl}/redirect/entity/${entityGuid}`;
	}
}
