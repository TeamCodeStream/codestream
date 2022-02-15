"use strict";
import { GitRemoteLike } from "git/gitService";
import { GraphQLClient } from "graphql-request";
import semver from "semver";
import { URI } from "vscode-uri";
import { Container } from "../container";
import { Logger } from "../logger";
import { DidChangePullRequestCommentsNotificationType } from "../protocol/agent.protocol";
import { ProviderConfigurationData } from "../protocol/agent.protocol.providers";
import { log, lspProvider } from "../system";
import { GitHubProvider } from "./github";
import { ProviderGetRepoInfoResponse, ProviderPullRequestInfo, ProviderVersion } from "./provider";

/**
 * GitHub Enterprise
 * minimum supported version is 2.19.6 https://enterprise.github.com/releases/2.19.6/notes
 */
@lspProvider("github_enterprise")
export class GitHubEnterpriseProvider extends GitHubProvider {
	private static ApiVersionString = "v3";

	get displayName() {
		return "GitHub Enterprise";
	}

	get name() {
		return "github_enterprise";
	}

	get apiPath() {
		return this.providerConfig.forEnterprise || this.providerConfig.isEnterprise
			? `/api/${GitHubEnterpriseProvider.ApiVersionString}`
			: "";
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

	get graphQlBaseUrl() {
		return `${this.baseUrl.replace(`/${GitHubEnterpriseProvider.ApiVersionString}`, "")}/graphql`;
	}

	async ensureInitialized() {
		await this.getVersion();
	}

	protected async getVersion(): Promise<ProviderVersion> {
		try {
			if (this._version == null) {
				const response = await this.get<{ installed_version: string }>("/meta");
				const installedVersion = response.body.installed_version;
				this._version = {
					version: installedVersion,
					asArray: (installedVersion || "0.0.0").split(".").map(Number)
				};
				Logger.log(
					`GitHubEnterprise getVersion - ${this.providerConfig.id} version=${this._version.version}`
				);
				Container.instance().errorReporter.reportBreadcrumb({
					message: `GitHubEnterprise getVersion`,
					data: {
						version: this._version
					}
				});
			}
		} catch (ex) {
			Logger.warn(ex.message || ex.toString());
			return this.DEFAULT_VERSION;
		}
		return this._version;
	}

	getIsMatchingRemotePredicate() {
		const baseUrl = this._providerInfo?.data?.baseUrl || this.getConfig().host;
		const configDomain = baseUrl ? URI.parse(baseUrl).authority : "";
		return (r: GitRemoteLike) => configDomain !== "" && r.domain === configDomain;
	}

	private _isPRApiCompatible: boolean | undefined;
	protected async isPRApiCompatible(): Promise<boolean> {
		if (this._isPRApiCompatible == null) {
			const version = await this.getVersion();
			const [major, minor] = version.asArray;
			this._isPRApiCompatible = major > 2 || (major === 2 && minor >= 15);
		}

		return this._isPRApiCompatible;
	}

	private _isPRCreationApiCompatible: boolean | undefined;
	protected async isPRCreationApiCompatible(): Promise<boolean> {
		if (this._isPRCreationApiCompatible == null) {
			try {
				const version = await this.getVersion();
				const [major, minor, patch] = version.asArray;

				if (major > 2) {
					this._isPRCreationApiCompatible = true;
				} else if (major === 2 && minor === 19) {
					this._isPRCreationApiCompatible = patch >= 6;
				} else {
					this._isPRCreationApiCompatible = major === 2 && minor > 19;
				}
			} catch (ex) {
				this._isPRCreationApiCompatible = false;
				Logger.warn(ex);
			}
		}

		return this._isPRCreationApiCompatible;
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

	private _atMe: string | undefined;
	/**
	 * getMe - gets the username (login) for a GH request
	 *
	 * @protected
	 * @return {*}  {Promise<string>}
	 * @memberof GitHubEnterpriseProvider
	 */
	protected async getMe(): Promise<string> {
		if (this._atMe) return this._atMe;

		try {
			const query = await this.query<any>(`
			query {
				viewer {
					login
				}
			}`);

			this._atMe = query.viewer.login;
			return this._atMe!;
		} catch (ex) {
			Logger.error(ex);
		}
		this._atMe = await super.getMe();
		return this._atMe;
	}

	protected async client(): Promise<GraphQLClient> {
		if (this._client === undefined && this.accessToken) {
			// query for the version
			await this.getVersion();
		}
		return super.client();
	}

	async query<T = any>(query: string, variables: any = undefined) {
		const v = await this.getVersion();
		// we know that in version 2.19.6, @me doesn't work
		if (v && semver.lt(v.version, "2.21.0") && query.indexOf("@me") > -1) {
			query = query.replace(/@me/g, await this.getMe());
		}
		return super.query<T>(query, variables);
	}
}

interface GitHubEnterpriseRepo {
	id: string;
	node_id: string;
	full_name: string;
	path: string;
	has_issues: boolean;
	default_branch: string;
}

interface GitHubEnterprisePullRequest {
	id: string;
	html_url: string;
	base: { ref: string };
	head: { ref: string };
}
