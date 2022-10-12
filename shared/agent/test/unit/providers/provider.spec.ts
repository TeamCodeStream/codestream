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

	it("getProviderRepo", async () => {
		const repos = stubRepos([
			{
				createdAt: 1643217721184,
				creatorId: "61b001aa98e56e03de785d28",
				deactivated: false,
				id: "61f18339968fed340dc7c996",
				modifiedAt: 1651601403366,
				name: "gore",
				remotes: [
					{
						normalizedUrl: "github.com/teamcodestream/gore",
						url: "github.com/teamcodestream/gore",
						companyIdentifier: "github.com/teamcodestream",
					},
				],
				teamId: "61ae567beb6b1c0e5d8b4bb2",
				version: 2,
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
});
