import { describe, it, expect } from "@jest/globals";
import { reconstitutePatch } from "@codestream/webview/Stream/Posts/patchHelper";

describe("patchHelper reconstitutePatch", () => {
	it("should replace start line in unified diff header and strip out markdown", () => {
		const codeFix = `\`\`\`diff
@@ -1,9 +1,11 @@
 @GetMapping({"/vets"})
 public @ResponseBody Vets showResourcesVetList() {
     Vets vets = new Vets();
     Collection<Vet> vetList = this.vetRepository.findAll();
     for (Vet vet : vetList) {
-        String speciality = vet.getSpecialties().get(0).getName();
-        logger.info("Vet {} has speciality {}", vet.getFirstName(), speciality);
+        if (!vet.getSpecialties().isEmpty()) {
+            String speciality = vet.getSpecialties().get(0).getName();
+            logger.info("Vet {} has speciality {}", vet.getFirstName(), speciality);
+        }
     }
     vets.getVetList().addAll(vetList);
     return vets;
 }
\`\`\`
`;
		const startLineNo = 5;
		const result = reconstitutePatch(codeFix, startLineNo);
		const header = result?.split("\n")[0];
		expect(header).toEqual("@@ -5,9 +5,11 @@");
		expect(result).not.toContain("```");
		expect(result).not.toContain("diff");
		expect(result?.endsWith("}\n")).toBe(true);
	});

	it("should strip out markdown with extra whitespace", () => {
		const codeFix = `\`\`\`diff
@@ -1,9 +1,11 @@
 @GetMapping({"/vets"})
 public @ResponseBody Vets showResourcesVetList() {
     Vets vets = new Vets();
     Collection<Vet> vetList = this.vetRepository.findAll();
     for (Vet vet : vetList) {
-        String speciality = vet.getSpecialties().get(0).getName();
-        logger.info("Vet {} has speciality {}", vet.getFirstName(), speciality);
+        if (!vet.getSpecialties().isEmpty()) {
+            String speciality = vet.getSpecialties().get(0).getName();
+            logger.info("Vet {} has speciality {}", vet.getFirstName(), speciality);
+        }
     }
     vets.getVetList().addAll(vetList);
     return vets;
 }
\`\`\`

`;
		const startLineNo = 5;
		const result = reconstitutePatch(codeFix, startLineNo);
		const header = result?.split("\n")[0];
		expect(header).toEqual("@@ -5,9 +5,11 @@");
		expect(result).not.toContain("```");
		expect(result).not.toContain("diff");
		expect(result?.endsWith("}\n")).toBe(true);
	});
});
