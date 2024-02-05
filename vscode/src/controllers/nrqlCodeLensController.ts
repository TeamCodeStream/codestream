"use strict";
import { NrqlCodeLensProvider } from "providers/nrqlCodeLensProvider";
import { Disposable, languages } from "vscode";
import { CodeStreamSession, SessionStatus, SessionStatusChangedEvent } from "../api/session";
import { Container } from "../container";
import { Logger } from "../logger";

export class NrqlCodeLensController implements Disposable {
	private _disposable: Disposable | undefined;
	private _provider: NrqlCodeLensProvider | undefined;
	private _status: SessionStatus | undefined = undefined;

	constructor(private session: CodeStreamSession) {}

	private onSessionStatusChanged(e: SessionStatusChangedEvent) {
		this._status = e.getStatus();
		Logger.log(`NrqlCodeLensController:onSessionStatusChanged status=${this._status}`);
		this._provider?.update(this._status);
	}

	update(status: SessionStatus) {
		this._status = status;
		this._provider?.update(status);
	}

	create() {
		if (this._provider) {
			Logger.warn("NrqlCodeLensController:NrqlCodeLensProvider already created!");
			return;
		}

		Logger.debug("NrqlCodeLensController:create");
		this._provider = new NrqlCodeLensProvider(Container.session);
		this._disposable = Disposable.from(
			languages.registerCodeLensProvider([{ scheme: "file", language: "nrql" }], this._provider),
			this.session.onDidChangeSessionStatus(this.onSessionStatusChanged, this)
		);
	}

	dispose() {
		Logger.debug("NrqlCodeLensController:dispose");

		this._disposable && this._disposable.dispose();
	}
}
