import { NotificationType } from "vscode-jsonrpc";
import { Range } from "vscode-languageserver-types";
import {
	EditorMetrics,
	EditorSelection,
	EditorSidebarLocation,
	IpcRoutes,
	WebviewConfigs
} from "./webview.protocol.common";

/* The following events are expected to be provided from the extension */

export interface ActiveEditorInfo {
	fileName: string;
	languageId?: string;
	uri: string;
	metrics?: EditorMetrics;
	selections: EditorSelection[];
	visibleRanges: Range[];
	lineCount?: number;
}

export interface HostDidChangeActiveEditorNotification {
	editor?: ActiveEditorInfo;
}
export const HostDidChangeActiveEditorNotificationType = new NotificationType<
	HostDidChangeActiveEditorNotification,
	void
>(`${IpcRoutes.Webview}/editor/didChangeActive`);

export interface HostDidChangeLayoutNotification {
	sidebar?: EditorSidebarLocation;
}
export const HostDidChangeLayoutNotificationType = new NotificationType<
	HostDidChangeLayoutNotification,
	void
>(`${IpcRoutes.Webview}/editor/didChangeLayout`);

export interface HostDidChangeVisibleEditorsNotification {
	count: number;
}
export const HostDidChangeVisibleEditorsNotificationType = new NotificationType<
	HostDidChangeVisibleEditorsNotification,
	void
>(`${IpcRoutes.Webview}/editors/didChangeVisible`);

export type HostDidChangeConfigNotification = Partial<WebviewConfigs>;
export const HostDidChangeConfigNotificationType = new NotificationType<
	HostDidChangeConfigNotification,
	void
>(`${IpcRoutes.Webview}/config/didChange`);

export interface HostDidChangeEditorSelectionNotification {
	uri: string;
	selections: EditorSelection[];
	visibleRanges: Range[];
	lineCount?: number;
}
export const HostDidChangeEditorSelectionNotificationType = new NotificationType<
	HostDidChangeEditorSelectionNotification,
	void
>(`${IpcRoutes.Webview}/editor/didChangeSelection`);

export interface HostDidChangeEditorVisibleRangesNotification {
	uri: string;
	selections: EditorSelection[];
	visibleRanges: Range[];
	lineCount?: number;
}
export const HostDidChangeEditorVisibleRangesNotificationType = new NotificationType<
	HostDidChangeEditorVisibleRangesNotification,
	void
>(`${IpcRoutes.Webview}/editor/didChangeVisibleRanges`);

export interface HostDidChangeFocusNotification {
	focused: boolean;
}
export const HostDidChangeFocusNotificationType = new NotificationType<
	HostDidChangeFocusNotification,
	void
>(`${IpcRoutes.Webview}/focus/didChange`);

export interface HostDidLogoutNotification {}
export const HostDidLogoutNotificationType = new NotificationType<HostDidLogoutNotification, void>(
	`${IpcRoutes.Webview}/didLogout`
);

export interface HostDidDidReceiveRequestNotification {
	url?: string;
}

export enum RouteControllerType {
	Codemark = "codemark",
	Review = "review",
	Navigate = "navigate",
	Search = "search",
	PullRequest = "pullRequest",
	StartWork = "startWork"
}
export enum RouteActionType {
	Open = "open"
}
export interface Route {
	controller?: RouteControllerType;
	action?: RouteActionType;
	id?: string;
	query?: any;
}

export const HostDidReceiveRequestNotificationType = new NotificationType<
	HostDidDidReceiveRequestNotification,
	void
>(`${IpcRoutes.Webview}/request/parse`);
