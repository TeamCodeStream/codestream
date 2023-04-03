import { Container, SessionContainer } from "../../container";
import {
	AgentFilterNamespacesRequestType,
	DetectionMethod,
	GetObservabilityAnomaliesRequest,
	GetObservabilityAnomaliesResponse,
	ObservabilityAnomaly,
} from "@codestream/protocols/agent";
import { INewRelicProvider, NewRelicProvider } from "../newrelic";

interface NameValue {
	name: string;
	value: number;
}

interface Anomaly {
	name: string;
	oldValue: number;
	newValue: number;
	ratio: number;
}

export class AnomalyDetector {
	constructor(
		private _request: GetObservabilityAnomaliesRequest,
		private _provider: INewRelicProvider
	) {
		this._dataTimeFrame = `SINCE ${_request.sinceDaysAgo} days AGO`;
		this._baselineTimeFrame = `SINCE ${
			_request.sinceDaysAgo + _request.baselineDays
		} days AGO UNTIL ${_request.sinceDaysAgo} days AGO`;
		this._accountId = NewRelicProvider.parseId(_request.entityGuid)!.accountId;
	}

	private _dataTimeFrame;
	private readonly _baselineTimeFrame;
	private readonly _accountId;
	private _totalDays = 0;

	async execute(): Promise<GetObservabilityAnomaliesResponse> {
		this._totalDays =
			parseInt(this._request.sinceDaysAgo as any) + parseInt(this._request.baselineDays as any);
		let detectionMethod: DetectionMethod = "Time Based";
		if (this._request.sinceReleaseAtLeastDaysAgo) {
			const deployments = (
				await this._provider.getDeployments({
					entityGuid: this._request.entityGuid,
					since: `60 days ago UNTIL ${this._request.sinceReleaseAtLeastDaysAgo} days ago`,
				})
			).deployments;
			const deployment = deployments[deployments.length - 1];
			if (deployment) {
				detectionMethod = "Release Based";
				const deploymentDate = new Date(deployment.seconds * 1000);
				const now = new Date();
				const timeDifference = now.getTime() - deploymentDate.getTime();
				const daysDifference = Math.round(timeDifference / (1000 * 60 * 60 * 24));
				this._dataTimeFrame = `SINCE ${daysDifference} days AGO`;
				this._totalDays = daysDifference + parseInt(this._request.baselineDays as any);
			}
		}

		const includeSpans = this._request.includeSpans || true;
		const minimumErrorRate = this._request.minimumErrorRate || 0.001;
		const minimumResponseTime = this._request.minimumResponseTime || 1;
		const minimumSampleRate = this._request.minimumSampleRate || 1;

		const sampleRatesMetricLookup =
			"(metricTimesliceName LIKE 'Java/%' OR metricTimesliceName LIKE 'Custom/%')";
		const sampleRatesMetric = await this.getSampleRateMetric(sampleRatesMetricLookup);
		const metricRoots = this.getCommonRoots(sampleRatesMetric.map(_ => _.name));
		const metricLookup = metricRoots.length
			? metricRoots.map(_ => `\`metricTimesliceName\` LIKE '%${_}%'`).join(" OR ")
			: undefined;

		let totalSpans = 0;
		let sampleRatesSpan: NameValue[] = [];
		let spanLookup = undefined;
		if (includeSpans) {
			const sampleRatesSpanLookup = "(name LIKE 'Java/%' OR name LIKE 'Custom/%')";
			sampleRatesSpan = await this.getSampleRateSpan(sampleRatesSpanLookup);
			totalSpans = sampleRatesSpan.length;
			const spanRoots = this.getCommonRoots(sampleRatesSpan.map(_ => _.name));
			spanLookup = spanRoots.length
				? spanRoots.map(_ => `name LIKE '${_}%'`).join(" OR ")
				: undefined;
		}

		const consolidatedSampleRates = this.consolidateSampleRates(sampleRatesMetric, sampleRatesSpan);
		if (!metricLookup || !spanLookup) {
			return {
				responseTime: [],
				errorRate: [],
			};
		}

		const responseTimeAnomalies = await this.getResponseTimeAnomalies(
			metricLookup,
			spanLookup,
			sampleRatesMetric,
			sampleRatesSpan,
			consolidatedSampleRates,
			minimumResponseTime,
			minimumSampleRate
		);

		const errorRateAnomalies = await this.getErrorRateAnomalies(
			metricLookup,
			spanLookup,
			sampleRatesMetric,
			sampleRatesSpan,
			consolidatedSampleRates,
			minimumErrorRate,
			minimumSampleRate
		);

		const telemetry = Container.instance().telemetry;

		const event = {
			"Total Methods": totalSpans,
			"Anomalous Error Methods": responseTimeAnomalies.length,
			"Anomalous Duration Methods": errorRateAnomalies.length,
		};
		telemetry?.track({
			eventName: "CLM Anomalies Calculated",
			properties: event,
		});

		return {
			responseTime: responseTimeAnomalies,
			errorRate: errorRateAnomalies,
			detectionMethod,
		};
	}

	private async getResponseTimeAnomalies(
		lookupMetric: string,
		lookupSpan: string,
		sampleRatesMetric: NameValue[],
		sampleRatesSpan: NameValue[],
		consolidatedSampleRates: Map<string, { span?: NameValue; metric?: NameValue }>,
		minimumResponseTime: number,
		minimumSampleRate: number
	): Promise<ObservabilityAnomaly[]> {
		const metricData = await this.getResponseTimeMetric(lookupMetric, this._dataTimeFrame);
		const metricBaseline = await this.getResponseTimeMetric(lookupMetric, this._baselineTimeFrame);
		const metricFilter = this.getSampleRateFilterPredicate(sampleRatesMetric, minimumSampleRate);
		const filteredMetricData = metricData.filter(metricFilter);
		const filteredMetricBaseline = metricBaseline.filter(metricFilter);
		const metricComparison = this.compareData(filteredMetricData, filteredMetricBaseline);

		// const spanData = await this.getResponseTimeSpan(lookupSpan, this._dataTimeFrame);
		// const spanBaseline = await this.getResponseTimeSpan(lookupSpan, this._baselineTimeFrame);
		// const spanFilter = this.getSampleRateFilterPredicate(sampleRatesSpan, minimumSampleRate);
		// const filteredSpanData = spanData.filter(spanFilter);
		// const filteredSpanBaseline = spanBaseline.filter(spanFilter);
		// const spanComparison = this.compareData(filteredSpanData, filteredSpanBaseline);

		const consolidatedComparison = this.consolidateComparisons(
			consolidatedSampleRates,
			metricComparison,
			[]
			// spanComparison
		).filter(_ => _.ratio > 1 && _.newValue > minimumResponseTime);

		return consolidatedComparison.map(_ => this.comparisonToAnomaly(_));
	}

	private async getErrorRateAnomalies(
		lookupMetric: string,
		lookupSpan: string,
		sampleRatesMetric: NameValue[],
		sampleRatesSpan: NameValue[],
		consolidatedSampleRates: Map<string, { span?: NameValue; metric?: NameValue }>,
		minimumErrorRate: number,
		minimumSampleRate: number
	) {
		const metricData = await this.getErrorRateMetric(lookupMetric, this._dataTimeFrame);
		const metricBaseline = await this.getErrorRateMetric(lookupMetric, this._baselineTimeFrame);
		const metricFilter = this.getSampleRateFilterPredicate(sampleRatesMetric, minimumSampleRate);
		const metricTransformer = this.getErrorRateTransformer(sampleRatesMetric);
		const filteredMetricData = metricData.filter(metricFilter).map(metricTransformer);
		const filteredMetricBaseline = metricBaseline.filter(metricFilter).map(metricTransformer);
		const metricComparison = this.compareData(filteredMetricData, filteredMetricBaseline);

		// const spanData = await this.getErrorRateSpan(lookupSpan, this._dataTimeFrame);
		// const spanBaseline = await this.getErrorRateSpan(lookupSpan, this._baselineTimeFrame);
		// const spanFilter = this.getSampleRateFilterPredicate(sampleRatesSpan, minimumSampleRate);
		// const spanTransformer = this.getErrorRateTransformer(sampleRatesSpan);
		// const filteredSpanData = spanData.filter(spanFilter).map(spanTransformer);
		// const filteredSpanBaseline = spanBaseline.filter(spanFilter).map(spanTransformer);
		// const spanComparison = this.compareData(filteredSpanData, filteredSpanBaseline);

		const consolidatedComparisons = this.consolidateComparisons(
			consolidatedSampleRates,
			metricComparison,
			[]
			// spanComparison
		).filter(_ => _.ratio > 1 && _.newValue > minimumErrorRate);

		return consolidatedComparisons.map(_ => this.comparisonToAnomaly(_));
	}

	private getSampleRateFilterPredicate(sampleRates: NameValue[], minimumSampleRate: number) {
		return (data: NameValue) => {
			const sampleRate = sampleRates.find(sampleRate => data.name === sampleRate.name);
			return sampleRate && sampleRate.value >= minimumSampleRate;
		};
	}

	private getErrorRateTransformer(sampleRates: NameValue[]) {
		return (data: NameValue) => {
			const sampleRate = sampleRates.find(sampleRate => data.name === sampleRate.name);
			return {
				name: data.name,
				value: data.value / (sampleRate?.value || 1),
			};
		};
	}

	private consolidateComparisons(
		consolidatedSampleRates: Map<
			string,
			{
				span?: NameValue;
				metric?: NameValue;
			}
		>,
		metricComparisons: {
			name: string;
			oldValue: number;
			newValue: number;
			ratio: number;
		}[],
		spanComparisons: {
			name: string;
			oldValue: number;
			newValue: number;
			ratio: number;
		}[]
	) {
		const consolidatedComparisons: {
			name: string;
			source: string;
			oldValue: number;
			newValue: number;
			ratio: number;
		}[] = [];

		for (const [symbolStr, consolidatedSampleRate] of consolidatedSampleRates.entries()) {
			const useMetric =
				consolidatedSampleRate.metric &&
				(!consolidatedSampleRate.span ||
					consolidatedSampleRate.metric.value / consolidatedSampleRate.span.value >= 0.8);
			if (useMetric) {
				const metricComparison = metricComparisons.find(_ => {
					const symbol = this.extractSymbol(_.name);
					const mySymbolStr = symbol.className + "/" + symbol.functionName;
					return symbolStr === mySymbolStr;
				});
				if (metricComparison) {
					consolidatedComparisons.push({
						...metricComparison,
						source: "metric",
					});
				}
			} else {
				// const spanComparison = spanComparisons.find(_ => {
				// 	const symbol = this.extractSymbol(_.name);
				// 	const mySymbolStr = symbol.className + "/" + symbol.functionName;
				// 	return symbolStr === mySymbolStr;
				// });
				// if (spanComparison) {
				// 	consolidatedComparisons.push({
				// 		...spanComparison,
				// 		source: "span",
				// 	});
				// }
			}
		}

		consolidatedComparisons.sort((a, b) => b.ratio - a.ratio);
		return consolidatedComparisons;
	}

	private consolidateSampleRates(sampleRatesMetric: NameValue[], sampleRatesSpan: NameValue[]) {
		const consolidatedSampleRates = new Map<
			string,
			{
				span?: NameValue;
				metric?: NameValue;
			}
		>();

		for (const sampleRate of sampleRatesMetric) {
			if (sampleRate.value < 1) {
				continue;
			}
			const symbol = this.extractSymbol(sampleRate.name);
			const symbolStr = symbol.className + "/" + symbol.functionName;
			consolidatedSampleRates.set(symbolStr, { metric: sampleRate });
		}

		for (const sampleRate of sampleRatesSpan) {
			if (sampleRate.value < 1) {
				continue;
			}
			const symbol = this.extractSymbol(sampleRate.name);
			const symbolStr = symbol.className + "/" + symbol.functionName;
			const consolidatedSampleRate = consolidatedSampleRates.get(symbolStr) || {};
			consolidatedSampleRate.span = sampleRate;
			consolidatedSampleRates.set(symbolStr, consolidatedSampleRate);
		}
		return consolidatedSampleRates;
	}

	getCommonRoots(namespaces: string[]): string[] {
		const namespaceTree = new Map<string, any>();
		for (const namespace of namespaces) {
			const parts = namespace.split(".");
			let node: Map<string, any> = namespaceTree;
			for (const part of parts) {
				if (!node.has(part)) {
					node.set(part, new Map<string, any>());
				}
				node = node.get(part);
			}
		}

		const commonRoots: string[] = [];
		namespaceTree.forEach((value: any, key: string) => {
			const parts = [key];
			let node: Map<string, any> = value;
			while (node.size === 1) {
				const onlyChild = Array.from(node.entries())[0];
				parts.push(onlyChild[0]);
				node = onlyChild[1];
			}
			commonRoots.push(parts.join("."));
		});

		return commonRoots;
	}

	private formatAnomalies(anomalies: Anomaly[]) {
		return anomalies.map(_ => this.formatAnomaly(_));
	}

	private formatAnomaly(anomaly: Anomaly) {
		// const variation = (anomaly.ratio - 1) * 100;
		// const formattedVariation = (Math.round(variation * 100) / 100).toFixed(2);
		const formattedName = anomaly.name.replace(/(^Custom\/|Java\/)/gi, "");
		// const text = formattedName + (variation > 0 ? " +" : " ") + formattedVariation + "%";
		// return text;
		return formattedName;
	}

	private compareData(data: NameValue[], baseline: NameValue[]) {
		const comparisonMap = this.comparisonMap(data, baseline);
		const comparisonArray: {
			name: string;
			oldValue: number;
			newValue: number;
			ratio: number;
		}[] = [];
		comparisonMap.forEach((value, key) => {
			if (value.oldValue && value.newValue && value.ratio) {
				comparisonArray.push({
					name: key,
					oldValue: value.oldValue,
					newValue: value.newValue,
					ratio: value.ratio,
				});
			}
		});
		comparisonArray.sort((a, b) => b.ratio - a.ratio);
		return comparisonArray;
	}

	private comparisonMap(data: NameValue[], baseline: NameValue[]) {
		const map = new Map<string, { oldValue?: number; newValue?: number; ratio?: number }>();
		for (const d of data) {
			map.set(d.name, { newValue: d.value });
		}
		for (const b of baseline) {
			const comparison = map.get(b.name);
			if (comparison && comparison.newValue) {
				comparison.oldValue = b.value;
				comparison.ratio = comparison.newValue / comparison.oldValue;
			}
		}
		return map;
	}

	private getResponseTimeSpan(lookup: string, timeFrame: string): Promise<NameValue[]> {
		const query =
			`SELECT average(duration) * 1000 AS 'value' ` +
			`FROM Span WHERE \`entity.guid\` = '${this._request.entityGuid}' AND (${lookup}) FACET name ` +
			`${timeFrame} LIMIT MAX`;
		return this.runNrql(query);
	}

	getResponseTimeMetric(lookup: string, timeFrame: string): Promise<NameValue[]> {
		const query =
			`SELECT average(newrelic.timeslice.value) * 1000 AS 'value' ` +
			`FROM Metric WHERE \`entity.guid\` = '${this._request.entityGuid}' AND (${lookup}) FACET metricTimesliceName AS name ` +
			`${timeFrame} LIMIT MAX`;
		return this.runNrql(query);
	}

	private getErrorRateSpan(lookup: string, timeFrame: string): Promise<NameValue[]> {
		const query =
			`SELECT rate(count(*), 1 minute) AS 'value' ` +
			`FROM Span WHERE \`entity.guid\` = '${this._request.entityGuid}' AND \`error.group.guid\` IS NOT NULL AND (${lookup}) FACET name ` +
			`${timeFrame} LIMIT MAX`;
		return this.runNrql(query);
	}

	private async getErrorRateMetric(lookup: string, timeFrame: string): Promise<NameValue[]> {
		const query =
			`SELECT rate(count(apm.service.transaction.error.count), 1 minute) AS 'value' ` +
			`FROM Metric WHERE \`entity.guid\` = '${this._request.entityGuid}' AND (${lookup}) FACET metricTimesliceName AS name ` +
			`${timeFrame} LIMIT MAX`;
		return this.runNrql(query);
	}

	private async getSampleRateSpan(lookup: string): Promise<NameValue[]> {
		const timeFrame = "SINCE 30 minutes ago";
		const query =
			`SELECT rate(count(*), 1 minute) AS 'value' ` +
			`FROM Span WHERE \`entity.guid\` = '${this._request.entityGuid}' AND (${lookup}) FACET name ` +
			`${timeFrame} LIMIT MAX`;

		const sampleRates = await this.runNrql<NameValue>(query);
		const filteredSampleRates = await this.filterSampleRates(sampleRates);
		return filteredSampleRates;
	}

	private async filterSampleRates(sampleRates: NameValue[]) {
		const classNames = await this.extractClassNames(sampleRates.map(_ => _.name));
		const { filteredNamespaces } = await SessionContainer.instance().session.agent.sendRequest(
			AgentFilterNamespacesRequestType,
			{
				namespaces: classNames,
			}
		);

		const filteredSampleRates = sampleRates.filter(sampleRate =>
			filteredNamespaces.some(namespace => sampleRate.name.indexOf(namespace) >= 0)
		);
		return filteredSampleRates;
	}

	private async getSampleRateMetric(lookup: string): Promise<NameValue[]> {
		const timeFrame = "SINCE 30 minutes ago";
		const query =
			`SELECT rate(count(newrelic.timeslice.value), 1 minute) AS 'value' ` +
			`FROM Metric WHERE \`entity.guid\` = '${this._request.entityGuid}' AND (${lookup}) FACET metricTimesliceName AS name ` +
			`${timeFrame} LIMIT MAX`;
		const sampleRates = await this.runNrql<NameValue>(query);
		const filteredSampleRates = await this.filterSampleRates(sampleRates);
		return filteredSampleRates;
	}

	private async extractClassNames(rawNames: string[]) {
		return rawNames.map(_ => {
			const symbol = this.extractSymbol(_);
			return symbol.className;
		});
	}

	extractSymbol(rawName: string) {
		const parts = rawName.split("/");
		const functionName = parts[parts.length - 1];
		const className = parts[parts.length - 2];
		return {
			className,
			functionName,
		};
	}

	private runNrql<T>(nrql: string): Promise<T[]> {
		return this._provider.runNrql(this._accountId, nrql, 400);
	}

	private comparisonToAnomaly(comparison: {
		name: string;
		source: string;
		oldValue: number;
		newValue: number;
		ratio: number;
	}): ObservabilityAnomaly {
		const symbol = this.extractSymbol(comparison.name);
		return {
			...comparison,
			...symbol,
			text: this.formatAnomaly(comparison),
			totalDays: this._totalDays,
		};
	}
}
