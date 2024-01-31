"use strict";
import { Disposable, commands, languages, workspace } from "vscode";
import { Container } from "../container";
import { SessionStatusChangedEvent } from "../api/session";
import { NrqlCodeLensProvider } from "providers/nrqlCodeLensProvider";
import { Logger } from "../logger";

export class NrqlCodeLensController implements Disposable {
	private _disposable: Disposable | undefined;
	private _provider: NrqlCodeLensProvider | undefined;
	private _providerDisposable: Disposable | undefined;
	private _status: any;

	constructor() {
		this._disposable = Disposable.from(
			Container.session.onDidChangeSessionStatus(this.onSessionStatusChanged, this),
			workspace.onDidSaveTextDocument(e => {
				// this will refresh the codeLenses
				commands.executeCommand("editor.action.refreshCodeLens");
			})
		);
	}

	dispose() {
		this._providerDisposable && this._providerDisposable.dispose();
		this._disposable && this._disposable.dispose();
	}

	private onSessionStatusChanged(e: SessionStatusChangedEvent) {
		this._status = e.getStatus();
		this._provider?.update(this._status);
	}

	create() {
		if (this._provider) {
			// do not attempt to destroy + recreate the provider as it will leave
			// orphaned codelenses on other editors -- leaving them in a state
			// where they cannot be clicked
			Logger.warn("NrqlCodeLensController:NrqlCodeLensProvider already created");
		}
		this._provider = new NrqlCodeLensProvider(Container.session);
		this._providerDisposable = Disposable.from(
			languages.registerCodeLensProvider([{ scheme: "file", language: "nrql" }], this._provider)
		);
	}
}