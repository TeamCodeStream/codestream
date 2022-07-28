"use strict";

import { describe, expect, it } from "@jest/globals";
import { GitHubProvider } from "../../../../src/providers/github";

describe("getOwnerFromRemote", () => {
	const provider = new GitHubProvider({} as any, {} as any);

	it("generic", () => {
		const owner = provider.getOwnerFromRemote("//github.com/foo/bar");
		expect(owner).toEqual({ name: "bar", owner: "foo" });
	});
});
