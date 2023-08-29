"use strict";

import { describe, expect, it } from "@jest/globals";

import { FossaProvider } from "../../../src/providers/fossa";

describe("fossaProvider", () => {
	it("matchRepoToFossaProject", async () => {
		const fossa = new FossaProvider({} as any, {} as any);

		const asdf = await fossa._matchRepoToFossaProject(
			{
				folder: {
					uri: "anything",
					name: "bar",
				},
				path: "foo/bar",
				providerGuess: "example.com",
			},
			[
				{
					id: "123",
					title: "https://example.com/foo/bar.git",
				},
			] as any,
			"123"
		);

		expect(asdf!.id).toEqual("123");
	});
});
