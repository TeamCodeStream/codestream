import { ContextLogger } from "../../contextLogger";
import {
	CloseCollaborationThreadRequest,
	CloseCollaborationThreadRequestType,
	CloseCollaborationThreadResponse,
	CollaborationComment,
	CreateCollaborationCommentRequest,
	CreateCollaborationCommentRequestType,
	CreateCollaborationCommentResponse,
	DeleteCollaborationCommentRequest,
	DeleteCollaborationCommentRequestType,
	DeleteCollaborationCommentResponse,
	GetCollaborationCommentRequest,
	GetCollaborationCommentRequestType,
	GetCollaborationCommentResponse,
	GetCollaborationWebsocketInfoRequestType,
	GetErrorInboxCommentsRequest,
	GetErrorInboxCommentsRequestType,
	GetErrorInboxCommentsResponse,
	InitiateNrAiRequest,
	InitiateNrAiRequestType,
	InitiateNrAiResponse,
	UpdateCollaborationCommentRequest,
	UpdateCollaborationCommentRequestType,
	UpdateCollaborationCommentResponse,
} from "@codestream/protocols/agent";
import { log } from "../../../system/decorators/log";
import { lsp, lspHandler } from "../../../system/decorators/lsp";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import { generateHash } from "./discussions.utils";
import { mapNRErrorResponse, parseId } from "../utils";
import {
	BaseCollaborationResponse,
	BootStrapResponse,
	CollaborationContext,
	CollaborationContextMetadata,
	CollaborationCreateCommentResponse,
	CommentByCommentIdResponse,
	CommentsByThreadIdResponse,
	GrokMessage,
	GrokMessagesByIds,
	ThreadsByContextIdResponse,
	WebsocketConnectUrl,
	WebsocketInfoResponse,
} from "./discussions.types";
import * as htmlparser2 from "htmlparser2";
import { Logger } from "../../../logger";

const MAX_MENTIONS = 50;

@lsp
export class DiscussionsProvider {
	// TODO fix brittleness - relies on the properties of the collab-mention tag being in the right order...
	private collabTagRegex =
		/<collab-mention.*?data-type="(NR_USER|FILE|NR_BOT)".*?<\/collab-mention>/ims;
	private grokResponseRegExp =
		/<collab-mention data-type="GROK_RESPONSE" data-mentionable-item-id="([A-za-z0-9-]+)"\/>/gim;

	constructor(private graphqlClient: NewRelicGraphqlClient) {
		this.graphqlClient.addHeader("Nerd-Graph-Unsafe-Experimental-Opt-In", "Collaboration,Grok");
	}

	@lspHandler(GetCollaborationWebsocketInfoRequestType)
	@log()
	public async getWebsocketInfo(): Promise<WebsocketConnectUrl | undefined> {
		const wsQuery = `{
			actor {
				collaboration {
					webSocketConnectUrl {
						NRConnectionId
						url
					}
				}
			}
		}`;
		try {
			const response = await this.graphqlClient.query<WebsocketInfoResponse>(wsQuery);
			if (response?.actor?.collaboration?.webSocketConnectUrl?.url) {
				const websocketInfo = response.actor.collaboration.webSocketConnectUrl;
				ContextLogger.debug("getWebsocketInfo success", websocketInfo);
				return websocketInfo;
			} else {
				ContextLogger.warn("getWebsocketInfo failed to get websocket url", response);
			}
		} catch (e) {
			ContextLogger.warn("getWebsocketInfo error", e);
		}
		return undefined;
	}

	/**
	 * For a given comment by its ID, update the body of the comment.
	 *
	 * @param request `UpdateCollaborationCommentRequest`
	 * @returns `Promise<UpdateCollaborationCommentResponse>`
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
	 * UNUSED
	 *
	 * @param request `DeleteCollaborationCommentRequest`
	 * @returns `Promise<DeleteCollaborationCommentResponse>`
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
	 * For a given thread ID, closes the thread.
	 *
	 * @param request `CloseCollaborationThreadRequest`
	 * @returns `Promise<CloseCollaborationThreadResponse>`
	 */
	@lspHandler(CloseCollaborationThreadRequestType)
	@log()
	async closeCollaborationThread(
		request: CloseCollaborationThreadRequest
	): Promise<CloseCollaborationThreadResponse> {
		try {
			const updateThreadStatusQuery = `
				mutation($threadId: ID!) {
					collaborationUpdateThreadStatus(
						id: $threadId
						status: CLOSED
					) {
						id
					}
				}`;

			const updateThreadResponse = await this.graphqlClient.mutate<BaseCollaborationResponse>(
				updateThreadStatusQuery,
				{
					threadId: request.threadId,
				}
			);

			if (!updateThreadResponse.collaborationUpdateThreadStatus.id) {
				throw new Error("Failed to close thread");
			}

			return {
				success: true,
			};
		} catch (ex) {
			ContextLogger.warn("closeCollaborationThread failure", {
				request,
				error: ex,
			});

			return { nrError: mapNRErrorResponse(ex) };
		}
	}

	/**
	 * Creates a comment on a given thread.
	 *
	 * @param request `CreateCollaborationCommentRequest`
	 * @returns `Promise<CreateCollaborationCommentResponse>`
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
				mutation($body: String!, $threadId: ID!, $context: CollaborationRawContextMetadata!) {
					collaborationCreateComment(
						body: $body
						assistant: "nrai:codestream"
						threadId: $threadId
						contextMetadata: $context
					) {
						id
						body
						createdAt
						deactivated
						systemMessageType
						creator {
							email
							name
							userId
						}
					}
				}`;

			const createCommentResponse =
				await this.graphqlClient.mutate<CollaborationCreateCommentResponse>(createCommentQuery, {
					body,
					threadId,
					context: context.metaData,
				});

			await this.parseComment(createCommentResponse.collaborationCreateComment);
			return {
				comment: createCommentResponse.collaborationCreateComment,
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
	 * Retrives a single comment by the given ID
	 *
	 * @param request `GetCollaborationCommentRequest`
	 * @returns `Promise<GetCollaborationCommentResponse>`
	 */
	@lspHandler(GetCollaborationCommentRequestType)
	@log()
	async getSingleCommentById(
		request: GetCollaborationCommentRequest
	): Promise<GetCollaborationCommentResponse> {
		try {
			const getSingleCommentQuery = `
			query($commentId: ID!) {
				actor {
					collaboration {
						commentById(id: $commentId) {
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
			}`;

			const getSingleCommentResponse = await this.graphqlClient.query<CommentByCommentIdResponse>(
				getSingleCommentQuery,
				{
					commentId: request.commentId,
				}
			);

			let comment = getSingleCommentResponse.actor.collaboration.commentById;

			comment = await this.parseComment(comment);

			return {
				comment: comment,
			};
		} catch (ex) {
			ContextLogger.warn("getSingleCommentById failure", {
				request,
				error: ex,
			});

			return { nrError: mapNRErrorResponse(ex) };
		}
	}

	/**
	 * Primary endpoint for getting comments for a given error group.
	 * This method will bootstrap the discussion if it doesn't exist, and return the comments.
	 *
	 * @param request `GetErrorInboxCommentsRequest`
	 * @returns `Promise<GetErrorInboxCommentsResponse>`
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

			let allCommentEntities: CollaborationComment[] = [];

			const initialCommentsQuery = `
					query($threadId: ID!) {
						actor {
							collaboration {
								commentsByThreadId(threadId: $threadId, first: 50) {
									nextCursor
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

			const initialCommentsResponse = await this.graphqlClient.query<CommentsByThreadIdResponse>(
				initialCommentsQuery,
				{
					threadId: bootstrapResponse.threadId,
				}
			);

			allCommentEntities = allCommentEntities.concat(
				initialCommentsResponse.actor.collaboration.commentsByThreadId.entities
			);

			let nextCursor = initialCommentsResponse.actor.collaboration.commentsByThreadId.nextCursor;

			// should only happen if there are more than 50 comments
			while (nextCursor) {
				const additionalCommentsQuery = `
					query($threadId: ID!, $nextCursor: String!) {
						actor {
							collaboration {
								commentsByThreadId(threadId: $threadId, first: 50, nextCursor: $nextCursor) {
									nextCursor
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

				const additionalCommentsResponse =
					await this.graphqlClient.query<CommentsByThreadIdResponse>(additionalCommentsQuery, {
						threadId: bootstrapResponse.threadId,
						nextCursor: nextCursor,
					});

				allCommentEntities = allCommentEntities.concat(
					additionalCommentsResponse.actor.collaboration.commentsByThreadId.entities
				);

				nextCursor = additionalCommentsResponse.actor.collaboration.commentsByThreadId.nextCursor;
			}

			const commentEntities = allCommentEntities
				.filter(e => !e.systemMessageType)
				.filter(e => e.deactivated === false)
				.sort((e1, e2) => parseInt(e1.createdAt) - parseInt(e2.createdAt));

			for (let commentEntity of commentEntities) {
				commentEntity = await this.parseComment(commentEntity);
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

	/**
	 * Initializes NRAI for a given thread so that it becomes the first comment
	 *
	 * @param request `InitiateNrAiRequest`
	 * @returns `Promise<InitiateNrAiResponse>`
	 */
	@lspHandler(InitiateNrAiRequestType)
	@log()
	async initializeNrAi(request: InitiateNrAiRequest): Promise<InitiateNrAiResponse> {
		try {
			const context = await this.generateContext(request.entityGuid, request.errorGroupGuid);

			const initiateNrAiQuery = `
				mutation($threadId: ID!, $prompt:String!, $context: GrokRawContextMetadata!) {
					grokCreateGrokInitiatedConversation(
						threadId: $threadId
						assistant: "nrai:codestream"
						prompt: $prompt
						context: $context
					) 
					{
						id
					}
				}`;

			let prompt =
				"As a coding expert I am helpful and very knowledgeable about how to fix errors in code. I will be given errors, stack traces, and code snippets to analyze and fix. Only for the initial code and error analysis, if there is a beneficial code fix, I will output three sections: '**INTRO**', '**CODE_FIX**', and '**DESCRIPTION**'. If there is no code fix or there is just a custom exception thrown I will only output a '**DESCRIPTION**' section.\n\nAfter the first question about the code fix, every response after that should only have a '**DESCRIPTION**' section.\n\nThe output for each section should be markdown formatted.";

			if (request.language) {
				prompt += `\n\n\ncoding language: ${request.language}`;
			}

			prompt += `\n\nAnalyze this stack trace:\n\`\`\`\n${request.errorText}\n${request.stackTrace}\n\`\`\``;

			if (request.codeBlock) {
				prompt += `\n\nAnd fix the following code, but only if a fix is truly needed:\n\`\`\`\n${request.codeBlock}\n\`\`\``;
			}

			const initiateNrAiResponse = await this.graphqlClient.mutate<BaseCollaborationResponse>(
				initiateNrAiQuery,
				{
					threadId: request.threadId,
					prompt: prompt,
					context: context,
				}
			);

			if (!initiateNrAiResponse.grokCreateGrokInitiatedConversation.id) {
				throw new Error("Failed to initialize NRAI");
			}

			return {
				commentId: initiateNrAiResponse.grokCreateGrokInitiatedConversation.id,
			};
		} catch (ex) {
			ContextLogger.warn("initializeNrAi failure", {
				request,
				error: ex,
			});

			return { nrError: mapNRErrorResponse(ex) };
		}
	}

	/**
	 * For a given messageId, found in the mention of a comment, retrieve the grok messages.
	 *
	 * @param grokMessageId `string`
	 * @returns `Promise<GrokMessage>`
	 */
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
	 * Helper method which chains all individual helper functions responsible
	 * for parsing a comment of any mentions, grok messages, files, or special formatting.
	 *
	 * This method should be called for every comment we want to display to the user.
	 *
	 * @param comment `CollaborationComment`
	 * @returns `Promise<CollaborationComment>`
	 */
	private async parseComment(comment: CollaborationComment): Promise<CollaborationComment> {
		comment = this.stripComment(comment);
		comment = this.parseCommentForMentions(comment);
		comment = await this.parseCommentForGrok(comment);

		return comment;
	}

	/**
	 * Use `parseComment` instead of this method directly
	 *
	 * Cleans up any fluff in the actual message body.
	 *
	 * @param comment `CollaborationComment`
	 * @returns `CollaborationComment`
	 */
	private stripComment(comment: CollaborationComment): CollaborationComment {
		// strip trailing <br> from the message body
		if (comment.body.endsWith("<br>")) {
			comment.body = comment.body.substring(0, comment.body.length - 4);
		}

		return comment;
	}

	/**
	 * Use `parseComment` instead of this method directly
	 *
	 * Transforms any mentions in the comment body to just the name of the user.
	 *
	 * @param comment `CollaborationComment`
	 * @returns `CollaborationComment`
	 */
	public parseCommentForMentions(comment: CollaborationComment): CollaborationComment {
		let match: RegExpExecArray | null;
		let i = 0;

		while ((match = this.collabTagRegex.exec(comment.body)) !== null) {
			match?.forEach(e => {
				const dom = htmlparser2.parseDocument(e);
				const element = htmlparser2.DomUtils.findOne(
					elem => elem.type === htmlparser2.ElementType.Tag && elem.name === "collab-mention",
					dom.children,
					true
				);

				if (!element) {
					return;
				}

				const dataType = htmlparser2.DomUtils.getAttributeValue(element, "data-type");
				switch (dataType) {
					case "NR_USER":
					case "NR_BOT":
						const dataValue = htmlparser2.DomUtils.getAttributeValue(element, "data-value");
						if (dataValue) {
							comment.body = comment.body.replace(e, dataValue + " ");
						} else {
							// if we failed to find the data-value, we still have to strip the mention
							// so we don't end up in an infinite loop.
							comment.body = comment.body.replace(e, " ");
						}
						break;
					case "FILE":
						comment.body = comment.body.replace(
							e,
							`(screenshot attached; viewable through New Relic One)\n`
						);
						break;
					default:
						Logger.log(`Unknown mention type ${dataType}`);
						comment.body = comment.body.replace(e, "(unknown mention type)");
						break;
				}
			});
			i++;
			if (i > MAX_MENTIONS) {
				// If a replacement isn't made fore some reason this will infinite loop, this is a safeguard.
				break;
			}
		}

		return comment;
	}

	/**
	 * Use `parseComment` instead of this method directly
	 *
	 * For a given comment, if it contains a grok mention, retrieve the grok messages
	 * and replace the comment body with them.
	 *
	 * @param comment `CollaborationComment`
	 * @returns `Promise<CollaborationComment>`
	 */
	private async parseCommentForGrok(comment: CollaborationComment): Promise<CollaborationComment> {
		const grokMatch = new RegExp(this.grokResponseRegExp).exec(comment.body);

		if (!grokMatch) {
			return comment;
		}

		const grokCommentId = grokMatch[1];
		const grokMessagesForId = await this.getGrokMessages(grokCommentId);

		comment.body =
			grokMessagesForId.messages
				?.map(m => {
					return `${m.content}`;
				})
				.join("\n\n") ?? "";
		comment.creator.name = "AI";
		comment.creator.userId = -1;

		return comment;
	}

	/**
	 * This is called as part of the bootstrapping method, as a thread must exist to add comments, but a user doesn't
	 * need to be concerned with that aspect of it, so we'll just always create one on their behalf if need be.
	 *
	 * @param entityGuid `string`
	 * @param errorGroupGuid `string`
	 * @returns `Promise<string>`
	 */
	private async createThread(entityGuid: string, errorGroupGuid: string): Promise<string> {
		try {
			const context = await this.generateContext(entityGuid, errorGroupGuid);

			const createThreadQuery = `
				mutation($contextId: ID!, $contextMetadata: CollaborationRawContextMetadata!) {
					collaborationCreateThread(
						contextId: $contextId 
						contextMetadata: $contextMetadata
						visibility: "PUBLIC"
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

			return createThreadResponse.collaborationCreateThread.id;
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
	 * @param entityGuid `string`
	 * @param errorGroupGuid `string`
	 * @returns `Promise<CollaborationContext>`
	 */
	private async generateContext(
		entityGuid: string,
		errorGroupGuid: string
	): Promise<CollaborationContext> {
		try {
			const accountId = parseId(entityGuid)!.accountId;

			const contextMetadata: CollaborationContextMetadata = {
				accountId: accountId!,
				entityGuid: entityGuid,
				nerdletId: "errors-inbox.error-group-details",
				id: errorGroupGuid,
			};

			const contextHash = await generateHash({
				accountId: accountId!,
				entityGuid: entityGuid,
				nerdletId: "errors-inbox.error-group-details",

				//id to pageId for the actual hashing
				pageId: errorGroupGuid,
			});

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
	 * @param errorGroupGuid `string`
	 * @param entityGuid `string`
	 * @returns `Promise<BootStrapResponse>`
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
}
