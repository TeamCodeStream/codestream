import { CodeStreamSession } from "session";
import {
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
} from "vscode-languageserver";
import { Logger } from "logger";
import { NrNRQLProvider } from "./nrqlProvider";
import { Range } from "vscode-languageserver";
import { lsp, lspHandler } from "../../../system/decorators/lsp";
import {
	GetNRQLCompletionItemsRequest,
	GetNRQLCompletionItemsResponse,
	GetNRQLCompletionItemsType,
} from "@codestream/protocols/agent";

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
		const completionItems: CompletionItem[] = []; // Array to store completion items
		try {
			const currentWordAsUpperCase = request.currentWord?.toUpperCase();
			// fire this off, but don't block
			const collectionsResponse = await this.nrNRQLProvider.fetchCollections();

			const lastText = request.text?.toLowerCase().trimEnd();
			if (lastText && collectionsResponse.list.length) {
				if (lastText.endsWith("from")) {
					for (const candidate of collectionsResponse.list) {
						completionItems.push({
							label: candidate,
							kind: CompletionItemKind.Module,
							insertText: candidate,
						});
					}
					return { items: completionItems };
				} else if (lastText.endsWith("where")) {
					return new Promise(resolve => {
						this.nrNRQLProvider.fetchColumns({ query: request.text }).then(_ => {
							if (_.columns) {
								for (const candidate of _.columns) {
									completionItems.push({
										label: candidate,
										kind: CompletionItemKind.Property,
										insertText: candidate,
									});
								}
								resolve({ items: completionItems });
							}
						});
					});
				}
			}

			if (currentWordAsUpperCase) {
				const builtIns = await this.nrNRQLProvider.getConstants({});
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
		} catch (ex) {
			Logger.warn("provideCompletionItems", { error: ex });
		}
		return { items: completionItems };
	}
}
