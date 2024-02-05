import {
	Diagnostic,
	DiagnosticSeverity,
	DocumentSymbol,
	Range,
	SymbolKind,
	TextDocument,
} from "vscode-languageserver";
import { NrqlDocumentParser } from "./nrqlDocumentParser";
import { Logger } from "../../../logger";
import { DocumentSymbolHandler } from "../../../providers/documentSymbolHandler";

const documentParser = new NrqlDocumentParser();

export class NrqlDocumentHandler implements DocumentSymbolHandler {
	public handle(document: TextDocument): {
		symbols: DocumentSymbol[];
		diagnostics: Diagnostic[];
		reason?: "NOT_NRQL" | undefined;
	} {
		if (!document?.uri || !document.uri.toString().toLowerCase().endsWith(".nrql")) {
			return {
				symbols: [],
				diagnostics: [],
				reason: "NOT_NRQL",
			};
		}

		try {
			const parsed = documentParser.parse(document!.getText());
			return {
				symbols: parsed
					.filter(_ => _.invalid === false)
					.map(_ => {
						const range = Range.create(
							document.positionAt(_.range.start),
							document.positionAt(_.range.end)
						);
						// hijack the name field with a SymbolKind.String to store the entire statement
						return DocumentSymbol.create(_.text, "", SymbolKind.String, range, range);
					}),
				diagnostics: parsed
					.filter(_ => _.invalid === true)
					.map(_ => {
						return Diagnostic.create(
							Range.create(document.positionAt(_.range.start), document.positionAt(_.range.end)),
							"Syntax Error",
							DiagnosticSeverity.Warning
						);
					}),
			};
		} catch (ex) {
			Logger.warn(`onDocumentSymbol error uri=${document.uri}`, { error: ex });
		}
		return { symbols: [], diagnostics: [] };
	}
}
