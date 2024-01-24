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
			const currentWordAsUpperCase = request.currentWord?.toUpperCase();
			const text = request.text?.toLowerCase().trimEnd();
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
			if (text) {
				const collectionsResponse = await this.nrNRQLProvider.fetchCollections();

				if (collectionsResponse.list.length) {
					if (text.endsWith("from")) {
						for (const candidate of collectionsResponse.list) {
							completionItems.push({
								label: candidate,
								kind: CompletionItemKind.Module,
								insertText: candidate,
							});
						}
						return { items: completionItems };
					} else if (text.endsWith("where")) {
						const response = await this.nrNRQLProvider.fetchColumns({ query: request.text });
						if (response.columns) {
							for (const candidate of response.columns) {
								completionItems.push({
									label: candidate,
									kind: CompletionItemKind.Property,
									insertText: candidate,
								});
							}
							return { items: completionItems };
						}
					} else if (request.text) {
						// find the last collectionName
						const split = request.text.trim().split(" ");
						for (let i = split.length; i > -1; i--) {
							const current = split[i];
							const found = collectionsResponse.obj[current];
							if (found) {
								const select = builtIns?.keywords?.find(_ => _.label === "SELECT");
								if (select) {
									return { items: [select] };
								}
							}
						}
					}
				}
			}
		} catch (ex) {
			Logger.warn("provideCompletionItems", { error: ex });
		}
		return { items: completionItems };
	}
}
