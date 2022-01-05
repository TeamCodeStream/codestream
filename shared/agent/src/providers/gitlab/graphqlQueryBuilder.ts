"use strict";
import { gate } from "../../system/decorators/gate";
import {
	DocumentNode,
	FieldNode,
	FragmentDefinitionNode,
	OperationDefinitionNode,
	print,
	SelectionNode,
	SelectionSetNode
} from "graphql";
import semver from "semver";
import { Logger } from "../../logger";
import { ProviderVersion } from "../../providers/provider";

interface Leaf {
	value: {
		key: string;
		/**
		 * list of nodes that we will remove
		 *
		 * @type {string[]}
		 */
		removals?: string[];
	};
	next?: Leaf;
}

interface GraphQlQueryModifier {
	/**
	 * Selector that decides of the current version meets the stated requirement
	 *
	 * @memberof GraphQlQueryModifier
	 */
	selector: (currentVersion: string) => boolean;
	/**
	 * note: this is a linked list
	 *
	 * @type {{
	 * 		head: Leaf;
	 * 	}}
	 * @memberof GraphQlQueryModifier
	 */
	query: {
		head: Leaf;
	};
}

export class GraphqlQueryBuilder {
	/**
	 * GraphQL data store
	 *
	 * @type {*}
	 * @memberof GraphQlCache
	 */
	private store: any = {
		"0.0.0": {
			emptyQueryName: ""
		}
	};
	/**
	 *
	 */
	constructor(private providerId: string) {}

	private supportMatrix: any = {
		"0.0.0": {}
	};

	public static lowestSupportedVersion = "13.6.4";

	getOrCreateSupportMatrix(providerVersion: ProviderVersion): any {
		const version = providerVersion.version;
		if (!version || version === "0.0.0") {
			return {
				version: providerVersion
			};
		}
		const versionedQuery = this.supportMatrix[version];
		if (versionedQuery) {
			Logger.debug(
				`GraphqlQueryBuilder.getOrCreateSupportMatrix ${this.providerId} version=${version} cache hit`
			);
			return versionedQuery;
		}

		const isGte1380 = semver.gte(version, "13.8.0");
		const isGte1364 = semver.gte(version, "13.6.4");

		const supports = {
			version: providerVersion,
			reviewers: isGte1380,
			resolvingNotes: isGte1364,
			// approvalsRequired: isGte1380,
			approvals: isGte1364,
			approvedBy: isGte1364,
			currentUserTodos: isGte1364,
			// whether we supports draft mode (or old workInProgress)
			draft: semver.gte(version, "14.5.0")
		};
		this.supportMatrix[version] = supports;

		return supports;
	}

	configuration: { [id: string]: GraphQlQueryModifier[] } = {
		GetMergeRequestDiscussions: [
			{
				selector: (currentVersion: string) => semver.lt(currentVersion, "13.8.0"),
				query: {
					head: {
						value: {
							key: "discussionFragment",
							removals: ["resolved", "resolvable", "resolvedAt", "resolvedBy"]
						},
						next: {
							value: {
								key: "notes"
							},
							next: {
								value: {
									key: "nodes",
									removals: ["resolved", "systemNoteIconName"]
								}
							}
						}
					}
				}
			}
		],
		CreateMergeRequestNote: [
			{
				selector: (currentVersion: string) => semver.lt(currentVersion, "13.8.0"),
				query: {
					head: {
						value: {
							key: "discussionFragment",
							removals: ["resolved", "resolvable", "resolvedAt", "resolvedBy"]
						},
						next: {
							value: {
								key: "notes"
							},
							next: {
								value: {
									key: "nodes",
									removals: ["resolved", "systemNoteIconName"]
								}
							}
						}
					}
				}
			}
		],
		GetPullRequest: [
			{
				selector: (currentVersion: string) => semver.lt(currentVersion, "14.5.0"),
				query: {
					head: {
						value: {
							key: "GetPullRequest"
						},
						next: {
							value: {
								key: "project"
							},
							next: {
								value: {
									key: "mergeRequest",
									removals: ["draft"]
								}
							}
						}
					}
				}
			},
			{
				// this was supposed to be in 13.7, but a user with 13.7.9 ran into not having it
				// https://about.gitlab.com/releases/2020/12/22/gitlab-13-7-released/
				selector: (currentVersion: string) => semver.lt(currentVersion, "13.8.0"),
				query: {
					head: {
						value: {
							key: "GetPullRequest"
						},
						next: {
							value: {
								key: "project"
							},
							next: {
								value: {
									key: "mergeRequest",
									removals: ["reviewers"]
								}
							}
						}
					}
				}
			},

			{
				// this is one of our internal GL versions
				selector: (currentVersion: string) => semver.lt(currentVersion, "13.6.4"),
				query: {
					head: {
						value: {
							key: "GetPullRequest"
						},
						next: {
							value: {
								key: "project"
							},
							next: {
								value: {
									key: "mergeRequest",
									removals: [
										"author",
										"approvedBy",
										"commitCount",
										"currentUserTodos",
										"mergedAt",
										"userDiscussionsCount",
										"conflicts"
									]
								},
								next: {
									value: {
										key: "userPermissions",
										removals: ["canMerge"]
									}
								}
							}
						}
					}
				}
			},
			{
				selector: (currentVersion: string) => semver.lt(currentVersion, "13.8.0"),
				query: {
					head: {
						value: {
							key: "discussionFragment",
							removals: ["resolved", "resolvable", "resolvedAt", "resolvedBy"]
						},
						next: {
							value: {
								key: "notes"
							},
							next: {
								value: {
									key: "nodes",
									removals: ["resolved", "systemNoteIconName"]
								}
							}
						}
					}
				}
			}
		],

		GetPullRequest1: [
			{
				// this is one of our internal GL versions
				selector: (currentVersion: string) => semver.lt(currentVersion, "13.6.4"),
				query: {
					head: {
						value: {
							key: "GetPullRequest"
						},
						next: {
							value: {
								key: "project"
							},
							next: {
								value: {
									key: "mergeRequest"
								},
								next: {
									value: {
										key: "headPipeline",
										removals: ["stages"]
									}
								}
							}
						}
					}
				}
			},
			{
				// this is one of our internal GL versions
				selector: (currentVersion: string) => semver.lt(currentVersion, "13.6.4"),
				query: {
					head: {
						value: {
							key: "GetPullRequest"
						},
						next: {
							value: {
								key: "project"
							},
							next: {
								value: {
									key: "mergeRequest",
									removals: ["currentUserTodos"]
								}
							}
						}
					}
				}
			}
		]
	};

	/**
	 * Builds and returns the GraphQL query for a certain document and key
	 *
	 * @param {string} version in the format of X.Y.Z
	 * @param {DocumentNode} document the imported document
	 * @param {"GetPullRequest"} queryKey add additional queries here
	 * @return {*}  {(Promise<string | undefined>)}
	 * @memberof GraphqlQueryStore
	 */
	@gate()
	async build(
		version: string,
		document: DocumentNode,
		queryKey:
			| "GetPullRequest"
			| "GetPullRequest1"
			| "GetMergeRequestDiscussions"
			| "CreateMergeRequestNote"
	): Promise<string> {
		try {
			const versionedQuery = this.store[version];
			if (versionedQuery) {
				const keyedQuery = versionedQuery[queryKey];
				if (keyedQuery) {
					Logger.debug(`GraphqlQueryStore.build ${this.providerId} version=${version} cache hit`);
					return keyedQuery;
				}
			}
			let queryAsString = "";

			const configurations = this.configuration[queryKey];
			if (!version || version === "0.0.0" || !configurations || !configurations.length) {
				queryAsString = print(document);
				this.store[version] = {};
				this.store[version][queryKey] = queryAsString;
				Logger.log(`GraphqlQueryStore.build ${this.providerId} version=${version} no config`);
				return queryAsString;
			}

			// since this is an object that is imported, we don't
			// want to modifiy it for all uses
			const documentClone = JSON.parse(JSON.stringify(document)) as DocumentNode;
			if (configurations?.length) {
				Logger.log(
					`GraphqlQueryStore.build ${this.providerId} version=${version} ${configurations.length} configurations`
				);
				for (const config of configurations) {
					if (!config.selector(version)) continue;

					Logger.log(`GraphqlQueryStore.build ${this.providerId} version=${version} found config`);
					const debugging: any[] = [];
					const headData = config.query.head;

					let lastSelectionSet: SelectionSetNode | undefined = (documentClone.definitions.find(
						(_: any) => _.name && _.name.value === headData!.value.key
					) as OperationDefinitionNode | FragmentDefinitionNode)?.selectionSet;
					// this adds support for removals at the head node level
					// used by fragments like discussionFragment
					if (lastSelectionSet && headData.value.removals) {
						for (const removalName of headData.value.removals) {
							const exclusion = lastSelectionSet.selections?.find((_: SelectionNode) => {
								// OMG Typescript, UGH
								const node = _ as FieldNode;
								return node.name.value === removalName;
							}) as FieldNode;
							if (exclusion) {
								lastSelectionSet.selections = lastSelectionSet.selections?.filter(
									(_: SelectionNode) => {
										// OMG Typescript, UGH
										const node = _ as FieldNode;
										return node.name.value !== removalName;
									}
								);
								Logger.log(
									`GraphqlQueryStore.build ${
										this.providerId
									} version=${version} removing=${debugging
										.map(_ => _.key)
										.join(".")}.${removalName}`
								);
							}
						}
					}

					let head = config.query.head.next;
					while (head != null) {
						debugging.push(head.value);
						const currentSelectionSet:
							| SelectionSetNode
							| undefined = (lastSelectionSet?.selections?.find((_: SelectionNode) => {
							// OMG Typescript, UGH
							const node = _ as FieldNode;
							return node.name && node.name.value === head!.value.key;
						}) as FieldNode)?.selectionSet;

						if (currentSelectionSet && head.value.removals) {
							for (const removalName of head.value.removals) {
								const exclusion = currentSelectionSet.selections?.find((_: SelectionNode) => {
									// OMG Typescript, UGH
									const node = _ as FieldNode;
									return node.name.value === removalName;
								}) as FieldNode;
								if (exclusion) {
									currentSelectionSet.selections = currentSelectionSet.selections?.filter(
										(_: SelectionNode) => {
											// OMG Typescript, UGH
											const node = _ as FieldNode;
											return node.name.value !== removalName;
										}
									);
									Logger.log(
										`GraphqlQueryStore.build ${
											this.providerId
										} version=${version} removing=${debugging
											.map(_ => _.key)
											.join(".")}.${removalName}`
									);
								}
							}
						}

						lastSelectionSet = currentSelectionSet;
						head = head.next as Leaf;
					}
				}
				Logger.log(
					`GraphqlQueryStore.build ${this.providerId} version=${version} saving modified query for ${queryKey}`
				);
			} else {
				Logger.log(
					`GraphqlQueryStore.build ${this.providerId} version=${version} saving default query for ${queryKey}`
				);
			}
			queryAsString = print(documentClone);
			this.store[version] = {};
			this.store[version][queryKey] = queryAsString;
			Logger.log(
				`GraphqlQueryStore.build ${this.providerId} version=${version} saved query for ${queryKey}`
			);
			return queryAsString;
		} catch (ex) {
			Logger.warn(`GraphqlQueryStore.build ${this.providerId} error`, {
				error: ex,
				version: version,
				queryKey: queryKey
			});
			return print(document);
		}
	}
}
