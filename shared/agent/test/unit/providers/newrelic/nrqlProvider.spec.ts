import { NrNRQLProvider } from "../../../../src/providers/newrelic/nrql/nrqlProvider";
import { describe, expect, it } from "@jest/globals";
// import { NewRelicGraphqlClient } from "../../../../src/providers/newrelic/newRelicGraphqlClient";

const provider = new NrNRQLProvider({} as any);

describe("transformQuery", () => {
	const cleaned = `FROM Collection   SELECT foo    WHERE queryTypes = 'bar'    AND status = 'baz'`;

	it("removes all comments properly (with space)", () => {
		const result = provider.transformQuery(`FROM Collection
  SELECT foo -- that's the foo
  WHERE queryTypes = 'bar' 
  AND status = 'baz' // baz is here`);
		expect(result).toBe(cleaned);
	});

	it("removes all comments properly (without space)", () => {
		const result = provider.transformQuery(`FROM Collection
  SELECT foo --that's the foo
  WHERE queryTypes = 'bar' 
  AND status = 'baz' //baz is here`);
		expect(result).toBe(cleaned);
	});

	it("removes all comments properly (with multiline)", () => {
		const result = provider.transformQuery(`FROM Collection
  SELECT foo /* that's the foo
  and it's on two lines */
  WHERE queryTypes = 'bar' 
  AND status = 'baz' //baz is here`);
		expect(result).toBe(cleaned);
	});

	it("removes all whitespace at the end", () => {
		const result = provider.transformQuery(`FROM Collection
SELECT foo /* that's the foo
and it's on two lines */
WHERE queryTypes = 'bar' 
AND status = 'baz' //baz is here
       `);
		expect(result).toBe(`FROM Collection SELECT foo  WHERE queryTypes = 'bar'  AND status = 'baz'`);
	});

	it("removes all whitespace at the end", () => {
		const result = provider.transformQuery(`/* FROM Collection
SELECT foo
WHERE queryTypes = 'bar' 
AND status = 'baz'
*/`);
		expect(result).toBe("");
	});
});
