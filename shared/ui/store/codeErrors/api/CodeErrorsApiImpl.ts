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
		const result = await HostApi.instance.send(CreateShareableCodeErrorRequestType, request);
		return result;
	}

	async fetchCodeErrors(request: FetchCodeErrorsRequest): Promise<FetchCodeErrorsResponse> {
		const result = await HostApi.instance.send(FetchCodeErrorsRequestType, request);
		return result;
	}

	async getNewRelicErrorGroup(
		request: GetNewRelicErrorGroupRequest
	): Promise<GetNewRelicErrorGroupResponse> {
		const result = await HostApi.instance.send(GetNewRelicErrorGroupRequestType, request);
		return result;
	}

	async getObservabilityErrors(
		request: GetObservabilityErrorsRequest
	): Promise<GetObservabilityErrorsResponse> {
		const result = await HostApi.instance.send(GetObservabilityErrorsRequestType, request);
		return result;
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
		const result = await HostApi.instance.send(UpdateCodeErrorRequestType, request);
		return result;
	}

	async executeThirdPartyTyped<T, R>(method: string, params: any): Promise<any> {
		return await HostApi.instance.send(new ExecuteThirdPartyTypedType<T, R>(), {
			method: method,
			providerId: "newrelic*com",
			params: params,
		});
	}

	async track(eventName: TelemetryEventName, properties?: TelemetryData): Promise<void> {
		const result = await HostApi.instance.track(eventName, properties);
		return result;
	}
}
