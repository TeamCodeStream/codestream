"use strict";

import { createPatch, ParsedDiff, parsePatch } from "diff";
import { decompressFromBase64 } from "lz-string";
import * as path from "path";
import { Range, TextDocumentIdentifier } from "vscode-languageserver";
import { URI } from "vscode-uri";
import { Marker, MarkerLocation, Ranges } from "../api/extensions";
import { Container, SessionContainer } from "../container";
import { Logger } from "../logger";
import { calculateLocation } from "../markerLocation/calculator";
import { CreateMarkerRequest } from "../protocol/agent.protocol.codemarks";
import { CodeBlockSource } from "../protocol/agent.protocol.posts";
import { CSReviewCheckpoint } from "../protocol/api.protocol";
import { CSMarkerLocation, CSReferenceLocation } from "../protocol/api.protocol.models";
import { Strings } from "../system";
import { xfs } from "../xfs";
import { ReviewsManager } from "./reviewsManager";

export abstract class MarkersBuilder {
	static async buildCreateMarkerRequest(
		documentId: TextDocumentIdentifier,
		code: string,
		range: Range,
		source?: CodeBlockSource
	): Promise<CreateMarkerRequest> {
		return this.newBuilder(documentId, code, range, source).build();
	}

	private static newBuilder(
		documentId: TextDocumentIdentifier,
		code: string,
		range: Range,
		source?: CodeBlockSource
	) {
		if (documentId.uri.startsWith("codestream-diff://")) {
			return new ReviewDiffMarkersBuilder(documentId, code, range, source);
		} else {
			return new DefaultMarkersBuilder(documentId, code, range, source);
		}
	}

	protected documentUri: URI;
	protected readonly location: CSMarkerLocation;

	protected constructor(
		protected readonly documentId: TextDocumentIdentifier,
		protected readonly code: string,
		protected readonly range: Range,
		protected readonly source?: CodeBlockSource
	) {
		this.documentUri = URI.parse(documentId.uri);
		this.range = Ranges.ensureStartBeforeEnd(range);
		this.location = MarkerLocation.fromRange(this.range);
	}

	async build(): Promise<CreateMarkerRequest> {
		let createMarkerRequest: CreateMarkerRequest | undefined;

		Logger.log("MarkersBuilder: creating marker descriptor");

		const { referenceLocations, fileCurrentCommitSha } = await this.getLocationInfo();
		const remotes = await this.getRemotes();
		const repoIdentifier = await this.getRepoIdentifier();
		const remoteCodeUrl = await this.getRemoteCodeUrl(remotes);
		createMarkerRequest = {
			code: this.code,
			commitHash: fileCurrentCommitSha,
			referenceLocations,
			branchWhenCreated: this.source?.branch,
			remotes: remotes,
			remoteCodeUrl,
			...repoIdentifier
		};

		Logger.log(`MarkersBuilder: marker descriptor created`);
		return createMarkerRequest;
	}

	protected abstract getLocationInfo(): Promise<{
		referenceLocations: CSReferenceLocation[];
		fileCurrentCommitSha?: string;
	}>;

	private getRemotes() {
		const remotes = this.source?.remotes;
		if (remotes && remotes.length > 0) {
			remotes.sort(compareRemotes);
			return remotes.map(r => r.url);
		}
		return undefined;
	}

	private async getRepoIdentifier(): Promise<RepoIdentifier> {
		const source = this.source;
		if (source?.file == null) {
			Logger.log(`MarkersBuilder: marker has no source file`);
			return {};
		}

		Logger.log(`MarkersBuilder: identifying stream for file ${source.file}`);
		const { git, files } = SessionContainer.instance();
		const fullPath = path.join(source.repoPath, source.file);
		const stream = await files.getByPath(fullPath);
		if (stream && stream.id) {
			Logger.log(`MarkersBuilder: stream id=${stream.id}`);
			return {
				fileStreamId: stream.id
			};
		}

		Logger.log(`MarkersBuilder: no stream id found`);
		const identifier: RepoIdentifier = {};
		identifier.file = source.file;
		const repo = await git.getRepositoryByFilePath(fullPath);
		if (repo && repo.id) {
			Logger.log(`MarkersBuilder: repo id=${repo.id}`);
			identifier.repoId = repo.id;
		} else {
			identifier.knownCommitHashes = await git.getKnownCommitHashes(source.repoPath);
			Logger.log(
				`MarkersBuilder: known commit hashes = ${identifier.knownCommitHashes.join(", ")}`
			);
		}

		return identifier;
	}

	private async getRemoteCodeUrl(remotes: string[] | undefined) {
		try {
			const { scm } = SessionContainer.instance();
			const scmResponse = await scm.getRangeInfo({
				uri: this.documentId.uri,
				range: this.range,
				contents: this.code,
				skipBlame: true
			});

			if (remotes !== undefined && scmResponse.scm !== undefined && scmResponse.scm.revision) {
				for (const remote of remotes) {
					const remoteCodeUrl = Marker.getRemoteCodeUrl(
						remote,
						scmResponse.scm.revision,
						scmResponse.scm.file,
						scmResponse.range.start.line + 1,
						scmResponse.range.end.line + 1
					);

					if (remoteCodeUrl !== undefined) {
						Logger.log(`MarkersBuilder: remote code URL = ${remoteCodeUrl}`);
						return remoteCodeUrl;
					}
				}
			}
		} catch (ex) {
			Logger.error(ex);
		}
		return undefined;
	}
}

class DefaultMarkersBuilder extends MarkersBuilder {
	constructor(
		documentId: TextDocumentIdentifier,
		code: string,
		range: Range,
		source?: CodeBlockSource
	) {
		super(documentId, code, range, source);
	}

	protected async getLocationInfo(): Promise<{
		referenceLocations: CSReferenceLocation[];
		fileCurrentCommitSha?: string;
	}> {
		if (this.source == null) return this.getLocationInfoWithoutSource();
		if (this.source?.revision == null) {
			return this.getLocationInfoWithoutRevision();
		}
		if (this.source?.fixedGitSha) {
			return this.getLocationInfoWithFixedSha();
		}
		return this.getLocationInfoCore();
	}

	private getLocationInfoWithoutSource() {
		return {
			referenceLocations: []
		};
	}

	private async getLocationInfoWithoutRevision() {
		Logger.log(`MarkersBuilder: no source revision - file has no commits`);
		const { git } = SessionContainer.instance();
		const { repoPath } = this.source!;

		const repoHead = await git.getRepoHeadRevision(repoPath);
		if (repoHead == null) throw new Error(`Cannot determine HEAD revision for ${repoPath}`);

		const fileContents = await this.getFileContents();
		const patch = createPatch(
			this.getFilePath(repoPath),
			Strings.normalizeFileContents(""),
			Strings.normalizeFileContents(fileContents),
			"",
			""
		);
		const diff = parsePatch(patch)[0];

		return {
			referenceLocations: [
				{
					commitHash: undefined,
					flags: {
						canonical: true,
						uncommitted: true,
						baseCommit: repoHead,
						diff
					},
					location: MarkerLocation.toArray(this.location)
				}
			],
			fileCurrentCommitSha: repoHead
		};
	}

	protected async getLocationInfoWithFixedSha(): Promise<{
		referenceLocations: CSReferenceLocation[];
		fileCurrentCommitSha: string;
	}> {
		const location: CSReferenceLocation = {
			commitHash: this.source!.revision,
			location: MarkerLocation.toArray(this.location),
			flags: {
				canonical: true
			}
		};
		return {
			referenceLocations: [location],
			fileCurrentCommitSha: this.source!.revision
		};
	}

	protected async getLocationInfoCore(): Promise<{
		referenceLocations: CSReferenceLocation[];
		fileCurrentCommitSha?: string;
	}> {
		const { repoPath, revision: fileCurrentCommitSha } = this.source!;
		Logger.log(`MarkersBuilder: source revision ${fileCurrentCommitSha}`);

		const { git } = SessionContainer.instance();

		const fileContents = await this.getFileContents();
		const {
			diffCommittedToContents,
			diffContentsToCommitted,
			location: locationAtCurrentCommit
		} = await SessionContainer.instance().markerLocations.backtrackLocation(
			this.getFileURI(repoPath),
			fileContents,
			this.location,
			fileCurrentCommitSha
		);
		Logger.log(
			`MarkersBuilder: location at current commit ${MarkerLocation.toArray(
				locationAtCurrentCommit
			)}`
		);

		const blameRevisionsPromises = git.getBlameRevisions(this.getFilePath(repoPath), {
			ref: fileCurrentCommitSha,
			// it expects 0-based ranges
			startLine: locationAtCurrentCommit.lineStart - 1,
			endLine: locationAtCurrentCommit.lineEnd - 1,
			retryWithTrimmedEndOnFailure: true
		});

		const remoteDefaultBranchRevisionsPromises = git.getRemoteDefaultBranchHeadRevisions(repoPath);
		const backtrackShas = [
			...(await blameRevisionsPromises).map(revision => revision.sha),
			...(await remoteDefaultBranchRevisionsPromises)
		].filter(function(sha, index, self) {
			return sha !== fileCurrentCommitSha && index === self.indexOf(sha);
		});
		Logger.log(`MarkersBuilder: backtracking location to ${backtrackShas.length} revisions`);

		const promises = backtrackShas.map(async (sha, index) => {
			const diff = await git.getDiffBetweenCommits(
				fileCurrentCommitSha!,
				sha,
				this.getFilePath(repoPath)
			);
			const location = await calculateLocation(locationAtCurrentCommit!, diff!);
			const locationArray = MarkerLocation.toArray(location);
			Logger.log(`MarkersBuilder: backtracked at ${sha} to ${locationArray}`);
			return {
				commitHash: sha,
				location: locationArray,
				flags: {
					backtracked: true
				}
			};
		});

		const meta = locationAtCurrentCommit.meta || {};
		const canonicalLocation = meta.contentChanged
			? {
					commitHash: undefined,
					flags: {
						canonical: true,
						uncommitted: true,
						baseCommit: fileCurrentCommitSha,
						diff: diffCommittedToContents
					},
					location: MarkerLocation.toArray(this.location)
			  }
			: {
					commitHash: fileCurrentCommitSha,
					location: MarkerLocation.toArray(locationAtCurrentCommit),
					flags: {
						canonical: true
					}
			  };
		const backtrackedLocations = await Promise.all(promises);
		const referenceLocations: CSReferenceLocation[] = [canonicalLocation, ...backtrackedLocations];

		Logger.log(`MarkersBuilder: ${referenceLocations.length} reference locations calculated`);

		return {
			referenceLocations,
			fileCurrentCommitSha
		};
	}

	protected getFileURI(repoPath: string): string {
		return this.documentId.uri;
	}

	protected getFilePath(repoPath: string): string {
		return this.documentUri.fsPath;
	}

	protected async getFileContents() {
		const { documents } = Container.instance();

		const document = documents.get(this.documentId.uri);
		const filePath = this.documentUri.fsPath;
		const fileContents = document ? document.getText() : await xfs.readText(filePath);
		if (fileContents === undefined) {
			throw new Error(
				`MarkersBuilder: Could not retrieve contents for ${this.documentId.uri} from document manager or file system. File does not exist in current branch.`
			);
		}

		return fileContents;
	}
}

class ReviewDiffMarkersBuilder extends MarkersBuilder {
	private _reviewId: string;
	private _checkpoint: CSReviewCheckpoint;
	private _repoId: string;
	private _version: string;
	private _path: string;

	constructor(
		documentId: TextDocumentIdentifier,
		code: string,
		range: Range,
		source?: CodeBlockSource
	) {
		super(documentId, code, range, source);

		const { reviewId, checkpoint, repoId, version, path } = ReviewsManager.parseUri(documentId.uri);
		this._reviewId = reviewId;
		this._checkpoint = checkpoint;
		this._repoId = repoId;
		this._version = version;
		this._path = path;
	}

	protected async getLocationInfo(): Promise<{
		referenceLocations: CSReferenceLocation[];
		fileCurrentCommitSha?: string;
	}> {
		const { reviews } = SessionContainer.instance();
		const review = await reviews.getById(this._reviewId);

		const changeset =
			this._checkpoint !== undefined
				? review.reviewChangesets.find(
						c => c.repoId === this._repoId && c.checkpoint === this._checkpoint
				  )
				: review.reviewChangesets
						.slice()
						.reverse()
						.find(c => c.repoId === this._repoId);

		if (!changeset) throw new Error(`Could not find changeset with repoId ${this._repoId}`);

		const diffs = await reviews.getDiffs(this._reviewId, this._repoId);
		const diffCheckpoint = diffs.find(_ => _.checkpoint === changeset.checkpoint)!;
		const latestCommitToRightDiffs =
			diffCheckpoint.diff.latestCommitToRightDiffs ||
			(JSON.parse(
				decompressFromBase64(diffCheckpoint.diff.latestCommitToRightDiffsCompressed!) as string
			) as ParsedDiff[]);
		const fromLatestCommitDiff = latestCommitToRightDiffs.find(d => d.newFileName === this._path);
		const rightToLatestCommitDiffs =
			diffCheckpoint.diff.rightToLatestCommitDiffs ||
			(JSON.parse(
				decompressFromBase64(diffCheckpoint.diff.rightToLatestCommitDiffsCompressed!) as string
			) as ParsedDiff[]);
		const toLatestCommitDiff = rightToLatestCommitDiffs.find(d => d.newFileName === this._path);
		const rightReverseDiffs =
			diffCheckpoint.diff.rightReverseDiffs ||
			(JSON.parse(
				decompressFromBase64(diffCheckpoint.diff.rightReverseDiffsCompressed!) as string
			) as ParsedDiff[]);
		const toBaseCommitDiff = rightReverseDiffs.find(d => d.newFileName === this._path);

		const latestCommitLocation = toLatestCommitDiff
			? await calculateLocation(this.location, toLatestCommitDiff)
			: this.location;
		const baseCommitLocation = toBaseCommitDiff
			? await calculateLocation(this.location, toBaseCommitDiff)
			: this.location;

		const latestCommitSha = diffCheckpoint.diff.latestCommitSha;
		const referenceLocations: CSReferenceLocation[] = [];

		if (fromLatestCommitDiff != null) {
			referenceLocations.push({
				commitHash: undefined,
				flags: {
					canonical: true,
					uncommitted: true,
					baseCommit: latestCommitSha,
					diff: fromLatestCommitDiff
				},
				location: MarkerLocation.toArray(this.location)
			});
		}

		referenceLocations.push({
			commitHash: latestCommitSha,
			flags: { canonical: toLatestCommitDiff == null },
			location: MarkerLocation.toArray(latestCommitLocation)
		});
		referenceLocations.push({
			commitHash: diffCheckpoint.diff.rightBaseSha,
			flags: { backtracked: true },
			location: MarkerLocation.toArray(baseCommitLocation)
		});

		return {
			referenceLocations,
			fileCurrentCommitSha: latestCommitSha
		};
	}
}

interface RepoIdentifier {
	knownCommitHashes?: string[];
	repoId?: string;
	file?: string;
	fileStreamId?: string;
}

const remoteNameValues = new Map([
	["upstream", 1],
	["origin", 2]
]);

export const compareRemotes = (r1: { name: string }, r2: { name: string }) => {
	const r1Val = remoteNameValues.get(r1.name) || Number.MAX_SAFE_INTEGER;
	const r2Val = remoteNameValues.get(r2.name) || Number.MAX_SAFE_INTEGER;

	return r1Val - r2Val;
};
