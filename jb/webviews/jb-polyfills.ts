import "core-js/features/global-this";
import structuredClone from "@ungap/structured-clone";

export function polyfills() {
	if (!("structuredClone" in globalThis)) {
		globalThis.structuredClone = structuredClone;
	}
}
