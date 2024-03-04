import {
	CreateShareableCodeErrorRequest,
	CreateShareableCodeErrorResponse,
	ExecuteThirdPartyTypedType,
	FetchCodeErrorsRequest,
	FetchCodeErrorsResponse,
	FetchPostRepliesRequest,
	FetchPostRepliesResponse,
	GetNewRelicErrorGroupRequest,
	GetNewRelicErrorGroupResponse,
	GetObservabilityErrorsRequest,
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
import { getCodeErrorsResponse } from "@codestream/webview/store/codeErrors/api/data/fetchCodeErrorsResponse";
import { getObservabilityErrorsResponse } from "@codestream/webview/store/codeErrors/api/data/getObservabilityErrorsResponse";
import {
	codeErrorId,
	getCreateSharableCodeErrorResponse,
	parentPostId,
	postId,
	streamId,
} from "@codestream/webview/store/codeErrors/api/data/createSharableCodeErrorResponse";
import { getFetchPostRepliesResponse } from "@codestream/webview/store/codeErrors/api/data/fetchPostReplies";
import { getNewRelicErrorGroupResponse } from "@codestream/webview/store/codeErrors/api/data/getNewRelicErrorGroupResponse";

class CodeErrorsApiDemo implements CodeErrorsApi {
	private _currentRepoId: string | undefined;
	private _nraiUserId: string | undefined;

	async createShareableCodeError(
		request: CreateShareableCodeErrorRequest
	): Promise<CreateShareableCodeErrorResponse> {
		return getCreateSharableCodeErrorResponse(this._currentRepoId!);
	}

	async fetchPostReplies(request: FetchPostRepliesRequest): Promise<FetchPostRepliesResponse> {
		const result = getFetchPostRepliesResponse(
			streamId,
			postId,
			parentPostId,
			codeErrorId,
			this._nraiUserId!
		);
		return result;
	}

	async fetchCodeErrors(request: FetchCodeErrorsRequest): Promise<FetchCodeErrorsResponse> {
		const response = getCodeErrorsResponse(postId, streamId, codeErrorId, this._currentRepoId!);
		return response;
		// return HostApi.instance.send(FetchCodeErrorsRequestType, request);
	}

	async getNewRelicErrorGroup(
		request: GetNewRelicErrorGroupRequest
	): Promise<GetNewRelicErrorGroupResponse> {
		const response = getNewRelicErrorGroupResponse();
		return response;
	}

	async getObservabilityErrors(
		request: GetObservabilityErrorsRequest
	): Promise<GetObservabilityErrorsResponse> {
		// return HostApi.instance.send(GetObservabilityErrorsRequestType, request);
		return this._currentRepoId ? getObservabilityErrorsResponse(this._currentRepoId) : {};
	}

	async resolveStackTrace(request: ResolveStackTraceRequest): Promise<ResolveStackTraceResponse> {
		// return resolveStackTraceResponse;
		const result = await HostApi.instance.send(ResolveStackTraceRequestType, request);
		return result;
	}

	async resolveStackTracePosition(
		request: ResolveStackTracePositionRequest
	): Promise<ResolveStackTracePositionResponse> {
		// return resolveStackTracePosition;
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

	setCurrentRepoId(repoId: string) {
		this._currentRepoId = repoId;
	}

	setNrAiUserId(userId: string): void {
		this._nraiUserId = userId;
	}
}

export const codeErrorsApiDemo = new CodeErrorsApiDemo();
