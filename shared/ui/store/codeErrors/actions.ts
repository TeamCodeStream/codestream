import { DeleteCodeErrorRequestType, NewRelicErrorGroup } from "@codestream/protocols/agent";
import { CSCodeError } from "@codestream/protocols/api";
import { logError } from "@codestream/webview/logger";
import { HostApi } from "@codestream/webview/webview-api";
import { action } from "../common";
import { CodeErrorsActionsTypes, FunctionToEdit } from "./types";
import { Discussion } from "../types";

export const reset = () => action("RESET");

export const addCodeErrors = (codeErrors: CSCodeError[]) =>
	action(CodeErrorsActionsTypes.AddCodeErrors, codeErrors);

export const removeCodeError = (id: string) => action(CodeErrorsActionsTypes.Delete, id);

export const _updateCodeErrors = (codeErrors: CSCodeError[]) =>
	action(CodeErrorsActionsTypes.UpdateCodeErrors, codeErrors);

export const setGrokLoading = (loading: boolean) =>
	action(CodeErrorsActionsTypes.SetGrokLoading, loading);

export const setGrokRepliesLength = (length: number) =>
	action(CodeErrorsActionsTypes.SetGrokRepliesLength, length);

export const setFunctionToEdit = (functionToEdit: FunctionToEdit | undefined) =>
	action(CodeErrorsActionsTypes.SetFunctionToEdit, functionToEdit);

export const setFunctionToEditFailed = (value: boolean) =>
	action(CodeErrorsActionsTypes.SetFunctionToEditFailed, value);

// export const setGrokError = (grokError: CSAsyncGrokError | undefined) =>
// 	action(CodeErrorsActionsTypes.SetGrokError, grokError);

export const setDemoMode = (enabled: boolean) =>
	action(CodeErrorsActionsTypes.SetDemoMode, enabled);

export const resetNrAi = () => action(CodeErrorsActionsTypes.ResetNrAi);

export const _deleteCodeError = (id: string) => action(CodeErrorsActionsTypes.Delete, id);

export const deleteCodeError = (id: string) => async dispatch => {
	try {
		await HostApi.instance.send(DeleteCodeErrorRequestType, {
			id,
		});
		dispatch(_deleteCodeError(id));
	} catch (error) {
		logError(error, { detail: `failed to delete code error`, id });
	}
};

/**
 * "Advanced" properties that can come from the client (webview)
 */
interface AdvancedEditableCodeErrorAttributes {
	// array of userIds / tags to add
	$push: { assignees?: string[]; tags?: string[] };
	// array of userIds / tags to remove
	$pull: { assignees?: string[]; tags?: string[] };
}

export type EditableAttributes = Partial<
	Pick<CSCodeError, "title" | "assignees"> & AdvancedEditableCodeErrorAttributes
>;

export const handleDirectives = (id: string, data: any) =>
	action(CodeErrorsActionsTypes.HandleDirectives, {
		id,
		data,
	});

export const _addProviderError = (
	providerId: string,
	errorGroupGuid: string,
	error?: { message: string }
) =>
	action(CodeErrorsActionsTypes.AddProviderError, {
		providerId: providerId,
		id: errorGroupGuid,
		error,
	});

export const _clearProviderError = (providerId: string, errorGroupGuid: string) =>
	action(CodeErrorsActionsTypes.ClearProviderError, {
		providerId: providerId,
		id: errorGroupGuid,
		undefined,
	});

export const _setErrorGroup = (errorGroupGuid: string, data: NewRelicErrorGroup) =>
	action(CodeErrorsActionsTypes.SetErrorGroup, {
		providerId: "newrelic*com",
		id: errorGroupGuid,
		data,
	});

export const setErrorGroupDiscussion = (discussion: Discussion) =>
	action(CodeErrorsActionsTypes.SetDiscussion, discussion);

export const _isLoadingErrorGroup = (errorGroupGuid: string, data: any) =>
	action(CodeErrorsActionsTypes.IsLoadingErrorGroup, {
		providerId: "newrelic*com",
		id: errorGroupGuid,
		data,
	});
