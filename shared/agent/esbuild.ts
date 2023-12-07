import * as path from "path";
import * as os from "os";
import * as fs from "fs-extra";

import graphqlLoaderPlugin from "@luckycatfactory/esbuild-graphql-loader";
import { BuildOptions } from "esbuild";

import { copyPlugin, CopyStuff } from "../build/src/copyPlugin";
import { commonEsbuildOptions, processArgs, startEsbuild } from "../build/src/esbuildCommon";
import { nativeNodeModulesPlugin } from "../build/src/nativeNodeModulesPlugin";
import { statsPlugin } from "../build/src/statsPlugin";
import { promisify } from "util";

const exec = promisify(require("child_process").exec);

const outputDir = path.resolve(__dirname, "dist");

let prodDepsDir: string | undefined;

function getProdDepsDir(): string {
	if (!prodDepsDir) {
		throw new Error("Could not resolve prod deps directory");
	}
	return prodDepsDir;
}

function getPostBuildCopy(): CopyStuff[] {
	return [
		{
			from: "node_modules/opn/**/xdg-open",
			to: outputDir,
		},
		{
			from: path.join(getProdDepsDir(), "node_modules/**"),
			to: path.join(outputDir, "node_modules"),
			options: { ignore: ["**/@newrelic/security-agent/**"] }, // Path too long for windows
		},
	];
}

// No need to package up the dev dependencies - copy minimal files so that `npm i --production works` and copy the
// smaller node_modules
async function installProdDeps(tmpDir: string) {
	await fs.copyFile("package.json", path.join(tmpDir, "package.json"));
	await fs.copyFile("package-lock.json", path.join(tmpDir, "package-lock.json"));
	await fs.copyFile("prepare.js", path.join(tmpDir, "prepare.js"));
	const patchDir = path.join(__dirname, "patches");
	await fs.copy(patchDir, path.join(tmpDir, "patches"));

	const currentDir = process.cwd();
	process.chdir(tmpDir);
	const { error, stdout, stderr } = await exec("npm i --omit=dev");
	if (stderr || error) {
		console.error(`stdout: ${stdout}\nstderr: ${stderr}\n ${error?.message}`);
		if (error) {
			throw new Error("Unable to npm i --production");
		}
	}
	// Remove this bizarre extra file that shows up only on linux only for --omit=dev that breaks vcse package
	const evilVile = path.join(
		tmpDir,
		"node_modules/pubnub/lib/crypto/modules/NodeCryptoModule/NodeCryptoModule.js"
	);
	if (await fs.pathExists(evilVile)) {
		console.log(`Removing evil file ${evilVile}`);
		await fs.unlink(evilVile);
	}
	console.log(stdout);
	process.chdir(currentDir);
}

(async function () {
	try {
		prodDepsDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-esbuild"));
		console.log(`Created temp dir ${prodDepsDir}`);
		await installProdDeps(prodDepsDir);
		const args = processArgs();
		const buildOptions: BuildOptions = {
			...commonEsbuildOptions(false, args),
			entryPoints: {
				agent: "./src/main.ts",
				"agent-vs-2019": "./src/main-vs-2019.ts",
			},
			// The newrelic agent doesn't support bundling.
			packages: "external",
			plugins: [
				graphqlLoaderPlugin(),
				nativeNodeModulesPlugin,
				statsPlugin,
				copyPlugin({ onEnd: getPostBuildCopy() }),
			],
			format: "cjs",
			platform: "node",
			target: "node18.15",
			outdir: outputDir,
			sourceRoot: args.ide === "vs" ? path.resolve(__dirname, "../agent/dist") : undefined,
			sourcesContent: args.mode === "development" && args.ide !== "vs",
		};

		await startEsbuild(args, buildOptions);
	} finally {
		try {
			if (prodDepsDir) {
				await fs.rm(prodDepsDir, { recursive: true });
			}
		} catch (e) {
			console.error(
				`An error has occurred while removing the temp folder at ${prodDepsDir}. Please remove it manually. Error: ${e}`
			);
		}
	}
})();
