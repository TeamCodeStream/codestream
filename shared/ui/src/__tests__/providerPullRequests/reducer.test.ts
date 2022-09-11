import {
	FetchThirdPartyPullRequestResponse,
	GitLabMergeRequest,
} from "@codestream/protocols/agent";
import { CSRemote, CSRepository } from "@codestream/protocols/api";
import { describe, expect, it } from "@jest/globals";
import { getProviderPullRequestRepoObjectCore } from "../../../store/providerPullRequests/slice";

interface RepoStub extends Omit<Partial<CSRepository>, "remotes"> {
	remotes: RemoteStub[];
}

interface RemoteStub extends Partial<CSRemote> {}

function stubRepos(repo: RepoStub[]): CSRepository[] {
	return repo as CSRepository[];
}

function stubConversations(
	ob: Partial<FetchThirdPartyPullRequestResponse>
): FetchThirdPartyPullRequestResponse {
	return ob as FetchThirdPartyPullRequestResponse;
}

describe("providers", () => {
	it("should directly match on single repo", () => {
		const result = getProviderPullRequestRepoObjectCore(
			stubRepos([
				{
					name: "my-project-one",
					remotes: [
						{
							normalizedUrl: "my.gitlab.com/pow/my_group_name/my-project-one",
						},
					],
				},
			]),
			{
				conversationsLastFetch: 1234,
				conversations: stubConversations({
					project: {
						name: "my-project-one",
						repoName: "my-project-one",
						mergeRequest: {
							webUrl: "https://my.gitlab.com/pow/my_group_name/my-project-one/-/merge_requests/55",
						} as GitLabMergeRequest,
					},
				}),
			},
			"gitlab/enterprise"
		);
		expect(result.currentRepo?.name).toBe("my-project-one");
		expect(result.reason).toBe("remote");
	});

	it("should directly match from two similar repos", () => {
		const result = getProviderPullRequestRepoObjectCore(
			stubRepos([
				{
					name: "my-project-one",
					remotes: [
						{
							url: "my.gitlab.com/group/my-project-one",
							normalizedUrl: "my.gitlab.com/pow/my_group_name/my-project-one",
							companyIdentifier: "mycompany",
						},
					],
				},
				{
					name: "my-project-two",
					remotes: [
						{
							url: "my.gitlab.com/pow/my_group_name/my-project-two",
							normalizedUrl: "my.gitlab.com/pow/my_group_name/my-project-two",
							companyIdentifier: "mycompany",
						},
					],
				},
			]),
			{
				conversationsLastFetch: 1234,
				conversations: stubConversations({
					project: {
						name: "my-project-one",
						mergeRequest: {
							webUrl: "https://my.gitlab.com/pow/my_group_name/my-project-one/-/merge_requests/55",
						} as GitLabMergeRequest,
						repoName: "my-project-one",
					},
				}),
			},
			"gitlab/enterprise"
		);
		expect(result.currentRepo?.name).toBe("my-project-one");
		expect(result.reason).toBe("remote");
	});

	it("should match on name", () => {
		const result = getProviderPullRequestRepoObjectCore(
			stubRepos([
				{
					name: "backend",
					remotes: [
						{
							normalizedUrl: "git.example.com/mono/backend",
						},
					],
				},
				{
					name: "backend-backend",
					remotes: [
						{
							normalizedUrl: "git.example.com/bar/backend/backend",
						},
					],
				},
			]),
			{
				conversationsLastFetch: 1234,
				conversations: stubConversations({
					project: {
						name: "backend",
						repoName: "backend",
						mergeRequest: {
							webUrl: "https://gitlab.example.com/mono/backend",
						} as GitLabMergeRequest,
					},
				}),
			},
			"gitlab*com"
		);
		expect(result.currentRepo?.name).toEqual("backend");
		expect(result.reason).toEqual("repoName");
	});

	it("should match on closestMatch", () => {
		// case where there are multiple of the same named repos
		// but the normalized remote url doesn't match the weburl from the provider
		const result = getProviderPullRequestRepoObjectCore(
			stubRepos([
				{
					name: "backend",
					remotes: [
						{
							normalizedUrl: "git.codestream.dev/mono",
						},
					],
				},
				{
					name: "frontend",
					remotes: [
						{
							normalizedUrl: "git.codestream.dev/mono/frontend",
						},
					],
				},
				{
					name: "backend",
					remotes: [
						{
							normalizedUrl: "git.codestream.dev/mono/backend",
						},
					],
				},
			]),
			{
				conversationsLastFetch: 1234,
				conversations: stubConversations({
					project: {
						name: "backend",
						repoName: "backend",
						mergeRequest: {
							webUrl: "https://gitlab.codestream.dev/mono/backend",
						} as GitLabMergeRequest,
					},
				}),
			},
			"gitlab*com"
		);

		expect(result.currentRepo?.remotes[0].normalizedUrl).toEqual("git.codestream.dev/mono/backend");
		expect(result.reason).toEqual("closestMatch");
	});

	it("should directly match on repos with similar prefix on multiple remotes", () => {
		const result = getProviderPullRequestRepoObjectCore(
			stubRepos([
				{
					name: "my-project-one",
					remotes: [
						{
							url: "my.gitlab.com/group/my-project-one",
							normalizedUrl: "my.gitlab.com/pow/my_group_name/my-project-one",
							companyIdentifier: "mycompany",
						},
					],
				},
				{
					name: "my-project-two",
					remotes: [
						{
							url: "my.gitlab.com/pow/my_group_name/my-project-two",
							normalizedUrl: "my.gitlab.com/pow/my_group_name/my-project-two",
							companyIdentifier: "mycompany",
						},
						{
							url: "my.gitlab.com/pow/my_group_name/my-project",
							normalizedUrl: "my.gitlab.com/pow/my_group_name/my-project",
							companyIdentifier: "mycompany",
						},
					],
				},
			]),
			{
				conversationsLastFetch: 1234,
				conversations: stubConversations({
					project: {
						name: "My Project One",
						mergeRequest: {
							webUrl: "https://my.gitlab.com/pow/my_group_name/my-project-one/-/merge_requests/55",
						} as GitLabMergeRequest,
						repoName: "my-project-one",
					},
				}),
			},
			"gitlab/enterprise"
		);
		// console.info(`${JSON.stringify(result, null, 2)}`);
		expect(result.currentRepo?.name).toBe("my-project-one");
		expect(result.reason).toBe("remote");
	});
});
