import { describe, it, expect } from "@jest/globals";
import {
	createDiffFromSnippets,
	normalizeCodeMarkdown,
} from "@codestream/webview/Stream/Posts/patchHelper";

describe("patchHelper normalizeCodeMarkdown", () => {
	it("should remove text before the code block", () => {
		const codeFix =
			"\n\nHere is the corrected code:\n\n```javascript\nfunction countUsersByState() {\n  return userData.reduce((map, user) => {\n    const count = map.get(user.address.state) ?? 0;\n    map.set(user.address.state, count + 1);\n    return map;\n  }, new Map());\n}\n```\n\n";
		const normalized = normalizeCodeMarkdown(codeFix);
		console.log(normalized);
		const expected =
			"    function countUsersByState() {\n      return userData.reduce((map, user) => {\n        const count = map.get(user.address.state) ?? 0;\n        map.set(user.address.state, count + 1);\n        return map;\n      }, new Map());\n    }\n";
		expect(normalized).toBe(expected);
	});

	it("should trip out markdown with language hint", () => {
		const codeFix =
			'\n\n```java\n@GetMapping({"/vets"})\npublic @ResponseBody Vets showResourcesVetList() {\n    Vets vets = new Vets();\n    Collection<Vet> vetList = this.vetRepository.findAll();\n    for (Vet vet : vetList) {\n        if (!vet.getSpecialties().isEmpty()) {\n            String speciality = vet.getSpecialties().get(0).getName();\n            logger.info("Vet {} has speciality {}", vet.getFirstName(), speciality);\n        } else {\n            logger.info("Vet {} has no specialties", vet.getFirstName());\n        }\n    }\n    vets.getVetList().addAll(vetList);\n    return vets;\n}\n```\n\n';
		const normalized = normalizeCodeMarkdown(codeFix);
		console.log(normalized);
		const expected =
			'    @GetMapping({"/vets"})\n    public @ResponseBody Vets showResourcesVetList() {\n        Vets vets = new Vets();\n        Collection<Vet> vetList = this.vetRepository.findAll();\n        for (Vet vet : vetList) {\n            if (!vet.getSpecialties().isEmpty()) {\n                String speciality = vet.getSpecialties().get(0).getName();\n                logger.info("Vet {} has speciality {}", vet.getFirstName(), speciality);\n            } else {\n                logger.info("Vet {} has no specialties", vet.getFirstName());\n            }\n        }\n        vets.getVetList().addAll(vetList);\n        return vets;\n    }\n';
		expect(normalized).toBe(expected);
	});

	it("should trim out the markdorn crap for java", () => {
		const codeFix =
			'\n```\n"@GetMapping({"/vets"})\npublic @ResponseBody Vets showResourcesVetList() {\n    // Here we are returning an object of type \'Vets\' rather than a collection of Vet\n    // objects so it is simpler for JSon/Object mapping\n    Vets vets = new Vets();\n    Collection<Vet> vetList = this.vetRepository.findAll();\n    for (Vet vet : vetList) {\n        if (!vet.getSpecialties().isEmpty()) {\n            String speciality = vet.getSpecialties().get(0).getName();\n            logger.info("Vet {} has speciality {}", vet.getFirstName(), speciality);\n        } else {\n            logger.info("Vet {} has no specialties", vet.getFirstName());\n        }\n    }\n    vets.getVetList().addAll(vetList);\n    return vets;\n}"\n```\n\n';
		const normalized = normalizeCodeMarkdown(codeFix);
		console.log(normalized);
		const expected =
			'    @GetMapping({"/vets"})\n    public @ResponseBody Vets showResourcesVetList() {\n        // Here we are returning an object of type \'Vets\' rather than a collection of Vet\n        // objects so it is simpler for JSon/Object mapping\n        Vets vets = new Vets();\n        Collection<Vet> vetList = this.vetRepository.findAll();\n        for (Vet vet : vetList) {\n            if (!vet.getSpecialties().isEmpty()) {\n                String speciality = vet.getSpecialties().get(0).getName();\n                logger.info("Vet {} has speciality {}", vet.getFirstName(), speciality);\n            } else {\n                logger.info("Vet {} has no specialties", vet.getFirstName());\n            }\n        }\n        vets.getVetList().addAll(vetList);\n        return vets;\n    }\n';
		expect(normalized).toBe(expected);
	});

	it("should trim out the markdown crap for javascript", () => {
		const codeFix =
			"```\nfunction countUsersByState() {\n  return userData.reduce((map, user) => {\n    const count = map.get(user.address.state) ?? 0;\n    map.set(user.address.state, count + 1);\n    return map;\n  }, new Map());\n}\n```\n\n";
		const normalized = normalizeCodeMarkdown(codeFix);
		console.log(normalized);
		const expected =
			"    function countUsersByState() {\n      return userData.reduce((map, user) => {\n        const count = map.get(user.address.state) ?? 0;\n        map.set(user.address.state, count + 1);\n        return map;\n      }, new Map());\n    }\n";
		expect(normalized).toBe(expected);
	});
});

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
