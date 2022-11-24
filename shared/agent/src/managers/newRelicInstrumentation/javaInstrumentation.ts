"use strict";

import { promises as fsPromises } from "fs";
import path from "path";

import {
	CreateNewRelicConfigFileJavaResponse,
	InstallNewRelicResponse,
} from "@codestream/protocols/agent";

import { CodeStreamSession } from "../../session";
import { execAsync, existsAsync } from "./util";

export class JavaInstrumentation {
	constructor(readonly session: CodeStreamSession) {}

	async installNewRelic(cwd: string): Promise<InstallNewRelicResponse> {
		let zipFile;
		let installDir;
		let newRelicDir;
		let success = false;
		let made = false;
		try {
			zipFile = await this._downloadNewRelic(cwd);
			const _ = await this._makeInstallDir(cwd);
			installDir = _.installDir;
			made = _.made;
			newRelicDir = path.join(installDir, "newrelic");
			if (await existsAsync(newRelicDir)) {
				throw new Error(`installation directory "${newRelicDir}" already exists`);
			}

			await this._unzipZipFile(zipFile, installDir);
			success = true;
			return {};
		} catch (error) {
			return { error: `error installing New Relic: ${error.message}` };
		} finally {
			if (zipFile) {
				await fsPromises.unlink(zipFile);
			}
			if (made && installDir && !success) {
				await fsPromises.rmdir(installDir);
			}
		}
	}

	private async _downloadNewRelic(cwd: string): Promise<string> {
		// FIXME does this work in windows???
		const zipFile = path.join(cwd, "newrelic-java.zip");
		try {
			await execAsync(
				"curl -O https://download.newrelic.com/newrelic/java-agent/newrelic-agent/current/newrelic-java.zip",
				{
					cwd,
				}
			);
			return zipFile;
		} catch (error) {
			throw new Error(`exception thrown downloading Java agent zip file: ${error.message}`);
		}
	}

	private async _makeInstallDir(cwd: string): Promise<{ installDir: string; made: boolean }> {
		let optDir;
		try {
			optDir = path.join(cwd, "opt");
			let stat;
			try {
				stat = await fsPromises.stat(optDir);
			} catch (e) {}
			if (stat && stat.isFile()) {
				throw new Error(`"${optDir}" exists and is not a directory`);
			}

			let made = false;
			if (!stat) {
				await fsPromises.mkdir(optDir);
				made = true;
			}

			return { installDir: optDir, made };
		} catch (error) {
			throw new Error(`unable to make directory "${optDir}": ${error.message}`);
		}
	}

	private async _unzipZipFile(zipFile: string, cwd: string): Promise<void> {
		try {
			await execAsync(`unzip "${zipFile}"`, { cwd });
		} catch (error) {
			throw new Error(`exception thrown unzipping zip file: ${error.message}`);
		}
	}

	async createNewRelicConfigFile(
		filePath: string,
		licenseKey: string,
		appName: string
	): Promise<CreateNewRelicConfigFileJavaResponse> {
		try {
			const configFile = path.join(filePath, "opt", "newrelic", "newrelic.yml");
			if (!(await existsAsync(configFile))) {
				return { error: `could not find default config file: ${configFile}` };
			}
			let config = await fsPromises.readFile(configFile, "utf8");
			config = config
				.replace("  license_key: '<%= license_key %>'", `  license_key: '${licenseKey}'`)
				.replace("  app_name: My Application", `  app_name: ${appName}`);

			await fsPromises.writeFile(configFile, config, { encoding: "utf8" });

			const agentJar = path.join(filePath, "opt", "newrelic", "newrelic.jar");
			return { agentJar };
		} catch (error) {
			throw new Error(`exception thrown writing config file: ${error.message}`);
		}
	}
}
