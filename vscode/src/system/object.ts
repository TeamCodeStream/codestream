"use strict";

/**
Portions adapted from https://github.com/eamodio/vscode-gitlens/blob/88e0a1b45a9b6f53b6865798e745037207f8c2da/src/system/object.ts which carries this notice:

The MIT License (MIT)

Copyright (c) 2016-2021 Eric Amodio

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/**
 * Modifications Copyright CodeStream Inc. under the Apache 2.0 License (Apache-2.0)
 */
export namespace Objects {
	export function entries<T>(o: { [key: string]: T }): IterableIterator<[string, T]>;
	export function entries<T>(o: { [key: number]: T }): IterableIterator<[string, T]>;
	export function* entries<T>(o: any): IterableIterator<[string, T]> {
		for (const key in o) {
			yield [key, o[key]];
		}
	}

	export function flatten(
		o: any,
		prefix: string = "",
		stringify: boolean = false
	): { [key: string]: any } {
		const flattened = Object.create(null);
		_flatten(flattened, prefix, o, stringify);
		return flattened;
	}

	function _flatten(
		flattened: { [key: string]: any },
		key: string,
		value: any,
		stringify: boolean = false
	) {
		if (Object(value) !== value) {
			if (stringify) {
				if (value == null) {
					flattened[key] = null;
				} else if (typeof value === "string") {
					flattened[key] = value;
				} else {
					flattened[key] = JSON.stringify(value);
				}
			} else {
				flattened[key] = value;
			}
		} else if (Array.isArray(value)) {
			const len = value.length;
			for (let i = 0; i < len; i++) {
				_flatten(flattened, `${key}[${i}]`, value[i], stringify);
			}
			if (len === 0) {
				flattened[key] = null;
			}
		} else {
			let isEmpty = true;
			for (const p in value) {
				isEmpty = false;
				_flatten(flattened, key ? `${key}.${p}` : p, value[p], stringify);
			}
			if (isEmpty && key) {
				flattened[key] = null;
			}
		}
	}

	export function paths(o: { [key: string]: any }, path?: string): string[] {
		const results = [];

		for (const key in o) {
			const child = o[key];
			if (typeof child === "object") {
				results.push(...paths(child, path === undefined ? key : `${path}.${key}`));
			} else {
				results.push(path === undefined ? key : `${path}.${key}`);
			}
		}

		return results;
	}

	export function values<T>(o: { [key: string]: T }): IterableIterator<T>;
	export function values<T>(o: { [key: number]: T }): IterableIterator<T>;
	export function* values<T>(o: any): IterableIterator<T> {
		for (const key in o) {
			yield o[key];
		}
	}
}
