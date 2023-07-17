"use strict";
import * as path from "path";
import { SessionContainer } from "./container";
import { xfs } from "./xfs";

class Storage {
	private readonly storagePath: string;
	private readonly data: {
		[name: string]: {};
	};
	private readonly collections: Map<string, Collection>;

	constructor(storagePath: string, data: any) {
		this.storagePath = storagePath;
		this.data = data;
		this.collections = new Map();
	}

	getCollection(name: string): Collection {
		let collection = this.collections.get(name);
		if (!collection) {
			const collectionData = this.data[name] || (this.data[name] = {});
			collection = new Collection(collectionData);
		}
		return collection;
	}

	async flush() {
		await xfs.writeJsonAtomic(this.data, this.storagePath);
	}
}

class Collection {
	private readonly collectionData: {
		[key: string]: any;
	};

	constructor(collectionData: {}) {
		this.collectionData = collectionData;
	}

	set(key: string, value: any) {
		this.collectionData[key] = value;
	}

	get(key: string): any {
		return this.collectionData[key];
	}

	delete(key: string) {
		delete this.collectionData[key];
	}

	keys(): string[] {
		return Object.keys(this.collectionData);
	}
}

const storages = new Map<string, Storage>();

export async function getStorage(repoPath: string): Promise<Storage> {
	let storage = storages.get(repoPath);
	if (!storage) {
		storage = await load(repoPath);
		storages.set(repoPath, storage);
	}
	return storage;
}

async function load(repoPath: string): Promise<Storage> {
	if (!repoPath.endsWith(".git")) {
		repoPath = path.join(repoPath, ".git");
	}

	const storagePath = path.join(
		repoPath,
		`codestream-${SessionContainer.instance().session.userId}.cache`
	);
	const data = await xfs.readJson(storagePath);

	return new Storage(storagePath, data || {});
}
