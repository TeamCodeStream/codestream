"use strict";

import GitCommit from "./GitCommit";
import Git from "nodegit";
import gitCmdLine from "../git";

export async function open(path) {
	const git = await Git.Repository.open(path);
	return new GitRepo(git);
}

const HISTORY_WALK_FETCH_SIZE = 100;

class DeltaBuilder {
	constructor(cfg) {
		this._oldFile = cfg.oldFile;
		this._newFile = cfg.newFile;
		this._edits = [];
		this._state = "sync";
		this._oldLine = 0;
		this._newLine = 0;
	}

	processLine(line) {
		const origin = line.origin();
		if (origin === Git.Diff.LINE.CONTEXT) {
			this._ctx(line);
		} else if (origin === Git.Diff.LINE.ADDITION) {
			this._add(line);
		} else if (origin === Git.Diff.LINE.DELETION) {
			this._del(line);
		}
	}

	build() {
		this._setState("sync");

		return {
			oldFile: this._oldFile,
			newFile: this._newFile,
			edits: this._edits
		};
	}

	_ctx(line) {
		this._setState("sync");
		this._oldLine = line.oldLineno();
		this._newLine = line.newLineno();
	}

	_add(line) {
		this._setState("edit");
		this._adds.push(line.content());
	}

	_del(line) {
		this._setState("edit");
		this._dels.push(line.content());
	}

	_setState(state) {
		if (state !== this._state) {
			this._state = state;
			this["_" + state]();
		}
	}

	_sync() {
		const dels = this._dels;
		const adds = this._adds;
		const delStart = this._delStart;
		const addStart = this._addStart;
		const delLength = dels.length;
		const addLength = adds.length;

		this._edits.push({
			delStart: delStart,
			addStart: addStart,
			delLength: delLength,
			addLength: addLength,
			dels: dels,
			adds: adds
		});
	}

	_edit() {
		this._delStart = this._oldLine + 1;
		this._addStart = this._newLine + 1;
		this._adds = [];
		this._dels = [];
	}
}

class GitRepo {
	constructor(git) {
		this._git = git;
	}

	async getCurrentCommit() {
		const headCommit = await this._git.getHeadCommit();
		return new GitCommit(headCommit);
	}

	async getCommit(hash) {
		try {
			const commit = await this._git.getCommit(hash);
			return new GitCommit(commit);
		} catch (err) {
			try {
				await gitCmdLine(["fetch", "origin"], {
					cwd: this._git.path()
				});
				const commit = await this._git.getCommit(hash);
				return new GitCommit(commit);
			} catch (err) {
				console.warn(`Commit ${hash} not found`);
			}
		}
	}

	async getDeltasBetweenCommits(oldCommit, newCommit, filePath) {
		const oldTree = await oldCommit._commit.getTree();
		const newTree = await newCommit._commit.getTree();
		const opts = {
			pathspec: [filePath]
		};
		const diff = await Git.Diff.treeToTree(this._git, oldTree, newTree, opts);
		return await this._buildDeltasFromDiffs([diff]);
	}

	async getBlobForCommittedFile(filePath) {
		const headCommit = await this.getCurrentCommit();
		const tree = await headCommit.getTree();
		const treeEntry = await tree.entryByPath(filePath);
		const blob = await this._git.getBlob(treeEntry.sha());

		return blob;
	}

	async getDeltaForUncommittedChanges(filePath, text) {
		const committedBlob = await this.getBlobForCommittedFile(filePath);
		const diffOptions = new Git.DiffOptions();
		const patch = await Git.Patch.fromBlobAndBuffer(
			committedBlob,
			filePath,
			text,
			text.length,
			filePath,
			diffOptions
		);

		return await this._buildDeltaFromPatch(patch, filePath);
	}

	async getDeltas(commit) {
		const diffs = await commit._commit.getDiff();
		const deltas = await this._buildDeltasFromDiffs(diffs);
		return deltas;
	}

	async _buildDeltasFromDiffs(diffs) {
		const deltas = [];

		for (const diff of diffs) {
			await diff.findSimilar({
				flags: Git.Diff.FIND.RENAMES
			});
			const patches = await diff.patches();
			for (const patch of patches) {
				const builder = new DeltaBuilder({
					oldFile: patch.oldFile().path(),
					newFile: patch.newFile().path()
				});
				const hunks = await patch.hunks();
				for (const hunk of hunks) {
					const lines = await hunk.lines();
					for (const line of lines) {
						builder.processLine(line);
					}
				}
				deltas.push(builder.build());
			}
		}

		return deltas;
	}

	async _buildDeltaFromPatch(patch, filePath) {
		const builder = new DeltaBuilder({
			oldFile: filePath,
			newFile: filePath
		});

		const numHunks = patch.numHunks();
		for (let h = 0; h < numHunks; h++) {
			const numLinesInHunk = patch.numLinesInHunk(h);
			for (let l = 0; l < numLinesInHunk; l++) {
				const line = await patch.getLineInHunk(h, l);
				builder.processLine(line);
			}
		}

		return builder.build();
	}

	async getCommitHistoryForFile(filePath, maxHistorySize) {
		const me = this;
		const git = me._git;
		const headCommit = await git.getHeadCommit();

		const walker = git.createRevWalk();
		walker.push(headCommit.sha());
		walker.sorting(Git.Revwalk.SORT.TIME);
		const commitsToWalk = await walker.fileHistoryWalk(filePath, HISTORY_WALK_FETCH_SIZE);
		const commitHistory = await me._compileHistory(commitsToWalk, filePath, [], maxHistorySize);

		const result = [];
		for (const entry of commitHistory) {
			const gitCommit = await me.getCommit(entry.commit.sha());
			result.push(gitCommit);
		}

		return result;
	}

	async _compileHistory(commitsToWalk, filePath, commitHistory, maxHistorySize) {
		const git = this._git;

		let lastSha;
		if (commitHistory.length > 0) {
			lastSha = commitHistory[commitHistory.length - 1].commit.sha();
			if (commitsToWalk.length == 1 && commitsToWalk[0].commit.sha() == lastSha) {
				return commitHistory;
			}
		}

		const missingHistorySize = maxHistorySize - commitHistory.length;
		commitHistory = commitHistory.concat(commitsToWalk.slice(0, missingHistorySize));
		if (!commitHistory.length || commitHistory.length === maxHistorySize) {
			return commitHistory;
		}

		lastSha = commitHistory[commitHistory.length - 1].commit.sha();

		const walker = git.createRevWalk();
		walker.push(lastSha);
		walker.sorting(Git.Revwalk.SORT.TIME);

		commitsToWalk = await walker.fileHistoryWalk(filePath, HISTORY_WALK_FETCH_SIZE);
		return await this._compileHistory(commitsToWalk, filePath, commitHistory, maxHistorySize);
	}
}

export default GitRepo;
