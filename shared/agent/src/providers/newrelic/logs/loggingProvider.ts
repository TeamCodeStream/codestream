import { lsp, lspHandler } from "../../../system/decorators/lsp";
import {
	EntityAccount,
	EntityTypeMap,
	GetLogFieldDefinitionsRequest,
	GetLogFieldDefinitionsRequestType,
	GetLogFieldDefinitionsResponse,
	GetLoggingEntitiesRequestType,
	GetLoggingEntitiesResponse,
	GetLoggingPartitionsRequest,
	GetLoggingPartitionsRequestType,
	GetLoggingPartitionsResponse,
	GetLogsRequest,
	GetLogsRequestType,
	GetLogsResponse,
	GetObservabilityEntitiesRequest,
	GetSurroundingLogsRequest,
	GetSurroundingLogsRequestType,
	GetSurroundingLogsResponse,
	LogFieldDefinition,
	LogResult,
	LogResultSpecialColumns,
} from "@codestream/protocols/agent";
import { log } from "../../../system/decorators/log";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import { ContextLogger } from "../../contextLogger";
import { mapNRErrorResponse } from "../utils";
import { Strings } from "../../../system";
import { LogEntityResult, LogEntitySearchResult } from "./logging.types";
import { EntityAttributeMapper } from "./entityAttributeMapper";

@lsp
export class LoggingProvider {
	entityLogAttributeMapper: EntityAttributeMapper;

	constructor(private graphqlClient: NewRelicGraphqlClient) {
		this.entityLogAttributeMapper = new EntityAttributeMapper();
	}

	/**
	 * Escapes slashes and single quotes (in that order)
	 *
	 * Escape one slash (which needs escaped in this chain) for multiple (GraphQL and NRDB)
	 * Then escape single quotes
	 *
	 * @param searchTerm string
	 * @returns an escaped version of the searchTerm for use in allColumnSearch('<here>')
	 */
	private escapeSearchTerm(searchTerm: string): string {
		return searchTerm.replace("\\", "\\\\\\\\").replace("'", "\\'");
	}

	@lspHandler(GetLoggingPartitionsRequestType)
	@log()
	async getLoggingPartitions(
		request: GetLoggingPartitionsRequest
	): Promise<GetLoggingPartitionsResponse> {
		const { accountId } = { ...request };

		try {
			const query = `query LogDataPartitionRules($accountId: Int!) {
				actor {
				  account(id: $accountId) {
					logConfigurations {
					  dataPartitionRules {
						deleted
						enabled
						targetDataPartition
					  }
					}
				  }
				}
			  }`;

			const queryResults = await this.graphqlClient.query<{
				actor: {
					account: {
						logConfigurations: {
							dataPartitionRules: {
								deleted: boolean;
								enabled: boolean;
								targetDataPartition: string;
							}[];
						};
					};
				};
			}>(query, { accountId });

			const partitions = queryResults.actor.account.logConfigurations.dataPartitionRules
				.filter(dpr => dpr.enabled && !dpr.deleted)
				.map(dpr => dpr.targetDataPartition)
				.sort();

			return {
				partitions,
			};
		} catch (ex) {
			ContextLogger.warn("getLoggingPartitions failure", {
				request,
				error: ex,
			});
			return { error: mapNRErrorResponse(ex) };
		}
	}

	@lspHandler(GetLoggingEntitiesRequestType)
	@log()
	async getLoggingEntities(
		request: GetObservabilityEntitiesRequest
	): Promise<GetLoggingEntitiesResponse> {
		const { limit = 50 } = request;
		try {
			const query = `query search($cursor:String){
				actor {
				  entitySearch(query: "name LIKE '%${Strings.sanitizeGraphqlValue(
						request.searchCharacters
					)}%' AND (type IN ('APPLICATION', 'CONTAINER', 'HOST', 'SERVICE', 'AWSLAMBDAFUNCTION', 'SWITCH', 'ROUTER', 'KUBERNETESCLUSTER', 'KUBERNETES_POD') OR type LIKE 'AZURE%')",
				  sortByWithDirection: { attribute: NAME, direction: ASC },
				  options: { limit: ${limit} }) {
					count
					results(cursor:$cursor) {
					  nextCursor
					  entities {
						guid
						name
						entityType
						type
						tags {
							key
							values
						}
						account {
							name
							id
						}
					  }
					}
				  }
			  }
			}`;

			const response: LogEntitySearchResult = await this.graphqlClient.query<LogEntitySearchResult>(
				query,
				{
					cursor: request.nextCursor ?? null,
				}
			);

			const entities: EntityAccount[] = response.actor.entitySearch.results.entities.map(
				(ea: LogEntityResult) => {
					return {
						entityGuid: ea.guid,
						entityName: ea.name,
						entityType: ea.entityType,
						tags: ea.tags,
						accountId: ea.account.id,
						accountName: ea.account.name,
						type: ea.type,
						entityTypeDescription: EntityTypeMap[ea.entityType],
					};
				}
			);

			return {
				totalResults: response.actor.entitySearch.count,
				entities,
				nextCursor: response.actor.entitySearch.results.nextCursor,
			};
		} catch (ex) {
			ContextLogger.error(ex, "getLoggingEntities");
			throw ex;
		}
	}

	private readonly possibleSeverityAttributes = [
		`log_severity`,
		`level`,
		`log.level`,
		`loglevel`,
		`log_level`,
		`level_name`,
	];

	@lspHandler(GetLogsRequestType)
	@log()
	public async getLogs(request: GetLogsRequest): Promise<GetLogsResponse> {
		const accountId = request.entity.accountId;
		const traceId = request.traceId;

		try {
			const { since, limit, order, filterText, partitions } = {
				...request,
			};

			const entityWhere = this.entityLogAttributeMapper.getWhereClauseForEntity(request.entity);
			let queryWhere = `WHERE ${entityWhere}`;
			const querySince = `SINCE ${since}`;
			const queryOrder = `ORDER BY ${order.field} ${order.direction}`;
			const queryLimit = `LIMIT ${limit}`;
			const queryFrom = `FROM ${partitions.join(",")}`;

			//filtering is optional
			var searchTerms = filterText
				?.trim()
				?.split(" ")
				?.filter(f => {
					return f;
				})
				?.map(f => {
					return f.trim();
				});

			if (searchTerms) {
				const termCount = searchTerms.length;

				// two or less, we can use ACS
				if (termCount >= 1 && termCount <= 2) {
					searchTerms.map(st => {
						queryWhere += ` AND allColumnSearch('${this.escapeSearchTerm(st)}', insensitive: true)`;
					});
				}

				// three or more, and we can only use message
				if (termCount >= 3) {
					searchTerms.map(st => {
						queryWhere += ` AND message LIKE '%${this.escapeSearchTerm(st)}%'`;
					});
				}
			}

			if (traceId) {
				queryWhere += ` AND trace.id = '${traceId}`;
			}

			const query = `SELECT * ${queryFrom} ${queryWhere} ${querySince} ${queryOrder} ${queryLimit}`;

			ContextLogger.log(`getLogs query: ${query}`);

			const logs = await this.graphqlClient.runAsyncNrql<LogResult>(accountId, query);

			logs.map(lr => {
				const myKeys = Object.keys(lr);

				const json = JSON.stringify(lr);
				lr[LogResultSpecialColumns.summary] = json;

				if (myKeys.includes("message")) {
					lr[LogResultSpecialColumns.message] = "message";
				} else {
					lr[LogResultSpecialColumns.message] = "log_summary";
				}

				for (let psa of this.possibleSeverityAttributes) {
					if (myKeys.includes(psa) && typeof lr[psa] === "string") {
						lr[LogResultSpecialColumns.severity] = psa;
					}
				}
			});

			return {
				logs,
				accountId,
			};
		} catch (ex) {
			ContextLogger.warn("getLogs failure", {
				request,
				error: ex,
			});
			return { error: mapNRErrorResponse(ex), accountId };
		}
	}

	@lspHandler(GetSurroundingLogsRequestType)
	@log()
	public async getSurroundingLogs(
		request: GetSurroundingLogsRequest
	): Promise<GetSurroundingLogsResponse> {
		try {
			const { entity, since, messageId } = {
				...request,
			};

			const accountId = entity.accountId;

			const ONE_SECOND = 1000;
			const ONE_MINUTE = ONE_SECOND * 60;
			const TEN_MINUTES = ONE_MINUTE * 10;

			const beforeTime = since - TEN_MINUTES;
			const afterTime = since + TEN_MINUTES;

			const entityWhere = this.entityLogAttributeMapper.getWhereClauseForEntity(entity);
			const queryWhere = `WHERE ${entityWhere} AND messageId != '${messageId}'`;
			const queryOrder = `ORDER BY timestamp ASC`;

			const beforeQuerySince = `SINCE ${beforeTime}`;
			const beforeQueryUntil = `UNTIL ${since}`;
			const beforeQuery = `SELECT * FROM Log ${queryWhere} ${beforeQuerySince} ${beforeQueryUntil} ${queryOrder}`;

			const afterQuerySince = `SINCE ${since}`;
			const afterQueryUntil = `UNTIL ${afterTime}`;
			const afterQuery = `SELECT * FROM Log ${queryWhere} ${afterQuerySince} ${afterQueryUntil} ${queryOrder}`;

			ContextLogger.log(`getSurroundingLogs beforeQuery: ${beforeQuery}`);
			ContextLogger.log(`getSurroundingLogs afterQuery: ${afterQuery}`);

			const beforeLogs = await this.graphqlClient.runNrql<LogResult>(accountId, beforeQuery, 400);
			const afterLogs = await this.graphqlClient.runNrql<LogResult>(accountId, afterQuery, 400);

			beforeLogs.map(lr => {
				const myKeys = Object.keys(lr);

				const json = JSON.stringify(lr);
				lr[LogResultSpecialColumns.summary] = json;

				if (myKeys.includes("message")) {
					lr[LogResultSpecialColumns.message] = "message";
				} else {
					lr[LogResultSpecialColumns.message] = "log_summary";
				}

				for (let psa of this.possibleSeverityAttributes) {
					if (myKeys.includes(psa) && typeof lr[psa] === "string") {
						lr[LogResultSpecialColumns.severity] = psa;
					}
				}
			});

			afterLogs.map(lr => {
				const myKeys = Object.keys(lr);

				const json = JSON.stringify(lr);
				lr[LogResultSpecialColumns.summary] = json;

				if (myKeys.includes("message")) {
					lr[LogResultSpecialColumns.message] = "message";
				} else {
					lr[LogResultSpecialColumns.message] = "log_summary";
				}

				for (let psa of this.possibleSeverityAttributes) {
					if (myKeys.includes(psa) && typeof lr[psa] === "string") {
						lr[LogResultSpecialColumns.severity] = psa;
					}
				}
			});

			return {
				beforeLogs,
				afterLogs,
			};
		} catch (ex) {
			ContextLogger.warn("getSurroundingLogs failure", {
				request,
				error: ex,
			});
			return { error: mapNRErrorResponse(ex) };
		}
	}

	@lspHandler(GetLogFieldDefinitionsRequestType)
	@log()
	public async getLogFieldDefinitions(
		request: GetLogFieldDefinitionsRequest
	): Promise<GetLogFieldDefinitionsResponse> {
		try {
			const accountId = request.entity.accountId;
			const traceId = request.traceId;
			let queryWhere = this.entityLogAttributeMapper.getWhereClauseForEntity(request.entity);
			const query = `SELECT keyset() FROM Log WHERE ${queryWhere}`;
			if (traceId) {
				queryWhere += ` AND trace.id = '${traceId}'"`;
			}
			let logDefinitions = await this.graphqlClient.runNrql<LogFieldDefinition>(
				accountId,
				query,
				400
			);

			if (!logDefinitions || logDefinitions.length === 0) {
				ContextLogger.warn("getLogFieldDefinitions unable to query Logs for field definitions", {
					request,
				});
				return {
					error: {
						error: {
							message: "Unable to query Logs for field definitions",
							type: "NR_UNKNOWN",
						},
					},
				};
			}

			return {
				logDefinitions,
			};
		} catch (ex) {
			ContextLogger.warn("getLogFieldDefinitions failure", {
				request,
				error: ex,
			});
			return { error: mapNRErrorResponse(ex) };
		}
	}
}
