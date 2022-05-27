import { expect } from "chai";
import { generateMethodAverageDurationQuery } from "../../../../src/providers/newrelic/methodAverageDurationQuery";
import { generateSpanQuery } from "../../../../src/providers/newrelic/spanQuery";

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
	describe("generateSpanQuery", () => {
		it("generates filePath locator query", () => {
			const response = generateSpanQuery("nrGuid", "filePath", "my/file.py");
			// console.log(response);
			expect(response).includes(
				"equals:nrql(query: \"SELECT name,`transaction.name`,code.lineno,code.namespace,code.function,traceId,transactionId from Span WHERE `entity.guid` = 'nrGuid' AND code.filepath='my/file.py'  SINCE 30 minutes AGO LIMIT 250\")"
			);
			expect(response).includes(
				"like:nrql(query: \"SELECT name,`transaction.name`,code.lineno,code.namespace,code.function,traceId,transactionId from Span WHERE `entity.guid` = 'nrGuid' AND code.filepath like '%my/file.py'  SINCE 30 minutes AGO LIMIT 250\")"
			);
			expect(response).includes(
				"fuzzy:nrql(query: \"SELECT name,`transaction.name`,code.lineno,code.namespace,code.function,traceId,transactionId from Span WHERE `entity.guid` = 'nrGuid' AND code.filepath like '%/my/file.py%'  SINCE 30 minutes AGO LIMIT 250\")"
			);
		});

		it("generates namespace only locator query", () => {
			const response = generateSpanQuery("nrGuid", "locator", undefined, {
				namespace: "blah"
			});
			// console.log(response);
			expect(response).includes(
				"equals:nrql(query: \"SELECT name,`transaction.name`,code.lineno,code.namespace,code.function,traceId,transactionId from Span WHERE `entity.guid` = 'nrGuid' AND code.namespace='blah' SINCE 30 minutes AGO LIMIT 250\")"
			);
			expect(response).includes(
				"like:nrql(query: \"SELECT name,`transaction.name`,code.lineno,code.namespace,code.function,traceId,transactionId from Span WHERE `entity.guid` = 'nrGuid' AND code.namespace like 'blah%' SINCE 30 minutes AGO LIMIT 250\")"
			);
		});

		it("generates namespace and function locator query", () => {
			const response = generateSpanQuery("nrGuid", "locator", undefined, {
				namespace: "blah",
				functionName: "foo"
			});
			// console.log(response);
			expect(response).includes(
				"equals:nrql(query: \"SELECT name,`transaction.name`,code.lineno,code.namespace,code.function,traceId,transactionId from Span WHERE `entity.guid` = 'nrGuid' AND code.namespace='blah' AND code.function='foo' SINCE 30 minutes AGO LIMIT 250\")"
			);
			expect(response).includes(
				"like:nrql(query: \"SELECT name,`transaction.name`,code.lineno,code.namespace,code.function,traceId,transactionId from Span WHERE `entity.guid` = 'nrGuid' AND code.namespace like 'blah%' AND code.function like 'foo%' SINCE 30 minutes AGO LIMIT 250\")"
			);
		});
	});
});
