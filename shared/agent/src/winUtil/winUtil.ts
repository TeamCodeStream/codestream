import Cache from "@codestream/utils/system/timedCache";
import { runCommand } from "../git/shell";
import { Logger } from "../logger";

const netUseRegex = /\w+\s+([A-Z]:)\s+([\w\\]+)/;
const cache = new Cache<MappedDrives>();
const KEY = "netuse";

export class DriveLetter {
	private readonly _driveLetter: string;

	get value() {
		return this._driveLetter;
	}

	constructor(driveLetter: string) {
		this._driveLetter = this.normalize(driveLetter);
	}

	normalize(driveLetter: string): string {
		const result = /(^[a-zA-Z]:?).*/.exec(driveLetter);
		if (!result || result.length < 2) {
			throw new Error("Invalid drive letter");
		}
		const upper = result[1].toUpperCase();
		return upper.endsWith(":") ? upper : upper + ":";
	}
}

export class MappedDrives {
	private readonly _driveLetterMap: Map<string, string>;

	constructor(driveLetterMap: Map<string, string>) {
		this._driveLetterMap = driveLetterMap;
	}

	get count() {
		return this._driveLetterMap.size;
	}

	get isEmpty() {
		return this.count === 0;
	}

	static createEmpty(): MappedDrives {
		return new MappedDrives(new Map<string, string>());
	}

	static fromOutput(output: string): MappedDrives {
		const lines = output.split(/\r?\n/);
		const map = new Map<string, string>();
		const start = lines.findIndex(line => line.startsWith("----------"));
		if (start === -1) {
			return new MappedDrives(map);
		}
		lines.splice(0, start + 1);
		for (const line of lines) {
			const result = netUseRegex.exec(line);
			if (result?.length && result.length > 2) {
				const driveLetter = new DriveLetter(result[1]);
				const mapping = result[2];
				map.set(driveLetter.value, mapping);
			}
		}
		return new MappedDrives(map);
	}

	getUNCForDriveLetter(driveLetter: DriveLetter): string | undefined {
		return this._driveLetterMap.get(driveLetter.value);
	}
}

export function getDriveLetterFromPath(filePath: string): DriveLetter | undefined {
	try {
		return new DriveLetter(filePath);
	} catch (e) {
		return undefined;
	}
}

export async function flushCache() {
	cache.clear();
}

export async function getMappedDrives(): Promise<MappedDrives> {
	try {
		const cached = cache.get(KEY);
		if (cached) {
			return cached;
		}
		const output = await runCommand("net", ["use"]);
		const mappedDrives = MappedDrives.fromOutput(output);
		cache.put(KEY, mappedDrives); // Use default 60 second cache ttl
		return mappedDrives;
	} catch (e) {
		Logger.warn("net use failed", e);
		return MappedDrives.createEmpty();
	}
}

export function mapMountedDriveToUNC(
	filePath: string,
	driveLetter: DriveLetter,
	uncPath: string
): string {
	const regex = new RegExp(`^${driveLetter.value}`, "i");
	return filePath.replace(regex, uncPath);
}
