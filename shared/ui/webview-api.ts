import { TelemetryRequestType } from "@codestream/protocols/agent";
import { URI } from "vscode-uri";

import { NotificationType, RequestType } from "vscode-jsonrpc";
import {
	HostDidChangeActiveEditorNotification,
	HostDidChangeActiveEditorNotificationType,
	HostDidChangeEditorSelectionNotification,
	HostDidChangeEditorSelectionNotificationType,
	HostDidChangeEditorVisibleRangesNotification,
	HostDidChangeEditorVisibleRangesNotificationType,
	NewCodemarkNotification,
	NewCodemarkNotificationType,
	NewReviewNotification,
	NewReviewNotificationType,
} from "./ipc/webview.protocol";
import { AnyObject, Disposable, shortUuid } from "./utils";
import {
	findHost,
	IpcHost,
	isIpcRequestMessage,
	isIpcResponseMessage,
	WebviewIpcMessage,
} from "@codestream/webview/ipc/webview.protocol.common";
import { HistoryCounter } from "@codestream/utils/system/historyCounter";
import { logError } from "@codestream/webview/logger";
import { roundDownExponentially } from "@codestream/utils/system/math";

type NotificationParamsOf<NT> = NT extends NotificationType<infer N, any> ? N : never;
export type RequestParamsOf<RT> = RT extends RequestType<infer R, any, any, any> ? R : never;
export type RequestResponseOf<RT> = RT extends RequestType<any, infer R, any, any> ? R : never;

type Listener<NT extends NotificationType<any, any> = NotificationType<any, any>> = (
	event: NotificationParamsOf<NT>
) => void;

const ALERT_THRESHOLD = 20;

const STALE_THRESHOLD = 300; // 5 minutes

const normalizeNotificationsMap = new Map<
	NotificationType<any, any>,
	(listener: Listener) => Listener
>([
	[
		HostDidChangeActiveEditorNotificationType,
		listener => (e: HostDidChangeActiveEditorNotification) => {
			if (e.editor) {
				e.editor.uri = URI.parse(e.editor.uri).toString(true);
			}
			return listener(e);
		},
	],
	[
		HostDidChangeEditorSelectionNotificationType,
		listener => (e: HostDidChangeEditorSelectionNotification) => {
			e.uri = URI.parse(e.uri).toString(true);
			return listener(e);
		},
	],
	[
		HostDidChangeEditorVisibleRangesNotificationType,
		listener => (e: HostDidChangeEditorVisibleRangesNotification) => {
			e.uri = URI.parse(e.uri).toString(true);
			return listener(e);
		},
	],
	[
		NewCodemarkNotificationType,
		listener => (e: NewCodemarkNotification) => {
			e.uri = e.uri ? URI.parse(e.uri).toString(true) : undefined;
			return listener(e);
		},
	],
	[
		NewReviewNotificationType,
		listener => (e: NewReviewNotification) => {
			e.uri = e.uri ? URI.parse(e.uri).toString(true) : undefined;
			return listener(e);
		},
	],
]);

function normalizeListener<NT extends NotificationType<any, any>>(
	type: NT,
	listener: (event: NotificationParamsOf<NT>) => void
): (event: NotificationParamsOf<NT>) => void {
	const normalize = normalizeNotificationsMap.get(type);
	return normalize ? normalize(listener) : listener;
}

class EventEmitter {
	private listenersByEvent = new Map<string, Listener[]>();

	on<NT extends NotificationType<any, any>>(
		eventType: NT,
		listener: Listener<NT>,
		thisArgs?: any
	): Disposable {
		// Because we can't trust the uri format from the host, we need to normalize the uris in all notifications originating from the host
		listener = normalizeListener(
			eventType,
			thisArgs !== undefined ? listener.bind(thisArgs) : listener
		);

		const listeners = this.listenersByEvent.get(eventType.method) || [];
		listeners.push(listener);
		this.listenersByEvent.set(eventType.method, listeners);
		return {
			dispose: () => {
				const listeners = this.listenersByEvent.get(eventType.method)!.filter(l => l !== listener);
				this.listenersByEvent.set(eventType.method, listeners);
			},
		};
	}

	emit(eventName: string, body: any) {
		const listeners = this.listenersByEvent.get(eventName);
		if (listeners == null || listeners.length === 0) return;

		setTimeout(() => {
			for (const listener of listeners) {
				try {
					listener(body);
				} catch {
					// Don't let unhandle errors in a listener break others
				}
			}
		}, 0);
	}
}

let sequence = 0;

export function nextId() {
	if (sequence === Number.MAX_SAFE_INTEGER) {
		sequence = 1;
	} else {
		sequence++;
	}

	return `wv:${sequence}:${shortUuid()}:${Date.now()}`;
}

type WebviewApiRequest = {
	method: string;
	providerId?: string;
	resolve: (value?: any | PromiseLike<any>) => void;
	reject: (reason?: unknown) => void;
};

export class RequestApiManager {
	private pendingRequests = new Map<string, WebviewApiRequest>();
	private historyCounter = new HistoryCounter("webview", 15, 25, console.debug, true);

	constructor(enableStaleReport = true) {
		if (enableStaleReport) {
			setInterval(this.reportStaleRequests.bind(this), 60000);
		}
	}

	private reportStaleRequests() {
		const report = this.collectStaleRequests();
		for (const item in report) {
			logError(item);
		}
	}

	public collectStaleRequests(): Array<string> {
		const now = Date.now();
		const staleRequests = new Array<string>();
		for (const [key, value] of this.pendingRequests) {
			const parts = key.split(":");
			if (parts.length < 3) {
				continue;
			}
			const timestamp = parseInt(parts[3]);
			const theDate = new Date(timestamp);
			const timeAgo = (now - timestamp) / 1000;
			if (timeAgo > STALE_THRESHOLD) {
				staleRequests.push(`Found stale request ${value.method} at ${theDate.toISOString()}`);
			}
		}
		return staleRequests;
	}

	public get(key: string): WebviewApiRequest | undefined {
		return this.pendingRequests.get(key);
	}

	public delete(key: string): boolean {
		return this.pendingRequests.delete(key);
	}

	public set(key: string, value: WebviewApiRequest): Map<string, WebviewApiRequest> {
		const identifier = value.providerId ? `${value.method}:${value.providerId}` : value.method;
		const count = this.historyCounter.countAndGet(identifier);
		// A rounded error allows the count to stay the same and the duplicate error suppression to work in the agent
		const rounded = roundDownExponentially(count, ALERT_THRESHOLD);
		if (count > ALERT_THRESHOLD && identifier != "codestream/reporting/message") {
			logError(new Error(`More than ${rounded} calls pending for ${identifier}`));
		}
		return this.pendingRequests.set(key, value);
	}
}

export class HostApi extends EventEmitter {
	private apiManager = new RequestApiManager();
	private port: IpcHost;

	private static _instance: HostApi;
	static get instance(): HostApi {
		if (this._instance === undefined) {
			this._instance = new HostApi(findHost());
		}
		return this._instance;
	}

	protected constructor(port: any) {
		super();
		this.port = port;

		port.onmessage = ({ data }: { data: WebviewIpcMessage }) => {
			if (isIpcResponseMessage(data)) {
				const pending = this.apiManager.get(data.id);
				if (pending == null) {
					console.debug(
						`received response from host for ${data.id}; unable to find a pending request`,
						data
					);

					return;
				}

				console.debug(
					`received response from host for ${data.id}; found pending request: ${pending.method}`,
					data
				);
				if (data.error != null) {
					if (!data.error.toString().includes("maintenance mode")) pending.reject(data.error);
				} else pending.resolve(data.params);

				this.apiManager.delete(data.id);

				return;
			}

			if (isIpcRequestMessage(data)) {
				// TODO: Handle requests from the host
				debugger;
				return;
			}

			console.debug(`received notification ${data.method} from host`, data.params);
			this.emit(data.method, data.params);
		};
	}

	notify<NT extends NotificationType<any, any>>(type: NT, params: NotificationParamsOf<NT>): void {
		const payload = {
			method: type.method,
			params: params,
		};
		this.port.postMessage(payload);
		console.debug(`notification ${type.method} sent to host`, payload);
	}

	send<RT extends RequestType<any, any, any, any>>(
		type: RT,
		params: RequestParamsOf<RT>,
		options?: { alternateReject?: (error) => {} }
	): Promise<RequestResponseOf<RT>> {
		const id = nextId();

		return new Promise((resolve, reject) => {
			reject = (options && options.alternateReject) || reject;
			const providerId: string | undefined = params?.providerId ? params.providerId : undefined;
			this.apiManager.set(id, { resolve, reject, method: type.method, providerId });

			const payload = {
				id,
				method: type.method,
				params: params,
			};
			this.port.postMessage(payload);
			console.debug(`request ${id}:${type.method} sent to host`, payload);
		});
	}

	track(eventName: string, properties?: AnyObject) {
		this.send(TelemetryRequestType, {
			eventName,
			properties,
		});
	}
}

export class Server {
	static get<Res = any>(url: string, paramData?: { [key: string]: any }): Promise<Res> {
		return HostApi.instance.send(new RequestType<any, Res, void, void>("codestream/api/get"), {
			url: url,
			paramData: paramData,
		});
	}

	static post<Res = any>(url: string, body?: any): Promise<Res> {
		return HostApi.instance.send(new RequestType<any, Res, void, void>("codestream/api/post"), {
			url: url,
			body: body,
		});
	}

	static put<Res = any>(url: string, body?: any): Promise<Res> {
		return HostApi.instance.send(new RequestType<any, Res, void, void>("codestream/api/put"), {
			url: url,
			body: body,
		});
	}

	static delete<Res = any>(url: string): Promise<Res> {
		return HostApi.instance.send(new RequestType<any, Res, void, void>("codestream/api/delete"), {
			url: url,
		});
	}
}
