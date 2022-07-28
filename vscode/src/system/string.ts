"use strict";
/**
Portions adapted from https://github.com/eamodio/vscode-gitlens/blob/88e0a1b45a9b6f53b6865798e745037207f8c2da/src/system/string.ts which carries this notice:

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
import { createHash, HexBase64Latin1Encoding } from "crypto";
import * as path from "path";
import { CSReviewCheckpoint } from "@codestream/protocols/api";
import { Uri } from "vscode";

export namespace Strings {
	export const enum CharCode {
		/**
		 * The `/` character.
		 */
		Slash = 47,
		/**
		 * The `\` character.
		 */
		Backslash = 92
	}

	export function getDurationMilliseconds(start: [number, number]) {
		const [secs, nanosecs] = process.hrtime(start);
		return secs * 1000 + Math.floor(nanosecs / 1000000);
	}

	const pathNormalizeRegex = /\\/g;
	const pathStripTrailingSlashRegex = /\/$/g;
	const TokenRegex = /\$\{(\W*)?([^|]*?)(?:\|(\d+)(\-|\?)?)?(\W*)?\}/g;
	const TokenSanitizeRegex = /\$\{(?:\W*)?(\w*?)(?:[\W\d]*)\}/g;

	export interface ITokenOptions {
		collapseWhitespace: boolean;
		padDirection: "left" | "right";
		prefix: string | undefined;
		suffix: string | undefined;
		truncateTo: number | undefined;
	}

	export function getTokensFromTemplate(template: string) {
		const tokens: { key: string; options: ITokenOptions }[] = [];

		let match = TokenRegex.exec(template);
		while (match != null) {
			const [, prefix, key, truncateTo, option, suffix] = match;
			tokens.push({
				key: key,
				options: {
					collapseWhitespace: option === "?",
					padDirection: option === "-" ? "left" : "right",
					prefix: prefix,
					suffix: suffix,
					truncateTo: truncateTo == null ? undefined : parseInt(truncateTo, 10)
				}
			});
			match = TokenRegex.exec(template);
		}

		return tokens;
	}

	export function interpolate(template: string, context: object | undefined): string {
		if (!template) return template;
		if (context === undefined) return template.replace(TokenSanitizeRegex, "");

		template = template.replace(TokenSanitizeRegex, "$${this.$1}");
		return new Function(`return \`${template}\`;`).call(context);
	}

	export function* lines(s: string): IterableIterator<string> {
		let i = 0;
		while (i < s.length) {
			let j = s.indexOf("\n", i);
			if (j === -1) {
				j = s.length;
			}

			yield s.substring(i, j);
			i = j + 1;
		}
	}

	export function md5(s: string, encoding: HexBase64Latin1Encoding = "base64"): string {
		return createHash("md5")
			.update(s)
			.digest(encoding);
	}

	export function toGravatar(
		email: string,
		size: number = 50,
		fallbackOption:
			| "404"
			| "mp"
			| "identicon"
			| "monsterid"
			| "wavatar"
			| "retro"
			| "robohash"
			| "blank" = "identicon"
	): string {
		return `https://www.gravatar.com/avatar/${md5(
			(email || "").trim().toLowerCase(),
			"hex"
		)}?r=g&s=${size}&d=${fallbackOption}`;
	}

	export function normalizePath(
		fileName: string,
		options: { addLeadingSlash?: boolean; stripTrailingSlash?: boolean } = {
			stripTrailingSlash: true
		}
	) {
		if (fileName == null || fileName.length === 0) return fileName;

		let normalized = fileName.replace(pathNormalizeRegex, "/");

		const { addLeadingSlash, stripTrailingSlash } = { stripTrailingSlash: true, ...options };

		if (stripTrailingSlash) {
			normalized = normalized.replace(pathStripTrailingSlashRegex, "");
		}

		if (addLeadingSlash && normalized.charCodeAt(0) !== CharCode.Slash) {
			normalized = `/${normalized}`;
		}

		return normalized;
	}
	export function pad(
		s: string,
		before: number = 0,
		after: number = 0,
		padding: string = "\u00a0"
	) {
		if (before === 0 && after === 0) return s;

		return `${before === 0 ? "" : padding.repeat(before)}${s}${
			after === 0 ? "" : padding.repeat(after)
		}`;
	}

	export function padLeft(s: string, padTo: number, padding: string = "\u00a0", width?: number) {
		const diff = padTo - (width || getWidth(s));
		return diff <= 0 ? s : padding.repeat(diff) + s;
	}

	export function padLeftOrTruncate(s: string, max: number, padding?: string, width?: number) {
		width = width || getWidth(s);
		if (width < max) return padLeft(s, max, padding, width);
		if (width > max) return truncate(s, max, undefined, width);
		return s;
	}

	export function padRight(s: string, padTo: number, padding: string = "\u00a0", width?: number) {
		const diff = padTo - (width || getWidth(s));
		return diff <= 0 ? s : s + padding.repeat(diff);
	}

	export function padOrTruncate(s: string, max: number, padding?: string, width?: number) {
		const left = max < 0;
		max = Math.abs(max);

		width = width || getWidth(s);
		if (width < max) {
			return left ? padLeft(s, max, padding, width) : padRight(s, max, padding, width);
		}
		if (width > max) return truncate(s, max, undefined, width);
		return s;
	}

	export function padRightOrTruncate(s: string, max: number, padding?: string, width?: number) {
		width = width || getWidth(s);
		if (width < max) return padRight(s, max, padding, width);
		if (width > max) return truncate(s, max);
		return s;
	}

	export function pluralize(
		s: string,
		count: number,
		options?: { number?: string; plural?: string; suffix?: string; zero?: string }
	) {
		if (options === undefined) return `${count} ${s}${count === 1 ? "" : "s"}`;

		return `${count === 0 ? options.zero || count : options.number || count} ${
			count === 1 ? s : options.plural || `${s}${options.suffix || "s"}`
		}`;
	}

	// Removes \ / : * ? " < > | and C0 and C1 control codes
	const illegalCharsForFSRegEx = /[\\/:*?"<>|\x00-\x1f\x80-\x9f]/g;

	export function sanitizeForFileSystem(s: string, replacement: string = "_") {
		if (!s) return s;
		return s.replace(illegalCharsForFSRegEx, replacement);
	}

	export function sha1(s: string, encoding: HexBase64Latin1Encoding = "base64"): string {
		return createHash("sha1")
			.update(s)
			.digest(encoding);
	}

	export function splitPath(filename: string): [string, string] {
		const dir = path.dirname(filename);
		return [dir, path.relative(dir, filename)];
	}

	export function toTitleCase(s: string): string {
		if (!s) return s;

		return s.charAt(0).toUpperCase() + s.slice(1);
	}

	export function truncate(
		s: string,
		truncateTo: number,
		ellipsis: string = "\u2026",
		width?: number
	) {
		if (!s) return s;

		width = width || getWidth(s);
		if (width <= truncateTo) return s;
		if (width === s.length) return `${s.substring(0, truncateTo - 1)}${ellipsis}`;

		// Skip ahead to start as far as we can by assuming all the double-width characters won't be truncated
		let chars = Math.floor(truncateTo / (width / s.length));
		let count = getWidth(s.substring(0, chars));
		while (count < truncateTo) {
			count += getWidth(s[chars++]);
		}

		if (count >= truncateTo) {
			chars--;
		}

		return `${s.substring(0, chars)}${ellipsis}`;
	}

	const ansiRegex = /[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[a-zA-Z\\d]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))/g;
	const containsNonAsciiRegex = /[^\x20-\x7F\u00a0\u2026]/;

	export function getWidth(s: string): number {
		if (s == null || s.length === 0) return 0;

		// Shortcut to avoid needless string `RegExp`s, replacements, and allocations
		if (!containsNonAsciiRegex.test(s)) return s.length;

		s = s.replace(ansiRegex, "");

		let count = 0;
		let emoji = 0;
		let joiners = 0;

		const graphemes = [...s];
		for (let i = 0; i < graphemes.length; i++) {
			const code = graphemes[i].codePointAt(0)!;

			// Ignore control characters
			if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) continue;

			// Ignore combining characters
			if (code >= 0x300 && code <= 0x36f) continue;

			// https://stackoverflow.com/questions/30757193/find-out-if-character-in-string-is-emoji
			if (
				(code >= 0x1f600 && code <= 0x1f64f) || // Emoticons
				(code >= 0x1f300 && code <= 0x1f5ff) || // Misc Symbols and Pictographs
				(code >= 0x1f680 && code <= 0x1f6ff) || // Transport and Map
				(code >= 0x2600 && code <= 0x26ff) || // Misc symbols
				(code >= 0x2700 && code <= 0x27bf) || // Dingbats
				(code >= 0xfe00 && code <= 0xfe0f) || // Variation Selectors
				(code >= 0x1f900 && code <= 0x1f9ff) || // Supplemental Symbols and Pictographs
				(code >= 65024 && code <= 65039) || // Variation selector
				(code >= 8400 && code <= 8447) // Combining Diacritical Marks for Symbols
			) {
				if (code >= 0x1f3fb && code <= 0x1f3ff) continue; // emoji modifier fitzpatrick type

				emoji++;
				count += 2;
				continue;
			}

			// Ignore zero-width joiners '\u200d'
			if (code === 8205) {
				joiners++;
				count -= 2;
				continue;
			}

			// Surrogates
			if (code > 0xffff) {
				i++;
			}

			count += isFullwidthCodePoint(code) ? 2 : 1;
		}

		const offset = emoji - joiners;
		if (offset > 1) {
			count += offset - 1;
		}
		return count;
	}

	function isFullwidthCodePoint(cp: number) {
		// code points are derived from:
		// http://www.unix.org/Public/UNIDATA/EastAsianWidth.txt
		if (
			cp >= 0x1100 &&
			(cp <= 0x115f || // Hangul Jamo
			cp === 0x2329 || // LEFT-POINTING ANGLE BRACKET
			cp === 0x232a || // RIGHT-POINTING ANGLE BRACKET
				// CJK Radicals Supplement .. Enclosed CJK Letters and Months
				(0x2e80 <= cp && cp <= 0x3247 && cp !== 0x303f) ||
				// Enclosed CJK Letters and Months .. CJK Unified Ideographs Extension A
				(0x3250 <= cp && cp <= 0x4dbf) ||
				// CJK Unified Ideographs .. Yi Radicals
				(0x4e00 <= cp && cp <= 0xa4c6) ||
				// Hangul Jamo Extended-A
				(0xa960 <= cp && cp <= 0xa97c) ||
				// Hangul Syllables
				(0xac00 <= cp && cp <= 0xd7a3) ||
				// CJK Compatibility Ideographs
				(0xf900 <= cp && cp <= 0xfaff) ||
				// Vertical Forms
				(0xfe10 <= cp && cp <= 0xfe19) ||
				// CJK Compatibility Forms .. Small Form Variants
				(0xfe30 <= cp && cp <= 0xfe6b) ||
				// Halfwidth and Fullwidth Forms
				(0xff01 <= cp && cp <= 0xff60) ||
				(0xffe0 <= cp && cp <= 0xffe6) ||
				// Kana Supplement
				(0x1b000 <= cp && cp <= 0x1b001) ||
				// Enclosed Ideographic Supplement
				(0x1f200 <= cp && cp <= 0x1f251) ||
				// CJK Unified Ideographs Extension B .. Tertiary Ideographic Plane
				(0x20000 <= cp && cp <= 0x3fffd))
		) {
			return true;
		}

		return false;
	}

	const csReviewDiffUrlRegex = /codestream-diff:\/\/(\w+)\/(\w+)\/(\w+)\/(\w+)\/(.+)/;
	export function parseCSReviewDiffUrl(
		uri: string
	):
		| {
				reviewId: string;
				checkpoint: CSReviewCheckpoint;
				repoId: string;
				version: string;
				path: string;
		  }
		| undefined {
		const match = csReviewDiffUrlRegex.exec(uri.toString());
		if (match == null) return undefined;

		const [, reviewId, checkpoint, repoId, version, path] = match;
		return {
			reviewId,
			checkpoint: checkpoint === "undefined" ? undefined : parseInt(checkpoint, 10),
			repoId,
			version,
			path
		};
	}

	export function parseGitUrl(uri: Uri): { path: string; sha: string } {
		const params = JSON.parse(uri.query);
		const { sha } = params;
		if (!sha) {
			throw new Error(`Git URI ${uri} does not contain a sha property in the query`);
		}

		return {
			path: uri.fsPath,
			sha
		};
	}
}
