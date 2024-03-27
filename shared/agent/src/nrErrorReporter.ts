import { CodeStreamAgent, ErrorAttributes } from "./agent";
import * as NewRelic from "newrelic";
import {
	ReportingMessageType,
	ReportMessageRequest,
	WebviewErrorRequest,
} from "@codestream/protocols/agent";
import Cache from "@codestream/utils/system/timedCache";
import path from "path";
import fs from "fs";
import { fromJSON } from "convert-source-map";
import StackMapper, { Callsite } from "stack-mapper";
import { Parser } from "./managers/stackTraceParsers/javascriptStackTraceParser";
import { CSStackTraceInfo } from "@codestream/protocols/api";
import { md5 } from "@codestream/utils/system/string";
import { InternalError } from "./agentError";

const STACK_INDENT = "    ";

const WEB_SOURCE_MAP = "index.js.map";

const WEB_JS_FILENAME = "index.js";

export type StackTraceInfo = {
	stackTraceInfo: CSStackTraceInfo;
	callsite: Callsite[];
};

const _errorCache = new Cache<boolean>({
	defaultTtl: 900 * 1000, // 15 minutes
});

const stackMapper: StackMapper.StackMapper | undefined = init();

function init(): StackMapper.StackMapper | undefined {
	try {
		const webSourceMap = path.resolve(__dirname, WEB_SOURCE_MAP);
		if (!fs.existsSync(webSourceMap)) {
			console.warn(`${WEB_SOURCE_MAP} not found at ${webSourceMap}`);
			return;
		}
		const sourceMapContents = fs.readFileSync(webSourceMap, "utf8");
		if (!sourceMapContents) {
			console.warn(`Unable to load ${webSourceMap}`);
			return;
		}
		const theSm = fromJSON(sourceMapContents).sourcemap;
		theSm.file = WEB_JS_FILENAME;
		console.log(`Loaded ${webSourceMap} mapper`);
		return StackMapper(theSm);
	} catch (e) {
		console.error(e);
		return;
	}
}

function parseStackString(stackString: string): StackTraceInfo {
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
function callsiteToStackString(parsed: StackTraceInfo): string {
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
function resolveWebStackTrace(request: ReportMessageRequest): Error | string | undefined {
	if (request.source === "webview" && request.type === "error" && request.error && stackMapper) {
		try {
			const error: Error =
				request.error instanceof Error ? request.error : (JSON.parse(request.error) as Error);
			if (!error.stack) {
				return request.error;
			}
			const stackTraceInfo = parseStackString(error.stack);
			// Use the sourcemap to resolve original files / lines
			const frames = stackMapper.map(stackTraceInfo.callsite);
			error.stack = callsiteToStackString({
				stackTraceInfo: stackTraceInfo.stackTraceInfo,
				callsite: frames,
			});

			return error;
		} catch (e) {
			console.error(e);
			return request.error;
		}
	} else {
		return request.error;
	}
}

function hashError(request: ReportMessageRequest): string {
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

export type AgentErrorType = {
	error?: Error | string | undefined;
	message?: string;
	extra?: object;
	type?: ReportingMessageType;
};

export function reportAgentError(args: AgentErrorType, agent: CodeStreamAgent) {
	const attributes = agent.createNewRelicCustomAttributes();
	reportErrorToNr(
		{ ...args, type: args.type ?? ReportingMessageType.Error, source: "agent" },
		attributes
	);
}

export function reportErrorToNr(request: ReportMessageRequest, attributes?: ErrorAttributes): void {
	if (!request.error && !request.message) return;

	request.error = resolveWebStackTrace(request);

	const cacheKey = hashError(request);

	let error: Error | undefined = undefined;
	let stack;
	try {
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
				if (request.error instanceof InternalError) {
					return;
				}
				error = request.error as Error;
				stack = error.stack;
			}
		} else if (request.message) {
			error = new Error(request.message);
		}
	} catch (ex) {
		console.warn("Failed to create error object for reportMessage", {
			ex,
			request,
		});
		return;
	}

	try {
		if (!error) {
			console.warn("No error object for reportMessage", {
				request,
			});
			return;
		}

		if (_errorCache.get(cacheKey)) {
			console.warn("Ignoring duplicate error", {
				key: cacheKey,
				message: error?.message,
			});
			return;
		}
		_errorCache.put(cacheKey, true);

		NewRelic.noticeError(error, {
			...attributes,
			extra:
				typeof request.extra === "object" ? JSON.stringify(request.extra) : request.extra || "",
			type: request.type,
			source: request.source || "agent",
			stack: stack || undefined,
		});
	} catch (ex) {
		console.warn("Failed to reportMessage", {
			error: ex,
		});
	}
}

export function webviewError(request: WebviewErrorRequest): void {
	// try {
	// 	NewRelic.noticeError(new Error(request.error.message), {
	// 		...this.agent.createNewRelicCustomAttributes,
	// 		stack: request.error.stack
	// 	});
	// } catch (e) {
	// 	console.warn(e);
	// }
	if (stackMapper && request.error.stack) {
		// console.log(`=== stack before ${request.error.stack}`);
		const stackTraceInfo = parseStackString(request.error.stack);
		// Use source map to resolve original filename / lines
		const frames = stackMapper.map(stackTraceInfo.callsite);
		// Convert back to stack string blob
		request.error.stack = callsiteToStackString({
			stackTraceInfo: stackTraceInfo.stackTraceInfo,
			callsite: frames,
		});
	}

	console.log(`Webview error: ${request.error.message}\n${request.error.stack}`);
}
