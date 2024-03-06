import {
	ERROR_SLT_MISSING_ENTITY,
	ERROR_SLT_MISSING_OBSERVABILITY_REPOS,
	EntityAccount,
	EntityGoldenMetrics,
	EntityGoldenMetricsQueries,
	EntityGoldenMetricsResults,
	GetIssuesQueryResult,
	GetIssuesResponse,
	GetServiceLevelTelemetryRequest,
	GetServiceLevelTelemetryRequestType,
	GetServiceLevelTelemetryResponse,
	GoldenMetric,
	GoldenMetricUnitMappings,
	GoldenMetricsQueries,
	MethodGoldenMetrics,
	MethodLevelGoldenMetricQueryResult,
	MetricTimesliceNameMapping,
	NRErrorResponse,
	ObservabilityRepo,
} from "@codestream/protocols/agent";
import { CSMe } from "@codestream/protocols/api";
import { uniqBy as _uniqBy } from "lodash";
import { ResponseError } from "vscode-jsonrpc/lib/messages";
import { Logger } from "../../../logger";
import { log } from "../../../system/decorators/log";
import { lsp, lspHandler } from "../../../system/decorators/lsp";
import { ContextLogger } from "../../contextLogger";
import { DeploymentsProvider } from "../deployments/deploymentsProvider";
import { NewRelicGraphqlClient, escapeNrql } from "../newRelicGraphqlClient";
import { NrApiConfig } from "../nrApiConfig";
import { NrqlQueryBuilder } from "../nrql/nrqlQueryBuilder";
import { ReposProvider } from "../repos/reposProvider";
import { mapNRErrorResponse, parseId, toFixedNoRounding } from "../utils";

@lsp
export class GoldenSignalsProvider {
	constructor(
		private graphqlClient: NewRelicGraphqlClient,
		private reposProvider: ReposProvider,
		private nrApiConfig: NrApiConfig,
		private deploymentsProvider: DeploymentsProvider
	) {}

	@lspHandler(GetServiceLevelTelemetryRequestType)
	@log()
	async getServiceLevelTelemetry(
		request: GetServiceLevelTelemetryRequest
	): Promise<GetServiceLevelTelemetryResponse | undefined> {
		const { force } = request;
		const observabilityRepo = await this.reposProvider.getObservabilityEntityRepos(
			request.repoId,
			request.skipRepoFetch === true,
			force
		);
		if (!request.skipRepoFetch && (!observabilityRepo || !observabilityRepo.entityAccounts)) {
			throw new ResponseError(ERROR_SLT_MISSING_OBSERVABILITY_REPOS, "No observabilityRepos");
		}

		const entity = observabilityRepo?.entityAccounts.find(
			_ => _.entityGuid === request.newRelicEntityGuid
		);
		if (!request.skipRepoFetch && !entity) {
			ContextLogger.warn("Missing entity", {
				entityId: request.newRelicEntityGuid,
			});
			throw new ResponseError(ERROR_SLT_MISSING_ENTITY, "Missing entity");
		}
		let recentIssuesResponse;

		if (request.fetchRecentIssues) {
			const accountId = parseId(request.newRelicEntityGuid)?.accountId;

			if (accountId) {
				recentIssuesResponse = await this.getIssues(accountId!, request.newRelicEntityGuid);
			}

			const validEntityGuid: string = entity?.entityGuid ?? request.newRelicEntityGuid;

			const entityGoldenMetrics = await this.getEntityLevelGoldenMetrics(
				validEntityGuid,
				accountId
			);

			const response = {
				entityGoldenMetrics: entityGoldenMetrics,
				newRelicEntityAccounts: observabilityRepo?.entityAccounts ?? [],
				newRelicAlertSeverity: entity?.alertSeverity,
				newRelicEntityName: entity?.entityName,
				newRelicEntityGuid: validEntityGuid,
				newRelicUrl: `${this.nrApiConfig.productUrl}/redirect/entity/${validEntityGuid}`,
				recentIssues: recentIssuesResponse,
			};
			return response;
		}
		return undefined;
	}

	async getIssues(
		accountId: number,
		entityGuid: string
	): Promise<GetIssuesResponse | NRErrorResponse | undefined> {
		try {
			const response = await this.graphqlClient.query<GetIssuesQueryResult>(
				`query getRecentIssues($id: id!, $entityGuids: [EntityGuid!]) {
					actor {
						account(id: $id) {
						  aiIssues {
							issues(filter: {entityGuids: $entityGuids, states: ACTIVATED}) {
							  issues {
								title
								deepLinkUrl
								closedAt
								updatedAt
								createdAt
								priority
								issueId
							  }
							}
						  }
						}
					  }
				  }				  
				`,
				{
					id: accountId,
					entityGuids: entityGuid,
				}
			);

			if (response?.actor?.account?.aiIssues?.issues?.issues?.length) {
				const issueArray = response.actor.account.aiIssues.issues.issues;
				const recentIssuesArray = issueArray.filter(
					_ => _.closedAt === null || _.closedAt === undefined
				);

				const ALERT_SEVERITY_SORTING_ORDER: string[] = ["", "CRITICAL", "HIGH", "MEDIUM", "LOW"];

				// get unique labels
				recentIssuesArray.forEach(issue => {
					const firstTitle = issue.title![0]; //this gives me the first title
					issue.title = firstTitle;
					issue.url = this.issueUrl(accountId, issue.issueId!);
				});

				const recentIssuesArrayUnique = _uniqBy(recentIssuesArray, "title");

				// sort based on openedAt time
				recentIssuesArrayUnique!.sort((a, b) =>
					a.createdAt! > b.createdAt! ? 1 : b.createdAt! > a.createdAt! ? -1 : 0
				);

				// sort based on alert serverity defined in ALERT_SEVERITY_SORTING_ORDER
				const recentIssuesArraySorted = this.mapOrder(
					recentIssuesArrayUnique,
					ALERT_SEVERITY_SORTING_ORDER,
					"priority"
				);

				// take top 2
				const topTwoRecentIssues = recentIssuesArraySorted.slice(0, 2);

				const recentIssues = topTwoRecentIssues;

				return { recentIssues };
			}

			return undefined;
		} catch (ex) {
			ContextLogger.warn("getIssues failure", {
				accountId: accountId,
				error: ex,
			});
			const accessTokenError = ex as {
				message: string;
				innerError?: { message: string };
				isAccessTokenError: boolean;
			};
			if (accessTokenError && accessTokenError.innerError && accessTokenError.isAccessTokenError) {
				throw new Error(accessTokenError.message);
			}
			return mapNRErrorResponse(ex);
		}
	}

	private issueUrl(accountId: number, issueId: string) {
		let bUrl = "";

		if (this.nrApiConfig.productUrl.includes("staging")) {
			// Staging: https://radar-api.staging-service.newrelic.com
			bUrl = "https://radar-api.staging-service.newrelic.com";
		} else if (this.nrApiConfig.productUrl.includes("eu")) {
			// EU: https://radar-api.service.eu.newrelic.com
			bUrl = "https://radar-api.service.eu.newrelic.com";
		} else {
			// Prod: https://radar-api.service.newrelic.com
			bUrl = "https://radar-api.service.newrelic.com";
		}

		return `${bUrl}/accounts/${accountId}/issues/${issueId}?notifierType=codestream`;
	}

	// Map array of objects based on order of array of strings
	// @TODO: might be worth creating a agent/src/providers/newrelic/utils.tsx file
	// for some of these private functions
	private mapOrder(array: any = [], order: string[] = [], key: string = "") {
		if (array.length > 0 && order.length > 0 && key) {
			array.sort(function (a: any, b: any) {
				return order.indexOf(a[key]) > order.indexOf(b[key]) ? 1 : -1;
			});
		}

		return array;
	}
	private async getMethodLevelGoldenMetricQueries(
		entityGuid: string,
		metricTimesliceNameMapping?: MetricTimesliceNameMapping,
		scope?: string
	): Promise<MethodLevelGoldenMetricQueryResult | undefined> {
		if (!metricTimesliceNameMapping) {
			return undefined;
		}

		const scopeClause = scope ? `AND scope = '${scope}'` : "";

		return {
			metricQueries: [
				// error
				{
					metricQuery: `SELECT rate(count(apm.service.transaction.error.count), 1 minute) AS 'Errors (per minute)'
												FROM Metric
                  WHERE \`entity.guid\` = '${entityGuid}'
										${scopeClause}
                    AND metricTimesliceName = '${metricTimesliceNameMapping["errorRate"]}' FACET metricTimesliceName TIMESERIES`,
					spanQuery: `SELECT rate(count(*), 1 minute) AS 'Errors (per minute)'
                               FROM Span
                               WHERE entity.guid IN ('${entityGuid}')
                                 AND name = '${metricTimesliceNameMapping["errorRate"]}'
                                 AND \`error.group.guid\` IS NOT NULL FACET name TIMESERIES`,
					scopesQuery: `SELECT rate(count(apm.service.transaction.error.count), 1 minute) AS value
												FROM Metric
												WHERE \`entity.guid\` = '${entityGuid}'
													${scopeClause}
                    		AND metricTimesliceName = '${metricTimesliceNameMapping["errorRate"]}' FACET scope as name`,
					title: "Errors (per minute)",
					name: "errorsPerMinute",
				},
				// duration
				{
					metricQuery: `SELECT average(newrelic.timeslice.value) * 1000 AS 'Average duration (ms)'
												FROM Metric
                  WHERE entity.guid IN ('${entityGuid}')
										${scopeClause}
                    AND metricTimesliceName = '${metricTimesliceNameMapping["duration"]}' TIMESERIES`,
					spanQuery: `SELECT average(duration) * 1000 AS 'Average duration (ms)'
                               FROM Span
                               WHERE entity.guid IN ('${entityGuid}')
                                 AND name = '${metricTimesliceNameMapping["duration"]}' FACET name TIMESERIES`,
					scopesQuery: `SELECT average(newrelic.timeslice.value) * 1000 AS value
												FROM Metric
                  			WHERE entity.guid IN ('${entityGuid}')
												${scopeClause}
                    		AND metricTimesliceName = '${metricTimesliceNameMapping["duration"]}' FACET scope as name`,
					title: "Average duration (ms)",
					name: "responseTimeMs",
				},
				// samples
				{
					metricQuery: `SELECT rate(count(newrelic.timeslice.value), 1 minute) AS 'Samples (per minute)'
												FROM Metric
                  WHERE entity.guid IN ('${entityGuid}')
                    AND metricTimesliceName = '${metricTimesliceNameMapping["sampleSize"]}' TIMESERIES`,
					spanQuery: `SELECT rate(count(*), 1 minute) AS 'Samples (per minute)'
                               FROM Span
                               WHERE entity.guid IN ('${entityGuid}')
                                 AND name = '${metricTimesliceNameMapping["sampleSize"]}' FACET name TIMESERIES`,
					scopesQuery: `SELECT rate(count(newrelic.timeslice.value), 1 minute) AS value
												FROM Metric
                  			WHERE entity.guid IN ('${entityGuid}')
												${scopeClause}
                    		AND metricTimesliceName = '${metricTimesliceNameMapping["sampleSize"]}' FACET scope as name`,
					title: "Samples (per minute)",
					name: "samplesPerMinute",
				},
			],
		};
	}

	async getMethodLevelGoldenMetrics(
		entityGuid: string,
		metricTimesliceNames?: MetricTimesliceNameMapping,
		since?: string,
		timeseriesGroup?: string,
		scope?: string
	): Promise<MethodGoldenMetrics[] | undefined> {
		const queries = await this.getMethodLevelGoldenMetricQueries(
			entityGuid,
			metricTimesliceNames,
			scope
		);

		if (!queries?.metricQueries) {
			Logger.log("getMethodLevelGoldenMetrics no response", {
				entityGuid,
			});
			return undefined;
		}

		Logger.log("getMethodLevelGoldenMetrics has goldenMetrics", {
			entityGuid,
		});

		const parsedId = parseId(entityGuid)!;
		const useSpan = metricTimesliceNames?.source === "span";

		const results = await Promise.all(
			queries.metricQueries.map(_ => {
				let _query = useSpan ? _.spanQuery : _.metricQuery;
				_query = _query?.replace(/\n/g, "");

				// if no metricTimesliceNames, then we don't need TIMESERIES in query
				if (!metricTimesliceNames) {
					_query = _query?.replace(/TIMESERIES/, "");
				}

				if (timeseriesGroup) {
					_query = _query?.replace(/TIMESERIES/, `TIMESERIES ${timeseriesGroup}`);
				}

				if (since) {
					_query = `${_query} SINCE ${since}`;
				}

				const q = `query getMetric($accountId: Int!) {
					actor {
					  account(id: $accountId) {
							nrql(query: "${escapeNrql(_query || "")}", timeout: 60) {
								results
								metadata {
									timeWindow {
										end
									}
								}
							}
					  }
					}
				}`;
				return this.graphqlClient
					.query(q, {
						accountId: parsedId.accountId,
					})
					.catch(ex => {
						Logger.warn(ex);
					});
			})
		);

		const scopes = await Promise.all(
			queries.metricQueries.map(_ => {
				let _query = _.scopesQuery;
				_query = _query?.replace(/\n/g, "");

				if (since) {
					_query = `${_query} SINCE ${since}`;
				}

				const q = `query getMetric($accountId: Int!) {
					actor {
					  account(id: $accountId) {
							nrql(query: "${escapeNrql(_query || "")}", timeout: 60) {
								results
								metadata {
									timeWindow {
										end
									}
								}
							}
					  }
					}
				}`;
				return this.graphqlClient
					.query(q, {
						accountId: parsedId.accountId,
					})
					.catch(ex => {
						Logger.warn(ex);
					});
			})
		);

		const response = queries.metricQueries.map((_, i) => {
			const nrql = results[i].actor.account.nrql;
			const scopesNrql = scopes[i].actor.account.nrql;
			return {
				..._,
				scopes: scopesNrql.results,
				result: nrql.results.map((r: any) => {
					const ms = r.endTimeSeconds * 1000;
					const date = new Date(ms);

					return {
						...r,
						["Average duration (ms)"]: r["Average duration (ms)"]
							? r["Average duration (ms)"].toFixed(2)
							: null,
						["Samples (per minute)"]: r["Samples (per minute)"]
							? r["Samples (per minute)"].toFixed(2)
							: null,
						["Errors (per minute)"]: r["Errors (per minute)"]
							? r["Errors (per minute)"].toFixed(2)
							: null,
						endDate: date,
					};
				}),
				timeWindow: nrql.metadata?.timeWindow?.end,
			};
		});

		Logger.log("getMethodLevelGoldenMetrics has response?", {
			entityGuid,
			responseLength: response?.length,
		});

		return response;
	}

	async getEntityLevelGoldenMetrics(
		entityGuid: string,
		accountId?: number
	): Promise<EntityGoldenMetrics | NRErrorResponse | undefined> {
		try {
			const entityGoldenMetricsQuery = `
				{
				  actor {
					entity(guid: "${entityGuid}") {
					  goldenMetrics {
						metrics {
						  title
						  name
						  unit
						  definition {
							from
							where
							select
						  }
						}
					  }
					}
				  }
				}
			`;

			const entityGoldenMetricsQueryResults =
				await this.graphqlClient.query<EntityGoldenMetricsQueries>(entityGoldenMetricsQuery);
			const metricDefinitions =
				entityGoldenMetricsQueryResults?.actor?.entity?.goldenMetrics?.metrics;

			if (!metricDefinitions || metricDefinitions.length === 0) {
				Logger.warn("getEntityGoldenMetrics no metricDefinitions", {
					entityGuid,
					response: JSON.stringify(entityGoldenMetricsQueryResults),
				});
				return undefined;
			}

			const since = "30 MINUTES";
			const queries: {
				[key: string]: GoldenMetricsQueries;
			} = {};

			const createMetricQuery = (md: GoldenMetric) => {
				const nrqlQueryBuilder = new NrqlQueryBuilder()
					.select(`${md.definition.select} AS 'result'`)
					.from(md.definition.from)
					.where(md.definition.where)
					.since(since);

				const defaultQuery = nrqlQueryBuilder.build();

				const timeseriesQuery = nrqlQueryBuilder
					.and(`entity.guid='${entityGuid}'`)
					.timeseries()
					.build()
					.replace(/(FROM|WHERE|AND|FACET|SINCE|TIMESERIES)/g, "\n$1");

				queries[md.name] = {
					timeseries: timeseriesQuery,
					default: defaultQuery,
				};

				return `${md.name}: nrdbQuery(nrql: "${defaultQuery}", timeout: 60, async: true) { results }`;
			};

			const queryTemplate = `
{
  actor {
    entity(guid: "${entityGuid}") {
      ${metricDefinitions.map(createMetricQuery).join("\n")}
    }
  }
}
`;

			const entityGoldenMetricsResults = await this.graphqlClient.query<EntityGoldenMetricsResults>(
				queryTemplate
			);
			const metricResults = entityGoldenMetricsResults?.actor?.entity;

			const metrics = metricDefinitions.map(md => {
				const metricResult = metricResults[md.name]?.results?.[0]?.result;

				let metricValue: number = NaN;

				if (metricResult !== null && metricResult !== undefined) {
					if (typeof metricResult === "number") {
						// PERCENTAGE values are given as a decimal, IE 0.5 for 50%
						// For the purposes of entity level golden metrics, we
						// want this converted to the % value, not decimal value.
						if (md.unit === "PERCENTAGE") {
							metricValue = metricResult * 100;
						} else {
							metricValue = metricResult;
						}
					}

					if (typeof metricResult === "object") {
						const keys = Object.keys(metricResult);
						metricValue = metricResult[keys[0]];
					}
				}

				// Given a title like "Throughput (ppm)", remove the "(ppm)" part only
				// Given a title like "First input delay (75 percentile) (ms)", remove the "(ms)" part only
				const title = md.title.replace(/\(.{1,3}?\)/, "").trim();

				return {
					name: md.name,
					title: title,
					unit: md.unit,
					displayUnit: GoldenMetricUnitMappings[md.unit],
					value: metricValue,
					displayValue: toFixedNoRounding(metricValue, 2) ?? "Unknown",
					queries: queries[md.name],
				};
			});

			const pillsData = await this.deploymentsProvider.getDeploymentDiff(entityGuid, accountId);

			return {
				lastUpdated: new Date().toLocaleString(),
				since: since.toLowerCase().replace("minutes", "min"),
				metrics: metrics,
				pillsData: pillsData,
			};
		} catch (ex) {
			Logger.warn("getEntityGoldenMetrics no response", {
				entityGuid,
				error: ex,
			});
			return mapNRErrorResponse(ex);
		}
	}

	getGoldenSignalsEntity(
		codestreamUser: CSMe,
		observabilityRepo: ObservabilityRepo
	): EntityAccount {
		let entity: EntityAccount | undefined;
		if (observabilityRepo.entityAccounts.length > 1) {
			try {
				// first, to get from preferences
				if (codestreamUser.preferences) {
					const observabilityRepoEntities =
						codestreamUser.preferences.observabilityRepoEntities || [];
					const methodLevelTelemetryRepoEntity = observabilityRepoEntities.find(
						_ => _.repoId === observabilityRepo.repoId
					);
					if (methodLevelTelemetryRepoEntity?.entityGuid) {
						const foundEntity = observabilityRepo.entityAccounts.find(
							_ => _.entityGuid === methodLevelTelemetryRepoEntity.entityGuid
						);
						if (foundEntity) {
							entity = foundEntity;
						}
					}
				}
				if (!entity) {
					let done = false;
					for (const entityAccount of observabilityRepo.entityAccounts) {
						// second, try to find something production-like based on name
						if (
							["prod", "production", "Production", "PRODUCTION"].find(
								_ => entityAccount.entityName.indexOf(_) > -1
							)
						) {
							entity = entityAccount;
							done = true;
							break;
						}
						if (entityAccount.tags) {
							// third, try to find something production-like based on tags (recommended NR way)
							for (const tag of entityAccount.tags) {
								if (
									["env", "environment", "Environment"].includes(tag.key) &&
									["prod", "production", "Production", "PRODUCTION"].find(value =>
										tag.values.includes(value)
									)
								) {
									entity = entityAccount;
									done = true;
									break;
								}
							}
						}

						if (done) {
							break;
						}
					}
				}
			} catch (ex) {
				Logger.warn("getGoldenSignalsEntity warning", {
					error: ex,
				});
			}
			if (!entity) {
				Logger.warn("getGoldenSignalsEntity: More than one NR entity, selecting first", {
					entity: observabilityRepo.entityAccounts[0],
				});
				entity = observabilityRepo.entityAccounts[0];
			}
		} else {
			entity = observabilityRepo.entityAccounts[0];
		}

		Logger.log("getGoldenSignalsEntity entity found?", {
			entity,
		});

		return entity;
	}
}
