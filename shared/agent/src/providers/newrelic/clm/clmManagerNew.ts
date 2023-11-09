import { Container } from "../../../container";
import {
	CodeLevelMetrics,
	EntityAccount,
	GetClmRequest,
	GetClmResponse,
	NameValue,
	ObservabilityRepo,
	SpanWithCodeAttrs,
} from "@codestream/protocols/agent";
import { INewRelicProvider, NewRelicProvider } from "../../newrelic";
import { Logger } from "../../../logger";
import { getLanguageSupport, LanguageSupport } from "./languageSupport";

export class ClmManagerNew {
	constructor(
		private _request: GetClmRequest,
		private _provider: INewRelicProvider
	) {
		this._accountId = NewRelicProvider.parseId(_request.entityGuid)!.accountId;
	}

	private _dataTimeFrame = "SINCE 30 minutes AGO";
	private readonly _accountId;

	async execute(): Promise<GetClmResponse> {
		const entityAccount = await this.getEntityAccount();
		const languageSupport = entityAccount && (await getLanguageSupport(entityAccount));
		if (!languageSupport) {
			return {
				codeLevelMetrics: [],
				isSupported: false,
			};
		}

		const spanFilter = this.getSpanFilter(languageSupport);
		const metricFilter = this.getMetricFilter(languageSupport);
		const benchmarkSpans = await this.getBenchmarkSampleSizesSpans(spanFilter);
		const durations = await this.getDurationMetric(this._dataTimeFrame, metricFilter);
		const durationsFiltered = languageSupport.filterMetrics(durations, benchmarkSpans);

		// const errorCountLookup = `metricTimesliceName LIKE 'Errors/%'`;
		// const errorCounts = await this.getErrorCountMetric(errorCountLookup, this._dataTimeFrame);
		// const errorCountsFiltered = languageSupport.filterMetrics(errorCounts, benchmarkSpans);

		const codeLevelMetrics: CodeLevelMetrics[] = [];
		for (const duration of durationsFiltered) {
			const codeAttrs = languageSupport.codeAttrs(duration.name, benchmarkSpans);
			const metric: CodeLevelMetrics = {
				name: duration.name,
				codeAttrs,
				duration: duration.value,
			};
			codeLevelMetrics.push(metric);
		}

		try {
			const telemetry = Container.instance().telemetry;
			const event = {
				// "Total Methods": symbolStrs.size,
				"Entity GUID": this._request.entityGuid,
			};
			telemetry?.track({
				eventName: "CLM Anomalies Calculated",
				properties: event,
			});
		} catch (e) {
			Logger.warn("Error generating anomaly detection telemetry", e);
		}

		return {
			codeLevelMetrics,
			isSupported: true,
		};
	}

	// TODO REFACTOR getSpanCount
	private async getBenchmarkSampleSizesSpans(filter: string) {
		const query =
			`SELECT ` +
			`  count(*) AS 'value', latest(\`code.filepath\`) as codeFilepath, ` +
			`  latest(\`code.function\`) as codeFunction, ` +
			`  latest(\`code.namespace\`) as codeNamespace ` +
			`FROM Span ` +
			`WHERE \`entity.guid\` = '${this._request.entityGuid}' AND (${filter}) ` +
			`FACET name ` +
			`${this._dataTimeFrame} LIMIT MAX`;

		return this.runNrql<SpanWithCodeAttrs>(query);
	}

	private async getBenchmarkSampleSizesMetric() {
		const benchmarkSampleSizesMetric = await this.getSampleSizeMetric(this._dataTimeFrame);
		return benchmarkSampleSizesMetric;
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

	private async getSampleSizeMetric(timeFrame: string): Promise<NameValue[]> {
		const query =
			`SELECT count(newrelic.timeslice.value) AS 'value' ` +
			`FROM Metric WHERE \`entity.guid\` = '${this._request.entityGuid}' FACET metricTimesliceName AS name ` +
			`${timeFrame} LIMIT MAX`;
		return this.runNrql<NameValue>(query);
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

	// TODO REFACTOR move to ???
	private getMetricFilter(languageSupport: LanguageSupport) {
		const prefixes = languageSupport.metricNrqlPrefixes;
		if (prefixes.length) {
			const likes = prefixes.map(_ => `metricTimesliceName LIKE '${_}/%'`);
			return likes.join(" OR ");
		} else {
			return "metricTimesliceName LIKE '%'";
		}
	}

	// TODO REFACTOR move to ???
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

	private _entityAccount: EntityAccount | undefined;
	private async getEntityAccount(): Promise<EntityAccount | undefined> {
		if (this._entityAccount) return this._entityAccount;
		const observabilityRepo = await this.getObservabilityRepo();
		return (this._entityAccount = observabilityRepo?.entityAccounts?.find(
			_ => _.entityGuid === this._request.entityGuid
		));
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
}
