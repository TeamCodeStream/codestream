"use strict";

// import { Emitter, Event, MessageActionItem } from "vscode-languageserver";
import { Agent as HttpsAgent } from "https";
import HttpsProxyAgent from "https-proxy-agent";
import { AgentError, ServerError } from "../agentError";
import { ApiProvider, LoginOptions } from "../api/apiProvider";
import { Container, SessionContainer } from "../container";
import { DocumentEventHandler } from "../documentEventHandler";
import { Logger } from "../logger";
import {
	AgentState,
	CodeStreamEnvironment,
	CodeStreamEnvironmentInfo,
	ConfirmLoginCodeRequest,
	ConfirmRegistrationRequest,
	GenerateLoginCodeRequest,
	GetInviteInfoRequest,
	JoinCompanyRequest,
	LoginResponse,
	LogoutReason,
	OtcLoginRequest,
	PasswordLoginRequest,
	RegisterNrUserRequest,
	RegisterUserRequest,
	ReportingMessageType,
	SetServerUrlRequest,
	ThirdPartyProviders,
	TokenLoginRequest,
	VerifyConnectivityResponse
} from "../protocol/agent.protocol";
import {
	CSApiCapabilities,
	CSLoginResponse,
	CSTeam,
	CSUser,
	LoginResult
} from "../protocol/api.protocol";
import { memoize } from "../system";
import { testGroups } from "../testGroups";
import { SessionStatus, TelemetryData, VersionInfo } from "../types";

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
	"AUTH-1006": LoginResult.TokenNotFound
};

export class CodeStreamSession {
	// private _onDidChangeCodemarks = new Emitter<CSCodemark[]>();
	// get onDidChangeCodemarks(): Event<CSCodemark[]> {
	// 	return this._onDidChangeCodemarks.event;
	// }
	//
	// private _onDidChangeCurrentUser = new Emitter<CSMe>();
	// get onDidChangeCurrentUser(): Event<CSMe> {
	// 	return this._onDidChangeCurrentUser.event;
	// }
	//
	// private _onDidChangePreferences = new Emitter<CSMePreferences>();
	// get onDidChangePreferences(): Event<CSMePreferences> {
	// 	return this._onDidChangePreferences.event;
	// }
	//
	// private _onDidChangeMarkerLocations = new Emitter<CSMarkerLocations[]>();
	// get onDidChangeMarkerLocations(): Event<CSMarkerLocations[]> {
	// 	return this._onDidChangeMarkerLocations.event;
	// }
	//
	// private _onDidChangeMarkers = new Emitter<CSMarker[]>();
	// get onDidChangeMarkers(): Event<CSMarker[]> {
	// 	return this._onDidChangeMarkers.event;
	// }
	//
	// private _onDidChangePosts = new Emitter<CSPost[]>();
	// get onDidChangePosts(): Event<CSPost[]> {
	// 	return this._onDidChangePosts.event;
	// }
	//
	// private _onDidChangeRepositories = new Emitter<CSRepository[]>();
	// get onDidChangeRepositories(): Event<CSRepository[]> {
	// 	return this._onDidChangeRepositories.event;
	// }
	//
	// private _onDidChangeStreams = new Emitter<CSStream[]>();
	// get onDidChangeStreams(): Event<CSStream[]> {
	// 	return this._onDidChangeStreams.event;
	// }
	//
	// private _onDidChangeUsers = new Emitter<CSUser[]>();
	// get onDidChangeUsers(): Event<CSUser[]> {
	// 	return this._onDidChangeUsers.event;
	// }
	//
	// private _onDidChangeTeams = new Emitter<CSTeam[]>();
	// get onDidChangeTeams(): Event<CSTeam[]> {
	// 	return this._onDidChangeTeams.event;
	// }
	//
	// private _onDidRequestReset = new Emitter<void>();
	// get onDidRequestReset(): Event<void> {
	// 	return this._onDidRequestReset.event;
	// }
	//
	// private _onDidChangeSessionStatus = new Emitter<SessionStatusChangedEvent>();
	// get onDidChangeSessionStatus(): Event<SessionStatusChangedEvent> {
	// 	return this._onDidChangeSessionStatus.event;
	// }

	get proxyAgent(): HttpsAgent | HttpsProxyAgent | undefined {
		return this._httpsAgent;
	}

	private readonly _httpsAgent: HttpsAgent | HttpsProxyAgent | undefined;
	// in-memory store of what UI the user is current looking at
	private uiState: string | undefined;
	private _documentEventHandler: DocumentEventHandler | undefined;

	private _activeServerAlerts: string[] = [];
	private _broadcasterRecoveryTimer: NodeJS.Timer | undefined;
	private _echoTimer: NodeJS.Timer | undefined;
	private _echoDidTimeout: boolean = false;
	private _options: any = {};

	// HACK in certain scenarios the agent may want to use more performance-intensive
	// operations when handling document change and saves. This is true for when
	// a user is looking at the review screen, where we need to be able to live-update
	// the view based on documents changing & saving, as well as git operations removing
	// and/or squashing commits.
	get useEnhancedDocumentChangeHandler(): boolean {
		return this.uiState === "new-review" || this.uiState === "people";
	}

	setServerUrl(options: SetServerUrlRequest) {
		this._options.serverUrl = options.serverUrl;
		this._options.disableStrictSSL = options.disableStrictSSL;
		this._api?.setServerUrl(this._options.serverUrl);
		if (options.environment) {
			this._environmentInfo.environment = options.environment;
		}
	}

	// resolve user changes and notify the webview of the change
	// this is strongly recommended over JUST resolving user changes, since the resolution may
	// actually result in a user object being fetched, and can lead to race conditions if the
	// fetched user object isn't propagated to the webview
	async resolveUserAndNotify(user: CSUser): Promise<CSUser> {
		return user;
	}

	private _api: ApiProvider | undefined;
	get api() {
		return this._api!;
	}

	private _codestreamUserId: string | undefined;
	get codestreamUserId() {
		return this._codestreamUserId!;
	}

	private _email: string | undefined;
	get email() {
		return this._email!;
	}

	private _codestreamAccessToken: string | undefined;
	get codestreamAccessToken() {
		return this._codestreamAccessToken;
	}

	private _environmentInfo: CodeStreamEnvironmentInfo = {
		environment: CodeStreamEnvironment.Unknown,
		isOnPrem: false,
		isProductionCloud: false
	};

	get environmentInfo() {
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
		hasCreatedPost: false
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
			machine: { machineId: this._options.machineId }
		};
	}

	get workspace() {
		return {};
	}

	public async getWorkspaceFolders() {
		return [];
	}

	async verifyConnectivity(): Promise<VerifyConnectivityResponse> {
		return {
			ok: true
		};
	}

	async passwordLogin(request: PasswordLoginRequest) {
		const cc = Logger.getCorrelationContext();
		Logger.log(
			cc,
			`Logging ${request.email} into CodeStream (@ ${this._options.serverUrl}) via password`
		);

		return this.login({
			type: "credentials",
			...request
		});
	}

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
			...request
		});
	}

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

	async otcLogin(request: OtcLoginRequest) {
		const cc = Logger.getCorrelationContext();
		Logger.log(cc, `Logging into CodeStream (@ ${this._options.serverUrl}) via otc code...`);

		try {
			return this.login({
				type: "otc",
				...request
			});
		} catch (e) {
			debugger;
			throw new Error();
		}
	}

	async codeLogin(request: ConfirmLoginCodeRequest) {
		const cc = Logger.getCorrelationContext();
		Logger.log(cc, `Logging into Codestream (@ ${this._options.serverUrl}) via login code...`);

		return this.login({
			type: "loginCode",
			...request
		});
	}

	async generateLoginCode(request: GenerateLoginCodeRequest) {
		if (this.status === SessionStatus.SignedIn) {
			Container.instance().errorReporter.reportMessage({
				type: ReportingMessageType.Warning,
				source: "agent",
				message: "There was a redundant attempt to login while already logged in.",
				extra: {
					loginType: "loginCode"
				}
			});
			return { status: LoginResult.AlreadySignedIn };
		}

		try {
			await this.api.generateLoginCode(request);
		} catch (ex) {
			if (ex instanceof ServerError) {
				if (ex.statusCode !== undefined && ex.statusCode >= 400 && ex.statusCode < 500) {
					let error = loginApiErrorMappings[ex.info.code] || LoginResult.Unknown;
					return {
						status: error,
						extra: ex.info
					};
				}
			}

			Container.instance().errorReporter.reportMessage({
				type: ReportingMessageType.Error,
				message: "Unexpected error generating login code",
				source: "agent",
				extra: {
					...ex
				}
			});
			throw AgentError.wrap(ex, `Login failed:\n${ex.message}`);
		}

		return {
			status: LoginResult.Success
		};
	}

	async login(options: LoginOptions): Promise<LoginResponse> {
		return {
			loginResponse: {} as CSLoginResponse,
			state: {} as AgentState
		};
	}

	async register(request: RegisterUserRequest) {}

	async registerNr(request: RegisterNrUserRequest) {}

	async confirmRegistration(request: ConfirmRegistrationRequest) {}

	async getInviteInfo(request: GetInviteInfoRequest) {}

	logout(reason: LogoutReason) {}

	async ready() {}

	async reset() {}

	// showErrorMessage<T extends MessageActionItem>(message: string, ...actions: T[]) {}
	//
	// showInformationMessage<T extends MessageActionItem>(message: string, ...actions: T[]) {}
	//
	// showWarningMessage<T extends MessageActionItem>(message: string, ...actions: T[]) {}

	async addSuperProps(props: { [key: string]: any }) {
		const { telemetry } = Container.instance();
		await telemetry.ready();
		telemetry.identify(this._codestreamUserId!, props);
		telemetry.addSuperProps(props);
	}

	async addNewRelicSuperProps(userId: number, orgId: number) {
		return this.addSuperProps({
			"NR User ID": userId,
			"NR Organization ID": orgId,
			"NR Connected Org": true
		});
	}

	async updateProviders() {}

	registerApiCapabilities(apiCapabilities: CSApiCapabilities, team?: CSTeam): void {
		const teamSettings = (team && team.settings) || {};
		const teamFeatures = teamSettings.features || {};
		this._apiCapabilities = {};
		for (const key in apiCapabilities) {
			const capability = apiCapabilities[key];
			if (
				(!capability.restricted || teamFeatures[key]) &&
				(!capability.supportedIdes || capability.supportedIdes.includes(this.versionInfo.ide.name))
			) {
				this._apiCapabilities[key] = capability;
			}
		}
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

	echoTimeout() {}

	echoReceived() {}

	async onFileSearch(basePath: string, path: string) {}

	dispose() {
		if (this._documentEventHandler) {
			this._documentEventHandler.dispose();
		}
	}
}
