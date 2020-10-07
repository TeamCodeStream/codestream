"use strict";
import { ReviewDiffContentProvider } from "providers/diffContentProvider";
import { ExtensionContext, workspace } from "vscode";
import { WebviewLike } from "webviews/webviewLike";
import { BaseAgentOptions, CodeStreamAgentConnection } from "./agent/agentConnection";
import { CodeStreamSession } from "./api/session";
import { Commands } from "./commands";
import { Config, configuration, ConfigurationWillChangeEvent } from "./configuration";
import { LiveShareController } from "./controllers/liveShareController";
import { NotificationsController } from "./controllers/notificationsController";
import { StatusBarController } from "./controllers/statusBarController";
import { WebviewController } from "./controllers/webviewController";
import { Logger, TraceLevel } from "./logger";
import { CodeStreamCodeActionProvider } from "./providers/codeActionProvider";
import { CodemarkCodeLensProvider } from "./providers/markerCodeLensProvider";
import { CodemarkDecorationProvider } from "./providers/markerDecorationProvider";
import { CodemarkPatchContentProvider } from "./providers/patchContentProvider";
import { SelectionDecorationProvider } from "./providers/selectionDecorationProvider";
import { SetServerUrlRequestType } from "./protocols/agent/agent.protocol";
// import { WebviewSidebarActivator } from "./views/webviewSidebarActivator";

export class Container {
	static async initialize(
		context: ExtensionContext,
		config: Config,
		agentOptions: BaseAgentOptions,
		webviewLike?: WebviewLike
	) {
		this._context = context;
		this._config = config;

		this._version = agentOptions.extension.version;
		this._versionBuild = agentOptions.extension.build;
		this._versionFormatted = agentOptions.extension.versionFormatted;
		this._agent = new CodeStreamAgentConnection(context, agentOptions);
		// populate the initial values for the config items we care about.
		Container.interestedConfigurationItems.forEach(element => {
			try {
				element.value = element.getValue() as any;
			} catch {}
		});

		context.subscriptions.push((this._session = new CodeStreamSession(config.serverUrl)));

		context.subscriptions.push((this._notifications = new NotificationsController()));
		context.subscriptions.push((this._vsls = new LiveShareController()));

		context.subscriptions.push((this._commands = new Commands()));
		context.subscriptions.push((this._codeActions = new CodeStreamCodeActionProvider()));
		context.subscriptions.push((this._codeLens = new CodemarkCodeLensProvider()));
		context.subscriptions.push((this._diffContents = new ReviewDiffContentProvider()));
		context.subscriptions.push((this._markerDecorations = new CodemarkDecorationProvider()));
		context.subscriptions.push(new CodemarkPatchContentProvider());
		context.subscriptions.push((this._selectionDecoration = new SelectionDecorationProvider()));
		context.subscriptions.push((this._statusBar = new StatusBarController()));

		context.subscriptions.push((this._webview = new WebviewController(this._session, webviewLike)));
		context.subscriptions.push(configuration.onWillChange(this.onConfigurationChanging, this));
		context.subscriptions.push(configuration.onDidChangeAny(this.onConfigurationChangeAny, this));

		await this._agent.start();
	}

	// these are config items that we want to know about (if they change)
	static interestedConfigurationItems = [
		{
			getValue: () => workspace.getConfiguration("workbench.sideBar").get("location") || "left",
			value: ""
		}
	];

	static setServerUrl(serverUrl: string, disableStrictSSL: boolean) {
		this._session.setServerUrl(serverUrl);
		this._agent.sendRequest(SetServerUrlRequestType, { serverUrl, disableStrictSSL });
	}

	private static onConfigurationChanging(e: ConfigurationWillChangeEvent) {
		this._config = undefined;

		if (configuration.changed(e.change, configuration.name("traceLevel").value)) {
			Logger.level = configuration.get<TraceLevel>(configuration.name("traceLevel").value);
		}
	}

	private static onConfigurationChangeAny() {
		let requiresUpdate = false;
		for (const item of Container.interestedConfigurationItems) {
			const currentValue = item.value;

			let newValue;
			try {
				newValue = item.getValue();
			} catch {}
			if (!requiresUpdate) {
				requiresUpdate = currentValue !== newValue;
			}
			item.value = newValue as any;
		}
		if (requiresUpdate) {
			void this.webview.layoutChanged();
		}
	}

	private static _agent: CodeStreamAgentConnection;
	static get agent() {
		return this._agent;
	}

	private static _codeActions: CodeStreamCodeActionProvider;
	static get codeActions() {
		return this._codeActions;
	}

	private static _codeLens: CodemarkCodeLensProvider;
	static get codeLens() {
		return this._codeLens;
	}

	private static _commands: Commands;
	static get commands() {
		return this._commands;
	}

	private static _config: Config | undefined;
	static get config() {
		if (this._config === undefined) {
			this._config = configuration.get<Config>();
		}
		return this._config;
	}

	private static _diffContents: ReviewDiffContentProvider;
	static get diffContents() {
		return this._diffContents;
	}

	private static _context: ExtensionContext;
	static get context() {
		return this._context;
	}

	private static _markerDecorations: CodemarkDecorationProvider;
	static get markerDecorations() {
		return this._markerDecorations;
	}

	private static _notifications: NotificationsController;
	static get notifications() {
		return this._notifications;
	}

	private static _selectionDecoration: SelectionDecorationProvider;
	static get selectionDecoration() {
		return this._selectionDecoration;
	}

	private static _statusBar: StatusBarController;
	static get statusBar() {
		return this._statusBar;
	}

	private static _session: CodeStreamSession;
	static get session(): CodeStreamSession {
		return this._session;
	}

	private static _version: string;
	static get version(): string {
		return this._version;
	}

	private static _versionBuild: string;
	static get versionBuild(): string {
		return this._versionBuild;
	}

	private static _versionFormatted: string;
	static get versionFormatted(): string {
		return this._versionFormatted;
	}

	private static _vsls: LiveShareController;
	static get vsls() {
		return this._vsls;
	}

	private static _webview: WebviewController;
	static get webview() {
		return this._webview;
	}
}
