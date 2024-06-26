import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import { RepoEntitiesByRemotesResponse } from "../newrelic.types";
import {
	AgentValidateLanguageExtensionRequestType,
	BuiltFromResult,
	Entity,
	EntityAccount,
	EntitySearchResponse,
	EntityTypeMap,
	GetObservabilityReposRequest,
	GetObservabilityReposRequestType,
	GetObservabilityReposResponse,
	isNRErrorResponse,
	LanguageAndVersionValidation,
	NRErrorResponse,
	ObservabilityRepo,
	RelatedEntity,
	RelatedEntityByRepositoryGuidsResult,
	RelatedRepoWithRemotes,
	ReposScm,
} from "@codestream/protocols/agent";
import Cache from "@codestream/utils/system/timedCache";
import { Logger } from "../../../logger";
import {
	flatten as _flatten,
	isEmpty as _isEmpty,
	memoize,
	uniq as _uniq,
	MemoizedFunction,
} from "lodash";
import { GitRemoteParser } from "../../../git/parsers/remoteParser";
import { log } from "../../../system/decorators/log";
import { lsp, lspHandler } from "../../../system/decorators/lsp";
import { SessionContainer, SessionServiceContainer } from "../../../container";
import semver from "semver";
import { NrApiConfig } from "../nrApiConfig";
import { mapNRErrorResponse, findEntityTypeDisplayName } from "../utils";
import { ContextLogger } from "../../contextLogger";
import { Disposable } from "../../../system/disposable";
import { getRepoName } from "@codestream/utils/system/string";
import { gate } from "../../../system/decorators/gate";

const REQUIRED_AGENT_VERSIONS = {
	go: "3.24.0",
	java: "7.11.0",
	".net": "10.2.0",
	"node.js": "10.5.0",
	php: "10.6.0 ",
	python: "7.10.0.175",
	ruby: "8.10.0 ",
};
@lsp
export class ReposProvider implements Disposable {
	private _repositoryEntitiesByRepoRemotes = new Cache<RepoEntitiesByRemotesResponse>({
		defaultTtl: 30 * 1000,
	});
	// 30 second cache
	private _observabilityReposCache = new Cache<GetObservabilityReposResponse>({
		defaultTtl: 30 * 1000,
	});
	private readonly _memoizedBuildRepoRemoteVariants: ((remotes: string[]) => Promise<string[]>) &
		MemoizedFunction;

	constructor(
		private graphqlClient: NewRelicGraphqlClient,
		private sessionServiceContainer: SessionServiceContainer,
		private nrApiConfig: NrApiConfig
	) {
		this._memoizedBuildRepoRemoteVariants = memoize(
			this.buildRepoRemoteVariants,
			(remotes: string[] | undefined) => remotes
		);
	}

	async buildRepoRemoteVariants(remotes: string[]): Promise<string[]> {
		const set = new Set<string>();
		if (!remotes || remotes.length === 0) {
			return [];
		}

		await Promise.all(
			remotes.map(async _ => {
				const variants = await GitRemoteParser.getRepoRemoteVariants(_);
				variants.forEach(v => {
					set.add(v.value);
				});
				return true;
			})
		);

		return Array.from(set);
	}

	/**
	 * Returns a list of git repos, along with any NR entity associations.
	 *
	 * Can throw errors.
	 *
	 * @param {GetObservabilityReposRequest} request
	 * @return {*}
	 * @memberof ReposProvider
	 */
	@lspHandler(GetObservabilityReposRequestType)
	@log()
	@gate() // Give the cache a chance to work - otherwise calls come at the same time and cache is never hit
	async getObservabilityRepos(
		request: GetObservabilityReposRequest
	): Promise<GetObservabilityReposResponse> {
		const { force = false, isMultiRegion } = request;
		const cacheKey = JSON.stringify(request);
		if (!force) {
			const cached = this._observabilityReposCache.get(cacheKey);
			if (cached) {
				Logger.log("getObservabilityRepos: from cache", {
					cacheKey,
				});
				return cached;
			}
		}
		const response: GetObservabilityReposResponse = { repos: [] };
		try {
			const { scm } = this.sessionServiceContainer;
			const reposResponse = await scm.getRepos({ includeRemotes: true });
			let filteredRepos: ReposScm[] | undefined = reposResponse?.repositories;
			if (request?.filters?.length) {
				const repoIds = request.filters.map(_ => _.repoId);
				filteredRepos = reposResponse.repositories?.filter(r => r.id && repoIds.includes(r.id));
			}

			if (!filteredRepos || !filteredRepos.length) return response;

			for (const repo of filteredRepos) {
				if (!repo.remotes || !repo.remotes.length) {
					ContextLogger.warn(
						"getObservabilityRepos skipping repo with missing id and/or repo.remotes",
						{
							repo: repo,
						}
					);
					continue;
				}
				const folderName = getRepoName({ path: repo.path });

				if (response.repos?.some(_ => _?.repoName === folderName)) {
					ContextLogger.warn("getObservabilityRepos skipping duplicate repo name", {
						repo: repo,
					});
					continue;
				}

				const remotes: string[] = repo.remotes?.map(_ => _.rawUrl!);

				// find REPOSITORY entities tied to a remote
				const repositoryEntitiesResponse = await this.findRepositoryEntitiesByRepoRemotes(
					remotes,
					force,
					isMultiRegion
				);

				if (isNRErrorResponse(repositoryEntitiesResponse)) {
					return { error: repositoryEntitiesResponse };
				}

				let remoteUrls: (string | undefined)[] = [];
				let hasRepoAssociation;
				let applicationAssociations;
				if (repositoryEntitiesResponse?.entities) {
					// find RELATED entities that are tied to REPOSITORY entities
					const entitiesReponse = await this.findRelatedEntityByRepositoryGuids(
						repositoryEntitiesResponse?.entities?.map(_ => _.guid)
					);
					// find the APPLICATION, SERVICE (otel), and AWSLAMBDA entities themselves
					applicationAssociations = entitiesReponse?.actor?.entities?.filter(
						_ =>
							_?.relatedEntities?.results?.filter(
								r =>
									r.source?.entity?.type === "APPLICATION" ||
									r.source?.entity?.type === "SERVICE" ||
									r.source?.entity?.type === "AWSLAMBDAFUNCTION"
							).length
					);
					hasRepoAssociation = applicationAssociations?.length > 0;

					// find all the unique remotes in all the entities found
					remoteUrls = _uniq(
						_flatten(
							repositoryEntitiesResponse.entities.map(_ => {
								return _.tags?.find(t => t.key === "url")?.values;
							})
						)
					).filter(Boolean);

					ContextLogger.log("found repositories matching remotes", {
						remotes: remotes,
						entities: repositoryEntitiesResponse?.entities?.map(_ => {
							return { guid: _.guid, name: _.name };
						}),
					});
				}

				let remote = "";
				if (remoteUrls && remoteUrls[0]) {
					if (remoteUrls.length > 1) {
						// if for some reason we have > 1 (user has bad remotes, or remotes that point to other places WITH entity mappings)
						ContextLogger.warn("");
						ContextLogger.warn("getEntitiesByRepoRemote FOUND MORE THAN 1 UNIQUE REMOTE", {
							remotes: remotes,
							entityRemotes: remoteUrls,
						});
						ContextLogger.warn("");
					}
					remote = remoteUrls[0];
				} else {
					remote = remotes[0];
				}

				let firstMatchedRepoGuid = "";
				let repoNameOnNr = "";

				const uniqueEntities: Entity[] = [];
				if (applicationAssociations && applicationAssociations.length) {
					for (const entity of applicationAssociations) {
						if (!entity.relatedEntities?.results) continue;

						for (const relatedResult of entity.relatedEntities.results) {
							if (
								relatedResult?.source?.entity?.type &&
								["APPLICATION", "SERVICE", "AWSLAMBDAFUNCTION"].includes(
									relatedResult?.source?.entity?.type
								) &&
								relatedResult?.target?.entity?.type === "REPOSITORY"
							) {
								// we can't use the target.tags.account since the Repo entity might have been
								// created in _another_ account (under the same trustedAccountId).

								// When a repo entity is created, it is tied to the account where it was created.
								// if it tied to another entity (in another account but still under the same trustedAccount),
								// it's tag.account data will retain the origin account data
								if (!relatedResult?.source?.entity?.account) {
									continue;
								}
								if (
									uniqueEntities.find(
										ue =>
											ue.guid === relatedResult.source.entity.guid &&
											ue.account?.id === relatedResult.source.entity.account?.id
									)
								) {
									continue;
								}

								const tagsArray = relatedResult?.target?.entity.tags;
								if (tagsArray) {
									const urlEntry = tagsArray.find(entry => entry.key === "url");
									if (
										urlEntry?.values &&
										remoteUrls.some(url => {
											if (url) {
												return urlEntry.values.includes(url);
											} else {
												return false;
											}
										}) &&
										!firstMatchedRepoGuid
									) {
										firstMatchedRepoGuid = relatedResult.target.entity.guid;
									}
								}

								repoNameOnNr = relatedResult.target.entity.name;

								uniqueEntities.push(relatedResult.source.entity);
							}
						}
					}
				}
				let mappedUniqueEntities = await Promise.all(
					uniqueEntities.map(async (entity: Entity) => {
						const languageAndVersionValidation = await this.languageAndVersionValidation(
							entity,
							request?.isVsCode
						);
						return {
							accountId: entity.account?.id,
							accountName: entity.account?.name || "Account",
							entityGuid: entity.guid,
							entityName: entity.name,
							entityType: entity.entityType,
							type: entity.type,
							entityTypeDescription: entity.entityType
								? EntityTypeMap[entity.entityType]
								: undefined,
							tags: entity.tags,
							domain: entity.domain,
							displayName: findEntityTypeDisplayName(entity.domain || "", entity.type || ""),
							alertSeverity: entity?.alertSeverity,
							url: `${this.nrApiConfig.productUrl}/redirect/entity/${entity.guid}`,
							distributedTracingEnabled: this.hasStandardOrInfiniteTracing(entity),
							languageAndVersionValidation: languageAndVersionValidation,
						} as EntityAccount;
					})
				);
				mappedUniqueEntities = mappedUniqueEntities.filter(Boolean);
				mappedUniqueEntities.sort((a, b) =>
					`${a?.accountName}-${a?.entityName}`.localeCompare(`${b?.accountName}-${b?.entityName}`)
				);
				response.repos?.push({
					repoId: repo.path,
					repoName: folderName,
					repoRemote: remote,
					repoGuid: firstMatchedRepoGuid,
					repoNameOnNr,
					hasRepoAssociation,
					hasCodeLevelMetricSpanData: true,
					entityAccounts: mappedUniqueEntities,
				});
				ContextLogger.log(`getObservabilityRepos hasRepoAssociation=${hasRepoAssociation}`, {
					repoId: repo.id,
					entities: repositoryEntitiesResponse?.entities?.map(_ => _.guid),
				});
			}
		} catch (ex) {
			ContextLogger.error(ex, "getObservabilityRepos");
			throw ex;
		}

		this._observabilityReposCache.put(cacheKey, response);

		return response;
	}

	async findRelatedEntityByRepositoryGuids(
		repositoryGuids: string[]
	): Promise<RelatedEntityByRepositoryGuidsResult> {
		return this.graphqlClient.query(
			`query fetchRelatedEntities($guids:[EntityGuid]!){
			actor {
			  entities(guids: $guids) {
				relatedEntities(filter: {direction: BOTH, relationshipTypes: {include: BUILT_FROM}}) {
				  results {
					source {
					  entity {
						account {
							name
							id
						}
						domain
						alertSeverity
						name
						guid
						type
						entityType
						tags {
							key
							values
						}
					  }
					}
					target {
					  entity {
						name
						guid
						type
						entityType
						tags {
							key
							values
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
				guids: repositoryGuids,
			}
		);
	}

	// TODO Shouldn't this be findRelatedEntityByEntityGuid??
	@log()
	async findRelatedEntityByRepositoryGuid(repositoryGuid: string): Promise<{
		actor: {
			entity: {
				relatedEntities: {
					results: RelatedEntity[];
				};
			};
		};
	}> {
		return this.graphqlClient.query(
			`query fetchRelatedEntities($guid:EntityGuid!){
			actor {
			  entity(guid: $guid) {
				relatedEntities(filter: {direction: BOTH, relationshipTypes: {include: BUILT_FROM}}) {
				  results {
					source {
					  entity {
						account {
							id
							name
						}
						domain
						alertSeverity
						name
						guid
						type
						entityType
					  }
					}
					target {
					  entity {
						name
						guid
						type
						entityType
						tags {
							key
							values
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
				guid: repositoryGuid,
			}
		);
	}

	/**
	 * Finds any Repositories mapped to a remote[s]
	 *
	 * @private
	 * @param {string[]} remotes
	 * @param {boolean} force
	 * @return {*}  {(Promise<RepoEntitiesByRemotesResponse | undefined >)}
	 * @memberof ReposProvider
	 */
	async findRepositoryEntitiesByRepoRemotes(
		remotes: string[],
		force = false,
		isMultiRegion = false
	): Promise<RepoEntitiesByRemotesResponse | NRErrorResponse> {
		const cacheKey = JSON.stringify(remotes);
		if (!force) {
			const cached = this._repositoryEntitiesByRepoRemotes.get(cacheKey);
			if (cached) {
				Logger.log("findRepositoryEntitiesByRepoRemotes: from cache", {
					cacheKey,
				});
				return cached;
			}
		}
		try {
			const remoteVariants: string[] = await this._memoizedBuildRepoRemoteVariants(remotes);
			if (!remoteVariants.length) return {};

			const remoteFilters = remoteVariants.map((_: string) => `tags.url = '${_}'`).join(" OR ");
			const query = `{
	actor {
	  entitySearch(query: "type = 'REPOSITORY' and (${remoteFilters})") {
		count
		query
		results {
		  entities {
			guid
			name
			account {
				id
				name
			}
			tags {
			  key
			  values
			}
		  }
		}
	  }
	}
  }
  `;
			const queryResponse = await this.graphqlClient.query<EntitySearchResponse>(
				query,
				undefined,
				isMultiRegion
			);
			const response = {
				entities: queryResponse.actor.entitySearch.results.entities,
				remotes: remoteVariants,
			};
			this._repositoryEntitiesByRepoRemotes.put(cacheKey, response);
			return response;
		} catch (ex) {
			ContextLogger.warn("getEntitiesByRepoRemote", {
				error: ex,
			});
			return mapNRErrorResponse(ex);
		}
	}

	async languageAndVersionValidation(
		entity?: Entity,
		isVsCode?: boolean
	): Promise<LanguageAndVersionValidation> {
		const tags = entity?.tags || [];
		const agentVersion = tags.find(tag => tag.key === "agentVersion");
		const language = tags.find(tag => tag.key === "language");

		if (!agentVersion || !language) {
			return {};
		}

		const version = agentVersion?.values[0];
		const languageValue = language?.values[0].toLowerCase();
		let extensionValidationResponse;
		if (isVsCode) {
			extensionValidationResponse = await SessionContainer.instance().session.agent.sendRequest(
				AgentValidateLanguageExtensionRequestType,
				{
					language: languageValue,
				}
			);
		}

		if (
			languageValue === "go" ||
			languageValue === "java" ||
			languageValue === ".net" ||
			languageValue === "node.js" ||
			languageValue === "php" ||
			languageValue === "python" ||
			languageValue === "ruby"
		) {
			if (
				version &&
				semver.lt(
					semver.coerce(version) || version,
					semver.coerce(REQUIRED_AGENT_VERSIONS[languageValue]) ||
						REQUIRED_AGENT_VERSIONS[languageValue]
				)
			) {
				return {
					language: language.values[0],
					languageExtensionValidation: extensionValidationResponse?.languageValidationString
						? extensionValidationResponse?.languageValidationString
						: "VALID",
					required: REQUIRED_AGENT_VERSIONS[languageValue],
				};
			}
		}
		return {
			languageExtensionValidation: extensionValidationResponse?.languageValidationString
				? extensionValidationResponse?.languageValidationString
				: "VALID",
		};
	}

	hasStandardOrInfiniteTracing(entity?: Entity): boolean {
		const tags = entity?.tags || [];
		const tracingTag = tags.find(tag => tag.key === "nr.tracing");

		if (!tracingTag) {
			return false;
		}

		const tracingValue = tracingTag.values[0];

		// Values can be either 'standard' for head-based sampling or 'infinite' for tail-based sampling.
		return tracingValue === "standard" || tracingValue === "infinite";
	}

	async findMappedRemoteByEntity(
		entityGuid: string
	): Promise<RelatedRepoWithRemotes[] | undefined> {
		if (!entityGuid) return undefined;

		const relatedEntityResponse = await this.findRelatedEntityByRepositoryGuid(entityGuid);
		if (relatedEntityResponse) {
			const relatedRepoData = this.findRelatedReposFromServiceEntity(
				relatedEntityResponse.actor.entity.relatedEntities.results
			);

			let relatedRepoDataWithRemotes;

			if (relatedRepoData) {
				relatedRepoDataWithRemotes = await Promise.all(
					relatedRepoData.map(
						async (
							_
						): Promise<{ url?: string; remotes?: string[]; error?: any; name?: string }> => {
							const remotes = await this._memoizedBuildRepoRemoteVariants(_.url ? [_.url] : []);
							if (!_isEmpty(remotes)) {
								return { ..._, remotes };
							}
							return { ..._ };
						}
					)
				);
			}
			Logger.log("findMappedRemoteByEntity", { entityGuid, relatedRepoDataWithRemotes });
			if (!_isEmpty(relatedRepoDataWithRemotes)) {
				return relatedRepoDataWithRemotes;
			}
		}
		Logger.warn(
			"findMappedRemoteByEntity: no response data from findRelatedEntityByRepositoryGuid",
			entityGuid
		);
		return undefined;
	}

	findRelatedReposFromServiceEntity(
		relatedEntities: RelatedEntity[]
	): BuiltFromResult[] | undefined {
		if (!relatedEntities || !relatedEntities.length) return undefined;

		const relatedRepoData = relatedEntities.flatMap(_ => {
			if (_.type !== "BUILT_FROM") return [];
			const tags = _.target?.entity?.tags;
			if (tags) {
				const targetEntityTagsValues = tags.find((_: any) => _.key === "url");
				if (
					targetEntityTagsValues &&
					targetEntityTagsValues.values &&
					targetEntityTagsValues.values.length
				) {
					return [
						{
							url: targetEntityTagsValues.values[0],
							name: _.target?.entity?.name,
						},
					];
				}
			}
			return [];
		});

		return _isEmpty(relatedRepoData) ? undefined : relatedRepoData;
	}

	/**
	 * Given a CodeStream repoId, get a list of NR entities that have this
	 * git remote attached to it
	 *
	 * @private
	 * @param {string} repoId
	 * @param {boolean} skipRepoFetch - Don't error out, let it be skipped
	 * @param {boolean} force - Don't use cache, force live request
	 * @return {*}
	 * @memberof ReposProvider
	 */
	async getObservabilityEntityRepos(
		repoId: string,
		skipRepoFetch = false,
		force = false,
		isServiceSearch = false
	): Promise<ObservabilityRepo | undefined> {
		let observabilityRepos: GetObservabilityReposResponse | undefined;
		try {
			observabilityRepos = await this.getObservabilityRepos({
				filters: [{ repoId: repoId }],
				force,
			});
		} catch (err) {
			this.graphqlClient.contextWarnLogIfNotIgnored("getObservabilityEntityRepos", { error: err });
			if (!skipRepoFetch) {
				throw mapNRErrorResponse(err);
			}
		}
		if (!observabilityRepos?.repos?.length) {
			ContextLogger.warn("observabilityRepos.repos empty", {
				repoId: repoId,
			});
			return undefined;
		}

		const repo = observabilityRepos.repos.find(_ => _.repoId === repoId);
		if (!repo) {
			ContextLogger.warn("observabilityRepos.repos unmatched for repo", {
				repoId: repoId,
			});
			return undefined;
		}
		return repo;
	}

	/*
  Not actually used - agent is restarted at logout but keeping for
  possible future use
  */
	dispose(): void {
		this._repositoryEntitiesByRepoRemotes.clear();
		this._observabilityReposCache.clear();
		this._memoizedBuildRepoRemoteVariants.cache.clear?.();
	}
}
