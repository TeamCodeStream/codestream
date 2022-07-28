"use strict";

import { describe, expect, it } from "@jest/globals";
import { GitRemoteParser } from "../../../src/git/parsers/remoteParser";

describe("git", () => {
	describe("getRepoRemoteVariants", () => {
		it("ssh0", async () => {
			const results = await GitRemoteParser.getRepoRemoteVariants(
				"git@gitlabratory.example.com:myorg/myrepo-sample-java.git"
			);
			expect(results).toEqual([
				{
					type: "ssh",
					value: "git@gitlabratory.example.com:myorg/myrepo-sample-java.git"
				},
				{
					type: "ssh",
					value: "ssh://git@gitlabratory.example.com:myorg/myrepo-sample-java.git"
				},
				{
					type: "https",
					value: "https://gitlabratory.example.com/myorg/myrepo-sample-java.git"
				},
				{
					type: "https",
					value: "https://gitlabratory.example.com/myorg/myrepo-sample-java"
				},
				{
					type: "git",
					value: "git://gitlabratory.example.com/myorg/myrepo-sample-java.git"
				}
			]);
		});
		it("ssh1", async () => {
			const results = await GitRemoteParser.getRepoRemoteVariants(
				"ssh://git@gitlabratory.example.com/myorg/myrepo-sample-java.git"
			);
			expect(results).toEqual([
				{
					type: "ssh",
					value: "git@gitlabratory.example.com/myorg/myrepo-sample-java.git"
				},
				{
					type: "ssh",
					value: "ssh://git@gitlabratory.example.com/myorg/myrepo-sample-java.git"
				},
				{
					type: "https",
					value: "https:///.git"
				},
				{
					type: "https",
					value: "https:///"
				},
				{
					type: "git",
					value: "git:///.git"
				}
			]);
		});
		it("ssh2", async () => {
			const results = await GitRemoteParser.getRepoRemoteVariants(
				"ssh://git@gitlabratory.example.com:myorg/myrepo-sample-java.git"
			);
			expect(results).toEqual([
				{
					type: "ssh",
					value: "git@gitlabratory.example.com:myorg/myrepo-sample-java.git"
				},
				{
					type: "ssh",
					value: "ssh://git@gitlabratory.example.com:myorg/myrepo-sample-java.git"
				},
				{
					type: "https",
					value: "https://gitlabratory.example.com/myorg/myrepo-sample-java.git"
				},
				{
					type: "https",
					value: "https://gitlabratory.example.com/myorg/myrepo-sample-java"
				},
				{
					type: "git",
					value: "git://gitlabratory.example.com/myorg/myrepo-sample-java.git"
				}
			]);
		});
		it("ssh3", async () => {
			const results = await GitRemoteParser.getRepoRemoteVariants(
				"git@github.com:theuser/therepo.git"
			);
			expect(results).toEqual([
				{
					type: "ssh",
					value: "git@github.com:theuser/therepo.git"
				},
				{
					type: "ssh",
					value: "ssh://git@github.com:theuser/therepo.git"
				},
				{
					type: "https",
					value: "https://github.com/theuser/therepo.git"
				},
				{
					type: "https",
					value: "https://github.com/theuser/therepo"
				},
				{
					type: "git",
					value: "git://github.com/theuser/therepo.git"
				}
			]);
		});
		it("https", async () => {
			const results = await GitRemoteParser.getRepoRemoteVariants(
				"https://gitlabratory.example.com/myorg/myrepo-sample-java.git"
			);
			expect(results).toEqual([
				{
					type: "https",
					value: "https://gitlabratory.example.com/myorg/myrepo-sample-java.git"
				},
				{
					type: "https",
					value: "https://gitlabratory.example.com/myorg/myrepo-sample-java"
				},
				{
					type: "git",
					value: "git://gitlabratory.example.com/myorg/myrepo-sample-java.git"
				},
				{
					type: "ssh",
					value: "git@gitlabratory.example.com:myorg/myrepo-sample-java.git"
				},
				{
					type: "ssh",
					value: "ssh://git@gitlabratory.example.com/myorg/myrepo-sample-java.git"
				}
			]);
		});
	});
});
