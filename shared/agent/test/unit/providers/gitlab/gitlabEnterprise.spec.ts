"use strict";

import { describe, expect, it } from "@jest/globals";
import { GitLabEnterpriseProvider } from "../../../../src/providers/gitlabEnterprise";

describe("getOwnerFromRemote", () => {
	const provider = new GitLabEnterpriseProvider({} as any, {} as any);

	it("without gitlab subdir", () => {
		const owner = provider.getOwnerFromRemote("//gitlab/gitlab/myrepo");
		expect(owner).toEqual({ name: "myrepo", owner: "gitlab" });
	});

	it("with gitlab subdir", () => {
		const owner = provider.getOwnerFromRemote("//gitlab/gitlab/something/myrepo");
		expect(owner).toEqual({ name: "myrepo", owner: "something" });
	});

	it("with gitlab subdir and project", () => {
		const owner = provider.getOwnerFromRemote("//gitlab/gitlab/foo/something/myrepo");
		expect(owner).toEqual({ name: "myrepo", owner: "foo/something" });
	});
});
