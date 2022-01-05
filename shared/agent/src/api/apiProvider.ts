import { RequestInit, Response } from "node-fetch";
import { Disposable, Event } from "vscode-languageserver";
import {
	AccessToken,
	AddEnterpriseProviderHostRequest,
	AddEnterpriseProviderHostResponse,
	AddMarkersResponse,
	AddReferenceLocationRequest,
	AddReferenceLocationResponse,
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
	CreateCodemarkPermalinkRequest,
	CreateCodemarkPermalinkResponse,
	CreateCodemarkRequest,
	CreateCodemarkResponse,
	CreateDirectStreamRequest,
	CreateDirectStreamResponse,
	CreateExternalPostRequest,
	CreateMarkerLocationRequest,
	CreateMarkerLocationResponse,
	CreateMarkerRequest,
	CreatePostRequest,
	CreatePostResponse,
	CreateRepoRequest,
	CreateRepoResponse,
	DeleteCodeErrorRequest,
	DeleteCodeErrorResponse,
	DeleteCodemarkRequest,
	DeleteCodemarkResponse,
	DeleteCompanyRequest,
	DeleteCompanyResponse,
	DeleteMarkerRequest,
	DeleteMarkerResponse,
	DeletePostRequest,
	DeletePostResponse,
	DeleteReviewRequest,
	DeleteReviewResponse,
	DeleteUserRequest,
	DeleteUserResponse,
	EditPostRequest,
	EditPostResponse,
	FetchCodeErrorsRequest,
	FetchCodeErrorsResponse,
	FetchCodemarksRequest,
	FetchCodemarksResponse,
	FetchCompaniesRequest,
	FetchCompaniesResponse,
	FetchFileStreamsRequest,
	FetchFileStreamsResponse,
	FetchMarkerLocationsRequest,
	FetchMarkerLocationsResponse,
	FetchMarkersRequest,
	FetchMarkersResponse,
	FetchPostRepliesRequest,
	FetchPostRepliesResponse,
	FetchPostsRequest,
	FetchPostsResponse,
	FetchReposRequest,
	FetchReposResponse,
	FetchReviewCheckpointDiffsRequest,
	FetchReviewCheckpointDiffsResponse,
	FetchReviewDiffsRequest,
	FetchReviewDiffsResponse,
	FetchReviewsRequest,
	FetchReviewsResponse,
	FetchStreamsRequest,
	FetchStreamsResponse,
	FetchTeamsRequest,
	FetchTeamsResponse,
	FetchUnreadStreamsRequest,
	FetchUnreadStreamsResponse,
	FetchUsersRequest,
	FetchUsersResponse,
	FollowCodeErrorRequest,
	FollowCodeErrorResponse,
	FollowCodemarkRequest,
	FollowCodemarkResponse,
	FollowReviewRequest,
	FollowReviewResponse,
	GetCodeErrorRequest,
	GetCodeErrorResponse,
	GetCodemarkRequest,
	GetCodemarkResponse,
	GetCompanyRequest,
	GetCompanyResponse,
	GetMarkerRequest,
	GetMarkerResponse,
	GetMeResponse,
	GetNewRelicSignupJwtTokenRequest,
	GetNewRelicSignupJwtTokenResponse,
	GetPostRequest,
	GetPostResponse,
	GetPostsRequest,
	GetPostsResponse,
	GetPreferencesResponse,
	GetRepoRequest,
	GetRepoResponse,
	GetReviewRequest,
	GetReviewResponse,
	GetStreamRequest,
	GetStreamResponse,
	GetTeamRequest,
	GetTeamResponse,
	GetUnreadsRequest,
	GetUnreadsResponse,
	GetUserRequest,
	GetUserResponse,
	InviteUserRequest,
	InviteUserResponse,
	JoinStreamRequest,
	JoinStreamResponse,
	KickUserRequest,
	KickUserResponse,
	LeaveStreamRequest,
	LeaveStreamResponse,
	LookupNewRelicOrganizationsRequest,
	LookupNewRelicOrganizationsResponse,
	MarkItemReadRequest,
	MarkItemReadResponse,
	MarkPostUnreadRequest,
	MarkPostUnreadResponse,
	MarkStreamReadRequest,
	MarkStreamReadResponse,
	MatchReposRequest,
	MatchReposResponse,
	MoveMarkerResponse,
	MuteStreamRequest,
	MuteStreamResponse,
	OpenStreamRequest,
	OpenStreamResponse,
	PinReplyToCodemarkRequest,
	PinReplyToCodemarkResponse,
	ReactToPostRequest,
	ReactToPostResponse,
	RemoveEnterpriseProviderHostRequest,
	RenameStreamRequest,
	RenameStreamResponse,
	SetCodemarkPinnedRequest,
	SetCodemarkPinnedResponse,
	SetCodemarkStatusRequest,
	SetCodemarkStatusResponse,
	SetModifiedReposRequest,
	SetStreamPurposeRequest,
	SetStreamPurposeResponse,
	ThirdPartyProviderSetTokenRequest,
	UnarchiveStreamRequest,
	UnarchiveStreamResponse,
	Unreads,
	UpdateCodeErrorRequest,
	UpdateCodeErrorResponse,
	UpdateCodemarkRequest,
	UpdateCodemarkResponse,
	UpdateInvisibleRequest,
	UpdateInvisibleResponse,
	UpdateMarkerRequest,
	UpdateMarkerResponse,
	UpdatePostSharingDataRequest,
	UpdatePostSharingDataResponse,
	UpdatePreferencesRequest,
	UpdatePreferencesResponse,
	UpdatePresenceRequest,
	UpdatePresenceResponse,
	UpdateReviewRequest,
	UpdateReviewResponse,
	UpdateStatusRequest,
	UpdateStatusResponse,
	UpdateStreamMembershipRequest,
	UpdateStreamMembershipResponse,
	UpdateUserRequest,
	UpdateUserResponse,
	VerifyConnectivityResponse
} from "../protocol/agent.protocol";
import {
	CSApiCapabilities,
	CSApiFeatures,
	CSChannelStream,
	CSCodeError,
	CSCodemark,
	CSCompany,
	CSDirectStream,
	CSLoginResponse,
	CSMarker,
	CSMarkerLocations,
	CSMe,
	CSMePreferences,
	CSMsTeamsConversationRequest,
	CSMsTeamsConversationResponse,
	CSObjectStream,
	CSPost,
	CSRepository,
	CSReview,
	CSTeam,
	CSUser,
	ProviderType,
	TriggerMsTeamsProactiveMessageRequest,
	TriggerMsTeamsProactiveMessageResponse
} from "../protocol/api.protocol";
import { HistoryFetchInfo } from "broadcaster/broadcaster";

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

export type LoginOptions = CredentialsLoginOptions | OneTimeCodeLoginOptions | TokenLoginOptions;

export enum MessageType {
	Connection = "connection",
	Companies = "companies",
	Codemarks = "codemarks",
	Documents = "documents",
	MarkerLocations = "markerLocations",
	Markers = "markers",
	Posts = "posts",
	Preferences = "preferences",
	Repositories = "repos",
	Reviews = "reviews",
	CodeErrors = "codeErrors",
	Streams = "streams",
	Teams = "teams",
	Unreads = "unreads",
	Users = "users",
	Echo = "echo"
}

export interface CompaniesRTMessage {
	type: MessageType.Companies;
	data: CSCompany[];
}

export interface CodemarksRTMessage {
	type: MessageType.Codemarks;
	data: CSCodemark[];
}

export interface ConnectionRTMessage {
	type: MessageType.Connection;
	data: { reset?: boolean; status: ConnectionStatus };
}

export interface MarkerLocationsRTMessage {
	type: MessageType.MarkerLocations;
	data: CSMarkerLocations[];
}

export interface MarkersRTMessage {
	type: MessageType.Markers;
	data: CSMarker[];
}

export interface PostsRTMessage {
	type: MessageType.Posts;
	data: CSPost[];
}

export interface PreferencesRTMessage {
	type: MessageType.Preferences;
	data: CSMePreferences;
}

export interface RepositoriesRTMessage {
	type: MessageType.Repositories;
	data: CSRepository[];
}

export interface ReviewsRTMessage {
	type: MessageType.Reviews;
	data: CSReview[];
}

export interface CodeErrorsRTMessage {
	type: MessageType.CodeErrors;
	data: CSCodeError[];
}

export interface StreamsRTMessage {
	type: MessageType.Streams;
	data: (CSChannelStream | CSDirectStream | CSObjectStream)[];
}

export interface TeamsRTMessage {
	type: MessageType.Teams;
	data: CSTeam[];
}

export interface UnreadsRTMessage {
	type: MessageType.Unreads;
	data: Unreads;
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

export type RTMessage =
	| CodemarksRTMessage
	| CompaniesRTMessage
	| ConnectionRTMessage
	| MarkerLocationsRTMessage
	| MarkersRTMessage
	| PostsRTMessage
	| PreferencesRTMessage
	| RepositoriesRTMessage
	| ReviewsRTMessage
	| CodeErrorsRTMessage
	| StreamsRTMessage
	| TeamsRTMessage
	| UnreadsRTMessage
	| UsersRTMessage
	| EchoMessage;

export interface ApiProvider {
	onDidReceiveMessage: Event<RTMessage>;

	readonly baseUrl: string;
	readonly teamId: string;
	readonly userId: string;
	readonly meUser: CSMe | undefined;
	readonly capabilities: Capabilities;
	readonly features: CSApiFeatures | undefined;

	providerType: ProviderType;

	fetch<R extends object>(url: string, init?: RequestInit, token?: string): Promise<R>;
	useMiddleware(middleware: CodeStreamApiMiddleware): Disposable;
	dispose(): Promise<void>;

	login(options: LoginOptions): Promise<ApiProviderLoginResponse>;
	subscribe(types?: MessageType[]): Promise<void>;

	grantBroadcasterChannelAccess(token: string, channel: string): Promise<{}>;

	getMe(): Promise<GetMeResponse>;
	getUnreads(request: GetUnreadsRequest): Promise<GetUnreadsResponse>;
	updatePreferences(request: UpdatePreferencesRequest): Promise<UpdatePreferencesResponse>;
	updateInvisible(request: UpdateInvisibleRequest): Promise<UpdateInvisibleResponse>;
	updateStatus(request: UpdateStatusRequest): Promise<UpdateStatusResponse>;
	setModifiedRepos(request: SetModifiedReposRequest): Promise<void>;
	getPreferences(): Promise<GetPreferencesResponse>;
	updatePresence(request: UpdatePresenceRequest): Promise<UpdatePresenceResponse>;
	getTelemetryKey(): Promise<string>;
	getApiCapabilities(): Promise<CSApiCapabilities>;

	// createFileStream(request: CreateFileStreamRequest): Promise<CreateFileStreamResponse>;
	fetchFileStreams(request: FetchFileStreamsRequest): Promise<FetchFileStreamsResponse>;

	createCodemark(request: CreateCodemarkRequest): Promise<CreateCodemarkResponse>;
	deleteCodemark(request: DeleteCodemarkRequest): Promise<DeleteCodemarkResponse>;
	fetchCodemarks(request: FetchCodemarksRequest): Promise<FetchCodemarksResponse>;
	getCodemark(request: GetCodemarkRequest): Promise<GetCodemarkResponse>;
	setCodemarkPinned(request: SetCodemarkPinnedRequest): Promise<SetCodemarkPinnedResponse>;
	pinReplyToCodemark(request: PinReplyToCodemarkRequest): Promise<PinReplyToCodemarkResponse>;
	setCodemarkStatus(request: SetCodemarkStatusRequest): Promise<SetCodemarkStatusResponse>;
	updateCodemark(request: UpdateCodemarkRequest): Promise<UpdateCodemarkResponse>;
	followCodemark(request: FollowCodemarkRequest): Promise<FollowCodemarkResponse>;
	followReview(request: FollowReviewRequest): Promise<FollowReviewResponse>;
	followCodeError(request: FollowCodeErrorRequest): Promise<FollowCodeErrorResponse>;

	createCodemarkPermalink(
		request: CreateCodemarkPermalinkRequest
	): Promise<CreateCodemarkPermalinkResponse>;

	createMarkerLocation(request: CreateMarkerLocationRequest): Promise<CreateMarkerLocationResponse>;
	fetchMarkerLocations(request: FetchMarkerLocationsRequest): Promise<FetchMarkerLocationsResponse>;
	addReferenceLocation(request: AddReferenceLocationRequest): Promise<AddReferenceLocationResponse>;

	fetchMarkers(request: FetchMarkersRequest): Promise<FetchMarkersResponse>;
	getMarker(request: GetMarkerRequest): Promise<GetMarkerResponse>;
	updateMarker(request: UpdateMarkerRequest): Promise<UpdateMarkerResponse>;
	moveMarker(request: {
		oldMarkerId: string;
		newMarker: CreateMarkerRequest;
	}): Promise<MoveMarkerResponse>;
	addMarkers(request: {
		codemarkId: string;
		newMarkers: CreateMarkerRequest[];
	}): Promise<AddMarkersResponse>;
	deleteMarker(request: DeleteMarkerRequest): Promise<DeleteMarkerResponse>;

	createExternalPost(request: CreateExternalPostRequest): Promise<CreatePostResponse>;
	createPost(request: CreatePostRequest): Promise<CreatePostResponse>;
	deletePost(request: DeletePostRequest): Promise<DeletePostResponse>;
	editPost(request: EditPostRequest): Promise<EditPostResponse>;
	updatePostSharingData(
		request: UpdatePostSharingDataRequest
	): Promise<UpdatePostSharingDataResponse>;
	fetchPostReplies(request: FetchPostRepliesRequest): Promise<FetchPostRepliesResponse>;
	fetchPosts(request: FetchPostsRequest): Promise<FetchPostsResponse>;
	getPost(request: GetPostRequest): Promise<GetPostResponse>;
	getPosts(request: GetPostsRequest | Partial<GetPostRequest>): Promise<GetPostsResponse>;
	markPostUnread(request: MarkPostUnreadRequest): Promise<MarkPostUnreadResponse>;
	reactToPost(request: ReactToPostRequest): Promise<ReactToPostResponse>;

	createRepo(request: CreateRepoRequest): Promise<CreateRepoResponse>;
	fetchRepos(request: FetchReposRequest): Promise<FetchReposResponse>;
	getRepo(request: GetRepoRequest): Promise<GetRepoResponse>;
	matchRepos(request: MatchReposRequest): Promise<MatchReposResponse>;
	matchRepo(request: MatchReposRequest): Promise<MatchReposResponse>;

	fetchMsTeamsConversations(
		request: CSMsTeamsConversationRequest
	): Promise<CSMsTeamsConversationResponse>;
	triggerMsTeamsProactiveMessage(
		request: TriggerMsTeamsProactiveMessageRequest
	): Promise<TriggerMsTeamsProactiveMessageResponse>;

	fetchReviews(request: FetchReviewsRequest): Promise<FetchReviewsResponse>;
	getReview(request: GetReviewRequest): Promise<GetReviewResponse>;
	updateReview(request: UpdateReviewRequest): Promise<UpdateReviewResponse>;
	deleteReview(request: DeleteReviewRequest): Promise<DeleteReviewResponse>;

	fetchReviewDiffs(request: FetchReviewDiffsRequest): Promise<FetchReviewDiffsResponse>;
	fetchReviewCheckpointDiffs(
		request: FetchReviewCheckpointDiffsRequest
	): Promise<FetchReviewCheckpointDiffsResponse>;

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
	setThirdPartyProviderToken(request: ThirdPartyProviderSetTokenRequest): Promise<void>;
	setThirdPartyProviderInfo(request: {
		providerId: string;
		host?: string;
		data: { [key: string]: any };
	}): Promise<void>;
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
		refreshToken: string;
		sharing?: boolean;
		subId?: string;
	}): Promise<CSMe>;

	getNewRelicSignupJwtToken(
		request: GetNewRelicSignupJwtTokenRequest
	): Promise<GetNewRelicSignupJwtTokenResponse>;

	lookupNewRelicOrganizations(
		request: LookupNewRelicOrganizationsRequest
	): Promise<LookupNewRelicOrganizationsResponse>;

	verifyConnectivity(): Promise<VerifyConnectivityResponse>;
	setServerUrl(url: string): void;

	announceHistoryFetch(info: HistoryFetchInfo): void;

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
