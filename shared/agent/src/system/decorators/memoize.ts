"use strict";
/**
Portions adapted from https://github.com/eamodio/vscode-gitlens/blob/042f703791c21d22d1c7f7f791769287d6c5995c/src/system/decorators/memoize.ts which carries this notice:

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
export function memoize(target: any, key: string, descriptor: any) {
	let fn: Function | undefined;
	let fnKey: string | undefined;

	if (typeof descriptor.value === "function") {
		fn = descriptor.value;
		fnKey = "value";

		if (fn!.length !== 0) {
			console.error("Memoize should only be used in functions with no parameters");
		}
	} else if (typeof descriptor.get === "function") {
		fn = descriptor.get;
		fnKey = "get";
	} else {
		throw new Error("Not supported");
	}

	if (!fn || !fnKey) throw new Error("Not supported");

	const memoizeKey = `$memoize$${key}`;

	descriptor[fnKey] = function(...args: any[]) {
		if (!this.hasOwnProperty(memoizeKey)) {
			Object.defineProperty(this, memoizeKey, {
				configurable: false,
				enumerable: false,
				writable: false,
				value: fn!.apply(this, args)
			});
		}

		return this[memoizeKey];
	};
}
