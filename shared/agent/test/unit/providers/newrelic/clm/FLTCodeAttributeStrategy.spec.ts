"use strict";

import { Dictionary } from "lodash";
import { MetricTimeslice, Span } from "../../../../../src/providers/newrelic/newrelic.types";
import { FLTCodeAttributeStrategy } from "../../../../../src/providers/newrelic/clm/FLTCodeAttributeStrategy";
import { NewRelicGraphqlClient } from "../../../../../src/providers/newrelic/newRelicGraphqlClient";
import { describe, expect, it } from "@jest/globals";

const mockRunNrql = jest.fn();

const mockNewRelicGraphqlClient = {
	runNrql: mockRunNrql,
} as unknown as NewRelicGraphqlClient;

describe("FLTCodeAttributeStrategy", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("addMethodName", () => {
		it("parses python function name", async () => {
			const strategy = new FLTCodeAttributeStrategy(
				"entityGuid",
				1,
				"python",
				"/foo/bar.py",
				{
					fileUri: "/foo/bar.py",
					languageId: "python",
				},
				"locator",
				mockNewRelicGraphqlClient
			);
			const results = strategy.addMethodName(
				{
					"Function/routes.app:hello_world|1|null": [
						{
							traceId: "123",
							transactionId: "abc",
							"code.lineno": 1,
							"code.namespace": null,
							"transaction.name": "a",
							"code.function": "hello_world",
						},
					],
					"Function/routes.app:MyClass.my_method|4|null": [
						{
							traceId: "456",
							transactionId: "def",
							"code.lineno": 4,
							"code.namespace": null,
							"transaction.name": "d",
							"code.function": "my_method",
						},
					],
				},
				[
					{
						facet: ["Function/routes.app:hello_world", "1"],
						averageDuration: 3.2,
						// metricTimesliceName: "Function/routes.app:hello_world",
					},
					{
						facet: ["Function/routes.app:MyClass.my_method", "4"],
						averageDuration: 3.2,
						// metricTimesliceName: "Function/routes.app:MyClass.my_method",
					},
				]
			);

			expect(results).toEqual([
				{
					averageDuration: 3.2,
					className: undefined,
					facet: ["Function/routes.app:hello_world", "1"],
					lineno: undefined,
					column: undefined,
					commit: undefined,
					namespace: null,
					functionName: "hello_world",
					metadata: {
						"code.lineno": 1,
						"code.column": undefined,
						traceId: "123",
						transactionId: "abc",
						"code.namespace": null,
						"code.function": "hello_world",
						"tags.commit": undefined,
					},
				},
				{
					averageDuration: 3.2,
					facet: ["Function/routes.app:MyClass.my_method", "4"],
					className: "MyClass",
					column: undefined,
					commit: undefined,
					lineno: undefined,
					namespace: null,
					metadata: {
						"code.lineno": 4,
						"column.column": undefined,
						traceId: "456",
						transactionId: "def",
						"code.namespace": null,
						"code.function": "my_method",
						"tags.commit": undefined,
					},
					functionName: "my_method",
				},
			]);
		});

		it("maps python code.namespace", async () => {
			const strategy = new FLTCodeAttributeStrategy(
				"entityGuid",
				1,
				"python",
				"/foo/bar.py",
				{
					fileUri: "/foo/bar.py",
					languageId: "python",
				},
				"locator",
				mockNewRelicGraphqlClient
			);
			const results = strategy.addMethodName(
				{
					"Carrot/foo_bar.system.tasks.bill_credit_payment_item|27|null": [
						{
							"code.filepath": "/app/foo_bar/system/tasks.py",
							"code.function": "bill_credit_payment_item",
							"code.lineno": 27,
							"code.namespace": "foo_bar.system.tasks",
							timestamp: 1647628200280,
						},
					],
				},
				[
					{
						facet: ["OtherTransaction/Carrot/foo_bar.system.tasks.bill_credit_payment_item", "27"],
						averageDuration: 3.2,
						// metricTimesliceName:
						// 	"OtherTransaction/Carrot/foo_bar.system.tasks.bill_credit_payment_item",
					},
				]
			);

			expect(results).toEqual([
				{
					averageDuration: 3.2,
					className: undefined,
					facet: ["OtherTransaction/Carrot/foo_bar.system.tasks.bill_credit_payment_item", "27"],
					namespace: "foo_bar.system.tasks",
					metadata: {
						"code.lineno": 27,
						"code.column": undefined,
						"tags.commit": undefined,
						"code.namespace": "foo_bar.system.tasks",
						traceId: undefined,
						transactionId: undefined,
						"code.function": "bill_credit_payment_item",
					},
					functionName: "bill_credit_payment_item",
				},
			]);
		});

		it("handles ruby controller", () => {
			const strategy = new FLTCodeAttributeStrategy(
				"entityGuid",
				1,
				"ruby",
				"/foo/bar.rb",
				{
					fileUri: "/foo/bar.rb",
					languageId: "ruby",
				},
				"locator",
				mockNewRelicGraphqlClient
			);
			const groupedByTransactionName = {
				"Controller/agents/show|16|null": [
					{
						"code.lineno": 16,
						"code.namespace": "AgentsController",
						"code.function": "show",
						name: "Controller/agents/show",
						timestamp: 1651192630939,
						traceId: "289d61d8564a72ef01bcea7b76b95ca4",
						"transaction.name": null,
						transactionId: "5195e0f31cf1fce4",
					},
				],
				"Controller/agents/create|16|null": [
					{
						"code.lineno": 16,
						"code.namespace": "AgentsController",
						"code.function": "create",
						name: "Controller/agents/create",
						timestamp: 1651192612236,
						traceId: "67e121ac35ff1cbe191fd1da94e50012",
						"transaction.name": null,
						transactionId: "2ac9f995b004df82",
					},
				],
				"Controller/agents/destroy|55|null": [
					{
						"code.lineno": 55,
						"code.namespace": "AgentsController",
						"code.function": "destroy",
						name: "Controller/agents/destroy",
						timestamp: 1651192599849,
						traceId: "063c6612799ad82201ee739f4213ff39",
						"transaction.name": null,
						transactionId: "43d95607af1fa91f",
					},
				],
			};

			const metricTimesliceNames: MetricTimeslice[] = [
				{
					facet: ["Controller/agents/create", "16"],
					// metricTimesliceName: "Controller/agents/create",
					// requestsPerMinute: 22.2,
				},
				{
					facet: ["Controller/agents/show", "16"],
					// metricTimesliceName: "Controller/agents/show",
					// requestsPerMinute: 22.2,
				},
				{
					facet: ["Controller/agents/destroy", "55"],
					// metricTimesliceName: "Controller/agents/destroy",
					// requestsPerMinute: 22.23,
				},
			];

			const results = strategy.addMethodName(groupedByTransactionName, metricTimesliceNames);
			expect(results).toEqual([
				{
					className: "AgentsController",
					facet: ["Controller/agents/create", "16"],
					// metricTimesliceName: "Controller/agents/create",
					namespace: "AgentsController",
					// requestsPerMinute: 22.2,
					metadata: {
						"code.lineno": 16,
						traceId: "67e121ac35ff1cbe191fd1da94e50012",
						transactionId: "2ac9f995b004df82",
						"code.namespace": "AgentsController",
						"code.function": "create",
					},
					functionName: "create",
				},
				{
					className: "AgentsController",
					facet: ["Controller/agents/show", "16"],
					// requestsPerMinute: 22.2,
					namespace: "AgentsController",
					metadata: {
						"code.lineno": 16,
						traceId: "289d61d8564a72ef01bcea7b76b95ca4",
						transactionId: "5195e0f31cf1fce4",
						"code.namespace": "AgentsController",
						"code.function": "show",
					},
					functionName: "show",
				},
				{
					className: "AgentsController",
					facet: ["Controller/agents/destroy", "55"],
					// requestsPerMinute: 22.23,
					namespace: "AgentsController",
					metadata: {
						"code.lineno": 55,
						traceId: "063c6612799ad82201ee739f4213ff39",
						transactionId: "43d95607af1fa91f",
						"code.namespace": "AgentsController",
						"code.function": "destroy",
					},
					functionName: "destroy",
				},
			]);
			// console.info("result", JSON.stringify(result, null, 2));
		});

		it("handles ruby ActiveJob", () => {
			const strategy = new FLTCodeAttributeStrategy(
				"entityGuid",
				1,
				"ruby",
				"/foo/bar.rb",
				{
					fileUri: "/foo/bar.rb",
					languageId: "ruby",
				},
				"locator",
				mockNewRelicGraphqlClient
			);
			const groupedByTransactionName = {
				"MessageBroker/ActiveJob::Async/Queue/Produce/Named/default|8|null": [
					{
						"code.filepath": "/usr/src/app/app/jobs/notifier_job.rb",
						"code.function": "perform",
						"code.lineno": 8,
						"code.namespace": "NotifierJob",
						name: "MessageBroker/ActiveJob::Async/Queue/Produce/Named/default",
						timestamp: 1652110848694,
						traceId: "2d2a1cfae193394b121427ff11df5fc5",
						"transaction.name": null,
						transactionId: "5154409dd464aad1",
					},
					{
						"code.filepath": "/usr/src/app/app/jobs/notifier_job.rb|8|null",
						"code.function": "perform",
						"code.lineno": 8,
						"code.namespace": "NotifierJob",
						name: "MessageBroker/ActiveJob::Async/Queue/Produce/Named/default",
						timestamp: 1652110782764,
						traceId: "84ea3aebfc980a997ae65beefad3a208",
						"transaction.name": null,
						transactionId: "d120d392b5ab777f",
					},
				],
			};

			const metricTimesliceNames: MetricTimeslice[] = [
				{
					facet: ["MessageBroker/ActiveJob::Async/Queue/Produce/Named/default", "8"],
					// requestsPerMinute: 24.1,
					// metricTimesliceName: "MessageBroker/ActiveJob::Async/Queue/Produce/Named/default",
				},
			];

			const results = strategy.addMethodName(groupedByTransactionName, metricTimesliceNames);
			expect(results).toEqual([
				{
					className: "NotifierJob",
					facet: ["MessageBroker/ActiveJob::Async/Queue/Produce/Named/default", "8"],
					namespace: "NotifierJob",
					// requestsPerMinute: 24.1,
					metadata: {
						"code.lineno": 8,
						traceId: "2d2a1cfae193394b121427ff11df5fc5",
						transactionId: "5154409dd464aad1",
						"code.namespace": "NotifierJob",
						"code.function": "perform",
					},
					functionName: "perform",
				},
			]);
		});

		it("parses ruby modules:class:functions syntax", () => {
			const strategy = new FLTCodeAttributeStrategy(
				"entityGuid",
				1,
				"ruby",
				"/foo/bar.rb",
				{
					fileUri: "/foo/bar.rb",
					languageId: "ruby",
				},
				"locator",
				mockNewRelicGraphqlClient
			);
			const groupedByTransactionName: Dictionary<Span[]> = {
				"Nested/OtherTransaction/Background/Custom::Helpers/custom_class_method|11|null": [
					{
						"code.lineno": "11",
						"code.namespace": "Custom::Helpers",
						"code.function": "custom_class_method",
						name: "OtherTransaction/Background/Custom::Helpers/custom_class_method",
						timestamp: 1651700387308,
						traceId: "40c7dedd273ee4a475756393a996a03b",
						"transaction.name": null,
						transactionId: "ab968a3e203d2451",
					},
					{
						"code.lineno": "11",
						"code.namespace": "Custom::Helpers",
						"code.function": "custom_class_method",
						name: "OtherTransaction/Background/Custom::Helpers/custom_class_method",
						timestamp: 1651699137312,
						traceId: "ffe331a263b4cc7dd7080ed9f2f5faba",
						"transaction.name": null,
						transactionId: "a0627ed02eb626c0",
					},
				],
				"Custom/CLMtesting/InstanceMethod|33|null": [
					{
						"code.lineno": 33,
						"code.namespace": "Custom::Helpers",
						"code.function": "custom_instance_method_too",
						name: "Custom/CLMtesting/InstanceMethod",
						timestamp: 1651700387308,
						traceId: "40c7dedd273ee4a475756393a996a03b",
						"transaction.name": null,
						transactionId: "ab968a3e203d2451",
					},
					{
						"code.lineno": 33,
						"code.namespace": "Custom::Helpers",
						"code.function": "custom_instance_method_too",
						name: "Custom/CLMtesting/InstanceMethod",
						timestamp: 1651700356133,
						traceId: "26d3724a5635120ede570b383ddf5790",
						"transaction.name": null,
						transactionId: "2e1a7d60f6a4400d",
					},
				],
				"Nested/OtherTransaction/Background/Custom::Helpers/custom_instance_method|27|null": [
					{
						"code.lineno": "27",
						"code.namespace": "Custom::Helpers",
						"code.function": "custom_instance_method",
						name: "OtherTransaction/Background/Custom::Helpers/custom_instance_method",
						timestamp: 1651700387308,
						traceId: "40c7dedd273ee4a475756393a996a03b",
						"transaction.name": null,
						transactionId: "ab968a3e203d2451",
					},
					{
						"code.lineno": "27",
						"code.namespace": "Custom::Helpers",
						"code.function": "custom_instance_method",
						name: "OtherTransaction/Background/Custom::Helpers/custom_instance_method",
						timestamp: 1651700356133,
						traceId: "26d3724a5635120ede570b383ddf5790",
						"transaction.name": null,
						transactionId: "2e1a7d60f6a4400d",
					},
				],
				"Custom/CLMtesting/ClassMethod|16|null": [
					{
						"code.lineno": 16,
						"code.namespace": "Custom::Helpers",
						"code.function": "self.custom_class_method_too",
						name: "Custom/CLMtesting/ClassMethod",
						timestamp: 1651700387308,
						traceId: "40c7dedd273ee4a475756393a996a03b",
						"transaction.name": null,
						transactionId: "ab968a3e203d2451",
					},
					{
						"code.lineno": 16,
						"code.namespace": "Custom::Helpers",
						"code.function": "self.custom_class_method_too",
						name: "Custom/CLMtesting/ClassMethod",
						timestamp: 1651700356133,
						traceId: "26d3724a5635120ede570b383ddf5790",
						"transaction.name": null,
						transactionId: "2e1a7d60f6a4400d",
					},
				],
			};

			const metricTimesliceNames: MetricTimeslice[] = [
				{
					facet: ["Nested/OtherTransaction/Background/Custom::Helpers/custom_class_method", "11"],
					averageDuration: 1.1,
					// metricTimesliceName:
					// 	"Nested/OtherTransaction/Background/Custom::Helpers/custom_class_method",
				},
				{
					facet: [
						"Nested/OtherTransaction/Background/Custom::Helpers/custom_instance_method",
						"27",
					],
					averageDuration: 1.2,
					// metricTimesliceName:
					// 	"Nested/OtherTransaction/Background/Custom::Helpers/custom_instance_method",
				},
				{
					facet: ["Custom/CLMtesting/ClassMethod", "16"],
					averageDuration: 1.3,
					// metricTimesliceName: "Custom/CLMtesting/ClassMethod",
				},
				{
					facet: ["Custom/CLMtesting/InstanceMethod", "33"],
					averageDuration: 1.4,
					// metricTimesliceName: "Custom/CLMtesting/InstanceMethod",
				},
			];

			const results = strategy.addMethodName(groupedByTransactionName, metricTimesliceNames);
			// console.info("result", JSON.stringify(results, null, 2));
			expect(results).toEqual([
				{
					className: "Helpers",
					facet: ["Nested/OtherTransaction/Background/Custom::Helpers/custom_class_method", "11"],
					averageDuration: 1.1,
					namespace: "Custom",
					metadata: {
						"code.lineno": "11",
						traceId: "40c7dedd273ee4a475756393a996a03b",
						transactionId: "ab968a3e203d2451",
						"code.namespace": "Custom",
						"code.function": "custom_class_method",
					},
					functionName: "custom_class_method",
				},
				{
					className: "Helpers",
					facet: [
						"Nested/OtherTransaction/Background/Custom::Helpers/custom_instance_method",
						"27",
					],
					averageDuration: 1.2,
					namespace: "Custom",
					metadata: {
						"code.lineno": "27",
						traceId: "40c7dedd273ee4a475756393a996a03b",
						transactionId: "ab968a3e203d2451",
						"code.namespace": "Custom",
						"code.function": "custom_instance_method",
					},
					functionName: "custom_instance_method",
				},
				{
					facet: ["Custom/CLMtesting/ClassMethod", "16"],
					averageDuration: 1.3,
					className: "Helpers",
					functionName: "self.custom_class_method_too",
					namespace: "Custom",
					metadata: {
						"code.lineno": 16,
						traceId: "40c7dedd273ee4a475756393a996a03b",
						transactionId: "ab968a3e203d2451",
						"code.namespace": "Custom",
						"code.function": "self.custom_class_method_too",
					},
				},
				{
					facet: ["Custom/CLMtesting/InstanceMethod", "33"],
					averageDuration: 1.4,
					className: "Helpers",
					functionName: "custom_instance_method_too",
					namespace: "Custom",
					metadata: {
						"code.lineno": 33,
						traceId: "40c7dedd273ee4a475756393a996a03b",
						transactionId: "ab968a3e203d2451",
						"code.namespace": "Custom",
						"code.function": "custom_instance_method_too",
					},
				},
			]);
		});

		it("parses ruby class/function syntax", () => {
			const strategy = new FLTCodeAttributeStrategy(
				"entityGuid",
				1,
				"ruby",
				"/foo/bar.rb",
				{
					fileUri: "/foo/bar.rb",
					languageId: "ruby",
				},
				"locator",
				mockNewRelicGraphqlClient
			);
			const groupedByTransactionName: Dictionary<Span[]> = {
				"Nested/OtherTransaction/Background/WhichIsWhich/samename|20|null": [
					{
						"code.filepath": "/usr/src/app/lib/which_is_which.rb",
						"code.function": "samename",
						"code.lineno": "20",
						"code.namespace": "WhichIsWhich",
						name: "Nested/OtherTransaction/Background/WhichIsWhich/samename",
						timestamp: 1651855258268,
						traceId: "8c39f01c9e867d5d7179a6a5152a8f8e",
						"transaction.name": null,
						transactionId: "90b4cb9daa96f88b",
					},
				],
				"Nested/OtherTransaction/Background/WhichIsWhich/samename|9|null": [
					{
						"code.filepath": "/usr/src/app/lib/which_is_which.rb",
						"code.function": "self.samename",
						"code.lineno": "9",
						"code.namespace": "WhichIsWhich",
						name: "Nested/OtherTransaction/Background/WhichIsWhich/samename",
						timestamp: 1651855257962,
						traceId: "8c39f01c9e867d5d7179a6a5152a8f8e",
						"transaction.name": null,
						transactionId: "90b4cb9daa96f88b",
					},
				],
			};

			const metricTimesliceNames: MetricTimeslice[] = [
				{
					facet: ["Nested/OtherTransaction/Background/WhichIsWhich/samename", "20"],
					averageDuration: 1.1,
				},
				{
					facet: ["Nested/OtherTransaction/Background/WhichIsWhich/samename", "9"],
					averageDuration: 1.2,
					// metricTimesliceName: "Nested/OtherTransaction/Background/WhichIsWhich/samename",
				},
			];

			const results = strategy.addMethodName(groupedByTransactionName, metricTimesliceNames);
			// console.info("result", JSON.stringify(results, null, 2));
			expect(results).toEqual([
				{
					className: "WhichIsWhich",
					facet: ["Nested/OtherTransaction/Background/WhichIsWhich/samename", "20"],
					averageDuration: 1.1,
					namespace: "WhichIsWhich",
					metadata: {
						"code.function": "samename",
						"code.lineno": "20",
						traceId: "8c39f01c9e867d5d7179a6a5152a8f8e",
						transactionId: "90b4cb9daa96f88b",
						"code.namespace": "WhichIsWhich",
					},
					functionName: "samename",
				},
				{
					className: "WhichIsWhich",
					facet: ["Nested/OtherTransaction/Background/WhichIsWhich/samename", "9"],
					averageDuration: 1.2,
					namespace: "WhichIsWhich",
					metadata: {
						"code.function": "self.samename", // TODO is this right?
						"code.lineno": "9",
						traceId: "8c39f01c9e867d5d7179a6a5152a8f8e",
						transactionId: "90b4cb9daa96f88b",
						"code.namespace": "WhichIsWhich",
					},
					functionName: "self.samename", // TODO is this right?
				},
			]);
		});

		it("getsSpansForFlask", async () => {
			const strategy = new FLTCodeAttributeStrategy(
				"entityGuid",
				1,
				"python",
				"/foo/bar.py",
				{
					fileUri: "/foo/bar.py",
					languageId: "python",
				},
				"locator",
				mockNewRelicGraphqlClient
			);

			const results = await strategy.addMethodName(
				{
					"Function/apis.v2.superheros:superheros_superhero_by_slug|null|null": [
						{
							"code.filepath": "/superheros/apis/v2/superheroes.py",
							"code.function": "SuperheroBySlug",
							name: "Function/apis.v2.superheros:superheros_superhero_by_slug",
							timestamp: 1647612515523,
							"transaction.name": null,
						},
					],
				},
				[
					{
						facet: ["Function/apis.v2.superheros:superheros_superhero_by_slug"],
						averageDuration: 0.0025880090121565193,
						// metricTimesliceName: "Function/apis.v2.superheros:superheros_superhero_by_slug",
					},
				]
			);

			// console.log(JSON.stringify(results, null, 4));
			// NOTE: this data is not quite correct, but we're testing to assert that we will use whatever is in `code.function`
			expect(results[0].functionName).toEqual("SuperheroBySlug");
		});
	});
});
