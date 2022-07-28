"use strict";
import { promises as fsPromises } from "fs";
import { uniq as _uniq } from "lodash";
import path from "path";
import {
	AddNewRelicIncludeResponse,
	CreateNewRelicConfigFileResponse,
	InstallNewRelicResponse
} from "../../protocol/agent.protocol";
import { CodeStreamSession } from "../../session";
import { execAsync, existsAsync } from "./util";

interface CandidateFiles {
	mainFile: string | null;
	indexFiles: string[];
	jsFiles: string[];
}

export class NodeJSInstrumentation {
	constructor(readonly session: CodeStreamSession) {}

	async findCandidateMainFiles(dirPath: string) {
		const files: CandidateFiles = {
			mainFile: null,
			indexFiles: [],
			jsFiles: []
		};

		const packageJson = path.join(dirPath, "package.json");
		let relativeMainFile;
		if (await existsAsync(packageJson)) {
			const json = await fsPromises.readFile(packageJson, { encoding: "utf8" });
			let data;
			try {
				data = JSON.parse(json);
			} catch (error) {}
			if (data && data.main) {
				const mainFile = path.join(dirPath, data.main);
				if (await existsAsync(mainFile)) {
					relativeMainFile = data.main;
					files.mainFile = mainFile;
				}
			}
		}

		await this._findNodeJSCandidateMainFiles(dirPath, dirPath, files, 0, 2);

		const arrayOfFiles: string[] = [];
		if (relativeMainFile) {
			arrayOfFiles.push(relativeMainFile);
		}

		return { files: _uniq([...arrayOfFiles, ...files.indexFiles, ...files.jsFiles]) };
	}

	private async _findNodeJSCandidateMainFiles(
		dirPath: string,
		mainPath: string,
		files: CandidateFiles,
		depth: number,
		maxDepth: number
	) {
		const allFiles = await fsPromises.readdir(dirPath);
		for (const file of allFiles) {
			// For demo purposes!!!
			if (!file.match(/node_modules/)) {
				const filePath = path.join(dirPath, file);
				if ((await fsPromises.stat(filePath)).isDirectory() && (!maxDepth || depth !== maxDepth)) {
					await this._findNodeJSCandidateMainFiles(filePath, mainPath, files, depth + 1, maxDepth);
				} else if (path.basename(filePath) === "index.js") {
					files.indexFiles.push(filePath.substring(mainPath.length + 1));
				} else if (path.extname(filePath) === ".js") {
					files.jsFiles.push(filePath.substring(mainPath.length + 1));
				}
			}
		}

		return files;
	}

	async installNewRelic(cwd: string): Promise<InstallNewRelicResponse> {
		try {
			await execAsync("npm install --save newrelic", {
				cwd,
				// /* This is what Colin needs to run this as a demo locally
				env: {
					PATH: `${process.env.PATH}:/Users/cstryker/dev/sandboxes/csbe/node/bin`
				}
				// */
			});
			return {};
		} catch (error) {
			return { error: `exception thrown executing npm install: ${error.message}` };
		}
	}

	async createNewRelicConfigFile(
		filePath: string,
		licenseKey: string,
		appName: string
	): Promise<CreateNewRelicConfigFileResponse> {
		try {
			const configFile = path.join(filePath, "node_modules", "newrelic", "newrelic.js");
			if (!(await existsAsync(configFile))) {
				return { error: `could not find default config file: ${configFile}` };
			}
			let config = await fsPromises.readFile(configFile, "utf8");
			config = config
				.replace("license_key: 'license key here'", `license_key: '${licenseKey}'`)
				.replace("app_name: ['My Application']", `app_name: ['${appName}']`);

			const newConfigFile = path.join(filePath, "newrelic.js");
			await fsPromises.writeFile(newConfigFile, config, { encoding: "utf8" });
			return {};
		} catch (error) {
			return { error: `exception thrown creating New Relic config file: ${error.message}` };
		}
	}

	async addNewRelicInclude(file: string, dir: string): Promise<AddNewRelicIncludeResponse> {
		try {
			const fullPath = path.join(dir, file);
			let contents = await fsPromises.readFile(fullPath, "utf8");
			contents = `require("newrelic");\n\n${contents}`;
			await fsPromises.writeFile(fullPath, contents, { encoding: "utf8" });
			return {};
		} catch (error) {
			return { error: `exception thrown writing require to file: ${error.message}` };
		}
	}
}
