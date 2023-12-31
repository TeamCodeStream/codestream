import { NRErrorResponse, NRErrorType } from "@codestream/protocols/agent";
import { CodedError, NewRelicId } from "./newrelic.types";
import { ContextLogger } from "../contextLogger";

export function toFixedNoRounding(number: number, precision = 1): string {
	const factor = Math.pow(10, precision);
	return `${Math.floor(number * factor) / factor}`;
}

export function errorTypeMapper(ex: Error): NRErrorType {
	if (ex instanceof CodedError) {
		return ex.code;
	}
	return "NR_UNKNOWN";
}

export function mapNRErrorResponse(ex: Error): NRErrorResponse {
	const type = errorTypeMapper(ex);
	if (type) {
		return <NRErrorResponse>{ error: { type, message: ex.message, stack: ex.stack } };
	}
	return <NRErrorResponse>{ error: { type: "NR_UNKNOWN", message: ex.message, stack: ex.stack } };
}

export function parseId(idLike: string): NewRelicId | undefined {
	try {
		const parsed = Buffer.from(idLike, "base64").toString("utf-8");
		if (!parsed) return undefined;

		const split = parsed.split(/\|/);
		// "140272|ERT|ERR_GROUP|12076a73-fc88-3205-92d3-b785d12e08b6"
		const [accountId, unknownAbbreviation, entityType, unknownGuid] = split;
		return {
			accountId: accountId != null ? parseInt(accountId, 10) : 0,
			unknownAbbreviation,
			entityType,
			unknownGuid,
		};
	} catch (e) {
		ContextLogger.warn("" + e.message, {
			idLike,
			error: e,
		});
	}
	return undefined;
}
