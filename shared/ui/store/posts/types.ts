import { Index } from "../common";
import { PostPlus } from "@codestream/protocols/agent";

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
	codemark: {};
	error?: boolean;
	hasBeenEdited?: boolean;
}

export type Post = PendingPost | PostPlus;

export function isPending(post: Post): post is PendingPost {
	return (post as PendingPost).pending;
}

export interface PostsState {
	byStream: {
		[streamId: string]: Index<PostPlus>;
	};
	pending: PendingPost[];
}

export enum PostsActionsType {
	Bootstrap = "BOOTSTRAP_POSTS",
	Add = "ADD_POSTS", // this is a legacy action dispatched on pubnub updates
	AddPendingPost = "ADD_PENDING_POST",
	AddForStream = "ADD_POSTS_FOR_STREAM",
	Update = "UPDATE_POST",
	ResolvePendingPost = "RESOLVE_PENDING_POST",
	FailPendingPost = "PENDING_POST_FAILED",
	CancelPendingPost = "CANCEL_PENDING_POST",
	Delete = "DELETE_POST",
	Save = "@posts/Save"
}
