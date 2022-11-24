import { ChangeDataType, DidChangeDataNotificationType } from "@codestream/protocols/agent";
import { Disposable, TextDocumentChangeEvent } from "vscode-languageserver";
import { URI } from "vscode-uri";

import { DocumentManager } from "./documentManager";
import { CodeStreamSession } from "./session";
import { Disposables } from "./system/disposable";
import { xfs } from "./xfs";

export class DocumentEventHandler {
	private _disposable: Disposable | undefined;

	constructor(private session: CodeStreamSession, private documentManager: DocumentManager) {
		const disposables: Disposable[] = [
			this.documentManager.onDidChangeContent(this.onDocumentDidChangeContent, this),
			this.documentManager.onDidSave(this.onDocumentDidSave, this),
			this.documentManager.onDidClose(this.onDocumentDidClose, this),
			this.documentManager.onDidOpen(this.onDocumentDidOpen, this),
		];
		this._disposable = Disposables.from(...disposables);
	}

	async onDocumentDidOpen(e: TextDocumentChangeEvent) {
		// treat the open as a change
		this.session.agent.sendNotification(DidChangeDataNotificationType, {
			type: ChangeDataType.Documents,
			data: {
				reason: "changed",
				document: {
					isDirty: false,
					uri: e.document.uri,
				},
			},
		});
	}

	async onDocumentDidClose(e: TextDocumentChangeEvent) {
		this.session.agent.sendNotification(DidChangeDataNotificationType, {
			type: ChangeDataType.Documents,
			data: {
				reason: "removed",
				document: {
					isDirty: undefined,
					uri: e.document.uri,
				},
			},
		});
	}

	async onDocumentDidSave(e: TextDocumentChangeEvent) {
		this.session.agent.sendNotification(DidChangeDataNotificationType, {
			type: ChangeDataType.Documents,
			data: {
				reason: "saved",
				document: {
					isDirty: false,
					uri: e.document.uri,
				},
			},
		});
	}

	async onDocumentDidChangeContent(e: TextDocumentChangeEvent) {
		if (!this.session.useEnhancedDocumentChangeHandler) return;

		const fsPath = URI.parse(e.document.uri).fsPath;
		const storedText = await xfs.readText(fsPath);
		const isSame = storedText === e.document.getText();

		// Since we get a didChangeContent change when a document is changed
		// via git or something outside of the ide (we don't get an onDocumentDidSave)
		// see if what is in the buffer is the same as what is on disk.
		// if so, then treat the notification as a `save` rather than a `change`
		this.session.agent.sendNotification(DidChangeDataNotificationType, {
			type: ChangeDataType.Documents,
			data: {
				reason: isSame ? "saved" : "changed",
				document: {
					isDirty: isSame ? false : true,
					uri: e.document.uri,
				},
			},
		});
	}

	dispose() {
		this._disposable && this._disposable.dispose();
	}
}
