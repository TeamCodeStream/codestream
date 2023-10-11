import { TelemetryRequestType } from "@codestream/protocols/agent";
import { URI } from "vscode-uri";

import { NotificationType, RequestType } from "vscode-jsonrpc";

import { AnyObject, Disposable, shortUuid } from "../sidebar/utils";
// import {
// 	findHost,
// 	IpcHost,
// 	isIpcRequestMessage,
// 	isIpcResponseMessage,
// 	WebviewIpcMessage,
// } from "@codestream/webview/ipc/sidebar.protocol.common";
import { HistoryCounter } from "@codestream/utils/system/historyCounter";

import { roundDownExponentially } from "@codestream/utils/system/math";
import {
	IpcHost,
	WebviewIpcMessage,
	isIpcRequestMessage,
	isIpcResponseMessage,
} from "../sidebar/ipc/webview.protocol.common";

type NotificationParamsOf<NT> = NT extends NotificationType<infer N, any> ? N : never;
export type RequestParamsOf<RT> = RT extends RequestType<infer R, any, any, any> ? R : never;
export type RequestResponseOf<RT> = RT extends RequestType<any, infer R, any, any> ? R : never;

type Listener<NT extends NotificationType<any, any> = NotificationType<any, any>> = (
	event: NotificationParamsOf<NT>
) => void;

const ALERT_THRESHOLD = 20;

const STALE_THRESHOLD = 60; // 1 minute

class StaleRequestGroup {
	private _oldestDate: number | undefined = undefined;
	private _deleteKeys: string[] = [];

	get deleteKeys() {
		return this._deleteKeys;
	}

	get oldestDate() {
		return this._oldestDate;
	}

	addRequest(requestId: string, timestamp: number) {
		this._deleteKeys.push(requestId);
		if (!this._oldestDate) {
			this._oldestDate = timestamp;
		} else if (timestamp < this._oldestDate) {
			this._oldestDate = timestamp;
		}
	}
}

const normalizeNotificationsMap = new Map<
	NotificationType<any, any>,
	(listener: Listener) => Listener
>([]);

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

	constructor(enablePurge = true) {
		if (enablePurge) {
			setInterval(this.purgeStaleRequests.bind(this), 60000);
		}
	}

	private purgeStaleRequests() {
		const result = this.collectStaleRequests();
		let report = "";
		for (const [method, staleGroup] of result) {
			const oldest = staleGroup?.oldestDate
				? new Date(staleGroup.oldestDate).toISOString()
				: "unknown";
			report += `purging ${staleGroup.deleteKeys.length} stale requests for ${method} with oldest ${oldest}\n`;
			for (const key of staleGroup.deleteKeys) {
				const pending = this.get(key);
				if (pending) {
					this.delete(key);
					pending.reject("agent request timed out");
				}
			}
		}
		if (report) {
			// logError(report);
		}
	}

	public collectStaleRequests(): Map<string, StaleRequestGroup> {
		const now = Date.now();
		const staleRequests = new Map<string, StaleRequestGroup>();
		for (const [key, value] of this.pendingRequests) {
			const parts = key.split(":");
			if (parts.length < 3) {
				continue;
			}
			const timestamp = parseInt(parts[3]);
			const timeAgo = (now - timestamp) / 1000;
			if (timeAgo > STALE_THRESHOLD) {
				const staleGroup = staleRequests.get(value.method) ?? new StaleRequestGroup();
				staleRequests.set(value.method, staleGroup);
				staleGroup.addRequest(key, timestamp);
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
			//logError(new Error(`More than ${rounded} calls pending for ${identifier}`));
		}
		return this.pendingRequests.set(key, value);
	}
}

declare function acquireCodestreamHostForEditor(): IpcHost;

let host: IpcHost;
const findHost = (webview: string): IpcHost => {
	try {
		if (webview === "editor") {
			host = acquireCodestreamHostForEditor();
			return host;
		}
	} catch (e) {
		throw new Error("Host needs to provide global `acquireCodestreamHostForEditor` function");
	}
	return host;
};

export class HostApi extends EventEmitter {
	private apiManager = new RequestApiManager();
	private port: IpcHost;

	// private static _sidebarInstance: HostApi;
	// static get instance(): HostApi {
	// 	if (this._sidebarInstance === undefined) {
	// 		this._sidebarInstance = new HostApi(findHost("sidebar"));
	// 	}
	// 	return this._sidebarInstance;
	// }

	private static _editorInstance: HostApi;
	static locator(): HostApi {
		if (this._editorInstance === undefined) {
			this._editorInstance = new HostApi(findHost("editor"));
		}
		return this._editorInstance;
	}

	protected constructor(port: any) {
		super();
		this.port = port;

		port.onmessage = ({ data }: { data: WebviewIpcMessage }) => {
			if (isIpcResponseMessage(data)) {
				const pending = this.apiManager.get(data.id);
				if (!pending) {
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
