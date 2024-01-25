import {
	GetNRQLCompletionItemsRequest,
	GetNRQLCompletionItemsResponse,
	GetNRQLCompletionItemsType,
} from "@codestream/protocols/agent";
import {
	CompletionItem,
	CompletionItemKind,
	Range,
	TextDocumentPositionParams,
} from "vscode-languageserver";
import { Logger } from "../../../logger";
import { CodeStreamSession } from "../../../session";
import { lsp, lspHandler } from "../../../system/decorators/lsp";
import { NrNRQLProvider } from "./nrqlProvider";

@lsp
export class NrqlCompletionProvider {
	constructor(
		private session: CodeStreamSession,
		private nrNRQLProvider: NrNRQLProvider
	) {}

	async onCompletion(textDocumentPosition: TextDocumentPositionParams): Promise<CompletionItem[]> {
		try {
			const { textDocument, position } = textDocumentPosition;
			if (!textDocument.uri.endsWith(".nrql")) {
				return [];
			}
			const document = this.session.agent.documents.get(textDocument.uri)!;
			// Retrieve the document's selected text at the position
			// TODO this only works for single lines
			const text = document.getText(Range.create(position.line, 0, position.line + 1, 0));
			const response = await this.provideCompletionItems({
				query: text,
			});
			return response?.items;
		} catch (ex) {
			Logger.warn("onCompletion error", { error: ex });
			return [];
		}
	}

	async onCompletionResolve(item: CompletionItem) {
		// here we can add details about the item
		return item;
	}

	@lspHandler(GetNRQLCompletionItemsType)
	async provideCompletionItems(
		request: GetNRQLCompletionItemsRequest
	): Promise<GetNRQLCompletionItemsResponse> {
		const completionItems: CompletionItem[] = [];
		try {
			const builtIns = await this.nrNRQLProvider.getConstants({});
			// the entire line of a query (might be the entire query or a partial)
			const text = request.query?.trim();
			if (!text) {
				return {
					items: builtIns.keywords.filter(_ => _.label === "SELECT" || _.label === "FROM")!,
				};
			}

			const textLowered = text?.toLowerCase();
			const split = text.split(" ");
			const currentWord = split[split.length - 1];
			const currentWordAsUpperCase = currentWord.toUpperCase();
			const textSplitLowered = textLowered.split(" ");
			const lastWordLowered = textSplitLowered[textSplitLowered.length - 1];
			const collectionsResponse = await this.nrNRQLProvider.fetchCollections();

			switch (lastWordLowered) {
				case "select": {
					if (textSplitLowered[0] === "select") {
						return {
							items: [builtIns.operators.find(_ => _.label === "*")!, ...builtIns.functions],
						};
					} else {
						const response = await this.nrNRQLProvider.fetchColumns({ query: request.query });
						if (response.columns) {
							completionItems.push(
								builtIns.operators.find(_ => _.label === "*")!,
								...builtIns.functions
							);
							for (const candidate of response.columns) {
								completionItems.push({
									label: candidate,
									kind: CompletionItemKind.Property,
									insertText: candidate,
								});
							}
						}
					}
					return { items: completionItems };
				}
				case "*": {
					if (textSplitLowered[0] === "from") {
						return { items: [builtIns.keywords.find(_ => _.label === "WHERE")!] };
					} else {
						return { items: [builtIns.keywords.find(_ => _.label === "FROM")!] };
					}
				}
				case "from": {
					for (const candidate of collectionsResponse.list) {
						completionItems.push({
							label: candidate,
							kind: CompletionItemKind.Module,
							insertText: candidate,
						});
					}
					return { items: completionItems };
				}
				case "where": {
					const response = await this.nrNRQLProvider.fetchColumns({ query: request.query });
					if (response.columns) {
						for (const candidate of response.columns) {
							completionItems.push({
								label: candidate,
								kind: CompletionItemKind.Property,
								insertText: candidate,
							});
						}
					}
					return { items: completionItems };
				}
				case "ago": {
					return {
						items: builtIns.keywords.filter(
							_ =>
								_.label === "COMPARE WITH" ||
								_.label === "EXTRAPOLATE" ||
								_.label === "FACET" ||
								_.label === "LIMIT" ||
								_.label === "SINCE" ||
								_.label === "SLIDE BY" ||
								_.label === "TIMESERIES" ||
								_.label === "UNTIL" ||
								_.label === "WHERE" ||
								_.label === "WITH TIMEZONE"
						)!,
					};
				}
				default: {
					// SELECT foo, <fn>
					if (lastWordLowered.endsWith(",")) {
						return {
							items: [...builtIns.functions],
						};
					}

					if (builtIns.operators.find(_ => _.label === split[split.length - 1])) {
						// TODO get potential column _values_?
						return { items: [] };
					}
					if (textSplitLowered.indexOf("where") > -1) {
						return { items: builtIns.operators };
					} else {
					}
				}
			}

			if (currentWordAsUpperCase) {
				// Filter and generate completion items based on the current word
				for (const candidate of [
					...builtIns.functions,
					...builtIns.keywords,
					...builtIns.operators,
				]) {
					if (candidate.label.startsWith(currentWordAsUpperCase)) {
						completionItems.push(candidate);
					}
				}
			}
			// see if the last term was a collection
			// From Foo <Select>
			// Select * From Foo <Where>
			const label = textSplitLowered.indexOf("select") > -1 ? "WHERE" : "SELECT";
			for (let i = split.length; i > -1; i--) {
				const current = split[i];
				const found = collectionsResponse.obj[current];
				if (found) {
					completionItems.push(builtIns?.keywords?.find(_ => _.label === label)!);
				}
			}
		} catch (ex) {
			Logger.warn("provideCompletionItems", { error: ex });
		}
		return { items: completionItems };
	}
}
