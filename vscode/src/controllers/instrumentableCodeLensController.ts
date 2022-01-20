"use strict";
import { ConfigurationChangeEvent, Disposable, languages } from "vscode";
import { Container } from "../container";
import { configuration } from "../configuration";
import { InstrumentationCodeLensProvider } from "../providers/instrumentationCodeLensProvider";
import { SessionStatus, SessionStatusChangedEvent } from "../api/session";

export class InstrumentableCodeLensController implements Disposable {
	private _disposable: Disposable | undefined;
	private _provider: InstrumentationCodeLensProvider | undefined;
	private _providerDisposable: Disposable | undefined;
	private _status: any;

	constructor() {
		this._disposable = Disposable.from(
			configuration.onDidChange(this.onConfigurationChanged, this),
			Container.session.onDidChangeSessionStatus(this.onSessionStatusChanged, this)
		);
		this.onConfigurationChanged();
	}

	dispose() {
		this._providerDisposable && this._providerDisposable.dispose();
		this._disposable && this._disposable.dispose();
	}

	private onAnyChanged() {
		const cfg = configuration.get<Boolean>(configuration.name("showGoldenSignalsInEditor").value);
		if (cfg) {
			if (this._status === SessionStatus.SignedIn) {
				this.ensureProvider();
			}
		} else {
			this._providerDisposable && this._providerDisposable.dispose();
			this._provider = undefined;
		}
	}

	private onConfigurationChanged(e?: ConfigurationChangeEvent) {
		if (
			e &&
			(configuration.changed(e, "showGoldenSignalsInEditor") ||
				configuration.changed(e, "goldenSignalsInEditorFormat"))
		) {
			this.onAnyChanged();
		}
	}

	private onSessionStatusChanged(e: SessionStatusChangedEvent) {
		this._status = e.getStatus();
		switch (this._status) {
			case SessionStatus.SignedOut:
				this._providerDisposable && this._providerDisposable.dispose();
				this._provider = undefined;
				break;

			case SessionStatus.SignedIn: {
				this.onAnyChanged();
				break;
			}
		}
	}

	private ensureProvider() {
		const template = configuration.get<string>(
			configuration.name("goldenSignalsInEditorFormat").value
		);
		if (!template) {
			return;
		}

		if (this._provider !== undefined) {
			this._provider.update(template);
			return;
		}

		this._providerDisposable && this._providerDisposable.dispose();

		this._provider = new InstrumentationCodeLensProvider(template);
		this._providerDisposable = Disposable.from(
			languages.registerCodeLensProvider([{ language: "python" }], this._provider)
		);
	}
}
