"use strict";
import { NotificationType, TextDocumentIdentifier } from "vscode-languageserver-protocol";
import { CodeStreamEnvironmentInfo, GetMyPullRequestsResponse } from "./agent.protocol";
import { LoginSuccessResponse, TokenLoginRequest } from "./agent.protocol.auth";
import { CodemarkPlus } from "./agent.protocol.codemarks";
import { ThirdPartyProviders } from "./agent.protocol.providers";
import {
	CSAccessTokenType,
	CSApiCapabilities,
	CSCodeError,
	CSCompany,
	CSLastReadItems,
	CSLastReads,
	CSMarker,
	CSMarkerLocations,
	CSMePreferences,
	CSPost,
	CSRepository,
	CSReview,
	CSStream,
	CSTeam,
	CSUser,
} from "./api.protocol";

export interface RestartRequiredNotification {}

export const RestartRequiredNotificationType = new NotificationType<
	RestartRequiredNotification,
	void
>("codestream/restartRequired");

export enum ConnectionCode {
	"BroadcasterConnectionLost" = "BCOM-1001",
	"ApiBroadcasterConnectionFailure" = "BCOM-1002",
	"ApiBroadcasterAcknowledgementFailure" = "BCOM-1003",
	"EchoTimeout" = "BCOM-1004",
}

export enum ConnectionStatus {
	Disconnected = "disconnected",
	Reconnected = "reconnected",
	Reconnecting = "reconnecting",
}

export interface DidChangeConnectionStatusNotification {
	reset?: boolean;
	status: ConnectionStatus;
	code?: string;
}

export const DidChangeConnectionStatusNotificationType = new NotificationType<
	DidChangeConnectionStatusNotification,
	void
>("codestream/didChangeConnectionStatus");

export enum SessionTokenStatus {
	Active = "active",
	Expired = "expired",
}

export interface DidChangeSessionTokenStatusNotification {
	status: SessionTokenStatus;
}

export const DidChangeSessionTokenStatusNotificationType = new NotificationType<
	DidChangeSessionTokenStatusNotification,
	void
>("codestream/didChangeSessionTokenStatus");

export enum ChangeDataType {
	Codemarks = "codemarks",
	CodeErrors = "codeErrors",
	Commits = "commits",
	Companies = "companies",
	MarkerLocations = "markerLocations",
	Markers = "markers",
	Posts = "posts",
	Preferences = "preferences",
	PullRequests = "pullRequests",
	Repositories = "repos",
	Reviews = "reviews",
	Streams = "streams",
	Teams = "teams",
	Unreads = "unreads",
	Users = "users",
	Providers = "providers",
	ApiCapabilities = "apiCapabilities",
	Workspace = "workspace",
	AsyncError = "asyncError",
	GrokStream = "grokStream",
}

export interface CodemarksChangedNotification {
	type: ChangeDataType.Codemarks;
	data: CodemarkPlus[];
}

export interface CompaniesChangedNotification {
	type: ChangeDataType.Companies;
	data: CSCompany[];
}

export interface MarkerLocationsChangedNotification {
	type: ChangeDataType.MarkerLocations;
	data: CSMarkerLocations[];
}

export interface MarkersChangedNotification {
	type: ChangeDataType.Markers;
	data: CSMarker[];
}

export interface CSAsyncError {
	type: string;
	errorMessage: string;
	extra: {
		[key: string]: string;
	};
}

export interface CSAsyncGrokError extends CSAsyncError {
	extra: {
		codeErrorId: string;
		topmostPostId: string;
		postId?: string;
		streamId?: string;
	};
}

export interface CSGrokStream {
	sequence: number;
	content?: {
		content: string;
		role: string;
	};
	extra: {
		topmostPostId: string;
		codeErrorId: string;
		postId: string;
		streamId: string;
		done?: boolean;
	};
}

export interface PostsChangedNotification {
	type: ChangeDataType.Posts;
	data: CSPost[];
}

export interface PreferencesChangedNotification {
	type: ChangeDataType.Preferences;
	data: CSMePreferences;
}

export interface PullRequestsChangedData {
	queryName: string;
	pullRequest: GetMyPullRequestsResponse;
}

export interface PullRequestsChangedNotification {
	type: ChangeDataType.PullRequests;
	data: PullRequestsChangedData[];
}

export interface RepositoriesChangedNotification {
	type: ChangeDataType.Repositories;
	data: CSRepository[];
}

export interface ReviewsChangedNotification {
	type: ChangeDataType.Reviews;
	data: CSReview[];
}

export interface CodeErrorsChangedNotification {
	type: ChangeDataType.CodeErrors;
	data: CSCodeError[];
}

export interface GrokExceptionChangedNotification {
	type: ChangeDataType.AsyncError;
	data: CSAsyncError[];
}

export interface GrokStreamChangedNotification {
	type: ChangeDataType.GrokStream;
	data: CSGrokStream[];
}

export interface StreamsChangedNotification {
	type: ChangeDataType.Streams;
	data: CSStream[];
}

export interface TeamsChangedNotification {
	type: ChangeDataType.Teams;
	data: CSTeam[];
}

export interface Unreads {
	lastReads: CSLastReads;
	lastReadItems: CSLastReadItems;
	mentions: { [streamId: string]: number };
	unreads: { [streamId: string]: number };
	totalMentions: number;
	totalUnreads: number;
}

export interface UnreadsChangedNotification {
	type: ChangeDataType.Unreads;
	data: Unreads;
}

export interface PreferencesChangedNotification {
	type: ChangeDataType.Preferences;
	data: CSMePreferences;
}

export interface UsersChangedNotification {
	type: ChangeDataType.Users;
	data: CSUser[];
}

export interface ProvidersChangedNotification {
	type: ChangeDataType.Providers;
	data: ThirdPartyProviders;
}

export interface ApiCapabilitiesChangedNotification {
	type: ChangeDataType.ApiCapabilities;
	data: CSApiCapabilities;
}

export interface CommitsChangedData {
	type: string;
	path: string;
	repo: {
		id: string | undefined;
		path: string;
		normalizedPath: string;
	};
}

export interface WorkspaceChangedData {}

export interface CommitsChangedNotification {
	type: ChangeDataType.Commits;
	data: CommitsChangedData;
}

export interface WorkspaceChangedNotification {
	type: ChangeDataType.Workspace;
	data: WorkspaceChangedData;
}

export type DidChangeDataNotification =
	| CodemarksChangedNotification
	| CompaniesChangedNotification
	| MarkerLocationsChangedNotification
	| MarkersChangedNotification
	| PostsChangedNotification
	| PreferencesChangedNotification
	| PullRequestsChangedNotification
	| RepositoriesChangedNotification
	| ReviewsChangedNotification
	| CodeErrorsChangedNotification
	| StreamsChangedNotification
	| TeamsChangedNotification
	| UnreadsChangedNotification
	| UsersChangedNotification
	| ProvidersChangedNotification
	| ApiCapabilitiesChangedNotification
	| CommitsChangedNotification
	| WorkspaceChangedNotification
	| GrokExceptionChangedNotification
	| GrokStreamChangedNotification;

export const DidChangeDataNotificationType = new NotificationType<DidChangeDataNotification, void>(
	"codestream/didChangeData"
);

export interface DidChangeDocumentMarkersNotification {
	textDocument: TextDocumentIdentifier;
	reason: "document" | "codemarks" | "pullRequestComments";
}

export const DidChangeDocumentMarkersNotificationType = new NotificationType<
	DidChangeDocumentMarkersNotification,
	void
>("codestream/didChangeDocumentMarkers");

export interface DidChangePullRequestCommentsNotification {
	pullRequestId: string;
	commentId?: string;
	filePath?: string;
}

export const DidChangePullRequestCommentsNotificationType = new NotificationType<
	DidChangePullRequestCommentsNotification,
	void
>("codestream/didChangePullRequestComments");

export enum VersionCompatibility {
	Compatible = "ok",
	CompatibleUpgradeAvailable = "outdated",
	CompatibleUpgradeRecommended = "deprecated",
	UnsupportedUpgradeRequired = "incompatible",
	Unknown = "unknownVersion",
}

export interface DidChangeVersionCompatibilityNotification {
	compatibility: VersionCompatibility;
	downloadUrl: string;
	version: string | undefined;
}

export const DidChangeVersionCompatibilityNotificationType = new NotificationType<
	DidChangeVersionCompatibilityNotification,
	void
>("codestream/didChangeVersionCompatibility");

export enum ApiVersionCompatibility {
	ApiCompatible = "apiCompatible",
	ApiUpgradeRecommended = "apiUpgradeRecommended",
	ApiUpgradeRequired = "apiUpgradeRequired",
}

export interface DidChangeApiVersionCompatibilityNotification {
	compatibility: ApiVersionCompatibility;
	version: string;
	missingCapabilities?: CSApiCapabilities;
}

export const DidChangeApiVersionCompatibilityNotificationType = new NotificationType<
	DidChangeApiVersionCompatibilityNotification,
	void
>("codestream/didChangeApiVersionCompatibility");

export enum LogoutReason {
	Token = "token",
	Unknown = "unknown",
	UnsupportedVersion = "unsupportedVersion",
	UnsupportedApiVersion = "unsupportedApiVersion",
}

export interface DidLogoutNotification {
	reason: LogoutReason;
}

export const DidLogoutNotificationType = new NotificationType<DidLogoutNotification, void>(
	"codestream/didLogout"
);

export interface DidLoginNotification {
	data: LoginSuccessResponse;
}
export const DidLoginNotificationType = new NotificationType<DidLoginNotification, void>(
	"codestream/didLogin"
);

export const DidStartLoginNotificationType = new NotificationType<void, void>(
	"codestream/didStartLogin"
);

export const DidFailLoginNotificationType = new NotificationType<void, void>(
	"codestream/didFailLogin"
);

export const DidEncounterInvalidRefreshTokenNotificationType = new NotificationType<void, void>(
	"codestream/didEncounterInvalidRefreshToken"
);

export const DidStartLoginCodeGenerationNotificationType = new NotificationType<void, void>(
	"codestream/didStartLoginCodeGeneration"
);

export const DidFailLoginCodeGenerationNotificationType = new NotificationType<void, void>(
	"codestream/didFailLoginCodeGeneration"
);

export type DidEncounterMaintenanceModeNotification = TokenLoginRequest;

export const DidEncounterMaintenanceModeNotificationType = new NotificationType<
	DidEncounterMaintenanceModeNotification,
	void
>("codestream/didEncounterMaintenanceMode");

export interface RefreshMaintenancePollNotification {
	isMaintenanceMode: boolean;
	pollRefresh?: boolean;
}

export const RefreshMaintenancePollNotificationType = new NotificationType<
	RefreshMaintenancePollNotification,
	void
>("codestream/refreshMaintenancePoll");

export interface DidChangeServerUrlNotification {
	serverUrl: string;
}

export const DidChangeServerUrlNotificationType = new NotificationType<
	DidChangeServerUrlNotification,
	void
>("codestream/didChangeServerUrl");

export interface DidRefreshAccessTokenNotification {
	url: string;
	email: string;
	teamId: string;
	token: string;
	refreshToken?: string;
	tokenType?: CSAccessTokenType;
}

export const DidRefreshAccessTokenNotificationType = new NotificationType<
	DidRefreshAccessTokenNotification,
	void
>("codestream/didRefreshAccessToken");

export const AgentInitializedNotificationType = new NotificationType<void, void>(
	"codestream/agentInitialized"
);

// TODO: O11y-Only AutoFR Cleanup (start here then extensions, too)
export interface UserDidCommitNotification {
	sha: string;
}

// TODO: O11y-Only AutoFR Cleanup (start here then extensions, too)
export const UserDidCommitNotificationType = new NotificationType<UserDidCommitNotification, void>(
	"codestream/userDidCommit"
);

// TODO: O11y-Only AutoFR Cleanup (start here then extensions, too)
export interface DidChangeRepositoryCommitHashNotification {
	sha?: string;
	repoPath: string;
}

// TODO: O11y-Only AutoFR Cleanup (start here then extensions, too)
export const DidChangeRepositoryCommitHashNotificationType = new NotificationType<
	DidChangeRepositoryCommitHashNotification,
	void
>("codestream/didChangeRepositoryCommitHash");

export const DidSetEnvironmentNotificationType = new NotificationType<
	CodeStreamEnvironmentInfo,
	void
>("codestream/didSetEnvironment");

export interface DidChangeBranchNotification {
	repoPath: string;
	branch: string;
}

export const DidChangeBranchNotificationType = new NotificationType<
	DidChangeBranchNotification,
	void
>("codestream/didChangeBranch");

export interface DidChangeProcessBufferNotification {
	text?: string;
}

export const DidChangeProcessBufferNotificationType = new NotificationType<
	DidChangeProcessBufferNotification,
	void
>("codestream/didChangeProcessBuffer");

export interface DidChangeObservabilityDataNotification {
	type: "Assignment" | "RepositoryAssociation" | "Entity";
	data?: {
		entityGuid?: string;
		repoId?: string;
	};
}

export const DidChangeObservabilityDataNotificationType = new NotificationType<
	DidChangeDataNotification,
	void
>("codestream/didChangeObservabilityData");

export interface ConfigChangeReloadRequest {}

export const ConfigChangeReloadNotificationType = new NotificationType<
	ConfigChangeReloadRequest,
	void
>("codestream/configChangeReload");

export interface WhatsNewNotification {
	title: string;
}
export const WhatsNewNotificationType = new NotificationType<WhatsNewNotification, void>(
	"codestream/whatsNew"
);
