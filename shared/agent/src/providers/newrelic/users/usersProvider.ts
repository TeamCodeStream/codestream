import {
	UserSearchRequest,
	UserSearchRequestType,
	UserSearchResponse,
} from "@codestream/protocols/agent";
import { lsp, lspHandler } from "system/decorators/lsp";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import { log } from "system/decorators/log";

@lsp
export class UsersProvider {
	constructor(private graphqlClient: NewRelicGraphqlClient) {}

	@lspHandler(UserSearchRequestType)
	@log()
	async searchUsers(request: UserSearchRequest): Promise<UserSearchResponse> {
		const userSearchQuery = `
		{
			actor {
				users {
					userSearch(query: {scope: { search: "${request.query}" }}) {
						users {
							email
							name
							userId
						}
						nextCursor
					}
				}
			}
		}`;

		const userSearchResponse = await this.graphqlClient.query(userSearchQuery);

		return {
			users: userSearchResponse.actor.users.userSearch.users,
			nextCursor: userSearchResponse.actor.users.userSearch.nextCursor,
		};
	}
}
