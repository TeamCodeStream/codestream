"use strict";
import { CSEntity } from "@codestream/protocols/api";

import { RawRTMessage } from "../api/apiProvider";
import { CodeStreamSession } from "../session";
import { log } from "../system";
import { ManagerBase } from "./baseManager";
import { KeyValue } from "./cache/baseCache";
import { EntityCache } from "./cache/entityCache";

export type Id = string;

/**
 * Base class for entity managers.
 */
export abstract class EntityManagerBase<T extends CSEntity> extends ManagerBase<T> {
	protected readonly cache: EntityCache<T> = new EntityCache<T>({
		idxFields: this.getIndexedFields(),
		fetchFn: this.fetch.bind(this),
		entityName: this.getEntityName(),
	});

	constructor(session: CodeStreamSession) {
		super(session);
	}

	getById(id: Id): Promise<T> {
		return this.cache.getById(id);
	}

	getByIdFromCache(id: Id): Promise<T | undefined> {
		return this.cache.getByIdFromCache(id);
	}

	protected fetch(criteria: KeyValue<T>[]): Promise<T> {
		const [idCriteria] = criteria;
		const id = idCriteria[1] as Id;
		return this.fetchById(id);
	}

	protected fetchCriteria(obj: T): KeyValue<T>[] {
		return [["id", obj.id]];
	}

	protected abstract fetchById(id: Id): Promise<T>;
}

export abstract class CachedEntityManagerBase<T extends CSEntity> extends EntityManagerBase<T> {
	protected _caching: Promise<void> | undefined;

	protected _cached = false;
	get cached() {
		return this._cached;
	}

	async ensureCached(): Promise<void> {
		if (!this._cached && this._caching === undefined) {
			// Don't pass the request, since we want to cache all the data
			this._caching = this.loadCache();
		}

		if (this._caching !== undefined) {
			try {
				void (await this._caching);
				this._cached = true;
			} catch (error) {}

			this._caching = undefined;
		}
	}

	async getAllCached(): Promise<T[]> {
		await this.ensureCached();
		return this.cache.getAll();
	}

	async getById(id: Id): Promise<T> {
		if (!this._cached) {
			await this.ensureCached();
		}

		return super.getById(id);
	}

	async getByIdFromCache(id: Id): Promise<T | undefined> {
		if (!this._cached) {
			await this.ensureCached();
		}

		return super.getByIdFromCache(id);
	}

	async resolve(
		message: RawRTMessage,
		{ onlyIfNeeded }: { onlyIfNeeded?: boolean } = {}
	): Promise<T[]> {
		await this.ensureCached();
		return super.resolve(message, { onlyIfNeeded });
	}

	@log()
	protected invalidateCache() {
		this._cached = false;
		super.invalidateCache();
	}

	protected abstract loadCache(): Promise<void>;
}
