import { NrNRQLProvider } from "../../../../src/providers/newrelic/nrql/nrqlProvider";
import { NrqlCompletionProvider } from "../../../../src/providers/newrelic/nrql/nrqlCompletionProvider";
import { describe, expect, it } from "@jest/globals";

const nrNrqlProvider = {
	fetchCollections: function () {
		return new Promise(resolve => {
			resolve({
				list: ["Log"],
				obj: {
					Log: true,
				},
			});
		});
	},
	fetchColumns: function () {
		return new Promise(resolve => {
			resolve({ columns: ["appName"] });
		});
	},
	getConstants: function () {
		return new NrNRQLProvider({} as any).getConstants({});
	},
};

const provider = new NrqlCompletionProvider({} as any, nrNrqlProvider as any);

describe("NrqlCompletionProvider", () => {
	it("provideCompletionItems starting with FROM", async () => {
		const response = await provider.provideCompletionItems({ text: "FR", currentWord: "FR" });
		expect(response.items[0].label).toEqual("FROM");
	});

	it("provideCompletionItems starting with SELECT", async () => {
		const response = await provider.provideCompletionItems({ text: "SEL", currentWord: "SEL" });
		expect(response.items[0].label).toEqual("SELECT");
	});

	it("provideCompletionItems starting with SELECT * FROM", async () => {
		const response = await provider.provideCompletionItems({
			text: "SELECT * FROM ",
			currentWord: " ",
		});
		expect(response.items[0].label).toEqual("Log");
	});

	it("provideCompletionItems starting with SELECT * FROM Log WHERE", async () => {
		const response = await provider.provideCompletionItems({
			text: "SELECT * FROM Log WHERE ",
			currentWord: " ",
		});
		expect(response.items[0].label).toEqual("appName");
	});
});
