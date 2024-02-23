"use strict";
import * as vscode from "vscode";
import {
	CancellationToken,
	CodeLens,
	CodeLensProvider,
	DocumentSymbol,
	Range,
	TextDocument
} from "vscode";
import { CodeStreamSession, SessionStatus } from "../api/session";
import { BuiltInCommands } from "../constants";
import { Logger } from "../logger";
import { SymbolKind } from "vscode-languageclient";
import { Container } from "../container";
import { log } from "../system";
import { ExecuteNrqlCommandArgs } from "../commands";

// const sleep = async (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export class NrqlCodeLensProvider implements CodeLensProvider {
	private _status: string | undefined = undefined;

	constructor(private session: CodeStreamSession) {
		this._status = this.session.status;
		Container.session.onDidChangeCodelenses(e => {
			this._onDidChangeCodeLenses.fire();
		});
	}

	// Define an event emitter for code lens changes
	private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();

	// Expose the event emitter as a property
	readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

	@log({ timed: true })
	public async provideCodeLenses(
		document: TextDocument,
		token: CancellationToken
	): Promise<CodeLens[] | null | undefined> {
		if (this._status !== SessionStatus.SignedIn) {
			Logger.log(`NrqlCodeLensProvider.provideCodeLenses not signedIn status=${this._status}`);

			return [
				new CodeLens(new Range(0, 0, 0, 0), {
					title: "Sign in to New Relic to run queries",
					tooltip: "Run NRQL query",
					command: "codestream.toggle",
					arguments: [document.uri, "", 0]
				})
			];
		}

		const cancellationTokenSource = new vscode.CancellationTokenSource();
		token.onCancellationRequested(() => {
			Logger.log("NrqlCodeLensProvider.onCancellationRequested");
			cancellationTokenSource.cancel();
		});

		let timeout = setTimeout(() => {
			if (!cancellationTokenSource.token.isCancellationRequested) {
				Logger.log("NrqlCodeLensProvider.provideCodeLenses setTimeout");
				cancellationTokenSource.cancel();
			}
		}, 10000);

		// leaving this here in case it becomes needed, ExecuteDocumentSymbolProvider
		// is sometimes flaky

		// let symbols: DocumentSymbol[] = [];
		// for (const i of [50, 100, 500]) {
		// 	if (token.isCancellationRequested) {
		// 		Logger.log("NrqlCodeLensProvider.provideCodeLenses isCancellationRequested=true", {
		// 			timeout: i
		// 		});
		// 		clearTimeout(i);
		// 		cancellationTokenSource.dispose();
		// 		return [];
		// 	}
		// 	try {
		// 		symbols = await vscode.commands.executeCommand<DocumentSymbol[]>(
		// 			BuiltInCommands.ExecuteDocumentSymbolProvider,
		// 			document.uri,
		// 			token
		// 		);
		// 		if (!symbols || symbols.length === 0) {
		// 			Logger.debug(`NrqlCodeLensProvider.provideCodeLenses sleeping for ${i}ms`);
		// 			await sleep(i);
		// 		} else {
		// 			Logger.debug(
		// 				`NrqlCodeLensProvider.provideCodeLenses found ${symbols?.length || 0} at ${i}`
		// 			);
		// 			break;
		// 		}
		// 	} catch (ex) {
		// 		Logger.warn(
		// 			`NrqlCodeLensProvider.provideCodeLenses failed to ExecuteDocumentSymbolProvider canceled=${token.isCancellationRequested}`,
		// 			{ error: ex }
		// 		);
		// 	}
		// }
		return vscode.commands
			.executeCommand<DocumentSymbol[]>(
				BuiltInCommands.ExecuteDocumentSymbolProvider,
				document.uri,
				token
			)
			.then(_ => {
				clearTimeout(timeout);
				cancellationTokenSource.dispose();
				Logger.debug(`NrqlCodeLensProvider.provideCodeLenses returning ${_?.length || 0}`);
				return (
					_
						// SymbolKind.String use the languageclient version!
						?.filter(_ => _.kind === SymbolKind.String)
						?.map(_ => {
							return new CodeLens(_.range, {
								title: "Run ▶️",
								tooltip: "Run NRQL query",
								command: "codestream.executeNrql",
								arguments: [
									{
										fileUri: document.uri,
										// the "name" is the query
										text: _.name,
										lineNumber: _.range.start.line
									} as ExecuteNrqlCommandArgs
								]
							});
						})
				);
			});
	}

	public update(status: string) {
		this._status = status;
		this._onDidChangeCodeLenses.fire();
	}

	public resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken) {
		return token.isCancellationRequested ? undefined : codeLens;
	}

	public dispose() {
		this._onDidChangeCodeLenses && this._onDidChangeCodeLenses.dispose();
	}
}
