import { generateHash } from "../../../../../src/providers/newrelic/errors/collabDiscussionUtils";

describe("generateHash", () => {
	const payload = {
		accountId: 11604698,
		entityGuid: "MTE2MDQ2OTh8TlIxfFdPUktMT0FEfDgyMjcz",
		nerdletId: "errors-inbox.error-group-details",
		pageId: [
			"MTE2MDQ2OTh8RVJUfEVSUl9HUk9VUHxjYWI1YTBjNS02ODI2LTNmNGItYmM4NS0yNGZkOGIxYWRjYWU", // errorGroupGuid
			"WORKLOAD", // inboxEntityType
		],
	};

	/**
	 * https://newrelic.atlassian.net/wiki/spaces/COL/pages/3039887409/Codestream+Collab+and+Grok#2.2-Establish-Context
	 */
	it("matches NR1 Collab", async () => {
		const expected = "fb232bbf-d09e-4aa9-b64d-ab6779686991";
		const actual = await generateHash(payload);

		expect(actual).toEqual(expected);
	});
});
