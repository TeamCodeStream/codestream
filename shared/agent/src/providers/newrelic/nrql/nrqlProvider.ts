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
} from "@codestream/protocols/agent";
import { escapeNrql } from "@codestream/utils/system/string";
import { CompletionItemKind } from "vscode-languageserver";
import { SessionContainer } from "../../../container";
import { Logger } from "../../../logger";
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
		let accountId;
		if (request.accountId) {
			accountId = request.accountId;
		} else {
			const entityGuid = request.entityGuid;
			if (entityGuid) {
				accountId = parseId(entityGuid)!.accountId;
			}
		}
		if (!accountId) {
			throw new Error("Missing accountId or entityGuid");
		}

		try {
			const query = escapeNrql(request.query).trim();
			const results = await this.graphqlClient.runNrql<any>(accountId, query, 400);

			return {
				results,
				accountId,
				resultsTypeGuess: this.getResultsType(query, results),
			};
		} catch (ex) {
			ContextLogger.warn("executeNRQL failure", {
				request,
				error: ex,
			});
			return { error: mapNRErrorResponse(ex), accountId, resultsTypeGuess: "table" };
		}
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
					queryHistory: {
						nrql: {
							query: string;
							accountIds: Number[];
							createdAt: string;
						}[];
					};
				};
			}>(`{
  actor {
    queryHistory {
      nrql(options: {limit: 10}) {
        query
		accountIds
        createdAt
      }
    }
  }
}`);

			if (response) {
				return { items: response.actor.queryHistory.nrql };
			}
		} catch (ex) {
			Logger.warn(`Failed to fetchRecentQueries for user`, { error: ex });
		}
		return { items: [] };
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
		if (!results || !results.length) return "table";

		if (results.length === 1) {
			const value = results[0];
			if (typeof value === "object" && value != null && !Array.isArray(value)) {
				return Object.keys(value).length === 1 && !Array.isArray(value[Object.keys(value)[0]])
					? "billboard"
					: "json";
			} else {
				return "billboard";
			}
		}

		query = query.toUpperCase();
		if (query.indexOf("TIMESERIES") > -1) {
			const dataKeys = Object.keys(results[0] || {}).filter(
				_ => _ !== "beginTimeSeconds" && _ !== "endTimeSeconds"
			);

			if (dataKeys.length > 1) {
				return "json";
			}
			// complex timeseries data
			if (Array.isArray(results[0][dataKeys[0]])) {
				return "json";
			}
			// easy timeseries data like a TIMESERIES of a count
			return "line";
		}
		if (query.indexOf("FACET") > -1) {
			return "json"; // should be "bar"??
		}
		return "table";
	}
}
