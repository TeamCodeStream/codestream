"use strict";
// keep this as the first import
// tslint:disable-next-line:ordered-imports
// eslint-disable-next-line import/order
import * as NewRelic from "newrelic";

import {
	CodeStreamDiffUriData,
	FileLevelTelemetryAverageDuration,
	FileLevelTelemetryErrorRate,
	FileLevelTelemetryMetric,
	FileLevelTelemetrySampleSize,
	GetFileLevelTelemetryRequest,
	GetFileLevelTelemetryResponse,
	NRErrorResponse,
	ObservabilityAnomaly,
} from "@codestream/protocols/agent";
import {
	AdditionalMetadataInfo,
	GraphqlNrqlError,
	MetricTimeslice,
	ResolutionMethod,
} from "../newrelic.types";
import { Logger } from "../../../logger";
import { SessionServiceContainer } from "../../../container";
import * as csUri from "../../../system/uri";
import { ReviewsManager } from "../../../managers/reviewsManager";
import path from "path";
import { URI } from "vscode-uri";
import Cache from "@codestream/utils/system/timedCache";
import { FLTStrategyFactory } from "./FLTStrategy";
import { AnomaliesProvider } from "../anomalies/anomaliesProvider";
import { ReposProvider } from "../repos/reposProvider";
import { NrApiConfig } from "../nrApiConfig";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import { EntityAccountResolver } from "./entityAccountResolver";
import { lsp } from "../../../system/decorators/lsp";
import { errorTypeMapper } from "../utils";
import { ContextLogger } from "../../contextLogger";
import { Disposable } from "../../../system/disposable";
import { isEmpty } from "lodash";
import { keyFromFacet } from "./FLTCodeAttributeStrategy";
import { DeploymentsProvider } from "../deployments/deploymentsProvider";

@lsp
export class ClmManager implements Disposable {
	constructor(
		private anomaliesProvider: AnomaliesProvider,
		private reposProvider: ReposProvider,
		private sessionServiceContainer: SessionServiceContainer,
		private nrApiConfig: NrApiConfig,
		private graphqlClient: NewRelicGraphqlClient,
		private entityAccountResolver: EntityAccountResolver,
		private deploymentsProvider: DeploymentsProvider,
	) {}

	// 2 minute cache
	private _mltTimedCache = new Cache<GetFileLevelTelemetryResponse | null>({
		defaultTtl: 120 * 1000,
	});

	private addCustomAttribute(key: string, value: string) {
		try {
			NewRelic.addCustomAttribute(key, value);
		} catch (ex) {
			Logger.warn("addCustomAttribute failed", { error: ex?.message });
		}
	}

	async getFileLevelTelemetry(
		request: GetFileLevelTelemetryRequest
	): Promise<GetFileLevelTelemetryResponse | NRErrorResponse | undefined> {
		const { git } = this.sessionServiceContainer;
		const languageId: LanguageId | undefined = isSupportedLanguage(request.languageId)
			? request.languageId
			: undefined;

		this.addCustomAttribute("languageId", request.languageId);
		if (!languageId) {
			ContextLogger.warn("getFileLevelTelemetry: languageId not supported");
			return undefined;
		}

		if (!request.fileUri && !request.locator) {
			ContextLogger.warn("getFileLevelTelemetry: Missing fileUri, or method locator");
			return undefined;
		}

		let filePath = undefined;
		if (request.fileUri.startsWith("codestream-diff://")) {
			let parsedUri = undefined;
			if (csUri.Uris.isCodeStreamDiffUri(request.fileUri)) {
				parsedUri = csUri.Uris.fromCodeStreamDiffUri<CodeStreamDiffUriData>(request.fileUri);
			} else {
				parsedUri = ReviewsManager.parseUri(request.fileUri);
			}
			const repo = parsedUri?.repoId && (await git.getRepositoryById(parsedUri?.repoId));
			filePath = repo && parsedUri?.path && path.join(repo.path, parsedUri.path);
		} else {
			const parsedUri = URI.parse(request.fileUri);
			filePath = parsedUri.fsPath;
		}
		if (!filePath) {
			ContextLogger.warn(
				`getFileLevelTelemetry: Unable to resolve filePath from URI ${request.fileUri}`
			);
			return undefined;
		}

		const resolutionMethod = this.getResolutionMethod(languageId);

		if (
			resolutionMethod === "locator" &&
			!request.locator?.functionName &&
			!request.locator?.namespace &&
			isEmpty(request.locator?.namespaces)
		) {
			ContextLogger.warn("getFileLevelTelemetry: Missing locator for resolutionMethod 'locator'");
			return undefined;
		}

		const cacheKey =
			resolutionMethod === "filePath"
				? [filePath, request.languageId].join("-")
				: [Object.values(request.locator!).join("-"), request.languageId].join("-");

		if (request.resetCache) {
			Logger.log("getFileLevelTelemetry: resetting cache", {
				cacheKey,
			});
			this._mltTimedCache.clear();
			Logger.log("getFileLevelTelemetry: reset cache complete", {
				cacheKey,
			});
		} else {
			const cached = this._mltTimedCache.get(cacheKey);
			// Using null here to differentiate no result for file (null) vs not cached (undefined)
			if (cached !== undefined) {
				// Is null or real response
				Logger.log("getFileLevelTelemetry: from cache", {
					cacheKey,
				});
				return cached ?? undefined;
			}
		}

		const { result, error } = await this.entityAccountResolver.resolveEntityAccount(filePath);
		if (error) return error;
		if (!result) return undefined;
		const { entity, relativeFilePath, observabilityRepo, repoForFile, remote } = result;
		const normalizedRelativeFilePath = relativeFilePath.replace(/\\/g, "/");

		const newRelicAccountId = entity.accountId;
		const newRelicEntityGuid = entity.entityGuid;
		const entityName = entity.entityName;

		try {
			const strategyFactory = new FLTStrategyFactory();
			const strategies = strategyFactory.createStrategies(
				newRelicEntityGuid,
				newRelicAccountId,
				languageId,
				normalizedRelativeFilePath,
				request,
				resolutionMethod,
				this.graphqlClient
			);
			const results = await Promise.all(strategies.map(_ => _.execute()));

			const averageDuration = this.mergeResults(results.map(_ => _.averageDuration));
			const errorRate = this.mergeResults(results.map(_ => _.errorRate));
			const sampleSize = this.mergeResults(results.map(_ => _.sampleSize));

			const anomalies =
				this.anomaliesProvider.getLastObservabilityAnomaliesResponse(newRelicEntityGuid);
			if (anomalies) {
				this.addAnomalies(averageDuration, anomalies.responseTime);
				for (const anomaly of anomalies.responseTime) {
					this.addAnomalies(
						averageDuration,
						(anomaly.children || []).filter(_ => _.type === "duration")
					);
					this.addAnomalies(
						errorRate,
						(anomaly.children || []).filter(_ => _.type === "errorRate")
					);
				}
				this.addAnomalies(errorRate, anomalies.errorRate);
				for (const anomaly of anomalies.errorRate) {
					this.addAnomalies(
						averageDuration,
						(anomaly.children || []).filter(_ => _.type === "duration")
					);
					this.addAnomalies(
						errorRate,
						(anomaly.children || []).filter(_ => _.type === "errorRate")
					);
				}
			}

			const deploymentCommit = await this.getDeploymentCommitIfNeeded(newRelicEntityGuid, {
				averageDuration,
				errorRate,
				sampleSize,
			});

			const hasAnyData = sampleSize.length || averageDuration.length || errorRate.length;
			const response: GetFileLevelTelemetryResponse = {
				codeNamespace: request?.locator?.namespace,
				isConnected: true,
				sampleSize,
				averageDuration,
				errorRate,
				sinceDateFormatted: "30 minutes", //begin ? Dates.toFormatter(new Date(begin)).fromNow() : "",
				lastUpdateDate: Date.now(),
				hasAnyData: Boolean(hasAnyData),
				newRelicAlertSeverity: entity.alertSeverity,
				newRelicAccountId: newRelicAccountId,
				newRelicEntityGuid: newRelicEntityGuid,
				newRelicEntityName: entityName,
				newRelicEntityAccounts: observabilityRepo.entityAccounts,
				repo: {
					id: repoForFile.id!,
					name: this.reposProvider.getRepoName(repoForFile),
					remote: remote,
				},
				relativeFilePath: relativeFilePath,
				newRelicUrl: `${this.nrApiConfig.productUrl}/redirect/entity/${newRelicEntityGuid}`,
        deploymentCommit,
			};

			if (sampleSize?.length > 0) {
				this._mltTimedCache.put(cacheKey, response);
				Logger.log("getFileLevelTelemetry caching success", {
					spansLength: sampleSize.length,
					hasAnyData: hasAnyData,
					data: {
						throughputResponseLength: sampleSize.length,
						averageDurationResponseLength: averageDuration.length,
						errorRateResponseLength: errorRate.length,
					},
					newRelicEntityGuid,
					newRelicAccountId,
				});
			} else {
				// Cache that there are no spans for this file for a shorter duration
				this._mltTimedCache.put(cacheKey, null, { ttl: 60 * 1000 });
				Logger.log("getFileLevelTelemetry no spans", {
					hasAnyData,
					relativeFilePath,
					newRelicEntityGuid,
					newRelicAccountId,
				});
			}
			return response;
		} catch (ex) {
			if (ex instanceof GraphqlNrqlError) {
				const type = errorTypeMapper(ex);
				Logger.warn(`getFileLevelTelemetry error ${type}`, {
					request,
					newRelicEntityGuid,
					newRelicAccountId,
				});
				return <NRErrorResponse>{
					error: {
						message: ex.message,
						type,
					},
				};
			}
			Logger.error(ex, "getFileLevelTelemetry", {
				request,
				newRelicEntityGuid,
				newRelicAccountId,
			});
		}

		Logger.log("getFileLevelTelemetry returning undefined", {
			relativeFilePath,
			newRelicEntityGuid,
			newRelicAccountId,
		});

		return undefined;
	}

	getResolutionMethod(languageId: LanguageId): ResolutionMethod {
		switch (languageId) {
			case "go":
			case "csharp":
			case "java":
			case "kotlin":
				return "locator";
			case "php":
				return "hybrid";
			default:
				return "filePath";
		}
	}

	private mergeResults<T extends FileLevelTelemetryMetric>(averageDurationResultSets: T[][]): T[] {
		const consolidated = new Map<string, T>();
		for (const resultSet of averageDurationResultSets) {
			for (const result of resultSet) {
				const metricTimesliceKey = keyFromFacet(result.facet);
				if (!consolidated.has(metricTimesliceKey)) {
					consolidated.set(metricTimesliceKey, result);
				}
			}
		}
		return Array.from(consolidated.values());
	}

	private addAnomalies(metrics: FileLevelTelemetryMetric[], anomalies: ObservabilityAnomaly[]) {
		for (const anomaly of anomalies) {
			// FIXME quick workaround to account for methods implemented in Java superclasses
			// className, when it comes from code attributes strategy, will be the name of the superclass
			// where the method is implemented, but the actual metricTimesliceName (in which anomaly detection
			// is also based) is the name of the concrete class
			const parts = anomaly.metricTimesliceName.split("/");
			const altClassName = parts[parts.length - 2];
			const metricMatch1 = metrics.find(_ => _.facet[0] === anomaly.metricTimesliceName[0]);
			const metricMatch2 = metrics.find(
				_ =>
					(_.className === anomaly.codeAttrs?.codeNamespace || _.className === altClassName) &&
					_.functionName === anomaly.codeAttrs?.codeFunction
			);
			if (metricMatch1 || metricMatch2) {
				(metricMatch1 || metricMatch2)!.anomaly = anomaly;
			} else {
				const metric: FileLevelTelemetryMetric = {
					facet: [anomaly.metricTimesliceName],
          functionName: anomaly.codeAttrs?.codeFunction,
          className: anomaly.codeAttrs?.codeNamespace,
          namespace: anomaly.codeAttrs?.codeNamespace,
          anomaly: anomaly,
				};
				metrics.push(metric);
			}
		}
	}

	private async getDeploymentCommitIfNeeded(
		newRelicEntityGuid: string,
		results: {
			errorRate: FileLevelTelemetryErrorRate[];
			sampleSize: FileLevelTelemetrySampleSize[];
			averageDuration: FileLevelTelemetryAverageDuration[];
		}
	) {
		const missingCommit =
			results.errorRate.find(_ => !_.commit) !== undefined ||
			results.sampleSize.find(_ => !_.commit) !== undefined ||
			results.averageDuration.find(_ => !_.commit) !== undefined;
		if (!missingCommit) return undefined;
		Logger.log("getDeploymentCommitIfNeeded: missing commit - calling getLatestDeployment");
		const result = await this.deploymentsProvider.getLatestDeployment({ entityGuid: newRelicEntityGuid });
		Logger.log(
			`getDeploymentCommitIfNeeded: getLatestDeployment found commit ${result?.deployment.commit}`
		);
		return result?.deployment.commit;
	}

  /*
Not actually used - agent is restarted at logout but keeping for
possible future use
*/
  dispose(): void {
    this._mltTimedCache.clear();
  }
}

// Use type guard so that list of languages can be defined once and shared with union type LanguageId
function isSupportedLanguage(value: string): value is LanguageId {
	const language = supportedLanguages.find(validLanguage => validLanguage === value);
	return !!language;
}

const supportedLanguages = [
	"python",
	"ruby",
	"csharp",
	"java",
	"kotlin",
	"go",
	"php",
	"javascript",
	"javascriptreact",
	"typescript",
	"typescriptreact",
] as const;

export type LanguageId = (typeof supportedLanguages)[number];

export type EnhancedMetricTimeslice = MetricTimeslice & {
	className?: string;
	functionName?: string;
	lineno?: number;
	column?: number;
	metadata: AdditionalMetadataInfo;
	namespace?: string;
	commit?: string;
};
