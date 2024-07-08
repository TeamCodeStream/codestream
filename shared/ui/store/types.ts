import { CSCollaborationComment } from "@codestream/webview/store/discussions/discussionsSlice";

export type Discussion = {
	comments: CSCollaborationComment[];
	threadId: string;
};
