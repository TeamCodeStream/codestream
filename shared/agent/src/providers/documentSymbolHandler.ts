import { Diagnostic, DocumentSymbol, TextDocument } from "vscode-languageserver";

export interface DocumentSymbolHandlers {
	[key: string]: DocumentSymbolHandler;
}

export interface DocumentSymbolHandler {
	handle(document: TextDocument): {
		symbols: DocumentSymbol[];
		diagnostics: Diagnostic[];
		reason?: "NOT_NRQL" | undefined;
	};
}
