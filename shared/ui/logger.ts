import { ReportingMessageType, ReportMessageRequestType } from "@codestream/protocols/agent";
import { HostApi } from "./webview-api";

export function logError(error: string | Error, extra?: object) {
	try {
		console.error(error, extra);

		HostApi.instance.send(ReportMessageRequestType, {
			source: "webview",
			type: ReportingMessageType.Error,
			message: typeof error === "string" ? error : error.message,
			extra
		});
	} catch (e) {
		console.error(e);
	}
}

export function logWarning(...items: any[]) {
	// console.warn will get removed with webpack, use console.error
	console.error(...items);
}
