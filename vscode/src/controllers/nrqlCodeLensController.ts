"use strict";
import { Disposable, languages, workspace } from "vscode";
import { Container } from "../container";
import { SessionStatusChangedEvent } from "../api/session";
import { NrqlCodeLensProvider } from "providers/nrqlCodeLensProvider";

export class NrqlCodeLensController implements Disposable {
	private _disposable: Disposable | undefined;
	private _provider: NrqlCodeLensProvider | undefined;
	private _providerDisposable: Disposable | undefined;
	private _status: any;

	constructor() {
		this._disposable = Disposable.from(
			Container.session.onDidChangeSessionStatus(this.onSessionStatusChanged, this),
			workspace.onDidOpenTextDocument(e => {
				this._provider && this._provider.documentOpened(e);
			}),
			workspace.onDidCloseTextDocument(e => {
				this._provider && this._provider.documentClosed(e);
			})
		);
	}

	dispose() {
		this._providerDisposable && this._providerDisposable.dispose();
		this._disposable && this._disposable.dispose();
	}

	private onSessionStatusChanged(e: SessionStatusChangedEvent) {
		this._status = e.getStatus();
		this.ensureProvider();
		this._provider?.update(this._status);
	}

	refresh() {
		this.ensureProvider();
	}
	create() {
		this.ensureProvider();
	}

	private ensureProvider() {
		this._providerDisposable && this._providerDisposable.dispose();
		this._provider = new NrqlCodeLensProvider(Container.session);
		this._providerDisposable = Disposable.from(
			languages.registerCodeLensProvider([{ scheme: "file", language: "nrql" }], this._provider)
		);
	}
}
