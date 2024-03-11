import { ClmManager } from "./clmManager";
import Cache from "@codestream/utils/system/timedCache";
import { ClmSpanData, isClmSpanData } from "../newrelic.types";
import {
	Entity,
	EntityAccount,
	GetClmRequest,
	GetClmRequestType,
	GetClmResponse,
	GetFileLevelTelemetryRequest,
	GetFileLevelTelemetryRequestType,
	GetFileLevelTelemetryResponse,
	GetMethodLevelTelemetryRequest,
	GetMethodLevelTelemetryRequestType,
	GetMethodLevelTelemetryResponse,
	isNRErrorResponse,
	MetricTimesliceNameMapping,
	NRErrorResponse,
	ObservabilityError,
	ObservabilityRepo,
} from "@codestream/protocols/agent";
import { isEmpty as _isEmpty } from "lodash";
import { lsp, lspHandler } from "../../../system/decorators/lsp";
import { log } from "../../../system/decorators/log";
import { ClmManagerNew } from "./clmManagerNew";
import { Logger } from "../../../logger";
import { Functions } from "../../../system/function";
import { generateClmSpanDataExistsQuery } from "../spanQuery";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import { ReposProvider } from "../repos/reposProvider";
import { getMethodLevelTelemetryMockResponse } from "../anomalyDetectionMockResults";
import { NrApiConfig } from "../nrApiConfig";
import { GoldenSignalsProvider } from "../goldenSignals/goldenSignalsProvider";
import { DeploymentsProvider } from "../deployments/deploymentsProvider";
import { ObservabilityErrorsProvider } from "../errors/observabilityErrorsProvider";
import { mapNRErrorResponse, parseId } from "../utils";
import { ContextLogger } from "../../contextLogger";
import { Disposable } from "../../../system/disposable";
import { CriticalPathCalculator } from "../criticalPath";

@lsp
export class ClmProvider implements Disposable {
	private _clmSpanDataExistsCache = new Cache<ClmSpanData>({
		defaultTtl: 120 * 1000,
	});
	private _clmTimedCache = new Cache<GetClmResponse>({
		defaultTtl: 120 * 1000,
	});
	constructor(
		private clmManager: ClmManager,
		private graphqlClient: NewRelicGraphqlClient,
		private reposProvider: ReposProvider,
		private nrApiConfig: NrApiConfig,
		private goldenSignalsProvider: GoldenSignalsProvider,
		private deploymentsProvider: DeploymentsProvider,
		private observabilityErrorsProvider: ObservabilityErrorsProvider
	) {}

	protected async findClmSpanDataExists(
		newRelicGuids: string[]
	): Promise<ClmSpanData[] | NRErrorResponse> {
		try {
			const results = await Promise.all(
				newRelicGuids.map(async _ => {
					const cached = this._clmSpanDataExistsCache.get(_);
					if (cached) {
						if (Logger.isDebugging) {
							Logger.debug(`findClmSpanDataExists ${JSON.stringify(cached)} from cache for ${_}`);
						}
						return cached;
					}
					const response = await this.graphqlClient.query(generateClmSpanDataExistsQuery(_), {
						accountId: parseId(_)?.accountId,
					});
					const spanData = response?.actor?.account?.nrql?.results[0];
					if (isClmSpanData(spanData)) {
						// Only cache valid results
						this._clmSpanDataExistsCache.put(_, spanData);
					}
					return spanData;
				})
			);

			return results;
		} catch (ex) {
			Logger.error(ex);
			return mapNRErrorResponse(ex);
		}
	}

	private async checkHasCodeLevelMetricSpanData(
		hasRepoAssociation: boolean,
		uniqueEntities: Entity[]
	): Promise<boolean | NRErrorResponse> {
		if (!hasRepoAssociation || _isEmpty(uniqueEntities)) {
			return false;
		}
		const repoEntitySpanDataExistsResponse = await this.findClmSpanDataExists(
			uniqueEntities?.map(_ => _.guid)
		);
		if (isNRErrorResponse(repoEntitySpanDataExistsResponse)) {
			return repoEntitySpanDataExistsResponse;
		}
		return repoEntitySpanDataExistsResponse?.find(_ => _ && _["entity.guid"] != null) != null;
	}

	@lspHandler(GetFileLevelTelemetryRequestType)
	@log()
	getFileLevelTelemetry(
		request: GetFileLevelTelemetryRequest
	): Promise<GetFileLevelTelemetryResponse | NRErrorResponse | undefined> {
		return this.clmManager.getFileLevelTelemetry(request);
	}

	@lspHandler(GetMethodLevelTelemetryRequestType)
	@log()
	async getMethodLevelTelemetry(
		request: GetMethodLevelTelemetryRequest
	): Promise<GetMethodLevelTelemetryResponse | undefined> {
		const mockResponse = getMethodLevelTelemetryMockResponse(request);
		if (mockResponse) {
			return mockResponse;
		}

		let observabilityRepo: ObservabilityRepo | undefined;
		let entity: EntityAccount | undefined;
		let entityAccounts: EntityAccount[] = [];

		if (request.repoId) {
			observabilityRepo = await this.reposProvider.getObservabilityEntityRepos(request.repoId);
			if (!observabilityRepo || !observabilityRepo.entityAccounts) {
				return undefined;
			}
			entityAccounts = observabilityRepo.entityAccounts;

			entity = observabilityRepo.entityAccounts.find(
				_ => _.entityGuid === request.newRelicEntityGuid
			);
			if (!entity) {
				ContextLogger.warn("Missing entity", {
					entityId: request.newRelicEntityGuid,
				});
				return undefined;
			}
		}

		try {
			const goldenMetrics = await this.goldenSignalsProvider.getMethodLevelGoldenMetrics(
				request.newRelicEntityGuid || entity!.entityGuid!,
				request.metricTimesliceNameMapping,
				request.since,
				request.timeseriesGroup,
				request.scope
			);

			let deployments;
			if (request.includeDeployments && request.since) {
				deployments = (
					await this.deploymentsProvider.getDeployments({
						entityGuid: request.newRelicEntityGuid || entity!.entityGuid!,
						since: request.since,
					})
				).deployments;
			}

			const errors =
				request.includeErrors && request.metricTimesliceNameMapping
					? await this.getMethodLevelErrors(
							request.newRelicEntityGuid || entity!.entityGuid!,
							request.metricTimesliceNameMapping,
							observabilityRepo?.repoRemote || "",
							request.since,
							request.functionIdentifiers
					  )
					: [];

			const entityGuid = entity?.entityGuid || request.newRelicEntityGuid;
			const criticalPathCalculator = new CriticalPathCalculator(this.graphqlClient);
			const criticalPath = request.metricTimesliceNameMapping
				? await criticalPathCalculator.getCriticalPath(
						entityGuid,
						request.metricTimesliceNameMapping
				  )
				: undefined;

			return {
				goldenMetrics: goldenMetrics,
				deployments,
				criticalPath,
				errors,
				newRelicEntityAccounts: entityAccounts,
				newRelicAlertSeverity: entity?.alertSeverity,
				newRelicEntityName: entity?.entityName || "",
				newRelicEntityGuid: entityGuid,
				newRelicUrl: `${this.nrApiConfig.productUrl}/redirect/entity/${entityGuid}`,
			};
		} catch (ex) {
			Logger.error(ex, "getMethodLevelTelemetry", {
				request,
			});
		}

		return undefined;
	}

	/**
	 * Get a list of recent error traces associated with a given method
	 *
	 * @param entityGuid entity guid for span data
	 * @param metricTimesliceNames names to use in the NRQL subquery
	 * @param remote the git remote for the error
	 * @param since value to use in the SINCE statement in the NRQL query
	 * @returns list of most recent error traces for each unique fingerprint
	 */
	@log()
	async getMethodLevelErrors(
		entityGuid: string,
		metricTimesliceNames: MetricTimesliceNameMapping,
		remote: string,
		since?: string,
		functionIdentifiers?: {
			codeNamespace?: string;
			functionName?: string;
			relativeFilePath?: string;
		}
	): Promise<ObservabilityError[]> {
		const parsedId = parseId(entityGuid)!;
		const query = this.getMethodLevelErrorsQuery(
			entityGuid,
			metricTimesliceNames,
			since,
			functionIdentifiers
		);
		if (!query) return [];

		const response = await this.graphqlClient.query<{
			actor: {
				account: {
					nrql: {
						results: {
							lastOccurrence: number;
							occurrenceId: string;
							appName: string;
							errorClass: string;
							message: string;
							entityGuid: string;
							length: number;
						}[];
					};
				};
			};
		}>(
			`query fetchMethodLevelErrors($accountId:Int!) {
				actor {
					account(id: $accountId) {
						nrql(query: "${query}", timeout: 60) { nrql results }
					}
				}
			}`,
			{
				accountId: parsedId.accountId,
			}
		);
		const result = response.actor.account.nrql.results?.length
			? ((
					await Promise.all(
						response.actor.account.nrql.results.map(async errorTrace => {
							const response =
								await this.observabilityErrorsProvider.getErrorGroupFromNameMessageEntity(
									errorTrace.errorClass,
									errorTrace.message,
									errorTrace.entityGuid
								);

							if (response?.actor?.errorsInbox?.errorGroup) {
								return {
									entityId: errorTrace.entityGuid,
									appName: errorTrace.appName,
									errorClass: errorTrace.errorClass,
									message: errorTrace.message,
									remote: remote,
									errorGroupGuid: response.actor.errorsInbox.errorGroup.id,
									occurrenceId: errorTrace.occurrenceId,
									count: errorTrace.length,
									lastOccurrence: errorTrace.lastOccurrence,
									errorGroupUrl: response.actor.errorsInbox.errorGroup.url,
								};
							}
							return undefined;
						})
					)
			  ).filter(_ => _ !== undefined) as ObservabilityError[])
			: [];
		return result;
	}

	private getMethodLevelErrorsQuery(
		entityGuid: string,
		metricTimesliceNames?: MetricTimesliceNameMapping,
		since?: string,
		functionIdentifiers?: {
			codeNamespace?: string;
			functionName?: string;
			relativeFilePath?: string;
		}
	) {
		const transactionNameMatch = metricTimesliceNames?.errorRate?.match(/Errors\/(.*)/);
		if (
			(!transactionNameMatch || transactionNameMatch.length < 2) &&
			!functionIdentifiers?.functionName
		) {
			return undefined;
		}
		let transactionNameSubquery = "";
		if (transactionNameMatch && transactionNameMatch.length >= 2) {
			const transactionName = transactionNameMatch[1];
			transactionNameSubquery = [
				"(",
				`transactionName = '${transactionName}'`,
				"AND",
				`entityGuid = '${entityGuid}'`,
				")",
			].join(" ");
		}
		since = since || "30 minutes ago";
		let codeClause = "";
		let spanSubquery = "";
		if (functionIdentifiers?.functionName) {
			codeClause = `code.function = '${functionIdentifiers.functionName}'`;
			const codeClauseSubClauses = [];
			if (functionIdentifiers.codeNamespace) {
				codeClauseSubClauses.push(`code.namespace = '${functionIdentifiers.codeNamespace}'`);
			}
			if (functionIdentifiers.relativeFilePath) {
				codeClauseSubClauses.push(`code.filepath = '${functionIdentifiers.relativeFilePath}'`);
			}
			if (codeClauseSubClauses.length > 0) {
				codeClause += ` AND (${codeClauseSubClauses.join(" OR ")})`;
			}
			spanSubquery =
				functionIdentifiers && functionIdentifiers.functionName
					? [
							"guid IN (",
							"SELECT",
							"transactionId",
							"FROM Span",
							`WHERE entity.guid = '${entityGuid}'`,
							"WHERE (",
							"error.class IS NOT NULL",
							"OR",
							"error.group.guid",
							")",
							"AND (",
							codeClause,
							")",
							")",
					  ].join(" ")
					: "";
		}
		const whereClause = [transactionNameSubquery, spanSubquery].filter(_ => _ !== "").join(" OR ");
		return [
			"SELECT",
			"count(id) AS 'length',", // first field is used to sort with FACET
			"latest(timestamp) AS 'lastOccurrence',",
			"latest(id) AS 'occurrenceId',",
			"latest(appName) AS 'appName',",
			"latest(error.class) AS 'errorClass',",
			"latest(message) AS 'message',",
			"latest(entityGuid) AS 'entityGuid'",
			"FROM ErrorTrace",
			"WHERE ",
			whereClause,
			"WHERE fingerprint IS NOT NULL",
			"FACET error.class, message",
			`SINCE ${since}`,
			"LIMIT 10",
		].join(" ");
	}

	@lspHandler(GetClmRequestType)
	@log()
	async getClm(request: GetClmRequest): Promise<GetClmResponse> {
		const cached = this._clmTimedCache.get(request);
		if (cached) {
			return cached;
		}

		let lastEx;
		const fn = async () => {
			try {
				const clmExperiment = new ClmManagerNew(request, this.graphqlClient, this.reposProvider);
				const result = await clmExperiment.execute();
				this._clmTimedCache.put(request, result);
				return true;
			} catch (ex) {
				Logger.warn(ex.message);
				lastEx = ex.message;
				return false;
			}
		};
		await Functions.withExponentialRetryBackoff(fn, 5, 1000);
		const response = this._clmTimedCache.get(request) || {
			codeLevelMetrics: [],
			isSupported: false,
			error: lastEx,
		};

		return response;
	}

	/*
	Not actually used - agent is restarted at logout but keeping for
	possible future use
  */
	dispose(): void {
		this._clmSpanDataExistsCache.clear();
		this._clmTimedCache.clear();
	}
}
