import { describe, expect, it } from "@jest/globals";
import { phraseList } from "../../utilities/strings";

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
});
