"use strict";

import { CSStackTraceInfo } from "../../protocol/api.protocol.models";
import { Strings } from "../../system/string";

let regex: RegExp;

export function Parser(stack: string): CSStackTraceInfo {
	if (!regex) {
		// NOTE: there's no great way to have a multiline regex in js (except for this hackery ;)
		// so we build it once
		regex = Strings.regexBuilder`
			^
			[\s\t]*
			in\s
			(?:([\d\w\\]+)::)? // class
			([\d\w\\\{\}]+) // method
			\scalled at\s
			(
				\?
				|
				(?:
					[^*&%\s]+\.php
				)
			) // file (can be just '?')
			\s
			\(
				(\?|\d*) // line (can be just '?')
			\)
			$`;
	}

	let m;
	const stackInfo: CSStackTraceInfo = { lines: [], language: "php" };
	while ((m = regex.exec(stack)) !== null) {
		// This is necessary to avoid infinite loops with zero-width matches
		if (m.index === regex.lastIndex) {
			regex.lastIndex++;
		}
		const [, className, methodName, file, lineText] = m;
		let lineNum: number | undefined = parseInt(lineText, 10);
		if (isNaN(lineNum)) lineNum = undefined;
		stackInfo.lines.push({
			method: className ? `${className}::${methodName}` : methodName,
			fileFullPath: file,
			line: lineNum
		});
	}

	return stackInfo;
}
