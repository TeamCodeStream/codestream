"use strict";
import { Disposable } from "vscode";
import { CodeStreamSession } from "../api/session";
import { WebviewEditor } from "webviews/webviewEditor";

export class EditorController implements Disposable {
	private _disposable: Disposable | undefined;

	constructor(
		public readonly session: CodeStreamSession,
		private _editor?: WebviewEditor
	) {
		// 	this._disposable = Disposable.from(
		// 		this._editor!.onDidMessageReceive(
		// 			(...args) => this.onWebviewMessageReceived(_editor, ...args),
		// 			this
		// 		)
		// 	);
	}

	// private async onWebviewMessageReceived(webview: any, e: WebviewIpcMessage) {
	// 	try {
	// 		console.log(webview, e);
	// 		debugger;
	// 		// Logger.log(`WebviewController: Received message ${toLoggableIpcMessage(e)} from the webview`);

	// 		// if (isIpcResponseMessage(e)) {
	// 		// 	webview.onCompletePendingIpcRequest(e);
	// 		// 	return;
	// 		// }

	// 		// const target = e.method.split("/")[0];
	// 		// switch (target) {
	// 		// 	case IpcRoutes.Agent:
	// 		// 		if (isIpcRequestMessage(e)) {
	// 		// 			webview.onIpcRequest(new RequestType<any, any, any, any>(e.method), e, (type, params) =>
	// 		// 				Container.agent.sendRequest(type, params)
	// 		// 			);

	// 		// 			return;
	// 		// 		}

	// 		// 		Container.agent.sendNotification(new NotificationType<any, any>(e.method), e.params);

	// 		// 		return;

	// 		// 	case IpcRoutes.Host:
	// 		// 		if (isIpcRequestMessage(e)) {
	// 		// 			this.onWebviewRequest(webview, e);
	// 		// 			return;
	// 		// 		}
	// 		// 		this.onWebviewNotification(webview, e);
	// 		// }
	// 	} catch (ex) {
	// 		debugger;
	// 		//Container.agent.reportMessage(ReportingMessageType.Error, ex.message);
	// 		//Logger.error(ex);
	// 	}
	// }

	// private onWebviewNotification(webview: WebviewLike, e: WebviewIpcNotificationMessage) {
	// 	switch (e.method) {
	// 		case WebviewDidInitializeNotificationType.method: {
	// 			// view is rendered and ready to receive messages
	// 			webview.onIpcReady();

	// 			break;
	// 		}
	// 		case WebviewDidChangeContextNotificationType.method: {
	// 			webview.onIpcNotification(WebviewDidChangeContextNotificationType, e, (_type, params) => {
	// 				this._context = params.context;
	// 				this.updateState();
	// 			});

	// 			break;
	// 		}
	// 		case EditorScrollToNotificationType.method: {
	// 			webview.onIpcNotification(
	// 				EditorScrollToNotificationType,
	// 				e,
	// 				(_type, { uri, position, ...options }) => {
	// 					Editor.scrollTo(
	// 						Uri.parse(uri),
	// 						Editor.fromSerializablePosition(position),
	// 						this._lastEditor,
	// 						options
	// 					);
	// 				}
	// 			);

	// 			break;
	// 		}
	// 		default: {
	// 			debugger;
	// 			throw new Error(`Unhandled webview notification: ${e.method}`);
	// 		}
	// 	}
	// }

	dispose() {
		this._disposable && this._disposable.dispose();
	}
}
