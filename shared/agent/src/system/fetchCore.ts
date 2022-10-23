import { isEmpty } from "lodash";
import fetch, { Request, RequestInfo, RequestInit, Response } from "node-fetch";
import { Logger } from "../logger";
import { Functions } from "./function";

const noLogRetries = ["reason: connect ECONNREFUSED", "reason: getaddrinfo ENOTFOUND"];

function shouldLogRetry(errorMsg: string): boolean {
	const result = noLogRetries.find(e => e.includes(errorMsg));
	return !result;
}

export async function customFetch(url: RequestInfo, init?: RequestInit): Promise<Response> {
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
	init?: RequestInit
): Promise<[Response, number]> {
	try {
		const resp = await fetch(url, init);
		if (resp.status < 200 || resp.status > 299) {
			if (resp.status < 400 || resp.status >= 500) {
				count++;
				if (count <= 3) {
					const waitMs = 250 * count;
					if (Logger.isDebugging) {
						const logUrl = `[${init?.method ?? "GET"}] ${urlOrigin(url)}`;
						Logger.debug(
							`fetchCore: Retry ${count} for ${logUrl} due to http status ${resp.status} waiting ${waitMs}`
						);
					}
					await Functions.wait(waitMs);
					return fetchCore(count, url, init);
				}
			}
		}
		return [resp, count];
	} catch (ex) {
		const shouldLog = shouldLogRetry(ex.message);
		if (shouldLog) {
			Logger.error(ex);
		}
		count++;
		if (count <= 3) {
			const waitMs = 250 * count;
			if (Logger.isDebugging) {
				const logUrl = `[${init?.method ?? "GET"}] ${urlOrigin(url)}`;
				Logger.debug(
					`fetchCore: Retry ${count} for ${logUrl} due to Error ${ex.message} waiting ${waitMs}`
				);
			}
			await Functions.wait(waitMs);
			return fetchCore(count, url, init);
		}
		throw ex;
	}
}
