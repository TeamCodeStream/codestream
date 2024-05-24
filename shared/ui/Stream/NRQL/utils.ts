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

export function validateAndConvertUnixTimestamp(timestamp: number, isRelative?: boolean): string {
	if (!Number.isInteger(timestamp)) {
		return String(timestamp);
	}

	const date = new Date(timestamp);

	if (date.getTime() === timestamp) {
		if (isRelative) {
			return timeAgo(date);
		}
		return date.toLocaleString(undefined, {
			month: "short",
			day: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
		});
	} else {
		return String(timestamp);
	}
}

function timeAgo(date: Date): string {
	const now = new Date();
	const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	let value: number, unit: Intl.RelativeTimeFormatUnit;
	if (seconds < 60) {
		value = seconds;
		unit = "second";
	} else if (seconds < 3600) {
		value = Math.floor(seconds / 60);
		unit = "minute";
	} else if (seconds < 86400) {
		value = Math.floor(seconds / 3600);
		unit = "hour";
	} else if (seconds < 604800) {
		value = Math.floor(seconds / 86400);
		unit = "day";
	} else if (seconds < 2629800) {
		value = Math.floor(seconds / 604800);
		unit = "week";
	} else if (seconds < 31557600) {
		value = Math.floor(seconds / 2629800);
		unit = "month";
	} else {
		value = Math.floor(seconds / 31557600);
		unit = "year";
	}

	const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
	return rtf.format(-value, unit);
}
