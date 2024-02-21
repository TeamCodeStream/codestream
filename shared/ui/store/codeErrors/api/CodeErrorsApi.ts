import {
	CreateShareableCodeErrorRequest,
	CreateShareableCodeErrorResponse,
	FetchCodeErrorsRequest,
	FetchCodeErrorsResponse,
	GetNewRelicErrorGroupRequest,
	GetNewRelicErrorGroupResponse,
	GetObservabilityErrorsRequest,
	GetObservabilityErrorsResponse,
	ResolveStackTracePositionRequest,
	ResolveStackTracePositionResponse,
	ResolveStackTraceRequest,
	ResolveStackTraceResponse,
	TelemetryData,
	TelemetryEventName,
	UpdateCodeErrorRequest,
	UpdateCodeErrorResponse,
} from "@codestream/protocols/agent";

export interface CodeErrorsApi {
	createShareableCodeError(
		request: CreateShareableCodeErrorRequest
	): Promise<CreateShareableCodeErrorResponse>;

	fetchCodeErrors(request: FetchCodeErrorsRequest): Promise<FetchCodeErrorsResponse>;

	updateCodeErrors(request: UpdateCodeErrorRequest): Promise<UpdateCodeErrorResponse>;

	resolveStackTrace(request: ResolveStackTraceRequest): Promise<ResolveStackTraceResponse>;

	resolveStackTracePosition(
		request: ResolveStackTracePositionRequest
	): Promise<ResolveStackTracePositionResponse>;

	getNewRelicErrorGroup(
		request: GetNewRelicErrorGroupRequest
	): Promise<GetNewRelicErrorGroupResponse>;

	getObservabilityErrors(
		request: GetObservabilityErrorsRequest
	): Promise<GetObservabilityErrorsResponse>;

	executeThirdPartyTyped<T, R>(method: string, params: any): Promise<any>;

	track(eventName: TelemetryEventName, properties?: TelemetryData): Promise<void>;
}
