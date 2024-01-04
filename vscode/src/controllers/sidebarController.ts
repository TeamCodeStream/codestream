"use strict";
import {
	ApiVersionCompatibility,
	BootstrapResponse,
	ConfigChangeReloadNotificationType,
	ConnectionStatus,
	DidChangeApiVersionCompatibilityNotification,
	DidChangeApiVersionCompatibilityNotificationType,
	DidChangeConnectionStatusNotification,
	DidChangeConnectionStatusNotificationType,
	DidChangeDataNotification,
	DidChangeDataNotificationType,
	DidChangeDocumentMarkersNotification,
	DidChangeDocumentMarkersNotificationType,
	DidChangeProcessBufferNotification,
	DidChangeProcessBufferNotificationType,
	DidChangeSessionTokenStatusNotification,
	DidChangeSessionTokenStatusNotificationType,
	DidChangeServerUrlNotification,
	DidChangeServerUrlNotificationType,
	DidChangeVersionCompatibilityNotification,
	DidChangeVersionCompatibilityNotificationType,
	DidEncounterMaintenanceModeNotificationType,
	DidResolveStackTraceLineNotificationType,
	RefreshMaintenancePollNotificationType,
	ReportingMessageType,
	VersionCompatibility
} from "@codestream/protocols/agent";
import { CodemarkType, CSApiCapabilities, WebviewPanels } from "@codestream/protocols/api";
import {
	ActiveEditorInfo,
	ApplyMarkerRequestType,
	BootstrapInHostRequestType,
	CompareLocalFilesRequestType,
	CompareMarkerRequestType,
	ConnectToIDEProviderRequestType,
	DisconnectFromIDEProviderRequestType,
	EditorContext,
	EditorCopySymbolType,
	EditorHighlightRangeRequestType,
	EditorReplaceSymbolType,
	EditorRevealRangeRequestType,
	EditorRevealSymbolRequestType,
	EditorScrollToNotificationType,
	EditorSelectRangeRequestType,
	GetActiveEditorContextRequestType,
	HostDidChangeActiveEditorNotificationType,
	HostDidChangeConfigNotificationType,
	HostDidChangeEditorSelectionNotificationType,
	HostDidChangeEditorVisibleRangesNotificationType,
	HostDidChangeLayoutNotificationType,
	HostDidChangeVisibleEditorsNotificationType,
	HostDidChangeWorkspaceFoldersNotificationType,
	HostDidLogoutNotificationType,
	HostDidReceiveRequestNotificationType,
	InitiateLogSearchNotification,
	InitiateLogSearchNotificationType,
	InsertTextRequestType,
	IpcRoutes,
	isIpcRequestMessage,
	isIpcResponseMessage,
	LocalFilesCloseDiffRequestType,
	LogoutRequestType,
	NewCodemarkNotificationType,
	NewPullRequestBranch,
	NewPullRequestNotificationType,
	NewReviewNotificationType,
	OpenUrlRequestType,
	RefreshEditorsCodeLensRequestType,
	ReloadWebviewRequestType,
	RestartRequestType,
	ReviewCloseDiffRequestType,
	ReviewShowDiffRequestType,
	ReviewShowLocalDiffRequestType,
	OpenEditorViewNotificationType,
	ShellPromptFolderRequestType,
	ShowCodemarkNotificationType,
	ShowNextChangedFileNotificationType,
	ShowNextChangedFileRequestType,
	ShowPreviousChangedFileNotificationType,
	ShowPreviousChangedFileRequestType,
	ShowPullRequestNotificationType,
	ShowReviewNotificationType,
	SidebarLocation,
	StartWorkNotificationType,
	TeamlessContext,
	TraverseDiffsRequestType,
	UpdateConfigurationRequestType,
	UpdateServerUrlRequestType,
	ViewAnomalyNotification,
	ViewAnomalyNotificationType,
	ViewMethodLevelTelemetryNotificationType,
	WebviewContext,
	WebviewDidChangeContextNotificationType,
	WebviewDidInitializeNotificationType,
	WebviewIpcMessage,
	WebviewIpcNotificationMessage,
	WebviewIpcRequestMessage,
	IdeNames
} from "@codestream/protocols/webview";
import {
	authentication,
	commands,
	ConfigurationChangeEvent,
	ConfigurationTarget,
	Disposable,
	env,
	Range,
	Selection,
	TextEditor,
	TextEditorSelectionChangeEvent,
	TextEditorVisibleRangesChangeEvent,
	Uri,
	ViewColumn,
	window,
	workspace,
	SymbolInformation,
	ExtensionContext
} from "vscode";
import { NotificationType, RequestType } from "vscode-languageclient";

import { gate } from "../system/decorators/gate";
import { Functions, log, Strings } from "../system";
import { openUrl } from "../urlHandler";
import { toLoggableIpcMessage, WebviewLike } from "../webviews/webviewLike";
import { toCSGitUri } from "../providers/gitContentProvider";
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
import { BuiltInCommands } from "../constants";
import * as csUri from "../system/uri";
import * as TokenManager from "../api/tokenManager";
import { SaveTokenReason } from "../api/tokenManager";
import { copySymbol, replaceSymbol } from "./symbolEditController";

const emptyObj = {};

export interface WebviewState {
	hidden: boolean | undefined;
	teams: {
		[teamId: string]: {
			context?: WebviewContext;
		};
	};
	teamless?: TeamlessContext;
}

export class SidebarController implements Disposable {
	private _bootstrapPromise: Promise<BootstrapResponse> | undefined;
	private _context: WebviewContext | undefined;
	private _disposable: Disposable | undefined;
	private _disposableWebview: Disposable | undefined;
	private _versionCompatibility: VersionCompatibility | undefined;
	private _apiVersionCompatibility: ApiVersionCompatibility | undefined;
	private _missingCapabilities: CSApiCapabilities | undefined;
	private _providerSessionIds: { [key: string]: string } = {};
	private _hasShownAfterOnVersionChanged: boolean = false;

	private readonly _notifyActiveEditorChangedDebounced: (e: TextEditor | undefined) => void;

	constructor(
		private context: ExtensionContext,
		public readonly session: CodeStreamSession,
		private _sidebar?: WebviewLike
	) {
		this._disposable = Disposable.from(
			this.session.onDidChangeSessionStatus(this.onSessionStatusChanged, this),
			window.onDidChangeActiveTextEditor(this.onActiveEditorChanged, this),
			window.onDidChangeVisibleTextEditors(this.onVisibleEditorsChanged, this),
			workspace.onDidChangeWorkspaceFolders(this.onWorkspaceFoldersChanged, this),
			Container.agent.onDidEncounterMaintenanceMode(e => {
				if (this._sidebar) this._sidebar.notify(DidEncounterMaintenanceModeNotificationType, e);
			}),
			Container.agent.onRefreshMaintenancePoll(e => {
				if (this._sidebar) this._sidebar.notify(RefreshMaintenancePollNotificationType, e);
			}),
			Container.agent.onDidResolveStackTraceLine(e => {
				if (this._sidebar) this._sidebar.notify(DidResolveStackTraceLineNotificationType, e);
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
		if (editor !== undefined && !this.isSupportedEditor(editor)) return;

		this._lastEditor = editor;
		this._notifyActiveEditorChangedDebounced(editor);
	}

	private onActiveEditorChanged(e: TextEditor | undefined) {
		this.setLastEditor(Editor.getActiveOrVisible(e, this._lastEditor));
	}

	private async onSessionStatusChanged(e: SessionStatusChangedEvent) {
		const status = e.getStatus();
		const state = Container.context.workspaceState.get<WebviewState>(WorkspaceState.webviewState, {
			hidden: undefined,
			teams: {}
		});
		let teamState;
		switch (status) {
			case SessionStatus.SignedOut:
				if (e.reason === SessionSignedOutReason.SignInFailure) {
					if (!this.visible) {
						this.show();
					}
					break;
				}

				if (
					(this._sidebar !== undefined &&
						e.reason === SessionSignedOutReason.UserSignedOutFromExtension) ||
					e.reason === SessionSignedOutReason.InvalidRefreshToken
				) {
					this._sidebar?.notify(HostDidLogoutNotificationType, {});
					break;
				}

				if (state.teamless) {
					this._context = {
						currentTeamId: "_",
						hasFocus: true,
						onboardStep: 0,
						__teamless__: state.teamless
					};
				}

				break;

			case SessionStatus.SignedIn:
				this._lastEditor = Editor.getActiveOrVisible(undefined, this._lastEditor);

				teamState = state.teams[this.session.team.id];
				this._context = teamState && teamState.context;
				if (this._context && state.teamless) {
					this._context.__teamless__ = state.teamless;
				}

				// only show if the state is explicitly set to false
				// (ignore if it's undefined)
				if (state.hidden === false) {
					if (!this._sidebar || this._sidebar.type === "panel") {
						// don't auto show when in the sidebar -- let the IDE dictate its state
						this.show();
					}
				}

				break;
		}
	}

	private onVisibleEditorsChanged(e: readonly TextEditor[]) {
		if (this._sidebar) {
			this._sidebar.notify(HostDidChangeVisibleEditorsNotificationType, { count: e.length });
		}

		// If the last editor is still in the visible list do nothing
		if (this._lastEditor !== undefined && e.includes(this._lastEditor)) return;

		this.setLastEditor(Editor.getActiveOrVisible(undefined, this._lastEditor));
	}

	private onWorkspaceFoldersChanged() {
		if (this._sidebar) {
			this._sidebar.notify(HostDidChangeWorkspaceFoldersNotificationType, {});
		}
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
		return this._sidebar === undefined ? undefined : this._sidebar.viewColumn;
	}

	get visible() {
		return this._sidebar === undefined ? false : this._sidebar.visible;
	}

	@log()
	hide() {
		if (this._sidebar === undefined) return;

		this._sidebar.dispose();
	}

	@log()
	async startWorkRequest(
		editor: TextEditor | undefined = this._lastEditor,
		source: string
	): Promise<void> {
		if (this.visible) {
			await this._sidebar!.show();
		} else {
			await this.show();
		}

		if (!this._sidebar) {
			// it's possible that the webview is closing...
			return;
		}

		// TODO: Change this to be a request vs a notification
		this._sidebar!.notify(StartWorkNotificationType, {
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
			await this._sidebar!.show();
		} else {
			await this.show();
		}
		if (ignoreLastEditor) {
			editor = undefined;
		}

		if (!this._sidebar) {
			// it's possible that the webview is closing...
			return;
		}
		// TODO: Change this to be a request vs a notification
		this._sidebar!.notify(NewCodemarkNotificationType, {
			uri: editor ? editor.document.uri.toString() : undefined,
			range: editor ? Editor.toSerializableRange(editor.selection) : undefined,
			type: type,
			source: source
		});
	}

	@log()
	async newReviewRequest(
		editor: TextEditor | undefined = this._lastEditor,
		source: string,
		includeLatestCommit?: boolean
	): Promise<void> {
		if (this.visible) {
			await this._sidebar!.show();
		} else {
			await this.show();
		}

		if (!this._sidebar) {
			// it's possible that the webview is closing...
			return;
		}

		// TODO: Change this to be a request vs a notification
		this._sidebar!.notify(NewReviewNotificationType, {
			uri: editor ? editor.document.uri.toString() : undefined,
			range: editor ? Editor.toSerializableRange(editor.selection) : undefined,
			source: source,
			includeLatestCommit: includeLatestCommit
		});
	}

	@log()
	async newPullRequestRequest(
		editor: TextEditor | undefined = this._lastEditor,
		source: string,
		branch?: NewPullRequestBranch
	): Promise<void> {
		if (this.visible) {
			await this._sidebar!.show();
		} else {
			await this.show();
		}

		if (!this._sidebar) {
			// it's possible that the webview is closing...
			return;
		}

		// TODO: Change this to be a request vs a notification
		this._sidebar!.notify(NewPullRequestNotificationType, {
			uri: editor ? editor.document.uri.toString() : undefined,
			range: editor ? Editor.toSerializableRange(editor.selection) : undefined,
			source: source,
			branch: branch
		});
	}

	@log()
	async showNextChangedFile(): Promise<void> {
		this._sidebar!.notify(ShowNextChangedFileNotificationType, {});
	}

	@log()
	async showPreviousChangedFile(): Promise<void> {
		this._sidebar!.notify(ShowPreviousChangedFileNotificationType, {});
	}

	@log()
	async openCodemark(
		codemarkId: string,
		options: { source?: string; onlyWhenVisible?: boolean; sourceUri?: Uri } = {}
	): Promise<void> {
		if (!this.visible) {
			if (options.onlyWhenVisible) return;

			await this.show();
		}

		if (!this._sidebar) {
			// it's possible that the webview is closing...
			return;
		}

		// TODO: Change this to be a request vs a notification
		this._sidebar!.notify(ShowCodemarkNotificationType, {
			codemarkId: codemarkId,
			source: "source_file",
			sourceUri: options.sourceUri && options.sourceUri.toString()
		});
	}

	@log()
	async openReview(
		reviewId: string,
		options: { onlyWhenVisible?: boolean; sourceUri?: Uri; openFirstDiff?: boolean } = {}
	): Promise<void> {
		if (!this.visible) {
			if (options.onlyWhenVisible) return;

			await this.show();
		}

		if (!this._sidebar) {
			// it's possible that the webview is closing...
			return;
		}

		// TODO: Change this to be a request vs a notification
		this._sidebar!.notify(ShowReviewNotificationType, {
			reviewId: reviewId,
			sourceUri: options.sourceUri && options.sourceUri.toString(),
			openFirstDiff: options.openFirstDiff
		});
	}

	@log()
	async openPullRequest(
		providerId: string,
		pullRequestId: string,
		commentId?: string
	): Promise<void> {
		if (!this.visible) {
			await this.show();
		}

		if (!this._sidebar) {
			// it's possible that the webview is closing...
			return;
		}

		// TODO: Change this to be a request vs a notification
		this._sidebar!.notify(ShowPullRequestNotificationType, {
			providerId,
			id: pullRequestId,
			commentId: commentId
		});
	}

	@log()
	async openPullRequestByUrl(url: string, source?: string): Promise<void> {
		if (!this.visible) {
			await this.show();
		}

		if (!this._sidebar) {
			// it's possible that the webview is closing...
			return;
		}

		// TODO: Change this to be a request vs a notification
		this._sidebar!.notify(ShowPullRequestNotificationType, {
			providerId: "",
			id: "",
			url: url,
			source: source
		});
	}

	@log()
	async viewMethodLevelTelemetry(args: any): Promise<void> {
		if (this.visible) {
			await this._sidebar!.show();
		} else {
			await this.show();
		}

		if (!this._sidebar) {
			// it's possible that the webview is closing...
			return;
		}
		this._sidebar!.notify(ViewMethodLevelTelemetryNotificationType, args);
	}

	@log()
	async logSearch(args: InitiateLogSearchNotification): Promise<void> {
		if (!this._sidebar) {
			// it's possible that the webview is closing...
			return;
		}

		this._sidebar!.notify(InitiateLogSearchNotificationType, args);
	}

	@log()
	async viewAnomaly(args: ViewAnomalyNotification): Promise<void> {
		if (this.visible) {
			await this._sidebar!.show();
		} else {
			await this.show();
		}

		if (!this._sidebar) {
			// it's possible that the webview is closing...
			return;
		}
		this._sidebar!.notify(ViewAnomalyNotificationType, args);
	}

	@log()
	async layoutChanged(): Promise<void> {
		if (!this._sidebar) {
			// it's possible that the webview is closing...
			return;
		}

		// TODO: Change this to be a request vs a notification
		this._sidebar!.notify(HostDidChangeLayoutNotificationType, {
			sidebar: {
				location: this.tryGetSidebarLocation()
			}
		});
	}

	@log()
	reload(reset = false) {
		if (this._sidebar === undefined || !this.visible) return;

		if (reset) {
			this._context = undefined;
		}
		return this._sidebar.reload();
	}

	@gate()
	@log()
	private async ensureWebView() {
		if (this._sidebar === undefined) {
			// // Kick off the bootstrap compute to be ready for later
			// this._bootstrapPromise = this.getBootstrap();
			//
			//
			// uncomment for panel
			// this._webview = new CodeStreamWebviewPanel(
			// 	this.session,
			// 	await this.getHtml(),
			// 	this.onWebviewInitialized
			// );
		}
	}

	onWebviewInitialized() {
		const webview = this._sidebar!;

		this._disposableWebview = Disposable.from(
			this._sidebar!.onDidClose(this.onWebviewClosed, this),
			// this._webview!.onDidChangeVisibility(this.onWebviewChangeVisibility, this),
			this._sidebar!.onDidMessageReceive(
				(...args) => this.onWebviewMessageReceived(webview, ...args),
				this
			),
			Container.agent.onDidChangeConnectionStatus(
				(...args) => this.onConnectionStatusChanged(webview, ...args),
				this
			),
			Container.agent.onDidChangeSessionTokenStatus(
				(...args) => this.onSessionTokenStatusChanged(webview, ...args),
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
			this._sidebar!
		);
	}

	@log({
		args: false
	})
	async show() {
		await this.ensureWebView();

		this.updateState();
		await this._sidebar!.show();

		return this.activeStreamThread as StreamThread | undefined;
	}

	@log({
		args: false
	})
	async onVersionChanged(e: DidChangeVersionCompatibilityNotification) {
		if (e.compatibility === VersionCompatibility.UnsupportedUpgradeRequired) {
			this._versionCompatibility = e.compatibility;
		}

		if (!this.visible && !this._hasShownAfterOnVersionChanged) {
			await this.show();
			this._hasShownAfterOnVersionChanged = true;
		}
		this._sidebar!.notify(DidChangeVersionCompatibilityNotificationType, e);
	}

	@log({
		args: false
	})
	async handleProtocol(uri: Uri) {
		if (!this.visible) {
			await this.show();
		}

		this._sidebar!.notify(HostDidReceiveRequestNotificationType, {
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

		this._sidebar!.notify(DidChangeApiVersionCompatibilityNotificationType, e);
	}

	@log()
	async onServerUrlChanged(e: DidChangeServerUrlNotification) {
		this._sidebar!.notify(DidChangeServerUrlNotificationType, e);
	}

	@log({
		args: false
	})
	async onProcessBufferChanged(e: DidChangeProcessBufferNotification) {
		if (!this.visible) {
			await this.show();
		}
		this._sidebar!.notify(DidChangeProcessBufferNotificationType, e);
	}

	@log()
	toggle() {
		return this.visible ? this.hide() : this.show();
	}

	private async onConnectionStatusChanged(
		webview: WebviewLike,
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

	private async onSessionTokenStatusChanged(
		webview: WebviewLike,
		e: DidChangeSessionTokenStatusNotification
	) {
		webview.notify(DidChangeSessionTokenStatusNotificationType, e);
	}

	private onConfigurationChanged(webview: WebviewLike, e: ConfigurationChangeEvent) {
		if (
			configuration.changed(e, configuration.name("traceLevel").value) ||
			configuration.changed(e, configuration.name("goldenSignalsInEditor").value)
		) {
			webview.notify(HostDidChangeConfigNotificationType, {
				debug: Logger.isDebugging,
				showHeadshots: true, // TODO: O11y-Only
				showGoldenSignalsInEditor: Container.config.goldenSignalsInEditor
			});
		}
	}

	private onDataChanged(webview: WebviewLike, e: DidChangeDataNotification) {
		webview.notify(DidChangeDataNotificationType, e);
	}

	private onDocumentMarkersChanged(webview: WebviewLike, e: DidChangeDocumentMarkersNotification) {
		webview.notify(DidChangeDocumentMarkersNotificationType, e);
	}

	private async onEditorSelectionChanged(webview: WebviewLike, e: TextEditorSelectionChangeEvent) {
		if (e.textEditor !== this._lastEditor || !this.isSupportedEditor(e.textEditor)) return;

		const { fileUri, sha } = csUri.Uris.getFileUriAndSha(e.textEditor.document.uri);
		webview.notify(HostDidChangeEditorSelectionNotificationType, {
			uri: fileUri.toString(true),
			gitSha: sha,
			selections: Editor.toEditorSelections(e.selections),
			visibleRanges: Editor.toSerializableRange(e.textEditor.visibleRanges),
			lineCount: e.textEditor.document.lineCount
		});
	}

	private onEditorVisibleRangesChanged(
		webview: WebviewLike,
		e: TextEditorVisibleRangesChangeEvent
	) {
		if (e.textEditor !== this._lastEditor || !this.isSupportedEditor(e.textEditor)) return;

		const { fileUri, sha } = csUri.Uris.getFileUriAndSha(e.textEditor.document.uri);
		webview.notify(HostDidChangeEditorVisibleRangesNotificationType, {
			uri: fileUri.toString(true),
			gitSha: sha,
			selections: Editor.toEditorSelections(e.textEditor.selections),
			visibleRanges: Editor.toSerializableRange(e.visibleRanges),
			lineCount: e.textEditor.document.lineCount
		});
	}

	private isSupportedEditor(textEditor: TextEditor): boolean {
		const uri = textEditor.document.uri;
		if (
			uri.scheme !== "file" &&
			uri.scheme !== "codestream-diff" &&
			uri.scheme !== "codestream-git"
		) {
			return false;
		}

		const csRangeDiffInfo = Strings.parseCSReviewDiffUrl(uri.toString());
		if (
			csRangeDiffInfo &&
			(csRangeDiffInfo.reviewId === "local" || csRangeDiffInfo.version !== "right")
		) {
			return false;
		}

		return true;
	}

	private onWebviewClosed() {
		this.closeWebview("user");
	}

	async onWebviewMessageReceived(webview: WebviewLike, e: WebviewIpcMessage) {
		try {
			Logger.log(`WebviewController: Received message ${toLoggableIpcMessage(e)} from the webview`);

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
			Container.agent.reportMessage(ReportingMessageType.Error, ex.message);
			Logger.error(ex);
		}
	}

	private onWebviewNotification(webview: WebviewLike, e: WebviewIpcNotificationMessage) {
		switch (e.method) {
			case OpenEditorViewNotificationType.method: {
				Container.panel.initializeOrShowEditor(e.params);
				break;
			}
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
				throw new Error(`Unhandled webview notification: ${e.method}`);
			}
		}
	}

	public async goToClassMethodDefinition(
		codeFilepath: string | undefined,
		codeNamespace: string | undefined,
		codeFunction: string,
		language: string
	) {
		if (language === "csharp" || language === "go") {
			const symbols = await commands.executeCommand<SymbolInformation[]>(
				BuiltInCommands.ExecuteWorkspaceSymbolprovider,
				`${codeNamespace}.${codeFunction}`
			);
			if (symbols?.length) {
				const symbol = symbols[0];

				void (await Editor.revealRange(
					symbol.location.uri,
					Editor.fromSerializableRange(symbol.location.range),
					this._lastEditor,
					{
						preserveFocus: false,
						atTop: false
					}
				));
			}
		}

		if (language === "ruby") {
			const symbols: SymbolInformation[] = await commands.executeCommand(
				"vscode.executeWorkspaceSymbolProvider",
				codeNamespace + "#" + codeFunction
			);
			if (symbols?.length) {
				const symbol = symbols[0];

				void (await Editor.revealRange(
					symbol.location.uri,
					Editor.fromSerializableRange(symbol.location.range),
					this._lastEditor,
					{
						preserveFocus: false,
						atTop: false
					}
				));
			}
		}

		if (language === "php") {
			const symbols: SymbolInformation[] = await commands.executeCommand(
				"vscode.executeWorkspaceSymbolProvider",
				codeNamespace + "::" + codeFunction
			);
			if (symbols?.length) {
				const symbol = symbols[0];

				void (await Editor.revealRange(
					symbol.location.uri,
					Editor.fromSerializableRange(symbol.location.range),
					this._lastEditor,
					{
						preserveFocus: false,
						atTop: false
					}
				));
			}
		}

		if (language === "java") {
			if (!codeNamespace) return;

			// Convert the fully qualified class name to a relative file path.
			const relativeFilePath = codeNamespace.replace(/\./g, "/") + ".java";

			// Find the file in the workspace.
			const fileUri = await workspace.findFiles(`**/${relativeFilePath}`, null, 1);

			if (fileUri.length === 0) {
				Logger.warn(`Java class ${codeNamespace} not found.`);
				return;
			}

			// Open the file in the editor.
			const document = await workspace.openTextDocument(fileUri[0]);
			const editor = await window.showTextDocument(document);

			// Find method definition within the class
			const methodPattern = new RegExp(
				`\\b(?:public|private|protected)?\\s+(?:static\\s+)?(?:[\\w<>\\[\\]]+\\s+)?${codeFunction}\\s*\\(`
			);
			const text = document.getText();
			const match = methodPattern.exec(text);

			if (match) {
				const position = document.positionAt(match.index);
				editor.selection = new Selection(position, position);
				editor.revealRange(new Range(position, position));
			} else {
				Logger.warn(`Method ${codeFunction} not found in class ${codeNamespace}.`);
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

	private async onWebviewRequest(webview: WebviewLike, e: WebviewIpcRequestMessage) {
		switch (e.method) {
			case BootstrapInHostRequestType.method: {
				Logger.log(
					"WebviewController: Bootstrapping sidebar...",
					`SignedIn=${this.session.signedIn}`
				);
				webview.onIpcRequest(
					BootstrapInHostRequestType,
					e,
					async (_type, _params) => await this.getBootstrap()
				);
				break;
			}
			case LogoutRequestType.method: {
				webview.onIpcRequest(LogoutRequestType, e, async (_type, _params) => {
					await Container.commands.signOut(
						SessionSignedOutReason.UserSignedOutFromWebview,
						_params.newServerUrl,
						_params.newEnvironment
					);
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
					let uri = Uri.parse(params.uri);
					if (params.ref) {
						uri = toCSGitUri(uri, params.ref);
					}
					const success = await Editor.highlightRange(
						uri,
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
					let uri = Uri.parse(params.uri);
					if (params.ref) {
						uri = toCSGitUri(uri, params.ref);
					}
					const success = await Editor.revealRange(
						uri,
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
			case EditorCopySymbolType.method: {
				webview.onIpcRequest(EditorCopySymbolType, e, async (_type, params) => {
					return await copySymbol(params);
				});
				break;
			}
			case EditorReplaceSymbolType.method: {
				webview.onIpcRequest(EditorReplaceSymbolType, e, async (_type, params) => {
					return await replaceSymbol(params);
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
					Container.setPendingServerUrl(params.serverUrl);
					if (params.copyToken && params.currentTeamId) {
						// in the case of switching to a new server url, we need to copy the access token
						// in our key store, which is indexed to serverUrl, email, and teamId
						const token = await TokenManager.get(
							Container.config.serverUrl,
							Container.config.email,
							params.currentTeamId
						);
						if (token) {
							token.url = params.serverUrl;
							await TokenManager.addOrUpdate(
								SaveTokenReason.UPDATE_SERVER_URL,
								params.serverUrl,
								Container.config.email,
								params.currentTeamId,
								token
							);
						}
					}
					await configuration.update("serverUrl", params.serverUrl, ConfigurationTarget.Global);
					if (params.disableStrictSSL !== undefined) {
						await configuration.update(
							"disableStrictSSL",
							params.disableStrictSSL,
							ConfigurationTarget.Global
						);
					}
					Container.setServerUrl(
						params.serverUrl,
						params.disableStrictSSL ? true : false,
						params.environment
					);
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
					console.log(params);
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
			case ConnectToIDEProviderRequestType.method: {
				webview.onIpcRequest(ConnectToIDEProviderRequestType, e, async (_type, _params) => {
					if (_params.provider === "github") {
						return await this.connectToGitHub();
					} else {
						throw new Error(`unsupported IDE provider: ${_params.provider}`);
					}
				});
				break;
			}
			case DisconnectFromIDEProviderRequestType.method: {
				webview.onIpcRequest(DisconnectFromIDEProviderRequestType, e, async (_type, _params) => {
					if (_params.provider === "github") {
						await this.disconnectFromGitHub();
					} else {
						throw new Error(`unsupported IDE provider: ${_params.provider}`);
					}
				});
				break;
			}
			case RefreshEditorsCodeLensRequestType.method: {
				webview.onIpcRequest(RefreshEditorsCodeLensRequestType, e, async (_type, _params) => {
					await Container.commands.updateEditorCodeLens();
					return {
						success: true
					};
				});
				break;
			}
			case EditorRevealSymbolRequestType.method: {
				void this.goToClassMethodDefinition(
					e.params.codeFilepath,
					e.params.codeNamespace,
					e.params.codeFunction,
					e.params.language
				);
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
			if (this._sidebar && this._sidebar.type === "panel") {
				this._sidebar = undefined;
			}
		}
	}

	private async getBootstrap() {
		await this.ensureSignedInOrOut();
		const userId = this.session.signedIn ? this.session.userId : undefined;
		const currentTeamId = this.session.signedIn ? this.session.team.id : undefined;

		return {
			session: {
				userId: userId,
				machineId: env.machineId,
				eligibleJoinCompanies: this.session?.eligibleJoinCompanies || []
			},
			capabilities: this.session.capabilities,
			configs: {
				debug: Logger.isDebugging,
				email: Container.config.email,
				serverUrl: this.session.serverUrl,
				showHeadshots: true, // TODO: O11y-Only
				showGoldenSignalsInEditor: Container.config.goldenSignalsInEditor
			},
			environmentInfo: this.session.environmentInfo,
			ide: {
				name: "VSC" as IdeNames,
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

	tryGetSidebarLocation(): SidebarLocation {
		let sidebarLocation: SidebarLocation;
		try {
			sidebarLocation = workspace.getConfiguration("workbench.sideBar").get("location") || "left";
		} catch (err) {
			Logger.debug(`sidebarLocation: ${err}`);
			sidebarLocation = "left";
		}
		return sidebarLocation as SidebarLocation;
	}

	getActiveEditorContext(): EditorContext {
		let editorContext: EditorContext = {};
		if (this._lastEditor !== undefined) {
			editorContext = {
				activeFile: workspace.asRelativePath(this._lastEditor.document.uri),
				metrics: Editor.getMetrics(this._lastEditor.document.uri),
				textEditorUri: this._lastEditor.document.uri.toString(),
				textEditorVisibleRanges: Editor.toSerializableRange(this._lastEditor.visibleRanges),
				textEditorSelections: Editor.toEditorSelections(this._lastEditor.selections),
				textEditorLineCount: this._lastEditor.document.lineCount,
				visibleEditorCount: window.visibleTextEditors.length,
				sidebar: {
					location: this.tryGetSidebarLocation()
				}
			};
		}
		return editorContext;
	}

	private notifyActiveEditorChanged(e: TextEditor | undefined) {
		if (this._sidebar === undefined) return;

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

		this._sidebar.notify(HostDidChangeActiveEditorNotificationType, { editor: editor });
	}

	private updateState(hidden: boolean | undefined = undefined) {
		if (hidden === undefined && this._sidebar && this._sidebar.type === "sidebar") {
			// default the sidebar to hidden
			hidden = true;
		}

		try {
			const prevState = Container.context.workspaceState.get<WebviewState>(
				WorkspaceState.webviewState,
				{
					hidden: hidden,
					teams: {}
				}
			);
			if (!this.session.signedIn) {
				if (this._context && this._context.__teamless__) {
					const newState: WebviewState = {
						hidden: prevState.hidden,
						teams: prevState.teams,
						teamless: this._context.__teamless__
					};
					Container.context.workspaceState.update(WorkspaceState.webviewState, newState);
				}
				return;
			}

			const teamId = this.session.signedIn && this.session.team && this.session.team.id;

			const teams = prevState.teams || {};
			const teamless = prevState.teamless || undefined;
			teams[teamId] = {
				context: this._context
			};

			Container.context.workspaceState.update(WorkspaceState.webviewState, {
				hidden,
				teams,
				teamless
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

	private async connectToGitHub() {
		const session = await authentication.getSession("github", ["read:user", "user:email", "repo"], {
			createIfNone: true
		});
		Logger.log(`Connected to GitHub session ${session.id}`);
		this._providerSessionIds.github = session.id;
		return { accessToken: session.accessToken, sessionId: session.id };
	}

	private async disconnectFromGitHub() {
		if (this._providerSessionIds.github) {
			Logger.log(`Disconnected from GitHub session ${this._providerSessionIds.github}`);

			// We need to logout of the VSCode/GitHub session here, so that VSCode throws away the token,
			// and if the token is invalid or revoked, a new one will be fetched if the user tries to re-auth again.
			// Note that this logout() method is undocumented (I looked at the VSCode-GitHub extension to figure out what to call),
			// and it is not in the typings file for the authentication namespace ... so we're cheating here
			// If the VSCode engine is updated, this may cease to work
			if (typeof (authentication as any).logout === "function") {
				Logger.log(`Disconnecting from GitHub, session ${this._providerSessionIds.github}`);
				await (authentication as any).logout("github", this._providerSessionIds.github);
			} else {
				Logger.log(
					"logout() method not detected in VSCode engine, unable to invalidate GitHub session"
				);
			}
			delete this._providerSessionIds.github;
		} else {
			Logger.log("No session for github to disconnect");
		}
	}

	@log()
	async onConfigChangeReload() {
		this._sidebar!.notify(ConfigChangeReloadNotificationType, {});
	}
}
