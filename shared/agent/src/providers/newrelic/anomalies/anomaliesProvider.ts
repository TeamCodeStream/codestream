import {
	DidChangeCodelensesNotificationType,
	GetObservabilityAnomaliesRequest,
	GetObservabilityAnomaliesRequestType,
	GetObservabilityAnomaliesResponse,
	GetObservabilityResponseTimesRequest,
	GetObservabilityResponseTimesRequestType,
	GetObservabilityResponseTimesResponse,
} from "@codestream/protocols/agent";
import { lsp, lspHandler } from "../../../system/decorators/lsp";
import { log } from "../../../system/decorators/log";
import { AnomalyDetector } from "../anomalyDetection";
import { Logger } from "../../../logger";
import { Functions } from "../../../system/function";
import Cache from "@codestream/utils/system/timedCache";
import { SessionContainer } from "../../../container";
import { DEFAULT_CLM_SETTINGS } from "@codestream/protocols/api";
import { CodeStreamAgent } from "../../../agent";
import { ReposProvider } from "../repos/reposProvider";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import { DeploymentsProvider } from "../deployments/deploymentsProvider";
import { URI } from "vscode-uri";
import { EntityAccountResolver } from "../clm/entityAccountResolver";
import { Disposable } from "../../../system/disposable";
import wait = Functions.wait;

@lsp
export class AnomaliesProvider implements Disposable {
	private _observabilityAnomaliesTimedCache = new Cache<Promise<GetObservabilityAnomaliesResponse>>(
		{
			defaultTtl: 45 * 60 * 1000, // 45 minutes
		}
	);
	private _lastObservabilityAnomaliesResponse = new Map<
		string,
		GetObservabilityAnomaliesResponse
	>();
	private _pollObservabilityAnomaliesTimeout: string | number | NodeJS.Timeout | undefined;

	constructor(
		private agent: CodeStreamAgent,
		private entityAccountResolver: EntityAccountResolver,
		private reposProvider: ReposProvider,
		private graphqlClient: NewRelicGraphqlClient,
		private deploymentsProvider: DeploymentsProvider
	) {
		this.init();
	}

	private init() {
		this._pollObservabilityAnomaliesTimeout = setTimeout(
			this.pollObservabilityAnomalies.bind(this),
			2 * 60 * 1000
		);
	}

	getLastObservabilityAnomaliesResponse(entityGuid: string) {
		return this._lastObservabilityAnomaliesResponse.get(entityGuid);
	}

	private observabilityAnomaliesCacheKey(request: GetObservabilityAnomaliesRequest): string {
		return [
			request.entityGuid,
			request.sinceDaysAgo,
			request.baselineDays,
			request.sinceLastRelease,
			request.minimumErrorRate,
			request.minimumResponseTime,
			request.minimumSampleRate,
			request.minimumRatio,
		].join("|");
	}

	@lspHandler(GetObservabilityAnomaliesRequestType)
	@log({
		timed: true,
	})
	async getObservabilityAnomalies(
		request: GetObservabilityAnomaliesRequest
	): Promise<GetObservabilityAnomaliesResponse> {
		const cacheKey = this.observabilityAnomaliesCacheKey(request);
		try {
			const cached = await this._observabilityAnomaliesTimedCache.get(cacheKey);
			if (cached) {
				this._lastObservabilityAnomaliesResponse.set(request.entityGuid, cached);
				this.agent.sendNotification(DidChangeCodelensesNotificationType, undefined);
				return cached;
			}
		} catch (e) {
			// ignore
		}

		this._lastObservabilityAnomaliesResponse.delete(request.entityGuid);

		let lastEx;
		const fn = async () => {
			try {
				const anomalyDetector = new AnomalyDetector(
					request,
					this.graphqlClient,
					this.reposProvider,
					this.deploymentsProvider
				);
				const promise = anomalyDetector.execute();
				this._observabilityAnomaliesTimedCache.put(cacheKey, promise);
				const response = await promise;
				this._lastObservabilityAnomaliesResponse.set(request.entityGuid, response);
				return true;
			} catch (ex) {
				this._observabilityAnomaliesTimedCache.remove(cacheKey);
				Logger.warn(ex.message);
				lastEx = ex.message;
				return false;
			}
		};
		await Functions.withExponentialRetryBackoff(fn, 5, 1000);
		const response = this._observabilityAnomaliesTimedCache.get(cacheKey) || {
			responseTime: [],
			errorRate: [],
			error: lastEx,
			didNotifyNewAnomalies: false,
		};

		this.agent.sendNotification(DidChangeCodelensesNotificationType, undefined);

		return response;
	}

	@lspHandler(GetObservabilityResponseTimesRequestType)
	@log({
		timed: true,
	})
	getObservabilityResponseTimes(
		request: GetObservabilityResponseTimesRequest
	): Promise<GetObservabilityResponseTimesResponse> {
		return this._getObservabilityResponseTimes(request);
	}

	private async _getObservabilityResponseTimes(
		request: GetObservabilityResponseTimesRequest
	): Promise<GetObservabilityResponseTimesResponse> {
		const parsedUri = URI.parse(request.fileUri);
		const filePath = parsedUri.fsPath;
		const { result, error } = await this.entityAccountResolver.resolveEntityAccount(filePath);
		if (!result)
			return {
				responseTimes: [],
			};

		// const query =
		// 	`SELECT average(newrelic.timeslice.value) * 1000 AS 'value' ` +
		// 	`FROM Metric WHERE \`entity.guid\` = '${result.entity.entityGuid}' ` +
		// 	`AND (metricTimesliceName LIKE 'Java/%' OR metricTimesliceName LIKE 'Custom/%')` +
		// 	`FACET metricTimesliceName AS name ` +
		// 	`SINCE 7 days ago LIMIT MAX`;

		const query =
			`SELECT average(duration) * 1000 AS 'value' ` +
			`FROM Span WHERE \`entity.guid\` = '${result.entity.entityGuid}' ` +
			`AND (name LIKE 'Java/%' OR name LIKE 'Custom/%')` +
			`FACET name ` +
			`SINCE 7 days ago LIMIT MAX`;

		const results = await this.graphqlClient.runNrql<{ name: string; value: number }>(
			result.entity.accountId,
			query,
			200
		);
		return {
			responseTimes: results,
		};
	}

	async pollObservabilityAnomalies() {
		try {
			await this.pollObservabilityAnomaliesCore();
		} catch (ex) {
			Logger.warn(ex);
		} finally {
			this._pollObservabilityAnomaliesTimeout = setTimeout(
				this.pollObservabilityAnomaliesCore.bind(this),
				24 * 60 * 60 * 1000
			);
		}
	}

	private async pollObservabilityAnomaliesCore() {
		try {
			const { repos, error } = await this.reposProvider.getObservabilityRepos({});
			if (error) {
				Logger.warn("pollObservabilityAnomalies: " + (error.error.message || error.error.type));
				return;
			}
			if (!repos?.length) {
				Logger.log("pollObservabilityAnomalies: no observability repos");
				return;
			}
			const entityGuids = new Set<string>();
			for (const observabilityRepo of repos) {
				for (const account of observabilityRepo.entityAccounts) {
					entityGuids.add(account.entityGuid);
				}
			}

			const me = await SessionContainer.instance().users.getMe();
			const clmSettings = me.preferences?.clmSettings || DEFAULT_CLM_SETTINGS;
			let didNotifyNewAnomalies = false;
			for (const entityGuid of entityGuids) {
				Logger.log(
					"pollObservabilityAnomalies: Getting observability anomalies for entity " + entityGuid
				);
				const response = await this.getObservabilityAnomalies({
					entityGuid,
					sinceDaysAgo: parseInt(clmSettings.compareDataLastValue),
					baselineDays: parseInt(clmSettings.againstDataPrecedingValue),
					sinceLastRelease: clmSettings.compareDataLastReleaseValue,
					minimumErrorRate: parseFloat(clmSettings.minimumErrorRateValue),
					minimumResponseTime: parseFloat(clmSettings.minimumAverageDurationValue),
					minimumSampleRate: parseFloat(clmSettings.minimumBaselineValue),
					minimumRatio: parseFloat(clmSettings.minimumChangeValue) / 100 + 1,
					notifyNewAnomalies: !didNotifyNewAnomalies,
				});
				if (response.didNotifyNewAnomalies) {
					didNotifyNewAnomalies = true;
				}

				await wait(10 * 60 * 1000);
			}
		} catch (e) {
			Logger.warn("pollObservabilityAnomaliesCore error", e);
		}
	}

	/*
	Not actually used - agent is restarted at logout but keeping for
	possible future use
	*/
	dispose(): void {
		clearTimeout(this._pollObservabilityAnomaliesTimeout);
		this._observabilityAnomaliesTimedCache.clear();
	}
}
