import { ActionType } from "../common";
import * as actions from "./actions";
import { PreferencesActionsType, PreferencesState, FilterQuery } from "./types";
import { merge, mergeWith } from "lodash-es";
import { createSelector } from "reselect";
import { CodeStreamState } from "..";
import { PullRequestQuery } from "@codestream/protocols/api";

type PreferencesActions = ActionType<typeof actions>;

const initialState: PreferencesState = {};

const mergeCustom = function(target, source) {
	// don't merge arrays, just copy ... at least i hope that's the right solution
	if (source instanceof Array) {
		return [...source];
	}
};
export function reducePreferences(state = initialState, action: PreferencesActions) {
	switch (action.type) {
		case PreferencesActionsType.Set:
		case PreferencesActionsType.Update: {
			return mergeWith({}, state, action.payload, mergeCustom);
		}
		case "RESET":
			return initialState;
		default:
			return state;
	}
}

export const getSavedSearchFilters = createSelector(
	(state: CodeStreamState) => state.preferences,
	preferences => {
		const savedSearchFilters: FilterQuery[] = [];
		Object.keys(preferences.savedSearchFilters || {}).forEach(key => {
			savedSearchFilters[parseInt(key, 10)] = preferences.savedSearchFilters[key];
		});
		return savedSearchFilters.filter(filter => filter.label.length > 0);
	}
);

// FIXME hard-coded github*com
export const DEFAULT_QUERIES: { [providerId: string]: PullRequestQuery[] } = {
	"github*com": [
		{
			providerId: "github*com",
			name: "Waiting on my Review",
			query: `is:pr is:open review-requested:@me`,
			hidden: false
		},
		{
			providerId: "github*com",
			name: "Assigned to Me",
			query: `is:pr is:open assignee:@me`,
			hidden: false
		},
		{
			providerId: "github*com",
			name: "Created by Me",
			query: `is:pr is:open author:@me`,
			hidden: false
		},
		{
			providerId: "github*com",
			name: "Recent",
			query: `recent`,
			hidden: false
		}
	],
	"github/enterprise": [
		{
			providerId: "github/enterprise",
			name: "Waiting on my Review",
			query: `is:pr is:open review-requested:@me`,
			hidden: false
		},
		{
			providerId: "github/enterprise",
			name: "Assigned to Me",
			query: `is:pr is:open assignee:@me`,
			hidden: false
		},
		{
			providerId: "github/enterprise",
			name: "Created by Me",
			query: `is:pr is:open author:@me`,
			hidden: false
		},
		{
			providerId: "github/enterprise",
			name: "Recent",
			query: `recent`,
			hidden: false
		}
	]
};

export const getSavedPullRequestQueriesForProvider = createSelector(
	(state: CodeStreamState) => state.preferences,
	(_, providerId: string) => providerId,
	(preferences, providerId) => {
		const pullRequestQueries: PullRequestQuery[] = [];
		const queries = preferences.pullRequestQueries7 || DEFAULT_QUERIES;
		// const queries = DEFAULT_QUERIES;
		Object.keys(queries[providerId] || {}).forEach(key => {
			pullRequestQueries[parseInt(key, 10)] = queries[providerId][key];
		});
		return pullRequestQueries.filter(q => q && q.providerId === providerId && q.query.length > 0);
	}
);
