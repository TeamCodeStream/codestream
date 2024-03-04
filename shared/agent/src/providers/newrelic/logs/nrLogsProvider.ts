import { lsp, lspHandler } from "../../../system/decorators/lsp";
import {
	EntityType,
	EntityTypeMap,
	GetLogFieldDefinitionsRequest,
	GetLogFieldDefinitionsRequestType,
	GetLogFieldDefinitionsResponse,
	GetLoggingEntitiesRequestType,
	GetLogsRequest,
	GetLogsRequestType,
	GetLogsResponse,
	GetObservabilityEntitiesRequest,
	GetObservabilityEntitiesResponse,
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
import { mapNRErrorResponse, parseId } from "../utils";
import { Strings } from "../../../system";
import { EntitySearchResult } from "../newrelic.types";

@lsp
export class NrLogsProvider {
	constructor(private graphqlClient: NewRelicGraphqlClient) {}

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

	@lspHandler(GetLoggingEntitiesRequestType)
	@log({ timed: true })
	async getLoggingEntities(
		request: GetObservabilityEntitiesRequest
	): Promise<GetObservabilityEntitiesResponse> {
		const { limit = 50 } = request;
		try {
			const query = `query search($cursor:String){
				actor {
				  entitySearch(query: "name LIKE '%${Strings.sanitizeGraphqlValue(
						request.searchCharacters
					)}%' AND domain IN ('APM', 'EXT') AND type IN ('APPLICATION', 'SERVICE')",
				  sortByWithDirection: { attribute: NAME, direction: ASC },
				  options: { limit: ${limit} }) {
					count
					results(cursor:$cursor) {
					  nextCursor
					  entities {
						guid
						name
						entityType
						account {
							name
						  }
						}
					  }
					}
				  }
			  }`;

			const response: EntitySearchResult = await this.graphqlClient.query<EntitySearchResult>(
				query,
				{
					cursor: request.nextCursor ?? null,
				}
			);
			const entities = response.actor.entitySearch.results.entities.map(
				(_: { guid: string; name: string; account: { name: string }; entityType: EntityType }) => {
					return {
						guid: _.guid,
						name: _.name,
						account: _.account.name,
						entityType: _.entityType,
						entityTypeDescription: EntityTypeMap[_.entityType],
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

	@lspHandler(GetLogsRequestType)
	@log()
	public async getLogs(request: GetLogsRequest): Promise<GetLogsResponse> {
		const entityGuid = request.entityGuid;
		const accountId = parseId(entityGuid)!.accountId;

		try {
			const { since, limit, order, filterText } = {
				...request,
			};

			let queryWhere = `WHERE entity.guid = '${entityGuid}'`;
			const querySince = `SINCE ${since}`;
			const queryOrder = `ORDER BY ${order.field} ${order.direction}`;
			const queryLimit = `LIMIT ${limit}`;

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

			const query = `SELECT * FROM Log ${queryWhere} ${querySince} ${queryOrder} ${queryLimit}`;

			ContextLogger.log(`getLogs query: ${query}`);

			const logs = await this.graphqlClient.runNrql<LogResult>(accountId, query, 400);

			const possibleSeverityAttributes: Set<string> = new Set([
				`log_severity`,
				`level`,
				`log.level`,
				`loglevel`,
				`log_level`,
			]);

			logs.map(lr => {
				const myKeys = Object.keys(lr);

				const json = JSON.stringify(lr);
				lr[LogResultSpecialColumns.summary] = json;

				if (myKeys.includes("message")) {
					lr[LogResultSpecialColumns.message] = "message";
				} else {
					lr[LogResultSpecialColumns.message] = "log_summary";
				}

				for (let psa of possibleSeverityAttributes) {
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
			const { entityGuid, since, messageId } = {
				...request,
			};

			const parsedId = parseId(entityGuid)!;

			const ONE_SECOND = 1000;
			const ONE_MINUTE = ONE_SECOND * 60;
			const TEN_MINUTES = ONE_MINUTE * 10;

			const beforeTime = since - TEN_MINUTES;
			const afterTime = since + TEN_MINUTES;

			const queryWhere = `WHERE entity.guid = '${entityGuid}' AND messageId != '${messageId}'`;
			const queryOrder = `ORDER BY timestamp ASC`;

			const beforeQuerySince = `SINCE ${beforeTime}`;
			const beforeQueryUntil = `UNTIL ${since}`;
			const beforeQuery = `SELECT * FROM Log ${queryWhere} ${beforeQuerySince} ${beforeQueryUntil} ${queryOrder}`;

			const afterQuerySince = `SINCE ${since}`;
			const afterQueryUntil = `UNTIL ${afterTime}`;
			const afterQuery = `SELECT * FROM Log ${queryWhere} ${afterQuerySince} ${afterQueryUntil} ${queryOrder}`;

			ContextLogger.log(`getSurroundingLogs beforeQuery: ${beforeQuery}`);
			ContextLogger.log(`getSurroundingLogs afterQuery: ${afterQuery}`);

			const beforeLogs = await this.graphqlClient.runNrql<LogResult>(
				parsedId.accountId,
				beforeQuery,
				400
			);
			const afterLogs = await this.graphqlClient.runNrql<LogResult>(
				parsedId.accountId,
				afterQuery,
				400
			);

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
			const { entityGuid } = {
				...request,
			};

			const parsedId = parseId(entityGuid)!;
			const query = `SELECT keyset() FROM Log WHERE entity.guid = '${entityGuid}'`;
			let logDefinitions = await this.graphqlClient.runNrql<LogFieldDefinition>(
				parsedId.accountId,
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
