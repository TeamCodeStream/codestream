import { CSCodeError } from "@codestream/protocols/api";
import { createSelector } from "reselect";

import { CodeStreamState } from "..";
import { toMapBy } from "../../utils";
import * as activeIntegrationsActions from "../activeIntegrations/actions";
import { ActiveIntegrationsActionType } from "../activeIntegrations/types";
import { ActionType } from "../common";
import { ContextState } from "../context/types";
import { getTeamMates } from "../users/reducer";
import * as actions from "./actions";
import { CodeErrorsActionsTypes, CodeErrorsState } from "./types";
import { NewRelicErrorGroup } from "@codestream/protocols/agent";

type CodeErrorsActions = ActionType<typeof actions>;
type ActiveIntegrationsActions = ActionType<typeof activeIntegrationsActions>;

const initialState: CodeErrorsState = {
	bootstrapped: false,
	codeErrors: {},
	errorGroups: {},
	grokLoading: false,
	grokRepliesLength: 0,
	grokError: undefined,
};

export function reduceCodeErrors(
	state = initialState,
	action: CodeErrorsActions | ActiveIntegrationsActions
): CodeErrorsState {
	switch (action.type) {
		case CodeErrorsActionsTypes.Bootstrap:
			return {
				bootstrapped: true,
				errorGroups: state.errorGroups,
				grokLoading: state.grokLoading,
				grokRepliesLength: state.grokRepliesLength,
				grokError: state.grokError,
				codeErrors: {
					...state.codeErrors,
					...toMapBy(
						"id",
						action.payload.filter(_ => !_.deactivated)
					),
				},
			};
		case CodeErrorsActionsTypes.AddCodeErrors: {
			const newCodeErrors = toMapBy(
				"id",
				action.payload.filter(_ => !_.deactivated)
			);
			for (const id in newCodeErrors) {
				const existingCodeError = state.codeErrors[id];
				if (existingCodeError) {
					// preserve resolved stack traces
					newCodeErrors[id].stackTraces = existingCodeError.stackTraces;
				}
			}
			return {
				bootstrapped: state.bootstrapped,
				grokLoading: state.grokLoading,
				grokRepliesLength: state.grokRepliesLength,
				grokError: state.grokError,
				errorGroups: state.errorGroups,
				codeErrors: { ...state.codeErrors, ...newCodeErrors },
				functionToEdit: state.functionToEdit,
			};
		}
		case CodeErrorsActionsTypes.UpdateCodeErrors:
		case CodeErrorsActionsTypes.SaveCodeErrors: {
			return {
				bootstrapped: state.bootstrapped,
				errorGroups: state.errorGroups,
				grokLoading: state.grokLoading,
				grokRepliesLength: state.grokRepliesLength,
				grokError: state.grokError,
				codeErrors: { ...state.codeErrors, ...toMapBy("id", action.payload) },
				functionToEdit: state.functionToEdit,
			};
		}
		case CodeErrorsActionsTypes.SetFunctionToEdit: {
			if (action.payload) {
				console.debug(`grokFunctionToEdit: ${JSON.stringify(action.payload).substring(0, 100)}`);
			}
			return { ...state, functionToEdit: action.payload };
		}
		case CodeErrorsActionsTypes.SetGrokLoading: {
			return { ...state, grokLoading: action.payload };
		}
		case CodeErrorsActionsTypes.SetGrokError: {
			return { ...state, grokError: action.payload };
		}
		case CodeErrorsActionsTypes.SetGrokRepliesLength: {
			return { ...state, grokRepliesLength: action.payload };
		}
		case CodeErrorsActionsTypes.Delete: {
			const nextCodeErrors = { ...state.codeErrors };
			delete nextCodeErrors[action.payload];
			return {
				bootstrapped: state.bootstrapped,
				codeErrors: nextCodeErrors,
				errorGroups: state.errorGroups,
				functionToEdit: state.functionToEdit,
				grokLoading: state.grokLoading,
				grokRepliesLength: state.grokRepliesLength,
				grokError: state.grokError,
			};
		}
		case CodeErrorsActionsTypes.SetErrorGroup: {
			const nextErrorGroups = { ...state.errorGroups };

			nextErrorGroups[action.payload.id] = {
				errorGroup: action.payload.data,
				id: action.payload.id,
			};
			return {
				...state,
				errorGroups: nextErrorGroups,
			};
		}
		case CodeErrorsActionsTypes.IsLoadingErrorGroup: {
			const nextErrorGroups = { ...state.errorGroups };
			nextErrorGroups[action.payload.id] = {
				...nextErrorGroups[action.payload.id],
				isLoading: action.payload.data.isLoading,
			};
			return {
				...state,
				errorGroups: nextErrorGroups,
			};
		}
		case ActiveIntegrationsActionType.DeleteForProvider: {
			// if the user is disconnecting from NR, remove all the errorGroups
			if (action.payload.providerId === "newrelic*com") {
				return {
					...state,
					errorGroups: {},
				};
			} else {
				return state;
			}
		}
		case CodeErrorsActionsTypes.HandleDirectives: {
			const nextErrorGroups = { ...state.errorGroups };
			nextErrorGroups[action.payload.id] = {
				...nextErrorGroups[action.payload.id],
			};

			const errorGroupWrapper = nextErrorGroups[action.payload.id];
			if (errorGroupWrapper.errorGroup) {
				for (const directive of action.payload.data) {
					switch (directive.type) {
						case "assignRepository": {
							if (errorGroupWrapper.errorGroup.entity) {
								errorGroupWrapper.errorGroup.entity.repo = directive.data.repo;
							}
							break;
						}
						case "removeAssignee": {
							errorGroupWrapper.errorGroup.assignee = undefined;
							break;
						}
						case "setAssignee": {
							errorGroupWrapper.errorGroup.assignee = directive.data.assignee;
							break;
						}
						case "setState": {
							errorGroupWrapper.errorGroup.state = directive.data.state;
							break;
						}
					}
				}
			}
			return { ...state, errorGroups: nextErrorGroups };
		}
		case "RESET":
			return initialState;
		default:
			return state;
	}
}

export function getCodeError(state: CodeErrorsState, id: string): CSCodeError | undefined {
	return state.codeErrors[id];
}

// TODO fix me get the type for the result
export function getErrorGroup(
	state: CodeErrorsState,
	codeError: CSCodeError | undefined
): NewRelicErrorGroup | undefined {
	if (
		!codeError ||
		codeError.objectType !== "errorGroup" ||
		!codeError.objectId ||
		codeError.deactivated
	)
		return undefined;
	return state.errorGroups[codeError.objectId!]?.errorGroup;
}

const getCodeErrors = (state: CodeStreamState) => state.codeErrors.codeErrors;

export const getCurrentCodeErrorId = createSelector(
	(state: CodeStreamState) => state.context,
	(context: ContextState) => {
		return context.currentCodeErrorId || "";
	}
);

export const getCodeErrorCreator = createSelector(
	getCodeErrors,
	getCurrentCodeErrorId,
	getTeamMates,
	(codeErrors, id, teamMates) => {
		if (!teamMates) return undefined;
		const codeError = codeErrors[id];
		if (!codeError || !codeError.creatorId) return undefined;
		return teamMates.find(_ => _.id === codeError.creatorId);
	}
);
