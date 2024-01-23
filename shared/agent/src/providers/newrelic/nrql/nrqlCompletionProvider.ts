import { CodeStreamSession } from "session";
import {
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
} from "vscode-languageserver";
import { Logger } from "logger";
import { NrNRQLProvider } from "./nrqlProvider";
import { Range } from "vscode-languageserver";

const nrItemsToDocSelector: any = {
	AS: "#sel-as",
	FROM: "#sel-from",
	LIMIT: "#sel-limit",
	SELECT: "#state-select",
	WHERE: "#sel-where",
};

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
			// Retrieve the document's text
			const document = this.session.agent.documents.get(textDocument.uri)!;

			const text = document.getText(Range.create(position.line, 0, position.line + 1, 0));

			// Determine the range of the current word
			let wordRange = {
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
			const currentWordAsUpperCase = text
				.slice(wordRange.start.character, wordRange.end.character)
				.toUpperCase();

			const completionItems: CompletionItem[] = []; // Array to store completion items

			// fire this off, but don't block
			const collectionsResponse = await this.nrNRQLProvider.fetchCollections();

			const lastText = text.toLocaleLowerCase().trimEnd();
			if (collectionsResponse.list.length) {
				if (lastText.endsWith("from")) {
					for (const candidate of collectionsResponse.list) {
						completionItems.push({
							label: candidate,
							kind: CompletionItemKind.Text,
						});
					}
					return completionItems;
				} else if (lastText.endsWith("where")) {
					// fire this off, but don't block
					return new Promise(resolve => {
						this.nrNRQLProvider.fetchColumns({ query: text }).then(_ => {
							if (_.columns) {
								for (const candidate of _.columns) {
									completionItems.push({
										label: candidate,
										kind: CompletionItemKind.Property,
									});
								}
								resolve(completionItems);
							}
						});
					});
				}
			}

			const builtIns = await this.nrNRQLProvider.getConstants({});

			// Filter and generate completion items based on the current word
			for (const candidate of builtIns.functions) {
				if (candidate.startsWith(currentWordAsUpperCase)) {
					const documentation = nrItemsToDocSelector[candidate];

					completionItems.push({
						label: candidate,
						kind: CompletionItemKind.Function,
						detail: `${candidate} Function`,
						documentation: {
							kind: "markdown",
							value: `[Documentation](https://docs.newrelic.com/docs/query-your-data/nrql-new-relic-query-language/get-started/nrql-syntax-clauses-functions/${
								documentation || "#clauses"
							})`,
						},
					});
				}
			}
			for (const candidate of builtIns.keywords) {
				if (candidate.startsWith(currentWordAsUpperCase)) {
					const documentation = nrItemsToDocSelector[candidate];

					completionItems.push({
						label: candidate,
						kind: CompletionItemKind.Keyword,
						detail: `${candidate} Keyword`,
						documentation: {
							kind: "markdown",
							value: `[Documentation](https://docs.newrelic.com/docs/query-your-data/nrql-new-relic-query-language/get-started/nrql-syntax-clauses-functions/${
								documentation || "#functions"
							})`,
						},
					});
				}
			}

			for (const candidate of builtIns.operators) {
				if (candidate.startsWith(currentWordAsUpperCase)) {
					completionItems.push({
						label: candidate,
						kind: CompletionItemKind.Operator,
						detail: `${candidate} Operator`,
						documentation: {
							kind: "markdown",
							value: `[Documentation](https://docs.newrelic.com/docs/query-your-data/nrql-new-relic-query-language/get-started/nrql-syntax-clauses-functions/#sel-where)`,
						},
					});
				}
			}

			return completionItems;
		} catch (ex) {
			Logger.warn("onCompletion error", { error: ex });
			return [];
		}
	}

	async onCompletionResolve(item: CompletionItem) {
		// here we can add details about the item
		return item;
	}

	// async fetchValues(collectionName: string, column: string) {
	// 	if (!collectionName) return;
	// 	const key = `${collectionName}-${column}`;
	// 	if (valuesByCollectionNameAndColumn[key]) return;

	// 	const accountId = await this.getCurrentAccountId();
	// 	if (!accountId) return;
	// 	try {
	// 		const response = await this.newRelicGraphqlClient.runNrql<any>(
	// 			accountId,
	// 			`SELECT uniques(${column}) FROM ${collectionName} SINCE 30 MINUTES AGO LIMIT 10`
	// 		);

	// 		if (response) {
	// 			valuesByCollectionNameAndColumn[key] = response.map(_ => _.key);
	// 		}
	// 	} catch (ex) {
	// 		Logger.warn(`Failed to fetchValues for ${key}`, { error: ex });
	// 		valuesByCollectionNameAndColumn[key] = [];
	// 	}
	// }
}
