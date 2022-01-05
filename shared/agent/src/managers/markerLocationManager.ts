"use strict";
import { applyPatch, createPatch, ParsedDiff, parsePatch, structuredPatch } from "diff";
import * as path from "path";
import { URI } from "vscode-uri";
import { MarkerLocation, MarkerLocationsById } from "../api/extensions";
import { getCache } from "../cache";
import { Container, SessionContainer } from "../container";
import { GitRepository } from "../git/models/repository";
import { Logger } from "../logger";
import {
	calculateLocation,
	calculateLocations,
	MAX_RANGE_VALUE
} from "../markerLocation/calculator";
import { MarkerNotLocatedReason } from "../protocol/agent.protocol";
import {
	CSLocationArray,
	CSMarker,
	CSMarkerLocation,
	CSMarkerLocations,
	CSReferenceLocation
} from "../protocol/api.protocol";
import { Strings } from "../system/string";
import { xfs } from "../xfs";
import { ManagerBase } from "./baseManager";
import { IndexParams, IndexType } from "./cache";
import { getValues, KeyValue } from "./cache/baseCache";
import { Id } from "./entityManager";

export interface Markerish {
	id: string;
	referenceLocations: CSReferenceLocation[];
}

export interface MissingLocationsById {
	[id: string]: {
		reason: MarkerNotLocatedReason;
		details?: string;
	};
}

interface UncommittedLocation {
	fileContents: string;
	location: CSMarkerLocation;
}

interface UncommittedLocationsById {
	[id: string]: UncommittedLocation;
}

interface ReferenceLocationsById {
	[id: string]: CSReferenceLocation;
}

export interface GetLocationsResult {
	locations: MarkerLocationsById;
	missingLocations: MissingLocationsById;
}

function newGetLocationsResult(): GetLocationsResult {
	return {
		locations: {},
		missingLocations: {}
	};
}

function compareReferenceLocations(a: CSReferenceLocation, b: CSReferenceLocation): number {
	const aIsCanonical = Number(!!a.flags?.canonical);
	const bIsCanonical = Number(!!b.flags?.canonical);

	const canonicalComparison = bIsCanonical - aIsCanonical;
	if (canonicalComparison !== 0) {
		return canonicalComparison;
	}

	const aIsEntirelyDeleted = Number(!!a.location[4]?.entirelyDeleted);
	const bIsEntirelyDeleted = Number(!!b.location[4]?.entirelyDeleted);

	return aIsEntirelyDeleted - bIsEntirelyDeleted;
}

export class MarkerLocationManager extends ManagerBase<CSMarkerLocations> {
	protected forceFetchToResolveOnCacheMiss = true;

	getIndexedFields(): IndexParams<CSMarkerLocations>[] {
		return [
			{
				fields: ["streamId", "commitHash"],
				type: IndexType.Unique,
				fetchFn: this.fetch.bind(this)
			}
		];
	}

	async cacheSet(
		entity: CSMarkerLocations,
		oldEntity?: CSMarkerLocations
	): Promise<CSMarkerLocations | undefined> {
		if (oldEntity) {
			entity.locations = {
				...oldEntity.locations,
				...entity.locations
			};
		}
		return super.cacheSet(entity, oldEntity);
	}

	protected async fetch(criteria: KeyValue<CSMarkerLocations>[]): Promise<CSMarkerLocations> {
		const [streamId, commitHash] = getValues(criteria);
		const response = await this.session.api.fetchMarkerLocations({
			streamId,
			commitHash
		});
		this.cacheResponse(response);
		return response.markerLocations;
	}

	protected fetchCriteria(obj: CSMarkerLocations): KeyValue<CSMarkerLocations>[] {
		return [
			["streamId", obj.streamId],
			["commitHash", obj.commitHash]
		];
	}

	async getCurrentLocations(
		documentUri: string,
		fileStreamId?: string,
		markers?: CSMarker[]
	): Promise<GetLocationsResult> {
		const { documents } = Container.instance();
		const { git } = SessionContainer.instance();
		const result = newGetLocationsResult();

		const filePath = URI.parse(documentUri).fsPath;
		let repoRoot;
		try {
			repoRoot = await git.getRepoRoot(filePath);
		} catch {}
		if (!repoRoot) {
			Logger.log(`MARKERS: no repo root for ${filePath}`);
			return result;
		}

		if (fileStreamId === undefined) {
			const stream = await SessionContainer.instance().files.getByPath(filePath);
			if (!stream) {
				Logger.log(`MARKERS: no stream for for ${filePath}`);
				return result;
			}
			fileStreamId = stream!.id;
		}
		if (markers === undefined) {
			markers = await SessionContainer.instance().markers.getByStreamId(fileStreamId, true);
		}

		const fileCurrentCommitHash = await git.getFileCurrentRevision(filePath);
		const currentCommitLocations = await this.getCommitLocations(
			filePath,
			fileCurrentCommitHash,
			fileStreamId,
			markers
		);
		Object.assign(result.missingLocations, currentCommitLocations.missingLocations);

		Logger.log(`MARKERS: classifying locations`);
		Logger.log(`MARKERS: found ${markers.length} markers - retrieving current locations`);

		const repoCurrentCommitHash = await git.getRepoHeadRevision(repoRoot);
		const {
			committedLocations,
			uncommittedLocations,
			futureReferences
		} = await MarkerLocationManager.classifyLocations(
			repoRoot,
			markers,
			currentCommitLocations.locations,
			repoCurrentCommitHash,
			fileCurrentCommitHash
		);

		const doc = documents.get(documentUri);
		Logger.log(`MARKERS: retrieving current text from document manager`);
		let currentBufferText = doc && doc.getText();
		if (currentBufferText == null) {
			Logger.log(`MARKERS: current text not found in document manager - reading from disk`);
			currentBufferText = await xfs.readText(filePath);
		}
		if (!currentBufferText) {
			Logger.log(
				`MARKERS: Could not retrieve contents for ${filePath} from document manager or file system. File does not exist in current branch.`
			);
			return result;
		}

		const currentCommitText =
			fileCurrentCommitHash &&
			(await git.getFileContentForRevision(filePath, fileCurrentCommitHash));

		if (Object.keys(committedLocations).length) {
			Logger.log(`MARKERS: calculating current location for committed locations`);
			if (currentCommitText === undefined) {
				throw new Error(`Could not retrieve contents for ${filePath}@${fileCurrentCommitHash}`);
			}
			const diff = structuredPatch(
				filePath,
				filePath,
				Strings.normalizeFileContents(currentCommitText),
				Strings.normalizeFileContents(currentBufferText),
				"",
				""
			);
			const calculatedLocations = await calculateLocations(committedLocations, diff);
			for (const id in committedLocations) {
				const commLoc = committedLocations[id];
				const currLoc = calculatedLocations[id];
				currLoc.meta = {
					...commLoc.meta,
					...currLoc.meta
				};
				Logger.log(
					`MARKERS: ${id} [${commLoc.lineStart}, ${commLoc.colStart}, ${commLoc.lineEnd}, ${commLoc.colEnd}] => [${currLoc.lineStart}, ${currLoc.colStart}, ${currLoc.lineEnd}, ${currLoc.colEnd}]`
				);
				if (currLoc.meta && currLoc.meta.contentChanged) {
					// Logger.log("IT'S A TRAP!!!!!!!!!!!");
				}
			}
			Object.assign(result.locations, calculatedLocations);
		}

		if (Object.keys(uncommittedLocations).length) {
			Logger.log(`MARKERS: calculating current location for uncommitted locations`);
			for (const id in uncommittedLocations) {
				const uncommittedLocation = uncommittedLocations[id];
				const uncommittedBufferText = uncommittedLocation.fileContents;
				const diff = structuredPatch(
					filePath,
					filePath,
					Strings.normalizeFileContents(uncommittedBufferText),
					Strings.normalizeFileContents(currentBufferText),
					"",
					""
				);
				const currLoc = (await calculateLocation(uncommittedLocation.location, diff)) || {};
				result.locations[id] = currLoc;

				const uncommLoc = uncommittedLocation.location || {};

				Logger.log(
					`MARKERS: ${id} [${uncommLoc.lineStart}, ${uncommLoc.colStart}, ${uncommLoc.lineEnd}, ${uncommLoc.colEnd}] => [${currLoc.lineStart}, ${currLoc.colStart}, ${currLoc.lineEnd}, ${currLoc.colEnd}]`
				);
			}
		}

		if (Object.keys(futureReferences).length) {
			Logger.log(`MARKERS: calculating current location for future references`);
			for (const id in futureReferences) {
				try {
					const referenceLocation = futureReferences[id];
					const referenceText =
						referenceLocation.flags?.diff != undefined
							? applyPatch(currentCommitText || "", referenceLocation.flags.diff)
							: currentCommitText || "";

					const diff = structuredPatch(
						filePath,
						filePath,
						Strings.normalizeFileContents(referenceText),
						Strings.normalizeFileContents(currentBufferText),
						"",
						""
					);

					const currLoc =
						(await calculateLocation(
							MarkerLocation.fromArray(referenceLocation.location, id),
							diff
						)) || {};
					result.locations[id] = currLoc;

					const refLoc = MarkerLocation.fromArray(referenceLocation.location, id) || {};

					Logger.log(
						`MARKERS: ${id} [${refLoc.lineStart}, ${refLoc.colStart}, ${refLoc.lineEnd}, ${refLoc.colEnd}] => [${currLoc.lineStart}, ${currLoc.colStart}, ${currLoc.lineEnd}, ${currLoc.colEnd}]`
					);
				} catch (e) {
					Logger.warn(e.message || e);
				}
			}
		}

		for (const marker of markers) {
			const location = result.locations[marker.id];
			if (!location) continue;
			const meta = location.meta || (location.meta = {});
			if (
				marker.referenceLocations &&
				marker.referenceLocations.length &&
				location.lineStart === location.lineEnd &&
				location.colStart === location.colEnd
			) {
				const [
					lineStartWhenCreated,
					colStartWhenCreated,
					lineEndWhenCreated,
					colEndWhenCreated
				] = marker.referenceLocations[0].location;
				if (
					lineStartWhenCreated !== lineEndWhenCreated ||
					colStartWhenCreated !== colEndWhenCreated
				) {
					meta.entirelyDeleted = true;
				}
			}

			const canonicalLocation = marker.referenceLocations?.find(rl => rl.flags?.canonical);
			if (
				canonicalLocation?.commitHash === fileCurrentCommitHash ||
				canonicalLocation?.flags?.baseCommit === fileCurrentCommitHash
			) {
				meta.createdAtCurrentCommit = true;
			}

			if (!meta.isAncestor && !meta.isDescendant && !meta.createdAtCurrentCommit) {
				const canonicalCommit =
					canonicalLocation?.commitHash || canonicalLocation?.flags?.baseCommit;
				if (canonicalCommit) {
					meta.canonicalCommitDoesNotExist = !(await git.commitExists(repoRoot, canonicalCommit));
				}
			}
		}

		return result;
	}

	private static async classifyLocations(
		repoPath: string,
		markers: CSMarker[],
		committedLocations: MarkerLocationsById,
		repoCurrentCommit: string | undefined,
		fileCurrentCommit: string | undefined
	): Promise<{
		committedLocations: MarkerLocationsById;
		uncommittedLocations: UncommittedLocationsById;
		futureReferences: ReferenceLocationsById;
	}> {
		const result = {
			committedLocations: {} as MarkerLocationsById,
			uncommittedLocations: {} as UncommittedLocationsById,
			futureReferences: {} as ReferenceLocationsById
		};
		Logger.log(`MARKERS: retrieving uncommitted locations from local cache`);
		const cache = await getCache(repoPath);
		const cachedUncommittedLocations = cache.getCollection("uncommittedLocations");
		for (const { id, referenceLocations } of markers) {
			const canonicalLocation = referenceLocations.sort(compareReferenceLocations)[0];
			const committedLocation = committedLocations[id];
			const uncommittedLocation = cachedUncommittedLocations.get(id);

			if (
				canonicalLocation &&
				!canonicalLocation.commitHash &&
				(canonicalLocation.flags?.baseCommit === fileCurrentCommit ||
					canonicalLocation.flags?.baseCommit === repoCurrentCommit)
			) {
				Logger.log(`MARKERS: ${id}: future reference`);
				result.futureReferences[id] = canonicalLocation;
			} else if (uncommittedLocation) {
				Logger.log(`MARKERS: ${id}: uncommitted`);
				result.uncommittedLocations[id] = uncommittedLocation;
			} else if (committedLocation) {
				Logger.log(`MARKERS: ${id}: committed`);
				result.committedLocations[id] = committedLocation;
			}
		}

		return result;
	}

	async backtrackLocation(
		documentUri: string,
		contents: string,
		location: CSMarkerLocation,
		revision: string
	): Promise<{
		location: CSMarkerLocation;
		diffCommittedToContents?: ParsedDiff;
		diffContentsToCommitted?: ParsedDiff;
	}> {
		Logger.log(`Backtracking location ${MarkerLocation.toArray(location)} to ${revision}`);
		const { git } = SessionContainer.instance();
		const filePath = URI.parse(documentUri).fsPath;

		if (!revision) {
			Logger.warn("No revision specified for backtracking");
			return {
				location
			};
		}

		const committedContents = await git.getFileContentForRevision(filePath, revision);
		if (committedContents === undefined) {
			throw new Error(`Could not retrieve contents for ${filePath}@${revision}`);
		}

		// Maybe in this case the IDE should inform the buffer contents to ensure we have the exact same
		// buffer text the user is seeing
		const patchContentsToCommitted = createPatch(
			filePath,
			Strings.normalizeFileContents(contents),
			Strings.normalizeFileContents(committedContents),
			"",
			""
		);
		const patchCommittedToContents = createPatch(
			filePath,
			Strings.normalizeFileContents(committedContents),
			Strings.normalizeFileContents(contents),
			"",
			""
		);
		const diffContentsToCommitted = parsePatch(patchContentsToCommitted)[0];
		const diffCommittedToContents = parsePatch(patchCommittedToContents)[0];

		return {
			location: await calculateLocation(location, diffContentsToCommitted),
			diffContentsToCommitted,
			diffCommittedToContents
		};
	}

	async getCommitLocations(
		filePath: string,
		commitHash?: string,
		fileStreamId?: string,
		markers?: CSMarker[]
	): Promise<GetLocationsResult> {
		if (commitHash === undefined) return newGetLocationsResult();

		Logger.log(`MARKERS: getting locations for ${filePath}@${commitHash}`);

		if (fileStreamId === undefined) {
			const stream = await SessionContainer.instance().files.getByPath(filePath);
			if (!stream) {
				Logger.log(`MARKERS: cannot find streamId for ${filePath}`);
				return newGetLocationsResult();
			}

			fileStreamId = stream.id;
		}

		if (markers === undefined) {
			markers = await SessionContainer.instance().markers.getByStreamId(fileStreamId, true);
		}
		Logger.log(`MARKERS: found ${markers.length} markers for stream ${fileStreamId}`);

		const currentCommitLocations = await this.getMarkerLocationsById(fileStreamId, commitHash);
		const missingLocations: MissingLocationsById = {};

		const missingMarkers = markers.filter(m => !currentCommitLocations[m.id]);
		if (missingMarkers.length === 0) {
			Logger.log(`MARKERS: no missing locations`);
		} else {
			Logger.log(`MARKERS: missing locations detected - will calculate`);
		}

		const { git, session } = SessionContainer.instance();
		const repoRoot = await git.getRepoRoot(filePath);
		const diffsByCommitHash: Map<
			string,
			{ diff: ParsedDiff; isAncestor: boolean; isDescendant?: boolean }
		> = new Map();
		const locationsByCommitHash: Map<string, MarkerLocationsById> = new Map();
		let fetchIfCommitNotFound = true;
		for (const missingMarker of missingMarkers) {
			missingMarker.referenceLocations.sort(compareReferenceLocations);
			let canCalculate = false;
			for (const referenceLocation of missingMarker.referenceLocations) {
				const referenceCommitHash = referenceLocation.commitHash;
				if (referenceLocation.location[2] === -1) {
					// This should never happen, but we have some faulty reference locations
					// in the database with lineEnd === -1 because the end of the marker range
					// was deleted but not properly trimmed to the edge of the preserved region.
					// In this case we pretend it ends at the end of its lineStart.
					referenceLocation.location[2] = referenceLocation.location[0];
					referenceLocation.location[3] = MAX_RANGE_VALUE;
				}
				if (referenceCommitHash == null) {
					const { baseCommit, diff: diffToCanonicalContents } = referenceLocation.flags || {};
					if (baseCommit && diffToCanonicalContents) {
						const baseContents = await git.getFileContentForRevision(filePath, baseCommit);
						if (!baseContents) continue;
						const canonicalContents = applyPatch(baseContents, diffToCanonicalContents);
						const commitContents = await git.getFileContentForRevision(filePath, commitHash);
						if (!commitContents) continue;

						const diff = structuredPatch(
							filePath,
							filePath,
							Strings.normalizeFileContents(canonicalContents),
							Strings.normalizeFileContents(commitContents),
							"",
							""
						);

						const calculatedLocation = await calculateLocation(
							MarkerLocation.fromArray(referenceLocation.location, missingMarker.id),
							diff
						);

						const meta = calculatedLocation.meta || (calculatedLocation.meta = {});
						meta.isAncestor = await git.isAncestor(repoRoot!, commitHash, baseCommit);
						if (referenceLocation.flags?.canonical) {
							meta.isDescendant = await git.isAncestor(repoRoot!, baseCommit, commitHash);
							Logger.log(
								`MARKERS: saving location calculated from canonical reference for missing marker ${missingMarker.id}`
							);
							await session.api.createMarkerLocation({
								streamId: fileStreamId,
								commitHash,
								locations: MarkerLocation.toArraysById({
									[missingMarker.id]: calculatedLocation
								})
							});
						}

						currentCommitLocations[missingMarker.id] = calculatedLocation;

						break;
					}
				} else if (!diffsByCommitHash.has(referenceCommitHash)) {
					const diff = await git.getDiffBetweenCommits(
						referenceCommitHash,
						commitHash,
						filePath,
						fetchIfCommitNotFound
					);
					fetchIfCommitNotFound = false;
					if (diff) {
						const isAncestor = await git.isAncestor(repoRoot!, commitHash, referenceCommitHash);
						const isDescendant =
							referenceLocation.flags?.canonical &&
							(await git.isAncestor(repoRoot!, referenceCommitHash, commitHash));
						diffsByCommitHash.set(referenceCommitHash, { diff, isAncestor, isDescendant });
						if (!locationsByCommitHash.has(referenceCommitHash)) {
							locationsByCommitHash.set(referenceCommitHash, {});
						}
						const locationsById = locationsByCommitHash.get(referenceCommitHash)!!;
						locationsById[missingMarker.id] = MarkerLocation.fromArray(
							referenceLocation.location,
							missingMarker.id
						);
						canCalculate = true;
						break;
					}
				}
			}

			if (!canCalculate) {
				const details = `Could not find any of the following reference commit hashes for marker ${
					missingMarker.id
				} in local git repository: ${missingMarker.referenceLocations
					.map(rl => rl.commitHash)
					.join(", ")}`;
				missingLocations[missingMarker.id] = {
					reason: MarkerNotLocatedReason.MISSING_ORIGINAL_COMMIT,
					details
				};
				Logger.warn(details);
			}
		}

		for (const [referenceCommitHash, diffInfo] of diffsByCommitHash.entries()) {
			const { diff, isAncestor, isDescendant } = diffInfo;
			Logger.log(
				`MARKERS: calculating locations based on diff from ${referenceCommitHash} to ${commitHash}`
			);
			const locationsToCalculate = locationsByCommitHash.get(referenceCommitHash)!!;
			const calculatedLocations = await calculateLocations(locationsToCalculate, diff);
			Object.assign(currentCommitLocations, calculatedLocations);

			for (const id in calculatedLocations) {
				const currLoc = calculatedLocations[id] || {};
				const meta = currLoc.meta || (currLoc.meta = {});
				meta.isAncestor = isAncestor;
				meta.isDescendant = isDescendant;

				const origLoc = locationsToCalculate[id] || {};
				Logger.log(
					`MARKERS: ${id} [${origLoc.lineStart}, ${origLoc.colStart}, ${origLoc.lineEnd}, ${origLoc.colEnd}] => [${currLoc.lineStart}, ${currLoc.colStart}, ${currLoc.lineEnd}, ${currLoc.colEnd}]`
				);
			}

			Logger.log(
				`MARKERS: saving ${
					Object.keys(calculatedLocations).length
				} calculated locations to API server`
			);
			await session.api.createMarkerLocation({
				streamId: fileStreamId,
				commitHash,
				locations: MarkerLocation.toArraysById(calculatedLocations)
			});
		}

		return {
			locations: currentCommitLocations,
			missingLocations
		};
	}

	async flushUncommittedLocations(repo: GitRepository) {
		Logger.log(`MARKERS: flushing uncommitted locations`);
		const { git, files, markers, session } = SessionContainer.instance();
		const cache = await getCache(repo.path);
		const uncommittedLocations = cache.getCollection("uncommittedLocations");

		for (const id of uncommittedLocations.keys()) {
			Logger.log(`MARKERS: checking uncommitted marker ${id}`);
			const marker = await markers.getById(id);
			const fileStream = await files.getById(marker!.fileStreamId);
			const uncommittedLocation = uncommittedLocations.get(id) as UncommittedLocation;
			const originalContents = uncommittedLocation.fileContents;
			const relPath = fileStream.file;
			const absPath = path.join(repo.path, relPath);
			const commitHash = await git.getFileCurrentRevision(absPath);
			if (!commitHash) {
				Logger.log(`MARKERS: file ${relPath} is not committed yet - skipping`);
				continue;
			}
			const commitContents = await git.getFileContentForRevision(absPath, commitHash);
			if (!commitContents) {
				Logger.log(`MARKERS: file ${relPath} has no contents on revision ${commitHash} - skipping`);
				continue;
			}
			const diff = structuredPatch(
				relPath,
				relPath,
				Strings.normalizeFileContents(originalContents),
				Strings.normalizeFileContents(commitContents),
				"",
				""
			);
			const location = await calculateLocation(uncommittedLocation.location, diff);
			if (location.meta && location.meta.entirelyDeleted) {
				Logger.log(`MARKERS: location is not present on commit ${commitHash} - skipping`);
				continue;
			}
			const locationArraysById = {} as {
				[id: string]: CSLocationArray;
			};
			locationArraysById[id] = MarkerLocation.toArray(location);
			Logger.log(
				`MARKERS: committed ${id}@${commitHash} => [${location.lineStart}, ${location.colStart}, ${location.lineEnd}, ${location.colEnd}] - saving to API server`
			);
			await session.api.createMarkerLocation({
				streamId: fileStream.id,
				commitHash,
				locations: locationArraysById
			});
			Logger.log(`MARKERS: adding canonical reference location for ${id}@${commitHash}`);
			await session.api.addReferenceLocation({
				markerId: id,
				commitHash,
				location: MarkerLocation.toArray(location),
				flags: {
					canonical: true,
					committedAfterCreation: true
				}
			});
			uncommittedLocations.delete(id);
			Logger.log(`MARKERS: flushing local cache`);
			await cache.flush();
			Logger.log(`MARKERS: local cache flushed`);
		}
	}

	async getMarkerLocations(
		streamId: Id,
		commitHash: string
	): Promise<CSMarkerLocations | undefined> {
		return this.cache.get([
			["streamId", streamId],
			["commitHash", commitHash]
		]);
	}

	async getMarkerLocationsById(streamId: Id, commitHash: string): Promise<MarkerLocationsById> {
		const markerLocations = await this.getMarkerLocations(streamId, commitHash);
		return MarkerLocation.toLocationsById(markerLocations);
	}

	protected getEntityName(): string {
		return "MarkerLocation";
	}

	static async computeCurrentLocations(uri: URI, markersByCommit: Map<string, Markerish[]>) {
		const locations: MarkerLocationsById = Object.create(null);
		const orphans: MissingLocationsById = Object.create(null);

		if (markersByCommit.size === 0) {
			return { locations, orphans };
		}

		const { documents } = Container.instance();
		const { git } = SessionContainer.instance();

		const filePath = uri.fsPath;
		const currentFileRevision = await git.getFileCurrentRevision(uri);
		if (currentFileRevision === undefined) {
			Logger.warn(
				`computeCurrentLocations: Could not determine current revision for ${uri.fsPath}`
			);
			return { locations, orphans };
		}

		let fetchIfCommitNotFound = true;
		for (const [revision, markers] of markersByCommit.entries()) {
			const diff = await git.getDiffBetweenCommits(
				revision,
				currentFileRevision,
				filePath,
				fetchIfCommitNotFound
			);
			fetchIfCommitNotFound = false;
			if (!diff) {
				const details = `cannot obtain diff - skipping calculation from ${revision} to ${currentFileRevision}`;
				for (const marker of markers) {
					orphans[marker.id] = {
						reason: MarkerNotLocatedReason.MISSING_ORIGINAL_COMMIT,
						details
					};
				}

				continue;
			}

			const locationsToCalculate: MarkerLocationsById = Object.create(null);
			for (const marker of markers) {
				const location = marker.referenceLocations[0].location;
				locationsToCalculate[marker.id] = {
					id: marker.id,
					lineStart: location[0],
					colStart: location[1],
					lineEnd: location[2],
					colEnd: location[3]
				};
			}

			const calculatedLocations = await calculateLocations(locationsToCalculate, diff);
			for (const [id, location] of Object.entries(calculatedLocations)) {
				locations[id] = location;
			}
		}

		const locationsInCurrentCommit = {
			locations: locations,
			orphans: orphans
		};

		const currentCommitText = await git.getFileContentForRevision(uri, currentFileRevision);
		if (currentCommitText === undefined) {
			Logger.warn(`Could not retrieve contents for ${uri}@${currentFileRevision}`);
			return locationsInCurrentCommit;
		}

		const doc = documents.get(uri.toString(true));
		Logger.log(`MARKERS: retrieving current text from document manager`);
		let currentBufferText = doc && doc.getText();
		if (currentBufferText == null) {
			Logger.log(`MARKERS: current text not found in document manager - reading from disk`);
			currentBufferText = await xfs.readText(filePath);
		}
		if (!currentBufferText) {
			Logger.warn(
				`MARKERS: Could not retrieve contents for ${uri} from document manager or file system. File does not exist in current branch.`
			);
			return locationsInCurrentCommit;
		}

		const diff = structuredPatch(
			filePath,
			filePath,
			Strings.normalizeFileContents(currentCommitText),
			Strings.normalizeFileContents(currentBufferText),
			"",
			""
		);

		const locationsInCurrentBuffer = await calculateLocations(locations, diff);

		return {
			locations: locationsInCurrentBuffer,
			orphans: orphans
		};
	}
}
