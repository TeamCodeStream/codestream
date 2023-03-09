"use strict";

import { describe, expect, it } from "@jest/globals";
import { GitLabProvider } from "../../../../src/providers/gitlab";

const provider = new GitLabProvider({} as any, {} as any);

describe("enhanceHtmlBlock", () => {
	const projectFullPath = "http://example.com/project";

	it("returns the original string if either str or projectFullPath is not provided", () => {
		expect(provider.enhanceHtmlBlock("", projectFullPath)).toBe("");
		expect(provider.enhanceHtmlBlock("<p>Some text</p>", "")).toBe("<p>Some text</p>");
	});

	it("correctly replaces img tags with data-src attribute", () => {
		const input = '<img src="base64enCoded" data-src="/uploads/image.jpg" />';
		const expected = `<img src="${provider.baseWebUrl}/uploads/image.jpg" />`;
		expect(provider.enhanceHtmlBlock(input, projectFullPath)).toBe(expected);
	});

	it("doesn't modify img tags that don't have data-src attribute", () => {
		const input = '<img src="/uploads/image.jpg" />';
		const expected = '<img src="/uploads/image.jpg" />';
		expect(provider.enhanceHtmlBlock(input, projectFullPath)).toBe(expected);
	});

	it("doesn't modify img tags that have a data-src attribute that doesn't start with /uploads/", () => {
		const input = '<img src="base64enCoded" data-src="/images/image.jpg" />';
		const expected = '<img src="/images/image.jpg" />';
		expect(provider.enhanceHtmlBlock(input, projectFullPath)).toBe(expected);
	});

	it("correctly replaces relative href paths with baseWebUrl", () => {
		const input = '<a href="/uploads/file.pdf">Link</a>';
		const expected = `<a href="${provider.baseWebUrl}/uploads/file.pdf">Link</a>`;
		expect(provider.enhanceHtmlBlock(input, projectFullPath)).toBe(expected);
	});

	it("doesn't modify absolute href paths", () => {
		const input = '<a href="http://example.com/file.pdf">Link</a>';
		const expected = '<a href="http://example.com/file.pdf">Link</a>';
		expect(provider.enhanceHtmlBlock(input, projectFullPath)).toBe(expected);
	});
});
