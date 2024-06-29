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
	InitiateNrAiRequest,
	InitiateNrAiRequestType,
	InitiateNrAiResponse,
	UpdateCollaborationCommentRequest,
	UpdateCollaborationCommentRequestType,
	UpdateCollaborationCommentResponse,
} from "../../../../../util/src/protocol/agent/agent.protocol.providers";
import { log } from "../../../system/decorators/log";
import { lsp, lspHandler } from "../../../system/decorators/lsp";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import { generateHash } from "./discussions.utils";
import { mapNRErrorResponse, parseId } from "../utils";
import {
	CommentsByThreadIdResponse,
	ThreadsByContextIdResponse,
	BootStrapResponse,
	BaseCollaborationResponse,
	CollaborationContext,
} from "./discussions.types";

@lsp
export class DiscussionsProvider {
	constructor(private graphqlClient: NewRelicGraphqlClient) {
		this.graphqlClient.addHeader("Nerd-Graph-Unsafe-Experimental-Opt-In", "Collaboration,Grok");
	}

	/**
	 * For a given comment by its ID, update the body of the comment.
	 *
	 * @param {UpdateCollaborationCommentRequest} request
	 * @returns a promise that includes the comment's ID, which you'll already have.
	 */
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

			return { nrError: mapNRErrorResponse(ex) };
		}
	}

	/**
	 * For a given comment ID, delete the comment.
	 *
	 * Note, this doesn't _actually_ delete it, but rather deactivates it.
	 *
	 * @param {DeleteCollaborationCommentRequest} request
	 * @returns a promise that includes the deleted comment's ID, which you'll already have.
	 */
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

			return { nrError: mapNRErrorResponse(ex) };
		}
	}

	/**
	 * For a given thread ID, delete the thread.
	 *
	 * Note, this doesn't _actually_ delete it, but rather deactivates it
	 *
	 * @param {DeleteCollaborationThreadRequest} request
	 * @returns a promise that includes the original thread's ID, which you'll already have.
	 */
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

			return { nrError: mapNRErrorResponse(ex) };
		}
	}

	/**
	 * Creates a comment on a given thread.
	 *
	 * @param {CreateCollaborationCommentRequest} request
	 * @returns a promise that includes the newly created comment's ID.
	 */
	@lspHandler(CreateCollaborationCommentRequestType)
	@log()
	async createComment(
		request: CreateCollaborationCommentRequest
	): Promise<CreateCollaborationCommentResponse> {
		try {
			const { threadId, body, errorGroupGuid, entityGuid } = { ...request };

			const context = await this.generateContext(entityGuid, errorGroupGuid);

			const createCommentQuery = `
				mutation {
					collaborationCreateComment(
						body: "${body}",
						threadId: "${threadId}",
						contextMetadata: { 
							accountId: ${context.metaData.accountId},
							entityGuid: "${context.metaData.entityGuid}",
							nerdletId: "${context.metaData.nerdletId}",
							pageId: [
								"${context.metaData.pageId[0]}",
								"${context.metaData.pageId[1]}"
							]
						}
					) {
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

	adjustBodyForNrMarkdown(body: string): string {
		// turn @Eric Jones into <collab... />
		return "";
	}

	/**
	 * Primary endpoint for getting comments for a given error group.
	 * This method will bootstrap the discussion if it doesn't exist, and return the comments.
	 *
	 * @param {GetErrorInboxCommentsRequest} request
	 * @returns a promise that includes the threadId and all the associated comments, in order.
	 */
	@lspHandler(GetErrorInboxCommentsRequestType)
	@log()
	async GetErrorInboxComments(
		request: GetErrorInboxCommentsRequest
	): Promise<GetErrorInboxCommentsResponse> {
		try {
			const bootstrapResponse = await this.bootstrapCollaborationDiscussionForError(
				request.errorGroupGuid,
				request.entityGuid
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
					const modifiedBody = e.body.replace(
						/<collab-mention[^>]*data-value="([^"]+)"[^>]*>[^<]*<\/collab-mention>/g,
						"$1"
					);
					return { ...e, body: modifiedBody };
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

			return { nrError: mapNRErrorResponse(ex) };
		}
	}

	/**
	 * This is called as part of the bootstrapping method, as a thread must exist to add comments, but a user doesn't
	 * need to be concerned with that aspect of it, so we'll just always create one on their behalf if need be.
	 *
	 * @param {string} entityGuid
	 * @param {string} errorGroupGuid
	 * @returns a promise that includes the threadId of the newly created thread.
	 */
	private async createThread(entityGuid: string, errorGroupGuid: string): Promise<string> {
		try {
			const context = await this.generateContext(entityGuid, errorGroupGuid);

			const createThreadQuery = `
				mutation {
					collaborationCreateThread(
						contextId: "${context.id}", 
						contextMetadata: { 
							accountId: ${context.metaData.accountId}, 
							entityGuid: "${context.metaData.entityGuid}",
							nerdletId: "${context.metaData.nerdletId}",
							pageId: [
								"${context.metaData.pageId[0]}",
								"${context.metaData.pageId[1]}"
							]
						}
					) {
						id
					}
				}`;

			const createThreadResponse = await this.graphqlClient.mutate<BaseCollaborationResponse>(
				createThreadQuery
			);

			const updateThreadStatusQuery = `
				mutation {
					collaborationUpdateThreadStatus(
						id: "${createThreadResponse.collaborationCreateThread.id}"
						status: OPEN
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
				errorGroupGuid,
				entityGuid,
				error: ex,
			});

			throw ex;
		}
	}

	/**
	 * Most, but not all, mutations require a context to be passed in.
	 * This method generates that context for a given entityGuid and errorGroupGuid.
	 *
	 * @param {string} entityGuid
	 * @param {string} errorGroupGuid
	 * @returns a promise that includes the context hash, which is the ID of the context, and the context metadata.
	 */
	private async generateContext(
		entityGuid: string,
		errorGroupGuid: string
	): Promise<CollaborationContext> {
		try {
			const { accountId, domain, type } = { ...parseId(entityGuid) };

			const contextMetadata = {
				accountId: accountId!,
				entityGuid: entityGuid,
				nerdletId: "errors-inbox.error-group-details",
				pageId: [errorGroupGuid, `${domain}-${type}`.toLocaleUpperCase()],
			};

			const contextHash = await generateHash(contextMetadata);

			return {
				id: contextHash,
				metaData: contextMetadata,
			};
		} catch (ex) {
			ContextLogger.warn("generateContext failure", {
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
	 *
	 * @param {string} errorGroupGuid
	 * @param {string} entityGuid
	 * @returns a promise that includes the threadId and the context.
	 */
	private async bootstrapCollaborationDiscussionForError(
		errorGroupGuid: string,
		entityGuid: string
	): Promise<BootStrapResponse> {
		try {
			const context = await this.generateContext(entityGuid, errorGroupGuid);

			const createContextQuery = `
				mutation {
					collaborationCreateContext(
						accountId: ${context.metaData.accountId} 
						entityGuid: "${entityGuid}" 
						id: "${context.id}" 
						contextMetadata: { 
							accountId: ${context.metaData.accountId} 
							entityGuid: "${context.metaData.entityGuid}"
							nerdletId: "${context.metaData.nerdletId}"
							pageId: [
								"${context.metaData.pageId[0]}"
								"${context.metaData.pageId[1]}"
							]
						}
					) {
						id
					}
				}`;

			// the context Id generated from this matches the hash anyway
			await this.graphqlClient.mutate<BaseCollaborationResponse>(createContextQuery);

			const getThreadsQuery = `
				{
					actor {
						collaboration {
							threadsByContextId(contextId: "${context.id}") {
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
				mostRecentThreadId = await this.createThread(entityGuid, errorGroupGuid);
			}

			return {
				threadId: mostRecentThreadId!,
				context: context,
			};
		} catch (ex) {
			ContextLogger.warn("bootstrapCollaborationDiscussion failure", {
				errorGroupGuid,
				entityGuid,
				error: ex,
			});

			throw ex;
		}
	}

	/**
	 * Initializes NRAI for a given thread so that it becomes the first comment
	 *
	 * UNTESTED
	 *
	 * @param {InitiateNrAiRequest} request
	 * @returns {Promise<InitiateNrAiResponse>}
	 */
	@lspHandler(InitiateNrAiRequestType)
	@log()
	async initializeNrAi(request: InitiateNrAiRequest): Promise<InitiateNrAiResponse> {
		try {
			const context = await this.generateContext(request.entityGuid, request.errorGroupGuid);

			const codeMarkId = await this.createCodeMark({
				codeBlock: request.codeBlock,
				fileUri: request.fileUri,
				permalink: request.permalink,
				repo: request.repo,
				sha: request.sha,
			});

			const initiateNrAiQuery = `
				mutation {
					grokCreateGrokInitiatedConversation(
						threadId: ${request.threadId},
						prompt: "As a coding expert I am helpful and very knowledgeable about how to fix errors in code. I will be given errors, stack traces, and code snippets to analyze and fix. Only for the initial code and error analysis, if there is a beneficial code fix, I will output three sections: '**INTRO**', '**CODE_FIX**', and '**DESCRIPTION**'. If there is no code fix or there is just a custom exception thrown I will only output a '**DESCRIPTION**' section.\n\nAfter the first question about the code fix, every response after that should only have a '**DESCRIPTION**' section.\n\nThe output for each section should be markdown formatted.",
						contextMetadata: { 
							accountId: ${context.metaData.accountId},
							entityGuid: "${context.metaData.entityGuid}",
							nerdletId: "${context.metaData.nerdletId}",
							codemarkId: "${codeMarkId}",
							pageId: [
								"${context.metaData.pageId[0]}",
								"${context.metaData.pageId[1]}"
							]
						}
					) 
					{
						id
					}
				}`;

			const initiateNrAiResponse = await this.graphqlClient.query<BaseCollaborationResponse>(
				initiateNrAiQuery
			);

			return { commentId: initiateNrAiResponse.grokCreateGrokInitiatedConversation.id };
		} catch (ex) {
			ContextLogger.warn("initializeNrAi failure", {
				request,
				error: ex,
			});

			return { nrError: mapNRErrorResponse(ex) };
		}
	}

	/**
	 * Creates a codemark for a given code block to be used with NRAI
	 *
	 * UNTESTED
	 *
	 * @param {CreateCodeMarkRequest} request
	 * @returns {Promise<string>}
	 */
	private async createCodeMark(request: {
		codeBlock: string;
		fileUri: string;
		permalink: string;
		repo: string;
		sha: string;
	}): Promise<string> {
		try {
			const createCodeMarkQuery = `
				mutation {
					collaborationCreateCodeMark(
						code: "${request.codeBlock}"
						file: "${request.fileUri}"
						permalink: "${request.permalink}"
						repo: "${request.repo}"
						sha: "${request.sha}") {
						id
					}
				}`;

			const createCodeMarkResponse = await this.graphqlClient.mutate<BaseCollaborationResponse>(
				createCodeMarkQuery
			);

			return createCodeMarkResponse.collaborationCreateCodeMark.id;
		} catch (ex) {
			ContextLogger.warn("createCodeMark failure", {
				request,
				error: ex,
			});

			throw ex;
		}
	}
}
