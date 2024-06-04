import { ContextLogger } from "providers/contextLogger";
import {
	CreateCollaborationCommentRequest,
	CreateCollaborationCommentRequestType,
	CreateCollaborationCommentResponse,
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
	CreateCommentResponse,
} from "./collaboration.types";

@lsp
export class CollaborationTeamProvider {
	constructor(private graphqlClient: NewRelicGraphqlClient) {
		this.graphqlClient.addHeader("Nerd-Graph-Unsafe-Experimental-Opt-In", "Collaboration");
	}

	@lspHandler(CreateCollaborationCommentRequestType)
	@log()
	async createComment(
		request: CreateCollaborationCommentRequest
	): Promise<CreateCollaborationCommentResponse> {
		try {
			const { threadId, body } = { ...request };

			const createCommentQuery = `
				mutation {
					collaborationCreateComment(body: "${body}", threadId: "${threadId}") {
						id
					}
				}`;

			const createCommentResponse = await this.graphqlClient.mutate<CreateCommentResponse>(
				createCommentQuery
			);

			return {
				commentId: createCommentResponse.collaborationCreateComment.id,
			};
		} catch (ex) {
			ContextLogger.warn("createComment failure", {
				request,
				error: ex,
			});

			throw ex;
		}
	}
	/**
	 * This is called as part of the bootstrapping method, as a thread must exist to add comments, but a user doesn't
	 * need to be concerned with that aspect of it, so we'll just always create one on their behalf if need be.
	 */
	private async createThread(
		contextId: string,
		accountId: number,
		entityGuid: string,
		errorGroupGuid: string
	): Promise<UpdateThreadStatusResponse> {
		try {
			const createThreadQuery = `
				mutation {
					collaborationCreateThread(contextId: "${contextId}") {
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

	/**
	 * When the IDE calls for comments for a given error group, we need to ensure certain criteria are met and exist.
	 * This method exists and handles all the bootstrapping; use it in between ANY calls to get comments.
	 */
	private async bootstrapCollaborationDiscussionForError(
		accountId: number,
		errorGroupGuid: string,
		entityGuid: string
	): Promise<BootStrapResponse> {
		try {
			const contextId = await generateHash({
				accountId: accountId,
				entityGuid: entityGuid,
				nerdletId: "errors-inbox.error-group-details",
				pageId: [errorGroupGuid, "WORKLOAD"],
			});

			const createContextQuery = `
				mutation {
					collaborationCreateContext(id: "${contextId}") {
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
							threadsByContextId(contextId: "${contextId}") {
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
				const thread = await this.createThread(contextId, accountId, entityGuid, errorGroupGuid);
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

			const bootstrapResponse = await this.bootstrapCollaborationDiscussionForError(
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
				threadId: bootstrapResponse.threadId,
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
