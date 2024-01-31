import {
	DocumentSymbolProvider,
	TextDocument,
	DocumentSymbol,
	CancellationToken,
	ProviderResult,
	SymbolInformation,
	SymbolKind,
	Range
} from "vscode";
import { NrqlDocumentParser } from "./nrqlDocumentParser";
import { Logger } from "../logger";
import { log } from "../system";

export class nrqlDocumentSymbolProvider implements DocumentSymbolProvider {
	documentParser = new NrqlDocumentParser();

	@log({ timed: true })
	provideDocumentSymbols(
		document: TextDocument,
		token: CancellationToken
	): ProviderResult<SymbolInformation[] | DocumentSymbol[]> {
		try {
			const parsed = this.documentParser.parse(document.getText());

			const results = parsed.map(_ => {
				const range = new Range(
					document.positionAt(_.range.start),
					document.positionAt(_.range.end)
				);
				// hijack the name field to store the entire statement
				return new DocumentSymbol(_.text, "", SymbolKind.String, range, range);
			});
			Logger.log(
				`nrqlDocumentSymbolProvider:provideDocumentSymbols token=${token.isCancellationRequested} found=${results.length} statements`
			);
			return results;
		} catch (ex) {
			Logger.warn("nrqlDocumentSymbolProvider:provideDocumentSymbols", { error: ex });
		}
		return [];
	}
}
