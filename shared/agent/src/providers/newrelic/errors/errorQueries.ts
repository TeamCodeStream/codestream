import { EntityType } from "@codestream/protocols/agent";
import { template as _template, TemplateExecutor } from "lodash";

// Copied from graphql-codegen
export enum ErrorsInboxEventSource {
	/** AwsLambdaInvocationError events */
	AwsLambdaInvocationError = "AWS_LAMBDA_INVOCATION_ERROR",
	/** ErrorTrace events */
	ErrorTrace = "ERROR_TRACE",
	/** JavaScriptError events */
	JavaScriptError = "JAVA_SCRIPT_ERROR",
	/** MobileCrash events */
	MobileCrash = "MOBILE_CRASH",
	/** MobileHandledException events */
	MobileHandledException = "MOBILE_HANDLED_EXCEPTION",
	/** MobileRequestError events */
	MobileRequestError = "MOBILE_REQUEST_ERROR",
	/** Span events */
	Span = "SPAN",
	/** TransactionError events */
	TransactionError = "TRANSACTION_ERROR",
}

interface ErrorQueryTemplate {
	entityType: EntityType;
	eventSource: ErrorsInboxEventSource;
	queryTemplate: TemplateExecutor;
	deleteFields: string[];
}

export interface ErrorQuery {
	entityType: EntityType;
	eventSource: ErrorsInboxEventSource;
	query: string;
	deleteFields: string[];
}

export interface BaseError {
	facet: string[] | string; // Apm is string[], browser / mobile are string
	entityGuid: string;
	count: number;
	timestamp: number;
	appName: string;
	length: number;
	traceId: string;
}

// Matches the unique fields in the FROM ErrorTrace NRQL query
export interface ErrorTraceEventResponse extends BaseError {
	id: string;
	"error.class": string;
	"error.message": string;
	fingerprint: string;
}

// Matches the unique fields in the FROM JavaScriptError NRQL query
export interface JavaScriptErrorResponse extends BaseError {
	stackHash: string;
	errorClass: string;
	errorMessage: string;
}

// Matches the unique fields in the FROM MobileCrash NRQL query
export interface MobileCrashErrorResponse extends BaseError {
	occurrenceId: string;
	crashLocation: string;
	crashException: string;
	crashMessage: string;
}

// Matches the unique fields in the FROM MobileHandledException NRQL query
export interface MobileHandledErrorResponse extends BaseError {
	handledExceptionUuid: string;
	exceptionLocationClass: string;
	exceptionMessage: string;
}

export interface CommonError {
	facet: string[] | string;
	entityGuid: string;
	errorClass: string;
	message: string;
	occurrenceId: string;
	traceId: string;
	count: number;
	lastOccurrence: number;
	appName: string;
	length: number;
}

export interface ErrorResultWrapper {
	errorQuery: ErrorQuery;
	response: BaseError[];
}

// Each FROM source in NRQL has different field names - here we map them to a common
// type CommonError
export function errorQueryResultToCommonError(
	errorQuery: ErrorQuery,
	result: unknown
): CommonError {
	switch (errorQuery.eventSource) {
		case ErrorsInboxEventSource.ErrorTrace:
		case ErrorsInboxEventSource.TransactionError:
			return errorTraceToCommonError(result as ErrorTraceEventResponse);
		case ErrorsInboxEventSource.JavaScriptError:
			return javaScriptErrorToCommonError(result as JavaScriptErrorResponse);
		case ErrorsInboxEventSource.MobileCrash:
			return mobileCrashErrorToCommonError(result as MobileCrashErrorResponse);
		case ErrorsInboxEventSource.MobileHandledException:
			return mobileHandledErrorToCommonError(result as MobileHandledErrorResponse);
		default:
			throw new Error(`Can't handle eventSource ${errorQuery.eventSource}`);
	}
}

export function errorTraceToCommonError(error: ErrorTraceEventResponse): CommonError {
	return {
		facet: error.facet,
		entityGuid: error.entityGuid,
		count: error.count,
		lastOccurrence: error.timestamp,
		appName: error.appName,
		length: error.length,
		traceId: error.traceId,
		occurrenceId: error.id,
		errorClass: error["error.class"],
		message: error["error.message"],
	};
}

export function javaScriptErrorToCommonError(error: JavaScriptErrorResponse): CommonError {
	return {
		facet: error.facet,
		entityGuid: error.entityGuid,
		count: error.count,
		lastOccurrence: error.timestamp,
		appName: error.appName,
		length: error.length,
		traceId: error.traceId,
		occurrenceId: error.stackHash,
		errorClass: error.errorClass,
		message: error.errorMessage,
	};
}

export function mobileCrashErrorToCommonError(error: MobileCrashErrorResponse): CommonError {
	return {
		facet: error.facet,
		entityGuid: error.entityGuid,
		count: error.count,
		lastOccurrence: error.timestamp,
		appName: error.appName,
		length: error.length,
		traceId: error.traceId,
		occurrenceId: error.occurrenceId,
		errorClass: error.crashLocation,
		message: error.crashMessage,
	};
}

export function mobileHandledErrorToCommonError(error: MobileHandledErrorResponse): CommonError {
	return {
		facet: error.facet,
		entityGuid: error.entityGuid,
		count: error.count,
		lastOccurrence: error.timestamp,
		appName: error.appName,
		length: error.length,
		traceId: error.traceId,
		occurrenceId: error.handledExceptionUuid,
		errorClass: error.exceptionLocationClass,
		message: error.exceptionMessage,
	};
}

const errorQueryGroups: ErrorQueryTemplate[] = [
	{
		entityType: "APM_APPLICATION_ENTITY",
		eventSource: ErrorsInboxEventSource.ErrorTrace,
		queryTemplate: _template(
			[
				"SELECT",
				"sum(count) AS 'count',", // first field is used to sort with FACET
				"latest(timestamp) AS 'timestamp',",
				"latest(id) AS 'id',",
				"latest(appName) AS 'appName',",
				"latest(error.class) AS 'error.class',",
				"latest(error.message) AS 'error.message',",
				"latest(entityGuid) AS 'entityGuid',",
				"latest(fingerprint) AS 'fingerprint',",
				"latest(traceId) AS 'traceId',",
				"count(id) AS 'length'",
				"FROM ErrorTrace",
				`WHERE fingerprint IS NOT NULL AND NOT error.expected AND entityGuid='<%= applicationGuid %>'`,
				"FACET error.class, message", // group the results by identifiers
				`SINCE <%= since %> AGO`,
				"LIMIT MAX",
			].join(" ")
		),
		deleteFields: ["facet", "length"],
	},
	{
		entityType: "BROWSER_APPLICATION_ENTITY",
		eventSource: ErrorsInboxEventSource.JavaScriptError,
		queryTemplate: _template(
			[
				"SELECT",
				"count(*) as 'count',", // first field is used to sort with FACET
				"latest(timestamp) AS 'timestamp',",
				"latest(stackHash) AS 'stackHash',",
				"latest(appName) AS 'appName',",
				"latest(errorClass) AS 'errorClass',",
				"latest(errorMessage) AS 'errorMessage',",
				"latest(entityGuid) AS 'entityGuid',",
				"latest(traceId) AS 'traceId',",
				"count(guid) as 'length'",
				"FROM JavaScriptError",
				`WHERE stackHash IS NOT NULL AND entityGuid='<%= applicationGuid %>'`,
				"FACET stackTrace", // group the results by fingerprint
				`SINCE <%= since %> AGO`,
				"LIMIT MAX",
			].join(" ")
		),

		deleteFields: ["facet", "length"],
	},
	{
		entityType: "MOBILE_APPLICATION_ENTITY",
		eventSource: ErrorsInboxEventSource.MobileCrash,
		queryTemplate: _template(
			[
				"SELECT",
				"count(occurrenceId) as 'count',", // first field is used to sort with FACET
				"latest(timestamp) AS 'timestamp',",
				"latest(occurrenceId) AS 'occurrenceId',",
				"latest(appName) AS 'appName',",
				"latest(crashLocation) AS 'crashLocation',",
				"latest(crashException) AS 'crashException',",
				"latest(crashMessage) AS 'crashMessage',",
				"latest(entityGuid) AS 'entityGuid',",
				"latest(traceId) AS 'traceId',",
				"count(occurrenceId) as 'length'",
				"FROM MobileCrash",
				`WHERE entityGuid='<%= applicationGuid %>'`,
				"FACET crashFingerprint", // group the results by fingerprint
				`SINCE <%= since %> AGO`,
				"LIMIT MAX",
			].join(" ")
		),
		deleteFields: ["facet", "length"],
	},
	{
		entityType: "MOBILE_APPLICATION_ENTITY",
		eventSource: ErrorsInboxEventSource.MobileHandledException,
		queryTemplate: _template(
			[
				"SELECT",
				"count(handledExceptionUuid) as 'count',", // first field is used to sort with FACET
				"latest(timestamp) AS 'timestamp',",
				"latest(handledExceptionUuid) AS 'handledExceptionUuid',",
				"latest(appName) AS 'appName',",
				"latest(exceptionLocationClass) AS 'exceptionLocationClass',",
				"latest(exceptionMessage) AS 'exceptionMessage',",
				"latest(entityGuid) AS 'entityGuid',",
				"latest(traceId) AS 'traceId',",
				"count(handledExceptionUuid) as 'length'",
				"FROM MobileHandledException",
				`WHERE entityGuid='<%= applicationGuid %>'`,
				"FACET handledExceptionUuid", // group the results by fingerprint
				`SINCE <%= since %> AGO`,
				"LIMIT MAX",
			].join(" ")
		),
		deleteFields: ["facet", "length"],
	},
];

// The actor > errorsInbox > errorGroup nerdgraph relies on passing the original
// fields from the NRQL queries without being renamed to the event: ErrorsInboxRawEvent
// parameter. These queries return the original field names. They are mapped later
// to a common type via errorQueryResultToCommonError
export function getFingerprintedErrorTraceQueries(
	applicationGuid: string,
	entityType: EntityType | string,
	since: string
): ErrorQuery[] {
	return errorQueryGroups
		.filter(queryGroup => queryGroup.entityType === entityType)
		.map(template => {
			return <ErrorQuery>{
				query: template.queryTemplate({ applicationGuid, since }),
				entityType: template.entityType,
				deleteFields: template.deleteFields,
				eventSource: template.eventSource,
			};
		});
}
