// eslint-disable: Keep unused vars to make it easy to inject objects into new dependencies as they are added
/* eslint-disable  unused-imports/no-unused-vars */
import { NewThirdPartyProviderConfig } from "@codestream/protocols/agent";
import { CSNewRelicProviderInfo } from "@codestream/protocols/api";
import { CompletionItem, CompletionParams } from "vscode-languageserver";
import { CodeStreamAgent } from "../../agent";
import { User } from "../../api/extensions";
import { HttpClient } from "../../api/httpClient";
import { SessionServiceContainer } from "../../container";
import { CodeStreamSession } from "../../session";
import { Disposable } from "../../system/disposable";
import { AnomaliesProvider } from "./anomalies/anomaliesProvider";
import { ClmManager } from "./clm/clmManager";
import { ClmProvider } from "./clm/clmProvider";
import { EntityAccountResolver } from "./clm/entityAccountResolver";
import { DeploymentsProvider } from "./deployments/deploymentsProvider";
import { NrDirectives } from "./directives/nrDirectives";
import { EntityProvider } from "./entity/entityProvider";
import { ObservabilityErrorsProvider } from "./errors/observabilityErrorsProvider";
import { GoldenSignalsProvider } from "./goldenSignals/goldenSignalsProvider";
import { NewRelicGraphqlClient } from "./newRelicGraphqlClient";
import { NrApiConfig } from "./nrApiConfig";
import { NrOrgProvider } from "./orgs/nrOrgProvider";
import { ReposProvider } from "./repos/reposProvider";
import { SloProvider } from "./slo/sloProvider";
import { SpansProvider } from "./spans/spansProvider";
import { NraiProvider } from "./nrai/nraiProvider";
import { NrLogsProvider } from "./logs/nrLogsProvider";
import { NrNRQLProvider } from "./nrql/nrqlProvider";
import { NewRelicVulnerabilitiesProvider } from "./vuln/nrVulnerability";
import { NrqlCompletionProvider } from "./nrql/nrqlCompletionProvider";
import { AccountProvider } from "./account/accountProvider";
import { PatchProvider } from "./patches/patchProvider";

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
		await nrOrgProvider.updateOrgId({ teamId: session.teamId });
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

	disposables.push(new AccountProvider(newRelicGraphqlClient));

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

	const nrqlCompletionProvider = new NrqlCompletionProvider(session, nrqlProvider);
	session.agent.connection.onCompletion(async (textDocumentPosition: CompletionParams) => {
		return new Promise<CompletionItem[]>((resolve, reject) => {
			nrqlCompletionProvider
				.onCompletion(textDocumentPosition)
				.then((data: CompletionItem[]) => {
					resolve(data);
				})
				.catch((error: any) => {
					reject(error);
				});
		});
	});

	session.agent.connection.onCompletionResolve((item: CompletionItem) => {
		return nrqlCompletionProvider.onCompletionResolve(item);
	});

	const patchProvider = new PatchProvider();
	disposables.push(patchProvider);
}

export function getNrDirectives(): NrDirectives | undefined {
	return nrDirectives;
}
