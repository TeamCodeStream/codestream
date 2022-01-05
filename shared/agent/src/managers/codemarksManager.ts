"use strict";
import { createPatch, ParsedDiff, parsePatch } from "diff";
import { xfs } from "xfs";
import { MessageType } from "../api/apiProvider";
import { MarkerLocation } from "../api/extensions";
import { Container, SessionContainer } from "../container";
import { Logger } from "../logger";
import {
	CodemarkPlus,
	CreateCodemarkPermalinkRequest,
	CreateCodemarkPermalinkRequestType,
	CreateCodemarkPermalinkResponse,
	CreateCodemarkRequest,
	CreateCodemarkRequestType,
	CreateCodemarkResponse,
	DeleteCodemarkRequest,
	DeleteCodemarkRequestType,
	DeleteCodemarkResponse,
	FetchCodemarksRequest,
	FetchCodemarksRequestType,
	FetchCodemarksResponse,
	FollowCodemarkRequest,
	FollowCodemarkRequestType,
	FollowCodemarkResponse,
	FollowCodeErrorRequest,
	FollowCodeErrorRequestType,
	FollowCodeErrorResponse,
	FollowReviewRequest,
	FollowReviewRequestType,
	FollowReviewResponse,
	GetCodemarkRangeRequest,
	GetCodemarkRangeRequestType,
	GetCodemarkRangeResponse,
	GetCodemarkSha1Request,
	GetCodemarkSha1RequestType,
	GetCodemarkSha1Response,
	GetRangeResponse,
	PinReplyToCodemarkRequest,
	PinReplyToCodemarkRequestType,
	PinReplyToCodemarkResponse,
	SetCodemarkPinnedRequest,
	SetCodemarkPinnedRequestType,
	SetCodemarkPinnedResponse,
	SetCodemarkStatusRequest,
	SetCodemarkStatusRequestType,
	SetCodemarkStatusResponse,
	UpdateCodemarkRequest,
	UpdateCodemarkRequestType,
	UpdateCodemarkResponse
} from "../protocol/agent.protocol";
import { CSCodemark, CSMarker } from "../protocol/api.protocol";
import { log, lsp, lspHandler, Strings } from "../system";
import { CachedEntityManagerBase, Id } from "./entityManager";

@lsp
export class CodemarksManager extends CachedEntityManagerBase<CSCodemark> {
	private _codemarkSha1Cache = new Map<string, GetCodemarkSha1Response>();

	async cacheSet(entity: CSCodemark, oldEntity?: CSCodemark): Promise<CSCodemark | undefined> {
		if (await this.canSeeCodemark(entity)) {
			return super.cacheSet(entity, oldEntity);
		} else {
			return undefined;
		}
	}

	@lspHandler(CreateCodemarkRequestType)
	create(request: CreateCodemarkRequest): Promise<CreateCodemarkResponse> {
		return this.session.api.createCodemark(request);
	}

	@lspHandler(CreateCodemarkPermalinkRequestType)
	createPermalink(
		request: CreateCodemarkPermalinkRequest
	): Promise<CreateCodemarkPermalinkResponse> {
		return this.session.api.createCodemarkPermalink(request);
	}

	@lspHandler(FetchCodemarksRequestType)
	async get(request: FetchCodemarksRequest): Promise<FetchCodemarksResponse> {
		const codemarks = await this.getAllCached();

		const enrichedCodemarks = [];
		for (const codemark of codemarks) {
			if (request.streamId != null && request.streamId !== codemark.streamId) {
				continue;
			}
			if (request.streamIds != null && !request.streamIds.includes(codemark.streamId)) {
				continue;
			}
			if (request.codemarkIds != null && !request.codemarkIds.includes(codemark.id)) {
				continue;
			}

			if (!(await this.canSeeCodemark(codemark))) {
				continue;
			}

			enrichedCodemarks.push(await this.enrichCodemark(codemark));
		}

		return { codemarks: enrichedCodemarks };
	}

	@lspHandler(GetCodemarkSha1RequestType)
	@log()
	async getCodemarkSha1({
		codemarkId,
		markerId
	}: GetCodemarkSha1Request): Promise<GetCodemarkSha1Response> {
		const cc = Logger.getCorrelationContext();

		const { codemarks, files, markerLocations, scm } = SessionContainer.instance();
		const { documents } = Container.instance();

		const codemark = await codemarks.getEnrichedCodemarkById(codemarkId);
		if (codemark === undefined) {
			throw new Error(`No codemark could be found for Id(${codemarkId})`);
		}

		if (codemark.markers == null || codemark.markers.length === 0) {
			Logger.warn(cc, `No markers are associated with codemark Id(${codemarkId})`);
			return { codemarkSha1: undefined, documentSha1: undefined };
		}

		if (codemark.fileStreamIds.length === 0) {
			Logger.warn(cc, `No documents are associated with codemark Id(${codemarkId})`);
			return { codemarkSha1: undefined, documentSha1: undefined };
		}

		// Get the most up-to-date location for the codemark
		const marker = markerId
			? codemark.markers.find(m => m.id === markerId) || codemark.markers[0]
			: codemark.markers[0];

		const fileStreamId = marker.fileStreamId;
		const uri = await files.getDocumentUri(fileStreamId);
		if (uri === undefined) {
			Logger.warn(cc, `No document could be loaded for codemark Id(${codemarkId})`);
			return { codemarkSha1: undefined, documentSha1: undefined };
		}

		const document = documents.get(uri);
		const cachedResponse = this._codemarkSha1Cache.get(marker.id);
		if (document && cachedResponse && cachedResponse.documentVersion === document.version) {
			return cachedResponse;
		}

		const { locations } = await markerLocations.getCurrentLocations(uri, fileStreamId, [marker]);

		let documentSha1;

		const location = locations[marker.id];
		if (location != null) {
			const range = MarkerLocation.toRange(location);
			const response = await scm.getRangeSha1({ uri: uri, range: range });
			documentSha1 = response.sha1;
		}

		const response = {
			// Normalize to /n line endings
			codemarkSha1: Strings.sha1(marker.code.replace(/\r\n/g, "\n")),
			documentSha1: documentSha1
		};

		if (document && document.version) {
			this._codemarkSha1Cache.set(marker.id, {
				...response,
				documentVersion: document.version
			});
		}

		return response;
	}

	@lspHandler(GetCodemarkRangeRequestType)
	@log()
	async getCodemarkRange({
		codemarkId,
		markerId
	}: GetCodemarkRangeRequest): Promise<GetCodemarkRangeResponse> {
		const cc = Logger.getCorrelationContext();

		const { codemarks, files, markerLocations, scm } = SessionContainer.instance();
		const { documents } = Container.instance();

		const codemark = await codemarks.getEnrichedCodemarkById(codemarkId);
		if (codemark === undefined) {
			throw new Error(`No codemark could be found for Id(${codemarkId})`);
		}

		if (codemark.markers == null || codemark.markers.length === 0) {
			Logger.warn(cc, `No markers are associated with codemark Id(${codemarkId})`);
			return { success: false };
		}

		if (codemark.fileStreamIds.length === 0) {
			Logger.warn(cc, `No documents are associated with codemark Id(${codemarkId})`);
			return { success: false };
		}

		// Get the most up-to-date location for the codemark
		const marker = markerId
			? codemark.markers.find(m => m.id === markerId) || codemark.markers[0]
			: codemark.markers[0];

		const fileStreamId = marker.fileStreamId;
		const uri = await files.getDocumentUri(fileStreamId);
		if (uri === undefined) {
			Logger.warn(cc, `No document could be loaded for codemark Id(${codemarkId})`);
			return { success: false };
		}

		const { locations } = await markerLocations.getCurrentLocations(uri, fileStreamId, [marker]);

		let documentRange: GetRangeResponse | undefined = {};
		let diff = undefined;

		const location = locations[marker.id];
		if (location != null) {
			const range = MarkerLocation.toRange(location);
			documentRange = await scm.getRange({ uri: uri, range: range });
			if (documentRange) {
				const normalizedMarkerCode = Strings.normalizeFileContents(marker.code, {
					preserveEof: true
				});
				const normalizedCurrentContent =
					documentRange.currentContent &&
					Strings.normalizeFileContents(documentRange.currentContent, { preserveEof: true });

				if (normalizedMarkerCode !== normalizedCurrentContent) {
					diff = normalizedCurrentContent
						? createPatch(marker.file, normalizedMarkerCode, normalizedCurrentContent)
						: createPatch(marker.file, "", normalizedMarkerCode);
					const diffs = diff.trim().split("\n");
					diffs.splice(0, 5);
					let startLine = 1;
					if (marker.locationWhenCreated && marker.locationWhenCreated.length) {
						startLine = marker.locationWhenCreated[0];
					} else if (marker.referenceLocations && marker.referenceLocations.length) {
						startLine = marker.referenceLocations[0].location[0];
					}
					const newHeader = `@@ -${startLine},${marker.code.split("\n").length} +${range.start
						.line + 1},${(documentRange.currentContent || "").split("\n").length}`;
					diff = `${newHeader}\n${diffs.join("\n")}`;
				}
			}
		}

		const response = {
			...documentRange,
			diff,
			success: true
		};

		return response;
	}

	async getIdByPostId(postId: string): Promise<string | undefined> {
		const codemark = (await this.getAllCached()).find(c => c.postId === postId);
		return codemark && codemark.id;
	}

	async getEnrichedCodemarkById(codemarkId: string): Promise<CodemarkPlus> {
		return this.enrichCodemark(await this.getById(codemarkId));
	}

	async enrichCodemark(codemark: CSCodemark): Promise<CodemarkPlus> {
		const { markers: markersManager } = SessionContainer.instance();

		const markerObjects: { [key: string]: CSMarker } = {};
		const markers: CSMarker[] = [];
		const markersInOrder: CSMarker[] = [];
		if (codemark.markerIds != null && codemark.markerIds.length !== 0) {
			for (const markerId of codemark.markerIds) {
				try {
					markerObjects[markerId] = await markersManager.getById(markerId);
					markersInOrder.push(markerObjects[markerId]);
				} catch (err) {
					// https://trello.com/c/ti6neIz1/2969-activity-feed-loads-forever-if-restart-jb-while-on-the-feed
					Logger.warn(err.message);
				}
			}

			const addMarkerAfterCheckingForSuperseded = (marker: CSMarker) => {
				if (marker.supersededByMarkerId) {
					// check to see if the marker has been superseded by another.
					// if so, grab it from the markerObjects and push it at the location
					// of the "retired" marker, then delete it from the hash so that
					// it doesn't get inserted at its original location
					const supersededMarker = markerObjects[marker.supersededByMarkerId];
					if (supersededMarker) {
						addMarkerAfterCheckingForSuperseded(supersededMarker);
						delete markerObjects[marker.supersededByMarkerId];
					}
					// if there's no supersededMarker in markerObjects, that's kind of
					// an error condition -- the ID is pointing to a marker that for
					// whatever reason doesn't exist, so we do nothing in this case.
				} else {
					// if there's no supersededMarkerId, then it's just a regular
					// marker and add it to the array in the normal position
					markers.push(marker);
				}
			};

			for (const markerId of codemark.markerIds) {
				if (markerObjects[markerId]) addMarkerAfterCheckingForSuperseded(markerObjects[markerId]);
			}
		}

		return { ...codemark, markers: markers };
	}

	async enrichCodemarks(codemarks: CSCodemark[]): Promise<CodemarkPlus[]> {
		const enrichedCodemarks = [];
		for (const codemark of codemarks) {
			enrichedCodemarks.push(await this.enrichCodemark(codemark));
		}

		return enrichedCodemarks;
	}

	async enrichCodemarksByIds(codemarkIds: string[]): Promise<CodemarkPlus[]> {
		const enrichedCodemarks = [];
		for (const codemarkId of codemarkIds) {
			enrichedCodemarks.push(await this.getEnrichedCodemarkById(codemarkId));
		}

		return enrichedCodemarks;
	}

	private async canSeeCodemark(codemark: CSCodemark): Promise<boolean> {
		if (!codemark.streamId) return true;

		const stream = await SessionContainer.instance().streams.getByIdFromCache(codemark.streamId);
		if (!stream || stream.deactivated || stream.isArchived) {
			return false;
		}

		if (stream.memberIds === undefined) {
			return true;
		}

		return stream.memberIds.includes(this.session.userId);
	}

	@lspHandler(DeleteCodemarkRequestType)
	delete(request: DeleteCodemarkRequest): Promise<DeleteCodemarkResponse> {
		return this.session.api.deleteCodemark(request);
	}

	@lspHandler(UpdateCodemarkRequestType)
	async edit(request: UpdateCodemarkRequest): Promise<UpdateCodemarkResponse> {
		if (request.externalAssignees && request.externalAssignees.length) {
			request.externalAssignees = request.externalAssignees.map(a => ({
				displayName: a.displayName,
				email: a.email
			}));
		}
		const updateResponse = await this.session.api.updateCodemark(request);
		const [codemark] = await this.resolve({
			type: MessageType.Codemarks,
			data: [updateResponse.codemark]
		});
		return { codemark: await this.enrichCodemark(codemark) };
	}

	@lspHandler(SetCodemarkPinnedRequestType)
	setPinned(request: SetCodemarkPinnedRequest): Promise<SetCodemarkPinnedResponse> {
		return this.session.api.setCodemarkPinned(request);
	}

	@lspHandler(PinReplyToCodemarkRequestType)
	pinReply(request: PinReplyToCodemarkRequest): Promise<PinReplyToCodemarkResponse> {
		return this.session.api.pinReplyToCodemark(request);
	}

	@lspHandler(FollowCodemarkRequestType)
	followCodemark(request: FollowCodemarkRequest): Promise<FollowCodemarkResponse> {
		return this.session.api.followCodemark(request);
	}

	@lspHandler(FollowReviewRequestType)
	followReview(request: FollowReviewRequest): Promise<FollowReviewResponse> {
		return this.session.api.followReview(request);
	}

	@lspHandler(FollowCodeErrorRequestType)
	followCodeError(request: FollowCodeErrorRequest): Promise<FollowCodeErrorResponse> {
		return this.session.api.followCodeError(request);
	}

	@lspHandler(SetCodemarkStatusRequestType)
	async setStatus(request: SetCodemarkStatusRequest): Promise<SetCodemarkStatusResponse> {
		const response = await this.session.api.setCodemarkStatus(request);
		const [codemark] = await this.resolve({
			type: MessageType.Codemarks,
			data: [response.codemark]
		});
		return { codemark: await this.enrichCodemark(codemark) };
	}

	protected async fetchById(id: Id): Promise<CSCodemark> {
		const response = await this.session.api.getCodemark({ codemarkId: id });
		return response.codemark;
	}

	protected async loadCache(): Promise<void> {
		const response = await this.session.api.fetchCodemarks({});
		const { codemarks, ...rest } = response;
		this.cache.reset(codemarks);
		this.cacheResponse(rest);
	}

	protected getEntityName(): string {
		return "Codemark";
	}
}
