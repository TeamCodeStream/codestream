import { GetCollaborationCommentRequestType } from "@codestream/protocols/agent";
import { HostApi } from "@codestream/webview/webview-api";
import { createAppAsyncThunk } from "../helper";
import { addComment, CommentMsg } from "./discussionsSlice";

export const fetchComment = createAppAsyncThunk<void, CommentMsg>(
	"comments/fetchComment",
	async (commentMsg, { getState, dispatch }) => {
		const { discussions } = getState();

		if (!discussions.activeDiscussion) return;

		if (discussions.activeDiscussion.threadId !== commentMsg.meta.threadId) return;

		const commentId = commentMsg.id;
		const comment = discussions.activeDiscussion.comments.find(comment => comment.id === commentId);

		// comment already added; author doesn't matter; bail
		if (comment) return;

		// grok streams handled by appendStreamingResponse
		if (commentMsg.meta.body.includes("GROK_RESPONSE")) {
			return;
		}

		const response = await HostApi.instance.send(GetCollaborationCommentRequestType, {
			commentId,
		});

		if (response.nrError) {
			console.error(response.nrError);
		}

		if (response.comment) {
			dispatch(addComment(response.comment));
		}
	}
);
