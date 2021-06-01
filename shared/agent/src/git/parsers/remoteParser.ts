"use strict";
/**
Portions adapted from https://github.com/eamodio/vscode-gitlens/blob/12a93fe5f609f0bb154dca1a8d09ac3e980b9b3b/src/git/parsers/remoteParser.ts which carries this notice:

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
import { GitRemote, GitRemoteType } from "../models/remote";
import * as childProcess from "child_process";
import { Logger } from "../../logger";

const emptyStr = "";

const remoteRegex = /^(.*)\t(.*)\s\((.*)\)$/gm;
const urlRegex = /^(?:(git:\/\/)(.*?)(?::.*?)?\/|(https?:\/\/)(?:.*?@)?(.*?)(?::.*?)?\/|git@(.*):|(ssh:\/\/)(?:.*@)?(.*?)(?::.*?)?(?:\/|(?=~))|(?:.*?@)(.*?):)(.*)$/;
const hostnameRegex = new RegExp("hostname (.*)");
export class GitRemoteParser {
	static async parse(data: string, repoPath: string): Promise<GitRemote[]> {
		if (!data) return [];

		const remotes: GitRemote[] = [];
		const groups = Object.create(null);

		let url: string;
		let scheme: string;
		let domain: string;
		let path: string;
		let uniqueness: string;
		let remote: GitRemote | undefined;
		let match: RegExpExecArray | null = null;
		do {
			match = remoteRegex.exec(data);
			if (match == null) break;

			// Stops excessive memory usage -- https://bugs.chromium.org/p/v8/issues/detail?id=2869
			url = ` ${match[2]}`.substr(1);

			[scheme, domain, path] = await this.parseGitUrl(url);

			uniqueness = `${domain}/${path}`;
			remote = groups[uniqueness];
			if (remote === undefined) {
				remote = new GitRemote(
					repoPath,
					// Stops excessive memory usage -- https://bugs.chromium.org/p/v8/issues/detail?id=2869
					` ${match[1]}`.substr(1),
					url,
					scheme,
					domain,
					path,
					// Stops excessive memory usage -- https://bugs.chromium.org/p/v8/issues/detail?id=2869
					[{ url: url, type: ` ${match[3]}`.substr(1) as GitRemoteType }]
				);
				remotes.push(remote);
				groups[uniqueness] = remote;
			} else {
				// Stops excessive memory usage -- https://bugs.chromium.org/p/v8/issues/detail?id=2869
				remote.types.push({ url: url, type: ` ${match[3]}`.substr(1) as GitRemoteType });
			}
		} while (match != null);

		if (!remotes.length) return [];

		return remotes;
	}

	private static getHostFromMatch(match: RegExpExecArray) {
		return match[2] || match[4] || match[5] || match[7] || match[8];
	}

	private static matchToTuple(
		match: RegExpExecArray,
		host?: string | undefined
	): [string, string, string] {
		return [
			match[1] || match[3] || match[6],
			host || GitRemoteParser.getHostFromMatch(match),
			// remove any starting slashes for odd remotes that look like
			// git@github.com:/TeamCodeStream/codestream.git
			match[9].replace(/^\/+/g, emptyStr).replace(/\.git\/?$/, emptyStr)
		];
	}

	static async parseGitUrl(url: string): Promise<[string, string, string]> {
		let match = urlRegex.exec(url);
		if (match == null && url && url.indexOf(":") > -1 && url.indexOf("@") === -1) {
			// couldn't find a match so this could be a completely aliased remote like
			// `foo:TeamCodeStream/codestream.git` (without a scheme/prefix)
			url = `git@${url}`;
			match = urlRegex.exec(url);
		}
		if (match == null) return [emptyStr, emptyStr, emptyStr];

		// if this isn't ssh, just return normal, if it is, use the ssh alias finder below
		if (url.indexOf("git@") === -1) return GitRemoteParser.matchToTuple(match);

		const host = GitRemoteParser.getHostFromMatch(match);
		return new Promise(resolve => {
			try {
				// if this is an ssh setup, it's possible that a user has an alias setup.
				// we can get the alias for this by running the `ssh -G <remoteAlias>`` command
				// and parsing to get the `hostname` value
				// if, for some reason this fails, fall back to doing the old (current) logic

				// use -T to prevent `Pseudo-terminal will not be allocated because stdin is not a terminal`
				childProcess.execFile("ssh", ["-T", "-G", host], function(
					err: any,
					stdout: any,
					stderr: any
				) {
					try {
						if (!stdout) {
							Logger.warn(`remoteParser: parseGitUrl err=${err} stderr=${stderr}`);
							resolve(GitRemoteParser.matchToTuple(match!));
						} else {
							const hostnameMatch = hostnameRegex.exec(stdout);
							// passing undefined into the child process will result in "undefined" as a string for the hostname
							if (hostnameMatch && hostnameMatch[1] && hostnameMatch[1] !== "undefined") {
								resolve(GitRemoteParser.matchToTuple(match!, hostnameMatch[1]));
							} else {
								resolve(GitRemoteParser.matchToTuple(match!));
							}
						}
					} catch (ex) {
						Logger.warn(`remoteParser: parseGitUrl ex=${ex}`);
						resolve(GitRemoteParser.matchToTuple(match!));
					}
				});
			} catch (ex) {
				Logger.warn(`remoteParser: parseGitUrl execFile ex=${ex}`);
				resolve(GitRemoteParser.matchToTuple(match!));
			}
		});
	}
}
