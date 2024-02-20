import { describe, expect, it } from "@jest/globals";
import { NrqlDocumentParser } from "../../../../src/providers/newrelic/nrql/nrqlDocumentParser";

describe("NrqlDocumentParser", () => {
	it("should handle multiline single statements", () => {
		const content = `SELECT Email FROM CodeStream_Events WHERE EventName = 'SignedIn'
AND Foo like '%15.1.%' and Email not like '%testinator.com%' and
Email not like '%dhe%' SINCE 1 days AGO `;
		const results = new NrqlDocumentParser().parse(content);
		expect(results).toStrictEqual([
			{
				invalid: false,
				range: { end: 169, start: 0 },
				text: content,
			},
		]);
	});

	it("should handle single statements", () => {
		const content = `SELECT Email FROM CodeStream_Events WHERE EventName = 'SignedIn'`;
		const results = new NrqlDocumentParser().parse(content);
		expect(results).toStrictEqual([
			{
				invalid: false,
				range: { end: 63, start: 0 },
				text: content,
			},
		]);
	});

	it("should handle multiple statements with comments", () => {
		const content = `FROM Transaction SELECT * WHERE appId

/* comment */

FROM Transaction SELECT * WHERE appId
IS NOT NULL

// ok
SELECT * FROM Transaction WHERE appId IS NULL
-- fp
FROM Transaction SELECT * WHERE appId like '%sss%'

SELECT * FR
		   `;
		const results = new NrqlDocumentParser().parse(content);
		expect(results).toStrictEqual([
			{
				invalid: false,
				text: "FROM Transaction SELECT * WHERE appId\n",
				range: {
					start: 0,
					end: 37,
				},
			},
			{
				invalid: false,
				text: "FROM Transaction SELECT * WHERE appId\nIS NOT NULL\n",
				range: {
					start: 54,
					end: 103,
				},
			},
			{
				invalid: false,
				text: "SELECT * FROM Transaction WHERE appId IS NULL\n",
				range: {
					start: 111,
					end: 156,
				},
			},
			{
				invalid: false,
				text: "FROM Transaction SELECT * WHERE appId like '%sss%'\n",
				range: {
					start: 163,
					end: 213,
				},
			},
			{
				invalid: true,
				text: "SELECT * FR\n",
				range: {
					start: 215,
					end: 226,
				},
			},
		]);
	});

	it("should handle multiple statements", () => {
		const content = `FROM Transaction SELECT * WHERE appId IS not null

SELECT foo from Log where appName = 'bar'

					`;
		const results = new NrqlDocumentParser().parse(content);
		expect(results.length).toStrictEqual(2);
		expect(results).toStrictEqual([
			{
				invalid: false,
				text: "FROM Transaction SELECT * WHERE appId IS not null\n",
				range: {
					start: 0,
					end: 49,
				},
			},
			{
				invalid: false,
				text: "SELECT foo from Log where appName = 'bar'\n",
				range: {
					start: 51,
					end: 92,
				},
			},
		]);
	});

	it("should handle embedded comments", () => {
		const content = `FROM Transaction
SELECT name /* that's the bar
on a new line */
WHERE name is not null // baz is here`;
		const results = new NrqlDocumentParser().parse(content);
		expect(results.length).toStrictEqual(1);
		expect(results).toStrictEqual([
			{
				invalid: false,
				text: content,
				range: {
					start: 0,
					end: 100,
				},
			},
		]);
	});

	it("should handle embedded comments", () => {
		const content = `/*
FROM Transaction SELECT name WHERE name is not null 
*/`;
		const results = new NrqlDocumentParser().parse(content);
		expect(results.length).toStrictEqual(1);
		expect(results).toStrictEqual([
			{
				invalid: false,
				text: `FROM Transaction SELECT name WHERE name is not null 
`,
				range: {
					start: 3,
					end: 55,
				},
			},
		]);
	});
});
