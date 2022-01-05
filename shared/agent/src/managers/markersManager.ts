"use strict";
import { Marker } from "../api/extensions";
import { SessionContainer } from "../container";
import {
	AddMarkersRequest,
	AddMarkersRequestType,
	AddMarkersResponse,
	DeleteMarkerRequest,
	DeleteMarkerRequestType,
	DeleteMarkerResponse,
	GetMarkerRequest,
	GetMarkerRequestType,
	GetMarkerResponse,
	MoveMarkerRequest,
	MoveMarkerRequestType,
	MoveMarkerResponse
} from "../protocol/agent.protocol";
import { CSMarker, CSStream, StreamType } from "../protocol/api.protocol";
import { lsp, lspHandler } from "../system";
import { IndexParams, IndexType } from "./cache";
import { getValues, KeyValue } from "./cache/baseCache";
import { EntityManagerBase, Id } from "./entityManager";
import { MarkersBuilder } from "./markersBuilder";

@lsp
export class MarkersManager extends EntityManagerBase<CSMarker> {
	async getByStreamId(streamId: Id, visibleOnly?: boolean): Promise<CSMarker[]> {
		const markers = await this.cache.getGroup([["fileStreamId", streamId]]);
		this.polyfill(markers);
		return visibleOnly ? await this.filterMarkers(markers) : markers;
	}

	protected async fetchById(id: Id): Promise<CSMarker> {
		const response = await this.session.api.getMarker({ markerId: id });
		return response.marker;
	}

	getIndexedFields(): IndexParams<CSMarker>[] {
		return [
			{
				fields: ["fileStreamId"],
				type: IndexType.Group,
				fetchFn: this.fetchByStreamId.bind(this)
			}
		];
	}

	protected async fetchByStreamId(criteria: KeyValue<CSMarker>[]): Promise<CSMarker[]> {
		const [streamId] = getValues(criteria);
		const response = await this.session.api.fetchMarkers({ streamId: streamId });
		this.cacheResponse(response);
		return response.markers;
	}

	private async filterMarkers(markers: CSMarker[]): Promise<CSMarker[]> {
		const includedMarkers = [];
		const { streams } = SessionContainer.instance();

		for (const marker of markers) {
			if (marker.supersededByMarkerId != null) {
				continue;
			}

			if (marker.deactivated) {
				continue;
			}

			if (!marker.postStreamId) {
				includedMarkers.push(marker);
				continue;
			}

			try {
				const stream = await streams.getByIdFromCache(marker.postStreamId);
				if (stream && this.canSeeMarkers(stream, this.session.userId)) {
					includedMarkers.push(marker);
				}
			} catch (ignore) {
				// TODO the APIs will fail when the user doesn't have access to the channel/dm
			}
		}

		return includedMarkers;
	}

	private canSeeMarkers(stream: CSStream, userId: string): boolean {
		if (stream.deactivated || stream.type === StreamType.File) return false;
		if (stream.type === StreamType.Channel) {
			if (stream.isArchived) return false;
			if (stream.memberIds === undefined) return true;
			if (!stream.memberIds.includes(userId)) return false;
		}
		return true;
	}

	@lspHandler(GetMarkerRequestType)
	protected async getMarker(request: GetMarkerRequest): Promise<GetMarkerResponse> {
		const marker = await this.getById(request.markerId);
		this.polyfill([marker]);
		return { marker: marker };
	}

	protected getEntityName(): string {
		return "Marker";
	}

	private polyfill(markers: CSMarker[]) {
		for (const marker of markers) {
			if (!marker.referenceLocations && marker.locationWhenCreated) {
				marker.referenceLocations = [
					{
						location: marker.locationWhenCreated,
						commitHash: marker.commitHashWhenCreated,
						flags: { canonical: true }
					}
				];
			}
		}
	}

	@lspHandler(MoveMarkerRequestType)
	protected async moveMarker(request: MoveMarkerRequest): Promise<MoveMarkerResponse> {
		const { code, documentId, range, source } = request;
		const createMarkerRequest = await MarkersBuilder.buildCreateMarkerRequest(
			documentId,
			code,
			range,
			source
		);
		return await this.session.api.moveMarker({
			oldMarkerId: request.markerId,
			newMarker: createMarkerRequest
		});
	}

	@lspHandler(AddMarkersRequestType)
	protected async addMarkers(request: AddMarkersRequest): Promise<AddMarkersResponse> {
		const markers = [];
		for (const marker of request.newMarkers) {
			const { code, documentId, range, source } = marker;
			markers.push(await MarkersBuilder.buildCreateMarkerRequest(documentId, code, range, source));
		}
		return await this.session.api.addMarkers({
			codemarkId: request.codemarkId,
			newMarkers: markers
		});
	}

	@lspHandler(DeleteMarkerRequestType)
	deleteMarker(request: DeleteMarkerRequest): Promise<DeleteMarkerResponse> {
		return this.session.api.deleteMarker(request);
	}
}
