import { NrqlQueryBuilder } from "../../../../src/providers/newrelic/nrql/nrqlQueryBuilder";

describe("QueryBuilder", () => {
	let queryBuilder: NrqlQueryBuilder;

	beforeEach(() => {
		queryBuilder = new NrqlQueryBuilder();
	});

	it("should build a basic NRQL query", () => {
		const query = queryBuilder.select("average(responseTime)").from("Transaction").build();
		expect(query).toBe("SELECT average(responseTime) FROM Transaction");
	});

	it("should build a basic NRQL query with undefined items", () => {
		const query = queryBuilder
			.select("average(responseTime)")
			.from("Transaction")
			.where(undefined)
			.and(undefined)
			.facet(undefined)
			.since(undefined)
			.limit(undefined)
			.build();
		expect(query).toBe("SELECT average(responseTime) FROM Transaction");
	});

	it("should build a NRQL query with a where condition", () => {
		const query = queryBuilder
			.select(["average(responseTime)"])
			.from("Transaction")
			.where('appName = "MyApp"')
			.build();
		expect(query).toBe('SELECT average(responseTime) FROM Transaction WHERE appName = "MyApp"');
	});

	it("should build a NRQL query with multiple where conditions", () => {
		const query = queryBuilder
			.select("average(responseTime)")
			.from("Transaction")
			.where('appName = "MyApp"')
			.and('country = "US"')
			.build();
		expect(query).toBe(
			'SELECT average(responseTime) FROM Transaction WHERE appName = "MyApp" AND country = "US"'
		);
	});

	it("should build a NRQL query with a limit", () => {
		const query = queryBuilder.select("average(responseTime)").from("Transaction").limit(1).build();
		expect(query).toBe("SELECT average(responseTime) FROM Transaction LIMIT 1");
	});

	it("should build a NRQL query with a provided since value", () => {
		const query = queryBuilder
			.select("average(responseTime)")
			.from("Transaction")
			.since("1 week")
			.build();
		expect(query).toBe("SELECT average(responseTime) FROM Transaction SINCE 1 week AGO");
	});

	it("should build a NRQL query with all available options", () => {
		const query = queryBuilder
			.select(["average(responseTime)"])
			.from("Transaction")
			.where('appName = "MyApp"')
			.and('country = "US"')
			.facet("foo")
			.limit(10)
			.since("1 week")
			.timeseries("1 hour")
			.build();
		expect(query).toBe(
			'SELECT average(responseTime) FROM Transaction WHERE appName = "MyApp" AND country = "US" FACET foo LIMIT 10 SINCE 1 week AGO TIMESERIES 1 hour'
		);
	});

	it("should re-build a NRQL query with where & and", () => {
		const query = queryBuilder
			.select(["average(responseTime)"])
			.from("Transaction")
			.where('appName = "MyApp"')
			.and('country = "US"')
			.limit(10)
			.since("1 week");

		const build1 = query.build();
		expect(build1).toBe(
			'SELECT average(responseTime) FROM Transaction WHERE appName = "MyApp" AND country = "US" LIMIT 10 SINCE 1 week AGO'
		);

		const build2 = query.copy().where('appName = "MyOtherApp"').and('country = "CAN"').build();
		expect(build2).toBe(
			'SELECT average(responseTime) FROM Transaction WHERE appName = "MyOtherApp" AND country = "CAN" LIMIT 10 SINCE 1 week AGO'
		);
	});

	it("should re-build a NRQL query with and (with copy)", () => {
		const query = queryBuilder
			.select(["average(responseTime)"])
			.from("Transaction")
			.where('appName = "MyApp"')
			.limit(10)
			.since("1 week");

		const build1 = query.build();
		expect(build1).toBe(
			'SELECT average(responseTime) FROM Transaction WHERE appName = "MyApp" LIMIT 10 SINCE 1 week AGO'
		);

		const build2 = query.copy().and('country = "CAN"').build();
		expect(build2).toBe(
			'SELECT average(responseTime) FROM Transaction WHERE appName = "MyApp" AND country = "CAN" LIMIT 10 SINCE 1 week AGO'
		);
	});

	it("should re-build a NRQL query with and (without copy)", () => {
		const query = queryBuilder
			.select(["average(responseTime)"])
			.from("Transaction")
			.where('appName = "MyApp"')
			.limit(10)
			.since("1 week");

		const build1 = query.build();
		expect(build1).toBe(
			'SELECT average(responseTime) FROM Transaction WHERE appName = "MyApp" LIMIT 10 SINCE 1 week AGO'
		);

		const build2 = query.and('country = "CAN"').build();
		expect(build2).toBe(
			'SELECT average(responseTime) FROM Transaction WHERE appName = "MyApp" AND country = "CAN" LIMIT 10 SINCE 1 week AGO'
		);
	});

	it("should work with an unordered NRQL query", () => {
		const query1 = queryBuilder
			.where('appName = "MyApp"')
			.select(["average(responseTime)"])
			.and('country = "US"')
			.limit(10)
			.from("Transaction")
			.since("1 minute");

		const build1 = query1.build();
		expect(build1).toBe(
			'SELECT average(responseTime) FROM Transaction WHERE appName = "MyApp" AND country = "US" LIMIT 10 SINCE 1 minute AGO'
		);
	});
});
