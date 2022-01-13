import { describe, expect, it } from "@jest/globals";
import { getProviderPullRequestRepoObjectCore } from "../../store/providerPullRequests/reducer";

describe("providers", () => {
	it("should match on name", () => {
		const result = getProviderPullRequestRepoObjectCore(
			[
				{
					name: "backend",
					remotes: [
						{
							normalizedUrl: "git.example.com/mono/backend"
						}
					]
				},
				{
					name: "backend-backend",
					remotes: [
						{
							normalizedUrl: "git.example.com/bar/backend/backend"
						}
					]
				}
			],
			{
				conversations: {
					project: {
						name: "backend",
						repoName: "backend",
						mergeRequest: {
							webUrl: "https://gitlab.example.com/mono/backend"
						}
					}
				}
			},
			"gitlab*com"
		);
		expect(result.currentRepo.name).toEqual("backend");
		expect(result.reason).toEqual("repoName");
	});

	it("should match on closestMatch", () => {
		// case where there are multiple of the same named repos
		// but the normalized remote url doesn't match the weburl from the provider
		const result = getProviderPullRequestRepoObjectCore(
			[
				{
					name: "backend",
					remotes: [
						{
							normalizedUrl: "git.codestream.dev/mono"
						}
					]
				},
				{
					name: "frontend",
					remotes: [
						{
							normalizedUrl: "git.codestream.dev/mono/frontend"
						}
					]
				},
				{
					name: "backend",
					remotes: [
						{
							normalizedUrl: "git.codestream.dev/mono/backend"
						}
					]
				}
			],
			{
				conversations: {
					project: {
						name: "backend",
						repoName: "backend",
						mergeRequest: {
							webUrl: "https://gitlab.codestream.dev/mono/backend"
						}
					}
				}
			},
			"gitlab*com"
		);

		expect(result.currentRepo.remotes[0].normalizedUrl).toEqual("git.codestream.dev/mono/backend");
		expect(result.reason).toEqual("closestMatch");
	});
});
