import * as fs from "fs";
import * as path from "path";
import { Args } from "./esbuildCommon";

export function createSymlinks(baseDir: string, args: Args) {
	let protocolPath = path.resolve(baseDir, "src/protocols");
	if (!fs.existsSync(protocolPath)) {
		console.warn("Creating protocol folder...");
		fs.mkdirSync(protocolPath);
	}

	console.log("Ensuring extension symlink to the agent protocol folder...");
	createFolderSymlinkSync(
		path.resolve(baseDir, "../shared/agent/src/protocol"),
		path.resolve(protocolPath, "agent"),
		args
	);

	console.log("Ensuring extension symlink to the webview protocol folder...");
	createFolderSymlinkSync(
		path.resolve(baseDir, "../shared/ui/ipc"),
		path.resolve(protocolPath, "webview"),
		args
	);

	protocolPath = path.resolve(baseDir, "../shared/ui/protocols");
	if (!fs.existsSync(protocolPath)) {
		fs.mkdirSync(protocolPath);
	}

	console.log("Ensuring webview symlink to the agent protocol folder...");
	createFolderSymlinkSync(
		path.resolve(baseDir, "../shared/agent/src/protocol"),
		path.resolve(protocolPath, "agent"),
		args
	);
}

function createFolderSymlinkSync(source: string, target: string, args: Args) {
	if (args.reset) {
		console.log("Unlinking symlink... (env.reset)");
		try {
			fs.unlinkSync(target);
		} catch (ex) {}
	} else if (fs.existsSync(target)) {
		return;
	}

	console.log("Creating symlink...", source, target);
	try {
		fs.symlinkSync(source, target, "dir");
	} catch (ex) {
		console.log(`Symlink creation failed; ${ex}`);
		try {
			fs.unlinkSync(target);
			fs.symlinkSync(source, target, "dir");
		} catch (ex) {
			console.log(`Symlink creation failed; ${ex}`);
			console.warn("Are you running this as an administrator?");
		}
	}
	console.log("\n");
}
