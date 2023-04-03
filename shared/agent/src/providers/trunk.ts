import {
	CheckTrunkRequest,
	CheckTrunkRequestType,
	CheckTrunkResponse,
	ThirdPartyProviderConfig,
} from "@codestream/protocols/agent";
import { log, lspHandler, lspProvider } from "../system";
import path from "path";
import fs from "fs";
import https from "https";
import { ThirdPartyProviderBase } from "providers/thirdPartyProviderBase";
import { exec } from "child_process";
import { promisify } from "util";
import { CodeStreamSession } from "session";
import { TrunkCheckResults } from "../../../util/src/protocol/agent/agent.protocol.trunk";

export const execAsync = promisify(exec);

@lspProvider("trunk")
export class TrunkProvider extends ThirdPartyProviderBase {
	constructor(
		public readonly session: CodeStreamSession,
		protected readonly providerConfig: ThirdPartyProviderConfig
	) {
		super(session, providerConfig);
	}

	get headers(): { [key: string]: string } {
		throw new Error("Method not implemented.");
	}

	get displayName() {
		return "Trunk.io";
	}

	get name() {
		return "trunk";
	}

	@lspHandler(CheckTrunkRequestType)
	@log()
	async checkRepo(request: CheckTrunkRequest): Promise<CheckTrunkResponse> {
		try {
			let outDirectory: string = "";
			let fullyQualifiedExecutable: string = "";

			// try to figure out where to download trunk
			if (process.env.XDG_CACHE_HOME) {
				outDirectory = path.resolve(process.env.XDG_CACHE_HOME, ".cache", "trunk", "launcher");
				fs.mkdirSync(outDirectory, { recursive: true });
				fullyQualifiedExecutable = path.join(outDirectory, "trunk");
			} else if (process.env.HOME) {
				outDirectory = path.resolve(process.env.HOME, ".cache", "trunk", "launcher");
				fs.mkdirSync(outDirectory, { recursive: true });
				fullyQualifiedExecutable = path.join(outDirectory, "trunk");
			} else {
				fullyQualifiedExecutable = path.resolve(request.cwd, "trunk");
			}

			const fullyQualifiedTrunkPath = path.resolve(request.cwd, ".trunk");
			const fullyQualifiedTrunkConfigurationFile = path.join(fullyQualifiedTrunkPath, "trunk.yaml");
			const fullyQualifiedOutputStateFile = path.join(
				fullyQualifiedTrunkPath,
				"codestream-state.json"
			);

			//now actually try and download it
			if (!fs.existsSync(fullyQualifiedExecutable)) {
				await new Promise((resolve, error) => {
					https.get("https://trunk.io/releases/trunk", resp => {
						const writeStream = fs.createWriteStream(fullyQualifiedExecutable);
						resp.pipe(writeStream);
						writeStream.on("finish", () => {
							writeStream.close();
							resolve(fullyQualifiedExecutable);
						});
					});
				});

				// need to be user execute permission
				fs.chmodSync(fullyQualifiedExecutable, 0o755);
			}

			// init the repo
			if (!fs.existsSync(fullyQualifiedTrunkConfigurationFile)) {
				await execAsync(`${fullyQualifiedExecutable} init -n --no-progress`, {
					cwd: request.cwd,
				});
			}

			// run the actual check - or re-check if requested
			if (request.forceCheck || !fs.existsSync(fullyQualifiedOutputStateFile)) {
				try {
					await execAsync(
						`${fullyQualifiedExecutable} check --all --no-fix --output-file="${fullyQualifiedOutputStateFile}" --no-progress`,
						{
							cwd: request.cwd,
						}
					);
				} catch (error) {
					// I *believe* this is erroring because one of the linters is failing
					// which is okay. Unfortunately, not sure how to trap that *specific*
					// exception, so this may catch stuff we don't want it to
				}
			}

			if (!fs.existsSync(fullyQualifiedOutputStateFile)) {
				throw Error(`Output State File Not Found - '${fullyQualifiedOutputStateFile}'`);
			}

			// parse the output and toss it back to the UI
			const output = fs.readFileSync(fullyQualifiedOutputStateFile, "utf8");
			const results = JSON.parse(output) as TrunkCheckResults;

			return {
				results,
			};
		} catch (error) {
			throw new Error(`Exception thrown attempting to check repo with Trunk: ${error.message}`);
		}
	}
}
