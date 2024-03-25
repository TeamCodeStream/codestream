import { isEmpty } from "lodash";
import { errors, fetch, Headers, Request, RequestInfo, RequestInit, Response } from "undici";
import { Logger } from "../logger";
import { Functions } from "./function";
import { handleLimit, InternalRateError } from "../rateLimits";
import { tokenHolder } from "../providers/newrelic/TokenHolder";
import { CSAccessTokenType } from "@codestream/protocols/api";
import { SessionContainer } from "../container";
import { Mutex } from "async-mutex";

export interface ExtraRequestInit extends RequestInit {
	timeout?: number;
	skipInterceptors?: boolean;
}

const noLogRetries = [
	"UND_ERR_CONNECT_TIMEOUT",
	"UND_ERR_HEADERS_TIMEOUT",
	"UND_ERR_ABORTED",
	"UND_ERR_SOCKET",
	"UND_ERR_RESPONSE_STATUS_CODE",
	"ENOTFOUND",
	"ECONNREFUSED",
	"ECONNRESET",
];

type InterceptorResponse = "retry" | "abort" | "continue";

// export type ResponseInterceptor = (response: Response) => void;

export class FetchCore {
	private _refreshLock = new Mutex();

	private isUndiciError(error: unknown): error is errors.UndiciError {
		const possible = error as errors.UndiciError;
		if (!possible) {
			return false;
		}
		return !!possible.code && !!possible.name;
	}

	private shouldLogRetry(error: Error): boolean {
		const cause = error.cause;
		if (this.isUndiciError(cause)) {
			// Can't use instance of due to jest tests borking classes
			return !noLogRetries.find(e => e.includes(cause.code));
		}
		return error.name !== "AbortError";
	}

	async customFetch(url: string, init?: ExtraRequestInit): Promise<Response> {
		const response = await this.fetchCore(0, url, init);
		return response[0];
	}

	private urlOrigin(requestInfo: RequestInfo): { origin: string; path?: string } {
		try {
			if (!requestInfo) {
				return { origin: "<unknown>" };
			}
			const urlString =
				typeof requestInfo === "string"
					? requestInfo
					: requestInfo instanceof Request
					? requestInfo.url
					: requestInfo.href;
			if (isEmpty(urlString)) {
				return { origin: "<unknown>" };
			}
			if (typeof requestInfo === "string") {
				const url = new URL(requestInfo);
				return { origin: url.origin, path: url.pathname };
			}
		} catch (e) {
			// ignore
		}
		return { origin: "<unknown>" };
	}

	async fetchCore(
		count: number,
		url: RequestInfo,
		init?: ExtraRequestInit,
		triedRefresh = false
	): Promise<[Response, number]> {
		if (!init) {
			init = {};
		}
		const { origin, path } = this.urlOrigin(url);
		const loggingPrefix = `[fetchCore] [${init?.method ?? "GET"} ${origin}${path}]`;
		let timeout: NodeJS.Timeout | undefined = undefined;
		try {
			handleLimit(origin);
			const controller = new AbortController();
			timeout = setTimeout(() => {
				try {
					controller.abort();
				} catch (e) {
					Logger.warn(`${loggingPrefix} AbortController error`, e);
				}
			}, init.timeout ?? 30000);
			init.signal = controller.signal;
			const resp = await fetch(url, init);
			const interceptorResponse = await this.handleRefreshInterceptor(
				resp,
				init,
				triedRefresh,
				loggingPrefix
			);
			if (interceptorResponse === "abort") {
				// No retry
				return [resp, count];
			}
			const overrideRetry = interceptorResponse === "retry"; // Have to override for 403 status code
			triedRefresh = true;
			if (resp.status < 200 || resp.status > 299 || overrideRetry) {
				if (resp.status < 400 || resp.status >= 500 || overrideRetry) {
					count++;
					if (count <= 3) {
						const waitMs = overrideRetry ? 0 : 250 * count;
						if (Logger.isDebugging) {
							const logUrl = `[${init?.method ?? "GET"}] ${origin}`;
							Logger.debug(
								`${loggingPrefix} Retry ${count} for ${logUrl} due to http status ${resp.status} waiting ${waitMs}`
							);
						}
						await Functions.wait(waitMs);
						if (timeout) {
							clearTimeout(timeout);
							timeout = undefined;
						}
						if (init.signal) {
							delete init.signal;
						}
						// Use unmodified init
						return this.fetchCore(count, url, init, triedRefresh);
					}
				}
			}
			return [resp, count];
		} catch (ex) {
			Logger.log(`${loggingPrefix} fetchCore caught`, ex);
			// Note access token error can come from nerdgraph or codestream-api or nrsec vulnerabilities
			if (timeout) {
				clearTimeout(timeout);
				timeout = undefined;
			}
			if (init.signal) {
				delete init.signal;
			}
			if (ex instanceof InternalRateError) {
				throw ex;
			}

			const shouldLog = this.shouldLogRetry(ex);
			if (shouldLog) {
				ex.cause ? Logger.error(ex.cause, loggingPrefix) : Logger.error(ex, loggingPrefix);
			}
			count++;
			if (count <= 3) {
				const waitMs = 250 * count;
				if (Logger.isDebugging) {
					const logUrl = `[${init?.method ?? "GET"}] ${origin}`;
					Logger.debug(
						`${loggingPrefix} Retry ${count} for ${logUrl} due to Error ${
							ex.cause ? ex.cause.message : ex.message
						} waiting ${waitMs}`
					);
				}
				await Functions.wait(waitMs);
				return this.fetchCore(count, url, init);
			}
			throw ex.cause ? ex.cause : ex;
		} finally {
			if (timeout) {
				clearTimeout(timeout);
			}
			if (init.signal) {
				delete init.signal;
			}
		}
	}

	private async handleRefreshInterceptor(
		resp: Response,
		init: ExtraRequestInit,
		triedRefresh: boolean,
		loggingPrefix: string
	): Promise<InterceptorResponse> {
		// !SessionContainer.instance().session.api.usingServiceGatewayAuth - probably not needed and
		// at initial bootstrap it's hard to get
		if (init.skipInterceptors || triedRefresh) {
			return "continue";
		}
		const refreshToken = tokenHolder.refreshToken;
		const isHeaders = init?.headers instanceof Headers;
		if (!isHeaders) {
			init.headers = new Headers(init.headers);
		}
		if (!resp.ok && resp.status === 403 && refreshToken) {
			const resp2 = resp.clone();
			const textData = await resp2.text(); // JSON response if from api-server, large HTML text blob if from service gateway
			const isTokenExpired = textData.includes("token expired");
			const tokenExpiredSource = this.getSource(textData, loggingPrefix);
			if (isTokenExpired) {
				Logger.log(`${loggingPrefix} Handling expired token from: ${tokenExpiredSource}`);
				if (this._refreshLock.isLocked()) {
					Logger.log(`${loggingPrefix} Waiting for already running refresh token`);
					await this._refreshLock.waitForUnlock();
					// TODO how to handle errors here - store in local class variable?
					const accessToken = tokenHolder.accessToken;
					const tokenType = tokenHolder.tokenType;
					if (accessToken && tokenType) {
						if (init?.headers instanceof Headers) {
							if (tokenType === CSAccessTokenType.ACCESS_TOKEN) {
								init.headers.set("x-access-token", accessToken);
							} else {
								init.headers.set("x-id-token", accessToken);
							}
						}
					}
					Logger.log(`${loggingPrefix} Refresh token wait completed`);
					return "retry";
				}
				const result = this._refreshLock.runExclusive(async () => {
					Logger.log(`${loggingPrefix} Token was found to be expired, attempting to refresh...`);
					return await this.tokenRefresh(refreshToken, init, loggingPrefix);
				});
				return result;
			}
		}
		return "continue"; // Not a 403 error or not token expired so let existing fetchCore logic run
	}

	private getSource(textData: string, loggingPrefix: string) {
		// Confirmed nerdgraph and vulnerabilities reset api look the same (bith service gateway)
		const isServiceGatewayTokenExpired = textData.includes(
			"<title>403 Sorry – You've reached an error on New Relic</title>"
		);
		const isApiServerTokenExpired = textData.includes("service gateway: access token expired");

		const tokenExpiredSource = isServiceGatewayTokenExpired
			? "SG"
			: isApiServerTokenExpired
			? "api-server"
			: "unknown";
		if (tokenExpiredSource === "unknown") {
			// TODO textData might be too big to log
			Logger.log(`${loggingPrefix} unknown 403 error`, textData);
		}
		return tokenExpiredSource;
	}

	private async tokenRefresh(
		refreshToken: string,
		init: ExtraRequestInit,
		loggingPrefix: string
	): Promise<InterceptorResponse> {
		try {
			const tokenInfo = await SessionContainer.instance().session.api.refreshNewRelicToken(
				refreshToken
			);
			Logger.log(
				`${loggingPrefix} NR access token successfully refreshed, trying request again...`
			);
			if (init?.headers instanceof Headers) {
				if (tokenInfo.tokenType === CSAccessTokenType.ACCESS_TOKEN) {
					init.headers.set("x-access-token", tokenInfo.accessToken);
				} else {
					init.headers.set("x-id-token", tokenInfo.accessToken);
				}
			}
			return "retry";
		} catch (ex) {
			Logger.warn(`${loggingPrefix} Exception thrown refreshing NR access token:`, ex);
			return "abort";
			// allow the original (failed) flow to continue, more meaningful than throwing an exception on refresh
		}
	}
}
