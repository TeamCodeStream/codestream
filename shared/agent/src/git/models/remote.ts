import { URI } from "vscode-uri";

/**
Portions adapted from https://github.com/eamodio/vscode-gitlens/blob/12a93fe5f609f0bb154dca1a8d09ac3e980b9b3b/src/git/models/remote.ts which carries this notice:

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
"use strict";

export enum GitRemoteType {
	Fetch = "fetch",
	Push = "push"
}

export class GitRemote implements GitRemoteLike {
	readonly uri: URI;

	constructor(
		public readonly repoPath: string,
		public readonly name: string,
		url: string,
		public readonly scheme: string,
		public readonly domain: string,
		public readonly path: string,
		public readonly types: { type: GitRemoteType; url: string }[]
	) {
		this.uri = URI.parse(scheme ? url : `ssh://${url}`);
	}

	/**
	 * Certain remote names are more important, and have more "weight" than others.
	 * This includes "origin" and "upstream". We prioritize these by assigning them a lower
	 * number. When sorting, these lower or negative numbers will naturally sort first
	 *
	 * @readonly
	 * @memberof GitRemote
	 */
	get remoteWeight() {
		const name = this.name.toLowerCase();
		return name === "upstream" ? -100 : name === "origin" ? 0 : 100;
	}

	/**
	 * Certain remote names are more important, and have more "weight" than others.
	 * This includes "origin" and "upstream". We prioritize these by assigning them a lower
	 * number. When sorting, these lower or negative numbers will naturally sort first
	 *
	 * @readonly
	 * @memberof GitRemote
	 */
	remoteWeightByStrategy(strategy: "prioritizeOrigin" | "prioritizeUpstream" = "prioritizeOrigin") {
		const name = this.name.toLowerCase();
		if (name === "upstream") {
			return strategy === "prioritizeUpstream" ? -100 : 0;
		}
		if (name === "origin") {
			return strategy === "prioritizeOrigin" ? -100 : 0;
		}
		return 100;
	}

	get normalizedUrl(): string {
		return `${this.domain}/${this.path}`.toLocaleLowerCase();
	}

	/**
	 * Returns a protocol relative URL (//) for browser use.
	 * see: https://en.wikipedia.org/wiki/URL#prurl
	 *
	 * @readonly
	 * @type {string}
	 * @memberof GitRemote
	 */
	get webUrl(): string {
		return `//${this.domain}/${this.path}`;
	}
}

export interface GitRemoteLike {
	domain: string;
	uri: URI;
}
