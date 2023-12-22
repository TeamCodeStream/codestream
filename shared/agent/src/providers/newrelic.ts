"use strict";
import fs from "fs";
import { sep } from "path";
import {
	ERROR_PIXIE_NOT_CONFIGURED,
	NRErrorResponse,
	NRErrorType,
	ThirdPartyProviderConfig,
} from "@codestream/protocols/agent";
import { CSNewRelicProviderInfo } from "@codestream/protocols/api";
import Cache from "@codestream/utils/system/timedCache";
import { ResponseError } from "vscode-jsonrpc/lib/messages";
import { Logger } from "../logger";
import { CodeStreamSession } from "../session";
import { log } from "../system";
import { CodedError } from "./newrelic.types";
import { NewRelicId } from "./newrelic/newrelic.types";
import { ApiProvider } from "../api/apiProvider";
import { NewRelicGraphqlClient } from "./newrelic/newRelicGraphqlClient";
import { CodeStreamAgent } from "../agent";

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

export class NewRelicProvider {
	private _config: ThirdPartyProviderConfig;

	constructor(
		session: CodeStreamSession,
		config: ThirdPartyProviderConfig,
		private _providerInfo: CSNewRelicProviderInfo,
		private api: ApiProvider,
		private graphqlClient: NewRelicGraphqlClient,
		private agent: CodeStreamAgent
	) {
		this._config = config;
	}

	get displayName() {
		return "New Relic";
	}

	get name() {
		return "newrelic";
	}

	private clearAllCaches() {
		const properties = Object.values(this);
		for (const prop of properties) {
			if (prop && prop instanceof Cache) {
				prop.clear();
			}
		}
	}

	// TODO REF reimplement
	// @log()
	// async onDisconnected(request?: ThirdPartyDisconnect) {
	// 	// delete the graphql client so it will be reconstructed if a new token is applied
	// 	this.graphqlClient.dispose(); // TODO REF do i need delete?
	// 	// delete this._newRelicUserId; // TODO REF refector to separate class
	// 	// delete this._accountIds; // TODO REF refector to separate class
	// 	this.clearAllCaches();
	//
	// 	try {
	// 		// remove these when a user disconnects -- don't want them lingering around
	// 		const { users } = SessionContainer.instance();
	// 		await users.updatePreferences({
	// 			preferences: {
	// 				observabilityRepoEntities: [],
	// 			},
	// 		});
	// 	} catch (ex) {
	// 		ContextLogger.warn("failed to remove observabilityRepoEntities", ex);
	// 	}
	//
	// 	return super.onDisconnected(request);
	// }

	canConfigure() {
		return true;
	}

	@log()
	async getPixieToken(accountId: number) {
		try {
			const response = await this.graphqlClient.query(
				`query fetchPixieAccessToken($accountId:Int!) {
  					actor {
    					account(id: $accountId) {
      						pixie {
        						pixieAccessToken
      						}
						}
  					}
				}
			  	`,
				{
					accountId: accountId,
				}
			);
			const token = response.actor.account.pixie.pixieAccessToken;

			if (token == null) {
				throw new ResponseError(ERROR_PIXIE_NOT_CONFIGURED, "Unable to fetch Pixie token");
			}

			return token;
		} catch (e) {
			ContextLogger.error(e);
			throw new ResponseError(ERROR_PIXIE_NOT_CONFIGURED, e.message || e.toString());
		}
	}

	getPythonNamespacePackage(filePath: string) {
		try {
			const splitPath = filePath.split(sep);
			if (!splitPath.length || !splitPath[splitPath.length - 1].endsWith(".py")) {
				return "";
			}

			const fileName = splitPath.pop()!;
			const pythonPath =
				fileName !== "__init__.py" ? [fileName.substring(0, fileName.lastIndexOf("."))] : [];

			while (splitPath.length > 0 && fs.existsSync([...splitPath, ["__init__.py"]].join(sep))) {
				pythonPath.unshift(splitPath.pop()!);
				break;
			}

			return pythonPath.join(".");
		} catch (ex) {
			Logger.warn("Could not get python namespace", { filePath });
			return undefined;
		}
	}

	public static parseId(idLike: string): NewRelicId | undefined {
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
}

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
