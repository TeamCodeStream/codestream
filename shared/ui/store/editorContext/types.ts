import { EditorContext } from "@codestream/protocols/webview";

export type EditorContextState = EditorContext;

export enum EditorContextActionsType {
	SetEditorLayout = "@editorContext/SetLayout",
	SetEditorContext = "@editorContext/Set"
}
