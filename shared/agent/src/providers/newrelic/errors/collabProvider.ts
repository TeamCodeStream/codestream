import { ContextLogger } from "providers/contextLogger";
import {
	GetErrorInboxCommentsRequest,
	GetErrorInboxCommentsRequestType,
	GetErrorInboxCommentsResponse,
} from "../../../../../util/src/protocol/agent/agent.protocol.providers";
import { log } from "../../../system/decorators/log";
import { lsp, lspHandler } from "../../../system/decorators/lsp";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import { generateHash } from "./collabDiscussionUtils";
import { mapNRErrorResponse } from "../utils";
import { CollaborationContext } from "./collab.types";

@lsp
export class CollaborationTeamProvider {
	private nerdletId = "errors-inbox.error-group-details";
	private inboxEntityType = "WORKLOAD";

	constructor(private graphqlClient: NewRelicGraphqlClient) {
		this.graphqlClient.addHeader("Nerd-Graph-Unsafe-Experimental-Opt-In", "Collaboration");
	}

	private async createCollaborationContext(
		accountId: number,
		errorGroupGuid: string,
		entityGuid: string
	): Promise<CollaborationContext> {
		try {
			const referenceId = await generateHash({
				accountId: accountId,
				entityGuid: entityGuid,
				nerdletId: this.nerdletId,
				pageId: [errorGroupGuid, this.inboxEntityType],
			});

			const query = `
			mutation {
				collaborationCreateContext(
					accountId: ${accountId}
					contextMetadata: {
						accountId: ${accountId},
						entityGuid: "${entityGuid}",
						nerdletId: "${this.nerdletId}",
						pageId: [
							"${errorGroupGuid}",
							"${this.inboxEntityType}"
						]
					}
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

			const response = await this.graphqlClient.mutate<CollaborationContext>(query);

			return response;
		} catch (ex) {
			ContextLogger.warn("createCollaborationContext failure", {
				accountId,
				errorGroupGuid,
				entityGuid,
				error: ex,
			});

			throw ex;
		}
	}

	@lspHandler(GetErrorInboxCommentsRequestType)
	@log()
	async GetErrorInboxComments(
		request: GetErrorInboxCommentsRequest
	): Promise<GetErrorInboxCommentsResponse> {
		try {
			const { accountId, errorGroupGuid, entityGuid } = { ...request };

			const context = await this.createCollaborationContext(accountId, errorGroupGuid, entityGuid);

			const commentsQuery = `
			{
				actor {
					collaboration {
						threadsByContextId(contextId: "${context.collaborationCreateContext.id}") {
							entities {
								comments {
									entities {
										mentions {
											type
											mentionableItemId
										}
										body
										creator {
											name
										}
									}
								}
							}
						}
					}
				}
			}`;

			const response = await this.graphqlClient.query(commentsQuery);

			return context;
		} catch (ex) {
			ContextLogger.warn("createCollaborationContext failure", {
				request,
				error: ex,
			});
			return { error: mapNRErrorResponse(ex) };
		}
	}
}
