export interface CollaborationContext {
	collaborationCreateContext: {
		accountId: number;
		contextMetadata: {
			accountId: number;
			entityGuid: string;
			nerdletId: string;
			pageId: string[];
		};
		createdAt: string;
		creatorId: string;
		deactived: boolean;
		entityGuid: string;
		id: string;
		latestThreadCommentCreatorId: string;
		latestThreadCommentId: string;
		latestThreadCommentTime: string;
		latestThreadId: string;
		modifiedAt: string;
		organizationId: string;
		referenceUrl: string;
	};
}
