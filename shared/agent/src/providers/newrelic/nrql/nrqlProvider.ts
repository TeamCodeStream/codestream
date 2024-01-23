import { lsp, lspHandler } from "../../../system/decorators/lsp";
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
	GetNRQLRequest,
	GetNRQLRequestType,
	GetNRQLResponse,
} from "@codestream/protocols/agent";
import { log } from "../../../system/decorators/log";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import { ContextLogger } from "../../contextLogger";
import { mapNRErrorResponse, parseId } from "../utils";
import { escapeNrql } from "@codestream/utils/system/string";
import { nrqlFunctions, nrqlKeywords, nrqlOperators } from "./constants";
import { Logger } from "../../../logger";
import { SessionContainer } from "../../../container";

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
				resultsType: this.getResultsType(query, results),
			};
		} catch (ex) {
			ContextLogger.warn("executeNRQL failure", {
				request,
				error: ex,
			});
			return { error: mapNRErrorResponse(ex), accountId, resultsType: "table" };
		}
	}

	@lspHandler(GetNRQLConstantsRequestType)
	@log()
	public async getConstants(request: GetNRQLConstantsRequest): Promise<GetNRQLConstantsResponse> {
		return {
			operators: nrqlOperators,
			functions: nrqlFunctions,
			keywords: nrqlKeywords,
		};
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
			if (Object.keys(results[0]).length === 1) {
				return "billboard";
			}
		}
		query = query.toUpperCase();
		if (query.indexOf("TIMESERIES") > -1) {
			return "line";
		}
		if (query.indexOf("FACET") > -1) {
			return "json"; // should be "bar"??
		}
		return "table";
	}
}
