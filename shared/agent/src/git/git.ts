"use strict";
/**
Portions adapted from https://github.com/eamodio/vscode-gitlens/blob/12a93fe5f609f0bb154dca1a8d09ac3e980b9b3b/src/git/git.ts which carries this notice:

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
import { Logger } from "../logger";
import { Strings } from "../system";
import { findGitPath, GitLocation } from "./locator";
import { CommandOptions, runCommand } from "./shell";

export const GitErrors = {
	badRevision: /bad revision \'.*?\'/i
};

export const GitWarnings = {
	notARepository: /Not a git repository/,
	outsideRepository: /is outside repository/,
	noPath: /no such path/,
	noCommits: /does not have any commits/,
	notFound: /Path \'.*?\' does not exist in/,
	foundButNotInRevision: /Path \'.*?\' exists on disk, but not in/,
	headNotABranch: /HEAD does not point to a branch/,
	noUpstream: /no upstream configured for branch \'(.*?)\'/,
	upstreamNotARepo: /'upstream' does not appear to be a git repository/,
	unknownRevision: /ambiguous argument \'.*?\': unknown revision or path not in the working tree/
};

export const SupressedGitWarnings = [GitWarnings.noUpstream, GitWarnings.upstreamNotARepo];
// A map of running git commands -- avoids running duplicate overlaping commands
const pendingCommands: Map<string, Promise<string>> = new Map();

export async function git(
	options: CommandOptions & { readonly correlationKey?: string },
	...args: any[]
): Promise<string> {
	const start = process.hrtime();

	const { correlationKey, ...opts } = options;

	const encoding = options.encoding || "utf8";
	const runOpts = {
		...opts,
		encoding: encoding === "utf8" ? "utf8" : "binary",
		// Adds GCM environment variables to avoid any possible credential issues -- from https://github.com/Microsoft/vscode/issues/26573#issuecomment-338686581
		// Shouldn't *really* be needed but better safe than sorry
		env: {
			...process.env,
			...options.env,
			GCM_INTERACTIVE: "NEVER",
			GCM_PRESERVE_CREDS: "TRUE",
			LC_ALL: "C"
		}
	} as CommandOptions;

	const gitCommand = `git ${args.join(" ")}`;

	const command = `(${runOpts.cwd}${
		correlationKey !== undefined ? correlationKey : ""
	}): ${gitCommand}`;

	let promise = pendingCommands.get(command);
	if (promise === undefined) {
		Logger.log(`GIT: Running${command}`);
		// Fixes https://github.com/eamodio/vscode-gitlens/issues/73 & https://github.com/eamodio/vscode-gitlens/issues/161
		args.splice(0, 0, "-c", "core.quotepath=false", "-c", "color.ui=false");
		if (isWslGit()) {
			args.unshift("-d", wslDistro(), "git");
		}

		promise = runCommand(gitPath(), args, runOpts);

		pendingCommands.set(command, promise);
	} else {
		Logger.log(`GIT: Awaiting${command}`);
	}

	let data: string;
	try {
		data = await promise;
	} catch (ex) {
		if (options.throwRawExceptions) throw ex;

		const msg = ex && ex.toString();
		if (msg) {
			for (const warning of Object.values(GitWarnings)) {
				if (warning.test(msg)) {
					if (!SupressedGitWarnings.includes(warning)) {
						Logger.warn(
							"git",
							...args,
							`  cwd='${options.cwd}'\n\n  `,
							msg.replace(/\r?\n|\r/g, " ")
						);
					}
					return "";
				}
			}
		}

		Logger.error(ex, "git", ...args, `  cwd='${options.cwd}'\n\n  `);
		throw ex;
	} finally {
		pendingCommands.delete(command);

		const completedIn = `in ${Strings.getDurationMilliseconds(start)} ms`;

		Logger.log(`GIT: Completed${command} ${completedIn}`);
		// Logger.logGitCommand(`${gitCommand} ${completedIn}`, runOpts.cwd!);
	}

	if (encoding === "utf8" || encoding === "binary") return data;

	// return iconv.decode(Buffer.from(data, 'binary'), encoding);
	return data;
}

let _gitPath = "git";
function gitPath(): string {
	return _gitPath;
}

let _isWsl = false;
export function isWslGit(): boolean {
	return _isWsl;
}

let _wslDistro: string | undefined;
function wslDistro(): string | undefined {
	return _wslDistro;
}

export async function setGitPath(path: string): Promise<void> {
	try {
		const gitInfo = await setOrFindGitPath(path);
		_gitPath = gitInfo.path;
		_isWsl = gitInfo.isWsl;
		_wslDistro = gitInfo.wslDistro;
	} catch (ex) {
		Logger.error(ex);
	}
}

async function setOrFindGitPath(gitPath?: string): Promise<GitLocation> {
	const start = process.hrtime();
	const gitInfo = await findGitPath(gitPath);

	if (gitInfo.isWsl) {
		Logger.log(
			`Git found: ${gitInfo.path} git \u2022 ${Strings.getDurationMilliseconds(start)} ms`
		);
	} else {
		Logger.log(
			`Git found: ${gitInfo.version} @ ${
				gitInfo.path === "git" ? "PATH" : gitInfo.path
			} \u2022 ${Strings.getDurationMilliseconds(start)} ms`
		);
	}

	return gitInfo;
}
