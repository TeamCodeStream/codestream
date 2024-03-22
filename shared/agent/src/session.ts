"use strict";

import { Agent as HttpAgent } from "http";
import { Agent as HttpsAgent } from "https";
import * as path from "path";
import * as url from "url";

import { isEmpty, isEqual, uniq } from "lodash";
import {
	CancellationToken,
	Connection,
	Emitter,
	Event,
	MessageActionItem,
	WorkspaceFolder,
} from "vscode-languageserver";
import {
	AgentFileSearchRequestType,
	ApiRequestType,
	ApiVersionCompatibility,
	BaseAgentOptions,
	BootstrapRequestType,
	ChangeDataType,
	CodeStreamEnvironment,
	CodeStreamEnvironmentInfo,
	ConfirmLoginCodeRequest,
	ConfirmLoginCodeRequestType,
	ConfirmRegistrationRequest,
	ConfirmRegistrationRequestType,
	ConfirmRegistrationResponse,
	ConnectionCode,
	ConnectionStatus,
	DeclineInviteRequest,
	DeclineInviteRequestType,
	LogoutCompanyRequest,
	LogoutCompanyRequestType,
	DidChangeApiVersionCompatibilityNotificationType,
	DidChangeConnectionStatusNotification,
	DidChangeConnectionStatusNotificationType,
	DidChangeDataNotificationType,
	DidChangeServerUrlNotificationType,
	DidChangeVersionCompatibilityNotificationType,
	DidEncounterMaintenanceModeNotificationType,
	DidFailLoginCodeGenerationNotificationType,
	DidFailLoginNotificationType,
	DidLoginNotificationType,
	DidLogoutNotificationType,
	DidSetEnvironmentNotificationType,
	DidStartLoginCodeGenerationNotificationType,
	DidStartLoginNotificationType,
	GenerateLoginCodeRequest,
	GenerateLoginCodeRequestType,
	GetAccessTokenRequestType,
	GetInviteInfoRequest,
	GetInviteInfoRequestType,
	isLoginFailResponse,
	JoinCompanyRequest,
	JoinCompanyRequestType,
	LoginResponse,
	LogoutReason,
	OtcLoginRequest,
	OtcLoginRequestType,
	PasswordLoginRequest,
	PasswordLoginRequestType,
	RegisterNrUserRequest,
	RegisterNrUserRequestType,
	RegisterUserRequest,
	RegisterUserRequestType,
	ReportingMessageType,
	SetServerUrlRequest,
	SetServerUrlRequestType,
	TokenLoginRequest,
	TokenLoginRequestType,
	VerifyConnectivityRequestType,
	VerifyConnectivityResponse,
	PollForMaintenanceModeRequestType,
	PollForMaintenanceModeResponse,
	RefreshMaintenancePollNotificationType,
	VersionCompatibility,
	DidRefreshAccessTokenNotificationType,
	ThirdPartyProviders,
	WhatsNewNotificationType,
	SessionTokenStatus,
	DidChangeSessionTokenStatusNotificationType,
} from "@codestream/protocols/agent";
import {
	CSAccessTokenType,
	CSApiCapabilities,
	CSCodemark,
	CSCompany,
	CSLoginResponse,
	CSMarker,
	CSMarkerLocations,
	CSMe,
	CSMePreferences,
	CSNRRegisterResponse,
	CSPost,
	CSRegisterResponse,
	CSRepository,
	CSStream,
	CSTeam,
	CSUser,
	LoginResult,
} from "@codestream/protocols/api";

import { HttpsProxyAgent } from "https-proxy-agent";
import { CodeStreamAgent } from "./agent";
import { AgentError, ServerError } from "./agentError";
import {
	ApiProvider,
	ApiProviderLoginResponse,
	CodeStreamApiMiddlewareContext,
	LoginOptions,
	MessageType,
	RTMessage,
} from "./api/apiProvider";
import { CodeStreamApiProvider } from "./api/codestream/codestreamApi";
import {
	ApiVersionCompatibilityChangedEvent,
	VersionCompatibilityChangedEvent,
	VersionMiddlewareManager,
} from "./api/middleware/versionMiddleware";
import { Container, SessionContainer } from "./container";
import { Logger } from "./logger";
import {
	Functions,
	log,
	memoize,
	registerDecoratedHandlers,
	registerProviders,
	Strings,
} from "./system";
import { testGroups } from "./testGroups";
import { ProxyAgent, setGlobalDispatcher } from "undici";
import * as fs from "fs";
import { FetchCore } from "./system/fetchCore";
import { tokenHolder } from "./providers/newrelic/TokenHolder";

// https://regex101.com/r/Yn5uqi/1
const envRegex = /https?:\/\/(?:codestream)?-?([a-zA-Z]+)?(?:[0-9])?(?:\.)((\w+)-?(?:\w+)?)?/i;

const FIRST_SESSION_TIMEOUT = 12 * 60 * 60 * 1000; // first session "times out" after 12 hours

export const loginApiErrorMappings: { [k: string]: LoginResult } = {
	"USRC-1001": LoginResult.InvalidCredentials,
	"USRC-1010": LoginResult.NotConfirmed,
	"AUTH-1002": LoginResult.InvalidToken,
	"AUTH-1003": LoginResult.InvalidToken,
	"AUTH-1004": LoginResult.ExpiredToken,
	"AUTH-1005": LoginResult.ExpiredToken,
	"USRC-1005": LoginResult.InvalidToken,
	"USRC-1002": LoginResult.InvalidToken,
	"USRC-1006": LoginResult.AlreadyConfirmed,
	"USRC-1026": LoginResult.WebMail,
	// "RAPI-1001": "missing parameter" // shouldn't ever happen
	"RAPI-1003": LoginResult.InvalidToken,
	"USRC-1012": LoginResult.NotOnTeam,
	"VERS-1001": LoginResult.VersionUnsupported,
	"USRC-1023": LoginResult.MaintenanceMode,
	"USRC-1024": LoginResult.MustSetPassword,
	"USRC-1022": LoginResult.ProviderConnectFailed,
	"USRC-1028": LoginResult.ExpiredCode,
	"USRC-1029": LoginResult.TooManyAttempts,
	"USRC-1030": LoginResult.InvalidCode,
	"USRC-1015": LoginResult.MultipleWorkspaces, // deprecated in favor of below...
	"PRVD-1002": LoginResult.MultipleWorkspaces,
	"PRVD-1005": LoginResult.SignupRequired,
	"PRVD-1006": LoginResult.SignInRequired,
	"USRC-1020": LoginResult.InviteConflict,
	"AUTH-1006": LoginResult.TokenNotFound,
};

export enum SessionStatus {
	SignedOut = "signedOut",
	SignedIn = "signedIn",
}

export interface SessionStatusChangedEvent {
	getStatus(): SessionStatus;

	session: CodeStreamSession;
}

export interface TelemetryData {
	hasCreatedPost: boolean;
}

export interface VersionInfo {
	extension: {
		build: string;
		buildEnv: string;
		version: string;
		versionFormatted: string;
	};

	ide: {
		name: string;
		version: string;
		detail: string;
	};

	machine?: {
		machineId?: string;
	};
}

export class CodeStreamSession {
	private _onDidChangeCodemarks = new Emitter<CSCodemark[]>();
	get onDidChangeCodemarks(): Event<CSCodemark[]> {
		return this._onDidChangeCodemarks.event;
	}

	private _onDidChangeCurrentUser = new Emitter<CSMe>();
	get onDidChangeCurrentUser(): Event<CSMe> {
		return this._onDidChangeCurrentUser.event;
	}

	private _onDidChangePreferences = new Emitter<CSMePreferences>();
	get onDidChangePreferences(): Event<CSMePreferences> {
		return this._onDidChangePreferences.event;
	}

	private _onDidChangeMarkerLocations = new Emitter<CSMarkerLocations[]>();
	get onDidChangeMarkerLocations(): Event<CSMarkerLocations[]> {
		return this._onDidChangeMarkerLocations.event;
	}

	private _onDidChangeMarkers = new Emitter<CSMarker[]>();
	get onDidChangeMarkers(): Event<CSMarker[]> {
		return this._onDidChangeMarkers.event;
	}

	private _onDidChangePosts = new Emitter<CSPost[]>();
	get onDidChangePosts(): Event<CSPost[]> {
		return this._onDidChangePosts.event;
	}

	private _onDidChangeRepositories = new Emitter<CSRepository[]>();
	get onDidChangeRepositories(): Event<CSRepository[]> {
		return this._onDidChangeRepositories.event;
	}

	private _onDidChangeStreams = new Emitter<CSStream[]>();
	get onDidChangeStreams(): Event<CSStream[]> {
		return this._onDidChangeStreams.event;
	}

	private _onDidChangeUsers = new Emitter<CSUser[]>();
	get onDidChangeUsers(): Event<CSUser[]> {
		return this._onDidChangeUsers.event;
	}

	private _onDidChangeTeams = new Emitter<CSTeam[]>();
	get onDidChangeTeams(): Event<CSTeam[]> {
		return this._onDidChangeTeams.event;
	}

	private _onDidRequestReset = new Emitter<void>();
	get onDidRequestReset(): Event<void> {
		return this._onDidRequestReset.event;
	}

	private _onDidChangeSessionStatus = new Emitter<SessionStatusChangedEvent>();
	get onDidChangeSessionStatus(): Event<SessionStatusChangedEvent> {
		return this._onDidChangeSessionStatus.event;
	}

	get proxyAgent(): HttpsAgent | HttpsProxyAgent<string> | undefined {
		return this._httpsAgent;
	}

	private readonly _httpsAgent: HttpsAgent | HttpsProxyAgent<string> | undefined;
	private readonly _httpAgent: HttpAgent | undefined; // used if api server is http
	private readonly _readyPromise: Promise<void>;

	private _activeServerAlerts: string[] = [];
	private _broadcasterRecoveryTimer: NodeJS.Timeout | undefined;
	private _echoTimer: NodeJS.Timeout | undefined;
	private _echoDidTimeout: boolean = false;

	constructor(
		public readonly agent: CodeStreamAgent,
		private readonly _connection: Connection,
		private readonly _options: BaseAgentOptions
	) {
		this._readyPromise = new Promise<void>(resolve =>
			this.agent.onReady(() => {
				Logger.log("Agent is ready");
				resolve();
			})
		);

		Container.initialize(agent, this);

		this.logNodeEnvVariables();

		const redactProxyPasswdRegex = /(http:\/\/.*:)(.*)(@.*)/gi;
		if (
			_options.proxySupport === "override" ||
			(_options.proxySupport == null && _options.proxy != null)
		) {
			if (_options.proxy != null) {
				const redactedUrl = _options.proxy.url.replace(redactProxyPasswdRegex, "$1*****$3");
				Logger.log(
					`Proxy support is in override with url=${redactedUrl}, strictSSL=${_options.proxy.strictSSL}`
				);
				this._httpsAgent = new HttpsProxyAgent(_options.proxy.url, {
					rejectUnauthorized: _options.proxy.strictSSL,
				});
				// Set proxy for fetchCore (undici and future native fetch)
				const dispatcher = new ProxyAgent({ uri: new URL(_options.proxy.url).toString() });
				setGlobalDispatcher(dispatcher);
			} else {
				Logger.log("Proxy support is in override, but no proxy settings were provided");
			}
		} else if (_options.proxySupport === "on") {
			const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
			if (proxyUrl) {
				const strictSSL = _options.proxy ? _options.proxy.strictSSL : true;
				const redactedUrl = proxyUrl.replace(redactProxyPasswdRegex, "$1*****$3");
				Logger.log(`Proxy support is on with url=${redactedUrl}, strictSSL=${strictSSL}`);

				let proxyUri;
				try {
					proxyUri = url.parse(proxyUrl);
				} catch {}

				if (proxyUri) {
					this._httpsAgent = new HttpsProxyAgent(proxyUrl, { rejectUnauthorized: strictSSL });
				}
			} else {
				Logger.log("Proxy support is on, but no proxy url was found");
			}
		} else {
			Logger.log("Proxy support is off");
		}

		if (!this._httpsAgent) {
			this._httpsAgent = new HttpsAgent({
				rejectUnauthorized: this.rejectUnauthorized,
			});
		}

		// if our api server is http (on-prem installation), create a separate http agent
		const protocol = url.parse(_options.serverUrl).protocol;
		if (protocol === "http:") {
			this._httpAgent = new HttpAgent();
		}

		Logger.log(`API Server URL: >${_options.serverUrl}<`);
		Logger.log(`Reject unauthorized: ${this.rejectUnauthorized}`);
		// Todo add refresh token handling
		this._nrFetchClient = new FetchCore();
		this._api = new CodeStreamApiProvider(
			_options.serverUrl?.trim(),
			this.versionInfo,
			this._httpAgent || this._httpsAgent,
			this.rejectUnauthorized,
			this._nrFetchClient
		);

		this._api.useMiddleware({
			get name() {
				return "MaintenanceMode";
			},

			onResponse: async (context: Readonly<CodeStreamApiMiddlewareContext>, _) => {
				if (context.response?.headers.get("X-CS-API-Maintenance-Mode") && tokenHolder.accessToken) {
					this._didEncounterMaintenanceMode();
				}

				const isMaintenanceMode = !!context.response?.headers.get("X-CS-API-Maintenance-Mode");
				this._refreshMaintenanceModePoll(isMaintenanceMode);

				const alerts = context.response?.headers.get("X-CS-API-Alerts");
				if (alerts) {
					Logger.warn(`API Server posted these alerts: ${alerts}`);
					this._activeServerAlerts = alerts.split(",");

					if (this.inBroadcasterFailureMode()) {
						Logger.warn(
							"Broadcaster failure detected, sending notification that we are reconnecting..."
						);
						const code = this._activeServerAlerts.includes("broadcasterConnectionFailure")
							? ConnectionCode.ApiBroadcasterConnectionFailure
							: ConnectionCode.ApiBroadcasterAcknowledgementFailure;
						this.agent.sendNotification(DidChangeConnectionStatusNotificationType, {
							status: ConnectionStatus.Reconnecting,
							code,
						});
						if (!this._broadcasterRecoveryTimer) {
							Logger.log("Will check for recovery in 30s...");
							this._broadcasterRecoveryTimer = setTimeout(() => {
								try {
									delete this._broadcasterRecoveryTimer;
									Logger.log("Calling API server to detect broadcaster recovery");
									this.api.fetch("/no-auth/capabilities");
								} catch (ex) {
									Logger.warn("broadcast recovery error", ex);
								}
							}, 30000);
						}
					}
				} else if (this._activeServerAlerts.length > 0) {
					Logger.log("API server cleared all active alerts");
					this._activeServerAlerts = [];
					this.agent.sendNotification(DidChangeConnectionStatusNotificationType, {
						status: ConnectionStatus.Reconnected,
					});
				}
			},
		});

		this.verifyConnectivity();
		const versionManager = new VersionMiddlewareManager(this._api);
		versionManager.onDidChangeCompatibility(this.onVersionCompatibilityChanged, this);
		versionManager.onDidChangeApiCompatibility(this.onApiVersionCompatibilityChanged, this);

		// this.connection.onHover(e => MarkerHandler.onHover(e));

		registerDecoratedHandlers(this.agent);

		this.agent.registerHandler(VerifyConnectivityRequestType, () => this.verifyConnectivity());
		this.agent.registerHandler(GetAccessTokenRequestType, e => {
			return { accessToken: tokenHolder.accessToken! };
		});
		this.agent.registerHandler(PasswordLoginRequestType, e => this.passwordLogin(e));
		this.agent.registerHandler(TokenLoginRequestType, e => this.tokenLogin(e));
		this.agent.registerHandler(OtcLoginRequestType, e => this.otcLogin(e));
		this.agent.registerHandler(ConfirmLoginCodeRequestType, e => this.codeLogin(e));
		this.agent.registerHandler(GenerateLoginCodeRequestType, e => this.generateLoginCode(e));
		this.agent.registerHandler(RegisterUserRequestType, e => this.register(e));
		this.agent.registerHandler(RegisterNrUserRequestType, e => this.registerNr(e));
		this.agent.registerHandler(ConfirmRegistrationRequestType, e => this.confirmRegistration(e));
		this.agent.registerHandler(GetInviteInfoRequestType, e => this.getInviteInfo(e));
		this.agent.registerHandler(JoinCompanyRequestType, e => this.joinCompany(e));
		this.agent.registerHandler(DeclineInviteRequestType, e => this.declineInvite(e));
		this.agent.registerHandler(LogoutCompanyRequestType, e => this.logoutCompany(e));
		this.agent.registerHandler(ApiRequestType, (e, cancellationToken: CancellationToken) =>
			this.api.fetch(e.url, e.init, e.token)
		);
		this.agent.registerHandler(SetServerUrlRequestType, e => this.setServerUrl(e));
		this.agent.registerHandler(PollForMaintenanceModeRequestType, () =>
			this.pollForMaintenanceMode()
		);

		this.agent.registerHandler(
			BootstrapRequestType,
			async (e, cancellationToken: CancellationToken) => {
				const { companies, repos, streams, teams, users, codeErrors } = SessionContainer.instance();

				// needed to ensure we subscribe to object streams for all code errors we have access to
				await codeErrors.ensureCached();

				const promise = Promise.all([
					companies.get(),
					repos.get(),
					streams.get(),
					teams.get(),
					users.getUnreads({}),
					users.get(),
					users.getPreferences(),
				]);

				const [
					companiesResponse,
					reposResponse,
					streamsResponse,
					teamsResponse,
					unreadsResponse,
					usersResponse,
					preferencesResponse,
				] = await promise;

				return {
					companies: companiesResponse.companies,
					preferences: preferencesResponse.preferences,
					repos: reposResponse.repos,
					streams: streamsResponse.streams,
					teams: teamsResponse.teams,
					unreads: unreadsResponse.unreads,
					users: usersResponse.users,
					providers: this.providers,
					apiCapabilities: this.apiCapabilities,
					environmentInfo: this.environmentInfo,
				};
			}
		);
	}

	private logNodeEnvVariables() {
		Logger.log(`Node.js version: ${process.version}`);
		Logger.log("NODE_* environment variables:");
		for (const prop in process.env) {
			if (prop.startsWith("NODE_")) {
				Logger.log(`${prop}=${process.env[prop]}`);
			}
		}
	}

	setServerUrl(options: SetServerUrlRequest) {
		this._options.serverUrl = options.serverUrl;
		this._options.disableStrictSSL = options.disableStrictSSL;
		this._api?.setServerUrl(this._options.serverUrl);
		this.agent.sendNotification(DidChangeServerUrlNotificationType, {
			serverUrl: options.serverUrl,
		});
		if (options.environment) {
			this._environmentInfo.environment = options.environment;
			this.agent.sendNotification(DidSetEnvironmentNotificationType, this._environmentInfo);
		}

		// whenever we set the server URL, verify we can reach it, this also fetches
		// necessary environment-related info
		this.verifyConnectivity();
	}

	onAccessTokenChanged(token: string, refreshToken?: string, tokenType?: CSAccessTokenType) {
		Logger.log("Session access token was changed, notifying extension...");
		// this._codestreamAccessToken = token;
		this.agent.sendNotification(DidRefreshAccessTokenNotificationType, {
			url: this._options.serverUrl,
			email: this._email!,
			teamId: this._teamId!,
			token: token,
			refreshToken,
			tokenType,
		});
	}

	onSessionTokenStatusChanged = Functions.debounceMemoized(
		(status: SessionTokenStatus) => {
			Logger.log(`Session token status changed: ${status}`);
			this.agent.sendNotification(DidChangeSessionTokenStatusNotificationType, { status });
		},
		5000,
		{ leading: true }
	);

	private _didEncounterMaintenanceMode() {
		this.agent.sendNotification(DidEncounterMaintenanceModeNotificationType, {
			teamId: this._teamId,
			token: {
				email: this._email!,
				url: this._options.serverUrl,
				teamId: this._teamId!,
				value: tokenHolder.accessToken!,
			},
		});
	}

	private _refreshMaintenanceModePoll = Functions.debounceMemoized(
		(isMaintenanceMode: boolean) => {
			this.agent.sendNotification(RefreshMaintenancePollNotificationType, {
				isMaintenanceMode,
				pollRefresh: true,
			});
		},
		2000,
		{ leading: true }
	);

	private async onRTMessageReceived(e: RTMessage) {
		// if we are in broadcaster failure mode, and we received an RT message, we'll immediately
		// ping the server to see if the broadcaster failure mode has gone away
		if (this.inBroadcasterFailureMode()) {
			Logger.log(
				"In broadcaster failure mode but we received an RT message, will ping server for status..."
			);
			// clear out any existing timer
			if (this._broadcasterRecoveryTimer) {
				clearTimeout(this._broadcasterRecoveryTimer);
				delete this._broadcasterRecoveryTimer;
			}
			// the API server will respond with headers that tell us whether we are still
			// in broadcast failure mode
			this.api.fetch("/no-auth/capabilities");
		}

		switch (e.type) {
			case MessageType.Codemarks:
				const codemarks = await SessionContainer.instance().codemarks.enrichCodemarks(e.data);
				this._onDidChangeCodemarks.fire(codemarks);
				this.agent.sendNotification(DidChangeDataNotificationType, {
					type: ChangeDataType.Codemarks,
					data: codemarks,
				});
				break;
			case MessageType.Companies:
				this.agent.sendNotification(DidChangeDataNotificationType, {
					type: ChangeDataType.Companies,
					data: e.data,
				});
				break;
			case MessageType.Connection:
				if (e.data.status === ConnectionStatus.Reconnected && e.data.reset) {
					void SessionContainer.instance().session.reset();
				}

				const data = { ...e.data } as DidChangeConnectionStatusNotification;
				if (data.status === ConnectionStatus.Reconnecting) {
					data.code = ConnectionCode.BroadcasterConnectionLost;
				}
				this.agent.sendNotification(DidChangeConnectionStatusNotificationType, data);
				break;
			case MessageType.MarkerLocations:
				this._onDidChangeMarkerLocations.fire(e.data);
				this.agent.sendNotification(DidChangeDataNotificationType, {
					type: ChangeDataType.MarkerLocations,
					data: e.data,
				});
				break;
			case MessageType.Markers:
				this._onDidChangeMarkers.fire(e.data);
				this.agent.sendNotification(DidChangeDataNotificationType, {
					type: ChangeDataType.Markers,
					data: e.data,
				});
				break;
			case MessageType.Posts:
				const posts = await SessionContainer.instance().posts.enrichPosts(e.data);
				this._onDidChangePosts.fire(posts);
				this.agent.sendNotification(DidChangeDataNotificationType, {
					type: ChangeDataType.Posts,
					data: posts,
				});
				break;
			case MessageType.Preferences:
				this._onDidChangePreferences.fire(e.data);
				this.agent.sendNotification(DidChangeDataNotificationType, {
					type: ChangeDataType.Preferences,
					data: e.data,
				});
				break;
			case MessageType.Repositories:
				this._onDidChangeRepositories.fire(e.data);
				this.agent.sendNotification(DidChangeDataNotificationType, {
					type: ChangeDataType.Repositories,
					data: e.data,
				});
				break;
			case MessageType.Reviews:
				this.agent.sendNotification(DidChangeDataNotificationType, {
					type: ChangeDataType.Reviews,
					data: e.data,
				});
				break;
			case MessageType.CodeErrors:
				this.agent.sendNotification(DidChangeDataNotificationType, {
					type: ChangeDataType.CodeErrors,
					data: e.data,
				});
				break;
			case MessageType.AsyncError:
				this.agent.sendNotification(DidChangeDataNotificationType, {
					type: ChangeDataType.AsyncError,
					data: e.data,
				});
				break;
			case MessageType.GrokStream:
				this.agent.sendNotification(DidChangeDataNotificationType, {
					type: ChangeDataType.GrokStream,
					data: e.data,
				});
				break;
			case MessageType.Streams:
				this._onDidChangeStreams.fire(e.data);
				this.agent.sendNotification(DidChangeDataNotificationType, {
					type: ChangeDataType.Streams,
					data: e.data,
				});
				break;
			case MessageType.Teams:
				this._onDidChangeTeams.fire(e.data);
				this.agent.sendNotification(DidChangeDataNotificationType, {
					type: ChangeDataType.Teams,
					data: e.data,
				});
				break;
			case MessageType.Unreads:
				this.agent.sendNotification(DidChangeDataNotificationType, {
					type: ChangeDataType.Unreads,
					data: e.data,
				});
				break;
			case MessageType.Users:
				const me = e.data.find(u => u.id === this._userId) as CSMe | undefined;
				if (me != null) {
					if (me.inMaintenanceMode) {
						return this._didEncounterMaintenanceMode();
					}
					this._onDidChangeCurrentUser.fire(me as CSMe);
				}

				this._onDidChangeUsers.fire(e.data);
				this.agent.sendNotification(DidChangeDataNotificationType, {
					type: ChangeDataType.Users,
					data: e.data,
				});
				break;
			case MessageType.Echo:
				this.echoReceived();
				break;
		}
	}

	// resolve user changes and notify the webview of the change
	// this is strongly recommended over JUST resolving user changes, since the resolution may
	// actually result in a user object being fetched, and can lead to race conditions if the
	// fetched user object isn't propagated to the webview
	async resolveUserAndNotify(user: CSUser): Promise<CSUser> {
		const data = (await SessionContainer.instance().users.resolve({
			type: MessageType.Users,
			data: [user],
		})) as CSMe[];
		this.agent.sendNotification(DidChangeDataNotificationType, {
			type: ChangeDataType.Users,
			data,
		});
		return data[0];
	}

	@log()
	async whatsNewNotification() {
		try {
			const currentVersion = this.versionInfo.extension.version;
			const me = await SessionContainer.instance().users.getMe();
			const preferences = me.preferences;

			const hasBeenNotified = preferences?.whatsNewNotificationsSent?.find(wnns => {
				return currentVersion.startsWith(wnns);
			});

			// already tracked for this version; bail out
			if (hasBeenNotified) {
				return;
			}

			const whatsNewBuffer = fs.readFileSync(path.join(__dirname, "WhatsNew.json"), {
				encoding: "utf-8",
			});
			const whatsNew: { version: string; title: string }[] = JSON.parse(whatsNewBuffer);

			const isFlagged = whatsNew.find(wn => {
				return currentVersion.startsWith(wn.version);
			});

			if (isFlagged) {
				this.agent.sendNotification(WhatsNewNotificationType, {
					title: isFlagged.title,
				});
				const newPreference = {
					whatsNewNotificationsSent: [
						...(preferences?.whatsNewNotificationsSent ?? []),
						isFlagged.version,
					],
				};
				this._api?.updatePreferences({ preferences: newPreference });
			}
		} catch (err) {
			//log it, but bail silently. don't want this interrupting users
			Logger.error(err, `whatsNewNotification`);
		}
	}

	@log()
	private onVersionCompatibilityChanged(e: VersionCompatibilityChangedEvent) {
		this.agent.sendNotification(DidChangeVersionCompatibilityNotificationType, e);

		if (e.compatibility === VersionCompatibility.UnsupportedUpgradeRequired) {
			Logger.log("onVersionCompatibilityChanged performing logout on UnsupportedUpgradeRequired");
			this.logout(LogoutReason.UnsupportedVersion);
		}
	}

	@log()
	private async onApiVersionCompatibilityChanged(e: ApiVersionCompatibilityChangedEvent) {
		this.agent.sendNotification(DidChangeApiVersionCompatibilityNotificationType, e);

		if (
			e.compatibility !== ApiVersionCompatibility.ApiUpgradeRequired &&
			SessionContainer.isInitialized()
		) {
			const oldCapabilities = SessionContainer.instance().session.apiCapabilities;
			const newCapabilities = await this.api.getApiCapabilities();
			const { teams, users } = SessionContainer.instance();
			const currentTeam = await teams.getByIdFromCache(this.teamId);
			const me = await users.getMe();

			if (!isEqual(oldCapabilities, newCapabilities)) {
				this.registerApiCapabilities(newCapabilities, currentTeam, me);
				this.agent.sendNotification(DidChangeDataNotificationType, {
					type: ChangeDataType.ApiCapabilities,
					data: this._apiCapabilities, // Use filtered apiCapabilities
				});
			}
		}
	}

	private _nrFetchClient: FetchCore;
	get nrFetchClient() {
		return this._nrFetchClient;
	}

	private _api: ApiProvider | undefined;
	get api() {
		return this._api!;
	}

	private _codestreamUserId: string | undefined;
	get codestreamUserId() {
		return this._codestreamUserId!;
	}

	private _nrUserId: number | undefined;
	get nrUserId() {
		return this._nrUserId;
	}

	private _email: string | undefined;
	get email() {
		return this._email!;
	}

	private _environmentInfo: CodeStreamEnvironmentInfo = {
		environment: CodeStreamEnvironment.Unknown,
		isOnPrem: false,
		isProductionCloud: false,
	};
	get environmentInfo() {
		if (this._environmentInfo.environment === CodeStreamEnvironment.Unknown) {
			if (this._options.serverUrl) {
				// this should only be called before we have communicated with the server,
				// which is regarded as the source of truth
				// for now, this is only needed by the error reporter initialization in errorReporter.ts
				// we should keep it that way
				this._environmentInfo = this.getEnvironmentFromServerUrl(this._options.serverUrl);
			}
		}
		return this._environmentInfo;
	}

	get environment() {
		return this.environmentInfo.environment;
	}

	get environmentName() {
		const host =
			this._environmentInfo.environmentHosts &&
			this._environmentInfo.environmentHosts.find(host => {
				return host.shortName === this._environmentInfo.environment;
			});
		if (host) {
			return host.name;
		} else {
			return undefined;
		}
	}

	get isOnPrem() {
		return this.environmentInfo.isOnPrem;
	}

	get isProductionCloud() {
		return this.environmentInfo.isProductionCloud;
	}

	get newRelicLandingServiceUrl() {
		return this.environmentInfo.newRelicLandingServiceUrl;
	}

	get newRelicApiUrl() {
		return this.environmentInfo.newRelicApiUrl;
	}

	// For vulnerability management
	get newRelicSecApiUrl() {
		return this.environmentInfo.newRelicSecApiUrl;
	}

	get disableStrictSSL(): boolean {
		return this._options.disableStrictSSL != null ? this._options.disableStrictSSL : false;
	}

	get rejectUnauthorized(): boolean {
		return !this.disableStrictSSL;
	}

	private _status: SessionStatus = SessionStatus.SignedOut;
	get status() {
		return this._status;
	}

	private setStatus(status: SessionStatus) {
		this._status = status;
		const e: SessionStatusChangedEvent = {
			getStatus: () => this._status,
			session: this,
		};

		this._onDidChangeSessionStatus.fire(e);
	}

	private _teamId: string | undefined;
	get teamId() {
		return this._teamId!;
	}

	private _apiCapabilities: CSApiCapabilities = {};
	get apiCapabilities() {
		return this._apiCapabilities;
	}

	private _telemetryData: TelemetryData = {
		hasCreatedPost: false,
	};
	get telemetryData() {
		return this._telemetryData;
	}

	set telemetryData(data: TelemetryData) {
		this._telemetryData = data;
	}

	private _userId: string | undefined;
	get userId() {
		return this._userId!;
	}

	private _providers: ThirdPartyProviders = {};
	get providers() {
		return this._providers!;
	}

	@memoize
	get versionInfo(): Readonly<VersionInfo> {
		return {
			extension: { ...this._options.extension },
			ide: { ...this._options.ide },
			machine: { machineId: this._options.machineId },
		};
	}

	get workspace() {
		return this._connection.workspace;
	}

	public async getWorkspaceFolders() {
		if (this._options.workspaceFolders) {
			Logger.log(
				`getWorkspaceFolders: ${this._options.workspaceFolders.length} preconfigured folders found`
			);
			return this._options.workspaceFolders;
		}

		if (this.agent.supportsWorkspaces) {
			try {
				Logger.log("getWorkspaceFolders: workspaces supported");
				return (await this.workspace.getWorkspaceFolders()) || [];
			} catch (ex) {
				// if you're here, ensure you've waited for the agent to be ready
				debugger;
			}
		}

		Logger.log("getWorkspaceFolders: workspaces not supported");
		return new Promise<WorkspaceFolder[] | null>((resolve, reject) => {
			try {
				if (this.agent.rootUri) {
					const uri =
						this.agent.rootUri[this.agent.rootUri.length - 1] === "/"
							? this.agent.rootUri.substring(0, this.agent.rootUri.length - 1)
							: this.agent.rootUri;
					resolve([
						{
							uri: uri,
							name: path.basename(this.agent.rootUri),
						},
					]);
				} else {
					resolve([]);
				}
			} catch (e) {
				Logger.error(e);
				reject(e);
			}
		});
	}

	async tryResolveCurrentTeam(): Promise<CSTeam | undefined> {
		if (!SessionContainer.isInitialized()) {
			return undefined;
		}
		try {
			return await SessionContainer.instance().teams.getByIdFromCache(this.teamId);
		} catch (e) {
			// ignore
			return undefined;
		}
	}

	@log({ singleLine: true })
	async verifyConnectivity(): Promise<VerifyConnectivityResponse> {
		if (!this._api) throw new Error("cannot verify connectivity, no API connection established");
		const response = await this._api.verifyConnectivity();
		const currentTeam = await this.tryResolveCurrentTeam();
		this.registerApiCapabilities(response.capabilities as CSApiCapabilities, currentTeam);
		// response.capabilities is unfiltered - doesn't account for restricted / team / org flags
		response.capabilities = this._apiCapabilities;
		this._environmentInfo = {
			environment: response.environment || "",
			isOnPrem: response.isOnPrem || false,
			isProductionCloud: response.isProductionCloud || false,
			newRelicLandingServiceUrl: response.newRelicLandingServiceUrl,
			newRelicApiUrl: response.newRelicApiUrl,
			newRelicSecApiUrl: response.newRelicSecApiUrl,
			environmentHosts: response.environmentHosts,
		};
		Logger.log("Got environment from connectivity response:", this._environmentInfo);
		this.agent.sendNotification(DidSetEnvironmentNotificationType, this._environmentInfo);
		if (response.capabilities.serviceGatewayAuth) {
			Logger.log("Service Gateway auth is enabled");
			this._api.setUsingServiceGatewayAuth();
		}
		return response;
	}

	@log({ singleLine: true })
	async pollForMaintenanceMode(): Promise<PollForMaintenanceModeResponse> {
		if (!this._api) throw new Error("cannot verify connectivity, no API connection established");
		const response = await this._api.pollForMaintenanceMode();
		return response;
	}

	@log({ singleLine: true })
	async passwordLogin(request: PasswordLoginRequest) {
		const cc = Logger.getCorrelationContext();
		Logger.log(
			cc,
			`Logging ${request.email} into CodeStream (@ ${this._options.serverUrl}) via password`
		);

		return this.login({
			type: "credentials",
			...request,
		});
	}

	@log({ singleLine: true })
	async tokenLogin(request: TokenLoginRequest) {
		const { token } = request;
		const cc = Logger.getCorrelationContext();
		Logger.log(
			cc,
			`Logging ${token.email} into CodeStream (@ ${token.url}) via authentication token...`
		);

		// coming from the webview after a successful email confirmation, we explicitly handle
		// an instruction to switch environments, since the message to switch environments that is
		// sent to the IDE may still be in progress
		if (request.setEnvironment) {
			this._environmentInfo.environment = request.setEnvironment.environment;
			this.setServerUrl({ serverUrl: request.setEnvironment.serverUrl });
		}

		return this.login({
			type: "token",
			...request,
		});
	}

	@log({ singleLine: true })
	async joinCompany(request: JoinCompanyRequest) {
		// coming from the webview after a successful signup, we explicitly handle
		// an instruction to switch environments, since the message to switch environments that is
		// sent to the IDE may still be in progress
		if (request.fromEnvironment) {
			// make an explicit request to the API server to copy this user from the other environment
			// before joining the company
			return this._api!.joinCompanyFromEnvironment(request);
		} else {
			return this._api!.joinCompany(request);
		}
	}

	@log({ singleLine: true })
	async declineInvite(request: DeclineInviteRequest) {
		// coming from the webview after a successful signup, we explicitly handle
		// an instruction to switch environments, since the message to switch environments that is
		// sent to the IDE may still be in progress
		// if (request.fromEnvironment) {
		// 	// make an explicit request to the API server to copy this user from the other environment
		// 	// before joining the company
		// 	return this._api!.joinCompanyFromEnvironment(request);
		// } else {
		return this._api!.declineInvite(request);
		// }
	}

	@log({ singleLine: true })
	async logoutCompany(request: LogoutCompanyRequest) {
		return this._api!.logoutCompany(request);
	}

	@log({ singleLine: true })
	async otcLogin(request: OtcLoginRequest) {
		const cc = Logger.getCorrelationContext();
		Logger.log(cc, `Logging into CodeStream (@ ${this._options.serverUrl}) via otc code...`);

		try {
			return this.login({
				type: "otc",
				...request,
			});
		} catch (e) {
			debugger;
			throw new Error();
		}
	}

	@log({ singleLine: true })
	async codeLogin(request: ConfirmLoginCodeRequest) {
		const cc = Logger.getCorrelationContext();
		Logger.log(cc, `Logging into Codestream (@ ${this._options.serverUrl}) via login code...`);

		return this.login({
			type: "loginCode",
			...request,
		});
	}

	@log({ singleLine: true })
	async generateLoginCode(request: GenerateLoginCodeRequest) {
		if (this.status === SessionStatus.SignedIn) {
			Container.instance().errorReporter.reportMessage({
				type: ReportingMessageType.Warning,
				source: "agent",
				message: "There was a redundant attempt to login while already logged in.",
				extra: {
					loginType: "loginCode",
				},
			});
			return { status: LoginResult.AlreadySignedIn };
		}

		this.agent.sendNotification(DidStartLoginCodeGenerationNotificationType, undefined);

		try {
			await this.api.generateLoginCode(request);
		} catch (ex) {
			this.agent.sendNotification(DidFailLoginCodeGenerationNotificationType, undefined);
			if (ex instanceof ServerError) {
				if (ex.statusCode !== undefined && ex.statusCode >= 400 && ex.statusCode < 500) {
					let error = loginApiErrorMappings[ex.info.code] || LoginResult.Unknown;
					return {
						status: error,
						extra: ex.info,
					};
				}
			}

			Container.instance().errorReporter.reportMessage({
				type: ReportingMessageType.Error,
				message: "Unexpected error generating login code",
				source: "agent",
				extra: {
					...ex,
				},
			});
			throw AgentError.wrap(ex, `Login failed:\n${ex.message}`);
		}

		return {
			status: LoginResult.Success,
		};
	}

	@log({
		singleLine: true,
	})
	async login(options: LoginOptions): Promise<LoginResponse> {
		if (this.status === SessionStatus.SignedIn) {
			Container.instance().errorReporter.reportMessage({
				type: ReportingMessageType.Warning,
				source: "agent",
				message: "There was a redundant attempt to login while already logged in.",
				extra: {
					loginType: options.type,
				},
			});
			return { error: LoginResult.AlreadySignedIn };
		}

		this.agent.sendNotification(DidStartLoginNotificationType, undefined);

		let response: ApiProviderLoginResponse;
		try {
			response = await this.api.login(options);
		} catch (ex) {
			this.agent.sendNotification(DidFailLoginNotificationType, undefined);
			if (ex instanceof ServerError) {
				if (ex.statusCode !== undefined && ex.statusCode >= 400 && ex.statusCode < 500) {
					let error = loginApiErrorMappings[ex.info.code] || LoginResult.Unknown;
					if (error === LoginResult.ProviderConnectFailed) {
						Container.instance().telemetry.track({
							eventName: "codestream/user/login failed",
							properties: {
								meta_data: `error: ${ex.info && ex.info.error}`,
								event_type: "response",
								platform: "codestream",
								path: "N/A (codestream)",
								section: "N/A (codestream)",
							},
						});
						// map the reason for provider auth failure
						error = loginApiErrorMappings[ex.info.error];
					}
					return {
						error: error,
						extra: ex.info,
					};
				}
			}

			// api.login() will throw a failed response object if it needs to send some extra data back
			if (isLoginFailResponse(ex)) {
				if (ex.extra.isRegistered) {
					this.setSuperPropsAndCallTelemetry(ex.extra.user);
				}
				return ex;
			}

			Container.instance().errorReporter.reportMessage({
				type: ReportingMessageType.Error,
				message: "Unexpected error logging in",
				source: "agent",
				extra: {
					...ex,
				},
			});
			throw AgentError.wrap(ex, `Login failed:\n${ex.message}`);
		}

		const token = response.token;
		if (response.accessTokenInfo?.refreshToken) {
			token.refreshToken = response.accessTokenInfo.refreshToken;
		}
		if (response.accessTokenInfo?.tokenType) {
			token.tokenType = response.accessTokenInfo.tokenType;
		}
		tokenHolder.setAccessToken(token.value, response.accessTokenInfo);
		this._teamId = (this._options as any).teamId = token.teamId;
		this._codestreamUserId = response.user.id;
		this._nrUserId = response.user.nrUserId;
		this._userId = response.user.id;
		this._email = response.user.email;

		const currentTeam = response.teams.find(t => t.id === this._teamId)!;
		this.registerApiCapabilities(response.capabilities || {}, currentTeam, response.user);
		this.agent.sendNotification(DidChangeDataNotificationType, {
			type: ChangeDataType.ApiCapabilities,
			data: this._apiCapabilities,
		});

		if (response.provider === "codestream") {
			if (
				currentTeam.providerInfo !== undefined &&
				Object.keys(currentTeam.providerInfo).length > 0
			) {
				// the user is using email/password for a CS team and being put into another type team
				return { error: LoginResult.InvalidCredentials };
			}
		}

		this._providers = currentTeam.providerHosts || {};
		const combinedProviders = { ...currentTeam.providerHosts };
		registerProviders(combinedProviders, this, false);

		const cc = Logger.getCorrelationContext();

		Logger.log(`Login environment: ${this._environmentInfo.environment}`);

		if (
			this._environmentInfo.environment === CodeStreamEnvironment.Unknown ||
			isEmpty(this._environmentInfo.environment)
		) {
			await this.verifyConnectivity();
		}

		SessionContainer.initialize(this);
		try {
			await SessionContainer.instance().users.cacheSet(response.user);
			// after initializing, wait for the initial search of git repositories to complete,
			// otherwise newly matched repos might be returned to the webview before the bootstrap
			// request can be processed, resulting in bad repo data known by the webview
			// see https://trello.com/c/1IjQLhzh - Colin
			await SessionContainer.instance().git.ensureSearchComplete();
			await SessionContainer.instance().inject();
		} catch (e) {
			Logger.error(e, cc);
		}

		// re-register to acknowledge lsp handlers from newly instantiated classes
		registerDecoratedHandlers(this.agent);

		this.setStatus(SessionStatus.SignedIn);

		this.api.onDidReceiveMessage(e => this.onRTMessageReceived(e), this);

		Logger.log(cc, `Subscribing to real-time events...`);
		await this.api.subscribe();

		SessionContainer.instance().git.onRepositoryChanged(data => {
			SessionContainer.instance().session.agent.sendNotification(DidChangeDataNotificationType, {
				type: ChangeDataType.Commits,
				data: data,
			});
		});

		SessionContainer.instance().git.onGitWorkspaceChanged(data => {
			SessionContainer.instance().session.agent.sendNotification(DidChangeDataNotificationType, {
				type: ChangeDataType.Workspace,
				data: data,
			});
		});

		SessionContainer.instance().reviews.initializeCurrentBranches();

		// this needs to happen before initializing telemetry, because super-properties are dependent
		if (this.apiCapabilities.testGroups) {
			const company = await this.setCompanyTestGroups();
			if (company) {
				// replace company object in the response, so the test groups are correct
				// for telemetry, and also what we send back to the webview
				const index = response.companies.findIndex(c => c.id === company.id);
				response.companies.splice(index, 1);
				response.companies.push(company);
			}
		}

		// initialze tracking call with full user data (ie team/company info)
		// this is the second time identify() is called in signup flow, first in signin flow
		this.setSuperPropsAndCallTelemetry(response.user, currentTeam, response.companies);

		const loginResponse = {
			loginResponse: { ...response },
			state: {
				token: token,
				capabilities: this.api.capabilities,
				email: this._email!,
				environmentInfo: this._environmentInfo,
				eligibleJoinCompanies: response.user.eligibleJoinCompanies,
				serverUrl: this._options.serverUrl!,
				teamId: this._teamId!,
				userId: response.user.id,
				codemarkId: options.codemarkId,
				reviewId: options.reviewId,
				codeErrorId: options.codeErrorId,
			},
		};

		setImmediate(() => {
			this.agent.sendNotification(DidLoginNotificationType, { data: loginResponse });
			this.whatsNewNotification();
		});

		if (!response.user.timeZone) {
			const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			this.api.updateUser({ timeZone });
		}

		if (this.isOnPrem && this.apiCapabilities.echoes) {
			this.listenForEchoes();
		}

		return loginResponse;
	}

	@log({
		singleLine: true,
	})
	async register(request: RegisterUserRequest) {
		function isCSLoginResponse(r: CSRegisterResponse | CSLoginResponse): r is CSLoginResponse {
			return (r as any).accessToken !== undefined;
		}

		try {
			const response = await (this._api as CodeStreamApiProvider).register(request);

			if (isCSLoginResponse(response)) {
				if (response.companies.length === 0 || response.teams.length === 0) {
					return { status: LoginResult.NotInCompany, token: response.accessToken };
				}

				this._teamId = response.teams.find(_ => _.isEveryoneTeam)!.id;
				return { status: LoginResult.AlreadyConfirmed, token: response.accessToken };
			} else {
				return { status: LoginResult.Success };
			}
		} catch (error) {
			if (error instanceof ServerError) {
				if (error.statusCode !== undefined && error.statusCode >= 400 && error.statusCode < 500) {
					return { status: loginApiErrorMappings[error.info.code] || LoginResult.Unknown };
				}
			}

			Container.instance().errorReporter.reportMessage({
				type: ReportingMessageType.Error,
				message: "Unexpected error during registration",
				source: "agent",
				extra: {
					...error,
				},
			});
			throw AgentError.wrap(error, `Registration failed:\n${error.message}`);
		}
	}

	@log({
		singleLine: true,
	})
	async registerNr(request: RegisterNrUserRequest) {
		function isCSNRLoginResponse(r: CSNRRegisterResponse | CSLoginResponse): r is CSLoginResponse {
			return (r as any).accessToken !== undefined;
		}

		try {
			const response = await (this._api as CodeStreamApiProvider).registerNr(request);
			// @TODO: this logic could be cleaner and easier to read
			if (isCSNRLoginResponse(response)) {
				if (response.companies.length === 0 || response.teams.length === 0) {
					return {
						status: LoginResult.NotInCompany,
						token: response.accessToken,
						email: response.user?.email,
						eligibleJoinCompanies: response.user?.eligibleJoinCompanies,
						isWebmail: response.isWebmail,
						accountIsConnected: response.accountIsConnected,
					};
				}
				this._teamId = response.teams.find(_ => _.isEveryoneTeam)!.id;
				return {
					status: LoginResult.Success,
					token: response.accessToken,
					email: response.user?.email,
					teamId: this._teamId,
					companies: response.companies,
					eligibleJoinCompanies: response.user?.eligibleJoinCompanies,
					isWebmail: response.isWebmail,
					accountIsConnected: response.accountIsConnected,
				};
			} else {
				throw new Error("no access token in response"); // there's really no reason we should get here
			}
		} catch (error) {
			if (error instanceof ServerError) {
				if (error.statusCode !== undefined && error.statusCode >= 400 && error.statusCode < 500) {
					return {
						status: loginApiErrorMappings[error.info.code] || LoginResult.Unknown,
						email: error.info.info,
						notInviteRelated: true,
					};
				}
			}

			Container.instance().errorReporter.reportMessage({
				type: ReportingMessageType.Error,
				message: "Unexpected error during registration",
				source: "agent",
				extra: {
					...error,
				},
			});
			return error;
		}
	}

	@log({ singleLine: true })
	async confirmRegistration(request: ConfirmRegistrationRequest) {
		try {
			const response = await (this._api as CodeStreamApiProvider).confirmRegistration(request);

			const result: ConfirmRegistrationResponse = {
				user: {
					id: response.user.id,
					eligibleJoinCompanies: response.user.eligibleJoinCompanies,
				},
				status: LoginResult.Unknown,
				token: response.accessToken,
				companies: response.companies,
				accountIsConnected: response.accountIsConnected,
				isWebmail: response.isWebmail,
				forceCreateCompany: response.forceCreateCompany,
			};
			if (response.setEnvironment) {
				Logger.log(
					`Passing directive to switch environments to ${response.setEnvironment.environment}:${response.setEnvironment.publicApiUrl}`
				);
				result.setEnvironment = {
					environment: response.setEnvironment.environment,
					serverUrl: response.setEnvironment.publicApiUrl,
				};
			}

			if (response.companies.length === 0 || response.teams.length === 0) {
				result.status = LoginResult.NotInCompany;
				return result;
			}
			//if (response.teams.length === 0) {
			//	result.status = LoginResult.NotOnTeam;
			//	return result;
			//}

			this._teamId = response.teams.find(_ => _.isEveryoneTeam)!.id;
			result.status = LoginResult.Success;
			return result;
		} catch (error) {
			if (error instanceof ServerError) {
				if (error.statusCode !== undefined && error.statusCode >= 400 && error.statusCode < 500) {
					return {
						status: loginApiErrorMappings[error.info.code] || LoginResult.Unknown,
					};
				}
			}

			Container.instance().errorReporter.reportMessage({
				type: ReportingMessageType.Error,
				message: "Unexpected error confirming registration",
				source: "agent",
				extra: {
					...error,
				},
			});
			throw AgentError.wrap(error, `Registration confirmation failed:\n${error.message}`);
			// }
		}
	}

	@log({ singleLine: true })
	async getInviteInfo(request: GetInviteInfoRequest) {
		try {
			const response = await (this._api as CodeStreamApiProvider).getInviteInfo(request);
			return { status: LoginResult.Success, info: response };
		} catch (error) {
			if (error instanceof ServerError) {
				if (error.statusCode !== undefined && error.statusCode >= 400 && error.statusCode < 500) {
					return { status: loginApiErrorMappings[error.info.code] || LoginResult.Unknown };
				}
			}

			Container.instance().errorReporter.reportMessage({
				type: ReportingMessageType.Error,
				message: "Unexpected error getting invite info",
				source: "agent",
				extra: {
					...error,
				},
			});
			throw AgentError.wrap(error, `Get invite info failed:\n${error.message}`);
		}
	}

	@log()
	logout(reason: LogoutReason) {
		Logger.log(`Session.logout: ${reason}`);
		this.setStatus(SessionStatus.SignedOut);
		// disposeNR();
		return this.agent.sendNotification(DidLogoutNotificationType, { reason: reason });
	}

	async ready() {
		return this._readyPromise;
	}

	@log()
	async reset() {
		this._onDidRequestReset.fire(undefined);
	}

	@log()
	showErrorMessage<T extends MessageActionItem>(message: string, ...actions: T[]) {
		return this._connection.window.showErrorMessage(message, ...actions);
	}

	@log()
	showInformationMessage<T extends MessageActionItem>(message: string, ...actions: T[]) {
		return this._connection.window.showInformationMessage(message, ...actions);
	}

	@log()
	showWarningMessage<T extends MessageActionItem>(message: string, ...actions: T[]) {
		return this._connection.window.showWarningMessage(message, ...actions);
	}

	// having to determine environment in this way is bad ... but we keep it for two reasons:
	// (1) to maintain compatibility with older api servers (for on-prem installs), before this
	//    information was delivered by the api server ... once all our on-prem installs are
	//    forced to be up to date, we can eliminate that reason
	// (2) upon agent initialization, the error reporter (errorReporter.ts) connects to Sentry,
	//    but only in production ... it needs to know if we are in production before we have
	//    communicated with the server, so that will be determined here
	//
	// In theory, this method should be called for no other reason that those given above.
	private getEnvironmentFromServerUrl(url: string): CodeStreamEnvironmentInfo {
		const match = envRegex.exec(url);

		let [env, host] = match || [];
		let isProductionCloud = false;

		// in these cases, the env will be something like "localhost" or "calvin" or....
		if (
			host != null &&
			host.toLowerCase() !== "service" &&
			host.toLowerCase() !== "staging-service"
		) {
			return {
				environment: CodeStreamEnvironment.Local,
				isOnPrem: false,
				isProductionCloud: isProductionCloud,
			};
		}

		if (env) {
			env = env.toLowerCase();

			if (env === "us" || env === "eu") {
				isProductionCloud = true;
			}

			return {
				environment: env,
				isOnPrem: false,
				isProductionCloud: isProductionCloud,
			};
		} else {
			return {
				environment: CodeStreamEnvironment.Unknown,
				isOnPrem: false,
				isProductionCloud: isProductionCloud,
			};
		}
	}

	private async setSuperPropsAndCallTelemetry(user: CSMe, team?: CSTeam, companies?: CSCompany[]) {
		// Set super props
		this._telemetryData.hasCreatedPost = user.totalPosts > 0;

		const metaData: { [key: string]: any } = {
			codestream_first_signin: new Date(user.createdAt!).toISOString(),
			codestream_endpoint: this.versionInfo.ide.name,
			codestream_endpoint_detail: this.versionInfo.ide.detail,
			codestream_ide_version: this.versionInfo.ide.version,
			codestream_extension_version: this.versionInfo.extension.versionFormatted,
		};
		if (this.environmentName) {
			metaData["codestream_region"] = this.environmentName;
		}

		const props: { [key: string]: any } = {
			//user_id: user.nrUserId,
			platform: "codestream",
			path: "N/A (codestream)",
			section: "N/A (codestream)",
		};

		if (team) {
			if (companies) {
				const company = companies.find(c => c.id === team.companyId);
				if (company) {
					metaData["codestream_nr_organization_id"] = company.linkedNROrgId;
				}
			}
			metaData["codestream_organization_id"] = team.companyId;
			metaData["codestream_organization_created"] = new Date(team.createdAt!).toISOString();
		}

		props["meta_data_15"] = JSON.stringify(metaData);

		const { telemetry } = Container.instance();
		await telemetry.ready();
		telemetry.identify(user.nrUserId.toString(), props);
		telemetry.setSuperProps(props);
	}

	@log()
	async addSuperProps(props: { [key: string]: any }) {
		const { telemetry } = Container.instance();
		await telemetry.ready();
		telemetry.identify((this._nrUserId || "").toString(), props);
		telemetry.addSuperProps(props);
	}

	@log()
	async updateProviders() {
		const currentTeam = await SessionContainer.instance().teams.getByIdFromCache(this.teamId);
		if (currentTeam) {
			registerProviders(this._providers, this);
			this.agent.sendNotification(DidChangeDataNotificationType, {
				type: ChangeDataType.Providers,
				data: this._providers,
			});
		}
	}

	registerApiCapabilities(apiCapabilities: CSApiCapabilities, team?: CSTeam, user?: CSMe): void {
		const teamSettings = (team && team.settings) || {};
		const teamFeatures = teamSettings.features || {};
		const userPreferences = (user && user.preferences) || {};
		const userFeatures = userPreferences.features || {};
		Logger.log(
			`registerApiCapabilities for teamId ${team?.id}, userId ${user?.id}`,
			teamFeatures,
			userFeatures
		);
		this._apiCapabilities = {};
		if (this.versionInfo.ide.name == null || this.versionInfo.ide.name === "") {
			Logger.warn("IDE name not set - IDE-specific capabilities can't be identified");
		}
		for (const key in apiCapabilities) {
			const capability = apiCapabilities[key];
			if (
				(!capability.restricted || teamFeatures[key]) &&
				(!capability.userRestricted || userFeatures[key]) &&
				(!capability.supportedIdes || capability.supportedIdes.includes(this.versionInfo.ide.name))
			) {
				this._apiCapabilities[key] = capability;
			}
		}
		Logger.log("_apiCapabilities", this._apiCapabilities);
	}

	async setCompanyTestGroups() {
		const team = await SessionContainer.instance().teams.getByIdFromCache(this.teamId);
		if (!team) return;
		const company = await SessionContainer.instance().companies.getByIdFromCache(team.companyId);
		if (!company) return;

		// for each test, check if our company has been assigned a group, if not,
		// generate a random group assignment from the possible choices and ping the server
		const set: { [key: string]: string } = {};
		const companyTestGroups = company.testGroups || {};
		for (const testName in testGroups) {
			if (!companyTestGroups[testName]) {
				const { choices } = testGroups[testName];
				const which = Math.floor(Math.random() * choices.length);
				set[testName] = choices[which];
			}
		}

		if (Object.keys(set).length > 0) {
			return this.api.setCompanyTestGroups(company.id, set);
		}
		return undefined;
	}

	inBroadcasterFailureMode() {
		return (
			this._activeServerAlerts.includes("broadcasterConnectionFailure") ||
			this._activeServerAlerts.includes("broadcasterAcknowledgementFailure")
		);
	}

	announceHistoryFetches() {
		return this._activeServerAlerts.includes("announceHistoryFetches");
	}

	listenForEchoes() {
		this._echoTimer = setTimeout(this.echoTimeout.bind(this), 10000);
	}

	echoTimeout() {
		try {
			Logger.warn(
				"Have not received an echo for 10 seconds, setting connection status to Reconnecting"
			);
			this.agent.sendNotification(DidChangeConnectionStatusNotificationType, {
				status: ConnectionStatus.Reconnecting,
				code: ConnectionCode.EchoTimeout,
			});
			this._echoDidTimeout = true;
			if (this.isOnPrem && this.apiCapabilities.echoes) {
				this.listenForEchoes();
			}
		} catch (ex) {
			Logger.warn("echoTimeout error", ex);
		}
	}

	echoReceived() {
		if (this._echoTimer) {
			clearTimeout(this._echoTimer);
		}
		if (this._echoDidTimeout) {
			Logger.log("Echo received after a timeout, setting connection status to Reconnecting");
			this.agent.sendNotification(DidChangeConnectionStatusNotificationType, {
				status: ConnectionStatus.Reconnected,
			});
			this._echoDidTimeout = false;
		}
		if (this.isOnPrem && this.apiCapabilities.echoes) {
			this.listenForEchoes();
		}
	}

	async onFileSearch(basePath: string, path: string) {
		// Avoid matching too many entries when path is likely invalid:
		// - at least one character plus extension
		// - at least one letter
		if (!path || path.length < 3 || !/[a-zA-Z]/g.test(path)) {
			Logger.log(`onFileSearch: Skipping search for ${path}`);
			return { files: [] };
		}

		// Normalize path of errors originated from Windows
		path = path.replace(/\\/g, "/");

		// reverse to start with the shortest path (aka least specific)
		const paths = Strings.asPartialPaths(path).reverse();
		let files: string[] = [];
		try {
			Logger.log(`onFileSearch: Searching for ${path}`);
			for (const path of paths) {
				Logger.log(`onFileSearch: Requesting IDE file search for ${path} in ${basePath}`);
				const fileSearchResponse = (
					await this.agent.sendRequest(AgentFileSearchRequestType, { basePath, path })
				).files;
				if (!fileSearchResponse.length) {
					// once there are no more results, just stop
					break;
				}
				files = files.concat(fileSearchResponse);
			}
			Logger.log(`onFileSearch: IDE found ${files.length} possible matches for ${path}`);
			// FIXME this is very slow and can't be used as is
			// if (!files.length) {
			// 	for (const path of paths) {
			// 		Logger.log(`onFileSearch: Searching filesystem for ${path} in ${basePath}`);
			// 		const globSearchResults = await glob(basePath + "/**/" + path);
			// 		if (!globSearchResults.length) {
			// 			// once there are no more results, just stop
			// 			break;
			// 		}
			// 		files = files.concat(globSearchResults);
			// 	}
			// 	Logger.log(`onFileSearch: filesystem found ${files.length} possible matches for ${path}`);
			// }
			// put the most specific files found first (aka greatest number of separators)
			files = uniq(files).reverse();
			if (files.length) {
				Logger.log(`onFileSearch ${path} found ${files.length} file(s)`, {
					files: files,
				});
			}
			return {
				files: files,
			};
		} catch (ex) {
			Logger.warn(`Could not find file[s] for ${path}`, {
				error: ex,
			});
			return { files: [] };
		}
	}
	dispose() {}
}
