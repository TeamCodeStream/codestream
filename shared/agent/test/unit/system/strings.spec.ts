import { describe, expect, it } from "@jest/globals";
import { uniq } from "lodash";
import { Strings } from "../../../src/system/string";

describe("strings.ts", () => {
	describe("normalizePath", () => {
		it("can normalize a variety of OS-specific paths (windows)", async function() {
			const unique = uniq(
				[
					"c:/foo/bar",
					"c:/foo/bar/",
					// this can only be run on windows
					// "C:/foo/bar",
					"c:\\foo\\bar",
					"c:\\foo\\bar\\"
					// this can only be run on windows
					// "C:\\foo\\bar\\"
				].map(_ => Strings.normalizePath(_))
			);
			expect(unique.length).toEqual(1);
			expect(unique[0]).toEqual("c:/foo/bar");
		});

		it("can normalize a variety of OS-specific paths (mac/linux)", async function() {
			const unique = uniq(
				["/users/foo/bar", "/users/foo/bar/", "\\users\\foo\\bar", "\\users\\foo\\bar\\"].map(_ =>
					Strings.normalizePath(_)
				)
			);
			expect(unique.length).toEqual(1);
			expect(unique[0]).toEqual("/users/foo/bar");
		});
	});

	describe("trimEnd", () => {
		it("has a trailing slash", () => {
			expect(Strings.trimEnd("https://codestream.com/", "/")).toEqual("https://codestream.com");
		});

		it("has a trailing ?", () => {
			expect(Strings.trimEnd("https://codestream.com/?", "?")).toEqual("https://codestream.com/");
		});
	});

	describe("trimStart", () => {
		it("has a front dot", () => {
			expect(Strings.trimStart(".", ".")).toEqual("");
			expect(Strings.trimStart("..", ".")).toEqual(".");
			expect(Strings.trimStart("/foo", ".")).toEqual("/foo");
			expect(Strings.trimStart("../foo", ".")).toEqual("./foo");
			expect(Strings.trimStart("./foo", ".")).toEqual("/foo");
		});
	});

	describe("asPartialPaths", () => {
		it("good", () => {
			expect(Strings.asPartialPaths("main.js")).toEqual(["main.js"]);
			expect(Strings.asPartialPaths("foo.bar.js")).toEqual(["foo.bar.js"]);
			expect(Strings.asPartialPaths("/users/test/foo/bar/main.js")).toEqual([
				"users/test/foo/bar/main.js",
				"test/foo/bar/main.js",
				"foo/bar/main.js",
				"bar/main.js",
				"main.js"
			]);
			expect(Strings.asPartialPaths("/users/test/foo/bar/main.js")).toEqual([
				"users/test/foo/bar/main.js",
				"test/foo/bar/main.js",
				"foo/bar/main.js",
				"bar/main.js",
				"main.js"
			]);
		});

		it("bad", () => {
			expect(Strings.asPartialPaths("")).toEqual([]);
		});
	});
});
