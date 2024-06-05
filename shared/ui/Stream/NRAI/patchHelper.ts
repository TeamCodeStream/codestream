export function normalizeCodeMarkdown(codeFix: string | undefined): string | undefined {
	if (!codeFix) return undefined;
	// There is a case where there is no markdown at all when the code doesn't need to be fixed - in that case return undefined
	if (!codeFix.includes("```")) return undefined;
	// Strip out leading markdown ``` and text before it
	codeFix = codeFix.replace(/^\n*?.*?\n*?```\w*\n"?/, "");
	// Strip out end markdown
	codeFix = codeFix.replace(/\n*```\n*$/, "");
	// add 4 spaces to beginning of each line in codeFix since chatgpt strips out first indent
	codeFix = codeFix.replace(/^(?!\s*$)/gm, "    ");
	return codeFix;
}
