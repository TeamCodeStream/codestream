"use strict";
import { promises as fs } from "fs";
import { Event, Uri, ViewColumn, WebviewPanel, WebviewView, window } from "vscode";
import { CodeStreamSession } from "../api/session";
import { Logger } from "../logger";
import { NotificationType } from "vscode-languageclient";
import { WebviewIpcMessage } from "@codestream/protocols/webview";
import { NotificationParamsOf } from "./webviewLike";

export class WebviewEditor {
	public static readonly viewType = "editor.codestream";

	private readonly panel: WebviewPanel;
	private _webviewView?: WebviewView;
	private _codestreamSession: CodeStreamSession;
	private _extensionUri: Uri;

	public get onDidMessageReceive(): Event<any> {
		return this.panel!?.webview?.onDidReceiveMessage;
	}

	constructor(
		public readonly session: CodeStreamSession,
		public readonly extensionUri: Uri
	) {
		this._codestreamSession = session;
		this._extensionUri = extensionUri;

		this.panel = window.createWebviewPanel(
			"Codestream.editor",
			"CodeStream",
			{ viewColumn: ViewColumn.One, preserveFocus: false },
			{
				retainContextWhenHidden: true,
				enableFindWidget: true,
				enableCommandUris: true,
				enableScripts: true
			}
		);

		this.panel.iconPath = Uri.joinPath(this._extensionUri, "assets/images/codestream.png");

		const pathToExt = this.panel.webview
			.asWebviewUri(Uri.file(this._extensionUri.fsPath))
			.toString();

		const webviewPath = Uri.joinPath(this._extensionUri, "editor.html");

		fs.readFile(webviewPath.fsPath, {
			encoding: "utf8"
		}).then(data => {
			this.panel.webview.html = data.replace(/{{root}}/g, pathToExt);
		});
	}

	// public async resolveWebviewView(
	// 	webviewView: WebviewView,
	// 	context: WebviewViewResolveContext,
	// 	_token: CancellationToken
	// ) {
	// 	this._webviewView = webviewView;

	// 	webviewView.webview.options = {
	// 		// Allow scripts in the webview
	// 		enableScripts: true,
	// 		enableCommandUris: true,
	// 		localResourceRoots: [this._extensionUri]
	// 	};

	// 	webviewView.webview.html = await this.getHtml();
	// }

	private _html: string = "";

	public async getHtml(): Promise<string> {
		// NOTE: if you use workspace.openTextDocument, it will put the editor.html into
		// the lsp document cache, use fs.readFile instead
		if (!Logger.isDebugging && this._html) {
			return this._html;
		}

		const webviewPath = Uri.joinPath(this._extensionUri, "editor.html");

		const pathToExt = this.panel.webview
			.asWebviewUri(Uri.file(this._extensionUri.toString()))
			.toString();

		const data = await fs.readFile(webviewPath.toString(), {
			encoding: "utf8"
		});

		this._html = data.replace(/{{root}}/g, pathToExt);
		return this._html;
	}

	notify<NT extends NotificationType<any, any>>(type: NT, params: NotificationParamsOf<NT>): void {
		this.postMessage({ method: type.method, params: params });
	}
	private async postMessage(msg: WebviewIpcMessage, enqueue: boolean = true) {
		// debugger;
		await this.panel?.webview.postMessage(msg);
	}
}
