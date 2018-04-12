'use strict';
import { Disposable } from 'vscode';
import { CodeStreamSession } from '../session';
import { Entity } from '../types';

const mappedSymbol = Symbol('codestream-mapped');

interface ICollectionItem {
    // Marker as to whether or not the item has been mapped: entity -> item
    [mappedSymbol]?: boolean;
    readonly id: string;
}

export abstract class CodeStreamItem<TEntity extends Entity> extends Disposable implements ICollectionItem {

    constructor(
        protected readonly session: CodeStreamSession,
        protected readonly entity: TEntity
    ) {
        super(() => this.dispose());
    }

    dispose() {
    }

    get id() {
        return this.entity.id;
    }
}

export abstract class CodeStreamCollection<TItem extends ICollectionItem, TEntity extends Entity> extends Disposable {

    protected _disposable: Disposable | undefined;

    constructor(
        protected readonly session: CodeStreamSession
    ) {
        super(() => this.dispose());
    }

    dispose() {
        this._disposable && this._disposable.dispose();
    }

    protected abstract getEntities(): Promise<(TEntity | TItem)[]>;
    protected abstract mapper(e: TEntity): TItem;

    private _collection: Promise<Map<string, TEntity | TItem>> | undefined;
    get items(): Promise<IterableIterator<TItem>> {
        return this.ensureLoaded().then(items => this.ensureMapped(items));
    }

    async get(key: string) {
        const collection = await this.ensureLoaded();
        return collection.get(key);
    }

    async has(key: string) {
        const collection = await this.ensureLoaded();
        return collection.has(key);
    }

    protected ensureLoaded() {
        if (this._collection === undefined) {
            this._collection = this.load();
        }
        return this._collection;
    }

    private *ensureMapped(items: Map<string, TEntity | TItem>) {
        for (const [key, value] of items) {
            if ((value as ICollectionItem)[mappedSymbol]) {
                yield value as TItem;
                continue;
            }

            const mapped = this.mapEntity(value as TEntity);
            items.set(key, mapped);
            yield mapped;
        }
    }

    protected invalidate() {
        this._collection = undefined;
    }

    protected async load() {
        const entities = await this.getEntities();
        return new Map(entities.map<[string, TEntity | TItem]>(e => [e.id, e]));
    }

    protected mapEntity(e: TEntity): TItem {
        const item = this.mapper(e);
        item[mappedSymbol] = true;
        return item;
    }
}
