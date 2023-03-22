import { ReportingMessageType, ReportMessageRequestType } from "@codestream/protocols/agent";
import { HostApi } from "./webview-api";

function serializeError(error: Error) {
	return error ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : undefined;
}

/**
 * Log an error to the error reporter
 *
 * @param error Error object or a message string
 * @param extra anything else
 */
export function logError(error: string | Error, extra?: any) {
	try {
		console.error(error, extra);
		const isInstanceOfError = error instanceof Error;
		HostApi.instance.send(ReportMessageRequestType, {
			source: "webview",
			type: ReportingMessageType.Error,
			error: isInstanceOfError ? serializeError(error) : undefined,
			message: isInstanceOfError ? error.message : error,
			extra,
		});
	} catch (e) {
		console.error(e);
	}
}

export function logWarning(...items: any[]) {
	// console.warn will get removed with webpack, use console.error
	console.error(...items);
}
