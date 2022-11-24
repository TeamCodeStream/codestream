"use strict";
import { RequestType } from "vscode-languageserver-protocol";
import { CSRepository } from "./api.protocol";

export interface CreateRepoRequest {
	url: string;
	knownCommitHashes: string[];
}

export interface CreateRepoResponse {
	repo: CSRepository;
}

export const CreateRepoRequestType = new RequestType<
	CreateRepoRequest,
	CreateRepoResponse,
	void,
	void
>("codestream/repos/create");

export interface FetchReposRequest {
	repoIds?: string[];
}

export interface FetchReposResponse {
	repos: CSRepository[];
}

export const FetchReposRequestType = new RequestType<
	FetchReposRequest,
	FetchReposResponse,
	void,
	void
>("codestream/repos");

export interface GetRepoRequest {
	repoId: string;
}

export interface GetRepoResponse {
	repo: CSRepository;
}

export const GetRepoRequestType = new RequestType<GetRepoRequest, GetRepoResponse, void, void>(
	"codestream/repo"
);

export interface RepoMap {
	path: string;
	repoId: string;
}

export interface MapReposRequest {
	repos: RepoMap[];
	skipRepositoryIntegration?: boolean | undefined;
}

export interface MapReposResponse {
	success?: boolean;
}

export const MapReposRequestType = new RequestType<MapReposRequest, MapReposResponse, void, void>(
	"codestream/repos/map"
);

export interface MatchRepoInfo {
	remotes: string[];
	knownCommitHashes?: string[];
}

export interface MatchReposRequest {
	repos: MatchRepoInfo[];
}

export interface MatchReposResponse {
	repos: CSRepository[];
}

export interface IgnoreFilesRequest {
	repoPath: string;
}

export interface IgnoreFilesResponse {
	paths?: string[];
}

export const IgnoreFilesRequestType = new RequestType<
	IgnoreFilesRequest,
	IgnoreFilesResponse,
	void,
	void
>("codestream/repos/ignore-files");

export interface AddIgnoreFileRequest {
	repoPath: string;
	path: string;
}

export interface AddIgnoreFileResponse {
	success?: boolean;
}

export const AddIgnoreFilesRequestType = new RequestType<
	AddIgnoreFileRequest,
	AddIgnoreFileResponse,
	void,
	void
>("codestream/repos/ignore-files/add");

export interface NormalizeUrlRequest {
	url: string;
}

export interface NormalizeUrlResponse {
	normalizedUrl: string;
}

export const NormalizeUrlRequestType = new RequestType<
	NormalizeUrlRequest,
	NormalizeUrlResponse,
	void,
	void
>("codestream/normalizeUrl");

export const MatchReposRequestType = new RequestType<
	MatchReposRequest,
	MatchReposResponse,
	void,
	void
>("codestream/repos/match");
