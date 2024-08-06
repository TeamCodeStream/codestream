import { Discussion } from "@codestream/webview/store/types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CollaborationComment } from "@codestream/protocols/agent";
import { PostParts } from "@codestream/protocols/api";
import {
	advanceRecombinedStream,
	RecombinedStream,
} from "@codestream/webview/store/discussions/recombinedStream";
import { CodeStreamState } from "@codestream/webview/store";
import { isEmpty as _isEmpty } from "lodash-es";

export interface SetCommentBodyArgs {
	body: string;
	commentId: string;
}

export interface CSCollaborationComment extends CollaborationComment {
	parts?: PostParts;
}

export interface CommentMsg {
	type: "COMMENT";
	id: string;
	meta: {
		body: string;
		action: string;
		threadId: string;
		contextId: string;
		replyTo?: string;
	};
}

export interface StreamingResponseMsg {
	role: string;
	content: string;
	context: {};
	additional_kwargs?: object;
	card?: object;
	name?: string;
	visible_to_user: boolean;
	visible_to_assistant: boolean;
	application_args?: object;
	conversation_id: string;
	last_message: boolean;
	sequence_id: number;
	meta: {
		reply_to_comment_id: string;
	};
	experience: string;
	type: "GROKSTREAM";
}

interface DiscussionState {
	activeDiscussion: Discussion | undefined;
	streamingPosts: { [key: string]: { [key: string]: RecombinedStream } };
}

export const initialState: DiscussionState = {
	activeDiscussion: undefined,
	streamingPosts: {},
};

export const discussionSlice = createSlice({
	name: "discussion",
	initialState,
	reducers: {
		resetDiscussions: () => initialState,
		setActiveDiscussion: (state, action: PayloadAction<Discussion>) => {
			state.activeDiscussion = action.payload;
		},
		addComment: (state, action: PayloadAction<CollaborationComment>) => {
			if (state.activeDiscussion) {
				state.activeDiscussion.comments.push(action.payload);
				// Sort by createdAt
				state.activeDiscussion.comments.sort((a, b) => {
					return parseInt(a.createdAt) - parseInt(b.createdAt);
				});
			}
		},
		editComment: (state, action: PayloadAction<CollaborationComment>) => {
			if (state.activeDiscussion) {
				// Replace the whole comment object with the new one
				const index = state.activeDiscussion.comments.findIndex(
					comment => comment.id === action.payload.id
				);
				if (index !== -1) {
					state.activeDiscussion.comments[index] = action.payload;
				}
			}
		},
		// Used to update streaming websocket responses
		setCommentBody: (state, action: PayloadAction<SetCommentBodyArgs>) => {
			if (state.activeDiscussion) {
				const comment = state.activeDiscussion.comments.find(
					comment => comment.id === action.payload.commentId
				);
				if (comment) {
					comment.body = action.payload.body;
				}
			}
		},
		appendStreamingResponse: (state, action: PayloadAction<StreamingResponseMsg>) => {
			if (!state.activeDiscussion) return;
			// Lookup streamingPosts by threadId (conversation_id)
			const threadId = action.payload.conversation_id;
			// Bail conditions
			if (!threadId || threadId !== state.activeDiscussion.threadId) return;
			// commentId doesn't exist until streaming is done. But we need a reliable unique id so hijack
			// the reply_to_comment_id for now.
			// TODO maybe on final COMMENT message, we can remove the reply-to- id and use the proper commentId as this will break delete / edit comments
			const commentId = "reply-to-" + action.payload.meta.reply_to_comment_id;

			if (!state.streamingPosts[threadId]) {
				state.streamingPosts[threadId] = {};
			}
			const recombinedStream: RecombinedStream = state.streamingPosts[threadId][commentId] ?? {
				items: [],
				receivedDoneEvent: false,
				content: "",
				threadId,
			};
			// recombinedStream gets updated in place
			advanceRecombinedStream(recombinedStream, action.payload);
			state.streamingPosts[threadId][commentId] = recombinedStream;
			// Find the matching comment in the activeDiscussion and update its parts
			let comment = state.activeDiscussion.comments.find(comment => comment.id === commentId);
			if (!comment && commentId) {
				// add new comment
				comment = {
					id: commentId,
					createdAt: Date.now().toString(),
					deactivated: false,
					creator: {
						name: "AI",
						userId: "-1",
					},
					body: "",
				};
				state.activeDiscussion.comments.push(comment);
			}
			if (comment) {
				comment.parts = recombinedStream.parts;
				comment.body = recombinedStream.content;
				comment.creator.name = "AI";
			}
		},
	},
});

export const isNraiStreamLoading = (state: CodeStreamState) => {
	const discussions = state.discussions;

	if (_isEmpty(discussions.streamingPosts) || _isEmpty(discussions.activeDiscussion)) {
		return undefined;
	}

	const allStreamsDone = Object.values(
		discussions.streamingPosts[discussions.activeDiscussion.threadId] ?? {}
	).every(stream => stream.finalMessageReceived);
	return !allStreamsDone;
};

export const {
	setActiveDiscussion,
	addComment,
	editComment,
	setCommentBody,
	resetDiscussions,
	appendStreamingResponse,
} = discussionSlice.actions;
export default discussionSlice.reducer;
