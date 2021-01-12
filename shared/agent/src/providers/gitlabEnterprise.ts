"use strict";

import { URI } from "vscode-uri";
import { GitRemoteLike } from "../git/gitService";
import { ProviderConfigurationData } from "../protocol/agent.protocol.providers";
import { log, lspProvider } from "../system";
import { GitLabProvider } from "./gitlab";
import { Logger } from "../logger";

@lspProvider("gitlab_enterprise")
export class GitLabEnterpriseProvider extends GitLabProvider {
	get displayName() {
		return "GitLab Self-Managed";
	}

	get name() {
		return "gitlab_enterprise";
	}

	get apiPath() {
		return this.providerConfig.forEnterprise || this.providerConfig.isEnterprise ? "/api/v4" : "";
	}

	get headers() {
		// Certain GitLab self-managed servers do not accept
		// the Authorization header but rather use a PRIVATE-TOKEN
		// header. See https://docs.gitlab.com/ee/api/#oauth2-tokens
		// and https://docs.gitlab.com/11.11/ee/api/README.html
		return {
			"PRIVATE-TOKEN": this.accessToken!,
			"Content-Type": "application/json"
		};
	}

	getIsMatchingRemotePredicate() {
		const baseUrl = this._providerInfo?.data?.baseUrl || this.getConfig().host;
		const configDomain = baseUrl ? URI.parse(baseUrl).authority : "";
		return (r: GitRemoteLike) => configDomain !== "" && r.domain === configDomain;
	}

	get baseUrl() {
		const { host, apiHost, isEnterprise, forEnterprise } = this.providerConfig;
		let returnHost;
		if (isEnterprise) {
			returnHost = host;
		} else if (forEnterprise) {
			returnHost = this._providerInfo?.data?.baseUrl || host;
		} else {
			returnHost = `https://${apiHost}`;
		}
		return `${returnHost}${this.apiPath}`;
	}

	@log()
	async configure(request: ProviderConfigurationData) {
		await this.session.api.setThirdPartyProviderToken({
			providerId: this.providerConfig.id,
			host: request.host,
			token: request.token,
			data: {
				baseUrl: request.baseUrl
			}
		});
		this.session.updateProviders();
	}
}
