import {
	FetchThirdPartyCodeAnalyzersRequest,
	FetchThirdPartyCodeAnalyzersResponse,
	ThirdPartyProviderConfig,
} from "@codestream/protocols/agent";
import { log, lspProvider } from "../system";
import { CodeStreamSession } from "session";

import { ThirdPartyCodeAnalyzerProviderBase } from "./thirdPartyCodeAnalyzerProviderBase";
import { CSFossaProviderInfo } from "@codestream/protocols/api";

@lspProvider("fossa")
export class FossaProvider extends ThirdPartyCodeAnalyzerProviderBase<CSFossaProviderInfo> {
	constructor(
		public readonly session: CodeStreamSession,
		protected readonly providerConfig: ThirdPartyProviderConfig
	) {
		super(session, providerConfig);
	}

	get displayName() {
		return "Fossa.com";
	}

	get name() {
		return "fossa";
	}

	get headers() {
		return {
			Accept: "application/json",
			Authorization: `Bearer ${this.accessToken}`,
			"Content-Type": "application/json",
		};
	}

	get apiPath() {
		return "/api/v2";
	}

	get apiUrl() {
		return "https://fossa.com";
	}

	get appUrl() {
		return "https://app.fossa.com";
	}

	get baseUrl() {
		return `${this.apiUrl}/${this.apiPath}`;
	}

	@log()
	async fetchCodeAnalysis(
		request: FetchThirdPartyCodeAnalyzersRequest
	): Promise<FetchThirdPartyCodeAnalyzersResponse> {
		return {
			message: "HELLO WORLD",
		};
	}
}
