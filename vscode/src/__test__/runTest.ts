import { resolve } from "path";
// import * as cp from "child_process";

import {
	// downloadAndUnzipVSCode,
	// resolveCliPathFromVSCodeExecutablePath,
	runTests
} from "@vscode/test-electron";

async function main() {
	try {
		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		const extensionDevelopmentPath = resolve(__dirname, "../../../../");

		// The path to test runner
		// Passed to --extensionTestsPath
		const extensionTestsPath = resolve(__dirname, "./suite/index");

		// === python test start

		// Use cp.spawn / cp.exec for custom setup
		// cp.spawnSync(
		// 	resolveCliPathFromVSCodeExecutablePath(await downloadAndUnzipVSCode("1.63.2")),
		// 	["--install-extension", "ms-python.vscode-pylance"],
		// 	{
		// 		encoding: "utf-8",
		// 		stdio: "inherit"
		// 	}
		// );

		const testWorkspace = resolve(__dirname, "../../../../test-projects/codestream.code-workspace");
		console.warn(`\ntesting in ${testWorkspace}\n`);

		// Download VS Code, unzip it and run the integration test
		await runTests({
			version: "1.69.2",
			extensionDevelopmentPath,
			extensionTestsPath,
			launchArgs: [
				testWorkspace
				// we don't want to disable extensions, but this is how we can do it
				// , "--disable-extensions"
			]
		});
		// === python test end
	} catch (err) {
		console.error("Failed to run tests", err);
		process.exit(1);
	}
}

main();
