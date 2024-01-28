export function normalizeCodeMarkdown(codeFix: string | undefined): string | undefined {
	if (!codeFix) return undefined;
	// Strip out leading markdown ``` and text before it
	codeFix = codeFix.replace(/^\n*?.*?\n*?```\w*\n"?/, "");
	// Strip out end markdown
	codeFix = codeFix.replace(/"?\n*```\n*$/, "\n");
	// add 4 spaces to beginning of each line in codeFix since chatgpt strips out first indent
	codeFix = codeFix.replace(/^(?!\s*$)/gm, "    ");
	return codeFix;
}

export function detectSemicolonLineEndingStyle(code: string): "semicolon" | "newline" {
	const semicolonCount = (code.match(/;\n/g) || []).length;
	// Count newlines but don't count newline immediately after { or ;
	const newlineCount = (code.match(/(?<!{|;)\n/g) || []).length;
	return semicolonCount > newlineCount ? "semicolon" : "newline";
}
