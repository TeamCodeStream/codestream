import {
	FileLevelTelemetryAverageDuration,
	FileLevelTelemetryErrorRate,
	FileLevelTelemetrySampleSize,
	GetFileLevelTelemetryRequest,
} from "@codestream/protocols/agent";
import { Logger } from "../../../logger";
import { FLTStrategy } from "./FLTStrategy";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";

interface NameValue {
	name: string;
	value: number;
}

export interface FLTNameInferenceSymbol {
	namespace?: string;
	className?: string;
	functionName: string;
	equals(symbol: FLTNameInferenceSymbol): boolean;
}

export abstract class FLTNameInferenceStrategy implements FLTStrategy {
	constructor(
		protected entityGuid: string,
		protected accountId: number,
		protected relativeFilePath: string,
		protected request: GetFileLevelTelemetryRequest,
		private graphqlClient: NewRelicGraphqlClient
	) {}

	abstract getMetricLookup(): string;
	abstract getSpanLookup(): string;
	abstract getMetricErrorLookup(): string;
	abstract extractSymbol(metricName: string): FLTNameInferenceSymbol;

	async execute() {
		try {
			const metricLookup = this.getMetricLookup();
			const spanLookup = this.getSpanLookup();
			const metricErrorLookup = this.getMetricErrorLookup();
			const sampleSizesSpan = await this.getSampleSizeSpan(spanLookup);
			const sampleSizesMetric = await this.getSampleSizeMetric(metricLookup);
			const averageDurationsSpan = await this.getAverageDurationSpan(spanLookup);
			const averageDurationsMetric = await this.getAverageDurationMetric(metricLookup);
			const errorRatesSpan = await this.getErrorRateSpan(spanLookup, sampleSizesSpan);
			const errorRatesMetric = await this.getErrorRateMetric(metricErrorLookup, sampleSizesMetric);

			const classMethodNames = new Set<string>();
			[...sampleSizesMetric, ...sampleSizesSpan].forEach(_ => {
				classMethodNames.add(_.className + "/" + _.functionName);
			});
			const sampleSize: FileLevelTelemetrySampleSize[] = [];
			const averageDuration: FileLevelTelemetryAverageDuration[] = [];
			const errorRate: FileLevelTelemetryErrorRate[] = [];
			classMethodNames.forEach(_ => {
				const [className, functionName] = _.split("/");
				const sampleSizeSpan = sampleSizesSpan.find(
					_ => _.className === className && _.functionName === functionName
				);
				const sampleSizeMetric = sampleSizesMetric.find(
					_ => _.className === className && _.functionName === functionName
				);
				if (
					sampleSizeMetric &&
					(!sampleSizeSpan || sampleSizeMetric.sampleSize / sampleSizeSpan.sampleSize >= 0.8)
				) {
					sampleSize.push(sampleSizeMetric);
					const averageDurationMetric = averageDurationsMetric.find(
						_ => _.className === className && _.functionName === functionName
					);
					if (averageDurationMetric) {
						averageDuration.push(averageDurationMetric);
					}
					const errorRateMetric = errorRatesMetric.find(
						_ => _.className === className && _.functionName === functionName
					);
					if (errorRateMetric) {
						errorRate.push(errorRateMetric);
					}
				} else if (sampleSizeSpan) {
					sampleSize.push(sampleSizeSpan);
					const averageDurationSpan = averageDurationsSpan.find(
						_ => _.className === className && _.functionName === functionName
					);
					if (averageDurationSpan) {
						averageDuration.push(averageDurationSpan);
					}
					const errorRateSpan = errorRatesSpan.find(
						_ => _.className === className && _.functionName === functionName
					);
					if (errorRateSpan) {
						errorRate.push(errorRateSpan);
					}
				}
			});

			return {
				averageDuration,
				errorRate,
				sampleSize,
			};
		} catch (ex) {
			Logger.error(ex);
			return {
				averageDuration: [],
				errorRate: [],
				sampleSize: [],
			};
		}
	}

	private readonly _timeFrame = "SINCE 30 minutes AGO";

	private async getAverageDurationSpan(
		lookup: string
	): Promise<FileLevelTelemetryAverageDuration[]> {
		const query =
			`SELECT average(duration) * 1000 AS 'value' ` +
			`FROM Span WHERE \`entity.guid\` = '${this.entityGuid}' AND (${lookup}) FACET name ` +
			`${this._timeFrame} LIMIT MAX`;
		const results = await this.runNrql<NameValue>(query);
		return results.map(_ => this.toFileLevelAverageDuration(_));
	}

	private async getAverageDurationMetric(
		lookup: string
	): Promise<FileLevelTelemetryAverageDuration[]> {
		const query =
			`SELECT average(newrelic.timeslice.value) * 1000 AS 'value' ` +
			`FROM Metric WHERE \`entity.guid\` = '${this.entityGuid}' AND (${lookup}) FACET metricTimesliceName AS name ` +
			`${this._timeFrame} LIMIT MAX`;
		const results = await this.runNrql<NameValue>(query);
		return results.map(_ => this.toFileLevelAverageDuration(_));
	}

	toFileLevelAverageDuration(record: NameValue): FileLevelTelemetryAverageDuration {
		const symbol = this.extractSymbol(record.name);
		return {
			...symbol,
			averageDuration: record.value,
			facet: [record.name], // facet is [metricTimesliceName, lineno, colno]
		};
	}

	private async getErrorRateSpan(
		lookup: string,
		sampleSizes: FileLevelTelemetrySampleSize[]
	): Promise<FileLevelTelemetryErrorRate[]> {
		const query =
			`SELECT count(*) AS 'value' ` +
			`FROM Span WHERE \`entity.guid\` = '${this.entityGuid}' AND \`error.group.guid\` IS NOT NULL AND (${lookup}) FACET name ` +
			`${this._timeFrame} LIMIT MAX`;
		const results = await this.runNrql<NameValue>(query);
		return results.map(_ => this.toFileLevelErrorRate(_, sampleSizes));
	}

	private async getErrorRateMetric(
		lookup: string,
		sampleSizes: FileLevelTelemetrySampleSize[]
	): Promise<FileLevelTelemetryErrorRate[]> {
		const query =
			`SELECT count(apm.service.transaction.error.count) AS 'value' ` +
			`FROM Metric WHERE \`entity.guid\` = '${this.entityGuid}' AND (${lookup}) FACET metricTimesliceName AS name ` +
			`${this._timeFrame} LIMIT MAX`;
		const results = await this.runNrql<NameValue>(query);
		return results.map(_ => this.toFileLevelErrorRate(_, sampleSizes));
	}

	toFileLevelErrorRate(
		record: NameValue,
		sampleSizes: FileLevelTelemetrySampleSize[]
	): FileLevelTelemetryErrorRate {
		const symbol = this.extractSymbol(record.name);
		const sampleSize = sampleSizes.find(_ => this.extractSymbol(_.facet[0]).equals(symbol));
		const errorRate = sampleSize ? record.value / sampleSize.sampleSize : 0;
		return {
			...symbol,
			errorRate,
			facet: [record.name], // facet is [metricTimesliceName, lineno, colno]
		};
	}

	private async getSampleSizeSpan(lookup: string): Promise<FileLevelTelemetrySampleSize[]> {
		const query =
			`SELECT count(*) AS 'value' ` +
			`FROM Span WHERE \`entity.guid\` = '${this.entityGuid}' AND (${lookup}) FACET name ` +
			`${this._timeFrame} LIMIT MAX`;

		const results = await this.runNrql<NameValue>(query);
		return results.map(_ => this.toFileLevelSampleSize(_, "span"));
	}

	private async getSampleSizeMetric(lookup: string): Promise<FileLevelTelemetrySampleSize[]> {
		const query =
			`SELECT count(newrelic.timeslice.value) AS 'value' ` +
			`FROM Metric WHERE \`entity.guid\` = '${this.entityGuid}' AND (${lookup}) FACET metricTimesliceName AS name ` +
			`${this._timeFrame} LIMIT MAX`;
		const results = await this.runNrql<NameValue>(query);
		return results.map(_ => this.toFileLevelSampleSize(_, "metric"));
	}

	toFileLevelSampleSize(record: NameValue, source: string): FileLevelTelemetrySampleSize {
		const symbol = this.extractSymbol(record.name);
		return {
			...symbol,
			sampleSize: record.value,
			facet: [record.name], // facet is [metricTimesliceName, lineno, colno]
			source,
		};
	}

	private runNrql<T>(nrql: string): Promise<T[]> {
		return this.graphqlClient.runNrql(this.accountId, nrql, 200);
	}
}
