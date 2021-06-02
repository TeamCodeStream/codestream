"use strict";
/**
Portions adapted from https://github.com/eamodio/vscode-gitlens/blob/88e0a1b45a9b6f53b6865798e745037207f8c2da/src/system/iterable.ts which carries this notice:

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
export namespace Iterables {
	export function count<T>(
		source: Iterable<T> | IterableIterator<T>,
		predicate?: (item: T) => boolean
	): number {
		let count = 0;
		let next: IteratorResult<T>;

		while (true) {
			next = (source as IterableIterator<T>).next();
			if (next.done) break;

			if (predicate === undefined || predicate(next.value)) {
				count++;
			}
		}

		return count;
	}

	export function every<T>(
		source: Iterable<T> | IterableIterator<T>,
		predicate: (item: T) => boolean
	): boolean {
		for (const item of source) {
			if (!predicate(item)) return false;
		}
		return true;
	}

	export function filter<T>(
		source: Iterable<T | undefined | null> | IterableIterator<T | undefined | null>
	): Iterable<T>;
	export function filter<T>(
		source: Iterable<T> | IterableIterator<T>,
		predicate: (item: T) => boolean
	): Iterable<T>;
	export function* filter<T>(
		source: Iterable<T> | IterableIterator<T>,
		predicate?: (item: T) => boolean
	): Iterable<T> {
		if (predicate === undefined) {
			for (const item of source) {
				if (item != null) yield item;
			}
		} else {
			for (const item of source) {
				if (predicate(item)) yield item;
			}
		}
	}

	export function* filterMap<T, TMapped>(
		source: Iterable<T> | IterableIterator<T>,
		predicateMapper: (item: T) => TMapped | undefined | null
	): Iterable<TMapped> {
		for (const item of source) {
			const mapped = predicateMapper(item);
			if (mapped != null) yield mapped;
		}
	}

	export function forEach<T>(
		source: Iterable<T> | IterableIterator<T>,
		fn: (item: T, index: number) => void
	): void {
		let i = 0;
		for (const item of source) {
			fn(item, i);
			i++;
		}
	}

	export function find<T>(
		source: Iterable<T> | IterableIterator<T>,
		predicate: (item: T) => boolean
	): T | undefined {
		for (const item of source) {
			if (predicate(item)) return item;
		}
		return undefined;
	}

	export function first<T>(source: Iterable<T>): T {
		return source[Symbol.iterator]().next().value;
	}

	export function* flatMap<T, TMapped>(
		source: Iterable<T> | IterableIterator<T>,
		mapper: (item: T) => Iterable<TMapped>
	): Iterable<TMapped> {
		for (const item of source) {
			yield* mapper(item);
		}
	}

	export function has<T>(source: Iterable<T> | IterableIterator<T>, item: T): boolean {
		return some(source, i => i === item);
	}

	export function isIterable(source: Iterable<any>): boolean {
		return typeof source[Symbol.iterator] === "function";
	}

	export function join(source: Iterable<any>, separator: string): string {
		let value = "";

		const iterator = source[Symbol.iterator]();
		let next = iterator.next();
		if (next.done) return value;

		while (true) {
			const s = next.value.toString();

			next = iterator.next();
			if (next.done) {
				value += s;
				break;
			}

			value += `${s}${separator}`;
		}

		return value;
	}

	export function last<T>(source: Iterable<T>): T | undefined {
		let item: T | undefined;
		for (item of source) {
			/* noop */
		}
		return item;
	}

	export function* map<T, TMapped>(
		source: Iterable<T> | IterableIterator<T>,
		mapper: (item: T) => TMapped
	): Iterable<TMapped> {
		for (const item of source) {
			yield mapper(item);
		}
	}

	export function next<T>(source: IterableIterator<T>): T {
		return source.next().value;
	}

	export function* skip<T>(
		source: Iterable<T> | IterableIterator<T>,
		count: number
	): Iterable<T> | IterableIterator<T> {
		let i = 0;
		for (const item of source) {
			if (i >= count) yield item;
			i++;
		}
	}

	export function some<T>(
		source: Iterable<T> | IterableIterator<T>,
		predicate: (item: T) => boolean
	): boolean {
		for (const item of source) {
			if (predicate(item)) return true;
		}
		return false;
	}

	export function* take<T>(source: Iterable<T> | IterableIterator<T>, count: number): Iterable<T> {
		if (count > 0) {
			let i = 0;
			for (const item of source) {
				yield item;
				i++;
				if (i >= count) break;
			}
		}
	}

	export function* union<T>(...sources: (Iterable<T> | IterableIterator<T>)[]): Iterable<T> {
		for (const source of sources) {
			for (const item of source) {
				yield item;
			}
		}
	}
}
