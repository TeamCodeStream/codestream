import { CodeStreamSession } from "../../session";

export class NrApiConfig {
	constructor(private codeStreamSession: CodeStreamSession) {}

	get apiUrl() {
		const newRelicApiUrl = this.codeStreamSession.newRelicApiUrl;
		return newRelicApiUrl || "https://api.newrelic.com";
	}
	get productUrl() {
		return this.apiUrl.replace("api", "one");
	}
}
