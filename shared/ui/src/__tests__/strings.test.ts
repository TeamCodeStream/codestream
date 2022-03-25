import { describe, expect, it } from "@jest/globals";
import { isWordy, phraseList } from "../../utilities/strings";

describe("strings", () => {
	it("should be a phrase list with 1 item", () => {
		expect(phraseList(["1"])).toEqual("1");
	});
	it("should be a phrase list with 2 items", () => {
		expect(phraseList(["1", "2"])).toEqual("1 and 2");
	});
	it("should be a phrase list with 3 items", () => {
		expect(phraseList(["1", "2", "3"])).toEqual("1, 2, and 3");
	});
	describe("isWordy", () => {
		it("should allow strings without url characters", () => {
			const validStrs = ["9word", "nice-word", "split_word"];
			for (const str of validStrs ) {
				expect(isWordy(str)).toBe(true);
			}
		})

		it("should not allow strings with url characters", () => {
			const invalidStrs = ["https://something.org", "path/split", "spaced out", "spaced%20out", ""];
			for (const str of invalidStrs ) {
				expect(isWordy(str)).toBe(false);
			}
		})
	})
});
