"use strict";

import { describe, expect, it } from "@jest/globals";
import { InternalError } from "../../../../src/agentError";
import { GitHubEnterpriseProvider } from "../../../../src/providers/githubEnterprise";
import { ProviderVersion } from "../../../../src/providers/types";

describe("getOwnerFromRemote", () => {
	const provider = new GitHubEnterpriseProvider({} as any, {} as any);

	it("generic", () => {
		const owner = provider.getOwnerFromRemote("//github.acme.us/foo/bar");
		expect(owner).toEqual({ name: "bar", owner: "foo" });
	});
});

describe("myPullRequests", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});
	afterAll(() => {
		jest.clearAllMocks();
	});

	it("should throw InternalError for invalid version", async () => {
		jest
			.spyOn(GitHubEnterpriseProvider.prototype, "ensureConnected")
			.mockImplementation(async () => {
				return;
			});
		jest
			.spyOn(GitHubEnterpriseProvider.prototype as any, "isPRApiCompatible")
			.mockResolvedValueOnce(false);
		const providerVersion: ProviderVersion = {
			version: "2.2.7",
			asArray: [2, 2, 7],
		};
		jest
			.spyOn(GitHubEnterpriseProvider.prototype as any, "getVersion")
			.mockResolvedValueOnce(providerVersion);
		const provider = new GitHubEnterpriseProvider({} as any, {} as any) as any;
		await expect(provider.getMyPullRequests()).rejects.toThrowError(
			new InternalError(
				`Pull requests are not available for GitHub Enterprise 2.2.7. Please upgrade to 3.3.0 or later.`
			)
		);
	});
});

describe("isPRApiCompatible", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});
	afterEach(() => {
		jest.clearAllMocks();
	});
	it("should return false for version 2.9.99", async () => {
		const providerVersion: ProviderVersion = {
			version: "2.9.99",
			asArray: [2, 9, 99],
		};
		jest
			.spyOn(GitHubEnterpriseProvider.prototype as any, "getVersion")
			.mockResolvedValueOnce(providerVersion);
		const provider = new GitHubEnterpriseProvider({} as any, {} as any) as any;
		const result: boolean = await provider.isPRApiCompatible();
		expect(result).toBe(false);
	});

	it("should return true for version 3.3.0", async () => {
		const providerVersion: ProviderVersion = {
			version: "3.3.0",
			asArray: [3, 3, 0],
		};
		jest
			.spyOn(GitHubEnterpriseProvider.prototype as any, "getVersion")
			.mockResolvedValueOnce(providerVersion);
		const provider = new GitHubEnterpriseProvider({} as any, {} as any) as any;
		const result: boolean = await provider.isPRApiCompatible();
		expect(result).toBe(true);
	});
});
