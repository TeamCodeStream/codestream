// eslint-disable: Keep unused vars to make it easy to inject objects into new dependencies as they are added
/* eslint-disable  unused-imports/no-unused-vars */
import { NewRelicGraphqlClient } from "./newRelicGraphqlClient";
import { CodeStreamSession } from "../../session";
import { SessionContainer, SessionServiceContainer } from "../../container";
import { CSNewRelicProviderInfo } from "@codestream/protocols/api";
import { User } from "../../api/extensions";
import { HttpClient } from "../../api/httpClient";
import { NewThirdPartyProviderConfig } from "@codestream/protocols/agent";
import { DeploymentsProvider } from "./deployments/deploymentsProvider";
import { AnomaliesProvider } from "./anomalies/anomaliesProvider";
import { ClmManager } from "./clm/clmManager";
import { EntityAccountResolver } from "./clm/entityAccountResolver";
import { EntityProvider } from "./entity/entityProvider";
import { ReposProvider } from "./repos/reposProvider";
import { NrApiConfig } from "./nrApiConfig";
import { ObservabilityErrorsProvider } from "./errors/observabilityErrorsProvider";
import { GoldenSignalsProvider } from "./goldenSignals/goldenSignalsProvider";
import { NrOrgProvider } from "./orgs/nrOrgProvider";
import { SloProvider } from "./slo/sloProvider";
import { NewRelicVulnerabilitiesProvider } from "./vuln/nrVulnerability";
import { ClmProvider } from "./clm/clmProvider";
import { NrDirectives } from "./directives/nrDirectives";
import { Disposable } from "../../system/disposable";
import { CodeStreamAgent } from "../../agent";
import { SpansProvider } from "./spans/spansProvider";
import { NraiProvider } from "./nrai/nraiProvider";
import { NrLogsProvider } from "./logs/nrLogsProvider";
import { NrNRQLProvider } from "./nrql/nrqlProvider";
import { CompletionItemKind } from "vscode-languageserver";
import { parseId } from "./utils";

let nrDirectives: NrDirectives | undefined;
let disposables: Disposable[] = [];
let codeStreamAgent: CodeStreamAgent | undefined;

/*
Not actually used - agent is restarted at logout but keeping for
possible future use
*/
export function disposeNR() {
	for (const disposable of disposables) {
		disposable.dispose();
		// if (codeStreamAgent) {
		// 	unregisterLsp(codeStreamAgent, disposable);
		// }
	}
	disposables = [];
	nrDirectives = undefined;
}

export async function injectNR(sessionServiceContainer: SessionServiceContainer) {
	const session: CodeStreamSession = sessionServiceContainer.session;
	codeStreamAgent = session.agent;
	const name = "newrelic";
	const user = await sessionServiceContainer.users.getMe();
	const newRelicProviderInfo = User.getProviderInfo<CSNewRelicProviderInfo>(
		user,
		session.teamId,
		name
	);

	if (!newRelicProviderInfo) {
		throw new Error("New Relic provider info not found");
	}

	const newRelicProviderConfig: NewThirdPartyProviderConfig = {
		id: "newrelic*com",
		apiUrl: session.newRelicApiUrl ?? "https://api.newrelic.com",
		name,
		baseHeaders: {
			"Content-Type": "application/json",
			"newrelic-requesting-services": "CodeStream",
		},
	};

	const versionInfo = session.versionInfo;

	const newRelicGraphqlClient = new NewRelicGraphqlClient(
		session,
		newRelicProviderInfo,
		versionInfo,
		session.isProductionCloud
	);

	disposables.push(newRelicGraphqlClient);

	const apiProvider = session.api;
	const nrApiConfig = new NrApiConfig(session);
	const nrOrgProvider = new NrOrgProvider(newRelicGraphqlClient, apiProvider, nrApiConfig);

	// Avoid circular dependency between NewRelicGraphqlClient and NrOrgProvider
	newRelicGraphqlClient.addOnGraphqlClientConnected(async (newRelicUserId: number) => {
		const { orgId } = await nrOrgProvider.updateOrgId({ teamId: session.teamId });
		await session.addNewRelicSuperProps(newRelicUserId, orgId);
	});

	const nrHttpClient = new HttpClient(newRelicProviderConfig, session, newRelicProviderInfo);

	disposables.push(nrHttpClient);

	const deploymentsProvider = new DeploymentsProvider(newRelicGraphqlClient);

	const reposProvider = new ReposProvider(
		newRelicGraphqlClient,
		sessionServiceContainer,
		nrApiConfig
	);

	disposables.push(reposProvider);

	const nraiProvider = new NraiProvider(newRelicGraphqlClient);

	const observabilityErrorsProvider = new ObservabilityErrorsProvider(
		reposProvider,
		nraiProvider,
		newRelicGraphqlClient,
		nrApiConfig,
		newRelicProviderInfo
	);

	const entityProvider = new EntityProvider(newRelicGraphqlClient);

	disposables.push(entityProvider);

	const goldenSignalsProvider = new GoldenSignalsProvider(
		newRelicGraphqlClient,
		reposProvider,
		nrApiConfig
	);

	const entityAccountResolver = new EntityAccountResolver(
		sessionServiceContainer,
		entityProvider,
		goldenSignalsProvider,
		reposProvider
	);

	const anomaliesProvider = new AnomaliesProvider(
		codeStreamAgent,
		entityAccountResolver,
		reposProvider,
		newRelicGraphqlClient,
		deploymentsProvider
	);

	disposables.push(anomaliesProvider);

	const clmManager = new ClmManager(
		anomaliesProvider,
		reposProvider,
		sessionServiceContainer,
		nrApiConfig,
		newRelicGraphqlClient,
		entityAccountResolver
	);

	disposables.push(clmManager);

	const clmProvider = new ClmProvider(
		clmManager,
		newRelicGraphqlClient,
		reposProvider,
		nrApiConfig,
		goldenSignalsProvider,
		deploymentsProvider,
		observabilityErrorsProvider
	);

	disposables.push(clmProvider);

	const sloProvider = new SloProvider(newRelicGraphqlClient, nrOrgProvider);

	const newRelicVulnProviderConfig: NewThirdPartyProviderConfig = {
		id: "newrelic*com",
		apiUrl: session.newRelicSecApiUrl ?? "https://nrsec-workflow-api.staging-service.newrelic.com",
		name: "newrelic-vulnerabilities",
		baseHeaders: {
			"Content-Type": "application/json",
			"newrelic-requesting-services": "CodeStream",
		},
	};

	const vulnHttpClient = new HttpClient(newRelicVulnProviderConfig, session, newRelicProviderInfo);

	disposables.push(vulnHttpClient);

	const spansProvider = new SpansProvider(newRelicGraphqlClient);

	const newRelicVulnerabilitiesProvider = new NewRelicVulnerabilitiesProvider(
		newRelicProviderInfo,
		vulnHttpClient
	);

	disposables.push(newRelicVulnerabilitiesProvider);

	const logsProvider = new NrLogsProvider(newRelicGraphqlClient);
	const nrqlProvider = new NrNRQLProvider(newRelicGraphqlClient);

	nrDirectives = new NrDirectives(
		newRelicGraphqlClient,
		observabilityErrorsProvider,
		reposProvider
	);

	const nrqlFunctions = [
		"average",
		"count",
		"filter",
		"percentage",
		"percentile",
		"stddev",
		"sum",
		"uniqueCount",
		"rate",
		"histogram",
		"since",
		"until",
		"compareWith",
		"timeSlice",
		"timeofday",
		"dateOf",
		"monthOf",
		"yearOf",
		"facet",
		"timeWindow",
		"beginningOfMonth",
		"beginningOfWeek",
		"beginningOfYear",
		"endOfMonth",
		"endOfWeek",
		"endOfYear",
		"now",
		"previousDay",
		"previousMonth",
		"previousWeek",
		"previousYear",
		"thisDay",
		"thisMonth",
		"thisWeek",
		"thisYear",
	];
	const nrqlKeywords = [
		"SELECT",
		"*",
		"FROM",
		"WHERE",
		"AND",
		"OR",
		"LIKE",
		"LIMIT",
		"FACET",
		"TIMESERIES",
		"SINCE",
		"UNTIL",
		"WITH TIMEZONE",
		"COMPARE WITH",
		"AS",
		"INCLUDE ZERO",
		"EXTRAPOLATE",
		"TIMESTAMP",
		"DESC",
		"ASC",
		"AS OF",
		"WITH",
		"COMPARE WITH",
		"USING",
		"INSERT INTO",
		"UPDATE",
		"DELETE FROM",
		"ALTER",
		"SHOW DATABASES",
		"SHOW MEASUREMENTS",
		"SHOW RETENTION POLICIES",
		"SHOW SERIES",
		"SHOW TAG KEYS",
		"SHOW TAG VALUES",
		"SHOW FIELD KEYS",
	];
	let nrCollections: string[] | undefined = undefined;
	let nrCollectionsAsObject: any = {};
	let candidates: string[] = [];
	let accountId = 0;

	candidates = candidates.concat(...nrqlFunctions);
	candidates = candidates.concat(...nrqlKeywords);
	session.agent.connection.onCompletion(async textDocumentPosition => {
		const { textDocument, position } = textDocumentPosition;
		const { line, character } = position;

		// Retrieve the document's text
		const document = session.agent.documents.get(textDocument.uri)!;

		const text = document.getText();

		// Determine the range of the current word
		let wordRange = {
			start: { line: line, character: character },
			end: { line: line, character: character },
		};
		while (wordRange.start.character > 0 && /\w/.test(text.charAt(wordRange.start.character - 1))) {
			wordRange.start.character--;
		}

		// Extract the current word
		const currentWord = text
			.slice(wordRange.start.character, wordRange.end.character)
			.toUpperCase();

		const completionItems = []; // Array to store completion items

		if (nrCollections == null) {
			(async () => {
				try {
					const { users } = SessionContainer.instance();
					const me = await users.getMe();
					const currentRepoId = me?.preferences?.currentO11yRepoId;
					const currentEntityGuid = currentRepoId
						? (me?.preferences?.activeO11y?.[currentRepoId] as string)
						: undefined;
					const result = parseId(currentEntityGuid!);
					if (result) {
						accountId = result.accountId;
						const response = await newRelicGraphqlClient.runNrql<any>(
							result.accountId,
							"SHOW EVENT TYPES"
						);
						nrCollections = response.map(_ => _.eventType) as string[];
						nrCollectionsAsObject = nrCollections.reduce((obj: any, item: any) => {
							obj[item] = true;
							return obj;
						}, {});
						candidates.sort();
					}
				} catch (ex) {
					nrCollections = [];
				}
			})();
		}
		if (nrCollections != null && (text.endsWith("FROM") || text.endsWith("FROM "))) {
			for (const candidate of nrCollections) {
				completionItems.push({
					label: candidate,
					kind: CompletionItemKind.Text,
				});
			}
			return completionItems;
		}
		if (nrCollections != null && (text.endsWith("WHERE") || text.endsWith("WHERE "))) {
			const collection = text.split(" ").find(_ => nrCollectionsAsObject[_]);
			if (collection) {
				const response = await newRelicGraphqlClient.runNrql<any>(
					accountId,
					`SELECT keyset() FROM ${collection}`
				);
				if (response) {
					for (const candidate of response.map(_ => _.key)) {
						completionItems.push({
							label: candidate,
							kind: CompletionItemKind.Text,
						});
					}
					return completionItems;
				}
			}
		}
		// Filter and generate completion items based on the current word

		for (const candidate of [...candidates, ...nrCollections!]) {
			if (candidate.startsWith(currentWord)) {
				completionItems.push({
					label: candidate,
					kind: CompletionItemKind.Text,
				});
			}
		}

		return completionItems;
	});
}

export function getNrDirectives(): NrDirectives | undefined {
	return nrDirectives;
}
