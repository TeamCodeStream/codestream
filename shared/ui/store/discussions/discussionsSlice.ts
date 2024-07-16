import { Discussion } from "@codestream/webview/store/types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
	CollaborationComment,
	GetCollaborationCommentRequestType,
} from "@codestream/protocols/agent";
import { PostParts } from "@codestream/protocols/api";
import {
	advanceRecombinedStream,
	RecombinedStream,
} from "@codestream/webview/store/discussions/recombinedStream";
import { CodeStreamState } from "@codestream/webview/store";
import { HostApi } from "@codestream/webview/webview-api";

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

export interface StreamingPost {
	items: StreamingResponseMsg[];
	receivedDoneEvent: boolean;
	content: string;
}

interface DiscussionState {
	activeDiscussion: Discussion | undefined;
	streamingPosts: { [key: string]: RecombinedStream };
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
		appendRealTimeComment: (state, action: PayloadAction<CommentMsg>) => {
			if (!state.activeDiscussion) return;

			if (state.activeDiscussion.threadId !== action.payload.meta.threadId) return;

			const commentId = action.payload.id;

			const comment = state.activeDiscussion.comments.find(comment => comment.id === commentId);

			// comment already added; author doesn't matter; bail
			if (comment) return;

			// grok streams handled by appendStreamingResponse
			if (action.payload.meta.body.includes("GROK_RESPONSE")) {
				return;
			}

			// with those basic checks out of the way, now we need the real comment
			HostApi.instance
				.send(GetCollaborationCommentRequestType, {
					commentId,
				})
				.then(response => {
					if (response.comment) {
						state.activeDiscussion?.comments.push(response.comment);
					} else if (response.nrError) {
						console.error(response.nrError);
					}
				})
				.catch(error => {
					console.error(error);
				});
		},
		appendStreamingResponse: (state, action: PayloadAction<StreamingResponseMsg>) => {
			if (!state.activeDiscussion) return;
			// Lookup streamingPosts by threadId (conversation_id)
			const threadId = action.payload.conversation_id;
			const commentId = action.payload.meta.reply_to_comment_id;

			const recombinedStream: RecombinedStream = state.streamingPosts[threadId] ?? {
				items: [],
				receivedDoneEvent: false,
				content: "",
				threadId,
			};
			// recombinedStream gets updated in place
			advanceRecombinedStream(recombinedStream, action.payload);
			state.streamingPosts[threadId] = recombinedStream;
			// Find the matching comment in the activeDiscussion and update its parts
			let comment = state.activeDiscussion.comments.find(comment => comment.id === commentId);
			if (!comment && commentId) {
				// add new comment
				comment = {
					id: commentId,
					createdAt: Date.now().toString(),
					deactivated: false,
					creator: {
						name: "NRAI",
						userId: -1,
					},
					body: "",
				};
				state.activeDiscussion.comments.push(comment);
			}
			if (comment) {
				comment.parts = recombinedStream.parts;
				comment.body = recombinedStream.content;
				comment.creator.name = "NRAI";
			}
		},
	},
});

export const isNraiStreamLoading = (state: CodeStreamState) => {
	const discussions = state.discussions;
	if (!discussions.activeDiscussion) return undefined;
	return (
		discussions.streamingPosts[discussions.activeDiscussion.threadId]?.finalMessageReceived ===
		false
	);
};

export const {
	setActiveDiscussion,
	addComment,
	editComment,
	setCommentBody,
	resetDiscussions,
	appendRealTimeComment,
	appendStreamingResponse,
} = discussionSlice.actions;
export default discussionSlice.reducer;
