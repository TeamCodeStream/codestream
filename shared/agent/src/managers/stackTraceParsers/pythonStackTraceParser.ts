"use strict";

import { Logger } from "../../logger";
import { CSStackTraceInfo } from "../../protocol/api.protocol.models";
import { Strings } from "../../system/string";

let regex: RegExp;

export function Parser(stack: string): CSStackTraceInfo {
	const info: CSStackTraceInfo = { text: stack, lines: [], language: "python" };

	if (!stack) return info;

	if (!regex) {
		// NOTE: there's no great way to have a multiline regex in js (except for this hackery ;)
		// so we build it once
		regex = Strings.regexBuilder`File "(.+)", line (\d+), in (.+)`;
	}

	let m;
	const split = stack.split("\n");
	const firstLine = split[0];
	if (firstLine.toLowerCase().indexOf("traceback (most recent call last):") > -1) {
		split.shift();
		stack = split.join("\n");
	}
	while ((m = regex.exec(stack)) !== null) {
		// This is necessary to avoid infinite loops with zero-width matches
		if (m.index === regex.lastIndex) {
			regex.lastIndex++;
		}

		info.lines.push({
			method: m[3],
			arguments: undefined,
			fileFullPath: m[1],
			line: m[2] !== null ? parseInt(m[2], 10) : undefined,
			column: undefined
		});
	}
	if (!info.lines.length) {
		Logger.warn("Could not parse python stack trace", {
			stackTrace: stack
		});
	}
	return info;
}
