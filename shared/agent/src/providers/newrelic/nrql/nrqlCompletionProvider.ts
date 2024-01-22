import { CodeStreamSession } from "session";
import {
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
} from "vscode-languageserver";
import { parseId } from "../utils";
import { SessionContainer } from "container";
import { Logger } from "logger";
import { NrNRQLProvider } from "./nrqlProvider";
import { nrqlFunctions, nrqlKeywords, nrqlOperators } from "./constants";
// import * as tmGrammar from "./nrql.tmGrammar.json";

const nrItemsToDocSelector: any = {
	AS: "#sel-as",
	FROM: "#sel-from",
	LIMIT: "#sel-limit",
	SELECT: "#state-select",
	WHERE: "#sel-where",
};
let nrCollectionsByAccount: any = {};
let nrCollectionsByAccountAsObject: any = {};

let lastAccountId = 0;

let nrColumnsByAccountByCollectionName: any = {};
// let valuesByCollectionNameAndColumn: any = {};

let nrBuiltIns: string[] = [];
nrBuiltIns = nrBuiltIns.concat(...nrqlFunctions);
nrBuiltIns = nrBuiltIns.concat(...nrqlKeywords);

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
			const text = document.getText();

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
			const currentWord = text
				.slice(wordRange.start.character, wordRange.end.character)
				.toUpperCase();

			const completionItems: CompletionItem[] = []; // Array to store completion items

			if (!Object.keys(nrCollectionsByAccount).length) {
				// fire this off, but don't block
				void this.fetchCollections();
			}
			const lastText = text.toLocaleLowerCase().trimEnd();
			if (Object.keys(nrCollectionsByAccount).length) {
				if (lastText.endsWith("from")) {
					for (const candidate of nrCollectionsByAccount[lastAccountId]) {
						completionItems.push({
							label: candidate,
							kind: CompletionItemKind.Text,
						});
					}
					return completionItems;
				} else if (lastText.endsWith("where")) {
					// this is a little fragile here...
					const collection = text
						.split(" ")
						.findLast(_ => nrCollectionsByAccountAsObject[lastAccountId][_]);
					if (collection) {
						// fire this off, but don't block
						return new Promise(resolve => {
							this.fetchColumns(collection).then(_ => {
								const columns = nrColumnsByAccountByCollectionName[lastAccountId][collection];
								if (columns) {
									for (const candidate of columns) {
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
				// else if (nrqlOperators.some(suffix => text.endsWith(suffix))) {
				// 	return new Promise(resolve => {
				// 		this.fetchValues(collection).then(_ => {
				// 			const columns = columnsByCollectionName[collection];
				// 			if (columnsByCollectionName[collection]) {
				// 				for (const candidate of columns) {
				// 					completionItems.push({
				// 						label: candidate,
				// 						kind: CompletionItemKind.Text,
				// 					});
				// 				}
				// 				resolve(completionItems);
				// 			}
				// 		});
				// 	});
				// }
			}

			// Filter and generate completion items based on the current word
			for (const candidate of nrqlFunctions) {
				if (candidate.startsWith(currentWord)) {
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
			for (const candidate of nrqlKeywords) {
				if (candidate.startsWith(currentWord)) {
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

			for (const candidate of nrqlOperators) {
				if (candidate.startsWith(currentWord)) {
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

	async fetchCollections() {
		let accountId = 0;
		try {
			accountId = await this.getCurrentAccountId();
			if (!accountId) return;

			if (!nrCollectionsByAccount[accountId]) {
				nrCollectionsByAccount[accountId] = [];
			}

			if (nrCollectionsByAccount[accountId]!.length) return;

			const response = await this.nrNRQLProvider.executeNRQL({
				accountId: accountId,
				query: "SHOW EVENT TYPES",
			});
			const mapped = response.results!.map(_ => _.eventType) as string[];
			nrCollectionsByAccount[accountId] = mapped;
			nrCollectionsByAccountAsObject[accountId] = mapped.reduce((obj: any, item: any) => {
				obj[item] = true;
				return obj;
			}, {});
		} catch (ex) {
			Logger.warn("Failed to fetchCollections", { error: ex });
			nrCollectionsByAccount[accountId] = [];
		}
	}

	async fetchColumns(collectionName: string) {
		if (!collectionName) return;
		let accountId = 0;
		try {
			accountId = await this.getCurrentAccountId();
			if (!accountId) return;

			if (!nrColumnsByAccountByCollectionName[accountId]) {
				nrColumnsByAccountByCollectionName[accountId] = [];
			}
			if (!nrColumnsByAccountByCollectionName[accountId][collectionName]) {
				nrColumnsByAccountByCollectionName[accountId][collectionName] = [];
			}
			if (nrColumnsByAccountByCollectionName[accountId][collectionName].length) return;

			const response = await this.nrNRQLProvider.executeNRQL({
				accountId: accountId,
				query: `SELECT keyset() FROM ${collectionName}`,
			});

			if (response) {
				nrColumnsByAccountByCollectionName[accountId][collectionName] = response.results!.map(
					_ => _.key
				);
			}
		} catch (ex) {
			Logger.warn(`Failed to fetchColumns for ${collectionName}`, { error: ex });
			nrColumnsByAccountByCollectionName[accountId][collectionName] = [];
		}
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

	private async getCurrentAccountId() {
		try {
			const { users } = SessionContainer.instance();
			// this is cached, and should be _fast_
			const me = await users.getMe();
			const currentRepoId = me?.preferences?.currentO11yRepoId;
			const currentEntityGuid = currentRepoId
				? (me?.preferences?.activeO11y?.[currentRepoId] as string)
				: undefined;
			const result = parseId(currentEntityGuid!);
			if (result) {
				lastAccountId = result.accountId;
				return result.accountId;
			}
		} catch (ex) {
			Logger.warn(`Failed to getCurrentAccountId`, { error: ex });
			return 0;
		}
		return 0;
	}
}
