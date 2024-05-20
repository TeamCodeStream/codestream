import {
	GetErrorInboxCommentsRequest,
	GetErrorInboxCommentsRequestType,
	GetErrorInboxCommentsResponse,
} from "../../../../../util/src/protocol/agent/agent.protocol.providers";
import { log } from "../../../system/decorators/log";
import { lsp, lspHandler } from "../../../system/decorators/lsp";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import { NrApiConfig } from "../nrApiConfig";
import { ReposProvider } from "../repos/reposProvider";
import { generateHash } from "./collabDiscussionUtils";
import { SourceMapProvider } from "./sourceMapProvider";

@lsp
export class CollaborationTeamProvider {
	private nerdletId = "errors-inbox.error-group-details";
	private inboxEntityType = "WORKLOAD";

	constructor(
		private reposProvider: ReposProvider,
		private graphqlClient: NewRelicGraphqlClient,
		private nrApiConfig: NrApiConfig,
		private sourceMapProvider: SourceMapProvider
	) {
		graphqlClient.addHeader("Nerd-Graph-Unsafe-Experimental-Opt-In", "Collaboration");
	}

	@lspHandler(GetErrorInboxCommentsRequestType)
	@log()
	async createCollabrationContext(
		request: GetErrorInboxCommentsRequest
	): Promise<GetErrorInboxCommentsResponse> {
		const { accountId, errorGroupGuid, entityGuid } = { ...request };

		const referencePayload = {
			accountId: accountId,
			entityGuid: entityGuid,
			nerdletId: this.nerdletId,
			pageId: [errorGroupGuid, this.inboxEntityType],
		};

		const referenceId = generateHash(referencePayload);

		const query = `
			mutation {
				collaborationCreateContext(
					accountId: ${accountId}
					contextMetadata: ${referencePayload}
					entityGuid: "${entityGuid}"
					id: "${referenceId}"
					referenceUrl: "https://dev-one.newrelic.com/errors-inbox"
				) 
				{
					id
					referenceUrl
					organizationId
					modifiedAt
					latestThreadId
					latestThreadCommentTime
					latestThreadCommentId
					latestThreadCommentCreatorId
					entityGuid
					deactivated
					creatorId
					createdAt
					contextMetadata
					accountId
				}
			}`;

		const response = await this.graphqlClient.mutate<{ data }>(query);

		const context = response?.data.collaborationCreateContext;
		return "2";
	}
}
