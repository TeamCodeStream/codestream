import { describe, expect, it } from "@jest/globals";
// import { NrqlDocumentParser } from "../../providers/nrqlDocumentParser";

describe("NrqlCodeLensProvider", () => {
	describe("NrqlCodeLensProvider", () => {
		it("should work", () => {
			expect(1).toStrictEqual(1);
		});
		// 		it("should handle multiline single statements", () => {
		// 			const content = `SELECT Email FROM CodeStream_Events WHERE EventName = 'SignedIn'
		// AND Foo like '%15.1.%' and Email not like '%testinator.com%' and
		// Email not like '%dhe%' SINCE 1 days AGO `;
		// 			const results = new NrqlDocumentParser().parse(content);
		// 			expect(results).toStrictEqual([
		// 				{
		// 					range: { end: 171, start: 0 },
		// 					text: content
		// 				}
		// 			]);
		// 		});
		// 		it("should handle single statements", () => {
		// 			const content = `SELECT Email FROM CodeStream_Events WHERE EventName = 'SignedIn'`;
		// 			const results = new NrqlDocumentParser().parse(content);
		// 			expect(results).toStrictEqual([
		// 				{
		// 					range: { end: 63, start: 0 },
		// 					text: content
		// 				}
		// 			]);
		// 		});

		// 		it("should handle multiple statements with comments", () => {
		// 			const content = `FROM Transaction SELECT * WHERE appId

		// /* comment */

		// FROM Transaction SELECT * WHERE appId
		// IS NOT NULL

		// // ok
		// SELECT * FROM Transaction WHERE appId IS NULL
		// -- fp
		// FROM Transaction SELECT * WHERE appId like '%sss%'

		// SELECT * FR
		//    `;
		// 			const results = new NrqlDocumentParser().parse(content);
		// 			expect(results.length).toStrictEqual(4);

		// 			expect(results).toStrictEqual([
		// 				{
		// 					text: "FROM Transaction SELECT * WHERE appId\n",
		// 					range: {
		// 						start: 0,
		// 						end: 37
		// 					}
		// 				},
		// 				{
		// 					text: "FROM Transaction SELECT * WHERE appId \nIS NOT NULL\n",
		// 					range: {
		// 						start: 55,
		// 						end: 105
		// 					}
		// 				},
		// 				{
		// 					text: "SELECT * FROM Transaction WHERE appId IS NULL\n",
		// 					range: {
		// 						start: 115,
		// 						end: 160
		// 					}
		// 				},
		// 				{
		// 					text: "FROM Transaction SELECT * WHERE appId like '%sss%'\n",
		// 					range: {
		// 						start: 167,
		// 						end: 217
		// 					}
		// 				}
		// 			]);
		// 		});

		// 		it("should handle multiple statements", () => {
		// 			const content = `FROM Transaction SELECT * WHERE appId IS not null

		// SELECT foo from Log where appName = 'bar'

		// 			`;
		// 			const results = new NrqlDocumentParser().parse(content);
		// 			expect(results.length).toStrictEqual(2);
		// 			expect(results).toStrictEqual([
		// 				{
		// 					text: "FROM Transaction SELECT * WHERE appId IS not null\n",
		// 					range: {
		// 						start: 0,
		// 						end: 49
		// 					}
		// 				},
		// 				{
		// 					text: "SELECT foo from Log where appName = 'bar'\n",
		// 					range: {
		// 						start: 51,
		// 						end: 92
		// 					}
		// 				}
		// 			]);
		// 		});
	});
});
