import {
	ClaimCodeErrorRequest,
	ClaimCodeErrorResponse,
	CreateShareableCodeErrorRequest,
	CreateShareableCodeErrorResponse,
	FetchCodeErrorsRequest,
	FetchCodeErrorsResponse,
	FetchPostRepliesRequest,
	FetchPostRepliesResponse,
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

	fetchPostReplies(request: FetchPostRepliesRequest): Promise<FetchPostRepliesResponse>;

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

	claimCodeError(request: ClaimCodeErrorRequest): Promise<ClaimCodeErrorResponse>;

	executeThirdPartyTyped<T, R>(method: string, providerId: string, params: any): Promise<any>;

	track(eventName: TelemetryEventName, properties?: TelemetryData): Promise<void>;

	setCurrentRepoId(repoId: string): void;

	setNrAiUserId(userId: string): void;

	setCurrentEntityId(entityId: string): void;
}
