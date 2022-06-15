import { createSelector } from "reselect";
import { toMapBy } from "../../utils";
import { ActionType, Index } from "../common";
import * as actions from "./actions";
import { ReviewsActionsTypes, ReviewsState } from "./types";
import { CSReview } from "@codestream/protocols/api";
import { CodeStreamState } from "..";
import { logWarning } from "@codestream/webview/logger";

type ReviewsActions = ActionType<typeof actions>;

const initialState: ReviewsState = { bootstrapped: false, reviews: {} };

export function reduceReviews(state = initialState, action: ReviewsActions): ReviewsState {
	switch (action.type) {
		case ReviewsActionsTypes.Bootstrap:
			return {
				bootstrapped: true,
				reviews: { ...state.reviews, ...toMapBy("id", action.payload) }
			};
		case ReviewsActionsTypes.AddReviews:
		case ReviewsActionsTypes.UpdateReviews:
		case ReviewsActionsTypes.SaveReviews: {
			return {
				bootstrapped: state.bootstrapped,
				reviews: { ...state.reviews, ...toMapBy("id", action.payload) }
			};
		}
		case ReviewsActionsTypes.Delete: {
			const nextReviews = { ...state.reviews };
			delete nextReviews[action.payload];
			return { bootstrapped: state.bootstrapped, reviews: nextReviews };
		}
		case "RESET":
			return initialState;
		default:
			return state;
	}
}

export function getReview(state: ReviewsState, id: string): CSReview | undefined {
	return state.reviews[id];
}

export function getByStatus(state: CodeStreamState, status?: string): CSReview[] {
	if (!status) return getAllReviews(state);

	return getAllReviews(state).filter(review => review.status === status);
}

const getReviews = (state: CodeStreamState) => state.reviews.reviews;

export const getByStatusAndUser = createSelector(
	getReviews,
	(a, status) => status,
	(a, b, userId) => userId,
	(reviews, status, userId) => {
		return Object.values(reviews).filter(
			review =>
				!review.deactivated &&
				review.status === status &&
				review.reviewChangesets &&
				(review.creatorId === userId ||
					(review.reviewers || []).includes(userId) ||
					(review.codeAuthorIds || []).includes(userId) ||
					(review.followerIds || []).includes(userId))
		);
	}
);

export const getAllReviews = createSelector(getReviews, (reviews: Index<CSReview>) =>
	Object.values(reviews).filter(review => !review.deactivated)
);

export const getAllReviewLinks = createSelector(getReviews, (reviews: Index<CSReview>) =>
	Object.values(reviews)
		.filter(review => !review.deactivated && review.permalink)
		.map(_ => {
			return {
				id: _.id,
				permalink: _.permalink
			};
		})
);

export const teamHasReviews = createSelector(getReviews, (reviews: Index<CSReview>) => {
	return Object.keys(reviews).length > 0;
});

export const teamReviewCount = createSelector(getReviews, (reviews: Index<CSReview>) => {
	return Object.keys(reviews).length;
});

export const getReviewsUnread = createSelector(getReviews, (reviews: Index<CSReview>) => {
	let ret = {};
});

// a mapping from commit IDs to the reviews that contain that commit ID
// e.g.
// {
//     a19f5b3584443acde93bbd7855e5f113d4af2e23: [review object which contains that commit],
//     41f0abfcf7f5d6d21e810889cab82c6809cf567f: [review object...]
// }
export function getAllByCommit(state: CodeStreamState): { [commit: string]: CSReview } {
	let ret = {};
	getAllReviews(state).forEach(review => {
		(review.reviewChangesets || []).forEach(changeset => {
			(changeset.commits || []).forEach(commit => (ret[commit.sha] = review));
		});
	});
	return ret;
}
