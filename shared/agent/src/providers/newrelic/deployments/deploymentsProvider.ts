import { lsp, lspHandler } from "../../../system/decorators/lsp";
import {
	GetDeploymentsRequest,
	GetDeploymentsRequestType,
	GetDeploymentsResponse,
} from "@codestream/protocols/agent";
import { log } from "../../../system/decorators/log";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import { parseId } from "../utils";

@lsp
export class DeploymentsProvider {
	constructor(private graphqlClient: NewRelicGraphqlClient) {}

	@lspHandler(GetDeploymentsRequestType)
	@log({ timed: true })
	public async getDeployments(request: GetDeploymentsRequest): Promise<GetDeploymentsResponse> {
		const { entityGuid, since } = {
			since: "30 days ago",
			...request,
		};
		const parsedId = parseId(entityGuid)!;
		const query = `SELECT timestamp, version FROM Deployment WHERE entity.guid = '${entityGuid}' SINCE ${since} ORDER BY timestamp LIMIT MAX`;
		const result = await this.graphqlClient.runNrql<{
			timestamp: number;
			version: string;
		}>(parsedId.accountId, query, 400);

		const deployments = result.map(_ => ({
			seconds: Math.round(_.timestamp / 1000),
			version: _.version,
		}));
		return {
			deployments,
		};
	}
}
