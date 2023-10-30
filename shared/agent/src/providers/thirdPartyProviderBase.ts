import { Agent as HttpsAgent } from "https";
import url from "url";

import { Mutex } from "async-mutex";
import { GraphQLClient } from "graphql-request";
import { Headers, Response } from "undici";

import HttpsProxyAgent from "https-proxy-agent";
import { InternalError, ReportSuppressedMessages } from "../agentError";
import {
	AddEnterpriseProviderRequest,
	AddEnterpriseProviderResponse,
	ProviderConfigurationData,
	RemoveEnterpriseProviderRequest,
	ThirdPartyDisconnect,
	ThirdPartyProviderConfig,
} from "@codestream/protocols/agent";
import { CSMe, CSProviderInfos } from "@codestream/protocols/api";

import { User } from "../api/extensions";
import { Container, SessionContainer } from "../container";
import { Logger } from "../logger";
import { CodeStreamSession } from "../session";
import { log } from "../system/decorators/log";
import { ExtraRequestInit, fetchCore } from "../system/fetchCore";
import { isApiError, isErrnoException } from "../system/object";
import { Strings } from "../system";
import { ApiResponse, isRefreshable, ProviderVersion, ThirdPartyProvider } from "./provider";

const transitoryErrors = new Set(["ECONNREFUSED", "ETIMEDOUT", "ECONNRESET", "ENOTFOUND"]);

const TOKEN_EXPIRATION_TOLERANCE_SECONDS = 60 * 1;

export abstract class ThirdPartyProviderBase<
	TProviderInfo extends CSProviderInfos = CSProviderInfos,
> implements ThirdPartyProvider
{
	private _readyPromise: Promise<void> | undefined;
	protected _ensuringConnection: Promise<void> | undefined;
	protected _httpsAgent: HttpsAgent | HttpsProxyAgent | undefined;
	protected _client: GraphQLClient | undefined;
	private _refreshLock = new Mutex();

	constructor(
		public readonly session: CodeStreamSession,
		protected readonly providerConfig: ThirdPartyProviderConfig
	) {}

	protected DEFAULT_VERSION = { version: "0.0.0", asArray: [0, 0, 0], isDefault: true };
	protected _version: ProviderVersion | undefined;

	async ensureInitialized() {}

	abstract get displayName(): string;

	abstract get name(): string;

	abstract get headers(): { [key: string]: string };

	get icon() {
		return this.name;
	}

	// Use central usersManager store that gets updates from pubnub
	protected get _providerInfo(): TProviderInfo | undefined {
		try {
			const me = SessionContainer.instance().users.getMeCached();
			return this.getProviderInfo(me);
		} catch (e) {
			return undefined;
		}
	}

	get accessToken() {
		return this._providerInfo && this._providerInfo.accessToken;
	}

	get apiPath() {
		return "";
	}

	get baseUrl() {
		return `${this.baseWebUrl}${this.apiPath}`;
	}

	get baseWebUrl() {
		const { host, apiHost, isEnterprise } = this.providerConfig;
		return isEnterprise ? host : `https://${apiHost}`;
	}

	async addEnterpriseHost(
		request: AddEnterpriseProviderRequest
	): Promise<AddEnterpriseProviderResponse> {
		return await this.session.api.addEnterpriseProviderHost({
			provider: this.providerConfig.name,
			teamId: this.session.teamId,
			host: request.host,
			data: request.data,
		});
	}

	async removeEnterpriseHost(request: RemoveEnterpriseProviderRequest): Promise<void> {
		await this.session.api.removeEnterpriseProviderHost({
			provider: this.providerConfig.name,
			providerId: request.providerId,
			teamId: this.session.teamId,
		});
	}

	isReady() {
		return !!(this._readyPromise !== undefined);
	}

	resetReady() {
		this._readyPromise = undefined;
	}

	getConfig() {
		return this.providerConfig;
	}

	isConnected(user: CSMe): boolean {
		const providerInfo = this.getProviderInfo(user);
		return this.hasAccessToken(providerInfo);
	}

	hasAccessToken(providerInfo: TProviderInfo | undefined) {
		if (!providerInfo) return false;

		const multiProviderInfo = providerInfo as { multiple: any };
		if (multiProviderInfo && multiProviderInfo.multiple) {
			for (const providerTeamId of Object.keys(multiProviderInfo.multiple)) {
				if (
					multiProviderInfo.multiple[providerTeamId] &&
					multiProviderInfo.multiple[providerTeamId].accessToken
				) {
					return true;
				}
			}
		} else {
			return !!providerInfo.accessToken;
		}

		return false;
	}

	get hasTokenError() {
		return this._providerInfo?.tokenError != null;
	}

	getConnectionData() {
		return {
			providerId: this.providerConfig.id,
		};
	}

	onConnecting() {
		void this.session.api.connectThirdPartyProvider(this.getConnectionData());
	}

	async connect() {
		void this.onConnecting();

		if (!this._providerInfo) return;
		if (!this.hasAccessToken(this._providerInfo)) return;

		this._readyPromise = this.onConnected(this._providerInfo);
		await this._readyPromise;
	}

	protected async onConnected(providerInfo?: TProviderInfo) {
		const info = url.parse(this.baseUrl);

		// if CodeStream is connected through a proxy, then we should be too
		if (info.protocol === "https:" && this.session.proxyAgent instanceof HttpsProxyAgent) {
			Logger.log(
				`${this.providerConfig.name} provider (id:"${this.providerConfig.id}") will use CodeStream's proxy agent`
			);
			this._httpsAgent = this.session.proxyAgent;
			return;
		}

		// if we are connecting with https, and if strictSSL is disabled for CodeStream,
		// assume OK to have it disabled for third-party providers as well,
		// with the one exception of on-prem CodeStream, for whom it is only disabled
		// for self-hosted providers ...
		// ... so in this case, establish our own HTTPS agent
		if (
			info.protocol === "https:" &&
			this.session.disableStrictSSL &&
			(!this.session.isOnPrem ||
				this.providerConfig.forEnterprise ||
				this.providerConfig.isEnterprise)
		) {
			Logger.log(
				`${this.providerConfig.name} provider (id:"${this.providerConfig.id}") will use a custom HTTPS agent with strictSSL disabled`
			);
			this._httpsAgent = new HttpsAgent({
				rejectUnauthorized: false,
			});
		}
	}

	// override to allow configuration without OAuth
	canConfigure() {
		return false;
	}

	@log()
	async configure(config: ProviderConfigurationData, verify?: boolean): Promise<boolean> {
		if (verify) {
			config.pendingVerification = true;
		}
		await this.session.api.setThirdPartyProviderInfo({
			providerId: this.providerConfig.id,
			data: config,
		});
		let result = true;
		if (verify) {
			result = await this.verifyAndUpdate(config);
		}
		this.session.updateProviders();
		return result;
	}

	async verifyAndUpdate(config: ProviderConfigurationData): Promise<boolean> {
		let tokenError;
		try {
			await this.verifyConnection(config);
		} catch (ex) {
			tokenError = {
				error: ex,
				occurredAt: Date.now(),
				isConnectionError: true,
				providerMessage: (ex as Error).message,
			};
			delete config.accessToken;
		}
		config.tokenError = tokenError;
		config.pendingVerification = false;
		this.session.api.setThirdPartyProviderInfo({
			providerId: this.providerConfig.id,
			data: config,
		});
		return !tokenError;
	}

	protected async onConfigured() {}

	async verifyConnection(config: ProviderConfigurationData) {}

	async disconnect(request?: ThirdPartyDisconnect) {
		void (await this.session.api.disconnectThirdPartyProvider({
			providerId: this.providerConfig.id,
			providerTeamId: request && request.providerTeamId,
		}));
		this._readyPromise = this._ensuringConnection = undefined;
		await this.onDisconnected(request);
	}

	protected async onDisconnected(request?: ThirdPartyDisconnect) {}

	async ensureConnected(request?: { providerTeamId?: string }) {
		if (this._readyPromise !== undefined) {
			await this._readyPromise;
		}

		if (this._providerInfo !== undefined) {
			await this.refreshToken(request);
		}
		if (this._ensuringConnection === undefined) {
			this._ensuringConnection = this.ensureConnectedCore(request);
		}
		await this._ensuringConnection;
	}

	private isNewRelicAuth() {
		return (
			this.providerConfig.id === "newrelic*com" &&
			this.session.api.usingServiceGatewayAuth &&
			this._providerInfo?.refreshToken
		);
	}

	async refreshToken(request?: { providerTeamId?: string }): Promise<void> {
		await this._refreshLock.runExclusive(async () => {
			if (this._providerInfo === undefined || !isRefreshable(this._providerInfo)) {
				return;
			}

			const expirationTriggerTime =
				this._providerInfo.expiresAt - 1000 * TOKEN_EXPIRATION_TOLERANCE_SECONDS;
			if (expirationTriggerTime > Date.now()) {
				return;
			}

			try {
				if (this.isNewRelicAuth()) {
					Logger.log("New Relic access token will expire soon, refreshing...");
					await this.session.api.refreshNewRelicToken(this._providerInfo.refreshToken);
				} else {
					await this.session.api.refreshThirdPartyProvider({
						providerId: this.providerConfig.id,
						subId: request && request.providerTeamId,
					});
				}
			} catch (error) {
				if (isErrnoException(error)) {
					if (error.code && transitoryErrors.has(error.code)) {
						// Gets displayed in UI
						throw new Error(`Error refreshing token for ${this.providerConfig.id}: ${error.code}`);
					}
				}
				if (isApiError(error)) {
					/*
					Might be able to narrow down further - need to check what errors come back for temporary
					codestream server -> provider server errors vs real disconnect errors
					(i.e. check error.code is RAPI-1009)
					*/
					await this.disconnect();
					return this.ensureConnected();
				}
				// Track unknown errors but do not disconnect - assume error is temporary
				Logger.error(error, `Unexpected error refreshing token for ${this.providerConfig.id}`);
			}
		});
	}

	private async ensureConnectedCore(request?: { providerTeamId?: string }) {
		const user = await SessionContainer.instance().users.getMe();
		const providerInfo = this.getProviderInfo(user);
		if (providerInfo === undefined) {
			throw new Error(`You must authenticate with ${this.displayName} first.`);
		}

		await this.refreshToken(request);
		this._readyPromise = this.onConnected(providerInfo);
		await this._readyPromise;
	}

	protected async delete<R extends object>(
		url: string,
		headers: { [key: string]: string } = {},
		options: { [key: string]: any } = {}
	): Promise<ApiResponse<R>> {
		let resp = undefined;
		if (resp === undefined) {
			await this.ensureConnected();
			resp = this.fetch<R>(
				url,
				{
					method: "DELETE",
					headers: { ...this.headers, ...headers },
				},
				options
			);
		}
		return resp;
	}

	protected async get<R extends object>(
		url: string,
		headers: { [key: string]: string } = {},
		options: ExtraRequestInit = {},
		ensureConnected = true
	): Promise<ApiResponse<R>> {
		if (ensureConnected) {
			await this.ensureConnected();
		}
		return this.fetch<R>(
			url,
			{
				method: "GET",
				headers: { ...this.headers, ...headers },
			},
			options
		);
	}

	protected async post<RQ extends object, R extends object>(
		url: string,
		body: RQ,
		headers: { [key: string]: string } = {},
		options: { [key: string]: any } = {}
	): Promise<ApiResponse<R>> {
		await this.ensureConnected();
		return this.fetch<R>(
			url,
			{
				method: "POST",
				body: JSON.stringify(body),
				headers: { ...this.headers, ...headers },
			},
			options
		);
	}

	protected async put<RQ extends object, R extends object>(
		url: string,
		body: RQ,
		headers: { [key: string]: string } = {},
		options: { [key: string]: any } = {}
	): Promise<ApiResponse<R>> {
		await this.ensureConnected();
		return this.fetch<R>(
			url,
			{
				method: "PUT",
				body: JSON.stringify(body),
				headers: { ...this.headers, ...headers },
			},
			options
		);
	}

	protected getProviderInfo(me: CSMe) {
		return User.getProviderInfo<TProviderInfo>(
			me,
			this.session.teamId,
			this.name,
			this.providerConfig.isEnterprise ? this.providerConfig.host : undefined
		);
	}

	private async fetch<R extends object>(
		url: string,
		init: ExtraRequestInit,
		options: { [key: string]: any } = {}
	): Promise<ApiResponse<R>> {
		if (this._providerInfo && this._providerInfo.tokenError) {
			throw new InternalError(ReportSuppressedMessages.AccessTokenInvalid);
		}

		const start = process.hrtime();

		let traceResult;
		let method;
		let absoluteUrl;
		try {
			if (init === undefined) {
				init = {};
			}

			method = (init && init.method) || "GET";
			absoluteUrl = options.absoluteUrl ? url : `${this.baseUrl}${url}`;
			if (options.timeout != null) {
				init.timeout = options.timeout;
			}

			let json: Promise<R> | undefined;
			let resp: Response | undefined;
			let retryCount = 0;
			let triedRefresh = false;
			if (json === undefined) {
				while (!resp) {
					[resp, retryCount] = await fetchCore(0, absoluteUrl, init);
					if (
						this.isNewRelicAuth() &&
						!triedRefresh &&
						!resp.ok &&
						resp.status === 403 &&
						this._providerInfo &&
						this._providerInfo.refreshToken &&
						init?.headers instanceof Headers
					) {
						let tokenInfo;
						try {
							Logger.log(
								"On New Relic API request, token was found to be expired, attempting to refresh..."
							);
							tokenInfo = await this.session.api.refreshNewRelicToken(
								this._providerInfo.refreshToken
							);
							Logger.log("NR access token successfully refreshed, trying request again...");
							init.headers.set("Authorization", `Bearer ${tokenInfo.accessToken}`);
							triedRefresh = true;
							resp = undefined;
						} catch (ex) {
							Logger.warn("Exception thrown refreshing New Relic access token", ex);
							// allow the original (failed) flow to continue, more meaningful than throwing an exception on refresh
						}
					}
				}

				[resp, retryCount] = await fetchCore(0, absoluteUrl, init);

				if (resp.ok) {
					traceResult = `${this.displayName}: Completed ${method} ${url}`;
					if (options?.useRawResponse || resp.status === 204) {
						json = resp.text() as any;
					} else {
						try {
							json = resp.json() as Promise<R>;
						} catch (jsonError) {
							Container.instance().errorReporter.reportBreadcrumb({
								message: `provider fetchCore parseJsonError`,
								data: {
									jsonError,
									text: resp.text() as any,
								},
							});
						}
					}
				}
			}

			if (resp !== undefined && !resp.ok) {
				traceResult = `${this.displayName}: FAILED(${retryCount}x) ${method} ${absoluteUrl}`;
				const error = await this.handleErrorResponse(resp);
				Container.instance().errorReporter.reportBreadcrumb({
					message: `provider fetchCore response`,
					data: {
						error,
					},
				});
				throw error;
			}

			return {
				body: await json!,
				response: resp!,
			};
		} catch (ex) {
			throw ex;
		} finally {
			Logger.log(
				`${traceResult}${
					init && init.body ? ` body=${init && init.body}` : ""
				} \u2022 ${Strings.getDurationMilliseconds(start)} ms`
			);
		}
	}

	protected async handleErrorResponse(response: Response): Promise<Error> {
		let message = response.statusText;
		let data: any;
		Logger.debug("handleErrorResponse: ", JSON.stringify(response, null, 4));
		if (response.status === 401) {
			return new InternalError(ReportSuppressedMessages.Unauthorized);
		}
		if (response.status >= 400 && response.status < 500) {
			try {
				data = await response.json();
				if (this.isUnauthorizedError(response, data)) {
					return new InternalError(ReportSuppressedMessages.Unauthorized);
				}
				// warn as not to trigger a sentry but still have it be in the user's log
				try {
					Logger.warn(`handleErrorResponse:json: ${JSON.stringify(data, null, 4)}`);
				} catch {}
				if (data.code) {
					message += `(${data.code})`;
				}
				if (data.message) {
					message += `: ${data.message}`;
				}
				if (data.info && data.info.name) {
					message += `\n${data.info.name}`;
				}
				if (Array.isArray(data.errors)) {
					for (const error of data.errors) {
						if (error.message) {
							message += `\n${error.message}`;
						}
						// GitHub will return these properties
						else if (error.resource && error.field && error.code) {
							message += `\n${error.resource} field ${error.field} ${error.code}`;
						} else {
							// else give _something_ to the user
							message += `\n${JSON.stringify(error)}`;
						}
					}
				}
				if (Array.isArray(data.errorMessages)) {
					for (const errorMessage of data.errorMessages) {
						message += `\n${errorMessage}`;
					}
				}
				if (data.error) {
					if (data.error.message) {
						message += `: ${data.error.message}`;
					} else {
						message += `: ${data.error}`;
					}
				}
			} catch {}
		}
		return new Error(message);
	}

	protected isUnauthorizedError(response: Response, data: any) {
		return false;
	}
}
