import { md4 } from "hash-wasm";

const UUID_FORMAT_REGEX: RegExp =
	/^\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b$/;

function formatHashAsUuid(hash: string): string {
	return [
		hash.substr(0, 8),
		hash.substr(8, 4),
		hash.substr(12, 4),
		hash.substr(16, 4),
		hash.substr(20, 12),
	].join("-");
}

function canonicalize(key: any, value: any): Object {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return value;
	}

	const keys: string[] = Object.keys(value).sort();
	const length: number = keys.length;
	const object: any = {};

	for (let i = 0; i < length; i++) {
		object[keys[i]] = value[keys[i]];
	}

	return object;
}

export async function generateHash(obj: any): Promise<string> {
	const stringifiedObj = JSON.stringify(obj, canonicalize);
	const rawHash = await md4(stringifiedObj);
	const hash = formatHashAsUuid(rawHash);

	return hash;
}

export function isValidHash(hash: string): boolean {
	if (!hash) {
		return false;
	}

	return UUID_FORMAT_REGEX.test(hash);
}
