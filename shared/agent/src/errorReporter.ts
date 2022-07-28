import * as NewRelic from "newrelic";
import { CodeStreamAgent } from "./agent";
import { Logger } from "./logger";
import {
	ReportBreadcrumbRequest,
	ReportBreadcrumbRequestType,
	ReportMessageRequest,
	ReportMessageRequestType,
	WebviewErrorRequest,
	WebviewErrorRequestType
} from "./protocol/agent.protocol";
import { CodeStreamSession } from "./session";
import { lsp, lspHandler, Strings } from "./system";
import md5 = Strings.md5;

interface IErrorReporterProvider {
	reportMessage(request: ReportMessageRequest): void;
	reportBreadcrumb(request: ReportBreadcrumbRequest): void;
	webviewError(request: WebviewErrorRequest): void;
}

abstract class ErrorReporterProviderBase {
	protected _errorCache = new Set<string>();
	constructor(protected session: CodeStreamSession) {}
}

@lsp
export class ErrorReporter {
	private readonly _errorProviders: IErrorReporterProvider[];

	constructor(agent: CodeStreamAgent, session: CodeStreamSession) {
		this._errorProviders = [new NewRelicErrorReporterProvider(agent, session)];
	}

	@lspHandler(ReportMessageRequestType)
	reportMessage(request: ReportMessageRequest) {
		this._errorProviders.forEach(_ => _.reportMessage(request));
	}

	@lspHandler(ReportBreadcrumbRequestType)
	reportBreadcrumb(request: ReportBreadcrumbRequest) {
		this._errorProviders.forEach(_ => _.reportBreadcrumb(request));
	}

	@lspHandler(WebviewErrorRequestType)
	webviewError(request: WebviewErrorRequest) {
		this._errorProviders.forEach(_ => _.webviewError(request));
	}
}

class NewRelicErrorReporterProvider extends ErrorReporterProviderBase
	implements IErrorReporterProvider {
	constructor(private agent: CodeStreamAgent, session: CodeStreamSession) {
		super(session);
	}

	reportMessage(request: ReportMessageRequest) {
		if (!request.error && !request.message) return;

		let cacheKey: string;
		let hash: string | undefined;

		if (request.error) {
			if (typeof request.error === "object") {
				hash = JSON.stringify(request.error);
			} else {
				hash = request.error;
			}
		} else {
			hash = request.message;
		}
		cacheKey = md5(hash || "");

		if (this._errorCache.has(cacheKey)) {
			Logger.warn("Ignoring duplicate error", {
				key: cacheKey
			});
			return;
		}

		this._errorCache.add(cacheKey);

		try {
			let error: Error | undefined = undefined;
			let stack;
			if (request.error) {
				if (typeof request.error === "string") {
					const deserializedError = JSON.parse(request.error as string) as {
						message: string;
						stack: any;
					};
					error = new Error(deserializedError.message);
					// eventually setting the stack _should_ show in NR...
					error.stack = stack = deserializedError.stack;
				} else {
					error = request.error as Error;
				}
			} else if (request.message) {
				error = new Error(request.message);
			}
			if (!error) {
				Logger.warn("Failed to create error for reportMessage", {
					request
				});
				return;
			}

			NewRelic.noticeError(error, {
				...((this.agent.createNewRelicCustomAttributes() as any) || {}),
				extra:
					typeof request.extra === "object" ? JSON.stringify(request.extra) : request.extra || "",
				type: request.type,
				source: request.source || "agent",
				stack: stack || undefined
			});
		} catch (ex) {
			Logger.warn("Failed to reportMessage", {
				error: ex
			});
		}
	}

	webviewError(request: WebviewErrorRequest): void {
		// try {
		// 	NewRelic.noticeError(new Error(request.error.message), {
		// 		...this.agent.createNewRelicCustomAttributes,
		// 		stack: request.error.stack
		// 	});
		// } catch (e) {
		// 	Logger.warn(e);
		// }

		Logger.log(`Webview error: ${request.error.message}\n${request.error.stack}`);
	}

	reportBreadcrumb(request: ReportBreadcrumbRequest) {
		// noop
	}
}
