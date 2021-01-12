"use strict";
import { RequestInit } from "node-fetch";
import { InitializeResult, RequestType, WorkspaceFolder } from "vscode-languageserver-protocol";
import { LoginResponse } from "./agent.protocol.auth";
import { Unreads } from "./agent.protocol.notifications";
import { ThirdPartyProviders } from "./agent.protocol.providers";
import { CSCompany, CSMePreferences, CSRepository, CSStream, CSTeam, CSUser } from "./api.protocol";

export * from "./agent.protocol.notifications";

export * from "./agent.protocol.auth";
export * from "./agent.protocol.documentMarkers";
export * from "./agent.protocol.codemarks";
export * from "./agent.protocol.companies";
export * from "./agent.protocol.markers";
export * from "./agent.protocol.posts";
export * from "./agent.protocol.repos";
export * from "./agent.protocol.textFiles";
export * from "./agent.protocol.reviews";
export * from "./agent.protocol.streams";
export * from "./agent.protocol.teams";
export * from "./agent.protocol.users";

export * from "./agent.protocol.scm";

export * from "./agent.protocol.providers";
export * from "./agent.protocol.asana";
export * from "./agent.protocol.bitbucket";
export * from "./agent.protocol.github";
export * from "./agent.protocol.gitlab";
export * from "./agent.protocol.jira";
export * from "./agent.protocol.slack";
export * from "./agent.protocol.trello";
export * from "./agent.protocol.youtrack";
export * from "./agent.protocol.azuredevops";
export * from "./agent.protocol.okta";
export * from "./agent.protocol.clubhouse";
export * from "./agent.protocol.linear";

export interface Document {
	uri: string;
	isDirty?: boolean;
}

export interface Capabilities {
	channelMute?: boolean;
	codemarkApply?: boolean;
	codemarkCompare?: boolean;
	codemarkOpenRevision?: boolean;
	editorTrackVisibleRange?: boolean;
	postDelete?: boolean;
	postEdit?: boolean;
	providerCanSupportRealtimeChat?: boolean;
	providerSupportsRealtimeChat?: boolean;
	providerSupportsRealtimeEvents?: boolean;
	reviewDiffs?: boolean;
	services?: {
		vsls?: boolean;
	};
}

export enum CodeDelimiterStyles {
	NONE = "none",
	TRIPLE_BACK_QUOTE = "tripleBackQuote",
	SINGLE_BACK_QUOTE = "singleBackQuote",
	HTML_MARKUP = "htmlMarkup",
	CODE_BRACE = "codeBrace"
}

export interface AccessToken {
	email: string;
	url: string;
	value: string;
	teamId?: string;
	provider?: string;
	providerAccess?: "strict";
}

export enum CodeStreamEnvironment {
	Local = "local",
	Production = "prod",
	Unknown = "unknown"
}

export enum TraceLevel {
	Silent = "silent",
	Errors = "errors",
	Verbose = "verbose",
	Debug = "debug"
}

export interface BaseAgentOptions {
	extension: {
		build: string;
		buildEnv: string;
		version: string;
		versionFormatted: string;
	};
	gitPath: string;
	ide: {
		name: string;
		version: string;
		detail: string;
	};
	isDebugging: boolean;
	proxy?: {
		url: string;
		strictSSL: boolean;
	};
	proxySupport?: "override" | "on" | "off";
	serverUrl: string;
	disableStrictSSL?: boolean;
	traceLevel: TraceLevel;
	recordRequests?: boolean;
	workspaceFolders?: WorkspaceFolder[];
}

export interface AgentOptions extends BaseAgentOptions {
	email: string;
	passwordOrToken: string | AccessToken;
	signupToken: string;
	team: string;
	teamId: string;
}

export interface AgentState {
	token: AccessToken;
	capabilities: Capabilities;
	email: string;
	environment: CodeStreamEnvironment | string;
	serverUrl: string;
	teamId: string;
	userId: string;
}

export interface AgentInitializeResult extends InitializeResult {
	result: LoginResponse;
}

export interface ApiRequest {
	url: string;
	init?: RequestInit;
	token?: string;
}
export const ApiRequestType = new RequestType<ApiRequest, any, void, void>("codestream/api");

export interface VerifyConnectivityResponse {
	ok: boolean;
	error?: {
		message: string;
		details?: string;
	};
	capabilities?: {
		[key: string]: any;
	};
}

export const VerifyConnectivityRequestType = new RequestType<
	void,
	VerifyConnectivityResponse,
	void,
	void
>("codestream/verifyConnectivity");

export interface BootstrapRequest {}
export interface BootstrapResponse {
	preferences: CSMePreferences;
	repos: CSRepository[];
	streams: CSStream[];
	teams: CSTeam[];
	companies: CSCompany[];
	users: CSUser[];
	unreads: Unreads;
	providers: ThirdPartyProviders;
}

export const BootstrapRequestType = new RequestType<
	BootstrapRequest,
	BootstrapResponse,
	void,
	void
>("codestream/bootstrap");

export enum ReportingMessageType {
	Error = "error",
	Warning = "warning",
	Info = "info",
	Debug = "debug",
	Fatal = "fatal"
}

export interface ReportMessageRequest {
	type: ReportingMessageType;
	message: string;
	source: "webview" | "extension" | "agent";
	extra?: object;
}

export const ReportMessageRequestType = new RequestType<ReportMessageRequest, void, void, void>(
	"codestream/reporting/message"
);

export interface ReportBreadcrumbRequest {
	message: string;
	category?: string;
	level?: ReportingMessageType;
	data?: object;
}

export const ReportBreadcrumbRequestType = new RequestType<
	ReportBreadcrumbRequest,
	void,
	void,
	void
>("codestream/reporting/breadcrumb");

/**
 * @param eventName The name of the telemetry event you want to track, eg: "Page Viewed"
 * @param properties Optional properties to pass along with eventName
 */
export interface TelemetryRequest {
	eventName: string;
	properties?: { [key: string]: string | number | boolean };
}

export const TelemetryRequestType = new RequestType<TelemetryRequest, void, void, void>(
	"codestream/telemetry"
);

export interface AgentOpenUrlRequest {
	url: string;
}

export const AgentOpenUrlRequestType = new RequestType<AgentOpenUrlRequest, void, void, void>(
	"codestream/url/open"
);

export interface UIStateRequest {
	context?: {
		panelStack?: string[];
	};
}

export const UIStateRequestType = new RequestType<UIStateRequest, void, void, void>(
	"codestream/ui/state"
);

export interface SetServerUrlRequest {
	serverUrl: string;
	disableStrictSSL?: boolean;
}

export const SetServerUrlRequestType = new RequestType<SetServerUrlRequest, void, void, void>(
	"codestream/set-server"
);

export interface CodeStreamDiffUriData {
	path: string;
	repoId: string;
	baseBranch: string;
	headBranch: string;
	leftSha: string;
	rightSha: string;
	/** values are `left` or `right` */
	side: string;
	context?: {
		pullRequest?: {
			providerId: string;
			pullRequestReviewId?: string;
			id: string;
		};
	};
}

export interface UploadFileRequest {
	path: string;
	name: string;
	type: string;
	size: number;
}

export interface UploadFileResponse {
	url: string;
	name: string;
	type: string;
	size: number;
}

export const UploadFileRequestType = new RequestType<
	UploadFileRequest,
	UploadFileResponse,
	void,
	void
>("codestream/upload/file");

export const CodeStreamApiGetRequestType = new RequestType<any, any, void, void>(
	"codestream/api/get"
);
export const CodeStreamApiPostRequestType = new RequestType<any, any, void, void>(
	"codestream/api/post"
);
export const CodeStreamApiPutRequestType = new RequestType<any, any, void, void>(
	"codestream/api/put"
);
export const CodeStreamApiDeleteRequestType = new RequestType<any, any, void, void>(
	"codestream/api/delete"
);
