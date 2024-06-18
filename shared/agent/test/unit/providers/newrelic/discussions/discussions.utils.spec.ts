import { generateHash } from "../../../../../src/providers/newrelic/discussions/discussions.utils";

type HashDataSet = {
	accountId: number;
	entityGuid: string;
	errorGroupGuid: string;
	entityType: string;
	expectedContextId: string;
};

describe("generateHash", () => {
	it.each<HashDataSet>([
		{
			accountId: 11604698,
			entityGuid: "MTE2MDQ2OTh8TlIxfFdPUktMT0FEfDgyMjcz",
			errorGroupGuid:
				"MTE2MDQ2OTh8RVJUfEVSUl9HUk9VUHxjYWI1YTBjNS02ODI2LTNmNGItYmM4NS0yNGZkOGIxYWRjYWU",
			entityType: "WORKLOAD",
			expectedContextId: "fb232bbf-d09e-4aa9-b64d-ab6779686991",
		},
		{
			accountId: 11604698,
			entityGuid: "MTE2MDQ2OTh8QVBNfEFQUExJQ0FUSU9OfDExOTA5NDA2",
			errorGroupGuid:
				"MTE2MDQ2OTh8RVJUfEVSUl9HUk9VUHxjYWI1YTBjNS02ODI2LTNmNGItYmM4NS0yNGZkOGIxYWRjYWU",
			entityType: "WORKLOAD",
			expectedContextId: "9ab60d4b-556c-f956-1104-f90dd2dddbc3",
		},
		{
			accountId: 11189038,
			entityGuid: "MTExODkwMzh8QVBNfEFQUExJQ0FUSU9OfDIyNDIxODA5",
			errorGroupGuid:
				"MTExODkwMzh8RVJUfEVSUl9HUk9VUHwxYzc5MmFlZi1mMzUyLTNiOGQtOGVjMS1hOWY2YjE3MjQzNzU",
			entityType: "APM-APPLICATION",
			expectedContextId: "920d2561-f5e0-8608-c794-0951710c0ca0",
		},
		{
			accountId: 11189038,
			entityGuid: "MTExODkwMzh8QlJPV1NFUnxBUFBMSUNBVElPTnwzNTA5NDcyNw",
			errorGroupGuid:
				"MTExODkwMzh8RVJUfEVSUl9HUk9VUHw5MTFlMmUwOS03MmU1LTMzZTEtYmI0NS03YTI4MGIzZWMzMTY",
			entityType: "BROWSER-APPLICATION",
			expectedContextId: "fb539f61-2347-dfab-feba-783c46f61733",
		},
		{
			accountId: 1,
			entityGuid: "MXxCUk9XU0VSfEFQUExJQ0FUSU9OfDE2Mzg0OTY",
			errorGroupGuid: "MXxFUlR8RVJSX0dST1VQfDA4NGZiMjUwLTBhM2QtM2FlYy04ODg3LTY3Njk1NjRhODY2Yg",
			entityType: "NONE",
			expectedContextId: "faa2638c-cb62-64de-613c-09cad80e95ad",
		},
	])('matches NR1 Collab for Entity Type "$entityType"', async data => {
		const payload = {
			nerdletId: "errors-inbox.error-group-details",
			entityGuid: data.entityGuid,
			pageId: [data.errorGroupGuid, data.entityType],
			accountId: data.accountId,
		};

		const actual = await generateHash(payload);

		expect(actual).toEqual(data.expectedContextId);
	});
});
