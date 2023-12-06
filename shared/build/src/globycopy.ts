import * as fs from "fs/promises";
import { existsSync } from "fs";
import * as path from "path";
import { convertPathToPattern, glob, isDynamicPattern } from "fast-glob";
import * as os from "os";

export type CopyFileOptions = {
	rename?: string;
	ignore?: string[];
};

// Basically extract the base directory the glob is rooted in
function clearGlobs(pattern: string): string {
	let result: string;
	if (pattern.includes("**")) {
		const parts = pattern.split("**");
		result = parts[0].slice(0, parts[0].length - 1);
	} else {
		result = pattern;
	}
	const wildcardIndex = result.indexOf("*");
	if (wildcardIndex !== -1) {
		const splitPoint = result.lastIndexOf(path.sep, wildcardIndex);
		result = result.slice(0, splitPoint);
	}
	return result;
}

async function handleRenameCopy(from: string, to: string, rename: string): Promise<void> {
	// This is not a glob thing, has to be single file copy
	if (isDynamicPattern(from)) {
		console.warn(`Skipping rename copy since from ${from} is a glob`);
		return;
	}
	// Dest has to be a directory
	if (!existsSync(to)) {
		await fs.mkdir(to, { recursive: true });
	}
	const stats = await fs.stat(to);
	if (!stats.isDirectory()) {
		console.warn(`Skipping rename copy since dest ${to} is not a directory`);
		return;
	}
	const destFile = path.join(to, rename);
	// console.log(`Copying ${from} to ${destFile} (renamed)`);
	await fs.copyFile(from, destFile);
}

export async function globycopy(
	from: string,
	to: string,
	options?: CopyFileOptions
): Promise<void> {
	if (process.platform === "win32") {
		// fast-glob expects forward slash path separator on windows
		from = convertPathToPattern(from);
		// This is never a pattern but it looks bad when from is forward slash and to is backslash
		to = convertPathToPattern(to);
	}
	if (options?.rename) {
		console.debug(`Copying with rename ${from} to ${to} (rename ${options.rename})`);
		await handleRenameCopy(from, to, options.rename);
		return;
	}
	const srcFileList = await glob(from, { dot: true, ignore: options?.ignore });
	console.debug(`Copying ${srcFileList.length} files ${from} to ${to}`);
	const fromDir = clearGlobs(from);
	await copyFiles(srcFileList, fromDir, to);
}

async function copyFiles(files: string[], fromFolder: string, toFolder: string) {
	// console.debug(`Copying ${JSON.stringify(files)} from ${fromFolder} to ${toFolder}`);
	for (const file of files) {
		const stat = await fs.lstat(file);
		if (stat.isSymbolicLink()) {
			// console.warn(`Skipping symbolic link ${file}`);
			continue;
		}
		const to = path.join(toFolder, path.relative(fromFolder, file));
		const dir = path.dirname(to);
		// console.log(`Copying ${file} to ${to}`);
		await fs.mkdir(dir, { recursive: true });
		if (stat.isFile()) {
			await fs.copyFile(file, to);
		}
	}
}

export const exportedForTesting = {
	handleRenameCopy,
	clearGlobs
};
