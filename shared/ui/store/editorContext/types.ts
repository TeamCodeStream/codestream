import { EditorContext } from "@codestream/webview/ipc/webview.protocol.common";

export type EditorContextState = EditorContext;

export enum EditorContextActionsType {
	SetEditorLayout = "@editorContext/SetLayout",
	SetEditorContext = "@editorContext/Set",
	AppendProcessBuffer = "@editorContext/AppendProcessBuffer",
	ClearProcessBuffer = "@editorContext/ClearProcessBuffer",
}
