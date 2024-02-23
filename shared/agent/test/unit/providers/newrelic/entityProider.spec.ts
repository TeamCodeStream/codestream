import { EntityProvider } from "../../../../src/providers/newrelic/entity/entityProvider";
import { describe, expect, it } from "@jest/globals";
import { mockDeep } from "jest-mock-extended";

import { NewRelicGraphqlClient } from "../../../../src/providers/newrelic/newRelicGraphqlClient";

jest.mock("../../../../src/providers/newrelic/newRelicGraphqlClient");

const mockNewRelicGraphqlClient = mockDeep<NewRelicGraphqlClient>();

describe("EntityProvider", () => {
	it("generateEntityQueryStatements", async () => {
		const entityProvider = new EntityProvider({} as any);
		expect(entityProvider.generateEntityQueryStatement("foo-bar_baz")).toEqual(
			"name LIKE '%foo-bar_baz%'"
		);
	});
});

describe("EntityProvider.getEntitiesById", () => {
	it("getEntitiesById has none (bad input)", async () => {
		const entityProvider = new EntityProvider(mockNewRelicGraphqlClient);
		const response = await entityProvider.getEntitiesById({ guids: [] });
		expect(mockNewRelicGraphqlClient.query).not.toHaveBeenCalled();
		expect(response).toEqual({ entities: [] });
	});

	it("getEntitiesById", async () => {
		const entityProvider = new EntityProvider(mockNewRelicGraphqlClient);

		let response = await entityProvider.getEntitiesById({ guids: ["1", "2", "3"] });
		const results = { entities: [{ guid: "1" }, { guid: "2" }, { guid: "3" }] };

		expect(response).toEqual(results);
		expect(mockNewRelicGraphqlClient.query).toHaveBeenCalled();

		jest.restoreAllMocks();

		response = await entityProvider.getEntitiesById({ guids: ["1", "2", "3"] });
		expect(response).toEqual(results);
		expect(mockNewRelicGraphqlClient.query).not.toHaveBeenCalled();

		jest.restoreAllMocks();

		response = await entityProvider.getEntitiesById({ guids: ["1"] });
		expect(response).toEqual({ entities: [{ guid: "1" }] });
		expect(mockNewRelicGraphqlClient.query).not.toHaveBeenCalled();
	});

	beforeEach(() => {
		mockNewRelicGraphqlClient.query.mockImplementation(async () => {
			return Promise.resolve({
				actor: {
					entities: [
						{
							guid: "1",
						},
						{
							guid: "2",
						},
						{
							guid: "3",
						},
					],
				},
			});
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});
});
