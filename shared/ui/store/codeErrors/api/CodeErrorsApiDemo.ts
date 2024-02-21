import {
	CreateShareableCodeErrorRequest,
	CreateShareableCodeErrorRequestType,
	CreateShareableCodeErrorResponse,
	ExecuteThirdPartyTypedType,
	FetchCodeErrorsRequest,
	FetchCodeErrorsResponse,
	GetNewRelicErrorGroupRequest,
	GetNewRelicErrorGroupRequestType,
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
	UpdateCodeErrorRequestType,
	UpdateCodeErrorResponse,
} from "@codestream/protocols/agent";

import { CodeErrorsApi } from "@codestream/webview/store/codeErrors/api/CodeErrorsApi";
import { HostApi } from "@codestream/webview/webview-api";
import { codeErrorsResponse } from "@codestream/webview/store/codeErrors/api/data/fetchCodeErrorsResponse";
import { observabilityErrorsResponse } from "@codestream/webview/store/codeErrors/api/data/getObservabilityErrorsResponse";
import { resolveStackTraceResponse } from "@codestream/webview/store/codeErrors/api/data/resolveStackTraceResponse";
import { resolveStackTracePosition } from "@codestream/webview/store/codeErrors/api/data/resolveStackTracePosition";

export class CodeErrorsApiDemo implements CodeErrorsApi {
	async createShareableCodeError(
		request: CreateShareableCodeErrorRequest
	): Promise<CreateShareableCodeErrorResponse> {
		return HostApi.instance.send(CreateShareableCodeErrorRequestType, request);
	}

	async fetchCodeErrors(request: FetchCodeErrorsRequest): Promise<FetchCodeErrorsResponse> {
		return codeErrorsResponse;
		// return HostApi.instance.send(FetchCodeErrorsRequestType, request);
	}

	async getNewRelicErrorGroup(
		request: GetNewRelicErrorGroupRequest
	): Promise<GetNewRelicErrorGroupResponse> {
		return HostApi.instance.send(GetNewRelicErrorGroupRequestType, request);
	}

	async getObservabilityErrors(
		request: GetObservabilityErrorsRequest
	): Promise<GetObservabilityErrorsResponse> {
		// return HostApi.instance.send(GetObservabilityErrorsRequestType, request);
		return observabilityErrorsResponse;
	}

	async resolveStackTrace(request: ResolveStackTraceRequest): Promise<ResolveStackTraceResponse> {
		return resolveStackTraceResponse;
	}

	async resolveStackTracePosition(
		request: ResolveStackTracePositionRequest
	): Promise<ResolveStackTracePositionResponse> {
		return resolveStackTracePosition;
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
