"use strict";
import { promises as fs } from "fs";

import { Deferred } from "@codestream/utils/system/deferred";

import {
	HostDidChangeFocusNotificationType,
	HostDidChangeVisibilityNotificationType,
	isIpcResponseMessage,
	WebviewIpcMessage,
	WebviewIpcNotificationMessage,
	WebviewIpcRequestMessage,
	WebviewIpcResponseMessage
} from "@codestream/protocols/webview";
import {
	CancellationToken,
	commands,
	Disposable,
	Event,
	EventEmitter,
	Uri,
	ViewColumn,
	WebviewView,
	WebviewViewProvider,
	WebviewViewResolveContext,
	window,
	WindowState
} from "vscode";
import { NotificationType, RequestType, ResponseError } from "vscode-jsonrpc";

import { gate } from "../system/decorators/gate";
import { CodeStreamSession } from "../api/session";
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
import { CodeStreamWebviewPanel } from "./webviewPanel";

let ipcSequence = 0;

export class CodeStreamWebviewSidebar implements WebviewLike, Disposable, WebviewViewProvider {
	type = "sidebar";
	public static readonly viewType = "activitybar.codestream";
	static readonly IpcQueueThreshold = 100;

	private _onDidClose = new EventEmitter<void>();
	get onDidClose(): Event<void> {
		return this._onDidClose.event;
	}

	private _onDidChangeVisibility = new EventEmitter<void>();
	get onDidChangeVisibility(): Event<void> {
		return this._onDidChangeVisibility.event;
	}

	public get onDidMessageReceive(): Event<any> {
		return this._webviewView!.webview.onDidReceiveMessage;
	}

	// Don't start the ipc right away, we need to wait until the webview is ready to receive
	private _ipcPaused: boolean = false;
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
	private _ipcReadyDeferred = new Deferred<boolean>();

	constructor(
		public readonly session: CodeStreamSession,
		private readonly _extensionUri: Uri
	) {
		this._ipcPending = new Map();
	}

	private _webviewView?: WebviewView;

	public async resolveWebviewView(
		webviewView: WebviewView,
		context: WebviewViewResolveContext,
		_token: CancellationToken
	) {
		Logger.log("resolveWebviewView starting", context);
		this._webviewView = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,
			enableCommandUris: true,
			localResourceRoots: [this._extensionUri]
		};

		webviewView.webview.html = await this.getHtml();

		this._disposable = Disposable.from(
			webviewView.onDidChangeVisibility(this.onWebviewDidChangeVisibility, this),
			webviewView.onDidDispose(this.onWebviewDisposed, this),
			window.onDidChangeWindowState(this.onWindowStateChanged, this)
		);

		Container.sidebar.onWebviewInitialized();
		await this.triggerIpc();
		Logger.log("resolveWebviewView completed");
		await this.triggerIpc();
	}

	private _html: string | undefined;

	private async getHtml(): Promise<string> {
		// NOTE: if you use workspace.openTextDocument, it will put the primary.html into
		// the lsp document cache, use fs.readFile instead

		if (!Logger.isDebugging && this._html) {
			return this._html;
		}

		const webviewPath = Container.context.asAbsolutePath("sidebar.html");

		const data = await fs.readFile(webviewPath, {
			encoding: "utf8"
		});

		if (!this._webviewView) {
			return "";
		}
		// asWebviewUri required for vscode web / codespaces
		const pathToExt = this._webviewView.webview
			.asWebviewUri(Uri.file(Container.context.extensionPath))
			.toString();
		let html = data.replace(/{{root}}/g, pathToExt);
		if (
			Container.telemetryOptions &&
			Container.telemetryOptions.browserIngestKey &&
			Container.telemetryOptions.accountId &&
			Container.telemetryOptions.webviewAppId &&
			Container.telemetryOptions.webviewAgentId
		) {
			try {
				const browserScript = Container.context.asAbsolutePath("dist/newrelic-browser.js");
				if (browserScript) {
					const browser = (await fs.readFile(browserScript))
						.toString()
						.replace(/{{accountID}}/g, Container.telemetryOptions.accountId!)
						.replace(/{{applicationID}}/g, Container.telemetryOptions.webviewAppId!)
						.replace(/{{agentID}}/g, Container.telemetryOptions.webviewAgentId!)
						.replace(/{{licenseKey}}/g, Container.telemetryOptions.browserIngestKey);
					html = html.replace("<head>", `<head><script type="text/javascript">${browser}</script>`);
				}
			} catch (ex) {
				Logger.log("NewRelic telemetry", { error: ex });
			}
		}
		this._html = html;
		return this._html;
	}

	dispose() {
		this._disposable && this._disposable.dispose();
	}

	private onWebviewDisposed() {
		this._onDidClose.fire();
	}

	private onWebviewDidChangeVisibility() {
		this.notify(HostDidChangeVisibilityNotificationType, { visible: this.visible });
	}

	// private _panelState: { active: boolean; visible: boolean } = {
	// 	active: true,
	// 	visible: true
	// };

	// private onPanelViewStateChanged(e: WebviewPanelOnDidChangeViewStateEvent) {
	// 	const previous = this._panelState;
	// 	this._panelState = { active: e.webviewPanel.active, visible: e.webviewPanel.visible };
	// 	if (this._panelState.visible === previous.visible) return;

	// 	if (!this._panelState.visible) {
	// 		this.notify(HostDidChangeFocusNotificationType, { focused: false });

	// 		return;
	// 	}

	// 	this.resumeIpc();

	// 	if (window.state.focused) {
	// 		this.notify(HostDidChangeFocusNotificationType, { focused: true });
	// 	}
	// }

	private onWindowStateChanged(e: WindowState) {
		if (this.visible) {
			this.notify(HostDidChangeFocusNotificationType, { focused: e.focused });
		}
	}

	get viewColumn(): ViewColumn | undefined {
		return undefined; // this._view._panel.viewColumn;
	}

	get visible() {
		return this._webviewView ? this._webviewView.visible : false; // this._panel.visible;
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
		this._ipcReadyDeferred.resolve(false);
	}

	notify<NT extends NotificationType<any, any>>(type: NT, params: NotificationParamsOf<NT>): void {
		this.postMessage({ method: type.method, params: params });
	}

	@log()
	async reload(): Promise<void> {
		// Reset the html to get the webview to reload
		if (this._webviewView) {
			this._webviewView.webview.html = "";
			this._webviewView.webview.html = this._html!;
		}

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

	@log({ args: false })
	async show() {
		if (!this.visible) {
			await commands.executeCommand("workbench.view.extension.codestream-activitybar");
		}
	}

	@log({ args: false })
	async triggerIpc() {
		const cc = Logger.getCorrelationContext();

		if (!this._ipcReady) {
			Logger.log(cc, "waiting for WebView ready");
			const cancelled = await this.waitForWebviewIpcReadyNotification();
			Logger.log(cc, `waiting for WebView complete. cancelled=${cancelled}`);
		}
	}

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
		Logger.log("WebviewSidebar: Flushing pending queue");

		while (this._ipcQueue.length !== 0) {
			const msg = this._ipcQueue.shift();
			if (msg === undefined) continue;

			if (!(await this.postMessageCore(msg))) {
				this._ipcQueue.unshift(msg);

				Logger.log("WebviewSidebar: FAILED flushing pending queue");
				return false;
			}
		}

		Logger.log("WebviewSidebar: Completed flushing pending queue");
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
				`WebviewSidebar: FAILED posting ${toLoggableIpcMessage(
					msg
				)} to the sidebar; The Sidebar is invisible and can't receive messages`
			);

			return false;
		}

		// If there is a pending flush operation, wait until it completes
		if (this._flushingPromise !== undefined) {
			if (!(await this._flushingPromise)) {
				Logger.log(`WebviewSidebar: FAILED posting ${toLoggableIpcMessage(msg)} to the webview`);

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
			// we might not have a webviewView.webview at this point
			if (!this._webviewView || !this._webviewView.webview) {
				success = false;
			} else {
				success = await this._webviewView.webview.postMessage(msg);
			}
		} catch (ex) {
			Logger.error(ex);
			success = false;
		}

		if (!success) {
			this._ipcPaused = true;
		}

		Logger.log(
			`WebviewSidebar: ${success ? "Completed" : "FAILED"} posting ${toLoggableIpcMessage(
				msg
			)} to the sidebar`
		);

		return success;
	}

	private async resumeIpc() {
		if (!this._ipcPaused && this._ipcQueue.length === 0) return;

		this._ipcPaused = false;
		if (this._ipcQueue.length > CodeStreamWebviewPanel.IpcQueueThreshold) {
			Logger.log("WebviewSidebar: Too out of date; reloading...");

			this._ipcQueue.length = 0;
			await this.reload();

			return false;
		}

		Logger.log("WebviewSidebar: Resuming communication...");

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
	private async waitForWebviewIpcReadyNotification(): Promise<boolean> {
		// Wait until the webview is ready
		let timer: NodeJS.Timeout | undefined = undefined;
		if (Logger.level !== TraceLevel.Debug && !Logger.isDebugging) {
			timer = setTimeout(() => {
				Logger.warn("WebviewSidebar: FAILED waiting for webview ready event; closing webview...");
				this.dispose();
				this._ipcReadyDeferred.resolve(true);
			}, 30000);
		}

		const cancelled = await this._ipcReadyDeferred.promise;

		if (timer !== undefined) {
			clearTimeout(timer);
		}

		if (cancelled) {
			Logger.log("WebviewSidebar: CANCELLED waiting for webview ready event");
			this.clearIpc();
		} else {
			this._ipcReady = true;
			this.resumeIpc();
		}
		return cancelled;
	}
}
