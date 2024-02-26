import { lsp, lspHandler } from "../../../system/decorators/lsp";
import {
	EntityType,
	EntityTypeMap,
	ERROR_GENERIC_USE_ERROR_MESSAGE,
	ERROR_NRQL_GENERIC,
	ERROR_NRQL_TIMEOUT,
	GetEntityCountRequest,
	GetEntityCountRequestType,
	GetEntityCountResponse,
	GetNewRelicRelatedEntitiesRequest,
	GetNewRelicRelatedEntitiesRequestType,
	GetNewRelicRelatedEntitiesResponse,
	GetObservabilityEntitiesRequest,
	GetObservabilityEntitiesRequestType,
	GetObservabilityEntitiesResponse,
	RelatedEntity,
} from "@codestream/protocols/agent";
import { log } from "../../../system/decorators/log";
import { ResponseError } from "vscode-jsonrpc/lib/messages";
import {
	CodedError,
	EntitySearchResult,
	GraphqlNrqlError,
	GraphqlNrqlTimeoutError,
} from "../newrelic.types";
import Cache from "@codestream/utils/system/timedCache";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import { Disposable, Strings } from "../../../system";
import { isEmpty as _isEmpty, isUndefined as _isUndefined } from "lodash";
import { Logger } from "../../../logger";
import { ContextLogger } from "../../contextLogger";

const ENTITY_CACHE_KEY = "entityCache";

@lsp
export class EntityProvider implements Disposable {
	// 30 second cache
	private _entityCountTimedCache = new Cache<GetEntityCountResponse>({ defaultTtl: 30 * 1000 });

	constructor(private graphqlClient: NewRelicGraphqlClient) {}

	@lspHandler(GetEntityCountRequestType)
	@log()
	async getEntityCount(request?: GetEntityCountRequest): Promise<GetEntityCountResponse> {
		// Cache entity count separately for case of user that has no entity association setup yet
		// if we don't cache the nrql will execute for every single file they open in the IDE
		// Flip side: if cache is too long user will get frustrated that new repo association isn't show up in
		// UI during setup

		const cached = this._entityCountTimedCache.get(ENTITY_CACHE_KEY);
		if (cached && !request?.force) {
			return cached;
		}
		try {
			const apiResult = await this.graphqlClient.query(`{
			actor {
			  entitySearch(query: "type IN ('APPLICATION', 'SERVICE', 'AWSLAMBDAFUNCTION')") {
				count       
			  }
			}
		  }`);
			const result = { entityCount: apiResult?.actor?.entitySearch?.count };
			this._entityCountTimedCache.put(ENTITY_CACHE_KEY, result);
			return result;
		} catch (ex) {
			this.graphqlClient.errorLogIfNotIgnored(ex, "getEntityCount");
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

	/**
	 * Autocomplete what user has typed up to N matching entities
	 * Relies on caching in the UI layer (AsyncPaginate)
	 *
	 * Can throw errors
	 *
	 * @param request
	 * @returns Promise<GetObservabilityEntitiesResponse>
	 * @memberof NewRelicProvider
	 */
	@lspHandler(GetObservabilityEntitiesRequestType)
	@log({ timed: true })
	async getEntities(
		request: GetObservabilityEntitiesRequest
	): Promise<GetObservabilityEntitiesResponse> {
		const { limit = 50 } = request;
		try {
			const statement = this.generateEntityQueryStatement(request.searchCharacters);

			const query = `query search($cursor:String){
				actor {
				  entitySearch(query: "type IN ('APPLICATION', 'SERVICE', 'AWSLAMBDAFUNCTION') and ${statement}", 
				  sortByWithDirection: { attribute: NAME, direction: ASC },
				  options: { limit: ${limit} }) {
					count
					results(cursor:$cursor) {
					  nextCursor
					  entities {
						guid
						name
						entityType
						account {
							name
						  }
						}
					  }
					}
				  }
			  }`;

			const response: EntitySearchResult = await this.graphqlClient.query<EntitySearchResult>(
				query,
				{
					cursor: request.nextCursor ?? null,
				}
			);
			const entities = response.actor.entitySearch.results.entities.map(
				(_: { guid: string; name: string; account: { name: string }; entityType: EntityType }) => {
					return {
						guid: _.guid,
						name: _.name,
						account: _.account.name,
						entityType: _.entityType,
						entityTypeDescription: EntityTypeMap[_.entityType],
					};
				}
			);

			return {
				totalResults: response.actor.entitySearch.count,
				entities,
				nextCursor: response.actor.entitySearch.results.nextCursor,
			};
		} catch (ex) {
			ContextLogger.error(ex, "getEntities");
			throw ex;
		}
	}

	@lspHandler(GetNewRelicRelatedEntitiesRequestType)
	@log()
	async getNewRelicRelatedEntities(
		request: GetNewRelicRelatedEntitiesRequest
	): Promise<GetNewRelicRelatedEntitiesResponse | undefined> {
		try {
			const response = await this.graphqlClient.query(
				`query relatedEntitiesTest($entityGuid: EntityGuid!) {
					actor {
					  entity(guid: $entityGuid) {
						name
						relatedEntities(filter: {direction: ${request.direction}, relationshipTypes: {include: CALLS}, entityDomainTypes: {include: [{domain: "EXT", type: "SERVICE"}, {domain: "APM", type: "APPLICATION"}]}}) {
							results {
							target {
							  entity {
								name
								guid
								alertSeverity
								domain
								type
								account {
								  name
								}
							  }
							}
							source {
							  entity {
								  name
								  guid
								  alertSeverity
								  domain
								  type
								  account {
									name
								  }
								}
							  }
							type
						  }
						}
					  }
					}
				  }				  
			  	`,
				{
					entityGuid: request.entityGuid,
				}
			);
			if (response?.actor?.entity?.relatedEntities?.results) {
				const results = response.actor.entity.relatedEntities.results.map((_: RelatedEntity) => {
					const _entity = request.direction === "INBOUND" ? _.source.entity : _.target.entity;
					return {
						alertSeverity: _entity.alertSeverity,
						guid: _entity.guid,
						name: _entity.name,
						type: _.type,
						domain: _entity.domain,
						accountName: _entity?.account?.name,
					};
				});
				return results;
			} else {
				return [];
			}
		} catch (e) {
			ContextLogger.error(e, "getRelatedEntities");
			throw e;
		}
	}

	@log()
	private async getPrimaryEntityTransactionType(
		accountId: number,
		entityGuid: string
	): Promise<string> {
		try {
			const query = `{
				actor {
					account(id: ${accountId}) {
						transactionTypeList: nrql(query: "SELECT rate(count(apm.service.transaction.duration), 1 minute) as 'transactionCount' FROM Metric WHERE (entity.guid = '${entityGuid}') LIMIT MAX SINCE 10 MINUTES AGO TIMESERIES facet transactionType", timeout: 60) {
							results
							metadata {
								timeWindow {
									end
								}
							}
						}
					}
				}
			}
			`;

			const results = await this.graphqlClient.query(query);
			let transactionTypeArray = results?.actor?.account?.transactionTypeList?.results;
			let transactionTypeCountObject: any = {};

			interface TransactionTypeElement {
				beginTimeSeconds: number;
				endTimeSeconds: number;
				facet: string;
				transactionCount: number;
				transactionType: string;
			}

			transactionTypeArray.forEach((_: TransactionTypeElement) => {
				let transactionType = _.transactionType;
				if (_isUndefined(transactionTypeCountObject[transactionType])) {
					transactionTypeCountObject[transactionType] = 0;
				} else {
					transactionTypeCountObject[transactionType]++;
				}
			});

			const primaryTransactionType = Object.keys(transactionTypeCountObject).reduce((a, b) =>
				transactionTypeCountObject[a] > transactionTypeCountObject[b] ? a : b
			);

			return _isEmpty(primaryTransactionType) ? "Web" : primaryTransactionType;
		} catch (ex) {
			Logger.warn("getServiceGoldenMetrics no response", {
				entityGuid,
				error: ex,
			});
			//default value if nothing is parsed from above query
			return "Web";
		}
	}

	generateEntityQueryStatement(search: string): string {
		return `name LIKE '%${Strings.sanitizeGraphqlValue(search)}%'`;
	}

	/*
	Not actually used - agent is restarted at logout but keeping for
	possible future use
 	*/
	dispose(): void {
		this._entityCountTimedCache.clear();
	}
}
