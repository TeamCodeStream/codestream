"use strict";

import { FLTResponse, FLTStrategy } from "./FLTStrategy";

import { 	FileLevelTelemetryAverageDuration,
  FileLevelTelemetryErrorRate,
  FileLevelTelemetrySampleSize,
  GetFileLevelTelemetryRequest, } from "@codestream/protocols/agent";
import { groupBy as _groupBy } from "lodash";
import {
	AdditionalMetadataInfo,
	FunctionInfo,
	GraphqlNrqlError,
	MetricTimeslice,
	Span,
} from "../newrelic.types";
import { generateSpanQuery, spanQueryTypes } from "../spanQuery";
import { Logger } from "../../../logger";
import { generateMethodSampleSizeQuery } from "../methodSampleSizeQuery";
import { EnhancedMetricTimeslice, LanguageId } from "./clmManager";
import { generateMethodAverageDurationQuery } from "../methodAverageDurationQuery";
import { generateMethodErrorRateQuery } from "../methodErrorRateQuery";
import { Index } from "@codestream/utils/types";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";

export type TimeWindow = {
	begin: number;
	end: number;
};

export type DurationsConsolidated = {
	facet: string[];
	averageDuration: number;
};

export type AverageDurationApiResponse = {
	results: DurationsConsolidated[];
	metadata: {
		timeWindow: TimeWindow;
	};
};

export type ErrorRateConsolidated = {
	facet: string[];
	errorRate: number;
};

export type SampleSizeConsolidated = {
	facet: string[];
	sampleSize: number;
	source: "metric" | "span";
};

export type ErrorRateApiResponse = {
	results: ErrorRateConsolidated[];
	metadata: {
		timeWindow: TimeWindow;
	};
};

export type SampleSizeApiResponse = {
	results: SampleSizeConsolidated[];
	metadata: {
		timeWindow: TimeWindow;
	};
};

export type SampleSizeResponse = {
	actor: {
		account: {
			metrics: {
				metadata: {
					timeWindow: TimeWindow;
				};
				results: [
					{
						facet: string;
						// metricTimesliceName: string;
						sampleSize: number;
					},
				];
			};
			extrapolations: any;
			spans: {
				metadata: {
					timeWindow: TimeWindow;
				};
				results: [
					{
						facet: string[];
						sampleSize: number;
					},
				];
			};
		};
	};
};

export type ErrorRateResponse = {
	actor: {
		account: {
			metrics: {
				metadata: {
					timeWindow: {
						begin: number;
						end: number;
					};
				};
				results: [
					{
						facet: string;
						// metricTimesliceName: string;
						errorCount: number;
					},
				];
			};
			extrapolations: any;
			spans: {
				metadata: {
					timeWindow: TimeWindow;
				};
				results: [
					{
						facet: string[];
						errorCount: number;
					},
				];
			};
			// nrql: any; // TODO not any - this is not part of the response so maybe shouldn't be here
			// extrapolations: any; // TODO not any
		};
	};
};

export type MethodAverageDurationResponse = {
	actor: {
		account: {
			metrics: {
				metadata: {
					timeWindow: TimeWindow;
				};
				results: [
					{
						facet: string;
						// metricTimesliceName: string;
						averageDuration: number;
					},
				];
			};
			extrapolations: any;
			spans: {
				metadata: {
					timeWindow: TimeWindow;
				};
				results: [
					{
						facet: string[];
						averageDuration: number;
					},
				];
			};
		};
	};
};

const ANONYMOUS_IDENTIFIER = "<anonymous>";

export function keyFromFacet(facet: string[]) {
	// Only create a key entry with lineno / colno level detail for non-anonymous functions
	if (facet.length > 1 && facet[0].endsWith(ANONYMOUS_IDENTIFIER)) {
		return facet.join("|");
	}
	return facet[0];
}

export function facetFromKey(key: string) {
	return key.split("|");
}

export type MetricSpanCount = {
	metric?: number;
	span?: number;
};

class SampleSizeHolder {
	private sampleSizeMap = new Map<string, MetricSpanCount>();

	set(metricFacet: string[], value: MetricSpanCount) {
		this.sampleSizeMap.set(keyFromFacet(metricFacet), value);
	}

	has(metricFacet: string[]): boolean {
		return this.sampleSizeMap.has(keyFromFacet(metricFacet));
	}

	// Consider only the metricTimesliceName - no lineno / colno
	// hasTimesliceName(metricFacet: string): boolean {
	// 	const keys = this.keys();
	// 	for (const key of keys) {
	// 		if (key[0] === metricFacet) {
	// 			return true
	// 		}
	// 	}
	// 	return false;
	// }

	get(metricFacet: string[]) {
		return this.sampleSizeMap.get(keyFromFacet(metricFacet));
	}

	keys(): string[][] {
		return Array.from(this.sampleSizeMap.keys()).map(key => facetFromKey(key));
	}
}

// function coerceToStrig(value: unknown): string | undefined {
// 	if (typeof value === "string") {
// 		return value;
// 	}
// 	if (typeof value === "number") {
// 		return value.toString();
// 	}
// 	return undefined;
// }

export class FLTCodeAttributeStrategy implements FLTStrategy {
	constructor(
		protected entityGuid: string,
		protected accountId: number,
		protected languageId: LanguageId,
		protected relativeFilePath: string,
		protected request: GetFileLevelTelemetryRequest,
		protected resolutionMethod: "filePath" | "locator" | "hybrid",
		private graphqlClient: NewRelicGraphqlClient
	) {}

	async execute() {
		// get a list of file-based method telemetry
		const spanResponse = await this.getSpans();

		const spans = this.applyLanguageFilter(spanResponse);
		const groupedByTransactionName = _groupBy(
			spans,
			// (_: Span) => _.name?.endsWith(ANONYMOUS_IDENTIFIER) ? `${_.name}|${_["code.lineno"]}|${_["code.column"]}` : _.name
			(_: Span) => `${_.name}|${_["code.lineno"] ?? "null"}|${_["code.column"] ?? "null"}`
		);
		const metricTimesliceNames = Array.from(new Set(spans.flatMap(_ => (_.name ? [_.name] : [])))); // Filter out undefined without having to typecast
		this.request.options = this.request.options || {};

		const [averageDurationResponse, sampleSizeResponse, errorRateResponse] = await Promise.all([
			this.request.options.includeAverageDuration && metricTimesliceNames?.length
				? this.getMethodAverageDuration(metricTimesliceNames)
				: undefined,
			metricTimesliceNames?.length ? this.getMethodSampleSize(metricTimesliceNames) : undefined,

			this.request.options.includeErrorRate && metricTimesliceNames?.length
				? this.getMethodErrorCount(metricTimesliceNames)
				: undefined,
		]);

		// Consolidate throughput per method
		const sampleSizeHolder = new SampleSizeHolder();
		if (sampleSizeResponse) {
			sampleSizeResponse.actor.account.spans.results.forEach(e => {
				sampleSizeHolder.set(e.facet, { span: e.sampleSize });
			});
			sampleSizeResponse.actor.account.metrics.results.forEach(e => {
				if (!sampleSizeHolder.has([e.facet])) {
					sampleSizeHolder.set([e.facet], {});
				}
				const sampleSize = sampleSizeHolder.get([e.facet]);
				sampleSize!.metric = e.sampleSize;
			});
		}

		const durationsMetric = averageDurationResponse?.actor?.account?.metrics;
		const durationsSpan = averageDurationResponse?.actor?.account?.spans;
		const durationsConsolidated: DurationsConsolidated[] = [];
		const errorCountsMetric = errorRateResponse?.actor?.account?.metrics;
		const errorCountsSpan = errorRateResponse?.actor?.account?.spans;
		const errorRatesConsolidated: ErrorRateConsolidated[] = [];
		const sampleSizesMetric = sampleSizeResponse?.actor?.account?.metrics;
		const sampleSizesSpan = sampleSizeResponse?.actor?.account?.spans;
		const sampleSizesConsolidated: SampleSizeConsolidated[] = [];
		for (const metricTimesliceFacet of sampleSizeHolder.keys()) {
			const sampleSizeInfo = sampleSizeHolder.get(metricTimesliceFacet);
			const sampleSizeMetricValue = sampleSizeInfo?.metric || 0;
			const sampleSizeSpanValue = sampleSizeInfo?.span || 0;
			const canUseMetric = true; // sampleSizeMetric > 30;
			const canUseSpan = true; // sampleSizeSpan > 30;
			// prefer metric if it can be used (min 1rpm) and it's at least 80% of span throughput
			const preferMetric = canUseMetric && sampleSizeMetricValue / sampleSizeSpanValue > 0.8;

			let duration: DurationsConsolidated | undefined;
			let errorRate: ErrorRateConsolidated | undefined;
			let sampleSize: SampleSizeConsolidated | undefined;
			if (preferMetric && canUseMetric) {
				const sampleSizeMetric = sampleSizesMetric?.results?.find(_ =>
					isSameMethod([_.facet], metricTimesliceFacet)
				);
				const durationMetric = durationsMetric?.results?.find(_ =>
					isSameMethod([_.facet], metricTimesliceFacet)
				);
				const errorCountMetric = errorCountsMetric?.results?.find(_ =>
					isSameMethod([_.facet], metricTimesliceFacet)
				);
				if (sampleSizeMetric) {
					sampleSize = {
						facet: [sampleSizeMetric.facet],
						sampleSize: sampleSizeMetric.sampleSize,
						source: "metric",
					};
				}
				duration = durationMetric
					? { facet: [durationMetric.facet], averageDuration: durationMetric.averageDuration }
					: undefined;
				if (errorCountMetric != undefined) {
					errorRate = {
						facet: [errorCountMetric.facet],
						errorRate: errorCountMetric.errorCount / sampleSizeMetricValue,
					};
				}
			}
			if (canUseSpan && (!preferMetric || !duration)) {
				const sampleSizeSpan = sampleSizesSpan?.results?.find(_ =>
					isSameMethod(_.facet, metricTimesliceFacet)
				);
				const durationSpan = durationsSpan?.results?.find(_ =>
					isSameMethod(_.facet, metricTimesliceFacet)
				);
				const errorCountSpan = errorCountsSpan?.results?.find(_ =>
					isSameMethod(_.facet, metricTimesliceFacet)
				);
				if (sampleSizeSpan) {
					sampleSize = {
						...sampleSizeSpan,
						source: "span",
					};
				}
				duration = durationSpan;
				if (errorCountSpan) {
					errorRate = {
						...errorCountSpan,
						errorRate: errorCountSpan.errorCount / sampleSizeSpanValue,
					};
				}
			}

			if (sampleSize) {
				sampleSizesConsolidated.push(sampleSize);
			}
			if (duration) {
				durationsConsolidated.push(duration);
			}
			if (errorRate) {
				errorRatesConsolidated.push(errorRate);
			}
		}
		// FIXME deduplicate
		let averageDurationEnhancedTimeslices: EnhancedMetricTimeslice[] = [];
		let averageDurationApiResponse: AverageDurationApiResponse | undefined = undefined;
		if (averageDurationResponse) {
			averageDurationApiResponse = {
				results: durationsConsolidated,
				metadata:
					averageDurationResponse.actor.account.metrics.metadata ||
					averageDurationResponse.actor.account.extrapolations.metadata,
			};
			const addedMethodName = this.addMethodName(
				groupedByTransactionName,
				averageDurationApiResponse.results
			);
			averageDurationEnhancedTimeslices = addedMethodName.filter(_ => _ !== null && _.functionName);

			if (this.request?.locator?.functionName) {
				averageDurationEnhancedTimeslices = averageDurationEnhancedTimeslices.filter(
					r => r.functionName === this.request?.locator?.functionName
				);
			}
		}

		let errorRateApiResponse: ErrorRateApiResponse | undefined = undefined;
		let errorRateEnhancedTimeslices: EnhancedMetricTimeslice[] = [];
		if (errorRateResponse) {
			errorRateApiResponse = {
				results: errorRatesConsolidated,
				metadata:
					errorRateResponse.actor.account.metrics.metadata ||
					errorRateResponse.actor.account.extrapolations.metadata,
			};
			errorRateEnhancedTimeslices = this.addMethodName(
				groupedByTransactionName,
				errorRateApiResponse.results
			).filter(_ => _ !== null && _.functionName);
			if (this.request?.locator?.functionName) {
				errorRateEnhancedTimeslices = errorRateEnhancedTimeslices.filter(
					r => r.functionName === this.request?.locator?.functionName
				);
			}
		}

		let sampleSizeEnhancedTimeslices: EnhancedMetricTimeslice[] = [];
		let sampleSizeApiResponse: SampleSizeApiResponse | undefined = undefined;
		if (sampleSizeResponse) {
			sampleSizeApiResponse = {
				results: sampleSizesConsolidated,
				metadata:
					sampleSizeResponse.actor.account.metrics.metadata ||
					sampleSizeResponse.actor.account.extrapolations.metadata,
			};
			sampleSizeEnhancedTimeslices = this.addMethodName(
				groupedByTransactionName,
				sampleSizeApiResponse.results
			).filter(_ => _ !== null && _.functionName);
			if (this.request?.locator?.functionName) {
				sampleSizeEnhancedTimeslices = sampleSizeEnhancedTimeslices.filter(
					r => r.functionName === this.request?.locator?.functionName
				);
			}
		}

		const fileLevelTelemetryAverageDuration: FileLevelTelemetryAverageDuration[] =
			averageDurationEnhancedTimeslices.map((metric: EnhancedMetricTimeslice) => {
				const response: FileLevelTelemetryAverageDuration = {
					facet: metric.facet,
					namespace: metric.namespace,
					className: metric.className,
					lineno: metric.lineno,
					column: metric.column,
					functionName: metric.functionName!,
					commit: metric.commit,
					averageDuration: metric.averageDuration!,
				};
				return response;
			});

		const fileLevelTelemetryErrorRate: FileLevelTelemetryErrorRate[] =
			errorRateEnhancedTimeslices.map((metric: EnhancedMetricTimeslice) => {
				const response: FileLevelTelemetryErrorRate = {
					facet: metric.facet,
					namespace: metric.namespace,
					className: metric.className,
					lineno: metric.lineno,
					column: metric.column,
					functionName: metric.functionName!,
					commit: metric.commit,
					errorRate: metric.errorRate!,
				};
				return response;
			});

		const fileLevelTelemetrySampleSize: FileLevelTelemetrySampleSize[] =
			sampleSizeEnhancedTimeslices.map((metric: EnhancedMetricTimeslice) => {
				const response: FileLevelTelemetrySampleSize = {
					facet: metric.facet,
					namespace: metric.namespace,
					className: metric.className,
					lineno: metric.lineno,
					column: metric.column,
					functionName: metric.functionName!,
					commit: metric.commit,
					sampleSize: metric.sampleSize ?? 0,
					source: metric.source!,
				};
				return response;
			});

		const response: FLTResponse = {
			averageDuration: fileLevelTelemetryAverageDuration,
			sampleSize: fileLevelTelemetrySampleSize,
			errorRate: fileLevelTelemetryErrorRate,
		};
		return response;
	}

	async getSpans(): Promise<Span[]> {
		if (!this.relativeFilePath) return [];
		try {
			let bestMatchingCodeFilePath;
			if (this.resolutionMethod === "hybrid") {
				bestMatchingCodeFilePath = await this.getBestMatchingCodeFilePath();
			}

			for (const queryType of spanQueryTypes) {
				const query = generateSpanQuery(
					this.entityGuid,
					this.resolutionMethod,
					queryType,
					this.languageId,
					bestMatchingCodeFilePath || this.relativeFilePath,
					bestMatchingCodeFilePath ? undefined : this.request.locator
				);

				const response = await this.graphqlClient.query(query, {
					accountId: this.accountId!,
				});

				if (response?.actor?.account?.nrql?.results?.length) {
					Logger.log(
						`Resolved ${response?.actor?.account?.nrql?.results?.length} spans with ${queryType} query`
					);
					return response.actor.account.nrql.results;
				}
			}
		} catch (ex) {
			this.graphqlClient.errorLogIfNotIgnored(ex, "getSpans", { request: this.request });
			if (ex instanceof GraphqlNrqlError) {
				throw ex;
			}
		}
		Logger.warn("getSpans none", {
			locator: this.request.locator,
			resolutionMethod: this.resolutionMethod,
			relativeFilePath: this.relativeFilePath,
			accountId: this.accountId,
		});
		return [];
	}

	private async getBestMatchingCodeFilePath(): Promise<string | undefined> {
		const parts = this.relativeFilePath.split("/");
		const reverseParts = parts.slice().reverse();
		const filename = parts[parts.length - 1];
		const nrql =
			`FROM Span SELECT latest(code.filepath) as codeFilePath` +
			` WHERE \`entity.guid\` = '${this.entityGuid}' AND \`code.filepath\` LIKE '%${filename}'` +
			` FACET name SINCE 30 minutes AGO LIMIT 100`;

		const results = await this.graphqlClient.runNrql<{
			name: string;
			codeFilePath: string;
		}>(this.accountId, nrql);
		if (!results.length) return undefined;
		let maxScore = 0;
		let bestMatch;
		for (const result of results) {
			const resultParts = result.codeFilePath.split("/");
			const reverseResultParts = resultParts.slice().reverse();
			const maxLength = Math.max(reverseParts.length, reverseResultParts.length);
			let score = 0;
			for (let i = 0; i < maxLength; i++) {
				if (reverseResultParts[i] === reverseParts[i]) {
					score++;
				} else {
					break;
				}
			}
			if (score > maxScore) {
				maxScore = score;
				bestMatch = result;
			}
		}
		return bestMatch?.codeFilePath;
	}

	async getMethodSampleSize(
		metricTimesliceNames: string[]
	): Promise<SampleSizeResponse | undefined> {
		const query = generateMethodSampleSizeQuery(
			this.languageId,
			this.entityGuid,
			metricTimesliceNames
		);
		try {
			return this.graphqlClient.query(query, {
				accountId: this.accountId,
			});
		} catch (ex) {
			this.graphqlClient.errorLogIfNotIgnored(ex, "getMethodThroughput", {
				request: this.request,
			});
			if (ex instanceof GraphqlNrqlError) {
				throw ex;
			}
		}
		return undefined;
	}

	async getMethodAverageDuration(
		metricTimesliceNames: string[]
	): Promise<MethodAverageDurationResponse | undefined> {
		const query = generateMethodAverageDurationQuery(
			this.languageId,
			this.entityGuid,
			metricTimesliceNames
		);
		try {
			return await this.graphqlClient.query(query, {
				accountId: this.accountId!,
			});
		} catch (ex) {
			this.graphqlClient.errorLogIfNotIgnored(ex, "getMethodAverageDuration", {
				request: this.request,
			});
			if (ex instanceof GraphqlNrqlError) {
				throw ex;
			}
		}
		return undefined;
	}

	async getMethodErrorCount(
		metricTimesliceNames: string[]
	): Promise<ErrorRateResponse | undefined> {
		const query = generateMethodErrorRateQuery(
			this.languageId,
			this.entityGuid,
			metricTimesliceNames
		);
		try {
			return this.graphqlClient.query(query, {
				accountId: this.accountId,
			});
		} catch (ex) {
			this.graphqlClient.errorLogIfNotIgnored(ex, "getMethodErrorRate", { request: this.request });
			if (ex instanceof GraphqlNrqlError) {
				throw ex;
			}
		}
		return undefined;
	}

	private applyLanguageFilter(spans: Span[]): Span[] {
		switch (this.languageId) {
			case "ruby":
				// MessageBroker is a top level message broker for ruby - there is a separate function level span that we show
				return spans
					.filter(
						span =>
							!span.name?.startsWith("MessageBroker/") &&
							!span.name?.startsWith("ActiveJob/Async/Queue/Produce/")
					)
					.map(span => {
						if (span.name?.startsWith("Nested/Controller")) {
							span.name = span.name?.replace("Nested/", "");
						}
						return span;
					});
			default:
				return spans;
		}
	}

	addMethodName(
		groupedByTransactionName: Index<Span[]>,
		metricTimeslices: MetricTimeslice[]
	): EnhancedMetricTimeslice[] {
		return metricTimeslices.reduce<EnhancedMetricTimeslice[]>((enhTimslices, metricTimeslice) => {
			const additionalMetadata: AdditionalMetadataInfo = {};
			const facetKey = `${this.timesliceNameMap(metricTimeslice.facet[0])}|${
				metricTimeslice.facet[1] ?? "null"
			}|${metricTimeslice.facet[2] ?? "null"}`;
			let metadata = groupedByTransactionName[facetKey];
			if (!metadata) {
				// Search on just the metricTimesliceName without lineno / colno for metrics source
				const key = Object.keys(groupedByTransactionName).find(facetKeys => {
					const parts = facetKeys.split("|");
					return parts[0] === this.timesliceNameMap(metricTimeslice.facet[0]);
				});
				if (key) {
					metadata = groupedByTransactionName[key];
				}
			}
			if (metadata) {
				[
					"tags.commit",
					"code.lineno",
					"code.column",
					"traceId",
					"transactionId",
					"code.namespace",
					"code.function",
				].forEach(_ => {
					// TODO this won't work for lambdas
					if (_) {
						additionalMetadata[_ as keyof AdditionalMetadataInfo] = (metadata[0] as any)[_];
					}
				});
			}

			let functionInfo: FunctionInfo | undefined = undefined;
			const codeNamespace = additionalMetadata["code.namespace"];
			const codeFunction = additionalMetadata["code.function"];
			const commit = additionalMetadata["tags.commit"];
			switch (this.languageId) {
				case "ruby":
					functionInfo = this.parseRubyFunctionCoordinates(metricTimeslice.facet[0], codeNamespace);
					break;
				case "python":
					functionInfo = this.parsePythonFunctionCoordinates(metricTimeslice.facet[0]);
					break;
				case "csharp":
					if (codeNamespace && codeFunction) {
						functionInfo = this.parseCSharpFunctionCoordinates(codeNamespace, codeFunction);
					}
					break;
				case "java":
				case "kotlin":
				case "go":
				case "php":
				case "javascript":
				case "typescript":
				case "typescriptreact":
				case "javascriptreact":
					functionInfo = {
						functionName: additionalMetadata["code.function"],
						className: additionalMetadata["code.namespace"],
						lineno: additionalMetadata["code.lineno"]
							? Number(additionalMetadata["code.lineno"])
							: undefined,
						column: additionalMetadata["code.column"]
							? Number(additionalMetadata["code.column"])
							: undefined,
						commit,
					};
					break;
			}

			if (!functionInfo) {
				return enhTimslices;
			}

			const { className, namespace, lineno, column } = functionInfo;
			let functionName = functionInfo.functionName;

			// Use Agent provided function name if available
			if (additionalMetadata["code.function"] && additionalMetadata["code.function"]?.length > 0) {
				functionName = additionalMetadata["code.function"];
			}

			if (namespace) {
				additionalMetadata["code.namespace"] = namespace;
			}

			const enhTimeslice = {
				...metricTimeslice,
				metadata: additionalMetadata,
				namespace: additionalMetadata["code.namespace"],
				className,
				functionName,
				lineno,
				column,
				commit,
			};
			enhTimslices.push(enhTimeslice);
			return enhTimslices;
		}, []);
	}

	parseCSharpFunctionCoordinates(namespace: string, functionName: string): FunctionInfo {
		const split = namespace.split(".");
		const className = split[split.length - 1];
		const theNamespace = split.slice(0, split.length - 1).join(".");
		return {
			className,
			namespace: theNamespace,
			functionName: functionName,
		};
	}

	parsePythonFunctionCoordinates(coord: string): FunctionInfo {
		const indexOfColon = coord.indexOf(":");
		let functionName = indexOfColon > -1 ? coord.slice(indexOfColon + 1) : undefined;
		let className: string | undefined = undefined;
		if (functionName) {
			const indexOfDot = functionName ? functionName.indexOf(".") : -1;
			if (indexOfDot > -1) {
				// account for a className here
				const split = functionName.split(".");
				functionName = split.pop();
				if (split.length) {
					className = split.pop();
				}
			}
		} else if (coord.indexOf(".") > -1) {
			functionName = coord.split(".").pop();
		}
		return {
			functionName,
			className,
			namespace: undefined,
		};
	}

	parseRubyFunctionCoordinates(coord: string, namespace?: string): FunctionInfo {
		if (coord.startsWith("Controller/")) {
			const functionName = coord.split("/").pop();
			const className = namespace;
			return {
				functionName,
				className,
			};
		}

		if (coord.startsWith("MessageBroker/ActiveJob")) {
			let myNamespace, className;
			if (namespace?.includes("::")) {
				[myNamespace, className] = namespace.split("::");
			} else {
				className = namespace;
			}
			return {
				namespace: myNamespace,
				className,
			};
		}

		if (!coord.includes("::")) {
			if (namespace?.includes("::")) {
				const [myNamespace, className] = namespace.split("::");
				return {
					namespace: myNamespace,
					className,
					functionName: coord,
				};
			}
			const parts = coord.split("/");
			if (parts.length > 1) {
				const functionName = parts.pop();
				const className = parts.pop();
				return {
					className,
					functionName,
				};
			} else {
				return {};
			}
		}

		const match = /\/(\w+)::(\w+)\/(\w+)/.exec(coord);
		if (!match) return {};
		return {
			namespace: match[1],
			className: match[2],
			functionName: match[3],
		};
	}

	timesliceNameMap(timesliceName: string): string {
		if (this.languageId === "python" || this.languageId === "csharp") {
			return timesliceName
				.replace("Errors/WebTransaction/", "")
				.replace("WebTransaction/", "")
				.replace("OtherTransaction/", "");
		} else {
			return timesliceName;
		}
	}
}

function isSameMethod(method1: string[], method2: string[]) {
	const method1Key = keyFromFacet(method1);
	const method2Key = keyFromFacet(method2);
	// Span name, code.lineno and code.column are same
	if (method1Key === method2Key) return true;

	// probably need some language-specific logic here
	const [spanName1, lineNo1, colNo1] = method1;
	const [spanName2, lineNo2, colNo2] = method2;
	const method1Parts = spanName1.split("/");
	const method2Parts = spanName2.split("/");
	return (
		method1Parts[method1Parts.length - 1] === method2Parts[method2Parts.length - 1] &&
		lineNo1 === lineNo2 &&
		colNo1 === colNo2
	);
}
