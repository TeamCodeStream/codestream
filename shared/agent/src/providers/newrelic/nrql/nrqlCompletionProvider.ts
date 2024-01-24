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
			const { line, character } = position;
			const document = this.session.agent.documents.get(textDocument.uri)!;
			// Retrieve the document's text at the position
			const text = document.getText(Range.create(position.line, 0, position.line + 1, 0));
			// Determine the range of the current word
			const wordRange = {
				start: { line: line, character: character },
				end: { line: line, character: character },
			};

			while (
				wordRange.start.character > 0 &&
				/\w/.test(text.charAt(wordRange.start.character - 1))
			) {
				wordRange.start.character--;
			}
			// Extract the current word
			const currentWordAsUpperCase = text.slice(wordRange.start.character, wordRange.end.character);

			const response = await this.provideCompletionItems({
				text: text,
				currentWord: currentWordAsUpperCase,
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
			// to use on matching against builtins
			const currentWordAsUpperCase = request.currentWord?.toUpperCase();
			// the entire line of a query (might be the entire query or a partial)
			const text = request.text?.trim();
			const textLowered = text?.toLowerCase();
			const builtIns = await this.nrNRQLProvider.getConstants({});
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
			if (textLowered) {
				const collectionsResponse = await this.nrNRQLProvider.fetchCollections();

				const textSplitLowered = textLowered.split(" ");
				const lastWordLowered = textSplitLowered[textSplitLowered.length - 1];

				switch (lastWordLowered) {
					case "select": {
						if (textSplitLowered[0] === "select") {
							return {
								items: [builtIns.operators.find(_ => _.label === "*")!, ...builtIns.functions],
							};
						} else {
							const response = await this.nrNRQLProvider.fetchColumns({ query: request.text });
							if (response.columns) {
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
						return { items: [builtIns.keywords.find(_ => _.label === "FROM")!] };
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
						const response = await this.nrNRQLProvider.fetchColumns({ query: request.text });
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
						// see if the last term was a column
						const textSplit = text!.split(" ");
						if (builtIns.operators.find(_ => _.label === textSplit[textSplit.length - 1])) {
							// TODO get potential column _values_?
							return { items: [] };
						}
						if (textSplitLowered.indexOf("where") > -1) {
							return { items: builtIns.operators };
						} else {
							// see if the last term was a collection
							// From Foo <Select>
							// Select * From Foo <Where>
							const label = textSplitLowered.indexOf("select") > -1 ? "WHERE" : "SELECT";
							for (let i = textSplit.length; i > -1; i--) {
								const current = textSplit[i];
								const found = collectionsResponse.obj[current];
								if (found) {
									return { items: [builtIns?.keywords?.find(_ => _.label === label)!] };
								}
							}
						}
					}
				}
			}

			if (!text) {
				return {
					items: builtIns.keywords.filter(_ => _.label === "SELECT" || _.label === "FROM")!,
				};
			}
		} catch (ex) {
			Logger.warn("provideCompletionItems", { error: ex });
		}
		return { items: completionItems };
	}
}
