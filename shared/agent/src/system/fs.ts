"use strict";
import { createHash, HexBase64Latin1Encoding } from "crypto";
import * as fs from "fs";
import * as readline from "readline";
import { Range } from "vscode-languageserver";

export namespace FileSystem {
	export function loadJsonFromFile<T>(path: string): Promise<T | undefined> {
		return new Promise((resolve, reject) => {
			fs.readFile(path, (err, data) => {
				if (err) {
					resolve(undefined);
					return;
				}

				try {
					resolve(JSON.parse(data.toString("utf8")));
				} catch (ex) {
					resolve(undefined);
				}
			});
		});
	}

	export async function sha1(
		path: string,
		range?: Range,
		encoding: HexBase64Latin1Encoding = "base64"
	): Promise<string> {
		const hash = createHash("sha1");

		return new Promise((resolve, reject) => {
			if (range === undefined) {
				fs.createReadStream(path)
					.on("error", reject)
					.pipe(hash.setEncoding(encoding))
					.once("finish", function(this: any) {
						resolve(this.read());
					});

				return;
			}

			const startLine = range.start.line;
			const endLine = range.end.line;
			let count = -1;

			const rl = readline
				.createInterface({
					input: fs.createReadStream(path),
					historySize: 0,
					crlfDelay: Infinity
				} as any)
				.on("line", (line: string) => {
					count++;
					if (count < startLine || count > endLine) return;

					if (count === startLine && range.start.character !== 0) {
						hash.update(line.substring(range.start.character));
						hash.update("\n");
					} else if (count === endLine) {
						hash.update(line.substring(0, range.end.character));
						rl.close();
					} else {
						hash.update(line);
						hash.update("\n");
					}
				})
				.once("close", function() {
					const sha1 = hash.digest(encoding);
					resolve(sha1);
				});
		});
	}

	export async function range(
		path: string,
		range?: Range,
		encoding: HexBase64Latin1Encoding = "base64"
	): Promise<string> {
		let content = "";

		return new Promise((resolve, reject) => {
			if (range === undefined) {
				fs.createReadStream(path)
					.on("error", reject)
					// .pipe(hash.setEncoding(encoding))
					.once("finish", function(this: any) {
						resolve(this.read());
					});

				return;
			}

			const startLine = range.start.line;
			const endLine = range.end.line;
			let count = -1;

			const rl = readline
				.createInterface({
					input: fs.createReadStream(path),
					historySize: 0,
					crlfDelay: Infinity
				} as any)
				.on("line", (line: string) => {
					count++;
					if (count < startLine || count > endLine) return;

					if (count === startLine && range.start.character !== 0) {
						content += line.substring(range.start.character);
						content += "\n";
					} else if (count === endLine) {
						content += line.substring(0, range.end.character);
						rl.close();
					} else {
						content += line;
						content += "\n";
					}
				})
				.once("close", function() {
					resolve(content);
				});
		});
	}
}
