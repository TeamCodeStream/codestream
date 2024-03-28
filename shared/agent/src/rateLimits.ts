import { Logger } from "./logger";
import { NRErrorType } from "@codestream/protocols/agent";
import { Container } from "./container";
import { CodedError } from "./providers/newrelic/newrelic.types";

// Time period in seconds in which we evaluate the rate limit
export const RATE_LIMIT_INTERVAL = 15;

// Tried to extend SessionContainer.instance().session to to notify when session loaded
// on callback and read current api url but it failed in the most inexplicable way.
const nrApiOrigins = new Set([
	"https://api.eu.newrelic.com",
	"https://api.newrelic.com",
	"https://staging-api.newrelic.com",
]);

const codestreamOrigins = new Set([
	"https://localhost.newrelic.com:12079",
	"https://codestream-stg.staging-service.newrelic.com",
	"https://codestream-pd.staging-service.nr-ops.net",
	"https://codestream-qa.staging-service.nr-ops.net",
	"https://codestream-eu1.service.eu.newrelic.com",
	"https://codestream-us1.service.newrelic.com",
]);

// Rate limits
function getRateLimitConfig(origin: string): LimitConfig {
	if (nrApiOrigins.has(origin)) {
		return { limit: { warn: 50, block: 75 }, includePath: false };
	}
	if (codestreamOrigins.has(origin)) {
		return { limit: { warn: 100, forceLogout: 200 }, includePath: true };
	}
	// Uncomment for testing errors - set block to low-ish number
	// } else if(origin.includes("github")) {
	// 	return { warn: 30, block: 20 };
	// }
	else {
		return { limit: { warn: 150, report: 200 }, includePath: false };
	}
}

type Violation = "warn" | "block" | "report" | "forceLogout";

type RateLimit = {
	violation: Violation;
	limit: number;
	count: number;
};

export type LimitConfig = {
	limit: Limit;
	includePath: boolean;
};

export type Limit = {
	warn: number;
	forceLogout?: number;
	block?: number;
	report?: number;
};

export class InternalRateForceLogoutError extends CodedError {
	code: NRErrorType = "INTERNAL_RATE_FORCE_LOGOUT";

	constructor(message: string) {
		super(message);
	}
}

export class InternalRateError extends CodedError {
	code: NRErrorType = "INTERNAL_RATE";

	constructor(message: string) {
		super(message);
	}
}

/**
 * Count the rate of the urlPart over a period of time
 * @param rateLimitConfig Includes the limits and config options
 * @param origin - the origin (https://whatever.com)
 * @param method GET/POST/PATCH/DELETE
 * @param path (/api/getStuff)
 * Do not pass in querystring or sensitive data
 */
function isOverRateLimit(
	rateLimitConfig: LimitConfig,
	origin: string,
	method: string,
	path?: string
): RateLimit | undefined {
	if (!Container.isInitialized()) {
		return undefined;
	}
	const rateLimitByUrl = Container.instance().agent.httpHistoryByUrl;
	if (!rateLimitByUrl) {
		return undefined;
	}
	const { limit, includePath } = rateLimitConfig;
	const originWithMethod = `${method} ${origin}`;
	const urlPart = includePath && path ? originWithMethod + path : originWithMethod;
	const count = rateLimitByUrl.countAndGet(urlPart);
	if (limit.forceLogout && count > limit.forceLogout) {
		return { violation: "forceLogout", limit: limit.forceLogout, count };
	}
	if (limit.block && count > limit.block) {
		return { violation: "block", limit: limit.block, count };
	}
	if (limit.report && count > limit.report) {
		return { violation: "report", limit: limit.report, count };
	}
	if (count > limit.warn) {
		return { violation: "warn", limit: limit.warn, count };
	}
	return undefined;
}

export function handleLimit(origin: string, method: string, path?: string) {
	const rateLimitConfig = getRateLimitConfig(origin);
	const rateLimit = isOverRateLimit(rateLimitConfig, origin, method, path);
	const urlPart = method + " " + (rateLimitConfig.includePath && path ? origin + path : origin);
	if (rateLimit) {
		switch (rateLimit.violation) {
			case "warn": {
				// Not reporting the actual count here so that we don't over-report errors to NR - makes the erorr non-unique
				Logger.warn(
					`${urlPart} is over internal rate limit warning with count ${rateLimit.limit} in ${RATE_LIMIT_INTERVAL} seconds`
				);
				break;
			}
			case "block":
			case "report": {
				// Not reporting the actual count here so that we don't over-report errors to NR - makes the erorr non-unique
				const error = new InternalRateError(
					`${urlPart} exceeded internal block limit of ${rateLimit.limit} in ${RATE_LIMIT_INTERVAL} seconds`
				);
				Logger.error(error, undefined);
				if (rateLimit.violation === "block") {
					throw error;
				}
				break;
			}
			case "forceLogout": {
				const error = new InternalRateForceLogoutError(
					`${urlPart} exceeded internal block limit of ${rateLimit.limit} in ${RATE_LIMIT_INTERVAL} seconds`
				);
				Logger.error(error, undefined);
				throw error;
			}
		}
	}
}
