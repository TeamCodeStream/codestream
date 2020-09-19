import * as Path from "path-browserify";

export function pathBasename(filePath: string) {
	// HACK to make path-browserify work with windows -- which is unsupported!
	// https://github.com/browserify/path-browserify/issues/1
	return Path.basename(filePath.replace(/\\/g, "/").replace(/^[a-zA-Z]:/, ""));
}

export function pathDirname(filePath: string) {
	// HACK to make path-browserify work with windows -- which is unsupported!
	// https://github.com/browserify/path-browserify/issues/1
	return Path.dirname(filePath.replace(/\\/g, "/").replace(/^[a-zA-Z]:/, ""));
}
