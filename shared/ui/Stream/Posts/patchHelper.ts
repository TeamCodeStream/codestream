import { createPatch } from "diff";

export function createDiffFromSnippets(currentCode: string, codeFix: string): string | undefined {
	// filename not used in output, but required by createPatch
	// in currentCode conver tabs to spaces (4 spaces) to match non-tabbed output that comes from codeFix / openai
	currentCode = currentCode.replace(/\t/g, "    ");
	// just the first line of currentCode had it's indent removed, so add it back :(
	currentCode = currentCode.replace(/^(?!\s*$)/, "    ");
	// Add trailing newline to both currentCode and codeFix if they don't already have one
	if (!currentCode.endsWith("\n")) currentCode += "\n";
	if (!codeFix.endsWith("\n")) codeFix += "\n";

	const sp = createPatch("filename.java", currentCode, codeFix, undefined, undefined, {
		ignoreWhitespace: false,
	});
	// Detect if patch uses windows or linux line endings
	const lineEnding = sp.split("\n")[1].includes("\\r\\n") ? "\r\n" : "\n";
	// Remove first 4 lines of patch (diff header) and preserve windows or linux line endings
	const formattedPatch = sp.split("\n").slice(4).join(lineEnding);
	return formattedPatch;
}
