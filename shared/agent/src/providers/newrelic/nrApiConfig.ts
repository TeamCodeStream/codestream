import { CodeStreamSession } from "../../session";

export class NrApiConfig {
	constructor(private codeStreamSession: CodeStreamSession) {}

	get apiUrl() {
		const newRelicApiUrl = this.codeStreamSession.newRelicApiUrl;
		return newRelicApiUrl || "https://api.newrelic.com";
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
