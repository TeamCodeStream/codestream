import { describe, expect, it } from "@jest/globals";
import { TernarySearchTree } from "../../../src/utils/system/searchTree";

describe("searchTree.ts", () => {
	describe("TernarySearchTree", () => {
		it("can set and remove a path", () => {
			const tree = TernarySearchTree.forPaths();
			tree.set("c:/foo/bar/baz", "bar");
			tree.set("c:/foo/bar", "bar");
			expect(Array.from(tree.values()).length).toEqual(2);

			const f = tree.findSuperstr("c:/foo");
			for (const [, k] of f!.entries()) {
				tree.delete(k);
			}
			expect(Array.from(tree.values()).length).toEqual(0);
		});
	});
});
