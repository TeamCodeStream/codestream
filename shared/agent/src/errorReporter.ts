import * as os from "os";
import { ReportSuppressedMessages } from "./agentError";
import { Team } from "./api/extensions";
import { SessionContainer } from "./container";
import {
	ReportBreadcrumbRequest,
	ReportBreadcrumbRequestType,
	ReportMessageRequest,
	ReportMessageRequestType,
	WebviewErrorRequest,
	WebviewErrorRequestType
} from "./protocol/agent.protocol";
import { CodeStreamSession, SessionStatus } from "./session";
import { lsp, lspHandler, Strings } from "./system";
import { Logger } from "./logger";
import * as NewRelic from "newrelic";
import md5 = Strings.md5;
import { CodeStreamAgent } from "./agent";

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

		const key = request.error ? md5(JSON.stringify(request.error)) : `${request.message}`;
		if (this._errorCache.has(key)) {
			Logger.warn("Ignoring duplicate error", {
				key: key
			});
			return;
		}

		this._errorCache.add(key);

		try {
			NewRelic.noticeError(request.error || new Error(request.message), {
				...((this.agent.createNewRelicCustomAttributes() as any) || {}),
				extra:
					typeof request.extra === "object" ? JSON.stringify(request.extra) : request.extra || "",
				type: request.type,
				source: request.source || "agent"
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
