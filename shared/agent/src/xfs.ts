"use strict";

import * as fs from "fs";
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

	export async function writeTextAtomic(text: any, destPath: string): Promise<undefined> {
		return new Promise<undefined>((resolve, reject) => {
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

	export async function writeJsonAtomic(json: any, destPath: string): Promise<undefined> {
		const data = JSON.stringify(json, null, 2);

		return new Promise<undefined>((resolve, reject) => {
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
}
