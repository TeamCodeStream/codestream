"use strict";

import { expect } from "chai";
import { GitRemote, GitRemoteType } from "../../../src/git/models/remote";
import { GitRepository } from "../../../src/git/models/repository";
require("mocha").describe;
require("mocha").it;

describe("GitRepository", () => {
	describe("getRepoRemoteVariants", () => {
		it("remoteWeightByStrategy=origin", async () => {
			const remotes = [
				new GitRemote(
					"any/path/here",
					"origin",
					"https://example.com/foo",
					"https",
					"example.com",
					"/foo",
					[
						{
							type: GitRemoteType.Fetch,
							url: "https://example.com/foo"
						}
					]
				),
				new GitRemote(
					"any/path/here",
					"upstream",
					"https://example.com/foo",
					"https",
					"example.com",
					"/foo",
					[
						{
							type: GitRemoteType.Fetch,
							url: "https://example.com/upstream/foo"
						}
					]
				)
			];

			expect(
				(
					await new GitRepository(
						"",
						true,
						{ name: "", uri: "" },
						true
					).getWeightedRemotesByStrategy(remotes, "prioritizeOrigin")
				).map(_ => _.name)
			).to.deep.equal(["origin", "upstream"]);
		});

		it("remoteWeightByStrategy=origin then upstream", async () => {
			const remotes = [
				new GitRemote(
					"any/path/here",
					"end",
					"https://example.com/end",
					"https",
					"example.com",
					"/end",
					[
						{
							type: GitRemoteType.Fetch,
							url: "https://example.com/upstream/cheese"
						}
					]
				),
				new GitRemote(
					"any/path/here",
					"origin",
					"https://example.com/foo",
					"https",
					"example.com",
					"/foo",
					[
						{
							type: GitRemoteType.Fetch,
							url: "https://example.com/foo"
						}
					]
				),
				new GitRemote(
					"any/path/here",
					"cheese",
					"https://example.com/cheese",
					"https",
					"example.com",
					"/cheese",
					[
						{
							type: GitRemoteType.Fetch,
							url: "https://example.com/upstream/cheese"
						}
					]
				),
				new GitRemote(
					"any/path/here",
					"upstream",
					"https://example.com/foo",
					"https",
					"example.com",
					"/foo",
					[
						{
							type: GitRemoteType.Fetch,
							url: "https://example.com/upstream/foo"
						}
					]
				)
			];

			expect(
				(
					await new GitRepository(
						"",
						true,
						{ name: "", uri: "" },
						true
					).getWeightedRemotesByStrategy(remotes, "prioritizeOrigin")
				).map(_ => _.name)
			).to.deep.equal(["origin", "upstream", "end", "cheese"]);
		});

		it("remoteWeightByStrategy=upstream", async () => {
			const remotes = [
				new GitRemote(
					"any/path/here",
					"other",
					"https://example.com/foo",
					"https",
					"example.com",
					"/foo",
					[
						{
							type: GitRemoteType.Fetch,
							url: "https://example.com/foo"
						}
					]
				),
				new GitRemote(
					"any/path/here",
					"somethingelse",
					"https://example.com/foo",
					"https",
					"example.com",
					"/foo",
					[
						{
							type: GitRemoteType.Fetch,
							url: "https://example.com/upstream/foo"
						}
					]
				),
				new GitRemote(
					"any/path/here",
					"upstream",
					"https://example.com/foo",
					"https",
					"example.com",
					"/foo",
					[
						{
							type: GitRemoteType.Fetch,
							url: "https://example.com/upstream/foo"
						}
					]
				),
				new GitRemote(
					"any/path/here",
					"origin",
					"https://example.com/foo",
					"https",
					"example.com",
					"/foo",
					[
						{
							type: GitRemoteType.Fetch,
							url: "https://example.com/origin/foo"
						}
					]
				)
			];

			expect(
				(
					await new GitRepository(
						"",
						true,
						{ name: "", uri: "" },
						true
					).getWeightedRemotesByStrategy(remotes, "prioritizeUpstream")
				).map(_ => _.name)
			).to.deep.equal(["upstream", "origin", "other", "somethingelse"]);
		});
	});
});
