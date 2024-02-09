"use strict";
import * as path from "path";

import {
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
	UpdateReviewResponse,
} from "@codestream/protocols/agent";
import {
	CSReview,
	CSReviewChangeset,
	CSReviewCheckpoint,
	CSReviewDiffs,
	CSTransformedReviewChangeset,
	FileStatus,
} from "@codestream/protocols/api";
import { ParsedDiff } from "diff";
import { decompressFromBase64 } from "lz-string";
import { URI } from "vscode-uri";

import { MessageType } from "../api/apiProvider";
import { SessionContainer } from "../container";
import { Logger } from "../logger";
import { log, lsp, lspHandler, Strings } from "../system";
import { gate } from "../system/decorators/gate";
import { xfs } from "../xfs";
import { CachedEntityManagerBase, Id } from "./entityManager";

const uriRegexp = /codestream-diff:\/\/(\w+)\/(\w+)\/(\w+)\/(\w+)\/(.+)/;

@lsp
export class ReviewsManager extends CachedEntityManagerBase<CSReview> {
	static parseUri(uri: string): {
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
			path,
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
	private diffsCacheTimeout: NodeJS.Timeout | undefined;

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
		this.diffsCacheTimeout = setTimeout(
			() => {
				Logger.debug("ReviewsManager.getReviewCheckpointDiffsResponses: clearing cache");
				this.diffsCache.clear();
			},
			10 * 60 * 1000
		);
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
				checkpoint: undefined,
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
			default:
				rightContents = await git.getFileContentForRevision(rightBasePath, request.rightVersion);
		}

		return {
			repoRoot: repo.path,
			left: Strings.normalizeFileContents(leftContents),
			right: Strings.normalizeFileContents(rightContents || ""),
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
					path: file.file,
				});
				files.push({
					leftPath: file.oldFile,
					rightPath: file.file,
					path: file.file,
					left: contents.left || "",
					right: contents.right || "",
				});
			}

			repos.push({
				repoId: changeset.repoId,
				files,
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
		const reviews = (await this.getAllCached()).filter(
			r => r.reviewChangesets?.some(c => c.repoId === repo?.id)
		);
		const reviewIds = commitShas.map(
			commitSha =>
				reviews.find(review =>
					review.reviewChangesets.some(ch => ch.commits.some(c => c.sha === commitSha))
				)?.id
		);

		return {
			reviewIds,
		};
	}

	async getContentsForUri(uri: string): Promise<string> {
		const parsedUri = ReviewsManager.parseUri(uri);
		const response = await this.getContents({
			reviewId: parsedUri.reviewId,
			checkpoint: parsedUri.checkpoint,
			path: parsedUri.path,
			repoId: parsedUri.repoId,
		});
		return (parsedUri.version === "left" ? response.left : response.right) || "";
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
				rightPath: latestContents.rightPath,
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
				right: atRequestedCheckpoint.right,
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
			rightPath: rightBaseRelativePath,
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
				reviewChangesets: reviewChangesets,
			};
			delete request.repoChanges;
		}

		const updateResponse = await this.session.api.updateReview(request);
		const [review] = await this.resolve({
			type: MessageType.Reviews,
			data: [updateResponse.review],
		});

		// if (isAmending && reviewChangesets.length) {
		// 	this.trackReviewCheckpointCreation(request.id, reviewChangesets);
		// }

		return { review };
	}

	@lspHandler(DeleteReviewRequestType)
	@log()
	delete(request: DeleteReviewRequest) {
		return this.session.api.deleteReview(request);
	}

	@lspHandler(StartReviewRequestType)
	@log()
	async startReview(request: StartReviewRequest): Promise<StartReviewResponse> {
		return {
			success: true,
		};
	}

	@lspHandler(PauseReviewRequestType)
	@log()
	async pauseReview(request: PauseReviewRequest): Promise<PauseReviewResponse> {
		return {
			success: true,
		};
	}

	@lspHandler(EndReviewRequestType)
	@log()
	async endReview(request: EndReviewRequest): Promise<EndReviewResponse> {
		return {
			success: true,
		};
	}

	// private trackReviewCheckpointCreation(
	// 	reviewId: string,
	// 	reviewChangesets: CSTransformedReviewChangeset[]
	// ) {
	// 	process.nextTick(() => {
	// 		try {
	// 			const telemetry = Container.instance().telemetry;
	// 			// get the highest number checkpoint by sorting by checkpoint descending
	// 			const totalCheckpoints = reviewChangesets
	// 				.map(_ => _!.checkpoint || 0)
	// 				.sort((a, b) => (b || 0) - (a || 0))[0];
	// 			const reviewProperties: {
	// 				[key: string]: any;
	// 			} = {
	// 				"Review ID": reviewId,
	// 				"Checkpoint Total": totalCheckpoints,
	// 				"Files Added": reviewChangesets
	// 					.map(_ => _.modifiedFiles.length)
	// 					.reduce((acc, x) => acc + x),
	// 				"Pushed Commits Added": reviewChangesets
	// 					.map(_ => _.commits.filter(c => !c.localOnly).length)
	// 					.reduce((acc, x) => acc + x),
	// 				"Local Commits Added": reviewChangesets
	// 					.map(_ => _.commits.filter(c => c.localOnly).length)
	// 					.reduce((acc, x) => acc + x),
	// 				"Staged Changes Added": reviewChangesets.some(_ => _.includeStaged),
	// 				"Saved Changes Added": reviewChangesets.some(_ => _.includeSaved),
	// 			};

	// 			telemetry.track({
	// 				eventName: "Checkpoint Added",
	// 				properties: reviewProperties,
	// 			});
	// 		} catch (ex) {
	// 			Logger.error(ex);
	// 		}
	// 	});
	// }
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

	async getReviewsContainingSha(repoId: string, sha: string): Promise<CSReview[]> {
		const allReviews = await this.getAllCached();
		return allReviews.filter(
			r =>
				!r.deactivated &&
				r.reviewChangesets?.some(rc => rc.repoId === repoId && rc.commits.some(c => c.sha === sha))
		);
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
