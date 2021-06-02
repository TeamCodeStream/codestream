"use strict";
/**
Portions adapted from https://github.com/eamodio/vscode-gitlens/blob/12a93fe5f609f0bb154dca1a8d09ac3e980b9b3b/src/logger.ts which carries this notice:

The MIT License (MIT)

Copyright (c) 2016-2021 Eric Amodio

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/**
 * Modifications Copyright CodeStream Inc. under the Apache 2.0 License (Apache-2.0)
 */
import { URI } from "vscode-uri";
import { CodeStreamAgent } from "./agent";
import { getCorrelationContext } from "./system";
// import { Telemetry } from './telemetry';

// const ConsolePrefix = `[CodeStreamAgent]`;

export enum TraceLevel {
	Silent = "silent",
	Errors = "errors",
	Verbose = "verbose",
	Debug = "debug"
}

export interface LogCorrelationContext {
	readonly correlationId?: number;
	readonly prefix: string;
	exitDetails?: string;
}

export class Logger {
	static level: TraceLevel = TraceLevel.Silent;
	private static _agent: CodeStreamAgent | undefined;
	static customLoggableFn: ((o: object) => string | undefined) | undefined;

	static initialize(agent: CodeStreamAgent, loggableFn?: (o: any) => string | undefined) {
		this.customLoggableFn = loggableFn;

		this._agent = agent;
	}

	static debug(message: string, ...params: any[]): void;
	static debug(context: LogCorrelationContext | undefined, message: string, ...params: any[]): void;
	static debug(
		contextOrMessage: LogCorrelationContext | string | undefined,
		...params: any[]
	): void {
		if (this.level !== TraceLevel.Debug && !Logger.isDebugging) return;

		let message;
		if (typeof contextOrMessage === "string") {
			message = contextOrMessage;
		} else {
			message = params.shift();

			if (contextOrMessage !== undefined) {
				message = `${contextOrMessage.prefix} ${message || ""}`;
			}
		}

		// if (Logger.isDebugging) {
		// 	console.log(this.timestamp, ConsolePrefix, message || "", ...params);
		// }

		if (this._agent !== undefined) {
			this._agent.log(`${this.timestamp} ${message || ""}${this.toLoggableParams(true, params)}`);
		}
	}

	static error(ex: Error, message?: string, ...params: any[]): void;
	static error(
		ex: Error,
		context?: LogCorrelationContext,
		message?: string,
		...params: any[]
	): void;
	static error(
		ex: Error,
		contextOrMessage: LogCorrelationContext | string | undefined,
		...params: any[]
	): void {
		if (this.level === TraceLevel.Silent && !Logger.isDebugging) return;

		let message;
		if (contextOrMessage === undefined || typeof contextOrMessage === "string") {
			message = contextOrMessage;
		} else {
			message = params.shift();

			if (contextOrMessage !== undefined) {
				message = `${contextOrMessage.prefix} ${message || ""}`;
			}
		}

		const stack = ex.stack;
		if (message === undefined && stack) {
			const match = /.*\s*?at\s(.+?)\s/.exec(stack);
			if (match != null) {
				message = match[1];
			}
		}

		// if (Logger.isDebugging) {
		// 	console.error(this.timestamp, ConsolePrefix, message || "", ...params, ex);
		// }

		if (this._agent !== undefined) {
			this._agent.error(
				`${this.timestamp} ${message || ""}${this.toLoggableParams(false, params)}\n${ex}\n${stack}`
			);
		}

		// Telemetry.trackException(ex);
	}

	static getCorrelationContext() {
		return getCorrelationContext();
	}

	static log(message: string, ...params: any[]): void;
	static log(context: LogCorrelationContext | undefined, message: string, ...params: any[]): void;
	static log(contextOrMessage: LogCorrelationContext | string | undefined, ...params: any[]): void {
		if (
			this.level !== TraceLevel.Verbose &&
			this.level !== TraceLevel.Debug &&
			!Logger.isDebugging
		) {
			return;
		}

		let message;
		if (typeof contextOrMessage === "string") {
			message = contextOrMessage;
		} else {
			message = params.shift();

			if (contextOrMessage !== undefined) {
				message = `${contextOrMessage.prefix} ${message || ""}`;
			}
		}

		// if (Logger.isDebugging) {
		// 	console.log(this.timestamp, ConsolePrefix, message || "", ...params);
		// }

		if (this._agent !== undefined) {
			this._agent.log(`${this.timestamp} ${message || ""}${this.toLoggableParams(false, params)}`);
		}
	}

	static logWithDebugParams(message: string, ...params: any[]): void;
	static logWithDebugParams(
		context: LogCorrelationContext | undefined,
		message: string,
		...params: any[]
	): void;
	static logWithDebugParams(
		contextOrMessage: LogCorrelationContext | string | undefined,
		...params: any[]
	): void {
		if (
			this.level !== TraceLevel.Verbose &&
			this.level !== TraceLevel.Debug &&
			!Logger.isDebugging
		) {
			return;
		}

		let message;
		if (typeof contextOrMessage === "string") {
			message = contextOrMessage;
		} else {
			message = params.shift();

			if (contextOrMessage !== undefined) {
				message = `${contextOrMessage.prefix} ${message || ""}`;
			}
		}

		// if (Logger.isDebugging) {
		// 	console.log(this.timestamp, ConsolePrefix, message || "", ...params);
		// }

		if (this._agent !== undefined) {
			this._agent.log(`${this.timestamp} ${message || ""}${this.toLoggableParams(true, params)}`);
		}
	}

	static warn(message: string, ...params: any[]): void;
	static warn(context: LogCorrelationContext | undefined, message: string, ...params: any[]): void;
	static warn(
		contextOrMessage: LogCorrelationContext | string | undefined,
		...params: any[]
	): void {
		if (this.level === TraceLevel.Silent && !Logger.isDebugging) return;

		let message;
		if (typeof contextOrMessage === "string") {
			message = contextOrMessage;
		} else {
			message = params.shift();

			if (contextOrMessage !== undefined) {
				message = `${contextOrMessage.prefix} ${message || ""}`;
			}
		}

		// if (Logger.isDebugging) {
		// 	console.warn(this.timestamp, ConsolePrefix, message || "", ...params);
		// }

		if (this._agent !== undefined) {
			this._agent.warn(`${this.timestamp} ${message || ""}${this.toLoggableParams(false, params)}`);
		}
	}

	static sanitize(key: string, value: any) {
		// hide "private" members from logging (aka keys that start with underscore)
		if (key.indexOf("_") === 0) return undefined;
		return /(apikey|password|secret|token|privatekey)/i.test(key) ? `<${key}>` : value;
	}

	static toLoggable(p: any, sanitize: (key: string, value: any) => any = this.sanitize) {
		if (typeof p !== "object") return String(p);
		if (this.customLoggableFn !== undefined) {
			const loggable = this.customLoggableFn(p);
			if (loggable != null) return loggable;
		}
		if (p instanceof URI) return `Uri(${p.toString(true)})`;

		try {
			return JSON.stringify(p, sanitize);
		} catch {
			return `<error>`;
		}
	}

	static toLoggableName(instance: Function | object) {
		if (typeof instance === "function") {
			return instance.name;
		}

		const name = instance.constructor != null ? instance.constructor.name : "";
		// Strip webpack module name (since I never name classes with an _)
		const index = name.indexOf("_");
		return index === -1 ? name : name.substr(index + 1);
	}

	private static get timestamp(): string {
		const now = new Date();
		return `[${now
			.toISOString()
			.replace(/T/, " ")
			.replace(/\..+/, "")}:${("00" + now.getUTCMilliseconds()).slice(-3)}]`;
	}

	private static toLoggableParams(debugOnly: boolean, params: any[]) {
		if (
			params.length === 0 ||
			(debugOnly && this.level !== TraceLevel.Debug && !Logger.isDebugging)
		) {
			return "";
		}

		const loggableParams = params.map(p => this.toLoggable(p)).join(", ");
		return ` \u2014 ${loggableParams}` || "";
	}

	private static _isDebugging: boolean | undefined;
	static get isDebugging() {
		if (this._isDebugging === undefined) {
			const env = process.env;
			this._isDebugging =
				env && env.DEBUG_EXT ? env.DEBUG_EXT.toLowerCase().includes("codestream") : false;
		}

		return this._isDebugging;
	}

	static overrideIsDebugging() {
		this._isDebugging = true;
	}
}
