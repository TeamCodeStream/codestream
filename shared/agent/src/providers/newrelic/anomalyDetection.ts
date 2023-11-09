import { Container, SessionContainer } from "../../container";
import {
	Comparison,
	DetectionMethod,
	DidDetectObservabilityAnomaliesNotificationType,
	EntityAccount,
	GetObservabilityAnomaliesRequest,
	GetObservabilityAnomaliesResponse,
	Named,
	NameValue,
	ObservabilityAnomaly,
	ObservabilityRepo,
	SpanWithCodeAttrs,
} from "@codestream/protocols/agent";
import { INewRelicProvider, NewRelicProvider } from "../newrelic";
import { Logger } from "../../logger";
import { getStorage } from "../../storage";
import { getAnomalyDetectionMockResponse } from "./anomalyDetectionMockResults";
import { getLanguageSupport, LanguageSupport } from "./clm/languageSupport";

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
		const mockResponse = getAnomalyDetectionMockResponse(this._request);
		if (mockResponse) {
			await this.notifyNewAnomalies(mockResponse.responseTime, mockResponse.errorRate, true);
			return mockResponse;
		}

		const entityAccount = await this.getEntityAccount();
		const languageSupport = entityAccount && (await getLanguageSupport(entityAccount));
		if (!languageSupport) {
			return {
				responseTime: [],
				errorRate: [],
				didNotifyNewAnomalies: false,
				isSupported: false,
			};
		}

		const spanFilter = this.getSpanFilter(languageSupport);
		const benchmarkSpans = await this.getBenchmarkSampleSizesSpans(spanFilter);
		const benchmarkMetrics = await this.getBenchmarkSampleSizesMetric(
			languageSupport,
			benchmarkSpans
		);
		const benchmarkSampleSizes = this.consolidateBenchmarkSampleSizes(
			benchmarkMetrics,
			benchmarkSpans
		);

		const sinceDaysAgo = parseInt(this._request.sinceDaysAgo as any);
		this._totalDays = sinceDaysAgo + parseInt(this._request.baselineDays as any);
		this._sinceText = sinceDaysAgo === 1 ? `1 day ago` : `${sinceDaysAgo} days ago`;
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
				const daysSinceDeployment = Math.ceil(timeSinceDeployment / (1000 * 60 * 60 * 24));
				this._sinceDaysAgo = daysSinceDeployment;
				this._releaseBased = true;
				this._dataTimeFrame = `SINCE ${deployment.seconds}`;
				const baselineDays = parseInt(this._request.baselineDays as any);
				this._baselineTimeFrame = `SINCE ${daysSinceDeployment + baselineDays} days AGO UNTIL ${
					deployment.seconds
				}`;
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

		void (await this.addDisplayTexts(durationAnomalies, errorRateAnomalies));

		const allMetricTimesliceNames = new Set();
		for (const name of metricTimesliceNames) {
			allMetricTimesliceNames.add(name);
		}
		for (const name of errorMetricTimesliceNames) {
			allMetricTimesliceNames.add(name);
		}

		const anomalousMetricNames = [
			...durationAnomalies.map(_ => _.name),
			...errorRateAnomalies.map(_ => _.name),
		];
		const allOtherAnomalies: ObservabilityAnomaly[] = [];
		const allMetrics = languageSupport.filterMetrics(benchmarkMetrics, benchmarkSpans);
		for (const { name } of allMetrics) {
			if (anomalousMetricNames.find(_ => _ === name)) continue;

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
				sinceText: this._sinceText,
				totalDays: this._totalDays,
				chartHeaderTexts: {},
				metricTimesliceName: name,
				errorMetricTimesliceName: "Errors/" + name,
				notificationText: "",
				entityName: "",
			};
			allOtherAnomalies.push(anomaly);
		}
		allOtherAnomalies.sort((a, b) => a.name.localeCompare(b.name));

		try {
			const telemetry = Container.instance().telemetry;
			const event = {
				"Total Methods": allMetricTimesliceNames.size,
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

		let didNotifyNewAnomalies = false;
		if (this._request.notifyNewAnomalies) {
			try {
				didNotifyNewAnomalies = await this.notifyNewAnomalies(
					durationAnomalies,
					errorRateAnomalies
				);
			} catch (e) {
				Logger.warn("Error notifying newly detected observability anomalies", e);
			}
		}

		return {
			responseTime: durationAnomalies,
			errorRate: errorRateAnomalies,
			allOtherAnomalies: allOtherAnomalies,
			detectionMethod,
			didNotifyNewAnomalies,
			isSupported: true,
		};
	}

	private async getBenchmarkSampleSizesSpans(filter: string) {
		const query =
			`SELECT ` +
			`  count(*) AS 'value', latest(\`code.filepath\`) as codeFilepath, ` +
			`  latest(\`code.function\`) as codeFunction, ` +
			`  latest(\`code.namespace\`) as codeNamespace ` +
			`FROM Span ` +
			`WHERE \`entity.guid\` = '${this._request.entityGuid}' AND (${filter}) ` +
			`FACET name ` +
			`${this._benchmarkSampleSizeTimeFrame} LIMIT MAX`;

		return this.runNrql<SpanWithCodeAttrs>(query);
	}

	private async getBenchmarkSampleSizesMetric(
		languageSupport: LanguageSupport,
		benchmarkSpans: SpanWithCodeAttrs[]
	) {
		const benchmarkSampleSizesMetric = await this.getSampleSizeMetric(
			this._benchmarkSampleSizeTimeFrame,
			this.getMetricFilter(languageSupport, benchmarkSpans)
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
		const metricFilter = this.getMetricFilter(languageSupport, benchmarkSpans);
		const data = await this.getDurationMetric(this._dataTimeFrame, metricFilter);
		const dataFiltered = languageSupport.filterMetrics(data, benchmarkSpans);

		const baseline = await this.getDurationMetric(this._baselineTimeFrame, metricFilter);
		const baselineSampleRate = await this.getSampleRateMetricFiltered(
			this._baselineTimeFrame,
			metricFilter
		);
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
		const metricFilter = this.getMetricFilter(languageSupport, benchmarkSpans);
		const errorCountLookup = `metricTimesliceName LIKE 'Errors/%'`;
		const dataErrorCount = await this.getErrorCountMetric(errorCountLookup, this._dataTimeFrame);
		const dataErrorCountFiltered = languageSupport.filterMetrics(dataErrorCount, benchmarkSpans);
		const dataSampleSize = await this.getSampleSizeMetric(this._dataTimeFrame, metricFilter);
		const dataTransformer = this.getErrorRateTransformer(dataSampleSize);
		const dataErrorRate = dataErrorCountFiltered.map(dataTransformer);

		const baselineErrorCount = await this.getErrorCountMetric(
			errorCountLookup,
			this._baselineTimeFrame
		);
		const baselineSampleSize = await this.getSampleSizeMetric(
			this._baselineTimeFrame,
			metricFilter
		);
		const baselineSampleRate = await this.getSampleRateMetricFiltered(
			this._baselineTimeFrame,
			metricFilter
		);
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
			const sampleRate = sampleRates.find(sampleRate => data.name.endsWith(sampleRate.name));
			return sampleRate && sampleRate.value >= minimumSampleRate;
		};
	}

	private getErrorRateTransformer(sampleRates: NameValue[]) {
		return (data: NameValue) => {
			const sampleRate = sampleRates.find(sampleRate => data.name === "Errors/" + sampleRate.name);
			return {
				name: data.name,
				value: sampleRate?.value ? data.value / sampleRate.value : 0,
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

		for (const [name, consolidatedSampleRate] of consolidatedSampleRates.entries()) {
			const useMetric =
				consolidatedSampleRate.metric &&
				(!consolidatedSampleRate.span ||
					consolidatedSampleRate.metric.value / consolidatedSampleRate.span.value >= 0.8);
			if (useMetric) {
				const comparison = comparisons.find(_ => name === _.name || "Errors/" + name === _.name);
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
			consolidatedSampleSizes.set(sampleSize.name, { metric: sampleSize });
		}

		for (const sampleSize of sampleSizesSpan) {
			if (sampleSize.value < 1) {
				continue;
			}
			const consolidatedSampleSize = consolidatedSampleSizes.get(sampleSize.name) || {};
			consolidatedSampleSize.span = sampleSize;
			consolidatedSampleSizes.set(sampleSize.name, consolidatedSampleSize);
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
				if (comparison.oldValue == undefined || comparison.oldValue == 0) {
					comparison.oldValue = 0;
					comparison.ratio = 2;
				}
			}
		}
		return map;
	}

	getDurationMetric(timeFrame: string, filter: string): Promise<NameValue[]> {
		const query =
			`SELECT average(newrelic.timeslice.value) * 1000 AS 'value' ` +
			`FROM Metric WHERE \`entity.guid\` = '${this._request.entityGuid}' AND (${filter}) FACET metricTimesliceName AS name ` +
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

	private async getSampleRateMetricFiltered(
		timeFrame: string,
		filter: string
	): Promise<NameValue[]> {
		const query =
			`SELECT rate(count(newrelic.timeslice.value), 1 minute) AS 'value' ` +
			`FROM Metric WHERE \`entity.guid\` = '${this._request.entityGuid}' AND (${filter}) FACET metricTimesliceName AS name ` +
			`${timeFrame} LIMIT MAX`;
		const sampleRates = await this.runNrql<NameValue>(query);
		// const filteredSampleRates = await this.filterSampleRates(sampleRates);
		// return filteredSampleRates;
		return sampleRates;
	}

	private async getSampleSizeMetric(timeFrame: string, filter: string): Promise<NameValue[]> {
		const query =
			`SELECT count(newrelic.timeslice.value) AS 'value' ` +
			`FROM Metric WHERE \`entity.guid\` = '${this._request.entityGuid}' AND (${filter}) FACET metricTimesliceName AS name ` +
			`${timeFrame} LIMIT MAX`;
		return this.runNrql<NameValue>(query);
	}

	private getMetricFilter(languageSupport: LanguageSupport, benchmarkSpans: SpanWithCodeAttrs[]) {
		const languagePrefixes = languageSupport.metricNrqlPrefixes;
		const spanNames = benchmarkSpans.map(_ => _.name);
		if (languagePrefixes.length || spanNames.length) {
			const languageFilters = languagePrefixes.map(_ => `metricTimesliceName LIKE '${_}/%'`);
			const spanNameFilters = spanNames.map(_ => `metricTimesliceName = '${_}'`);
			const filters = languageFilters.concat(spanNameFilters);
			return filters.join(" OR ");
		} else {
			return "metricTimesliceName LIKE '%'";
		}
	}

	private getSpanFilter(languageSupport: LanguageSupport) {
		const prefixes = languageSupport.spanNrqlPrefixes;
		if (prefixes.length) {
			const likes = prefixes.map(_ => `name LIKE '${_}/%'`);
			return likes.join(" OR ");
		} else {
			return "name LIKE '%'";
		}
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
			codeAttrs,
			language: languageSupport.language,
			text: languageSupport.displayName(codeAttrs, comparison.name),
			totalDays: this._totalDays,
			metricTimesliceName: comparison.name,
			sinceText: this._sinceText,
			errorMetricTimesliceName:
				errorMetricTimesliceNames.find(_ => _.endsWith(comparison.name)) || comparison.name,
			chartHeaderTexts: {},
			notificationText: "",
			entityName: "",
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
			codeAttrs,
			language: languageSupport.language,
			text: languageSupport.displayName(codeAttrs, comparison.name),
			totalDays: this._totalDays,
			sinceText: this._sinceText,
			metricTimesliceName:
				metricTimesliceNames.find(_ => comparison.name.endsWith(_)) || comparison.name,
			errorMetricTimesliceName: comparison.name,
			chartHeaderTexts: {},
			notificationText: "",
			entityName: "",
		};
	}

	private async addDisplayTexts(
		durationAnomalies: ObservabilityAnomaly[],
		errorRateAnomalies: ObservabilityAnomaly[]
	) {
		const entityAccount = await this.getEntityAccount();

		// FIXME temporary solution for anomaly charts
		for (const anomaly of durationAnomalies) {
			const percentage = ((anomaly.ratio - 1) * 100).toFixed(2);
			const text = `+${percentage}% since ${anomaly.sinceText}`;
			anomaly.chartHeaderTexts["Average duration (ms)"] = text;
			anomaly.notificationText = "Average duration (ms) " + text;
			anomaly.entityName = entityAccount?.entityName || "";
		}
		for (const anomaly of errorRateAnomalies) {
			const percentage = ((anomaly.ratio - 1) * 100).toFixed(2);
			const text = `+${percentage}% since ${anomaly.sinceText}`;
			anomaly.chartHeaderTexts["Errors (per minute)"] = text;
			anomaly.notificationText = "Errors (per minute) " + text;
			anomaly.entityName = entityAccount?.entityName || "";
		}
		for (const anomaly of durationAnomalies) {
			const counterpart = errorRateAnomalies.find(
				_ =>
					_.codeAttrs?.codeNamespace === anomaly.codeAttrs?.codeNamespace &&
					_.codeAttrs?.codeFunction === anomaly.codeAttrs?.codeFunction
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
				_ =>
					_.codeAttrs?.codeNamespace === anomaly.codeAttrs?.codeNamespace &&
					_.codeAttrs?.codeFunction === anomaly.codeAttrs?.codeFunction
			);
			if (counterpart) {
				anomaly.chartHeaderTexts = {
					...anomaly.chartHeaderTexts,
					...counterpart.chartHeaderTexts,
				};
			}
		}
	}

	private _observabilityRepo: ObservabilityRepo | undefined;
	private async getObservabilityRepo(): Promise<ObservabilityRepo | undefined> {
		if (this._observabilityRepo) return this._observabilityRepo;

		const { repos: observabilityRepos } = await this._provider.getObservabilityRepos({});
		const { entityGuid } = this._request;

		if (!observabilityRepos) return undefined;
		const observabilityRepo = observabilityRepos.find(_ =>
			_.entityAccounts.some(_ => _.entityGuid === entityGuid)
		);
		return (this._observabilityRepo = observabilityRepo);
	}

	private _entityAccount: EntityAccount | undefined;
	private async getEntityAccount(): Promise<EntityAccount | undefined> {
		if (this._entityAccount) return this._entityAccount;
		const observabilityRepo = await this.getObservabilityRepo();
		return (this._entityAccount = observabilityRepo?.entityAccounts?.find(
			_ => _.entityGuid === this._request.entityGuid
		));
	}

	private async notifyNewAnomalies(
		durationAnomalies: ObservabilityAnomaly[],
		errorRateAnomalies: ObservabilityAnomaly[],
		force = false
	): Promise<boolean> {
		const { entityGuid } = this._request;
		const { git, users } = SessionContainer.instance();
		const me = await users.getMe();
		const now = Date.now();

		if (me.preferences?.notifyPerformanceIssues === false) return false;

		const observabilityRepo = await this.getObservabilityRepo();
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
			if (!lastNotification || force) {
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
			if (!lastNotification || force) {
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
