"use strict";

import { CSStackTraceInfo } from "@codestream/protocols/api";

import { Strings } from "../../system";
import { extractDotNamespace } from "./utils";

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
				[\s\t]+([^\s\t]+) 		//Namespace + Method
				\((.+)?\) 				//params
				([\s\t]+\w+[\s\t]+
				(
					([a-z]\:|\/).+?) 	//file
					\:\w+[\s\t]+
					([0-9]+\p?) 		//line
				)?
				\s*
				$`;
	}

	let m;
	const split = stack.split("\n");
	const firstLine = split[0];
	const firstLineMatch = firstLine.match(/Exception: (.*)$/);

	if (firstLineMatch && firstLineMatch[1]) {
		info.header = firstLine;
		info.error = firstLineMatch[1];
		split.shift();
		stack = split.join("\n");
	}

	// first line didn't contain Exception information. Try second.
	if (!firstLineMatch) {
		const secondLine = split[1];
		const secondLineMatch = secondLine.match(/Exception: (.*)$/);

		if (secondLineMatch && secondLineMatch[1]) {
			info.header = secondLine.trim();
			info.error = secondLineMatch[1].trim();
			split.shift();
			split.shift();
			stack = split.join("\n");
		}
	}

	while ((m = regex.exec(stack)) !== null) {
		// This is necessary to avoid infinite loops with zero-width matches
		if (m.index === regex.lastIndex) {
			regex.lastIndex++;
		}

		// The result can be accessed through the `m`-variable.
		// m.forEach((match, groupIndex) => {
		// 	console.log(`Found match(${m.length}), group ${groupIndex}: ${match}`);
		// });

		const { namespace, method } = extractDotNamespace(m[1]);

		info.lines.push({
			namespace,
			method,
			fullMethod: m[1],
			arguments: m[2] != null ? m[2].split(",").map(_ => _.trim()) : undefined,
			fileFullPath: m[4],
			line: parseInt(m[6], 10),
			column: undefined,
		});
	}
	return info;
}
