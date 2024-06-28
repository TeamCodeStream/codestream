"use strict";
import {
	ConfigurationChangeEvent,
	Disposable,
	StatusBarAlignment,
	StatusBarItem,
	window
} from "vscode";
import { CodeStreamEnvironment, SessionStatus, SessionStatusChangedEvent } from "../api/session";
import { configuration } from "../configuration";
import { Container } from "../container";

export class StatusBarController implements Disposable {
	private readonly _disposable: Disposable;
	private _enabledDisposable: Disposable | undefined;
	private _statusBarItem: StatusBarItem | undefined;

	constructor() {
		this._disposable = Disposable.from(
			configuration.onDidChange(this.onConfigurationChanged, this),
			Container.session.onDidChangeSessionStatus(this.onSessionStatusChanged, this),
			Container.agent.onDidSetEnvironment(() => {
				this.updateStatusBar(Container.session.status);
			})
		);

		this.onConfigurationChanged(configuration.initializingChangeEvent);
	}

	dispose() {
		this.clear();

		this._enabledDisposable && this._enabledDisposable.dispose();
		this._disposable && this._disposable.dispose();
	}

	private onConfigurationChanged(e: ConfigurationChangeEvent) {
		if (configuration.changed(e, configuration.name("showInStatusBar").value)) {
			const cfg = Container.config;

			if (this._enabledDisposable !== undefined) {
				this._enabledDisposable.dispose();
				this._enabledDisposable = undefined;
				this._statusBarItem = undefined;
			}

			if (cfg.showInStatusBar) {
				this._enabledDisposable = Disposable.from(
					Container.session.onDidChangeSessionStatus(this.onSessionStatusChanged, this),

					this.updateStatusBar(Container.session.status)
				);
			}
		}
	}

	private async onSessionStatusChanged(e: SessionStatusChangedEvent) {
		const status = e.getStatus();
		this.updateStatusBar(status);
	}

	async clear() {
		if (this._statusBarItem !== undefined) {
			this._statusBarItem.hide();
		}
	}

	update() {
		this.updateStatusBar(Container.session.status);
	}

	private updateStatusBar(status: SessionStatus) {
		if (this._statusBarItem === undefined) {
			const rightAlign = Container.config.showInStatusBar === "right";
			this._statusBarItem = window.createStatusBarItem(
				rightAlign ? StatusBarAlignment.Right : StatusBarAlignment.Left,
				rightAlign ? -99 : 5
			);
		}

		let env;
		switch (Container.session.environment) {
			// suppress additional environment message for production, or, once we have
			// region support in place, for production regions
			case CodeStreamEnvironment.Production:
			case CodeStreamEnvironment.RegionEU:
			case CodeStreamEnvironment.RegionUS:
			case CodeStreamEnvironment.Unknown:
				env = "";
				break;
			default:
				env = `${Container.session.environment.toUpperCase()}: `;
				break;
		}

		switch (status) {
			case SessionStatus.SigningOut:
				this._statusBarItem.text = ` $(sync~spin) ${env}Signing out... `;
				this._statusBarItem.command = undefined;
				this._statusBarItem.tooltip = "Tearing down CodeStream Agent, please wait";
				this._statusBarItem.color = undefined;
				break;
			case SessionStatus.SignedOut:
				this._statusBarItem.text = ` $(comment-discussion) ${env}CodeStream `;
				this._statusBarItem.command = "codestream.signIn";
				this._statusBarItem.tooltip = "Sign in to CodeStream...";
				this._statusBarItem.color = undefined;
				break;

			case SessionStatus.SigningIn:
				this._statusBarItem.text = ` $(sync~spin) ${env}Signing in... `;
				this._statusBarItem.command = undefined;
				this._statusBarItem.tooltip = "Signing in to CodeStream, please wait";
				this._statusBarItem.color = undefined;
				break;

			case SessionStatus.SignedIn:
				// let label = Container.session.user.name;
				let label = `CodeStream: ${Container.session.user.name}`;
				let tooltip = "Toggle CodeStream";
				if (!Container.session.hasSingleCompany()) {
					label += ` - ${Container.session.company.name}`;
				}

				this._statusBarItem.text = ` $(comment-discussion) ${env}${label} `;
				this._statusBarItem.command = "codestream.toggle";
				this._statusBarItem.tooltip = tooltip;
				break;
		}

		this._statusBarItem.show();

		return this._statusBarItem;
	}
}
