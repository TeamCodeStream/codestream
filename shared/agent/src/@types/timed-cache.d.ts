declare module "timed-cache" {
	export default class Cache {
		clear(): void;
		get(key: string): any;
		put(key: string, value: any): void;
		remove(key: string): void;
		size(): number;
	}
}
