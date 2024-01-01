import {
	Entity,
	GetReposScmResponse,
	RelatedEntity,
	RelatedEntityByRepositoryGuidsResult,
} from "@codestream/protocols/agent";
import { ReposProvider } from "../../../../src/providers/newrelic/repos/reposProvider";
import { NewRelicGraphqlClient } from "../../../../src/providers/newrelic/newRelicGraphqlClient";
import { describe, expect, it } from "@jest/globals";

describe("ReposProvider", () => {
	it("getObservabilityRepos", async () => {
		const serviceLocatorStub = {
			scm: {
				getRepos: function (): Promise<GetReposScmResponse> {
					return new Promise(resolve => {
						resolve({
							repositories: [
								{
									id: "123",
									path: "",
									folder: { uri: "", name: "repo" },
									remotes: [
										{
											repoPath: "/Users/johndoe/code/johndoe_foo-account-persister",
											name: "origin",
											domain: "yoursourcecode.net",
											path: "johndoe/foo-account-persister",
											rawUrl: "git@yoursourcecode.net:johndoe/foo-account-persister.git",
											webUrl: "//yoursourcecode.net/johndoe/foo-account-persister",
										},
										{
											repoPath: "/Users/johndoe/code/johndoe_foo-account-persister",
											name: "upstream",
											domain: "yoursourcecode.net",
											path: "biz-enablement/foo-account-persister",
											rawUrl: "git@yoursourcecode.net:biz-enablement/foo-account-persister.git",
											webUrl: "//yoursourcecode.net/biz-enablement/foo-account-persister",
										},
									],
								},
							],
						});
					});
				},
			},
			session: {
				newRelicApiUrl: "https://api.newrelic.com",
			},
		} as any;

		const mockNewRelicGraphqlClient = {
			query: jest.fn(),
		} as unknown as NewRelicGraphqlClient;

		const reposProvider = new ReposProvider(
			mockNewRelicGraphqlClient,
			serviceLocatorStub,
			{} as any
		);
		reposProvider.findRepositoryEntitiesByRepoRemotes = jest
			.fn()
			.mockImplementation(async (remotes: string[]) => {
				return {
					entities: [
						{
							guid: "123456",
							name: "my-entity",
							account: {
								id: 1,
								name: "name",
							},
							tags: [
								{
									key: "accountId",
									values: ["1"],
								},
								{
									key: "url",
									values: ["git@yoursourcecode.net:biz-enablement/foo-account-persister.git"],
								},
							],
						},
					] as Entity[],
					remotes: await reposProvider.buildRepoRemoteVariants(remotes),
				};
			});

		reposProvider.findRelatedEntityByRepositoryGuids = jest
			.fn()
			.mockImplementation(
				async (repositoryGuids: string[]): Promise<RelatedEntityByRepositoryGuidsResult> => {
					return {
						actor: {
							entities: [
								{
									relatedEntities: {
										results: [
											{
												source: {
													entity: {
														account: {
															id: 1,
															name: "name",
														},
														name: "src-entity",
														type: "APPLICATION",
														tags: [
															{
																key: "accountId",
																values: ["1"],
															},
														],
													},
												},
												target: {
													entity: {
														account: {
															id: 1,
															name: "name",
														},
														name: "target-entity",
														type: "REPOSITORY",
														tags: [
															{
																key: "accountId",
																values: ["1"],
															},
														],
													},
												},
											},
										] as RelatedEntity[],
									},
								},
							],
						},
					};
				}
			);

		const results = await reposProvider.getObservabilityRepos({});

		expect(results?.repos?.length).toEqual(1);
		expect(results?.repos![0].entityAccounts.length).toEqual(1);
		expect(results?.repos![0].repoRemote).toEqual(
			"git@yoursourcecode.net:biz-enablement/foo-account-persister.git"
		);
	});
});
