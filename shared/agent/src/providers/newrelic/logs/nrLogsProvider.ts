import { lsp, lspHandler } from "../../../system/decorators/lsp";
import {
	GetLogFieldDefinitionsRequest,
	GetLogFieldDefinitionsRequestType,
	GetLogFieldDefinitionsResponse,
	GetLogsRequest,
	GetLogsRequestType,
	GetLogsResponse,
	GetSurroundingLogsRequest,
	GetSurroundingLogsRequestType,
	GetSurroundingLogsResponse,
	LogFieldDefinition,
	LogResult,
} from "@codestream/protocols/agent";
import { log } from "../../../system/decorators/log";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import { ContextLogger } from "../../contextLogger";
import { mapNRErrorResponse, parseId } from "../utils";

@lsp
export class NrLogsProvider {
	constructor(private graphqlClient: NewRelicGraphqlClient) {}

	@lspHandler(GetLogsRequestType)
	@log()
	public async getLogs(request: GetLogsRequest): Promise<GetLogsResponse> {
		const entityGuid = request.entityGuid;
		const accountId = parseId(entityGuid)!.accountId;

		try {
			const { since, limit, order, filterText } = {
				...request,
			};

			let queryWhere = `WHERE entity.guid = '${entityGuid}' AND newrelic.source = 'logs.APM'`;
			const querySince = `SINCE ${since}`;
			const queryOrder = `ORDER BY ${order.field} ${order.direction}`;
			const queryLimit = `LIMIT ${limit}`;

			if (filterText) {
				queryWhere += ` AND allColumnSearch('${filterText}', insensitive: true)`;
			}

			const query = `SELECT * FROM Log ${queryWhere} ${querySince} ${queryOrder} ${queryLimit}`;

			ContextLogger.log(`getLogs query: ${query}`);

			const logs = await this.graphqlClient.runNrql<LogResult>(accountId, query, 400);

			let messageAttribute: string = "message";
			const hasMessageAttribute = logs.some(lr => Object.keys(lr).includes("message"));
			if (!hasMessageAttribute) {
				messageAttribute = "log_summary";
			}

			logs.map(lr => {
				const json = JSON.stringify(lr);
				lr["log_summary"] = json;
			});

			const possibleSeverityAttributes: string[] = [
				`log_severity`,
				`level`,
				`log.level`,
				`loglevel`,
				`log_level`,
			];

			let severityAttribute: string = "";

			// should have at least (and no more) than one of these
			possibleSeverityAttributes.map(psa => {
				const hasAttribute = logs.some(lr => Object.keys(lr).includes(psa));

				if (hasAttribute) {
					severityAttribute = psa;
				}
			});

			return {
				logs,
				messageAttribute,
				severityAttribute,
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

			const queryWhere = `WHERE entity.guid = '${entityGuid}' AND newrelic.source = 'logs.APM' AND messageId != '${messageId}`;
			const queryOrder = `ORDER BY timestamp ASC`;

			const beforeQuerySince = `SINCE ${since} - 10 MINUTES`;
			const beforeQueryUntil = `UNTIL ${since}`;
			const beforeQuery = `SELECT * FROM Log ${queryWhere} ${beforeQuerySince} ${beforeQueryUntil} ${queryOrder}`;

			const afterQuerySince = `SINCE ${since}`;
			const afterQueryUntil = `UNTIL ${since} + 10 MINUTES`;
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

			// resort some common fields to the front - better way?
			var timestamp = logDefinitions.find(lfd => lfd.key === "timestamp");
			var level = logDefinitions.find(lfd => lfd.key === "level");
			var message = logDefinitions.find(lfd => lfd.key === "message");

			var timestampIndex = logDefinitions.findIndex(lfd => lfd.key === "timestamp");
			logDefinitions.splice(timestampIndex, 1);

			var levelIndex = logDefinitions.findIndex(lfd => lfd.key === "level");
			logDefinitions.splice(levelIndex, 1);

			var messageIndex = logDefinitions.findIndex(lfd => lfd.key === "message");
			logDefinitions.splice(messageIndex, 1);

			logDefinitions.unshift(timestamp!, level!, message!);

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
