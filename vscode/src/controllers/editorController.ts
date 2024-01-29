"use strict";
import fs from "fs";
import {
	Disposable,
	Position,
	Uri,
	WorkspaceEdit,
	commands,
	languages,
	window,
	workspace
} from "vscode";
import { CodeStreamSession } from "../api/session";

import {
	IpcRoutes,
	OpenInBufferRequestType,
	SaveFileRequestType,
	ShellPromptFolderRequestType,
	WebviewDidInitializeNotificationType,
	WebviewIpcMessage,
	WebviewIpcNotificationMessage,
	WebviewIpcRequestMessage,
	isIpcRequestMessage,
	isIpcResponseMessage
} from "@codestream/protocols/webview";
import { WebviewLike } from "webviews/webviewLike";
import { NotificationType, RequestType } from "vscode-languageclient";
import { Container } from "../container";

export class EditorController implements Disposable {
	private _disposable: Disposable | undefined;

	constructor(
		public readonly session: CodeStreamSession,
		private _editor: WebviewLike
	) {
		this._disposable = Disposable.from(
			this._editor!.onDidMessageReceive(
				(args: any) => this.onWebviewMessageReceived(_editor, args),
				this
			)
		);
	}

	private async onWebviewMessageReceived(webview: WebviewLike, e: WebviewIpcMessage) {
		try {
			// Logger.log(`WebviewController: Received message ${toLoggableIpcMessage(e)} from the webview`);

			if (isIpcResponseMessage(e)) {
				webview.onCompletePendingIpcRequest(e);
				return;
			}

			const target = e.method.split("/")[0];
			switch (target) {
				case IpcRoutes.Agent:
					if (isIpcRequestMessage(e)) {
						webview.onIpcRequest(
							new RequestType<any, any, any, any>(e.method),
							e,
							(type: any, params: unknown) => Container.agent.sendRequest(type, params)
						);

						return;
					}

					Container.agent.sendNotification(new NotificationType<any, any>(e.method), e.params);

					return;

				case IpcRoutes.Host:
					if (isIpcRequestMessage(e)) {
						this.onWebviewRequest(webview, e);
						return;
					}
					this.onWebviewNotification(webview, e);
			}
		} catch (ex) {
			debugger;
			//Container.agent.reportMessage(ReportingMessageType.Error, ex.message);
			//Logger.error(ex);
		}
	}

	private onWebviewNotification(webview: WebviewLike, e: WebviewIpcNotificationMessage) {
		switch (e.method) {
			case WebviewDidInitializeNotificationType.method: {
				// view is rendered and ready to receive messages
				webview.onIpcReady();
				break;
			}
			// 	case WebviewDidChangeContextNotificationType.method: {
			// 		webview.onIpcNotification(WebviewDidChangeContextNotificationType, e, (_type, params) => {
			// 			this._context = params.context;
			// 			this.updateState();
			// 		});
			// 		break;
			// 	}
			// 	case EditorScrollToNotificationType.method: {
			// 		webview.onIpcNotification(
			// 			EditorScrollToNotificationType,
			// 			e,
			// 			(_type, { uri, position, ...options }) => {
			// 				Editor.scrollTo(
			// 					Uri.parse(uri),
			// 					Editor.fromSerializablePosition(position),
			// 					this._lastEditor,
			// 					options
			// 				);
			// 			}
			// 		);
			// 		break;
			// 	}
			default: {
				debugger;
				// throw new Error(`Unhandled webview notification: ${e.method}`);
			}
		}
	}
	private async onWebviewRequest(webview: WebviewLike, e: WebviewIpcRequestMessage) {
		switch (e.method) {
			case ShellPromptFolderRequestType.method: {
				webview.onIpcRequest(ShellPromptFolderRequestType, e, async (_type, _params) => {
					const fileUri = await window.showOpenDialog({
						canSelectMany: false,
						canSelectFiles: false,
						canSelectFolders: true
					});

					let path: string | undefined = undefined;
					if (fileUri && fileUri[0]) {
						path = fileUri[0].fsPath;
					}
					return {
						path: path
					};
				});

				break;
			}
			case SaveFileRequestType.method: {
				webview.onIpcRequest(SaveFileRequestType, e, async (_type, _params) => {
					const path = _params.path + `/nrlogs-${new Date().getTime()}.json`;
					fs.writeFileSync(path, JSON.stringify(_params.data, null, 4));
					let uri = Uri.file(path);
					await commands.executeCommand("vscode.open", uri);
					return {
						success: true
					};
				});
				break;
			}
			case OpenInBufferRequestType.method: {
				webview.onIpcRequest(OpenInBufferRequestType, e, async (_type, _params) => {
					const document = await workspace.openTextDocument();
					const editor = await window.showTextDocument(document);

					if (_params.data) {
						const edit = new WorkspaceEdit();
						const newText =
							_params.contentType === "json" ? JSON.stringify(_params.data, null, 4) : _params.data;
						edit.insert(document.uri, new Position(0, 0), newText);
						await workspace.applyEdit(edit);
					}

					if (_params.contentType) {
						languages.setTextDocumentLanguage(editor.document, _params.contentType);
					}
					return {
						success: true
					};
				});
				break;
			}
			default: {
				debugger;
				throw new Error(`Unhandled webview request: ${e.method}`);
			}
		}
	}

	dispose() {
		this._disposable && this._disposable.dispose();
	}
}
