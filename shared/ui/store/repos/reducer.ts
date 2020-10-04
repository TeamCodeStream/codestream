import { createSelector } from "reselect";
import { CodeStreamState } from "..";
import { toMapBy } from "../../utils";
import { ActionType } from "../common";
import * as actions from "./actions";
import { ReposActionsType, ReposState } from "./types";

type ReposActions = ActionType<typeof actions>;

const initialState: ReposState = {};

export function reduceRepos(state = initialState, action: ReposActions) {
	switch (action.type) {
		case ReposActionsType.Bootstrap:
			return toMapBy("id", action.payload);
		case ReposActionsType.Add:
			return { ...state, ...toMapBy("id", action.payload) };
		case "RESET":
			return initialState;
		default:
			return state;
	}
}

export const getById = (state, id) => {
	return state[id];
};

export const getRepos = createSelector(
	(state: CodeStreamState) => state.repos,
	(repos: ReposState) => repos
);
