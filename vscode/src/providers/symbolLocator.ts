import { CancellationToken, DocumentSymbol, TextDocument } from "vscode";
import * as vscode from "vscode";
import { BuiltInCommands } from "../constants";
import { Logger } from "../logger";

const sleep = async (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export class InstrumentableSymbol {
	constructor(
		public symbol: vscode.DocumentSymbol,
		public parent: vscode.DocumentSymbol | undefined
	) {}
}

export interface ISymbolLocator {
	locate(document: TextDocument, token: vscode.CancellationToken): Promise<InstrumentableSymbol[]>;
}

export class SymbolLocator implements ISymbolLocator {
	async locate(
		document: TextDocument,
		token: vscode.CancellationToken
	): Promise<InstrumentableSymbol[]> {
		const instrumentableSymbols: InstrumentableSymbol[] = [];

		try {
			if (token.isCancellationRequested) {
				return [];
			}

			const symbolResult = await this.locateCore(document, token);
			this.buildLensCollection(undefined, symbolResult, instrumentableSymbols, token);
		} catch (ex) {
			Logger.warn("SymbolLocator.locate", {
				error: ex,
				document: document
			});
		}
		return instrumentableSymbols;
	}

	private async locateCore(
		document: TextDocument,
		token: vscode.CancellationToken
	): Promise<DocumentSymbol[]> {
		let symbols: DocumentSymbol[] | undefined = [];

		for (const timeout of [0, 750, 1000, 1500, 2000]) {
			if (token.isCancellationRequested) {
				Logger.log("SymbolLocator.locateCore isCancellationRequested", { timeout });
				return [];
			}
			try {
				symbols = await vscode.commands.executeCommand<DocumentSymbol[]>(
					BuiltInCommands.ExecuteDocumentSymbolProvider,
					document.uri
				);
				if (!symbols || symbols.length === 0) {
					await sleep(timeout);
				} else {
					const results = symbols || [];
					Logger.log(`SymbolLocator.locateCore found ${results.length}`, { timeout });
					return results;
				}
			} catch (ex) {
				Logger.warn("SymbolLocator.locateCore failed to ExecuteDocumentSymbolProvider", { ex });
			}
		}

		return symbols || [];
	}

	private buildLensCollection(
		parent: DocumentSymbol | undefined,
		symbols: DocumentSymbol[],
		collection: InstrumentableSymbol[],
		token: CancellationToken
	) {
		for (const symbol of symbols) {
			if (token.isCancellationRequested) {
				return;
			}

			if (symbol.children && symbol.children.length) {
				this.buildLensCollection(symbol, symbol.children, collection, token);
			}
			if (symbol.kind === vscode.SymbolKind.Function || symbol.kind === vscode.SymbolKind.Method) {
				collection.push(new InstrumentableSymbol(symbol, parent));
			}
		}
	}
}
