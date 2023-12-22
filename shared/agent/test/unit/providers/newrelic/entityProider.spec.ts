import { EntityProvider } from "../../../../src/providers/newrelic/entity/entityProvider";
import { describe, expect, it } from "@jest/globals";

describe("EntityProvider", () => {
	it("generateEntityQueryStatements", async () => {
		const entityProvider = new EntityProvider({} as any);
		expect(entityProvider.generateEntityQueryStatement("foo-bar_baz")).toEqual(
			"name LIKE '%foo-bar_baz%'"
		);
	});
});
