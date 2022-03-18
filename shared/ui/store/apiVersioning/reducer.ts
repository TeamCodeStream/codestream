import { ActionType } from "../common";
import { ApiVersioningActionsType, ApiVersioningState } from "./types";
import * as actions from "./actions";
import { CodeStreamState } from "..";

const initialState: ApiVersioningState = {
	type: ApiVersioningActionsType.ApiOk,
	apiCapabilities: {},
	missingCapabilities: {}
};

type ApiVersioningActions = ActionType<typeof actions>;

export function reduceApiVersioning(state = initialState, action: ApiVersioningActions) {
	switch (action.type) {
		case ApiVersioningActionsType.ApiUpgradeRequired:
			return { ...state, type: ApiVersioningActionsType.ApiUpgradeRequired };
		case ApiVersioningActionsType.ApiUpgradeRecommended:
			return {
				...state,
				type: ApiVersioningActionsType.ApiUpgradeRecommended,
				missingCapabilities: { ...action.payload }
			};
		case ApiVersioningActionsType.ApiOk:
			return { ...state, type: ApiVersioningActionsType.ApiOk };
		case ApiVersioningActionsType.UpdateApiCapabilities:
			return { ...state, apiCapabilities: { ...action.payload } };
		default:
			return state;
	}
}

export const isFeatureEnabled = (state: CodeStreamState, flag: string) => {
	// We can turn this on, below, to enable multi-region just for us, when we're ready
	// then get rid of this code once we're fully in production with it
	//if (flag === 'multiRegion') {
	//	return true;
	//}
	return state.apiVersioning.apiCapabilities[flag] != null;
};
