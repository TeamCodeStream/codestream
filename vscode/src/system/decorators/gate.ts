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
import { Functions } from "./../function";

export function gate() {
	return (target: any, key: string, descriptor: PropertyDescriptor) => {
		if (!(typeof descriptor.value === "function")) throw new Error("not supported");

		const gateKey = `$gate$${key}`;
		const fn = descriptor.value;

		descriptor.value = function(this: any, ...args: any[]) {
			if (!this.hasOwnProperty(gateKey)) {
				Object.defineProperty(this, gateKey, {
					configurable: false,
					enumerable: false,
					writable: true,
					value: undefined
				});
			}

			let promise = this[gateKey];
			if (promise === undefined) {
				let result;
				try {
					result = fn!.apply(this, args);
					if (result == null || !Functions.isPromise(result)) {
						return result;
					}
					this[gateKey] = promise = result
						.then((r: any) => {
							this[gateKey] = undefined;
							return r;
						})
						.catch((ex: any) => {
							this[gateKey] = undefined;
							throw ex;
						});
				} catch (ex) {
					this[gateKey] = undefined;
					throw ex;
				}
			}

			return promise;
		};
	};
}
