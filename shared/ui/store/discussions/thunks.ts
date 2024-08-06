import { GetCollaborationCommentRequestType } from "@codestream/protocols/agent";
import { HostApi } from "@codestream/webview/webview-api";
import { createAppAsyncThunk } from "../helper";
import { addComment, CommentMsg } from "./discussionsSlice";

export const fetchComment = createAppAsyncThunk<void, CommentMsg>(
	"comments/fetchComment",
	async (commentMsg, { getState, dispatch }) => {
		const { discussions } = getState();

		if (!discussions.activeDiscussion) return;

		// got a comment for a completely different thread; bail
		if (discussions.activeDiscussion.threadId !== commentMsg.meta.threadId) return;

		// grok streams handled by appendStreamingResponse; bail
		if (commentMsg.meta.body.includes("GROK_RESPONSE")) {
			return;
		}

		const comment = discussions.activeDiscussion.comments.find(
			comment => comment.id === commentMsg.id
		);

		// comment already added; bail
		if (comment) return;

		const response = await HostApi.instance.send(GetCollaborationCommentRequestType, {
			commentId: commentMsg.id,
		});

		if (response.nrError) {
			console.error(response.nrError);
			return;
		}

		if (!response.comment) {
			console.error("No comment found");
			return;
		}

		if (response.comment.creator.userId === "0") {
			// not an error, but we don't want to show these
			return;
		}

		if (response.comment.systemMessageType) {
			// not an error, but we don't want to show these
			return;
		}

		dispatch(addComment(response.comment));
	}
);
