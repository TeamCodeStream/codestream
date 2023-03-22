import { describe, expect, it } from "@jest/globals";
import { roundDownExponentially } from "../../../src/utils/system/math";

describe("math.ts", () => {
	it("should do what i want", () => {
		expect(roundDownExponentially(23, 40)).toBe(40);
		expect(roundDownExponentially(99, 40)).toBe(40);
		expect(roundDownExponentially(101, 40)).toBe(100);
		expect(roundDownExponentially(750, 40)).toBe(100);
		expect(roundDownExponentially(999, 40)).toBe(100);
		expect(roundDownExponentially(2000, 40)).toBe(1000);
		expect(roundDownExponentially(9999, 40)).toBe(1000);
		expect(roundDownExponentially(10000, 40)).toBe(10000);
	});
});
