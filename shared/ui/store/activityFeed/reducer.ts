import { mapFilter } from "@codestream/webview/utils";
import { uniq } from "lodash-es";
import { createSelector } from "reselect";
import { CodeStreamState } from "..";
import { CodeErrorsState } from "../codeErrors/types";
import { CodemarksState } from "../codemarks/types";
import { ActionType } from "../common";
import { getReview } from "../reviews/reducer";
import { ReviewsState } from "../reviews/types";
import * as actions from "./actions";
import { ActivityFeedActionType, ActivityFeedActivity, ActivityFeedState } from "./types";
import { CodemarkPlus } from "@codestream/protocols/agent";
import { CSReview } from "@codestream/protocols/api";

type ActivityFeedAction = ActionType<typeof actions>;

const initialState: ActivityFeedState = {
	records: [],
	hasMore: true /* assume yes to start, as history is fetched, we'll know when there's no more  */,
};

export function reduceActivityFeed(state = initialState, action: ActivityFeedAction) {
	switch (action.type) {
		case ActivityFeedActionType.AddOlder: {
			return {
				hasMore: action.payload.hasMore,
				records: uniq([...state.records, ...action.payload.activities]),
			};
		}
		case ActivityFeedActionType.AddNew: {
			return { ...state, records: uniq([...action.payload, ...state.records]) };
		}
		case "RESET": {
			return initialState;
		}
		default:
			return state;
	}
}

export type ActivityType = "codemark" | "review" | "codeError";

export interface ActivityItem<T> {
	type: ActivityType;
	record: T;
}

export interface CodemarkActivityItem extends ActivityItem<CodemarkPlus> {
	type: "codemark";
}

export interface ReviewActivityItem extends ActivityItem<CSReview> {
	type: "review";
}

export type ActivityFeedResponse = Array<CodemarkActivityItem | ReviewActivityItem>;

export const getActivity = createSelector(
	(state: CodeStreamState) => state.codemarks,
	(state: CodeStreamState) => state.reviews,
	(state: CodeStreamState) => state.codeErrors,
	(state: CodeStreamState) => state.activityFeed.records,
	// (state: CodeStreamState) => state.posts,
	(
		codemarks: CodemarksState,
		reviewsState: ReviewsState,
		codeErrorsState: CodeErrorsState,
		activityFeed: ActivityFeedActivity[]
		// posts: PostsState
	): ActivityFeedResponse => {
		return mapFilter(activityFeed, activity => {
			const [model, id] = activity.split("|");
			switch (model) {
				case "codemark": {
					const codemark = codemarks[id];
					if (codemark == undefined || codemark.deactivated) return;
					return {
						type: model,
						record: codemark,
					};
				}
				case "review": {
					const review = getReview(reviewsState, id);
					if (review == null || review.deactivated) return;
					return {
						type: model,
						record: review,
					};
				}
				default:
					return;
			}
		});
	}
);
