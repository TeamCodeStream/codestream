import each from "lodash/each";
import isEmpty from "lodash/isEmpty";
import omit from "lodash/omit";
import isNumber from "lodash/isNumber";

import {
	ONE_SECOND,
	ONE_MINUTE,
	ONE_HOUR,
	SOCKET_CONNECTED_EVENT,
	SOCKET_DISCONNECTED_EVENT,
	GROKSTREAM_MESSAGE,
} from "./constants";
import { HostApi } from "@codestream/webview/webview-api";
import { GetCollaborationWebsocketInfoRequestType } from "@codestream/protocols/agent";

export type SocketEventExecution = {
	eventName: string;
	handler: (data: any) => void;
	debounceMs?: number;
};

type SocketEventMap = {
	[eventAction: string]: {
		[handlerName: string]: boolean;
	};
};

type SocketExecutionMap = {
	[handlerName: string]: SocketEventExecution;
};

declare global {
	interface Window {
		__socketClient: SocketClient;
	}
}

export default class SocketClientMounter {
	constructor() {
		if (!window.__socketClient) {
			window.__socketClient = new SocketClient();
		}
	}
}

export class SocketClient {
	private connected = false;

	private reconnecting = false;
	private closeReason = "";

	private websocket = {} as WebSocket;

	private eventMap: SocketEventMap;
	private eventHandlerCounter: {
		[eventName: string]: number;
	};

	private executionMap: SocketExecutionMap;

	private nextConnectionRetryAt: Date | null;

	private connectionId: string | null;

	private socketLiveBeat: number;
	private inited = false;

	constructor() {
		this.eventMap = {};
		this.eventHandlerCounter = {};
		this.executionMap = {};
		this.nextConnectionRetryAt = null;
		this.connectionId = null;
		this.socketLiveBeat = Date.now();
	}

	getConnectionId() {
		return this.connectionId || undefined;
	}

	isConnected() {
		return this.connected;
	}

	async init(): Promise<void> {
		if (this.inited) {
			return;
		}
		setInterval(() => {
			if (isEmpty(this.executionMap)) {
				return;
			}
			if (!this.isConnectionStale()) {
				return;
			}
			this._refreshConnection();
		}, ONE_MINUTE * 1);
		setInterval(() => {
			if (isEmpty(this.executionMap)) {
				return;
			}
			this._refreshConnection();
		}, ONE_HOUR * 1.9);

		this.inited = true;
		return this.connect();
	}

	async connect(): Promise<void> {
		const { url } = await this.getConnectionUrl();

		return new Promise(resolve => {
			this.websocket = new WebSocket(url);
			this.websocket.onopen = this.onSocketOpen.bind(this, resolve);
			this.websocket.onclose = this.onSocketClose.bind(this);
			this.websocket.onmessage = this.onSocketMessage.bind(this);
			this.websocket.onerror = this.onSocketError.bind(this);
		});
	}

	private async getConnectionUrl(): Promise<{
		NRConnectionId: string;
		url: string;
	}> {
		try {
			const urlInfo = await HostApi.instance.send(GetCollaborationWebsocketInfoRequestType, {});
			const { NRConnectionId, url } = urlInfo;

			// recordEvent(CONNECTION_URL_FETCH, {
			//   connectionId: NRConnectionId,
			//   socketReadyState: this.websocket?.readyState,
			// });

			this.connectionId = NRConnectionId;

			return {
				NRConnectionId,
				url,
			};
		} catch (error: any) {
			// recordEvent(CONNECTION_URL_FETCH_ERROR, {
			//   connectionId: this.connectionId,
			//   socketReadyState: this.websocket?.readyState,
			//   message: error?.message,
			// });
			throw new Error(`CONNECTION_URL_FETCH_ERROR`);
		}
	}

	onSocketOpen(resolve: () => void): void {
		this.connected = true;
		this.reconnecting = false;
		this.nextConnectionRetryAt = null;

		console.log("WEBSOCKET CONNECTION ESTABLISHED");
		this.socketLiveBeat = Date.now();
		// recordEvent(CONNECTION_OPENED, {
		//   connectionId: this.connectionId,
		//   socketReadyState: this.websocket?.readyState,
		// });

		this.notifyConnectionChange(this.connected);

		return resolve();
	}

	async onSocketClose(event: any) {
		this.connected = false;
		console.log("WEBSOCKET CONNECTION CLOSED", event?.reason);
		// recordEvent(CONNECTION_CLOSED, {
		//   connectionId: this.connectionId,
		//   socketReadyState: this.websocket?.readyState,
		//   code: event?.code,
		//   reason: event?.reason,
		//   wasClean: event?.wasClean,
		// });

		this.notifyConnectionChange(this.connected);

		if (!this.reconnecting) {
			if (event?.reason === "refresh" || this.closeReason === "refresh") {
				this.closeReason = "";
				await this._retryConnection(1, { noWait: true });
			} else {
				await this._retryConnection(0);
			}
		}
	}

	isConnectionStale(): boolean {
		return Date.now() - this.socketLiveBeat >= ONE_MINUTE * 8;
	}

	onSocketMessage(event: MessageEvent): void {
		this.socketLiveBeat = Date.now();
		const data = JSON.parse(event.data);
		const payload: any = data[0];

		if (!payload?.meta) {
			return;
		}

		const { action } = payload.meta;
		const { type } = payload;

		// console.debug("INCOMING SOCKET MESSAGE", action, payload);

		if (isEmpty(this.executionMap)) {
			return;
		}

		each(this.executionMap, execution => {
			const { eventName } = execution;

			if (
				(type === GROKSTREAM_MESSAGE && eventName === GROKSTREAM_MESSAGE) ||
				(type === "COMMENT" && eventName === "COMMENT")
			) {
				this.executeHandler(execution, payload);
				return;
			}

			if (eventName !== action) {
				return;
			}

			this.executeHandler(execution, payload);
		});
	}

	onSocketError(event: any): void {
		// recordEvent(CONNECTION_ERROR, {
		//   connectionId: this.connectionId,
		//   socketReadyState: this.websocket?.readyState,
		//   code: event?.code,
		//   reason: event?.reason,
		//   wasClean: event?.wasClean,
		// });

		if (this.connected || this.websocket.readyState !== WebSocket.CLOSED) {
			return;
		}

		this._retryConnection(-1);
	}

	onEvent(payload: SocketEventExecution, nerdpackId: string): string {
		const { eventName, handler, debounceMs } = payload ?? {};
		if (!eventName || !handler) {
			console.warn("Cannot register event: %e on nerdpack: %n", eventName, nerdpackId);
			return "";
		}

		let key;

		if (nerdpackId) {
			key = `${nerdpackId}.${eventName}`;
		} else {
			key = eventName;
		}

		if (isEmpty(this.eventMap[eventName])) {
			this.eventMap[eventName] = {};
		}
		this.eventHandlerCounter[eventName] = this.eventHandlerCounter[eventName] ?? 0;
		const handlerId = `${key}_${this.eventHandlerCounter[eventName]}`;
		this.eventMap[eventName][handlerId] = true;
		if (isEmpty(this.executionMap)) {
			if (!this.inited) {
				this.init();
			} else if (this.isConnectionStale()) {
				this._refreshConnection();
			}
		}
		this.executionMap[handlerId] = {
			handler,
			eventName,
			debounceMs,
		};
		this.eventHandlerCounter[eventName] += 1;
		return handlerId;
	}

	offEvent(handlerId: string) {
		if (!handlerId) {
			return;
		}

		const handlerConfig = this.executionMap[handlerId];

		if (isEmpty(handlerConfig)) {
			return;
		}

		const { eventName } = handlerConfig;

		this.executionMap = omit(this.executionMap, handlerId);
		this.eventMap[eventName] = omit(this.eventMap[eventName], handlerId);

		if (isEmpty(this.eventMap[eventName])) {
			this.eventMap = omit(this.eventMap, eventName);
		}
	}

	notifyConnectionChange(connected: boolean) {
		const connectionEvent = connected ? SOCKET_CONNECTED_EVENT : SOCKET_DISCONNECTED_EVENT;
		each(this.executionMap, execution => {
			const { eventName } = execution;

			if (eventName !== connectionEvent) {
				return;
			}

			this.executeHandler(execution, { connected });
		});
	}

	executeHandler(socketExecutionEvent: SocketEventExecution, payload: any) {
		try {
			const { handler, debounceMs } = socketExecutionEvent;

			if (isNumber(debounceMs)) {
				setTimeout(() => {
					handler(payload);
				}, debounceMs);
			} else {
				handler(payload);
			}
			return;
		} catch (e: any) {
			console.error("Error executing event handler", e);
			return;
		}
	}

	static _fibonacci(num: number): number {
		if (num <= 1) {
			return 1;
		}

		return SocketClient._fibonacci(num - 1) + SocketClient._fibonacci(num - 2);
	}

	static _wait(ms = 1000): Promise<void> {
		return new Promise(resolve => {
			setTimeout(() => {
				return resolve();
			}, ms);
		});
	}

	async _retryConnection(idx = 0, options?: { noWait?: boolean }): Promise<void> {
		if (this.connected) {
			return;
		}

		this.reconnecting = true;

		const waitTime = options?.noWait ? 0 : SocketClient._getWaitTime(idx);

		this.nextConnectionRetryAt = new Date(Date.now() + waitTime);

		// recordEvent(CONNECTION_RETRY, {
		//   connectionId: this.connectionId,
		//   socketReadyState: this.websocket?.readyState,
		//   nextConnectionRetryAt: this.nextConnectionRetryAt,
		// });

		console.log("Retrying socket re-connection in %s second(s)", waitTime / 1000, idx);

		await SocketClient._wait(waitTime);

		if (this.connected) {
			return;
		}

		try {
			await this.connect();
		} catch (e: any) {
			const { message } = e;
			if (message !== "CONNECTION_URL_FETCH_ERROR") {
				return;
			}

			return this._retryConnection(-1);
		}

		const nextWaitIndex = idx + 1;

		return this._retryConnection(nextWaitIndex);
	}

	async _refreshConnection(): Promise<void> {
		if (this.connected) {
			console.warn("refresh connection");
			this.websocket.close(1000, "refresh"); // reason got overwritten sometimes
			this.closeReason = "refresh";
		} else {
			console.debug("refresh connection, not connected yet");
		}
	}

	static _getWaitTime(idx: number) {
		let waitTime;

		if (!idx) {
			// first retry should be a random number
			waitTime = Math.ceil(Math.random() * 30) * ONE_SECOND;
		} else if (idx === -1) {
			// when socket errors on connect
			waitTime = Math.ceil(Math.random() * 5) * ONE_MINUTE;
		} else {
			// use fibonacci sequence for next wait time
			waitTime = SocketClient._fibonacci(idx) * ONE_SECOND;
		}

		return waitTime;
	}
}

export async function waitForService(n = 0): Promise<void> {
	if (window.__socketClient) {
		return Promise.resolve();
	}

	if (n >= 10) {
		return Promise.reject(new Error("Socket Client Server is not available"));
	}
	await SocketClient._wait(250);
	return waitForService(++n);
}

export async function getNrConnectionId(n = 0): Promise<string | undefined> {
	const socketClient = window?.__socketClient;
	if (socketClient?.isConnected() && socketClient?.getConnectionId()) {
		return socketClient?.getConnectionId();
	}
	if (n > 4) {
		return undefined;
	}
	await SocketClient._wait(n * ONE_SECOND);
	return getNrConnectionId(n + 1);
}
