"use strict";
import { MessageType, RawRTMessage } from "../api/apiProvider";
import { SessionContainer } from "../container";
import { Logger } from "../logger";
import { CSEntity, CSMarkerLocations } from "../protocol/api.protocol.models";
import { CodeStreamSession } from "../session";
import { debug, log } from "../system";
import { IndexParams } from "./cache";
import { BaseCache, KeyValue } from "./cache/baseCache";
import { isDirective, resolve } from "./operations";

function getCacheUpdateAction(
	newOrDirective: any,
	existing: any | undefined
): "query" | "skip" | "update" {
	if (isDirective(newOrDirective)) {
		if (existing == null) return "query";

		const directiveVersion = newOrDirective.$version;
		if (directiveVersion == null) {
			throw new Error(
				`Received directive without version attribute for object Id=${newOrDirective.id}`
			);
		}

		if (directiveVersion.before === "*" || directiveVersion.before === existing.version) {
			return "update";
		}

		if (directiveVersion.after <= existing.version) {
			return "skip";
		}

		return "query";
	}

	if (
		existing == null ||
		(existing.version == null && newOrDirective.version == null) ||
		newOrDirective.version > existing.version
	) {
		return "update";
	}

	if (newOrDirective.version <= existing.version) {
		return "skip";
	}

	return "query";
}

export abstract class ManagerBase<T> {
	protected readonly cache: BaseCache<T> = new BaseCache<T>({
		idxFields: this.getIndexedFields(),
		entityName: this.getEntityName()
	});

	protected forceFetchToResolveOnCacheMiss = false;

	constructor(public readonly session: CodeStreamSession) {
		this.session.onDidRequestReset(() => {
			this.invalidateCache();
		});

		this.initialize();
	}

	protected initialize() {}

	getIndexedFields(): IndexParams<T>[] {
		return [];
	}

	protected abstract getEntityName(): string;

	protected abstract fetch(criteria: KeyValue<T>[]): Promise<T>;

	protected abstract fetchCriteria(obj: T): KeyValue<T>[];

	@log()
	protected invalidateCache() {
		this.cache.invalidate();
	}

	@debug()
	async resolve(
		message: RawRTMessage,
		{ onlyIfNeeded }: { onlyIfNeeded?: boolean } = {}
	): Promise<T[]> {
		if (message.data == null || !Array.isArray(message.data)) {
			throw new Error("Message was either missing data or it wasn't an array");
		}

		const resolved = await Promise.all(
			message.data.map(async (data: any) => {
				const criteria = this.fetchCriteria(data as T);
				const cached = await this.cacheGet(criteria);

				const action = getCacheUpdateAction(data, cached);
				// We need to return the cached item still until the UI handles updates via api calls the same as notifications
				if (action === "skip") return onlyIfNeeded ? undefined : cached;
				if (action === "update") {
					// TODO: Should we fall-through to query if we don't have the cached data, but we do have a full object?
					const updatedEntity: T = cached == null ? data : resolve<T>(cached as any, data);
					return this.cacheSet(updatedEntity, cached);
				}

				// Fall-through to query for the data
				let entity: T;
				if (this.forceFetchToResolveOnCacheMiss || isDirective(data)) {
					entity = await this.fetch(criteria);
				} else {
					entity = data;
				}

				if (entity != null) {
					return this.cacheSet(entity);
				}

				return undefined;
			})
		);

		return resolved.filter(Boolean) as T[];
	}

	cacheResponse(response: any) {
		const container = SessionContainer.instance();
		this.cacheResponseEntities(container.codemarks, [response.codemark]);
		this.cacheResponseEntities(container.codemarks, response.codemarks);
		this.cacheResponseEntities(container.codeErrors, response.codeErrors);
		this.cacheResponseEntities(container.companies, response.companies);
		this.cacheResponseEntities(container.markers, response.markers);
		this.cacheResponseEntities(container.markerLocations, response.markerLocations);
		this.cacheResponseEntities(container.posts, response.posts);
		this.cacheResponseEntities(container.repos, response.repos);
		this.cacheResponseEntities(container.streams, response.streams);
		this.cacheResponseEntities(container.users, response.users);
	}

	private cacheResponseEntities<T extends CSEntity | CSMarkerLocations>(
		manager: ManagerBase<T>,
		entities: T[] | undefined
	) {
		if (!entities) return;
		try {
			manager.cache.set(entities);
		} catch (ex) {
			Logger.warn("Error caching response entities: " + ex.message);
		}
	}

	cacheGet(criteria: KeyValue<T>[]): Promise<T | undefined> {
		return this.cache.get(criteria, { fromCacheOnly: true });
	}

	async cacheSet(entity: T, oldEntity?: T): Promise<T | undefined> {
		this.cache.set(entity, oldEntity);
		return entity;
	}
}
