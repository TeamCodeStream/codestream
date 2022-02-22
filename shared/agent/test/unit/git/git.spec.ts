"use strict";

import { expect } from "chai";
import { GitRemoteParser } from "../../../src/git/parsers/remoteParser";
require("mocha").describe;
require("mocha").it;

describe("git", () => {
	describe("getRepoRemoteVariants", () => {
		it("ssh", async () => {
			const results = await GitRemoteParser.getRepoRemoteVariants(
				"git@gitlabratory.example.com:myorg/myrepo-sample-java.git"
			);
			expect(results).to.deep.equal([
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
				}
			]);
		});
		it("ssh2", async () => {
			const results = await GitRemoteParser.getRepoRemoteVariants(
				"ssh://git@gitlabratory.example.com:myorg/myrepo-sample-java.git"
			);
			expect(results).to.deep.equal([
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
				}
			]);
		});
		it("https", async () => {
			const results = await GitRemoteParser.getRepoRemoteVariants(
				"https://gitlabratory.example.com/myorg/myrepo-sample-java.git"
			);
			expect(results).to.deep.equal([
				{
					type: "https",
					value: "https://gitlabratory.example.com/myorg/myrepo-sample-java.git"
				},
				{
					type: "ssh",
					value: "git@gitlabratory.example.com:myorg/myrepo-sample-java.git"
				},
				{
					type: "ssh",
					value: "ssh://git@gitlabratory.example.com:myorg/myrepo-sample-java.git"
				}
			]);
		});
	});
});
