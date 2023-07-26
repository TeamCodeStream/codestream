import { isEmpty } from "lodash";
import { fetch, RequestInit, Request, Response, RequestInfo } from "undici";
import { Logger } from "../logger";
import { Functions } from "./function";
import { handleLimit, InternalRateError } from "../rateLimits";

export interface ExtraRequestInit extends RequestInit {
	timeout?: number;
}

const noLogRetries = ["reason: connect ECONNREFUSED", "reason: getaddrinfo ENOTFOUND"];

function shouldLogRetry(errorMsg: string): boolean {
	const result = noLogRetries.find(e => e.includes(errorMsg));
	return !result;
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
		if (init.timeout) {
			const controller = new AbortController();
			timeout = setTimeout(() => controller.abort(), init.timeout);
			init.signal = controller.signal;
		}
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
		if (ex instanceof InternalRateError) {
			throw ex;
		}
		const shouldLog = shouldLogRetry(ex.message);
		if (shouldLog) {
			Logger.error(ex);
		}
		count++;
		if (count <= 3) {
			const waitMs = 250 * count;
			if (Logger.isDebugging) {
				const logUrl = `[${init?.method ?? "GET"}] ${origin}`;
				Logger.debug(
					`fetchCore: Retry ${count} for ${logUrl} due to Error ${ex.message} waiting ${waitMs}`
				);
			}
			await Functions.wait(waitMs);
			return fetchCore(count, url, init);
		}
		throw ex;
	} finally {
		if (timeout) {
			clearTimeout(timeout);
		}
	}
}
