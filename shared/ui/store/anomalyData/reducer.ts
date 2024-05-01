import { ActionType } from "../common";
import * as actions from "./actions";
import { AnomalyDataActionsType, AnomalyDataState } from "./types";

const initialState: AnomalyDataState = {};

type AnomalyDataActions = ActionType<typeof actions>;

export const reduceAnomalyData = (
	state = initialState,
	action: AnomalyDataActions
): AnomalyDataState => {
	switch (action.type) {
		case AnomalyDataActionsType.SetAnomalyData:
			return { ...state, [action.payload.entityGuid]: action.payload };
		case "RESET":
			return initialState;
		default:
			return state;
	}
};
