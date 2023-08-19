import { isEmpty } from "lodash";
import { errors, fetch, Request, RequestInfo, RequestInit, Response } from "undici";
import { Logger } from "../logger";
import { Functions } from "./function";
import { handleLimit, InternalRateError } from "../rateLimits";

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
