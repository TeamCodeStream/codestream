import {
	GraphqlNrqlError,
	GraphqlNrqlErrorResponse,
	GraphqlNrqlTimeoutError,
} from "../../../../src/providers/newrelic/newrelic.types";
import { NewRelicGraphqlClient } from "../../../../src/providers/newrelic/newRelicGraphqlClient";
import { describe, expect, it } from "@jest/globals";

describe("NewRelicGraphqlClient", () => {
	it("throws GraphqlNrqlTimeoutError for matching response", () => {
		const newRelicGraphqlClient = new NewRelicGraphqlClient(
			{} as any,
			{} as any,
			{} as any,
			{} as any,
			false
		);
		const responseBody: GraphqlNrqlErrorResponse = {
			errors: [
				{
					extensions: {
						errorClass: "TIMEOUT",
						nrOnly: {},
					},
					path: ["path"],
					message: "error happened",
				},
			],
		};
		// const error = expect(() => provider.checkGraphqlErrors(responseBody)).toThrow(GraphqlNrqlTimeoutError);
		try {
			newRelicGraphqlClient.checkGraphqlErrors(responseBody);
		} catch (e: unknown) {
			expect(e instanceof GraphqlNrqlTimeoutError).toBe(true);
			const error = e as GraphqlNrqlTimeoutError;
			expect(error.errors.length).toBe(1);
			expect(error.errors[0].message).toBe("error happened");
			return;
		}
		// TODO use fail after fixed https://github.com/facebook/jest/issues/11698
		throw new Error("GraphqlNrqlTimeoutError not thrown");
	});

	it("throws GraphqlNrqlError for other gql errors", () => {
		const newRelicGraphqlClient = new NewRelicGraphqlClient(
			{} as any,
			{} as any,
			{} as any,
			{} as any,
			false
		);
		const responseBody: GraphqlNrqlErrorResponse = {
			errors: [
				{
					extensions: {
						errorClass: "SOMETHING_BAD",
						nrOnly: {},
					},
					path: ["path"],
				},
			],
		};
		try {
			newRelicGraphqlClient.checkGraphqlErrors(responseBody);
		} catch (e: unknown) {
			expect(e instanceof GraphqlNrqlError).toBe(true);
			const error = e as GraphqlNrqlTimeoutError;
			expect(error.errors.length).toBe(1);
			return;
		}
		// TODO use fail after fixed https://github.com/facebook/jest/issues/11698
		throw new Error("GraphqlNrqlError not thrown");
	});
});
