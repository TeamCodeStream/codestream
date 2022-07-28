"use strict";

import { describe, expect, it } from "@jest/globals";
import { GitRemote, GitRemoteType } from "../../../src/git/models/remote";
import { GitRepository } from "../../../src/git/models/repository";

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
					).getWeightedRemotesByStrategy("prioritizeOrigin", remotes)
				).map(_ => _.name)
			).toEqual(["origin", "upstream"]);
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
					).getWeightedRemotesByStrategy("prioritizeOrigin", remotes)
				).map(_ => _.name)
			).toEqual(["origin", "upstream", "end", "cheese"]);
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
					).getWeightedRemotesByStrategy("prioritizeUpstream", remotes)
				).map(_ => _.name)
			).toEqual(["upstream", "origin", "other", "somethingelse"]);
		});
	});
});
