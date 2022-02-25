"use strict";
import { ParsedDiff } from "diff";
import * as fs from "fs";
import { flatten } from "lodash-es";
import { decompressFromBase64 } from "lz-string";
import * as path from "path";
import { CodeStreamSession } from "session";
import { URI } from "vscode-uri";
import { MessageType } from "../api/apiProvider";
import { Container, SessionContainer, SessionServiceContainer } from "../container";
import { EMPTY_TREE_SHA, GitCommit, GitRemote, GitRepository } from "../git/gitService";
import { Logger } from "../logger";
import {
	CheckPullRequestPreconditionsRequest,
	CheckPullRequestPreconditionsRequestType,
	CheckPullRequestPreconditionsResponse,
	CheckReviewPreconditionsRequest,
	CheckReviewPreconditionsRequestType,
	CheckReviewPreconditionsResponse,
	CreatePullRequestRequest,
	CreatePullRequestRequestType,
	CreatePullRequestResponse,
	CreateReviewRequest,
	CreateReviewsForUnreviewedCommitsRequest,
	CreateReviewsForUnreviewedCommitsRequestType,
	CreateReviewsForUnreviewedCommitsResponse,
	DeleteReviewRequest,
	DeleteReviewRequestType,
	DidDetectUnreviewedCommitsNotificationType,
	EndReviewRequest,
	EndReviewRequestType,
	EndReviewResponse,
	FetchReviewCheckpointDiffsResponse,
	FetchReviewsRequest,
	FetchReviewsRequestType,
	FetchReviewsResponse,
	GetAllReviewContentsRequest,
	GetAllReviewContentsRequestType,
	GetAllReviewContentsResponse,
	GetReviewContentsLocalRequest,
	GetReviewContentsLocalRequestType,
	GetReviewContentsRequest,
	GetReviewContentsRequestType,
	GetReviewContentsResponse,
	GetReviewCoverageRequest,
	GetReviewCoverageRequestType,
	GetReviewCoverageResponse,
	GetReviewRequest,
	GetReviewRequestType,
	GetReviewResponse,
	PauseReviewRequest,
	PauseReviewRequestType,
	PauseReviewResponse,
	ReviewFileContents,
	ReviewRepoContents,
	StartReviewRequest,
	StartReviewRequestType,
	StartReviewResponse,
	UpdateReviewRequest,
	UpdateReviewRequestType,
	UpdateReviewResponse
} from "../protocol/agent.protocol";
import {
	CSReview,
	CSReviewChangeset,
	CSReviewCheckpoint,
	CSReviewDiffs,
	CSTransformedReviewChangeset,
	FileStatus
} from "../protocol/api.protocol";
import { log, lsp, lspHandler, Strings } from "../system";
import { gate } from "../system/decorators/gate";
import { xfs } from "../xfs";
import { CachedEntityManagerBase, Id } from "./entityManager";
import { trackReviewPostCreation } from "./postsManager";
import Timer = NodeJS.Timer;

const uriRegexp = /codestream-diff:\/\/(\w+)\/(\w+)\/(\w+)\/(\w+)\/(.+)/;

@lsp
export class ReviewsManager extends CachedEntityManagerBase<CSReview> {
	static parseUri(
		uri: string
	): {
		reviewId: string;
		checkpoint: CSReviewCheckpoint;
		repoId: string;
		version: string;
		path: string;
	} {
		const match = uriRegexp.exec(uri);
		if (match == null) throw new Error(`URI ${uri} doesn't match codestream-diff format`);

		const [, reviewId, checkpoint, repoId, version, path] = match;

		return {
			reviewId,
			checkpoint: checkpoint === "undefined" ? undefined : parseInt(checkpoint, 10),
			repoId,
			version,
			path
		};
	}

	private currentBranches = new Map<string, string | undefined>();

	public async initializeCurrentBranches() {
		const { git } = SessionContainer.instance();
		this.currentBranches.clear();
		const repos = await git.getRepositories();
		for (const repo of repos) {
			if (!repo.id) continue;
			const currentBranch = await git.getCurrentBranch(repo.path, true);
			this.currentBranches.set(repo.id, currentBranch);
		}
	}

	@lspHandler(FetchReviewsRequestType)
	@log()
	async get(request?: FetchReviewsRequest): Promise<FetchReviewsResponse> {
		let reviews = await this.getAllCached();
		if (request != null) {
			if (request.reviewIds?.length ?? 0 > 0) {
				reviews = reviews.filter(r => request.reviewIds!.includes(r.id));
			}
			if (request.streamIds?.length ?? 0 > 0) {
				reviews = reviews.filter(r => request.streamIds!.includes(r.streamId));
			}
		}

		return { reviews };
	}

	@lspHandler(GetReviewRequestType)
	@log()
	async getReview(request: GetReviewRequest): Promise<GetReviewResponse> {
		const review = await this.getById(request.reviewId);
		return { review };
	}

	async getDiffs(
		reviewId: string,
		repoId: string
	): Promise<{ checkpoint: CSReviewCheckpoint; diff: CSReviewDiffs }[]> {
		const diffsByRepo = await this.getAllDiffs(reviewId);
		return diffsByRepo[repoId];
	}

	private diffsCache = new Map<
		string,
		{ version: number; responses: FetchReviewCheckpointDiffsResponse }
	>();
	private diffsCacheTimeout: Timer | undefined;

	@gate()
	async getAllDiffs(
		reviewId: string
	): Promise<{ [repoId: string]: { checkpoint: CSReviewCheckpoint; diff: CSReviewDiffs }[] }> {
		const responses = await this.getReviewCheckpointDiffsResponses(reviewId);

		if (!responses || !responses.length) {
			throw new Error(`Cannot find diffs for review ${reviewId}`);
		}

		const result: {
			[repoId: string]: { checkpoint: CSReviewCheckpoint; diff: CSReviewDiffs }[];
		} = {};
		if (responses.length === 1 && responses[0].checkpoint === undefined) {
			const response = responses[0];
			result[response.repoId] = [{ checkpoint: 0, diff: response.diffs }];
		} else {
			for (const response of responses) {
				if (!result[response.repoId]) {
					result[response.repoId] = [];
				}
				result[response.repoId].push({ checkpoint: response.checkpoint, diff: response.diffs });
			}
		}
		return result;
	}

	private async getReviewCheckpointDiffsResponses(reviewId: string) {
		let responses;
		const cached = this.diffsCache.get(reviewId);
		const { version } = await this.getById(reviewId);
		if (cached && cached.version === version) {
			Logger.debug("ReviewsManager.getReviewCheckpointDiffsResponses: cache hit");
			responses = cached.responses;
		} else {
			Logger.debug("ReviewsManager.getReviewCheckpointDiffsResponses: cache miss");
			responses = await this.session.api.fetchReviewCheckpointDiffs({ reviewId });
			version && this.diffsCache.set(reviewId, { version, responses });
		}
		this.diffsCacheTimeout && clearTimeout(this.diffsCacheTimeout);
		this.diffsCacheTimeout = setTimeout(() => {
			Logger.debug("ReviewsManager.getReviewCheckpointDiffsResponses: clearing cache");
			this.diffsCache.clear();
		}, 10 * 60 * 1000);
		return responses;
	}

	@lspHandler(GetReviewContentsLocalRequestType)
	@log()
	async getContentsLocal(
		request: GetReviewContentsLocalRequest
	): Promise<GetReviewContentsResponse> {
		const { git, reviews } = SessionContainer.instance();

		const repo = await git.getRepositoryById(request.repoId);
		if (!repo) {
			throw new Error(`Could not load repo with ID ${request.repoId}`);
		}

		const leftBasePath = path.join(repo.path, request.oldPath || request.path);
		let leftContents;
		if (request.editingReviewId) {
			const latestContentsInReview = await reviews.getContents({
				repoId: request.repoId,
				path: request.path,
				reviewId: request.editingReviewId,
				checkpoint: undefined
			});
			leftContents = latestContentsInReview.right;
		}
		if (leftContents === undefined) {
			// either we're not amending a review, or the file was not included in any previous checkpoint
			leftContents = (await git.getFileContentForRevision(leftBasePath, request.baseSha)) || "";
		}

		const rightBasePath = path.join(repo.path, request.path);
		let rightContents: string | undefined = "";
		switch (request.rightVersion) {
			case "head":
				const revision = await git.getFileCurrentRevision(rightBasePath);
				if (revision) {
					rightContents = await git.getFileContentForRevision(rightBasePath, revision);
				}
				break;
			case "staged":
				rightContents = await git.getFileContentForRevision(rightBasePath, "");
				break;
			case "saved":
				rightContents = await xfs.readText(rightBasePath);
				break;
		}

		return {
			repoRoot: repo.path,
			left: Strings.normalizeFileContents(leftContents),
			right: Strings.normalizeFileContents(rightContents || "")
		};
	}

	@lspHandler(GetAllReviewContentsRequestType)
	@log()
	async getAllContents(
		request: GetAllReviewContentsRequest
	): Promise<GetAllReviewContentsResponse> {
		const { reviewId, checkpoint } = request;
		const review = await this.getById(reviewId);
		const repos: ReviewRepoContents[] = [];

		const changesetByRepo = new Map<string, CSReviewChangeset>();
		for (const changeset of review.reviewChangesets) {
			if (checkpoint === undefined || checkpoint === changeset.checkpoint) {
				changesetByRepo.set(changeset.repoId, changeset);
			}
		}

		for (const changeset of Array.from(changesetByRepo.values())) {
			const files: ReviewFileContents[] = [];
			const modifiedFiles =
				checkpoint !== undefined ? changeset.modifiedFilesInCheckpoint : changeset.modifiedFiles;
			for (const file of modifiedFiles) {
				const contents = await this.getContents({
					reviewId: review.id,
					repoId: changeset.repoId,
					checkpoint,
					path: file.file
				});
				files.push({
					leftPath: file.oldFile,
					rightPath: file.file,
					path: file.file,
					left: contents.left || "",
					right: contents.right || ""
				});
			}

			repos.push({
				repoId: changeset.repoId,
				files
			});
		}
		return { repos };
	}

	@lspHandler(GetReviewCoverageRequestType)
	@log()
	async getCoverage(request: GetReviewCoverageRequest): Promise<GetReviewCoverageResponse> {
		const documentUri = URI.parse(request.textDocument.uri);
		const filePath = documentUri.fsPath;
		const { git } = SessionContainer.instance();
		const repo = await git.getRepositoryByFilePath(filePath);
		const commitShas = await git.getCommitShaByLine(filePath);
		const reviews = (await this.getAllCached()).filter(r =>
			r.reviewChangesets?.some(c => c.repoId === repo?.id)
		);
		const reviewIds = commitShas.map(
			commitSha =>
				reviews.find(review =>
					review.reviewChangesets.some(ch => ch.commits.some(c => c.sha === commitSha))
				)?.id
		);

		return {
			reviewIds
		};
	}

	@lspHandler(GetReviewContentsRequestType)
	@log()
	async getContents(request: GetReviewContentsRequest): Promise<GetReviewContentsResponse> {
		const { git } = SessionContainer.instance();
		const { reviewId, repoId, checkpoint, path } = request;
		const repo = await git.getRepositoryById(repoId);
		if (checkpoint === undefined) {
			const review = await this.getById(request.reviewId);

			const containsFile = (c: CSReviewChangeset) =>
				c.repoId === request.repoId &&
				c.modifiedFilesInCheckpoint.find(mf => mf.file === request.path);
			const firstChangesetContainingFile = review.reviewChangesets.slice().find(containsFile);
			const latestChangesetContainingFile = review.reviewChangesets
				.slice()
				.reverse()
				.find(containsFile);

			if (!firstChangesetContainingFile || !latestChangesetContainingFile) {
				return { fileNotIncludedInReview: true };
			}

			const firstContents = await this.getContentsForCheckpoint(
				reviewId,
				repoId,
				firstChangesetContainingFile.checkpoint,
				path
			);
			const latestContents = await this.getContentsForCheckpoint(
				reviewId,
				repoId,
				latestChangesetContainingFile.checkpoint,
				path
			);

			return {
				repoRoot: repo?.path,
				left: firstContents.left,
				right: latestContents.right,
				leftPath: firstContents.leftPath,
				rightPath: latestContents.rightPath
			};
		} else if (checkpoint === 0) {
			return this.getContentsForCheckpoint(reviewId, repoId, 0, path);
		} else {
			const review = await this.getById(request.reviewId);
			const containsFilePriorCheckpoint = (c: CSReviewChangeset) =>
				c.repoId === request.repoId &&
				(c.checkpoint || 0) < checkpoint &&
				c.modifiedFilesInCheckpoint.find(mf => mf.file === request.path);
			const previousChangesetContainingFile = review.reviewChangesets
				.slice()
				.reverse()
				.find(containsFilePriorCheckpoint);

			const previousContents =
				previousChangesetContainingFile &&
				(
					await this.getContentsForCheckpoint(
						reviewId,
						repoId,
						previousChangesetContainingFile.checkpoint,
						path
					)
				).right;
			const atRequestedCheckpoint = await this.getContentsForCheckpoint(
				reviewId,
				repoId,
				checkpoint,
				path
			);
			return {
				repoRoot: repo?.path,
				left: previousContents || atRequestedCheckpoint.left,
				right: atRequestedCheckpoint.right
			};
		}
	}

	async getContentsForCheckpoint(
		reviewId: string,
		repoId: string,
		checkpoint: CSReviewCheckpoint,
		filePath: string
	): Promise<GetReviewContentsResponse> {
		const { git } = SessionContainer.instance();
		const review = await this.getById(reviewId);
		const changeset = review.reviewChangesets.find(
			c => c.repoId === repoId && c.checkpoint === checkpoint
		);
		if (!changeset) throw new Error(`Could not find changeset with repoId ${repoId}`);
		const fileInfo =
			changeset.modifiedFilesInCheckpoint.find(f => f.file === filePath) ||
			changeset.modifiedFiles.find(f => f.file === filePath);
		if (!fileInfo) throw new Error(`Could not find changeset file information for ${filePath}`);

		const diffs = await this.getDiffs(reviewId, repoId);
		const checkpointDiff = diffs.find(d => d.checkpoint === changeset.checkpoint)!;
		const diff = checkpointDiff.diff;

		const leftDiffs =
			diff.leftDiffs ||
			(JSON.parse(decompressFromBase64(diff.leftDiffsCompressed!) as string) as ParsedDiff[]);
		const leftDiff = leftDiffs.find(
			d => d.newFileName === fileInfo.oldFile || d.oldFileName === fileInfo.oldFile
		);

		const leftBaseRelativePath =
			(leftDiff && leftDiff.oldFileName !== "/dev/null" && leftDiff.oldFileName) ||
			fileInfo.oldFile;
		const rightDiffs =
			diff.rightDiffs ||
			(JSON.parse(decompressFromBase64(diff.rightDiffsCompressed!) as string) as ParsedDiff[]);
		const rightDiff = rightDiffs?.find(
			d => d.newFileName === fileInfo.file || d.oldFileName === fileInfo.file
		);
		const rightBaseRelativePath =
			(rightDiff && rightDiff.oldFileName !== "/dev/null" && rightDiff.oldFileName) ||
			fileInfo.file;

		const repo = await git.getRepositoryById(repoId);
		if (!repo) {
			throw new Error(`Could not load repo with ID ${repoId}`);
		}

		const leftBasePath = path.join(repo.path, leftBaseRelativePath);
		const rightBasePath = path.join(repo.path, rightBaseRelativePath);

		const isNewFile =
			fileInfo.statusX === FileStatus.added || fileInfo.statusX === FileStatus.untracked;
		const leftBaseContents = isNewFile
			? ""
			: (await git.getFileContentForRevision(leftBasePath, diff.leftBaseSha)) || "";
		const leftContents = Strings.applyPatchToNormalizedContents(leftBaseContents, leftDiff);

		const rightBaseContents = isNewFile
			? ""
			: diff.leftBaseSha === diff.rightBaseSha
			? leftBaseContents
			: (await git.getFileContentForRevision(rightBasePath, diff.rightBaseSha)) || "";
		const rightContents = Strings.applyPatchToNormalizedContents(rightBaseContents, rightDiff);

		return {
			repoRoot: repo.path,
			left: leftContents,
			right: rightContents,
			leftPath: leftBaseRelativePath,
			rightPath: rightBaseRelativePath
		};
	}

	@lspHandler(UpdateReviewRequestType)
	@log()
	async update(request: UpdateReviewRequest): Promise<UpdateReviewResponse> {
		let isAmending = false;
		let reviewChangesets: CSTransformedReviewChangeset[] = [];
		if (request.repoChanges && request.repoChanges.length) {
			isAmending = true;
			const { posts } = SessionContainer.instance();
			reviewChangesets = (await Promise.all(
				request.repoChanges
					.map(rc => posts.buildChangeset(rc, request.id))
					.filter(_ => _ !== undefined)
			)) as CSTransformedReviewChangeset[];
			request.$addToSet = {
				reviewChangesets: reviewChangesets
			};
			delete request.repoChanges;
		}

		const updateResponse = await this.session.api.updateReview(request);
		const [review] = await this.resolve({
			type: MessageType.Reviews,
			data: [updateResponse.review]
		});

		if (isAmending && reviewChangesets.length) {
			this.trackReviewCheckpointCreation(request.id, reviewChangesets);
		}

		return { review };
	}

	@lspHandler(DeleteReviewRequestType)
	@log()
	delete(request: DeleteReviewRequest) {
		return this.session.api.deleteReview(request);
	}

	@lspHandler(CheckReviewPreconditionsRequestType)
	@log()
	async checkReviewPreconditions(
		request: CheckReviewPreconditionsRequest
	): Promise<CheckReviewPreconditionsResponse> {
		Logger.log(`Checking preconditions for review ${request.reviewId}`);
		const { git, repositoryMappings } = SessionContainer.instance();
		const review = await this.getById(request.reviewId);
		const diffsByRepo = await this.getAllDiffs(review.id);
		const repoRoots: { [repoId: string]: string } = {};
		for (const repoId in diffsByRepo) {
			const repo = await git.getRepositoryById(repoId);
			const repoPath = repo?.path;
			if (repoPath == null) {
				Logger.log(`Cannot perform review ${request.reviewId}: REPO_NOT_FOUND`);
				return {
					success: false,
					error: {
						message: "The git repository for this review is not currently open in the IDE",
						type: "REPO_NOT_FOUND"
					}
				};
			}
			repoRoots[repoId] = repoPath;

			const diffs = diffsByRepo[repoId];
			for (const d of diffs) {
				const { leftBaseSha, rightBaseSha } = d.diff;
				let leftCommit = await git.getCommit(repoPath, leftBaseSha);
				let rightCommit = await git.getCommit(repoPath, rightBaseSha);
				if (
					(leftBaseSha !== EMPTY_TREE_SHA && leftCommit == null) ||
					(rightBaseSha !== EMPTY_TREE_SHA && rightCommit == null)
				) {
					const didFetch = await git.fetchAllRemotes(repoPath);
					if (didFetch) {
						leftCommit = leftCommit || (await git.getCommit(repoPath, d.diff.leftBaseSha));
						rightCommit = rightCommit || (await git.getCommit(repoPath, d.diff.rightBaseSha));
					}
				}

				function missingCommitError(sha: string, author: string) {
					const shortSha = sha.substr(0, 8);
					Logger.log(`Cannot perform review ${request.reviewId}: COMMIT_NOT_FOUND ${shortSha}`);
					return {
						success: false,
						error: {
							message: `A commit required to perform this review (${shortSha}, authored by ${author}) was not found in the local git repository. Fetch all remotes and try again.`,
							type: "COMMIT_NOT_FOUND"
						}
					};
				}

				if (leftBaseSha !== EMPTY_TREE_SHA && leftCommit == null) {
					return missingCommitError(d.diff.leftBaseSha, d.diff.leftBaseAuthor);
				}
				if (rightBaseSha !== EMPTY_TREE_SHA && rightCommit == null) {
					return missingCommitError(d.diff.rightBaseSha, d.diff.rightBaseAuthor);
				}
			}
		}

		Logger.log(`Review ${request.reviewId} preconditions check successful`);
		return {
			success: true,
			repoRoots
		};
	}

	@lspHandler(CheckPullRequestPreconditionsRequestType)
	@log()
	async checkPullRequestPreconditions(
		request: CheckPullRequestPreconditionsRequest,
		// @ts-ignore
		token: any,
		// used in tests
		serviceLocator: SessionServiceContainer | undefined = undefined
	): Promise<CheckPullRequestPreconditionsResponse> {
		const { git, providerRegistry, users } = serviceLocator || SessionContainer.instance();

		let warning = undefined;
		let repo: GitRepository | undefined;
		let review: CSReview | undefined = undefined;
		let isProviderConnected = false;

		try {
			if (request.reviewId) {
				review = await this.getById(request.reviewId);
				repo = await git.getRepositoryById(review.reviewChangesets[0].repoId);
			} else if (request.repoId) {
				repo = await git.getRepositoryById(request.repoId);
			}

			if (!repo) {
				return {
					success: false,
					error: { type: "REPO_NOT_FOUND" }
				};
			}

			const localModifications = await git.getHasModifications(repo.path);
			const localCommits = await git.getHasLocalCommits(repo.path, request.headRefName);
			if (request.reviewId && !request.skipLocalModificationsCheck) {
				if (localModifications) {
					return {
						success: false,
						error: { type: "HAS_LOCAL_MODIFICATIONS" }
					};
				}

				if (localCommits) {
					return {
						success: false,
						error: { type: "HAS_LOCAL_COMMITS" }
					};
				}
			} else {
				const currentBranch = await git.getCurrentBranch(repo.path);
				// if we're talking about a branch which isn't current, and we
				// aren't talking about a FR, then we don't care if there are
				// local uncommitted changes
				if (localModifications && request.headRefName === currentBranch) {
					warning = {
						type: "HAS_LOCAL_MODIFICATIONS"
					};
				}
				if (localCommits) {
					warning = {
						type: "HAS_LOCAL_COMMITS"
					};
				}
			}

			const headRefName = request.headRefName || (review && review.reviewChangesets[0].branch);

			let success = false;
			let isFork = undefined;
			let nameWithOwner = undefined;
			let remoteUrl: string | undefined = undefined;
			let providerId: string | undefined = undefined;
			let providerName: string | undefined = undefined;
			let providerRepoId: string | undefined = undefined;
			let owner: string | undefined = undefined;
			let currentRemote: string | undefined = undefined;
			let remotes: string[] | undefined;

			// given a user, get all of their connected providers
			const user = await users.getMe();
			const connectedProviders = await providerRegistry.getConnectedPullRequestProviders(user);
			// given the repo we care about, try to map it to one of the code host providers
			const providerRepo = await repo.getPullRequestProvider(user, connectedProviders);

			let providerRepoDefaultBranch: string | undefined = "";
			let baseRefName: string | undefined = request.baseRefName;

			// these remotes are from the user's local git
			if (providerRepo?.provider && providerRepo?.remotes?.length > 0) {
				// in a forked-repo model, where there might be multiple remotes, we want
				// the "origin" one (if exists) to come first, since it will have a parent
				// that will give the user the option to create a PR to its parent repo or
				// to itself.
				const weightedRemotes = await repo.getWeightedRemotesByStrategy(
					providerRepo.remotes,
					"prioritizeOrigin"
				);
				let lastError;
				const remotesLength = weightedRemotes.length;
				for (let i = 0; i < remotesLength; i++) {
					remoteUrl = weightedRemotes[i].webUrl;

					// get repo info, delegating to the actual provider's api
					const providerRepoInfo = await providerRegistry.getRepoInfo({
						providerId: providerRepo.providerId,
						remote: remoteUrl!
					});
					if (providerRepoInfo) {
						lastError = providerRepoInfo.error;
						if (lastError) {
							Logger.debug("checkPullRequestPreconditions lastError", {
								remoteUrl,
								providerId: providerRepo.providerId,
								error: lastError
							});
							if (i === remotesLength - 1) {
								return {
									success: false,
									error: providerRepoInfo.error
								};
							}
							continue;
						}

						providerRepoDefaultBranch = providerRepoInfo.defaultBranch;
						baseRefName = baseRefName || providerRepoDefaultBranch;
						if (providerRepoInfo.pullRequests?.length) {
							if (baseRefName && headRefName) {
								// if there's already an open pull requests for this base/head
								// and nameWithOwner combo, fail
								const existingPullRequest = providerRepoInfo.pullRequests.find(
									(_: any) =>
										_.baseRefName === baseRefName &&
										_.headRefName === headRefName &&
										_.nameWithOwner === providerRepoInfo.nameWithOwner
								);
								if (existingPullRequest) {
									return {
										success: false,
										error: {
											type: "ALREADY_HAS_PULL_REQUEST",
											url: existingPullRequest.url,
											id: existingPullRequest.id
										},
										provider: {
											id: providerRepo.providerId,
											name: providerRepo.providerName
										}
									};
								}
							}
						}

						success = true;

						currentRemote = weightedRemotes[i].name;

						providerId = providerRepo.providerId;
						providerName = providerRepo.providerName;
						remotes = providerRepo.remotes.map(_ => _.name);

						providerRepoId = providerRepoInfo.id;
						isFork = providerRepoInfo.isFork;
						nameWithOwner = providerRepoInfo.nameWithOwner;
						owner = providerRepoInfo.owner;
						break;
					}
				}
			}

			if (!success) {
				if (connectedProviders && connectedProviders.length) {
					return {
						success: false,
						error: {
							type: "REQUIRES_PROVIDER_REPO",
							message: `You are connected to ${Strings.phraseList(
								connectedProviders.map(_ => _.displayName)
							)}. To open a pull request with another provider please select your service`
						}
					};
				}
				// if we couldn't match a provider against a remote or there are multiple
				// we need the user to choose which provider.
				return {
					success: false,
					error: {
						type: "REQUIRES_PROVIDER"
					}
				};
			}

			let remoteBranch;
			const branches = await git.getBranches(repo.path);
			const remoteBranches = await git.getBranches(repo.path, true);
			const branchRemote = await git.getBranchRemote(repo.path, headRefName!);
			if (!branchRemote) {
				Logger.log(`Couldn't find branchRemote for ${repo.path} and ${headRefName}`);
				warning = {
					type: "REQUIRES_UPSTREAM"
				};
			} else {
				remoteBranch = branchRemote;
			}
			const baseBranchRemote = await git.getBranchRemote(repo.path, baseRefName!);
			const commitsBehindOrigin = await git.getBranchCommitsStatus(
				repo.path,
				baseBranchRemote!,
				baseRefName!
			);

			let pullRequestTemplateNames: string[] = [];
			let pullRequestTemplatePath;
			let pullRequestTemplate;
			if (repo.path) {
				pullRequestTemplate =
					(await xfs.readText(path.join(repo.path, "pull_request_template.md"))) ||
					(await xfs.readText(path.join(repo.path, "PULL_REQUEST_TEMPLATE.md"))) ||
					(await xfs.readText(path.join(repo.path, "docs/pull_request_template.md"))) ||
					(await xfs.readText(path.join(repo.path, "docs/PULL_REQUEST_TEMPLATE.md"))) ||
					(await xfs.readText(path.join(repo.path, ".github/pull_request_template.md"))) ||
					(await xfs.readText(path.join(repo.path, ".github/PULL_REQUEST_TEMPLATE.md"))) ||
					(await xfs.readText(path.join(repo.path, ".gitlab/merge_request_template.md")));

				const templatePath = path.join(repo.path, ".gitlab", "merge_request_templates");
				if (fs.existsSync(templatePath) && fs.lstatSync(templatePath).isDirectory()) {
					pullRequestTemplatePath = templatePath;
					pullRequestTemplateNames = (await fs.readdirSync(templatePath))
						.filter(filepath => filepath.endsWith(".md"))
						.map(filepath => filepath.replace(/\.md$/, ""));
				}
			}

			return {
				success: success,
				repo: {
					id: repo.id,
					remoteUrl,
					remotes,
					currentRemote,
					remoteBranch,
					branch: headRefName,
					branches: branches!.branches,
					remoteBranches: remoteBranches
						? remoteBranches.branchesMeta.filter(_ => _.branch.indexOf("HEAD ->") === -1)
						: undefined,
					commitsBehindOriginHeadBranch: commitsBehindOrigin
				},
				provider: {
					id: providerId,
					name: providerName,
					isConnected: isProviderConnected,
					pullRequestTemplate,
					pullRequestTemplateNames,
					pullRequestTemplatePath,
					pullRequestTemplateLinesCount: Math.max(
						(pullRequestTemplate || "").split("\n").length,
						8
					),
					repo: {
						providerRepoId,
						defaultBranch: providerRepoDefaultBranch,
						isFork,
						owner,
						nameWithOwner
					}
				},
				review: {
					title: review ? review.title : "",
					text: review ? review.text : ""
				},
				warning: warning
			};
		} catch (ex) {
			Logger.error(ex, "checkPullRequestPreconditions", {
				request
			});
			return {
				success: false,
				error: {
					message: typeof ex === "string" ? ex : ex.message,
					type: "UNKNOWN"
				}
			};
		}
	}

	@lspHandler(CreatePullRequestRequestType)
	@log()
	async createPullRequest(request: CreatePullRequestRequest): Promise<CreatePullRequestResponse> {
		const { git, providerRegistry, users } = SessionContainer.instance();
		try {
			let review: CSReview | undefined = undefined;
			let repoId = request.repoId;
			let reviewPermalink;
			let approvedAt;
			const approvers: { name: string }[] = [];
			if (request.reviewId) {
				review = await this.getById(request.reviewId);
				repoId = review.reviewChangesets[0].repoId;
				reviewPermalink = review.permalink;
				approvedAt = review.approvedAt;
				if (review.approvedBy) {
					for (const userId of Object.keys(review.approvedBy)) {
						try {
							const user = await users.getById(userId);
							if (user) {
								approvers.push({ name: user.username });
							}
						} catch {}
					}
				}
			}

			// if we have this, then we want to create the branch's remote
			if (request.requiresRemoteBranch && request.remoteName && repoId) {
				Logger.log(
					`createPullRequest: attempting to create remote? remoteName=${request.remoteName} repoId=${repoId}`
				);
				const repo = await git.getRepositoryById(repoId);
				if (!repo) {
					Logger.warn(`createPullRequest: repoId=${repoId} not found`);
					return {
						success: false,
						error: { type: "REPO_NOT_FOUND" }
					};
				}
				const branchRemote = await git.getBranchRemote(repo.path, request.headRefName);
				if (!branchRemote) {
					let result;
					let message;
					try {
						result = await git.setBranchRemote(
							repo.path,
							request.remoteName,
							request.headRefName,
							true
						);
					} catch (err) {
						const errorIndex = err.message.indexOf("error:");
						if (errorIndex > -1) {
							message = err.message.substring(errorIndex + 6).trim();
						} else {
							message = err.message;
						}
					}

					if (result) {
						Logger.log(`createPullRequest: setBranchRemote success. ${result}`);
					} else {
						Logger.warn(
							`createPullRequest: BRANCH_REMOTE_CREATION_FAILED ${repo.path} branch remote (${branchRemote}) for ${request.headRefName}`
						);
						return {
							success: false,
							error: { type: "BRANCH_REMOTE_CREATION_FAILED", message: message }
						};
					}
				} else {
					Logger.log(
						`createPullRequest: ${repo.path} branch remote (${branchRemote}) for ${request.headRefName}`
					);
				}
			}

			const data = {
				...request,
				metadata: {
					reviewPermalink,
					approvedAt,
					reviewers: approvers,
					addresses: request.addresses
				}
			};

			const result = await providerRegistry.createPullRequest(data);
			if (!result || result.error) {
				Logger.warn(
					`createPullRequest: failed ${
						result && result.error && result.error.message ? result.error.message : ""
					}`
				);
				return {
					success: false,
					error: {
						message: result && result.error && result.error.message ? result.error.message : "",
						type: "PROVIDER"
					}
				};
			}

			if (review) {
				void (await this.update({
					id: review.id,
					pullRequestProviderId: request.providerId,
					pullRequestTitle: result.title,
					pullRequestUrl: result.url
				}));

				Logger.log(
					`createPullRequest: success for reviewId=${request.reviewId} providerId=${request.providerId} headRefName=${request.headRefName} baseRefName=${request.baseRefName}`
				);
			} else {
				Logger.log(
					`createPullRequest: success for providerId=${request.providerId} headRefName=${request.headRefName} baseRefName=${request.baseRefName}`
				);
			}

			return {
				success: true,
				id: result.id,
				url: result.url
			};
		} catch (ex) {
			Logger.error(ex, "createPullRequest");
			return {
				success: false,
				error: {
					message: typeof ex === "string" ? ex : ex.message,
					type: "UNKNOWN"
				}
			};
		}
	}

	@lspHandler(StartReviewRequestType)
	@log()
	async startReview(request: StartReviewRequest): Promise<StartReviewResponse> {
		return {
			success: true
		};
	}

	@lspHandler(PauseReviewRequestType)
	@log()
	async pauseReview(request: PauseReviewRequest): Promise<PauseReviewResponse> {
		return {
			success: true
		};
	}

	@lspHandler(EndReviewRequestType)
	@log()
	async endReview(request: EndReviewRequest): Promise<EndReviewResponse> {
		return {
			success: true
		};
	}

	private trackReviewCheckpointCreation(
		reviewId: string,
		reviewChangesets: CSTransformedReviewChangeset[]
	) {
		process.nextTick(() => {
			try {
				const telemetry = Container.instance().telemetry;
				// get the highest number checkpoint by sorting by checkpoint descending
				const totalCheckpoints = reviewChangesets
					.map(_ => _!.checkpoint || 0)
					.sort((a, b) => (b || 0) - (a || 0))[0];
				const reviewProperties: {
					[key: string]: any;
				} = {
					"Review ID": reviewId,
					"Checkpoint Total": totalCheckpoints,
					"Files Added": reviewChangesets
						.map(_ => _.modifiedFiles.length)
						.reduce((acc, x) => acc + x),
					"Pushed Commits Added": reviewChangesets
						.map(_ => _.commits.filter(c => !c.localOnly).length)
						.reduce((acc, x) => acc + x),
					"Local Commits Added": reviewChangesets
						.map(_ => _.commits.filter(c => c.localOnly).length)
						.reduce((acc, x) => acc + x),
					"Staged Changes Added": reviewChangesets.some(_ => _.includeStaged),
					"Saved Changes Added": reviewChangesets.some(_ => _.includeSaved)
				};

				telemetry.track({
					eventName: "Checkpoint Added",
					properties: reviewProperties
				});
			} catch (ex) {
				Logger.error(ex);
			}
		});
	}
	/**
	 * Sets any undefined checkpoint properties to 0 and copy modifiedFiles to modifiedFilesInCheckpoint.
	 * Used with legacy reviews.
	 * @param  {CSReview} review
	 */
	private polyfillCheckpoints(review: CSReview) {
		if (review && review.reviewChangesets && review.reviewChangesets.length) {
			for (const rc of review.reviewChangesets) {
				if (rc.checkpoint === undefined) {
					rc.checkpoint = 0;
				}
				if (rc.modifiedFilesInCheckpoint === undefined) {
					rc.modifiedFilesInCheckpoint = rc.modifiedFiles;
				}
			}
		}
	}

	private unreviewedCommitCheckSeq = 0;
	private readonly unreviewedCommitsBySeq = new Map<
		number,
		{ repoId: string; branch?: string; commits: GitCommit[] }
	>();

	async checkUnreviewedCommits(repo: GitRepository): Promise<number> {
		const sequence = this.unreviewedCommitCheckSeq++;
		const repoId = repo.id;
		if (repoId == undefined) {
			return 0;
		}

		const { git, session } = SessionContainer.instance();
		if (git.isRebasing(repo.path)) {
			return 0;
		}

		// do not trigger if the user is just switching branches
		const currentBranch = await git.getCurrentBranch(repo.path, true);
		if (currentBranch !== this.currentBranches.get(repoId)) {
			this.currentBranches.set(repoId, currentBranch);
			return 0;
		}

		const allReviews = await this.getAllCached();
		const repoChangesets = flatten(
			allReviews
				.filter(r => !r.deactivated && r.reviewChangesets)
				.map(r => r.reviewChangesets.filter(rc => rc.repoId === repo?.id))
		);
		const commitShasInReviews = new Set(
			flatten(repoChangesets.map(rc => rc.commits.map(c => c.sha)))
		);

		const openReviews = allReviews.filter(
			r => !r.deactivated && r.status === "open" && r.reviewChangesets
		);
		const commitShasToOpenReviews = new Map<string, string>();
		for (const review of openReviews) {
			for (const rc of review.reviewChangesets) {
				if (rc.repoId !== repo?.id) continue;
				for (const commit of rc.commits) {
					commitShasToOpenReviews.set(commit.sha, review.id);
				}
			}
		}

		const gitLog = await git.getLog(repo, 10);
		if (!gitLog) return 0;

		const myEmail = await git.getConfig(repo.path, "user.email");
		const unreviewedCommits = [];
		let openReviewId: string | undefined = undefined;
		let lastAuthorEmail = undefined;
		for (const commit of gitLog.values()) {
			if (lastAuthorEmail === undefined) {
				lastAuthorEmail = commit.email;
			}
			if (commit.email !== lastAuthorEmail) {
				// Notify about commits from only one author. They will be grouped in a single review.
				break;
			}
			if (unreviewedCommits.length === 0 && commitShasToOpenReviews.has(commit.ref)) {
				// Found one that belongs to an existing open review. Notify about this one and take the user
				// to the existing review.
				unreviewedCommits.push(commit);
				openReviewId = commitShasToOpenReviews.get(commit.ref);
				break;
			}
			if (commitShasInReviews.has(commit.ref)) {
				break;
			}
			if (commit.email === myEmail) {
				break;
			}
			unreviewedCommits.push(commit);
		}

		const branch = await git.getCurrentBranch(repo.path);
		this.unreviewedCommitsBySeq.set(sequence, { repoId, branch, commits: unreviewedCommits });

		const authors = new Set(unreviewedCommits.map(c => c.author));

		if (unreviewedCommits.length) {
			session.agent.sendNotification(DidDetectUnreviewedCommitsNotificationType, {
				openReviewId,
				sequence,
				message: `You have ${unreviewedCommits.length} unreviewed commit${
					unreviewedCommits.length > 0 ? "s" : ""
				} from ${Array.from(authors).join(", ")}`
			});
		}

		// clean stored data older than 50 checks ago
		for (const storedSequence of this.unreviewedCommitsBySeq.keys()) {
			if (storedSequence <= sequence - 50) {
				this.unreviewedCommitsBySeq.delete(storedSequence);
			}
		}

		return unreviewedCommits.length;
	}

	@lspHandler(CreateReviewsForUnreviewedCommitsRequestType)
	@log()
	async createReviewsForUnreviewedCommits(
		request: CreateReviewsForUnreviewedCommitsRequest
	): Promise<CreateReviewsForUnreviewedCommitsResponse> {
		try {
			const { git } = SessionContainer.instance();
			const unreviewedCommits = this.unreviewedCommitsBySeq.get(request.sequence);
			if (!unreviewedCommits) {
				Logger.warn(`No unreviewed commits entry found for sequence ${request.sequence}`);
				return { reviewIds: [] };
			}
			const { repoId, branch, commits } = unreviewedCommits;

			const repo = await git.getRepositoryById(repoId);
			if (!repo) {
				return { reviewIds: [] };
			}

			const currentUserEmail = await git.getConfig(repo.path, "user.email");
			if (!currentUserEmail) {
				return { reviewIds: [] };
			}

			// All these commits are from the same author, and we want to pack them together in a single review
			const reviewIds = [];
			const review = await this.createReviewForUnreviewedCommit(
				commits,
				branch,
				repo,
				currentUserEmail
			);
			if (review) {
				reviewIds.push(review.id);
			}

			return {
				reviewIds
			};
		} catch (ex) {
			Logger.error(ex);
			return {
				reviewIds: []
			};
		}
	}

	private async createReviewForUnreviewedCommit(
		commits: GitCommit[],
		branch: string | undefined,
		repo: GitRepository,
		currentUserEmail: string
	): Promise<CSReview | undefined> {
		const { git, posts, session, scm, users, teams } = SessionContainer.instance();
		const newestCommit = commits[0];
		const oldestCommit = commits[commits.length - 1];
		const repoStatus = await scm.getRepoStatus({
			uri: "file://" + repo.path,
			startCommit: oldestCommit.ref + "^",
			endCommit: newestCommit.ref,
			includeStaged: false,
			includeSaved: false,
			currentUserEmail
		});

		if (!repo.id || !repoStatus.scm) {
			return;
		}

		const myTeam = await teams.getById(session.teamId);
		const codeAuthorIds = [];
		const addedUsers = [];
		if (newestCommit.email) {
			let author = (await users.getByEmails([newestCommit.email], { ignoreCase: true }))[0];
			if (!author) {
				const inviteUserResponse = await users.inviteUser({
					email: newestCommit.email,
					fullName: newestCommit.author,
					dontSendEmail: true,
					inviteType: "reviewAuthorNotification"
				});
				author = inviteUserResponse.user;
				addedUsers.push(newestCommit.email);
			}
			if (author && !myTeam.removedMemberIds?.some(rmId => rmId === author.id)) {
				codeAuthorIds.push(author.id);
			}
		}

		// people whose code was modified by the commits in the review
		const authorsById: { [authorId: string]: { stomped: number; commits: number } } = {};
		for (const impactedAuthor of repoStatus.scm.authors) {
			const user = (await users.getByEmails([impactedAuthor.email], { ignoreCase: true }))[0];
			if (user && !myTeam.removedMemberIds?.some(rmId => rmId === user.id)) {
				authorsById[user.id] = impactedAuthor;
			}
		}

		const firstAncestor = await git.findAncestor(repo.path, oldestCommit.ref, 1, () => true);

		const entryPoint = "Commit Toast on Pull";
		const reviewRequest: CreateReviewRequest = {
			title: newestCommit.shortMessage,
			reviewers: [session.userId],
			codeAuthorIds,
			authorsById,
			tags: [],
			status: "open",
			markers: [],
			entryPoint,
			reviewChangesets: [
				{
					repoId: repo.id,
					checkpoint: 0,
					branch: branch || "(no branch)",
					commits: commits
						.map(commit => repoStatus?.scm?.commits?.find(c => c.sha === commit.ref))
						.filter(Boolean) as any,
					modifiedFiles: repoStatus.scm.modifiedFiles,
					modifiedFilesInCheckpoint: repoStatus.scm.modifiedFiles,
					includeSaved: false,
					includeStaged: false,
					diffs: {
						leftBaseAuthor: firstAncestor ? firstAncestor.author : "Empty Tree",
						leftBaseSha: firstAncestor ? firstAncestor.ref : EMPTY_TREE_SHA,
						leftDiffs: [],
						rightBaseAuthor: newestCommit.author,
						rightBaseSha: newestCommit.ref,
						rightDiffs: [],
						rightReverseDiffs: [],
						latestCommitSha: newestCommit.ref,
						rightToLatestCommitDiffs: [],
						latestCommitToRightDiffs: []
					}
				}
			]
		};

		const stream = await SessionContainer.instance().streams.getTeamStream();
		const response = await this.session.api.createPost({
			review: reviewRequest,
			text: reviewRequest.title!,
			streamId: stream.id,
			dontSendEmail: false,
			mentionedUserIds: [],
			addedUsers: [],
			files: []
		});
		const review = response.review!;

		trackReviewPostCreation(review, 0, 0, entryPoint, addedUsers);
		this.cacheResponse(response);

		return review;
	}

	protected async loadCache() {
		const response = await this.session.api.fetchReviews({});
		response.reviews.forEach(this.polyfillCheckpoints);
		const { reviews, ...rest } = response;
		this.cache.reset(reviews);
		this.cacheResponse(rest);
	}

	async getById(id: Id): Promise<CSReview> {
		const review = await super.getById(id);
		this.polyfillCheckpoints(review);
		return review;
	}

	protected async fetchById(reviewId: Id): Promise<CSReview> {
		const response = await this.session.api.getReview({ reviewId });
		this.polyfillCheckpoints(response.review);
		return response.review;
	}

	protected getEntityName(): string {
		return "Review";
	}
}
