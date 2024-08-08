import { generateHash } from "../../../../../src/providers/newrelic/discussions/discussions.utils";

type HashDataSet = {
	accountId: number;
	entityGuid: string;
	errorGroupGuid: string;
	expectedContextId: string;
};

describe("generateHash", () => {
	it.each<HashDataSet>([
		{
			accountId: 11052063,
			entityGuid: "MTEwNTIwNjN8QVBNfEFQUExJQ0FUSU9OfDQxMTg5ODg4",
			errorGroupGuid:
				"MTEwNTIwNjN8RVJUfEVSUl9HUk9VUHxkYWE4MWViYS0yOTg4LTM4ZDgtOGI0Zi03ZmZjMGI0MTM2M2I",
			expectedContextId: "dd543041-126e-38f4-a7ba-534f0d707584",
		},
		{
			accountId: 11604698,
			entityGuid: "MTE2MDQ2OTh8TlIxfFdPUktMT0FEfDgyMjcz",
			errorGroupGuid:
				"MTE2MDQ2OTh8RVJUfEVSUl9HUk9VUHxjYWI1YTBjNS02ODI2LTNmNGItYmM4NS0yNGZkOGIxYWRjYWU",
			expectedContextId: "740c821b-ae22-c327-27ee-6de0ef1c1bcb",
		},
		{
			accountId: 11604698,
			entityGuid: "MTE2MDQ2OTh8QVBNfEFQUExJQ0FUSU9OfDExOTA5NDA2",
			errorGroupGuid:
				"MTE2MDQ2OTh8RVJUfEVSUl9HUk9VUHxjYWI1YTBjNS02ODI2LTNmNGItYmM4NS0yNGZkOGIxYWRjYWU",
			expectedContextId: "a1ed87f4-a126-47d7-b92b-0fdeedee28db",
		},
		{
			accountId: 11189038,
			entityGuid: "MTExODkwMzh8QVBNfEFQUExJQ0FUSU9OfDIyNDIxODA5",
			errorGroupGuid:
				"MTExODkwMzh8RVJUfEVSUl9HUk9VUHwxYzc5MmFlZi1mMzUyLTNiOGQtOGVjMS1hOWY2YjE3MjQzNzU",
			expectedContextId: "66cb519c-ebe8-fe2c-98b0-85dd77d6f999",
		},
		{
			accountId: 11189038,
			entityGuid: "MTExODkwMzh8QlJPV1NFUnxBUFBMSUNBVElPTnwzNTA5NDcyNw",
			errorGroupGuid:
				"MTExODkwMzh8RVJUfEVSUl9HUk9VUHw5MTFlMmUwOS03MmU1LTMzZTEtYmI0NS03YTI4MGIzZWMzMTY",
			expectedContextId: "6fe15539-fa5e-a7f1-7697-f80a5b587567",
		},
		{
			accountId: 1,
			entityGuid: "MXxCUk9XU0VSfEFQUExJQ0FUSU9OfDE2Mzg0OTY",
			errorGroupGuid: "MXxFUlR8RVJSX0dST1VQfDA4NGZiMjUwLTBhM2QtM2FlYy04ODg3LTY3Njk1NjRhODY2Yg",
			expectedContextId: "c9ecf9de-48b8-d9cb-64f1-1465b744434c",
		},
	])('matches NR1 Collab for Entity Type "$errorGroupGuid"', async data => {
		const payload = {
			nerdletId: "errors-inbox.error-group-details",
			entityGuid: data.entityGuid,
			pageId: data.errorGroupGuid,
			accountId: data.accountId,
		};

		const actual = await generateHash(payload);

		expect(actual).toEqual(data.expectedContextId);
	});
});
