"use strict";

import * as fs from "fs";
import path from "path";

import { DirectoryTree } from "@codestream/protocols/agent";
import writeAtomic from "write-file-atomic";

export namespace xfs {
	export async function readText(srcPath: string) {
		return new Promise<string | undefined>((resolve, reject) => {
			fs.readFile(srcPath, "utf8", (err, data) => {
				if (err) {
					resolve(undefined);
				} else {
					resolve(data.toString());
				}
			});
		});
	}

	export async function writeTextAtomic(text: any, destPath: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			writeAtomic(destPath, text, err => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}

	export async function readJson(srcPath: string): Promise<string | undefined> {
		const data = await xfs.readText(srcPath);
		return data ? JSON.parse(data) : undefined;
	}

	export async function writeJsonAtomic(json: any, destPath: string): Promise<void> {
		const data = JSON.stringify(json, null, 2);

		return new Promise<void>((resolve, reject) => {
			writeAtomic(destPath, data, err => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}

	export async function deleteFile(destPath: string): Promise<boolean> {
		return new Promise<boolean>((resolve, reject) => {
			if (!destPath || destPath.indexOf("..") > -1) {
				reject(false);
			} else {
				fs.unlink(destPath, err => {
					if (err) {
						reject(false);
					} else {
						resolve(true);
					}
				});
			}
		});
	}

	const DIRECTORY_TREE_DEPTH = 2;
	export function getDirectoryTree(tree: DirectoryTree, maxDepth = DIRECTORY_TREE_DEPTH) {
		try {
			const root = tree.fullPath;
			// NOTE: could be others to exclude here...
			const files = fs
				.readdirSync(root)
				.filter(_ => _ !== "obj" && _ !== "bin" && _ !== "node_modules" && _.indexOf(".") !== 0);

			if (files.length === 0) {
				return tree;
			}

			for (const file of files) {
				const fullPath = path.resolve(root, file);
				const stat = fs.statSync(fullPath);
				if (stat.isDirectory()) {
					const nextObj: DirectoryTree = {
						fullPath: fullPath,
						name: file,
						partialPath: tree.partialPath.concat(file),
						children: [],
						id: tree.id,
						depth: tree.depth + 1,
					};
					if (nextObj.depth >= DIRECTORY_TREE_DEPTH) {
						tree.children.push(nextObj);
					} else {
						tree.children.push(getDirectoryTree(nextObj, maxDepth));
					}
				}
			}
			return tree;
		} catch (ex) {}
		return tree;
	}
}
