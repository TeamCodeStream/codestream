import { Logger } from "../logger";

export class ContextLogger {
	private static data: any = {};

	/**
	 * pass additional, context data when logging
	 *
	 * @static
	 * @param {*} data
	 * @memberof ContextLogger
	 */
	static setData(data: any) {
		ContextLogger.data = { ...ContextLogger.data, ...data };
	}

	static error(ex: Error, message?: string, params?: any): void {
		Logger.error(ex, `NR: ${message}`, { ...(params || {}), zetails: ContextLogger.data });
	}

	static warn(message: string, params?: any): void {
		if (!message) {
			Logger.warn("");
		} else {
			Logger.warn(`NR: ${message}`, { ...(params || {}), zetails: ContextLogger.data });
		}
	}

	static log(message: string, params?: any): void {
		Logger.log(`NR: ${message}`, { ...(params || {}), zetails: ContextLogger.data });
	}

	static debug(message: string, params?: any): void {
		Logger.debug(`NR: ${message}`, { ...(params || {}), zetails: ContextLogger.data });
	}
}
