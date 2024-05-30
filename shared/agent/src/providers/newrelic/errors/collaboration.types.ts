interface BaseCollaborationResponse {
	[key: string]: {
		id: string;
	};
}

// In most cases such as these, all we really care about getting back is the ID
// of the thing that was created.
export interface CreateContextResponse extends BaseCollaborationResponse {}
export interface CreateThreadResponse extends BaseCollaborationResponse {}
export interface UpdateThreadStatusResponse extends BaseCollaborationResponse {}
export interface CreateCommentResponse extends BaseCollaborationResponse {}

export interface BootStrapResponse {
	contextId: string;
	threadId: string;
}

export interface CommentsByThreadIdResponse {
	actor: {
		collaboration: {
			commentsByThreadId: {
				entities: {
					body: string;
					id: string;
					systemMessageType: string;
					createdAt: number;
					creator: {
						email: string;
						name: string;
						userId: string;
					};
				}[];
			};
		};
	};
}

export interface ThreadsByContextIdResponse {
	actor: {
		collaboration: {
			threadsByContextId: {
				entities: {
					deactivated: boolean;
					id: string;
					latestCommentTime: number;
					status: string;
				}[];
			};
		};
	};
}
