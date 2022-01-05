"use strict";
import {
	AgentInitializeResult,
	ApiRequestType,
	ArchiveStreamRequestType,
	BaseAgentOptions,
	BootstrapRequestType,
	CloseStreamRequestType,
	CodeStreamEnvironmentInfo,
	CreateChannelStreamRequestType,
	CreateDirectStreamRequestType,
	CreateDocumentMarkerPermalinkRequestType,
	CreatePostRequestType,
	CreateRepoRequestType,
	DeletePostRequestType,
	DidChangeApiVersionCompatibilityNotification,
	DidChangeApiVersionCompatibilityNotificationType,
	DidChangeConnectionStatusNotification,
	DidChangeConnectionStatusNotificationType,
	DidChangeDataNotification,
	DidChangeDataNotificationType,
	DidChangeServerUrlNotification,
	DidChangeServerUrlNotificationType,
	DidChangeDocumentMarkersNotification,
	DidChangeDocumentMarkersNotificationType,
	DidChangePullRequestCommentsNotification,
	DidChangePullRequestCommentsNotificationType,
	DidChangeVersionCompatibilityNotification,
	DidChangeVersionCompatibilityNotificationType,
	DidDetectUnreviewedCommitsNotification,
	DidDetectUnreviewedCommitsNotificationType,
	DidEncounterMaintenanceModeNotification,
	DidEncounterMaintenanceModeNotificationType,
	DidFailLoginNotificationType,
	DidLoginNotification,
	DidLoginNotificationType,
	DidLogoutNotification,
	DidLogoutNotificationType,
	DidStartLoginNotificationType,
	EditPostRequestType,
	FetchCodemarksRequestType,
	FetchDocumentMarkersRequestType,
	FetchFileStreamsRequestType,
	FetchMarkersRequestType,
	FetchPostRepliesRequestType,
	FetchPostsRequestType,
	FetchReposRequestType,
	FetchStreamsRequestType,
	FetchTeamsRequestType,
	FetchUnreadStreamsRequestType,
	FetchUsersRequestType,
	GetDocumentFromKeyBindingRequestType,
	GetDocumentFromKeyBindingResponse,
	GetDocumentFromMarkerRequestType,
	GetDocumentFromMarkerResponse,
	GetFileScmInfoRequestType,
	GetFileStreamRequestType,
	GetFileStreamResponse,
	GetMarkerRequestType,
	GetMeRequestType,
	GetPostRequestType,
	GetPreferencesRequestType,
	GetRepoRequestType,
	GetReviewContentsRequestType,
	GetStreamRequestType,
	GetTeamRequestType,
	GetUnreadsRequestType,
	GetUserRequestType,
	InviteUserRequestType,
	JoinStreamRequestType,
	LeaveStreamRequestType,
	LogoutReason,
	MarkPostUnreadRequestType,
	MarkStreamReadRequestType,
	MuteStreamRequestType,
	OpenStreamRequestType,
	ReactToPostRequestType,
	RenameStreamRequestType,
	ReportingMessageType,
	ReportMessageRequestType,
	RestartRequiredNotificationType,
	SetCodemarkStatusRequestType,
	SetStreamPurposeRequestType,
	TelemetryRequestType,
	UnarchiveStreamRequestType,
	UpdateCodemarkRequestType,
	UpdatePreferencesRequestType,
	UpdatePresenceRequestType,
	UpdateStreamMembershipRequestType,
	UpdateStreamMembershipResponse,
	GetReviewRequestType,
	GetReviewContentsLocalRequestType,
	AgentOpenUrlRequest,
	AgentOpenUrlRequestType,
	FetchReviewsRequestType,
	GetFileContentsAtRevisionRequestType,
	GetFileContentsAtRevisionResponse,
	AgentInitializedNotificationType,
	UpdateUserRequest,
	UpdateUserRequestType,
	UserDidCommitNotificationType,
	UserDidCommitNotification,
	DidSetEnvironmentNotificationType,
	DidChangeProcessBufferNotification,
	DidChangeProcessBufferNotificationType,
	AgentFileSearchRequestType,
	DidResolveStackTraceLineNotificationType,
	DidResolveStackTraceLineNotification
} from "@codestream/protocols/agent";
import {
	ChannelServiceType,
	CodemarkType,
	CSMarkerIdentifier,
	CSMePreferences,
	CSPresenceStatus,
	StreamType,
	CSReviewCheckpoint
} from "@codestream/protocols/api";
import {
	Event,
	EventEmitter,
	ExtensionContext,
	OutputChannel,
	Uri,
	window,
	workspace
} from "vscode";
import {
	CancellationToken,
	CancellationTokenSource,
	CloseAction,
	Disposable,
	ErrorAction,
	LanguageClient,
	LanguageClientOptions,
	Message,
	NotificationType,
	Range,
	RequestType,
	RevealOutputChannelOn,
	ServerOptions,
	TransportKind
} from "vscode-languageclient";
import { SessionSignedOutReason } from "../api/session";
import { Container } from "../container";
import { Logger } from "../logger";
import { Functions, log } from "../system";

export { BaseAgentOptions };

type NotificationParamsOf<NT> = NT extends NotificationType<infer N, any> ? N : never;
type RequestParamsOf<RT> = RT extends RequestType<infer R, any, any, any> ? R : never;
type RequestResponseOf<RT> = RT extends RequestType<any, infer R, any, any> ? R : never;

export class CodeStreamAgentConnection implements Disposable {
	private _onDidLogin = new EventEmitter<DidLoginNotification>();
	get onDidLogin(): Event<DidLoginNotification> {
		return this._onDidLogin.event;
	}

	private _onDidStartLogin = new EventEmitter<void>();
	get onDidStartLogin(): Event<void> {
		return this._onDidStartLogin.event;
	}

	private _onDidFailLogin = new EventEmitter<void>();
	get onDidFailLogin(): Event<void> {
		return this._onDidFailLogin.event;
	}

	private _onDidRequireRestart = new EventEmitter<void>();
	get onDidRequireRestart(): Event<void> {
		return this._onDidRequireRestart.event;
	}

	private _onDidRestart = new EventEmitter<void>();
	get onDidRestart(): Event<void> {
		return this._onDidRestart.event;
	}

	private _onDidChangeConnectionStatus = new EventEmitter<DidChangeConnectionStatusNotification>();
	get onDidChangeConnectionStatus(): Event<DidChangeConnectionStatusNotification> {
		return this._onDidChangeConnectionStatus.event;
	}

	private _onDidEncounterMaintenanceMode = new EventEmitter<
		DidEncounterMaintenanceModeNotification
	>();
	get onDidEncounterMaintenanceMode(): Event<DidEncounterMaintenanceModeNotification> {
		return this._onDidEncounterMaintenanceMode.event;
	}

	private _onDidChangeData = new EventEmitter<DidChangeDataNotification>();
	get onDidChangeData(): Event<DidChangeDataNotification> {
		return this._onDidChangeData.event;
	}

	private _onDidChangeDocumentMarkers = new EventEmitter<DidChangeDocumentMarkersNotification>();
	get onDidChangeDocumentMarkers(): Event<DidChangeDocumentMarkersNotification> {
		return this._onDidChangeDocumentMarkers.event;
	}

	private _onDidChangePullRequestComments = new EventEmitter<
		DidChangePullRequestCommentsNotification
	>();
	get onDidChangePullRequestComments(): Event<DidChangePullRequestCommentsNotification> {
		return this._onDidChangePullRequestComments.event;
	}

	private _onUserDidCommit = new EventEmitter<UserDidCommitNotification>();
	get onUserDidCommit(): Event<UserDidCommitNotification> {
		return this._onUserDidCommit.event;
	}

	private _onDidDetectUnreviewedCommits = new EventEmitter<
		DidDetectUnreviewedCommitsNotification
	>();
	get onDidDetectUnreviewedCommits(): Event<DidDetectUnreviewedCommitsNotification> {
		return this._onDidDetectUnreviewedCommits.event;
	}

	private _onDidChangeVersion = new EventEmitter<DidChangeVersionCompatibilityNotification>();
	get onDidChangeVersion(): Event<DidChangeVersionCompatibilityNotification> {
		return this._onDidChangeVersion.event;
	}

	private _onDidStart = new EventEmitter<void>();
	get onDidStart(): Event<void> {
		return this._onDidStart.event;
	}

	private _onOpenUrl = new EventEmitter<AgentOpenUrlRequest>();
	get onOpenUrl(): Event<AgentOpenUrlRequest> {
		return this._onOpenUrl.event;
	}

	private _onAgentInitialized = new EventEmitter<void>();
	get onAgentInitialized(): Event<void> {
		return this._onAgentInitialized.event;
	}

	private _onDidSetEnvironment = new EventEmitter<CodeStreamEnvironmentInfo>();
	get onDidSetEnvironment(): Event<CodeStreamEnvironmentInfo> {
		return this._onDidSetEnvironment.event;
	}

	private _onDidResolveStackTraceLine = new EventEmitter<DidResolveStackTraceLineNotification>();
	get onDidResolveStackTraceLine(): Event<DidResolveStackTraceLineNotification> {
		return this._onDidResolveStackTraceLine.event;
	}

	private _client: LanguageClient | undefined;
	private _disposable: Disposable | undefined;
	private _clientOptions: LanguageClientOptions;
	private _clientReadyCancellation: CancellationTokenSource | undefined;
	private _serverOptions: ServerOptions;
	private _restartCount = 0;
	private _outputChannel: OutputChannel | undefined;

	constructor(context: ExtensionContext, options: BaseAgentOptions) {
		const env = process.env;
		const breakOnStart = (env && env.CODESTREAM_AGENT_BREAK_ON_START) === "true";

		this._serverOptions = {
			run: {
				module: context.asAbsolutePath("dist/agent.js"),
				transport: TransportKind.ipc
			},
			debug: {
				module: context.asAbsolutePath("../shared/agent/dist/agent.js"),
				transport: TransportKind.ipc,
				options: {
					execArgv: ["--nolazy", breakOnStart ? "--inspect-brk=6009" : "--inspect=6009"]
				}
			}
		};

		this._clientOptions = {
			errorHandler: {
				error: (error: Error, message: Message, count: number) => {
					Logger.error(error, "AgentConnection.error", message.jsonrpc, count);

					if (!Container.session.isProductionCloud) {
						window.showErrorMessage(
							`CodeStream Connection Error (${count})\n${error.message}\n${message.jsonrpc}`
						);
					}

					return ErrorAction.Continue;
				},
				closed: () => {
					this._restartCount++;
					Logger.error(undefined!, "AgentConnection.closed");

					if (!Container.session.isProductionCloud) {
						window.showErrorMessage(
							"CodeStream Connection Closed\nAttempting to reestablish connection..."
						);
					}

					if (this._restartCount < 3) {
						// when we return CloseAction.Restart here, the VSC language client initiates a restart
						// of the agent ... we'll let the session know that this is happening, and when the
						// agent is ready, start listening to messages again ... to do this, we need to set
						// all the message handlers again, the setTimeout with timeout of 0 ensures the language
						// client code has really initiated the restart sequence
						this._onDidRestart.fire();
						setTimeout(async () => {
							Logger.log("Waiting for VSC language client to be ready...");
							await this._client!.onReady();
							Logger.log("VSC language client is ready, setting message handlers...");
							this._restartCount = 0;
							try {
								this.setHandlers();
							} catch (e) {
								const msg = e instanceof Error ? e.message : JSON.stringify(e);
								Logger.log(`Error setting handlers after restart: ${msg}`);
								throw e;
							}
						}, 0);
						return CloseAction.Restart;
					}

					// If we are still waiting on ready just cancel it
					if (this._clientReadyCancellation !== undefined) {
						this._clientReadyCancellation.cancel();
						this._clientReadyCancellation.dispose();
						this._clientReadyCancellation = undefined;

						return CloseAction.DoNotRestart;
					}

					// If we aren't still waiting on ready, sign out
					void Container.session.logout(SessionSignedOutReason.NetworkIssue);

					return CloseAction.DoNotRestart;
				}
			},
			initializationOptions: { ...options },
			// Register the server for file-based text documents
			documentSelector: [
				{ scheme: "file", language: "*" },
				{ scheme: "untitled", language: "*" },
				{ scheme: "vsls", language: "*" }
			]
		};
	}

	dispose() {
		if (this._outputChannel) {
			this._outputChannel.dispose();
		}
		this._disposable && this._disposable.dispose();
		if (this._clientReadyCancellation !== undefined) {
			this._clientReadyCancellation.dispose();
			this._clientReadyCancellation = undefined;
		}
	}

	get started() {
		return this._client && !this._client.needsStart();
	}

	@started
	bootstrap() {
		return this.sendRequest(BootstrapRequestType, {});
	}

	@started
	async reportMessage(type: ReportingMessageType, message: string, extra?: object) {
		this.sendRequest(ReportMessageRequestType, { source: "extension", type, message, extra });
	}

	private getInitializationOptions() {
		const options: Required<BaseAgentOptions> = {
			...this._clientOptions.initializationOptions
		};

		if (Container.config.proxySupport !== "off") {
			const httpSettings = workspace.getConfiguration("http");
			const proxy = httpSettings.get<string | undefined>("proxy", "");
			if (proxy) {
				options.proxy = {
					url: proxy,
					strictSSL: httpSettings.get<boolean>("proxyStrictSSL", true)
				};
				options.proxySupport = "override";
			} else {
				options.proxySupport = "on";
			}
		} else {
			options.proxySupport = "off";
		}

		return options;
	}

	async logout() {
		await this.stop();
		await Container.agent.start();
	}

	get codemarks() {
		return this._codemarks;
	}
	private readonly _codemarks = new (class {
		constructor(private readonly _connection: CodeStreamAgentConnection) {}

		fetch() {
			return this._connection.sendRequest(FetchCodemarksRequestType, {});
		}

		edit(
			codemarkId: string,
			attributes: { text?: string; color?: string; title?: string; assignees?: string[] }
		) {
			return this._connection.sendRequest(UpdateCodemarkRequestType, { codemarkId, ...attributes });
		}

		setStatus(codemarkId: string, status: string) {
			return this._connection.sendRequest(SetCodemarkStatusRequestType, { codemarkId, status });
		}
	})(this);

	get documentMarkers() {
		return this._documentMarkers;
	}
	private readonly _documentMarkers = new (class {
		constructor(private readonly _connection: CodeStreamAgentConnection) {}

		createPermalink(uri: Uri, range: Range, privacy: "public" | "private") {
			return this._connection.sendRequest(CreateDocumentMarkerPermalinkRequestType, {
				uri: uri.toString(),
				range: range,
				privacy: privacy
			});
		}

		fetch(uri: Uri, sha?: string) {
			return this._connection.sendRequest(FetchDocumentMarkersRequestType, {
				textDocument: { uri: uri.toString() },
				gitSha: sha,
				applyFilters: true
			});
		}

		getDocumentFromKeyBinding(key: number): Promise<GetDocumentFromKeyBindingResponse | undefined> {
			return this._connection.sendRequest(GetDocumentFromKeyBindingRequestType, {
				key: key
			});
		}

		getDocumentFromMarker(
			marker: CSMarkerIdentifier
		): Promise<GetDocumentFromMarkerResponse | undefined> {
			return this._connection.sendRequest(GetDocumentFromMarkerRequestType, {
				repoId: marker.repoId,
				file: marker.file,
				markerId: marker.id
			});
		}
	})(this);

	get markers() {
		return this._markers;
	}
	private readonly _markers = new (class {
		constructor(private readonly _connection: CodeStreamAgentConnection) {}

		fetch(streamId: string) {
			return this._connection.sendRequest(FetchMarkersRequestType, { streamId: streamId });
		}

		get(markerId: string) {
			return this._connection.sendRequest(GetMarkerRequestType, { markerId: markerId });
		}
	})(this);

	get posts() {
		return this._posts;
	}
	private readonly _posts = new (class {
		constructor(private readonly _connection: CodeStreamAgentConnection) {}

		create(
			streamId: string,
			text: string,
			mentionedUserIds?: string[],
			parentPostId?: string,
			title?: string,
			type?: CodemarkType,
			assignees?: []
		) {
			let codemark;
			if (type || title || assignees) {
				codemark = {
					title: title,
					type: type || CodemarkType.Comment,
					assignees: assignees
				};
			}

			return this._connection.sendRequest(CreatePostRequestType, {
				streamId: streamId,
				text: text,
				mentionedUserIds: mentionedUserIds,
				parentPostId: parentPostId,
				codemark: codemark
			});
		}

		fetch(
			streamId: string,
			options: {
				limit?: number;
				before?: number | string;
				after?: number | string;
				inclusive?: boolean;
			} = {}
		) {
			return this._connection.sendRequest(FetchPostsRequestType, {
				streamId: streamId,
				...options
			});
		}

		// fetchByRange(streamId: string, start: number, end: number) {
		// 	return this.fetch(streamId, {
		// 		before: end,
		// 		after: start,
		// 		inclusive: true
		// 	});
		// }

		// async fetchLatest(streamId: string) {
		// 	const response = await this.fetch(streamId, { limit: 1 });
		// 	return { post: response.posts[0] };
		// }

		fetchReplies(streamId: string, parentPostId: string) {
			return this._connection.sendRequest(FetchPostRepliesRequestType, {
				streamId: streamId,
				postId: parentPostId
			});
		}

		get(streamId: string, postId: string) {
			return this._connection.sendRequest(GetPostRequestType, {
				streamId: streamId,
				postId: postId
			});
		}

		delete(streamId: string, postId: string) {
			return this._connection.sendRequest(DeletePostRequestType, {
				postId: postId,
				streamId: streamId
			});
		}

		edit(streamId: string, postId: string, text: string, mentionedUserIds?: string[]) {
			return this._connection.sendRequest(EditPostRequestType, {
				postId: postId,
				streamId: streamId,
				text: text,
				mentionedUserIds: mentionedUserIds
			});
		}

		markUnread(streamId: string, postId: string) {
			return this._connection.sendRequest(MarkPostUnreadRequestType, {
				postId: postId,
				streamId: streamId
			});
		}

		react(streamId: string, postId: string, reactions: { [emoji: string]: boolean }) {
			return this._connection.sendRequest(ReactToPostRequestType, {
				postId: postId,
				streamId: streamId,
				emojis: reactions
			});
		}
	})(this);

	get repos() {
		return this._repos;
	}
	private readonly _repos = new (class {
		constructor(private readonly _connection: CodeStreamAgentConnection) {}

		create(url: string, knownCommitHashes: string[]) {
			return this._connection.sendRequest(CreateRepoRequestType, {
				url: url,
				knownCommitHashes: knownCommitHashes
			});
		}

		fetch() {
			return this._connection.sendRequest(FetchReposRequestType, {});
		}

		get(repoId: string) {
			return this._connection.sendRequest(GetRepoRequestType, {
				repoId: repoId
			});
		}
	})(this);

	get reviews() {
		return this._reviews;
	}
	private readonly _reviews = new (class {
		constructor(private readonly _connection: CodeStreamAgentConnection) {}

		get(reviewId: string) {
			return this._connection.sendRequest(GetReviewRequestType, {
				reviewId
			});
		}

		fetch() {
			return this._connection.sendRequest(FetchReviewsRequestType, {});
		}

		getContents(reviewId: string, checkpoint: CSReviewCheckpoint, repoId: string, path: string) {
			return this._connection.sendRequest(GetReviewContentsRequestType, {
				reviewId,
				checkpoint,
				repoId,
				path
			});
		}

		getContentsLocal(
			repoId: string,
			path: string,
			editingReviewId: string | undefined,
			baseSha: string,
			rightVersion: string
		) {
			return this._connection.sendRequest(GetReviewContentsLocalRequestType, {
				repoId,
				path,
				editingReviewId,
				baseSha,
				rightVersion
			});
		}
	})(this);

	get scm() {
		return this._scm;
	}
	private readonly _scm = new (class {
		constructor(private readonly _connection: CodeStreamAgentConnection) {}

		getFileInfo(uri: Uri) {
			return this._connection.sendRequest(GetFileScmInfoRequestType, {
				uri: uri.toString()
			});
		}

		getFileContentsAtRevision(
			repoId: string | undefined,
			path: string,
			sha: string
		): Promise<GetFileContentsAtRevisionResponse> {
			return this._connection.sendRequest(GetFileContentsAtRevisionRequestType, {
				repoId: repoId,
				path: path,
				sha: sha
			});
		}
	})(this);

	get streams() {
		return this._streams;
	}
	private readonly _streams = new (class {
		constructor(private readonly _connection: CodeStreamAgentConnection) {}

		createChannel(
			name: string,
			membership?: "auto" | string[],
			privacy: "public" | "private" = membership === "auto" ? "public" : "private",
			purpose?: string,
			service?: {
				serviceType: ChannelServiceType;
				serviceKey?: string;
				serviceInfo?: { [key: string]: any };
			}
		) {
			return this._connection.sendRequest(CreateChannelStreamRequestType, {
				type: StreamType.Channel,
				name: name,
				memberIds: membership === "auto" ? undefined : membership,
				isTeamStream: membership === "auto",
				privacy: membership === "auto" ? "public" : privacy,
				purpose: purpose,
				...service
			});
		}

		createDirect(membership: string[]) {
			return this._connection.sendRequest(CreateDirectStreamRequestType, {
				type: StreamType.Direct,
				memberIds: membership
			});
		}

		fetch(types?: (StreamType.Channel | StreamType.Direct)[], memberIds?: string[]) {
			return this._connection.sendRequest(FetchStreamsRequestType, {
				types: types,
				memberIds: memberIds
			});
		}

		fetchFiles(repoId: string) {
			return this._connection.sendRequest(FetchFileStreamsRequestType, { repoId: repoId });
		}

		fetchUnread() {
			return this._connection.sendRequest(FetchUnreadStreamsRequestType, {});
		}

		get(streamId: string) {
			return this._connection.sendRequest(GetStreamRequestType, {
				streamId: streamId
			});
		}

		getFileStream(uri: string): Promise<GetFileStreamResponse> {
			return this._connection.sendRequest(GetFileStreamRequestType, {
				textDocument: { uri }
			});
		}

		archive(streamId: string) {
			return this._connection.sendRequest(ArchiveStreamRequestType, {
				streamId: streamId
			});
		}

		close(streamId: string) {
			return this._connection.sendRequest(CloseStreamRequestType, {
				streamId: streamId
			});
		}

		invite(streamId: string, userId: string): Promise<UpdateStreamMembershipResponse>;
		invite(streamId: string, userIds: string[]): Promise<UpdateStreamMembershipResponse>;
		invite(streamId: string, userIds: string | string[]) {
			if (typeof userIds === "string") {
				userIds = [userIds];
			}
			return this._connection.sendRequest(UpdateStreamMembershipRequestType, {
				streamId: streamId,
				add: userIds
			});
		}

		join(streamId: string) {
			return this._connection.sendRequest(JoinStreamRequestType, {
				streamId: streamId
			});
		}

		kick(streamId: string, userId: string): Promise<UpdateStreamMembershipResponse>;
		kick(streamId: string, userIds: string[]): Promise<UpdateStreamMembershipResponse>;
		kick(streamId: string, userIds: string | string[]) {
			if (typeof userIds === "string") {
				userIds = [userIds];
			}
			return this._connection.sendRequest(UpdateStreamMembershipRequestType, {
				streamId: streamId,
				remove: userIds
			});
		}

		leave(streamId: string) {
			return this._connection.sendRequest(LeaveStreamRequestType, {
				streamId: streamId
			});
		}

		markRead(streamId: string, postId?: string) {
			return this._connection.sendRequest(MarkStreamReadRequestType, {
				streamId: streamId,
				postId: postId
			});
		}

		mute(streamId: string, mute: boolean) {
			return this._connection.sendRequest(MuteStreamRequestType, {
				streamId: streamId,
				mute: mute
			});
		}

		open(streamId: string) {
			return this._connection.sendRequest(OpenStreamRequestType, {
				streamId: streamId
			});
		}

		rename(streamId: string, name: string) {
			return this._connection.sendRequest(RenameStreamRequestType, {
				streamId: streamId,
				name: name
			});
		}

		setPurpose(streamId: string, purpose: string) {
			return this._connection.sendRequest(SetStreamPurposeRequestType, {
				streamId: streamId,
				purpose: purpose
			});
		}

		unarchive(streamId: string) {
			return this._connection.sendRequest(UnarchiveStreamRequestType, {
				streamId: streamId
			});
		}
	})(this);

	get teams() {
		return this._teams;
	}
	private readonly _teams = new (class {
		constructor(private readonly _connection: CodeStreamAgentConnection) {}

		fetch(teamIds?: string[]) {
			return this._connection.sendRequest(FetchTeamsRequestType, {
				mine: teamIds == null,
				teamIds: teamIds
			});
		}

		get(teamId: string) {
			return this._connection.sendRequest(GetTeamRequestType, {
				teamId: teamId
			});
		}
	})(this);

	get telemetry() {
		return this._telemetry;
	}
	private readonly _telemetry = new (class {
		constructor(private readonly _connection: CodeStreamAgentConnection) {}

		async track(eventName: string, properties?: { [key: string]: string | number | boolean }) {
			if (!this._connection.started) return;

			Logger.debug("(5) track called from agentConnection.ts :: ", eventName);
			try {
				const resp = await this._connection.sendRequest(TelemetryRequestType, {
					eventName: eventName,
					properties: properties
				});

				return resp;
			} catch (ex) {
				Logger.error(ex);
			}
		}
	})(this);

	get users() {
		return this._users;
	}
	private readonly _users = new (class {
		constructor(private readonly _connection: CodeStreamAgentConnection) {}

		fetch() {
			return this._connection.sendRequest(FetchUsersRequestType, {});
		}

		get(userId: string) {
			return this._connection.sendRequest(GetUserRequestType, {
				userId: userId
			});
		}

		invite(email: string, fullName?: string) {
			return this._connection.sendRequest(InviteUserRequestType, {
				email: email,
				fullName: fullName
			});
		}

		me() {
			return this._connection.sendRequest(GetMeRequestType, {});
		}

		updatePresence(status: CSPresenceStatus) {
			return this._connection.sendRequest(UpdatePresenceRequestType, {
				sessionId: Container.session.id!,
				status: status
			});
		}

		updatePreferences(preferences: CSMePreferences) {
			return this._connection.sendRequest(UpdatePreferencesRequestType, {
				preferences: preferences
			});
		}

		updateUser(user: UpdateUserRequest) {
			return this._connection.sendRequest(UpdateUserRequestType, user);
		}

		unreads() {
			return this._connection.sendRequest(GetUnreadsRequestType, {});
		}

		preferences() {
			return this._connection.sendRequest(GetPreferencesRequestType, undefined);
		}
	})(this);

	@log({
		prefix: (context, e: DidChangeConnectionStatusNotification) => `${context.prefix}(${e.status})`
	})
	private onConnectionStatusChanged(e: DidChangeConnectionStatusNotification) {
		this._onDidChangeConnectionStatus.fire(e);
	}

	@log({
		prefix: (context, e: DidChangeDocumentMarkersNotification) =>
			`${context.prefix}(${e.textDocument.uri})`
	})
	private onDocumentMarkersChanged(e: DidChangeDocumentMarkersNotification) {
		this._onDidChangeDocumentMarkers.fire(e);
	}

	@log({
		prefix: (context, _e: DidChangePullRequestCommentsNotification) => `${context.prefix}`
	})
	private onPullRequestCommentsChanged(e: DidChangePullRequestCommentsNotification) {
		this._onDidChangePullRequestComments.fire(e);
	}

	@log({
		prefix: (context, ...messages: DidChangeDataNotification[]) =>
			`${context.prefix}(${messages.map(m => m.type).join(", ")})`
	})
	private async onDataChanged(...messages: DidChangeDataNotification[]) {
		for (const message of messages) {
			Logger.debug(`\tAgentConnection.onDataChanged(${message.type})`, message.data);
			this._onDidChangeData.fire(message);
		}
	}

	@log({
		prefix: (context, _e: UserDidCommitNotification) => `${context.prefix}`
	})
	private onUserCommitted(e: UserDidCommitNotification) {
		this._onUserDidCommit.fire(e);
	}

	@log({
		prefix: (context, _e: DidDetectUnreviewedCommitsNotification) => `${context.prefix}`
	})
	private onUnreviewedCommitsDetected(e: DidDetectUnreviewedCommitsNotification) {
		this._onDidDetectUnreviewedCommits.fire(e);
	}

	@log()
	private onLogout(e: DidLogoutNotification) {
		if (e.reason === LogoutReason.Token) {
			void Container.session.logout();
		} else {
			void Container.session.goOffline(e.reason !== LogoutReason.UnsupportedVersion);
		}
	}

	@log()
	private async onVersionCompatibilityChanged(e: DidChangeVersionCompatibilityNotification) {
		await Container.webview.onVersionChanged(e);
	}

	@log()
	private async onApiVersionCompatibilityChanged(e: DidChangeApiVersionCompatibilityNotification) {
		await Container.webview.onApiVersionChanged(e);
	}

	@log()
	private async onServerUrlChanged(e: DidChangeServerUrlNotification) {
		await Container.webview.onServerUrlChanged(e);
	}

	@log()
	private async onProcessBufferNotificationChanged(e: DidChangeProcessBufferNotification) {
		await Container.webview.onProcessBufferChanged(e);
	}

	@started
	async sendNotification<NT extends NotificationType<any, any>>(
		type: NT,
		params: NotificationParamsOf<NT>
	): Promise<void> {
		await this.ensureStartingCompleted();

		try {
			Logger.logWithDebugParams(
				`AgentConnection.sendNotification(${type.method})${
					type.method === ApiRequestType.method ? `: ${params.url}` : ""
				}`,
				params
			);
			this._client!.sendNotification(type, params);
		} catch (ex) {
			Logger.error(ex, `AgentConnection.sendNotification(${type.method})`, params);
			throw ex;
		}
	}

	@started
	async sendRequest<RT extends RequestType<any, any, any, any>>(
		type: RT,
		params: RequestParamsOf<RT>,
		_token?: CancellationToken
	): Promise<RequestResponseOf<RT>> {
		await this.ensureStartingCompleted();

		const traceParams =
			type.method === ApiRequestType.method ? params.init && params.init.body : params;

		try {
			Logger.logWithDebugParams(
				`AgentConnection.sendRequest(${type.method})${
					type.method === ApiRequestType.method ? `: ${params.url}` : ""
				}`,
				traceParams
			);
			const response = await this._client!.sendRequest(type, params);
			return response;
		} catch (ex) {
			Logger.error(ex, `AgentConnection.sendRequest(${type.method})`, traceParams);
			throw ex;
		}
	}

	private async ensureStartingCompleted(): Promise<void> {
		if (this._starting === undefined) return;

		await this._starting;
	}

	private _starting: Promise<AgentInitializeResult> | undefined;
	public async start(): Promise<AgentInitializeResult> {
		if (this._client !== undefined || this._starting !== undefined) {
			throw new Error("Agent has already been started");
		}

		this._starting = this.startCore();
		const result = await this._starting;
		this._starting = undefined;
		return result;
	}

	private async startCore(): Promise<AgentInitializeResult> {
		this._restartCount = 0;
		if (this._clientReadyCancellation !== undefined) {
			this._clientReadyCancellation.dispose();
		}
		this._clientReadyCancellation = new CancellationTokenSource();

		this._clientOptions.outputChannel = this._outputChannel = window.createOutputChannel(
			"CodeStream (Agent)"
		);
		this._clientOptions.revealOutputChannelOn = RevealOutputChannelOn.Never;
		this._client = new LanguageClient(
			"codestream",
			"CodeStream",
			{ ...this._serverOptions } as ServerOptions,
			{ ...this._clientOptions, initializationOptions: this.getInitializationOptions() }
		);

		this._disposable = this._client.start();

		void (await Functions.cancellable(this._client.onReady(), this._clientReadyCancellation.token, {
			cancelMessage: "Agent failed to start"
		}));

		this._clientReadyCancellation.dispose();
		this._clientReadyCancellation = undefined;

		this.setHandlers();

		this._onDidStart.fire();
		return this._client.initializeResult! as AgentInitializeResult;
	}

	private setHandlers() {
		if (!this._client) return;
		this._client.onNotification(DidChangeDataNotificationType, this.onDataChanged.bind(this));
		this._client.onNotification(
			DidChangeConnectionStatusNotificationType,
			this.onConnectionStatusChanged.bind(this)
		);
		this._client.onNotification(
			DidChangeDocumentMarkersNotificationType,
			this.onDocumentMarkersChanged.bind(this)
		);
		this._client.onNotification(
			DidChangePullRequestCommentsNotificationType,
			this.onPullRequestCommentsChanged.bind(this)
		);
		this._client.onNotification(
			DidChangeVersionCompatibilityNotificationType,
			this.onVersionCompatibilityChanged.bind(this)
		);
		this._client.onNotification(
			DidChangeApiVersionCompatibilityNotificationType,
			this.onApiVersionCompatibilityChanged.bind(this)
		);
		this._client.onNotification(
			DidChangeProcessBufferNotificationType,
			this.onProcessBufferNotificationChanged.bind(this)
		);

		this._client.onNotification(DidLoginNotificationType, e => this._onDidLogin.fire(e));
		this._client.onNotification(DidStartLoginNotificationType, () => this._onDidStartLogin.fire());
		this._client.onNotification(DidFailLoginNotificationType, () => this._onDidFailLogin.fire());
		this._client.onNotification(DidLogoutNotificationType, this.onLogout.bind(this));
		this._client.onNotification(RestartRequiredNotificationType, () => {
			this._onDidRequireRestart.fire();
		});
		// this._client.onNotification(DidResetNotificationType, this.onReset.bind(this));

		this._client.onNotification(DidEncounterMaintenanceModeNotificationType, e =>
			this._onDidEncounterMaintenanceMode.fire(e)
		);
		this._client.onNotification(
			DidChangeServerUrlNotificationType,
			this.onServerUrlChanged.bind(this)
		);
		this._client.onNotification(AgentInitializedNotificationType, () => {
			this._onAgentInitialized.fire();
		});
		this._client.onNotification(UserDidCommitNotificationType, this.onUserCommitted.bind(this));
		this._client.onNotification(
			DidDetectUnreviewedCommitsNotificationType,
			this.onUnreviewedCommitsDetected.bind(this)
		);
		this._client.onNotification(DidSetEnvironmentNotificationType, e =>
			this._onDidSetEnvironment.fire(e)
		);
		this._client.onNotification(DidResolveStackTraceLineNotificationType, e =>
			this._onDidResolveStackTraceLine.fire(e)
		);
		this._client.onRequest(AgentOpenUrlRequestType, e => this._onOpenUrl.fire(e));
		this._client.onRequest(AgentFileSearchRequestType, async e => {
			try {
				const files = await workspace.findFiles(`**/${e.path}`);
				Logger.log(
					`AgentFileSearchRequestType: workspace search for **/${e.path} found ${files.length} matches`
				);
				return {
					files: files.map(_ => _.fsPath)
				};
			} catch (ex) {
				Logger.warn("AgentFileSearchRequestType", {
					path: e ? e.path : "",
					error: ex
				});
				return {
					files: []
				};
			}
		});
	}

	private async stop(): Promise<void> {
		if (this._clientReadyCancellation !== undefined) {
			this._clientReadyCancellation.cancel();
			this._clientReadyCancellation.dispose();
			this._clientReadyCancellation = undefined;

			return;
		}

		if (this._outputChannel) {
			this._outputChannel.dispose();
		}

		if (this._client === undefined) return;
		this._disposable && this._disposable.dispose();
		await Functions.cancellable(this._client.stop(), 30000, { onDidCancel: resolve => resolve() });

		this._starting = undefined;
		this._client = undefined;
	}
}

function started(target: CodeStreamAgentConnection, propertyName: string, descriptor: any) {
	if (typeof descriptor.value === "function") {
		const method = descriptor.value;
		descriptor.value = function(this: CodeStreamAgentConnection, ...args: any[]) {
			if (!this.started) throw new Error("CodeStream Agent has not been started");
			return method!.apply(this, args);
		};
	} else if (typeof descriptor.get === "function") {
		const get = descriptor.get;
		descriptor.get = function(this: CodeStreamAgentConnection, ...args: any[]) {
			if (!this.started) throw new Error("CodeStream Agent has not been started");
			return get!.apply(this, args);
		};
	}
}
