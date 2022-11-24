import * as fs from "fs";
import * as path from "path";

import {
	AddIgnoreFileRequest,
	AddIgnoreFileResponse,
	AddIgnoreFilesRequestType,
	IgnoreFilesRequest,
	IgnoreFilesRequestType,
	IgnoreFilesResponse,
} from "@codestream/protocols/agent";
import ignore from "ignore";


import { CodeStreamSession } from "session";
import { SessionContainer } from "../container";
import { Logger } from "../logger";
import { log, lsp, lspHandler } from "../system";

@lsp
export class IgnoreFilesManager {
	constructor(public readonly session: CodeStreamSession) {}

	@log()
	@lspHandler(IgnoreFilesRequestType)
	async getIgnoreFiles(request: IgnoreFilesRequest): Promise<IgnoreFilesResponse> {
		const { repoPath } = request;
		try {
			if (repoPath && repoPath.length) {
				const ignoreFile = this.ignoreFilePath(repoPath);
				if (!fs.existsSync(ignoreFile)) return {};

				const data = fs.readFileSync(ignoreFile, "utf8");
				Logger.debug(`Read data ${data} to ${ignoreFile}`);
				return { paths: data.trim().split("\n") };
			}
		} catch (ex) {
			Logger.error(ex);
		}
		return {};
	}

	@log()
	@lspHandler(AddIgnoreFilesRequestType)
	async addIgnoreFile(request: AddIgnoreFileRequest): Promise<AddIgnoreFileResponse> {
		const { repoPath, path } = request;
		try {
			if (repoPath && repoPath.length) {
				const ignoreFile = this.ignoreFilePath(repoPath);
				fs.appendFileSync(ignoreFile, path + "\n");
				Logger.debug(`Saved path ${path} to ${ignoreFile}`);
				return {
					success: true,
				};
			}
		} catch (ex) {
			Logger.error(ex);
		}
		return {
			success: false,
		};
	}

	private ignoreFilePath(repoPath: string): string {
		return path.join(repoPath, ".codestreamignore");
	}
}

export class IgnoreFilesHelper {
	constructor(private readonly repoPath: string) {}
	async initialize() {
		const _ignore = await this._initializeCore(this.repoPath);
		return {
			filterIgnoredFiles<T>(arr: T[], selector: (t: T) => string): T[] {
				if (!_ignore) return arr;
				if (!arr || !arr.length) return arr;

				const ignoreFiltered = _ignore.filter(arr.map(selector));
				const filtered = arr.filter(_ => ignoreFiltered.includes(selector(_)));
				return filtered;
			},
			filterIgnoredFilesByHash(hashByKey: { [fileName: string]: any }): {
				[fileName: string]: any;
			} {
				if (!_ignore || hashByKey == null) return hashByKey;

				const results: { [fileName: string]: any } = {};

				const keys = Object.keys(hashByKey);
				const ignoreFiltered = _ignore.filter(keys);

				const filtered = keys
					.filter(key => ignoreFiltered.includes(key))
					.reduce((res, key) => ((res[key] = hashByKey[key]), res), results);

				return filtered;
			},
		};
	}

	private async _initializeCore(repoPath: string): Promise<{ filter: Function } | undefined> {
		try {
			if (!repoPath) return undefined;

			const { ignoreFiles } = SessionContainer.instance();
			// read ignored files from disc
			const ignoredFilePaths = await ignoreFiles.getIgnoreFiles({
				repoPath: repoPath,
			});
			if (!ignoredFilePaths || !ignoredFilePaths.paths || !ignoredFilePaths.paths.length) {
				return undefined;
			}

			// attach the ignored files from disc to the in-memory provider
			const _ignore = ignore().add(ignoredFilePaths.paths);
			return _ignore;
		} catch (ex) {
			Logger.error(ex);
		}
		return undefined;
	}
}
