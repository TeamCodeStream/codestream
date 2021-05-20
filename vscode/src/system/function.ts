"use strict";
/**
adapted from https://github.com/eamodio/vscode-gitlens

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

Copyright (c) 2018-2021 CodeStream Inc.

*/
import { debounce as _debounce, uniqBy as _uniqBy } from "lodash-es";
import uuidv4 from "uuid/v4";
import { CancellationToken } from "vscode";

export interface IDeferrable {
	cancel(): void;
	flush(...args: any[]): void;
	pending?(): boolean;
}

interface IPropOfValue {
	(): any;
	value: string | undefined;
}

export namespace Functions {
	export function cachedOnce<T>(
		fn: (...args: any[]) => Promise<T>,
		seed: T
	): (...args: any[]) => Promise<T> {
		let cached: T | undefined = seed;
		return (...args: any[]) => {
			if (cached !== undefined) {
				const promise = Promise.resolve(cached);
				cached = undefined;

				return promise;
			}
			return fn(...args);
		};
	}

	export function cancellable<T>(
		promise: Thenable<T>,
		timeoutMs: number,
		options?: {
			cancelMessage?: string;
			onDidCancel?(
				resolve: (value?: T | PromiseLike<T> | undefined) => void,
				reject: (reason?: any) => void
			): void;
		}
	): Promise<T>;
	export function cancellable<T>(
		promise: Thenable<T>,
		token: CancellationToken,
		options?: {
			cancelMessage?: string;
			onDidCancel?(
				resolve: (value?: T | PromiseLike<T> | undefined) => void,
				reject: (reason?: any) => void
			): void;
		}
	): Promise<T>;
	export function cancellable<T>(
		promise: Thenable<T>,
		timeoutOrToken: CancellationToken | number,
		options: {
			cancelMessage?: string;
			onDidCancel?(
				resolve: (value?: T | PromiseLike<T> | undefined) => void,
				reject: (reason?: any) => void
			): void;
		} = {}
	): Promise<T> {
		return new Promise((resolve, reject) => {
			let fulfilled = false;
			let timer: NodeJS.Timer | undefined;
			if (typeof timeoutOrToken === "number") {
				timer = setTimeout(() => {
					if (typeof options.onDidCancel === "function") {
						options.onDidCancel(resolve, reject);
					} else {
						reject(new Error(options.cancelMessage || "TIMED OUT"));
					}
				}, timeoutOrToken);
			} else {
				timeoutOrToken.onCancellationRequested(() => {
					if (fulfilled) return;

					if (typeof options.onDidCancel === "function") {
						options.onDidCancel(resolve, reject);
					} else {
						reject(new Error(options.cancelMessage || "CANCELLED"));
					}
				});
			}

			promise.then(
				() => {
					fulfilled = true;
					if (timer !== undefined) {
						clearTimeout(timer);
					}
					resolve(promise);
				},
				ex => {
					fulfilled = true;
					if (timer !== undefined) {
						clearTimeout(timer);
					}
					reject(ex);
				}
			);
		});
	}

	interface DebounceOptions {
		leading?: boolean;
		maxWait?: number;
		track?: boolean;
		trailing?: boolean;
	}

	type AnyCallback = (...args: any[]) => any;

	export function debounce<T extends AnyCallback>(
		fn: T,
		wait?: number,
		options?: DebounceOptions
	): T & IDeferrable {
		const { track, ...opts } = { track: false, ...(options || ({} as DebounceOptions)) };

		if (track !== true) return _debounce(fn, wait, opts);

		let pending = false;

		const debounced = _debounce(
			(function(this: any, ...args: any[]) {
				pending = false;
				return fn.apply(this, args);
			} as any) as T,
			wait,
			options
		) as T & IDeferrable;

		const tracked = (function(this: any, ...args: any[]) {
			pending = true;
			return debounced.apply(this, args);
		} as any) as T & IDeferrable;

		tracked.pending = function() {
			return pending;
		};
		tracked.cancel = function() {
			return debounced.cancel.apply(debounced);
		};
		tracked.flush = function(...args: any[]) {
			return debounced.flush.apply(debounced, args);
		};

		return tracked;
	}

	export function debounceMerge<T extends AnyCallback>(
		fn: T,
		merger: (merged: any | undefined, current: any) => any,
		wait?: number,
		options?: { leading?: boolean; maxWait?: number; trailing?: boolean }
	): T {
		let merged: any | undefined;
		let context: any;

		const debounced = debounce<T>(
			function() {
				const data = merged;
				merged = undefined;

				if (Array.isArray(data)) {
					for (const datum of data) {
						fn.apply(context, [datum]);
					}
				} else {
					return fn.apply(context, [data]);
				}
			} as any,
			wait,
			options
		);

		return function(this: any, current: any) {
			context = this;
			merged = merger.apply(context, [merged, current]);
			return debounced();
		} as any;
	}

	// interface Data {
	//     type: 'foo' | 'bar';
	//     values: string[];
	// }

	// const foo = (data: Data) => console.log(data);
	// const foodb = debounceMerge(foo, (combined: Data[] | undefined, current: Data) => {
	//     if (combined === undefined) return [current];

	//     const found = combined.find(_ => _.type === current.type);
	//     if (found === undefined) {
	//         combined.push(current);
	//     }
	//     else {
	//         found.values.push(...current.values);
	//     }
	//     return combined;
	// }, 1000);

	// foodb({ type: 'foo', values: ['foo'] });
	// foodb({ type: 'foo', values: ['bar'] });
	// foodb({ type: 'bar', values: ['1', '2', '3'] });
	// foodb({ type: 'foo', values: ['baz'] });

	// setTimeout(() => {
	//     foodb({ type: 'foo', values: ['baz'] });
	// }, 2000);

	// setTimeout(() => {
	//     foodb({ type: 'foo', values: ['4'] });
	//     foodb({ type: 'bar', values: ['5', '6'] });
	//     foodb({ type: 'bar', values: ['7'] });
	// }, 5000);

	const comma = ",";
	const empty = "";
	const equals = "=";
	const openBrace = "{";
	const openParen = "(";
	const closeParen = ")";

	const fnBodyRegex = /\(([\s\S]*)\)/;
	const fnBodyStripCommentsRegex = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/gm;
	const fnBodyStripParamDefaultValueRegex = /\s?=.*$/;

	export function getParameters(fn: Function): string[] {
		if (typeof fn !== "function") throw new Error("Not supported");

		if (fn.length === 0) return [];

		let fnBody: string = Function.prototype.toString.call(fn);
		fnBody = fnBody.replace(fnBodyStripCommentsRegex, empty) || fnBody;
		fnBody = fnBody.slice(0, fnBody.indexOf(openBrace));

		let open = fnBody.indexOf(openParen);
		let close = fnBody.indexOf(closeParen);

		open = open >= 0 ? open + 1 : 0;
		close = close > 0 ? close : fnBody.indexOf(equals);

		fnBody = fnBody.slice(open, close);
		fnBody = `(${fnBody})`;

		const match = fnBody.match(fnBodyRegex);
		return match != null
			? match[1]
					.split(comma)
					.map(param => param.trim().replace(fnBodyStripParamDefaultValueRegex, empty))
			: [];
	}

	export function is<T>(o: T | null | undefined): o is T;
	export function is<T>(o: any, prop: keyof T): o is T;
	export function is<T>(o: any, matcher: (o: any) => boolean): o is T;
	export function is<T>(o: any, propOrMatcher?: keyof T | ((o: any) => boolean)): o is T {
		if (propOrMatcher == null) return o != null;
		if (typeof propOrMatcher === "function") return propOrMatcher(o);

		return o[propOrMatcher] !== undefined;
	}

	export function isPromise(o: any) {
		return (typeof o === "object" || typeof o === "function") && typeof o.then === "function";
	}

	export function propOf<T, K extends Extract<keyof T, string>>(o: T, key: K) {
		const propOfCore = <T, K extends Extract<keyof T, string>>(o: T, key: K) => {
			const value: string =
				(propOfCore as IPropOfValue).value === undefined
					? key
					: `${(propOfCore as IPropOfValue).value}.${key}`;
			(propOfCore as IPropOfValue).value = value;
			const fn = <Y extends Extract<keyof T[K], string>>(k: Y) => propOfCore(o[key], k);
			return Object.assign(fn, { value: value });
		};
		return propOfCore(o, key);
	}

	export async function wait(ms: number) {
		await new Promise(resolve => setTimeout(resolve, ms));
	}

	export async function waitUntil(
		fn: (...args: any[]) => boolean,
		timeout: number
	): Promise<boolean> {
		const max = Math.round(timeout / 100);
		let counter = 0;
		while (true) {
			if (fn()) return true;
			if (counter > max) return false;

			await wait(100);
			counter++;
		}
	}

	export function uuid() {
		return uuidv4();
	}

	export function shortUuid() {
		const data = new Uint8Array(16);
		uuidv4(null, data, 0);

		const base64 = Buffer.from(
			data.buffer as ArrayBuffer,
			data.byteOffset,
			data.byteLength
		).toString("base64");
		return base64
			.replace(/\+/g, "-") // Replace + with - (see RFC 4648, sec. 5)
			.replace(/\//g, "_") // Replace / with _ (see RFC 4648, sec. 5)
			.substring(0, 22); // Drop '==' padding;
	}

	export function uniqueBy(array: any[], iteratee: any) {
		return _uniqBy(array, iteratee);
	}
}
