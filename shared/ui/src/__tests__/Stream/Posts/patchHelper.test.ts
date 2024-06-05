import { normalizeCodeMarkdown } from "@codestream/webview/Stream/NRAI/patchHelper";
import { describe, it, expect } from "@jest/globals";

describe("patchHelper normalizeCodeMarkdown", () => {
	it("should remove text before the code block", () => {
		const codeFix =
			"\n\nHere is the corrected code:\n\n```javascript\nfunction countUsersByState() {\n  return userData.reduce((map, user) => {\n    const count = map.get(user.address.state) ?? 0;\n    map.set(user.address.state, count + 1);\n    return map;\n  }, new Map());\n}\n```\n\n";
		const normalized = normalizeCodeMarkdown(codeFix);
		console.log(normalized);
		const expected =
			"    function countUsersByState() {\n      return userData.reduce((map, user) => {\n        const count = map.get(user.address.state) ?? 0;\n        map.set(user.address.state, count + 1);\n        return map;\n      }, new Map());\n    }";
		expect(normalized).toBe(expected);
	});

	it("should strip out markdown with language hint", () => {
		const codeFix =
			'\n\n```java\n@GetMapping({"/vets"})\npublic @ResponseBody Vets showResourcesVetList() {\n    Vets vets = new Vets();\n    Collection<Vet> vetList = this.vetRepository.findAll();\n    for (Vet vet : vetList) {\n        if (!vet.getSpecialties().isEmpty()) {\n            String speciality = vet.getSpecialties().get(0).getName();\n            logger.info("Vet {} has speciality {}", vet.getFirstName(), speciality);\n        } else {\n            logger.info("Vet {} has no specialties", vet.getFirstName());\n        }\n    }\n    vets.getVetList().addAll(vetList);\n    return vets;\n}\n```\n\n';
		const normalized = normalizeCodeMarkdown(codeFix);
		console.log(normalized);
		const expected =
			'    @GetMapping({"/vets"})\n    public @ResponseBody Vets showResourcesVetList() {\n        Vets vets = new Vets();\n        Collection<Vet> vetList = this.vetRepository.findAll();\n        for (Vet vet : vetList) {\n            if (!vet.getSpecialties().isEmpty()) {\n                String speciality = vet.getSpecialties().get(0).getName();\n                logger.info("Vet {} has speciality {}", vet.getFirstName(), speciality);\n            } else {\n                logger.info("Vet {} has no specialties", vet.getFirstName());\n            }\n        }\n        vets.getVetList().addAll(vetList);\n        return vets;\n    }';
		expect(normalized).toBe(expected);
	});

	it("should trim out the markdorn for java", () => {
		const codeFix =
			'\n```\n"@GetMapping({"/vets"})\npublic @ResponseBody Vets showResourcesVetList() {\n    // Here we are returning an object of type \'Vets\' rather than a collection of Vet\n    // objects so it is simpler for JSon/Object mapping\n    Vets vets = new Vets();\n    Collection<Vet> vetList = this.vetRepository.findAll();\n    for (Vet vet : vetList) {\n        if (!vet.getSpecialties().isEmpty()) {\n            String speciality = vet.getSpecialties().get(0).getName();\n            logger.info("Vet {} has speciality {}", vet.getFirstName(), speciality);\n        } else {\n            logger.info("Vet {} has no specialties", vet.getFirstName());\n        }\n    }\n    vets.getVetList().addAll(vetList);\n    return vets;\n}\n```\n\n';
		const normalized = normalizeCodeMarkdown(codeFix);
		console.log(normalized);
		const expected =
			'    @GetMapping({"/vets"})\n    public @ResponseBody Vets showResourcesVetList() {\n        // Here we are returning an object of type \'Vets\' rather than a collection of Vet\n        // objects so it is simpler for JSon/Object mapping\n        Vets vets = new Vets();\n        Collection<Vet> vetList = this.vetRepository.findAll();\n        for (Vet vet : vetList) {\n            if (!vet.getSpecialties().isEmpty()) {\n                String speciality = vet.getSpecialties().get(0).getName();\n                logger.info("Vet {} has speciality {}", vet.getFirstName(), speciality);\n            } else {\n                logger.info("Vet {} has no specialties", vet.getFirstName());\n            }\n        }\n        vets.getVetList().addAll(vetList);\n        return vets;\n    }';
		expect(normalized).toBe(expected);
	});

	it("should trim out the markdown for javascript", () => {
		const codeFix =
			"```\nfunction countUsersByState() {\n  return userData.reduce((map, user) => {\n    const count = map.get(user.address.state) ?? 0;\n    map.set(user.address.state, count + 1);\n    return map;\n  }, new Map());\n}\n```\n\n";
		const normalized = normalizeCodeMarkdown(codeFix);
		console.log(normalized);
		const expected =
			"    function countUsersByState() {\n      return userData.reduce((map, user) => {\n        const count = map.get(user.address.state) ?? 0;\n        map.set(user.address.state, count + 1);\n        return map;\n      }, new Map());\n    }";
		expect(normalized).toBe(expected);
	});

	it("should not remove last quote that is part of code fix", () => {
		const codeFix =
			'\n\n```python\n@app.route("/letters/<id_>")\ndef db_call(id_):\n    con = db.connect()\n    cursor = con.execute("SELECT letter FROM letters WHERE id=%d" % int(id_))\n    row = cursor.fetchone()\n    if row is not None:\n        return str(row[0])\n    else:\n        return "No letter found with the provided id."\n```\n\n';
		const normalized = normalizeCodeMarkdown(codeFix);
		console.log(normalized);
		const expected =
			'    @app.route("/letters/<id_>")\n    def db_call(id_):\n        con = db.connect()\n        cursor = con.execute("SELECT letter FROM letters WHERE id=%d" % int(id_))\n        row = cursor.fetchone()\n        if row is not None:\n            return str(row[0])\n        else:\n            return "No letter found with the provided id."';
		expect(normalized).toBe(expected);
	});
});
