"use strict";

import { CancellationToken, CodeLens, CodeLensProvider, Range, TextDocument } from "vscode";
import * as vscode from "vscode";

import { CodeStreamSession, SessionStatus } from "../api/session";

export class NrqlCodeLensProvider implements CodeLensProvider {
	private documentManager: any = {};
	private status: string | undefined = undefined;

	constructor(private session: CodeStreamSession) {}

	documentOpened(document: TextDocument) {
		this.documentManager[document.uri.toString()] = {
			document: document,
			tracked: false
		};
	}

	documentClosed(document: TextDocument) {
		delete this.documentManager[document.uri.toString()];
	}

	private splitTextOnEmptyLines(
		document: vscode.TextDocument
	): Array<{ text: string; range: vscode.Range }> {
		const splits: Array<{ text: string; range: vscode.Range }> = [];

		const text = document.getText();
		const emptyLineRegex = /\r?\n\s*\r?\n/g;

		let match: RegExpExecArray | null;
		let startIndex = 0;

		function checkString(text: string) {
			const startsWithRegex = /^(SELECT|FROM|SHOW)\b/gi;
			const containsRegex = /^(?=.*(?:SELECT.*FROM|FROM.*SELECT|SHOW))/gis;

			const startsWithMatch = startsWithRegex.test(text);
			const containsMatch = containsRegex.test(text);

			return startsWithMatch && containsMatch;
		}

		while ((match = emptyLineRegex.exec(text)) !== null) {
			const endIndex = match.index + match[0].length;
			const range = new vscode.Range(
				document.positionAt(startIndex),
				document.positionAt(endIndex)
			);

			const splitText = text.substring(startIndex, endIndex).trim();

			if (checkString(splitText)) {
				splits.push({ text: splitText, range });
			}

			startIndex = endIndex;
		}

		const remainingText = text.substring(startIndex).trim();
		if (remainingText && checkString(remainingText)) {
			const remainingRange = new vscode.Range(
				document.positionAt(startIndex),
				document.positionAt(text.length)
			);

			splits.push({ text: remainingText, range: remainingRange });
		}

		return splits;
	}

	public async provideCodeLenses(
		document: TextDocument,
		token: CancellationToken
	): Promise<CodeLens[] | null | undefined> {
		if (this.status !== SessionStatus.SignedIn) {
			return [
				new CodeLens(
					new Range(0, 0, 0, 0),
					new NrqlStatementExecutionCommand(
						"Sign in to New Relic CodeStream to execute",
						"codestream.toggle",
						"",
						[]
					)
				)
			];
		}

		const lenses: CodeLens[] = [];
		const parse = this.splitTextOnEmptyLines(document);
		parse.forEach(_ => {
			lenses.push(
				new CodeLens(
					_.range,
					new NrqlStatementExecutionCommand("Execute ▶️", "codestream.executeNrql", "", [
						document.uri,
						_.text,
						_.range.start.line
					])
				)
			);
		});

		return lenses;
	}

	public update(status: string) {
		this.status = status;
	}

	public resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken) {
		return token.isCancellationRequested ? undefined : codeLens;
	}
}

class NrqlStatementExecutionCommand implements vscode.Command {
	arguments: string[] | undefined;
	constructor(
		public title: string,
		public command: string,
		public tooltip?: string,
		args?: any[] | undefined
	) {
		this.arguments = args;
	}
}
