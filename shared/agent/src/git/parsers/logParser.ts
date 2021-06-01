"use strict";

/**
Portions adapted from https://github.com/eamodio/vscode-gitlens/blob/d9ee25158b1fa9941ed5044289108e3f38aab9c0/src/git/parsers/logParser.ts which carries this notice:

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
import { debug, Strings } from "../../system";
import { GitCommit } from "../models/commit";

const emptyEntry: LogEntry = {};
const emptyStr = "";

// Using %x00 codes because some shells seem to try to expand things if not
const lb = "%x3c"; // `%x${'<'.charCodeAt(0).toString(16)}`;
const rb = "%x3e"; // `%x${'>'.charCodeAt(0).toString(16)}`;
const sl = "%x2f"; // `%x${'/'.charCodeAt(0).toString(16)}`;
const sp = "%x20"; // `%x${' '.charCodeAt(0).toString(16)}`;

interface LogEntry {
	ref?: string;
	author?: string;
	email?: string;
	authorDate?: string;
	committedDate?: string;
	summary?: string;
}

export class GitLogParser {
	static defaultFormat = [
		`${lb}${sl}f${rb}`,
		`${lb}r${rb}${sp}%H`, // ref
		`${lb}a${rb}${sp}%aN`, // author
		`${lb}e${rb}${sp}%aE`, // email
		`${lb}d${rb}${sp}%at`, // date
		`${lb}c${rb}${sp}%ct`, // committed date
		`${lb}s${rb}`,
		"%B", // summary
		`${lb}${sl}s${rb}`
	].join("%n");

	static simpleFormat = `${lb}r${rb}${sp}%H`;

	@debug({ args: false })
	static parse(
		data: string,
		repoPath: string | undefined
		// currentUser: { name?: string; email?: string } | undefined
	): Map<string, GitCommit> | undefined {
		if (!data) return undefined;

		let entry: LogEntry = emptyEntry;
		let line: string | undefined = undefined;
		let token: number;

		const lines = Strings.lines(`${data}</f>`);
		// Skip the first line since it will always be </f>
		let next = lines.next();
		if (next.done) return undefined;

		if (repoPath !== undefined) {
			repoPath = Strings.normalizePath(repoPath);
		}

		const commits: Map<string, GitCommit> = new Map();

		while (true) {
			next = lines.next();
			if (next.done) break;

			line = next.value;

			// <1-char token> data
			// e.g. <r> bd1452a2dc
			token = line.charCodeAt(1);

			switch (token) {
				case 114: // 'r': // ref
					entry = {
						ref: line.substring(4)
					};
					break;

				case 97: // 'a': // author
					entry.author = line.substring(4);
					break;

				case 101: // 'e': // author-mail
					entry.email = line.substring(4);
					break;

				case 100: // 'd': // author-date
					entry.authorDate = line.substring(4);
					break;

				case 99: // 'c': // committer-date
					entry.committedDate = line.substring(4);
					break;

				case 115: // 's': // summary
					while (true) {
						next = lines.next();
						if (next.done) break;

						line = next.value;
						if (line === "</s>") break;

						if (entry.summary === undefined) {
							entry.summary = line;
						} else {
							entry.summary += `\n${line}`;
						}
					}

					// Remove the trailing newline
					if (entry.summary != null && entry.summary.charCodeAt(entry.summary.length - 1) === 10) {
						entry.summary = entry.summary.slice(0, -1);
					}

					// if (entry.author !== undefined) {
					// 	if (
					// 		currentUser !== undefined &&
					// 		// Name or e-mail is configured
					// 		(currentUser.name !== undefined || currentUser.email !== undefined) &&
					// 		// Match on name if configured
					// 		(currentUser.name === undefined || currentUser.name === entry.author) &&
					// 		// Match on email if configured
					// 		(currentUser.email === undefined || currentUser.email === entry.email)
					// 	) {
					// 		entry.author = "You";
					// 	}
					// }

					commits.set(
						entry.ref!,
						new GitCommit(
							repoPath!,
							entry.ref!,
							entry.author!,
							entry.email,
							new Date((entry.authorDate! as any) * 1000),
							new Date((entry.committedDate! as any) * 1000),
							entry.summary === undefined ? emptyStr : entry.summary
						)
					);

					break;
			}
		}

		return commits;
	}
}
