import { emptyArray, emptyObject } from "@codestream/webview/utils";
import { ActionType } from "../common";
import * as actions from "./actions";
import { ActiveIntegrationData, ActiveIntegrationsActionType, ActiveIntegrationsState } from "./types";

type ActiveIntegrationsAction = ActionType<typeof actions>;

const initialState: ActiveIntegrationsState = { issuesLoading: false, initialLoadComplete: false, integrations: {} };

export function reduceActiveIntegrations(state = initialState, action: ActiveIntegrationsAction) {
	switch (action.type) {
		case ActiveIntegrationsActionType.UpdateForProvider: {
			const nextState = { ...state };
			const currentProvider = state.integrations[action.payload.providerId];
			nextState.integrations[action.payload.providerId] = { ...currentProvider, ...action.payload.data };
			return nextState;
		}
		case ActiveIntegrationsActionType.DeleteForProvider: {
			const nextState = { ...state };
			if (action.payload.providerTeamId) {
				if (nextState.integrations[action.payload.providerId]) {
					delete nextState.integrations[action.payload.providerId][action.payload.providerTeamId];
					if (Object.keys(nextState.integrations[action.payload.providerId]).length === 0) {
						delete nextState.integrations[action.payload.providerId];
					}
				}
			}
			else {
				delete nextState.integrations[action.payload.providerId];
			}
			return nextState;
		}
		case ActiveIntegrationsActionType.SetIssuesLoading: {
			return { ...state, ...action.payload };
		}
		case "RESET": {
			return initialState;
		}
		default:
			return state;
	}
}

export function getIntegrationData<T extends ActiveIntegrationData>(
	state: ActiveIntegrationsState,
	providerId: string
): T {
	return (state[providerId] || emptyObject) as T;
}

export const getBoards = (state: ActiveIntegrationsState, providerId?: string) => {
	if (providerId == undefined) return emptyArray;
	const data = state[providerId];
	if (!data) return emptyArray;
	return (data as any).boards;
};
