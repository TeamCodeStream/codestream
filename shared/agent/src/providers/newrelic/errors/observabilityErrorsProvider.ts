import { lsp, lspHandler } from "../../../system/decorators/lsp";
import {
	CrashOrException,
	EntityType,
	ErrorGroup,
	ErrorGroupResponse,
	ErrorGroupsResponse,
	ErrorGroupStateType,
	GetNewRelicAssigneesRequestType,
	GetNewRelicErrorGroupRequest,
	GetNewRelicErrorGroupRequestType,
	GetNewRelicErrorGroupResponse,
	GetObservabilityErrorAssignmentsRequest,
	GetObservabilityErrorAssignmentsRequestType,
	GetObservabilityErrorAssignmentsResponse,
	GetObservabilityErrorGroupMetadataRequest,
	GetObservabilityErrorGroupMetadataRequestType,
	GetObservabilityErrorGroupMetadataResponse,
	GetObservabilityErrorsRequest,
	GetObservabilityErrorsRequestType,
	GetObservabilityErrorsResponse,
	isNRErrorResponse,
	NewRelicErrorGroup,
	ObservabilityError,
	ObservabilityErrorCore,
	RelatedEntity,
	ReposScm,
	StackTraceResponse,
} from "@codestream/protocols/agent";
import { log } from "../../../system/decorators/log";
import { SessionContainer } from "../../../container";
import { ResponseError } from "vscode-jsonrpc/lib/messages";
import { ReposProvider } from "../repos/reposProvider";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import { Logger } from "../../../logger";
import { Strings } from "../../../system";
import { NrApiConfig } from "../nrApiConfig";
import { isEmpty as _isEmpty } from "lodash";
import { mapNRErrorResponse, parseId } from "../utils";
import { ContextLogger } from "../../contextLogger";

@lsp
export class ObservabilityErrorsProvider {
	constructor(
		private reposProvider: ReposProvider,
		private graphqlClient: NewRelicGraphqlClient,
		private nrApiConfig: NrApiConfig
	) {}

	/**
	 * Returns a list of errors for a given entity
	 *
	 * Can throw errors
	 *
	 * @param {GetObservabilityErrorsRequest} request
	 * @return {Promise<GetObservabilityErrorsResponse>}
	 * @memberof NewRelicProvider
	 */
	@lspHandler(GetObservabilityErrorsRequestType)
	@log({
		timed: true,
	})
	async getObservabilityErrors(
		request: GetObservabilityErrorsRequest
	): Promise<GetObservabilityErrorsResponse> {
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

					const repositoryEntitiesResponse =
						await this.reposProvider.findRepositoryEntitiesByRepoRemotes(remotes);
					if (isNRErrorResponse(repositoryEntitiesResponse)) {
						return { error: repositoryEntitiesResponse };
					}
					let gotoEnd = false;
					const builtFromApplications: (RelatedEntity & { urlValue?: string })[] = [];
					if (repositoryEntitiesResponse?.entities?.length) {
						const entityFilter = request.filters?.find(_ => _.repoId === repo.id!);
						for (const entity of repositoryEntitiesResponse.entities) {
							if (!entity.account) {
								ContextLogger.warn("count not find accountId for repo entity", {
									entityGuid: entity.guid,
								});
								continue;
							}
							const relatedEntitiesResponse =
								await this.reposProvider.findRelatedEntityByRepositoryGuid(entity.guid);
							const relatedEntities =
								relatedEntitiesResponse.actor.entity.relatedEntities.results.filter(
									r =>
										r.type === "BUILT_FROM" &&
										(entityFilter?.entityGuid
											? r.source?.entity.guid === entityFilter.entityGuid
											: true)
								);
							const urlValue = entity.tags?.find(_ => _.key === "url")?.values[0];

							for (const app of relatedEntities) {
								if (
									!builtFromApplications.find(_ => app.source.entity.guid === _.source.entity.guid)
								) {
									builtFromApplications.push({ ...app, urlValue });
								}
							}
						}

						for (const application of builtFromApplications) {
							if (
								!application.source.entity.guid ||
								!application.source.entity.account?.id ||
								application.source.entity.domain !== "APM"
							) {
								continue;
							}

							const errorTraces = await this.findFingerprintedErrorTraces(
								application.source.entity.account.id,
								application.source.entity.guid,
								application.source.entity.entityType,
								request.timeWindow
							);
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
											remote: application.urlValue!,
											errorGroupGuid: response.actor.errorsInbox.errorGroup.id,
											occurrenceId: errorTrace.occurrenceId,
											count: errorTrace.count,
											lastOccurrence: errorTrace.lastOccurrence,
											errorGroupUrl: response.actor.errorsInbox.errorGroup.url,
										});
										if (observabilityErrors.length > 4) {
											gotoEnd = true;
											break;
										}
									}
								} catch (ex) {
									ContextLogger.warn("internal error getErrorGroupGuid", {
										ex: ex,
									});
								}
							}

							if (gotoEnd) {
								break;
							}
						}
					}
				}
				response.repos?.push({
					repoId: repo.id!,
					repoName: this.reposProvider.getRepoName(repo),
					errors: observabilityErrors!,
				});
			}
		} catch (ex) {
			ContextLogger.error(ex, "getObservabilityErrors");
			if (ex instanceof ResponseError) {
				throw ex;
			}
			return { error: mapNRErrorResponse(ex) };
		}
		return response;
	}

	/**
	 * Find a list of error traces grouped by fingerprint
	 *
	 * @param accountId the NR1 account id to query against
	 * @param applicationGuid the entityGuid for the application to query for
	 * @returns list of most recent error traces for each unique fingerprint
	 */
	@log({ timed: true })
	private async findFingerprintedErrorTraces(
		accountId: number,
		applicationGuid: string,
		entityType?: EntityType,
		timeWindow?: string
	) {
		const queries = this.getFingerprintedErrorTraceQueries(applicationGuid, entityType, timeWindow);

		const results = [];
		for (const query of queries) {
			const response = await this.graphqlClient.query(
				`query fetchErrorsInboxFacetedData($accountId:Int!) {
						actor {
						  account(id: $accountId) {
							nrql(query: "${query}", timeout: 60) { nrql results }
						  }
						}
					  }
					  `,
				{
					accountId: accountId,
				}
			);
			if (response.actor.account.nrql.results?.length) {
				results.push(...response.actor.account.nrql.results);
			}
		}
		return results;
	}

	@log({ timed: true })
	async getErrorGroupFromNameMessageEntity(name: string, message: string, entityGuid: string) {
		try {
			return this.graphqlClient.query(
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
					entityGuid: entityGuid,
				}
			);
		} catch (ex) {
			ContextLogger.error(ex, "getErrorGroupFromNameMessageEntity", {
				name,
				message,
			});
			return undefined;
		}
	}

	@log({ timed: true })
	private async getErrorsInboxAssignments(
		emailAddress: string,
		userId?: number
	): Promise<ErrorGroupsResponse | undefined> {
		try {
			if (userId == null || userId === 0) {
				// TODO fix me. remove this once we have a userId on a connection
				userId = await this.graphqlClient.getUserId();
			}
			return this.graphqlClient.query(
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
					emailAddress: emailAddress,
				}
			);
		} catch (ex) {
			ContextLogger.warn("getErrorsInboxAssignments", {
				userId: userId,
				usingEmailAddress: emailAddress != null,
				error: ex,
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
	private async getMetricData(errorGroupGuid: string): Promise<
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

			const accountId = parseId(errorGroupGuid)?.accountId!;

			const errorGroupResponse = await this.fetchErrorGroupById(errorGroupGuid);

			if (!errorGroupResponse) {
				ContextLogger.warn("fetchErrorGroupDataById missing errorGroupGuid");
				return undefined;
			}

			if (!errorGroupResponse.eventsQuery) {
				ContextLogger.warn("fetchErrorGroupDataById missing eventsQuery");
				return undefined;
			}

			const entityGuid = errorGroupResponse.entityGuid;
			const now = new Date().getTime();
			// We need an `id` (aka occurrenceId) from ErrorTrace to get the most recent instance of this ErrorGroup.
			// To do do we use the TransactionError query and modify it to query ErrorTrace.

			// NOTE: we need to add the date range or we risk missing results.
			const errorTraceQuery = `${errorGroupResponse.eventsQuery.replace(
				" TransactionError ",
				" ErrorTrace "
			)} SINCE ${(errorGroupResponse.lastSeenAt || now) - 100000} until ${
				(errorGroupResponse.lastSeenAt || now) + 100000
			} ORDER BY timestamp DESC LIMIT 1`;

			const graphQuery = `query getErrorTrace($accountId: Int!) {
				actor {
				  account(id: $accountId) {
					nrql(query: "${Strings.escapeNrqlWithFilePaths(errorTraceQuery)}", timeout: 60) {
					  results
					}
				  }
				}
			  }`;

			const errorTraceResponse = await this.graphqlClient.query<{
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
			}>(graphQuery, {
				accountId: accountId,
			});

			if (errorTraceResponse) {
				const errorTraceResult = errorTraceResponse.actor.account.nrql.results[0];
				if (!errorTraceResult) {
					ContextLogger.warn("getMetricData missing errorTraceResult", {
						accountId: accountId,
						errorGroupGuid: errorGroupGuid,
						metricResult: errorGroupResponse,
					});
					return {
						entityGuid: entityGuid,
					};
				}
				if (errorTraceResult) {
					return {
						entityGuid: entityGuid || errorGroupResponse.entityGuid,
						traceId: errorTraceResult.id,
					};
				}
			}
		} catch (ex) {
			ContextLogger.error(ex, "getMetricData", {
				errorGroupGuid: errorGroupGuid,
			});
		}
		return undefined;
	}

	private getFingerprintedErrorTraceQueries(
		applicationGuid: String,
		entityType?: EntityType,
		timeWindow?: string
	): String[] {
		const since = timeWindow ? `${timeWindow} ago` : "3 days ago";
		const apmNrql = [
			"SELECT",
			"sum(count) AS 'count',", // first field is used to sort with FACET
			"latest(timestamp) AS 'lastOccurrence',",
			"latest(id) AS 'occurrenceId',",
			"latest(appName) AS 'appName',",
			"latest(error.class) AS 'errorClass',",
			"latest(message) AS 'message',",
			"latest(entityGuid) AS 'entityGuid',",
			"latest(fingerprint) AS 'fingerprintId',",
			"count(id) AS 'length'",
			"FROM ErrorTrace",
			`WHERE fingerprint IS NOT NULL AND NOT error.expected AND entityGuid='${applicationGuid}'`,
			"FACET error.class, message", // group the results by identifiers
			`SINCE ${since}`,
			"LIMIT MAX",
		].join(" ");

		const browserNrql = [
			"SELECT",
			"count(guid) as 'count',", // first field is used to sort with FACET
			"latest(timestamp) AS 'lastOccurrence',",
			"latest(stackHash) AS 'occurrenceId',",
			"latest(appName) AS 'appName',",
			"latest(errorClass) AS 'errorClass',",
			"latest(errorMessage) AS 'message',",
			"latest(entityGuid) AS 'entityGuid',",
			"count(guid) as 'length'",
			"FROM JavaScriptError",
			`WHERE stackHash IS NOT NULL AND entityGuid='${applicationGuid}'`,
			"FACET stackTrace", // group the results by fingerprint
			`SINCE ${since}`,
			"LIMIT MAX",
		].join(" ");

		const mobileNrql1 = [
			"SELECT",
			"count(occurrenceId) as 'count',", // first field is used to sort with FACET
			"latest(timestamp) AS 'lastOccurrence',",
			"latest(occurrenceId) AS 'occurrenceId',",
			"latest(appName) AS 'appName',",
			"latest(crashLocationClass) AS 'errorClass',",
			"latest(crashMessage) AS 'message',",
			"latest(entityGuid) AS 'entityGuid',",
			"count(occurrenceId) as 'length'",
			"FROM MobileCrash",
			`WHERE entityGuid='${applicationGuid}'`,
			"FACET crashFingerprint", // group the results by fingerprint
			`SINCE ${since}`,
			"LIMIT MAX",
		].join(" ");

		const mobileNrql2 = [
			"SELECT",
			"count(handledExceptionUuid) as 'count',", // first field is used to sort with FACET
			"latest(timestamp) AS 'lastOccurrence',",
			"latest(handledExceptionUuid) AS 'occurrenceId',",
			"latest(appName) AS 'appName',",
			"latest(exceptionLocationClass) AS 'errorClass',",
			"latest(exceptionMessage) AS 'message',",
			"latest(entityGuid) AS 'entityGuid',",
			"count(handledExceptionUuid) as 'length'",
			"FROM MobileHandledException",
			`WHERE entityGuid='${applicationGuid}'`,
			"FACET handledExceptionUuid", // group the results by fingerprint
			`SINCE ${since}`,
			"LIMIT MAX",
		].join(" ");

		switch (entityType) {
			case "BROWSER_APPLICATION_ENTITY":
				return [browserNrql];
			case "MOBILE_APPLICATION_ENTITY":
				return [mobileNrql1, mobileNrql2];
			default:
				return [apmNrql];
		}
	}

	setAssigneeByEmail(request: { errorGroupGuid: string; emailAddress: string }) {
		return this.graphqlClient.query(
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
				errorGroupGuid: request.errorGroupGuid,
			}
		);
	}

	async fetchErrorGroupById(
		errorGroupGuid: string,
		timestamp?: number
	): Promise<ErrorGroup | undefined> {
		try {
			const timestampRange = this.graphqlClient.generateTimestampRange(timestamp);
			const response = await this.graphqlClient.query<{
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
							lastSeenAt
						  }
						}
					  }
					}
				  }`,
				{
					ids: [errorGroupGuid],
				}
			);
			return response?.actor?.errorsInbox?.errorGroups?.results[0] || undefined;
		} catch (ex) {
			ContextLogger.warn("fetchErrorGroupDataById failure", {
				errorGroupGuid,
				error: ex,
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
		occurrenceId: number | string
	): Promise<StackTraceResponse> {
		let fingerprintId = 0;
		try {
			// BrowserApplicationEntity uses a fingerprint instead of an occurrence and it's a number
			if (typeof occurrenceId === "string" && occurrenceId.match(/^-?\d+$/)) {
				fingerprintId = parseInt(occurrenceId, 10);
			} else if (typeof occurrenceId === "number") {
				fingerprintId = occurrenceId;
			}

			if (fingerprintId) {
				occurrenceId = "";
			}
		} catch {}
		return this.graphqlClient.query(
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
				fingerprintId: fingerprintId,
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
		const timestampRange = this.graphqlClient.generateTimestampRange(timestamp);
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
					eventsQuery
				  }
				}
			  }
			}
		  }`;

		return this.graphqlClient.query(q, {
			accountId: accountId,
			errorGroupGuids: [errorGroupGuid],
			entityGuid: entityGuid,
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
					occurrenceId: occurrenceId,
					error: ex,
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
				occurrenceId: occurrenceId,
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
				occurrenceId: occurrenceId,
				error: ex,
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
					if (frame.formatted && frame.formatted[0] !== "\t") {
						frame.formatted = `\t${frame.formatted}`;
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
					apiUrl: this.nrApiConfig.apiUrl,
				},
			};
		}
		return undefined;
	}

	@lspHandler(GetObservabilityErrorGroupMetadataRequestType)
	@log({
		timed: true,
	})
	async getErrorGroupMetadata(
		request: GetObservabilityErrorGroupMetadataRequest
	): Promise<GetObservabilityErrorGroupMetadataResponse | undefined> {
		if (_isEmpty(request.errorGroupGuid) && _isEmpty(request.entityGuid)) return undefined;

		try {
			if (request.errorGroupGuid) {
				const metricResponse = await this.getMetricData(request.errorGroupGuid);
				if (!metricResponse) return undefined;

				const mappedRepoEntities = await this.reposProvider.findMappedRemoteByEntity(
					metricResponse?.entityGuid
				);
				return {
					entityId: metricResponse?.entityGuid,
					occurrenceId: metricResponse?.traceId,
					relatedRepos: mappedRepoEntities || [],
				} as GetObservabilityErrorGroupMetadataResponse;
			}

			if (request.entityGuid) {
				const mappedRepoEntities = await this.reposProvider.findMappedRemoteByEntity(
					request.entityGuid
				);
				return {
					entityId: request.entityGuid,
					relatedRepos: mappedRepoEntities || [],
				} as GetObservabilityErrorGroupMetadataResponse;
			}
		} catch (ex) {
			ContextLogger.error(ex, "getErrorGroupMetadata", {
				request: request,
			});
		}
		return undefined;
	}

	/**
	 * Returns NR errors assigned to this uer
	 *
	 * Can throw errors.
	 *
	 * @param {GetObservabilityErrorAssignmentsRequest} request
	 * @return {Promise<GetObservabilityErrorAssignmentsResponse>}
	 * @memberof NewRelicProvider
	 */
	@lspHandler(GetObservabilityErrorAssignmentsRequestType)
	@log({
		timed: true,
	})
	async getObservabilityErrorAssignments(
		request: GetObservabilityErrorAssignmentsRequest
	): Promise<GetObservabilityErrorAssignmentsResponse> {
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
							errorGroupUrl: _.url,
						} as ObservabilityErrorCore;
					});

				if (response.items && response.items.find(_ => !_.errorClass)) {
					ContextLogger.warn("getObservabilityErrorAssignments has empties", {
						items: response.items,
					});
				}
				ContextLogger.warn("getObservabilityErrorAssignments", {
					itemsCount: response.items.length,
				});
			} else {
				ContextLogger.log("getObservabilityErrorAssignments (none)");
			}
		} catch (ex) {
			ContextLogger.warn("getObservabilityErrorAssignments", {
				error: ex,
			});
			throw ex;
		}

		return response;
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
			const parsedId = parseId(errorGroupGuid)!;
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
					request: request,
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

					errorGroupUrl: `${this.nrApiConfig.productUrl}/redirect/errors-inbox/${errorGroupGuid}`,
					entityUrl: `${this.nrApiConfig.productUrl}/redirect/entity/${errorGroupResponse.entityGuid}`,
				};

				if (errorGroupResponse.eventsQuery) {
					const timestampRange = this.graphqlClient.generateTimestampRange(request.timestamp);
					if (timestampRange) {
						const escapedEventsQuery = Strings.escapeNrql(errorGroupResponse.eventsQuery);
						const nrql = `${escapedEventsQuery} since ${timestampRange?.startTime} until ${timestampRange?.endTime} LIMIT 1`;
						try {
							const result = await this.graphqlClient.runNrql<{
								"tags.releaseTag": string;
								"tags.commit": string;
							}>(accountId, nrql);
							if (result.length) {
								errorGroup.releaseTag = result[0]["tags.releaseTag"];
								errorGroup.commit = result[0]["tags.commit"];
							}
						} catch (e) {
							// This query is fragile with invalid nrql escape characters - Strings.escapeNrql
							// catches some but not all of these cases
							Logger.warn(e);
						}
					}
				}

				if (
					errorGroupFullResponse.actor?.entity?.exception?.stackTrace ||
					errorGroupFullResponse.actor?.entity?.crash?.stackTrace
				) {
					errorGroup.errorTrace = {
						path: errorGroupFullResponse.actor.entity.name,
						stackTrace: errorGroupFullResponse.actor.entity.crash
							? errorGroupFullResponse.actor.entity.crash.stackTrace.frames
							: errorGroupFullResponse.actor.entity.exception?.stackTrace?.frames || [],
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
						value: errorGroupFullResponse.actor.account.name,
					};
					errorGroup.attributes["Entity"] = {
						type: "string",
						value: errorGroupFullResponse.actor.entity.name,
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
						gravatar: assignee.userInfo?.gravatar,
					};
				}

				const relatedRepos = this.reposProvider.findRelatedReposFromServiceEntity(
					errorGroupFullResponse.actor.entity.relatedEntities.results
				);
				if (errorGroup.entity && relatedRepos) {
					errorGroup.entity["relatedRepos"] = relatedRepos;
				}

				ContextLogger.log("ErrorGroup found", {
					errorGroupGuid: errorGroup.guid,
					occurrenceId: request.occurrenceId,
					entityGuid: entityGuid,
					hasErrorGroup: errorGroup != null,
					hasStackTrace: errorGroup?.hasStackTrace === true,
				});
			} else {
				ContextLogger.warn(
					`No errorGroup results errorGroupGuid (${errorGroupGuid}) in account (${accountId})`,
					{
						request: request,
						entityGuid: entityGuid,
						accountId: accountId,
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
						)) as any,
					},
				};
			}

			return {
				accountId,
				errorGroup,
			};
		} catch (ex) {
			ContextLogger.error(ex);

			let result: any = {};
			if (ex.response?.errors) {
				result = {
					message: ex.response.errors.map((_: { message: string }) => _.message).join("\n"),
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
				errorGroup: undefined as any,
			};
		}
	}

	@lspHandler(GetNewRelicAssigneesRequestType)
	@log()
	async getAssignableUsers(request: { boardId: string }) {
		const { scm } = SessionContainer.instance();
		const committers = await scm.getLatestCommittersAllRepos({});
		let users: any[] = [];
		if (committers?.scm) {
			users = users.concat(
				Object.keys(committers.scm).map((_: string) => {
					return {
						id: _,
						email: _,
						group: "GIT",
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
			users: users,
		};
	}

	setAssigneeByUserId(request: { errorGroupGuid: string; userId: string }) {
		return this.graphqlClient.query(
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
				userId: parseInt(request.userId, 10),
			}
		);
	}
}
