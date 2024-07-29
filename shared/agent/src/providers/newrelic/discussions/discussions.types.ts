import { CollaborationComment } from "@codestream/protocols/agent";

export interface BaseCollaborationResponse {
	[key: string]: {
		id: string;
	};
}

export interface CollaborationCreateCommentResponse {
	collaborationCreateComment: CollaborationComment;
}

export interface CollaborationContextMetadata {
	accountId: number;
	entityGuid: string;
	nerdletId: string;
	id: string;
}

export interface CollaborationContext {
	id: string;
	metaData: CollaborationContextMetadata;
}

export interface BootStrapResponse {
	threadId: string;
	context: CollaborationContext;
}

export interface CommentsByThreadIdResponse {
	actor: {
		collaboration: {
			commentsByThreadId: {
				totalCount?: number;
				nextCursor?: string;
				entities: CollaborationComment[];
			};
		};
	};
}

export interface CommentByCommentIdResponse {
	actor: {
		collaboration: {
			commentById: CollaborationComment;
		};
	};
}

export interface ThreadsType {
	deactivated: boolean;
	id: string;
	latestCommentTime: number;
	status: string;
}

export interface ThreadsByContextIdResponse {
	actor: {
		collaboration: {
			threadsByContextId: {
				nextCursor?: string;
				totalCount?: number;
				entities: ThreadsType[];
			};
		};
	};
}

export interface GrokMessage {
	messageId: string;

	messages?: {
		card?: string;
		content?: string;
		role?: string;
	}[];
}

export interface GrokMessagesByIds {
	actor: {
		collaboration: {
			grokMessagesByIds: {
				card?: string;
				content?: string;
				role?: string;
			}[];
		};
	};
}

export interface WebsocketConnectUrl {
	NRConnectionId: string;
	url: string;
}

export interface WebsocketInfoResponse {
	actor: {
		collaboration: {
			webSocketConnectUrl: WebsocketConnectUrl;
		};
	};
}
