"use strict";

import { promises as fsPromises, readdirSync, readFileSync as fsReadFileSync, statSync } from "fs";
import path from "path";

import { IdentifyRepoResult, Project, RepoProjectType, ReposScm } from "../protocol/agent.protocol";
import { CodeStreamSession } from "../session";
import { lsp } from "../system/decorators/lsp";

@lsp
export class RepoIdentificationManager {
	constructor(readonly session: CodeStreamSession) {}

	async identifyRepo(repo: ReposScm): Promise<IdentifyRepoResult> {
		const files = await fsPromises.readdir(repo.path);
		if (await this.repoIsNodeJS(repo, files)) {
			return { projectType: RepoProjectType.NodeJS };
		} else if (await this.repoIsJava(repo, files)) {
			return { projectType: RepoProjectType.Java };
		} else {
			const dotNetCore = await this.repoIsDotNetCore(repo, files);
			if (dotNetCore && dotNetCore.projects && dotNetCore.projects.length) {
				return {
					projectType: RepoProjectType.DotNetCore,
					projects: dotNetCore.projects,
				};
			} else if (await this.repoIsDotNetFramework(repo, files)) {
				return { projectType: RepoProjectType.DotNetFramework };
			} else {
				return { projectType: RepoProjectType.Unknown };
			}
		}
	}

	private async repoIsNodeJS(repo: ReposScm, files: string[]): Promise<boolean> {
		for (const file of files) {
			const filePath = path.join(repo.path, file);
			const isDir = (await fsPromises.stat(filePath)).isDirectory();
			if ((isDir && file === "node_modules") || (!isDir && file === "package.json")) return true;
		}
		return false;
	}

	private async repoIsJava(repo: ReposScm, files: string[]): Promise<boolean> {
		return await this._findFileWithExtension(repo.path, ".java", files, 2, 0);
	}

	// TODO consolidate with other method
	private _getFilesRecursively(
		results: { directory: string; file: string }[] = [],
		directory: string,
		predicate: (file: string) => boolean
	) {
		const filesInDirectory = readdirSync(directory);
		for (const file of filesInDirectory) {
			const absolute = path.join(directory, file);
			if (statSync(absolute).isDirectory()) {
				this._getFilesRecursively(results, absolute, predicate);
			} else {
				if (predicate(file)) {
					results.push({ directory: directory, file: absolute });
				}
			}
		}
	}

	private async repoIsDotNetCore(
		repo: ReposScm,
		files: string[]
	): Promise<
		| {
				projects: Project[];
		  }
		| undefined
	> {
		const projectPaths: { directory: string; file: string }[] = [];
		this._getFilesRecursively(projectPaths, repo.path, f => {
			return f.endsWith(".csproj") || f.endsWith(".vbproj");
		});

		const projects: { path: string; name: string; version?: string }[] = [];
		for (const projectPath of projectPaths) {
			const contents = fsReadFileSync(projectPath.file, "utf8");
			if (contents != null) {
				const exec = new RegExp(
					/\<TargetFramework\>(net[0-9]+\.[0-9]+)\<\/TargetFramework\>/,
					"gmi"
				).exec(contents);
				if (exec && exec[1]) {
					projects.push({
						path: projectPath.directory,
						name: path.basename(projectPath.file, path.extname(projectPath.file)),
						version: exec[1],
					});
				}
			}
		}

		return { projects: projects };
	}

	private async repoIsDotNetFramework(repo: ReposScm, files: string[]): Promise<boolean> {
		const projectFileName = files.find(file =>
			file.endsWith(".csproj" || file.endsWith(".vbproj"))
		);

		if (projectFileName) {
			const contents = fsReadFileSync(path.join(repo.path, projectFileName), "utf8");
			return (
				contents != null &&
				new RegExp(/\<TargetFrameworkVersion\>v(.+)+\<\/TargetFrameworkVersion\>/, "gm").test(
					contents
				)
			);
		}

		return false;
	}

	private async _findFileWithExtension(
		basePath: string,
		extension: string,
		files: string[],
		maxDepth: number,
		depth: number
	): Promise<boolean> {
		for (const file of files) {
			const filePath = path.join(basePath, file);
			const isDir = (await fsPromises.stat(filePath)).isDirectory();
			if (isDir) {
				if (depth < maxDepth) {
					const dirPath = path.join(basePath, file);
					const subFiles = await fsPromises.readdir(dirPath);
					if (
						await this._findFileWithExtension(dirPath, extension, subFiles, maxDepth, depth + 1)
					) {
						return true;
					}
				}
			} else if (path.extname(filePath) === extension) {
				return true;
			}
		}
		return false;
	}
}
