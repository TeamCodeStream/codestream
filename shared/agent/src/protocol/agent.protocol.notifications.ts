"use strict";
import { NotificationType, TextDocumentIdentifier } from "vscode-languageserver-protocol";
import { Document, CodeStreamEnvironmentInfo, GetMyPullRequestsResponse } from "./agent.protocol";
import { LoginSuccessResponse, TokenLoginRequest } from "./agent.protocol.auth";
import { CodemarkPlus } from "./agent.protocol.codemarks";
import { ThirdPartyProviders } from "./agent.protocol.providers";
import {
	CSApiCapabilities,
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
	CSUser
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
	"EchoTimeout" = "BCOM-1004"
}

export enum ConnectionStatus {
	Disconnected = "disconnected",
	Reconnected = "reconnected",
	Reconnecting = "reconnecting"
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

export enum ChangeDataType {
	Codemarks = "codemarks",
	Commits = "commits",
	Companies = "companies",
	Documents = "documents",
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
	Workspace = "workspace"
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

export interface DocumentData {
	reason: "saved" | "changed" | "removed";
	document: Document;
}

export interface DocumentsChangedNotification {
	type: ChangeDataType.Documents;
	data: DocumentData;
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
	| StreamsChangedNotification
	| TeamsChangedNotification
	| UnreadsChangedNotification
	| UsersChangedNotification
	| ProvidersChangedNotification
	| ApiCapabilitiesChangedNotification
	| DocumentsChangedNotification
	| CommitsChangedNotification
	| WorkspaceChangedNotification;

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
	Unknown = "unknownVersion"
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
	ApiUpgradeRequired = "apiUpgradeRequired"
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
	UnsupportedApiVersion = "unsupportedApiVersion"
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

export type DidEncounterMaintenanceModeNotification = TokenLoginRequest;

export const DidEncounterMaintenanceModeNotificationType = new NotificationType<
	DidEncounterMaintenanceModeNotification,
	void
>("codestream/didEncounterMaintenanceMode");

export interface DidChangeServerUrlNotification {
	serverUrl: string;
}

export const DidChangeServerUrlNotificationType = new NotificationType<
	DidChangeServerUrlNotification,
	void
>("codestream/didChangeServerUrl");

export const AgentInitializedNotificationType = new NotificationType<void, void>(
	"codestream/agentInitialized"
);

export interface UserDidCommitNotification {
	sha: string;
}

export const UserDidCommitNotificationType = new NotificationType<UserDidCommitNotification, void>(
	"codestream/userDidCommit"
);

export interface DidDetectUnreviewedCommitsNotification {
	sequence: number;
	openReviewId?: string;
	message: string;
}

export const DidDetectUnreviewedCommitsNotificationType = new NotificationType<
	DidDetectUnreviewedCommitsNotification,
	void
>("codestream/didDetectUnreviewedCommits");

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
