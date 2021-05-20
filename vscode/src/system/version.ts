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

export namespace Versions {
	export interface Version {
		major: number;
		minor: number;
		patch: number;
		pre?: string;
	}

	export function compare(v1: string | Version, v2: string | Version): number {
		if (typeof v1 === "string") {
			v1 = fromString(v1);
		}
		if (typeof v2 === "string") {
			v2 = fromString(v2);
		}

		if (v1.major > v2.major) return 1;
		if (v1.major < v2.major) return -1;

		if (v1.minor > v2.minor) return 1;
		if (v1.minor < v2.minor) return -1;

		if (v1.patch > v2.patch) return 1;
		if (v1.patch < v2.patch) return -1;

		if (v1.pre === undefined && v2.pre !== undefined) return 1;
		if (v1.pre !== undefined && v2.pre === undefined) return -1;

		if (v1.pre !== undefined && v2.pre !== undefined) return v1.pre.localeCompare(v2.pre);

		return 0;
	}

	export function from(
		major: string | number,
		minor: string | number,
		patch?: string | number,
		pre?: string
	): Version {
		return {
			major: typeof major === "string" ? parseInt(major, 10) : major,
			minor: typeof minor === "string" ? parseInt(minor, 10) : minor,
			patch: patch == null ? 0 : typeof patch === "string" ? parseInt(patch, 10) : patch,
			pre: pre
		};
	}

	export function fromString(version: string): Version {
		const [ver, pre] = version.split("-");
		const [major, minor, patch] = ver.split(".");
		return from(major, minor, patch, pre);
	}
}
