import { Container, SessionContainer } from "../../container";
import {
	AgentFilterNamespacesRequestType,
	DetectionMethod,
	GetObservabilityAnomaliesRequest,
	GetObservabilityAnomaliesResponse,
	ObservabilityAnomaly,
	Named,
	NameValue,
	Comparison,
	SpanWithCodeAttrs,
	CodeAttributes,
	DidDetectObservabilityAnomaliesNotificationType,
} from "@codestream/protocols/agent";
import { INewRelicProvider, NewRelicProvider } from "../newrelic";
import { Logger } from "../../logger";
import { getStorage } from "../../storage";

export class AnomalyDetector {
	constructor(
		private _request: GetObservabilityAnomaliesRequest,
		private _provider: INewRelicProvider
	) {
		const sinceDaysAgo = parseInt(_request.sinceDaysAgo as any);
		const baselineDays = parseInt(_request.baselineDays as any);
		this._dataTimeFrame = `SINCE ${sinceDaysAgo} days AGO`;
		this._baselineTimeFrame = `SINCE ${
			sinceDaysAgo + baselineDays
		} days AGO UNTIL ${sinceDaysAgo} days AGO`;
		this._accountId = NewRelicProvider.parseId(_request.entityGuid)!.accountId;
		this._sinceDaysAgo = sinceDaysAgo;
	}

	private _dataTimeFrame;
	private _baselineTimeFrame;
	private readonly _accountId;
	private _totalDays = 0;
	private _benchmarkSampleSizeTimeFrame = "SINCE 30 minutes ago";
	private _sinceText = "";

	private _sinceDaysAgo;
	private _releaseBased = false;

	async execute(): Promise<GetObservabilityAnomaliesResponse> {
		const benchmarkMetrics = await this.getBenchmarkSampleSizesMetric();
		const languageSupport = this.getLanguageSupport(benchmarkMetrics);
		if (!languageSupport) {
			return {
				responseTime: [],
				errorRate: [],
				didNotifyNewAnomalies: false,
				isSupported: false,
			};
		}

		const benchmarkSpans = await this.getBenchmarkSampleSizesSpans();
		// Used to determine metric validity
		const benchmarkSampleSizes = this.consolidateBenchmarkSampleSizes(
			benchmarkMetrics,
			benchmarkSpans
		);

		const sinceDaysAgo = parseInt(this._request.sinceDaysAgo as any);
		this._totalDays = sinceDaysAgo + parseInt(this._request.baselineDays as any);
		this._sinceText = `${sinceDaysAgo} days ago`;
		let detectionMethod: DetectionMethod = "Time Based";
		if (this._request.sinceLastRelease) {
			const deployments = (
				await this._provider.getDeployments({
					entityGuid: this._request.entityGuid,
					since: `31 days ago`,
				})
			).deployments;
			const deployment = deployments[deployments.length - 1];
			if (deployment) {
				detectionMethod = "Release Based";
				const deploymentDate = new Date(deployment.seconds * 1000);
				const now = new Date();
				const timeSinceDeployment = now.getTime() - deploymentDate.getTime();
				const daysSinceDeployment = Math.round(timeSinceDeployment / (1000 * 60 * 60 * 24));
				this._sinceDaysAgo = daysSinceDeployment;
				this._releaseBased = true;
				this._dataTimeFrame = `SINCE ${daysSinceDeployment} days AGO`;
				const baselineDays = parseInt(this._request.baselineDays as any);
				this._baselineTimeFrame = `SINCE ${
					daysSinceDeployment + baselineDays
				} days AGO UNTIL ${daysSinceDeployment} days AGO`;
				this._totalDays = daysSinceDeployment + baselineDays;

				const options: Intl.DateTimeFormatOptions = {
					month: "short",
					day: "2-digit",
				};
				const formattedDate = new Intl.DateTimeFormat(undefined, options).format(deploymentDate);

				this._sinceText = `release ${deployment.version} on ${formattedDate}`;
			}
		}

		const { comparisons: durationComparisons, metricTimesliceNames } =
			await this.getAnomalousDurationComparisons(
				languageSupport,
				benchmarkSampleSizes,
				benchmarkSpans,
				this._request.minimumResponseTime,
				this._request.minimumSampleRate,
				this._request.minimumRatio
			);

		const { comparisons: errorRateComparisons, metricTimesliceNames: errorMetricTimesliceNames } =
			await this.getAnomalousErrorRateComparisons(
				languageSupport,
				benchmarkSampleSizes,
				benchmarkSpans,
				this._request.minimumErrorRate,
				this._request.minimumSampleRate,
				this._request.minimumRatio
			);

		const durationAnomalies = durationComparisons.map(_ =>
			this.durationComparisonToAnomaly(
				_,
				languageSupport,
				benchmarkSpans,
				errorMetricTimesliceNames
			)
		);
		const errorRateAnomalies = errorRateComparisons.map(_ =>
			this.errorRateComparisonToAnomaly(_, languageSupport, benchmarkSpans, metricTimesliceNames)
		);

		this.addDisplayTexts(durationAnomalies, errorRateAnomalies);

		const symbolStrs = new Set();
		for (const name of metricTimesliceNames) {
			symbolStrs.add(this.extractSymbolStr(name));
		}
		for (const name of errorMetricTimesliceNames) {
			symbolStrs.add(this.extractSymbolStr(name));
		}

		const anomalousSymbolStrs = [
			...durationAnomalies.map(_ => this.extractSymbolStr(_.name)),
			...errorRateAnomalies.map(_ => this.extractSymbolStr(_.name)),
		];
		const allOtherAnomalies: ObservabilityAnomaly[] = [];
		const allMetrics = languageSupport.filterMetrics(benchmarkMetrics, benchmarkSpans);
		for (const { name } of allMetrics) {
			const symbolStr = this.extractSymbolStr(name);
			if (anomalousSymbolStrs.find(_ => _ === symbolStr)) continue;

			const codeAttrs = languageSupport.codeAttrs(name, benchmarkSpans);
			const text = languageSupport.displayName(codeAttrs, name);
			if (allOtherAnomalies.find(_ => _.text === text)) continue;

			const anomaly: ObservabilityAnomaly = {
				name,
				text,
				...codeAttrs,
				language: languageSupport.language,
				oldValue: 0,
				newValue: 0,
				ratio: 1,
				sinceText: "",
				totalDays: 0,
				chartHeaderTexts: {},
				metricTimesliceName: "",
				errorMetricTimesliceName: "",
				notificationText: "",
			};
			allOtherAnomalies.push(anomaly);
		}

		try {
			const telemetry = Container.instance().telemetry;
			const event = {
				"Total Methods": symbolStrs.size,
				"Anomalous Error Methods": errorRateAnomalies.length,
				"Anomalous Duration Methods": durationAnomalies.length,
				"Entity GUID": this._request.entityGuid,
				"Minimum Change": Math.round((this._request.minimumRatio - 1) * 100),
				"Minimum RPM": this._request.minimumSampleRate,
				"Minimum Error Rate": this._request.minimumErrorRate,
				"Minimum Avg Duration": this._request.minimumResponseTime,
				"Since Days Ago": this._sinceDaysAgo,
				"Baseline Days": this._request.baselineDays,
				"Release Based": this._releaseBased,
				Language: languageSupport.language,
			};
			telemetry?.track({
				eventName: "CLM Anomalies Calculated",
				properties: event,
			});
		} catch (e) {
			Logger.warn("Error generating anomaly detection telemetry", e);
		}

		let hasNewAnomalies = false;
		if (this._request.notifyNewAnomalies) {
			try {
				hasNewAnomalies = await this.notifyNewAnomalies(durationAnomalies, errorRateAnomalies);
			} catch (e) {
				Logger.warn("Error notifying newly detected observability anomalies", e);
			}
		}

		return {
			responseTime: durationAnomalies,
			errorRate: errorRateAnomalies,
			allOtherAnomalies: allOtherAnomalies,
			detectionMethod,
			didNotifyNewAnomalies: hasNewAnomalies,
			isSupported: true,
		};
	}

	private async getBenchmarkSampleSizesSpans() {
		const query =
			`SELECT ` +
			`  count(*) AS 'value', latest(\`code.filepath\`) as codeFilepath, ` +
			`  latest(\`code.function\`) as codeFunction, ` +
			`  latest(\`code.namespace\`) as codeNamespace ` +
			`FROM Span ` +
			`WHERE \`entity.guid\` = '${this._request.entityGuid}' ` +
			`FACET name ` +
			`${this._benchmarkSampleSizeTimeFrame} LIMIT MAX`;

		return this.runNrql<SpanWithCodeAttrs>(query);
	}

	private async getBenchmarkSampleSizesMetric() {
		const benchmarkSampleSizesMetric = await this.getSampleSizeMetric(
			this._benchmarkSampleSizeTimeFrame
		);
		return benchmarkSampleSizesMetric;
	}

	private async getAnomalousDurationComparisons(
		languageSupport: LanguageSupport,
		benchmarkSampleSizes: Map<string, { span?: NameValue; metric?: NameValue }>,
		benchmarkSpans: SpanWithCodeAttrs[],
		minimumDuration: number,
		minimumSampleRate: number,
		minimumRatio: number
	): Promise<{ comparisons: Comparison[]; metricTimesliceNames: string[] }> {
		const data = await this.getDurationMetric(this._dataTimeFrame);
		const dataFiltered = languageSupport.filterMetrics(data, benchmarkSpans);

		const baseline = await this.getDurationMetric(this._baselineTimeFrame);
		const baselineSampleRate = await this.getSampleRateMetricFiltered(this._baselineTimeFrame);
		const baselineFilter = this.getSampleRateFilterPredicate(baselineSampleRate, minimumSampleRate);
		const baselineFiltered = baseline.filter(baselineFilter);

		const allComparisons = this.compareData(dataFiltered, baselineFiltered, false);

		const filteredComparisons = this.filterComparisonsByBenchmarkSampleSizes(
			benchmarkSampleSizes,
			allComparisons
		).filter(_ => _.ratio > minimumRatio && _.newValue > minimumDuration);

		return {
			comparisons: filteredComparisons,
			metricTimesliceNames: baseline.map(_ => _.name),
		};
	}

	private async getAnomalousErrorRateComparisons(
		languageSupport: LanguageSupport,
		benchmarkSampleSizes: Map<string, { span?: NameValue; metric?: NameValue }>,
		benchmarkSpans: SpanWithCodeAttrs[],
		minimumErrorRate: number,
		minimumSampleRate: number,
		minimumRatio: number
	): Promise<{
		comparisons: Comparison[];
		metricTimesliceNames: string[];
	}> {
		const errorCountLookup = `metricTimesliceName LIKE 'Errors/%'`;
		const dataErrorCount = await this.getErrorCountMetric(errorCountLookup, this._dataTimeFrame);
		const dataErrorCountFiltered = languageSupport.filterMetrics(dataErrorCount, benchmarkSpans);
		const dataSampleSize = await this.getSampleSizeMetric(this._dataTimeFrame);
		const dataTransformer = this.getErrorRateTransformer(dataSampleSize);
		const dataErrorRate = dataErrorCountFiltered.map(dataTransformer);

		const baselineErrorCount = await this.getErrorCountMetric(
			errorCountLookup,
			this._baselineTimeFrame
		);
		const baselineSampleSize = await this.getSampleSizeMetric(this._baselineTimeFrame);
		const baselineSampleRate = await this.getSampleRateMetricFiltered(this._baselineTimeFrame);
		const baselineTransformer = this.getErrorRateTransformer(baselineSampleSize);
		const baselineErrorRate = baselineErrorCount.map(baselineTransformer);

		const allComparisons = this.compareData(dataErrorRate, baselineErrorRate, true);

		const baselineFilter = this.getSampleRateFilterPredicate(baselineSampleRate, minimumSampleRate);
		const filteredComparison = this.filterComparisonsByBenchmarkSampleSizes(
			benchmarkSampleSizes,
			allComparisons
		)
			.filter(_ => _.ratio > minimumRatio && _.newValue > minimumErrorRate)
			.filter(baselineFilter);

		return {
			comparisons: filteredComparison,
			metricTimesliceNames: baselineErrorCount.map(_ => _.name),
		};
	}

	private getSampleRateFilterPredicate(sampleRates: NameValue[], minimumSampleRate: number) {
		return (data: Named) => {
			const sampleRate = sampleRates.find(
				sampleRate => this.extractSymbolStr(data.name) === this.extractSymbolStr(sampleRate.name)
			);
			return sampleRate && sampleRate.value >= minimumSampleRate;
		};
	}

	private getErrorRateTransformer(sampleRates: NameValue[]) {
		return (data: NameValue) => {
			const sampleRate = sampleRates.find(
				sampleRate => this.extractSymbolStr(data.name) === this.extractSymbolStr(sampleRate.name)
			);
			return {
				name: data.name,
				value: data.value / (sampleRate?.value || 1),
			};
		};
	}

	private filterComparisonsByBenchmarkSampleSizes(
		consolidatedSampleRates: Map<
			string,
			{
				span?: NameValue;
				metric?: NameValue;
			}
		>,
		comparisons: {
			name: string;
			oldValue: number;
			newValue: number;
			ratio: number;
		}[]
	) {
		const filteredComparisons: {
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
				const comparison = comparisons.find(_ => {
					const mySymbolStr = this.extractSymbolStr(_.name);
					return symbolStr === mySymbolStr;
				});
				if (comparison) {
					filteredComparisons.push({
						...comparison,
						source: "metric",
					});
				}
			}
		}

		filteredComparisons.sort((a, b) => b.ratio - a.ratio);
		return filteredComparisons;
	}

	private consolidateBenchmarkSampleSizes(
		sampleSizesMetric: NameValue[],
		sampleSizesSpan: NameValue[]
	) {
		const consolidatedSampleSizes = new Map<
			string,
			{
				span?: NameValue;
				metric?: NameValue;
			}
		>();

		for (const sampleSize of sampleSizesMetric) {
			if (sampleSize.value < 1) {
				continue;
			}
			const symbolStr = this.extractSymbolStr(sampleSize.name);
			consolidatedSampleSizes.set(symbolStr, { metric: sampleSize });
		}

		for (const sampleSize of sampleSizesSpan) {
			if (sampleSize.value < 1) {
				continue;
			}
			const symbol = this.extractSymbol(sampleSize.name);
			const symbolStr = symbol.className + "/" + symbol.functionName;
			const consolidatedSampleSize = consolidatedSampleSizes.get(symbolStr) || {};
			consolidatedSampleSize.span = sampleSize;
			consolidatedSampleSizes.set(symbolStr, consolidatedSampleSize);
		}
		return consolidatedSampleSizes;
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

	private compareData(
		data: NameValue[],
		baseline: NameValue[],
		assumeZeroForAbsentBaseline: boolean
	) {
		const comparisonMap = this.comparisonMap(data, baseline, assumeZeroForAbsentBaseline);
		const comparisonArray: {
			name: string;
			oldValue: number;
			newValue: number;
			ratio: number;
		}[] = [];
		comparisonMap.forEach((value, key) => {
			if (value.oldValue != null && value.newValue != null && value.ratio != null) {
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

	private comparisonMap(
		data: NameValue[],
		baseline: NameValue[],
		assumeZeroForAbsentBaseline: boolean
	) {
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
		if (assumeZeroForAbsentBaseline) {
			for (const comparison of map.values()) {
				if (comparison.oldValue == undefined) {
					comparison.oldValue = 0;
					comparison.ratio = 2;
				}
			}
		}
		return map;
	}

	getDurationMetric(timeFrame: string): Promise<NameValue[]> {
		const query =
			`SELECT average(newrelic.timeslice.value) * 1000 AS 'value' ` +
			`FROM Metric WHERE \`entity.guid\` = '${this._request.entityGuid}' FACET metricTimesliceName AS name ` +
			`${timeFrame} LIMIT MAX`;
		return this.runNrql(query);
	}

	private async getErrorCountMetric(lookup: string, timeFrame: string): Promise<NameValue[]> {
		const query =
			`SELECT count(apm.service.transaction.error.count) AS 'value' ` +
			`FROM Metric WHERE \`entity.guid\` = '${this._request.entityGuid}' AND (${lookup}) FACET metricTimesliceName AS name ` +
			`${timeFrame} LIMIT MAX`;
		return this.runNrql(query);
	}

	private async filterSampleRates(sampleRates: NameValue[]) {
		if (!sampleRates || !sampleRates.length) {
			return [];
		}
		const classNames = await this.extractClassNames(sampleRates.map(_ => _.name));
		const uniqueClassNames = [...new Set(classNames)];
		const { filteredNamespaces } = await SessionContainer.instance().session.agent.sendRequest(
			AgentFilterNamespacesRequestType,
			{
				namespaces: uniqueClassNames,
			}
		);

		const filteredSampleRates = sampleRates.filter(sampleRate =>
			filteredNamespaces.some(namespace => sampleRate.name.indexOf(namespace) >= 0)
		);
		return filteredSampleRates;
	}

	private async getSampleRateMetricFiltered(timeFrame: string): Promise<NameValue[]> {
		const query =
			`SELECT rate(count(newrelic.timeslice.value), 1 minute) AS 'value' ` +
			`FROM Metric WHERE \`entity.guid\` = '${this._request.entityGuid}' FACET metricTimesliceName AS name ` +
			`${timeFrame} LIMIT MAX`;
		const sampleRates = await this.runNrql<NameValue>(query);
		// const filteredSampleRates = await this.filterSampleRates(sampleRates);
		// return filteredSampleRates;
		return sampleRates;
	}

	private async getSampleSizeMetric(timeFrame: string): Promise<NameValue[]> {
		const query =
			`SELECT count(newrelic.timeslice.value) AS 'value' ` +
			`FROM Metric WHERE \`entity.guid\` = '${this._request.entityGuid}' FACET metricTimesliceName AS name ` +
			`${timeFrame} LIMIT MAX`;
		return this.runNrql<NameValue>(query);
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

	extractSymbolStr(rawName: string) {
		const symbol = this.extractSymbol(rawName);
		return symbol.className + "/" + symbol.functionName;
	}

	private runNrql<T>(nrql: string): Promise<T[]> {
		return this._provider.runNrql(this._accountId, nrql, 400);
	}

	private durationComparisonToAnomaly(
		comparison: {
			name: string;
			oldValue: number;
			newValue: number;
			ratio: number;
		},
		languageSupport: LanguageSupport,
		benchmarkSpans: SpanWithCodeAttrs[],
		errorMetricTimesliceNames: string[]
	): ObservabilityAnomaly {
		const codeAttrs = languageSupport.codeAttrs(comparison.name, benchmarkSpans);
		return {
			...comparison,
			...codeAttrs,
			language: languageSupport.language,
			text: languageSupport.displayName(codeAttrs, comparison.name),
			totalDays: this._totalDays,
			metricTimesliceName: comparison.name,
			sinceText: this._sinceText,
			errorMetricTimesliceName:
				errorMetricTimesliceNames.find(
					_ => this.extractSymbolStr(_) === this.extractSymbolStr(comparison.name)
				) || comparison.name,
			chartHeaderTexts: {},
			notificationText: "",
		};
	}

	private errorRateComparisonToAnomaly(
		comparison: {
			name: string;
			oldValue: number;
			newValue: number;
			ratio: number;
		},
		languageSupport: LanguageSupport,
		benchmarkSpans: SpanWithCodeAttrs[],
		metricTimesliceNames: string[]
	): ObservabilityAnomaly {
		const codeAttrs = languageSupport.codeAttrs(comparison.name, benchmarkSpans);
		return {
			...comparison,
			...codeAttrs,
			language: languageSupport.language,
			text: languageSupport.displayName(codeAttrs, comparison.name),
			totalDays: this._totalDays,
			sinceText: this._sinceText,
			metricTimesliceName:
				metricTimesliceNames.find(
					_ => this.extractSymbolStr(_) === this.extractSymbolStr(comparison.name)
				) || comparison.name,
			errorMetricTimesliceName: comparison.name,
			chartHeaderTexts: {},
			notificationText: "",
		};
	}

	private addDisplayTexts(
		durationAnomalies: ObservabilityAnomaly[],
		errorRateAnomalies: ObservabilityAnomaly[]
	) {
		// FIXME temporary solution for anomaly charts
		for (const anomaly of durationAnomalies) {
			const percentage = ((anomaly.ratio - 1) * 100).toFixed(2);
			const text = `+${percentage}% since ${anomaly.sinceText}`;
			anomaly.chartHeaderTexts["Average duration (ms)"] = text;
			anomaly.notificationText = "Average duration (ms) " + text;
		}
		for (const anomaly of errorRateAnomalies) {
			const percentage = ((anomaly.ratio - 1) * 100).toFixed(2);
			const text = `+${percentage}% since ${anomaly.sinceText}`;
			anomaly.chartHeaderTexts["Errors (per minute)"] = text;
			anomaly.notificationText = "Errors (per minute) " + text;
		}
		for (const anomaly of durationAnomalies) {
			const counterpart = errorRateAnomalies.find(
				_ => _.codeNamespace === anomaly.codeNamespace && _.codeFunction === anomaly.codeFunction
			);
			if (counterpart) {
				anomaly.chartHeaderTexts = {
					...anomaly.chartHeaderTexts,
					...counterpart.chartHeaderTexts,
				};
			}
		}
		for (const anomaly of errorRateAnomalies) {
			const counterpart = durationAnomalies.find(
				_ => _.codeNamespace === anomaly.codeNamespace && _.codeFunction === anomaly.codeFunction
			);
			if (counterpart) {
				anomaly.chartHeaderTexts = {
					...anomaly.chartHeaderTexts,
					...counterpart.chartHeaderTexts,
				};
			}
		}
	}

	private getLanguageSupport(benchmarkMetrics: NameValue[]): LanguageSupport | undefined {
		for (const metric of benchmarkMetrics) {
			if (metric.name.indexOf("Java/") === 0) {
				return new JavaLanguageSupport();
			}
			if (metric.name.indexOf("Ruby/") === 0 || metric.name.indexOf("RubyVM/") === 0) {
				return new RubyLanguageSupport();
			}
			if (metric.name.indexOf("DotNet/") === 0) {
				return new CSharpLanguageSupport();
			}
			if (metric.name.indexOf("Python/") === 0) {
				return new PythonLanguageSupport();
			}
		}

		return undefined;
	}

	private async notifyNewAnomalies(
		durationAnomalies: ObservabilityAnomaly[],
		errorRateAnomalies: ObservabilityAnomaly[]
	): Promise<boolean> {
		const { repos: observabilityRepos } = await this._provider.getObservabilityRepos({});
		const { entityGuid } = this._request;
		const { git } = SessionContainer.instance();
		const now = Date.now();

		if (!observabilityRepos) return false;
		const observabilityRepo = observabilityRepos.find(_ =>
			_.entityAccounts.some(_ => _.entityGuid === entityGuid)
		);
		if (!observabilityRepo) return false;
		const gitRepo = await git.getRepositoryById(observabilityRepo.repoId);
		if (!gitRepo) return false;
		const storage = await getStorage(gitRepo.path);

		const anomalyNotificationsCollection = storage.getCollection("anomalyNotifications");
		const anomalyNotificationsOld = anomalyNotificationsCollection.get(
			entityGuid
		) as AnomalyNotifications;
		const anomalyNotificationsNew: AnomalyNotifications = {
			duration: {},
			errorRate: {},
		};

		const newDurationAnomalies: ObservabilityAnomaly[] = [];
		for (const anomaly of durationAnomalies) {
			const lastNotification = anomalyNotificationsOld?.duration[anomaly.name];
			if (!lastNotification) {
				newDurationAnomalies.push(anomaly);
				anomalyNotificationsNew.duration[anomaly.name] = {
					lastNotified: now,
				};
			} else {
				anomalyNotificationsNew.duration[anomaly.name] = lastNotification;
			}
		}

		const newErrorRateAnomalies: ObservabilityAnomaly[] = [];
		for (const anomaly of errorRateAnomalies) {
			const lastNotification = anomalyNotificationsOld?.errorRate[anomaly.name];
			if (!lastNotification) {
				newErrorRateAnomalies.push(anomaly);
				anomalyNotificationsNew.errorRate[anomaly.name] = {
					lastNotified: now,
				};
			} else {
				anomalyNotificationsNew.errorRate[anomaly.name] = lastNotification;
			}
			anomalyNotificationsNew.errorRate[anomaly.name] = lastNotification || {
				lastNotified: now,
			};
		}

		anomalyNotificationsCollection.set(entityGuid, anomalyNotificationsNew);
		await storage.flush();

		if (newDurationAnomalies.length || newErrorRateAnomalies.length) {
			Container.instance().agent.sendNotification(DidDetectObservabilityAnomaliesNotificationType, {
				entityGuid: entityGuid,
				duration: newDurationAnomalies,
				errorRate: newErrorRateAnomalies,
			});
			return true;
		}

		return false;
	}
}

interface AnomalyNotifications {
	duration: {
		[id: string]: AnomalyNotification;
	};
	errorRate: {
		[id: string]: AnomalyNotification;
	};
}

interface AnomalyNotification {
	lastNotified: number;
}

interface LanguageSupport {
	get language(): string;

	filterMetrics(data: NameValue[], benchmarkSpans: SpanWithCodeAttrs[]): NameValue[];

	codeAttrs(name: string, benchmarkSpans: SpanWithCodeAttrs[]): CodeAttributes;

	displayName(codeAttrs: CodeAttributes, name: string): string;
}

class JavaLanguageSupport implements LanguageSupport {
	get language() {
		return "java";
	}

	filterMetrics(metrics: NameValue[], benchmarkSpans: SpanWithCodeAttrs[]): NameValue[] {
		const javaRE = /^Java\/(.+)\.(.+)\/(.+)/;
		const customRE = /^Custom\/(.+)\.(.+)\/(.+)/;
		const errorsRE = /^Errors\/(.+)\.(.+)\/(.+)/;
		return metrics.filter(
			m =>
				benchmarkSpans.find(s => s.name === m.name && s.codeFunction) ||
				javaRE.test(m.name) ||
				customRE.test(m.name) ||
				errorsRE.test(m.name)
		);
	}

	codeAttrsFromName(name: string): CodeAttributes {
		const parts = name.split("/");
		const codeFunction = parts[parts.length - 1];
		const codeNamespace = parts[parts.length - 2];
		return {
			codeNamespace,
			codeFunction,
		};
	}

	codeAttrs(name: string, benchmarkSpans: SpanWithCodeAttrs[]): CodeAttributes {
		const span = benchmarkSpans.find(_ => _.name === name);
		if (span && span.codeFunction) {
			return {
				codeFilepath: span.codeFilepath,
				codeNamespace: span.codeNamespace,
				codeFunction: span.codeFunction,
			};
		}
		return this.codeAttrsFromName(name);
	}

	displayName(codeAttrs: CodeAttributes, name: string) {
		if (!codeAttrs?.codeFunction) return name;
		const parts = [];
		if (codeAttrs.codeNamespace) parts.push(codeAttrs.codeNamespace);
		parts.push(codeAttrs.codeFunction);
		return parts.join("/");
	}
}

class RubyLanguageSupport implements LanguageSupport {
	get language() {
		return "ruby";
	}
	filterMetrics(metrics: NameValue[], benchmarkSpans: SpanWithCodeAttrs[]): NameValue[] {
		const controllerRE = /^Controller\/(.+)\/(.+)/;
		const nestedControllerRE = /^Nested\/Controller\/(.+)\/(.+)/;
		const errorsRE = /^Errors\/(.+)\/(.+)/;
		return metrics.filter(
			m =>
				!(
					m.name.indexOf("Nested/Controller/") === 0 &&
					metrics.find(another => "Nested/" + another.name === m.name)
				) &&
				!(m.name.indexOf("Nested/Controller/Rack/") === 0) &&
				!(m.name.indexOf("Controller/Sinatra/") === 0) &&
				!(m.name.indexOf("Nested/Controller/Sinatra/") === 0) &&
				(benchmarkSpans.find(s => s.name === m.name && s.codeFunction) ||
					controllerRE.test(m.name) ||
					nestedControllerRE.test(m.name) ||
					errorsRE.test(m.name))
		);
	}

	codeAttrsFromName(name: string): CodeAttributes {
		const parts = name.split("/");
		const codeFunction = parts[parts.length - 1];
		const codeNamespace = parts[parts.length - 2];

		if (
			(parts[0] === "Nested" && parts[1] === "Controller") ||
			(parts[0] === "Errors" && parts[1] === "Controller") ||
			parts[0] === "Controller"
		) {
			const parts = codeNamespace.split("_");
			const camelCaseParts = parts.map(_ => _.charAt(0).toUpperCase() + _.slice(1));
			const controllerName = camelCaseParts.join("") + "Controller";
			return {
				codeNamespace: controllerName,
				codeFunction,
			};
		} else {
			return {
				codeNamespace,
				codeFunction,
			};
		}
	}

	codeAttrs(name: string, benchmarkSpans: SpanWithCodeAttrs[]): CodeAttributes {
		const span = benchmarkSpans.find(_ => _.name === name);
		if (span && span.codeFunction) {
			return {
				codeFilepath: span.codeFilepath,
				codeNamespace: span.codeNamespace,
				codeFunction: span.codeFunction,
			};
		}
		return this.codeAttrsFromName(name);
	}

	displayName(codeAttrs: CodeAttributes, name: string) {
		if (!codeAttrs?.codeFunction) return name;
		const parts = [];
		if (codeAttrs.codeNamespace) parts.push(codeAttrs.codeNamespace);
		parts.push(codeAttrs.codeFunction);
		return parts.join("#");
	}
}

class PythonLanguageSupport implements LanguageSupport {
	get language() {
		return "python";
	}
	filterMetrics(metrics: NameValue[], benchmarkSpans: SpanWithCodeAttrs[]): NameValue[] {
		const errorPrefixRe = /^Errors\/WebTransaction\//;
		return metrics.filter(m => {
			const name = m.name.replace(errorPrefixRe, "");
			return (
				!name.startsWith("Function/flask.app:Flask.") &&
				benchmarkSpans.find(
					s =>
						s.name === name &&
						s.name.endsWith(s.codeFunction) &&
						s.codeFunction &&
						s.codeFilepath != "<builtin>"
				)
			);
		});
	}

	codeAttrsFromName(name: string): CodeAttributes {
		const [prefix, classMethod] = name.split(":");
		const parts = classMethod.split(".");
		const codeFunction = parts.pop() || "";
		const namespacePrefix = prefix.replace("Function/", "");
		const className = parts.join(".");
		const codeNamespaceParts = [namespacePrefix];
		if (className.length) {
			codeNamespaceParts.push(className);
		}
		const codeNamespace = codeNamespaceParts.join(":");
		return {
			codeNamespace,
			codeFunction,
		};
	}

	codeAttrs(name: string, benchmarkSpans: SpanWithCodeAttrs[]): CodeAttributes {
		const errorPrefixRe = /^Errors\/WebTransaction\//;
		name = name.replace(errorPrefixRe, "");
		const span = benchmarkSpans.find(_ => _.name === name && _.name.endsWith(_.codeFunction));
		if (span && span.codeFunction) {
			return {
				codeFilepath: span.codeFilepath,
				codeNamespace: span.codeNamespace,
				codeFunction: span.codeFunction,
			};
		}
		return this.codeAttrsFromName(name);
	}

	displayName(codeAttrs: CodeAttributes, name: string) {
		const errorPrefixRe = /^Errors\/WebTransaction\/Function\//;
		const functionRe = /^Function\//;
		return name.replace(errorPrefixRe, "").replace(functionRe, "");
	}
}

class CSharpLanguageSupport implements LanguageSupport {
	get language() {
		return "csharp";
	}

	filterMetrics(metrics: NameValue[], benchmarkSpans: SpanWithCodeAttrs[]): NameValue[] {
		const dotNetRE = /^DotNet\/(.+)\.(.+)\/(.+)/;
		const customRE = /^Custom\/(.+)\.(.+)\/(.+)/;
		const errorsRE = /^Errors\/(.+)\.(.+)\/(.+)/;
		return metrics.filter(
			m =>
				benchmarkSpans.find(s => s.name === m.name && s.codeFunction) ||
				dotNetRE.test(m.name) ||
				customRE.test(m.name) ||
				errorsRE.test(m.name)
		);
	}

	codeAttrsFromName(name: string): CodeAttributes {
		const parts = name.split("/");
		const codeFunction = parts[parts.length - 1];
		const codeNamespace = parts[parts.length - 2];
		return {
			codeNamespace,
			codeFunction,
		};
	}

	codeAttrs(name: string, benchmarkSpans: SpanWithCodeAttrs[]): CodeAttributes {
		const span = benchmarkSpans.find(_ => _.name === name);
		if (span) {
			return {
				codeFilepath: span.codeFilepath,
				codeNamespace: span.codeNamespace,
				codeFunction: span.codeFunction,
			};
		}
		return this.codeAttrsFromName(name);
	}

	displayName(codeAttrs: CodeAttributes, name: string) {
		if (!codeAttrs.codeFunction) return name;
		const parts = [];
		if (codeAttrs.codeNamespace) parts.push(codeAttrs.codeNamespace);
		parts.push(codeAttrs.codeFunction);
		return parts.join("/");
	}
}
