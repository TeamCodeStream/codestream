import { CancellationToken, DocumentSymbol, TextDocument, SymbolInformation } from "vscode";
import * as vscode from "vscode";

import { BuiltInCommands } from "../constants";
import { Logger } from "../logger";
import { Container } from "../container";

const sleep = async (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export class InstrumentableSymbol {
	constructor(
		public symbol: vscode.DocumentSymbol,
		public parent: vscode.DocumentSymbol | undefined
	) {}
}

export type SymboslLocated = {
	instrumentableSymbols: InstrumentableSymbol[];
	allSymbols: DocumentSymbol[];
};

export type DocumentsLocatedBySymbols = {
	symbolMatches: SymbolInformation[];
};

export interface ISymbolLocator {
	locate(document: TextDocument, token: vscode.CancellationToken): Promise<SymboslLocated>;

	locateDocumentBySymbolSearch(
		namespace: string,
		functionName: string,
		token: vscode.CancellationToken
	): Promise<DocumentsLocatedBySymbols>;
}

function isJavascriptIsh(languageId: string) {
	return (
		languageId === "javascript" ||
		languageId === "typescript" ||
		languageId === "javascriptreact" ||
		languageId === "tyspescriptreact"
	);
}

export class SymbolLocator implements ISymbolLocator {
	async locateDocumentBySymbolSearch(
		namespace: string,
		functionName: string,
		token: vscode.CancellationToken
	): Promise<DocumentsLocatedBySymbols> {
		let symbols: SymbolInformation[];

		const emptyResult = {
			symbolMatches: []
		};

		try {
			if (token.isCancellationRequested) {
				return emptyResult;
			}

			// copied these timeouts from the file symbol locator, but this may take even longer....
			for (const timeout of [0, 750, 1000, 1500, 2000]) {
				if (token.isCancellationRequested) {
					Logger.log("SymbolLocator.locateDocumentBySymbolSearch isCancellationRequested", {
						timeout
					});
					return emptyResult;
				}
				try {
					// this is more of a "search" than a true "find single", so we'll send back all matches
					// and let the caller decide what to do with them. Prompt the user to select the correct one?
					symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
						BuiltInCommands.ExecuteWorkspaceSymbolprovider,
						`${namespace}.${functionName}`
					);
					if (!symbols || symbols.length === 0) {
						await sleep(timeout);
					} else {
						Logger.log(`SymbolLocator.locateDocumentBySymbolSearch found ${symbols.length}`, {
							timeout
						});

						return {
							symbolMatches: symbols
						};
					}
				} catch (ex) {
					Logger.warn(
						"SymbolLocator.locateDocumentBySymbolSearch failed to ExecuteWorkspaceSymbolprovider",
						{ ex }
					);
				}
			}

			return emptyResult;
		} catch (ex) {
			Logger.warn("SymbolLocator.locateDocumentBySymbolSearch", {
				error: ex,
				namespace: namespace,
				functionName: functionName
			});
		}
		return emptyResult;
	}

	async locate(
		document: TextDocument,
		token: vscode.CancellationToken
	): Promise<{
		instrumentableSymbols: InstrumentableSymbol[];
		allSymbols: DocumentSymbol[];
	}> {
		const instrumentableSymbols: InstrumentableSymbol[] = [];
		const emptyResult = {
			instrumentableSymbols: [],
			allSymbols: []
		};

		try {
			if (token.isCancellationRequested) {
				return emptyResult;
			}

			const symbolResult = await this.locateCore(document, token);
			this.buildLensCollection(document, undefined, symbolResult, instrumentableSymbols, token);
			return {
				instrumentableSymbols,
				allSymbols: symbolResult
			};
		} catch (ex) {
			Logger.warn("SymbolLocator.locate", {
				error: ex,
				document: document
			});
		}
		return emptyResult;
	}

	private async locateCore(
		document: TextDocument,
		token: vscode.CancellationToken
	): Promise<DocumentSymbol[]> {
		let symbols: DocumentSymbol[] | undefined = [];

		let localUri;
		if (document.uri.scheme === "codestream-diff") {
			const { uri: localUriString } = await Container.agent.urls.resolveLocalUri(
				document.uri.toString(true)
			);
			localUri = localUriString && vscode.Uri.parse(localUriString);
		}

		for (const timeout of [0, 750, 1000, 1500, 2000]) {
			if (token.isCancellationRequested) {
				Logger.log("SymbolLocator.locateCore isCancellationRequested", { timeout });
				return [];
			}
			try {
				symbols = await vscode.commands.executeCommand<DocumentSymbol[]>(
					BuiltInCommands.ExecuteDocumentSymbolProvider,
					localUri || document.uri
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
		document: TextDocument,
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
				this.buildLensCollection(document, symbol, symbol.children, collection, token);
			}

			if (symbol.kind === vscode.SymbolKind.Function || symbol.kind === vscode.SymbolKind.Method) {
				collection.push(new InstrumentableSymbol(symbol, parent));
			}

			if (this.isJavascriptFunctionVariable(document, symbol)) {
				collection.push(new InstrumentableSymbol(symbol, parent));
			}
		}
	}

	public isJavascriptFunctionVariable(document: TextDocument, symbol: DocumentSymbol): boolean {
		if (isJavascriptIsh(document.languageId) && symbol.kind === vscode.SymbolKind.Variable) {
			// Look for variables assigned to functions i.e. myVar = functiion {}
			const symbolText = document.getText(symbol.range);
			const functionKeywordRegex = new RegExp(`${symbol.name}\\s*=\\s*function`, "s");
			if (functionKeywordRegex.test(symbolText)) {
				return true;
			}

			// Look for variables assigned to arrow functions i.e. myVar = (req, resp) => {}
			const anonymousFunctionVarRegex = new RegExp(`${symbol.name}\\s*=\\s*(.*)\\s*=>`, "s");
			if (anonymousFunctionVarRegex.test(symbolText)) {
				return true;
			}
		}
		return false;
	}
}
