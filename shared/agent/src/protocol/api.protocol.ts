"use strict";
import { CodeStreamEnvironmentInfo } from "./agent.protocol";
import { RepoScmStatus } from "./agent.protocol.scm";
import {
	Attachment,
	ChannelServiceType,
	CodemarkType,
	CSApiCapabilities,
	CSApiFeatures,
	CSChannelStream,
	CSCodemark,
	CSCodeError,
	CSCodeErrorStatus,
	CSCompany,
	CSDirectStream,
	CSFileStream,
	CSLocationArray,
	CSMarker,
	CSMarkerLocation,
	CSMarkerLocations,
	CSMe,
	CSPost,
	CSRepository,
	CSReview,
	CSReviewChangeset,
	CSReviewDiffs,
	CSReviewStatus,
	CSStackTraceInfo,
	CSStream,
	CSTag,
	CSTeam,
	CSUser,
	ProviderType,
	ReviewChangesetFileInfo,
	StreamType
} from "./api.protocol.models";

export * from "./api.protocol.models";

export enum ApiErrors {
	InvalidCredentials = "INVALID_CREDENTIALS",
	InvalidToken = "TOKEN_INVALID",
	NotConfirmed = "NOT_CONFIRMED",
	NotOnTeam = "USER_NOT_ON_TEAM",
	NotFound = "NOT_FOUND",
	Unknown = "UNKNOWN",
	VersionUnsupported = "VERSION_UNSUPPORTED"
}

export enum LoginResult {
	Success = "SUCCESS",
	WebMail = "EMAIL_IS_WEBMAIL",
	InvalidCredentials = "INVALID_CREDENTIALS",
	InvalidToken = "TOKEN_INVALID",
	ExpiredToken = "TOKEN_EXPIRED",
	TokenNotFound = "TOKEN_NOT_FOUND",
	NotConfirmed = "NOT_CONFIRMED",
	NotInCompany = "USER_NOT_IN_COMPANY",
	NotOnTeam = "USER_NOT_ON_TEAM",
	Unknown = "UNKNOWN",
	VersionUnsupported = "VERSION_UNSUPPORTED",
	ProviderConnectFailed = "PROVIDER_CONNECT_FAILED",
	MultipleWorkspaces = "MULTIPLE_WORKSPACES",
	AlreadyConfirmed = "ALREADY_CONFIRMED",
	InviteConflict = "INVITE_CONFLICT",
	AlreadySignedIn = "ALREADY_SIGNED_IN",
	SignupRequired = "SIGNUP_REQUIRED",
	SignInRequired = "SIGNIN_REQUIRED",
	MaintenanceMode = "MAINTENANCE_MODE",
	MustSetPassword = "MUST_SET_PASSWORD",
	Timeout = "TIMEOUT"
}

export interface CSCompleteSignupRequest {
	token: string;
	nrAccountId?: number;
}

export interface CSLoginRequest {
	email: string;
	password?: string;
	token?: string;
}

export interface CSEligibleJoinCompany {
	codeHostJoining?: string[];
	domainJoining?: string[];
	id: string;
	memberCount?: number;
	name: string;
}

export interface CSLoginResponse {
	user: CSMe;
	accessToken: string;
	pubnubKey: string;
	pubnubToken: string;
	broadcasterToken?: string;
	socketCluster?: {
		host: string;
		port: string;
	};
	teams: CSTeam[];
	companies: CSCompany[];
	repos: CSRepository[];
	provider?: "codestream" | "slack" | "msteams" | string;
	providerAccess?: "strict";
	teamId?: string;
	capabilities?: CSApiCapabilities;
	features?: CSApiFeatures;
	environmentInfo: CodeStreamEnvironmentInfo;
	eligibleJoinCompanies?: CSEligibleJoinCompany[];
	accountIsConnected?: boolean;
	isWebmail?: boolean;
}

export interface CSRegisterRequest {
	email: string;
	username: string;
	password: string;
	wantLink?: boolean;
	inviteCode?: string;
	machineId?: string;
}

export interface CSRegisterResponse {
	user?: CSUser; // No user means they are already registered. for security, that message is emailed to them rather than displayed in the client
}

export interface CSNRRegisterRequest {
	apiRegion: string;
	apiKey: string;
}

export interface CSNRRegisterResponse {
	email?: CSUser;
}

export interface CSConfirmRegistrationRequest {
	email: string;
	confirmationCode: string;
	errorGroupGuid?: string;
	nrAccountId?: number;
}

export interface CSGetInviteInfoRequest {
	code: string;
}

export interface CSGetInviteInfoResponse {
	email: string;
	teamId: string;
	teamName: string;
}

export interface CSCreateMarkerLocationRequest {
	teamId: string;
	streamId: string;
	commitHash: string;
	locations: {
		[id: string]: CSLocationArray;
	};
}

export interface CSCreateMarkerLocationResponse {}

export interface CSCreatePostRequestCodeBlock {
	code: string;
	preContext?: string;
	postContext?: string;

	location?: CSLocationArray;
	commitHash?: string;

	streamId?: string;
	file?: string;

	repoId?: string;
	remotes?: string[];
}

export interface CSCreatePostRequestStream {
	teamId: string;
	type: StreamType.File;
	repoId?: string;
	file: string;
}

export interface CSCreatePostRequest {
	teamId: string;
	streamId?: string;
	stream?: CSCreatePostRequestStream;
	parentPostId?: string;
	text: string;
	codeBlocks?: CSCreatePostRequestCodeBlock[];
	commitHashWhenPosted?: string;
	mentionedUserIds?: string[];
	title?: string;
	type?: string;
	assignees?: [];
	color?: string;
}

export interface CSCreatePostResponse {
	post: CSPost;
	codemarks?: CSCodemark[];
	markers?: CSMarker[];
	markerLocations?: CSMarkerLocations[];
	streams?: CSStream[];
	repos?: CSRepository[];
	reviews?: CSReview[];
	codeErrors?: CSCodeError[];
}

export interface CSCreateRepoRequest {
	teamId: string;
	url: string;
	knownCommitHashes: string[];
}

export interface CSCreateRepoResponse {
	repo: CSRepository;
}

export interface CSCreateChannelStreamRequest {
	teamId: string;
	type: StreamType.Channel;
	name: string;
	memberIds?: string[];
	isTeamStream: boolean;
	privacy: "public" | "private";
	purpose?: string;
	serviceType?: ChannelServiceType.Vsls;
	serviceKey?: string;
	serviceInfo?: { [key: string]: any };
}

export interface CSCreateChannelStreamResponse {
	stream: CSChannelStream;
}

export interface CSCreateDirectStreamRequest {
	teamId: string;
	type: StreamType.Direct;
	memberIds: string[];
}

export interface CSCreateDirectStreamResponse {
	stream: CSDirectStream;
}

export interface CSCreateFileStreamRequest {
	teamId: string;
	repoId: string;
	type: StreamType.File;
	file: string;
}

export interface CSCreateFileStreamResponse {
	stream: CSFileStream;
}

export type CSCreateStreamRequest =
	| CSCreateChannelStreamRequest
	| CSCreateDirectStreamRequest
	| CSCreateFileStreamRequest;

export type CSCreateStreamResponse =
	| CSCreateChannelStreamResponse
	| CSCreateDirectStreamResponse
	| CSCreateFileStreamResponse;

export interface CSDeletePostResponse {
	posts: any[];
	codemarks: any[];
	markers: any[];
}

export interface CSDeleteTeamContentRequest {
	teamId: string;
	includeStreams?: boolean;
	newerThan?: number;
}

export interface CSDeleteTeamContentResponse {}

export interface CSEditPostRequest {
	text: string;
	mentionedUserIds?: string[];
}

export interface CSEditPostResponse {
	post: { [key: string]: any };
}

export interface CSUpdatePostSharingDataRequest {
	[key: string]: any;
}

export interface CSUpdatePostSharingDataResponse {
	post: { [key: string]: any };
}

export interface CSReactions {
	[emoji: string]: boolean;
}

export interface CSReactToPostRequest {
	emojis: CSReactions;
}

export interface CSReactToPostResponse {
	post: { [key: string]: any };
}

export interface CSSetPostStatusRequest {
	status: string;
}

export interface CSSetPostStatusResponse {
	post: { [key: string]: any };
}

export interface CSMarkPostUnreadRequest {}

export interface CSMarkPostUnreadResponse {}

export interface CSMarkItemReadRequest {}

export interface CSMarkItemReadResponse {}

export interface CSSetCodemarkPinnedRequest {}

export interface CSSetCodemarkPinnedResponse {
	codemark: CSCodemark;
}

export interface CSPinReplyToCodemarkRequest {
	codemarkId: string;
	postId: string;
	value: boolean;
}

export interface CSPinReplyToCodemarkResponse {
	codemark: CSCodemark;
}

export interface CSFindRepoResponse {
	repo?: CSRepository;
	usernames?: string[];
}

export interface CSGetMarkerLocationsResponse {
	markerLocations: CSMarkerLocations;
}

export interface CSGetMarkerResponse {
	marker: CSMarker;
}

export interface CSGetMarkersRequest {
	streamId: string;
	teamId: string;
	commitHash?: string;
	markerIds?: string[];
}

export interface CSGetMarkersResponse {
	markers: CSMarker[];
	markerLocations: CSMarkerLocation[];
	codemarks: CSCodemark[];
	reviews: CSReview[];
	codeErrors: CSCodeError[];
	posts: CSPost[];
}

export interface CSGetPostResponse {
	post: CSPost;
}

export interface CSGetPostsResponse {
	posts: CSPost[];
	codemarks?: CSCodemark[];
	reviews?: CSReview[];
	codeErrors?: CSCodeError[];
	markers?: CSMarker[];
	more?: boolean;
}

export interface CSGetRepoResponse {
	repo: CSRepository;
}

export interface CSGetReposResponse {
	repos: CSRepository[];
}

export interface CSGetStreamResponse<T extends CSStream> {
	stream: T;
}

export interface CSGetStreamsResponse<T extends CSStream> {
	more: boolean | undefined;
	streams: T[];
}

export interface CSCreateTeamBaseRequest {
	name: string;
}

export interface CSCreateTeamAndCompanyRequest extends CSCreateTeamBaseRequest {
	company: { name: string };
}

export interface CSCreateTeamForCompanyRequest extends CSCreateTeamBaseRequest {
	companyId: string;
}

export type CSCreateTeamRequest =
	| CSCreateTeamBaseRequest
	| CSCreateTeamAndCompanyRequest
	| CSCreateTeamForCompanyRequest;

export interface CSCreateTeamResponse {
	team: CSTeam;
	company?: CSCompany;
	streams?: CSStream[];
}

export interface CSGetTeamResponse {
	team: CSTeam;
}

export interface CSGetTeamsResponse {
	teams: CSTeam[];
}

export interface CSGetCompaniesResponse {
	companies: CSCompany[];
}

export interface CSGetCompanyResponse {
	company: CSCompany;
}

export interface CSGetUserResponse {
	user: CSUser;
}

export interface CSGetUsersResponse {
	users: CSUser[];
}

export interface CSInviteUserRequest {
	email: string;
	teamId: string;
	fullName?: string;
	dontSendEmail?: boolean;
}

export interface CSInviteUserResponse {
	user: CSUser;
}

export interface CSUpdateUserRequest {
	username?: string;
	fullName?: string;
	timeZone?: string;
}

export interface CSUpdateUserResponse {
	user: CSUser;
}

export interface CSJoinStreamRequest {}

export interface CSJoinStreamResponse {
	stream: { [key: string]: any };
}

export interface CSGetMeResponse {
	user: CSMe;
}

export enum CSPresenceStatus {
	Online = "online",
	Away = "away"
}

export interface CSCreateCodemarkRequest {
	teamId: string;
	providerType?: ProviderType | undefined;
	type: CodemarkType;
	text?: string;
	streamId?: string;
	postId?: string;
	parentPostId?: string;
	status?: string;
	title?: string;
	assignees?: string[];
	tags?: string[];
	markers?: CSCreateMarkerRequest[];
	remotes?: string[];
	externalProvider?: string;
	externalProviderUrl?: string;
	externalProviderHost?: string;
	externalAssignees?: { displayName: string; email?: string }[];
	remoteCodeUrl?: { name: string; url: string };
	threadUrl?: string;
	createPermalink?: false | "public" | "private";
	relatedCodemarkIds?: string[];
}
export interface CSCreateMarkerRequest {
	code: string;
	remotes?: string[];
	file?: string;
	commitHash?: string;
	location?: CSLocationArray;
}

export interface CSCreateMarkerResponse {
	marker: CSMarker;
}

export interface CSAddMarkersRequest {
	markers: CSCreateMarkerRequest[];
	at?: number[];
}

export interface CSAddMarkersResponse {
	codemark: CSCodemark;
}

export interface CSCreateCodemarkResponse {
	codemark: CSCodemark;
	markers?: CSMarker[];
	markerLocations?: CSMarkerLocations[];
	streams?: CSStream[];
	repos?: CSRepository[];
	permalink?: string;
}

export interface CSGetCodemarkResponse {
	codemark: CSCodemark;
	post?: CSPost;
	markers?: CSMarker[];
}

export interface CSGetCodemarksResponse {
	codemarks: CSCodemark[];
	posts?: CSPost[];
	markers?: CSMarker[];
}

export interface CSUpdateCodemarkRequest {
	streamId?: string;
	postId?: string;
}
export interface CSUpdateCodemarkResponse {
	codemark: CSCodemark;
}

export interface CSDeleteCodemarkRequest {
	codemarkId: string;
}
export interface CSDeleteCodemarkResponse {}

export type CSReviewCheckpoint = number | undefined;

export interface CSRepoChange {
	scm: RepoScmStatus;
	startCommit: string;
	excludeCommit: string;
	excludedFiles: string[];
	newFiles: string[];
	includeSaved: boolean;
	includeStaged: boolean;
	checkpoint: CSReviewCheckpoint;
}

export interface CSCreateReviewRequest {
	teamId: string;
	title?: string;
	text?: string;
	streamId?: string;
	postId?: string;
	parentPostId?: string;
	status?: string;
	reviewers?: string[];
	authorsById?: { [authorId: string]: { stomped: number; commits: number } };
	followerIds?: string[];
	codeAuthorIds?: string[];
	tags?: string[];

	repoChanges?: CSRepoChange[];

	markers?: CSCreateMarkerRequest[];
	remotes?: string[];

	externalProvider?: string;
	externalProviderUrl?: string;
	externalProviderHost?: string;
	remoteCodeUrl?: { name: string; url: string };
	files?: Attachment[];
	// threadUrl?: string;
}

export interface CSGetReviewRequest {
	id: string;
}

export interface CSGetReviewResponse {
	review: CSReview;
	post: CSPost;
	markers?: CSMarker[];
}

export interface CSGetReviewsRequest {
	teamId: string;
	streamId?: string;
	ids?: string[];
}

export interface CSGetReviewsResponse {
	reviews: CSReview[];
	posts?: CSPost[];
	markers?: CSMarker[];
}

export interface CSCreateCodeErrorResponse {
	codeError: CSCodeError;
	streams?: CSStream[];
	repos?: CSRepository[];
}

export interface CSCreateCodeErrorRequest {
	teamId: string;
	stackTraces: CSStackTraceInfo[];
	providerUrl?: string;
	streamId?: string;
	postId?: string;
	parentPostId?: string;
	status?: string;
	assignees?: string[];
	followerIds?: string[];
	codeAuthorIds?: string[];

	markers?: CSCreateMarkerRequest[];
	remotes?: string[];
}

export interface CSCreateCodeErrorResponse {
	codeError: CSCodeError;
	streams?: CSStream[];
	repos?: CSRepository[];
}

export interface CSCreateChangeSetRequest {}

export interface CSGetCodeErrorRequest {
	id: string;
}

export interface CSGetCodeErrorResponse {
	codeError: CSCodeError;
	post: CSPost;
	markers?: CSMarker[];
}

export interface CSGetCodeErrorsRequest {
	teamId: string;
	streamId?: string;
	ids?: string[];
}

export interface CSGetCodeErrorsResponse {
	codeErrors: CSCodeError[];
	posts?: CSPost[];
	markers?: CSMarker[];
}

export enum FileStatus {
	untracked = "?",
	added = "A",
	renamed = "R",
	deleted = "D",
	copied = "C",
	unmerged = "U",
	modified = "M"
}

export interface ModifiedFile {
	oldFile: string;
	file: string;
	linesAdded: number;
	linesRemoved: number;
	status: FileStatus;
}

export interface CSTransformedReviewChangeset {
	repoId: string;
	branch: string;
	commits: { sha: string; info: {}; localOnly: boolean }[];
	modifiedFiles: ModifiedFile[];
	modifiedFilesInCheckpoint: ReviewChangesetFileInfo[];
	includeSaved: boolean;
	includeStaged: boolean;
	checkpoint: CSReviewCheckpoint;
	diffs: CSReviewDiffs;
}

export interface CSUpdateReviewRequest {
	// edit the status, title or text
	status?: CSReviewStatus;
	title?: string;
	text?: string;
	allReviewersMustApprove?: boolean;
	pullRequestUrl?: string;
	pullRequestTitle?: string;
	pullRequestProviderId?: string;

	$addToSet?: {
		/**
		 * This is the transformed version of `repoChanges`
		 * that is sent to the server
		 */
		reviewChangesets?: CSTransformedReviewChangeset[];
	};
}

export interface CSUpdateReviewResponse {
	review: CSReview;
}

export interface CSUpdateCodeErrorRequest {
	// edit the status, title or text
	status?: CSCodeErrorStatus;
	stackTraces?: CSStackTraceInfo[];
}

export interface CSUpdateCodeErrorResponse {
	codeError: CSCodeError;
}

export interface CSDeleteReviewRequest {
	id: string;
}
export interface CSDeleteReviewResponse {}

export interface CSDeleteCodeErrorRequest {
	id: string;
}
export interface CSDeleteCodeErrorResponse {}

export interface CSUpdateMarkerRequest {
	commitHashWhenCreated?: string;
}

export interface CSGetReviewDiffsRequest {
	reviewId: string;
}

export interface CSGetReviewDiffsResponse {
	[repoId: string]: CSReviewDiffs;
}

export interface CSGetReviewCheckpointDiffsResponse
	extends Array<{
		repoId: string;
		checkpoint: CSReviewCheckpoint;
		diffs: CSReviewDiffs;
	}> {}

export interface CSAddReferenceLocationRequest {
	commitHash: string;
	location: CSLocationArray;
	flags: { [id: string]: boolean };
}

export interface CSAddReferenceLocationResponse {
	// marker: < some directive >,
	// markerLocations: < markerLocations update >
}

export interface CSUpdateMarkerResponse {
	marker: CSMarker;
}

export interface CSUpdatePresenceRequest {
	sessionId: string;
	status: CSPresenceStatus;
}

export interface CSUpdatePresenceResponse {
	awayTimeout: number;
}

export interface CSUpdateStreamRequest {
	name?: string;
	purpose?: string;
	isArchived?: boolean;
	$push?: {
		memberIds: string[];
	};
	$pull?: {
		memberIds: string[];
	};
}

export interface CSUpdateStreamResponse {
	stream: { [key: string]: any };
}

export interface CSCreateCodemarkPermalinkRequest {
	isPublic: boolean;
}
export interface CSCreateCodemarkPermalinkResponse {
	permalink: string;
}

export interface CSTrackProviderPostRequest {
	provider: string;
	teamId: string;
	streamId: string;
	postId: string;
	parentPostId?: string;
}

export interface CSGetTelemetryKeyResponse {
	key: string;
}

export interface CSGetApiCapabilitiesResponse {
	capabilities: CSApiCapabilities;
}

export interface CSAddProviderHostRequest {
	host: string;
	appClientId?: string;
	appClientSecret?: string;
	[key: string]: any;
}

export interface CSAddProviderHostResponse {
	team: any;
	providerId: string;
}

export interface CSRemoveProviderHostRequest {
	host: string;
}

export interface CSRemoveProviderHostResponse {
	team: any;
}

export interface CSTeamTagRequest {
	team: CSTeam;
	tag: CSTag;
}

export interface CSTeamTagResponse {
	// name: string;
}

export interface CSSetPasswordRequest {
	newPassword: string;
}

export interface CSSetPasswordResponse {
	accessToken: string;
}

export interface CSMsTeamsConversationRequest {
	tenantId: string;
}

export interface CSMsTeamsConversation {
	conversationId: string;
	channelName: string;
}
export interface CSMsTeamsConversationResponse {
	msteams_conversations: CSMsTeamsConversation[];
}

export interface TriggerMsTeamsProactiveMessageRequest {
	channelId: string;
	providerTeamId: string;
	// can share either a codemark
	codemarkId?: string;
	// ...or a review
	reviewId?: string;
}

export interface TriggerMsTeamsProactiveMessageResponse {}
