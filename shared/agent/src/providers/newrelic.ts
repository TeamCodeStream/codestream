"use strict";
import { ERROR_PIXIE_NOT_CONFIGURED } from "@codestream/protocols/agent";
import Cache from "@codestream/utils/system/timedCache";
import { ResponseError } from "vscode-jsonrpc/lib/messages";
import { log } from "../system";
import { NewRelicGraphqlClient } from "./newrelic/newRelicGraphqlClient";
import { ContextLogger } from "./contextLogger";

export class NewRelicProvider {
	constructor(private graphqlClient: NewRelicGraphqlClient) {}

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
}
