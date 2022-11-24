"use strict";
import * as fs from "fs";
import * as path from "path";

import { Iterables } from "@codestream/utils/system/iterable";
import { TernarySearchTree } from "@codestream/utils/system/searchTree";
import { WorkspaceFolder, WorkspaceFoldersChangeEvent } from "vscode-languageserver";
import { URI } from "vscode-uri";

import { Logger } from "../logger";
import { CodeStreamSession } from "../session";
import { Objects, Strings } from "../system";
import { GitRepository } from "./gitService";
import { GitServiceLite } from "./gitServiceLite";
import { isWindows } from "./shell";

export class RepositoryLocator {
	private readonly _repositoryTree: TernarySearchTree<GitRepository>;
	private readonly _searchPromise: Promise<GitRepository[]> | undefined;
	private _startCorePromise: Promise<any> | undefined;

	constructor(public readonly session: CodeStreamSession, private readonly _git: GitServiceLite) {
		this._repositoryTree = TernarySearchTree.forPaths();

		this._searchPromise = this.start();
	}

	get repositoryTree(): TernarySearchTree<GitRepository> {
		return this._repositoryTree;
	}

	private async start(): Promise<GitRepository[]> {
		Logger.log("RepositoryLocator.start: waiting on session.ready");
		// must wait for the agent to be ready
		await this.session.ready();
		Logger.log("RepositoryLocator.start: starting startCore");
		return this.startCore();
	}

	async startCore(): Promise<GitRepository[]> {
		if (this._startCorePromise !== undefined) {
			Logger.log("startCore: existing promise found - awaiting its completion");
			await this._startCorePromise;
			this._startCorePromise = undefined;
		}

		let allAddedRepositories: GitRepository[] = [];
		Logger.log("startCore: initializing promise");
		this._startCorePromise = new Promise(async (resolve, reject) => {
			try {
				const e = {
					added: await this.session.getWorkspaceFolders(),
					removed: [],
				} as WorkspaceFoldersChangeEvent;

				Logger.log(`startCore: Starting repository search in ${e.added.length} folders`);

				for (const folder of e.added) {
					if (URI.parse(folder.uri).scheme !== "file") {
						Logger.log(`startCore: skipping unsupported folder ${folder.uri}`);
						continue;
					}

					// Search for and add all repositories (nested and/or submodules)
					const repositories = await this.repositorySearch(
						folder,
						this.session.workspace,
						true,
						true
					);

					Logger.log(`startCore: found ${repositories.length} repositories in ${folder.uri}`);
					allAddedRepositories = [...allAddedRepositories, ...repositories];
				}

				Logger.log(`startCore: processed ${allAddedRepositories.length} repositories`);
				for (const r of allAddedRepositories) {
					this._repositoryTree.set(r.path, r);
				}

				Logger.log(`startCore: resolving true`);
				resolve(true);
			} catch (e) {
				Logger.error(e);
				reject(e);
			}
		});

		return this._startCorePromise;
	}

	async getRepos() {
		if (this._startCorePromise !== undefined) {
			Logger.log("startCore: existing promise found - awaiting");
			await this._startCorePromise;
			Logger.log("startCore: existing promise found - done");
			this._startCorePromise = undefined;
		}

		return Array.from(this._repositoryTree.values());
	}

	async getKnownCommitHashesForRepos(): Promise<{ [path: string]: string[] }> {
		const repos = await this.getRepos();
		const results: { [path: string]: string[] } = {};
		for (const repo of repos) {
			results[repo.path] = await this._git.getKnownCommitHashes(repo.path);
		}
		return results;
	}

	async repositorySearch(
		folder: WorkspaceFolder,
		workspace: any = null,
		initializing = false,
		isInWorkspace = false
	): Promise<GitRepository[]> {
		// const workspace = this.session.workspace;
		const folderUri = URI.parse(folder.uri);

		// TODO: Make this configurable
		const depth = 2;
		// configuration.get<number>(
		// 	configuration.name("advanced")("repositorySearchDepth").value,
		// 	folderUri
		// );

		Logger.log(
			`repositorySearch: Searching for repositories (depth=${depth}) in '${folderUri.fsPath}' initializing=${initializing} isInWorkspace=${isInWorkspace}...`
		);

		const start = process.hrtime();

		const repositories: GitRepository[] = [];

		let rootPath;
		try {
			rootPath = await this._git.getRepoRoot(folderUri.fsPath);
		} catch {}
		if (rootPath) {
			Logger.log(`repositorySearch: Repository found in '${rootPath}'`);
			const repo = new GitRepository(rootPath, true, folder);
			repositories.push(repo);
		}

		if (depth <= 0) {
			Logger.log(
				`repositorySearch: Searching for repositories (depth=${depth}) in '${
					folderUri.fsPath
				}' took ${Strings.getDurationMilliseconds(start)} ms`
			);

			return repositories;
		}

		let excludes: { [key: string]: boolean } = Object.create(null);
		if (workspace && this.session.agent.supportsConfiguration) {
			// Get any specified excludes -- this is a total hack, but works for some simple cases and something is better than nothing :)
			const [files, search] = await workspace.getConfiguration([
				{
					section: "files.exclude",
					scopeUri: folderUri.toString(),
				},
				{
					section: "search.exclude",
					scopeUri: folderUri.toString(),
				},
			]);

			excludes = {
				...(files || {}),
				...(search || {}),
			};

			const excludedPaths = [
				...Iterables.filterMap(Objects.entries(excludes), ([key, value]) => {
					if (!value) return undefined;
					if (key.startsWith("**/")) return key.substring(3);
					return key;
				}),
			];

			excludes = excludedPaths.reduce((accumulator, current) => {
				accumulator[current] = true;
				return accumulator;
			}, Object.create(null) as any);
		}

		let paths;
		try {
			paths = await this.repositorySearchCore(folderUri.fsPath, depth, excludes);
		} catch (ex) {
			if (
				/no such file or directory/i.test(ex.message || "") ||
				/EPERM: operation not permitted, scandir/i.test(ex.message || "")
			) {
				Logger.log(
					`repositorySearch: Searching for repositories (depth=${depth}) in '${
						folderUri.fsPath
					}' FAILED${ex.message ? ` (${ex.message})` : ""}`
				);
			} else {
				Logger.error(
					ex,
					`repositorySearch: Searching for repositories (depth=${depth}) in '${folderUri.fsPath}' FAILED`
				);
			}

			return repositories;
		}

		for (let p of paths) {
			p = path.dirname(p);
			// If we are the same as the root, skip it
			if (Strings.normalizePath(p, isWindows) === rootPath) continue;

			let rp;
			try {
				rp = await this._git.getRepoRoot(p);
			} catch {}
			if (!rp) continue;

			Logger.log(`repositorySearch: Repository found in '${rp}'`);
			const repo = new GitRepository(rp, false, folder);
			repositories.push(repo);
		}

		Logger.log(
			`repositorySearch: Searching for repositories (depth=${depth}) in '${
				folderUri.fsPath
			}' took ${Strings.getDurationMilliseconds(start)} ms`
		);

		return repositories;
	}

	private async repositorySearchCore(
		root: string,
		depth: number,
		excludes: { [key: string]: boolean },
		repositories: string[] = []
	): Promise<string[]> {
		return new Promise<string[]>((resolve, reject) => {
			fs.readdir(root, async (err, files) => {
				if (err != null) {
					reject(err);
					return;
				}

				if (files.length === 0) {
					resolve(repositories);
					return;
				}

				const folders: string[] = [];

				const promises = files.map(file => {
					const fullPath = path.resolve(root, file);

					return new Promise<void>((res, rej) => {
						fs.stat(fullPath, (err, stat) => {
							if (file === ".git") {
								repositories.push(fullPath);
							} else if (
								err == null &&
								excludes[file] !== true &&
								stat != null &&
								stat.isDirectory()
							) {
								folders.push(fullPath);
							}

							res();
						});
					});
				});

				await Promise.all(promises);

				if (depth-- > 0) {
					for (const folder of folders) {
						try {
							await this.repositorySearchCore(folder, depth, excludes, repositories);
						} catch (ex) {
							reject(ex);
							return;
						}
					}
				}

				resolve(repositories);
			});
		});
	}
}
