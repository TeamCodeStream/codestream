import { GetPostRequestType, PostPlus } from "@codestream/protocols/agent";
import { AnyAction, Middleware } from "redux";
import { ThunkDispatch } from "redux-thunk";
import { CodeStreamState } from "..";
import { HostApi } from "../..";
import { saveCodemarks } from "../codemarks/actions";
import { addPosts, savePosts } from "../posts/actions";
import { getPost } from "../posts/reducer";
import { PostsActionsType } from "../posts/types";
import { addNewActivity } from "./actions";

export const activityFeedMiddleware: Middleware<
	{},
	CodeStreamState,
	ThunkDispatch<CodeStreamState, unknown, AnyAction>
> = store => next => async action => {
	const { bootstrapped } = store.getState();

	if (bootstrapped && action.type === PostsActionsType.Add) {
		const payload = (action as ReturnType<typeof addPosts>).payload as readonly PostPlus[];
		payload.forEach(post => {
			if (post.deactivated) return;

			// if this is a new post
			if (post.version === 1) {
				if (post.parentPostId != null) {
					// ensure we have the parent post
					store.dispatch(fetchPostForActivity(post.parentPostId, post.streamId));
				} else if (post.codemark != null && post.codemark.reviewId == null) {
					store.dispatch(addNewActivity("codemark", [post.codemark]));
				} else if (post.review != null) {
					store.dispatch(addNewActivity("review", [post.review]));
				} else if (post.codeError != null) {
					store.dispatch(addNewActivity("codeError", [post.codeError]));
				}
			}
		});
	}

	return next(action);
};

const fetchPostForActivity = (postId: string, streamId: string) => async (
	dispatch: ThunkDispatch<CodeStreamState, unknown, AnyAction>,
	getState: () => CodeStreamState
) => {
	let post: PostPlus | undefined = getPost(getState().posts, streamId, postId);
	if (post == undefined) {
		const response = await HostApi.instance.send(GetPostRequestType, {
			postId,
			streamId
		});
		post = response.post;

		dispatch(savePosts([post]));
		if (post.codemark) {
			dispatch(saveCodemarks([post.codemark]));
		}
	}

	if (post.parentPostId != null) {
		return dispatch(fetchPostForActivity(post.parentPostId, post.streamId));
	}

	if (post.codemark) dispatch(addNewActivity("codemark", [post.codemark]));
	if (post.review) dispatch(addNewActivity("review", [post.review]));
	if (post.codeError) dispatch(addNewActivity("codeError", [post.codeError]));
};
