import url from "url";
import { HttpsProxyAgent } from "https-proxy-agent";
import { Logger } from "../../logger";
import { CodeStreamSession } from "../../session";
import { ThirdPartyProviderConfig } from "@codestream/protocols/agent";

export class NewRelicHttpClient {
	constructor(
		private session: CodeStreamSession,
		private providerConfig: ThirdPartyProviderConfig
	) {}

	get baseUrl(): string {
		return this.session.newRelicApiUrl ?? "https://api.newrelic.com";
	}

	get httpsAgent() {
		return this.session.proxyAgent;
	}
	protected async onConnected() {
		const info = url.parse(this.baseUrl);

		// if CodeStream is connected through a proxy, then we should be too
		if (info.protocol === "https:" && this.session.proxyAgent instanceof HttpsProxyAgent) {
			Logger.log(
				`${this.providerConfig.name} provider (id:"${this.providerConfig.id}") will use CodeStream's proxy agent`
			);
			return;
		}
	}
}
