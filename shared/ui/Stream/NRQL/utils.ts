import { NRQLResult } from "@codestream/protocols/agent";

export const ColorsHash = {
	0: "#e6b223",
	1: "#9558af",
	2: "#8884d8",
	3: "#7aa7d2",
	4: "#84d888",
	5: "#d2d27a",
	6: "#d88884",
	7: "#7ad2a7",
	8: "#d27aa7",
	9: "#a77ad2",
};

export const Colors = Object.values(ColorsHash);

export function renameKeyToName(arr: NRQLResult[]): NRQLResult[] {
	return arr.map(item => {
		if (!item.name) {
			const facetValue = item.facet;
			for (const key in item) {
				if (item[key] === facetValue && key !== "facet" && key !== "name") {
					item.name = item[key];
					delete item[key];
					break;
				}
			}
		}
		return item;
	});
}
