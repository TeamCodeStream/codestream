import { NewRelicGraphqlClient } from "./newRelicGraphqlClient";
import { CodeStreamSession } from "../../session";
import { SessionServiceContainer } from "../../container";
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
import { Logger } from "../../logger";
import { ClmProvider } from "./clm/clmProvider";
import { NrDirectives } from "./directives/nrDirectives";

let nrDirectives: NrDirectives | undefined;

export async function injectNR(sessionServiceContainer: SessionServiceContainer) {
	Logger.log("Injecting New Relic providers");
	const session: CodeStreamSession = sessionServiceContainer.session;
	const codeStreamAgent = session.agent;
	const name = "newrelic";
	const user = await sessionServiceContainer.users.getMe();
	const newRelicProviderInfo = User.getProviderInfo<CSNewRelicProviderInfo>(
		user,
		session.teamId,
		name
	);

	const newRelicProviderConfig: NewThirdPartyProviderConfig = {
		id: "newrelic*com",
		apiUrl: session.newRelicApiUrl ?? "https://api.newrelic.com",
		name,
		baseHeaders: {
			"Content-Type": "application/json",
			"newrelic-requesting-services": "CodeStream",
		},
	};

	if (!newRelicProviderInfo) {
		throw new Error("New Relic provider info not found");
	}

	const versionInfo = session.versionInfo;

	const newRelicGraphqlClient = new NewRelicGraphqlClient(
		session,
		newRelicProviderInfo,
		versionInfo,
		session.isProductionCloud
	);

	const apiProvider = session.api;
	const nrApiConfig = new NrApiConfig(session);
	const nrOrgProvider = new NrOrgProvider(newRelicGraphqlClient, apiProvider, nrApiConfig);

	// Avoid circular dependency between NewRelicGraphqlClient and NrOrgProvider
	newRelicGraphqlClient.onGraphqlClientConnected = async (newRelicUserId: number) => {
		const { orgId } = await nrOrgProvider.updateOrgId({ teamId: session.teamId });
		await session.addNewRelicSuperProps(newRelicUserId, orgId);
	};

	const nrHttpClient = new HttpClient(newRelicProviderConfig, session, newRelicProviderInfo);

	const deploymentsProvider = new DeploymentsProvider(newRelicGraphqlClient);

	const reposProvider = new ReposProvider(
		newRelicGraphqlClient,
		sessionServiceContainer,
		nrApiConfig
	);

	const observabilityErrorsProvider = new ObservabilityErrorsProvider(
		reposProvider,
		newRelicGraphqlClient,
		nrApiConfig
	);

	const entityProvider = new EntityProvider(
		newRelicGraphqlClient,
		reposProvider,
		observabilityErrorsProvider
	);

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

	const clmManager = new ClmManager(
		anomaliesProvider,
		reposProvider,
		sessionServiceContainer,
		nrApiConfig,
		newRelicGraphqlClient,
		entityAccountResolver
	);

	const clmProvider = new ClmProvider(
		clmManager,
		newRelicGraphqlClient,
		reposProvider,
		nrApiConfig,
		goldenSignalsProvider,
		deploymentsProvider,
		observabilityErrorsProvider
	);

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

	const newRelicVulnerabilitiesProvider = new NewRelicVulnerabilitiesProvider(
		newRelicProviderInfo,
		vulnHttpClient
	);

	nrDirectives = new NrDirectives(
		newRelicGraphqlClient,
		observabilityErrorsProvider,
		reposProvider
	);
}

export function getNrDirectives(): NrDirectives | undefined {
	return nrDirectives;
}
