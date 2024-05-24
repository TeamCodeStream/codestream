export interface BootStrapResponse {
	contextId: string;
	threadId: string;
}

export interface CreateContextResponse {
	collaborationCreateContext: {
		id: string;
	};
}

export interface CreateThreadResponse {
	collaborationCreateThread: {
		id: string;
	};
}

export interface UpdateThreadStatusResponse {
	collaborationUpdateThreadStatus: {
		id: string;
	};
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
