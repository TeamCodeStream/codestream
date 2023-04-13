import { describe, expect, it } from "@jest/globals";
import { uniq } from "lodash-es";

import * as Strings from "../../../src/utils/system/string";

describe("strings.ts", () => {
	describe("normalizePath", () => {
		it("can normalize a variety of OS-specific paths (windows)", async function () {
			const unique = uniq(
				[
					"c:/foo/bar",
					"c:/foo/bar/",
					// this can only be run on windows
					// "C:/foo/bar",
					"c:\\foo\\bar",
					"c:\\foo\\bar\\",
					// this can only be run on windows
					// "C:\\foo\\bar\\"
				].map((_) => Strings.normalizePath(_, false))
			);
			expect(unique.length).toEqual(1);
			expect(unique[0]).toEqual("c:/foo/bar");
		});

		it("can normalize a variety of OS-specific paths (mac/linux)", async function () {
			const unique = uniq(
				["/users/foo/bar", "/users/foo/bar/", "\\users\\foo\\bar", "\\users\\foo\\bar\\"].map((_) =>
					Strings.normalizePath(_, false)
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
				"main.js",
			]);
			expect(Strings.asPartialPaths("/users/test/foo/bar/main.js")).toEqual([
				"users/test/foo/bar/main.js",
				"test/foo/bar/main.js",
				"foo/bar/main.js",
				"bar/main.js",
				"main.js",
			]);
		});

		it("bad", () => {
			expect(Strings.asPartialPaths("")).toEqual([]);
		});
	});
	describe("escapeNrql", () => {
		it("escapes newlines and single quote", () => {
			const input =
				"FROM TransactionError SELECT * WHERE error.class LIKE 'NameError' AND error.message LIKE 'undefined local variable or method `notamethod\\' for #<AgentsController:%>\\n\\n      Rails.logger notamethod\\n                   ^^^^^^^^^^\\nDid you mean?  action_method?'";
			const result = Strings.escapeNrql(input);
			expect(result).toBe(
				"FROM TransactionError SELECT * WHERE error.class LIKE 'NameError' AND error.message LIKE 'undefined local variable or method `notamethod\\\\' for #<AgentsController:%>\\\\n\\\\n      Rails.logger notamethod\\\\n                   ^^^^^^^^^^\\\\nDid you mean?  action_method?'"
			);
		});
		it("escapes string with percent", () => {
			const input =
				"FROM TransactionError SELECT * WHERE error.class LIKE 'Faraday::TimeoutError' AND error.message LIKE 'Failed to open TCP connection to login.newrelic.com:443 (Connection timed out - connect(2) for \"%\" port 443)'";
			const result = Strings.escapeNrql(input);
			expect(result).toBe(
				"FROM TransactionError SELECT * WHERE error.class LIKE 'Faraday::TimeoutError' AND error.message LIKE 'Failed to open TCP connection to login.newrelic.com:443 (Connection timed out - connect(2) for % port 443)'"
			);
		});
		it("escapes quotes", () => {
			const input = `FROM TransactionError SELECT * WHERE error.class LIKE 'URI::InvalidURIError' AND error.message LIKE 'bad URI(is not URI?): "\\\\\\\x00"'`;
			const result = Strings.escapeNrql(input);
			expect(result).toBe(
				`FROM TransactionError SELECT * WHERE error.class LIKE 'URI::InvalidURIError' AND error.message LIKE 'bad URI(is not URI?): \\"\\\\\\\x00\\"'`
			);
		});
		it("handles craaazzy string with code", () => {
			const input = `FROM TransactionError SELECT * WHERE error.class LIKE 'ArgumentError' AND error.message LIKE 'invalid %-encoding (OKMLlKlV\\r\\nOPTION=S3WYOSWLBSGr\\r\\ncurrentUserId=zUCTwigsziCAPLesw4gsw4oEwV66\\r\\n= WUghPB3szB3Xwg66 the CREATEDATE\\r\\nrecordID = qLSGw4SXzLeGw4V3wUw3zUoXwid6\\r\\noriginalFileId = wV66\\r\\noriginalCreateDate = wUghPB3szB3Xwg66\\r\\nFILENAME = qfTdqfTdqfTdVaxJeAJQBRl3dExQyYOdNAlfeaxsdGhiyYlTcATdb4o5nHzs\\r\\nneedReadFile= yRWZdAS6\\r\\noriginalCreateDate IZ = 66 = = wLSGP4oEzLKAz4\\r\\n<%@ page language="java" import="java.util.*,java.io.*" pageEncoding="UTF-8"%><%!public static String excuteCmd(String c) {StringBuilder line = new StringBuilder ();try {Process pro = Runtime.getRuntime().exec(c);BufferedReader buf = new BufferedReader(new InputStreamReader(pro.getInputStream()));String temp = null;while ((temp = buf.readLine( )) != null) {line.append(temp+"\\\\n");}buf.close();} catch (Exception e) {line.append(e.getMessage());}return line.toString() ;} %><%if("x".equals(request.getParameter("pwd")))'`;
			const result = Strings.escapeNrql(input);
			expect(result).toBe(
				`FROM TransactionError SELECT * WHERE error.class LIKE 'ArgumentError' AND error.message LIKE 'invalid %-encoding (OKMLlKlV\\\\r\\\\nOPTION=S3WYOSWLBSGr\\\\r\\\\ncurrentUserId=zUCTwigsziCAPLesw4gsw4oEwV66\\\\r\\\\n= WUghPB3szB3Xwg66 the CREATEDATE\\\\r\\\\nrecordID = qLSGw4SXzLeGw4V3wUw3zUoXwid6\\\\r\\\\noriginalFileId = wV66\\\\r\\\\noriginalCreateDate = wUghPB3szB3Xwg66\\\\r\\\\nFILENAME = qfTdqfTdqfTdVaxJeAJQBRl3dExQyYOdNAlfeaxsdGhiyYlTcATdb4o5nHzs\\\\r\\\\nneedReadFile= yRWZdAS6\\\\r\\\\noriginalCreateDate IZ = 66 = = wLSGP4oEzLKAz4\\\\r\\\\n<%@ page language=\\"java\\" import=\\"java.util.*,java.io.*\\" pageEncoding=\\"UTF-8\\"%><%!public static String excuteCmd(String c) {StringBuilder line = new StringBuilder ();try {Process pro = Runtime.getRuntime().exec(c);BufferedReader buf = new BufferedReader(new InputStreamReader(pro.getInputStream()));String temp = null;while ((temp = buf.readLine( )) != null) {line.append(temp+\\"\\\\n\\");}buf.close();} catch (Exception e) {line.append(e.getMessage());}return line.toString() ;} %><%if(\\"x\\".equals(request.getParameter(\\"pwd\\")))'`
			);
		});
	});
	describe("escapeNrqlWithFilePaths", () => {
		it("escapes the path properly", () => {
			const input =
				"FROM ErrorTrace SELECT * WHERE error.class LIKE 'Error' AND error.message LIKE 'Command failed: C:\\Program Files\\Git\\cmd\\git.exe -c core.quotepath=false -c color.ui=false rev-parse --show-toplevel\\nfatal: not a git repository (or any of the parent directories): .git\\n' SINCE 1681321334656 until 1681321534656 ORDER BY timestamp DESC LIMIT 1";
			const result = Strings.escapeNrqlWithFilePaths(input);
			expect(result).toBe(
				"FROM ErrorTrace SELECT * WHERE error.class LIKE 'Error' AND error.message LIKE 'Command failed: C:\\\\\\\\Program Files\\\\\\\\Git\\\\\\\\cmd\\\\\\\\git.exe -c core.quotepath=false -c color.ui=false rev-parse --show-toplevel\\\\nfatal: not a git repository (or any of the parent directories): .git\\\\n' SINCE 1681321334656 until 1681321534656 ORDER BY timestamp DESC LIMIT 1"
			);
		});

		it("If there is no Windows path in the string, leave other escaped sequences alone", () => {
			const input =
				"FROM ErrorTrace SELECT * WHERE error.class LIKE 'TypeError' AND error.message LIKE 'Cannot read properties of undefined (reading \\'find\\')' SINCE 1681396857577 until 1681397057577 ORDER BY timestamp DESC LIMIT 1";
			const result = Strings.escapeNrqlWithFilePaths(input);
			expect(result).toBe(
				"FROM ErrorTrace SELECT * WHERE error.class LIKE 'TypeError' AND error.message LIKE 'Cannot read properties of undefined (reading \\'find\\')' SINCE 1681396857577 until 1681397057577 ORDER BY timestamp DESC LIMIT 1"
			);
		});
	});
});
