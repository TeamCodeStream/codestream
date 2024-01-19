import {
	ApiVersionCompatibility,
	Capabilities,
	CodeStreamEnvironmentInfo,
	ThirdPartyProviders,
	Unreads,
	VersionCompatibility,
} from "@codestream/protocols/agent";
import {
	CSApiCapabilities,
	CSCompany,
	CSMarker,
	CSMePreferences,
	CSRepository,
	CSStream,
	CSTeam,
	CSUser,
} from "@codestream/protocols/api";

import { NotificationType, RequestType } from "vscode-jsonrpc";
import { EditorContext, IpcRoutes, SessionState, WebviewContext } from "./webview.protocol.common";

export interface Collaborator {
	id?: string;
	username: string;
	avatar: {
		image?: string;
	};
}

export interface BootstrapInHostResponse {
	capabilities: Capabilities;
	configs: {
		[key: string]: any;
	};
	version: string;
	context: Partial<WebviewContext>;
	environmentInfo?: CodeStreamEnvironmentInfo;
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
	ReAuthenticating = "reAuthenticating",
}

export interface LogoutRequest {
	reason?: LogoutReason;
	newServerUrl?: string;
	newEnvironment?: string;
}

export interface LogoutResponse {}
export const LogoutRequestType = new RequestType<LogoutRequest, LogoutResponse, void, void>(
	`${IpcRoutes.Host}/logout`
);

export interface AcceptTOSRequest {
	reason?: LogoutReason;
}

export interface AcceptTOSResponse {}
export const AcceptTOSRequestType = new RequestType<
	AcceptTOSRequest,
	AcceptTOSResponse,
	void,
	void
>(`${IpcRoutes.Host}/acceptTOS`);

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

export interface SaveFileRequest {
	path: string;
	data: any;
}
export interface SaveFileResponse {
	success: boolean;
}

export const SaveFileRequestType = new RequestType<SaveFileRequest, SaveFileResponse, void, void>(
	`${IpcRoutes.Host}/file/save`
);

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
	environment?: string;
	copyToken?: boolean;
	currentTeamId?: string;
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
	previousFilePath?: string;
	headSha: string;
	headBranch: string;
	baseSha: string;
	baseBranch: string;
	context?: {
		pullRequest: {
			providerId: string;
			pullRequestReviewId?: string;
			id: string;
			collaborators: Collaborator[];
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
export interface ConnectToIDEProviderRequest {
	provider: string;
}

export interface ConnectToIDEProviderResponse {
	accessToken: string;
	sessionId: string;
}

export const ConnectToIDEProviderRequestType = new RequestType<
	ConnectToIDEProviderRequest,
	ConnectToIDEProviderResponse,
	void,
	void
>(`${IpcRoutes.Host}/connect/vscode-provider`);

export interface DisconnectFromIDEProviderRequest {
	provider: string;
}

export const DisconnectFromIDEProviderRequestType = new RequestType<
	DisconnectFromIDEProviderRequest,
	void,
	void,
	void
>(`${IpcRoutes.Host}/disconnect/vscode-provider`);

export interface RefreshEditorsCodeLensRequest {}
export interface RefreshEditorsCodeLensResponse {
	success: boolean;
}

export const RefreshEditorsCodeLensRequestType = new RequestType<
	RefreshEditorsCodeLensRequest,
	RefreshEditorsCodeLensResponse,
	void,
	void
>(`${IpcRoutes.Host}/editors/codelens/refresh`);

export interface OpenEditorViewNotification {
	panel: string;
	title: string;

	entityGuid: string;
	query?: string;
}

export const OpenEditorViewNotificationType = new NotificationType<
	OpenEditorViewNotification,
	void
>(`${IpcRoutes.Host}/editor/open`);
