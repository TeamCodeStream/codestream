import { describe, expect, it } from "@jest/globals";
import * as shell from "../../../src/git/shell";
import {
	DriveLetter,
	flushCache,
	getDriveLetterFromPath,
	getMappedDrives,
	mapMountedDriveToUNC
} from "../../../src/winUtil/winUtil";

jest.mock("../../../src/git/shell");

const mockShell = jest.mocked(shell);

const output = `New connections will not be remembered.


Status       Local     Remote                    Network

-------------------------------------------------------------------------------
OK           J:        \\\\server1\\projects      Microsoft Windows Network
OK           T:        \\\\server2\\work        Microsoft Windows Network
The command completed successfully.`;

const emptyOutput = `New connections will not be remembered.

There are no entries in the list.
`;

describe("winUtil", () => {
	describe("DriveLetter", () => {
		it("normalizes h: to H:", () => {
			const dl = new DriveLetter("h:");
			expect(dl.value).toBe("H:");
		});

		it("normalizes h:\\ to H:", () => {
			const dl = new DriveLetter("h:\\");
			expect(dl.value).toBe("H:");
		});

		it("normalizes h:/ to H:", () => {
			const dl = new DriveLetter("h:/");
			expect(dl.value).toBe("H:");
		});

		it("normalizes j to J:", () => {
			const dl = new DriveLetter("j");
			expect(dl.value).toBe("J:");
		});
	});

	describe("getMappedDrives", () => {
		beforeEach(() => {
			jest.resetAllMocks();
			flushCache();
		});

		it("returns drive list", async () => {
			mockShell.runCommand.mockResolvedValue(output);
			const result = await getMappedDrives();
			expect(result.getUNCForDriveLetter(new DriveLetter("T:"))).toBe("\\\\server2\\work");
			expect(result.getUNCForDriveLetter(new DriveLetter("j:"))).toBe("\\\\server1\\projects");
			expect(mockShell.runCommand).toHaveBeenCalledTimes(1);
			// Should use cached result
			const result2 = await getMappedDrives();
			expect(result2.getUNCForDriveLetter(new DriveLetter("T:"))).toBe("\\\\server2\\work");
			expect(mockShell.runCommand).toHaveBeenCalledTimes(1);
		});

		it("returns empty list for no mapped drives", async () => {
			mockShell.runCommand.mockResolvedValue(emptyOutput);
			const result = await getMappedDrives();
			expect(result.count).toBe(0);
			expect(mockShell.runCommand).toHaveBeenCalledTimes(1);
		});

		it("returns empty list for exception during shell execution", async () => {
			mockShell.runCommand.mockImplementation(_ => {
				throw new Error("Oh no");
			});
			const result = await getMappedDrives();
			expect(result.count).toBe(0);
			expect(mockShell.runCommand).toHaveBeenCalledTimes(1);
		});
	});

	describe("mapMountedDriveToUNC", () => {
		it("should remap drive to UNC with backslash paths", () => {
			const driveLetter = new DriveLetter("h");
			const uncPath = "\\\\server3\\blah";
			const filePath = "H:\\Projects";
			const result = mapMountedDriveToUNC(filePath, driveLetter, uncPath);
			expect(result).toBe("\\\\server3\\blah\\Projects");
		});

		it("should remap drive to UNC with slash paths", () => {
			const driveLetter = new DriveLetter("h");
			const uncPath = "//server3/blah";
			const filePath = "H:/Projects";
			const result = mapMountedDriveToUNC(filePath, driveLetter, uncPath);
			expect(result).toBe("//server3/blah/Projects");
		});

		it("should remap drive to UNC with filePath drive letter lowercase", () => {
			const driveLetter = new DriveLetter("h");
			const uncPath = "\\\\server3\\blah";
			const filePath = "h:\\Projects";
			const result = mapMountedDriveToUNC(filePath, driveLetter, uncPath);
			expect(result).toBe("\\\\server3\\blah\\Projects");
		});
	});

	describe("getDriveLetterFromPath", () => {
		it("should extract drive letter", () => {
			expect(getDriveLetterFromPath("s:/some/long/path")?.value).toBe("S:");
		});

		it("should extract drive letter with backslash paths", () => {
			expect(getDriveLetterFromPath("S:\\some\\long\\path")?.value).toBe("S:");
		});

		it("should return undefined for unc path", () => {
			expect(getDriveLetterFromPath("//not/a/mapped/drive")?.value).toBeUndefined();
		});
	});
});
