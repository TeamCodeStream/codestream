"use strict";

import * as childProcess from "child_process";
import * as fs from "fs";
import path from "path";

import {
	CreateNewRelicConfigFileJavaResponse,
	DidChangeProcessBufferNotificationType,
	InstallNewRelicResponse,
	Project,
} from "../../protocol/agent.protocol";
import { CodeStreamSession } from "../../session";

export class DotNetCoreInstrumentation {
	constructor(readonly session: CodeStreamSession) {}

	async installNewRelic(cwd: string): Promise<InstallNewRelicResponse> {
		// TODO assumes root -- use cwd with dotnet add;

		// This function will output the lines from the script
		// AS is runs, AND will return the full combined output
		// as well as exit code when it's done (using the callback).

		const me = this;
		return new Promise(resolve => {
			function run_script(
				command: string,
				args: string[],
				options: childProcess.SpawnOptions,
				callback: (scriptOutput: string, error: string, code: number) => void
			) {
				let scriptOutput = "";
				let error = "";
				try {
					const child = childProcess.spawn(command, args, options);

					child.stdout?.setEncoding("utf8");
					child.stdout?.on("data", function (data: any) {
						data = data.toString();
						scriptOutput += data;

						me.session.agent.sendNotification(DidChangeProcessBufferNotificationType, {
							text: data,
						});
					});

					child.stderr?.setEncoding("utf8");
					child.stderr?.on("data", function (data: any) {
						error += data.toString();
					});

					child.on("close", function (code: number) {
						callback(scriptOutput, error, code);
					});
					child.on("error", function (error: Error) {
						callback(scriptOutput, error?.message, 1);
					});
				} catch (ex) {
					callback(scriptOutput, ex?.message, 1);
				}
			}

			const isWin = /^win/.test(process.platform);

			run_script(
				"dotnet",
				["add", "package", "NewRelic.Agent"],
				{
					cwd: cwd,
					env: {
						...process.env,
						PATH: isWin ? process.env.PATH : process.env.PATH + ":/usr/local/share/dotnet/dotnet",
					},
				},
				function (output: string, error: string, exitCode: number) {
					if (error) {
						resolve({ error: error });
					} else {
						me.session.agent.sendNotification(DidChangeProcessBufferNotificationType, {
							text: "OK",
						});
						resolve({});
					}
				}
			);
		});

		// FIXME does this work in linux???
		// return new Promise(resolve => {
		// 	const commands = [
		// 		{ command: "dotnet", args: ["add", "package", "NewRelic.Agent"] },
		// 	//	{ command: "dotnet", args: ["add", "package", "NewRelic.Agent.Api"] }
		// 		// { command: "dotnet", args: ["add", "restore"] },
		// 	];

		// 	let text = "";
		// 	// fails on first error!
		// 	for (const command of commands) {
		// 		try {
		// 			const result = spawnSync(command.command, command.args, {
		// 				cwd: cwd
		// 			});

		// 			if (result.error) {
		// 				resolve({
		// 					error: `unable to execute ${command.command} with args ${command.args}: ${result.error.message}`
		// 				});
		// 			} else {
		// 				text += String(result.stdout);
		// 			}
		// 		} catch (error) {
		// 			resolve({ error: error.message });
		// 		}
		// 	}

		// 	this.session.agent.sendNotification(DidFooNotificationType, {
		// 		text: text
		// 	});

		// 	resolve({});
		// });
	}

	async createNewRelicConfigFile(
		repoPath: string,
		filePath: string,
		licenseKey: string,
		appName: string,
		project?: Project
	): Promise<CreateNewRelicConfigFileJavaResponse> {
		const startCmdPath = path.join(filePath, "NrStart.cmd");
		// TODO get path to BIN with framework version

		// net6.0 has LTS
		const version = project?.version || "net6.0";
		fs.writeFileSync(
			startCmdPath,

			`@REM this file has been automatically created by CodeStream and is ignored by git
@REM This is a script to test your New Relic integration
@REM Do not commit this file, it contains your secret New Relic license key


set CORECLR_ENABLE_PROFILING=1
set CORECLR_PROFILER={36032161-FFC0-4B61-B559-F6C5D41BAE5A}
set CORECLR_NEWRELIC_HOME=.\\bin\\Debug\\<ENTER-DOTNET-VERSION>\\newrelic
set CORECLR_PROFILER_PATH=.\\bin\\Debug\\<ENTER-DOTNET-VERSION>\\newrelic\\NewRelic.Profiler.dll
@REM The following is only needed if there is something else explicitly setting this globally elsewhere
set CORECLR_PROFILER_PATH_64=.\\bin\\Debug\\<ENTER-DOTNET-VERSION>\\newrelic\\NewRelic.Profiler.dll
set NEW_RELIC_LICENSE_KEY=<ENTER-YOUR-NEW_RELIC_LICENSE_KEY-HERE>
set NEW_RELIC_APP_NAME=<ENTER-YOUR-NEW_RELIC_APP_NAME-HERE>
dotnet run -c Debug
`
				.replace(/<ENTER-DOTNET-VERSION>/g, version)
				.replace("<ENTER-YOUR-NEW_RELIC_LICENSE_KEY-HERE>", licenseKey)
				.replace("<ENTER-YOUR-NEW_RELIC_APP_NAME-HERE>", appName),
			{ encoding: "utf8" }
		);

		try {
			// exclude this file from git since it includes a licensekey
			const gitExclude = path.join(repoPath, ".git", "info", "exclude");
			const config = fs.readFileSync(gitExclude, "utf8");
			if (config && config.indexOf("NrStart.cmd") === -1) {
				fs.appendFileSync(gitExclude, "NrStart.cmd");
			}
		} catch (error) {
			const msg = error instanceof Error ? error.message : JSON.stringify(error);
			return { error: `caught ${msg}` };
		}

		return {};
	}
}
