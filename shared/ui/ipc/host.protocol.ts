import {
	ApiVersionCompatibility,
	Capabilities,
	CodeStreamEnvironment,
	ThirdPartyProviders,
	Unreads,
	VersionCompatibility
} from "@codestream/protocols/agent";
import {
	CSApiCapabilities,
	CSMarker,
	CSMePreferences,
	CSRepository,
	CSStream,
	CSTeam,
	CSUser,
	CSCompany
} from "@codestream/protocols/api";
import { RequestType } from "vscode-jsonrpc";
import { EditorContext, IpcRoutes, WebviewContext, SessionState } from "./webview.protocol.common";

export interface BootstrapInHostResponse {
	capabilities: Capabilities;
	configs: {
		[key: string]: any;
	};
	version: string;
	context: Partial<WebviewContext>;
	env?: CodeStreamEnvironment | string;
	ide?: {
		name: string | undefined;
		detail: string | undefined;
	};
	session: SessionState;
	versionCompatibility?: VersionCompatibility | undefined;
	apiVersionCompatibility?: ApiVersionCompatibility | undefined;
	missingCapabilities?: CSApiCapabilities;
	apiCapabilities?: CSApiCapabilities;
}

export const BootstrapInHostRequestType = new RequestType<
	void,
	BootstrapInHostResponse,
	void,
	void
>(`${IpcRoutes.Host}/bootstrap`);

export interface SignedInBootstrapData extends BootstrapInHostResponse {
	editorContext: EditorContext;

	preferences: CSMePreferences;
	repos: CSRepository[];
	streams: CSStream[];
	teams: CSTeam[];
	companies: CSCompany[];
	users: CSUser[];
	unreads: Unreads;
	providers: ThirdPartyProviders;
}

export enum LogoutReason {
	Unknown = "unknown",
	ReAuthenticating = "reAuthenticating"
}

export interface LogoutRequest {
	reason?: LogoutReason;
}

export interface LogoutResponse {}
export const LogoutRequestType = new RequestType<LogoutRequest, LogoutResponse, void, void>(
	`${IpcRoutes.Host}/logout`
);

export const ReloadWebviewRequestType = new RequestType<void, void, void, void>(
	`${IpcRoutes.Host}/webview/reload`
);

export const RestartRequestType = new RequestType<void, void, void, void>(
	`${IpcRoutes.Host}/restart`
);

export interface CompareMarkerRequest {
	marker: CSMarker;
}
export interface CompareMarkerResponse {}

export const CompareMarkerRequestType = new RequestType<
	CompareMarkerRequest,
	CompareMarkerResponse,
	void,
	void
>(`${IpcRoutes.Host}/marker/compare`);

export interface InsertTextRequest {
	text: string;
	marker: CSMarker;
	indentAfterInsert?: boolean;
}

export interface InsertTextResponse {}

export const InsertTextRequestType = new RequestType<
	InsertTextRequest,
	InsertTextResponse,
	void,
	void
>(`${IpcRoutes.Host}/marker/inserttext`);

export interface ApplyMarkerRequest {
	marker: CSMarker;
}

export interface ApplyMarkerResponse {}

export const ApplyMarkerRequestType = new RequestType<
	ApplyMarkerRequest,
	ApplyMarkerResponse,
	void,
	void
>(`${IpcRoutes.Host}/marker/apply`);

export interface UpdateConfigurationRequest {
	name: string;
	value: any;
}

export interface UpdateConfigurationResponse {}

export const UpdateConfigurationRequestType = new RequestType<
	UpdateConfigurationRequest,
	UpdateConfigurationResponse,
	void,
	void
>(`${IpcRoutes.Host}/configuration/update`);

export interface ShellPromptFolderRequest {
	message: string;
}
export interface ShellPromptFolderResponse {
	path: string | undefined;
}

export const ShellPromptFolderRequestType = new RequestType<
	ShellPromptFolderRequest,
	ShellPromptFolderResponse,
	void,
	void
>(`${IpcRoutes.Host}/shell/prompt/folder`);

export interface UpdateServerUrlRequest {
	serverUrl: string;
	disableStrictSSL?: boolean;
}

export interface UpdateServerUrlResponse {}

export const UpdateServerUrlRequestType = new RequestType<
	UpdateServerUrlRequest,
	UpdateServerUrlResponse,
	void,
	void
>(`${IpcRoutes.Host}/server-url`);

export interface OpenUrlRequest {
	url: string;
}

export const OpenUrlRequestType = new RequestType<OpenUrlRequest, void, void, void>(
	`${IpcRoutes.Host}/url/open`
);

export interface CompareLocalFilesRequest {
	repoId: string;
	filePath: string;
	headSha: string;
	headBranch: string;
	baseSha: string;
	baseBranch: string;
	context?: {
		pullRequest: {
			providerId: string;
			pullRequestReviewId?: string;
			id: string;
		};
	};
}

export interface CompareLocalFilesResponse {
	error?: string;
}

export const CompareLocalFilesRequestType = new RequestType<
	CompareLocalFilesRequest,
	CompareLocalFilesResponse,
	void,
	void
>(`${IpcRoutes.Host}/files/compare`);

export interface LocalFilesCloseDiffRequest {}

export interface LocalFilesCloseDiffResponse {}

export const LocalFilesCloseDiffRequestType = new RequestType<
	LocalFilesCloseDiffRequest,
	LocalFilesCloseDiffResponse,
	void,
	void
>(`${IpcRoutes.Host}/files/closeDiff`);
