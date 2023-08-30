"use strict";

import { describe, expect, it } from "@jest/globals";

import { FossaProvider } from "../../../src/providers/fossa";

describe("fossaProvider", () => {
	it("matchRepoToFossaProject", async () => {
		const fossa = new FossaProvider({} as any, {} as any);
		const asdf = await fossa._matchRepoToFossaProject(
			{
				currentBranch: "develop",
				folder: {
					uri: "file:///Users/foo/bar",
					name: "bar",
				},
				path: "/Users/foo/bar",
				providerGuess: "example",
				id: "1234",
			},
			[
				{
					id: "custom+1234/example.com/foobar/bar",
					title: "https://example.com/foobar/bar.git",
				},
			] as any,
			"1234"
		);
		expect(asdf!.id).toEqual("custom+1234/example.com/foobar/bar");
	});
});
