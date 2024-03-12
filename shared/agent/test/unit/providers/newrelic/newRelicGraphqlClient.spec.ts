import { ResponseError } from "vscode-languageserver";
import {
	GraphqlNrqlError,
	GraphqlNrqlErrorResponse,
	GraphqlNrqlTimeoutError,
} from "../../../../src/providers/newrelic/newrelic.types";
import {
	NewRelicGraphqlClient,
	isInvalidInputErrorResponse,
} from "../../../../src/providers/newrelic/newRelicGraphqlClient";
import { describe, expect, it } from "@jest/globals";
import { ERROR_NRQL_INVALID_INPUT } from "@codestream/protocols/agent";

let instance: NewRelicGraphqlClient;
let mockClientRequestWrap: any;
let mockCheckGraphqlErrors: any;
let mockGetAccessTokenError: any;
let mockGetInsufficientApiKeyError: any;

class HttpErrorResponse extends Error {
	response: { errors: any };
	constructor(
		errors: {
			extensions: {
				errorClass: string;
			};
			message?: string;
		}[]
	) {
		super();
		this.name = "HttpErrorResponse";
		this.response = {
			errors: errors,
		};
	}
}

beforeEach(() => {
	// Create mock functions
	mockClientRequestWrap = jest.fn().mockImplementation(data => {
		if (data === "badData") {
			throw new HttpErrorResponse([{ extensions: { errorClass: "INVALID_INPUT" } }]);
		}
		return { data };
	});
	mockCheckGraphqlErrors = jest.fn();
	mockGetAccessTokenError = jest.fn();
	mockGetInsufficientApiKeyError = jest.fn();

	// Create an instance of NewRelicGraphqlClient
	instance = new NewRelicGraphqlClient({} as any, {} as any, {} as any, {} as any, false);

	// Replace the original methods with the mock functions
	jest.spyOn(instance, "clientRequestWrap" as any).mockImplementation(mockClientRequestWrap);
	jest.spyOn(instance, "checkGraphqlErrors" as any).mockImplementation(mockCheckGraphqlErrors);
	jest.spyOn(instance, "getAccessTokenError" as any).mockImplementation(mockGetAccessTokenError);
	jest
		.spyOn(instance, "getInsufficientApiKeyError" as any)
		.mockImplementation(mockGetInsufficientApiKeyError);
});

afterEach(() => {
	// Reset the mocks
	mockClientRequestWrap.mockReset();
	mockCheckGraphqlErrors.mockReset();
	mockGetAccessTokenError.mockReset();
	mockGetInsufficientApiKeyError.mockReset();
});

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

	it("isInvalidInputErrorResponse", async () => {
		expect(
			isInvalidInputErrorResponse(
				new HttpErrorResponse([{ extensions: { errorClass: "INVALID_INPUT" } }])
			)
		).toBe(true);
	});

	it("!isInvalidInputErrorResponse", async () => {
		expect(isInvalidInputErrorResponse(new Error("anything"))).toBe(false);
	});

	it("query() works", async () => {
		mockClientRequestWrap("testData1");

		const result = await instance.query("testData1", { var1: "value1" });

		expect(result).toEqual({ data: "testData1" });
		expect(mockClientRequestWrap).toHaveBeenCalledTimes(2);
	});

	it("query() INVALID_INPUT", async () => {
		try {
			await instance.query("badData", { var1: "nothing" });
		} catch (e) {
			expect(e instanceof ResponseError).toBe(true);
			expect(e.code).toBe(ERROR_NRQL_INVALID_INPUT);
		}
	});
});
