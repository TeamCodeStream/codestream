"use strict";

import { CSStackTraceInfo } from "../../protocol/api.protocol.models";
import { Strings } from "../../system/string";

let regex: RegExp;

export function Parser(stack: string): CSStackTraceInfo {
	const info: CSStackTraceInfo = { lines: [], language: "ruby" };

	if (!regex) {
		// NOTE: there's no great way to have a multiline regex in js (except for this hackery ;)
		// so we build it once
		regex = Strings.regexBuilder`
			^
			(\s+)? // optional spaces
			(.+?\.rb) // path
			:
			(\s*)? // optional spaces
			(\d+) // line
			:in
			\s+
			\`
			(.+) // method
			'
			$
		`;
	}

	let m;
	const split = stack.split("\n");
	const firstLine = split[0];
	const match = firstLine.match(/^.*?: (.*)$/);
	if (match && match[1]) {
		info.header = firstLine;
		info.error = match[1];
		split.shift();
		stack = split.join("\n");
	}

	while ((m = regex.exec(stack)) !== null) {
		// This is necessary to avoid infinite loops with zero-width matches
		if (m.index === regex.lastIndex) {
			regex.lastIndex++;
		}

		const [, optionalSpaces, path, moreOptionalSpaces, line, method] = m;
		let lineNum: number | undefined = parseInt(line, 10);
		if (isNaN(lineNum)) lineNum = undefined;
		info.lines.push({
			method,
			fileFullPath: path,
			line: lineNum
		});
	}

	return info;
}
