import { CollaborationComment } from "@codestream/protocols/agent";

export type Discussion = {
	comments: CollaborationComment[];
	threadId: string;
};
