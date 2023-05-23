import { CSPost } from "@codestream/protocols/api";
import { sortBy as _sortBy } from "lodash-es";
import { createSelector } from "reselect";
import { CodeStreamState } from "..";
import { ActionType } from "../common";
import * as actions from "./actions";
import { isPending, Post, PostsActionsType, PostsState } from "./types";
import { PostPlus } from "@codestream/protocols/agent";

type PostsActions = ActionType<typeof actions>;

const initialState = {
	byStream: {},
	pending: [],
};

const addPost = (byStream, post: CSPost) => {
	const streamId = post.streamId;
	const streamPosts = byStream[streamId] || {};
	return { ...byStream, [streamId]: { ...streamPosts, [post.id]: post } };
};

export function reducePosts(state: PostsState = initialState, action: PostsActions) {
	switch (action.type) {
		case PostsActionsType.Save:
		case PostsActionsType.Add:
		case PostsActionsType.Bootstrap: {
			if (action.payload.length === 0) return state;

			const nextState = {
				pending: [...state.pending],
				byStream: { ...state.byStream },
			};
			action.payload.forEach(post => {
				if (isPending(post)) nextState.pending.push(post);
				else {
					nextState.byStream = addPost(nextState.byStream, post);
				}
			});
			return nextState;
		}
		case PostsActionsType.AddForStream: {
			const { streamId, posts } = action.payload;
			const streamPosts = { ...(state.byStream[streamId] || {}) };
			posts.filter(Boolean).forEach(post => {
				streamPosts[post.id] = post;
			});

			return {
				...state,
				byStream: { ...state.byStream, [streamId]: streamPosts },
			};
		}
		case PostsActionsType.Update:
			return {
				...state,
				byStream: addPost(state.byStream, action.payload),
			};
		case PostsActionsType.AddPendingPost: {
			return { ...state, pending: [...state.pending, action.payload] };
		}
		case PostsActionsType.ResolvePendingPost: {
			const { pendingId, post } = action.payload;
			return {
				byStream: addPost(state.byStream, post),
				pending: state.pending.filter(post => post.id !== pendingId),
			};
		}
		case PostsActionsType.FailPendingPost: {
			return {
				...state,
				pending: state.pending.map(post => {
					return post.id === action.payload ? { ...post, error: true } : post;
				}),
			};
		}
		case PostsActionsType.CancelPendingPost: {
			return {
				...state,
				pending: state.pending.filter(post => post.id !== action.payload),
			};
		}
		case PostsActionsType.Delete: {
			const { id, streamId } = action.payload;
			const streamPosts = { ...(state.byStream[streamId] || {}) };
			delete streamPosts[id];

			return {
				...state,
				byStream: { ...state.byStream, [streamId]: streamPosts },
			};
		}
		case "RESET":
			return initialState;
		default:
			return state;
	}
}

export const getPostsForStream = createSelector(
	(state: CodeStreamState) => state.posts,
	(_, streamId?: string) => streamId,
	(state, streamId) => {
		if (streamId == null) return [];

		const pendingForStream = state.pending.filter(it => it.streamId === streamId);
		return [
			..._sortBy(state.byStream[streamId], "seqNum").filter(p => !p.deactivated),
			...pendingForStream,
		];
	}
);

export function isPostPlus(object: unknown): object is PostPlus {
	const maybeCodeError = object as PostPlus;
	return (
		maybeCodeError.text !== undefined &&
		maybeCodeError.teamId !== undefined &&
		maybeCodeError.streamId !== undefined
	);
}

export const getThreadPosts = createSelector(
	getPostsForStream,
	(_, __, threadId: string) => threadId,
	(_, __, ___, excludePending?: boolean) => (excludePending != null ? excludePending : false),
	(posts, threadId, excludePending) => {
		const result: Post[] = [];

		// HACK: 💩 don't keep this around
		// if replying to a reply, we need to include nested replies in the thread
		for (const post of posts) {
			if (excludePending && isPending(post)) continue;
			if (post.parentPostId === threadId) result.push(post);
			// if this post is a reply to one of the replies already seen, include it too
			else if (result.find(p => p.id === post.parentPostId)) result.push(post);
		}

		return result;
	}
);

export const getGrokPostLength = createSelector(getThreadPosts, posts => {
	const grokPostLength = posts.filter(post => isPostPlus(post) && post.forGrok).length;
	// console.debug(`===--- getGrokPostLength: ${grokPostLength}`);
	return grokPostLength;
});

export const getPost = ({ byStream, pending }: PostsState, streamId: string, postId: string) => {
	const post = (byStream[streamId] || {})[postId];
	return post || pending.find(p => p.id === postId);
};
