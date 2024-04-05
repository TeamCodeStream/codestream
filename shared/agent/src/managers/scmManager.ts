import * as paths from "path";

import { URI } from "vscode-uri";
import {
	CodeStreamDiffUriData,
	CommitAndPushRequest,
	CommitAndPushRequestType,
	CommitAndPushResponse,
	DiffBranchesRequest,
	DiffBranchesRequestType,
	DiffBranchesResponse,
	FetchAllRemotesRequest,
	FetchAllRemotesRequestType,
	FetchAllRemotesResponse,
	FetchBranchCommitsStatusRequest,
	FetchBranchCommitsStatusRequestType,
	FetchBranchCommitsStatusResponse,
	FetchForkPointRequest,
	FetchForkPointRequestType,
	FetchForkPointResponse,
	FetchRemoteBranchRequest,
	FetchRemoteBranchRequestType,
	FetchRemoteBranchResponse,
	GetCommitsFilesRequest,
	GetCommitsFilesRequestType,
	GetCommitsFilesResponse,
	GetFileContentsAtRevisionRequest,
	GetFileContentsAtRevisionRequestType,
	GetFileContentsAtRevisionResponse,
	GetFileScmInfoRequest,
	GetFileScmInfoRequestType,
	GetFileScmInfoResponse,
	GetLatestCommitScmRequest,
	GetLatestCommitScmRequestType,
	GetLatestCommitScmResponse,
	GetLatestCommittersRequest,
	GetLatestCommittersRequestType,
	GetLatestCommittersResponse,
	GetReposScmRequest,
	GetReposScmRequestType,
	GetReposScmResponse,
	ReposScm,
} from "@codestream/protocols/agent";
import { CSMe } from "@codestream/protocols/api";
import { Iterables } from "@codestream/utils/system/iterable";

import { SessionContainer } from "../container";
import { GitRepositoryExtensions } from "../extensions";
import { EMPTY_TREE_SHA, GitRemote, GitRepository } from "../git/gitService";
import { Logger } from "../logger";
import { CodeStreamSession } from "../session";
import { Dates, log, lsp, lspHandler, Strings } from "../system";
import * as csUri from "../system/uri";

import toFormatter = Dates.toFormatter;
import toGravatar = Strings.toGravatar;

import { isWindows } from "../git/shell";

@lsp
export class ScmManager {
	constructor(public readonly session: CodeStreamSession) {}

	@lspHandler(GetReposScmRequestType)
	@log()
	async getRepos(request?: GetReposScmRequest): Promise<GetReposScmResponse> {
		const cc = Logger.getCorrelationContext();
		let gitError;
		let repositories: GitRepository[] = [];
		let branches: (string | undefined)[] = [];
		let remotes: GitRemote[][] = [];
		let user: CSMe | undefined = undefined;

		let withSubDirectoriesDepth: number | undefined = undefined;

		const { repoIdentifier } = SessionContainer.instance();

		try {
			const { git } = SessionContainer.instance();
			repositories = Array.from(await git.getRepositories());
			Logger.debug(`getRepos: repositories ${JSON.stringify(repositories)}`);
			if (request && request.inEditorOnly && repositories) {
				repositories = repositories.filter(_ => _.isInWorkspace);
				Logger.debug(`getRepos: repositories inEditorOnly ${JSON.stringify(repositories)}`);
			}
			if (request && request.includeCurrentBranches) {
				branches = await Promise.all(repositories.map(repo => git.getCurrentBranch(repo.path)));
			}
			if (request && (request.includeRemotes || request.includeProviders)) {
				remotes = await Promise.all(repositories.map(repo => repo.getRemotes()));
			}
			if (request && request.includeConnectedProviders) {
				user = await SessionContainer.instance().users.getMe();
			}
			if (
				request &&
				request.withSubDirectoriesDepth != null &&
				request.withSubDirectoriesDepth > 0
			) {
				// only allow 2!
				withSubDirectoriesDepth = 2;
			}
		} catch (ex) {
			gitError = ex.toString();
			Logger.error(ex, cc);
			debugger;
		}

		const response: GetReposScmResponse = {
			error: gitError,
		};

		if (request && request.includeConnectedProviders) {
			response.repositories = await Promise.all(
				repositories.map(async (repo, index) => {
					const repoScm = GitRepositoryExtensions.toRepoScm(
						repo,
						branches[index],
						remotes[index],
						withSubDirectoriesDepth
					);
					repoScm.providerId = (await repo.getPullRequestProvider(user))?.providerId;
					return repoScm;
				})
			);
		} else {
			response.repositories = repositories.map((repo, index) =>
				GitRepositoryExtensions.toRepoScm(
					repo,
					branches[index],
					remotes[index],
					withSubDirectoriesDepth
				)
			);
		}

		if (request && request.guessProjectTypes) {
			for (const repo of response.repositories) {
				const { projectType, projects } = await repoIdentifier.identifyRepo(repo);
				repo.projectType = projectType;
				repo.projects = projects;
			}
		}

		Logger.debug(`getRepos: repositories before specialCase ${JSON.stringify(repositories)}`);
		response.repositories = this.specialCase(response.repositories);
		Logger.log(`getRepos: ${JSON.stringify(request)} ${JSON.stringify(repositories)}`);
		return response;
	}

	// Handle odd case caused by https://github.com/redhat-developer/vscode-java/issues/634
	// Given any repos with same remoId - if a repo path ends with `/bin/default` then remove it
	specialCase(repositories?: ReposScm[]): ReposScm[] | undefined {
		if (!repositories) {
			return repositories;
		}
		const repoIds = new Set<string>();
		const dupeRepoIds = new Set<string>();
		for (const repo of repositories) {
			if (!repo.id) {
				continue;
			}
			if (repoIds.has(repo.id)) {
				dupeRepoIds.add(repo.id);
				continue;
			}
			repoIds.add(repo.id);
		}
		for (const dupeId of dupeRepoIds) {
			const dupes = repositories.filter(repo => repo.id === dupeId);
			for (const dupe of dupes) {
				if (dupe.path.endsWith("/bin/default")) {
					const removeIndex = repositories.findIndex(
						repo => repo.id === dupe.id && repo.path === dupe.path
					);
					if (removeIndex != -1) {
						repositories.splice(removeIndex, 1);
					}
				}
			}
		}
		return repositories;
	}

	@lspHandler(GetFileScmInfoRequestType)
	@log()
	async getFileInfo({ uri: documentUri }: GetFileScmInfoRequest): Promise<GetFileScmInfoResponse> {
		const cc = Logger.getCorrelationContext();

		const uri = URI.parse(documentUri);

		let branch: string | undefined;
		let file: string | undefined;
		let remotes: { name: string; url: string }[] | undefined;
		let rev: string | undefined;

		let gitError;
		let repoPath;
		let repoId;
		let ignored;
		if (uri.scheme === "file") {
			const { git } = SessionContainer.instance();

			try {
				repoPath = await git.getRepoRoot(uri.fsPath);
				if (repoPath !== undefined) {
					file = Strings.normalizePath(paths.relative(repoPath, uri.fsPath), isWindows);
					if (file[0] === "/") {
						file = file.substr(1);
					}

					branch = await git.getCurrentBranch(uri.fsPath);
					try {
						rev = await git.getFileCurrentRevision(uri.fsPath);
					} catch (ex) {
						// this is when we're looking up a directory not a file,
						// getFileCurrentRevision will fail
					}

					const gitRemotes = await git.getRepoRemotes(repoPath);
					remotes = [...Iterables.map(gitRemotes, r => ({ name: r.name, url: r.normalizedUrl }))];

					const repo = await git.getRepositoryByFilePath(repoPath);
					repoId = repo && repo.id;
				}
			} catch (ex) {
				gitError = ex.toString();
				Logger.error(ex, cc);
				debugger;
			}
		} else if (uri.scheme === "codestream-diff") {
			ignored = true;
		}

		return {
			uri: uri.toString(true),
			scm:
				repoPath !== undefined
					? {
							file: file!,
							repoPath: repoPath,
							repoId,
							revision: rev!,
							remotes: remotes || [],
							branch,
					  }
					: undefined,
			error: gitError,
			ignored: ignored,
		};
	}

	@lspHandler(GetLatestCommittersRequestType)
	async getLatestCommittersAllRepos(
		request: GetLatestCommittersRequest
	): Promise<GetLatestCommittersResponse> {
		const cc = Logger.getCorrelationContext();
		const committers: { [email: string]: string } = {};
		const { git } = SessionContainer.instance();
		const oneDay = 60 * 60 * 24;
		const since = oneDay * 180; // six months
		let gitError;
		try {
			const openRepos = await this.getRepos({});
			const { repositories = [] } = openRepos;
			(
				await Promise.all(
					repositories
						.filter(r => r.id)
						.map(repo => git.getCommittersForRepo(repo.path, since, request.includeNoreply))
				)
			).map(result => {
				Object.keys(result).forEach(key => {
					committers[key] = result[key];
				});
			});
		} catch (ex) {
			gitError = ex.toString();
			Logger.error(ex, cc);
			debugger;
		}

		return {
			scm: committers,
			error: gitError,
		};
	}

	@lspHandler(GetLatestCommitScmRequestType)
	async getLatestCommit(request: GetLatestCommitScmRequest): Promise<GetLatestCommitScmResponse> {
		const { git, repositoryMappings } = SessionContainer.instance();

		const repo = await git.getRepositoryById(request.repoId);
		const repoPath = repo?.path || "";

		const commit = await git.getCommit(repoPath, request.branch);
		return { shortMessage: commit ? commit.shortMessage : "" };
	}

	@lspHandler(CommitAndPushRequestType)
	async commitAndPush(request: CommitAndPushRequest): Promise<CommitAndPushResponse> {
		const { git, repositoryMappings } = SessionContainer.instance();

		const repo = await git.getRepositoryById(request.repoId);
		const repoPath = repo?.path || "";

		const { success, error } = await git.commitAndPush(
			repoPath,
			request.message,
			request.files,
			request.pushAfterCommit
		);
		return { success, error };
	}

	@log()
	@lspHandler(FetchAllRemotesRequestType)
	async fetchAllRemotes(request: FetchAllRemotesRequest): Promise<FetchAllRemotesResponse> {
		const { git } = SessionContainer.instance();

		const repo = await git.getRepositoryById(request.repoId);
		if (!repo) throw new Error(`fetchAllRemotes: Could not load repo with ID ${request.repoId}`);

		await git.fetchAllRemotes(repo.path);
		return true;
	}

	@log()
	@lspHandler(FetchRemoteBranchRequestType)
	async fetchRemoteBranch(request: FetchRemoteBranchRequest): Promise<FetchRemoteBranchResponse> {
		const { git } = SessionContainer.instance();

		const repo = await git.getRepositoryById(request.repoId);
		if (!repo) throw new Error(`fetchRemoteBranch: Could not load repo with ID ${request.repoId}`);

		const remoteBranch = await git.getBranchRemote(repo.path, request.branchName);
		if (!remoteBranch) {
			throw new Error(
				`fetchRemoteBranch: Couldn't find branchRemote for ${repo.path} and ${request.branchName}`
			);
		}

		const { error } = await git.fetchRemoteBranch(repo.path, ".", remoteBranch, request.branchName);
		if (error) {
			throw new Error(error);
		}
		return true;
	}

	@log()
	@lspHandler(FetchBranchCommitsStatusRequestType)
	async fetchBranchCommitsStatus(
		request: FetchBranchCommitsStatusRequest
	): Promise<FetchBranchCommitsStatusResponse> {
		const { git } = SessionContainer.instance();

		const repo = await git.getRepositoryById(request.repoId);
		let repoPath;
		if (repo) {
			repoPath = repo.path;
		}

		if (!repoPath) {
			throw new Error(`getFileContentsAtRevision: Could not load repo with ID ${request.repoId}`);
		}

		await git.fetchAllRemotes(repoPath);

		const baseBranchRemote = await git.getBranchRemote(repoPath, request.branchName);
		const commitsBehindOrigin = await git.getBranchCommitsStatus(
			repoPath,
			baseBranchRemote!,
			request.branchName
		);

		return {
			commitsBehindOrigin,
		};
	}

	async getFileContentsForUri(uri: string): Promise<string> {
		const { scm } = SessionContainer.instance();
		const parsedUri = csUri.Uris.fromCodeStreamDiffUri<CodeStreamDiffUriData>(uri);
		if (!parsedUri) {
			Logger.warn(`getFileContentsForUri: unable to parse URI ${uri}`);
			return "";
		}
		const sha = parsedUri.side === "left" ? parsedUri.leftSha : parsedUri.rightSha;
		const contentsResponse = await scm.getFileContentsAtRevision({
			repoId: parsedUri.repoId,
			path: parsedUri.path,
			sha,
		});
		return contentsResponse.content;
	}

	@log()
	@lspHandler(GetFileContentsAtRevisionRequestType)
	async getFileContentsAtRevision(
		request: GetFileContentsAtRevisionRequest
	): Promise<GetFileContentsAtRevisionResponse> {
		const { git, repositoryMappings } = SessionContainer.instance();

		let repoPath;
		if (request.repoId) {
			const repo = await git.getRepositoryById(request.repoId);
			repoPath = repo?.path;
		} else {
			repoPath = await git.getRepoRoot(request.path);
		}

		if (!repoPath) {
			if (request.repoId) {
				throw new Error(`getFileContentsAtRevision: Could not load repo with ID ${request.repoId}`);
			} else {
				throw new Error(`getFileContentsAtRevision: Could not find repo for file ${request.path}`);
			}
		}

		const filePath = request.repoId ? paths.join(repoPath, request.path) : request.path;
		if (request.fetchAllRemotes) {
			await git.fetchAllRemotes(repoPath);
		}
		const contents = (await git.getFileContentForRevision(filePath, request.sha)) || "";
		return {
			repoRoot: repoPath,
			content: contents,
		};
	}

	@log()
	@lspHandler(DiffBranchesRequestType)
	async diffBranches(request: DiffBranchesRequest): Promise<DiffBranchesResponse> {
		const { git, repositoryMappings } = SessionContainer.instance();

		const repo = await git.getRepositoryById(request.repoId);
		const repoPath = repo?.path;
		if (!repoPath) throw new Error(`diffBranches: Could not load repo with ID ${request.repoId}`);

		const filesChanged = (await git.diffBranches(repoPath, request.baseRef, request.headRef)) || [];
		return {
			filesChanged,
		};
	}

	@lspHandler(FetchForkPointRequestType)
	@log()
	async getForkPointRequestType(
		request: FetchForkPointRequest
	): Promise<FetchForkPointResponse | undefined> {
		const cc = Logger.getCorrelationContext();
		const { git } = SessionContainer.instance();

		const repo = await git.getRepositoryById(request.repoId);
		const repoPath = repo?.path;

		if (!repoPath) {
			Logger.warn("getForkPointRequestType: no repoPath");
			return {
				sha: "",
				error: {
					type: "REPO_NOT_FOUND",
				},
			};
		}
		if (!request.baseSha) {
			Logger.warn("getForkPointRequestType: no baseSha");
			return {
				sha: "",
				error: {
					message: "baseSha is required",
					type: "REPO_NOT_FOUND",
				},
			};
		}
		if (!request.headSha) {
			Logger.warn("getForkPointRequestType: no headSha");
			return {
				sha: "",
				error: {
					message: "headSha is required",
					type: "REPO_NOT_FOUND",
				},
			};
		}
		try {
			let fetchReferenceFailed = false;
			if (repo && request.ref) {
				fetchReferenceFailed = !(await git.fetchReference(repo, request.ref));
			}
			const shas = [request.baseSha, request.headSha];
			const results = await Promise.all(
				shas.map(sha => git.isValidReference(repoPath as string, sha))
			);
			// if no results, or there is at least 1 false, fetch all remotes
			if (!results || results.some(_ => !_)) {
				Logger.warn(
					`getForkPointRequestType: Could not find shas ${shas.join(
						" or "
					)}...fetching all remotes repoPath=${repoPath}`
				);
				await git.fetchAllRemotes(repoPath);
			}

			const forkPointSha =
				(await git.getRepoBranchForkPoint(repoPath, request.baseSha, request.headSha)) || "";

			if (!forkPointSha) {
				if (fetchReferenceFailed) {
					Logger.warn("getForkPointRequestType: ref not found");
					return {
						sha: "",
						error: {
							message: "ref not found",
							type: "REFS_NOT_FOUND",
						},
					};
				}

				Logger.warn(
					`getForkPointRequestType: Could not find forkpoint for shas ${shas.join(
						" and "
					)}. repoPath=${repoPath}`
				);
				return {
					sha: "",
					error: {
						type: "COMMIT_NOT_FOUND",
					},
				};
			}
			if (forkPointSha) {
				return {
					sha: forkPointSha,
				};
			}
			return undefined;
		} catch (ex) {
			Logger.error(ex, cc);
			debugger;
		}
		return undefined;
	}

	@log()
	@lspHandler(GetCommitsFilesRequestType)
	async getCommitsFiles(request: GetCommitsFilesRequest): Promise<GetCommitsFilesResponse[]> {
		const changedFiles: GetCommitsFilesResponse[] = [];
		const { git, scm: scmManager, repositoryMappings } = SessionContainer.instance();

		const repo = await git.getRepositoryById(request.repoId);
		const repoPath = repo?.path;

		if (!repoPath) {
			throw new Error(`Could not load repo with ID ${request.repoId}`);
		}
		if (request.commits.length > 1) {
			const firstCommitAncestor = await git.findAncestor(
				repoPath,
				request.commits[0],
				1,
				() => true
			);
			request.commits[0] = firstCommitAncestor ? firstCommitAncestor.ref : EMPTY_TREE_SHA;
		}

		const commitChanges = await git.getCommitChanges(repoPath, request.commits);
		if (commitChanges) {
			commitChanges.map(commitChange => {
				const filename = commitChange.newFileName ? commitChange.newFileName.replace("b/", "") : "";
				commitChange.hunks.map(hunk => {
					changedFiles.push({
						sha: request.commits ? request.commits[0] : "",
						filename,
						status: "",
						additions: hunk.additions,
						changes: hunk.changes,
						deletions: hunk.deletions,
						patch: hunk.patch,
					});
				});
			});
		}

		return changedFiles;
	}
}
