import {
	ResolveStackTracePathsRequest,
	ResolveStackTracePathsResponse
} from "@codestream/protocols/agent";
import { Uri, workspace } from "vscode";
import { Logger } from "../logger";
import { isWindows } from "./agentConnection";
import path from "path";
import fs from "fs";
import { Strings } from "../system";

const jsGenericFiles = new Set(["main", "index", "app"]);

type ResolvedPath = {
	path: string;
	depth: number;
	discardedPath: string;
};

async function findNonGenericFile(
	files: (string | undefined)[],
	language?: string
): Promise<string | undefined> {
	if (language !== "javascript") {
		// only javascript for now
		return undefined;
	}
	for (const file of files) {
		if (!file) {
			continue;
		}
		const filePart = file.replace("\\", "/").substring(file.lastIndexOf("/") + 1);
		const fileWithoutExtension = filePart.substring(0, filePart.lastIndexOf("."));
		if (!jsGenericFiles.has(fileWithoutExtension)) {
			// Use FilenameIndex to filter out libraries we don't want to even think about
			const filenameMatches = await workspace.findFiles(`**/${filePart}`);
			if (filenameMatches.length > 0) {
				return file;
			}
		}
	}
	return undefined;
}

function findParentProjectPath(uri: Uri): Uri | undefined {
	let dir = path.resolve(uri.fsPath, "..");
	while (dir !== "/") {
		const isInWorkspace = workspace.getWorkspaceFolder(Uri.file(dir));
		if (isInWorkspace && fs.existsSync(path.join(dir, "package.json"))) {
			return Uri.file(dir);
		}
		dir = path.resolve(dir, "..");
	}
	return undefined;
}

function choiciest(matchingPaths: Array<string>, stackTracePathIn: string): string {
	if (matchingPaths.length === 1) {
		return matchingPaths[0];
	}
	// Root path so choose the shortest path
	if (!stackTracePathIn.startsWith("/")) {
		return matchingPaths.reduce((a, b) => (a.length < b.length ? a : b));
	}
	return matchingPaths[0];
}

export async function resolveStackTracePaths(
	e: ResolveStackTracePathsRequest
): Promise<ResolveStackTracePathsResponse> {
	try {
		const resolvedPaths: (ResolvedPath | undefined)[] = [];
		const cache: {
			[key: string]: Uri[];
		} = {};

		for (const path of e.paths) {
			if (!path) {
				resolvedPaths.push(undefined);
				continue;
			}
			const parts = Strings.normalizePath(path || "", isWindows).split("/");
			const discardedParts: string[] = [];
			let found = false;
			const filename = parts[parts.length - 1];
			const uniqueFile = await findNonGenericFile(e.paths, e.language);
			const uniqueFileFile: string | undefined = uniqueFile?.substring(
				uniqueFile.lastIndexOf("/") + 1
			);
			const uniqueFileUri = uniqueFile
				? (await workspace.findFiles(`**/${uniqueFileFile}`))?.[0]
				: undefined;
			const uniqueFileParentPath = uniqueFileUri ? findParentProjectPath(uniqueFileUri) : undefined;

			// workspace.findFiles is slow (100ms+), so do it only once per line and cache it
			const filenameMatchesResponse =
				cache[filename] || (cache[filename] = await workspace.findFiles(`**/${filename}`));
			const filenameMatches = uniqueFileParentPath
				? filenameMatchesResponse.filter(uri => {
						return uri.fsPath.startsWith(uniqueFileParentPath?.fsPath);
				  })
				: filenameMatchesResponse;

			while (!found && parts.length && filenameMatches.length) {
				const partial = parts.join("/");
				const matchingPaths = filenameMatches
					.map(_ => _.fsPath)
					.filter(_ => Strings.normalizePath(_, isWindows).endsWith(partial));

				if (matchingPaths.length === 0) {
					discardedParts.push(parts.shift()!!);
				} else {
					found = true;
					const matchingPath = choiciest(matchingPaths, partial);
					resolvedPaths.push({
						path: matchingPath,
						depth: parts.length,
						discardedPath: discardedParts.join("/")
					});
				}
			}
			if (!found) {
				resolvedPaths.push(undefined);
			}
		}

		let maxDepth = 0;
		let discardedPath = "";
		for (const resolvedPath of resolvedPaths) {
			if (resolvedPath && resolvedPath.depth > maxDepth) {
				maxDepth = resolvedPath.depth;
				discardedPath = resolvedPath.discardedPath;
			}
		}
		const filteredResolvedPaths = resolvedPaths.map(_ =>
			_?.discardedPath === discardedPath ? _ : undefined
		);

		return {
			resolvedPaths: filteredResolvedPaths.map(_ => _?.path),
			notImplemented: false
		};
	} catch (ex) {
		Logger.error(ex);
		return {
			resolvedPaths: [],
			notImplemented: false
		};
	}
}
