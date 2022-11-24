"use strict";

import {
	BaseIndex,
	encodeArray,
	GroupIndex,
	IndexParams,
	IndexType,
	makeIndex,
	UniqueIndex,
} from "./index";
import { Logger } from "../../logger";
import { debug, Strings } from "../../system";
import { Id } from "../entityManager";

export type UniqueFetchFn<T> = (criteria: KeyValue<T>[]) => Promise<T | undefined>;
export type GroupFetchFn<T> = (criteria: KeyValue<T>[]) => Promise<T[]>;
export type FetchFn<T> = UniqueFetchFn<T> | GroupFetchFn<T>;

export type IdFn<T> = (obj: T) => Id;

export type KeyValue<T> = [keyof T, any];

export function getKeys<T>(keyValues: KeyValue<T>[]): (keyof T)[] {
	return keyValues.map(kv => kv[0]);
}

export function getValues<T>(keyValues: KeyValue<T>[]): any[] {
	return keyValues.map(kv => kv[1]);
}

export interface CacheCfg<T> {
	idxFields: IndexParams<T>[];
	entityName: string;
}

export class BaseCache<T> {
	protected readonly indexes: Map<string, BaseIndex<T>>;
	protected readonly entityName: string;

	/**
	 * Create a cache
	 *
	 * @param  cfg Cache configuration
	 */
	constructor(cfg: CacheCfg<T>) {
		this.entityName = cfg.entityName;

		const indexes = new Map();
		for (const idxField of cfg.idxFields) {
			indexes.set(encodeArray(idxField.fields), makeIndex(idxField));
		}
		this.indexes = indexes;
	}

	disable() {
		for (const index of this.indexes.values()) {
			index.enabled = false;
			index.invalidate();
		}
	}

	enable() {
		for (const index of this.indexes.values()) {
			index.enabled = true;
		}
	}

	invalidate() {
		const cacheName = `${this.entityName} cache`;
		for (const [field, index] of this.indexes.entries()) {
			Logger.debug(`${cacheName}: Invalidating index ${field}`);
			index.invalidate();
		}
	}

	reset(entities: T[]) {
		this.invalidate();
		this.set(entities);
	}

	/**
	 * Get an entity by field. Requires an unique index.
	 *
	 * @param criteria Search criteria as an array of key/value tuples
	 *
	 * @return Entity or `undefined`
	 */
	@debug<BaseCache<T>, BaseCache<T>["get"]>({
		prefix: context =>
			`[${context.id}] ${context.instance.entityName}${
				context.instanceName ? `${context.instanceName}.` : ""
			}${context.name}`,
		singleLine: true,
	})
	async get(
		criteria: KeyValue<T>[],
		options: { fromCacheOnly?: boolean } = {}
	): Promise<T | undefined> {
		const cc = Logger.getCorrelationContext();

		const keys = getKeys(criteria);
		const index = this.getIndex<UniqueIndex<T>>(keys);
		const values = getValues(criteria);
		if (!index || index.type !== IndexType.Unique) {
			throw new Error(`No unique index declared for fields ${keys}`);
		}

		let entity = index.get(values);
		if (!entity) {
			if (cc !== undefined) {
				cc.exitDetails = "(cache miss)";
			}

			if (options.fromCacheOnly !== true) {
				const fetch = index.fetchFn as UniqueFetchFn<T>;
				entity = await fetch(criteria);
				this.set(entity);
			}
		}

		return entity;
	}

	/**
	 * Add or update an entity. All initialized indexes are updated. In order to dissociate an
	 * updated entity from its old indexed values, #oldEntity must be specified.
	 *
	 * @param entity The entity
	 * @param oldEntity The old version of the entity
	 */
	set(entities: T[]): void;
	set(entity?: T, oldEntity?: T): void;
	set(entitiesOrEntity?: T | T[], oldEntity?: T): void {
		if (!entitiesOrEntity) {
			return;
		}

		if (Array.isArray(entitiesOrEntity)) {
			if (entitiesOrEntity.length === 0) return;

			for (const index of this.indexes.values()) {
				for (const entity of entitiesOrEntity) {
					if (!entity) continue;

					index.set(entity);
				}
			}
		} else {
			for (const index of this.indexes.values()) {
				index.set(entitiesOrEntity, oldEntity);
			}
		}
	}

	/**
	 * Get a group of entities by field. Requires a group index.
	 *
	 * @param criteria Search criteria as an array of key/value tuples
	 *
	 * @return Array of entities or `undefined` if group is not initialized
	 */
	async getGroup(criteria: KeyValue<T>[]): Promise<T[]> {
		const start = process.hrtime();
		const keys = getKeys(criteria);
		const values = getValues(criteria);
		const index = this.getIndex<GroupIndex<T>>(keys);
		if (!index || index.type !== IndexType.Group) {
			throw new Error(`No group index declared for field ${keys}`);
		}

		let entities = index.getGroup(values);
		let found = true;
		if (!entities) {
			found = false;
			const fetch = index.fetchFn as GroupFetchFn<T>;
			entities = await fetch(criteria);
			this.initGroup(criteria, entities);
		}

		Logger.debug(
			`${this.entityName}${Logger.toLoggableName(this)}${found ? "" : "(cache miss)"} returned ${
				entities.length
			} entities \u2022 ${Strings.getDurationMilliseconds(start)} ms \u2014 ${keys}=${values}`
		);
		return entities;
	}

	/**
	 * Initializes a group of entities. For group indexes, all entities must be specified.
	 *
	 * @param groupField The group field
	 * @param groupValue The group field value
	 * @param entities Array of entities
	 */
	initGroup(criteria: KeyValue<T>[], entities: T[]) {
		const keys = getKeys(criteria);
		const values = getValues(criteria);
		const index = this.requireIndex<GroupIndex<T>>(keys);
		if (index.type !== IndexType.Group) {
			throw new Error(
				`Cannot initialize group ${keys}=${values} because it doesn't have an associated group index`
			);
		}

		for (const entity of entities) {
			this.set(entity);
		}
		index.initGroup(values, entities);
	}

	protected requireIndex<I extends BaseIndex<T>>(keys: (keyof T)[]): I {
		const index = this.getIndex<I>(keys);
		if (index == null) {
			throw new Error(`No index declared for field ${keys}`);
		}
		return index;
	}

	private getIndex<I extends BaseIndex<T>>(fields: (keyof T)[]): I | undefined {
		return this.indexes.get(encodeArray(fields)) as I;
	}
}
