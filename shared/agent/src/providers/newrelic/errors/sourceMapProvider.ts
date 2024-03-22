import { ContextLogger } from "../../contextLogger";
import { CSNewRelicProviderInfo } from "@codestream/protocols/api";
import { FetchCore } from "../../../system/fetchCore";
import { NrApiConfig } from "../nrApiConfig";

export class SourceMapProvider {
	constructor(
		private providerInfo: CSNewRelicProviderInfo | undefined,
		private nrApiConfig: NrApiConfig,
		private fetchClient: FetchCore
	) {}

	public async fetchSourceMap(
		stackTrace: string,
		monitorAccountId: string,
		appId: number,
		releaseIds: string
	): Promise<any> {
		let serviceUrlChunk = "service";
		if (this.nrApiConfig.productUrl.includes("staging")) {
			serviceUrlChunk = "staging-service";
		}

		const url = `https://sourcemaps.${serviceUrlChunk}.newrelic.com/ui/accounts/${monitorAccountId}/applications/${appId}/stacktraces?releaseIds=${encodeURIComponent(
			releaseIds
		)}`;

		let headers: { [key: string]: string } = {
			"Content-Type": "text/plain",
		};

		const token = this.providerInfo?.accessToken;
		if (token) {
			if (this.providerInfo?.tokenType === "access") {
				headers["x-access-token"] = token;
			} else {
				headers["x-id-token"] = token;
			}
		}

		try {
			const response = await this.fetchClient.customFetch(url, {
				method: "POST",
				headers: headers,
				body: stackTrace,
			});

			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			const responseData = await response.json();
			return responseData;
		} catch (error) {
			ContextLogger.error(error, "fetchSourceMap");
		}

		return undefined;
	}
}
