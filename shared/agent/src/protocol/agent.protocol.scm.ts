"use strict";
import { Range, RequestType } from "vscode-languageserver-protocol";
import { FetchThirdPartyPullRequestFilesResponse } from "./agent.protocol.providers";
import { CSRepository, CSReview, CSTeam, CSUser, ModifiedFile } from "./api.protocol";

export interface GetBranchesRequest {
	uri: string;
}
export interface GetBranchesResponse {
	scm?: {
		branches: string[];
		current: string;
		repoId: string;
	};
	error?: string;
}
export const GetBranchesRequestType = new RequestType<
	GetBranchesRequest,
	GetBranchesResponse,
	void,
	void
>("codestream/scm/branches");

export interface CreateBranchRequest {
	uri: string;
	branch: string;
	fromBranch?: string;
}
export interface CreateBranchResponse {
	scm?: {
		result: boolean;
	};
	error?: string;
}
export const CreateBranchRequestType = new RequestType<
	CreateBranchRequest,
	CreateBranchResponse,
	void,
	void
>("codestream/scm/create-branch");

export interface SwitchBranchRequest {
	branch: string;
	uri?: string;
	repoId?: string;
	fromBranch?: string; // never used
}
export interface SwitchBranchResponse {
	scm?: {
		result: boolean;
	};
	error?: string;
}
export const SwitchBranchRequestType = new RequestType<
	SwitchBranchRequest,
	SwitchBranchResponse,
	void,
	void
>("codestream/scm/switch-branch");

export interface GetCommitScmInfoRequest {
	revision: string;
	repoPath?: string;
	repoId?: string;
}
export interface GetCommitScmInfoResponse {
	scm?: {
		repoPath: string;
		revision: string;
		message: string;
		shortMessage: string;
		author: string;
		authorDate: Date;
		// committer: string;
		// committerDate: string;
	};
	error?: string;
}
export const GetCommitScmInfoRequestType = new RequestType<
	GetCommitScmInfoRequest,
	GetCommitScmInfoResponse,
	void,
	void
>("codestream/scm/commit");

export interface GetRepoScmStatusRequest {
	/**
	 * This can be a file or a folder uri, with a `file` scheme
	 */
	uri: string;
	startCommit?: string;
	endCommit?: string;
	/**
	 * If set, the hard-start to a commit list: don't return commits before this
	 */
	prevEndCommit?: string;
	reviewId?: string;
	includeSaved: boolean;
	includeStaged: boolean;
	currentUserEmail: string;
	skipAuthorsCalculation?: boolean;
	includeLatestCommit?: boolean;
}

export interface CoAuthors {
	email: string;
	stomped: number;
	commits: number;
}

export interface RepoScmStatus {
	repoPath: string;
	repoId?: string;
	branch?: string;
	commits?: { sha: string; info: any; localOnly: boolean }[];
	modifiedFiles: ModifiedFile[];
	savedFiles: string[];
	stagedFiles: string[];
	startCommit: string;
	// authors whose code i have changed, or who have pushed to this branch
	authors: CoAuthors[];
	remotes: { name: string; url: string }[];
	// this is just the total number of lines modified so that
	// we can throw up a warning if it's too many ("shift left")
	totalModifiedLines: number;
}

export interface GetRepoScmStatusResponse {
	uri: string;
	scm?: RepoScmStatus;
	error?: string;
}
export const GetRepoScmStatusRequestType = new RequestType<
	GetRepoScmStatusRequest,
	GetRepoScmStatusResponse,
	void,
	void
>("codestream/scm/repo/status");

export interface GetRepoScmStatusesRequest {
	currentUserEmail: string;
	/**
	 * Set this flag to only return repos that a user has open in their workspace
	 * (rather than including any repos that might have been later dynamically added)
	 */
	inEditorOnly?: boolean;
}
export interface GetRepoScmStatusesResponse {
	scm?: RepoScmStatus[];
	error?: string;
}
export const GetRepoScmStatusesRequestType = new RequestType<
	GetRepoScmStatusesRequest,
	GetRepoScmStatusesResponse,
	void,
	void
>("codestream/scm/repo/statuses");

export enum RepoProjectType {
	Unknown = "Unknown",
	NodeJS = "NodeJS",
	Java = "Java",
	DotNetCore = "DotNetCore",
	DotNetFramework = "DotNetFramework"
	/*
	PHP = "PHP",
	CSharp = "C#"
	*/
}

export interface IdentifyRepoResult {
	projectType: RepoProjectType;
	projects?: { path: string; name?: string }[];
}

export interface NewRelicOptions {
	projectType?: RepoProjectType;
	/**
	 * Collection of projects (folders)
	 */
	projects?: { path: string; name?: string }[];
	repoId?: string;
	path?: string;
}

export interface ReposScm {
	id?: string;
	path: string;
	/*
		This is the folder of the workspace
	*/
	folder: { uri: string; name: string };
	root?: boolean;
	/**
	 * only returned if includeCurrentBranch is set
	 */
	currentBranch?: string;
	/**
	 * only returned if includeProviders is set
	 */
	providerGuess?: string;
	/**
	 * this has a subset of what GitRemote has
	 */
	remotes?: {
		repoPath: string;
		name?: string;
		path: string;
		uri?: any;
		domain: string;
		webUrl: string;
		remoteWeight?: number;
		types?: { url: string; type: string }[];
		rawUrl?: string;
	}[];
	/**
	 * If this repo has a remote that is managed and connected to a provider,
	 * return the providerId
	 */
	providerId?: string;
	/**
	 * Project type (NodeJS, Ruby, Python)
	 */
	projectType?: RepoProjectType;
	projects?: { path: string; name?: string }[];

	directories?: DirectoryTree;
}

export interface DirectoryTree {
	depth: number;
	children: DirectoryTree[];
	/** name of the directory */
	name: string;
	/** path to the directory */
	fullPath: string;
	/** repo id */
	id: string | undefined;
	/** in a path like foo/bar this is ["foo","bar"] */
	partialPath: string[];
}

export interface GetReposScmRequest {
	/**
	 * Set this flag to only return repos that a user has open in their workspace
	 * (rather than including any repos that might have been later dynamically added [and removed])
	 */
	inEditorOnly?: boolean;
	/**
	 * Set this flag to also return the current branch for each of the repos
	 */
	includeCurrentBranches?: boolean;
	/**
	 * Set this flag to also return the remotes for each repo as well as a provider guess
	 */
	includeProviders?: boolean;

	/**
	 * Set this flag to also return the remotes
	 */
	includeRemotes?: boolean;
	/**
	 * Set this flag to also return the providerId if a repo is connected to one
	 */
	includeConnectedProviders?: boolean;

	/**
	 * if set to a number, will return a tree structure of directories within this repo up to the specific depth
	 *
	 * @type {number}
	 * @memberof GetReposScmRequest
	 */
	withSubDirectoriesDepth?: number;

	/**
	 * Set this flag to have the agent try to guess what kind of project the repo represents
	 */
	guessProjectTypes?: boolean;
}

export interface GetReposScmResponse {
	repositories?: ReposScm[];
	error?: string;
}

export const GetReposScmRequestType = new RequestType<
	GetReposScmRequest,
	GetReposScmResponse,
	void,
	void
>("codestream/scm/repos");

export interface GetFileScmInfoRequest {
	uri: string;
}
export interface GetFileScmInfoResponse {
	uri: string;
	scm?: {
		file: string;
		repoPath: string;
		repoId?: string;
		revision: string;
		remotes: { name: string; url: string }[];
		branch?: string;
	};
	error?: string;
	/**
	 * set if the uri is not of a file scheme
	 */
	ignored?: boolean;
}
export const GetFileScmInfoRequestType = new RequestType<
	GetFileScmInfoRequest,
	GetFileScmInfoResponse,
	void,
	void
>("codestream/scm/file/info");

export interface GetRangeScmInfoRequest {
	uri: string;
	gitSha?: string;
	range: Range;
	dirty?: boolean;
	contents?: string;
	skipBlame?: boolean;
}
export interface BlameAuthor {
	email: string;
	id?: string;
	username?: string;
}
export interface GetRangeScmInfoResponse {
	uri: string;
	range: Range;
	contents: string;
	scm?: {
		file: string;
		repoPath: string;
		repoId?: string;
		revision: string;
		fixedGitSha?: boolean;
		/**
		 * authors come from git blame. we enrich the list with IDs
		 * and usernames if the git blame email addresses match members
		 * of your team.
		 */
		authors: BlameAuthor[];
		remotes: { name: string; url: string }[];
		branch?: string;
	};
	error?: string;
	/**
	 * Holder for additional metadata that this uri might contain, and/or
	 * a spot to attach additional info
	 */
	context?: {
		pullRequest?: {
			id: string;
			providerId: string;
			pullRequestReviewId?: string;
		};
	};
	/**
	 * set if the uri is not of a file scheme
	 */
	ignored?: boolean;
}
export const GetRangeScmInfoRequestType = new RequestType<
	GetRangeScmInfoRequest,
	GetRangeScmInfoResponse,
	void,
	void
>("codestream/scm/range/info");

export interface GetRangeSha1Request {
	uri: string;
	range: Range;
}
export interface GetRangeSha1Response {
	sha1: string | undefined;
}
export const GetRangeSha1RequestType = new RequestType<
	GetRangeSha1Request,
	GetRangeSha1Response,
	void,
	void
>("codestream/scm/range/sha1");

export interface GetShaDiffsRangesRequest {
	repoId: string;
	filePath: string;
	baseSha: string;
	headSha: string;
}

interface linesChanged {
	start: number;
	end: number;
}

export interface GetShaDiffsRangesResponse {
	baseLinesChanged: linesChanged;
	headLinesChanged: linesChanged;
}

export const GetShaDiffsRangesRequestType = new RequestType<
	GetShaDiffsRangesRequest,
	GetShaDiffsRangesResponse[],
	void,
	void
>("codestream/scm/sha1/ranges");

export interface GetRangeRequest {
	uri: string;
	range: Range;
}
export interface GetRangeResponse {
	currentCommitHash?: string;
	currentBranch?: string;
	currentContent?: string;
	diff?: string;
}

export interface GetUserInfoRequest {}
export interface GetUserInfoResponse {
	email: string;
	name: string;
	username: string;
}
export const GetUserInfoRequestType = new RequestType<
	GetUserInfoRequest,
	GetUserInfoResponse,
	void,
	void
>("codestream/scm/user/info");

export interface GetWorkspaceRepoInfoRequest {}
export interface GetWorkspaceRepoInfoResponse {
	repos: { [path: string]: string[] };
}
export const GetWorkspaceRepoInfoRequestType = new RequestType<
	GetWorkspaceRepoInfoRequest,
	GetWorkspaceRepoInfoResponse,
	void,
	void
>("codestream/scm/workspace/repos");

export interface GetWorkspaceAutoJoinInfoRequest {}
export interface GetWorkspaceAutoJoinInfoResponse {
	admins: CSUser[];
	team: CSTeam;
	repo: CSRepository;
}
export const GetWorkspaceAutoJoinInfoRequestType = new RequestType<
	GetWorkspaceAutoJoinInfoRequest,
	GetWorkspaceAutoJoinInfoResponse[],
	void,
	void
>("codestream/scm/workspace/autojoin");

export interface GetLatestCommittersRequest {}
export interface GetLatestCommittersResponse {
	scm?: {
		[email: string]: string;
	};
	error?: string;
}
export const GetLatestCommittersRequestType = new RequestType<
	GetLatestCommittersRequest,
	GetLatestCommittersResponse,
	void,
	void
>("codestream/scm/latestCommitters");

export interface FetchAllRemotesRequest {
	/**
	 * CodeStream repositoryId
	 * */
	repoId: string;
}

export interface FetchAllRemotesResponse {}

export const FetchAllRemotesRequestType = new RequestType<
	FetchAllRemotesRequest,
	FetchAllRemotesResponse,
	void,
	void
>("codestream/scm/remotes");

export interface FetchRemoteBranchRequest {
	/**
	 * CodeStream repositoryId
	 * */
	repoId: string;
	branchName: string;
}
export interface FetchRemoteBranchResponse {}

export const FetchRemoteBranchRequestType = new RequestType<
	FetchRemoteBranchRequest,
	FetchRemoteBranchResponse,
	void,
	void
>("codestream/scm/remoteBranch");

export interface FetchBranchCommitsStatusRequest {
	repoId: string;
	branchName: string;
}
export interface FetchBranchCommitsStatusResponse {
	commitsBehindOrigin: string;
}

export const FetchBranchCommitsStatusRequestType = new RequestType<
	FetchBranchCommitsStatusRequest,
	FetchBranchCommitsStatusResponse,
	void,
	void
>("codestream/scm/commitsStatus");

export interface GetFileContentsAtRevisionRequest {
	/**
	 * CodeStream repositoryId
	 * */
	repoId?: string;
	/**
	 * Absolute file path or relative if repoId is specified
	 * */
	path: string;
	/**
	 * git commit sha
	 * */
	sha: string;

	fetchAllRemotes?: boolean;
}

export interface GetFileContentsAtRevisionResponse {
	repoRoot: string;
	content: string;
	error?: string;
}

export const GetFileContentsAtRevisionRequestType = new RequestType<
	GetFileContentsAtRevisionRequest,
	GetFileContentsAtRevisionResponse,
	void,
	void
>("codestream/scm/file/diff");

export interface FetchForkPointRequest {
	/**
	 * CodeStream repositoryId
	 * */
	repoId: string;
	baseSha: string;
	headSha: string;
	ref?: string;
}

export interface FetchForkPointResponse {
	sha: string;
	error?: {
		message?: string;
		type: "COMMIT_NOT_FOUND" | "REPO_NOT_FOUND";
	};
}

export const FetchForkPointRequestType = new RequestType<
	FetchForkPointRequest,
	FetchForkPointResponse,
	void,
	void
>("codestream/scm/forkPoint");

export interface GetLatestCommitScmRequest {
	repoId: string;
	branch: string;
}

export interface GetLatestCommitScmResponse {
	shortMessage: string;
}

export const GetLatestCommitScmRequestType = new RequestType<
	GetLatestCommitScmRequest,
	GetLatestCommitScmResponse,
	void,
	void
>("codestream/scm/latestCommit");

export interface GetBlameRequest {
	uri: string;
	startLine: number;
	endLine: number;
}

export interface GetBlameResponse {
	blame: GetBlameLineInfo[];
}

export interface GetBlameCommitInfo {
	sha: string;
	isUncommitted: boolean;
	formattedBlame: string;
	authorName: string;
	authorEmail: string;
	dateFromNow: string;
	dateFormatted: string;
	gravatarUrl: string;
	summary: string;
	prs: GetBlamePRInfo[];
	reviews: CSReview[];
}

export interface GetBlamePRInfo {
	providerId: string;
	providerName: string;
	id: string;
	title: string;
	url: string;
}

export interface GetBlameLineInfo extends GetBlameCommitInfo {
	diff: string;
}

export const GetBlameRequestType = new RequestType<GetBlameRequest, GetBlameResponse, void, void>(
	"codestream/scm/blame"
);

export interface DiffBranchesRequest {
	repoId: string;
	baseRef: string;
	headRef?: string;
}

export interface DiffBranchesResponse {
	filesChanged?: {
		patches: any[];
		data: string;
	};
	error?: string;
}

export const DiffBranchesRequestType = new RequestType<
	DiffBranchesRequest,
	DiffBranchesResponse,
	void,
	void
>("codestream/scm/branches/diff");

export interface CommitAndPushRequest {
	repoId: string;
	message: string;
	files: string[];
	pushAfterCommit: boolean;
}

export interface CommitAndPushResponse {
	success: boolean;
	error?: string;
}

export const CommitAndPushRequestType = new RequestType<
	CommitAndPushRequest,
	CommitAndPushResponse,
	void,
	void
>("codestream/scm/commitAndPush");

export interface GetCommitsFilesRequest {
	repoId: string;
	commits: string[];
}

export interface GetCommitsFilesResponse extends FetchThirdPartyPullRequestFilesResponse {}

export const GetCommitsFilesRequestType = new RequestType<
	GetCommitsFilesRequest,
	GetCommitsFilesResponse[],
	void,
	void
>("codestream/scm/commits/files");
