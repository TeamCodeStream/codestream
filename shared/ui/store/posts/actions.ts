import { GetPostsRequestType } from "@codestream/protocols/agent";
import { CSPost } from "@codestream/protocols/api";
import { logError } from "@codestream/webview/logger";
import { HostApi } from "@codestream/webview/webview-api";
import { action } from "../common";
import { GrokStreamEvent, PendingPost, Post, PostsActionsType } from "./types";

export const reset = () => action("RESET");

export const bootstrapPosts = (posts: Post[]) => action(PostsActionsType.Bootstrap, posts);

// this is for posts in onDidChangeData notifications
export const addPosts = (posts: Post[]) => action(PostsActionsType.Add, posts);

export const savePosts = (posts: Post[]) => action(PostsActionsType.Save, posts);

export const addPendingPost = (post: PendingPost) => action(PostsActionsType.AddPendingPost, post);

export const resolvePendingPost = (pendingId: string, post: CSPost) =>
	action(PostsActionsType.ResolvePendingPost, { pendingId, post });

export const failPendingPost = (pendingId: string) =>
	action(PostsActionsType.FailPendingPost, pendingId);

export const cancelPendingPost = (pendingId: string) =>
	action(PostsActionsType.CancelPendingPost, pendingId);

export const addPostsForStream = (streamId: string, posts: CSPost[]) =>
	action(PostsActionsType.AddForStream, { posts, streamId });

export const setPostThreadsLoading = (parentPostId: string, loading: boolean) =>
	action(PostsActionsType.SetPostThreadsLoading, { parentPostId, loading });

export const updatePost = (post: CSPost) => action(PostsActionsType.Update, post);

export const deletePost = (post: CSPost) => action(PostsActionsType.Delete, post);

export const appendGrokStreamingResponse = (event: GrokStreamEvent[]) =>
	action(PostsActionsType.AppendGrokStreamingResponse, event);

export const getPosts =
	(streamId: string, postIds: string[], parentPostId?: string) => async dispatch => {
		try {
			const { posts } = await HostApi.instance.send(GetPostsRequestType, {
				streamId,
				postIds,
				parentPostId,
			});
			dispatch(savePosts(posts));
		} catch (error) {
			logError(error, {
				streamId,
				postIds,
				parentPostId,
			});
		}
	};
