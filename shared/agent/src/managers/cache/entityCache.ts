"use strict";

import { CSEntity } from "@codestream/protocols/api";

import { Id } from "../entityManager";
import { BaseCache, CacheCfg, UniqueFetchFn } from "./baseCache";
import { IndexType, makeIndex, UniqueIndex } from "./index";
import { Logger } from "../../logger";

export interface EntityCacheCfg<T> extends CacheCfg<T> {
	fetchFn: UniqueFetchFn<T>;
}

/**
 * <p>Cache for entities. All entities are indexed by Id. Indexes for additional fields can be
 * declared, allowing to efficiently retrieve entities or groups of entities by their values.</p>
 *
 * <p>The following types of indexes are supported:</p>
 *
 * <ul>
 * 		<li>#UniqueIndex: For unique fields such as person's SSN; allows to retrieve entities via
 * 		{#getGroup}</li>
 *
 * 		<li>#GroupIndex: For grouping fields such as user's teamId; allows to retrieve groups of
 * 		entities via {#getGroup}</li>
 *
 * 		<li>#GroupSequentialIndex: For grouping fields accompanied by a sequence field which defines
 * 		the order within the group such as post's streamId/seqNum; allows to retrieve slices of groups
 * 		via #getGroupSlice and #getGroupTail</li>
 * </ul>
 */
export class EntityCache<T extends CSEntity> extends BaseCache<T> {
	/**
	 * Create a cache
	 *
	 * @param cfg Cache configuration
	 */
	constructor(cfg: EntityCacheCfg<T>) {
		super(cfg);
		this.indexes.set(
			"id",
			makeIndex({
				fields: ["id"],
				type: IndexType.Unique,
				fetchFn: cfg.fetchFn,
			})
		);
	}

	/**
	 * Get an entity by Id
	 *
	 * @param id Id
	 *
	 * @return Entity or `undefined`
	 */
	async getById(id: Id): Promise<T> {
		const entity = await this.get([["id", id]]);
		if (!entity) {
			const err = new Error(`Could not find entity with ID ${id}`);
			Logger.error(err);
			throw err;
		}
		return entity;
	}

	async getByIdFromCache(id: Id): Promise<T | undefined> {
		return this.get([["id", id]], { fromCacheOnly: true });
	}

	getAll(): T[] {
		const index = this.indexes.get("id") as UniqueIndex<T>;
		return index.getAll();
	}
}
