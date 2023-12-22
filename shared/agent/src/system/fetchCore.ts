import { isEmpty } from "lodash";
import { errors, fetch, Request, RequestInfo, RequestInit, Response } from "undici";
import { Logger } from "../logger";
import { Functions } from "./function";
import { handleLimit, InternalRateError } from "../rateLimits";
import { ReportSuppressedMessages } from "../agentError";

export interface ExtraRequestInit extends RequestInit {
	timeout?: number;
}

const noLogRetries = [
	"UND_ERR_CONNECT_TIMEOUT",
	"UND_ERR_HEADERS_TIMEOUT",
	"UND_ERR_ABORTED",
	"UND_ERR_SOCKET",
	"UND_ERR_RESPONSE_STATUS_CODE",
	"ENOTFOUND",
	"ECONNREFUSED",
];

function isUndiciError(error: unknown): error is errors.UndiciError {
	const possible = error as errors.UndiciError;
	if (!possible) {
		return false;
	}
	return !!possible.code && !!possible.name;
}

function shouldLogRetry(error: Error): boolean {
	const cause = error.cause;
	if (isUndiciError(cause)) {
		// Can't use instance of due to jest tests borking classes
		return !noLogRetries.find(e => e.includes(cause.code));
	}
	return error.name !== "AbortError";
}

export async function customFetch(url: string, init?: ExtraRequestInit): Promise<Response> {
	const response = await fetchCore(0, url, init);
	return response[0];
}

function urlOrigin(requestInfo: RequestInfo): string {
	try {
		if (!requestInfo) {
			return "<unknown>";
		}
		const urlString =
			typeof requestInfo === "string"
				? requestInfo
				: requestInfo instanceof Request
				? requestInfo.url
				: requestInfo.href;
		if (isEmpty(urlString)) {
			return "<unknown>";
		}
		if (typeof requestInfo === "string") {
			const url = new URL(requestInfo);
			return `${url.origin}`;
		}
	} catch (e) {
		// ignore
	}
	return "<unknown>";
}

export async function fetchCore(
	count: number,
	url: RequestInfo,
	initIn?: Readonly<ExtraRequestInit>
): Promise<[Response, number]> {
	const origin = urlOrigin(url);
	let timeout: NodeJS.Timeout | undefined = undefined;
	// Make sure original init is not modified
	const init = { ...initIn };
	try {
		handleLimit(origin);
		const controller = new AbortController();
		timeout = setTimeout(() => {
			try {
				controller.abort();
			} catch (e) {
				Logger.warn("AbortController error", e);
			}
		}, init.timeout ?? 30000);
		init.signal = controller.signal;
		const resp = await fetch(url, init);
		if (resp.status < 200 || resp.status > 299) {
			if (resp.status < 400 || resp.status >= 500) {
				count++;
				if (count <= 3) {
					const waitMs = 250 * count;
					if (Logger.isDebugging) {
						const logUrl = `[${init?.method ?? "GET"}] ${origin}`;
						Logger.debug(
							`fetchCore: Retry ${count} for ${logUrl} due to http status ${resp.status} waiting ${waitMs}`
						);
					}
					await Functions.wait(waitMs);
					if (timeout) {
						clearTimeout(timeout);
						timeout = undefined;
					}
					// Use unmodified init
					return fetchCore(count, url, initIn);
				}
			}
		}
		return [resp, count];
	} catch (ex) {
		if (timeout) {
			clearTimeout(timeout);
			timeout = undefined;
		}
		if (ex instanceof InternalRateError) {
			throw ex;
		}
		if (ex.info?.error.match(/token expired/)) {
			// expired access token is handled by caller
			throw ex;
		}

		const shouldLog = shouldLogRetry(ex);
		if (shouldLog) {
			ex.cause ? Logger.error(ex.cause) : Logger.error(ex);
		}
		count++;
		if (count <= 3) {
			const waitMs = 250 * count;
			if (Logger.isDebugging) {
				const logUrl = `[${init?.method ?? "GET"}] ${origin}`;
				Logger.debug(
					`fetchCore: Retry ${count} for ${logUrl} due to Error ${
						ex.cause ? ex.cause.message : ex.message
					} waiting ${waitMs}`
				);
			}
			await Functions.wait(waitMs);
			return fetchCore(count, url, init);
		}
		throw ex.cause ? ex.cause : ex;
	} finally {
		if (timeout) {
			clearTimeout(timeout);
		}
	}
}

export function isSuppressedException(ex: any): ReportSuppressedMessages | undefined {
	const networkErrors = [
		"ENOTFOUND",
		"NOT_FOUND",
		"ETIMEDOUT",
		"EAI_AGAIN",
		"ECONNRESET",
		"ECONNREFUSED",
		"EHOSTUNREACH",
		"ENETDOWN",
		"ENETUNREACH",
		"self signed certificate in certificate chain",
		"socket disconnected before secure",
		"socket hang up",
	];

	if (ex.message && networkErrors.some(e => ex.message.match(new RegExp(e)))) {
		return ReportSuppressedMessages.NetworkError;
	} else if (ex.message && ex.message.match(/GraphQL Error \(Code: 404\)/)) {
		return ReportSuppressedMessages.ConnectionError;
	}
	// else if (
	// 	(ex?.response?.message || ex?.message || "").indexOf(
	// 		"enabled OAuth App access restrictions"
	// 	) > -1
	// ) {
	// 	return ReportSuppressedMessages.OAuthAppAccessRestrictionError;
	// }
	else if (
		(ex.response && ex.response.message === "Bad credentials") ||
		(ex.response &&
			ex.response.errors &&
			ex.response.errors instanceof Array &&
			ex.response.errors.find((e: any) => e.type === "FORBIDDEN"))
	) {
		// https://issues.newrelic.com/browse/NR-23727 - FORBIDDEN can happen for tokens that don't have full permissions,
		// rather than risk breaking how this works, we'll just capture this one possibility
		if (ex.response.errors.find((e: any) => e.message.match(/must have push access/i))) {
			return undefined;
		} else {
			return ReportSuppressedMessages.AccessTokenInvalid;
		}
	} else if (ex.message && ex.message.match(/must accept the Terms of Service/)) {
		return ReportSuppressedMessages.GitLabTermsOfService;
	} else {
		return undefined;
	}
}
