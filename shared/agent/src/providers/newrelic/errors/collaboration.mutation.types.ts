export interface CreateContextResponse {
	collaborationCreateContext: {
		accountId: number;
		contextMetadata: {
			accountId: number;
			entityGuid: string;
			nerdletId: string;
			pageId: string[];
		};
		id: string;
		latestThreadCommentId: string;
		latestThreadId: string;
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
