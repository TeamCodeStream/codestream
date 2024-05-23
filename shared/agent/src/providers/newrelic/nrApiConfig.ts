import { CodeStreamSession } from "../../session";

export const PRODUCTION_US_GRAPHQL_URL = "https://nerd-graph.service.newrelic.com/graphql";
export const PRODUCTION_EU_GRAPHQL_URL = "https://nerd-graph.service.eu.newrelic.com/graphql";
const STAGING_GRAPHQL_URL = "https://nerd-graph.staging-service.newrelic.com/graphql";

export class NrApiConfig {
	constructor(private codeStreamSession: CodeStreamSession) {}

	get apiUrl() {
		const newRelicApiUrl = this.codeStreamSession.newRelicApiUrl;
		return newRelicApiUrl || "https://api.newrelic.com";
	}

	get graphqlUrl() {
		if (this.codeStreamSession.api.baseUrl.includes(".service.newrelic.com")) {
			return PRODUCTION_US_GRAPHQL_URL;
		}

		if (this.codeStreamSession.api.baseUrl.includes(".service.eu.newrelic.com")) {
			return PRODUCTION_EU_GRAPHQL_URL;
		}

		return STAGING_GRAPHQL_URL;
	}

	get newRelicSecApiUrl() {
		return (
			this.codeStreamSession.newRelicSecApiUrl ??
			"https://nrsec-workflow-api.staging-service.newrelic.com"
		);
	}

	get productUrl() {
		return this.apiUrl.replace("api.", "one.");
	}

	get baseHeaders() {
		return {
			"Content-Type": "application/json",
			"newrelic-requesting-services": "CodeStream",
			"X-Query-Source-Capability-Id": "CODESTREAM",
			"X-Query-Source-Component-Id": "codestream.ide",
		};
	}
}
