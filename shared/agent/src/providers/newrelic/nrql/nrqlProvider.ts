import { lsp, lspHandler } from "../../../system/decorators/lsp";
import {
	GetNRQLRequest,
	GetNRQLRequestType,
	GetNRQLResponse,
	LogResult,
} from "@codestream/protocols/agent";
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
		const entityGuid = request.entityGuid;
		const accountId = parseId(entityGuid)!.accountId;

		try {
			const query = escapeNrql(request.query);
			const results = await this.graphqlClient.runNrql<LogResult>(accountId, query, 400);

			return {
				results,
				accountId,
			};
		} catch (ex) {
			ContextLogger.warn("executeNRQL failure", {
				request,
				error: ex,
			});
			return { error: mapNRErrorResponse(ex), accountId };
		}
	}
}
