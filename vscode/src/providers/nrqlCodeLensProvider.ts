"use strict";

import {
	CancellationToken,
	CodeLens,
	CodeLensProvider,
	DocumentSymbol,
	Range,
	SymbolKind,
	TextDocument
} from "vscode";
import * as vscode from "vscode";

import { CodeStreamSession, SessionStatus } from "../api/session";
import { BuiltInCommands } from "../constants";
import { log } from "../system";
import { Logger } from "../logger";

export class NrqlCodeLensProvider implements CodeLensProvider {
	private status: string | undefined = undefined;
	constructor(private session: CodeStreamSession) {
		this.status = session.status;
	}

	@log({ timed: true })
	public async provideCodeLenses(
		document: TextDocument,
		token: CancellationToken
	): Promise<CodeLens[] | null | undefined> {
		try {
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

			return vscode.commands
				.executeCommand<DocumentSymbol[]>(
					BuiltInCommands.ExecuteDocumentSymbolProvider,
					document.uri
				)
				.then(_ => {
					return _?.filter(_ => _.kind === SymbolKind.String).map(_ => {
						return new CodeLens(
							_.range,
							new NrqlStatementExecutionCommand(
								"Execute ▶️",
								"codestream.executeNrql",
								"Run this nrql statement",
								[document.uri, _.name, _.range.start.line]
							)
						);
					});
				});
		} catch (ex) {
			Logger.warn("NrqlCodeLensProvider.provideCodeLenses", { error: ex });
		}
		return undefined;
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
