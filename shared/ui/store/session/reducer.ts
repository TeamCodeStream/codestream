import { uuid } from "@codestream/webview/utils";
import { ActionType } from "../common";
import * as actions from "./actions";
import { SessionActionType, SessionState } from "./types";

type SessionActions = ActionType<typeof actions>;

const initialState: SessionState = {};

export function reduceSession(state = initialState, action: SessionActions) {
	switch (action.type) {
		case SessionActionType.Set:
			return action.payload;
		case SessionActionType.SetMaintenanceMode:
			return { ...state, inMaintenanceMode: action.payload };
		case SessionActionType.SetTOS:
			return { ...state, acceptedTOS: action.payload };
		case "RESET":
			return { ...initialState, machineId: state.machineId, otc: uuid() };
		default:
			return state;
	}
}
