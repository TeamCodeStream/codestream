import { describe, expect, it } from "@jest/globals";
import { RepositoryMappingManager } from "../../../src/managers/repositoryMappingManager";

describe("repositoryMappingManager.spec.ts", () => {
	describe("normalizeUrl", () => {
		it("git@", async () => {
			const manager = new RepositoryMappingManager({} as any);
			const response = await manager.normalizeUrl({
				url: "git@gitlab.com:foobar.io/development/api/largerepo.git"
			});
			expect(response.normalizedUrl).toEqual("gitlab.com/foobar.io/development/api/largerepo");
		});
	});
});
