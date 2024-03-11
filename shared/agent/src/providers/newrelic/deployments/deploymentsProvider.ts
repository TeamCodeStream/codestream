import {
	GetDeploymentsRequest,
	GetDeploymentsRequestType,
	GetDeploymentsResponse,
	GetLatestDeploymentRequest,
	GetLatestDeploymentResponse,
	DeploymentDiff,
} from "@codestream/protocols/agent";
import { Logger } from "../../../logger";
import { log } from "../../../system/decorators/log";
import { lsp, lspHandler } from "../../../system/decorators/lsp";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import { NrApiConfig } from "../nrApiConfig";
import { parseId } from "../utils";

@lsp
export class DeploymentsProvider {
	constructor(
		private graphqlClient: NewRelicGraphqlClient,
		private nrApiConfig: NrApiConfig
	) {}

	@log()
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
	@log()
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

	async getDeploymentDiff(
		entityGuid: string,
		accountId?: number
	): Promise<DeploymentDiff | undefined> {
		if (!entityGuid && !accountId) {
			return undefined;
		}

		try {
			const countQuery = [
				"SELECT",
				"latest(deploymentId) AS 'deploymentId',",
				"latest(timestamp) AS 'timestamp'",
				"FROM Deployment",
				`WHERE entity.guid = '${entityGuid}'`,
				"SINCE 13 months ago",
			].join(" ");

			const countResponse = await this.graphqlClient.query<{
				actor: {
					account: {
						nrql: {
							results: {
								deploymentId: string;
								timestamp: number;
							}[];
						};
					};
					entity: {
						permalink: string;
					};
				};
			}>(
				`query fetchErrorRate($accountId:Int!, $entityGuid:EntityGuid!) {
				actor {
					account(id: $accountId) {
						nrql(
							options: { eventNamespaces: "Marker" }
							query: "${countQuery}"
						) { nrql results }
					}
					entity(guid: $entityGuid) {
						permalink
					}
				}
			}`,
				{
					accountId: accountId,
					entityGuid: entityGuid,
				}
			);

			const countResults = countResponse.actor.account.nrql?.results[0];

			const { deploymentId, timestamp } = countResults;

			if (!deploymentId || !timestamp) return undefined;

			const threeHoursLater = timestamp + 10800000;

			const comparisonQuery = [
				"FROM Metric",
				"SELECT",
				"average(newrelic.goldenmetrics.apm.application.responseTimeMs) AS 'responseTimeMs',",
				"average(newrelic.goldenmetrics.apm.application.errorRate) AS 'errorRate'",
				`WHERE entity.guid = '${entityGuid}'`,
				`SINCE ${timestamp} UNTIL ${threeHoursLater}`,
				`COMPARE WITH 3 hours ago`,
			].join(" ");

			const comparisonQueryData = await this.graphqlClient.query<{
				actor: {
					account: {
						nrql: {
							results: {
								beginTimeSeconds: number;
								endTimeSeconds: number;
								responseTimeMs: number;
								errorRate: number;
							}[];
						};
					};
				};
			}>(
				`query fetchErrorRate($accountId:Int!) {
					actor {
						account(id: $accountId) {
							nrql(
								
								query: "${comparisonQuery}"
							) { nrql results }
						}
					}
				}`,
				{
					accountId: accountId,
				}
			);

			const currentMetrics = comparisonQueryData.actor.account.nrql?.results[0];
			const previousMetrics = comparisonQueryData.actor.account.nrql?.results[1];

			if (!currentMetrics || !previousMetrics) return undefined;

			const errorRatePercentageChange =
				previousMetrics.errorRate > 0
					? Math.round(
							((currentMetrics.errorRate - previousMetrics.errorRate) / previousMetrics.errorRate) *
								100
					  )
					: undefined;
			const responseTimePercentageChange =
				previousMetrics.responseTimeMs > 0
					? Math.round(
							((currentMetrics.responseTimeMs - previousMetrics.responseTimeMs) /
								previousMetrics.responseTimeMs) *
								100
					  )
					: undefined;

			const permalinkUrl = this.getDeploymentMarkersUrl(entityGuid);
			return {
				errorRateData: {
					percentChange:
						errorRatePercentageChange && errorRatePercentageChange >= 0
							? errorRatePercentageChange
							: undefined,
					permalinkUrl: permalinkUrl,
				},
				responseTimeData: {
					percentChange:
						responseTimePercentageChange && responseTimePercentageChange >= 0
							? responseTimePercentageChange
							: undefined,
					permalinkUrl: permalinkUrl,
				},
			};
		} catch (err) {
			Logger.error(err, entityGuid);
		}

		return undefined;
	}

	private getDeploymentMarkersUrl(entityGuid: string) {
		let bUrl = "";

		if (this.nrApiConfig.productUrl.includes("staging")) {
			// Staging
			bUrl = "https://staging-one.newrelic.com";
		} else if (this.nrApiConfig.productUrl.includes("eu")) {
			// EU
			bUrl = "https://one.eu.newrelic.com";
		} else {
			// Prod:
			bUrl = "https://one.newrelic.com";
		}

		return `${bUrl}/nr1-core/deployment-markers/list/${entityGuid}`;
	}
}
