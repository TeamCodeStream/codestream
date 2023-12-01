import path from "path";
import * as fs from "fs/promises";
import { Stats } from "fs";
import { exportedForTesting } from "../src/globycopy";
const { clearGlobs, handleRenameCopy } = exportedForTesting;

const defaultSep = path.sep;
jest.mock("fs/promises");
const mockedFs = jest.mocked(fs);

beforeEach(() => {
	jest.resetAllMocks();
});

afterEach(() => {
	if (path.sep !== defaultSep) {
		Object.defineProperty(path, "sep", { value: defaultSep, writable: false });
	}
});

describe("globycopy", () => {
	describe("clearGlobs", () => {
		it("should truncate path to first path before '**' unix", () => {
			expect(clearGlobs("/src/node_modules/**")).toEqual("/src/node_modules");
			expect(clearGlobs("/src/node_modules/**/*.js")).toEqual("/src/node_modules");
			expect(clearGlobs("/src/node_modules/**/*.{css,scss}")).toEqual("/src/node_modules");
		});

		it("should truncate path to first path before '**' windows", () => {
			// Seems a little risky but none of the ts-jest jest-mock-extended stuff worked
			Object.defineProperty(path, "sep", { value: "\\", writable: false });
			expect(clearGlobs("C:\\src\\node_modules\\**")).toEqual("C:\\src\\node_modules");
			expect(clearGlobs("C:\\src\\node_modules\\**\\*.js")).toEqual("C:\\src\\node_modules");
			expect(clearGlobs("C:\\src\\node_modules\\**\\*.{css,scss}")).toEqual(
				"C:\\src\\node_modules"
			);
		});

		it("should truncate last path before '*' unix", () => {
			expect(clearGlobs("/src/node_modules/*.png")).toEqual("/src/node_modules");
			expect(clearGlobs("/src/node_modules/best*.png")).toEqual("/src/node_modules");
		});

		it("should truncate last path before '*' for windows", () => {
			// Seems a little risky but none of the ts-jest jest-mock-extended stuff worked
			Object.defineProperty(path, "sep", { value: "\\", writable: false });
			expect(clearGlobs("C:\\src\\node_modules\\*.png")).toEqual("C:\\src\\node_modules");
			expect(clearGlobs("C:\\src\\node_modules\\best*.png")).toEqual("C:\\src\\node_modules");
		});
	});

	describe("handleRenameCopy", () => {
		it("should not copy a glob", async () => {
			const warnSpy = jest.spyOn(global.console, "warn");
			await handleRenameCopy("/src/node_modules/**/file", "/project/dist", "thefile");
			expect(warnSpy).toHaveBeenCalledWith(
				"Skipping rename copy since from /src/node_modules/**/file is a glob"
			);
		});

		it("should not copy if dest is not a dir", async () => {
			const warnSpy = jest.spyOn(global.console, "warn");
			const stats: Partial<Stats> = {
				isDirectory: jest.fn(() => false)
			};
			mockedFs.stat.mockResolvedValue(stats as Stats);
			await handleRenameCopy("/src/node_modules/file", "/project/dist/file.txt", "thefile");
			expect(warnSpy).toHaveBeenCalledWith(
				"Skipping rename copy since dest /project/dist/file.txt is not a directory"
			);
		});

		it("should copy if from not glob and dest is dir", async () => {
			const warnSpy = jest.spyOn(global.console, "warn");
			const stats: Partial<Stats> = {
				isDirectory: jest.fn(() => true)
			};
			mockedFs.stat.mockResolvedValue(stats as Stats);
			await handleRenameCopy("/src/node_modules/file", "/project/dist", "thefile");
			expect(mockedFs.copyFile).toHaveBeenCalledWith(
				"/src/node_modules/file",
				"/project/dist/thefile"
			);
			expect(warnSpy).toHaveBeenCalledTimes(0);
		});
	});
});
