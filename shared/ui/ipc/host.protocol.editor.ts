import { RequestType } from "vscode-jsonrpc";
import { NotificationType } from "vscode-languageserver-protocol";
import { Position, Range } from "vscode-languageserver-types";
import { EditorContext, EditorSelection, IpcRoutes } from "./webview.protocol.common";

export interface GetActiveEditorContextResponse {
	editorContext: EditorContext;
}

export const GetActiveEditorContextRequestType = new RequestType<
	void,
	GetActiveEditorContextResponse,
	void,
	void
>(`${IpcRoutes.Host}/editor/context`);

export interface EditorHighlightRangeRequest {
	uri: string;
	ref?: string;
	range: Range;
	highlight: boolean;
}
export interface EditorHighlightRangeResponse {
	success: boolean;
}

export interface EditorRevealSymbolRequest {
	codeFilepath?: string;
	codeNamespace?: string;
	codeFunction?: string;
	language: string;
}
export interface EditorRevealSymbolResponse {
	success: boolean;
}
export const EditorRevealSymbolRequestType = new RequestType<
	EditorRevealSymbolRequest,
	EditorRevealSymbolResponse,
	void,
	void
>(`${IpcRoutes.Host}/editor/symbol/reveal`);

export const EditorHighlightRangeRequestType = new RequestType<
	EditorHighlightRangeRequest,
	EditorHighlightRangeResponse,
	void,
	void
>(`${IpcRoutes.Host}/editor/range/highlight`);

export interface EditorReplaceSymbolRequest {
	uri: string;
	symbolName: string;
	codeBlock: string;
	namespace?: string;
}

export interface EditorReplaceSymbolResponse {
	success: boolean;
}

export const EditorReplaceSymbolType = new RequestType<
	EditorReplaceSymbolRequest,
	EditorCopySymbolResponse,
	void,
	void
>(`${IpcRoutes.Host}/editor/symbol/replace`);

export interface EditorCopySymbolRequest {
	uri: string;
	namespace?: string;
	symbolName: string;
	ref?: string;
}

export type CSPosition = {
	line: number;
	character: number;
};

export type CSRange = {
	start: CSPosition;
	end: CSPosition;
};

export interface EditorCopySymbolResponse {
	success: boolean;
	text?: string;
	range?: CSRange;
}

export const EditorCopySymbolType = new RequestType<
	EditorCopySymbolRequest,
	EditorCopySymbolResponse,
	void,
	void
>(`${IpcRoutes.Host}/editor/symbol/copy`);

export interface EditorRevealRangeRequest {
	uri: string;
	ref?: string;
	range: Range;
	preserveFocus?: boolean;
	atTop?: boolean;
}
export interface EditorRevealRangeResponse {
	success: boolean;
}
export const EditorRevealRangeRequestType = new RequestType<
	EditorRevealRangeRequest,
	EditorRevealRangeResponse,
	void,
	void
>(`${IpcRoutes.Host}/editor/range/reveal`);

export interface EditorSelectRangeRequest {
	uri: string;
	selection: EditorSelection;
	preserveFocus?: boolean;
}
export interface EditorSelectRangeResponse {
	success: boolean;
}
export const EditorSelectRangeRequestType = new RequestType<
	EditorSelectRangeRequest,
	EditorSelectRangeResponse,
	void,
	void
>(`${IpcRoutes.Host}/editor/range/select`);

export interface EditorScrollToNotification {
	uri: string;
	position: Position;
	deltaPixels?: number;
	atTop?: boolean;
}
export const EditorScrollToNotificationType = new NotificationType<
	EditorScrollToNotification,
	void
>(`${IpcRoutes.Host}/editor/scrollTo`);
