"use strict";

import { describe, expect, it } from "@jest/globals";
import { GitHubEnterpriseProvider } from "../../../../src/providers/githubEnterprise";

describe("getOwnerFromRemote", () => {
	const provider = new GitHubEnterpriseProvider({} as any, {} as any);

	it("generic", () => {
		const owner = provider.getOwnerFromRemote("//github.acme.us/foo/bar");
		expect(owner).toEqual({ name: "bar", owner: "foo" });
	});
});
