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
import {
	CreateContextResponse,
	CreateThreadResponse,
	UpdateThreadStatusResponse,
	CommentsByThreadIdResponse,
	ThreadsByContextIdResponse,
	BootStrapResponse,
} from "./collaboration.types";

@lsp
export class CollaborationTeamProvider {
	private nerdletId = "errors-inbox.error-group-details";
	private inboxEntityType = "WORKLOAD";
	private referenceUrl = "https://dev-one.newrelic.com/errors-inbox";

	constructor(private graphqlClient: NewRelicGraphqlClient) {
		this.graphqlClient.addHeader("Nerd-Graph-Unsafe-Experimental-Opt-In", "Collaboration");
	}

	private async createThread(
		contextId: string,
		accountId: number,
		entityGuid: string,
		errorGroupGuid: string
	): Promise<UpdateThreadStatusResponse> {
		try {
			const createThreadQuery = `
			mutation {
				collaborationCreateThread(
					contextId: "${contextId}"
					contextMetadata: {
						accountId: ${accountId}, 
						entityGuid: "${entityGuid}", 
						nerdletId: "${this.nerdletId}", 
						pageId: [
							"${errorGroupGuid}", 
							"${this.inboxEntityType}"
						]
					}
					referenceUrl: "${this.referenceUrl}"
				) {
					id
				}
			}`;

			const createThreadResponse = await this.graphqlClient.mutate<CreateThreadResponse>(
				createThreadQuery
			);

			const updateThreadStatusQuery = `
			mutation {
				collaborationUpdateThreadStatus(
					id: ${createThreadResponse.collaborationCreateThread.id},
					status: "OPEN"
				) {
					id
				}
			}`;

			const updateThreadResponse = await this.graphqlClient.mutate<UpdateThreadStatusResponse>(
				updateThreadStatusQuery
			);

			return updateThreadResponse;
		} catch (ex) {
			ContextLogger.warn("createThread failure", {
				contextId,
				accountId,
				errorGroupGuid,
				entityGuid,
				error: ex,
			});

			throw ex;
		}
	}

	private async bootstrapCollaborationDiscussion(
		accountId: number,
		errorGroupGuid: string,
		entityGuid: string
	): Promise<BootStrapResponse> {
		try {
			const referenceId = await generateHash({
				accountId: accountId,
				entityGuid: entityGuid,
				nerdletId: this.nerdletId,
				pageId: [errorGroupGuid, this.inboxEntityType],
			});

			const createContextQuery = `
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
						referenceUrl: "${this.referenceUrl}"
					) 
					{
						id
					}
				}`;

			const createContextResponse = await this.graphqlClient.mutate<CreateContextResponse>(
				createContextQuery
			);

			const getThreadsQuery = `
			{
				actor {
				  collaboration {
					threadsByContextId(contextId: "${createContextResponse.collaborationCreateContext.id}") {
					  entities {
						id
						latestCommentTime
						status
						deactivated
					  }
					}
				  }
				}
			}`;

			const getThreadsResponse = await this.graphqlClient.query<ThreadsByContextIdResponse>(
				getThreadsQuery
			);

			const mostRecentThread =
				getThreadsResponse?.actor?.collaboration?.threadsByContextId?.entities
					.filter(t => t?.deactivated === false && t?.status.toLocaleLowerCase() === "open")
					.sort((t1, t2) => t1?.latestCommentTime - t2?.latestCommentTime)
					.pop();

			let mostRecentThreadId = mostRecentThread?.id;

			if (!mostRecentThread) {
				const thread = await this.createThread(referenceId, accountId, entityGuid, errorGroupGuid);
				mostRecentThreadId = thread.collaborationUpdateThreadStatus.id;
			}

			return {
				contextId: createContextResponse.collaborationCreateContext.id,
				threadId: mostRecentThreadId!,
			};
		} catch (ex) {
			ContextLogger.warn("bootstrapCollaborationDiscussion failure", {
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

			const bootstrapResponse = await this.bootstrapCollaborationDiscussion(
				accountId,
				errorGroupGuid,
				entityGuid
			);

			const commentsQuery = `
			{
				actor {
					collaboration {
						commentsByThreadId(threadId: "${bootstrapResponse.threadId}") {
							entities {
								body
								id
								systemMessageType
								createdAt
								creator {
									email
									name
									userId
								}
							}
						}
					}
				}
			}`;

			const response = await this.graphqlClient.query<CommentsByThreadIdResponse>(commentsQuery);

			const comments = response.actor.collaboration.commentsByThreadId.entities
				.filter(e => !e.systemMessageType)
				.sort((e1, e2) => e1.createdAt - e2.createdAt)
				.map(e => {
					return e;
				});

			return {
				comments,
			};
		} catch (ex) {
			ContextLogger.warn("GetErrorInboxComments failure", {
				request,
				error: ex,
			});

			return { error: mapNRErrorResponse(ex) };
		}
	}
}
