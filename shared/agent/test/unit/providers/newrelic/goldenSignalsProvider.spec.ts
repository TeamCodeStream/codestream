"use strict";

import { describe, expect, it } from "@jest/globals";

import { GoldenSignalsProvider } from "../../../../src/providers/newrelic/goldenSignals/goldenSignalsProvider";
import { EntityGoldenMetrics } from "../../../../../util/src/protocol/agent/agent.protocol.providers";

describe("newRelicProvider", () => {
	it("getBestEntity-basedOnTag", () => {
		const goldenSignalsProvider = new GoldenSignalsProvider(
			{} as any,
			{} as any,
			{} as any,
			{} as any
		);
		const asdf = goldenSignalsProvider.getGoldenSignalsEntity({} as any, {
			repoId: "123",
			repoName: "repo1",
			repoRemote: "remote",
			hasCodeLevelMetricSpanData: true,
			entityAccounts: [
				{
					accountId: 1,
					accountName: "codestream",
					entityGuid: "123",
					entityName: "prod",
					tags: [{ key: "env", values: ["production"] }],
					distributedTracingEnabled: true,
				},
			],
		});
		expect(asdf.entityGuid).toEqual("123");
	});

	it("getBestEntity-basedOnName", () => {
		const goldenSignalsProvider = new GoldenSignalsProvider(
			{} as any,
			{} as any,
			{} as any,
			{} as any
		);
		const asdf = goldenSignalsProvider.getGoldenSignalsEntity({} as any, {
			repoId: "123",
			repoName: "repo1",
			repoRemote: "remote",
			hasCodeLevelMetricSpanData: true,
			entityAccounts: [
				{
					accountId: 1,
					accountName: "codestream",
					entityGuid: "123",
					entityName: "dev",
					tags: [{ key: "env", values: ["dev"] }],
					distributedTracingEnabled: true,
				},
				{
					accountId: 2,
					accountName: "codestream",
					entityGuid: "234",
					entityName: "us-foo (prod)",
					distributedTracingEnabled: true,

					tags: [],
				},
			],
		});
		expect(asdf.entityGuid).toEqual("234");
	});

	it("getBestEntity-default", () => {
		const goldenSignalsProvider = new GoldenSignalsProvider(
			{} as any,
			{} as any,
			{} as any,
			{} as any
		);
		const asdf = goldenSignalsProvider.getGoldenSignalsEntity({} as any, {
			repoId: "123",
			repoName: "repo1",
			repoRemote: "remote",
			hasCodeLevelMetricSpanData: true,
			entityAccounts: [
				{
					accountId: 2,
					accountName: "codestream",
					entityGuid: "012",
					entityName: "eu-foo",
					tags: [],
					distributedTracingEnabled: true,
				},
				{
					accountId: 1,
					accountName: "codestream",
					entityGuid: "123",
					entityName: "dev",
					tags: [{ key: "env", values: ["dev"] }],
					distributedTracingEnabled: true,
				},
				{
					accountId: 2,
					accountName: "codestream",
					entityGuid: "234",
					entityName: "us-foo (staging)",
					tags: [],
					distributedTracingEnabled: true,
				},
			],
		});
		expect(asdf.entityGuid).toEqual("012");
	});
	it("getBestEntity-basedOnpreferences", () => {
		const goldenSignalsProvider = new GoldenSignalsProvider(
			{} as any,
			{} as any,
			{} as any,
			{} as any
		);
		const asdf = goldenSignalsProvider.getGoldenSignalsEntity(
			{
				preferences: {
					observabilityRepoEntities: [
						{
							repoId: "555",
							entityGuid: "234",
						},
					],
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
				nrUserId: 0,
				creatorId: "",
			},
			{
				repoId: "555",
				repoName: "repo1",
				repoRemote: "remote",
				hasCodeLevelMetricSpanData: true,
				entityAccounts: [
					{
						accountId: 1,
						accountName: "codestream",
						entityGuid: "123",
						entityName: "prod",
						tags: [{ key: "env", values: ["production"] }],
						distributedTracingEnabled: true,
					},
					{
						accountId: 2,
						accountName: "codestream",
						entityGuid: "234",
						entityName: "prod",
						tags: [],
						distributedTracingEnabled: true,
					},
				],
			}
		);
		expect(asdf.entityGuid).toEqual("234");
	});

	it("getEntityLevelGoldenMetrics", async () => {
		const graphqlClient = {
			query: function () {
				return new Promise(resolve => {
					resolve({
						actor: {
							entity: {
								goldenMetrics: {
									metrics: [
										{
											definition: { from: "Transaction", select: "count(name)" },
											name: "FooBar",
											title: "FooBar",
											unit: "any",
										},
										{
											definition: { from: "Metric", select: "count(*)" },
											name: "Baz",
											title: "Baz",
											unit: "any",
										},
									],
								},
							},
						},
					} as any);
				});
			},
		};

		const deploymentProviderStub = {
			getDeploymentDiff: async () => {
				return { errorRateData: {}, responseTimeData: {} } as any;
			},
		};

		const goldenSignalsProvider = new GoldenSignalsProvider(
			graphqlClient as any,
			{} as any,
			{} as any,
			deploymentProviderStub as any
		);

		const response = (await goldenSignalsProvider.getEntityLevelGoldenMetrics(
			"123",
			123
		)) as EntityGoldenMetrics;

		expect(response.since).toEqual("30 min");
		expect(response.metrics[0].queries?.timeseries).toEqual(
			`SELECT count(name) AS 'result' \nFROM Transaction \nWHERE entity.guid='123' \nSINCE 30 MINUTES AGO \nTIMESERIES`
		);
		expect(response.metrics[1].queries?.timeseries).toEqual(
			`SELECT count(*) AS 'result' \nFROM Metric \nWHERE entity.guid='123' \nSINCE 30 MINUTES AGO \nTIMESERIES`
		);
	});
});
