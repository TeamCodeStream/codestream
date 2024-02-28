import { CodemarkPlus, PostPlus } from "@codestream/protocols/agent";
import { Index } from "@codestream/utils/types";
import { RecombinedStream } from "@codestream/webview/store/posts/recombinedStream";

export interface PendingPost
	extends Pick<
		PostPlus,
		| "id"
		| "text"
		| "streamId"
		| "parentPostId"
		| "creatorId"
		| "createdAt"
		| "reviewCheckpoint"
		| "files"
	> {
	pending: true;
	codemark: CodemarkPlus;
	error?: boolean;
	hasBeenEdited?: boolean;
}

export type Post = PendingPost | PostPlus;

export function isPending(post: object | undefined): post is PendingPost {
	return (post as PendingPost).pending;
}

export type GrokStreamEvent = {
	sequence?: number;
	streamId: string;
	postId: string;
	content?: string;
	done: boolean;
};

export interface PostsState {
	byStream: {
		[streamId: string]: Index<PostPlus>;
	};
	pending: PendingPost[];
	streamingPosts: {
		[postId: string]: RecombinedStream;
	};
	postThreadsLoading: { [parentPostId: string]: boolean };
}

export enum PostsActionsType {
	Bootstrap = "BOOTSTRAP_POSTS",
	Add = "ADD_POSTS", // this is a legacy action dispatched on pubnub updates
	AddPendingPost = "ADD_PENDING_POST",
	AddForStream = "ADD_POSTS_FOR_STREAM",
	SetPostThreadsLoading = "SET_POST_THREADS_LOADING",
	Update = "UPDATE_POST",
	ResolvePendingPost = "RESOLVE_PENDING_POST",
	FailPendingPost = "PENDING_POST_FAILED",
	CancelPendingPost = "CANCEL_PENDING_POST",
	Delete = "DELETE_POST",
	Save = "@posts/Save",
	AppendGrokStreamingResponse = "APPEND_GROK_STREAMING_RESPONSE",
}
