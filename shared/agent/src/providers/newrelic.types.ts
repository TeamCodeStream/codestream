import { GetFileLevelTelemetryResponse } from "../protocol/agent.protocol.providers";

export class GraphqlNrqlError extends Error {
	errors: Array<GraphqlNrqlErrorItem>;

	constructor(errors: Array<GraphqlNrqlErrorItem>, message?: string) {
		super(message);
		this.errors = errors;
	}
}

export class GraphqlNrqlTimeoutError extends GraphqlNrqlError {}

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

export type NRErrorType = "NOT_ASSOCIATED" | "NR_TIMEOUT" | "NOT_CONNECTED" | "NR_UNKNOWN";

export interface NRErrorResponse {
	isConnected?: boolean;
	repo?: {
		id: string;
		name: string;
		remote: string;
	};
	error: {
		message?: string;
		type: NRErrorType;
	};
}
