import { Logger } from "./logger";
import { NRErrorType } from "@codestream/protocols/agent";
import { CodedError } from "./providers/newrelic.types";
import { HistoryCounter } from "@codestream/utils/system/historyCounter";

// Time period in seconds in which we evaluate the rate limit
const RATE_LIMIT_INTERVAL = 15;

// Tried to extend SessionContainer.instance().session to to notify when session loaded
// on callback and read current api url but it failed in the most inexplicable way.
const nrApriOrigins = new Set([
	"https://api.eu.newrelic.com",
	"https://api.newrelic.com",
	"https://staging-api.newrelic.com",
]);

// Rate limits
function getRateLimit(origin: string): Limit {
	if (nrApriOrigins.has(origin)) {
		return { warn: 50, block: 75 };
	}
	// Uncomment for testing errors - set block to low-ish number
	// } else if(origin.includes("github")) {
	// 	return { warn: 30, block: 20 };
	// }
	else {
		return { warn: 75, report: 100 };
	}
}

type Violation = "warn" | "block" | "report";

type RateLimit = {
	violation: Violation;
	limit: number;
	count: number;
};

export type Limit = {
	warn: number;
	block?: number;
	report?: number;
};

export class InternalRateError extends CodedError {
	code: NRErrorType = "INTERNAL_RATE";

	constructor(message: string) {
		super(message);
	}
}

const rateLimitByOrigin = new HistoryCounter(
	RATE_LIMIT_INTERVAL,
	100,
	Logger.debug,
	Logger.isDebugging
);

function isOverRateLimit(origin: string): RateLimit | undefined {
	const count = rateLimitByOrigin.countAndGet(origin);
	const limit = getRateLimit(origin);
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

export function handleLimit(origin: string, extra?: { [key: string]: any }) {
	const rateLimit = isOverRateLimit(origin);
	if (rateLimit) {
		switch (rateLimit.violation) {
			case "warn": {
				Logger.warn(
					`${origin} is over internal rate limit warning with count ${rateLimit.limit} in ${RATE_LIMIT_INTERVAL} seconds`
				);
				break;
			}
			case "block":
			case "report": {
				const error = new InternalRateError(
					`${origin} exceeded internal block limit of ${rateLimit.limit} in ${RATE_LIMIT_INTERVAL} seconds`
				);
				Logger.error(error, undefined, extra);
				if (rateLimit.violation === "block") {
					throw error;
				}
				break;
			}
		}
	}
}
