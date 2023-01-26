"use strict";

import { CSStackTraceInfo } from "@codestream/protocols/api";

import { Logger } from "../../logger";
import { Strings } from "../../system";

let regex: RegExp;

export function Parser(stack: string): CSStackTraceInfo {
	const info: CSStackTraceInfo = { lines: [], language: "elixir" };

	Logger.log(`Stacktrace to be parsed by elixirStackTraceParser.ts: ${stack}`);

	if (!regex) {
		regex = Strings.regexBuilder`
			^
			\s*
			\(
				(\w+) // package
				\s+
				[\w\d\.]+ // package version
			\)
			\s+
			(.+\..+) // filename
			:
			(\d+) // line number
			:
			\s+
			([^/]+\/\d+) // method name
			$
		`;
	}

	let m;
	const split = stack.split("\n");
	const firstLine = split[0];
	const match = firstLine.match(/^\(\S+\) (.+$)/);
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

		const [, packageName, file, lineText, method] = m;
		let line: number | undefined = parseInt(lineText, 10);
		if (isNaN(line)) line = undefined;

		const fileFullPath = `${packageName}/${file}`;

		info.lines.push({
			method,
			fileFullPath,
			line,
		});
	}

	return info;
}
