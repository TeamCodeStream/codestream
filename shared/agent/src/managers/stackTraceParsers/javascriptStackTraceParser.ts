"use strict";

import { CSStackTraceInfo } from "@codestream/protocols/api";
import * as StackTraceParser from "stacktrace-parser";

import { Strings } from "../../system";
import { extractDotNamespace } from "./utils";

export function Parser(stack: string): CSStackTraceInfo {
	const info: CSStackTraceInfo = { text: stack, lines: [], language: "javascript" };
	const firstLine = stack.split("\n")[0];
	const match = firstLine.match(/Error: (.*)$/);
	if (match && match[1]) {
		info.header = firstLine;
		info.error = match[1];
	}

	const parsed = StackTraceParser.parse(stack);
	info.lines = parsed.map(line => {
		let fileFullPath = line.file ? line.file : undefined;
		if (fileFullPath) {
			fileFullPath = Strings.trimEnd(fileFullPath, "?");
			if (fileFullPath.indexOf("webpack:///") === 0) {
				fileFullPath = fileFullPath.replace("webpack:///", "");
			}
			fileFullPath = Strings.trimStart(fileFullPath, ".");
			const questionIndex = fileFullPath.indexOf("?");
			if (questionIndex > -1) {
				fileFullPath = fileFullPath.slice(0, questionIndex);
			}
		}
		const { namespace, method } = extractDotNamespace(line.methodName);

		return {
			fileFullPath: fileFullPath,
			method,
			namespace,
			fullMethod: line.methodName,
			arguments: line.arguments,
			line: line.lineNumber === null ? undefined : line.lineNumber,
			column: line.column === null ? undefined : line.column,
		};
	});

	return info;
}
