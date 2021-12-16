"use strict";
import fs from "fs";
import { GraphQLClient } from "graphql-request";
import {
	flatten as _flatten,
	groupBy as _groupBy,
	memoize,
	sortBy as _sortBy,
	uniq as _uniq,
	uniqBy as _uniqBy
} from "lodash-es";
import { sep } from "path";
import { ResponseError } from "vscode-jsonrpc/lib/messages";
import { URI } from "vscode-uri";
import { InternalError, ReportSuppressedMessages } from "../agentError";
import { SessionContainer } from "../container";
import { GitRemoteParser } from "../git/parsers/remoteParser";
import { Logger } from "../logger";
import {
	BuiltFromResult,
	Entity,
	EntityAccount,
	EntitySearchResponse,
	ERROR_NR_CONNECTION_INVALID_API_KEY,
	ERROR_NR_CONNECTION_MISSING_API_KEY,
	ERROR_NR_CONNECTION_MISSING_URL,
	ERROR_PIXIE_NOT_CONFIGURED,
	ErrorGroup,
	ErrorGroupResponse,
	ErrorGroupsResponse,
	ErrorGroupStateType,
	GetNewRelicAccountsRequestType,
	GetNewRelicAccountsResponse,
	GetNewRelicAssigneesRequestType,
	GetNewRelicErrorGroupRequest,
	GetNewRelicErrorGroupRequestType,
	GetNewRelicErrorGroupResponse,
	GetObservabilityEntitiesRequest,
	GetObservabilityEntitiesRequestType,
	GetObservabilityEntitiesResponse,
	GetObservabilityErrorAssignmentsRequest,
	GetObservabilityErrorAssignmentsRequestType,
	GetObservabilityErrorAssignmentsResponse,
	GetObservabilityErrorGroupMetadataRequest,
	GetObservabilityErrorGroupMetadataRequestType,
	GetObservabilityErrorGroupMetadataResponse,
	GetObservabilityErrorsRequest,
	GetObservabilityErrorsRequestType,
	GetObservabilityErrorsResponse,
	GetObservabilityReposRequest,
	GetObservabilityReposRequestType,
	GetObservabilityReposResponse,
	NewRelicConfigurationData,
	NewRelicErrorGroup,
	ObservabilityError,
	ObservabilityErrorCore,
	RelatedEntity,
	ReposScm,
	StackTraceResponse,
	ThirdPartyDisconnect,
	ThirdPartyProviderConfig,
	CrashOrException,
	GetMethodLevelTelemetryRequestType,
	GetMethodLevelTelemetryRequest,
	GetMethodLevelTelemetryResponse
} from "../protocol/agent.protocol";
import { CSNewRelicProviderInfo } from "../protocol/api.protocol";
import { CodeStreamSession } from "../session";
import { Dates, log, lspHandler, lspProvider } from "../system";
import { Strings } from "../system/string";
import { ThirdPartyIssueProviderBase } from "./provider";

export interface Directive {
	type: "assignRepository" | "removeAssignee" | "setAssignee" | "setState";
	data: any;
}

interface Directives {
	directives: Directive[];
}

interface NewRelicId {
	accountId: number;
	unknownAbbreviation: string;
	entityType: string;
	unknownGuid: string;
}

class AccessTokenError extends Error {
	constructor(public text: string, public innerError: any, public isAccessTokenError: boolean) {
		super(text);
	}
}

@lspProvider("newrelic")
export class NewRelicProvider extends ThirdPartyIssueProviderBase<CSNewRelicProviderInfo> {
	private _newRelicUserId: number | undefined = undefined;
	private _memoizedBuildRepoRemoteVariants: any;

	constructor(session: CodeStreamSession, config: ThirdPartyProviderConfig) {
		super(session, config);
		this._memoizedBuildRepoRemoteVariants = memoize(
			this.buildRepoRemoteVariants,
			(remotes: string[]) => remotes
		);
	}

	get displayName() {
		return "New Relic";
	}

	get name() {
		return "newrelic";
	}

	get headers() {
		return {
			"Api-Key": this.accessToken!,
			"Content-Type": "application/json"
		};
	}

	get apiUrl() {
		const data = this._providerInfo && this._providerInfo.data;
		return this.getApiUrlCore(data);
	}

	private getApiUrlCore(data?: { apiUrl?: string; usingEU?: boolean; [key: string]: any }): string {
		if (data) {
			if (data.apiUrl) {
				return Strings.trimEnd(data.apiUrl, "/").toLowerCase();
			}
			if (data.usingEU) {
				return "https://api.eu.newrelic.com";
			}
		}
		return "https://api.newrelic.com";
	}

	get productUrl() {
		return this.apiUrl.replace("api", "one");
	}

	get baseUrl() {
		return this.apiUrl;
	}

	get graphQlBaseUrl() {
		return `${this.baseUrl}/graphql`;
	}

	@log()
	async onDisconnected(request?: ThirdPartyDisconnect) {
		// delete the graphql client so it will be reconstructed if a new token is applied
		delete this._client;
		delete this._newRelicUserId;

		try {
			// remove these when a user disconnects -- don't want them lingering around
			const { users } = SessionContainer.instance();
			await users.updatePreferences({
				preferences: {
					observabilityRepoEntities: []
				}
			});
		} catch (ex) {
			ContextLogger.warn("failed to remove observabilityRepoEntities", ex);
		}

		super.onDisconnected(request);
	}

	protected async client(): Promise<GraphQLClient> {
		const client =
			this._client || (this._client = this.createClient(this.graphQlBaseUrl, this.accessToken));
		client.setHeaders({
			"Api-Key": this.accessToken!,
			"Content-Type": "application/json",
			"NewRelic-Requesting-Services": "CodeStream"
		});
		ContextLogger.setData({
			nrUrl: this.graphQlBaseUrl,
			versionInfo: {
				version: this.session.versionInfo?.extension?.version,
				build: this.session.versionInfo?.extension?.build
			},
			ide: this.session.versionInfo?.ide,
			isProductionCloud: this.session.isProductionCloud
		});
		return client;
	}

	protected createClient(graphQlBaseUrl?: string, accessToken?: string): GraphQLClient {
		if (!graphQlBaseUrl) {
			throw new ResponseError(ERROR_NR_CONNECTION_MISSING_URL, "Could not get a New Relic API URL");
		}
		if (!accessToken) {
			throw new ResponseError(
				ERROR_NR_CONNECTION_MISSING_API_KEY,
				"Could not get a New Relic API key"
			);
		}
		const options: { [key: string]: any } = {};
		if (this._httpsAgent) {
			options.agent = this._httpsAgent;
		}
		const client = new GraphQLClient(graphQlBaseUrl, options);

		// set accessToken on a per-usage basis... possible for accessToken
		// to be revoked from the source (github.com) and a stale accessToken
		// could be cached in the _client instance.
		client.setHeaders({
			"Api-Key": accessToken!,
			"Content-Type": "application/json",
			"NewRelic-Requesting-Services": "CodeStream"
		});

		return client;
	}

	@log()
	async configure(request: NewRelicConfigurationData) {
		// FIXME - this rather sucks as a way to ensure we have the access token
		// const userPromise = new Promise<void>(resolve => {
		// 	this.session.api.onDidReceiveMessage(e => {
		// 		if (e.type !== MessageType.Users) return;
		//
		// 		const me = e.data.find((u: any) => u.id === this.session.userId) as CSMe | null | undefined;
		// 		if (me == null) return;
		//
		// 		const providerInfo = this.getProviderInfo(me);
		// 		if (providerInfo == null || !providerInfo.accessToken) return;
		//
		// 		resolve();
		// 	});
		// });
		const client = this.createClient(
			this.getApiUrlCore({ apiUrl: request.apiUrl }) + "/graphql",
			request.apiKey
		);
		const { userId, accounts } = await this.validateApiKey(client);
		ContextLogger.log(`Found ${accounts.length} New Relic accounts`);
		const accountIds = accounts.map(_ => _.id);
		const accountsToOrgs = await this.session.api.lookupNewRelicOrganizations({
			accountIds
		});
		const orgIdsSet = new Set(accountsToOrgs.map(_ => _.orgId));
		const uniqueOrgIds = Array.from(orgIdsSet.values());
		ContextLogger.log(`Found ${uniqueOrgIds.length} associated New Relic organizations`);

		const team = await SessionContainer.instance().teams.getByIdFromCache(this.session.teamId);
		const company =
			team && (await SessionContainer.instance().companies.getByIdFromCache(team.companyId));
		if (company) {
			const existingnOrgIds = company.nrOrgIds || [];
			const uniqueNewOrgIds = uniqueOrgIds.filter(_ => existingnOrgIds.indexOf(_) < 0);
			if (accountsToOrgs.length) {
				if (uniqueNewOrgIds.length) {
					ContextLogger.log(
						`Associating company ${company.id} with NR orgs ${uniqueNewOrgIds.join(", ")}`
					);
					await this.session.api.addCompanyNewRelicInfo(company.id, undefined, uniqueNewOrgIds);
				}
			} else if (accounts.length) {
				const existingAccountIds = company.nrAccountIds || [];
				const newAccountIds = accountIds.filter(_ => existingAccountIds.indexOf(_) < 0);
				if (newAccountIds.length) {
					ContextLogger.log(
						`Associating company ${company.id} with NR accounts ${newAccountIds.join(", ")}`
					);
					await this.session.api.addCompanyNewRelicInfo(company.id, newAccountIds, undefined);
				}
			}
		}

		await this.session.api.setThirdPartyProviderToken({
			providerId: this.providerConfig.id,
			token: request.apiKey,
			data: {
				userId,
				accountId: request.accountId,
				apiUrl: request.apiUrl,
				orgIds: uniqueOrgIds
			}
		});

		// update telemetry super-properties
		this.session.addNewRelicSuperProps(userId, uniqueOrgIds[0]);
	}

	private async validateApiKey(
		client: GraphQLClient
	): Promise<{
		userId: number;
		organizationId?: number;
		accounts: any[];
	}> {
		try {
			const response = await client.request<{
				actor: {
					user: {
						id: number;
					};
					organization?: {
						id: number;
					};
					accounts: [
						{
							id: number;
							name: string;
						}
					];
				};
			}>(`{
				actor {
					user {
						id
					}
					accounts {
						id,
						name
					}
				}
			}`);
			return {
				userId: response.actor.user.id,
				accounts: response.actor.accounts,
				organizationId: response.actor.organization?.id
			};
		} catch (ex) {
			const accessTokenError = this.getAccessTokenError(ex);
			throw new ResponseError(
				ERROR_NR_CONNECTION_INVALID_API_KEY,
				accessTokenError?.message || ex.message || ex.toString()
			);
		}
	}

	async mutate<T>(query: string, variables: any = undefined) {
		await this.ensureConnected();

		return (await this.client()).request<T>(query, variables);
	}

	async query<T = any>(query: string, variables: any = undefined): Promise<T> {
		await this.ensureConnected();

		if (this._providerInfo && this._providerInfo.tokenError) {
			delete this._client;
			throw new InternalError(ReportSuppressedMessages.AccessTokenInvalid);
		}

		let response: any;
		try {
			response = await (await this.client()).request<T>(query, variables);
		} catch (ex) {
			ContextLogger.error(ex, `query caught:`);
			const exType = this._isSuppressedException(ex);
			if (exType !== undefined) {
				// this throws the error but won't log to sentry (for ordinary network errors that seem temporary)
				throw new InternalError(exType, { error: ex });
			} else {
				const accessTokenError = this.getAccessTokenError(ex);
				if (accessTokenError) {
					throw new AccessTokenError(accessTokenError.message, ex, true);
				}

				// this is an unexpected error, throw the exception normally
				throw ex;
			}
		}

		return response;
	}

	private getAccessTokenError(ex: any): { message: string } | undefined {
		const requestError = ex as {
			response: {
				errors: {
					extensions: {
						error_code: string;
					};
					message: string;
				}[];
			};
		};
		if (
			requestError &&
			requestError.response &&
			requestError.response.errors &&
			requestError.response.errors.length
		) {
			return requestError.response.errors.find(
				_ => _.extensions && _.extensions.error_code === "BAD_API_KEY"
			);
		}
		return undefined;
	}

	private _applicationEntitiesCache: { [key: string]: GetObservabilityEntitiesResponse } = {};

	private generateEntityQueryStatements(appName: string): string[] {
		let statements = [];
		statements.push(`name LIKE '${Strings.sanitizeGraphqlValue(appName)}'`);
		const splitAppName = appName.split(/[\-\_]+/);
		if (splitAppName.length > 1) {
			for (let i = 0; i < splitAppName.length; i++) {
				const val = splitAppName[i];
				if (val && val.length < 2) continue;

				statements.push(`name LIKE '${Strings.sanitizeGraphqlValue(val)}'`);
			}
		}
		return statements;
	}

	@lspHandler(GetObservabilityEntitiesRequestType)
	@log({
		timed: true
	})
	async getEntities(
		request: GetObservabilityEntitiesRequest
	): Promise<GetObservabilityEntitiesResponse> {
		try {
			const key = request.appName
				? request.appName
				: request.appNames?.length
				? request.appNames.join("-")
				: "";
			if (this._applicationEntitiesCache != null) {
				const cached = this._applicationEntitiesCache[key];
				if (cached) {
					ContextLogger.debug("query entities (from cache)", {
						key: key
					});
					return cached;
				}
			}

			let results: { guid: string; name: string }[] = [];
			const nextCursor: any = undefined;
			// let i = 0;
			// while (true) {

			let statements: string[] = [];
			if (request.appNames?.length) {
				for (const appName of request.appNames) {
					const appStatements = this.generateEntityQueryStatements(appName);
					if (appStatements?.length) {
						statements = statements.concat(appStatements);
					}
				}
			}

			if (request.appName != null) {
				const appStatements = this.generateEntityQueryStatements(request.appName);
				if (appStatements?.length) {
					statements = statements.concat(appStatements);
				}
			}

			if (statements.length) {
				// unique them
				statements = [...new Set(statements).values()];

				const query = `query  {
				actor {
				  entitySearch(query: "type='APPLICATION' and (${statements.join(" or ")})", sortBy:MOST_RELEVANT) {
					results {
					  entities {
						account {
							name
						}
						guid
						name
					  }
					}
				  }
				}
			  }`;
				const response = await this.query<any>(query);
				if (response) {
					results = results.concat(
						response.actor.entitySearch.results.entities.map((_: any) => {
							return {
								guid: _.guid,
								name: _.name
							};
						})
					);
				}
			}

			// then find any other relevant apps
			const response = await this.query<any>(
				`query search($cursor:String) {
			actor {
			  entitySearch(query: "type='APPLICATION'", sortBy:MOST_RELEVANT) {
				results(cursor:$cursor) {
				 nextCursor
				  entities {
					guid
					name
				  }
				}
			  }
			}
		  }`,
				{
					cursor: nextCursor
				}
			);

			results = results.concat(
				response.actor.entitySearch.results.entities.map((_: any) => {
					return {
						guid: _.guid,
						name: _.name
					};
				})
			);
			// nextCursor = response.actor.entitySearch.results.nextCursor;
			// i++;
			// if (!nextCursor) {
			// 	break;
			// } else {
			// 	ContextLogger.log("query entities ", {
			// 		i: i
			// 	});
			// }
			// }
			results.sort((a, b) => a.name.localeCompare(b.name));

			results = [...new Map(results.map(item => [item["guid"], item])).values()];

			if (results.length) {
				const cachedResults = {
					entities: results
				} as GetObservabilityEntitiesResponse;
				this._applicationEntitiesCache[key] = cachedResults;
				return cachedResults;
			}
		} catch (ex) {
			ContextLogger.error(ex, "getEntities");
		}
		return {
			entities: []
		};
	}

	@lspHandler(GetObservabilityErrorGroupMetadataRequestType)
	@log({
		timed: true
	})
	async getErrorGroupMetadata(
		request: GetObservabilityErrorGroupMetadataRequest
	): Promise<GetObservabilityErrorGroupMetadataResponse | undefined> {
		if (!request.errorGroupGuid) return undefined;

		try {
			const metricResponse = await this.getMetricData(request.errorGroupGuid);
			if (!metricResponse) return undefined;

			const mappedEntity = await this.findMappedRemoteByEntity(metricResponse?.entityGuid);
			return {
				entityId: metricResponse?.entityGuid,
				occurrenceId: metricResponse?.traceId,
				remote: mappedEntity?.url
			} as GetObservabilityErrorGroupMetadataResponse;
		} catch (ex) {
			ContextLogger.error(ex, "getErrorGroupMetadata", {
				request: request
			});
		}
		return undefined;
	}

	@lspHandler(GetObservabilityErrorAssignmentsRequestType)
	@log({
		timed: true
	})
	async getObservabilityErrorAssignments(request: GetObservabilityErrorAssignmentsRequest) {
		const response: GetObservabilityErrorAssignmentsResponse = { items: [] };

		try {
			const { users } = SessionContainer.instance();
			const me = await users.getMe();

			const result = await this.getErrorsInboxAssignments(me.email);
			if (result) {
				response.items = result.actor.errorsInbox.errorGroups.results
					.filter(_ => {
						// dont show IGNORED or RESOLVED errors
						return !_.state || _.state === "UNRESOLVED";
					})
					.map((_: any) => {
						return {
							entityId: _.entityGuid,
							errorGroupGuid: _.id,
							errorClass: _.name,
							message: _.message,
							errorGroupUrl: _.url
						} as ObservabilityErrorCore;
					});

				if (response.items && response.items.find(_ => !_.errorClass)) {
					ContextLogger.warn("getObservabilityErrorAssignments has empties", {
						items: response.items
					});
				}
				ContextLogger.warn("getObservabilityErrorAssignments", {
					itemsCount: response.items.length
				});
			} else {
				ContextLogger.log("getObservabilityErrorAssignments (none)");
			}
		} catch (ex) {
			ContextLogger.warn("getObservabilityErrorAssignments", {
				error: ex
			});
		}

		return response;
	}

	@lspHandler(GetObservabilityReposRequestType)
	@log({
		timed: true
	})
	async getObservabilityRepos(request: GetObservabilityReposRequest) {
		const response: GetObservabilityReposResponse = { repos: [] };
		try {
			const { scm } = SessionContainer.instance();
			const reposResponse = await scm.getRepos({ inEditorOnly: true, includeRemotes: true });
			let filteredRepos: ReposScm[] | undefined = reposResponse?.repositories;
			if (request?.filters?.length) {
				const repoIds = request.filters.map(_ => _.repoId);
				filteredRepos = reposResponse.repositories?.filter(r => r.id && repoIds.includes(r.id))!;
			}

			filteredRepos = filteredRepos?.filter(_ => _.id);
			if (!filteredRepos || !filteredRepos.length) return response;

			for (const repo of filteredRepos) {
				if (!repo.id || !repo.remotes || !repo.remotes.length) {
					ContextLogger.warn(
						"getObservabilityRepos skipping repo with missing id and/or repo.remotes",
						{
							repo: repo
						}
					);
					continue;
				}
				const folderName = this.getRepoName(repo.folder);
				let remotes: string[] = [];
				for (const remote of repo.remotes) {
					if (remote.name === "origin" || remote.remoteWeight === 0) {
						// this is the origin remote
						remotes = [remote.uri.toString().replace("ssh://", "")];
						break;
					} else {
						remotes.push(remote.uri.toString());
					}
				}

				// find REPOSITORY entities tied to a remote
				const repositoryEntitiesResponse = await this.findRepositoryEntitiesByRepoRemotes(remotes);
				let remoteUrls: (string | undefined)[] = [];
				let hasRepoAssociation;
				let applicationAssociations;
				if (repositoryEntitiesResponse?.entities) {
					// find applications that are tied to repo entities
					const entitiesReponse = await this.findRelatedEntityByRepositoryGuids(
						repositoryEntitiesResponse?.entities?.map(_ => _.guid)
					);
					// find the application entities
					applicationAssociations = entitiesReponse?.actor?.entities?.filter(
						_ =>
							_.relatedEntities?.results?.filter(r => r.source?.entity?.type === "APPLICATION")
								.length
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
						})
					});
				}

				let remote = "";
				if (remoteUrls && remoteUrls[0]) {
					if (remoteUrls.length > 1) {
						// if for some reason we have > 1 (user has bad remotes, or remotes that point to other places WITH entity mappings)
						ContextLogger.warn("");
						ContextLogger.warn("getEntitiesByRepoRemote FOUND MORE THAN 1 UNIQUE REMOTE", {
							remotes: remotes,
							entityRemotes: remoteUrls
						});
						ContextLogger.warn("");
					}
					remote = remoteUrls[0];
				} else {
					remote = remotes[0];
				}

				const uniqueEntities: Entity[] = [];
				if (applicationAssociations && applicationAssociations.length) {
					for (const entity of applicationAssociations) {
						if (!entity.relatedEntities?.results) continue;

						for (const relatedResult of entity.relatedEntities.results) {
							if (
								relatedResult?.source?.entity?.type === "APPLICATION" &&
								relatedResult?.target?.entity?.type === "REPOSITORY"
							) {
								const tags = relatedResult.target.entity.tags;
								if (!tags) continue;

								const accountIdTag = tags.find(_ => _.key === "accountId");
								if (!accountIdTag || !accountIdTag.values) continue;

								const accountIdString = accountIdTag.values[0];

								uniqueEntities.push({
									account: {
										id: parseInt(accountIdString || "0", 10),
										name: tags.find(_ => _.key === "account")?.values[0] || "Account"
									},
									guid: relatedResult.source.entity.guid,
									name: relatedResult.source.entity.name
								});
							}
						}
					}
				}
				response.repos.push({
					repoId: repo.id!,
					repoName: folderName,
					repoRemote: remote,
					hasRepoAssociation: hasRepoAssociation,
					// @ts-ignore
					entityAccounts: uniqueEntities
						.map(entity => {
							return {
								accountId: entity.account?.id,
								accountName: entity.account?.name || "Account",
								entityGuid: entity.guid,
								entityName: entity.name
							} as EntityAccount;
						})
						.filter(Boolean)
						.sort((a, b) =>
							`${a.accountName}-${a.entityName}`.localeCompare(`${b.accountName}-${b.entityName}`)
						)
				});
				ContextLogger.log(`getObservabilityRepos hasRepoAssociation=${hasRepoAssociation}`, {
					repoId: repo.id,
					entities: repositoryEntitiesResponse?.entities?.map(_ => _.guid)
				});
			}
		} catch (ex) {
			ContextLogger.error(ex, "getObservabilityRepos");
		}

		return response;
	}

	@lspHandler(GetObservabilityErrorsRequestType)
	@log({
		timed: true
	})
	async getObservabilityErrors(request: GetObservabilityErrorsRequest) {
		const response: GetObservabilityErrorsResponse = { repos: [] };
		try {
			// NOTE: might be able to eliminate some of this if we can get a list of entities
			const { scm } = SessionContainer.instance();
			const reposResponse = await scm.getRepos({ inEditorOnly: true, includeRemotes: true });
			let filteredRepos: ReposScm[] | undefined = reposResponse?.repositories;
			let filteredRepoIds: string[] = [];
			if (request?.filters?.length) {
				filteredRepoIds = request.filters.map(_ => _.repoId);
				filteredRepos = reposResponse.repositories?.filter(
					r => r.id && filteredRepoIds.includes(r.id)
				)!;
			}
			filteredRepos = filteredRepos?.filter(_ => _.id);

			if (!filteredRepos || !filteredRepos.length) return response;

			for (const repo of filteredRepos) {
				if (!repo.remotes || !repo.id) continue;

				const observabilityErrors: ObservabilityError[] = [];
				// don't ask for NR error data if we don't have
				// an explicit want for this repo id
				if (filteredRepoIds.includes(repo.id)) {
					const remotes = repo.remotes.map(_ => {
						return (_ as any).uri!.toString();
					});

					const repositoryEntitiesResponse = await this.findRepositoryEntitiesByRepoRemotes(
						remotes
					);
					let gotoEnd = false;
					if (repositoryEntitiesResponse?.entities?.length) {
						const entityFilter = request.filters?.find(_ => _.repoId === repo.id!);
						for (const entity of repositoryEntitiesResponse.entities) {
							const accountIdTag = entity.tags?.find(_ => _.key === "accountId");
							if (!accountIdTag) {
								ContextLogger.warn("count not find accountId for repo entity", {
									entityGuid: entity.guid
								});
								continue;
							}

							const accountIdValue = parseInt(accountIdTag.values[0] || "0", 10);
							const urlTag = entity.tags?.find(_ => _.key === "url");
							const urlValue = urlTag?.values[0];

							const relatedEntities = await this.findRelatedEntityByRepositoryGuid(entity.guid);

							let builtFromApplications = relatedEntities.actor.entity.relatedEntities.results.filter(
								r => r.type === "BUILT_FROM"
							);
							if (entityFilter && entityFilter.entityGuid) {
								builtFromApplications = builtFromApplications.filter(
									_ => _.source?.entity.guid === entityFilter.entityGuid
								);
							}
							for (const application of builtFromApplications) {
								if (!application.source.entity.guid) continue;

								const response = await this.findFingerprintedErrorTraces(
									accountIdValue,
									application.source.entity.guid
								);
								if (response.actor.account.nrql.results) {
									const errorTraces = response.actor.account.nrql.results;
									for (const errorTrace of errorTraces) {
										try {
											const response = await this.getErrorGroupFromNameMessageEntity(
												errorTrace.errorClass,
												errorTrace.message,
												errorTrace.entityGuid
											);

											if (response && response.actor.errorsInbox.errorGroup) {
												observabilityErrors.push({
													entityId: errorTrace.entityGuid,
													appName: errorTrace.appName,
													errorClass: errorTrace.errorClass,
													message: errorTrace.message,
													remote: urlValue!,
													errorGroupGuid: response.actor.errorsInbox.errorGroup.id,
													occurrenceId: errorTrace.occurrenceId,
													count: errorTrace.length,
													lastOccurrence: errorTrace.lastOccurrence,
													errorGroupUrl: response.actor.errorsInbox.errorGroup.url
												});
												if (observabilityErrors.length > 4) {
													gotoEnd = true;
													break;
												}
											}
										} catch (ex) {
											ContextLogger.warn("internal error getErrorGroupGuid", {
												ex: ex
											});
										}
									}

									if (gotoEnd) {
										break;
									}
								}
							}

							if (gotoEnd) {
								break;
							}
						}
					}
				}
				response.repos.push({
					repoId: repo.id!,
					repoName: this.getRepoName(repo.folder),
					errors: observabilityErrors!
				});
			}
		} catch (ex) {
			ContextLogger.error(ex, "getObservabilityErrors");
		}
		return response as any;
	}

	@log()
	async getPixieToken(accountId: number) {
		try {
			const response = await this.query(
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
					accountId: accountId
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

	@lspHandler(GetNewRelicAccountsRequestType)
	@log()
	async getAccounts(): Promise<GetNewRelicAccountsResponse> {
		try {
			const response = await this.query<{
				actor: {
					accounts: { id: number; name: string }[];
				};
			}>(`{
				actor {
					accounts {
						id,
						name
					}
				}
			}`);
			return response.actor;
		} catch (e) {
			ContextLogger.error(e, "getAccounts");
			throw e;
		}
	}

	@lspHandler(GetNewRelicErrorGroupRequestType)
	@log()
	async getNewRelicErrorGroupData(
		request: GetNewRelicErrorGroupRequest
	): Promise<GetNewRelicErrorGroupResponse | undefined> {
		let errorGroup: NewRelicErrorGroup | undefined = undefined;
		let accountId = 0;
		let entityGuid = "";
		try {
			const errorGroupGuid = request.errorGroupGuid;
			const parsedId = NewRelicProvider.parseId(errorGroupGuid)!;
			accountId = parsedId?.accountId;

			let errorGroupFullResponse;

			if (request.entityGuid) {
				entityGuid = request.entityGuid;
				// if we have the entityId use this
				errorGroupFullResponse = await this.fetchErrorGroup(
					accountId,
					errorGroupGuid,
					entityGuid,
					request.occurrenceId,
					request.timestamp
				);
			} else {
				// no entity, look it up
				const errorGroupPartialResponse = await this.fetchErrorGroupById(
					errorGroupGuid,
					request.timestamp
				);
				if (errorGroupPartialResponse?.entityGuid) {
					entityGuid = errorGroupPartialResponse?.entityGuid;
					errorGroupFullResponse = await this.fetchErrorGroup(
						accountId,
						errorGroupGuid,
						entityGuid,
						request.occurrenceId,
						request.timestamp
					);
				}
			}

			ContextLogger.log(
				`getNewRelicErrorGroupData hasRequest.entityGuid=${request.entityGuid != null}`,
				{
					request: request
				}
			);

			if (errorGroupFullResponse?.actor?.errorsInbox?.errorGroups?.results?.length) {
				const errorGroupResponse = errorGroupFullResponse.actor.errorsInbox.errorGroups.results[0];
				entityGuid = errorGroupResponse.entityGuid;
				errorGroup = {
					entity: {},
					accountId: accountId,
					entityGuid: entityGuid,
					guid: errorGroupResponse.id,
					title: errorGroupResponse.name,
					message: errorGroupResponse.message,

					errorGroupUrl: `${this.productUrl}/redirect/errors-inbox/${errorGroupGuid}`,
					entityUrl: `${this.productUrl}/redirect/entity/${errorGroupResponse.entityGuid}`
				};

				if (errorGroupFullResponse.actor?.entity?.exception?.stackTrace) {
					errorGroup.errorTrace = {
						path: errorGroupFullResponse.actor.entity.name,
						stackTrace: errorGroupFullResponse.actor.entity.crash
							? errorGroupFullResponse.actor.entity.crash.stackTrace.frames
							: errorGroupFullResponse.actor.entity.exception.stackTrace.frames
					};
					errorGroup.hasStackTrace = true;
				}

				errorGroup.attributes = {
					// TODO fix me
					// Timestamp: { type: "timestamp", value: errorGroup.timestamp }
					// "Host display name": { type: "string", value: "11.11.11.11:11111" },
					// "URL host": { type: "string", value: "value" },
					// "URL path": { type: "string", value: "value" }
				};
				if (!errorGroup.hasStackTrace) {
					errorGroup.attributes["Account"] = {
						type: "string",
						value: errorGroupFullResponse.actor.account.name
					};
					errorGroup.attributes["Entity"] = {
						type: "string",
						value: errorGroupFullResponse.actor.entity.name
					};
				}

				let states;
				if (errorGroupFullResponse.actor.errorsInbox.errorGroupStateTypes) {
					states = errorGroupFullResponse.actor.errorsInbox.errorGroupStateTypes.map(
						(_: ErrorGroupStateType) => _.type
					);
				}
				errorGroup.states =
					states && states.length ? states : ["UNRESOLVED", "RESOLVED", "IGNORED"];
				errorGroup.errorGroupUrl = errorGroupResponse.url;
				errorGroup.entityName = errorGroupFullResponse.actor.entity.name;
				errorGroup.entityAlertingSeverity = errorGroupFullResponse.actor.entity.alertSeverity;
				errorGroup.state = errorGroupResponse.state || "UNRESOLVED";

				const assignee = errorGroupResponse.assignment;
				if (assignee) {
					errorGroup.assignee = {
						email: assignee.email,
						id: assignee.userInfo?.id,
						name: assignee.userInfo?.name,
						gravatar: assignee.userInfo?.gravatar
					};
				}

				const builtFromResult = this.findBuiltFrom(
					errorGroupFullResponse.actor.entity.relatedEntities.results
				);
				if (errorGroup.entity && builtFromResult) {
					if (builtFromResult.error) {
						errorGroup.entity.relationship = {
							error: builtFromResult.error
						};
					} else {
						errorGroup.entity = {
							repo: {
								name: builtFromResult.name!,
								urls: [builtFromResult.url!]
							}
						};
					}
				}

				ContextLogger.log("ErrorGroup found", {
					errorGroupGuid: errorGroup.guid,
					occurrenceId: request.occurrenceId,
					entityGuid: entityGuid,
					hasErrorGroup: errorGroup != null,
					hasStackTrace: errorGroup?.hasStackTrace === true
				});
			} else {
				ContextLogger.warn(
					`No errorGroup results errorGroupGuid (${errorGroupGuid}) in account (${accountId})`,
					{
						request: request,
						entityGuid: entityGuid,
						accountId: accountId
					}
				);
				return {
					accountId: accountId,
					error: {
						message: `Could not find error info for that errorGroupGuid in account (${accountId})`,
						details: (await this.buildErrorDetailSettings(
							accountId,
							entityGuid,
							errorGroupGuid
						)) as any
					}
				};
			}

			return {
				accountId,
				errorGroup
			};
		} catch (ex) {
			ContextLogger.error(ex);

			let result: any = {};
			if (ex.response?.errors) {
				result = {
					message: ex.response.errors.map((_: { message: string }) => _.message).join("\n")
				};
			} else {
				result = { message: ex.message ? ex.message : ex.toString() };
			}

			result.details = (await this.buildErrorDetailSettings(
				accountId,
				entityGuid,
				request.errorGroupGuid
			)) as any;

			return {
				error: result,
				accountId,
				errorGroup: undefined as any
			};
		}
	}

	@lspHandler(GetNewRelicAssigneesRequestType)
	@log()
	async getAssignableUsers(request: { boardId: string }) {
		const { scm } = SessionContainer.instance();
		const committers = await scm.getLatestCommittersAllRepos();
		let users: any[] = [];
		if (committers?.scm) {
			users = users.concat(
				Object.keys(committers.scm).map((_: string) => {
					return {
						id: _,
						email: _,
						group: "GIT"
					};
				})
			);
		}

		// TODO fix me get users from NR

		// users.push({
		// 	id: "123",
		// 	displayName: "Some One",
		// 	email: "someone@newrelic.com",
		// 	avatarUrl: "http://...",
		// 	group: "NR"
		// });

		return {
			users: users
		};
	}

	@log()
	async setAssignee(request: {
		errorGroupGuid: string;
		emailAddress: string;
	}): Promise<Directives | undefined> {
		try {
			const response = await this.setAssigneeByEmail(request!);
			const assignment = response.errorsInboxAssignErrorGroup.assignment;
			// won't be a userInfo object if assigning by email

			return {
				directives: [
					{
						type: "setAssignee",
						data: {
							assignee: {
								email: assignment.email,
								id: assignment?.userInfo?.id,
								name: assignment?.userInfo?.name
							}
						}
					}
				]
			};
		} catch (ex) {
			ContextLogger.error(ex);
			return undefined;
		}
	}

	@log()
	async removeAssignee(request: {
		errorGroupGuid: string;
		emailAddress?: string;
		userId?: string;
	}): Promise<Directives | undefined> {
		try {
			await this.setAssigneeByUserId({ ...request, userId: "0" });

			return {
				directives: [
					{
						type: "removeAssignee",
						data: {
							assignee: null
						}
					}
				]
			};
		} catch (ex) {
			ContextLogger.error(ex);
			return undefined;
		}
	}

	@log()
	async setState(request: {
		errorGroupGuid: string;
		state: "RESOLVED" | "UNRESOLVED" | "IGNORED";
	}): Promise<Directives | undefined> {
		try {
			const response = await this.mutate<{
				errorTrackingUpdateErrorGroupState: {
					errors?: { description: string }[];
					state?: string;
				};
			}>(
				`mutation UpdateErrorGroupState($errorGroupGuid: ID!, $state: ErrorsInboxErrorGroupState!) {
					errorsInboxUpdateErrorGroupState(id: $errorGroupGuid, state: $state) {
					  state
					  errors {
						description
						type
					  }
					}
				  }
				  `,
				{
					errorGroupGuid: request.errorGroupGuid,
					state: request.state
				}
			);

			ContextLogger.log("errorsInboxUpdateErrorGroupState", {
				request: request,
				response: response
			});

			if (response?.errorTrackingUpdateErrorGroupState?.errors?.length) {
				const stateFailure = response.errorTrackingUpdateErrorGroupState.errors
					.map(_ => _.description)
					.join("\n");
				ContextLogger.warn("errorsInboxUpdateErrorGroupState failure", {
					error: stateFailure
				});
				throw new Error(stateFailure);
			}

			return {
				directives: [
					{
						type: "setState",
						data: {
							state: request.state
						}
					}
				]
			};
		} catch (ex) {
			ContextLogger.error(ex as Error);
			throw ex;
		}
	}

	@log()
	async assignRepository(request: {
		/** this is a field that can be parsed to get an accountId */
		parseableAccountId: string;
		/** url from the remote */
		url: string;
		/** entity (application) that is attached to this repo */
		entityId: string;
		/** name of the repo */
		name: string;
		/** we don't always have an errorGroupId */
		errorGroupGuid?: string;
	}): Promise<Directives | undefined> {
		try {
			const parsedId = NewRelicProvider.parseId(request.parseableAccountId)!;
			const accountId = parsedId?.accountId;
			const name = request.name;

			let url = request.url;
			if (request.url.indexOf("git@") === 0) {
				ContextLogger.log(`prepending ssh:// to ${request.url}`);
				url = `ssh://${url}`;
			}

			const response = await this.mutate<{
				referenceEntityCreateOrUpdateRepository: {
					created: string[];
					updated: string[];
					failures: {
						guid: string;
						message: string;
						type: string;
					}[];
				};
			}>(
				`mutation ReferenceEntityCreateOrUpdateRepository($accountId: Int!, $name: String!, $url: String!) {
					referenceEntityCreateOrUpdateRepository(repositories: [{accountId: $accountId, name: $name, url: $url}]) {
					  created
					  updated
					  failures {
						guid
						message
						type
					  }
					}
				  }
			  `,
				{
					accountId: accountId,
					name: name,
					url: url
				}
			);
			ContextLogger.log("referenceEntityCreateOrUpdateRepository", {
				accountId: accountId,
				name: name,
				url: request.url,
				urlModified: url,
				response: response
			});

			if (response?.referenceEntityCreateOrUpdateRepository?.failures?.length) {
				const failures = response.referenceEntityCreateOrUpdateRepository.failures
					.map(_ => `${_.message} (${_.type})`)
					.join("\n");
				ContextLogger.warn("referenceEntityCreateOrUpdateRepository failures", {
					accountId: accountId,
					name: name,
					url: request.url,
					failures: failures
				});
				throw new Error(failures);
			}

			const repoEntityId =
				response.referenceEntityCreateOrUpdateRepository.updated[0] ||
				response.referenceEntityCreateOrUpdateRepository.created[0];
			const entityId =
				request.entityId || (await this.fetchErrorGroupById(request.errorGroupGuid!))?.entityGuid;
			if (entityId) {
				const entityRelationshipUserDefinedCreateOrReplaceResponse = await this.mutate<{
					errors?: { message: string }[];
				}>(
					`mutation EntityRelationshipUserDefinedCreateOrReplace($sourceEntityGuid:EntityGuid!, $targetEntityGuid:EntityGuid!) {
						entityRelationshipUserDefinedCreateOrReplace(sourceEntityGuid: $sourceEntityGuid, targetEntityGuid: $targetEntityGuid, type: BUILT_FROM) {
						  errors {
							message
							type
						  }
						}
					  }
				  `,
					{
						sourceEntityGuid: entityId,
						targetEntityGuid: repoEntityId
					}
				);
				ContextLogger.log("entityRelationshipUserDefinedCreateOrReplace", {
					sourceEntityGuid: entityId,
					targetEntityGuid: repoEntityId,
					response: entityRelationshipUserDefinedCreateOrReplaceResponse
				});

				if (entityRelationshipUserDefinedCreateOrReplaceResponse?.errors?.length) {
					const createOrReplaceError = entityRelationshipUserDefinedCreateOrReplaceResponse.errors
						.map(_ => _.message)
						.join("\n");
					ContextLogger.warn("entityRelationshipUserDefinedCreateOrReplace failure", {
						error: createOrReplaceError
					});
					throw new Error(createOrReplaceError);
				}

				return {
					directives: [
						{
							type: "assignRepository",
							data: {
								id: request.errorGroupGuid,
								entityGuid: entityId,
								repositoryEntityGuid:
									response.referenceEntityCreateOrUpdateRepository &&
									response.referenceEntityCreateOrUpdateRepository.created
										? response.referenceEntityCreateOrUpdateRepository.created[0]
										: undefined,
								repo: {
									accountId: accountId,
									name: request.name,
									urls: [request.url]
								}
							}
						}
					]
				};
			} else {
				ContextLogger.warn(
					"entityId needed for entityRelationshipUserDefinedCreateOrReplace is null"
				);
				throw new Error("Could not locate entityId");
			}
		} catch (ex) {
			ContextLogger.error(ex, "assignRepository", {
				request: request
			});
			throw ex;
		}
	}

	async getMethodThroughput(request: GetMethodLevelTelemetryRequest) {
		const innerQuery = `SELECT rate(count(newrelic.timeslice.value), 1 minute) AS 'requestsPerMinute' FROM Metric WHERE \`entity.guid\` = '${request.newRelicEntityGuid}' AND metricTimesliceName LIKE 'Function/${request.codeNamespace}%' FACET metricTimesliceName SINCE 5 Days AGO LIMIT 100`;

		const query = `query GetMethodThroughput($accountId:Int!) {
	actor {
		account(id: $accountId) {
			nrql(query: "${innerQuery}") { 						
				results
				metadata {
					timeWindow {
						begin
						end					   
					}
				}					
			}
		}
	}
}`;

		try {
			return this.query(query, {
				accountId: request.newRelicAccountId!
			});
		} catch (ex) {
			Logger.error(ex, "getMethodThroughput", {
				request
			});
		}
		return undefined;
	}

	async getMethodAverageDuration(request: GetMethodLevelTelemetryRequest) {
		const innerQuery = `SELECT average(apm.service.transaction.duration) AS 'averageDuration' FROM Metric WHERE \`entity.guid\` = '${request.newRelicEntityGuid}' AND metricTimesliceName LIKE '%Function/${request.codeNamespace}%' FACET metricTimesliceName SINCE 5 Days AGO LIMIT 100`;
		const query = `query GetMethodAverageDuration($accountId:Int!) {
	actor {
		account(id: $accountId) {
			nrql(query: "${innerQuery}") { 						
				results
				metadata {
					timeWindow {
						begin
						end					   
					}
				}					
			}
		}
	}
}`;
		try {
			return this.query(query, {
				accountId: request.newRelicAccountId!
			});
		} catch (ex) {
			Logger.error(ex, "getMethodAverageDuration", {
				request
			});
		}
		return undefined;
	}

	async getMethodErrorRate(request: GetMethodLevelTelemetryRequest) {
		const innerQuery = `SELECT rate(count(apm.service.transaction.error.count), 1 minute) AS \`errorsPerMinute\` FROM Metric WHERE \`entity.guid\` = '${request.newRelicEntityGuid}' AND metricTimesliceName LIKE 'Errors%' FACET metricTimesliceName SINCE 5 Days AGO LIMIT 100`;

		const query = `query GetMethodErrorRate($accountId:Int!) {
			actor {
				account(id: $accountId) {
					nrql(query: "${innerQuery}") { 						
						results
						metadata {
							timeWindow {
								begin
								end					   
							}
						}					
					}
				}
			}
	  }`;
		try {
			return this.query(query, {
				accountId: request.newRelicAccountId!
			});
		} catch (ex) {
			Logger.error(ex, "getMethodErrorRate", { request });
		}
		return undefined;
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

	private _languageSupport = new Set<string>(["python"]);

	@lspHandler(GetMethodLevelTelemetryRequestType)
	@log()
	async getMethodLevelTelemetry(
		request: GetMethodLevelTelemetryRequest
	): Promise<GetMethodLevelTelemetryResponse | undefined> {
		if (!request.filePath || !request.languageId) {
			return undefined;
		}

		if (!this._languageSupport.has(request.languageId)) return undefined;

		const { git } = SessionContainer.instance();
		const repoForFile = await git.getRepositoryByFilePath(request.filePath);
		if (!repoForFile?.id) return undefined;

		const observabilityRepos = await this.getObservabilityRepos({
			filters: [{ repoId: repoForFile.id }]
		});
		if (!observabilityRepos?.repos?.length) return undefined;

		const repo = observabilityRepos.repos.find(_ => _.repoId === repoForFile.id);
		if (!repo) return undefined;

		if (!repo.hasRepoAssociation) {
			Logger.warn("Missing repo association", {
				repo: repo
			});
			return undefined;
		}

		const entityLength = repo.entityAccounts.length;

		if (!entityLength) {
			Logger.warn("Missing entities", {
				repo: repo
			});
			return undefined;
		}
		let entity;
		if (entityLength > 1) {
			Logger.warn("More than one NR entity, selecting first", {
				entity: repo.entityAccounts[0]
			});
		}

		entity = repo.entityAccounts[0];

		if (request.languageId === "python") {
			request.codeNamespace = this.getPythonNamespacePackage(request.filePath);
			if (!request.codeNamespace) {
				return undefined;
			}
		}
		request.newRelicAccountId = entity.accountId;
		request.newRelicEntityGuid = entity.entityGuid;
		let entityName = entity.entityName;

		try {
			request.options = request.options || {};
			let [throughputResponse, averageDurationResponse, errorRateResponse] = await Promise.all([
				request.options.includeThroughput ? this.getMethodThroughput(request) : undefined,
				request.options.includeAverageDuration ? this.getMethodAverageDuration(request) : undefined,
				request.options.includeErrorRate ? this.getMethodErrorRate(request) : undefined
			]);

			const addFunctionName = (arr: { metricTimesliceName: string }[]) => {
				return arr.map((_: any) => {
					const indexOfColon = _.metricTimesliceName ? _.metricTimesliceName.indexOf(":") : -1;
					return {
						..._,
						function: indexOfColon > -1 ? _.metricTimesliceName.slice(indexOfColon + 1) : undefined
					};
				});
			};

			if (throughputResponse) {
				throughputResponse.actor.account.nrql.results = addFunctionName(
					throughputResponse.actor.account.nrql.results
				);
			}

			if (averageDurationResponse) {
				averageDurationResponse.actor.account.nrql.results = addFunctionName(
					averageDurationResponse.actor.account.nrql.results
				);
			}

			if (errorRateResponse) {
				errorRateResponse.actor.account.nrql.results = addFunctionName(
					errorRateResponse.actor.account.nrql.results
				);
			}

			const begin =
				throughputResponse?.actor?.account?.nrql?.metadata?.timeWindow?.begin ||
				averageDurationResponse?.actor?.account?.nrql?.metadata?.timeWindow?.begin ||
				errorRateResponse?.actor?.account?.nrql?.metadata?.timeWindow?.begin;

			return {
				throughput: throughputResponse ? throughputResponse.actor.account.nrql.results : [],
				averageDuration: averageDurationResponse
					? averageDurationResponse.actor.account.nrql.results
					: [],
				errorRate: errorRateResponse.actor.account.nrql.results || [],
				sinceDateFormatted: begin ? Dates.toFormatter(new Date(begin)).fromNow() : "",
				lastUpdateDate:
					errorRateResponse?.actor?.account?.nrql?.metadata?.timeWindow?.end ||
					averageDurationResponse?.actor?.account?.nrql?.metadata?.timeWindow?.end ||
					throughputResponse?.actor?.account?.nrql?.metadata?.timeWindow?.end,
				hasAnyData:
					throughputResponse?.actor?.account?.nrql?.results.length ||
					averageDurationResponse?.actor?.account?.nrql?.results.length ||
					errorRateResponse?.actor?.account?.nrql?.results.length,
				newRelicAccountId: request.newRelicAccountId,
				newRelicEntityGuid: request.newRelicEntityGuid,
				newRelicEntityName: entityName
			};
		} catch (ex) {
			Logger.error(ex, "getMethodLevelTelemetry", {
				request
			});
		}

		return undefined;
	}

	@log()
	private async getUserId(): Promise<number | undefined> {
		try {
			if (this._newRelicUserId != null) {
				return this._newRelicUserId;
			}

			if (this._providerInfo && this._providerInfo.data && this._providerInfo.data.userId) {
				try {
					const id = this._providerInfo.data.userId;
					this._newRelicUserId = parseInt(id.toString(), 10);
					ContextLogger.log("getUserId (found data)", {
						userId: id
					});
				} catch (ex) {
					ContextLogger.warn("getUserId", {
						error: ex
					});
				}
			}
			if (this._newRelicUserId) return this._newRelicUserId;

			const response = await this.query(`{ actor { user { id } } }`);
			const id = response.actor?.user?.id;
			if (id) {
				this._newRelicUserId = parseInt(id, 10);
				ContextLogger.log("getUserId (found api)", {
					userId: id
				});
				return this._newRelicUserId;
			}
		} catch (ex) {
			ContextLogger.warn("getUserId " + ex.message, {
				error: ex
			});
		}
		return undefined;
	}

	private async fetchErrorGroupById(
		errorGroupGuid: string,
		timestamp?: number
	): Promise<ErrorGroup | undefined> {
		try {
			const timestampRange = this.generateTimestampRange(timestamp);
			const response = await this.query<{
				actor: {
					errorsInbox: {
						errorGroups: {
							results: ErrorGroup[];
						};
					};
				};
			}>(
				`query errorGroupById($ids: [ID!]) {
					actor {
					  errorsInbox {
						errorGroups(filter: {ids: $ids}${
							timestampRange
								? `, timeWindow: {startTime: ${timestampRange.startTime}, endTime: ${timestampRange.endTime}}`
								: ""
						}) {
						  results {
							id
							message
							name
							state
							entityGuid
							eventsQuery
						  }
						}
					  }
					}
				  }`,
				{
					ids: [errorGroupGuid]
				}
			);
			return response?.actor?.errorsInbox?.errorGroups?.results[0] || undefined;
		} catch (ex) {
			ContextLogger.warn("fetchErrorGroupDataById failure", {
				errorGroupGuid
			});
			const accessTokenError = ex as {
				message: string;
				innerError?: { message: string };
				isAccessTokenError: boolean;
			};
			if (accessTokenError && accessTokenError.innerError && accessTokenError.isAccessTokenError) {
				throw new Error(accessTokenError.message);
			}
		}

		return undefined;
	}

	@log()
	private async fetchStackTrace(
		entityGuid: string,
		occurrenceId: string
	): Promise<StackTraceResponse> {
		let fingerprintId = 0;
		try {
			// BrowserApplicationEntity uses a fingerprint instead of an occurrence and it's a number
			if (occurrenceId && occurrenceId.match(/^-?\d+$/)) {
				fingerprintId = parseInt(occurrenceId, 10);
				occurrenceId = "";
			}
		} catch {}
		return this.query(
			`query getStackTrace($entityGuid: EntityGuid!, $occurrenceId: String!, $fingerprintId: Int!) {
			actor {
			  entity(guid: $entityGuid) {
				... on ApmApplicationEntity {
				  guid
				  name
				  type
				  entityType
				  exception(occurrenceId: $occurrenceId) {
					message
					stackTrace {
					  frames {
						filepath
						formatted
						line
						name
					  }
					}
				  }
				}
				... on BrowserApplicationEntity {
				  guid
				  name
				  type
				  entityType
				  exception(fingerprint: $fingerprintId) {
					message
					stackTrace {
					  frames {
						column
						line
						formatted
						name
					  }
					}
				  }
				}
				... on MobileApplicationEntity {
				  guid
				  name
				  type
				  entityType
				  exception(occurrenceId: $occurrenceId) {
					stackTrace {
					  frames {
						filepath						
						formatted
						line
						name
					  }
					}
				  }
				  crash(occurrenceId: $occurrenceId) {
					stackTrace {
					  frames {
						filepath						
						formatted
						line
						name
					  }
					}
				  }
				}
			  }
			}
		  }
		  `,
			{
				entityGuid: entityGuid,
				occurrenceId: occurrenceId,
				fingerprintId: fingerprintId
			}
		);
	}

	@log()
	private async _fetchErrorGroup(
		accountId: number,
		errorGroupGuid: string,
		entityGuid: string,
		timestamp?: number
	): Promise<ErrorGroupResponse> {
		const timestampRange = this.generateTimestampRange(timestamp);
		const q = `query getErrorGroup($accountId: Int!, $errorGroupGuids: [ID!], $entityGuid: EntityGuid!) {
			actor {
			  account(id: $accountId) {
			    name
			  }
			  entity(guid: $entityGuid) {
				alertSeverity
				name
				relatedEntities(filter: {direction: BOTH, relationshipTypes: {include: BUILT_FROM}}) {
				  results {
					source {
					  entity {
						name
						guid
						type
					  }
					}
					target {
					  entity {
						name
						guid
						type
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
			  errorsInbox {
				errorGroupStateTypes {
				  type
				}
				errorGroups(filter: {ids: $errorGroupGuids} ${
					timestampRange
						? `, timeWindow: {startTime: ${timestampRange.startTime}, endTime: ${timestampRange.endTime}}`
						: ""
				}) {
				  results {
					url
					id
					message
					name
					state
					entityGuid
					assignment {
					  email
					  userInfo {
						gravatar
						id
						name
					  }
					}
					state
				  }
				}
			  }
			}
		  }`;

		return this.query(q, {
			accountId: accountId,
			errorGroupGuids: [errorGroupGuid],
			entityGuid: entityGuid
		});
	}

	@log()
	private async fetchErrorGroup(
		accountId: number,
		errorGroupGuid: string,
		entityGuid: string,
		occurrenceId?: string,
		timestamp?: number
	): Promise<ErrorGroupResponse> {
		let stackTracePromise;
		if (entityGuid && occurrenceId) {
			try {
				// kick this off
				stackTracePromise = this.fetchStackTrace(entityGuid, occurrenceId);
			} catch (ex) {
				ContextLogger.warn("fetchErrorGroup (stack trace missing)", {
					entityGuid: entityGuid,
					occurrenceId: occurrenceId
				});
				stackTracePromise = undefined;
			}
		}

		let response: ErrorGroupResponse = await this._fetchErrorGroup(
			accountId,
			errorGroupGuid,
			entityGuid,
			timestamp
		);
		if (response?.actor?.errorsInbox?.errorGroups?.results?.length === 0) {
			ContextLogger.warn("fetchErrorGroup (retrying without timestamp)", {
				entityGuid: entityGuid,
				occurrenceId: occurrenceId
			});
			response = await this._fetchErrorGroup(accountId, errorGroupGuid, entityGuid);
		}

		let stackTrace;
		try {
			stackTrace = await stackTracePromise;
			if (stackTrace && occurrenceId && response?.actor?.entity) {
				if (response.actor.entity) {
					response.actor.entity.crash = this.tryFormatStack(
						stackTrace.actor.entity.entityType,
						stackTrace.actor.entity.crash
					);
					response.actor.entity.exception = this.tryFormatStack(
						stackTrace.actor.entity.entityType,
						stackTrace.actor.entity.exception
					);
				}
			}
		} catch (ex) {
			ContextLogger.warn("fetchErrorGroup (stack trace missing upon waiting)", {
				entityGuid: entityGuid,
				occurrenceId: occurrenceId
			});
		}

		return response;
	}

	tryFormatStack(entityType: string, exceptionLike: CrashOrException | undefined) {
		const mobileApplicationType = "MOBILE_APPLICATION_ENTITY";
		if (entityType !== mobileApplicationType || !exceptionLike) return exceptionLike;

		try {
			const len = Math.min(exceptionLike.stackTrace.frames.length, 10);
			let fixCount = 0;

			/** if the frame has a formatted property, but it isn't actually formatted
			 * with the filepath and line number, we attempt to make it so  */
			for (let i = 0; i < len; i++) {
				const frame = exceptionLike.stackTrace.frames[i];
				if (
					frame.formatted &&
					frame.line &&
					frame.formatted.indexOf(frame.line.toString()) === -1 &&
					frame.filepath &&
					frame.formatted.indexOf(frame.filepath) === -1
				) {
					fixCount++;
				}
			}

			// if more than a quarter of the frames we checked have an issue
			if (fixCount >= Math.round(len * 0.25)) {
				Logger.log(`fixing ${mobileApplicationType}`);
				for (const frame of exceptionLike.stackTrace.frames) {
					// there have been line numbers like "-2" ;(
					if (frame.filepath && frame.line && frame.line > 0) {
						frame.formatted = `${frame.formatted || ""}(${frame.filepath}:${frame.line})`;
					}
				}
			}
		} catch (ex) {
			Logger.error(ex, "tryFormatStack");
		}

		return exceptionLike;
	}

	private async buildErrorDetailSettings(
		accountId: number,
		entityGuid: string,
		errorGroupGuid: string
	) {
		let meUser = undefined;
		const { users, session } = SessionContainer.instance();
		try {
			meUser = await users.getMe();
		} catch {}
		if (
			meUser &&
			(meUser.email.indexOf("@newrelic.com") > -1 || meUser.email.indexOf("@codestream.com") > -1)
		) {
			return {
				settings: {
					accountId: accountId,
					errorGroupGuid: errorGroupGuid,
					entityGuid: entityGuid,
					codeStreamUserId: meUser?.id,
					codeStreamTeamId: session?.teamId,
					apiUrl: this.apiUrl
				}
			};
		}
		return undefined;
	}

	private async buildRepoRemoteVariants(remotes: string[]): Promise<string[]> {
		const set = new Set<string>();

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
	 * Finds any Repositories mapped to a remote[s]
	 *
	 * @private
	 * @param {string[]} remotes
	 * @return {*}  {(Promise<
	 * 		| {
	 * 				entities?: {
	 * 					guid: string;
	 * 					name: String;
	 * 					tags: { key: string; values: string[] }[];
	 * 				}[];
	 * 				remotes?: string[];
	 * 		  }
	 * 		| undefined
	 * 	>)}
	 * @memberof NewRelicProvider
	 */
	private async findRepositoryEntitiesByRepoRemotes(
		remotes: string[]
	): Promise<
		| {
				entities?: Entity[];
				remotes?: string[];
		  }
		| undefined
	> {
		try {
			const remoteVariants: string[] = await this._memoizedBuildRepoRemoteVariants(remotes);
			if (!remoteVariants.length) return undefined;

			const remoteFilters = remoteVariants.map((_: string) => `tags.url = '${_}'`).join(" OR ");

			const queryResponse = await this.query<EntitySearchResponse>(`{
			actor {
			  entitySearch(query: "type = 'REPOSITORY' and (${remoteFilters})") {
				count
				query
				results {
				  entities {
					guid
					name
					tags {
					  key
					  values
					}
				  }
				}
			  }
			}
		  }
		  `);
			return {
				entities: queryResponse.actor.entitySearch.results.entities,
				remotes: remoteVariants
			};
		} catch (ex) {
			ContextLogger.warn("getEntitiesByRepoRemote", {
				error: ex
			});
			return undefined;
		}
	}

	/**
	 * Find a list of error traces grouped by fingerprint
	 *
	 * @param accountId the NR1 account id to query against
	 * @param applicationGuid the entityGuid for the application to query for
	 * @returns list of most recent error traces for each unique fingerprint
	 */
	@log({ timed: true })
	private async findFingerprintedErrorTraces(accountId: number, applicationGuid: string) {
		const nrql = [
			"SELECT",
			"latest(timestamp) AS 'lastOccurrence',", // first field is used to sort with FACET
			"latest(id) AS 'occurrenceId',",
			"latest(appName) AS 'appName',",
			"latest(error.class) AS 'errorClass',",
			"latest(message) AS 'message',",
			"latest(entityGuid) AS 'entityGuid',",
			"count(id) AS 'length'",
			"FROM ErrorTrace",
			`WHERE fingerprint IS NOT NULL and entityGuid='${applicationGuid}'`,
			"FACET fingerprint AS 'fingerPrintId'", // group the results by fingerprint
			"SINCE 3 days ago",
			"LIMIT MAX"
		].join(" ");
		return this.query(
			`query fetchErrorsInboxFacetedData($accountId:Int!) {
				actor {
				  account(id: $accountId) {
					nrql(query: "${nrql}") { nrql results }
				  }
				}
			  }
			  `,
			{
				accountId: accountId
			}
		);
	}

	private async findRelatedEntityByRepositoryGuids(
		repositoryGuids: string[]
	): Promise<{
		actor: {
			entities: {
				relatedEntities: {
					results: RelatedEntity[];
				};
			}[];
		};
	}> {
		return this.query(
			`query fetchRelatedEntities($guids:[EntityGuid]!){
			actor {
			  entities(guids: $guids) {
				relatedEntities(filter: {direction: BOTH, relationshipTypes: {include: BUILT_FROM}}) {
				  results {
					source {
					  entity {
						name
						guid
						type
					  }
					}
					target {
					  entity {
						name
						guid
						type
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
				guids: repositoryGuids
			}
		);
	}

	@log({ timed: true })
	private async findRelatedEntityByRepositoryGuid(
		repositoryGuid: string
	): Promise<{
		actor: {
			entity: {
				relatedEntities: {
					results: RelatedEntity[];
				};
			};
		};
	}> {
		return this.query(
			`query fetchRelatedEntities($guid:EntityGuid!){
			actor {
			  entity(guid: $guid) {
				relatedEntities(filter: {direction: BOTH, relationshipTypes: {include: BUILT_FROM}}) {
				  results {
					source {
					  entity {
						name
						guid
						type
					  }
					}
					target {
					  entity {
						name
						guid
						type
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
				guid: repositoryGuid
			}
		);
	}

	@log({ timed: true })
	private async getErrorGroupFromNameMessageEntity(
		name: string,
		message: string,
		entityGuid: string
	) {
		return this.query(
			`query getErrorGroupGuid($name: String!, $message:String!, $entityGuid:EntityGuid!) {
			actor {
			  errorsInbox {
				errorGroup(errorEvent: {name: $name,
				  message: $message,
				  entityGuid: $entityGuid}) {
				  id
				  url
				}
			  }
			}
		  }`,
			{
				name: name,
				message: message,
				entityGuid: entityGuid
			}
		);
	}

	@log({ timed: true })
	private async getErrorsInboxAssignments(
		emailAddress: string,
		userId?: number
	): Promise<ErrorGroupsResponse | undefined> {
		try {
			if (userId == null || userId === 0) {
				// TODO fix me. remove this once we have a userId on a connection
				userId = await this.getUserId();
			}
			return this.query(
				`query getAssignments($userId: Int, $emailAddress: String!) {
				actor {
				  errorsInbox {
					errorGroups(filter: {isAssigned: true, assignment: {userId: $userId, userEmail: $emailAddress}}) {
					  results {
						url
						state
						name
						message
						id
						entityGuid
					  }
					}
				  }
				}
			  }`,
				{
					userId: userId,
					emailAddress: emailAddress
				}
			);
		} catch (ex) {
			ContextLogger.warn("getErrorsInboxAssignments", {
				userId: userId,
				usingEmailAddress: emailAddress != null
			});
			return undefined;
		}
	}

	/**
	 * from an errorGroupGuid, returns a traceId and an entityId
	 *
	 * @private
	 * @param {string} errorGroupGuid
	 * @return {*}  {(Promise<
	 * 		| {
	 * 				entityGuid: string;
	 * 				traceId: string;
	 * 		  }
	 * 		| undefined
	 * 	>)}
	 * @memberof NewRelicProvider
	 */
	private async getMetricData(
		errorGroupGuid: string
	): Promise<
		| {
				entityGuid: string;
				traceId?: string;
		  }
		| undefined
	> {
		try {
			if (!errorGroupGuid) {
				ContextLogger.warn("getMetric missing errorGroupGuid");
				return undefined;
			}

			const accountId = NewRelicProvider.parseId(errorGroupGuid)?.accountId!;

			const errorGroupResponse = await this.fetchErrorGroupById(errorGroupGuid);

			if (!errorGroupResponse) {
				ContextLogger.warn("fetchErrorGroupDataById missing errorGroupGuid");
				return undefined;
			}

			const entityGuid = errorGroupResponse.entityGuid;
			const eventsQuery = `${errorGroupResponse.eventsQuery} LIMIT 1`;
			const errorTraceResponse = await this.query<{
				actor: {
					account: {
						nrql: {
							results: {
								entityGuid: string;
								id: string;
							}[];
						};
					};
				};
			}>(
				`query getTransactionError($accountId: Int!) {
						actor {
						  account(id: $accountId) {
							nrql(query: "${eventsQuery}") {
							  results
							}
						  }
						}
					  }`,
				{
					accountId: accountId
				}
			);

			if (errorTraceResponse) {
				const errorTraceResult = errorTraceResponse.actor.account.nrql.results[0];
				if (!errorTraceResult) {
					ContextLogger.warn("getMetric missing errorTraceResult", {
						accountId: accountId,
						errorGroupGuid: errorGroupGuid,
						metricResult: errorGroupResponse
					});
					return {
						entityGuid: entityGuid
					};
				}
				if (errorTraceResult) {
					return {
						entityGuid: entityGuid || errorGroupResponse.entityGuid,
						traceId: errorTraceResult.id
					};
				}
			}
		} catch (ex) {
			ContextLogger.error(ex, "getMetric", {
				errorGroupGuid: errorGroupGuid
			});
		}
		return undefined;
	}

	private async findMappedRemoteByEntity(
		entityGuid: string
	): Promise<
		| {
				url: string;
				name: string;
		  }
		| undefined
	> {
		if (!entityGuid) return undefined;

		const relatedEntityResponse = await this.findRelatedEntityByRepositoryGuid(entityGuid);
		if (relatedEntityResponse) {
			const result = this.findBuiltFrom(relatedEntityResponse.actor.entity.relatedEntities.results);
			if (result?.name && result.url) {
				return {
					name: result.name,
					url: result.url
				};
			}
		}
		return undefined;
	}

	private setAssigneeByEmail(request: { errorGroupGuid: string; emailAddress: string }) {
		return this.query(
			`mutation errorsInboxAssignErrorGroup($email: String!, $errorGroupGuid: ID!) {
			errorsInboxAssignErrorGroup(assignment: {userEmail: $email}, id: $errorGroupGuid) {
			  assignment {
				email
				userInfo {
				  email
				  gravatar
				  id
				  name
				}
			  }
			}
		  }
		  `,
			{
				email: request.emailAddress,
				errorGroupGuid: request.errorGroupGuid
			}
		);
	}

	private setAssigneeByUserId(request: { errorGroupGuid: string; userId: string }) {
		return this.query(
			`mutation errorsInboxAssignErrorGroup($userId: Int!, $errorGroupGuid: ID!) {
				errorsInboxAssignErrorGroup(assignment: {userId: $userId}, id: $errorGroupGuid) {
				  assignment {
					email
					userInfo {
					  email
					  gravatar
					  id
					  name
					}
				  }
				}
			  }`,
			{
				errorGroupGuid: request.errorGroupGuid,
				userId: parseInt(request.userId, 10)
			}
		);
	}

	private findBuiltFrom(relatedEntities: RelatedEntity[]): BuiltFromResult | undefined {
		if (!relatedEntities || !relatedEntities.length) return undefined;

		const builtFrom = relatedEntities.find(_ => _.type === "BUILT_FROM");
		if (!builtFrom) return undefined;

		const targetEntity = builtFrom.target?.entity;
		if (targetEntity) {
			const targetEntityTags = targetEntity.tags;
			if (targetEntityTags) {
				const targetEntityTagsValues = targetEntityTags.find((_: any) => _.key === "url");
				if (targetEntityTagsValues) {
					// why would there ever be more than 1??
					if (
						targetEntityTagsValues &&
						targetEntityTagsValues.values &&
						targetEntityTagsValues.values.length
					) {
						return {
							url: targetEntityTagsValues.values[0],
							name: builtFrom.target.entity.name
						};
					} else {
						ContextLogger.warn("findBuiltFrom missing tags with url[s]", {
							relatedEntities: relatedEntities
						});
						return {
							error: {
								message:
									"Could not find a repository relationship. Please check your setup and try again."
							}
						};
					}
				}
			} else {
				ContextLogger.warn("findBuiltFrom missing tags", {
					relatedEntities: relatedEntities
				});
				return {
					error: {
						message:
							"Could not find a repository relationship. Please check your setup and try again."
					}
				};
			}
		}

		return undefined;
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
				unknownGuid
			};
		} catch (e) {
			ContextLogger.warn("" + e.message, {
				idLike
			});
		}
		return undefined;
	}

	private getRepoName(folder: { name?: string; uri: string }) {
		try {
			const folderName = (folder.name ||
				URI.parse(folder.uri)
					.fsPath.split(/[\\/]+/)
					.pop())!;
			return folderName;
		} catch (ex) {
			ContextLogger.warn("getRepoName", {
				folder: folder,
				error: ex
			});
		}
		return "repo";
	}
	/**
	 * Generates a timestamp range from a given timestamp in ms
	 *
	 * @private
	 * @param {number} [timestampInMilliseconds]
	 * @param {number} [plusOrMinusInMinutes=5]
	 * @return {*}  {({ startTime: number; endTime: number } | undefined)}
	 * @memberof NewRelicProvider
	 */
	private generateTimestampRange(
		timestampInMilliseconds?: number,
		plusOrMinusInMinutes: number = 5
	): { startTime: number; endTime: number } | undefined {
		try {
			if (!timestampInMilliseconds || isNaN(timestampInMilliseconds)) return undefined;

			timestampInMilliseconds = parseInt(timestampInMilliseconds.toString(), 10);

			if (timestampInMilliseconds < 0) return undefined;

			return {
				startTime: timestampInMilliseconds - plusOrMinusInMinutes * 60 * 1000,
				endTime: timestampInMilliseconds + plusOrMinusInMinutes * 60 * 1000
			};
		} catch (ex) {
			ContextLogger.warn("generateTimestampRange failed", {
				timestampInMilliseconds: timestampInMilliseconds,
				plusOrMinusInMinutes: plusOrMinusInMinutes
			});
		}
		return undefined;
	}
}

class ContextLogger {
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
		if (!message) Logger.warn("");
		else Logger.warn(`NR: ${message}`, { ...(params || {}), zetails: ContextLogger.data });
	}

	static log(message: string, params?: any): void {
		Logger.log(`NR: ${message}`, { ...(params || {}), zetails: ContextLogger.data });
	}

	static debug(message: string, params?: any): void {
		Logger.debug(`NR: ${message}`, { ...(params || {}), zetails: ContextLogger.data });
	}
}
