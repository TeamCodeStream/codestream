import { isEmpty } from "lodash";
import { errors, fetch, Request, RequestInfo, RequestInit, Response } from "undici";
import { Logger } from "../logger";
import { Functions } from "./function";
import { handleLimit, InternalRateError, InternalRateForceLogoutError } from "../rateLimits";
import { SessionContainer } from "../container";
import { SessionTokenStatus } from "@codestream/protocols/agent";

export interface ExtraRequestInit extends RequestInit {
	timeout?: number;
	skipInterceptors?: boolean;
}

export type ResponseInterceptor = (
	resp: Response,
	init: ExtraRequestInit,
	triedRefresh: boolean,
	loggingPrefix: string
) => Promise<InterceptorResponse>;

export type InterceptorResponse = "retry" | "abort" | "continue";

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

export class FetchCore {
	constructor(private readonly responseInterceptor?: ResponseInterceptor) {}

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
			handleLimit(origin, init.method ?? "GET", path);
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
			let interceptorResponse: InterceptorResponse = "continue";
			if (this.responseInterceptor) {
				interceptorResponse = await this.responseInterceptor(
					resp,
					init,
					triedRefresh,
					loggingPrefix
				);
			}
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
			if (ex instanceof InternalRateForceLogoutError) {
				if (SessionContainer.isInitialized()) {
					Logger.log("Setting session expired due to force logout error");
					SessionContainer.instance().session.onSessionTokenStatusChanged(
						SessionTokenStatus.Expired
					);
				}
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
}
