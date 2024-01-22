import { lsp, lspHandler } from "../../../system/decorators/lsp";
import { GetNRQLRequest, GetNRQLRequestType, GetNRQLResponse } from "@codestream/protocols/agent";
import { log } from "../../../system/decorators/log";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import { ContextLogger } from "../../contextLogger";
import { mapNRErrorResponse, parseId } from "../utils";
import { escapeNrql } from "@codestream/utils/system/string";

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

	private getResultsType(query: string, results: any[]) {
		if (!results || !results.length) return "table";

		if (results.length === 1) {
			if (Object.keys(results).length === 1) {
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
