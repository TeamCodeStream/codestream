import { describe, expect, it } from "@jest/globals";

import { parseId, toFixedNoRounding } from "../../../../src/providers/newrelic/utils";

describe("toFixedNoRounding", () => {
	it("should round the number to the specified precision", () => {
		expect(toFixedNoRounding(3.14159, 2)).toBe("3.14");
		expect(toFixedNoRounding(2.71828, 3)).toBe("2.718");
	});

	it("should round the number to the default precision of 1 if precision is not provided", () => {
		expect(toFixedNoRounding(3.14159)).toBe("3.1");
		expect(toFixedNoRounding(2.71828)).toBe("2.7");
	});

	it("should round the number down if the next digit is less than 5", () => {
		expect(toFixedNoRounding(3.149, 2)).toBe("3.14");
		expect(toFixedNoRounding(2.712, 2)).toBe("2.71");
	});

	it("should round the number up if the next digit is greater than or equal to 5", () => {
		expect(toFixedNoRounding(3.145, 2)).toBe("3.14");
		expect(toFixedNoRounding(2.715, 2)).toBe("2.71");
	});
});

describe("parseId", () => {
	it("should parse the id (strict=true)", () => {
		expect(parseId("MXxBUE18QVBQTElDQVRJT058MjM", true)).toEqual({
			accountId: 1,
			domain: "APM",
			identifier: "23",
			type: "APPLICATION",
		});
	});

	it("should parse the id (strict=false)", () => {
		// removed some of the characters from the end of the id
		expect(parseId("MXxBUE18QVBQTElDQVRJT0", false)?.accountId).toEqual(1);
	});

	it("should not parse the id (strict=true)", () => {
		expect(parseId("0", true)).toEqual(undefined);
		expect(parseId("", true)).toEqual(undefined);
		expect(parseId("MXxBaUE18QVqqqBQTElDQVaRJT058MqjM", true)).toEqual(undefined);
	});

	it("should not parse the id (strict=false)", () => {
		expect(parseId("0")).toEqual(undefined);
		expect(parseId("")).toEqual(undefined);
		// removed some of the characters from the end of the id

		expect(parseId("MXxBaUE18QVqqqBQTElDQVaRJT05", false)?.accountId).toEqual(1);
	});
});
