import { existsSync, mkdirSync, openSync, readSync, writeSync } from "fs";
import { flock } from "fs-ext";
import { homedir } from "os";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { Logger } from "../../logger";

export async function getClientUuid(): Promise<string> {
	return new Promise((resolve, reject) => {
		const baseDir = path.join(homedir(), ".codestream");
		if (!existsSync(baseDir)) {
			try {
				mkdirSync(baseDir);
			} catch (e) {
				if (e.code === "EEXIST") {
					// ignore
				} else {
					throw e;
				}
			}
		}
		const file = path.join(baseDir, "client-uuid");
		const fd = openSync(file, "a+");
		const waitLockStart = Date.now();
		Logger.debug(`clientUuid: waiting for lock`);
		flock(fd, "ex", err => {
			if (err) {
				reject(err);
				return;
			}
			const lockStartTime = Date.now();
			const waitLockTime = lockStartTime - waitLockStart;
			Logger.debug(`clientUuid: lock acquired - wait time: ${waitLockTime}ms`);
			try {
				const buffer = Buffer.alloc(36);
				readSync(fd, buffer, 0, 36, 0);
				const contents = buffer.toString("utf8");
				// make sure it is a valid v4 uuid using regex
				if (
					contents.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
				) {
					flock(fd, "un", err => {
						if (err) {
							Logger.warn("clientUuid: Error releasing file lock", err);
							return;
						}
						const lockEndTime = Date.now();
						const lockTime = lockEndTime - lockStartTime;
						Logger.debug(`clientUuid: lock released - lock held for ${lockTime}ms`);
						resolve(contents);
						return;
					});
					return;
				} else {
					Logger.debug(`clientUuid: invalid contents`);
				}

				// if not, new uuid
				Logger.debug(`clientUuid: writing new uuid`);
				const uuid = uuidv4();

				writeSync(fd, uuid, 0, "utf8");
				flock(fd, "un", err => {
					if (err) {
						Logger.warn("clientUuid: Error releasing file lock", err);
					}
					const lockEndTime = Date.now();
					const lockTime = lockEndTime - lockStartTime;
					Logger.debug(`clientUuid: lock released - lock held for ${lockTime}ms`);
					resolve(uuid);
				});
				return;
			} catch (error) {
				reject(error);
			}
		});
	});
}
