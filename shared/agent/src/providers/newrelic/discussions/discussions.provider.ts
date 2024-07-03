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
	CollaborationContextMetadata,
	GrokMessage,
	GrokMessagesByIds,
} from "./discussions.types";

@lsp
export class DiscussionsProvider {
	private userMentionRegExp =
		/<collab-mention data-type="NR_USER" [^>]*data-value="([^"]+)"[^>]*>[^<]*<\/collab-mention>/gim;
	private grokMentionRegExp =
		/<collab-mention data-type="GROK_RESPONSE" data-mentionable-item-id="(?<messageId>[^"]+)"\/>/gim;

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
				mutation($commentId: ID!, $body: String!) {
					collaborationUpdateComment(id: $commendId body: $body) {
						id
					}
				}`;

			const updateCommentResponse = await this.graphqlClient.mutate<BaseCollaborationResponse>(
				updateCommentQuery,
				{
					commentId,
					body,
				}
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
				mutation($commentId: ID!) {
					collaborationDeactivateComment(id: $commentId) {
						id
					}
				}`;

			const deleteCommentResponse = await this.graphqlClient.mutate<BaseCollaborationResponse>(
				deleteCommentQuery,
				{
					commentId,
				}
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
				mutation($threadId: ID!) {
					collaborationDeactivateThread(id: $threadId) {
						id
					}
				}`;

			const deleteThreadResponse = await this.graphqlClient.mutate<BaseCollaborationResponse>(
				deleteThreadQuery,
				{
					threadId,
				}
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
				mutation($body: String!, $threadId: ID!, $context: GrokRawContextMetadata!) {
					collaborationCreateComment(
						body: $body
						threadId: $threadId
						contextMetadata: $context
					) {
						id
					}
				}`;

			const createCommentResponse = await this.graphqlClient.mutate<BaseCollaborationResponse>(
				createCommentQuery,
				{
					body,
					threadId,
					context: context.metaData,
				}
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
				query($threadId: ID!) {
					actor {
						collaboration {
							commentsByThreadId(threadId: $threadId) {
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

			const response = await this.graphqlClient.query<CommentsByThreadIdResponse>(commentsQuery, {
				threadId: bootstrapResponse.threadId,
			});

			const commentEntities = response.actor.collaboration.commentsByThreadId.entities
				.filter(e => !e.systemMessageType)
				.filter(e => e.deactivated === false)
				.sort((e1, e2) => e1.createdAt - e2.createdAt)
				.map(e => {
					if (this.userMentionRegExp.test(e.body)) {
						const modifiedBody = e.body.replace(this.userMentionRegExp, "$1");

						e.body = modifiedBody;
					}

					return { ...e };
				});

			for (const commentEntity of commentEntities) {
				const grokMatch = this.grokMentionRegExp.exec(commentEntity.body);

				if (!grokMatch) {
					continue;
				}

				const grokCommentId = grokMatch[1];
				const grokMessagesForId = await this.getGrokMessages(grokCommentId);

				commentEntity.body =
					grokMessagesForId.messages
						?.map(m => {
							return `${m.content}`;
						})
						.join("\n\n") ?? "";
				commentEntity.creator.name = "NRAI";
				commentEntity.creator.userId = -1;
			}

			const comments = commentEntities.filter(e => e.creator.userId != 0);

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

	private async getGrokMessages(grokMessageId: string): Promise<GrokMessage> {
		try {
			const getGrokMessagesQuery = `
				query($grokMessageIds: [ID]!){
					actor {
						collaboration {
							grokMessagesByIds(ids: $grokMessageIds) {
								card
								content
								role
							}
						}
					}
				}`;

			const getGrokMessagesResponse = await this.graphqlClient.query<GrokMessagesByIds>(
				getGrokMessagesQuery,
				{
					grokMessageIds: [grokMessageId],
				}
			);

			return {
				messageId: grokMessageId,
				messages: getGrokMessagesResponse.actor.collaboration.grokMessagesByIds,
			};
		} catch (ex) {
			ContextLogger.warn("getGrokMessages failure", {
				grokMessageId,
				error: ex,
			});

			throw ex;
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
				mutation($contextId: ID!, $contextMetadata: CollaborationRawContextMetadata!) {
					collaborationCreateThread(
						contextId: $contextId, 
						contextMetadata: $contextMetadata
					) {
						id
					}
				}`;

			const createThreadResponse = await this.graphqlClient.mutate<BaseCollaborationResponse>(
				createThreadQuery,
				{
					contextId: context.id,
					contextMetadata: context.metaData,
				}
			);

			const updateThreadStatusQuery = `
				mutation($threadId: ID!) {
					collaborationUpdateThreadStatus(
						id: $threadId
						status: OPEN
					) {
						id
					}
				}`;

			const updateThreadResponse = await this.graphqlClient.mutate<BaseCollaborationResponse>(
				updateThreadStatusQuery,
				{
					threadId: createThreadResponse.collaborationCreateThread.id,
				}
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
		errorGroupGuid: string,
		codeMarkId?: string
	): Promise<CollaborationContext> {
		try {
			const { accountId, domain, type } = { ...parseId(entityGuid) };

			const contextMetadata: CollaborationContextMetadata = {
				accountId: accountId!,
				entityGuid: entityGuid,
				nerdletId: "errors-inbox.error-group-details",
				pageId: [errorGroupGuid, `${domain}-${type}`.toLocaleUpperCase()],
			};

			const contextHash = await generateHash(contextMetadata);

			// hash doesn't include codeMarkId, so we only need to add it to the metadata
			if (codeMarkId) {
				contextMetadata["codeMarkId"] = codeMarkId;
			}

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
				mutation($accountId: Int!, $entityGuid: EntityGuid!, $contextId: ID!, $contextMetadata: CollaborationRawContextMetadata!) {
					collaborationCreateContext(
						accountId: $accountId
						entityGuid: $entityGuid
						id: $contextId
						contextMetadata: $contextMetadata
					) {
						id
					}
				}`;

			// the context Id generated from this matches the hash anyway
			await this.graphqlClient.mutate<BaseCollaborationResponse>(createContextQuery, {
				accountId: context.metaData.accountId,
				entityGuid: context.metaData.entityGuid,
				contextId: context.id,
				contextMetadata: context.metaData,
			});

			const getThreadsQuery = `
				query($contextId: ID!){
					actor {
						collaboration {
							threadsByContextId(contextId: $contextId) {
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
				getThreadsQuery,
				{
					contextId: context.id,
				}
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
	 * @param {InitiateNrAiRequest} request
	 * @returns {Promise<InitiateNrAiResponse>}
	 */
	@lspHandler(InitiateNrAiRequestType)
	@log()
	async initializeNrAi(request: InitiateNrAiRequest): Promise<InitiateNrAiResponse> {
		try {
			const codeMarkId = await this.createCodeMark({
				codeBlock: request.codeBlock,
				fileUri: request.fileUri,
				permalink: request.permalink,
				repo: request.repo,
				sha: request.sha,
			});

			const context = await this.generateContext(
				request.entityGuid,
				request.errorGroupGuid,
				codeMarkId
			);

			const initiateNrAiQuery = `
				mutation($threadId: ID!, $prompt:String!, $context: GrokRawContextMetadata!) {
					grokCreateGrokInitiatedConversation(
						threadId: $threadId
						prompt: $prompt 
						context: $context
					) 
					{
						id
					}
				}`;

			const initiateNrAiResponse = await this.graphqlClient.mutate<BaseCollaborationResponse>(
				initiateNrAiQuery,
				{
					threadId: request.threadId,
					prompt:
						"As a coding expert I am helpful and very knowledgeable about how to fix errors in code. I will be given errors, stack traces, and code snippets to analyze and fix. Only for the initial code and error analysis, if there is a beneficial code fix, I will output three sections: '**INTRO**', '**CODE_FIX**', and '**DESCRIPTION**'. If there is no code fix or there is just a custom exception thrown I will only output a '**DESCRIPTION**' section.\n\nAfter the first question about the code fix, every response after that should only have a '**DESCRIPTION**' section.\n\nThe output for each section should be markdown formatted.",
					context: context,
				}
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
				mutation($code:String!, $file:String!, $permalink:String!, $repo:String!, $sha:String!) {
					collaborationCreateCodeMark(
						code: $code
						file: $file
						permalink: $permalink
						repo: $repo
						sha: $sha
					) 
					{
						id
					}
				}`;

			const createCodeMarkResponse = await this.graphqlClient.mutate<BaseCollaborationResponse>(
				createCodeMarkQuery,
				{
					code: request.codeBlock,
					file: request.fileUri,
					permalink: request.permalink,
					repo: request.repo,
					sha: request.sha,
				}
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
