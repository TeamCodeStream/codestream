import { describe, it, expect } from "@jest/globals";
import { createDiffFromSnippets } from "@codestream/webview/Stream/Posts/patchHelper";

describe("patchHelper createDiffFromSnippets", () => {
	it("should return a diff when currentCode has tabs and codeFix has spaces", () => {
		const currentCode =
			'public static void main(String[] args) {\n\tSystem.out.println("Hello World!");\n\tif (isCar == true) {\n\t\tSystem.out.println("Is Car!");\n\t}\n}';
		const codeFix =
			'public static void main(String[] args) {\n    System.out.println("Goodbye World!");\n    if (isCar == true) {\n        System.out.println("Is Car!");\n    }\n}';
		const diff = createDiffFromSnippets(currentCode, codeFix);
		const expected =
			'@@ -1,6 +1,6 @@\n public static void main(String[] args) {\n-    System.out.println("Hello World!");\n+    System.out.println("Goodbye World!");\n     if (isCar == true) {\n         System.out.println("Is Car!");\n     }\n }\n';
		expect(diff).toBe(expected);
	});

	it("should return a diff when currentCode has 4 spaces and codeFix has 4 spaces", () => {
		const currentCode =
			'public static void main(String[] args) {\n    System.out.println("Hello World!");\n}';
		const codeFix =
			'public static void main(String[] args) {\n    System.out.println("Goodbye World!");\n}';
		const diff = createDiffFromSnippets(currentCode, codeFix);
		const expected =
			'@@ -1,3 +1,3 @@\n public static void main(String[] args) {\n-    System.out.println("Hello World!");\n+    System.out.println("Goodbye World!");\n }\n';
		expect(diff).toBe(expected);
	});

	it("should return a diff when currentCode has 2 spaces and codeFix has 4 spaces", () => {
		const currentCode =
			'public static void main(String[] args) {\n  System.out.println("Hello World!");\n}';
		const codeFix =
			'public static void main(String[] args) {\n    System.out.println("Goodbye World!");\n}';
		const diff = createDiffFromSnippets(currentCode, codeFix);
		const expected =
			'@@ -1,3 +1,3 @@\n public static void main(String[] args) {\n-  System.out.println("Hello World!");\n+    System.out.println("Goodbye World!");\n }\n';
		expect(diff).toBe(expected);
	});
});
