export function reconstitutePatch(
	codeFix: string | undefined,
	startLineNo: number | undefined
): string | undefined {
	if (!codeFix || !startLineNo) return undefined;

	// Use regex to remove first line if it is ``` or ```diff
	codeFix = codeFix.replace(/^```(diff)?\n/, "");
	// Use regex to remove the last line if it is ``` or ```\n
	codeFix = codeFix.replace(/```(\n){0,2}$/, "");

	// Parse existing unified diff header with regex
	const headerLine = codeFix.split("\n")[0];
	const headerMatch = /@@ -(\d+),(\d+) \+(\d+),(\d+) @@/.exec(headerLine);
	if (!headerMatch) return undefined;
	const [, _startLine, startLineCount, _endLine, endLineCount] = headerMatch;

	const lines = codeFix.split("\n");
	// Replace the first line with the new unified diff header
	lines[0] = `@@ -${startLineNo},${startLineCount} +${startLineNo},${endLineCount} @@`;
	const result = lines.join("\n");
	console.log("*** reconstitutePatch result", result);
	return result;
}
