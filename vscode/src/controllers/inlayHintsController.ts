// "use strict";
// import { ConfigurationChangeEvent, Disposable, languages, workspace } from "vscode";

// import { SymbolLocator } from "../providers/symbolLocator";
// import { Container } from "../container";
// import { configuration } from "../configuration";
// import { SessionStatus, SessionStatusChangedEvent } from "../api/session";
// import { CodeStreamInlayHintsProvider } from "providers/inlayHintProvider";
// import { Logger } from "logger";

// export class InlayHintsController implements Disposable {
// 	private _disposable: Disposable | undefined;
// 	private _provider: CodeStreamInlayHintsProvider | undefined;
// 	private _providerDisposable: Disposable | undefined;
// 	private _status: any;

// 	constructor() {
// 		this._disposable = Disposable.from(
// 			configuration.onDidChange(this.onConfigurationChanged, this),
// 			Container.session.onDidChangeSessionStatus(this.onSessionStatusChanged, this),
// 			// workspace.onDidOpenTextDocument(e => {
// 			// 	this._provider && this._provider.documentOpened(e);
// 			// }),
// 			// workspace.onDidCloseTextDocument(e => {
// 			// 	this._provider && this._provider.documentClosed(e);
// 			// })
// 		);
// 		this.onConfigurationChanged();
// 	}

// 	dispose() {
// 		this._providerDisposable && this._providerDisposable.dispose();
// 		this._disposable && this._disposable.dispose();
// 	}

// 	private onAnyChanged() {
// 		const cfg = configuration.get<boolean>(configuration.name("goldenSignalsInEditor").value);
// 		if (cfg) {
// 			if (this._status === SessionStatus.SignedIn) {
// 				this.ensureProvider();
// 			}
// 		} else {
// 			this._providerDisposable && this._providerDisposable.dispose();
// 			this._provider = undefined;
// 		}
// 	}

// 	private onConfigurationChanged(e?: ConfigurationChangeEvent) {
// 		if (
// 			e &&
// 			(configuration.changed(e, "goldenSignalsInEditor") ||
// 				configuration.changed(e, "goldenSignalsInEditorFormat"))
// 		) {
// 			this.onAnyChanged();
// 		}
// 	}

// 	private onSessionStatusChanged(e: SessionStatusChangedEvent) {
// 		this._status = e.getStatus();
// 		switch (this._status) {
// 			case SessionStatus.SignedOut:
// 				this._providerDisposable && this._providerDisposable.dispose();
// 				this._provider = undefined;
// 				break;

// 			case SessionStatus.SignedIn: {
// 				this.onAnyChanged();
// 				break;
// 			}
// 		}
// 	}

// 	refresh() {
// 		this.ensureProvider();
// 	}

// 	private ensureProvider() {
// 		const template = configuration.get<string>(
// 			configuration.name("goldenSignalsInEditorFormat").value
// 		);
// 		if (!template) {
// 			return;
// 		}

// 		if (this._provider !== undefined) {
// 			// this._provider.update(template);
// 			return;
// 		}

// 		this._providerDisposable && this._providerDisposable.dispose();

// 		Logger.log("*** Creating new CodeStreamInlayHintsProvider");

// 		this._provider = new CodeStreamInlayHintsProvider(
// 			template,
// 			new SymbolLocator(),
// 			Container.agent.observability!,
// 		);
// 		this._providerDisposable = Disposable.from(
// 			this._provider
// 		);
// 	}
// }
