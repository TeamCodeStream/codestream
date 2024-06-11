import { ContextLogger } from "providers/contextLogger";
import {
	CreateCollaborationCommentRequest,
	CreateCollaborationCommentRequestType,
	CreateCollaborationCommentResponse,
	DeleteCollaborationCommentRequest,
	DeleteCollaborationCommentRequestType,
	DeleteCollaborationCommentResponse,
	DeleteCollaborationThreadRequest,
	DeleteCollaborationThreadRequestType,
	DeleteCollaborationThreadResponse,
	GetErrorInboxCommentsRequest,
	GetErrorInboxCommentsRequestType,
	GetErrorInboxCommentsResponse,
	UpdateCollaborationCommentRequest,
	UpdateCollaborationCommentRequestType,
	UpdateCollaborationCommentResponse,
} from "../../../../../util/src/protocol/agent/agent.protocol.providers";
import { log } from "../../../system/decorators/log";
import { lsp, lspHandler } from "../../../system/decorators/lsp";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import { generateHash } from "./collabDiscussionUtils";
import { mapNRErrorResponse } from "../utils";
import {
	CommentsByThreadIdResponse,
	ThreadsByContextIdResponse,
	BootStrapResponse,
	BaseCollaborationResponse,
} from "./collaboration.types";

@lsp
export class CollaborationTeamProvider {
	constructor(private graphqlClient: NewRelicGraphqlClient) {
		this.graphqlClient.addHeader("Nerd-Graph-Unsafe-Experimental-Opt-In", "Collaboration");
	}

	@lspHandler(UpdateCollaborationCommentRequestType)
	@log()
	async updateCollaborationComment(
		request: UpdateCollaborationCommentRequest
	): Promise<UpdateCollaborationCommentResponse> {
		try {
			const { commentId, body } = { ...request };

			const updateCommentQuery = `
				mutation {
					collaborationUpdateComment(id: "${commentId}", body: "${body}") {
						id
					}
				}`;

			const updateCommentResponse = await this.graphqlClient.mutate<BaseCollaborationResponse>(
				updateCommentQuery
			);

			return {
				commentId: updateCommentResponse.collaborationUpdateComment.id,
			};
		} catch (ex) {
			ContextLogger.warn("updateCollaborationComment failure", {
				request,
				error: ex,
			});

			return { error: mapNRErrorResponse(ex) };
		}
	}

	@lspHandler(DeleteCollaborationCommentRequestType)
	@log()
	async deleteCollaborationComment(
		request: DeleteCollaborationCommentRequest
	): Promise<DeleteCollaborationCommentResponse> {
		try {
			const commentId = request.commentId;

			const deleteCommentQuery = `
				mutation {
					collaborationDeactivateComment(id: "${commentId}") {
						id
					}
				}`;

			const deleteCommentResponse = await this.graphqlClient.mutate<BaseCollaborationResponse>(
				deleteCommentQuery
			);

			return {
				commentId: deleteCommentResponse.collaborationDeactivateComment.id,
			};
		} catch (ex) {
			ContextLogger.warn("deleteCollaborationComment failure", {
				request,
				error: ex,
			});

			return { error: mapNRErrorResponse(ex) };
		}
	}

	@lspHandler(DeleteCollaborationThreadRequestType)
	@log()
	async deleteCollaborationThread(
		request: DeleteCollaborationThreadRequest
	): Promise<DeleteCollaborationThreadResponse> {
		try {
			const threadId = request.threadId;

			const deleteThreadQuery = `
				mutation {
					collaborationDeactivateThread(id: "${threadId}") {
						id
					}
				}`;

			const deleteThreadResponse = await this.graphqlClient.mutate<BaseCollaborationResponse>(
				deleteThreadQuery
			);

			return {
				threadId: deleteThreadResponse.collaborationDeactivateThread.id,
			};
		} catch (ex) {
			ContextLogger.warn("deleteCollaborationThread failure", {
				request,
				error: ex,
			});

			return { error: mapNRErrorResponse(ex) };
		}
	}

	@lspHandler(CreateCollaborationCommentRequestType)
	@log()
	async createComment(
		request: CreateCollaborationCommentRequest
	): Promise<CreateCollaborationCommentResponse> {
		try {
			const { threadId, body } = { ...request };

			// TODO :
			// If threadId is undefined
			// bootstrap a new thread?

			const createCommentQuery = `
				mutation {
					collaborationCreateComment(body: "${body}", threadId: "${threadId}") {
						id
					}
				}`;

			const createCommentResponse = await this.graphqlClient.mutate<BaseCollaborationResponse>(
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
	): Promise<string> {
		try {
			const createThreadQuery = `
				mutation {
					collaborationCreateThread(contextId: "${contextId}") {
						id
					}
				}`;

			const createThreadResponse = await this.graphqlClient.mutate<BaseCollaborationResponse>(
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

			const updateThreadResponse = await this.graphqlClient.mutate<BaseCollaborationResponse>(
				updateThreadStatusQuery
			);

			return updateThreadResponse.collaborationUpdateThreadStatus.id;
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

			const createContextResponse = await this.graphqlClient.mutate<BaseCollaborationResponse>(
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
				mostRecentThreadId = await this.createThread(
					contextId,
					accountId,
					entityGuid,
					errorGroupGuid
				);
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
									deactivated
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
				.filter(e => e.deactivated === false)
				.filter(e => e.creator.userId != 0)
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

			return { NrError: mapNRErrorResponse(ex) };
		}
	}
}
