import { ApiResponse } from "../providers/provider";
import { ExtraRequestInit, FetchCore } from "../system/fetchCore";
import { InternalError, ReportSuppressedMessages } from "../agentError";
import { NewThirdPartyProviderConfig } from "@codestream/protocols/agent";
import { Headers, Response } from "undici";
import { CodeStreamSession } from "../session";
import { CSAccessTokenType, CSProviderInfo } from "@codestream/protocols/api";
import { Logger } from "../logger";
import { Container } from "../container";
import { Disposable, Strings } from "../system";

export class HttpClient implements Disposable {
	constructor(
		private providerConfig: NewThirdPartyProviderConfig,
		private session: CodeStreamSession,
		private providerInfo: CSProviderInfo | undefined,
		private fetchClient: FetchCore
	) {}

	get headers() {
		const headers = { ...this.providerConfig.baseHeaders };

		const token = this.providerInfo?.accessToken;
		if (token) {
			if (this.providerInfo?.bearerToken) {
				if (this.providerInfo?.tokenType === "access") {
					headers["x-access-token"] = token;
				} else {
					headers["x-id-token"] = token;
				}
				//headers["Authorization"] = `Bearer ${token}`;
			} else {
				headers["Api-Key"] = token;
			}
		}
		return headers;
	}

	get apiUrl() {
		return this.providerConfig.apiUrl;
	}

	async get<R extends object>(
		url: string,
		headers: { [key: string]: string } = {},
		options: ExtraRequestInit = {},
		ensureConnected = true
	): Promise<ApiResponse<R>> {
		if (ensureConnected) {
			// await this.ensureConnected();
		}
		const mergedHeaders = { ...this.headers, ...headers };
		return this.fetch<R>(
			url,
			{
				method: "GET",
				headers: mergedHeaders,
			},
			options
		);
	}

	async post<RQ extends object, R extends object>(
		url: string,
		body: RQ,
		headers: { [key: string]: string } = {},
		options: { [key: string]: any } = {}
	): Promise<ApiResponse<R>> {
		// await this.ensureConnected();
		const mergedHeaders = { ...this.headers, ...headers };
		return this.fetch<R>(
			url,
			{
				method: "POST",
				body: JSON.stringify(body),
				headers: mergedHeaders,
			},
			options
		);
	}

	async put<RQ extends object, R extends object>(
		url: string,
		body: RQ,
		headers: { [key: string]: string } = {},
		options: { [key: string]: any } = {}
	): Promise<ApiResponse<R>> {
		// await this.ensureConnected();
		const mergedHeaders = { ...this.headers, ...headers };
		return this.fetch<R>(
			url,
			{
				method: "PUT",
				body: JSON.stringify(body),
				headers: mergedHeaders,
			},
			options
		);
	}

	private async fetch<R extends object>(
		url: string,
		init: ExtraRequestInit,
		options: { [key: string]: any } = {}
	): Promise<ApiResponse<R>> {
		// TODO REF redo tokenError logic
		// if (this._providerInfo && this._providerInfo.tokenError) {
		// 	throw new InternalError(ReportSuppressedMessages.AccessTokenInvalid);
		// }

		const start = process.hrtime();

		let traceResult;
		let method;
		let absoluteUrl;
		try {
			if (init === undefined) {
				init = {};
			}

			method = (init && init.method) || "GET";
			absoluteUrl = options.absoluteUrl ? url : `${this.apiUrl}${url}`;
			if (options.timeout != null) {
				init.timeout = options.timeout;
			}

			let json: Promise<R> | undefined;
			let resp: Response | undefined;
			let retryCount = 0;
			let triedRefresh = false;
			if (json === undefined) {
				while (!resp) {
					[resp, retryCount] = await this.fetchClient.fetchCore(0, absoluteUrl, init);
					if (
						this.isNewRelicAuth() &&
						!triedRefresh &&
						!resp.ok &&
						resp.status === 403 &&
						this.providerInfo &&
						this.providerInfo.refreshToken &&
						init?.headers instanceof Headers
					) {
						let tokenInfo;
						try {
							Logger.log(
								"On New Relic API request, token was found to be expired, attempting to refresh..."
							);
							tokenInfo = await this.session.api.refreshNewRelicToken(
								this.providerInfo.refreshToken
							);
							this.providerInfo.accessToken = tokenInfo.accessToken;
							this.providerInfo.refreshToken = tokenInfo.refreshToken;
							this.providerInfo.tokenType = tokenInfo.tokenType;
							Logger.log("NR access token successfully refreshed, trying request again...");
							if (tokenInfo.tokenType === CSAccessTokenType.ACCESS_TOKEN) {
								init.headers.set("x-access-token", tokenInfo.accessToken);
							} else {
								init.headers.set("x-id-token", tokenInfo.accessToken);
							}
							//init.headers.set("Authorization", `Bearer ${tokenInfo.accessToken}`);
							triedRefresh = true;
							resp = undefined;
						} catch (ex) {
							Logger.warn("Exception thrown refreshing New Relic access token", ex);
							// allow the original (failed) flow to continue, more meaningful than throwing an exception on refresh
						}
					}
				}

				[resp, retryCount] = await this.fetchClient.fetchCore(0, absoluteUrl, init);

				if (resp.ok) {
					traceResult = `${this.providerConfig.name}: Completed ${method} ${url}`;
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
				traceResult = `${this.providerConfig.name}: FAILED(${retryCount}x) ${method} ${absoluteUrl}`;
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

	async handleErrorResponse(response: Response): Promise<Error> {
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

	private isNewRelicAuth(): boolean {
		return (
			this.providerConfig.id === "newrelic*com" &&
			this.session.api.usingServiceGatewayAuth &&
			this.providerInfo?.refreshToken !== undefined
		);
	}

	protected isUnauthorizedError(response: Response, data: any) {
		return false;
	}

	dispose(): void {
		delete this.providerInfo;
	}
}
