"use strict";

import { describe, expect, it } from "@jest/globals";
import { FetchThirdPartyPullRequestResponse } from "../../../src/protocol/agent.protocol.providers";
import { CSRemote, CSRepository } from "../../../src/protocol/api.protocol.models";
import { BitbucketProvider } from "../../../src/providers/bitbucket";
import { BitbucketServerProvider } from "../../../src/providers/bitbucketServer";
import { GitHubProvider } from "../../../src/providers/github";
import { GitHubEnterpriseProvider } from "../../../src/providers/githubEnterprise";
import { GitLabProvider } from "../../../src/providers/gitlab";
import { GitLabEnterpriseProvider } from "../../../src/providers/gitlabEnterprise";
import { ThirdPartyIssueProvider } from "../../../src/providers/provider";

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

describe("provider", () => {
	it("supportsViewingPullRequests", async () => {
		[
			GitHubProvider,
			GitHubEnterpriseProvider,
			GitLabProvider,
			GitLabEnterpriseProvider,
			BitbucketProvider,
		].forEach(Provider => {
			const provider = new Provider({} as any, Provider as any);
			expect(ThirdPartyIssueProvider.supportsViewingPullRequests(provider)).toEqual(true);
		});
	});

	it("does not supportsViewingPullRequests", async () => {
		[BitbucketServerProvider].forEach(Provider => {
			const provider = new Provider({} as any, Provider as any);
			expect(ThirdPartyIssueProvider.supportsViewingPullRequests(provider)).toEqual(false);
		});
	});

	it("supportsCreatingPullRequests", () => {
		[
			GitHubProvider,
			GitHubEnterpriseProvider,
			GitLabProvider,
			GitLabEnterpriseProvider,
			BitbucketProvider,
			BitbucketServerProvider,
		].forEach(Provider => {
			const provider = new Provider({} as any, Provider as any);
			expect(ThirdPartyIssueProvider.supportsCreatingPullRequests(provider)).toEqual(true);
		});
	});

	it("gh getProviderRepo url found match", async () => {
		const repos = stubRepos([
			{
				id: "61f18339968fed340dc7c996",
				name: "gore",
				remotes: [
					{
						normalizedUrl: "github.com/teamcodestream/gore",
						url: "github.com/teamcodestream/gore",
						companyIdentifier: "github.com/teamcodestream",
					},
				],
			},
		]);

		[GitHubProvider, GitHubEnterpriseProvider].forEach(async Provider => {
			const provider = new Provider({} as any, Provider as any);
			const { currentRepo } = await provider.getProviderRepo({
				repoName: "gore",
				repoUrl: "https://github.com/TeamCodeStream/gore",
				repos: repos,
			});
			expect(currentRepo).toEqual(expect.objectContaining({ name: "gore" }));
		});
	});
	it("gh getProviderRepo pick first one when no match", async () => {
		const repos = stubRepos([
			{
				id: "61f18339968fed340dc7c996",
				name: "foo",
				remotes: [
					{
						companyIdentifier: "github.com/teamcodestream",
					},
				],
				teamId: "61ae567beb6b1c0e5d8b4bb2",
			},
			{
				id: "61f18339123968fed340dc7c996",
				name: "bar",
				remotes: [
					{
						companyIdentifier: "github.com/teamcodestream",
					},
				],
			},
			{
				id: "61f18339968f123ed35140dc7c996",
				name: "baz",
				remotes: [
					{
						companyIdentifier: "github.com/teamcodestream",
					},
				],
			},
		]);

		[GitHubProvider, GitHubEnterpriseProvider].forEach(async Provider => {
			const provider = new Provider({} as any, Provider as any);
			const { currentRepo } = await provider.getProviderRepo({
				repoName: "gore",
				repoUrl: "https://github.com/TeamCodeStream/gore",
				repos: repos,
			});
			expect(currentRepo).toEqual(expect.objectContaining({ name: "foo" }));
		});
	});
	it("gl getProviderRepo url found match", async () => {
		const repos = stubRepos([
			{
				id: "61f18339968fed340dc7c996",
				modifiedAt: 1651601403366,
				name: "my-project-one",
				remotes: [
					{
						normalizedUrl: "my.gitlab.com/pow/my_group_name/my-project-one",
					},
				],
			},
		]);

		[GitLabProvider, GitLabEnterpriseProvider].forEach(async Provider => {
			const provider = new Provider({} as any, Provider as any);
			const { currentRepo } = await provider.getProviderRepo({
				repoName: "my-project-one",
				repoUrl: "https://my.gitlab.com/pow/my_group_name/my-project-one/-/merge_requests/55",
				repos: repos,
			});
			expect(currentRepo).toEqual(expect.objectContaining({ name: "my-project-one" }));
		});
	});

	it("gl getProviderRepo first repo when no match", async () => {
		const repos = stubRepos([
			{
				id: "61f18339968fed340dc7c996",
				modifiedAt: 1651601403366,
				name: "foo",
				remotes: [
					{
						normalizedUrl: "my.gitlab.com/pow/my_group_name/foo",
					},
				],
			},
			{
				id: "61f18339968fed340dc7c996",
				modifiedAt: 1651601403366,
				name: "bar",
				remotes: [
					{
						normalizedUrl: "my.gitlab.com/pow/my_group_name/bar",
					},
				],
			},
			{
				id: "61f18339968fed340dc7c996",
				modifiedAt: 1651601403366,
				name: "baz",
				remotes: [
					{
						normalizedUrl: "my.gitlab.com/pow/my_group_name/baz",
					},
				],
			},
		]);

		[GitLabProvider, GitLabEnterpriseProvider].forEach(async Provider => {
			const provider = new Provider({} as any, Provider as any);
			const { currentRepo } = await provider.getProviderRepo({
				repoName: "my-project-one",
				repoUrl: "https://my.gitlab.com/pow/my_group_name/my-project-one/-/merge_requests/55",
				repos: repos,
			});
			expect(currentRepo).toEqual(expect.objectContaining({ name: "foo" }));
		});
	});
});
