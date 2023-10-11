import * as fs from "fs";
import * as path from "path";

export function removeSymlinks(baseDir: string) {
	let protocolPath = path.resolve(baseDir, "src/protocols");

	removeSymlink(
		path.resolve(protocolPath, "agent"),
		"Ensuring extension symlink to the agent protocol folder..."
	);

	removeSymlink(
		path.resolve(protocolPath, "webview"),
		"Ensuring extension symlink to the webview protocol folder..."
	);

	//protocolPath = path.resolve(baseDir, "../shared/webviews/sidebar/protocols");
	protocolPath = path.resolve(baseDir, "../shared/ui/protocols");
	if (!fs.existsSync(protocolPath)) {
		fs.mkdirSync(protocolPath);
	}

	removeSymlink(
		path.resolve(protocolPath, "agent"),
		"Ensuring webview symlink to the agent protocol folder..."
	);
}

function removeSymlink(target: string, msg: string) {
	try {
		if (fs.existsSync(target)) {
			fs.unlinkSync(target);
			console.log(`Removed symlink ${target} ${msg}`);
		}
	} catch (ex) {
		console.error("Error unlinking ${target}", ex);
	}
}
