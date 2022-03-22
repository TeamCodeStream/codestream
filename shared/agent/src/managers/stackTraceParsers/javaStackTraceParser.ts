"use strict";

import { CSStackTraceInfo } from "../../protocol/api.protocol.models";
import { Strings } from "../../system/string";
import { Logger } from "../../logger";

let regex: RegExp;

export function Parser(stack: string): CSStackTraceInfo {
	const info: CSStackTraceInfo = { lines: [] };

	Logger.log(`Stacktrace to be parsed by javaStackTraceParser.ts: ${stack}`);

	if (!regex) {
		// NOTE: there's no great way to have a multiline regex in js (except for this hackery ;)
		// so we build it once
		regex = Strings.regexBuilder`
			^
			\s*
			(at)? // at
			\s+
			((?:(?:[\d\w\/\@]*\.)*[\d\w\/]*))\. // package
			([\d\w\$]*)\. // class
			([\d\w\$]*) // method
			\(
				(?:(?:([\d\w]*\.(java|kt)):(\d*)) // file:line
				|([\d\w\s]*)) // file
			\)
			$`;
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

		const [, , packageName, className, methodName, file, extension, lineText] = m;
		let lineNum: number | undefined = parseInt(lineText, 10);
		if (isNaN(lineNum)) lineNum = undefined;

		let fileFromClass = file;
		if (className && file && className.indexOf(file.replace(".java", "")) > -1) {
			// attempt to construct a file path based upon
			// the name of the class
			fileFromClass = `${packageName.replace(/\./g, "/")}/${file}`;
		}

		info.lines.push({
			method: `${packageName}.${className}.${methodName}`,
			fileFullPath: fileFromClass,
			line: lineNum
		});
	}

	return info;
}
