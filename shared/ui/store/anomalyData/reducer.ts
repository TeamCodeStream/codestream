import { ActionType } from "../common";
import * as actions from "./actions";
import { AnomalyDataActionsType, AnomalyDataState } from "./types";

const initialState: AnomalyDataState = { };

type AnomalyDataActions = ActionType<typeof actions>;

export function reduceAnomalyData(state = initialState, action: AnomalyDataActions) {
	switch (action.type) {
		case AnomalyDataActionsType.SetAnomalyData:
			return { ...state, [action.payload.entityGuid]: action.payload };
		default:
			return state;
	}
};
