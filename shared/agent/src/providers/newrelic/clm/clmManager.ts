"use strict";
// keep this as the first import
// tslint:disable-next-line:ordered-imports
// eslint-disable-next-line import/order
import * as NewRelic from "newrelic";

import {
	CodeStreamDiffUriData,
	EntityAccount,
	FileLevelTelemetryMetric,
	GetFileLevelTelemetryRequest,
	GetFileLevelTelemetryResponse,
	GetObservabilityResponseTimesRequest,
	GetObservabilityResponseTimesResponse,
	NRErrorResponse,
	ObservabilityAnomaly,
	ObservabilityRepo,
} from "@codestream/protocols/agent";
import { AdditionalMetadataInfo, MetricTimeslice, ResolutionMethod } from "../newrelic.types";
import { Logger } from "../../../logger";
import { GraphqlNrqlError } from "../../newrelic.types";
import { SessionContainer, SessionServiceContainer } from "../../../container";
import * as csUri from "../../../system/uri";
import { ReviewsManager } from "../../../managers/reviewsManager";
import path, { join, relative, sep } from "path";
import { URI } from "vscode-uri";
import { ContextLogger, INewRelicProvider } from "../../newrelic";
import Cache from "timed-cache";
import { GitRepository } from "../../../git/models/repository";
import { FLTStrategyFactory } from "./FLTStrategy";

export class ClmManager {
	constructor(private provider: INewRelicProvider) {}

	// 2 minute cache
	private _mltTimedCache = new Cache<GetFileLevelTelemetryResponse | null>({
		defaultTtl: 120 * 1000,
	});

	private _sessionServiceContainer: SessionServiceContainer | undefined;
	set sessionServiceContainer(value: SessionServiceContainer) {
		this._sessionServiceContainer = value;
	}

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
		const { git } = this._sessionServiceContainer || SessionContainer.instance();
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
			!request.locator?.namespaces
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

		const { result, error } = await this.resolveEntityAccount(filePath);
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
				this.provider
			);
			const results = await Promise.all(strategies.map(_ => _.execute()));

			const averageDuration = this.mergeResults(results.map(_ => _.averageDuration));
			const errorRate = this.mergeResults(results.map(_ => _.errorRate));
			const sampleSize = this.mergeResults(results.map(_ => _.sampleSize));

			const anomalies = this.provider.getLastObservabilityAnomaliesResponse(newRelicEntityGuid);
			if (anomalies) {
				this.addAnomalies(averageDuration, anomalies.responseTime);
				this.addAnomalies(errorRate, anomalies.errorRate);
			}

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
					name: this.provider.getRepoName(repoForFile),
					remote: remote,
				},
				relativeFilePath: relativeFilePath,
				newRelicUrl: `${this.provider.getProductUrl()}/redirect/entity/${newRelicEntityGuid}`,
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
				const type = this.provider.errorTypeMapper(ex);
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

	async getObservabilityResponseTimes(
		request: GetObservabilityResponseTimesRequest
	): Promise<GetObservabilityResponseTimesResponse> {
		const parsedUri = URI.parse(request.fileUri);
		const filePath = parsedUri.fsPath;
		const { result, error } = await this.resolveEntityAccount(filePath);
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

		const results = await this.provider.runNrql<{ name: string; value: number }>(
			result.entity.accountId,
			query,
			200
		);
		return {
			responseTimes: results,
		};
	}

	private async resolveEntityAccount(filePath: string): Promise<{
		result?: {
			entity: EntityAccount;
			relativeFilePath: string;
			observabilityRepo: ObservabilityRepo;
			repoForFile: GitRepository;
			remote: string;
		};
		error?: NRErrorResponse;
	}> {
		const { git, users } = this._sessionServiceContainer || SessionContainer.instance();
		const codeStreamUser = await users.getMe();

		const isConnected = this.provider.isConnected(codeStreamUser);
		if (!isConnected) {
			ContextLogger.warn("getFileLevelTelemetry: not connected", {
				filePath,
			});
			return {
				error: <NRErrorResponse>{
					isConnected: isConnected,
					error: {
						message: "Not connected to New Relic",
						type: "NOT_CONNECTED",
					},
				},
			};
		}

		const repoForFile = await git.getRepositoryByFilePath(filePath);
		if (!repoForFile?.id) {
			ContextLogger.warn("getFileLevelTelemetry: no repo for file", {
				filePath,
			});
			return {};
		}

		try {
			const { entityCount } = await this.provider.getEntityCount();
			if (entityCount < 1) {
				ContextLogger.log("getFileLevelTelemetry: no NR1 entities");
				return {};
			}
		} catch (ex) {
			if (ex instanceof GraphqlNrqlError) {
				const type = this.provider.errorTypeMapper(ex);
				Logger.warn(`getFileLevelTelemetry error ${type}`, {
					filePath,
				});
				return {
					error: <NRErrorResponse>{
						error: {
							message: ex.message,
							type,
						},
					},
				};
			}
			return {};
		}

		const remotes = await repoForFile.getWeightedRemotesByStrategy("prioritizeUpstream", undefined);
		const remote = remotes.map(_ => _.rawUrl)[0];

		let relativeFilePath = relative(repoForFile.path, filePath);
		if (relativeFilePath[0] !== sep) {
			relativeFilePath = join(sep, relativeFilePath);
		}

		// See if the git repo is associated with NR1
		const observabilityRepo = await this.provider.getObservabilityEntityRepos(repoForFile.id);
		if (!observabilityRepo) {
			ContextLogger.warn("getFileLevelTelemetry: no observabilityRepo");
			return {};
		}
		if (!observabilityRepo.entityAccounts?.length) {
			ContextLogger.warn("getFileLevelTelemetry: no entityAccounts");
			return {
				error: <NRErrorResponse>{
					repo: {
						id: repoForFile.id,
						name: this.provider.getRepoName(repoForFile),
						remote: remote,
					},
					error: {
						message: "",
						type: "NOT_ASSOCIATED",
					},
				},
			};
		}

		const entity = this.provider.getGoldenSignalsEntity(codeStreamUser!, observabilityRepo);
		return {
			result: {
				entity,
				relativeFilePath,
				observabilityRepo,
				repoForFile,
				remote,
			},
		};
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
				if (!consolidated.has(result.metricTimesliceName)) {
					consolidated.set(result.metricTimesliceName, result);
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
			const metricMatch1 = metrics.find(_ => _.metricTimesliceName === anomaly.metricTimesliceName);
			const metricMatch2 = metrics.find(
				_ =>
					(_.className === anomaly.codeNamespace || _.className === altClassName) &&
					_.functionName === anomaly.codeFunction
			);
			if (metricMatch1 || metricMatch2) {
				(metricMatch1 || metricMatch2)!.anomaly = anomaly;
			} else {
				const metric: FileLevelTelemetryMetric = {
					metricTimesliceName: anomaly.metricTimesliceName,
					functionName: anomaly.codeFunction,
					className: anomaly.codeNamespace,
					namespace: anomaly.codeNamespace,
					anomaly: anomaly,
				};
				metrics.push(metric);
			}
		}
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
	metadata: AdditionalMetadataInfo;
	namespace?: string;
};
