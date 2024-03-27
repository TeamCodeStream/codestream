import { Logger } from "../logger";
import { Headers, Response } from "undici";
import { ExtraRequestInit, InterceptorResponse } from "./fetchCore";
import { tokenHolder } from "../providers/newrelic/TokenHolder";
import { CSAccessTokenType } from "@codestream/protocols/api";
import { SessionContainer } from "../container";
import { Mutex } from "async-mutex";

const refreshLock = new Mutex();

export async function newRelicResponseInterceptor(
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
		const tokenExpiredSource = getSource(textData, loggingPrefix);
		if (isTokenExpired) {
			Logger.log(`${loggingPrefix} Handling expired token from: ${tokenExpiredSource}`);
			if (refreshLock.isLocked()) {
				Logger.log(`${loggingPrefix} Waiting for already running refresh token`);
				await refreshLock.waitForUnlock();
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
			const result = refreshLock.runExclusive(async () => {
				Logger.log(`${loggingPrefix} Token was found to be expired, attempting to refresh...`);
				return await tokenRefresh(refreshToken, init, loggingPrefix);
			});
			return result;
		}
	}
	return "continue"; // Not a 403 error or not token expired so let existing fetchCore logic run
}

function getSource(textData: string, loggingPrefix: string) {
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

async function tokenRefresh(
	refreshToken: string,
	init: ExtraRequestInit,
	loggingPrefix: string
): Promise<InterceptorResponse> {
	try {
		const tokenInfo = await SessionContainer.instance().session.api.refreshNewRelicToken(
			refreshToken
		);
		Logger.log(`${loggingPrefix} NR access token successfully refreshed, trying request again...`);
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
