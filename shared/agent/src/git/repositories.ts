"use strict";
import * as chokidar from "chokidar";
import * as fs from "fs";
import * as path from "path";
import {
	CommitsChangedData,
	ReportingMessageType,
	WorkspaceChangedData
} from "../protocol/agent.protocol";
import { Disposable, Emitter, Event, WorkspaceFoldersChangeEvent } from "vscode-languageserver";
import { URI } from "vscode-uri";
import { Container, SessionContainer } from "../container";
import { Logger, TraceLevel } from "../logger";
import { MatchReposRequest, RepoMap } from "../protocol/agent.protocol.repos";
import { CSRepository } from "../protocol/api.protocol";
import { CodeStreamSession } from "../session";
import { Iterables, Strings, TernarySearchTree } from "../system";
import { Disposables } from "../system/disposable";
import { GitRepository } from "./gitService";
import { RepositoryLocator } from "./repositoryLocator";

export class GitRepositories {
	private _onWorkspaceDidChange = new Emitter<WorkspaceChangedData>();
	get onWorkspaceDidChange(): Event<WorkspaceChangedData> {
		return this._onWorkspaceDidChange.event;
	}

	private _onCommitHashChanged = new Emitter<GitRepository>();
	get onCommitHashChanged(): Event<GitRepository> {
		return this._onCommitHashChanged.event;
	}

	private _onGitChanged = new Emitter<CommitsChangedData>();
	get onGitChanged(): Event<CommitsChangedData> {
		return this._onGitChanged.event;
	}

	private _disposable: Disposable | undefined;
	private readonly _repositoryTree: TernarySearchTree<GitRepository>;
	private _searchPromise: Promise<void> | undefined;
	private _syncPromise: Promise<void> | undefined;
	private _repositoryMappingSyncPromise: Promise<{ [key: string]: boolean }> | undefined;
	private _onWorkspaceFoldersChangedPromise: Promise<any> | undefined;

	constructor(
		public readonly session: CodeStreamSession,
		private readonly repoLocator: RepositoryLocator
	) {
		this._repositoryTree = repoLocator.repositoryTree;
		this._searchPromise = this.start();
	}

	dispose() {
		this._disposable && this._disposable.dispose();
	}

	async ensureSearchComplete() {
		await this._searchPromise;
	}

	async find(predicate: (repo: GitRepository) => boolean) {
		const tree = await this.getRepositoryTree();
		return Iterables.find(tree.values(), predicate);
	}

	async get(): Promise<Iterable<GitRepository>> {
		const tree = await this.getRepositoryTree();
		return tree.values();
	}

	async getById(id: string): Promise<GitRepository | undefined> {
		const tree = await this.getRepositoryTree();
		const result = Iterables.find(tree.values(), r => r.id === id);
		return result;
	}

	async getByFilePath(filePath: string): Promise<GitRepository | undefined> {
		const tree = await this.getRepositoryTree();
		let result = tree.findSubstr(filePath);
		if (!result) {
			await this.repositorySearchByDocument({
				uri: URI.file(filePath).toString()
			});
			const tree = await this.getRepositoryTree();
			result = tree.findSubstr(filePath);
		}
		return result;
	}

	async syncKnownRepositories(repos: CSRepository[]) {
		Logger.debug(`syncing KnownRepositories...`);
		const remoteToRepoMap = await this.getKnownRepositories();

		// Don't call: const tree = await this.getRepositoryTree(); because it waits on the _syncPromise

		if (this._searchPromise !== undefined) {
			await this._searchPromise;
			this._searchPromise = undefined;
		}

		const tree = this._repositoryTree;
		const reposToMap = [];
		for (const repo of tree.values()) {
			Logger.debug(`RepositoryTree repo=${repo.path} repoId=${repo.id}`);
			// TODO: Probably should update the repo even for ones that have matches, but right now we are only using the repo id
			if (repo.id === undefined) {
				await repo.searchForKnownRepository(remoteToRepoMap);
			}

			if (repo.id && repo.path) {
				const found = repos.find(_ => _.id === repo.id);
				if (found) {
					reposToMap.push({
						repoId: repo.id,
						path: repo.path
					});
				}
			}
		}
		if (reposToMap.length) {
			SessionContainer.instance().repositoryMappings.mapRepos({
				repos: reposToMap
			});
		}
	}

	private async start() {
		Logger.log("GitRepositories.start: waiting for session");
		// Wait for the session to be ready first
		await this.session.ready();
		Logger.log("GitRepositories.start: session ready");

		const disposables: Disposable[] = [
			this.session.onDidChangeRepositories(this.onRepositoriesChanged, this)
		];

		if (this.session.agent.supportsConfiguration) {
			disposables.push(
				this.session.workspace.onDidChangeWorkspaceFolders(this.onWorkspaceFoldersChanged, this)
			);
		}

		this._disposable = Disposables.from(...disposables);

		Logger.log("GitRepositories.start: returning");
		return this.onWorkspaceFoldersChanged();
	}

	async onRepositoriesChanged(repos: CSRepository[]) {
		if (this._syncPromise !== undefined) {
			await this._syncPromise;
		}

		this._syncPromise = this.syncKnownRepositories(repos);
	}

	private async onWorkspaceFoldersChanged(e?: WorkspaceFoldersChangeEvent) {
		if (this._onWorkspaceFoldersChangedPromise !== undefined) {
			Logger.log("onWorkspaceFoldersChanged: existing promise found - awaiting");
			await this._onWorkspaceFoldersChangedPromise;
			this._onWorkspaceFoldersChangedPromise = undefined;
		}

		Logger.log("onWorkspaceFoldersChanged: initializing promise");
		this._onWorkspaceFoldersChangedPromise = new Promise(async (resolve, reject) => {
			try {
				let initializing = false;
				const repoMap: RepoMap[] = [];
				let allAddedRepositories: GitRepository[] = [];
				const remoteToRepoMap = await this.getKnownRepositories();
				if (e === undefined) {
					e = {
						added: [],
						removed: []
					};
					Logger.log("onWorkspaceFoldersChanged: no event - initializing");
					initializing = true;
					const existingRepositories = await this.repoLocator.getRepos();
					const upgradedRepos = [];
					for (const existingRepo of existingRepositories) {
						// "upgrade the objects" to GitRepository with remoteToRepoMap objects
						// so we can get IDs if necessary
						const repo = await new GitRepository(
							existingRepo.path,
							existingRepo.root,
							existingRepo.folder,
							true
						).withKnownRepo(remoteToRepoMap);
						upgradedRepos.push(repo);
					}
					allAddedRepositories = [...upgradedRepos];
					// clear out the structure, since we're upgrading to GitRepos with remotes
					// we're going to add them back all in below
					this._repositoryTree.clear();
					Logger.log(
						`onWorkspaceFoldersChanged: ${upgradedRepos.length} folders added from existing repos`
					);
				} else {
					Logger.log("onWorkspaceFoldersChanged: with event");

					for (const folder of e.added) {
						if (URI.parse(folder.uri).scheme !== "file") continue;

						// Search for and add all repositories (nested and/or submodules)
						const repositories = await this.repoLocator.repositorySearch(
							folder,
							this.session.workspace,
							initializing,
							true
						);

						const repos = [];
						for (const foundRepo of repositories) {
							const repo = await new GitRepository(
								foundRepo.path,
								foundRepo.root,
								foundRepo.folder,
								true
							).withKnownRepo(remoteToRepoMap);

							repos.push(repo);
						}
						allAddedRepositories = [...repos];
					}
					Logger.log(`onWorkspaceFoldersChanged: ${e.added.length} folders added`);
				}

				// for all repositories without a CodeStream repo ID, ask the server for matches,
				// and create new CodeStream repos for any we have found that aren't known to the team
				const unassignedRepositories = allAddedRepositories.filter(repo => !repo.id);
				Logger.log(
					`onWorkspaceFoldersChanged: processing ${unassignedRepositories.length} unassigned repositories`
				);
				if (unassignedRepositories.length > 0) {
					const orderedUnassignedRepos: GitRepository[] = [];
					const repoInfo: MatchReposRequest = { repos: [] };
					const { git } = SessionContainer.instance();
					const badRemotes: any = [];
					await Promise.all(
						unassignedRepositories.map(async repo => {
							const weightedRemotes = await repo.getWeightedRemotes();
							// any bad remotes here? -- store for later
							// we've found remotes that have "/" as their normalizedUrls, and these are bad
							const badNormalizedUrls = weightedRemotes.filter(_ => _.normalizedUrl === "/");
							if (badNormalizedUrls.length) {
								badRemotes.push(badNormalizedUrls);
							}

							const remotes = weightedRemotes.map(r => r.normalizedUrl);
							const knownCommitHashes = await git.getKnownCommitHashes(repo.path);
							orderedUnassignedRepos.push(repo);
							repoInfo.repos.push({ remotes, knownCommitHashes });
						})
					);
					const repoMatches = await this.session.api.matchRepos(repoInfo);
					for (let i = 0; i < repoMatches.repos.length; i++) {
						Logger.debug(
							`onWorkspaceFoldersChanged: Git repo ${orderedUnassignedRepos[i].path} matched to ${repoMatches.repos[i].id}:${repoMatches.repos[i].name}`
						);
						orderedUnassignedRepos[i].setKnownRepository(repoMatches.repos[i]);
					}
					if (badRemotes.length) {
						try {
							Container.instance().errorReporter.reportMessage({
								type: ReportingMessageType.Error,
								source: "agent",
								message: "Bad remotes found",
								extra: {
									badRemotes: badRemotes
								}
							});
						} catch (ex) {
							Logger.warn(ex);
						}
					}
				}

				Logger.log(
					`onWorkspaceFoldersChanged: processing ${allAddedRepositories.length} added repositories`
				);
				for (const r of allAddedRepositories) {
					this._repositoryTree.set(r.path, r);
					if (initializing && r.id) {
						repoMap.push({
							repoId: r.id,
							path: r.path
						});
					}
				}

				Logger.log(`onWorkspaceFoldersChanged: processing ${e.removed.length} removed folders`);
				for (const f of e.removed) {
					// these workspace folders are using file:// schemes
					const uri = URI.parse(f.uri);
					if (uri.scheme !== "file") continue;

					const fsPath = uri.fsPath;
					let repoPath: string | undefined;
					try {
						// paths (strings) are normally using a GitRepository.path property
						// which has gone through git.getRepoRoot which has normalized the path to use
						// forward slashes
						repoPath = Strings.normalizePath(fsPath);
					} catch {}
					if (!repoPath) continue;

					const filteredTree = this._repositoryTree.findSuperstr(repoPath);
					const reposToDelete =
						filteredTree !== undefined
							? [
									...Iterables.map<[GitRepository, string], [GitRepository, string]>(
										filteredTree.entries(),
										([r, k]) => [r, r.path]
									)
							  ]
							: [];

					const repo = this._repositoryTree.get(repoPath);
					if (repo !== undefined) {
						reposToDelete.push([repo, repoPath]);
					}

					for (const [, k] of reposToDelete) {
						this._repositoryTree.delete(k);
					}
				}

				SessionContainer.instance().repositoryMappings.setRepoMappingData({
					repos: repoMap,
					skipRepositoryIntegration: true
				});

				Logger.log(`onWorkspaceFoldersChanged: monitoring repositories`);
				await this.monitorRepos();
				if (!initializing) {
					// Defer the event trigger enough to let everything unwind
					setImmediate(() => this._onWorkspaceDidChange.fire({}));
				}

				Logger.log(`onWorkspaceFoldersChanged: resolving`);
				resolve(true);
			} catch (e) {
				Logger.error(e);
				reject(e);
			}
		});
	}

	async setKnownRepository(
		repos: { repoId: string; path: string }[]
	): Promise<{ [key: string]: boolean } | undefined> {
		if (!repos || !repos.length) return undefined;

		if (this._repositoryMappingSyncPromise !== undefined) {
			await this._repositoryMappingSyncPromise;
			this._repositoryMappingSyncPromise = undefined;
		}

		this._repositoryMappingSyncPromise = this.setKnownRepositoryCore(repos);
		return await this._repositoryMappingSyncPromise;
	}

	async setKnownRepositoryCore(
		repos: { repoId: string; path: string }[]
	): Promise<{ [key: string]: boolean }> {
		const found: { [key: string]: boolean } = {};
		const remoteToRepoMap = await this.getKnownRepositories();

		for (const r in repos) {
			const repo = repos[r];

			const repositories = await this.repoLocator.repositorySearch({
				uri: repo.path,
				name: path.basename(repo.path)
			});

			const reposWithIds: GitRepository[] = [];
			for (const foundRepo of repositories) {
				const repoWithId = await new GitRepository(
					foundRepo.path,
					foundRepo.root,
					foundRepo.folder,
					false
				).withKnownRepo(remoteToRepoMap);
				reposWithIds.push(repoWithId);
			}

			Logger.debug(
				`setKnownRepositoryCore: repositorySearch found ${
					reposWithIds.length
				} repos (${reposWithIds?.map(_ => _.path)})`
			);

			for (const r of reposWithIds) {
				if (!r.id) {
					Logger.debug(`setKnownRepositoryCore: Skipping ${r.path} (no id)`);
					continue;
				}

				this._repositoryTree.set(r.path, r);
				found[r.id] = true;
				Logger.debug(`setKnownRepositoryCore: Added ${r.path} id=${r.id}`);
			}
		}
		return found;
	}

	private async repositorySearchByDocument(document: { uri: string }) {
		const dir = path.dirname(document.uri.toString());
		Logger.log(`repositorySearchByDocument: Starting repository search by file in ${dir} folder`);
		let found;
		if (URI.parse(document.uri).scheme === "file") {
			// Search for and add all repositories (nested and/or submodules)
			const repositories = await this.repoLocator.repositorySearch({
				uri: dir,
				name: path.basename(document.uri)
			});

			Logger.log(
				`repositorySearchByDocument: repositorySearch found ${
					repositories.length
				} repos (${repositories?.map(_ => _.path)})`
			);
			found = repositories && repositories.length;
			for (const r of repositories) {
				this._repositoryTree.set(r.path, r);
			}
		}
		if (found) {
			await this.monitorRepos();
		}
	}

	/**
	 * Collection of repo paths to an array of relative branch path refs
	 * This is used to dynamically add watchers
	 */
	private _dynamicRefsByRepo = new Map<string, string[]>();
	/**
	 * File watchers, could be an fs.FSWatcher or chokidar.FSWatcher
	 */
	private _monitors: { dispose(): Promise<void> }[] = [];
	/**
	 * Creates file/directory watchers for the git repos in this workspace
	 */
	private async monitorRepos() {
		for (const monitor of this._monitors) {
			await monitor.dispose();
		}
		this._monitors = [];

		const { git } = SessionContainer.instance();

		const repos = this._repositoryTree.values();
		for (const repo of repos) {
			// try watching .git/logs/HEAD first as it's more important that
			// the others paths below
			try {
				const logFile = path.join(repo.path, ".git", "logs", "HEAD");
				const watcher = fs.watch(logFile, () => {
					this._onCommitHashChanged.fire(repo);
				});
				this._monitors.push({
					dispose() {
						watcher.close();
						return Promise.resolve();
					}
				});
			} catch (err) {
				Logger.error(err);
			}

			try {
				/**
				 *  Portions adapted from https://github.com/eamodio/vscode-gitlens/blob/e2a6ae1317ce348985314e18c3d5ed257f0ef357/src/git/models/repository.ts#L133 which carries this notice:
				 * 	The MIT License (MIT)

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
				// FETCH_HEAD can also be modified with other git commands, creating an infinite loop, watch out!

				/**
				 * Instead of watching all the paths below AND all heads/remotes (which could be huge)
				 * we will only list to the default set below as well as the current local branch (and its remote if it exists)
				 *
				 * As the user creates branches or pushes local branches, we will dynamically watch those
				 * new paths in a just-in-time manner. This is done to eliminate any wholesale watching
				 * of ref/heads and/or ref/remotes. In turn, this should greatly reduce the # of
				 * file system watchers needed.
				 *
				 */

				const watchPaths = [
					".git/config",
					".git/index",
					".git/HEAD",
					".git/refs/stash",
					".gitignore"
				];
				// try to add the current branch and its remote version (if any)
				const currentGitBranch = await git.getCurrentBranch(repo.path);
				let currentGitBranchRemote;
				if (currentGitBranch) {
					watchPaths.push(`.git/refs/heads/${currentGitBranch}`);
					currentGitBranchRemote = await git.getBranchRemote(repo.path, currentGitBranch);
					if (currentGitBranchRemote) {
						watchPaths.push(`.git/refs/remotes/${currentGitBranchRemote}`);
					}
				}
				const mappedWatchPaths = watchPaths.map(_ => path.join(repo.path, _));
				const watcher = chokidar
					.watch(mappedWatchPaths, {
						// don't allow chokidar watcher to fire changes on initialization
						// (fires lots of `add` and `addDir` events that we do not need
						// as they can cause extensions to overload their ipc message queues)
						ignoreInitial: true
					})
					.on("ready", () => {
						if (Logger.level === TraceLevel.Debug) {
							const watched = watcher.getWatched();
							Logger.debug(`git path watch: (initial) ${JSON.stringify(watched, null, 4)}`);
						}
					})
					.on("error", error => Logger.error(error, 'git path watch: on("error")'))
					.on("all", async (eventName: string, path1: string /*, stats: fs.Stats | undefined*/) => {
						Logger.debug(`git path watch: on("all"): ${eventName}:${path1}`);
						try {
							if (Logger.level === TraceLevel.Debug) {
								Logger.debug(
									`git path watch: total paths for ${repo.path} ${JSON.stringify(
										this._dynamicRefsByRepo.get(repo.path)
									)}`
								);
								// this is flaky:
								// https://github.com/paulmillr/chokidar/issues/542
								// const watched = watcher.getWatched();
								// Logger.debug(`git path watch: (latest) ${JSON.stringify(watched, null, 4)}`);
							}
						} catch (ex) {
							Logger.error(ex, "git path watch: failed to log watched items");
						}

						this._onGitChanged.fire({
							type: eventName,
							path: path1,
							repo: {
								id: repo.id,
								normalizedPath: repo.normalizedPath,
								path: repo.path
							}
						} as CommitsChangedData);

						if (eventName === "change") {
							let pathsToAdd: string[] = [];
							try {
								const currentGitBranch = await git.getCurrentBranch(repo.path);
								if (!currentGitBranch) return;

								const currentGitBranchRemote = await git.getBranchRemote(
									repo.path,
									currentGitBranch
								);

								let dynamicRefs = this._dynamicRefsByRepo.get(repo.path);
								if (!dynamicRefs || dynamicRefs == null) {
									// if there are no dynamic refs for this repo
									// initialize it with empty
									this._dynamicRefsByRepo.set(repo.path, []);
									// then assign the local variable
									dynamicRefs = this._dynamicRefsByRepo.get(repo.path)!;
								}
								// skip if we already have the local branch AND
								// there isn't a remote OR there is, and it's already tracked
								if (
									dynamicRefs.indexOf(".git/refs/heads/" + currentGitBranch) > -1 &&
									(!currentGitBranchRemote ||
										(currentGitBranchRemote &&
											dynamicRefs.indexOf(".git/refs/remotes/" + currentGitBranchRemote))) > -1
								) {
									return;
								}
								// add the local branch AND the remote ref, if we have one
								pathsToAdd = [`.git/refs/heads/${currentGitBranch}`];
								if (currentGitBranchRemote) {
									pathsToAdd.push(`.git/refs/remotes/${currentGitBranchRemote}`);
								}
								Logger.debug(`git path watch: adding ${pathsToAdd.length} paths...`);

								// using a Set for unique-ness
								this._dynamicRefsByRepo.set(repo.path, [
									...new Set([...dynamicRefs, ...pathsToAdd])
								]);

								// watched paths are de-duped by chokidar
								const watchedPaths = pathsToAdd.map(_ => path.join(repo.path, _));
								watcher.add(watchedPaths);
								// https://github.com/paulmillr/chokidar/issues/542
								// const watched = watcher.getWatched();
							} catch (err) {
								Logger.error(err, `git path watch: error, toAdd=${pathsToAdd}`);
							}
						}
					});

				this._monitors.push({
					dispose() {
						return watcher.close();
					}
				});
			} catch (err) {
				Logger.error(err);
			}
		}
	}

	private async getKnownRepositories() {
		const resp = await SessionContainer.instance().repos.get();
		const remotesToRepo = Iterables.flatMap(
			resp.repos,
			r =>
				r.remotes !== undefined && r.remotes.length !== 0
					? r.remotes.map<[string, CSRepository]>(remote => [remote.normalizedUrl, r])
					: ([[(r as any).normalizedUrl as string, r]] as [string, CSRepository][])
			// r => r.remotes !== undefined && r.remotes.length !== 0
		);
		return new Map<string, CSRepository>(remotesToRepo);
	}

	private async getRepositoryTree(): Promise<TernarySearchTree<GitRepository>> {
		if (this._searchPromise !== undefined) {
			Logger.debug("Repositories: waiting on _searchPromise");
			await this._searchPromise;
			this._searchPromise = undefined;
			Logger.debug("Repositories: waiting on _searchPromise complete");
		}

		if (this._syncPromise !== undefined) {
			Logger.debug("Repositories: waiting on _syncPromise");
			await this._syncPromise;
			this._syncPromise = undefined;
			Logger.debug("Repositories: waiting on _syncPromise complete");
		}

		if (this._repositoryMappingSyncPromise !== undefined) {
			Logger.debug("Repositories: waiting on _repositoryMappingSyncPromise");
			await this._repositoryMappingSyncPromise;
			this._repositoryMappingSyncPromise = undefined;
			Logger.debug("Repositories: waiting on _repositoryMappingSyncPromise complete");
		}

		if (this._onWorkspaceFoldersChangedPromise !== undefined) {
			Logger.debug("Repositories: waiting on _onWorkspaceFoldersChangedPromise");
			await this._onWorkspaceFoldersChangedPromise;
			this._onWorkspaceFoldersChangedPromise = undefined;
			Logger.debug("Repositories: waiting on _onWorkspaceFoldersChangedPromise complete");
		}

		return this._repositoryTree;
	}
}
