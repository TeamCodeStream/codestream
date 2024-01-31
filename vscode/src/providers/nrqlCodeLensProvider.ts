"use strict";

import { CancellationToken, CodeLens, CodeLensProvider, Range, TextDocument } from "vscode";
import * as vscode from "vscode";

import { CodeStreamSession, SessionStatus } from "../api/session";
import { NrqlDocumentParser } from "./nrqlDocumentParser";

export class NrqlCodeLensProvider implements CodeLensProvider {
	private status: string | undefined = undefined;
	documentParser = new NrqlDocumentParser();
	constructor(private session: CodeStreamSession) {
		this.status = session.status;
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

		const parsed = this.documentParser.parse(document.getText());
		return parsed.map(_ => {
			const range = new Range(document.positionAt(_.range.start), document.positionAt(_.range.end));
			return new CodeLens(
				range,
				new NrqlStatementExecutionCommand("Execute ▶️", "codestream.executeNrql", "", [
					document.uri,
					_.text,
					range.start.line
				])
			);
		});
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
