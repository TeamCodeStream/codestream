"use strict";

import { CSStackTraceInfo } from "@codestream/protocols/api";

import { Strings } from "../../system";

let regex: RegExp;

export function Parser(stack: string): CSStackTraceInfo {
	const info: CSStackTraceInfo = { text: stack, lines: [], language: "csharp" };

	if (!stack) return info;

	if (!regex) {
		// NOTE: there's no great way to have a multiline regex in js (except for this hackery ;)
		// so we build it once
		regex = Strings.regexBuilder`
				^
				[\s\t]*
				\w+
				[\s\t]+([^\s\t]+)\. //type
				([^\s\t]+?[\s\t]*) //method
				\((.+)?\) //params
				([\s\t]+\w+[\s\t]+
				(
					([a-z]\:|\/).+?) //file
					\:\w+[\s\t]+
					([0-9]+\p?) //line
				)?
				\s*
				$`;
	}

	let m;
	const split = stack.split("\n");
	const firstLine = split[0];
	const match = firstLine.match(/Exception: (.*)$/);

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

		// The result can be accessed through the `m`-variable.
		// m.forEach((match, groupIndex) => {
		// 	console.log(`Found match(${count}), group ${groupIndex}: ${match}`);
		// });
		info.lines.push({
			method: m[2],
			arguments: m[3] != null ? m[3].split(",").map(_ => _.trimStart()) : undefined,
			fileFullPath: m[5],
			line: parseInt(m[7], 10),
			column: undefined,
		});
	}
	return info;
}
