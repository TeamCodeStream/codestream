import {
	Entity,
	EntityType,
	FunctionLocator,
	GetFileLevelTelemetryResponse,
	NRErrorType,
} from "@codestream/protocols/agent";
import { LanguageId } from "./clm/clmManager";

export interface NewRelicId {
	accountId: number;
	unknownAbbreviation: string;
	entityType: string;
	unknownGuid: string;
}

export interface MetricTimeslice {
	facet: string;
	metricTimesliceName: string;
	averageDuration?: number;
	requestsPerMinute?: number;
}

export interface AdditionalMetadataInfo {
	traceId?: string;
	"code.lineno"?: string;
	transactionId?: string;
	"code.namespace"?: string;
	"code.function"?: string;
}

export class AccessTokenError extends Error {
	constructor(
		public text: string,
		public innerError: any,
		public isAccessTokenError: boolean
	) {
		super(text);
	}
}

export interface Span {
	"code.filepath"?: string | null;
	"code.function"?: string | null;
	"code.namespace"?: string | null;
	"code.lineno"?: number | string | null;
	"transaction.name"?: string | null;
	name?: string;
	traceId?: string;
	transactionId?: string;
	timestamp?: number;
}

export interface MetricQueryRequest {
	newRelicAccountId: number;
	newRelicEntityGuid: string;
	codeFilePath?: string;
	codeNamespace?: string;
	/**
	 * names of the metric timeslices
	 */
	metricTimesliceNames?: string[];
}

export interface SpanRequest {
	newRelicAccountId: number;
	newRelicEntityGuid: string;
	resolutionMethod: ResolutionMethod;
	languageId: LanguageId;
	codeFilePath?: string;
	locator?: FunctionLocator;
}

export interface EntitySearchResult {
	actor: {
		entitySearch: {
			count: number;
			results: {
				nextCursor: string;
				entities: {
					account: {
						name: string;
					};
					guid: string;
					name: string;
					entityType: EntityType;
				}[];
			};
		};
	};
}

export interface FunctionInfo {
	namespace?: string;
	className?: string;
	functionName?: string;
}

export type ResolutionMethod = "filePath" | "locator" | "hybrid";

export interface ServiceLevelIndicatorQueryResult {
	actor: {
		entity: {
			serviceLevel: {
				indicators: {
					guid: string;
					name: string;
					resultQueries: {
						indicator: {
							nrql: string;
						};
					};
					objectives: {
						target: number;
						timeWindow: {
							rolling: {
								count: number;
								unit: string;
							};
						};
					}[];
				}[];
			};
		};
	};
}

export interface ServiceLevelObjectiveQueryResult {
	actor: {
		[entityGuid: string]: {
			nrdbQuery: {
				results: {
					[name: string]: number;
				}[];
			};
		};
	};
}

export abstract class CodedError extends Error {
	abstract code: NRErrorType;
}

export class GraphqlNrqlError extends CodedError {
	errors: Array<GraphqlNrqlErrorItem>;
	code: NRErrorType = "NR_GENERIC";

	constructor(errors: Array<GraphqlNrqlErrorItem>, message?: string) {
		super(message);
		this.errors = errors;
	}
}

export class GraphqlNrqlTimeoutError extends GraphqlNrqlError {
	code: NRErrorType = "NR_TIMEOUT";
}

export function isGraphqlNrqlError(error: unknown): error is GraphqlNrqlErrorResponse {
	const err = error as GraphqlNrqlErrorResponse;
	return err?.errors && err?.errors?.length > 0 && !!err?.errors[0]?.extensions?.errorClass;
}

export function isGetFileLevelTelemetryResponse(obj: any): obj is GetFileLevelTelemetryResponse {
	return (
		Object.prototype.hasOwnProperty.call(obj, "repo") &&
		Object.prototype.hasOwnProperty.call(obj, "isConnected") &&
		Object.prototype.hasOwnProperty.call(obj, "relativeFilePath")
	);
}

export interface GraphqlNrqlErrorItem {
	extensions?: {
		errorClass: string;
		nrOnly: object;
	};
	locations?: Array<{
		column: number;
		line: number;
	}>;
	message?: string;
	path: Array<string>;
}

export interface GraphqlNrqlErrorResponse {
	errors: Array<GraphqlNrqlErrorItem>;
}

export interface RepoEntitiesByRemotesResponse {
	entities?: Entity[];
	remotes?: string[];
}

export type ClmSpanData = {
	name: string;
	"code.function": string;
	"entity.guid": string;
};

export function isClmSpanData(obj: unknown): obj is ClmSpanData {
	if (obj === null || obj === undefined) {
		return false;
	}
	return (
		Object.prototype.hasOwnProperty.call(obj, "name") &&
		Object.prototype.hasOwnProperty.call(obj, "code.function") &&
		Object.prototype.hasOwnProperty.call(obj, "entity.guid")
	);
}
