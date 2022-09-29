import convert from "convert-source-map";
import fs from "fs";
import * as NewRelic from "newrelic";
import path from "path";
import StackMapper, { Callsite } from "stack-mapper";
import { CodeStreamAgent } from "./agent";
import { Logger } from "./logger";
import { Parser } from "./managers/stackTraceParsers/javascriptStackTraceParser";
import {
	ReportBreadcrumbRequest,
	ReportBreadcrumbRequestType,
	ReportMessageRequest,
	ReportMessageRequestType,
	WebviewErrorRequest,
	WebviewErrorRequestType,
} from "./protocol/agent.protocol";
import { CSStackTraceInfo } from "./protocol/api.protocol.models";
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

interface StackTraceInfo {
	stackTraceInfo: CSStackTraceInfo;
	callsite: Callsite[];
}

const STACK_INDENT = "    ";

const WEB_SOURCE_MAP = "index.js.map";

const WEB_JS_FILENAME = "index.js";

class NewRelicErrorReporterProvider
	extends ErrorReporterProviderBase
	implements IErrorReporterProvider
{
	private readonly stackMapper?: StackMapper.StackMapper;

	constructor(private agent: CodeStreamAgent, session: CodeStreamSession) {
		super(session);
		const webSourceMap = path.resolve(__dirname, WEB_SOURCE_MAP);
		if (!fs.existsSync(webSourceMap)) {
			Logger.warn(`${WEB_SOURCE_MAP} not found at ${webSourceMap}`);
			return;
		}
		const sourceMapContents = fs.readFileSync(webSourceMap, "utf8");
		if (!sourceMapContents) {
			Logger.warn(`Unable to load ${webSourceMap}`);
			return;
		}
		const theSm = convert.fromJSON(sourceMapContents).sourcemap;
		theSm.file = WEB_JS_FILENAME;
		this.stackMapper = StackMapper(theSm);
		Logger.log(`Loaded ${webSourceMap} mapper`);
	}

	private parseStackString(stackString: string): StackTraceInfo {
		// Parse stack trace string to get line / column / file / method, etc.
		const stackTraceInfo = Parser(stackString);
		const callsite: Callsite[] = [];
		// Convert to a type that source-mapper understands
		for (const stackLine of stackTraceInfo.lines) {
			if (!stackLine.line || !stackLine.column) {
				callsite.push({ filename: "<anonymous>", line: 1, column: 1 });
			} else {
				callsite.push({
					filename: WEB_JS_FILENAME, // Has to match sourcemap filename
					line: stackLine.line,
					column: stackLine.column,
				});
			}
		}
		return { stackTraceInfo, callsite };
	}

	// Re-create the stack trace format as passed in from webview
	private callsiteToStackString(parsed: StackTraceInfo): string {
		const response: string[] = [];
		if (parsed.stackTraceInfo.header) {
			response.push(parsed.stackTraceInfo.header);
		}
		parsed.callsite.forEach((_, index) => {
			const method = parsed.stackTraceInfo.lines[index].method;
			if (_.filename === "<anonymous>" && method) {
				response.push(`${STACK_INDENT}at ${method} (${_.filename})`);
			} else {
				const methodFormatted = method !== "<unknown>" ? ` ${method} ` : " ";
				response.push(`${STACK_INDENT}at${methodFormatted}(${_.filename}:${_.line}:${_.column})`);
			}
		});
		return response.join("\n");
	}

	// If source is webview, use source map to resolve original filename / lines
	private resolveWebStackTrace(request: ReportMessageRequest): Error | string | undefined {
		if (
			request.source === "webview" &&
			request.type === "error" &&
			request.error &&
			this.stackMapper
		) {
			try {
				const error: Error =
					request.error instanceof Error ? request.error : (JSON.parse(request.error) as Error);
				if (!error.stack) {
					return request.error;
				}
				const stackTraceInfo = this.parseStackString(error.stack);
				// Use the sourcemap to resolve original files / lines
				const frames = this.stackMapper.map(stackTraceInfo.callsite);
				error.stack = this.callsiteToStackString({
					stackTraceInfo: stackTraceInfo.stackTraceInfo,
					callsite: frames,
				});

				return error;
			} catch (e) {
				Logger.error(e);
				return request.error;
			}
		} else {
			return request.error;
		}
	}

	private hashError(request: ReportMessageRequest): string {
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
		return md5(hash ?? "");
	}

	reportMessage(request: ReportMessageRequest) {
		if (!request.error && !request.message) return;

		request.error = this.resolveWebStackTrace(request);

		const cacheKey = this.hashError(request);

		if (this._errorCache.has(cacheKey)) {
			Logger.warn("Ignoring duplicate error", {
				key: cacheKey,
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
					request,
				});
				return;
			}

			NewRelic.noticeError(error, {
				...((this.agent.createNewRelicCustomAttributes() as any) || {}),
				extra:
					typeof request.extra === "object" ? JSON.stringify(request.extra) : request.extra || "",
				type: request.type,
				source: request.source || "agent",
				stack: stack || undefined,
			});
		} catch (ex) {
			Logger.warn("Failed to reportMessage", {
				error: ex,
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
		if (this.stackMapper) {
			// Logger.log(`=== stack before ${request.error.stack}`);
			const stackTraceInfo = this.parseStackString(request.error.stack);
			// Use source map to resolve original filename / lines
			const frames = this.stackMapper.map(stackTraceInfo.callsite);
			// Convert back to stack string blob
			request.error.stack = this.callsiteToStackString({
				stackTraceInfo: stackTraceInfo.stackTraceInfo,
				callsite: frames,
			});
		}

		Logger.log(`Webview error: ${request.error.message}\n${request.error.stack}`);
	}

	reportBreadcrumb(request: ReportBreadcrumbRequest) {
		// noop
	}
}
