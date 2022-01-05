"use strict";
/**
Portions adapted from https://github.com/eamodio/vscode-gitlens/blob/12a93fe5f609f0bb154dca1a8d09ac3e980b9b3b/src/git/gitService.ts which carries this notice:

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

import { createPatch, ParsedDiff, parsePatch } from "diff";
import * as fs from "fs";
import { memoize } from "lodash-es";
import * as path from "path";
import { SessionContainer } from "../container";
import { CommitsChangedData, WorkspaceChangedData } from "../protocol/agent.protocol";
import { Disposable, Event, Range } from "vscode-languageserver";
import { URI } from "vscode-uri";
import { Logger } from "../logger";
import { FileStatus } from "../protocol/api.protocol.models";
import { CodeStreamSession } from "../session";
import { Iterables, log, Strings } from "../system";
import { xfs } from "../xfs";
import { git, GitErrors, GitWarnings } from "./git";
import { GitServiceLite } from "./gitServiceLite";
import { GitAuthor, GitCommit, GitNumStat, GitRemote, GitRepository } from "./models/models";
import { GitAuthorParser } from "./parsers/authorParser";
import { GitBlameRevisionParser, RevisionEntry } from "./parsers/blameRevisionParser";
import { GitBranchParser } from "./parsers/branchParser";
import { GitLogParser } from "./parsers/logParser";
import { GitPatchParser, ParsedDiffPatch } from "./parsers/patchParser";
import { GitRemoteParser } from "./parsers/remoteParser";
import { GitRepositories } from "./repositories";
import { RepositoryLocator } from "./repositoryLocator";

export * from "./models/models";

export interface BlameOptions {
	ref?: string;
	contents?: string;
	startLine?: number;
	endLine?: number;
	retryWithTrimmedEndOnFailure?: boolean;
}

export interface TrackingBranch {
	fullName?: string;
	shortName?: string;
}

export const EMPTY_TREE_SHA = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
const FORMAT_SEPARATOR = "--0--";

export interface IGitService extends Disposable {
	getFileAuthors(uri: URI, options?: BlameOptions): Promise<GitAuthor[]>;
	getFileAuthors(path: string, options?: BlameOptions): Promise<GitAuthor[]>;
	// getFileAuthors(uriOrPath: Uri | string, options?: { ref?: string, contents?: string, startLine?: number, endLine?: number }): Promise<GitAuthor[]>;

	getFileCurrentRevision(uri: URI): Promise<string | undefined>;
	getFileCurrentRevision(path: string): Promise<string | undefined>;
	// getFileCurrentSha(uriOrPath: Uri | string): Promise<string | undefined>;

	getFileContentForRevision(uri: URI, ref: string): Promise<string | undefined>;
	getFileContentForRevision(path: string, ref: string): Promise<string | undefined>;
	// getFileRevisionContent(uriOrPath: Uri | string, ref: string): Promise<string | undefined>;

	getRepoFirstCommits(repoUri: URI): Promise<string[]>;
	getRepoFirstCommits(repoPath: string): Promise<string[]>;
	// getRepoFirstCommits(repoUriOrPath: Uri | string): Promise<string[]>;

	getRepoCommitHistory(repoUri: URI): Promise<string[]>;
	getRepoCommitHistory(repoPath: string): Promise<string[]>;
	// getRepoCommitHistory(repoUriOrPath: URI | string): Promise<string[]> {

	getRepoBranchForkCommits(repoUri: URI): Promise<string[]>;
	getRepoBranchForkCommits(repoPath: string): Promise<string[]>;
	// getRepoBranchForkCommits(repoUriOrPath: Uri | string): Promise<string[]>;

	getRepoHeadRevision(repoUri: URI): Promise<string | undefined>;
	getRepoHeadRevision(repoPath: string): Promise<string | undefined>;

	getRepoRemote(repoUri: URI): Promise<GitRemote | undefined>;
	getRepoRemote(repoPath: string): Promise<GitRemote | undefined>;
	// getRepoRemote(repoUriOrPath: Uri | string): Promise<GitRemote | undefined>;

	getRepoRoot(uri: URI): Promise<string | undefined>;
	getRepoRoot(path: string): Promise<string | undefined>;

	getRepositories(): Promise<Iterable<GitRepository>>;
	getRepositoryById(id: string): Promise<GitRepository | undefined>;
	getRepositoryByFilePath(filePath: string): Promise<GitRepository | undefined>;

	isValidReference(repoUri: URI, ref: string): Promise<boolean>;
	isValidReference(repoPath: string, ref: string): Promise<boolean>;

	getCommittersForRepo(repoPath: string, since: number): Promise<{ [email: string]: string }>;
	getLastCommittersForRepo(
		repoPath: string,
		since: number
	): Promise<{ email: string; name: string }[]>;
}

export class GitService implements IGitService, Disposable {
	private _disposable: Disposable | undefined;
	private readonly _memoizedGetDefaultBranch: (
		repoPath: string,
		remote: string
	) => Promise<string | undefined>;
	private readonly _memoizedGetRepoRemotes: (repoPath: string) => Promise<GitRemote[]>;

	private readonly _repositories: GitRepositories;

	constructor(
		public readonly session: CodeStreamSession,
		readonly repoLocator: RepositoryLocator,
		private readonly _gitServiceLite: GitServiceLite
	) {
		this._memoizedGetDefaultBranch = memoize(
			this._getDefaultBranch,
			(repoPath, remote) => `${repoPath}|${remote}`
		);
		this._memoizedGetRepoRemotes = memoize(this._getRepoRemotes);
		this._repositories = new GitRepositories(session, repoLocator);
	}

	dispose() {
		this._disposable && this._disposable.dispose();
	}

	ensureSearchComplete() {
		return this._repositories.ensureSearchComplete();
	}

	get onRepositoryCommitHashChanged(): Event<GitRepository> {
		return this._repositories.onCommitHashChanged;
	}

	/**
	 * Fires anytime there's a change to the underlying git repository
	 */
	get onRepositoryChanged(): Event<CommitsChangedData> {
		return this._repositories.onGitChanged;
	}

	/**
	 * Fires when a workspace has changed (folders added or removed, though not on first initialization)
	 */
	get onGitWorkspaceChanged(): Event<WorkspaceChangedData> {
		return this._repositories.onWorkspaceDidChange;
	}

	async getFileAuthors(uri: URI, options?: BlameOptions): Promise<GitAuthor[]>;
	async getFileAuthors(path: string, options?: BlameOptions): Promise<GitAuthor[]>;
	async getFileAuthors(uriOrPath: URI | string, options: BlameOptions): Promise<GitAuthor[]> {
		try {
			const data = await this.getRawBlame(uriOrPath, options);
			return GitAuthorParser.parse(data);
		} catch (error) {
			if (options.retryWithTrimmedEndOnFailure && this._isRangeOutOfBoundsError(error.message)) {
				const actualLength = this._getFileLengthFromOutOfBoundsError(error.message);
				if (actualLength === 0) return [];
				if (actualLength !== undefined) {
					const maxLine = actualLength - 1;
					return this.getFileAuthors(uriOrPath as any, {
						...options,
						startLine: options.startLine && Math.min(options.startLine, maxLine),
						endLine: maxLine,
						retryWithTrimmedEndOnFailure: false
					});
				}
			}
			throw error;
		}
	}

	async getBlameRevisions(uri: URI, options?: BlameOptions): Promise<RevisionEntry[]>;
	async getBlameRevisions(path: string, options?: BlameOptions): Promise<RevisionEntry[]>;
	async getBlameRevisions(
		uriOrPath: URI | string,
		options: BlameOptions = {}
	): Promise<RevisionEntry[]> {
		try {
			const data = await this.getRawBlame(uriOrPath, options);
			return GitBlameRevisionParser.parse(data);
		} catch (error) {
			const { message } = error;
			if (options.retryWithTrimmedEndOnFailure && this._isRangeOutOfBoundsError(message)) {
				const actualLength = this._getFileLengthFromOutOfBoundsError(message);
				if (actualLength === 0) return [];
				if (actualLength !== undefined) {
					const maxLine = actualLength - 1;
					return this.getBlameRevisions(uriOrPath as any, {
						...options,
						startLine: options.startLine && Math.min(options.startLine, maxLine),
						endLine: maxLine,
						retryWithTrimmedEndOnFailure: false
					});
				}
			}
			throw error;
		}
	}

	private _isRangeOutOfBoundsError(message: string) {
		return /((fatal: file )(\S+)\s(has only )\d+\s(lines))/.test(message);
	}

	private _getFileLengthFromOutOfBoundsError(message: string) {
		const lengthString = message.substring(message.indexOf("fatal: file")).match(/\d+/)?.[0];
		return lengthString ? parseInt(lengthString, 10) : undefined;
	}

	private async getRawBlame(
		uriOrPath: URI | string,
		options: { ref?: string; contents?: string; startLine?: number; endLine?: number } = {}
	): Promise<string> {
		if (options.ref === EMPTY_TREE_SHA) return "";

		const repoAndRelativePath = await this._getRepoAndRelativePath(uriOrPath);
		if (!repoAndRelativePath) return "";
		const { repoPath, relativePath } = repoAndRelativePath;

		const params = ["blame", "--root", "--incremental", "-w"];

		if (options.startLine != null && options.endLine != null) {
			params.push(`-L ${options.startLine + 1},${options.endLine + 1}`);
		}

		let stdin;
		if (options.ref) {
			params.push(options.ref);
		} else if (options.contents) {
			params.push("--contents", "-");
			// Pipe the blame contents to stdin
			stdin = options.contents;
		}

		return git({ cwd: repoPath, stdin: stdin }, ...params, "--", relativePath);
	}

	async getCommitShaByLine(uriOrPath: URI | string): Promise<string[]> {
		const [dir, filename] = Strings.splitPath(
			typeof uriOrPath === "string" ? uriOrPath : uriOrPath.fsPath
		);

		const data = await git({ cwd: dir }, "blame", "-l", filename);

		return data
			.trim()
			.split("\n")
			.map(line => line.substr(0, 40));
	}

	async getFileCurrentRevision(uri: URI): Promise<string | undefined>;
	async getFileCurrentRevision(path: string): Promise<string | undefined>;
	async getFileCurrentRevision(uriOrPath: URI | string): Promise<string | undefined> {
		const repoAndRelativePath = await this._getRepoAndRelativePath(uriOrPath);
		if (!repoAndRelativePath) return undefined;
		const { repoPath, relativePath } = repoAndRelativePath;

		const data = (
			await git({ cwd: repoPath }, "log", "-n1", "--format=%H", "--", relativePath)
		).trim();
		return data ? data : undefined;
	}

	private async _getRepoAndRelativePath(
		uriOrPath: URI | string
	): Promise<{ repoPath: string; relativePath: string } | undefined> {
		const fsPath = typeof uriOrPath === "string" ? uriOrPath : uriOrPath.fsPath;
		const repo = await this.getRepositoryByFilePath(fsPath);
		if (!repo) return undefined;

		const possiblySymlinkedRepoRoot = this._gitServiceLite.getRepoRootPreservingSymlink(
			fsPath,
			repo.path
		);

		let fileRelativePath = Strings.normalizePath(path.relative(possiblySymlinkedRepoRoot, fsPath));
		if (fileRelativePath[0] === "/") {
			fileRelativePath = fileRelativePath.substr(1);
		}

		return {
			repoPath: possiblySymlinkedRepoRoot,
			relativePath: fileRelativePath
		};
	}

	async getFileContentForRevision(
		uri: URI,
		ref: string,
		range?: Range
	): Promise<string | undefined>;
	async getFileContentForRevision(
		path: string,
		ref: string,
		range?: Range
	): Promise<string | undefined>;
	async getFileContentForRevision(
		uriOrPath: URI | string,
		ref: string,
		range?: Range
	): Promise<string | undefined> {
		const repoAndRelativePath = await this._getRepoAndRelativePath(uriOrPath);
		if (!repoAndRelativePath) return undefined;
		const { repoPath, relativePath } = repoAndRelativePath;

		try {
			const data = await git(
				{ cwd: repoPath, encoding: "utf8" },
				"show",
				`${ref}:./${relativePath}`,
				"--"
			);
			let contents = Strings.normalizeFileContents(data);
			if (range) {
				const lines = contents.split("\n").slice(range.start.line, range.end.line + 1);
				if (range.start.line === range.end.line) {
					lines[0] = lines[0].substring(range.start.character, range.end.character);
				} else {
					lines[0] = lines[0].substring(range.start.character);
					lines[lines.length - 1] = lines[lines.length - 1].substring(0, range.end.character);
				}
				contents = lines.join("\n");
			}
			return contents;
		} catch (ex) {
			const msg = ex && ex.toString();
			if (
				GitErrors.badRevision.test(msg) ||
				GitWarnings.notFound.test(msg) ||
				GitWarnings.foundButNotInRevision.test(msg)
			) {
				return undefined;
			}

			throw ex;
		}
	}

	getDefaultBranch(repoPath: string, remote: string): Promise<string | undefined> {
		return this._memoizedGetDefaultBranch(repoPath, remote);
	}
	private async _getDefaultBranch(repoPath: string, remote: string): Promise<string | undefined> {
		try {
			Logger.debug("IN GDB: " + remote);
			const throwRawExceptions = remote !== "upstream";
			const data = await git(
				{ cwd: repoPath, env: { GIT_TERMINAL_PROMPT: "0" }, throwRawExceptions },
				"remote",
				"show",
				remote
			);
			const headBranchLine = data
				.trim()
				.split("\n")
				.find(line => line.indexOf("HEAD branch:") >= 0);

			return headBranchLine ? headBranchLine.split(":")[1].trim() : undefined;
		} catch (ex) {
			Logger.debug("getDefaultBranch: " + ex.message);
			return undefined;
		}
	}

	async fetchAllRemotes(repoPath: string): Promise<boolean> {
		try {
			await git(
				{
					cwd: repoPath,
					env: { GIT_TERMINAL_PROMPT: "0" },
					throwRawExceptions: true,
					timeout: 10 * 1000
				},
				"fetch",
				"--all"
			);
			return true;
		} catch {
			Logger.log("Could not fetch all remotes");
			return false;
		}
	}

	async getCommitChanges(
		repoPath: string,
		commitHashes: string[]
	): Promise<ParsedDiffPatch[] | undefined> {
		try {
			const options = ["diff", "--no-ext-diff", "--no-prefix"];
			switch (commitHashes.length) {
				case 1:
					options.push(`${commitHashes[0]}^!`);
					break;
				case 2:
					options.push(`${commitHashes[0]}..${commitHashes[1]}`);
					break;
				default:
					return;
			}
			const data = await git({ cwd: repoPath }, ...options);

			return GitPatchParser.parse(data);
		} catch (err) {
			Logger.warn(`Error getting diff from ${commitHashes}`);
			throw err;
		}
	}

	async getDiffBetweenCommits(
		initialCommitHash: string,
		finalCommitHash: string,
		filePath: string,
		fetchIfCommitNotFound: boolean = false,
		contextLines: number = 3
	): Promise<ParsedDiff | undefined> {
		const repoAndRelativePath = await this._getRepoAndRelativePath(filePath);
		if (!repoAndRelativePath) return undefined;
		const { repoPath, relativePath } = repoAndRelativePath;
		let data;
		try {
			data = await git(
				{ cwd: repoPath },
				"diff",
				"--no-ext-diff",
				`-U${contextLines}`,
				initialCommitHash,
				finalCommitHash,
				"--",
				relativePath
			);
		} catch (err) {
			if (fetchIfCommitNotFound) {
				Logger.log("Commit not found - fetching all remotes");
				const didFetch = await this.fetchAllRemotes(repoPath);
				if (didFetch) {
					return this.getDiffBetweenCommits(initialCommitHash, finalCommitHash, filePath, false);
				}
			}

			Logger.error(err);
			Logger.warn(
				`Error getting diff from ${initialCommitHash} to ${finalCommitHash} for ${relativePath}`
			);
			return;
		}

		const patches = parsePatch(data);
		if (patches.length > 1) {
			Logger.warn("Parsed diff generated multiple patches");
		}
		return patches[0];
	}

	async getDiffBetweenCommitsAndFiles(
		initialCommitHash: string,
		finalCommitHash: string,
		repositoryPath: string,
		filePath1: string,
		filePath2: string,
		fetchIfCommitNotFound: boolean = false,
		contextLines: number = 3
	): Promise<ParsedDiff | undefined> {
		const repoAndRelativePath = await this._getRepoAndRelativePath(repositoryPath);
		if (!repoAndRelativePath) return undefined;
		const { repoPath, relativePath } = repoAndRelativePath;
		let data;
		try {
			data = await git(
				{ cwd: repoPath },
				"diff",
				"--no-ext-diff",
				`-U${contextLines}`,
				`${initialCommitHash}:${filePath1}`,
				`${finalCommitHash}:${filePath2}`
			);
		} catch (err) {
			if (fetchIfCommitNotFound) {
				Logger.log("Commit not found - fetching all remotes");
				const didFetch = await this.fetchAllRemotes(repoPath);
				if (didFetch) {
					return this.getDiffBetweenCommitsAndFiles(
						initialCommitHash,
						finalCommitHash,
						repositoryPath,
						filePath1,
						filePath2,
						false
					);
				}
			}

			Logger.error(err);
			Logger.warn(
				`Error getting diff from ${initialCommitHash}:${filePath1} to ${finalCommitHash}:${filePath2}for ${relativePath}`
			);
			return;
		}

		const patches = parsePatch(data);
		if (patches.length > 1) {
			Logger.warn("Parsed diff generated multiple patches");
		}
		return patches[0];
	}

	async getDiffs(
		repoPath: string,
		opts: {
			includeSaved: boolean;
			includeStaged: boolean;
			reverse?: boolean;
		},
		ref1?: string,
		ref2?: string
	): Promise<ParsedDiff[]> {
		let data: string | undefined;
		const { includeSaved, includeStaged, reverse } = opts;
		try {
			const options = ["diff", "--no-ext-diff", "--no-prefix"];
			if (reverse === true) options.push("-R");
			if (includeStaged && !includeSaved) options.push("--staged");
			if (ref1 && ref1.length) options.push(ref1);
			if (ref2 && ref2.length) options.push(ref2);
			if ((!includeStaged && !ref1) || (!includeSaved && !includeStaged && !ref2)) {
				options.push("HEAD");
			}
			options.push("--");
			data = await git({ cwd: repoPath }, ...options);
		} catch (err) {
			Logger.warn(
				`Error getting diff from ${repoPath}:${includeSaved}:${includeStaged}:${ref1}:${ref2}`
			);
			throw err;
		}

		const patches = parsePatch(data);
		return patches;
	}

	async diffBranches(
		repoPath: string,
		baseRef: string,
		headRef?: string
	): Promise<{ patches: ParsedDiff[]; data: string }> {
		let data: string | undefined;
		try {
			const options = ["diff", "--no-ext-diff", "--no-prefix", baseRef];
			if (headRef) options.push(headRef);
			options.push("--");
			data = await git({ cwd: repoPath }, ...options);
		} catch (err) {
			Logger.warn(`Error diffing branches ${repoPath}:${baseRef}:${headRef}`);
			throw err;
		}

		const patches = parsePatch(data);
		return { patches, data };
	}

	// this isn't technically a git operation, but we leave it here since it's
	// pretending to be one
	async getNewDiff(
		repoPath: string,
		file: string,
		opts?: { reverse?: boolean }
	): Promise<ParsedDiff> {
		let data: ParsedDiff | undefined;
		try {
			let contents = await xfs.readText(path.join(repoPath, file));
			if (contents == null) {
				Logger.warn(`Error reading file in getNewDiff: ${repoPath}:${file}`);
				contents = "";
			}
			contents = Strings.normalizeFileContents(contents);
			// we would like to use structuredPatch here but it doesn't seem to work
			// no idea why! but this works. https://github.com/kpdecker/jsdiff/issues/157
			const patch =
				opts && opts.reverse
					? createPatch(file, contents, "", "", "")
					: createPatch(file, "", contents, "", "");
			data = parsePatch(patch)[0];
		} catch (err) {
			Logger.warn(`Error getting new file diff from ${repoPath}:${file}`);
			throw err;
		}

		return data;
	}

	async getHeadRevision(repoPath: string, reference: string): Promise<string[]> {
		try {
			const data = await git({ cwd: repoPath }, "show-ref", "-s", reference);
			return data.trim().split("\n");
		} catch (ex) {
			Logger.warn(ex);
			return [];
		}
	}

	async getRemoteDefaultBranchHeadRevisions(repoUri: URI): Promise<string[]>;
	async getRemoteDefaultBranchHeadRevisions(repoPath: string): Promise<string[]>;
	async getRemoteDefaultBranchHeadRevisions(repoUriOrPath: URI | string): Promise<string[]> {
		const repoPath = typeof repoUriOrPath === "string" ? repoUriOrPath : repoUriOrPath.fsPath;
		const revisions = new Set<string>();

		const repo = await this._repositories.find(r => r.path === repoPath);
		const references = (await repo?.getDefaultRemoteBranchReferences()) || [];

		for (const reference of references) {
			const headRevisions = reference && (await this.getHeadRevision(repoPath, reference));
			if (headRevisions) headRevisions.forEach(hr => revisions.add(hr));
		}

		return Array.from(revisions);
	}

	async getRepoFirstCommits(repoUri: URI): Promise<string[]>;
	async getRepoFirstCommits(repoPath: string): Promise<string[]>;
	async getRepoFirstCommits(repoUriOrPath: URI | string): Promise<string[]> {
		const repoPath = typeof repoUriOrPath === "string" ? repoUriOrPath : repoUriOrPath.fsPath;

		let data;
		try {
			data = await git(
				{ cwd: repoPath },
				"rev-list",
				"--max-parents=0",
				"--reverse",
				"master",
				"--"
			);
		} catch {}

		if (!data) {
			try {
				data = await git(
					{ cwd: repoPath },
					"rev-list",
					"--max-parents=0",
					"--reverse",
					"HEAD",
					"--"
				);
			} catch {}
		}

		if (!data) return [];

		return data.trim().split("\n");
	}

	async getRepoCommitHistory(repoUri: URI): Promise<string[]>;
	async getRepoCommitHistory(repoPath: string): Promise<string[]>;
	async getRepoCommitHistory(repoUriOrPath: URI | string): Promise<string[]> {
		const repoPath = typeof repoUriOrPath === "string" ? repoUriOrPath : repoUriOrPath.fsPath;
		return this._gitServiceLite.getRepoCommitHistory(repoPath);
	}

	async getRepoBranchForkCommits(repoUri: URI): Promise<string[]>;
	async getRepoBranchForkCommits(repoPath: string): Promise<string[]>;
	async getRepoBranchForkCommits(repoUriOrPath: URI | string): Promise<string[]> {
		const repoPath = typeof repoUriOrPath === "string" ? repoUriOrPath : repoUriOrPath.fsPath;

		return this._gitServiceLite.getRepoBranchForkCommits(repoPath);
	}

	async getRepoBranchForkPoint(
		repoUriOrPath: URI | string,
		sha1: string,
		sha2: string
	): Promise<string | undefined> {
		const repoPath = typeof repoUriOrPath === "string" ? repoUriOrPath : repoUriOrPath.fsPath;

		let data: string | undefined;
		try {
			data = await git({ cwd: repoPath }, "merge-base", sha1, sha2, "--");
			if (data) {
				data = data.trim();
			}
		} catch {}
		if (!data) return undefined;

		return data;
	}

	async getRepoHeadRevision(repoUri: URI): Promise<string | undefined>;
	async getRepoHeadRevision(repoPath: string): Promise<string | undefined>;
	async getRepoHeadRevision(repoUriOrPath: URI | string): Promise<string | undefined> {
		const repoPath = typeof repoUriOrPath === "string" ? repoUriOrPath : repoUriOrPath.fsPath;

		const data = (await git({ cwd: repoPath }, "log", "-n1", "--format=%H")).trim();
		return data ? data : undefined;
	}

	async getRepoRemote(repoUri: URI): Promise<GitRemote | undefined>;
	async getRepoRemote(repoPath: string): Promise<GitRemote | undefined>;
	async getRepoRemote(repoUriOrPath: URI | string): Promise<GitRemote | undefined> {
		const repoPath = typeof repoUriOrPath === "string" ? repoUriOrPath : repoUriOrPath.fsPath;
		const remotes = await this.getRepoRemotes(repoPath);

		let fetch;
		let push;
		for (const r of remotes) {
			if (push !== undefined) break;

			if (r.types.find(t => t.type === "push")) {
				push = r;
			} else if (fetch === undefined && r.types.find(t => t.type === "fetch")) {
				fetch = r;
			}
		}

		return push || fetch;
	}

	getRepoRemotes(repoUri: URI): Promise<GitRemote[]>;
	getRepoRemotes(repoPath: string): Promise<GitRemote[]>;
	@log({
		exit: (result: GitRemote[]) =>
			`returned [${result.length !== 0 ? result.map(r => r.uri.toString(true)).join(", ") : ""}]`
	})
	getRepoRemotes(repoUriOrPath: URI | string): Promise<GitRemote[]> {
		const repoPath = typeof repoUriOrPath === "string" ? repoUriOrPath : repoUriOrPath.fsPath;
		return this._memoizedGetRepoRemotes(repoPath);
	}
	private async _getRepoRemotes(repoPath: string) {
		try {
			const data = await git({ cwd: repoPath }, "remote", "-v");
			return await GitRemoteParser.parse(data, repoPath);
		} catch {
			return [];
		}
	}

	getRepoRoot(uri: URI): Promise<string | undefined>;
	getRepoRoot(path: string): Promise<string | undefined>;
	getRepoRoot(uriOrPath: URI | string): Promise<string | undefined> {
		const filePath = typeof uriOrPath === "string" ? uriOrPath : uriOrPath.fsPath;

		return this._gitServiceLite.getRepoRoot(filePath);
	}

	async fetchReference(repo: GitRepository, ref: string): Promise<void> {
		const remotes = await repo.getWeightedRemotes();
		for (const remote of remotes) {
			try {
				await git({ cwd: repo.path }, "fetch", remote.name, ref);
				Logger.log(`Fetched ref ${ref} from ${remote.name} in ${repo.path}`);
				return;
			} catch (ignore) {}
		}
		Logger.log(`Could not find ref ${ref} in any remote of ${repo.path}`);
	}

	async getCommit(repoUri: URI, ref: string): Promise<GitCommit | undefined>;
	async getCommit(repoPath: string, ref: string): Promise<GitCommit | undefined>;
	async getCommit(repoUriOrPath: URI | string, ref: string): Promise<GitCommit | undefined> {
		const repoPath = typeof repoUriOrPath === "string" ? repoUriOrPath : repoUriOrPath.fsPath;

		try {
			const data = await git(
				{ cwd: repoPath },
				"log",
				"-M",
				"-n1",
				`--format=${GitLogParser.defaultFormat}`,
				ref,
				"--"
			);

			const commits = GitLogParser.parse(data.trim(), repoPath);
			if (commits === undefined || commits.size === 0) return undefined;

			return Iterables.first(commits.values());
		} catch {
			return undefined;
		}
	}

	async getCurrentBranch(uri: URI, isDirectory?: boolean): Promise<string | undefined>;
	async getCurrentBranch(path: string, isDirectory?: boolean): Promise<string | undefined>;
	async getCurrentBranch(uriOrPath: URI | string): Promise<string | undefined> {
		const filePath = typeof uriOrPath === "string" ? uriOrPath : uriOrPath.fsPath;
		let cwd;
		if (fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) {
			cwd = filePath;
		} else {
			[cwd] = Strings.splitPath(filePath);
		}

		try {
			const data = (await git({ cwd: cwd }, "rev-parse", "--abbrev-ref", "HEAD")).trim();
			return data === "" || data === "HEAD" ? undefined : data;
		} catch {
			return undefined;
		}
	}

	async createBranch(repoPath: string, branch: string, fromRef?: string): Promise<undefined> {
		// attempt to replace illegal chars according to
		// https://stackoverflow.com/questions/3651860/which-characters-are-illegal-within-a-branch-name
		if (branch) {
			branch = branch
				// 1.
				.replace(/\/\./g, "/")
				// 2. ignored since --allow-onelevel might be set
				// 3.
				.replace(/\.\.+/g, ".")
				// 4 & 5 & 10
				.replace(/[\?\*\[\ \~\:\^\\]/g, "-")
				// 6.
				.replace(/^\//, "")
				.replace(/\/$/, "")
				.replace(/\/\/+/g, "/")
				// 7.
				.replace(/\.$/, "")
				// 8.
				.replace(/\@\{/g, "at{");
			// 9. just throw the error, no idea what to replace it with
		}
		if (fromRef) await git({ cwd: repoPath }, "checkout", "-b", branch, fromRef);
		else await git({ cwd: repoPath }, "checkout", "-b", branch);
		return;
	}

	async switchBranch(repoPath: string, branch: string): Promise<undefined> {
		await git({ cwd: repoPath }, "checkout", branch);
		return;
	}

	async getBranches(
		repoPath: string,
		includeRemotes?: boolean
	): Promise<
		| {
				current: string;
				branches: string[];
				branchesMeta: { remote?: string; branch: string }[];
		  }
		| undefined
	> {
		try {
			const remotesData = await git({ cwd: repoPath }, "remote", "show");
			const remotes = remotesData.split("\n").filter(r => !!r);

			const options = ["branch"];
			if (includeRemotes) options.push("-r");
			const data = await git({ cwd: repoPath }, ...options);
			if (!data) return undefined;
			const branches = data
				.split("\n")
				.map(b => b.substr(2).trim())
				.filter(b => b.length > 0)
				.filter(b => !b.startsWith("HEAD ->"))
				.map(b => {
					if (includeRemotes) {
						if (remotes.length === 1) {
							return { remote: "origin", branch: b.replace(/^origin\//, "") };
						} else {
							const split = b.split("/");
							const remoteName = split[0];
							// remove the first part (it's the remote)
							split.shift();
							const branchName = split.join("/");
							return { remote: remoteName, branch: branchName };
						}
					} else {
						return {
							branch: b
						};
					}
				});

			const current = data.split("\n").find(b => b.startsWith("* "));
			return {
				branches: branches.map(_ => _.branch),
				branchesMeta: branches,
				current: current ? current.substr(2).trim() : ""
			};
		} catch (ex) {
			Logger.warn(ex);
			return undefined;
		}
	}

	async getTrackingBranch(uri: URI, isDirectory?: boolean): Promise<TrackingBranch | undefined>;
	async getTrackingBranch(path: string, isDirectory?: boolean): Promise<TrackingBranch | undefined>;
	async getTrackingBranch(
		uriOrPath: URI | string,
		isDirectory: boolean = false
	): Promise<TrackingBranch | undefined> {
		const filePath = typeof uriOrPath === "string" ? uriOrPath : uriOrPath.fsPath;
		let cwd;
		if (fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) {
			cwd = filePath;
		} else {
			[cwd] = Strings.splitPath(filePath);
		}

		try {
			const data = (await git({ cwd: cwd }, "rev-parse", "--abbrev-ref", "@{u}")).trim();
			if (data !== undefined && data !== "") {
				return {
					fullName: data,
					shortName: data.substring(data.indexOf("/") + 1)
				};
			}
			return data === "" ? undefined : data;
		} catch {
			return undefined;
		}
	}

	async getLog(
		repo: GitRepository,
		limit: number = 50
	): Promise<Map<string, GitCommit> | undefined> {
		try {
			const commitsData = await git(
				{ cwd: repo.path },
				"log",
				`-n${limit}`,
				`--format=${GitLogParser.defaultFormat}`,
				"--"
			);
			return GitLogParser.parse(commitsData.trim(), repo.path);
		} catch (e) {
			Logger.error(e);
			return undefined;
		}
	}

	async getCommitsOnBranch(
		repoPath: string,
		branch: string,
		prevEndCommit?: string
	): Promise<{ sha: string; info: {}; localOnly: boolean }[] | undefined> {
		try {
			const commitsData = await git(
				{ cwd: repoPath },
				"log",
				branch,
				"-n100",
				`--format=${GitLogParser.defaultFormat}`,
				"--"
			);
			const commits = GitLogParser.parse(commitsData.trim(), repoPath);
			if (commits === undefined || commits.size === 0) {
				return undefined;
			}

			let localCommits: string[] | undefined = undefined;
			try {
				// https://stackoverflow.com/questions/2016901/viewing-unpushed-git-commits
				const localCommitsData = await git(
					{ cwd: repoPath, throwRawExceptions: true },
					"log",
					"@{push}..",
					"--format=%H",
					"--"
				);
				localCommits = localCommitsData.trim().split("\n");
			} catch (ex) {
				// Chances are this branch has no remote tracking branch, so we'll consider all commits as localOnly
				Logger.log(`Unable to identify pushed commits. Reason: ${ex.message}`);
			}

			let ret: { sha: string; info: {}; localOnly: boolean }[] = [];
			commits.forEach((val, key) => {
				ret.push({
					sha: key,
					info: val,
					// !localCommits means that the command to find local commits failed, so we
					// were not able to find any. for instance, when there is not an up-stream configured
					localOnly: localCommits != undefined && localCommits.includes(key)
					// hasCommitsExclusiveToThisBranch && (!localCommits || localCommits.includes(key))
				});
			});

			if (prevEndCommit) {
				const index = ret.findIndex(commit => commit.sha === prevEndCommit);
				if (index > -1) ret = ret.slice(0, index);
			}

			return ret;
		} catch {
			return undefined;
		}
	}

	async commitAndPush(
		repoPath: string,
		message: string,
		files: string[],
		pushAfterCommit: boolean
	): Promise<{ success: boolean; error?: string }> {
		try {
			// const escapedMessage = message.replace(/\'/g, "\\'");
			const data = await git({ cwd: repoPath }, "commit", "-m", message, ...files);
			if (pushAfterCommit) {
				await git({ cwd: repoPath }, "pull");
				await git({ cwd: repoPath }, "push", "origin");
			}
			return { success: true };
		} catch (err) {
			return { success: false, error: err.message };
		}
	}

	async fetchRemoteBranch(
		repoPath: string,
		remoteName: string,
		sourceBranchName: string,
		destBranchName: string
	): Promise<{ success: boolean; error?: string }> {
		try {
			const data = await git({ cwd: repoPath }, "rev-parse", "--abbrev-ref", "HEAD");
			if (data.trim() === destBranchName) {
				await git({ cwd: repoPath }, "pull");
			} else {
				await git({ cwd: repoPath }, "fetch", remoteName, `${sourceBranchName}:${destBranchName}`);
			}
			return { success: true };
		} catch (err) {
			return { success: false, error: err.message };
		}
	}

	async getHasLocalCommits(repoPath: string, branch?: string): Promise<boolean> {
		try {
			if (branch) {
				// https://stackoverflow.com/questions/2016901/viewing-unpushed-git-commits
				const options = ["for-each-ref", '--format="%(refname:short) %(push:track)"', "refs/heads"];
				const data = await git({ cwd: repoPath }, ...options);
				const lines = data
					.trim()
					.split("\n")
					.map(line => line.replace(/^\"/, ""));
				const branchInfo = lines.find(line => line.startsWith(branch)) || "";
				return branchInfo.includes("[ahead ");
			} else {
				// https://stackoverflow.com/questions/2016901/viewing-unpushed-git-commits
				const data = await git(
					{ cwd: repoPath },
					"log",
					"@{push}..",
					`--format=${GitLogParser.defaultFormat}`,
					"--"
				);
				const commits = GitLogParser.parse(data.trim(), repoPath);
				if (commits === undefined || commits.size === 0) return false;
				else return true;
			}
		} catch {
			return false;
		}
	}

	async getParentCommitShas(repoPath: string, sha: string): Promise<string[]> {
		try {
			const data = await git({ cwd: repoPath }, "log", "--pretty=%P", "-n", "1", sha);
			const allShas = data.trim().split("\n")[0] || "";
			// commits can have multiple parents
			return allShas.trim().split(/\s/);
		} catch (err) {
			Logger.log(err.message);
			return [];
		}
	}

	async getHeadSha(repoPath: string): Promise<string | undefined> {
		try {
			const data = await git({ cwd: repoPath }, "log", "--pretty=%H", "-n", "1");
			return data.trim().split("\n")[0];
		} catch (err) {
			Logger.log(err.message);
			return undefined;
		}
	}

	/**
	 * Statistics for changes in repo from `startCommit`
	 */
	async getNumStat(
		repoPath: string,
		startCommit: string = "HEAD",
		endCommit: string | undefined,
		includeSaved: boolean,
		includeStaged: boolean
	): Promise<GitNumStat[]> {
		if (!startCommit || !startCommit.length) {
			startCommit = "HEAD";
		}
		const options = [startCommit];
		if (!includeSaved && !includeStaged) {
			options.push(endCommit || "HEAD");
		} else if (!includeSaved) {
			options.push("--staged");
		}
		return this.getNumStatCore(repoPath, ...options);
	}

	/**
	 * Statistics for staged changes in repo
	 */
	getNumStatStaged(repoPath: string): Promise<GitNumStat[]> {
		return this.getNumStatCore(repoPath, "--staged");
	}

	/**
	 * Statistic for saved (exclusively saved, i.e. unstaged or not staged) changes in repo.
	 * Note that in normal circumstances, a file will be either in the saved or the staged
	 * category, but not both
	 */
	getNumStatSaved(repoPath: string): Promise<GitNumStat[]> {
		return this.getNumStatCore(repoPath);
	}

	private async getNumStatCore(repoPath: string, ...options: string[]): Promise<GitNumStat[]> {
		try {
			// files changed, lines added & deleted
			// git diff --numstat --summary
			// https://stackoverflow.com/questions/1587846/how-do-i-show-the-changes-which-have-been-staged
			// also see https://files.slack.com/files-pri/T7DDT1L5R-FV0CM6LD6/image.png
			const deletedOnly = await git(
				{ cwd: repoPath },
				"diff",
				"--no-ext-diff",
				"--numstat",
				"--diff-filter=D",
				...options,
				"--"
			);
			const allButDeleted = await git(
				{ cwd: repoPath },
				"diff",
				"--no-ext-diff",
				"--numstat",
				"--diff-filter=d",
				...options,
				"--"
			);
			return [
				...this.parseNumStat(allButDeleted),
				...this.parseNumStat(deletedOnly, FileStatus.deleted)
			];
		} catch (err) {
			Logger.warn(`Error getting numstat (${options}): ${err.message}`);
			return [];
		}
	}

	private parseNumStat(
		data: string = "",
		presumedStatus: FileStatus = FileStatus.modified
	): GitNumStat[] {
		const ret: GitNumStat[] = [];
		data
			.trim()
			.split("\n")
			.forEach(line => {
				const lineData = line.match(/^(\d+)\s+(\d+)\s+(.+)/);

				if (lineData && lineData[3]) {
					if (!lineData[3].endsWith("/")) {
						const { oldFile, file } = this._getOldAndNewFileNamesFromDiffPath(lineData[3]);
						ret.push({
							linesAdded: parseInt(lineData[1], 10),
							linesRemoved: parseInt(lineData[2], 10),
							oldFile,
							file,
							status: presumedStatus,
							statusX: presumedStatus,
							statusY: presumedStatus
						});
					}
				}
			});
		return ret;
	}

	private _getOldAndNewFileNamesFromDiffPath(diffPath: string) {
		const matchInSubdir = /(.*)\{(.*)\s=>\s(.*)}(.*)/.exec(diffPath);
		const matchAtRoot = /(.+)\s=>\s(.+)/.exec(diffPath);

		if (matchInSubdir) {
			const [, prefix, oldPart, newPart, suffix] = matchInSubdir;
			const prefixOrEmpty = prefix || "";
			const oldPartOrEmpty = oldPart || "";
			const newPartOrEmpty = newPart || "";
			const suffixOrEmpty = suffix || "";
			return {
				oldFile: (prefixOrEmpty + oldPartOrEmpty + suffixOrEmpty).replace(/\/\//, "/"),
				file: (prefixOrEmpty + newPartOrEmpty + suffixOrEmpty).replace(/\/\//, "/")
			};
		} else if (matchAtRoot) {
			const [, oldFile, file] = matchAtRoot;
			return {
				oldFile,
				file
			};
		} else {
			return {
				oldFile: diffPath,
				file: diffPath
			};
		}
	}

	getStatusByChar(character: string): FileStatus | undefined {
		switch (character) {
			case "A":
				return FileStatus.added;
			case "R":
				return FileStatus.renamed;
			case "D":
				return FileStatus.deleted;
			case "C":
				return FileStatus.copied;
			case "U":
				return FileStatus.unmerged;
			case "M":
				return FileStatus.modified;
			case "?":
				return FileStatus.untracked;
		}
		return undefined;
	}

	async getHasModifications(repoPath: string): Promise<boolean> {
		let data: string | undefined = undefined;
		try {
			const options = ["status", "-v", "--porcelain", "--untracked-files=no"];
			data = await git({ cwd: repoPath }, ...options);
		} catch {}
		return data && data.trim().length > 0 ? true : false;
	}

	async getStatus(
		repoPath: string,
		includeSaved: boolean
	): Promise<
		| {
				[file: string]: {
					statusX?: FileStatus;
					statusY?: FileStatus;
					status: FileStatus;
				};
		  }
		| undefined
	> {
		try {
			let data: string | undefined;
			try {
				const options = ["status", "-v", "--porcelain"];
				data = await git({ cwd: repoPath }, ...options);
			} catch {}
			if (!data) return undefined;

			const ret: {
				[file: string]: {
					statusX?: FileStatus;
					statusY?: FileStatus;
					status: FileStatus;
				};
			} = {};
			// FIXME support deleted files
			data.split("\n").forEach(line => {
				const lineData = line.match(/(.)(.)\s+(.*)/);
				if (lineData && lineData[3]) {
					let [, statusXChar, statusYChar, file] = lineData;
					const statusX = this.getStatusByChar(statusXChar);
					const statusY = this.getStatusByChar(statusYChar);
					let status;
					const rename = file.match(/ -> (.*)/);
					if (rename) file = rename[1];
					if (statusXChar === "?" && includeSaved) {
						status = FileStatus.untracked;
					} else {
						if (statusX) status = statusX;
						if (includeSaved) {
							if (statusY) status = statusY;
						}
					}

					if (status) {
						// skip untracked directories
						if (status !== FileStatus.untracked || !file.match(/\/$/)) {
							ret[file] = {
								statusX,
								statusY,
								status
							};
						}
					}
				}
			});
			return ret;
		} catch {
			return undefined;
		}
	}

	async getDiffAuthors(
		repoPath: string,
		file: string,
		includeSaved: boolean,
		includeStaged: boolean,
		ref: string = "HEAD"
	): Promise<GitAuthor[]> {
		if (ref === EMPTY_TREE_SHA) return [];

		try {
			let data: string | undefined;
			try {
				const options = ["diff", "--no-ext-diff"];
				if (includeStaged && !includeSaved) options.push("--staged");
				if (ref && ref.length) options.push(ref);
				if (!includeStaged) options.push("HEAD");
				options.push("--");
				options.push(file);
				data = await git({ cwd: repoPath }, ...options);
			} catch {}
			if (!data) return [];
			const patch = parsePatch(data)[0];
			// if hunk start line equal 0 means that the file was just created
			const isNewFile = patch.hunks.some(hunk => hunk.oldStart === 0);
			if (isNewFile) return [];
			try {
				const options = ["blame"];
				if (ref && ref.length) options.push(ref);
				patch.hunks.forEach(hunk => {
					// -1 cuz we should take into account hunk.oldStart line
					const oldEnd = hunk.oldStart + hunk.oldLines - 1;
					options.push(`-L${hunk.oldStart},${Math.max(hunk.oldStart, oldEnd)}`);
				});
				options.push("--root", "--incremental", "-w");
				options.push("--");
				options.push(file);
				data = await git({ cwd: repoPath }, ...options);
			} catch {}
			if (!data) return [];
			return GitAuthorParser.parse(data);
		} catch {
			return [];
		}
	}

	async isAncestor(repoPath: string, commitA: string, commitB: string): Promise<boolean> {
		try {
			const data = await git(
				{ cwd: repoPath, throwRawExceptions: true },
				"merge-base",
				"--is-ancestor",
				commitA,
				commitB
			);
			return true;
		} catch (err) {
			return false;
		}
	}

	async commitExists(repoPath: string, commit: string): Promise<boolean> {
		try {
			await git(
				{ cwd: repoPath, throwRawExceptions: true },
				"cat-file",
				"-e",
				`${commit}^{commit}`
			);
			return true;
		} catch (err) {
			return false;
		}
	}

	getRepositories(): Promise<Iterable<GitRepository>> {
		return this._repositories.get();
	}

	async getRepositoryById(id: string): Promise<GitRepository | undefined> {
		const { repositoryMappings } = SessionContainer.instance();
		let repo = await this._repositories.getById(id);
		if (!repo) {
			const loadedRepos = Array.from(await this.getRepositories());
			const reposString = loadedRepos.map(_ => `${_.id}=${_.path}`).join(", ");
			Logger.log(
				`Repo ${id} not loaded - falling back to mappings. Currently loaded repos: ${reposString}`
			);
			const mappedPath = await repositoryMappings.getByRepoId(id);
			if (mappedPath) {
				repo = await this.getRepositoryByFilePath(mappedPath);
			} else {
				Logger.log(`No mapping found for repo ${id}`);
			}
		}
		return repo;
	}

	/**
	 * Returns a possible GitRepository on a file OR folder. If that file has not been seen before,
	 * a traversal up its path will occur looking for the root repo. If it is a folder, it will attempt to lookup _that_
	 * folder
	 * @param fileOrFolderPath path to a file or folder
	 */
	async getRepositoryByFilePath(fileOrFolderPath: string): Promise<GitRepository | undefined> {
		let repo;
		if (fs.existsSync(fileOrFolderPath) && fs.lstatSync(fileOrFolderPath).isDirectory()) {
			const normalizedFsPath = Strings.normalizePath(fileOrFolderPath);
			const allRepos = await this.getRepositories();
			repo = Array.from(allRepos).find(
				r => r.path === normalizedFsPath || r.path === fileOrFolderPath
			);
		} else {
			// do NOT allow folders to get into this path, any folder not already tracked
			// will traverse _up_ looking for additional git repos.
			// this is because the last part of the path will get treated as an
			// extensionless file name!
			const repoRoot = await this.getRepoRoot(fileOrFolderPath);
			if (repoRoot) {
				// normalize the part of the repo that could be wrong (repo path)
				const newFilePath = fileOrFolderPath
					.replace(/\\/g, "/")
					.replace(new RegExp(Strings.escapeRegExp(repoRoot), "i"), repoRoot);
				if (newFilePath !== fileOrFolderPath.replace(/\\/g, "/")) {
					Logger.warn(
						`getRepositoryByFilePath: Possible repo casing issue newPath=${newFilePath} vs. fileOrFolderPath=${fileOrFolderPath}`
					);
				}
				repo = await this._repositories.getByFilePath(newFilePath);
			} else {
				repo = await this._repositories.getByFilePath(fileOrFolderPath);
			}
		}

		if (!repo) {
			Logger.warn(`getRepositoryByFilePath: Could not find git repository for ${fileOrFolderPath}`);
		}

		return repo;
	}

	async isValidReference(repoUri: URI, ref: string): Promise<boolean>;
	async isValidReference(repoPath: string, ref: string): Promise<boolean>;
	async isValidReference(repoUriOrPath: URI | string, ref: string): Promise<boolean> {
		const repoPath = typeof repoUriOrPath === "string" ? repoUriOrPath : repoUriOrPath.fsPath;

		try {
			void (await git({ cwd: repoPath }, "cat-file", "-t", ref));
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Returns true if the sha exists on the specificed branch on the specified repo
	 *
	 * @param  {string} repoPath
	 * @param  {string} branchName
	 * @param  {string} sha
	 * @returns Promise
	 */
	async isCommitOnBranch(
		repoPath: string,
		branchName: string,
		sha: string
	): Promise<boolean | undefined> {
		try {
			const data = await git({ cwd: repoPath }, "branch", "--contains", sha);
			const branches = GitBranchParser.parse(data);
			return branches && branches.length ? branches.some(_ => _.name === branchName) : false;
		} catch (ex) {
			Logger.debug(ex.message);
			return false;
		}
	}

	getKnownCommitHashes(filePath: string): Promise<string[]> {
		return this._gitServiceLite.getKnownCommitHashes(filePath);
	}

	async getCommittersForRepo(
		repoPath: string,
		since: number
	): Promise<{ [email: string]: string }> {
		let data;
		const result: { [email: string]: string } = {};
		try {
			// this should be populated by something like
			// git log --pretty=format:"%an|%aE" | sort -u
			// and then filter out noreply.github.com (what else?)
			const timeAgo = new Date().getTime() / 1000 - since;
			data = (
				await git(
					{ cwd: repoPath },
					"log",
					`--pretty=format:%an${FORMAT_SEPARATOR}%aE`,
					`--since=${timeAgo}`
				)
			)
				.split("\n")
				.map(line => line.trim())
				.filter(line => !line.match(/noreply/))
				.forEach(line => {
					const [name, email] = line.split(FORMAT_SEPARATOR);
					result[email.trim()] = name.trim();
				});
		} catch {}

		return result;
	}

	async getLastCommittersForRepo(
		repoPath: string,
		since: number
	): Promise<{ email: string; name: string }[]> {
		const result: { email: string; name: string }[] = [];
		try {
			// this should be populated by something like
			// git log --pretty=format:"%an|%aE" | sort -u
			// and then filter out noreply.github.com (what else?)
			const timeAgo = new Date().getTime() / 1000 - since;
			const data = await git(
				{ cwd: repoPath },
				"log",
				`--pretty=format:%an${FORMAT_SEPARATOR}%aE`,
				`--since=${timeAgo}`
			);

			data
				.trim()
				.split("\n")
				.map(line => line.trim())
				.filter(line => !line.match(/noreply/))
				.forEach(line => {
					const [name, email] = line.split(FORMAT_SEPARATOR);
					if (!result.find(author => author.email === email)) {
						result.push({ name, email });
					}
				});
		} catch {}

		return result;
	}

	async setKnownRepository(repos: { repoId: string; path: string }[]) {
		return this._repositories.setKnownRepository(repos);
	}

	async getBranchRemote(repoPath: string, branch: string): Promise<string | undefined> {
		try {
			const data = await git({ cwd: repoPath }, "rev-parse", "--abbrev-ref", `${branch}@{u}`);
			return data ? data.trim() : undefined;
		} catch {
			return undefined;
		}
	}

	async getBranchCommitsStatus(
		repoPath: string,
		remoteBranch: string,
		branch: string
	): Promise<string> {
		try {
			const data = +(await git(
				{ cwd: repoPath },
				"rev-list",
				`${remoteBranch}..${branch}`,
				"--count"
			));

			if (data > 0) {
				return (0 - data).toString();
			}

			const reverseData = await git(
				{ cwd: repoPath },
				"rev-list",
				`${branch}..${remoteBranch}`,
				"--count"
			);

			return reverseData.trim();
		} catch {
			return "0";
		}
	}

	async setBranchRemote(
		repoPath: string,
		remoteName: string,
		branch: string,
		throwOnError: boolean | undefined = false
	): Promise<string | undefined> {
		try {
			const data = await git({ cwd: repoPath }, "push", "-u", remoteName, branch);
			return data.trim();
		} catch (err) {
			if (throwOnError) throw err;
			return undefined;
		}
	}

	isRebasing(repoPath: string) {
		return (
			fs.existsSync(path.join(repoPath, ".git", "rebase-merge")) ||
			fs.existsSync(path.join(repoPath, ".git", "rebase-apply"))
		);
	}

	async getConfig(repoPath: string, key: string): Promise<string | undefined> {
		try {
			const data = await git({ cwd: repoPath }, "config", key);
			return data.trim();
		} catch (err) {
			Logger.warn(err);
			return undefined;
		}
	}

	async findAncestor(
		repoPath: string,
		sha: string,
		limit: number,
		predicate: (c: GitCommit) => Boolean
	): Promise<GitCommit | undefined> {
		const commitsData = await git(
			{ cwd: repoPath },
			"log",
			sha,
			`-n${limit}`,
			"--skip=1",
			`--format=${GitLogParser.defaultFormat}`,
			"--"
		);
		const commits = GitLogParser.parse(commitsData.trim(), repoPath);
		if (commits === undefined || commits.size === 0) {
			return undefined;
		}

		for (const commit of commits.values()) {
			if (predicate(commit)) {
				return commit;
			}
		}

		return undefined;
	}

	// mondo useful for prototyping ;)
	// async run(repoPath: string, command: string) {
	// 	try {
	// 		const data = await git({ cwd: repoPath }, ...command.split(" "));
	// 		return data.trim();
	// 	} catch {
	// 		return undefined;
	// 	}
	// }

	private _normalizePath(path: string): string {
		return this._gitServiceLite._normalizePath(path);
	}
}
