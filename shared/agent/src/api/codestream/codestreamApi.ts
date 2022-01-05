"use strict";

import AbortController from "abort-controller";
import FormData from "form-data";
import { Agent as HttpAgent } from "http";
import { Agent as HttpsAgent } from "https";
import HttpsProxyAgent from "https-proxy-agent";
import { debounce, isEqual } from "lodash-es";
import fetch, { Headers, RequestInit, Response } from "node-fetch";
import * as qs from "querystring";
import { URLSearchParams } from "url";
import { Emitter, Event } from "vscode-languageserver";
import { ServerError } from "../../agentError";
import { Team, User } from "../../api/extensions";
import { Container, SessionContainer } from "../../container";
import { Logger } from "../../logger";
import { isDirective, resolve, safeDecode, safeEncode } from "../../managers/operations";
import {
	AccessToken,
	AddBlameMapRequest,
	AddBlameMapRequestType,
	AddEnterpriseProviderHostRequest,
	AddEnterpriseProviderHostResponse,
	AddMarkersResponse,
	AddReferenceLocationRequest,
	AgentOpenUrlRequestType,
	ArchiveStreamRequest,
	Capabilities,
	ChangeDataType,
	CloseStreamRequest,
	CreateChannelStreamRequest,
	CreateCodemarkPermalinkRequest,
	CreateCodemarkRequest,
	CreateCompanyRequest,
	CreateCompanyRequestType,
	CreateDirectStreamRequest,
	CreateExternalPostRequest,
	CreateMarkerLocationRequest,
	CreateMarkerRequest,
	CreatePostRequest,
	CreateRepoRequest,
	CreateTeamRequest,
	CreateTeamRequestType,
	CreateTeamTagRequestType,
	DeleteBlameMapRequest,
	DeleteBlameMapRequestType,
	DeleteCodeErrorRequest,
	DeleteCodemarkRequest,
	DeleteMarkerRequest,
	DeleteMarkerResponse,
	DeleteMeUserRequest,
	DeleteMeUserRequestType,
	DeleteMeUserResponse,
	DeletePostRequest,
	DeleteReviewRequest,
	DeleteTeamTagRequestType,
	DeleteUserRequest,
	DeleteUserResponse,
	DidChangeDataNotificationType,
	EditPostRequest,
	FetchCodeErrorsRequest,
	FetchCodeErrorsResponse,
	FetchCodemarksRequest,
	FetchCompaniesRequest,
	FetchCompaniesResponse,
	FetchFileStreamsRequest,
	FetchMarkerLocationsRequest,
	FetchMarkersRequest,
	FetchPostRepliesRequest,
	FetchPostsRequest,
	FetchReviewCheckpointDiffsRequest,
	FetchReviewCheckpointDiffsResponse,
	FetchReviewDiffsRequest,
	FetchReviewDiffsResponse,
	FetchReviewsRequest,
	FetchReviewsResponse,
	FetchStreamsRequest,
	FetchTeamsRequest,
	FetchUnreadStreamsRequest,
	FetchUsersRequest,
	ClaimCodeErrorRequest,
	ClaimCodeErrorResponse,
	FollowCodeErrorRequest,
	FollowCodeErrorResponse,
	FollowCodemarkRequest,
	FollowCodemarkResponse,
	FollowReviewRequest,
	FollowReviewResponse,
	GetCodeErrorRequest,
	GetCodeErrorResponse,
	GetCodemarkRequest,
	GetCompanyRequest,
	GetCompanyResponse,
	GetMarkerRequest,
	GetNewRelicSignupJwtTokenRequest,
	GetNewRelicSignupJwtTokenRequestType,
	GetNewRelicSignupJwtTokenResponse,
	GetPostRequest,
	GetPostsRequest,
	GetPreferencesResponse,
	GetRepoRequest,
	GetReviewRequest,
	GetReviewResponse,
	GetStreamRequest,
	GetTeamRequest,
	GetUnreadsRequest,
	GetUserRequest,
	InviteUserRequest,
	JoinCompanyRequest,
	JoinCompanyRequestType,
	JoinCompanyResponse,
	JoinStreamRequest,
	KickUserRequest,
	KickUserResponse,
	LeaveStreamRequest,
	LoginFailResponse,
	LookupNewRelicOrganizationsRequest,
	LookupNewRelicOrganizationsResponse,
	MarkItemReadRequest,
	MarkPostUnreadRequest,
	MarkStreamReadRequest,
	MatchReposRequest,
	MatchReposRequestType,
	MatchReposResponse,
	MoveMarkerResponse,
	MuteStreamRequest,
	OpenStreamRequest,
	PinReplyToCodemarkRequest,
	ProviderTokenRequest,
	ProviderTokenRequestType,
	ReactToPostRequest,
	RemoveEnterpriseProviderHostRequest,
	RenameStreamRequest,
	ReportingMessageType,
	SendPasswordResetEmailRequest,
	SendPasswordResetEmailRequestType,
	SetCodemarkPinnedRequest,
	SetCodemarkStatusRequest,
	SetModifiedReposRequest,
	SetPasswordRequest,
	SetPasswordRequestType,
	SetStreamPurposeRequest,
	ThirdPartyProviderSetTokenRequest,
	ThirdPartyProviderSetTokenRequestData,
	UnarchiveStreamRequest,
	Unreads,
	UpdateCodeErrorRequest,
	UpdateCodemarkRequest,
	UpdateCompanyRequest,
	UpdateCompanyRequestType,
	UpdateCompanyResponse,
	UpdateInvisibleRequest,
	UpdateMarkerRequest,
	UpdatePostSharingDataRequest,
	UpdatePreferencesRequest,
	UpdatePresenceRequest,
	UpdateReviewRequest,
	UpdateStatusRequest,
	UpdateStreamMembershipRequest,
	UpdateTeamAdminRequest,
	UpdateTeamAdminRequestType,
	UpdateTeamRequest,
	UpdateTeamRequestType,
	UpdateTeamSettingsRequest,
	UpdateTeamSettingsRequestType,
	UpdateTeamTagRequestType,
	UpdateUserRequest,
	UploadFileRequest,
	UploadFileRequestType,
	VerifyConnectivityResponse,
	DeleteCompanyRequest,
	DeleteCompanyResponse,
	DeleteCompanyRequestType
} from "../../protocol/agent.protocol";
import {
	CSAddMarkersRequest,
	CSAddMarkersResponse,
	CSAddProviderHostRequest,
	CSAddProviderHostResponse,
	CSAddReferenceLocationRequest,
	CSAddReferenceLocationResponse,
	CSApiCapabilities,
	CSApiFeatures,
	CSChannelStream,
	CSCodeError,
	CSCompany,
	CSCompleteSignupRequest,
	CSConfirmRegistrationRequest,
	CSCreateChannelStreamRequest,
	CSCreateChannelStreamResponse,
	CSCreateCodemarkPermalinkRequest,
	CSCreateCodemarkPermalinkResponse,
	CSCreateCodemarkRequest,
	CSCreateCodemarkResponse,
	CSCreateDirectStreamRequest,
	CSCreateDirectStreamResponse,
	CSCreateMarkerLocationRequest,
	CSCreateMarkerLocationResponse,
	CSCreateMarkerRequest,
	CSCreateMarkerResponse,
	CSCreatePostRequest,
	CSCreatePostResponse,
	CSCreateRepoRequest,
	CSCreateRepoResponse,
	CSDeleteCodemarkResponse,
	CSDeletePostResponse,
	CSDirectStream,
	CSEditPostRequest,
	CSEditPostResponse,
	CSFileStream,
	CSGetApiCapabilitiesResponse,
	CSGetCodeErrorResponse,
	CSGetCodeErrorsRequest,
	CSGetCodeErrorsResponse,
	CSGetCodemarkResponse,
	CSGetCodemarksResponse,
	CSGetCompaniesResponse,
	CSGetCompanyResponse,
	CSGetInviteInfoRequest,
	CSGetInviteInfoResponse,
	CSGetMarkerLocationsResponse,
	CSGetMarkerResponse,
	CSGetMarkersResponse,
	CSGetMeResponse,
	CSGetPostResponse,
	CSGetPostsResponse,
	CSGetRepoResponse,
	CSGetReposResponse,
	CSGetReviewCheckpointDiffsResponse,
	CSGetReviewDiffsResponse,
	CSGetReviewResponse,
	CSGetReviewsRequest,
	CSGetReviewsResponse,
	CSGetStreamResponse,
	CSGetStreamsResponse,
	CSGetTeamResponse,
	CSGetTeamsResponse,
	CSGetTelemetryKeyResponse,
	CSGetUserResponse,
	CSGetUsersResponse,
	CSInviteUserRequest,
	CSInviteUserResponse,
	CSJoinStreamRequest,
	CSJoinStreamResponse,
	CSLoginRequest,
	CSLoginResponse,
	CSMarkItemReadRequest,
	CSMarkItemReadResponse,
	CSMarkPostUnreadRequest,
	CSMarkPostUnreadResponse,
	CSMe,
	CSMePreferences,
	CSMeStatus,
	CSMsTeamsConversationRequest,
	CSMsTeamsConversationResponse,
	CSObjectStream,
	CSPinReplyToCodemarkRequest,
	CSPinReplyToCodemarkResponse,
	CSPost,
	CSReactions,
	CSReactToPostResponse,
	CSRefreshableProviderInfos,
	CSRegisterRequest,
	CSRegisterResponse,
	CSRemoveProviderHostResponse,
	CSSetCodemarkPinnedRequest,
	CSSetCodemarkPinnedResponse,
	CSSetPasswordRequest,
	CSSetPasswordResponse,
	CSStream,
	CSTeam,
	CSTeamTagRequest,
	CSTrackProviderPostRequest,
	CSUpdateCodeErrorRequest,
	CSUpdateCodeErrorResponse,
	CSUpdateCodemarkRequest,
	CSUpdateCodemarkResponse,
	CSUpdateMarkerRequest,
	CSUpdateMarkerResponse,
	CSUpdatePostSharingDataRequest,
	CSUpdatePostSharingDataResponse,
	CSUpdatePresenceRequest,
	CSUpdatePresenceResponse,
	CSUpdateReviewRequest,
	CSUpdateReviewResponse,
	CSUpdateStreamRequest,
	CSUpdateStreamResponse,
	CSUpdateUserRequest,
	CSUpdateUserResponse,
	CSUser,
	LoginResult,
	ProviderType,
	StreamType,
	TriggerMsTeamsProactiveMessageRequest,
	TriggerMsTeamsProactiveMessageResponse
} from "../../protocol/api.protocol";
import { NewRelicProvider } from "../../providers/newrelic";
import { VersionInfo } from "../../session";
import { Functions, getProvider, log, lsp, lspHandler, Objects, Strings } from "../../system";
import {
	ApiProvider,
	ApiProviderLoginResponse,
	CodeStreamApiMiddleware,
	CodeStreamApiMiddlewareContext,
	LoginOptions,
	MessageType,
	RawRTMessage,
	RTMessage
} from "../apiProvider";
import { CodeStreamPreferences } from "../preferences";
import { BroadcasterEvents } from "./events";
import { HistoryFetchInfo } from "../../broadcaster/broadcaster";
import { CodeStreamUnreads } from "./unreads";

@lsp
export class CodeStreamApiProvider implements ApiProvider {
	providerType = ProviderType.CodeStream;
	private _onDidReceiveMessage = new Emitter<RTMessage>();
	get onDidReceiveMessage(): Event<RTMessage> {
		return this._onDidReceiveMessage.event;
	}

	private _onDidSubscribe = new Emitter<void>();
	get onDidSubscribe(): Event<void> {
		return this._onDidSubscribe.event;
	}

	private _events: BroadcasterEvents | undefined;
	private readonly _middleware: CodeStreamApiMiddleware[] = [];
	private _pubnubSubscribeKey: string | undefined;
	private _broadcasterToken: string | undefined;
	private _socketCluster: { host: string; port: string; ignoreHttps?: boolean } | undefined;
	private _subscribedMessageTypes: Set<MessageType> | undefined;
	private _teamId: string | undefined;
	private _team: CSTeam | undefined;
	private _token: string | undefined;
	private _unreads: CodeStreamUnreads | undefined;
	private _user: CSMe | undefined;
	private _userId: string | undefined;
	private _preferences: CodeStreamPreferences | undefined;
	private _features: CSApiFeatures | undefined;
	private _debouncedSetModifiedReposUpdate: (request: SetModifiedReposRequest) => {};
	private _messageProcessingPromise: Promise<void> | undefined;

	readonly capabilities: Capabilities = {
		channelMute: true,
		postDelete: true,
		postEdit: true,
		providerCanSupportRealtimeChat: true,
		providerSupportsRealtimeChat: true,
		providerSupportsRealtimeEvents: true
	};

	constructor(
		public baseUrl: string,
		private readonly _version: VersionInfo,
		private readonly _httpsAgent: HttpsAgent | HttpsProxyAgent | HttpAgent | undefined,
		private readonly _strictSSL: boolean
	) {
		this._debouncedSetModifiedReposUpdate = debounce(
			request => {
				return this.setModifiedReposDebounced(request);
			},
			15000,
			{ leading: true }
		);
	}

	get teamId(): string {
		return this._teamId!;
	}

	get team(): CSTeam | undefined {
		return this._team!;
	}

	get userId(): string {
		return this._userId!;
	}

	get features() {
		return this._features;
	}

	get meUser() {
		return this._user;
	}

	setServerUrl(serverUrl: string) {
		this.baseUrl = serverUrl;
	}

	useMiddleware(middleware: CodeStreamApiMiddleware) {
		this._middleware.push(middleware);
		return {
			dispose: () => {
				const i = this._middleware.indexOf(middleware);
				this._middleware.splice(i, 1);
			}
		};
	}

	async dispose() {
		if (this._events) {
			await this._events.dispose();
		}
	}

	async login(options: LoginOptions): Promise<ApiProviderLoginResponse> {
		let response;
		switch (options.type) {
			case "credentials":
				response = await this.put<CSLoginRequest, CSLoginResponse>("/no-auth/login", {
					email: options.email,
					password: options.password
				});
				// Set the provider to be codestream since that is all that is supported for email/password login
				response.provider = "codestream";

				break;

			case "otc":
				const nrAccountId =
					options.errorGroupGuid !== undefined
						? NewRelicProvider.parseId(options.errorGroupGuid)?.accountId
						: undefined;
				response = await this.put<CSCompleteSignupRequest, CSLoginResponse>(
					"/no-auth/check-signup",
					{
						token: options.code,
						nrAccountId
					}
				);

				break;

			case "token":
				if (options.token.url !== this.baseUrl) throw new Error("Invalid token");

				response = await this.put<{}, CSLoginResponse>("/login", {}, options.token.value);

				response.provider = options.token.provider;
				response.providerAccess = options.token.providerAccess;
				response.teamId = options.token.teamId;

				break;
			default:
				throw new Error("Invalid login options");
		}

		const provider = response.provider;

		Logger.log(
			`CodeStream user '${response.user.username}' (${
				response.user.id
			}) is logging into ${provider || "unknown"}${
				response.providerAccess ? `:${response.providerAccess}` : ""
			} and belongs to ${response.teams.length} team(s)\n${response.teams
				.map(t => `\t${t.name} (${t.id})`)
				.join("\n")}`
		);

		/*
			💩: the session needs the accessToken token in order to rectify the user's account state
		*/
		if (response.user.mustSetPassword) {
			// save the accessToken for the call to set password
			this._token = response.accessToken;
			throw {
				error: LoginResult.MustSetPassword,
				extra: { email: response.user.email }
			} as LoginFailResponse;
		}

		// 💩see above
		if (response.companies.length === 0) {
			// save the accessToken for the call to create a team
			this._token = response.accessToken;
			throw {
				error: LoginResult.NotInCompany,
				extra: {
					token: response.accessToken,
					email: response.user.email,
					userId: response.user.id,
					eligibleJoinCompanies: response.eligibleJoinCompanies,
					accountIsConnected: response.accountIsConnected,
					isWebmail: response.isWebmail,
					// isRegistered and user object passed for early segment identify call
					isRegistered: response.user.isRegistered,
					user: response.user
				}
			} as LoginFailResponse;
		}

		// 💩see above
		if (response.teams.length === 0) {
			// save the accessToken for the call to create a team
			this._token = response.accessToken;
			throw {
				error: LoginResult.NotOnTeam,
				extra: { token: response.accessToken, email: response.user.email, userId: response.user.id }
			} as LoginFailResponse;
		}

		let pickedTeamReason;
		let team: CSTeam | undefined;
		let teams = response.teams.filter(_ => _.isEveryoneTeam);
		if (!teams.length) {
			// allow non-everyone team
			teams = response.teams;
		}

		/*
		NOTE - slack/msteams login, where the user is assigned to a team by the server, is deprecated
			github login is treated like a normal login, but without providing password

		// If we are a slack/msteams team or have no overrides, then use the response teamId directly
		if (
			provider != null &&
			(provider !== "codestream" ||
				(options.team == null && (options.teamId == null || options.teamId === response.teamId)))
		) {
			const teamId = response.teamId;
			team = teams.find(t => t.id === teamId);

			if (team != null) {
				pickedTeamReason = " because the team was associated with the authentication token";
			} else {
				// If we can't find the team, make sure to filter to only teams that match the current provider
				teams = response.teams.filter(t => Team.isProvider(t, provider));
			}
		}
		*/

		if (team == null) {
			// If there is only 1 team, use it regardless of config
			if (teams.length === 1) {
				options.teamId = teams[0].id;
			} else {
				// Sort the teams from oldest to newest
				teams.sort((a, b) => a.createdAt - b.createdAt);
			}

			if (options.teamId == null) {
				if (options.team) {
					const normalizedTeamName = options.team.toLocaleUpperCase();
					const team = teams.find(t => t.name.toLocaleUpperCase() === normalizedTeamName);
					if (team != null) {
						options.teamId = team.id;
						pickedTeamReason =
							" because the team was saved in settings (user, workspace, or folder)";
					}
				}

				// Check the lastTeamId preference and use that, if available.
				// If we still can't find a team, then just pick the first one
				if (options.teamId == null) {
					if (response.user.preferences?.lastTeamId) {
						options.teamId = response.user.preferences.lastTeamId;
						pickedTeamReason = " because the team was the last saved team";
					}

					// Pick the oldest (first) Slack team if there is one
					if (options.teamId == null && User.isSlack(response.user)) {
						const team = teams.find(t => Team.isSlack(t));
						if (team) {
							options.teamId = team.id;
							pickedTeamReason = " because the team was the oldest Slack team";
						}
					}

					// Pick the oldest (first) MS Teams team if there is one
					if (options.teamId == null && User.isMSTeams(response.user)) {
						const team = teams.find(t => Team.isMSTeams(t));
						if (team) {
							options.teamId = team.id;
							pickedTeamReason = " because the team was the oldest Microsoft Teams team";
						}
					}

					if (options.teamId == null) {
						options.teamId = teams[0].id;
						pickedTeamReason = " because the team was the oldest team";
					}
				}
			} else {
				pickedTeamReason = " because the team was the last used team";
			}

			team = teams.find(t => t.id === options.teamId);
			if (team === undefined) {
				team = teams[0];
				pickedTeamReason =
					" because the specified team could not be found, defaulting to the oldest team";
			}
		}

		Logger.log(`Using team '${team.name}' (${team.id})${pickedTeamReason || ""}`);

		this._token = response.accessToken;
		this._pubnubSubscribeKey = response.pubnubKey;
		this._broadcasterToken = response.broadcasterToken || response.pubnubToken;
		this._socketCluster = response.socketCluster;

		this._teamId = team.id;
		this._team = team;
		this._user = response.user;
		this._userId = response.user.id;
		this._features = response.features;

		const token: AccessToken = {
			email: response.user.email,
			url: this.baseUrl,
			value: response.accessToken,
			provider: response.provider,
			providerAccess: response.providerAccess,
			teamId: team.id
		};

		return { ...response, token: token };
	}

	async register(request: CSRegisterRequest) {
		if (this._version.machine?.machineId) {
			request.machineId = this._version.machine.machineId;
		}
		const response = await this.post<CSRegisterRequest, CSRegisterResponse | CSLoginResponse>(
			"/no-auth/register",
			request
		);
		if ((response as CSLoginResponse).accessToken) {
			this._token = (response as CSLoginResponse).accessToken;
		}
		return response;
	}

	async confirmRegistration(request: CSConfirmRegistrationRequest): Promise<CSLoginResponse> {
		if (request.errorGroupGuid !== undefined && request.nrAccountId === undefined) {
			request.nrAccountId = NewRelicProvider.parseId(request.errorGroupGuid)?.accountId;
		}
		const response = await this.post<CSConfirmRegistrationRequest, CSLoginResponse>(
			"/no-auth/confirm",
			request
		);
		this._token = response.accessToken;
		return response;
	}

	getInviteInfo(request: CSGetInviteInfoRequest) {
		return this.get<CSGetInviteInfoResponse>(`/no-auth/invite-info?code=${request.code}`);
	}

	@log()
	async subscribe(types?: MessageType[]) {
		this._subscribedMessageTypes = types !== undefined ? new Set(types) : undefined;

		if (types === undefined || types.includes(MessageType.Unreads)) {
			this._unreads = new CodeStreamUnreads(this);
			this._unreads.onDidChange(this.onUnreadsChanged, this);
			this._unreads.compute(this._user!.lastReads, this._user!.lastReadItems);
		}
		if (types === undefined || types.includes(MessageType.Preferences)) {
			this._preferences = new CodeStreamPreferences(this._user!.preferences);
			this._preferences.onDidChange(preferences => {
				this._onDidReceiveMessage.fire({ type: MessageType.Preferences, data: preferences });
			});
		}

		// we only need httpsAgent for PubNub, in which case it should always be https
		const httpsAgent =
			this._httpsAgent instanceof HttpsAgent || this._httpsAgent instanceof HttpsProxyAgent
				? this._httpsAgent
				: undefined;
		const session = SessionContainer.instance().session;
		this._events = new BroadcasterEvents({
			accessToken: this._token!,
			pubnubSubscribeKey: this._pubnubSubscribeKey,
			broadcasterToken: this._broadcasterToken!,
			api: this,
			httpsAgent,
			strictSSL: this._strictSSL,
			socketCluster: this._socketCluster,
			supportsEcho: session.isOnPrem && (!!session.apiCapabilities.echoes || false)
		});
		this._events.onDidReceiveMessage(this.onPubnubMessageReceivedWithBlocking, this);

		/* No longer need to subscribe to streams
		if (types === undefined || types.includes(MessageType.Streams)) {
			const streams = (await SessionContainer.instance().streams.getSubscribable(this.teamId))
				.streams;
			await this._events.connect(streams.map(s => s.id));
		} else {
			await this._events.connect();
		}
		*/
		await this._events.connect();

		this._onDidSubscribe.fire();
	}

	private async onPubnubMessageReceivedWithBlocking(e: RawRTMessage) {
		// allow for certain message types that need to be processed with higher priority than others
		if (this._messageProcessingPromise) {
			// wait for higher priority messages
			await this._messageProcessingPromise;
		}
		if (e.blockUntilProcessed) {
			// make other message processing wait
			this._messageProcessingPromise = new Promise<void>(async (resolve, reject) => {
				try {
					await this.onPubnubMessageReceived(e);
				} catch (error) {
					reject(error);
					delete this._messageProcessingPromise;
					return;
				}
				resolve();
				delete this._messageProcessingPromise;
			});
		} else {
			this.onPubnubMessageReceived(e);
		}
	}

	private async onPubnubMessageReceived(e: RawRTMessage) {
		if (this._subscribedMessageTypes !== undefined && !this._subscribedMessageTypes.has(e.type)) {
			return;
		}

		// Resolve any directives in the message data
		switch (e.type) {
			case MessageType.Codemarks:
				e.data = await SessionContainer.instance().codemarks.resolve(e, { onlyIfNeeded: false });
				if (e.data == null || e.data.length === 0) return;

				break;
			case MessageType.Companies: {
				const { companies } = SessionContainer.instance();
				e.data = await companies.resolve(e);
				if (e.data == null || e.data.length === 0) return;
				break;
			}
			case MessageType.MarkerLocations:
				e.data = await SessionContainer.instance().markerLocations.resolve(e, {
					onlyIfNeeded: false
				});
				if (e.data == null || e.data.length === 0) return;

				break;
			case MessageType.Markers:
				e.data = await SessionContainer.instance().markers.resolve(e, { onlyIfNeeded: false });
				if (e.data == null || e.data.length === 0) return;

				break;
			case MessageType.Posts:
				const ids = (e.data as CSPost[]).map(o => o.id);
				const oldPosts = await Promise.all(
					ids.map(async id => {
						const post = await SessionContainer.instance().posts.getByIdFromCache(id);
						return post ? ({ ...post } as CSPost) : undefined;
					})
				);
				e.data = await SessionContainer.instance().posts.resolve(e, { onlyIfNeeded: false });
				if (e.data == null || e.data.length === 0) return;

				if (this._unreads !== undefined) {
					this._unreads.update(e.data as CSPost[], oldPosts);
				}

				await this.fetchAndStoreUnknownAuthors(e.data as CSPost[]);

				break;
			case MessageType.Repositories:
				e.data = await SessionContainer.instance().repos.resolve(e, { onlyIfNeeded: false });
				if (e.data == null || e.data.length === 0) return;

				break;
			case MessageType.Reviews: {
				e.data = await SessionContainer.instance().reviews.resolve(e, { onlyIfNeeded: false });
				if (e.data == null || e.data.length === 0) return;
				break;
			}
			case MessageType.CodeErrors: {
				e.data = await SessionContainer.instance().codeErrors.resolve(e, { onlyIfNeeded: false });
				if (e.data == null || e.data.length === 0) return;

				/*
				if (this._events !== undefined) {
					for (const codeError of e.data as CSCodeError[]) {
						this._events.subscribeToObject(codeError.id);
					}
				}
				*/

				break;
			}
			case MessageType.Streams:
				e.data = await SessionContainer.instance().streams.resolve(e, { onlyIfNeeded: false });
				if (e.data == null || e.data.length === 0) return;

				/*
				if (this._events !== undefined) {
					for (const stream of e.data as (CSChannelStream | CSDirectStream | CSObjectStream)[]) {
						if (
							CodeStreamApiProvider.isStreamSubscriptionRequired(stream, this.userId, this.teamId)
						) {
							this._events.subscribeToStream(stream.id);
						} else if (CodeStreamApiProvider.isStreamUnsubscribeRequired(stream, this.userId)) {
							this._events.unsubscribeFromStream(stream.id);
						}
					}
				}
				*/
				break;
			case MessageType.Teams:
				const { session, teams } = SessionContainer.instance();

				let currentTeam = await teams.getByIdFromCache(this.teamId);

				let providerHostsBefore;
				if (currentTeam && currentTeam.providerHosts) {
					providerHostsBefore = JSON.parse(JSON.stringify(currentTeam.providerHosts));
				}

				e.data = await teams.resolve(e, { onlyIfNeeded: false });
				if (e.data == null || e.data.length === 0) return;

				// Ensure we get the updated copy
				currentTeam = await teams.getByIdFromCache(this.teamId);

				if (currentTeam && currentTeam.providerHosts) {
					if (!isEqual(providerHostsBefore, currentTeam.providerHosts)) {
						session.updateProviders();
					}
				} else if (providerHostsBefore) {
					void session.updateProviders();
				}
				break;
			case MessageType.Users:
				const users: CSUser[] = e.data;
				const meIndex = users.findIndex(u => u.id === this.userId);

				// If we aren't updating the current user, just continue
				if (meIndex === -1) {
					e.data = await SessionContainer.instance().users.resolve(e, { onlyIfNeeded: false });
					if (e.data != null && e.data.length !== 0) {
						// we might be getting info from other users that we need to trigger
						this._onDidReceiveMessage.fire(e as RTMessage);
					}
					return;
				}

				const me = users[meIndex] as CSMe;
				if (users.length > 1) {
					// Remove the current user, as we will handle that seperately
					users.splice(meIndex, 1);

					e.data = await SessionContainer.instance().users.resolve(e, { onlyIfNeeded: false });
					if (e.data != null && e.data.length !== 0) {
						this._onDidReceiveMessage.fire(e as RTMessage);
					}

					e.data = [me];
				}

				const lastReads = {
					...(this._unreads ? (await this._unreads.get()).lastReads : this._user!.lastReads)
				};
				const lastReadItems = {
					...(this._unreads ? (await this._unreads.get()).lastReadItems : this._user!.lastReadItems)
				};

				const userPreferencesBefore = JSON.stringify(me.preferences);

				e.data = await SessionContainer.instance().users.resolve(e, {
					onlyIfNeeded: true
				});
				if (e.data == null || e.data.length === 0) return;

				this._user = (await SessionContainer.instance().users.getMe()).user;
				e.data = [this._user];

				try {
					if (
						this._unreads !== undefined &&
						(!Objects.shallowEquals(lastReads, this._user.lastReads || {}) ||
							!Objects.shallowEquals(lastReadItems, this._user.lastReadItems || {}))
					) {
						this._unreads.compute(me.lastReads, this._user.lastReadItems);
					}
					if (!this._preferences) {
						this._preferences = new CodeStreamPreferences(this._user.preferences);
					}
					if (
						this._user.preferences &&
						JSON.stringify(this._user.preferences) !== userPreferencesBefore
					) {
						this._preferences.update(this._user.preferences);
					}
				} catch {
					debugger;
				}

				break;
		}

		this._onDidReceiveMessage.fire(e as RTMessage);
	}

	private onUnreadsChanged(e: Unreads) {
		this._onDidReceiveMessage.fire({ type: MessageType.Unreads, data: e });
	}

	grantBroadcasterChannelAccess(token: string, channel: string): Promise<{}> {
		return this.put(`/grant/${channel}`, {}, token);
	}

	@log()
	getMe() {
		return this.get<CSGetMeResponse>("/users/me", this._token);
	}

	@log()
	async getUnreads(request: GetUnreadsRequest) {
		if (this._unreads === undefined) {
			return {
				unreads: {
					lastReads: {},
					lastReadItems: {},
					mentions: {},
					unreads: {},
					totalMentions: 0,
					totalUnreads: 0
				}
			};
		}

		return { unreads: await this._unreads!.get() };
	}

	@log()
	async trackProviderPost(request: CSTrackProviderPostRequest) {
		try {
			return await this.post(`/provider-posts/${request.provider}`, request, this._token);
		} catch (ex) {
			debugger;
			Logger.error(ex, `Failed updating ${request.provider} post count`);
			return undefined;
		}
	}

	@log()
	async updatePreferences(request: UpdatePreferencesRequest) {
		safeEncode(request.preferences);
		const update = await this.put<CSMePreferences, any>(
			"/preferences",
			request.preferences,
			this._token
		);
		const [user] = (await SessionContainer.instance().users.resolve({
			type: MessageType.Users,
			data: [update.user]
		})) as CSMe[];

		if (this._preferences) {
			this._preferences.update(user.preferences!);
		}
		return { preferences: user.preferences || {} };
	}

	@log()
	async updateStatus(request: UpdateStatusRequest) {
		let currentStatus = {};
		const meResponse = await this.getMe();
		if (meResponse.user.status) {
			currentStatus = {
				...meResponse.user.status
			};
		}
		const update = await this.put<{ status: { [teamId: string]: CSMeStatus } }, any>(
			"/users/me",
			{
				status: {
					...currentStatus,
					...request.status
				}
			},
			this._token
		);
		const [user] = (await SessionContainer.instance().users.resolve({
			type: MessageType.Users,
			data: [update.user]
		})) as CSMe[];
		return { user };
	}

	@log()
	async updateInvisible(request: UpdateInvisibleRequest) {
		const update = await this.put<{ status: { invisible: boolean } }, any>(
			"/users/me",
			{ status: { invisible: request.invisible } },
			this._token
		);
		const [user] = (await SessionContainer.instance().users.resolve({
			type: MessageType.Users,
			data: [update.user]
		})) as CSMe[];
		return { user };
	}

	@log()
	async setModifiedReposDebounced(request: SetModifiedReposRequest) {
		const compactModifiedRepos = SessionContainer.instance().users.compactifyModifiedRepos(
			request.modifiedRepos
		);
		this.put<{ [key: string]: any }, any>(
			"/users/me",
			{ compactModifiedRepos: { [request.teamId]: compactModifiedRepos } },
			this._token
		);
	}

	@log()
	async setModifiedRepos(request: SetModifiedReposRequest) {
		this._debouncedSetModifiedReposUpdate(request);
	}

	@log()
	updatePresence(request: UpdatePresenceRequest) {
		return this.put<CSUpdatePresenceRequest, CSUpdatePresenceResponse>(
			`/presence`,
			request,
			this._token
		);
	}

	// async createFileStream(relativePath: string, repoId: string) {
	// 	return this.createStream<CSCreateFileStreamRequest, CSCreateFileStreamResponse>({
	// 		teamId: this._teamId,
	// 		type: StreamType.File,
	// 		repoId: repoId,
	// 		file: relativePath
	// 	});
	// }

	@log()
	async fetchFileStreams(request: FetchFileStreamsRequest) {
		return this.getStreams<CSGetStreamsResponse<CSFileStream>>(
			`/streams?teamId=${this.teamId}&repoId=${request.repoId}`,
			this._token
		);
	}

	private async getStreams<R extends CSGetStreamsResponse<CSStream>>(
		url: string,
		token?: string
	): Promise<R> {
		let more: boolean | undefined = true;
		let lt: string | undefined;
		const response = { streams: [] as CSStream[] };

		while (more) {
			const pagination = lt ? `&lt=${lt}` : "";
			const page = await this.get<R>(`${url}${pagination}`, token);
			response.streams.push(...page.streams);
			more = page.more;
			lt = page.streams.length ? page.streams[page.streams.length - 1].sortId : undefined;
		}

		return response as R;
	}

	@log()
	createMarkerLocation(request: CreateMarkerLocationRequest) {
		return this.put<CSCreateMarkerLocationRequest, CSCreateMarkerLocationResponse>(
			`/marker-locations`,
			{ ...request, teamId: this.teamId },
			this._token
		);
	}

	@log()
	fetchMarkerLocations(request: FetchMarkerLocationsRequest) {
		return this.get<CSGetMarkerLocationsResponse>(
			`/marker-locations?teamId=${this.teamId}&streamId=${request.streamId}&commitHash=${request.commitHash}`,
			this._token
		);
	}

	@log()
	addReferenceLocation(request: AddReferenceLocationRequest) {
		return this.put<CSAddReferenceLocationRequest, CSAddReferenceLocationResponse>(
			`/markers/${request.markerId}/reference-location`,
			request,
			this._token
		);
	}

	@log()
	fetchMarkers(request: FetchMarkersRequest) {
		// TODO: This doesn't handle all the request params
		return this.get<CSGetMarkersResponse>(
			`/markers?teamId=${this.teamId}&streamId=${request.streamId}${
				request.commitHash ? `&commitHash=${request.commitHash}` : ""
			}`,
			this._token
		);
	}

	@log()
	getMarker(request: GetMarkerRequest) {
		return this.get<CSGetMarkerResponse>(`/markers/${request.markerId}`, this._token);
	}

	@log()
	updateMarker(request: UpdateMarkerRequest) {
		return this.put<CSUpdateMarkerRequest, CSUpdateMarkerResponse>(
			`/markers/${request.markerId}`,
			request,
			this._token
		);
	}

	@log()
	moveMarker(request: {
		oldMarkerId: string;
		newMarker: CreateMarkerRequest;
	}): Promise<MoveMarkerResponse> {
		return this.put<CSCreateMarkerRequest, CSCreateMarkerResponse>(
			`/markers/${request.oldMarkerId}/move`,
			request.newMarker,
			this._token
		);
	}

	@log()
	addMarkers(request: {
		codemarkId: string;
		newMarkers: CreateMarkerRequest[];
	}): Promise<AddMarkersResponse> {
		return this.put<CSAddMarkersRequest, CSAddMarkersResponse>(
			`/codemarks/${request.codemarkId}/add-markers`,
			{ markers: request.newMarkers },
			this._token
		);
	}

	@log()
	deleteMarker(request: DeleteMarkerRequest): Promise<DeleteMarkerResponse> {
		return this.delete<{}>(`/markers/${request.markerId}`, this._token);
	}

	@log()
	createCodemark(request: CreateCodemarkRequest) {
		return this.post<CSCreateCodemarkRequest, CSCreateCodemarkResponse>(
			"/codemarks",
			{ ...request, teamId: this.teamId },
			this._token
		);
	}

	@log()
	deleteCodemark(request: DeleteCodemarkRequest) {
		const { codemarkId } = request;
		return this.delete<CSDeleteCodemarkResponse>(`/codemarks/${codemarkId}`, this._token);
	}

	@log()
	fetchCodemarks(request: FetchCodemarksRequest) {
		return this.get<CSGetCodemarksResponse>(
			`/codemarks?${qs.stringify({
				teamId: this.teamId,
				byLastAcivityAt: request.byLastAcivityAt
			})}${request.before ? `&before=${request.before}` : ""}`,
			this._token
		);
	}

	@log()
	getCodemark(request: GetCodemarkRequest) {
		return this.get<CSGetCodemarkResponse>(
			`/codemarks/${request.codemarkId}?${qs.stringify({
				byLastAcivityAt: request.sortByActivity
			})}`,
			this._token
		);
	}

	@log()
	setCodemarkPinned(request: SetCodemarkPinnedRequest) {
		return this.put<CSSetCodemarkPinnedRequest, CSSetCodemarkPinnedResponse>(
			`${request.value ? "/pin" : "/unpin"}/${request.codemarkId}`,
			request,
			this._token
		);
	}

	@log()
	pinReplyToCodemark(request: PinReplyToCodemarkRequest) {
		return this.put<CSPinReplyToCodemarkRequest, CSPinReplyToCodemarkResponse>(
			request.value ? "/pin-post" : "/unpin-post",
			request,
			this._token
		);
	}

	@log()
	followCodemark(request: FollowCodemarkRequest) {
		const pathType = request.value ? "follow" : "unfollow";
		return this.put<FollowCodemarkRequest, FollowCodemarkResponse>(
			`/codemarks/${pathType}/${request.codemarkId}`,
			request,
			this._token
		);
	}

	@log()
	followReview(request: FollowReviewRequest) {
		const pathType = request.value ? "follow" : "unfollow";
		return this.put<FollowReviewRequest, FollowReviewResponse>(
			`/reviews/${pathType}/${request.id}`,
			request,
			this._token
		);
	}

	@log()
	followCodeError(request: FollowCodeErrorRequest) {
		const pathType = request.value ? "follow" : "unfollow";
		return this.put<FollowCodeErrorRequest, FollowCodeErrorResponse>(
			`/code-errors/${pathType}/${request.id}`,
			request,
			this._token
		);
	}

	@log()
	setCodemarkStatus(request: SetCodemarkStatusRequest) {
		return this.updateCodemark(request);
	}

	@log()
	async updateCodemark(request: UpdateCodemarkRequest) {
		const { codemarkId, ...attributes } = request;
		const response = await this.put<CSUpdateCodemarkRequest, CSUpdateCodemarkResponse>(
			`/codemarks/${codemarkId}`,
			attributes,
			this._token
		);

		const [codemark] = await SessionContainer.instance().codemarks.resolve({
			type: MessageType.Codemarks,
			data: [response.codemark]
		});

		return { codemark };
	}

	@log()
	createCodemarkPermalink(request: CreateCodemarkPermalinkRequest) {
		return this.post<CSCreateCodemarkPermalinkRequest, CSCreateCodemarkPermalinkResponse>(
			`/codemarks/${request.codemarkId}/permalink`,
			{ isPublic: request.isPublic },
			this._token
		);
	}

	@log()
	async createExternalPost(request: CreateExternalPostRequest): Promise<CSCreatePostResponse> {
		throw new Error("Not supported");
	}

	@log()
	createPost(request: CreatePostRequest) {
		// for on-prem, base the server url (and strict flag) into the invite code,
		// so invited users have it set automatically
		const session = SessionContainer.instance().session;
		if (session.isOnPrem) {
			request.inviteInfo = {
				serverUrl: this.baseUrl,
				disableStrictSSL: session.disableStrictSSL ? true : false
			};
		}

		return this.post<CSCreatePostRequest, CSCreatePostResponse>(
			`/posts`,
			{ ...request, teamId: this.teamId },
			this._token
		);
	}

	@log()
	async deletePost(request: DeletePostRequest) {
		const response = await this.delete<CSDeletePostResponse>(
			`/posts/${request.postId}`,
			this._token
		);
		const [post] = await SessionContainer.instance().posts.resolve({
			type: MessageType.Posts,
			data: response.posts
		});
		await SessionContainer.instance().codemarks.resolve({
			type: MessageType.Codemarks,
			data: response.codemarks || []
		});
		await SessionContainer.instance().markers.resolve({
			type: MessageType.Markers,
			data: response.markers || []
		});

		return { ...response, post };
	}

	@log()
	async editPost(request: EditPostRequest) {
		const response = await this.put<CSEditPostRequest, CSEditPostResponse>(
			`/posts/${request.postId}`,
			request,
			this._token
		);
		const [post] = await SessionContainer.instance().posts.resolve({
			type: MessageType.Streams,
			data: [response.post]
		});
		return { ...response, post };
	}

	@log()
	async updatePostSharingData(request: UpdatePostSharingDataRequest) {
		const response = await this.put<
			CSUpdatePostSharingDataRequest,
			CSUpdatePostSharingDataResponse
		>(`/posts/${request.postId}`, request, this._token);
		const [post] = await SessionContainer.instance().posts.resolve({
			type: MessageType.Streams,
			data: [response.post]
		});
		return { ...response, post };
	}

	@log()
	async fetchPostReplies(request: FetchPostRepliesRequest) {
		const post = await SessionContainer.instance().posts.getById(request.postId);
		const response = await this.get<CSGetPostsResponse>(
			`/posts?teamId=${this.teamId}&streamId=${request.streamId}&parentPostId=${request.postId}`,
			this._token
		);

		// when fetching replies to code errors, we may end up with authors that aren't part of the
		// current team, we'll need to fetch and store those authors
		await this.fetchAndStoreUnknownAuthors(response.posts);

		return response;
	}

	@log()
	async fetchPosts(request: FetchPostsRequest | Partial<FetchPostsRequest>) {
		let limit = request.limit;
		if (!limit || limit > 100) {
			limit = 100;
		}

		const params: { [k: string]: any } = {
			teamId: this.teamId,
			limit
		};

		if (request.streamId) {
			params.streamId = request.streamId;
		}
		if (request.before) {
			params.before = request.before;
		}
		if (request.after) {
			params.after = request.after;
		}
		if (request.inclusive === true) {
			params.inclusive = request.inclusive;
		}

		const response = await this.get<CSGetPostsResponse>(
			`/posts?${qs.stringify(params)}`,
			this._token
		);

		if (response.posts && request.streamId) {
			response.posts.sort((a: CSPost, b: CSPost) => (a.seqNum as number) - (b.seqNum as number));
		}

		/*
		(response.codeErrors || []).forEach(codeError => {
			this._events?.subscribeToObject(codeError.id);
		});
		*/

		await this.fetchAndStoreUnknownAuthors(response.posts);

		return response;
	}

	@log()
	async fetchAndStoreUnknownAuthors(posts: CSPost[]) {
		const unknownAuthorIds: string[] = [];
		for (const post of posts) {
			if (
				!unknownAuthorIds.includes(post.creatorId) &&
				!(await SessionContainer.instance().users.getByIdFromCache(post.creatorId))
			) {
				unknownAuthorIds.push(post.creatorId);
			}
		}

		if (unknownAuthorIds.length > 0) {
			const request: FetchUsersRequest = {
				userIds: unknownAuthorIds
			};
			const usersResponse = await this.fetchUsers(request);
			await SessionContainer.instance().users.resolve({
				type: MessageType.Users,
				data: usersResponse.users
			});
			Container.instance().agent.sendNotification(DidChangeDataNotificationType, {
				type: ChangeDataType.Users,
				data: usersResponse.users
			});
		}
	}

	@log()
	getPost(request: GetPostRequest) {
		return this.get<CSGetPostResponse>(
			`/posts/${request.postId}?teamId=${this.teamId}`,
			this._token
		);
	}

	@log()
	getPosts(request: GetPostsRequest) {
		return this.get<CSGetPostsResponse>(
			`/posts?${qs.stringify({
				teamId: this.teamId,
				streamId: request.streamId,
				ids: request.postIds && request.postIds.join(",")
			})}`,
			this._token
		);
	}

	@log()
	markPostUnread(request: MarkPostUnreadRequest) {
		return this.put<CSMarkPostUnreadRequest, CSMarkPostUnreadResponse>(
			`/unread/${request.postId}`,
			request,
			this._token
		);
	}

	@log()
	markItemRead(request: MarkItemReadRequest) {
		return this.put<CSMarkItemReadRequest, CSMarkItemReadResponse>(
			`/read-item/${request.itemId}`,
			{ numReplies: request.numReplies },
			this._token
		);
	}

	@log()
	async reactToPost(request: ReactToPostRequest) {
		const response = await this.put<CSReactions, CSReactToPostResponse>(
			`/react/${request.postId}`,
			request.emojis,
			this._token
		);

		const [post] = await SessionContainer.instance().posts.resolve({
			type: MessageType.Posts,
			data: [response.post]
		});
		return { ...response, post: post };
	}

	@log()
	createRepo(request: CreateRepoRequest) {
		return this.post<CSCreateRepoRequest, CSCreateRepoResponse>(
			`/repos`,
			{ ...request, teamId: this.teamId },
			this._token
		);
	}

	@log()
	fetchRepos() {
		return this.get<CSGetReposResponse>(`/repos?teamId=${this.teamId}`, this._token);
	}

	fetchMsTeamsConversations(
		request: CSMsTeamsConversationRequest
	): Promise<CSMsTeamsConversationResponse> {
		return this.get<any>(
			`/msteams_conversations?teamId=${this.teamId}&tenantId=${request.tenantId}`,
			this._token
		);
	}

	triggerMsTeamsProactiveMessage(
		request: TriggerMsTeamsProactiveMessageRequest
	): Promise<TriggerMsTeamsProactiveMessageResponse> {
		return this.post<any, any>(
			"/msteams_conversations",
			{ ...request, teamId: this.teamId },
			this._token
		);
	}

	@log()
	getRepo(request: GetRepoRequest) {
		return this.get<CSGetRepoResponse>(`/repos/${request.repoId}`, this._token);
	}

	@log()
	async matchRepos(request: MatchReposRequest) {
		const response = await this.put<MatchReposRequest, MatchReposResponse>(
			`/repos/match/${this.teamId}`,
			request,
			this._token
		);
		await SessionContainer.instance().repos.resolve({
			type: MessageType.Repositories,
			data: [response.repos]
		});
		return response;
	}

	@lspHandler(MatchReposRequestType)
	@log()
	async matchRepo(request: MatchReposRequest) {
		return this.get<MatchReposResponse>(
			`/repos/match/${this.teamId}?repos=${encodeURIComponent(JSON.stringify(request))}`,
			this._token
		);
	}

	@log()
	fetchReviews(request: FetchReviewsRequest): Promise<FetchReviewsResponse> {
		const params: CSGetReviewsRequest = {
			teamId: this.teamId
		};
		if (request.reviewIds?.length ?? 0 > 0) {
			params.ids = request.reviewIds;
		}
		if (request.streamId != null) {
			params.streamId = request.streamId;
		}

		return this.get<CSGetReviewsResponse>(`/reviews?${qs.stringify(params)}`, this._token);
	}

	@log()
	async fetchCodeErrors(request: FetchCodeErrorsRequest): Promise<FetchCodeErrorsResponse> {
		const params: CSGetCodeErrorsRequest = {
			teamId: this.teamId
		};
		if (request.codeErrorIds?.length ?? 0 > 0) {
			params.ids = request.codeErrorIds;
		}
		/* The need to pass streamId or streamIds is deprecated
		if (request.streamIds != null) {
			params.streamIds = request.streamIds;
		}
		*/
		const response = await this.get<CSGetCodeErrorsResponse>(
			`/code-errors?${qs.stringify(params)}`,
			this._token
		);

		/*
		(response.codeErrors || []).forEach(codeError => {
			this._events?.subscribeToObject(codeError.id);
		});
		*/

		return response;
	}

	@log()
	async claimCodeError(request: ClaimCodeErrorRequest): Promise<ClaimCodeErrorResponse> {
		const response = await this.post<ClaimCodeErrorRequest, ClaimCodeErrorResponse>(
			`/code-errors/claim/${this.teamId}`,
			{
				objectId: request.objectId,
				objectType: request.objectType
			},
			this._token
		);
		Logger.log(`Response to claim code error, objectId=${request.objectId}:`, response);
		return response;
	}

	@log()
	getReview(request: GetReviewRequest): Promise<GetReviewResponse> {
		return this.get<CSGetReviewResponse>(`/reviews/${request.reviewId}`, this._token);
	}

	@log()
	getCodeError(request: GetCodeErrorRequest): Promise<GetCodeErrorResponse> {
		return this.get<CSGetCodeErrorResponse>(`/code-errors/${request.codeErrorId}`, this._token);
	}

	@log()
	updateReview(request: UpdateReviewRequest) {
		const { id, ...params } = request;

		const capabilities = SessionContainer.instance().session.apiCapabilities;

		// check to see if we're setting the status of the review,
		// and if so, use the specialized API calls
		if (capabilities && capabilities.multipleReviewersApprove && params.status) {
			const routeMap: { [key: string]: string } = {
				approved: "/approve",
				rejected: "/reject",
				open: "/reopen"
			} as any;
			const route = routeMap[params.status];
			if (route) {
				return this.put<CSUpdateReviewRequest, CSUpdateReviewResponse>(
					`/reviews${route}/${id}`,
					{},
					this._token
				);
			} else {
				Logger.warn("Unknown route for status: ", params);
			}
		}

		return this.put<CSUpdateReviewRequest, CSUpdateReviewResponse>(
			`/reviews/${id}`,
			params,
			this._token
		);
	}

	@log()
	updateCodeError(request: UpdateCodeErrorRequest) {
		const { id, ...params } = request;
		return this.put<CSUpdateCodeErrorRequest, CSUpdateCodeErrorResponse>(
			`/code-errors/${id}`,
			params,
			this._token
		);
	}

	@log()
	async deleteReview(request: DeleteReviewRequest) {
		await this.delete(`/reviews/${request.id}`, this._token);
		return {};
	}

	@log()
	async deleteCodeError(request: DeleteCodeErrorRequest) {
		await this.delete(`/code-errors/${request.id}`, this._token);
		return {};
	}

	@log()
	fetchReviewDiffs(request: FetchReviewDiffsRequest): Promise<FetchReviewDiffsResponse> {
		return this.get<CSGetReviewDiffsResponse>(`/reviews/diffs/${request.reviewId}`, this._token);
	}

	@log()
	fetchReviewCheckpointDiffs(
		request: FetchReviewCheckpointDiffsRequest
	): Promise<FetchReviewCheckpointDiffsResponse> {
		return this.get<CSGetReviewCheckpointDiffsResponse>(
			`/reviews/checkpoint-diffs/${request.reviewId}`,
			this._token
		);
	}

	@log()
	createChannelStream(request: CreateChannelStreamRequest) {
		return this.post<CSCreateChannelStreamRequest, CSCreateChannelStreamResponse>(
			`/streams`,
			{ ...request, teamId: this.teamId },
			this._token
		);
	}

	@log()
	createDirectStream(request: CreateDirectStreamRequest) {
		return this.post<CSCreateDirectStreamRequest, CSCreateDirectStreamResponse>(
			`/streams`,
			{ ...request, teamId: this.teamId },
			this._token
		);
	}

	@log()
	fetchStreams(request: FetchStreamsRequest) {
		if (
			request.types == null ||
			request.types.length === 0 ||
			(request.types.includes(StreamType.Channel) && request.types.includes(StreamType.Direct))
		) {
			return this.getStreams<
				CSGetStreamsResponse<CSChannelStream | CSDirectStream | CSObjectStream>
			>(`/streams?teamId=${this.teamId}`, this._token);
		}

		return this.getStreams<CSGetStreamsResponse<CSChannelStream | CSDirectStream | CSObjectStream>>(
			`/streams?teamId=${this.teamId}&type=${request.types[0]}`,
			this._token
		);
	}

	@log()
	fetchUnreadStreams(request: FetchUnreadStreamsRequest) {
		return this.getStreams<CSGetStreamsResponse<CSChannelStream | CSDirectStream | CSObjectStream>>(
			`/streams?teamId=${this.teamId}&unread`,
			this._token
		);
	}

	@log()
	async getStream(request: GetStreamRequest) {
		return this.get<CSGetStreamResponse<CSChannelStream | CSDirectStream | CSObjectStream>>(
			`/streams/${request.streamId}`,
			this._token
		);
	}

	@log()
	async archiveStream(request: ArchiveStreamRequest) {
		return this.updateStream<CSChannelStream>(request.streamId, { isArchived: true });
	}

	@log()
	closeStream(request: CloseStreamRequest) {
		return this.updateStream<CSDirectStream>(request.streamId, { isClosed: true });
	}

	@log()
	async joinStream(request: JoinStreamRequest) {
		const response = await this.put<CSJoinStreamRequest, CSJoinStreamResponse>(
			`/join/${request.streamId}`,
			{},
			this._token
		);

		const [stream] = await SessionContainer.instance().streams.resolve({
			type: MessageType.Streams,
			data: [response.stream]
		});

		return { stream: stream as CSChannelStream };
	}

	@log()
	async leaveStream(request: LeaveStreamRequest) {
		// Get a copy of the original stream & copy its membership array (since it will be mutated)
		const originalStream = {
			...(await SessionContainer.instance().streams.getById(request.streamId))
		};
		if (originalStream.memberIds != null) {
			originalStream.memberIds = originalStream.memberIds.slice(0);
		}

		if (this._events !== undefined) {
			this._events.unsubscribeFromStream(request.streamId);
		}

		try {
			const response = await this.updateStream(request.streamId, {
				$pull: { memberIds: [this._userId] }
			});
			return { stream: response.stream as CSChannelStream };
		} catch (ex) {
			Logger.error(ex);

			// Since this can happen because we have no permission to the stream anymore,
			// simulate removing ourselves from the membership list
			if (originalStream.memberIds != null) {
				const index = originalStream.memberIds.findIndex(m => m === this._userId);
				if (index !== -1) {
					originalStream.memberIds.splice(index, 1);
				}
			}
			return { stream: originalStream as CSChannelStream };
		}
	}

	@log()
	markStreamRead(request: MarkStreamReadRequest) {
		return this.put(`/read/${request.streamId}`, {}, this._token);
	}

	@log()
	async muteStream(request: MuteStreamRequest) {
		void (await this.updatePreferences({
			preferences: {
				$set: { [`mutedStreams.${request.streamId}`]: request.mute }
			}
		}));

		const stream = await SessionContainer.instance().streams.getById(request.streamId);
		return { stream: stream };
	}

	@log()
	openStream(request: OpenStreamRequest) {
		return this.updateStream<CSDirectStream>(request.streamId, { isClosed: false });
	}

	@log()
	renameStream(request: RenameStreamRequest) {
		return this.updateStream<CSChannelStream>(request.streamId, { name: request.name });
	}

	@log()
	setStreamPurpose(request: SetStreamPurposeRequest) {
		return this.updateStream<CSChannelStream>(request.streamId, { purpose: request.purpose });
	}

	@log()
	unarchiveStream(request: UnarchiveStreamRequest) {
		return this.updateStream<CSChannelStream>(request.streamId, { isArchived: false });
	}

	private async updateStream<T extends CSChannelStream | CSDirectStream | CSObjectStream>(
		streamId: string,
		changes: { [key: string]: any }
	) {
		const response = await this.put<CSUpdateStreamRequest, CSUpdateStreamResponse>(
			`/streams/${streamId}`,
			{
				...changes
			},
			this._token
		);

		const [stream] = await SessionContainer.instance().streams.resolve({
			type: MessageType.Streams,
			data: [response.stream]
		});

		return { stream: stream as T };
	}

	@log()
	async updateStreamMembership(request: UpdateStreamMembershipRequest) {
		const response = await this.put<CSUpdateStreamRequest, CSUpdateStreamResponse>(
			`/streams/${request.streamId}`,
			{
				$push: request.add == null ? undefined : { memberIds: request.add },
				$pull: request.remove == null ? undefined : { memberIds: request.remove }
			},
			this._token
		);

		const [stream] = await SessionContainer.instance().streams.resolve({
			type: MessageType.Streams,
			data: [response.stream]
		});

		return { stream: stream as CSChannelStream };
	}

	@log()
	@lspHandler(CreateTeamRequestType)
	createTeam(request: CreateTeamRequest) {
		return this.post("/teams", request, this._token);
	}

	@lspHandler(SendPasswordResetEmailRequestType)
	async sendPasswordResetEmail(request: SendPasswordResetEmailRequest) {
		await this.put("/no-auth/forgot-password", request);
	}

	@lspHandler(SetPasswordRequestType)
	async setPassword(request: SetPasswordRequest) {
		return this.put<CSSetPasswordRequest, CSSetPasswordResponse>(
			"/password",
			{ newPassword: request.password },
			this._token
		);
	}

	@log()
	fetchTeams(request: FetchTeamsRequest) {
		let params = "";
		if (request.mine) {
			params = `&mine`;
		}

		if (request.teamIds && request.teamIds.length) {
			params += `&ids=${request.teamIds.join(",")}`;
		}

		return this.get<CSGetTeamsResponse>(
			`/teams${params ? `?${params.substring(1)}` : ""}`,
			this._token
		);
	}

	@log()
	getTeam(request: GetTeamRequest) {
		return this.get<CSGetTeamResponse>(`/teams/${request.teamId}`, this._token);
	}

	fetchCompanies(request: FetchCompaniesRequest): Promise<FetchCompaniesResponse> {
		const params: { [k: string]: any } = {};

		if (request.mine) params.mine = true;
		else if (request.companyIds?.length ?? 0 > 0) {
			params.ids = request.companyIds!.join(",");
		}

		return this.get<CSGetCompaniesResponse>(`/companies?${qs.stringify(params)}`, this._token);
	}

	getCompany(request: GetCompanyRequest): Promise<GetCompanyResponse> {
		return this.get<CSGetCompanyResponse>(`/companies/${request.companyId}`, this._token);
	}

	@lspHandler(JoinCompanyRequestType)
	@log()
	async joinCompany(request: JoinCompanyRequest): Promise<JoinCompanyResponse> {
		return this.put(`/companies/join/${request.companyId}`, {}, this._token);
	}

	@lspHandler(UpdateCompanyRequestType)
	@log()
	async updateCompany(request: UpdateCompanyRequest): Promise<UpdateCompanyResponse> {
		return this.put(`/companies/${request.companyId}`, request, this._token);
	}

	@lspHandler(DeleteCompanyRequestType)
	@log()
	deleteCompany(request: DeleteCompanyRequest): Promise<DeleteCompanyResponse> {
		return this.delete<DeleteCompanyResponse>(`/companies/${request.companyId}`, this._token);
	}

	async setCompanyTestGroups(
		companyId: string,
		request: { [key: string]: string }
	): Promise<CSCompany> {
		const response = await this.put<{ [key: string]: string }, { company: any }>(
			`/company-test-group/${companyId}`,
			request,
			this._token
		);
		const companies = (await SessionContainer.instance().companies.resolve({
			type: MessageType.Companies,
			data: [response.company]
		})) as CSCompany[];
		return companies[0];
	}

	async addCompanyNewRelicInfo(companyId: string, accountIds?: number[], orgIds?: number[]) {
		if (!accountIds && !orgIds) {
			return false;
		}

		const body: {
			accountIds?: number[];
			orgIds?: number[];
		} = {};
		if (accountIds) {
			body.accountIds = accountIds;
		}
		if (orgIds) {
			body.orgIds = accountIds;
		}

		const response = await this.post<
			{ accountIds?: number[]; orgIds?: number[] },
			{ company: any }
		>(
			`/companies/add-nr-info/${companyId}`,
			{
				accountIds,
				orgIds
			},
			this._token
		);

		return true;
	}

	@log()
	@lspHandler(CreateCompanyRequestType)
	createCompany(request: CreateCompanyRequest) {
		return this.post("/companies", request, this._token);
	}

	@lspHandler(CreateTeamTagRequestType)
	async createTeamTag(request: CSTeamTagRequest) {
		await this.post(`/team-tags/${request.team.id}`, { ...request.tag }, this._token);
	}

	@lspHandler(DeleteTeamTagRequestType)
	async deleteTeamTag(request: CSTeamTagRequest) {
		await this.delete(`/team-tags/${request.team.id}/${request.tag.id}`, this._token);
	}

	@lspHandler(UpdateTeamTagRequestType)
	async updateTeamTag(request: CSTeamTagRequest) {
		await this.put(
			`/team-tags/${request.team.id}/${request.tag.id}`,
			{ ...request.tag },
			this._token
		);
	}

	@lspHandler(UpdateTeamAdminRequestType)
	async updateTeamAdmin(request: UpdateTeamAdminRequest) {
		await this.put(
			`/teams/${request.teamId}`,
			{
				$push: request.add == null ? undefined : { adminIds: request.add },
				$pull: request.remove == null ? undefined : { adminIds: request.remove }
			},
			this._token
		);
	}
	@lspHandler(UpdateTeamRequestType)
	async updateTeam(request: UpdateTeamRequest) {
		await this.put(`/teams/${request.teamId}`, { ...request }, this._token);
	}

	@lspHandler(UpdateTeamSettingsRequestType)
	async updateTeamSettings(request: UpdateTeamSettingsRequest) {
		await this.put(`/team-settings/${request.teamId}`, { ...request.settings }, this._token);
	}

	@lspHandler(AddBlameMapRequestType)
	async addBlameMap(request: AddBlameMapRequest) {
		await this.post(
			`/add-blame-map/${request.teamId}`,
			{ email: request.email, userId: request.userId },
			this._token
		);
	}

	@lspHandler(DeleteBlameMapRequestType)
	async deleteBlameMap(request: DeleteBlameMapRequest) {
		await this.put(`/delete-blame-map/${request.teamId}`, { email: request.email }, this._token);
	}

	@log()
	async fetchUsers(request: FetchUsersRequest) {
		let path = `/users?teamId=${this.teamId}`;
		if (request.userIds) {
			path += `&ids=${request.userIds.join(",")}`;
		}

		const response = await this.get<CSGetUsersResponse>(path, this._token);

		if (this._user === undefined) {
			const meResponse = await this.getMe();
			this._user = meResponse.user;
		}

		// Find ourselves and replace it with our model
		const index = response.users.findIndex(u => u.id === this._userId);
		if (index !== -1) response.users.splice(index, 1, this._user);

		return response;
	}

	@log()
	getUser(request: GetUserRequest) {
		if (request.userId === this.userId) {
			return this.getMe();
		}

		return this.get<CSGetUserResponse>(`/users/${request.userId}`, this._token);
	}

	@log()
	inviteUser(request: InviteUserRequest) {
		const postUserRequest = { ...request, teamId: this.teamId };
		const session = SessionContainer.instance().session;

		// for on-prem, base the server url (and strict flag) into the invite code,
		// so invited users have it set automatically
		if (session.isOnPrem) {
			postUserRequest.inviteInfo = {
				serverUrl: this.baseUrl,
				disableStrictSSL: session.disableStrictSSL ? true : false
			};
		}

		return this.post<CSInviteUserRequest, CSInviteUserResponse>(
			"/users",
			postUserRequest,
			this._token
		);
	}

	@log()
	deleteUser(request: DeleteUserRequest) {
		return this.delete<DeleteUserResponse>(`/users/${request.userId}`, this._token);
	}

	@lspHandler(DeleteMeUserRequestType)
	@log()
	deleteMeUser(request: DeleteMeUserRequest) {
		return this.delete<DeleteMeUserResponse>(`/users/${request.userId}`, this._token);
	}

	@log()
	kickUser(request: KickUserRequest) {
		return this.put<any, KickUserResponse>(
			`/teams/${request.teamId}`,
			{
				$addToSet: { removedMemberIds: [request.userId] }
			},
			this._token
		);
	}

	@log()
	updateUser(request: UpdateUserRequest) {
		if (request.email) {
			return this.put<CSUpdateUserRequest, CSUpdateUserResponse>(
				"/change-email/",
				request,
				this._token
			);
		} else {
			return this.put<CSUpdateUserRequest, CSUpdateUserResponse>(
				"/users/" + this.userId,
				request,
				this._token
			);
		}
	}

	@log()
	async getPreferences() {
		const preferences = await this.get<GetPreferencesResponse>("/preferences", this._token);
		safeDecode(preferences);
		return preferences;
	}

	@log()
	async getTelemetryKey(): Promise<string> {
		const telemetrySecret = "84$gTe^._qHm,#D";
		const response = await this.get<CSGetTelemetryKeyResponse>(
			`/no-auth/telemetry-key?secret=${encodeURIComponent(telemetrySecret)}`
		);
		return response.key;
	}

	@log()
	async getApiCapabilities(): Promise<CSApiCapabilities> {
		const response = await this.get<CSGetApiCapabilitiesResponse>(`/no-auth/capabilities`);
		return response.capabilities;
	}

	@log()
	async connectThirdPartyProvider(request: { providerId: string; sharing?: boolean }) {
		const cc = Logger.getCorrelationContext();
		try {
			const provider = getProvider(request.providerId);
			if (!provider) throw new Error(`provider ${request.providerId} not found`);
			const providerConfig = provider.getConfig();

			const response = await this.get<{ code: string }>(
				`/provider-auth-code?teamId=${this.teamId}${request.sharing ? "&sharing=true" : ""}`,
				this._token
			);
			const params: { [key: string]: string } = {
				code: response.code
			};
			if (providerConfig.isEnterprise) {
				params.host = providerConfig.host;
			}
			if (request.sharing) {
				params.sharing = true.toString();
			}

			const query = Object.keys(params)
				.map(param => `${param}=${encodeURIComponent(params[param])}`)
				.join("&");
			void SessionContainer.instance().session.agent.sendRequest(AgentOpenUrlRequestType, {
				url: `${this.baseUrl}/no-auth/provider-auth/${providerConfig.name}?${query}`
			});
			// this response is never used.
			return response;
		} catch (ex) {
			Logger.error(ex, cc);
			throw ex;
		}
	}

	@log({
		args: {
			0: (request: ThirdPartyProviderSetTokenRequest) => `${request.providerId}, ${request.host}`
		}
	})
	async setThirdPartyProviderToken(request: ThirdPartyProviderSetTokenRequest) {
		const cc = Logger.getCorrelationContext();
		try {
			const provider = getProvider(request.providerId);
			if (!provider) throw new Error(`provider ${request.providerId} not found`);
			const providerConfig = provider.getConfig();

			const params: ThirdPartyProviderSetTokenRequestData = {
				teamId: this.teamId,
				host: request.host,
				token: request.token,
				data: request.data
			};

			const response = await this.put<ThirdPartyProviderSetTokenRequestData, { user: any }>(
				`/provider-set-token/${providerConfig.name}`,
				params,
				this._token
			);

			// the webview needs to know about the change to the user object with the new provider access token
			// before it can proceed to display the provider as selected in the issues selector for codemarks,
			// so we need to force the data to resolve and send a notification directly from here before returning
			// REALLY don't know how else to do this
			const users = (await SessionContainer.instance().users.resolve({
				type: MessageType.Users,
				data: [response.user]
			})) as CSUser[];
			Container.instance().agent.sendNotification(DidChangeDataNotificationType, {
				type: ChangeDataType.Users,
				data: users
			});
		} catch (ex) {
			Logger.error(ex, cc);
			throw ex;
		}
	}

	@log()
	async setThirdPartyProviderInfo(request: {
		providerId: string;
		host: string;
		data: { [key: string]: any };
	}) {
		const cc = Logger.getCorrelationContext();
		try {
			const provider = getProvider(request.providerId);
			if (!provider) throw new Error(`provider ${request.providerId} not found`);
			const providerConfig = provider.getConfig();

			const params: { teamId: string; host: string; data: { [key: string]: any } } = {
				teamId: this.teamId,
				host: request.host,
				data: request.data
			};

			void (await this.put<{ teamId: string; host: string; data: { [key: string]: any } }, {}>(
				`/provider-info/${providerConfig.name}`,
				params,
				this._token
			));
		} catch (ex) {
			Logger.error(ex, cc);
			throw ex;
		}
	}

	@log()
	async disconnectThirdPartyProvider(request: { providerId: string; providerTeamId?: string }) {
		const cc = Logger.getCorrelationContext();
		try {
			const provider = getProvider(request.providerId);
			if (!provider) throw new Error(`provider ${request.providerId} not found`);
			const providerConfig = provider.getConfig();

			const params: { teamId: string; host?: string; subId?: string } = {
				teamId: this.teamId
			};
			if (providerConfig.isEnterprise) {
				params.host = providerConfig.host;
			}
			if (request.providerTeamId) {
				params.subId = request.providerTeamId;
			}

			void (await this.put<{ teamId: string; host?: string }, {}>(
				`/provider-deauth/${providerConfig.name}`,
				params,
				this._token
			));
		} catch (ex) {
			Logger.error(ex, cc);
			throw ex;
		}
	}

	@log({
		args: { 1: () => false }
	})
	async refreshAuthProvider<T extends CSRefreshableProviderInfos>(
		providerId: string,
		providerInfo: T
	): Promise<T> {
		const cc = Logger.getCorrelationContext();

		try {
			const url = `/provider-refresh/${providerId}?teamId=${this.teamId}&refreshToken=${providerInfo.refreshToken}`;
			const response = await this.get<{ user: any }>(url, this._token);

			// Since we are dealing with identity auth don't try to resolve this with the users
			// The "me" user will get updated via the pubnub message
			let user: Partial<CSMe>;
			if (isDirective(response.user)) {
				user = {
					id: response.user.id,
					providerInfo: { [this.teamId]: { [providerId]: { ...providerInfo } } }
				};
				user = resolve(user as any, response.user);
			} else {
				user = response.user;
			}
			return user.providerInfo![this.teamId][providerId] as T;
		} catch (ex) {
			Logger.error(ex, cc);
			throw ex;
		}
	}

	@log({
		args: { 1: () => false }
	})
	async refreshThirdPartyProvider(request: {
		providerId: string;
		refreshToken: string;
		sharing?: boolean;
		subId?: string;
	}): Promise<CSMe> {
		const cc = Logger.getCorrelationContext();
		try {
			const provider = getProvider(request.providerId);
			if (!provider) throw new Error(`provider ${request.providerId} not found`);
			const providerConfig = provider.getConfig();

			const params: { [key: string]: string } = {
				teamId: this.teamId,
				token: request.refreshToken
			};
			if (providerConfig.isEnterprise) {
				params.host = providerConfig.host;
			}

			const team = `teamId=${this.teamId}`;
			const token = `refreshToken=${request.refreshToken}`;
			const host = providerConfig.isEnterprise
				? `&host=${encodeURIComponent(providerConfig.host!)}`
				: "";
			const sharing = request.sharing ? "&sharing=true" : "";
			const subId = request.subId ? `&subId=${request.subId}` : "";
			const url = `/provider-refresh/${providerConfig.name}?${team}&${token}${host}${sharing}${subId}`;
			const response = await this.get<{ user: any }>(url, this._token);

			const [user] = await SessionContainer.instance().users.resolve({
				type: MessageType.Users,
				data: [response.user]
			});

			return user as CSMe;
		} catch (ex) {
			Logger.error(ex, cc);
			throw ex;
		}
	}

	@log()
	async addEnterpriseProviderHost(
		request: AddEnterpriseProviderHostRequest
	): Promise<AddEnterpriseProviderHostResponse> {
		const cc = Logger.getCorrelationContext();
		try {
			const response = await this.put<CSAddProviderHostRequest, CSAddProviderHostResponse>(
				`/provider-host/${request.provider}/${request.teamId}`,
				{ host: request.host, ...request.data },
				this._token
			);

			await SessionContainer.instance().teams.resolve({
				type: MessageType.Teams,
				data: [response.team]
			});
			SessionContainer.instance().session.updateProviders();
			return { providerId: response.providerId };
		} catch (ex) {
			Logger.error(ex, cc);
			throw ex;
		}
	}

	@log()
	async removeEnterpriseProviderHost(request: RemoveEnterpriseProviderHostRequest): Promise<void> {
		const cc = Logger.getCorrelationContext();
		try {
			const response = await this.delete<CSRemoveProviderHostResponse>(
				`/provider-host/${request.provider}/${request.teamId}/${encodeURIComponent(
					request.providerId
				)}`,
				this._token
			);

			await SessionContainer.instance().teams.resolve({
				type: MessageType.Teams,
				data: [response.team]
			});
			SessionContainer.instance().session.updateProviders();
		} catch (ex) {
			Logger.error(ex, cc);
			throw ex;
		}
	}

	@lspHandler(ProviderTokenRequestType)
	async setProviderToken(request: ProviderTokenRequest) {
		const repoInfo =
			request.repoInfo &&
			`${request.repoInfo.teamId}|${request.repoInfo.repoId}|${request.repoInfo.commitHash}`;
		return this.post(`/no-auth/provider-token/${request.provider}`, {
			token: request.token,
			data: request.data,
			invite_code: request.inviteCode,
			repo_info: repoInfo || undefined,
			no_signup: request.noSignup,
			signup_token: request.signupToken
		});
	}

	@lspHandler(UploadFileRequestType)
	async uploadFile(request: UploadFileRequest) {
		const formData = new FormData();
		if (request.buffer) {
			const base64String = request.buffer;
			// string off dataUri / content info from base64 string
			var bareString = "";
			var commaIndex = base64String.indexOf(",");
			if (commaIndex == -1) {
				bareString = base64String;
			} else {
				bareString = base64String.substring(commaIndex + 1);
			}
			formData.append("file", Buffer.from(bareString, "base64"), {
				filename: request.name,
				contentType: request.mimetype
			});
		} else {
			formData.append("file", require("fs").createReadStream(request.path));
		}
		const url = `${this.baseUrl}/upload-file/${this.teamId}`;
		const headers = new Headers({
			Authorization: `Bearer ${this._token}`
		});

		// note, this bypasses the built-in fetch wrapper and calls node fetch directly,
		// because we're not dealing with json data in the request
		const response = await fetch(url, { method: "post", body: formData, headers });
		return await response.json();
	}

	@lspHandler(GetNewRelicSignupJwtTokenRequestType)
	async getNewRelicSignupJwtToken(
		request: GetNewRelicSignupJwtTokenRequest
	): Promise<GetNewRelicSignupJwtTokenResponse> {
		const response = await this.get<GetNewRelicSignupJwtTokenResponse>(`/signup-jwt`, this._token);
		const baseLandingUrl =
			this.baseUrl === "https://nr-preview.codestream.us"
				? "https://landing.staging-service.newrelic.com"
				: "https://landing.service.newrelic.com";
		return {
			...response,
			baseLandingUrl
		};
	}

	lookupNewRelicOrganizations(
		request: LookupNewRelicOrganizationsRequest
	): Promise<LookupNewRelicOrganizationsResponse> {
		return this.post<LookupNewRelicOrganizationsRequest, LookupNewRelicOrganizationsResponse>(
			`/lookup-nr-orgs`,
			request,
			this._token
		);
	}

	announceHistoryFetch(info: HistoryFetchInfo): void {
		const session = SessionContainer.instance().session;
		if (session.announceHistoryFetches()) {
			this.get<{}>("/history-fetch?" + qs.stringify(info));
		}
	}

	async delete<R extends object>(url: string, token?: string): Promise<R> {
		if (!token && url.indexOf("/no-auth/") === -1) token = this._token;
		let resp = undefined;
		if (resp === undefined) {
			resp = this.fetch<R>(url, { method: "DELETE" }, token) as Promise<R>;
		}
		return resp;
	}

	async get<R extends object>(url: string, token?: string): Promise<R> {
		if (!token && url.indexOf("/no-auth/") === -1) token = this._token;
		return this.fetch<R>(url, { method: "GET" }, token) as Promise<R>;
	}

	async post<RQ extends object, R extends object>(
		url: string,
		body: RQ,
		token?: string
	): Promise<R> {
		if (!token && url.indexOf("/no-auth/") === -1) token = this._token;
		return this.fetch<R>(
			url,
			{
				method: "POST",
				body: JSON.stringify(body)
			},
			token
		);
	}

	async put<RQ extends object, R extends object>(
		url: string,
		body: RQ,
		token?: string
	): Promise<R> {
		if (!token && url.indexOf("/no-auth/") === -1) token = this._token;
		return this.fetch<R>(
			url,
			{
				method: "PUT",
				body: JSON.stringify(body)
			},
			token
		);
	}

	/*private*/ async fetch<R extends object>(
		url: string,
		init?: RequestInit,
		token?: string
	): Promise<R> {
		const start = process.hrtime();

		const sanitizedUrl = CodeStreamApiProvider.sanitizeUrl(url);
		let traceResult;
		try {
			if (init !== undefined || token !== undefined) {
				if (init === undefined) {
					init = {};
				}

				if (init.headers === undefined) {
					init.headers = new Headers();
				}

				if (init.headers instanceof Headers) {
					init.headers.append("Accept", "application/json");
					init.headers.append("Content-Type", "application/json");

					if (token !== undefined) {
						init.headers.append("Authorization", `Bearer ${token}`);
					}

					init.headers.append("X-CS-Plugin-IDE", this._version.ide.name);
					init.headers.append("X-CS-Plugin-IDE-Detail", this._version.ide.detail);
					init.headers.append(
						"X-CS-Plugin-Version",
						`${this._version.extension.version}+${this._version.extension.build}`
					);
					init.headers.append("X-CS-IDE-Version", this._version.ide.version);
				}
			}

			if (this._httpsAgent !== undefined) {
				if (init === undefined) {
					init = {};
				}

				init.agent = this._httpsAgent;
			}

			const method = (init && init.method) || "GET";
			const absoluteUrl = `${this.baseUrl}${url}`;

			const context =
				this._middleware.length > 0
					? ({
							url: absoluteUrl,
							method: method,
							request: init
					  } as CodeStreamApiMiddlewareContext)
					: undefined;

			if (context !== undefined) {
				for (const mw of this._middleware) {
					if (mw.onRequest === undefined) continue;

					try {
						await mw.onRequest(context);
					} catch (ex) {
						Logger.error(
							ex,
							`API: ${method} ${sanitizedUrl}: Middleware(${mw.name}).onRequest FAILED`
						);
					}
				}
			}

			let json: Promise<R> | undefined;
			if (context !== undefined) {
				for (const mw of this._middleware) {
					if (mw.onProvideResponse === undefined) continue;

					try {
						json = mw.onProvideResponse(context!);
						if (json !== undefined) break;
					} catch (ex) {
						Logger.error(
							ex,
							`API: ${method} ${sanitizedUrl}: Middleware(${mw.name}).onProvideResponse FAILED`
						);
					}
				}
			}

			let id;
			let resp;
			let retryCount = 0;
			if (json === undefined) {
				[resp, retryCount] = await this.fetchCore(0, absoluteUrl, init);
				if (context !== undefined) {
					context.response = resp;
				}

				id = resp.headers.get("x-request-id");

				if (resp.ok) {
					traceResult = `API(${id}): Completed ${method} ${sanitizedUrl}`;
					json = resp.json() as Promise<R>;
				}
			}

			if (context !== undefined) {
				for (const mw of this._middleware) {
					if (mw.onResponse === undefined) continue;

					try {
						await mw.onResponse(context!, json);
					} catch (ex) {
						Logger.error(
							ex,
							`API(${id}): ${method} ${sanitizedUrl}: Middleware(${mw.name}).onResponse FAILED`
						);
					}
				}
			}

			if (resp !== undefined && !resp.ok) {
				traceResult = `API(${id}): FAILED(${retryCount}x) ${method} ${sanitizedUrl}`;
				Container.instance().errorReporter.reportBreadcrumb({
					message: traceResult,
					category: "apiErrorResponse"
				});
				throw await this.handleErrorResponse(resp);
			}

			const _json = await json!;

			if (Container.instance().agent.recordRequests && init) {
				const now = Date.now();
				const { method, body } = init;

				const fs = require("fs");
				const sanitize = require("sanitize-filename");
				const urlForFilename = sanitize(
					sanitizedUrl
						.split("?")[0]
						.replace(/\//g, "_")
						.replace("_", "")
				);
				const filename = `/tmp/dump-${now}-csapi-${method}-${urlForFilename}.json`;

				const out = {
					url: url,
					request: typeof body === "string" ? JSON.parse(body) : body,
					response: _json
				};
				const outString = JSON.stringify(out, null, 2);

				fs.writeFile(filename, outString, "utf8", () => {
					Logger.log(`Written ${filename}`);
				});
			}

			return CodeStreamApiProvider.normalizeResponse(_json);
		} finally {
			Logger.log(
				`${traceResult}${
					init && init.body ? ` body=${CodeStreamApiProvider.sanitize(init && init.body)}` : ""
				} \u2022 ${Strings.getDurationMilliseconds(start)} ms`
			);
		}
	}

	private async fetchCore(
		count: number,
		url: string,
		init?: RequestInit
	): Promise<[Response, number]> {
		try {
			const resp = await fetch(url, init);
			if (resp.status < 200 || resp.status > 299) {
				if (resp.status < 400 || resp.status >= 500) {
					count++;
					if (count <= 3) {
						await Functions.wait(250 * count);
						return this.fetchCore(count, url, init);
					}
				}
			}
			return [resp, count];
		} catch (ex) {
			Logger.error(ex);

			count++;
			if (count <= 3) {
				await Functions.wait(250 * count);
				return this.fetchCore(count, url, init);
			}
			throw ex;
		}
	}

	private async handleErrorResponse(response: Response): Promise<Error> {
		let message = response.statusText;
		let data;
		if (response.status >= 400 && response.status < 500) {
			try {
				data = await response.json();
				if (data.code) {
					message += `(${data.code})`;
				}
				if (data.message) {
					message += `: ${data.message}`;
				}
				if (data.info) {
					if (data.info.name) {
						message += `\n${data.info.name || data.info}`;
					}
					if (data.message === "Validation error") {
						message += ` ${Array.from(Objects.values(data.info)).join(", ")}`;
					}
				}
			} catch {}
		}

		Container.instance().errorReporter.reportMessage({
			source: "agent",
			type: ReportingMessageType.Error,
			message: `[Server Error]: ${message}`,
			extra: {
				data,
				responseStatus: response.status,
				requestId: response.headers.get("x-request-id"),
				requestUrl: response.url
			}
		});

		return new ServerError(message, data, response.status);
	}

	// TODO: Move somewhere more generic
	static isStreamSubscriptionRequired(stream: CSStream, userId: string, teamId: string): boolean {
		if (stream.teamId !== teamId) return false;
		if (stream.deactivated || stream.type === StreamType.File) return false;
		if (stream.type === StreamType.Channel) {
			if (stream.memberIds === undefined) return false;
			if (!stream.memberIds.includes(userId)) return false;
		}
		return true;
	}

	// TODO: Move somewhere more generic
	static isStreamUnsubscribeRequired(stream: CSStream, userId: string): boolean {
		if (stream.type !== StreamType.Channel) {
			return false;
		}
		if (stream.memberIds && !stream.memberIds.includes(userId)) {
			return true;
		}
		return false;
	}

	static normalizeResponse<R extends object>(obj: { [key: string]: any }): R {
		// FIXME maybe the api server should never return arrays with null elements?
		if (obj != null) {
			for (const [key, value] of Object.entries(obj)) {
				if (key === "_id") {
					obj["id"] = value;
				}

				if (Array.isArray(value)) {
					obj[key] = value.map(v => this.normalizeResponse(v));
				} else if (typeof value === "object") {
					obj[key] = this.normalizeResponse(value);
				}
			}
		}

		return obj as R;
	}

	static sanitize(
		body:
			| string
			| ArrayBuffer
			| ArrayBufferView
			| NodeJS.ReadableStream
			| URLSearchParams
			| undefined
	) {
		if (body === undefined || typeof body !== "string") return "";

		return body.replace(
			/("\w*?apikey\w*?":|"\w*?password\w*?":|"\w*?secret\w*?":|"\w*?token\w*?":)".*?"/gi,
			'$1"<hidden>"'
		);
	}

	static sanitizeUrl(url: string) {
		return url.replace(
			/(\b\w*?apikey\w*?=|\b\w*?password\w*?=|\b\w*?secret\w*?=|\b\w*?token\w*?=)(?:.+?)(?=&|$)/gi,
			"$1<hidden>"
		);
	}

	async verifyConnectivity() {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 5000);
		const response: VerifyConnectivityResponse = {
			ok: true
		};

		try {
			Logger.log("Verifying API server connectivity");

			const resp = await fetch(this.baseUrl + "/no-auth/capabilities", {
				agent: this._httpsAgent,
				signal: controller.signal
			});

			Logger.log(`API server status: ${resp.status}`);
			if (!resp.ok) {
				response.ok = false;
				response.error = {
					message: resp.status.toString() + resp.statusText
				};
			} else {
				const json = await resp.json();
				response.capabilities = json.capabilities;
				response.environment = json.environment;
				response.isOnPrem = json.isOnPrem;
				response.isProductionCloud = json.isProductionCloud;
			}
		} catch (err) {
			Logger.log(`Error connecting to the API server: ${err.message}`);
			response.ok = false;
			if (err.name === "AbortError") {
				response.error = {
					message: "Connection to CodeStream API server timed out after 5 seconds"
				};
			} else {
				response.error = {
					message: err.message
				};
			}
		} finally {
			clearTimeout(timeout);
		}

		return response;
	}
}
