"use strict";
import { promises as fs } from "fs";
import {
	HostDidChangeFocusNotificationType,
	ShowStreamNotificationType,
	isIpcResponseMessage,
	WebviewIpcMessage,
	WebviewIpcNotificationMessage,
	WebviewIpcRequestMessage,
	WebviewIpcResponseMessage
} from "@codestream/protocols/webview";
import {
	Disposable,
	Event,
	EventEmitter,
	ExtensionContext,
	Uri,
	ViewColumn,
	WebviewPanel,
	WebviewPanelOnDidChangeViewStateEvent,
	window,
	WindowState
} from "vscode";
import { NotificationType, RequestType, ResponseError } from "vscode-jsonrpc";

import { gate } from "../system/decorators/gate";
import { CodeStreamSession, StreamThread } from "../api/session";
import { Container } from "../container";
import { Logger, TraceLevel } from "../logger";
import { log } from "../system";
import {
	NotificationParamsOf,
	RequestParamsOf,
	RequestResponseOf,
	toLoggableIpcMessage,
	WebviewLike
} from "./webviewLike";

let ipcSequence = 0;

interface OnDidCloseEventData {
	entityGuid: string;
}

export class CodeStreamWebviewPanel implements WebviewLike, Disposable {
	type = "panel";
	static readonly IpcQueueThreshold = 100;

	private _onDidClose = new EventEmitter<void>();
	get onDidClose(): Event<void> {
		return this._onDidClose.event;
	}

	private _onDidChangeVisibility = new EventEmitter<void>();
	get onDidChangeVisibility(): Event<void> {
		return this._onDidChangeVisibility.event;
	}

	get onDidMessageReceive(): Event<any> {
		return this._panel.webview.onDidReceiveMessage;
	}

	// Don't start the ipc right away, we need to wait until the webview is ready to receive
	private _ipcPaused: boolean = true;
	private readonly _ipcPending: Map<
		string,
		{
			method: string;
			resolve(value?: any | PromiseLike<any>): void;
			reject(reason?: any): void;
		}
	>;
	private readonly _ipcQueue: WebviewIpcMessage[] = [];
	private _ipcReady: boolean = false;

	private _disposable: Disposable | undefined;
	private _onIpcReadyResolver: ((cancelled: boolean) => void) | undefined;
	private readonly _panel: WebviewPanel;
	private _html: string | undefined;

	constructor(
		public readonly session: CodeStreamSession,
		private readonly context: ExtensionContext,
		public readonly parameters: any | undefined,
		private onInitializedCallback: Function
	) {
		this._ipcPending = new Map();

		this._panel = window.createWebviewPanel(
			"CodeStream.editor",
			`CodeStream (${parameters.title})`,
			{ viewColumn: ViewColumn.Active, preserveFocus: false },
			{
				retainContextWhenHidden: true,
				enableFindWidget: true,
				enableCommandUris: true,
				enableScripts: true
			}
		);
		this._panel.iconPath = Uri.file(
			Container.context.asAbsolutePath("assets/images/codestream.png")
		);

		this._disposable = Disposable.from(
			this._panel,
			this._panel.onDidDispose(this.onPanelDisposed, this),
			this._panel.onDidChangeViewState(this.onPanelViewStateChanged, this),
			window.onDidChangeWindowState(this.onWindowStateChanged, this)
		);
		const pathToExt = this._panel.webview
			.asWebviewUri(Uri.file(this.context.extensionUri.fsPath))
			.toString();

		const webviewPath = Uri.joinPath(this.context.extensionUri, "editor.html");

		fs.readFile(webviewPath.fsPath, {
			encoding: "utf8"
		}).then(data => {
			this._panel.webview.html = data
				.replace(/{{root}}/g, pathToExt)
				// here's some magic for inserting default data onload
				.replace(
					"</head>",
					`<script>window._cs = ${JSON.stringify(parameters || {})};</script></head>`
				);
			this._html = this._panel.webview.html;
			this.onInitializedCallback();
		});
	}

	dispose() {
		this._disposable && this._disposable.dispose();
	}

	private onPanelDisposed() {
		if (this._onIpcReadyResolver !== undefined) {
			this._onIpcReadyResolver(true);
		}

		this._onDidClose.fire();
	}

	private _panelState: { active: boolean; visible: boolean } = {
		active: true,
		visible: true
	};

	private onPanelViewStateChanged(e: WebviewPanelOnDidChangeViewStateEvent) {
		const previous = this._panelState;
		this._panelState = { active: e.webviewPanel.active, visible: e.webviewPanel.visible };
		if (this._panelState.visible === previous.visible) return;

		if (!this._panelState.visible) {
			this.notify(HostDidChangeFocusNotificationType, { focused: false });

			return;
		}

		this.resumeIpc();

		if (window.state.focused) {
			this.notify(HostDidChangeFocusNotificationType, { focused: true });
		}
	}

	private onWindowStateChanged(e: WindowState) {
		if (this._panelState.visible) {
			this.notify(HostDidChangeFocusNotificationType, { focused: e.focused });
		}
	}

	get viewColumn(): ViewColumn | undefined {
		return this._panel.viewColumn;
	}

	get visible() {
		return this._panel.visible;
	}

	onCompletePendingIpcRequest(e: WebviewIpcResponseMessage) {
		const pending = this._ipcPending.get(e.id);
		if (pending !== undefined) {
			this._ipcPending.delete(e.id);
			e.error == null ? pending.resolve(e.params) : pending.reject(new Error(e.error));
		}
	}

	onIpcNotification<NT extends NotificationType<any, any>>(
		type: NT,
		notification: WebviewIpcNotificationMessage,
		fn: (type: NT, params: NotificationParamsOf<NT>) => void
	) {
		fn(type, notification.params);
	}

	async onIpcRequest<RT extends RequestType<any, any, any, any>>(
		type: RT,
		request: WebviewIpcRequestMessage,
		fn: (type: RT, params: RequestParamsOf<RT>) => Promise<RequestResponseOf<RT>>
	) {
		try {
			const response = await fn(type, request.params);
			this.sendIpcResponse(request, response);
		} catch (ex) {
			Logger.error(ex);
			this.sendIpcResponse(request, ex);
		}
	}

	onIpcReady() {
		if (this._onIpcReadyResolver !== undefined) {
			this._onIpcReadyResolver(false);
		}
	}

	notify<NT extends NotificationType<any, any>>(type: NT, params: NotificationParamsOf<NT>): void {
		this.postMessage({ method: type.method, params: params });
	}

	@log()
	async reload(): Promise<void> {
		// Reset the html to get the webview to reload
		this._panel.webview.html = "";
		this._panel.webview.html = this._html!;
		this._panel.reveal(this._panel.viewColumn, false);

		void (await this.waitForWebviewIpcReadyNotification());
	}

	async send<RT extends RequestType<any, any, any, any>>(
		type: RT,
		params: RequestParamsOf<RT>
	): Promise<RequestResponseOf<RT>> {
		const result = await this.postMessage({ method: type.method, params: params }, false);
		if (!result) throw new Error(`Request ${type.method} to webview failed`);

		const id = this.nextIpcId();
		return new Promise((resolve, reject) => {
			this._ipcPending.set(id, { resolve, reject, method: type.method });

			const payload = {
				id,
				method: type.method,
				params: params
			};
			this.postMessage(payload);
			Logger.log(`Request ${id}:${type.method} sent to webview`, payload);
		});
	}

	@log({
		args: false
	})
	async show(streamThread?: StreamThread) {
		const cc = Logger.getCorrelationContext();
		if (!this._ipcReady || !this.visible || streamThread === undefined) {
			this._panel.reveal(this._panel.viewColumn, false);

			if (!this._ipcReady) {
				Logger.log(cc, "waiting for WebView ready");
				const cancelled = await this.waitForWebviewIpcReadyNotification();
				Logger.log(cc, `waiting for WebView complete. cancelled=${cancelled}`);
				if (cancelled) return;
			}
		}

		// TODO: Convert this to a request vs a notification
		if (streamThread) {
			this.notify(ShowStreamNotificationType, {
				streamId: streamThread.streamId,
				threadId: streamThread.id
			});
		}
	}

	@log({
		args: false
	})
	async triggerIpc() {}

	private clearIpc() {
		this._ipcQueue.length = 0;
	}

	private enqueueIpcMessage(msg: WebviewIpcMessage) {
		// Don't add any more messages if we are over the threshold
		if (this._ipcQueue.length > CodeStreamWebviewPanel.IpcQueueThreshold) return;

		this._ipcQueue.push(msg);
	}

	private _flushingPromise: Promise<boolean> | undefined;
	private async flushIpcQueue() {
		try {
			if (this._flushingPromise === undefined) {
				this._flushingPromise = this.flushIpcQueueCore();
			}
			return await this._flushingPromise;
		} finally {
			this._flushingPromise = undefined;
		}
	}

	private async flushIpcQueueCore() {
		Logger.log("WebviewPanel: Flushing pending queue");

		while (this._ipcQueue.length !== 0) {
			const msg = this._ipcQueue.shift();
			if (msg === undefined) continue;

			if (!(await this.postMessageCore(msg))) {
				this._ipcQueue.unshift(msg);

				Logger.log("WebviewPanel: FAILED flushing pending queue");
				return false;
			}
		}

		Logger.log("WebviewPanel: Completed flushing pending queue");
		return true;
	}

	private nextIpcId() {
		if (ipcSequence === Number.MAX_SAFE_INTEGER) {
			ipcSequence = 1;
		} else {
			ipcSequence++;
		}

		return `host:${ipcSequence}`;
	}

	private async postMessage(msg: WebviewIpcMessage, enqueue: boolean = true) {
		if (this._ipcPaused) {
			// HACK: If this is a response to a request try to service it
			if (isIpcResponseMessage(msg)) {
				const success = await this.postMessageCore(msg);
				if (success) return true;
			}

			if (enqueue) {
				this.enqueueIpcMessage(msg);
			}

			Logger.log(
				`WebviewPanel: FAILED posting ${toLoggableIpcMessage(
					msg
				)} to the webview; Webview is invisible and can't receive messages`
			);

			return false;
		}

		// If there is a pending flush operation, wait until it completes
		if (this._flushingPromise !== undefined) {
			if (!(await this._flushingPromise)) {
				Logger.log(`WebviewPanel: FAILED posting ${toLoggableIpcMessage(msg)} to the webview`);

				return false;
			}
		}

		const success = await this.postMessageCore(msg);
		if (!success && enqueue) {
			this.enqueueIpcMessage(msg);
		}
		return success;
	}

	private async postMessageCore(msg: WebviewIpcMessage) {
		let success;
		try {
			success = await this._panel!.webview.postMessage(msg);
		} catch (ex) {
			Logger.error(ex);
			success = false;
		}

		if (!success) {
			this._ipcPaused = true;
		}

		Logger.log(
			`WebviewPanel: ${success ? "Completed" : "FAILED"} posting ${toLoggableIpcMessage(
				msg
			)} to the webview`
		);

		return success;
	}

	private async resumeIpc() {
		if (!this._ipcPaused && this._ipcQueue.length === 0) return;

		this._ipcPaused = false;
		if (this._ipcQueue.length > CodeStreamWebviewPanel.IpcQueueThreshold) {
			Logger.log("WebviewPanel: Too out of date; reloading...");

			this._ipcQueue.length = 0;
			await this.reload();

			return false;
		}

		Logger.log("WebviewPanel: Resuming communication...");

		return this.flushIpcQueue();
	}

	private sendIpcResponse(request: WebviewIpcRequestMessage, error: Error): void;
	private sendIpcResponse(request: WebviewIpcRequestMessage, response: object): void;
	private sendIpcResponse(request: WebviewIpcRequestMessage, response: Error | object): void {
		this.postMessage(
			response instanceof ResponseError
				? {
						id: request.id,
						error: {
							code: response.code,
							message: response.message,
							data: response.data,
							stack: response.stack
						}
				  }
				: response instanceof Error
				? {
						id: request.id,
						error: response.message
				  }
				: {
						id: request.id,
						params: response
				  }
		);
	}

	@gate()
	private waitForWebviewIpcReadyNotification() {
		// Wait until the webview is ready
		return new Promise(resolve => {
			let timer: NodeJS.Timeout;
			if (Logger.level !== TraceLevel.Debug && !Logger.isDebugging) {
				timer = setTimeout(() => {
					Logger.warn("WebviewPanel: FAILED waiting for webview ready event; closing webview...");
					this.dispose();
					resolve(true);
				}, 30000);
			}

			this._onIpcReadyResolver = (cancelled: boolean) => {
				if (timer !== undefined) {
					clearTimeout(timer);
				}

				if (cancelled) {
					Logger.log("WebviewPanel: CANCELLED waiting for webview ready event");
					this.clearIpc();
				} else {
					this._ipcReady = true;
					this.resumeIpc();
				}

				this._onIpcReadyResolver = undefined;
				resolve(cancelled);
			};
		});
	}
}
