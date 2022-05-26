import { FunctionLocator } from "../../protocol/agent.protocol.providers";

export interface Directive {
	type: "assignRepository" | "removeAssignee" | "setAssignee" | "setState";
	data: any;
}

export interface Directives {
	directives: Directive[];
}

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
	constructor(public text: string, public innerError: any, public isAccessTokenError: boolean) {
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

export type ResolutionMethod = "filePath" | "locator";
