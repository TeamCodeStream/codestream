import { LogCorrelationContext } from "../types";

const ConsolePrefix = `[CodeStreamAgent]`;

export class Logger {
	static debug(message: string, ...params: any[]): void;
	static debug(context: LogCorrelationContext | undefined, message: string, ...params: any[]): void;
	static debug(
		contextOrMessage: LogCorrelationContext | string | undefined,
		...params: any[]
	): void {
		let message;
		if (typeof contextOrMessage === "string") {
			message = contextOrMessage;
		} else {
			message = params.shift();

			if (contextOrMessage !== undefined) {
				message = `${contextOrMessage.prefix} ${message || ""}`;
			}
		}
		console.debug(ConsolePrefix, message || "", ...params);
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

		console.error(ConsolePrefix, message || "", ...params, ex);
	}

	static getCorrelationContext() {
		return 0;
	}

	static log(message: string, ...params: any[]): void;
	static log(context: LogCorrelationContext | undefined, message: string, ...params: any[]): void;
	static log(contextOrMessage: LogCorrelationContext | string | undefined, ...params: any[]): void {
		let message;
		if (typeof contextOrMessage === "string") {
			message = contextOrMessage;
		} else {
			message = params.shift();

			if (contextOrMessage !== undefined) {
				message = `${contextOrMessage.prefix} ${message || ""}`;
			}
		}

		console.info(ConsolePrefix, message || "", ...params);
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
		let message;
		if (typeof contextOrMessage === "string") {
			message = contextOrMessage;
		} else {
			message = params.shift();

			if (contextOrMessage !== undefined) {
				message = `${contextOrMessage.prefix} ${message || ""}`;
			}
		}

		console.log(ConsolePrefix, message || "", ...params);
	}

	static warn(message: string, ...params: any[]): void;
	static warn(context: LogCorrelationContext | undefined, message: string, ...params: any[]): void;
	static warn(
		contextOrMessage: LogCorrelationContext | string | undefined,
		...params: any[]
	): void {
		let message;
		if (typeof contextOrMessage === "string") {
			message = contextOrMessage;
		} else {
			message = params.shift();

			if (contextOrMessage !== undefined) {
				message = `${contextOrMessage.prefix} ${message || ""}`;
			}
		}

		console.warn(this.timestamp, ConsolePrefix, message || "", ...params);
	}

	static sanitize(key: string, value: any) {
		// hide "private" members from logging (aka keys that start with underscore)
		if (key.indexOf("_") === 0) return undefined;
		return /(apikey|password|secret|token|privatekey)/i.test(key) ? `<${key}>` : value;
	}

	static toLoggable(p: any, sanitize: (key: string, value: any) => any = this.sanitize) {
		if (typeof p !== "object") return String(p);

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
