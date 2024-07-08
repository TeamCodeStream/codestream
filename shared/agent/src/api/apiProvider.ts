import { RequestInit, Response } from "undici";
import { Disposable, Event } from "vscode-languageserver";

import { HistoryFetchInfo } from "broadcaster/broadcaster";
import {
	AccessToken,
	AddEnterpriseProviderHostRequest,
	AddEnterpriseProviderHostResponse,
	ArchiveStreamRequest,
	ArchiveStreamResponse,
	Capabilities,
	ClaimCodeErrorRequest,
	ClaimCodeErrorResponse,
	CloseStreamRequest,
	CloseStreamResponse,
	ConnectionStatus,
	CreateChannelStreamRequest,
	CreateChannelStreamResponse,
	CreateDirectStreamRequest,
	CreateDirectStreamResponse,
	CreateExternalPostRequest,
	CreatePostRequest,
	CreatePostResponse,
	DeclineInviteRequest,
	DeclineInviteResponse,
	DeleteCodeErrorRequest,
	DeleteCodeErrorResponse,
	DeleteCompanyRequest,
	DeleteCompanyResponse,
	DeletePostRequest,
	DeletePostResponse,
	DeleteUserRequest,
	DeleteUserResponse,
	EditPostRequest,
	EditPostResponse,
	FetchCodeErrorsRequest,
	FetchCodeErrorsResponse,
	FetchCompaniesRequest,
	FetchCompaniesResponse,
	FetchFileStreamsRequest,
	FetchFileStreamsResponse,
	FetchPostRepliesRequest,
	FetchPostRepliesResponse,
	FetchPostsRequest,
	FetchPostsResponse,
	FetchStreamsRequest,
	FetchStreamsResponse,
	FetchTeamsRequest,
	FetchTeamsResponse,
	FetchThirdPartyBuildsRequest,
	FetchThirdPartyBuildsResponse,
	FetchUnreadStreamsRequest,
	FetchUnreadStreamsResponse,
	FetchUsersRequest,
	FetchUsersResponse,
	FollowCodeErrorRequest,
	FollowCodeErrorResponse,
	GenerateLoginCodeRequest,
	GenerateMSTeamsConnectCodeRequest,
	GenerateMSTeamsConnectCodeResponse,
	GetCodeErrorRequest,
	GetCodeErrorResponse,
	GetCompanyRequest,
	GetCompanyResponse,
	GetNewRelicSignupJwtTokenRequest,
	GetNewRelicSignupJwtTokenResponse,
	GetPostRequest,
	GetPostResponse,
	GetPostsRequest,
	GetPostsResponse,
	GetPreferencesResponse,
	GetStreamRequest,
	GetStreamResponse,
	GetTeamRequest,
	GetTeamResponse,
	GetUserRequest,
	GetUserResponse,
	InviteUserRequest,
	InviteUserResponse,
	JoinCompanyRequest,
	JoinCompanyResponse,
	JoinStreamRequest,
	JoinStreamResponse,
	KickUserRequest,
	KickUserResponse,
	LeaveStreamRequest,
	LeaveStreamResponse,
	LogoutCompanyRequest,
	LogoutCompanyResponse,
	LookupNewRelicOrganizationsRequest,
	LookupNewRelicOrganizationsResponse,
	MarkItemReadRequest,
	MarkItemReadResponse,
	MarkPostUnreadRequest,
	MarkPostUnreadResponse,
	MarkStreamReadRequest,
	MarkStreamReadResponse,
	MuteStreamRequest,
	MuteStreamResponse,
	OpenStreamRequest,
	OpenStreamResponse,
	PollForMaintenanceModeResponse,
	ReactToPostRequest,
	ReactToPostResponse,
	RemoveEnterpriseProviderHostRequest,
	RenameStreamRequest,
	RenameStreamResponse,
	SetStreamPurposeRequest,
	SetStreamPurposeResponse,
	SharePostViaServerRequest,
	SharePostViaServerResponse,
	ThirdPartyProviderSetInfoRequest,
	UnarchiveStreamRequest,
	UnarchiveStreamResponse,
	UpdateCodeErrorRequest,
	UpdateCodeErrorResponse,
	UpdateInvisibleRequest,
	UpdateInvisibleResponse,
	UpdatePostSharingDataRequest,
	UpdatePostSharingDataResponse,
	UpdatePreferencesRequest,
	UpdatePreferencesResponse,
	UpdatePresenceRequest,
	UpdatePresenceResponse,
	UpdateStatusRequest,
	UpdateStatusResponse,
	UpdateStreamMembershipRequest,
	UpdateStreamMembershipResponse,
	UpdateUserRequest,
	UpdateUserResponse,
	VerifyConnectivityResponse,
} from "@codestream/protocols/agent";
import {
	CSApiCapabilities,
	CSApiFeatures,
	CSChannelStream,
	CSCodeError,
	CSCompany,
	CSDirectStream,
	CSLoginResponse,
	CSMe,
	CSMePreferences,
	CSMsTeamsConversationRequest,
	CSMsTeamsConversationResponse,
	CSNewRelicProviderInfo,
	CSObjectStream,
	CSPost,
	CSTeam,
	CSUser,
	ProviderType,
	TriggerMsTeamsProactiveMessageRequest,
	TriggerMsTeamsProactiveMessageResponse,
} from "@codestream/protocols/api";

export type ApiProviderLoginResponse = CSLoginResponse & { token: AccessToken };

interface BasicLoginOptions {
	team?: string;
	teamId?: string;
	codemarkId?: string;
	reviewId?: string;
	codeErrorId?: string;
	errorGroupGuid?: string;
}

export interface CredentialsLoginOptions extends BasicLoginOptions {
	type: "credentials";
	email: string;
	password: string;
}

export interface OneTimeCodeLoginOptions extends BasicLoginOptions {
	type: "otc";
	code: string;
}

export interface TokenLoginOptions extends BasicLoginOptions {
	type: "token";
	token: AccessToken;
}

export interface LoginCodeLoginOptions extends BasicLoginOptions {
	type: "loginCode";
	email: string;
	code: string;
}

export type LoginOptions =
	| CredentialsLoginOptions
	| OneTimeCodeLoginOptions
	| TokenLoginOptions
	| LoginCodeLoginOptions;

export enum MessageType {
	Connection = "connection",
	Companies = "companies",
	Documents = "documents",
	Posts = "posts",
	Preferences = "preferences",
	CodeErrors = "codeErrors",
	Streams = "streams",
	Teams = "teams",
	Unreads = "unreads",
	Users = "users",
	Echo = "echo",
	AsyncError = "asyncError",
	GrokStream = "grokStream",
	AnomalyData = "anomalyData",
}

export interface CompaniesRTMessage {
	type: MessageType.Companies;
	data: CSCompany[];
}

export interface ConnectionRTMessage {
	type: MessageType.Connection;
	data: { reset?: boolean; status: ConnectionStatus };
}

export interface PostsRTMessage {
	type: MessageType.Posts;
	data: CSPost[];
}

export interface PreferencesRTMessage {
	type: MessageType.Preferences;
	data: CSMePreferences;
}

export interface CodeErrorsRTMessage {
	type: MessageType.CodeErrors;
	data: CSCodeError[];
}

export interface AnomalyDataRTMessage {
	type: MessageType.AnomalyData;
	data: any;
}

export interface StreamsRTMessage {
	type: MessageType.Streams;
	data: (CSChannelStream | CSDirectStream | CSObjectStream)[];
}

export interface TeamsRTMessage {
	type: MessageType.Teams;
	data: CSTeam[];
}

export interface UsersRTMessage {
	type: MessageType.Users;
	data: CSUser[];
}

export interface EchoMessage {
	type: MessageType.Echo;
}

export interface RawRTMessage {
	type: MessageType;
	data?: any;
	blockUntilProcessed?: boolean;
}

export interface ApiError {
	info: {
		code: string;
		message: string;
		info: {
			error: string;
			error_description: string;
		};
	};
	statusCode: number;
}

export type RTMessage =
	| CompaniesRTMessage
	| ConnectionRTMessage
	| PostsRTMessage
	| PreferencesRTMessage
	| CodeErrorsRTMessage
	| StreamsRTMessage
	| TeamsRTMessage
	| UsersRTMessage
	| AnomalyDataRTMessage
	| EchoMessage;

export interface ApiProvider {
	onDidReceiveMessage: Event<RTMessage>;

	readonly baseUrl: string;
	readonly teamId: string;
	readonly userId: string;
	readonly capabilities: Capabilities;
	readonly features: CSApiFeatures | undefined;

	providerType: ProviderType;

	fetch<R extends object>(url: string, init?: RequestInit, token?: string): Promise<R>;
	useMiddleware(middleware: CodeStreamApiMiddleware): Disposable;
	dispose(): Promise<void>;

	login(options: LoginOptions): Promise<ApiProviderLoginResponse>;
	generateLoginCode(request: GenerateLoginCodeRequest): Promise<void>;
	generateMSTeamsConnectCode(
		request: GenerateMSTeamsConnectCodeRequest
	): Promise<GenerateMSTeamsConnectCodeResponse>;
	subscribe(types?: MessageType[]): Promise<void>;

	grantBroadcasterChannelAccess(token: string, channel: string): Promise<{}>;

	updatePreferences(request: UpdatePreferencesRequest): Promise<UpdatePreferencesResponse>;
	updateInvisible(request: UpdateInvisibleRequest): Promise<UpdateInvisibleResponse>;
	updateStatus(request: UpdateStatusRequest): Promise<UpdateStatusResponse>;
	getPreferences(): Promise<GetPreferencesResponse>;
	updatePresence(request: UpdatePresenceRequest): Promise<UpdatePresenceResponse>;

	getApiCapabilities(): Promise<CSApiCapabilities>;

	// createFileStream(request: CreateFileStreamRequest): Promise<CreateFileStreamResponse>;
	fetchFileStreams(request: FetchFileStreamsRequest): Promise<FetchFileStreamsResponse>;

	followCodeError(request: FollowCodeErrorRequest): Promise<FollowCodeErrorResponse>;

	createExternalPost(request: CreateExternalPostRequest): Promise<CreatePostResponse>;
	createPost(request: CreatePostRequest): Promise<CreatePostResponse>;
	deletePost(request: DeletePostRequest): Promise<DeletePostResponse>;
	editPost(request: EditPostRequest): Promise<EditPostResponse>;
	updatePostSharingData(
		request: UpdatePostSharingDataRequest
	): Promise<UpdatePostSharingDataResponse>;
	sharePostViaServer(request: SharePostViaServerRequest): Promise<SharePostViaServerResponse>;
	fetchPostReplies(request: FetchPostRepliesRequest): Promise<FetchPostRepliesResponse>;
	fetchPosts(request: FetchPostsRequest): Promise<FetchPostsResponse>;
	getPost(request: GetPostRequest): Promise<GetPostResponse>;
	getPosts(request: GetPostsRequest | Partial<GetPostRequest>): Promise<GetPostsResponse>;
	markPostUnread(request: MarkPostUnreadRequest): Promise<MarkPostUnreadResponse>;
	reactToPost(request: ReactToPostRequest): Promise<ReactToPostResponse>;

	fetchMsTeamsConversations(
		request: CSMsTeamsConversationRequest
	): Promise<CSMsTeamsConversationResponse>;
	triggerMsTeamsProactiveMessage(
		request: TriggerMsTeamsProactiveMessageRequest
	): Promise<TriggerMsTeamsProactiveMessageResponse>;

	fetchCodeErrors(request: FetchCodeErrorsRequest): Promise<FetchCodeErrorsResponse>;
	claimCodeError(request: ClaimCodeErrorRequest): Promise<ClaimCodeErrorResponse>;
	getCodeError(request: GetCodeErrorRequest): Promise<GetCodeErrorResponse>;
	updateCodeError(request: UpdateCodeErrorRequest): Promise<UpdateCodeErrorResponse>;
	deleteCodeError(request: DeleteCodeErrorRequest): Promise<DeleteCodeErrorResponse>;

	createChannelStream(request: CreateChannelStreamRequest): Promise<CreateChannelStreamResponse>;
	createDirectStream(request: CreateDirectStreamRequest): Promise<CreateDirectStreamResponse>;
	fetchStreams(request: FetchStreamsRequest): Promise<FetchStreamsResponse>;
	fetchUnreadStreams(request: FetchUnreadStreamsRequest): Promise<FetchUnreadStreamsResponse>;
	getStream(request: GetStreamRequest): Promise<GetStreamResponse>;
	archiveStream(request: ArchiveStreamRequest): Promise<ArchiveStreamResponse>;
	closeStream(request: CloseStreamRequest): Promise<CloseStreamResponse>;
	joinStream(request: JoinStreamRequest): Promise<JoinStreamResponse>;
	leaveStream(request: LeaveStreamRequest): Promise<LeaveStreamResponse>;
	markStreamRead(request: MarkStreamReadRequest): Promise<MarkStreamReadResponse>;
	markItemRead(request: MarkItemReadRequest): Promise<MarkItemReadResponse>;
	muteStream(request: MuteStreamRequest): Promise<MuteStreamResponse>;
	openStream(request: OpenStreamRequest): Promise<OpenStreamResponse>;
	renameStream(request: RenameStreamRequest): Promise<RenameStreamResponse>;
	setStreamPurpose(request: SetStreamPurposeRequest): Promise<SetStreamPurposeResponse>;
	unarchiveStream(request: UnarchiveStreamRequest): Promise<UnarchiveStreamResponse>;
	updateStreamMembership(
		request: UpdateStreamMembershipRequest
	): Promise<UpdateStreamMembershipResponse>;

	fetchTeams(request: FetchTeamsRequest): Promise<FetchTeamsResponse>;
	getTeam(request: GetTeamRequest): Promise<GetTeamResponse>;

	fetchCompanies(request: FetchCompaniesRequest): Promise<FetchCompaniesResponse>;
	getCompany(request: GetCompanyRequest): Promise<GetCompanyResponse>;
	deleteCompany(request: DeleteCompanyRequest): Promise<DeleteCompanyResponse>;
	setCompanyTestGroups(companyId: string, request: { [key: string]: string }): Promise<CSCompany>;
	addCompanyNewRelicInfo(
		companyId: string,
		accountIds?: number[],
		orgIds?: number[]
	): Promise<boolean>;
	joinCompany(request: JoinCompanyRequest): Promise<JoinCompanyResponse>;
	declineInvite(request: DeclineInviteRequest): Promise<DeclineInviteResponse>;
	logoutCompany(request: LogoutCompanyRequest): Promise<LogoutCompanyResponse>;
	joinCompanyFromEnvironment(request: JoinCompanyRequest): Promise<JoinCompanyResponse>;

	fetchUsers(request: FetchUsersRequest): Promise<FetchUsersResponse>;
	getUser(request: GetUserRequest): Promise<GetUserResponse>;
	inviteUser(request: InviteUserRequest): Promise<InviteUserResponse>;
	deleteUser(request: DeleteUserRequest): Promise<DeleteUserResponse>;
	updateUser(request: UpdateUserRequest): Promise<UpdateUserResponse>;
	kickUser(request: KickUserRequest): Promise<KickUserResponse>;

	connectThirdPartyProvider(request: {
		providerId: string;
		sharing?: boolean;
	}): Promise<{ code: string }>;
	setThirdPartyProviderInfo(request: ThirdPartyProviderSetInfoRequest): Promise<void>;
	disconnectThirdPartyProvider(request: {
		providerId: string;
		providerTeamId?: string;
	}): Promise<void>;
	addEnterpriseProviderHost(
		request: AddEnterpriseProviderHostRequest
	): Promise<AddEnterpriseProviderHostResponse>;
	removeEnterpriseProviderHost(request: RemoveEnterpriseProviderHostRequest): Promise<void>;
	refreshThirdPartyProvider(request: {
		providerId: string;
		sharing?: boolean;
		subId?: string;
	}): Promise<CSMe>;
	refreshNewRelicToken(refreshToken: string): Promise<CSNewRelicProviderInfo>;

	getNewRelicSignupJwtToken(
		request: GetNewRelicSignupJwtTokenRequest
	): Promise<GetNewRelicSignupJwtTokenResponse>;

	lookupNewRelicOrganizations(
		request: LookupNewRelicOrganizationsRequest
	): Promise<LookupNewRelicOrganizationsResponse>;

	verifyConnectivity(): Promise<VerifyConnectivityResponse>;
	setServerUrl(url: string): void;

	pollForMaintenanceMode(): Promise<PollForMaintenanceModeResponse>;

	announceHistoryFetch(info: HistoryFetchInfo): void;

	fetchBuilds(request: FetchThirdPartyBuildsRequest): Promise<FetchThirdPartyBuildsResponse>;

	get usingServiceGatewayAuth(): boolean;
	setUsingServiceGatewayAuth(): void;

	get<R extends object>(url: string, token?: string): Promise<R>;
	post<RQ extends object, R extends object>(url: string, body: any, token?: string): Promise<R>;
	put<RQ extends object, R extends object>(url: string, body: RQ, token?: string): Promise<R>;
	delete<R extends object>(url: string, token?: string): Promise<R>;
}
export interface CodeStreamApiMiddlewareContext {
	url: string;
	method: string;
	request: RequestInit | undefined;
	response?: Response;
}

export interface CodeStreamApiMiddleware {
	readonly name: string;
	onRequest?(context: Readonly<CodeStreamApiMiddlewareContext>): Promise<void>;
	onProvideResponse?<R>(context: Readonly<CodeStreamApiMiddlewareContext>): Promise<R>;
	onResponse?<R>(
		context: Readonly<CodeStreamApiMiddlewareContext>,
		responseJson: Promise<R> | undefined
	): Promise<void>;
}
