import {
	isIpcRequestMessage,
	isIpcResponseMessage,
	WebviewIpcMessage,
	WebviewIpcNotificationMessage,
	WebviewIpcRequestMessage,
	WebviewIpcResponseMessage
} from "@codestream/protocols/webview";
import { Event, ViewColumn } from "vscode";
import { NotificationType, RequestType } from "vscode-languageclient";
import { StreamThread } from "../api/session";

export type NotificationParamsOf<NT> = NT extends NotificationType<infer N, any> ? N : never;
export type RequestParamsOf<RT> = RT extends RequestType<infer R, any, any, any> ? R : never;
export type RequestResponseOf<RT> = RT extends RequestType<any, infer R, any, any> ? R : never;

export function toLoggableIpcMessage(msg: WebviewIpcMessage) {
	if (isIpcRequestMessage(msg)) return `${msg.method}(${msg.id})`;
	if (isIpcResponseMessage(msg)) return `response(${msg.id})`;

	return msg.method;
}

export interface WebviewLike {
	notify<NT extends NotificationType<any, any>>(type: NT, params: NotificationParamsOf<NT>): void;
	dispose(): void;
	show(streamThread?: StreamThread): Promise<void>;
	triggerIpc(): Promise<void>;
	visible: boolean | undefined;
	viewColumn: ViewColumn | undefined;
	type: string;
	reload(): any;

	onDidClose: Event<void>;
	onDidMessageReceive: Event<WebviewIpcMessage>;
	onCompletePendingIpcRequest(e: WebviewIpcResponseMessage): any;
	onIpcRequest<RT extends RequestType<any, any, any, any>>(
		type: RT,
		request: WebviewIpcRequestMessage,
		fn: (type: RT, params: RequestParamsOf<RT>) => Promise<RequestResponseOf<RT>>
	): void;
	onIpcReady(): void;
	onIpcNotification<NT extends NotificationType<any, any>>(
		type: NT,
		notification: WebviewIpcNotificationMessage,
		fn: (type: NT, params: NotificationParamsOf<NT>) => void
	): void;
}
