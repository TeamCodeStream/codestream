"use strict";
import { applyPatch } from "diff";
import * as path from "path";
import { MessageType } from "../api/apiProvider";
import { Container, SessionContainer } from "../container";
import { GitRemote, GitRepository } from "../git/gitService";
import { Logger } from "../logger";
import {
	CheckPullRequestBranchPreconditionsRequest,
	CheckPullRequestBranchPreconditionsRequestType,
	CheckPullRequestBranchPreconditionsResponse,
	CheckPullRequestPreconditionsRequest,
	CheckPullRequestPreconditionsRequestType,
	CheckPullRequestPreconditionsResponse,
	CheckReviewPreconditionsRequest,
	CheckReviewPreconditionsRequestType,
	CheckReviewPreconditionsResponse,
	CreatePullRequestRequest,
	CreatePullRequestRequestType,
	CreatePullRequestResponse,
	DeleteReviewRequest,
	DeleteReviewRequestType,
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
	CSBitbucketProviderInfo,
	CSMe,
	CSReview,
	CSReviewChangeset,
	CSReviewCheckpoint,
	CSReviewDiffs,
	CSTransformedReviewChangeset,
	FileStatus
} from "../protocol/api.protocol";
import {
	getRemotePaths,
	ThirdPartyIssueProvider,
	ThirdPartyProvider,
	ThirdPartyProviderSupportsPullRequests
} from "../providers/provider";
import { log, lsp, lspHandler, Strings } from "../system";
import { gate } from "../system/decorators/gate";
import { xfs } from "../xfs";
import { CachedEntityManagerBase, Id } from "./entityManager";
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

	@lspHandler(FetchReviewsRequestType)
	async get(request?: FetchReviewsRequest): Promise<FetchReviewsResponse> {
		let reviews = await this.getAllCached();
		if (request != null) {
			if (request.reviewIds?.length ?? 0 > 0) {
				reviews = reviews.filter(r => request.reviewIds!.includes(r.id));
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
		const diffs = new Map<
			string,
			{ [repoId: string]: { checkpoint: CSReviewCheckpoint; diff: CSReviewDiffs }[] }
		>();
		const responses = await this.getReviewCheckpointDiffsResponses(reviewId);

		if (responses && responses.length) {
			const result: {
				[repoId: string]: { checkpoint: CSReviewCheckpoint; diff: CSReviewDiffs }[];
			} = {};
			if (responses.length === 1 && responses[0].checkpoint === undefined) {
				const response = responses[0];
				result[response.repoId].push({ checkpoint: 0, diff: response.diffs });
			} else {
				for (const response of responses) {
					if (!result[response.repoId]) {
						result[response.repoId] = [];
					}
					result[response.repoId].push({ checkpoint: response.checkpoint, diff: response.diffs });
				}
			}
			diffs.set(reviewId, result);
		}

		const diffsByRepo = diffs.get(reviewId);
		if (!diffsByRepo) {
			throw new Error(`Cannot find diffs for review ${reviewId}`);
		}

		return diffsByRepo;
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

	@lspHandler(GetReviewContentsRequestType)
	@log()
	async getContents(request: GetReviewContentsRequest): Promise<GetReviewContentsResponse> {
		const { reviewId, repoId, checkpoint, path } = request;
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
				left: firstContents.left,
				right: latestContents.right
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
		const leftDiff = diff.leftDiffs.find(
			d => d.newFileName === fileInfo.oldFile || d.oldFileName === fileInfo.oldFile
		);
		const leftBaseRelativePath =
			(leftDiff && leftDiff.oldFileName !== "/dev/null" && leftDiff.oldFileName) ||
			fileInfo.oldFile;
		const rightDiff = diff.rightDiffs?.find(
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
		const normalizedLeftBaseContents = Strings.normalizeFileContents(leftBaseContents);
		const leftContents =
			leftDiff !== undefined
				? applyPatch(normalizedLeftBaseContents, leftDiff)
				: normalizedLeftBaseContents;
		const rightBaseContents = isNewFile
			? ""
			: diff.leftBaseSha === diff.rightBaseSha
			? leftBaseContents
			: (await git.getFileContentForRevision(rightBasePath, diff.rightBaseSha)) || "";
		const normalizedRightBaseContents = Strings.normalizeFileContents(rightBaseContents);
		const rightContents =
			rightDiff !== undefined
				? applyPatch(normalizedRightBaseContents, rightDiff)
				: normalizedRightBaseContents;

		return {
			left: leftContents,
			right: rightContents
		};
	}

	@lspHandler(UpdateReviewRequestType)
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
	delete(request: DeleteReviewRequest) {
		return this.session.api.deleteReview(request);
	}

	@lspHandler(CheckReviewPreconditionsRequestType)
	async checkReviewPreconditions(
		request: CheckReviewPreconditionsRequest
	): Promise<CheckReviewPreconditionsResponse> {
		const { git, repositoryMappings } = SessionContainer.instance();
		const review = await this.getById(request.reviewId);
		const diffsByRepo = await this.getAllDiffs(review.id);
		const repoRoots: { [repoId: string]: string } = {};
		for (const repoId in diffsByRepo) {
			const repo = await git.getRepositoryById(repoId);
			let repoPath;
			if (repo === undefined) {
				repoPath = await repositoryMappings.getByRepoId(repoId);
			} else {
				repoPath = repo.path;
			}
			if (repoPath == null) {
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
				let leftCommit = await git.getCommit(repoPath, d.diff.leftBaseSha);
				let rightCommit = await git.getCommit(repoPath, d.diff.rightBaseSha);
				if (leftCommit == null || rightCommit == null) {
					const didFetch = await git.fetchAllRemotes(repoPath);
					if (didFetch) {
						leftCommit = leftCommit || (await git.getCommit(repoPath, d.diff.leftBaseSha));
						rightCommit = rightCommit || (await git.getCommit(repoPath, d.diff.rightBaseSha));
					}
				}

				function missingCommitError(sha: string, author: string) {
					const shortSha = sha.substr(0, 8);
					return {
						success: false,
						error: {
							message: `A commit required to perform this review (${shortSha}, authored by ${author}) was not found in the local git repository. Fetch all remotes and try again.`,
							type: "COMMIT_NOT_FOUND"
						}
					};
				}

				if (leftCommit == null) {
					return missingCommitError(d.diff.leftBaseSha, d.diff.leftBaseAuthor);
				}
				if (rightCommit == null) {
					return missingCommitError(d.diff.rightBaseSha, d.diff.rightBaseAuthor);
				}
			}
		}

		return {
			success: true,
			repoRoots
		};
	}

	@lspHandler(CheckPullRequestBranchPreconditionsRequestType)
	async checkPullRequestBranchPreconditions(
		request: CheckPullRequestBranchPreconditionsRequest
	): Promise<CheckPullRequestBranchPreconditionsResponse> {
		const { git } = SessionContainer.instance();
		try {
			let repo: GitRepository | undefined = undefined;
			if (request.reviewId) {
				const review = await this.getById(request.reviewId);
				repo = await git.getRepositoryById(review.reviewChangesets[0].repoId);
			} else if (request.repoId) {
				repo = await git.getRepositoryById(request.repoId);
			} else {
				return {
					success: false,
					error: {
						type: "REPO_NOT_FOUND"
					}
				};
			}

			if (!repo) {
				return {
					success: false,
					error: {
						type: "REPO_NOT_FOUND"
					}
				};
			}

			const { providerRegistry } = SessionContainer.instance();
			const user = await SessionContainer.instance().session.api.meUser;
			if (!user) {
				Logger.warn("Could not find CSMe user");
				return {
					success: false
				};
			}

			const remotes = await repo!.getRemotes();
			let remoteUrl = "";
			let providerId = "";

			const connectedProviders = await providerRegistry.getConnectedPullRequestProviders(user);
			const _projectsByRemotePath = new Map(remotes.map(obj => [obj.path, obj]));
			for (const provider of connectedProviders) {
				const id = provider.getConfig().id;
				if (id !== request.providerId) continue;
				providerId = id;

				const providerRepo = await repo.getPullRequestProvider(user, connectedProviders);

				if (providerRepo?.provider) {
					const remotePaths = await getRemotePaths(
						repo,
						provider.getIsMatchingRemotePredicate(),
						_projectsByRemotePath
					);
					if (remotePaths && remotePaths.length) {
						// just need any url here...
						remoteUrl = "https://example.com/" + remotePaths[0];
						const providerRepoInfo = await providerRegistry.getRepoInfo({
							providerId: providerId,
							remote: remoteUrl
						});
						if (providerRepoInfo) {
							if (providerRepoInfo.pullRequests && request.baseRefName && request.headRefName) {
								const existingPullRequest = providerRepoInfo.pullRequests.find(
									(_: any) =>
										_.baseRefName === request.baseRefName && _.headRefName === request.headRefName
								);
								if (existingPullRequest) {
									return {
										success: false,
										error: {
											type: "ALREADY_HAS_PULL_REQUEST",
											url: existingPullRequest.url
										}
									};
								}
							}
							// break out of providers loop
							break;
						}
					}
				}
			}

			return {
				success: true,
				remote: remoteUrl,
				providerId: providerId
			};
		} catch (ex) {
			return {
				success: false,
				error: {
					message: typeof ex === "string" ? ex : ex.message,
					type: "UNKNOWN"
				}
			};
		}
	}

	@lspHandler(CheckPullRequestPreconditionsRequestType)
	async checkPullRequestPreconditions(
		request: CheckPullRequestPreconditionsRequest
	): Promise<CheckPullRequestPreconditionsResponse> {
		const { git, providerRegistry, session } = SessionContainer.instance();
		let warning = undefined;
		let remotes: GitRemote[] | undefined;
		let repo: any;
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

			if (request.reviewId && !request.skipLocalModificationsCheck) {
				const localModifications = await git.getHasModifications(repo.path);
				if (localModifications) {
					return {
						success: false,
						error: { type: "HAS_LOCAL_MODIFICATIONS" }
					};
				}

				const localCommits = await git.getLocalCommits(repo.path);
				if (localCommits && localCommits.length > 0) {
					return {
						success: false,
						error: { type: "HAS_LOCAL_COMMITS" }
					};
				}
			}

			const headRefName = request.headRefName || (review && review.reviewChangesets[0].branch);

			let success = false;
			let remoteUrl;
			let providerId;

			const user = (await SessionContainer.instance().users.getMe()).user;
			if (!user) {
				Logger.warn("Could not find CSMe user");
				return {
					success: false
				};
			}

			const connectedProviders = await providerRegistry.getConnectedPullRequestProviders(user);
			const providerRepo = await repo.getPullRequestProvider(user, connectedProviders);
			let providerRepoDefaultBranch: string | undefined = "";

			if (providerRepo?.provider) {
				remoteUrl = "https://example.com/" + providerRepo.remotePaths[0];
				const providerRepoInfo = await providerRegistry.getRepoInfo({
					providerId: providerRepo.providerId,
					remote: remoteUrl
				});
				if (providerRepoInfo) {
					if (providerRepoInfo.error) {
						return {
							success: false,
							error: providerRepoInfo.error
						};
					}

					providerRepoDefaultBranch = providerRepoInfo.defaultBranch;
					const baseRefName = request.baseRefName || providerRepoDefaultBranch;
					if (providerRepoInfo.pullRequests) {
						if (baseRefName && headRefName) {
							const existingPullRequest = providerRepoInfo.pullRequests.find(
								(_: any) => _.baseRefName === baseRefName && _.headRefName === headRefName
							);
							if (existingPullRequest) {
								warning = {
									type: "ALREADY_HAS_PULL_REQUEST",
									url: existingPullRequest.url,
									id: existingPullRequest.id
								};
							}
						}
					}
					success = true;
					providerId = providerRepo.providerId;
					isProviderConnected = true;
					remotes = providerRepo.remotes;
				}
			}

			if (!success) {
				const user = await SessionContainer.instance().session.api.meUser;
				if (user) {
					const connectedProviders = await providerRegistry.getConnectedPullRequestProviders(user);
					if (connectedProviders && connectedProviders.length) {
						return {
							success: false,
							error: {
								type: "REQUIRES_PROVIDER_REPO",
								message: `To create a pull request you'll need to open a ${connectedProviders
									.map(_ => _.displayName)
									.join(" or ")} repository`
							}
						};
					}
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

			const branches = await git.getBranches(repo.path);
			const remoteBranches = await git.getBranches(repo.path, true);
			let originNames;
			let remoteBranch;
			const branchRemote = await git.getBranchRemote(repo.path, headRefName!);
			if (!branchRemote) {
				Logger.log(`Couldn't find branchRepot for ${repo.path} and ${headRefName}`);
				warning = {
					type: "REQUIRES_UPSTREAM"
				};
				originNames = remotes && remotes.length ? remotes.map(_ => _.name) : [];
			} else {
				remoteBranch = branchRemote;
			}

			const pullRequestTemplate =
				(await xfs.readText(path.join(repo.path, "pull_request_template.md"))) ||
				(await xfs.readText(path.join(repo.path, "docs/pull_request_template.md"))) ||
				(await xfs.readText(path.join(repo.path, ".github/pull_request_template.md")));

			return {
				success: success,
				repoId: repo.id,
				remoteUrl: remoteUrl,
				providerId: providerId,
				pullRequestTemplate,
				remotes: remotes,
				origins: originNames,
				remoteBranch: remoteBranch,
				pullRequestProvider: {
					isConnected: isProviderConnected,
					defaultBranch: providerRepoDefaultBranch
				},
				review: {
					title: review ? review.title : "",
					text: review ? review.text : ""
				},
				branch: headRefName,
				branches: branches!.branches,
				remoteBranches: remoteBranches!.branches,
				warning: warning
			};
		} catch (ex) {
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
			if (request.remoteName && repoId) {
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
	async startReview(request: StartReviewRequest): Promise<StartReviewResponse> {
		return {
			success: true
		};
	}

	@lspHandler(PauseReviewRequestType)
	async pauseReview(request: PauseReviewRequest): Promise<PauseReviewResponse> {
		return {
			success: true
		};
	}

	@lspHandler(EndReviewRequestType)
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

	protected async loadCache() {
		const response = await this.session.api.fetchReviews({});
		response.reviews.forEach(this.polyfillCheckpoints);
		this.cache.reset(response.reviews);
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
