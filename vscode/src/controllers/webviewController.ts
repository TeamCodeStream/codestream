"use strict";
import * as fs from "fs";
import {
	ApiVersionCompatibility,
	ConnectionStatus,
	DidChangeApiVersionCompatibilityNotification,
	DidChangeApiVersionCompatibilityNotificationType,
	DidChangeConnectionStatusNotification,
	DidChangeConnectionStatusNotificationType,
	DidChangeDataNotification,
	DidChangeDataNotificationType,
	DidChangeDocumentMarkersNotification,
	DidChangeDocumentMarkersNotificationType,
	DidChangeServerUrlNotification,
	DidChangeServerUrlNotificationType,
	DidChangeVersionCompatibilityNotification,
	DidChangeVersionCompatibilityNotificationType,
	DidEncounterMaintenanceModeNotificationType,
	ReportingMessageType,
	VersionCompatibility
} from "@codestream/protocols/agent";
import { CodemarkType, CSApiCapabilities } from "@codestream/protocols/api";
import {
	ActiveEditorInfo,
	ApplyMarkerRequestType,
	BootstrapInHostRequestType,
	CompareMarkerRequestType,
	EditorContext,
	EditorHighlightRangeRequestType,
	EditorRevealRangeRequestType,
	EditorScrollToNotificationType,
	EditorSelectRangeRequestType,
	GetActiveEditorContextRequestType,
	HostDidChangeActiveEditorNotificationType,
	HostDidChangeConfigNotificationType,
	HostDidChangeEditorSelectionNotificationType,
	HostDidChangeEditorVisibleRangesNotificationType,
	HostDidChangeVisibleEditorsNotificationType,
	HostDidLogoutNotificationType,
	HostDidReceiveRequestNotificationType,
	InsertTextRequestType,
	IpcRoutes,
	isIpcRequestMessage,
	isIpcResponseMessage,
	LiveShareInviteToSessionRequestType,
	LiveShareJoinSessionRequestType,
	LiveShareStartSessionRequestType,
	LocalFilesCloseDiffRequestType,
	LogoutRequestType,
	NewCodemarkNotificationType,
	NewReviewNotificationType,
	OpenUrlRequestType,
	ReloadWebviewRequestType,
	RestartRequestType,
	ReviewCloseDiffRequestType,
	ReviewShowDiffRequestType,
	ReviewShowLocalDiffRequestType,
	ShellPromptFolderRequestType,
	ShowCodemarkNotificationType,
	ShowNextChangedFileNotificationType,
	ShowPreviousChangedFileNotificationType,
	ShowNextChangedFileRequestType,
	ShowPreviousChangedFileRequestType,
	ShowReviewNotificationType,
	StartWorkNotificationType,
	UpdateConfigurationRequestType,
	UpdateServerUrlRequestType,
	WebviewContext,
	WebviewDidChangeContextNotificationType,
	WebviewDidInitializeNotificationType,
	WebviewIpcMessage,
	WebviewIpcNotificationMessage,
	WebviewIpcRequestMessage,
	WebviewPanels,
	TraverseDiffsRequestType,
	CompareLocalFilesRequestType,
	NewPullRequestNotificationType, ShowPullRequestNotificationType
} from "@codestream/protocols/webview";
import { gate } from "system/decorators/gate";
import {
	commands,
	ConfigurationChangeEvent,
	ConfigurationTarget,
	Disposable,
	TextEditor,
	TextEditorSelectionChangeEvent,
	TextEditorVisibleRangesChangeEvent,
	Uri,
	ViewColumn,
	window,
	workspace,
	env
} from "vscode";
import { NotificationType, RequestType } from "vscode-languageclient";
import { Strings } from "system/string";
import { openUrl } from "urlHandler";
import {
	CodeStreamSession,
	SessionSignedOutReason,
	SessionStatus,
	SessionStatusChangedEvent,
	StreamThread
} from "../api/session";
import { WorkspaceState } from "../common";
import { configuration } from "../configuration";
import { Container } from "../container";
import { Editor } from "../extensions";
import { Logger } from "../logger";
import { Functions, log } from "../system";
import { CodeStreamWebviewPanel, toLoggableIpcMessage } from "../webviews/webviewPanel";
import { BuiltInCommands } from "../constants";
import * as csUri from "../system/uri";

const emptyObj = {};

export interface WebviewState {
	hidden: boolean | undefined;
	teams: {
		[teamId: string]: {
			context?: WebviewContext;
		};
	};
}

export class WebviewController implements Disposable {
	// private _bootstrapPromise: Promise<BootstrapResponse> | undefined;
	private _context: WebviewContext | undefined;
	private _disposable: Disposable | undefined;
	private _disposableWebview: Disposable | undefined;
	private _webview: CodeStreamWebviewPanel | undefined;
	private _versionCompatibility: VersionCompatibility | undefined;
	private _apiVersionCompatibility: ApiVersionCompatibility | undefined;
	private _missingCapabilities: CSApiCapabilities | undefined;
	private _resuscitations: number = 1;

	private readonly _notifyActiveEditorChangedDebounced: (e: TextEditor | undefined) => void;

	constructor(public readonly session: CodeStreamSession) {
		this._disposable = Disposable.from(
			this.session.onDidChangeSessionStatus(this.onSessionStatusChanged, this),
			window.onDidChangeActiveTextEditor(this.onActiveEditorChanged, this),
			window.onDidChangeVisibleTextEditors(this.onVisibleEditorsChanged, this),
			Container.agent.onDidEncounterMaintenanceMode(e => {
				if (this._webview) this._webview.notify(DidEncounterMaintenanceModeNotificationType, e);
			})
		);

		this._lastEditor = Editor.getActiveOrVisible(undefined, this._lastEditor);

		this._notifyActiveEditorChangedDebounced = Functions.debounce(
			this.notifyActiveEditorChanged,
			500
		);
	}

	dispose() {
		this._disposable && this._disposable.dispose();
		this.closeWebview();
	}

	private _lastEditor: TextEditor | undefined;
	private _lastEditorUrl: string | undefined;
	private setLastEditor(editor: TextEditor | undefined) {
		if (this._lastEditor === editor) return;
		// If the new editor is not a real editor ignore it
		if (editor !== undefined && !Editor.isTextEditor(editor)) return;

		// Ignore left side of review diffs
		const uri = editor && editor.document.uri;
		const csReviewDiffInfo = uri && Strings.parseCSReviewDiffUrl(uri.toString());
		if (csReviewDiffInfo && csReviewDiffInfo.version !== "right") return;

		this._lastEditor = editor;
		this._notifyActiveEditorChangedDebounced(editor);
	}

	private onActiveEditorChanged(e: TextEditor | undefined) {
		this.setLastEditor(Editor.getActiveOrVisible(e, this._lastEditor));
	}

	private async onSessionStatusChanged(e: SessionStatusChangedEvent) {
		const status = e.getStatus();
		switch (status) {
			case SessionStatus.SignedOut:
				if (e.reason === SessionSignedOutReason.SignInFailure) {
					if (!this.visible) {
						this.show();
					}
					break;
				}

				if (
					this._webview !== undefined &&
					e.reason === SessionSignedOutReason.UserSignedOutFromExtension
				) {
					if (this._webview !== undefined) {
						this._webview.notify(HostDidLogoutNotificationType, {});
					}
					break;
				}

				break;

			case SessionStatus.SignedIn:
				this._lastEditor = Editor.getActiveOrVisible(undefined, this._lastEditor);

				const state = Container.context.workspaceState.get<WebviewState>(
					WorkspaceState.webviewState,
					{
						hidden: undefined,
						teams: {}
					}
				);

				const teamState = state.teams[this.session.team.id];
				this._context = teamState && teamState.context;

				// only show if the state is explicitly set to false
				// (ignore if it's undefined)
				if (state.hidden === false) {
					this.show();
				}

				break;
		}
	}

	private onVisibleEditorsChanged(e: TextEditor[]) {
		if (this._webview) {
			this._webview.notify(HostDidChangeVisibleEditorsNotificationType, { count: e.length });
		}

		// If the last editor is still in the visible list do nothing
		if (this._lastEditor !== undefined && e.includes(this._lastEditor)) return;

		this.setLastEditor(Editor.getActiveOrVisible(undefined, this._lastEditor));
	}

	get activeStreamThread() {
		if (this._context === undefined) {
			return undefined;
		}
		return {
			id: this._context.threadId,
			streamId: this._context.currentStreamId
		};
	}

	get viewColumn(): ViewColumn | undefined {
		return this._webview === undefined ? undefined : this._webview.viewColumn;
	}

	get visible() {
		return this._webview === undefined ? false : this._webview.visible;
	}

	@log()
	hide() {
		if (this._webview === undefined) return;

		this._webview.dispose();
	}

	@log()
	async startWorkRequest(
		editor: TextEditor | undefined = this._lastEditor,
		source: string
	): Promise<void> {
		if (this.visible) {
			await this._webview!.show();
		} else {
			await this.show();
		}

		if (!this._webview) {
			// it's possible that the webview is closing...
			return;
		}

		// TODO: Change this to be a request vs a notification
		this._webview!.notify(StartWorkNotificationType, {
			uri: editor ? editor.document.uri.toString() : undefined,
			source: source
		});
	}

	@log()
	async newCodemarkRequest(
		type: CodemarkType,
		editor: TextEditor | undefined = this._lastEditor,
		source: string,
		ignoreLastEditor?: boolean
	): Promise<void> {
		if (this.visible) {
			await this._webview!.show();
		} else {
			await this.show();
		}
		if (ignoreLastEditor) {
			editor = undefined;
		}

		if (!this._webview) {
			// it's possible that the webview is closing...
			return;
		}
		// TODO: Change this to be a request vs a notification
		this._webview!.notify(NewCodemarkNotificationType, {
			uri: editor ? editor.document.uri.toString() : undefined,
			range: editor ? Editor.toSerializableRange(editor.selection) : undefined,
			type: type,
			source: source
		});
	}

	@log()
	async newReviewRequest(
		editor: TextEditor | undefined = this._lastEditor,
		source: string
	): Promise<void> {
		if (this.visible) {
			await this._webview!.show();
		} else {
			await this.show();
		}

		if (!this._webview) {
			// it's possible that the webview is closing...
			return;
		}

		// TODO: Change this to be a request vs a notification
		this._webview!.notify(NewReviewNotificationType, {
			uri: editor ? editor.document.uri.toString() : undefined,
			range: editor ? Editor.toSerializableRange(editor.selection) : undefined,
			source: source
		});
	}

	@log()
	async newPullRequestRequest(
		editor: TextEditor | undefined = this._lastEditor,
		source: string
	): Promise<void> {
		if (this.visible) {
			await this._webview!.show();
		} else {
			await this.show();
		}

		if (!this._webview) {
			// it's possible that the webview is closing...
			return;
		}

		// TODO: Change this to be a request vs a notification
		this._webview!.notify(NewPullRequestNotificationType, {
			uri: editor ? editor.document.uri.toString() : undefined,
			range: editor ? Editor.toSerializableRange(editor.selection) : undefined,
			source: source
		});
	}

	@log()
	async showNextChangedFile(): Promise<void> {
		this._webview!.notify(ShowNextChangedFileNotificationType, {});
	}

	@log()
	async showPreviousChangedFile(): Promise<void> {
		this._webview!.notify(ShowPreviousChangedFileNotificationType, {});
	}

	@log()
	async openCodemark(
		codemarkId: string,
		options: { onlyWhenVisible?: boolean; sourceUri?: Uri } = {}
	): Promise<void> {
		if (!this.visible) {
			if (options.onlyWhenVisible) return;

			await this.show();
		}

		if (!this._webview) {
			// it's possible that the webview is closing...
			return;
		}

		// TODO: Change this to be a request vs a notification
		this._webview!.notify(ShowCodemarkNotificationType, {
			codemarkId: codemarkId,
			sourceUri: options.sourceUri && options.sourceUri.toString()
		});
	}

	@log()
	async openReview(
		reviewId: string,
		options: { onlyWhenVisible?: boolean; sourceUri?: Uri } = {}
	): Promise<void> {
		if (!this.visible) {
			if (options.onlyWhenVisible) return;

			await this.show();
		}

		if (!this._webview) {
			// it's possible that the webview is closing...
			return;
		}

		// TODO: Change this to be a request vs a notification
		this._webview!.notify(ShowReviewNotificationType, {
			reviewId: reviewId,
			sourceUri: options.sourceUri && options.sourceUri.toString()
		});
	}

	@log()
	async openPullRequest(
		providerId: string,
		pullRequestId: string
	): Promise<void> {
		if (!this._webview) {
			// it's possible that the webview is closing...
			return;
		}

		// TODO: Change this to be a request vs a notification
		this._webview!.notify(ShowPullRequestNotificationType, {
			providerId,
			id: pullRequestId
		});
	}

	@log()
	reload(reset: boolean = false) {
		if (this._webview === undefined || !this.visible) return;

		if (reset) {
			this._context = undefined;
		}
		return this._webview.reload();
	}

	@gate()
	@log()
	private async ensureWebView() {
		if (this._webview === undefined) {
			// // Kick off the bootstrap compute to be ready for later
			// this._bootstrapPromise = this.getBootstrap();

			this._webview = new CodeStreamWebviewPanel(this.session, await this.getHtml());

			const webview = this._webview;

			this._disposableWebview = Disposable.from(
				this._webview.onDidClose(this.onWebviewClosed, this),
				this._webview.onDidMessageReceive(
					(...args) => this.onWebviewMessageReceived(webview, ...args),
					this
				),
				Container.agent.onDidChangeConnectionStatus(
					(...args) => this.onConnectionStatusChanged(webview, ...args),
					this
				),
				Container.agent.onDidChangeData((...args) => this.onDataChanged(webview, ...args), this),
				Container.agent.onDidChangeDocumentMarkers(
					(...args) => this.onDocumentMarkersChanged(webview, ...args),
					this
				),
				window.onDidChangeTextEditorSelection(
					Functions.debounce<(e: TextEditorSelectionChangeEvent) => any>(
						(...args) => this.onEditorSelectionChanged(webview, ...args),
						250,
						{
							maxWait: 250
						}
					),
					this
				),
				window.onDidChangeTextEditorVisibleRanges(
					(...args) => this.onEditorVisibleRangesChanged(webview, ...args),
					this
				),
				configuration.onDidChange((...args) => this.onConfigurationChanged(webview, ...args), this),

				// Keep this at the end otherwise the above subscriptions can fire while disposing
				this._webview
			);
		}
	}

	@log({
		args: false
	})
	async show(streamThread?: StreamThread) {
		await this.ensureWebView();

		this.updateState();
		await this._webview!.show(streamThread);

		return this.activeStreamThread as StreamThread | undefined;
	}

	@log({
		args: false
	})
	async onVersionChanged(e: DidChangeVersionCompatibilityNotification) {
		if (e.compatibility === VersionCompatibility.UnsupportedUpgradeRequired) {
			this._versionCompatibility = e.compatibility;
		}

		if (!this.visible) {
			await this.show();
		}
		this._webview!.notify(DidChangeVersionCompatibilityNotificationType, e);
	}

	@log({
		args: false
	})
	async handleProtocol(uri: Uri) {
		if (!this.visible) {
			await this.show();
		}

		this._webview!.notify(HostDidReceiveRequestNotificationType, {
			url: uri.toString()
		});
	}

	@log()
	async onApiVersionChanged(e: DidChangeApiVersionCompatibilityNotification) {
		this._apiVersionCompatibility = e.compatibility;
		if (e.compatibility === ApiVersionCompatibility.ApiUpgradeRecommended) {
			this._missingCapabilities = e.missingCapabilities || {};
		}

		if (!this.visible) {
			if (e.compatibility === ApiVersionCompatibility.ApiCompatible) return;

			await this.show();
		}

		this._webview!.notify(DidChangeApiVersionCompatibilityNotificationType, e);
	}

	@log()
	async onServerUrlChanged(e: DidChangeServerUrlNotification) {
		this._webview!.notify(DidChangeServerUrlNotificationType, e);
	}

	@log()
	toggle() {
		return this.visible ? this.hide() : this.show();
	}

	private async onConnectionStatusChanged(
		webview: CodeStreamWebviewPanel,
		e: DidChangeConnectionStatusNotification
	) {
		if (!webview.visible) return;

		switch (e.status) {
			case ConnectionStatus.Disconnected:
				// TODO: Handle this
				break;

			case ConnectionStatus.Reconnecting:
				webview.notify(DidChangeConnectionStatusNotificationType, e);
				break;

			case ConnectionStatus.Reconnected:
				if (e.reset) {
					void (await this.reload());

					return;
				}

				webview.notify(DidChangeConnectionStatusNotificationType, e);
				break;
		}
	}

	private onConfigurationChanged(webview: CodeStreamWebviewPanel, e: ConfigurationChangeEvent) {
		if (
			configuration.changed(e, configuration.name("traceLevel").value) ||
			configuration.changed(e, configuration.name("showAvatars").value)
		) {
			webview.notify(HostDidChangeConfigNotificationType, {
				debug: Logger.isDebugging,
				showHeadshots: Container.config.showAvatars
			});
		}
	}

	private onDataChanged(webview: CodeStreamWebviewPanel, e: DidChangeDataNotification) {
		webview.notify(DidChangeDataNotificationType, e);
	}

	private onDocumentMarkersChanged(
		webview: CodeStreamWebviewPanel,
		e: DidChangeDocumentMarkersNotification
	) {
		webview.notify(DidChangeDocumentMarkersNotificationType, e);
	}

	private async onEditorSelectionChanged(
		webview: CodeStreamWebviewPanel,
		e: TextEditorSelectionChangeEvent
	) {
		if (e.textEditor !== this._lastEditor) return;

		webview.notify(HostDidChangeEditorSelectionNotificationType, {
			uri: e.textEditor.document.uri.toString(),
			selections: Editor.toEditorSelections(e.selections),
			visibleRanges: Editor.toSerializableRange(e.textEditor.visibleRanges),
			lineCount: e.textEditor.document.lineCount
		});
	}

	private onEditorVisibleRangesChanged(
		webview: CodeStreamWebviewPanel,
		e: TextEditorVisibleRangesChangeEvent
	) {
		if (e.textEditor !== this._lastEditor) return;

		const uri = e.textEditor.document.uri;
		if (uri.scheme !== "file" && uri.scheme !== "codestream-diff") return;

		const csRangeDiffInfo = Strings.parseCSReviewDiffUrl(uri.toString());
		if (csRangeDiffInfo && csRangeDiffInfo.version !== "right") return;

		webview.notify(HostDidChangeEditorVisibleRangesNotificationType, {
			uri: uri.toString(),
			selections: Editor.toEditorSelections(e.textEditor.selections),
			visibleRanges: Editor.toSerializableRange(e.visibleRanges),
			lineCount: e.textEditor.document.lineCount
		});
	}

	private onWebviewClosed() {
		this.closeWebview("user");
	}

	private async onWebviewMessageReceived(webview: CodeStreamWebviewPanel, e: WebviewIpcMessage) {
		try {
			Logger.log(`Webview: Received message ${toLoggableIpcMessage(e)} from the webview`);

			if (isIpcResponseMessage(e)) {
				webview.onCompletePendingIpcRequest(e);
				return;
			}

			const target = e.method.split("/")[0];
			switch (target) {
				case IpcRoutes.Agent:
					if (isIpcRequestMessage(e)) {
						webview.onIpcRequest(new RequestType<any, any, any, any>(e.method), e, (type, params) =>
							Container.agent.sendRequest(type, params)
						);

						return;
					}

					Container.agent.sendNotification(new NotificationType<any, any>(e.method), e.params);

					return;

				case IpcRoutes.Host:
					if (isIpcRequestMessage(e)) {
						this.onWebviewRequest(webview, e);
						return;
					}
					this.onWebviewNotification(webview, e);
			}
		} catch (ex) {
			debugger;
			Container.agent.reportMessage(ReportingMessageType.Error, ex.message);
			Logger.error(ex);
		}
	}

	private onWebviewNotification(webview: CodeStreamWebviewPanel, e: WebviewIpcNotificationMessage) {
		switch (e.method) {
			case WebviewDidInitializeNotificationType.method: {
				// view is rendered and ready to receive messages
				webview.onIpcReady();

				break;
			}
			case WebviewDidChangeContextNotificationType.method: {
				webview.onIpcNotification(WebviewDidChangeContextNotificationType, e, (_type, params) => {
					this._context = params.context;
					this.updateState();
				});

				break;
			}
			case EditorScrollToNotificationType.method: {
				webview.onIpcNotification(
					EditorScrollToNotificationType,
					e,
					(_type, { uri, position, ...options }) => {
						Editor.scrollTo(
							Uri.parse(uri),
							Editor.fromSerializablePosition(position),
							this._lastEditor,
							options
						);
					}
				);

				break;
			}
			default: {
				debugger;
				throw new Error(`Unhandled webview notification: ${e.method}`);
			}
		}
	}

	@gate()
	private ensureSignedInOrOut() {
		if (
			this.session.status === SessionStatus.SignedIn ||
			this.session.status === SessionStatus.SignedOut
		) {
			return Promise.resolve(this.session.status);
		}

		return new Promise(resolve => {
			const disposable = this.session.onDidChangeSessionStatus(e => {
				const status = e.getStatus();
				if (status === SessionStatus.SignedIn || status === SessionStatus.SignedOut) {
					resolve(status);
					disposable.dispose();
				}
			});
		});
	}

	private async onWebviewRequest(webview: CodeStreamWebviewPanel, e: WebviewIpcRequestMessage) {
		switch (e.method) {
			case BootstrapInHostRequestType.method: {
				Logger.log("WebviewPanel: Bootstrapping webview...", `SignedIn=${this.session.signedIn}`);
				webview.onIpcRequest(
					BootstrapInHostRequestType,
					e,
					async (_type, _params) => await this.getBootstrap()
				);
				break;
			}
			case LogoutRequestType.method: {
				webview.onIpcRequest(LogoutRequestType, e, async (_type, _params) => {
					await Container.commands.signOut(SessionSignedOutReason.UserSignedOutFromWebview);
					return emptyObj;
				});

				break;
			}
			case GetActiveEditorContextRequestType.method: {
				webview.onIpcRequest(GetActiveEditorContextRequestType, e, async (_type, _params) => ({
					editorContext: this.getActiveEditorContext()
				}));
				break;
			}
			case EditorHighlightRangeRequestType.method: {
				webview.onIpcRequest(EditorHighlightRangeRequestType, e, async (_type, params) => {
					const success = await Editor.highlightRange(
						Uri.parse(params.uri),
						Editor.fromSerializableRange(params.range),
						this._lastEditor,
						!params.highlight
					);
					return { success: success };
				});

				break;
			}
			case EditorRevealRangeRequestType.method: {
				webview.onIpcRequest(EditorRevealRangeRequestType, e, async (_type, params) => {
					const success = await Editor.revealRange(
						Uri.parse(params.uri),
						Editor.fromSerializableRange(params.range),
						this._lastEditor,
						{
							preserveFocus: params.preserveFocus,
							atTop: params.atTop
						}
					);
					return { success: success };
				});

				break;
			}
			case EditorSelectRangeRequestType.method: {
				webview.onIpcRequest(EditorSelectRangeRequestType, e, async (_type, params) => {
					const success = await Editor.selectRange(
						Uri.parse(params.uri),
						Editor.fromSerializableRange(params.selection),
						this._lastEditor,
						{
							preserveFocus: params.preserveFocus
						}
					);
					return { success: success };
				});

				break;
			}
			case InsertTextRequestType.method: {
				webview.onIpcRequest(InsertTextRequestType, e, async (_type, params) => {
					void (await Container.commands.insertText({ ...params }));
					return emptyObj;
				});

				break;
			}
			case ApplyMarkerRequestType.method: {
				webview.onIpcRequest(ApplyMarkerRequestType, e, async (_type, params) => {
					void (await Container.commands.applyMarker({ marker: params.marker }));
					return emptyObj;
				});

				break;
			}
			case CompareMarkerRequestType.method: {
				webview.onIpcRequest(CompareMarkerRequestType, e, async (_type, params) => {
					void (await Container.commands.showMarkerDiff({ marker: params.marker }));
					return emptyObj;
				});

				break;
			}
			case ReloadWebviewRequestType.method: {
				webview.onIpcRequest(ReloadWebviewRequestType, e, async (_type, _params) =>
					this.reload(true)
				);

				break;
			}
			case RestartRequestType.method: {
				webview.onIpcRequest(RestartRequestType, e, async (_type, _params) => {
					const action = "Reload";
					window
						.showInformationMessage(
							"Reload window in order to reconnect CodeStream with updated network settings",
							action
						)
						.then(selectedAction => {
							if (selectedAction === action) {
								commands.executeCommand("workbench.action.reloadWindow");
							}
						});
				});

				break;
			}
			case ShellPromptFolderRequestType.method: {
				webview.onIpcRequest(ShellPromptFolderRequestType, e, async (_type, _params) => {
					const fileUri = await window.showOpenDialog({
						canSelectMany: false,
						canSelectFiles: false,
						canSelectFolders: true
					});

					let path: string | undefined = undefined;
					if (fileUri && fileUri[0]) {
						path = fileUri[0].fsPath;
					}
					return {
						path: path
					};
				});

				break;
			}
			case UpdateConfigurationRequestType.method: {
				webview.onIpcRequest(UpdateConfigurationRequestType, e, async (_type, params) => {
					await configuration.update(params.name, params.value, ConfigurationTarget.Global);
					return emptyObj;
				});

				break;
			}
			case UpdateServerUrlRequestType.method: {
				webview.onIpcRequest(UpdateServerUrlRequestType, e, async (_type, params) => {
					await configuration.update("serverUrl", params.serverUrl, ConfigurationTarget.Global);
					await configuration.update(
						"disableStrictSSL",
						params.disableStrictSSL,
						ConfigurationTarget.Global
					);
					Container.setServerUrl(params.serverUrl, params.disableStrictSSL ? true : false);
					return emptyObj;
				});

				break;
			}
			case LiveShareInviteToSessionRequestType.method: {
				webview.onIpcRequest(LiveShareInviteToSessionRequestType, e, async (_type, params) => {
					await Container.vsls.processRequest({
						type: "invite",
						userId: params.userId,
						createNewStream: params.createNewStream
					});
					return emptyObj;
				});

				break;
			}
			case LiveShareJoinSessionRequestType.method: {
				webview.onIpcRequest(LiveShareJoinSessionRequestType, e, async (_type, params) => {
					await Container.vsls.processRequest({
						type: "join",
						url: params.url
					});
					return emptyObj;
				});

				break;
			}
			case LiveShareStartSessionRequestType.method: {
				webview.onIpcRequest(LiveShareStartSessionRequestType, e, async (_type, params) => {
					await Container.vsls.processRequest({
						type: "start",
						streamId: params.streamId,
						threadId: params.threadId,
						createNewStream: params.createNewStream
					});
					return emptyObj;
				});

				break;
			}
			case ReviewShowDiffRequestType.method: {
				webview.onIpcRequest(ReviewShowDiffRequestType, e, async (_type, params) => {
					void (await Container.commands.showReviewDiff(params));
					return emptyObj;
				});

				break;
			}
			case CompareLocalFilesRequestType.method: {
				webview.onIpcRequest(CompareLocalFilesRequestType, e, async (_type, params) => {
					try {
						void (await Container.commands.showLocalDiff(params));
						return emptyObj;
					} catch (err) {
						return {
							error: err.message
						};
					}
				});

				break;
			}
			case LocalFilesCloseDiffRequestType.method: {
				webview.onIpcRequest(LocalFilesCloseDiffRequestType, e, async (_type, params) => {
					// not supported
					return emptyObj;
				});

				break;
			}
			case ReviewShowLocalDiffRequestType.method: {
				webview.onIpcRequest(ReviewShowLocalDiffRequestType, e, async (_type, params) => {
					void (await Container.commands.showReviewLocalDiff(params));
					return emptyObj;
				});

				break;
			}
			case ReviewCloseDiffRequestType.method: {
				webview.onIpcRequest(ReviewCloseDiffRequestType, e, async (_type, params) => {
					void (await Container.commands.closeReviewDiff(params));
					return emptyObj;
				});

				break;
			}
			case TraverseDiffsRequestType.method: {
				webview.onIpcRequest(TraverseDiffsRequestType, e, async (_type, params) => {
					const command =
						params.direction === "next"
							? BuiltInCommands.GoToNextDiff
							: BuiltInCommands.GoToPreviousDiff;
					await commands.executeCommand(command);
					return emptyObj;
				});

				break;
			}
			case ShowPreviousChangedFileRequestType.method: {
				webview.onIpcRequest(ShowPreviousChangedFileRequestType, e, async (_type, _params) => {
					await commands.executeCommand(BuiltInCommands.GoToPreviousChangedFile);
					return emptyObj;
				});

				break;
			}
			case ShowNextChangedFileRequestType.method: {
				webview.onIpcRequest(ShowNextChangedFileRequestType, e, async (_type, _params) => {
					await commands.executeCommand(BuiltInCommands.GoToNextChangedFile);
					return emptyObj;
				});

				break;
			}
			case OpenUrlRequestType.method: {
				webview.onIpcRequest(OpenUrlRequestType, e, async (_type, _params) => {
					await openUrl(_params.url);
				});
				break;
			}
			default: {
				debugger;
				throw new Error(`Unhandled webview request: ${e.method}`);
			}
		}
	}

	private closeWebview(reason?: "user") {
		try {
			this.updateState(reason === "user");
		} finally {
			if (this._disposableWebview !== undefined) {
				try {
					this._disposableWebview.dispose();
				} catch {}
				this._disposableWebview = undefined;
			}
			this._webview = undefined;
		}
	}

	private async getBootstrap() {
		await this.ensureSignedInOrOut();

		const userId = this.session.signedIn ? this.session.userId : undefined;
		const currentTeamId = this.session.signedIn ? this.session.team.id : undefined;
		return {
			session: {
				userId: userId
			},
			capabilities: this.session.capabilities,
			configs: {
				debug: Logger.isDebugging,
				email: Container.config.email,
				serverUrl: this.session.serverUrl,
				showHeadshots: Container.config.showAvatars,
				team: Container.config.team
			},
			env: this.session.environment,
			ide: {
				name: "VSC",
				detail: env.appName
			},
			context: this._context
				? { ...this._context, currentTeamId: currentTeamId }
				: {
						currentTeamId: currentTeamId
				  },
			version: Container.versionFormatted,
			versionCompatibility: this._versionCompatibility,
			apiVersionCompatibility: this._apiVersionCompatibility,
			missingCapabilities: this._missingCapabilities
		};
	}

	private getActiveEditorContext(): EditorContext {
		let editorContext: EditorContext = {};
		if (this._lastEditor !== undefined) {
			editorContext = {
				activeFile: workspace.asRelativePath(this._lastEditor.document.uri),
				metrics: Editor.getMetrics(this._lastEditor.document.uri),
				textEditorUri: this._lastEditor.document.uri.toString(),
				textEditorVisibleRanges: Editor.toSerializableRange(this._lastEditor.visibleRanges),
				textEditorSelections: Editor.toEditorSelections(this._lastEditor.selections),
				textEditorLineCount: this._lastEditor.document.lineCount,
				visibleEditorCount: window.visibleTextEditors.length
			};
		}
		return editorContext;
	}

	private _html: string | undefined;
	private async getHtml(): Promise<string> {
		// NOTE: if you use workspace.openTextDocument, it will put the webview.html into
		// the lsp document cache, use fs.readFile instead

		if (!Logger.isDebugging && this._html) {
			return this._html;
		}
		this._html = await new Promise<string>((resolve, reject) => {
			fs.readFile(Container.context.asAbsolutePath("webview.html"), "utf8", (err, data) => {
				if (err) {
					reject(err);
				} else {
					resolve(data);
				}
			});
		});

		return this._html;
	}

	private notifyActiveEditorChanged(e: TextEditor | undefined) {
		if (this._webview === undefined) return;

		let editor: ActiveEditorInfo | undefined;

		if (e != null) {
			const originalUri = e.document.uri;
			let uri;
			switch (originalUri.scheme) {
				case "file":
				case "untitled":
					uri = originalUri;
					break;
				case "codestream-diff":
					const csReviewDiffInfo = Strings.parseCSReviewDiffUrl(originalUri.toString());
					if (csReviewDiffInfo && csReviewDiffInfo.version === "right") {
						uri = originalUri;
						break;
					}
					const codeStreamDiffURi = csUri.Uris.isCodeStreamDiffUri(originalUri.toString());
					if (codeStreamDiffURi) {
						uri = originalUri;
					}
					break;
				case "git":
				case "gitlens":
				case "codestream-patch":
					uri = originalUri.with({ scheme: "file", authority: "", query: "" });
					break;
			}

			if (uri !== undefined) {
				// Only tell the webview if the uri really is different
				const url = uri.toString();
				if (this._lastEditorUrl === url) {
					return;
				}

				this._lastEditorUrl = url;

				editor = {
					uri: this._lastEditorUrl,
					fileName: workspace.asRelativePath(uri),
					languageId: e.document.languageId,
					metrics: Editor.getMetrics(uri),
					selections: Editor.toEditorSelections(e.selections),
					visibleRanges: Editor.toSerializableRange(e.visibleRanges),
					lineCount: e.document.lineCount
				};
			}
		}

		this._webview.notify(HostDidChangeActiveEditorNotificationType, { editor: editor });
	}

	private updateState(hidden: boolean = false) {
		try {
			if (!this.session.signedIn) return;

			const prevState = Container.context.workspaceState.get<WebviewState>(
				WorkspaceState.webviewState,
				{
					hidden: hidden,
					teams: {}
				}
			);

			const teams = prevState.teams || {};
			teams[this.session.team.id] = {
				context: this._context
			};

			Container.context.workspaceState.update(WorkspaceState.webviewState, {
				hidden: hidden,
				teams: teams
			});

			if (
				!hidden &&
				this._context &&
				this._context.panelStack &&
				this._context.panelStack[0] === WebviewPanels.CodemarksForFile
			) {
				Container.markerDecorations.suspend();
			} else {
				Container.markerDecorations.resume();
			}
		} catch {}
	}
}
