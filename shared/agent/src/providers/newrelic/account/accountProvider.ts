import { lsp, lspHandler } from "../../../system/decorators/lsp";
import {
	ERROR_GENERIC_USE_ERROR_MESSAGE,
	ERROR_NRQL_GENERIC,
	ERROR_NRQL_TIMEOUT,
	GetAllAccountsRequest,
	GetAllAccountsRequestType,
	GetAllAccountsResponse,
} from "@codestream/protocols/agent";
import { log } from "../../../system/decorators/log";
import { ResponseError } from "vscode-jsonrpc/lib/messages";
import { CodedError, GraphqlNrqlError, GraphqlNrqlTimeoutError } from "../newrelic.types";
import Cache from "@codestream/utils/system/timedCache";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import { Disposable } from "../../../system";

const ACCOUNT_CACHE_KEY = "accountCache";

@lsp
export class AccountProvider implements Disposable {
	// 1hr cache
	private _accountsTimedCache = new Cache<GetAllAccountsResponse>({ defaultTtl: 60 * 1000 * 60 });

	constructor(private graphqlClient: NewRelicGraphqlClient) {}

	@lspHandler(GetAllAccountsRequestType)
	@log()
	async getAccounts(request?: GetAllAccountsRequest): Promise<GetAllAccountsResponse> {
		const cached = this._accountsTimedCache.get(ACCOUNT_CACHE_KEY);
		if (cached && !request?.force) {
			return cached;
		}
		try {
			const apiResult = await this.graphqlClient.query(`{
  actor {
    accounts {
      name
      id
    }
  }
}`);
			const result = { accounts: apiResult?.actor?.accounts };
			this._accountsTimedCache.put(ACCOUNT_CACHE_KEY, result);
			return result;
		} catch (ex) {
			this.graphqlClient.errorLogIfNotIgnored(ex, "getAccounts");
			if (ex instanceof ResponseError) {
				throw ex;
			}
			if (ex instanceof GraphqlNrqlTimeoutError) {
				throw new ResponseError(ERROR_NRQL_TIMEOUT, ex.message);
			}
			if (ex instanceof GraphqlNrqlError) {
				throw new ResponseError(ERROR_NRQL_GENERIC, ex.message);
			}
			if (ex instanceof CodedError) {
				throw new ResponseError(ERROR_NRQL_GENERIC, ex.message, ex.code);
			}
			throw new ResponseError(ERROR_GENERIC_USE_ERROR_MESSAGE, ex.message);
		}
	}

	/*
	Not actually used - agent is restarted at logout but keeping for
	possible future use
 	*/
	dispose(): void {
		this._accountsTimedCache.clear();
	}
}
