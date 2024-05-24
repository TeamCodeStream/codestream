export interface CollaborationCreateContextResponse {
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

export interface CollaborationCreateThreadResponse {
	collaborationCreateThread: {
		id: string;
	};
}

export interface CollaborationUpdateThreadStatusResponse {
	collaborationUpdateThreadStatus: {
		id: string;
	};
}
