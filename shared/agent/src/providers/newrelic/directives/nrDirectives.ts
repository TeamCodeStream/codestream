import { log } from "../../../system/decorators/log";
import { isNRErrorResponse } from "@codestream/protocols/agent";
import { Functions } from "../../../system/function";
import { NewRelicGraphqlClient } from "../newRelicGraphqlClient";
import { ObservabilityErrorsProvider } from "../errors/observabilityErrorsProvider";
import { ReposProvider } from "../repos/reposProvider";
import { ContextLogger } from "../../contextLogger";
import { parseId } from "../utils";

export interface Directive {
	type: "assignRepository" | "removeAssignee" | "setAssignee" | "setState";
	data: any;
}

export interface Directives {
	directives: Directive[];
}

export class NrDirectives {
	constructor(
		private graphqlClient: NewRelicGraphqlClient,
		private observabilityErrorsProvider: ObservabilityErrorsProvider,
		private reposProvider: ReposProvider
	) {}

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
			const parsedId = parseId(request.parseableAccountId)!;
			const accountId = parsedId?.accountId;
			const name = request.name;

			const response = await this.graphqlClient.mutate<{
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
					referenceEntityCreateOrUpdateRepository(sync:true, repositories: [{accountId: $accountId, name: $name, url: $url}]) {
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
					url: request.url,
				}
			);
			ContextLogger.log("referenceEntityCreateOrUpdateRepository", {
				accountId: accountId,
				name: name,
				url: request.url,
				urlModified: request.url,
				response: response,
			});

			if (response?.referenceEntityCreateOrUpdateRepository?.failures?.length) {
				const failures = response.referenceEntityCreateOrUpdateRepository.failures
					.map(_ => `${_.message} (${_.type})`)
					.join("\n");
				ContextLogger.warn("referenceEntityCreateOrUpdateRepository failures", {
					accountId: accountId,
					name: name,
					url: request.url,
					failures: failures,
				});
				throw new Error(failures);
			}

			const repoEntityId =
				response.referenceEntityCreateOrUpdateRepository.updated[0] ||
				response.referenceEntityCreateOrUpdateRepository.created[0];

			if (!repoEntityId) {
				ContextLogger.warn(
					"referenceEntityCreateOrUpdateRepository no repoEntityId [this is not good]",
					{
						accountId: accountId,
						name: name,
						url: request.url,
					}
				);
			}

			const entityId =
				request.entityId ||
				(await this.observabilityErrorsProvider.fetchErrorGroupById(request.errorGroupGuid!))
					?.entityGuid;
			if (entityId) {
				const entityRelationshipUserDefinedCreateOrReplaceResponse =
					await this.graphqlClient.mutate<{
						entityRelationshipUserDefinedCreateOrReplace: {
							errors?: { message: string }[];
						};
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
							targetEntityGuid: repoEntityId,
						}
					);
				ContextLogger.log("entityRelationshipUserDefinedCreateOrReplace", {
					sourceEntityGuid: entityId,
					targetEntityGuid: repoEntityId,
					response: entityRelationshipUserDefinedCreateOrReplaceResponse,
				});

				if (
					entityRelationshipUserDefinedCreateOrReplaceResponse
						?.entityRelationshipUserDefinedCreateOrReplace?.errors?.length
				) {
					const createOrReplaceError =
						entityRelationshipUserDefinedCreateOrReplaceResponse.entityRelationshipUserDefinedCreateOrReplace?.errors
							.map(_ => _.message)
							.join("\n");
					ContextLogger.warn("entityRelationshipUserDefinedCreateOrReplace failure", {
						error: createOrReplaceError,
					});
					throw new Error(createOrReplaceError);
				}

				// after the getOrCreate of the repo entity and its association to the entity,
				// query the entity to ensure the repo entity exists
				// this is needed since right after this, a client can re-query to find
				// entities based on the request.url
				const fn = async () => {
					try {
						const result = await this.reposProvider.findRepositoryEntitiesByRepoRemotes(
							[request.url],
							true
						);
						if (isNRErrorResponse(result)) {
							return false;
						}
						return !!result?.entities?.length;
					} catch (error) {
						ContextLogger.warn("findRepositoryEntitiesByRepoRemotesResult error", {
							error: error,
						});
						return false;
					}
				};
				// max wait time is (1*1000)+(2*1000)+(3*1000)+(4*1000)+(5*1000) or 15 seconds
				const findRepositoryEntitiesByRepoRemotesResult =
					await Functions.withExponentialRetryBackoff(fn, 5, 1000);
				ContextLogger.log(
					`findRepositoryEntitiesByRepoRemotesResult result=${JSON.stringify(
						findRepositoryEntitiesByRepoRemotesResult
					)}`
				);

				return {
					directives: [
						{
							type: "assignRepository",
							data: {
								id: request.errorGroupGuid,
								entityGuid: entityId,
								repositoryEntityGuid: response?.referenceEntityCreateOrUpdateRepository?.created
									?.length
									? response.referenceEntityCreateOrUpdateRepository.created[0]
									: response?.referenceEntityCreateOrUpdateRepository?.updated?.length
									? response.referenceEntityCreateOrUpdateRepository.updated[0]
									: undefined,
								repo: {
									accountId: accountId,
									name: request.name,
									urls: [request.url],
								},
							},
						},
					],
				};
			} else {
				ContextLogger.warn(
					"entityId needed for entityRelationshipUserDefinedCreateOrReplace is null"
				);
				throw new Error("Could not locate entityId");
			}
		} catch (ex) {
			ContextLogger.error(ex, "assignRepository", {
				request: request,
			});
			throw ex;
		}
	}

	@log()
	async removeAssignee(request: {
		errorGroupGuid: string;
		emailAddress?: string;
		userId?: string;
	}): Promise<Directives | undefined> {
		try {
			await this.observabilityErrorsProvider.setAssigneeByUserId({ ...request, userId: "0" });

			return {
				directives: [
					{
						type: "removeAssignee",
						data: {
							assignee: null,
						},
					},
				],
			};
		} catch (ex) {
			ContextLogger.error(ex);
			return undefined;
		}
	}

	@log()
	async setAssignee(request: {
		errorGroupGuid: string;
		emailAddress: string;
	}): Promise<Directives | undefined> {
		try {
			const response = await this.observabilityErrorsProvider.setAssigneeByEmail(request!);
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
								name: assignment?.userInfo?.name,
							},
						},
					},
				],
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
			const response = await this.graphqlClient.mutate<{
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
					state: request.state,
				}
			);

			ContextLogger.log("errorsInboxUpdateErrorGroupState", {
				request: request,
				response: response,
			});

			if (response?.errorTrackingUpdateErrorGroupState?.errors?.length) {
				const stateFailure = response.errorTrackingUpdateErrorGroupState.errors
					.map(_ => _.description)
					.join("\n");
				ContextLogger.warn("errorsInboxUpdateErrorGroupState failure", {
					error: stateFailure,
				});
				throw new Error(stateFailure);
			}

			return {
				directives: [
					{
						type: "setState",
						data: {
							state: request.state,
						},
					},
				],
			};
		} catch (ex) {
			ContextLogger.error(ex as Error);
			throw ex;
		}
	}
}
