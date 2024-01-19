"use strict";

import { NotificationType, RequestType } from "vscode-languageserver-protocol";

import { Project, RepoProjectType } from "./agent.protocol.scm";
import { CSRepository, CSStackTraceInfo, CSStackTraceLine } from "./api.protocol.models";

export interface ParseStackTraceRequest {
	entityGuid: string;
	errorGroupGuid: string;
	stackTrace: string | string[];
	occurrenceId: string | undefined;
}

export interface ParseStackTraceResponse extends CSStackTraceInfo {
	parseError?: string;
	warning?: WarningOrError;
}

export const ParseStackTraceRequestType = new RequestType<
	ParseStackTraceRequest,
	ParseStackTraceResponse,
	void,
	void
>("codestream/nr/parseStackTrace");

export interface ResolveStackTraceRequest {
	entityGuid: string;
	// tracking
	errorGroupGuid: string;
	occurrenceId: string;
	stackTrace: string[];
	repoId: string;
	ref: string;
	codeErrorId: string;
	stackSourceMap: any;
	domain: string;
}

export interface WarningOrError {
	message: string;
	helpUrl?: string;
}

export interface SourceMapEntry {
	original: {
		fileName: string;
	};
	mapped?: {
		fileName: string;
		columnNumber: number;
		lineNumber: number;
	};
}

export interface ResolveStackTraceResponse {
	parsedStackInfo?: CSStackTraceInfo; // this is parsed info relative to the given sha, to be stored
	resolvedStackInfo?: CSStackTraceInfo; // this is relative to the user's current sha, ephemeral
	warning?: WarningOrError;
	error?: string;
}

export const ResolveStackTraceRequestType = new RequestType<
	ResolveStackTraceRequest,
	ResolveStackTraceResponse,
	void,
	void
>("codestream/nr/resolveStackTrace");

export interface DidResolveStackTraceLineNotification {
	occurrenceId: string;
	resolvedLine: CSStackTraceLine;
	index: number;
	codeErrorId: string;
}

export const DidResolveStackTraceLineNotificationType = new NotificationType<
	DidResolveStackTraceLineNotification,
	void
>("codestream/nr/didResolveStackTraceLine");

export interface ResolveStackTracePositionRequest {
	ref?: string;
	repoId: string;
	filePath: string;
	line?: number;
	column?: number;
}

export interface ResolveStackTracePositionResponse {
	line?: number;
	column?: number;
	path?: string;
	error?: string;
}

export const ResolveStackTracePositionRequestType = new RequestType<
	ResolveStackTracePositionRequest,
	ResolveStackTracePositionResponse,
	void,
	void
>("codestream/nr/resolveStackTracePosition");

export interface FindCandidateMainFilesRequest {
	type: RepoProjectType;
	path: string;
}

export interface FindCandidateMainFilesResponse {
	error?: string;
	files: string[];
}

export const FindCandidateMainFilesRequestType = new RequestType<
	FindCandidateMainFilesRequest,
	FindCandidateMainFilesResponse,
	void,
	void
>("codestream/nr/findCandidateMainFiles");

export interface InstallNewRelicRequest {
	type: RepoProjectType;
	cwd: string;
}

export interface InstallNewRelicResponse {
	message?: string;
	error?: string;
	[key: string]: any;
}

export const InstallNewRelicRequestType = new RequestType<
	InstallNewRelicRequest,
	InstallNewRelicResponse,
	void,
	void
>("codestream/nr/installNewRelic");

export interface CreateNewRelicConfigFileRequest {
	type: RepoProjectType;
	/**
	 * path to file or project
	 */
	filePath: string;
	/**
	 * path to the root repo
	 */
	repoPath?: string;
	licenseKey: string;
	appName: string;
	project?: Project;
}

export interface CreateNewRelicConfigFileResponse {
	error?: string;
	[key: string]: any;
}

export interface CreateNewRelicConfigFileJavaResponse extends CreateNewRelicConfigFileResponse {
	agentJar?: string;
}

export const CreateNewRelicConfigFileRequestType = new RequestType<
	CreateNewRelicConfigFileRequest,
	CreateNewRelicConfigFileResponse,
	void,
	void
>("codestream/nr/createNewRelicConfigFile");

export interface AddNewRelicIncludeRequest {
	type: RepoProjectType;
	file: string;
	dir: string;
}

export interface AddNewRelicIncludeResponse {
	error?: string;
	[key: string]: any;
}

export const AddNewRelicIncludeRequestType = new RequestType<
	AddNewRelicIncludeRequest,
	AddNewRelicIncludeResponse,
	void,
	void
>("codestream/nr/addNewRelicInclude");

export interface GetRepoFileFromAbsolutePathRequest {
	repo: CSRepository;
	absoluteFilePath: string;
}

export interface GetRepoFileFromAbsolutePathResponse {
	uri?: string;
	error?: string;
}

export const GetRepoFileFromAbsolutePathRequestType = new RequestType<
	GetRepoFileFromAbsolutePathRequest,
	GetRepoFileFromAbsolutePathResponse,
	void,
	void
>("codestream/nr/getRepoFileFromAbsolutePath");

export interface GetNewRelicSignupJwtTokenRequest {}

export interface GetNewRelicSignupJwtTokenResponse {
	token: string;
	baseLandingUrl: string;
}

export const GetNewRelicSignupJwtTokenRequestType = new RequestType<
	GetNewRelicSignupJwtTokenRequest,
	GetNewRelicSignupJwtTokenResponse,
	void,
	void
>("codestream/nr/openNewRelicSignupUrl");

export interface LookupNewRelicOrganizationsRequest {
	accountIds: number[];
}

export type LookupNewRelicOrganizationsResponse = {
	accountId: number;
	orgId: number;
}[];
