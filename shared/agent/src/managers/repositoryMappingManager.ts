import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import {
	MapReposRequest,
	MapReposRequestType,
	MapReposResponse,
	NormalizeUrlRequest,
	NormalizeUrlRequestType,
	NormalizeUrlResponse,
	RepoMap,
} from "@codestream/protocols/agent";
import { URI } from "vscode-uri";

import { CodeStreamSession } from "session";
import { SessionContainer } from "../container";
import { GitRemoteParser } from "../git/parsers/remoteParser";
import { Logger } from "../logger";
import { log, lsp, lspHandler } from "../system";

interface RepoMapValue {
	paths: string[];
	defaultPath: string;
}
interface RepoMappingFile {
	version: string;
	repos: {
		[key: string]: RepoMapValue;
	};
}

@lsp
export class RepositoryMappingManager {
	constructor(public readonly session: CodeStreamSession) {}

	get fileMappingVersion() {
		return "1.0.0";
	}

	@log()
	@lspHandler(MapReposRequestType)
	async mapRepos(request: MapReposRequest): Promise<MapReposResponse | undefined> {
		const cc = Logger.getCorrelationContext();
		if (!request || !request.repos || !Object.keys(request.repos).length) {
			Logger.debug("invalid request");
			return undefined;
		}
		try {
			const dir = this.codeStreamDirectory();
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir);
			}

			const p = this.mappingFilePath();
			let parsed: RepoMappingFile | undefined = undefined;
			let isChanging;
			if (fs.existsSync(p)) {
				try {
					const data = fs.readFileSync(p, "utf8");
					if (data) {
						parsed = JSON.parse(data);
						if (parsed) {
							if (!parsed.repos) parsed.repos = {};

							isChanging = this.processRepos(parsed, request.repos);
						}
					} else {
						parsed = { repos: {}, version: this.fileMappingVersion };
						isChanging = this.processRepos(parsed, request.repos);
					}
				} catch (x) {
					Logger.error(x);
					debugger;
					return undefined;
				}
			} else {
				parsed = { repos: {}, version: this.fileMappingVersion };
				isChanging = this.processRepos(parsed, request.repos);
			}

			if (parsed && isChanging) {
				if (request.skipRepositoryIntegration) {
					if (parsed.repos && Object.keys(parsed.repos).length) {
						fs.writeFileSync(p, JSON.stringify(parsed, null, 1));
						Logger.debug(`Saved repo mapping file to ${p} (skippedRepositoryIntegration)`);
						return {
							success: true,
						};
					}
				} else {
					const foundRepos = await SessionContainer.instance().git.setKnownRepository(
						request.repos.map(_ => {
							return {
								repoId: _.repoId,
								path: URI.file(_.path).toString(),
							};
						})
					);
					let deleteCount = 0;
					if (foundRepos && Object.keys(foundRepos).length) {
						for (const repoMap of request.repos) {
							if (!foundRepos[repoMap.repoId]) {
								// wasn't found, don't include it in the mapepd data
								delete parsed.repos[repoMap.repoId];
								deleteCount++;
								Logger.debug(`Removing RepoId=${repoMap.repoId} (not found)`);
							}
						}
						if (
							deleteCount !== request.repos.length &&
							parsed.repos &&
							Object.keys(parsed.repos).length
						) {
							fs.writeFileSync(p, JSON.stringify(parsed, null, 1));
							Logger.debug(`Saved repo mapping file to ${p}`);
							return {
								success: true,
							};
						}
					}
				}
			}
			return {
				success: false,
			};
		} catch (ex) {
			Logger.error(ex);
		}
		return undefined;
	}

	async getByRepoId(repoId: string) {
		try {
			const p = this.mappingFilePath();
			if (!fs.existsSync(p)) return undefined;

			const data = fs.readFileSync(p, "utf8");
			if (!data) return undefined;

			const parsed: RepoMappingFile = JSON.parse(data);
			const repo = parsed && parsed.repos[repoId];
			if (!repo || !repo.defaultPath) return undefined;

			const foundRepos = await SessionContainer.instance().git.setKnownRepository([
				{
					repoId: repoId,
					path: URI.file(repo.defaultPath).toString(),
				},
			]);
			if (foundRepos && Object.keys(foundRepos).length && foundRepos[repoId]) {
				return repo.defaultPath;
			}
		} catch (ex) {
			Logger.error(ex);
		}
		return undefined;
	}

	async setRepoMappingData(request?: MapReposRequest) {
		try {
			if (request && request.repos && request.repos.length) {
				await this.mapRepos(request);
			}
		} catch (ex) {
			Logger.error(ex);
		}
	}

	private processRepos(repoMap: RepoMappingFile, addedRepos: RepoMap[]): boolean {
		let isChanging = false;
		for (const ar in addedRepos) {
			const addedRepo = addedRepos[ar];
			const existingRepo = repoMap.repos[addedRepo.repoId];
			// exists in data
			if (existingRepo) {
				let add = false;
				if (
					!existingRepo.paths ||
					!existingRepo.paths.length ||
					(existingRepo.paths &&
						existingRepo.paths.length &&
						existingRepo.paths.indexOf(addedRepo.path) === -1)
				) {
					add = true;
				}

				if (add && fs.existsSync(addedRepo.path)) {
					if (!existingRepo.paths || !existingRepo.paths.length) existingRepo.paths = [];

					existingRepo.paths.push(addedRepo.path);
					existingRepo.defaultPath = addedRepo.path;
					isChanging = true;
				}
			} else {
				// data there but not this repo
				repoMap.repos[addedRepo.repoId] = {
					paths: [addedRepo.path],
					defaultPath: addedRepo.path,
				};
				isChanging = true;
			}
		}
		return isChanging;
	}

	private codeStreamDirectory(): string {
		return path.join(os.homedir(), ".codestream");
	}

	private mappingFilePath(): string {
		const p = path.join(this.codeStreamDirectory(), "mappings.json");
		return p;
	}

	@log()
	@lspHandler(NormalizeUrlRequestType)
	async normalizeUrl({ url }: NormalizeUrlRequest): Promise<NormalizeUrlResponse> {
		const [, domain, path] = await GitRemoteParser.parseGitUrl(url);
		return { normalizedUrl: `${domain}/${path}` };
	}
}
