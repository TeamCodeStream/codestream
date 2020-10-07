import { action } from "../common";
import { EditorContextState, EditorContextActionsType } from "./types";
import { HostApi } from "@codestream/webview/webview-api";
import {
	EditorSelectRangeRequestType,
	EditorSelection,
	EditorLayout
} from "@codestream/protocols/webview";

export const reset = () => action("RESET");

export const setEditorContext = (payload: Partial<EditorContextState>) =>
	action(EditorContextActionsType.SetEditorContext, payload);

export const setEditorLayout = (payload: Partial<EditorLayout>) =>
	action(EditorContextActionsType.SetEditorLayout, payload);

export const changeSelection = (uri: string, range: EditorSelection) => async dispatch => {
	await HostApi.instance.send(EditorSelectRangeRequestType, {
		uri,
		selection: range,
		preserveFocus: true
	});

	dispatch(setEditorContext({ textEditorSelections: [range] }));
};
