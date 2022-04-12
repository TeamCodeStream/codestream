"use strict";
// keep this as the first import
import * as NewRelic from "newrelic";

import * as fs from "fs";
import * as os from "os";
import {
	CancellationToken,
	ClientCapabilities,
	Connection,
	DidChangeConfigurationNotification,
	Disposable,
	Emitter,
	Event,
	InitializedParams,
	InitializeError,
	InitializeParams,
	InitializeResult,
	NotificationHandler,
	NotificationType,
	RequestHandler,
	RequestHandler0,
	RequestType,
	RequestType0,
	TextDocuments,
	TextDocumentSyncKind
} from "vscode-languageserver";

import { DocumentManager } from "./documentManager";
import { setGitPath } from "./git/git";
import { Logger } from "./logger";
import {
	AgentInitializedNotificationType,
	BaseAgentOptions,
	DidChangeDataNotificationType,
	LogoutReason
} from "./protocol/agent.protocol";
import { CodeStreamSession } from "./session";
import { Disposables, Functions, log, memoize } from "./system";

type NotificationParamsOf<NT> = NT extends NotificationType<infer N, any> ? N : never;
type RequestParamsOf<RT> = RT extends RequestType<infer R, any, any, any> ? R : never;
type RequestResponseOf<RT> = RT extends RequestType<any, infer R, any, any> ? R : never;

export class CodeStreamAgent implements Disposable {
	private _onReady = new Emitter<void>();
	get onReady(): Event<void> {
		return this._onReady.event;
	}

	readonly documents: DocumentManager;
	rootUri: string | undefined;

	private _clientCapabilities: ClientCapabilities | undefined;
	private _agentOptions: BaseAgentOptions | undefined = undefined;
	private _disposable: Disposable | undefined;
	private readonly _logger: LspLogger;
	private _session: CodeStreamSession | undefined;
	private _signedIn: boolean = false;

	constructor(
		private readonly _connection: Connection,
		options: {
			documents?: TextDocuments;
			logger?: LspLogger;
			onInitialize?: RequestHandler<InitializeParams, InitializeResult, InitializeError>;
			onInitialized?: NotificationHandler<InitializedParams>;
		} = {}
	) {
		this._logger = options.logger || new ConnectionLspLogger(this._connection);
		Logger.initialize(this);

		this._connection.onInitialize(options.onInitialize || this.onInitialize.bind(this));
		this._connection.onInitialized(options.onInitialized || this.onInitialized.bind(this));

		this.documents = new DocumentManager(
			options.documents || new TextDocuments(),
			this._connection
		);
	}

	dispose() {
		this._disposable && this._disposable.dispose();
		this.documents.dispose();
		this._session && this._session.dispose();
	}

	get connection() {
		return this._connection;
	}

	private _recordRequests = false;
	get recordRequests(): boolean {
		return this._recordRequests;
	}

	get signedIn() {
		return this._signedIn;
	}

	@memoize
	get supportsConfiguration() {
		return (
			(this._clientCapabilities &&
				this._clientCapabilities.workspace &&
				!!this._clientCapabilities.workspace.configuration) ||
			false
		);
	}

	@memoize
	get supportsWorkspaces() {
		return (
			(this._clientCapabilities &&
				this._clientCapabilities.workspace &&
				!!this._clientCapabilities.workspace.workspaceFolders) ||
			false
		);
	}

	async onInitialize(e: InitializeParams) {
		try {
			const capabilities = e.capabilities;
			this._clientCapabilities = capabilities;
			this.rootUri = e.rootUri == null ? undefined : e.rootUri;

			const agentOptions = e.initializationOptions! as BaseAgentOptions;
			this._agentOptions = agentOptions;
			Logger.level = agentOptions.traceLevel;

			await setGitPath(agentOptions.gitPath);

			if (agentOptions.isDebugging) {
				Logger.overrideIsDebugging();
			}

			// Pause for a bit to give the debugger a window of time to connect -- mainly for startup issues
			if (Logger.isDebugging) {
				void (await Functions.wait(5000));
			}

			Logger.log(
				`Agent for CodeStream v${agentOptions.extension.versionFormatted} in ${agentOptions.ide.name} (v${agentOptions.ide.version}) initializing...`
			);

			this._recordRequests = Boolean(agentOptions.recordRequests);
			if (this._recordRequests) {
				const now = Date.now();
				const fs = require("fs");
				const filename = `/tmp/dump-${now}-agent_options.json`;
				const outString = JSON.stringify(agentOptions, null, 2);

				fs.writeFile(filename, outString, "utf8", () => {
					Logger.log(`Written ${filename}`);
				});
			}

			this._session = new CodeStreamSession(this, this._connection, agentOptions);

			this._onReady.fire(undefined);

			return {
				capabilities: {
					textDocumentSync: TextDocumentSyncKind.Full
					// hoverProvider: true
				},
				result: {}
			} as InitializeResult;
		} catch (ex) {
			// debugger;
			Logger.error(ex);
			// TODO: Probably should avoid throwing here and return better error reporting to the extension
			throw ex;
		}
	}

	async onInitialized(e: InitializedParams) {
		try {
			const subscriptions = [];

			if (this.supportsConfiguration) {
				// Register for all configuration changes
				subscriptions.push(
					await this._connection.client.register(DidChangeConfigurationNotification.type, undefined)
				);
			}

			this._disposable = Disposables.from(...subscriptions);

			this.sendNotification(AgentInitializedNotificationType, undefined);

			// this._signedIn = true;
			// this._onReady.fire(undefined);
		} catch (ex) {
			// debugger;
			Logger.error(ex);
			// TODO: Probably should avoid throwing here and return better error reporting to the extension
			throw ex;
		}
	}

	async logout(reason: LogoutReason) {
		this._session!.logout(reason);
	}

	registerHandler<R, E, RO>(type: RequestType0<R, E, RO>, handler: RequestHandler0<R, E>): void;
	registerHandler<P, R, E, RO>(
		type: RequestType<P, R, E, RO>,
		handler: RequestHandler<P, R, E>
	): void;
	@log({
		args: false,
		prefix: (context, type) => `${context.prefix}(${type.method})`,
		timed: false
	})
	registerHandler(type: any, handler: any): void {
		if (this.recordRequests) {
			this._connection.onRequest(type, async function() {
				const now = Date.now();
				const fs = require("fs");
				const sanitize = require("sanitize-filename");
				const sanitizedURL = sanitize(type.method.replace(/\//g, "_"));
				const method = type.method;

				let result = handler.apply(null, arguments);
				if (typeof result.then === "function") {
					result = await result;
				}
				const out = {
					method: method,
					request: arguments[0],
					response: result
				};
				const outString = JSON.stringify(out, null, 2);
				const filename = `/tmp/dump-${now}-agent-${sanitizedURL}.json`;

				fs.writeFile(filename, outString, "utf8", () => {
					Logger.log(`Written ${filename}`);
				});

				return result;
			});
		} else {
			if (this._agentOptions?.newRelicTelemetryEnabled) {
				const that = this;
				return this._connection.onRequest(type, function() {
					const args = arguments;
					let addition = "";
					if (type?.method === "codestream/provider/generic") {
						const arg = args[0] || {};
						addition = `/${arg.providerId?.replace(/\*/g, "-")}/${arg.method}`;
					}

					return NewRelic.startWebTransaction(type.method + addition, () => {
						NewRelic.addCustomAttributes({
							...(that.createNewRelicCustomAttributes() as any),
							messageType: "request"
						});
						return handler.apply(null, args);
					});
				});
			} else {
				return this._connection.onRequest(type, handler);
			}
		}
	}

	@log({
		args: { 0: type => type.method },
		prefix: (context, type, params) =>
			`${context.prefix}(${type.method}${
				type.method === DidChangeDataNotificationType.method ? `:${params.type}` : ""
			})`
	})
	sendNotification<NT extends NotificationType<any, any>>(
		type: NT,
		params: NotificationParamsOf<NT>
	): void {
		if (this._agentOptions?.newRelicTelemetryEnabled) {
			const that = this;
			return NewRelic.startWebTransaction(type.method, function() {
				NewRelic.addCustomAttributes({
					...(that.createNewRelicCustomAttributes() as any),
					messageType: "notification"
				});
				return that._connection.sendNotification(type, params);
			});
		} else {
			return this._connection.sendNotification(type, params);
		}
	}

	@log({
		args: {
			0: type => type.method,
			1: params => params
		},
		prefix: (context, type, params) =>
			`${context.prefix}(${type.method}${
				type.method === DidChangeDataNotificationType.method ? `:${params.type}` : ""
			})`
	})
	sendRequest<RT extends RequestType<any, any, any, any>>(
		type: RT,
		params: RequestParamsOf<RT>,
		token?: CancellationToken
	): Thenable<RequestResponseOf<RT>> {
		if (this._agentOptions?.newRelicTelemetryEnabled) {
			const that = this;
			return NewRelic.startWebTransaction(type.method, function() {
				NewRelic.addCustomAttributes({
					...(that.createNewRelicCustomAttributes() as any),
					messageType: "request"
				});
				return that._connection.sendRequest(type, params, token);
			});
		} else {
			return this._connection.sendRequest(type, params, token);
		}
	}

	private createNewRelicCustomAttributes() {
		const that = this;
		try {
			const session = that._session || { teamId: "", userId: "", email: "", environment: "" };
			return {
				csEnvironment: session.environment,
				email: session?.email,

				extensionBuildEnv: that._agentOptions?.extension?.buildEnv,
				extensionVersion: that._agentOptions?.extension?.version,

				ideDetail: that._agentOptions?.ide?.detail,
				ideName: that._agentOptions?.ide?.name,
				ideVersion: that._agentOptions?.ide?.version,

				platform: os.platform(),
				proxySupport: that._agentOptions?.proxySupport,
				serverUrl: that._agentOptions?.serverUrl,
				teamId: session.teamId || "",
				userId: session.userId || ""
			};
		} catch (ex) {
			Logger.warn(`createNewRelicCustomAttributes error - ${ex.message}`);
		}
		return {};
	}

	error(exception: Error): void;
	error(message: string): void;
	error(exceptionOrmessage: Error | string): void {
		this._logger.error(
			typeof exceptionOrmessage === "string" ? exceptionOrmessage : exceptionOrmessage.toString()
		);
	}

	log(message: string): void {
		this._logger.log(message);
	}

	warn(message: string): void {
		this._logger.warn(message);
	}
}

export interface LspLogger {
	log(message: string): void;
	warn(message: string): void;
	error(exception: Error): void;
	error(message: string): void;
	error(exceptionOrmessage: Error | string): void;
}

export class ConnectionLspLogger implements LspLogger {
	private readonly _connection: Connection;

	constructor(connection: Connection) {
		this._connection = connection;
	}

	log(message: string): void {
		this._connection.console.log(message);
	}

	warn(message: string): void {
		this._connection.console.warn(message);
	}

	error(exception: Error): void;
	error(message: string): void;
	error(exceptionOrmessage: Error | string): void {
		this._connection.console.error(
			typeof exceptionOrmessage === "string" ? exceptionOrmessage : exceptionOrmessage.toString()
		);
	}
}

export class FileLspLogger implements LspLogger {
	private readonly _logFile: fs.WriteStream;

	constructor(logPath: string) {
		this._logFile = fs.createWriteStream(logPath, {
			flags: "w"
		});
		this.log(`initialized log at ${logPath}`);
	}
	log(message: string): void {
		this._logFile.write(`${message}\n`);
	}
	warn(message: string): void {
		this._logFile.write(`${message}\n`);
	}
	error(exception: Error): void;
	error(message: string): void;
	error(exceptionOrmessage: Error | string): void {
		this._logFile.write(
			`${
				typeof exceptionOrmessage === "string" ? exceptionOrmessage : exceptionOrmessage.toString()
			}\n`
		);
	}
}

export class NullLspLogger implements LspLogger {
	log(message: string): void {}
	warn(message: string): void {}
	error(exception: Error): void;
	error(message: string): void;
	error(exceptionOrmessage: Error | string): void {}
}
