import { lsp, lspHandler } from "../../../system/decorators/lsp";
import {
	GetDeploymentsRequest,
	GetDeploymentsRequestType,
	GetDeploymentsResponse, GetLatestDeploymentRequest, GetLatestDeploymentResponse
} from "@codestream/protocols/agent";
import { log } from "../../../system/decorators/log";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import { parseId } from "../utils";

@lsp
export class DeploymentsProvider {
	constructor(private graphqlClient: NewRelicGraphqlClient) {}

	@log({ timed: true })
	public async getLatestDeployment(
		request: GetLatestDeploymentRequest
	): Promise<GetLatestDeploymentResponse | undefined> {
		const { entityGuid } = request;
		const parsedId = parseId(entityGuid)!;
		const query = `SELECT timestamp, commit, entity.name FROM Deployment WHERE entity.guid='${entityGuid}' AND timestamp = (SELECT latest(timestamp) from Deployment WHERE entity.guid='${entityGuid}') SINCE 1 year ago`;
		const result = await this.graphqlClient.runNrql<{
			timestamp: number;
			version: string;
			commit: string;
		}>(parsedId.accountId, query, 400);

		const deployments = result.map(_ => ({
			seconds: Math.round(_.timestamp / 1000),
			version: _.version,
			commit: _.commit,
		}));
		if (deployments.length === 0) {
			return undefined;
		}
		return {
			deployment: deployments[0],
		};
	}

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
			commit: string;
		}>(parsedId.accountId, query, 400);

		const deployments = result.map(_ => ({
			seconds: Math.round(_.timestamp / 1000),
			version: _.version,
			commit: _.commit,
		}));
		return {
			deployments,
		};
	}
}
