import {
	CreateShareableCodeErrorRequest,
	CreateShareableCodeErrorRequestType,
	CreateShareableCodeErrorResponse,
	ExecuteThirdPartyTypedType,
	FetchCodeErrorsRequest,
	FetchCodeErrorsRequestType,
	FetchCodeErrorsResponse,
	GetNewRelicErrorGroupRequest,
	GetNewRelicErrorGroupRequestType,
	GetNewRelicErrorGroupResponse,
	GetObservabilityErrorsRequest,
	GetObservabilityErrorsRequestType,
	GetObservabilityErrorsResponse,
	ResolveStackTracePositionRequest,
	ResolveStackTracePositionRequestType,
	ResolveStackTracePositionResponse,
	ResolveStackTraceRequest,
	ResolveStackTraceRequestType,
	ResolveStackTraceResponse,
	TelemetryData,
	TelemetryEventName,
	UpdateCodeErrorRequest,
	UpdateCodeErrorRequestType,
	UpdateCodeErrorResponse,
} from "@codestream/protocols/agent";

import { CodeErrorsApi } from "@codestream/webview/store/codeErrors/api/CodeErrorsApi";
import { HostApi } from "@codestream/webview/webview-api";

export class CodeErrorsApiImpl implements CodeErrorsApi {
	async createShareableCodeError(
		request: CreateShareableCodeErrorRequest
	): Promise<CreateShareableCodeErrorResponse> {
		return HostApi.instance.send(CreateShareableCodeErrorRequestType, request);
	}

	async fetchCodeErrors(request: FetchCodeErrorsRequest): Promise<FetchCodeErrorsResponse> {
		return HostApi.instance.send(FetchCodeErrorsRequestType, request);
	}

	async getNewRelicErrorGroup(
		request: GetNewRelicErrorGroupRequest
	): Promise<GetNewRelicErrorGroupResponse> {
		return HostApi.instance.send(GetNewRelicErrorGroupRequestType, request);
	}

	async getObservabilityErrors(
		request: GetObservabilityErrorsRequest
	): Promise<GetObservabilityErrorsResponse> {
		return HostApi.instance.send(GetObservabilityErrorsRequestType, request);
	}

	async resolveStackTrace(request: ResolveStackTraceRequest): Promise<ResolveStackTraceResponse> {
		const result = await HostApi.instance.send(ResolveStackTraceRequestType, request);
		return result;
	}

	async resolveStackTracePosition(
		request: ResolveStackTracePositionRequest
	): Promise<ResolveStackTracePositionResponse> {
		const result = await HostApi.instance.send(ResolveStackTracePositionRequestType, request);
		return result;
	}

	async updateCodeErrors(request: UpdateCodeErrorRequest): Promise<UpdateCodeErrorResponse> {
		return HostApi.instance.send(UpdateCodeErrorRequestType, request);
	}

	async executeThirdPartyTyped<T, R>(method: string, params: any): Promise<any> {
		return await HostApi.instance.send(new ExecuteThirdPartyTypedType<T, R>(), {
			method: method,
			providerId: "newrelic*com",
			params: params,
		});
	}

	async track(eventName: TelemetryEventName, properties?: TelemetryData): Promise<void> {
		return HostApi.instance.track(eventName, properties);
	}
}
