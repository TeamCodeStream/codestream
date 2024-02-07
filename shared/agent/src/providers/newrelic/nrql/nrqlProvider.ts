import {
	GetNRQLCollectionsRequest,
	GetNRQLCollectionsRequestType,
	GetNRQLCollectionsResponse,
	GetNRQLColumnsRequest,
	GetNRQLColumnsRequestType,
	GetNRQLColumnsResponse,
	GetNRQLConstantsRequest,
	GetNRQLConstantsRequestType,
	GetNRQLConstantsResponse,
	GetNRQLRecentQueriesRequest,
	GetNRQLRecentQueriesResponse,
	GetNRQLRecentQueriesType,
	GetNRQLRequest,
	GetNRQLRequestType,
	GetNRQLResponse,
	ResultsTypeGuess,
	SaveRecentQueryRequest,
	SaveRecentQueryResponse,
} from "@codestream/protocols/agent";
import { escapeNrql } from "@codestream/utils/system/string";
import { CompletionItemKind } from "vscode-languageserver";
import { SessionContainer } from "../../../container";
import { Logger } from "../../../logger";
import { gate } from "../../../system/decorators/gate";
import { log } from "../../../system/decorators/log";
import { lsp, lspHandler } from "../../../system/decorators/lsp";
import { ContextLogger } from "../../contextLogger";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import { mapNRErrorResponse, parseId } from "../utils";
import { nrItemsToDocSelector, nrqlFunctions, nrqlKeywords, nrqlOperators } from "./constants";

interface NrCollectionsByAccount {
	[accountId: string]: string[];
}

interface NrCollectionsByAccountAsObject {
	[accountId: string]: string[];
}

interface NrColumnsByAccountByCollectionName {
	[accountId: string]: {
		[collectionName: string]: string[];
	};
}

let nrConstantsCache: GetNRQLConstantsResponse;

let nrCollectionsByAccount: NrCollectionsByAccount = {};
let nrCollectionsByAccountAsObject: NrCollectionsByAccountAsObject = {};
let nrColumnsByAccountByCollectionName: NrColumnsByAccountByCollectionName = {};

@lsp
export class NrNRQLProvider {
	constructor(private graphqlClient: NewRelicGraphqlClient) {}

	@lspHandler(GetNRQLRequestType)
	@log()
	public async executeNRQL(request: GetNRQLRequest): Promise<GetNRQLResponse> {
		const accountId = request.accountId;

		if (!accountId) {
			throw new Error("Missing accountId");
		}

		try {
			const query = escapeNrql(request.query).trim();
			const response = await this.graphqlClient.runNrqlWithMetadata<any>(accountId, query, 400);

			void this.saveRecentQuery(request);

			return {
				accountId,
				results: response.results,
				eventType: response?.rawResponse?.metadata?.eventType,
				since: response?.rawResponse?.metadata?.rawSince,
				resultsTypeGuess: this.getResultsType(query, response.results) as ResultsTypeGuess,
			};
		} catch (ex) {
			ContextLogger.warn("executeNRQL failure", {
				request,
				error: ex,
			});
			return {
				error: mapNRErrorResponse(ex),
				accountId,
				resultsTypeGuess: { selected: "table", enabled: [] },
			};
		}
	}

	@log()
	private async saveRecentQuery(
		request: SaveRecentQueryRequest
	): Promise<SaveRecentQueryResponse | undefined> {
		try {
			const response = await this.graphqlClient.mutate<{
				queryHistoryRecordNrql: {
					createdAt: number;
				};
			}>(
				`mutation QueryHistoryRecordNrql($accountId: Int!, $query: Nrql!){
  queryHistoryRecordNrql(query: {query: $query, accountIds: [$accountId]}) {
    createdAt    
  }
}`,
				{
					accountId: request.accountId,
					query: request.query,
				}
			);

			return { createdAt: response?.queryHistoryRecordNrql?.createdAt };
		} catch (ex) {
			Logger.error(ex, "saveRecentQuery");
		}
		return undefined;
	}

	@lspHandler(GetNRQLConstantsRequestType)
	@log()
	public async getConstants(request: GetNRQLConstantsRequest): Promise<GetNRQLConstantsResponse> {
		if (nrConstantsCache) return nrConstantsCache;

		nrConstantsCache = {
			operators: nrqlOperators.map(candidate => {
				return {
					label: candidate,
					kind: CompletionItemKind.Operator,
					detail: `${candidate} Operator`,
					documentation: {
						kind: "markdown",
						value: `[Documentation](https://docs.newrelic.com/docs/query-your-data/nrql-new-relic-query-language/get-started/nrql-syntax-clauses-functions/#sel-where)`,
					},
					insertText: candidate,
				};
			}),
			functions: nrqlFunctions.map(candidate => {
				const documentation = nrItemsToDocSelector[candidate];
				return {
					label: candidate,
					kind: CompletionItemKind.Function,
					detail: `${candidate} Function`,
					documentation: {
						kind: "markdown",
						value: `[Documentation](https://docs.newrelic.com/docs/query-your-data/nrql-new-relic-query-language/get-started/nrql-syntax-clauses-functions/${
							documentation || "#clauses"
						})`,
					},
					insertText: candidate,
				};
			}),
			keywords: nrqlKeywords.map(candidate => {
				const documentation = nrItemsToDocSelector[candidate];
				return {
					label: candidate,
					kind: CompletionItemKind.Keyword,
					detail: `${candidate} Keyword`,
					documentation: {
						kind: "markdown",
						value: `[Documentation](https://docs.newrelic.com/docs/query-your-data/nrql-new-relic-query-language/get-started/nrql-syntax-clauses-functions/${
							documentation || "#functions"
						})`,
					},
					insertText: candidate,
				};
			}),
		};
		return nrConstantsCache;
	}

	@lspHandler(GetNRQLCollectionsRequestType)
	@gate()
	async fetchCollections(
		request: GetNRQLCollectionsRequest = {}
	): Promise<GetNRQLCollectionsResponse> {
		let accountId = 0;
		try {
			accountId = await this.getCurrentAccountId();
			if (!accountId) return { list: [], obj: {} };

			if (!nrCollectionsByAccount[accountId]) {
				nrCollectionsByAccount[accountId] = [];
			}

			if (nrCollectionsByAccount[accountId]!.length) {
				return {
					list: nrCollectionsByAccount[accountId],
					obj: nrCollectionsByAccountAsObject[accountId],
				};
			}

			const response = await this.executeNRQL({
				accountId: accountId,
				query: "SHOW EVENT TYPES",
			});
			const mapped = response.results!.map(_ => _.eventType) as string[];
			nrCollectionsByAccount[accountId] = mapped;
			nrCollectionsByAccountAsObject[accountId] = mapped.reduce((obj: any, item: any) => {
				obj[item] = true;
				return obj;
			}, {});
			return {
				list: nrCollectionsByAccount[accountId],
				obj: nrCollectionsByAccountAsObject[accountId],
			};
		} catch (ex) {
			Logger.warn("Failed to fetchCollections", { error: ex });
			nrCollectionsByAccount[accountId] = [];
		}
		return { list: [], obj: {} };
	}

	@lspHandler(GetNRQLColumnsRequestType)
	async fetchColumns(request: GetNRQLColumnsRequest): Promise<GetNRQLColumnsResponse> {
		if (!request.collectionName && !request.query) {
			Logger.warn("fetchColumns missing arguments");
			return {
				columns: [],
			};
		}
		let collectionName;
		if (request.collectionName) {
			collectionName = request.collectionName;
		} else if (request.query) {
			if (request.query.length > 4000) {
				Logger.warn(`request.query too long (${request.query})`);
				return { columns: [] };
			}
			const collections = await this.fetchCollections({});
			let split = request.query.split(" ");
			for (let i = split.length; i > -1; i--) {
				const current = split[i];
				const found = collections.obj[current];
				if (found) {
					collectionName = current;
					break;
				}
			}
		}
		if (!collectionName) {
			return { columns: [] };
		}
		let accountId = 0;
		try {
			accountId = await this.getCurrentAccountId();
			if (!accountId) return { columns: [] };

			if (!nrColumnsByAccountByCollectionName[accountId]) {
				nrColumnsByAccountByCollectionName[accountId] = {};
			}
			if (!nrColumnsByAccountByCollectionName[accountId][collectionName]) {
				nrColumnsByAccountByCollectionName[accountId][collectionName] = [];
			}
			if (nrColumnsByAccountByCollectionName[accountId][collectionName].length) {
				return { columns: nrColumnsByAccountByCollectionName[accountId][collectionName] };
			}

			const response = await this.executeNRQL({
				accountId: accountId,
				query: `SELECT keyset() FROM ${collectionName}`,
			});

			if (response) {
				nrColumnsByAccountByCollectionName[accountId][collectionName] = response.results!.map(
					_ => _.key
				);
				return { columns: nrColumnsByAccountByCollectionName[accountId][collectionName] };
			}
			return { columns: nrColumnsByAccountByCollectionName[accountId][collectionName] };
		} catch (ex) {
			Logger.warn(`Failed to fetchColumns for ${collectionName}`, { error: ex });
			nrColumnsByAccountByCollectionName[accountId] = {};
		}
		return { columns: [] };
	}

	@lspHandler(GetNRQLRecentQueriesType)
	async fetchRecentQueries(
		request: GetNRQLRecentQueriesRequest
	): Promise<GetNRQLRecentQueriesResponse> {
		try {
			const response = await this.graphqlClient.query<{
				actor: {
					accounts: {
						id: number;
						name: string;
					}[];
					queryHistory: {
						nrql: {
							query: string;
							accountIds: number[];
							createdAt: number;
						}[];
					};
				};
			}>(`{
  actor {
    accounts {
      id
      name
    }
    queryHistory {
      nrql(options: {limit: 50}) {
        query
        accountIds
        createdAt
      }
    }
  }
}`);

			if (response) {
				const accounts = response?.actor?.accounts || [];

				const uniqueObjects: any = {};
				if (response?.actor?.queryHistory?.nrql) {
					// make a unique list based on the query + accountIds -- last one wins
					response.actor.queryHistory.nrql.forEach(object => {
						uniqueObjects[JSON.stringify({ query: object.query, accountIds: object.accountIds })] =
							object;
					});
					const uniqueList = Object.values(uniqueObjects) as {
						query: string;
						accountIds: number[];
						createdAt: number;
					}[];
					return {
						items: uniqueList.map(_ => {
							return {
								..._,
								dayString: this.toDayString(_.createdAt),
								accounts: accounts.filter(obj => (_.accountIds || []).includes(obj.id)),
							};
						}),
					};
				}
			}
		} catch (ex) {
			Logger.warn(`Failed to fetchRecentQueries for user`, { error: ex });
		}
		return { items: [] };
	}

	private toDayString(date: number | undefined) {
		try {
			if (!date) return "";

			const currentDate = new Date();
			const today = new Date(
				currentDate.getFullYear(),
				currentDate.getMonth(),
				currentDate.getDate()
			);
			const yesterday = new Date(today);
			yesterday.setDate(yesterday.getDate() - 1);

			const lastWeek = new Date(today);
			lastWeek.setDate(lastWeek.getDate() - 7);

			const thisMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

			const dateObj = new Date(date);
			if (dateObj >= today) {
				return "Today";
			} else if (dateObj >= yesterday) {
				return "Yesterday";
			} else if (dateObj >= lastWeek) {
				return "Last Week";
			} else if (dateObj >= thisMonth) {
				return "This Month";
			} else {
				return "Older";
			}
		} catch (ex) {}
		return "";
	}

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
				return result.accountId;
			}
		} catch (ex) {
			Logger.warn(`Failed to getCurrentAccountId`, { error: ex });
			return 0;
		}
		return 0;
	}

	private getResultsType(query: string, results: any[]) {
		const ALL_RESULT_TYPES = ["table", "json", "billboard", "line", "bar"];
		if (!results || !results.length) return { selected: "table", enabled: ALL_RESULT_TYPES };

		if (results.length === 1) {
			const value = results[0];
			if (typeof value === "object" && value != null && !Array.isArray(value)) {
				let selectedValue =
					Object.keys(value).length === 1 && !Array.isArray(value[Object.keys(value)[0]])
						? "billboard"
						: "json";
				return {
					selected: selectedValue,
					enabled: selectedValue === "billboard" ? ["billboard", "json"] : ["json"],
				};
			} else {
				return { selected: "billboard", enabled: ["billboard", "json"] };
			}
		}

		query = query.toUpperCase();
		if (query.indexOf("TIMESERIES") > -1) {
			const dataKeys = Object.keys(results[0] || {}).filter(
				_ => _ !== "beginTimeSeconds" && _ !== "endTimeSeconds"
			);

			if (dataKeys.length > 1) {
				return { selected: "json", enabled: ["json"] };
			}
			// complex timeseries data
			if (Array.isArray(results[0][dataKeys[0]])) {
				return { selected: "json", enabled: ["json"] };
			}
			// easy timeseries data like a TIMESERIES of a count
			return { selected: "line", enabled: ["table", "json", "line", "bar"] };
		}
		if (query.indexOf("FACET") > -1) {
			return { selected: "json", enabled: ["json"] }; // should be "bar"??
		}
		return { selected: "table", enabled: ["table", "json"] };
	}
}
