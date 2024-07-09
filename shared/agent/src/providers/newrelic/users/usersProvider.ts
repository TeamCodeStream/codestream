import {
	NewRelicUser,
	UserSearchRequest,
	UserSearchRequestType,
	UserSearchResponse,
} from "@codestream/protocols/agent";
import { log } from "../../../system/decorators/log";
import { lsp, lspHandler } from "../../../system/decorators/lsp";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";

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

		const users: NewRelicUser[] = userSearchResponse.actor.users.userSearch.users.map(
			(user: { userId: number; email: string; name: string }) => {
				return {
					id: user.userId,
					email: user.email,
					name: user.name,
				};
			}
		);

		return {
			users: users,
			nextCursor: userSearchResponse.actor.users.userSearch.nextCursor,
		};
	}
}
