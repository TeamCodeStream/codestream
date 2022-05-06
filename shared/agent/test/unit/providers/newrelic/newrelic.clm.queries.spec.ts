import { expect } from "chai";
import { generateMethodAverageDurationQuery } from "../../../../src/providers/newrelic/methodAverageDurationQuery";

describe("clm query generation", () => {
	describe("generateMethodAverageDurationQuery", () => {
		it("removes Nested/ path for ruby Controller", () => {
			const query = generateMethodAverageDurationQuery("ruby", "blah", [
				"Nested/Controller/agents/show",
				"Nested/Controller/agents/update"
			]);
			expect(query).to.contain(
				"metricTimesliceName in ('Controller/agents/show','Controller/agents/update')"
			);
		});

		it("adds WebTransaction/ path for python", () => {
			const query = generateMethodAverageDurationQuery("python", "blah", [
				"Function/routes.app:db_call",
				"Function/routes.app:some_call"
			]);
			expect(query).to.contain(
				"metricTimesliceName in ('WebTransaction/Function/routes.app:db_call','WebTransaction/Function/routes.app:some_call')"
			);
		});

		it("preserves /Nested path for ruby functions", () => {
			const query = generateMethodAverageDurationQuery("ruby", "blah", [
				"Nested/OtherTransaction/Background/Custom::Helpers/custom_class_method",
				"Nested/OtherTransaction/Background/Custom::Helpers/custom_class_method2"
			]);
			expect(query).to.contain(
				"metricTimesliceName in ('Nested/OtherTransaction/Background/Custom::Helpers/custom_class_method','Nested/OtherTransaction/Background/Custom::Helpers/custom_class_method2')"
			);
		});
	});
});
