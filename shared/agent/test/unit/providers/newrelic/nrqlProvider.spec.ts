import { NrNRQLProvider } from "../../../../src/providers/newrelic/nrql/nrqlProvider";
import { describe, expect, it } from "@jest/globals";
// import { NewRelicGraphqlClient } from "../../../../src/providers/newrelic/newRelicGraphqlClient";

describe("fetchRecentQueries", () => {
	const graphqlClient = {
		query: function () {
			return new Promise(resolve => {
				let now = new Date().getTime();
				resolve({
					actor: {
						accounts: [
							{ id: 1, name: "foo" },
							{ id: 2, name: "bar" },
							{ id: 1, name: "baz" },
						],
						queryHistory: {
							nrql: [
								{ query: "Select Foo from Bar limit 1", accountIds: [1, 2, 3], createdAt: now },
								{ query: "Select Foo from Bar limit 1", accountIds: [1, 2, 3], createdAt: now },
								{ query: "Select bar from Baz limit 10", accountIds: [2, 3], createdAt: now },
							],
						},
					},
				} as any);
			});
		},
	};
	const provider = new NrNRQLProvider(graphqlClient as any);
	it("fetches recent queries and dedupes", async () => {
		const result = await provider.fetchRecentQueries({});
		expect(result.items.length).toBe(2);
		expect(
			result.items.map(_ => {
				return { accounts: _.accounts, dayString: _.dayString, query: _.query };
			})
		).toStrictEqual([
			{
				accounts: [
					{ id: 1, name: "foo" },
					{ id: 2, name: "bar" },
					{ id: 1, name: "baz" },
				],
				dayString: "Today",
				query: "Select Foo from Bar limit 1",
			},
			{
				accounts: [{ id: 2, name: "bar" }],
				dayString: "Today",
				query: "Select bar from Baz limit 10",
			},
		]);
	});
});

describe("transformQuery", () => {
	const provider = new NrNRQLProvider({} as any);
	const cleaned = `FROM Collection   SELECT foo    WHERE queryTypes = 'bar'    AND status = 'baz'`;

	it("removes all comments properly (with space)", () => {
		const result = provider.transformQuery(`FROM Collection
  SELECT foo -- that's the foo
  WHERE queryTypes = 'bar' 
  AND status = 'baz' // baz is here`);
		expect(result).toBe(cleaned);
	});

	it("removes all comments properly (without space)", () => {
		const result = provider.transformQuery(`FROM Collection
  SELECT foo --that's the foo
  WHERE queryTypes = 'bar' 
  AND status = 'baz' //baz is here`);
		expect(result).toBe(cleaned);
	});

	it("removes all comments properly (with multiline)", () => {
		const result = provider.transformQuery(`FROM Collection
  SELECT foo /* that's the foo
  and it's on two lines */
  WHERE queryTypes = 'bar' 
  AND status = 'baz' //baz is here`);
		expect(result).toBe(cleaned);
	});

	it("removes all whitespace at the end", () => {
		const result = provider.transformQuery(`FROM Collection
SELECT foo /* that's the foo
and it's on two lines */
WHERE queryTypes = 'bar' 
AND status = 'baz' //baz is here
       `);
		expect(result).toBe(`FROM Collection SELECT foo  WHERE queryTypes = 'bar'  AND status = 'baz'`);
	});

	it("removes all whitespace at the end", () => {
		const result = provider.transformQuery(`/* FROM Collection
SELECT foo
WHERE queryTypes = 'bar' 
AND status = 'baz'
*/`);
		expect(result).toBe("");
	});
});

describe("getResultsType", () => {
	const provider = new NrNRQLProvider({} as any);

	it("is a table", () => {
		const result = provider.getResultsType([], {} as any);
		expect(result).toStrictEqual({ selected: "table", enabled: NrNRQLProvider.ALL_RESULT_TYPES });
	});

	it("is a billboard", () => {
		const result = provider.getResultsType(
			[
				{
					count: 1,
				},
			],
			{} as any
		);
		expect(result).toStrictEqual({ selected: "billboard", enabled: ["billboard", "json"] });
	});

	it("is a table (timeseries & facet)", () => {
		const result = provider.getResultsType(
			[
				// can be anything > 1 result
				{
					count: 1,
				},
				{
					count: 1,
				},
			],
			{ timeSeries: true, facet: "count" } as any
		);
		expect(result).toStrictEqual({ selected: "line", enabled: ["table", "json", "line"] });
	});

	it("is json (timeseries)", () => {
		const result = provider.getResultsType(
			[
				// can be anything > 1 result
				{
					count: 1,
					foo: "bar",
				},
				{
					count: 1,
					foo: "bar",
				},
			],
			{ timeSeries: true } as any
		);
		expect(result).toStrictEqual({
			selected: "json",
			enabled: ["json"],
		});
	});

	it("is line (timeseries)", () => {
		const result = provider.getResultsType(
			[
				// can be anything > 1 result
				{
					count: 1,
				},
				{
					count: 1,
				},
			],
			{ timeSeries: true } as any
		);
		expect(result).toStrictEqual({ selected: "line", enabled: ["table", "json", "line", "area"] });
	});

	it("is bar (facet)", () => {
		const result = provider.getResultsType(
			[
				// can be anything > 1 result
				{
					count: 1,
				},
				{
					count: 1,
				},
			],
			{ facet: "name" } as any
		);
		expect(result).toStrictEqual({ selected: "bar", enabled: ["bar", "json", "pie", "table"] });
	});
});
