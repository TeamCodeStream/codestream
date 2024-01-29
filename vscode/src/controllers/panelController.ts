"use strict";
import {
	OpenEditorViewNotificationType,
	OpenEditorViewNotification
} from "@codestream/protocols/webview";
import { Disposable, ExtensionContext } from "vscode";
import { log } from "../system";
import { CodeStreamSession, SessionStatus, SessionStatusChangedEvent } from "../api/session";
import { Logger } from "../logger";
import { CodeStreamWebviewPanel } from "webviews/webviewPanel";
import { EditorController } from "./editorController";
import { randomUUID } from "crypto";

interface PanelInitialization {
	panel: CodeStreamWebviewPanel;
	controller: EditorController;
}

export class PanelController implements Disposable {
	private _panelInitializations: { [Identifier: string]: PanelInitialization } = {};
	private _disposable: Disposable | undefined;

	constructor(
		private context: ExtensionContext,
		public readonly session: CodeStreamSession
	) {
		this._disposable = Disposable.from(
			this.session.onDidChangeSessionStatus(this.onSessionStatusChanged, this)
		);
	}

	private async onSessionStatusChanged(e: SessionStatusChangedEvent) {
		const status = e.getStatus();
		switch (status) {
			case SessionStatus.SignedOut:
				this.disposePanelInitializations();
		}
	}

	private disposePanelInitializations() {
		try {
			if (!this._panelInitializations) return;

			Object.keys(this._panelInitializations).forEach(lpi => {
				const { panel } = this._panelInitializations[lpi];
				panel.dispose();
			});
		} catch (ex) {}
	}

	@log()
	initializeOrShowEditor(e: OpenEditorViewNotification) {
		let editorKey = "";
		if (e.panel === "nrql") {
			editorKey = e.hash! || `${e.panel}-${e.entityGuid}`;
		} else {
			editorKey = `${e.panel}-${e.entityGuid}`;

			if (e.query) {
				// hack until I can figure out how to funnel a search term into an already open logs window.
				editorKey = `${editorKey}-${randomUUID()}`;
			}
		}

		if (!this._panelInitializations[editorKey]) {
			const panel = new CodeStreamWebviewPanel(this.session, this.context, e, () => {});

			const controller = new EditorController(this.session, panel);
			const onDidClose = () => {
				const initialization = this._panelInitializations[editorKey];
				delete this._panelInitializations[editorKey];
			};
			panel.onDidClose(() => {
				onDidClose();
			});

			this._panelInitializations[editorKey] = {
				panel: panel,
				controller: controller
			};
		} else {
			const { panel } = this._panelInitializations[editorKey];
			if (panel) {
				Logger.debug(
					`sidebarController: Found existing panel for key ${editorKey} (${panel.name})`
				);
				panel.show().then(_ => {
					panel.notify(OpenEditorViewNotificationType, e);
				});
			} else {
				Logger.warn(`sidebarController: Could not find existing panel for key ${editorKey}`);
			}
		}
	}

	dispose() {
		this.disposePanelInitializations();
		this._disposable && this._disposable.dispose();
	}
}
