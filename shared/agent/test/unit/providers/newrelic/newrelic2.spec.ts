"use strict";

import { describe, expect, it } from "@jest/globals";
import { NewRelicProvider } from "../../../../src/providers/newrelic";

describe("newRelicProvider", () => {
	it("getBestEntity-basedOnTag", () => {
		const newrelic = new NewRelicProvider({} as any, {} as any);
		const asdf = newrelic.getGoldenSignalsEntity({} as any, {
			repoId: "123",
			repoName: "repo1",
			repoRemote: "remote",
			entityAccounts: [
				{
					accountId: 1,
					accountName: "codestream",
					entityGuid: "123",
					entityName: "prod",
					tags: [{ key: "env", values: ["production"] }]
				}
			]
		});
		expect(asdf.entityGuid).toEqual("123");
	});

	it("getBestEntity-basedOnName", () => {
		const newrelic = new NewRelicProvider({} as any, {} as any);
		const asdf = newrelic.getGoldenSignalsEntity({} as any, {
			repoId: "123",
			repoName: "repo1",
			repoRemote: "remote",
			entityAccounts: [
				{
					accountId: 1,
					accountName: "codestream",
					entityGuid: "123",
					entityName: "dev",
					tags: [{ key: "env", values: ["dev"] }]
				},
				{
					accountId: 2,
					accountName: "codestream",
					entityGuid: "234",
					entityName: "us-foo (prod)",
					tags: []
				}
			]
		});
		expect(asdf.entityGuid).toEqual("234");
	});

	it("getBestEntity-default", () => {
		const newrelic = new NewRelicProvider({} as any, {} as any);
		const asdf = newrelic.getGoldenSignalsEntity({} as any, {
			repoId: "123",
			repoName: "repo1",
			repoRemote: "remote",
			entityAccounts: [
				{
					accountId: 2,
					accountName: "codestream",
					entityGuid: "012",
					entityName: "eu-foo",
					tags: []
				},
				{
					accountId: 1,
					accountName: "codestream",
					entityGuid: "123",
					entityName: "dev",
					tags: [{ key: "env", values: ["dev"] }]
				},
				{
					accountId: 2,
					accountName: "codestream",
					entityGuid: "234",
					entityName: "us-foo (staging)",
					tags: []
				}
			]
		});
		expect(asdf.entityGuid).toEqual("012");
	});
	it("getBestEntity-basedOnpreferences", () => {
		const newrelic = new NewRelicProvider({} as any, {} as any);
		const asdf = newrelic.getGoldenSignalsEntity(
			{
				preferences: {
					observabilityRepoEntities: [
						{
							repoId: "555",
							entityGuid: "234"
						}
					]
				},
				lastReads: undefined as any,
				lastReadItems: [] as any,
				joinMethod: "",
				companyIds: [],
				email: "",
				firstName: "",
				fullName: "",
				isRegistered: false,
				lastName: "",
				lastPostCreatedAt: 0,
				numMentions: 0,
				numInvites: 0,
				registeredAt: 0,
				teamIds: [],
				timeZone: "",
				totalPosts: 0,
				totalReviews: 0,
				totalCodeErrors: 0,
				numUsersInvited: 0,
				username: "",
				createdAt: 0,
				modifiedAt: 0,
				id: "",
				creatorId: ""
			},
			{
				repoId: "555",
				repoName: "repo1",
				repoRemote: "remote",
				entityAccounts: [
					{
						accountId: 1,
						accountName: "codestream",
						entityGuid: "123",
						entityName: "prod",
						tags: [{ key: "env", values: ["production"] }]
					},
					{
						accountId: 2,
						accountName: "codestream",
						entityGuid: "234",
						entityName: "prod",
						tags: []
					}
				]
			}
		);
		expect(asdf.entityGuid).toEqual("234");
	});
});
