"use strict";

import { NotificationType, RequestType } from "vscode-languageserver-protocol";

export interface PixieDynamicLoggingFunctionParameter {
	name: string;
}

export interface PixieDynamicLoggingRequest {
	accountId: number;
	clusterId: string;
	upid: string;
	functionName: string;
	functionParameters: PixieDynamicLoggingFunctionParameter[];
	functionReceiver?: string;
	packageName: string;
	limitRows?: number;
	limitSeconds?: number;
}

export interface PixieDynamicLoggingReponse {
	id: string;
}

export const PixieDynamicLoggingRequestType = new RequestType<
	PixieDynamicLoggingRequest,
	PixieDynamicLoggingReponse,
	void,
	void
>("codestream/pixie/dynamicLogging");

export interface PixieDynamicLoggingCancelRequest {
	id: string;
}

export const PixieDynamicLoggingCancelRequestType = new RequestType<
	PixieDynamicLoggingCancelRequest,
	void,
	void,
	void
>("codestream/pixie/dynamicLoggingCancel");

export interface PixieDynamicLoggingEventNotification {
	id: string;
	metaData?: string[];
	data?: { [key: string]: string }[];
	error?: string;
	status: string;
	done: boolean;
}

export const PixieDynamicLoggingResultNotification = new NotificationType<
	PixieDynamicLoggingEventNotification,
	void
>("codestream/pixie/dynamicLoggingEvent");

interface PixieLong {
	high: number;
	low: number;
	unsigned: boolean;
}

export interface PixieCluster {
	id?: {
		highBits: PixieLong;
		lowBits: PixieLong;
	};
	clusterId: string;
	clusterName: string;
}

export interface PixieGetClustersRequest {
	accountId: number;
}

export interface PixieGetClustersResponse {
	clusters: PixieCluster[];
}

export const PixieGetClustersRequestType = new RequestType<
	PixieGetClustersRequest,
	PixieGetClustersResponse,
	void,
	void
>("codestream/pixie/clusters");

export interface PixieGetNamespacesRequest {
	accountId: number;
	clusterId: string;
}

export interface PixieGetNamespacesResponse {
	namespaces: string[];
}

export const PixieGetNamespacesRequestType = new RequestType<
	PixieGetNamespacesRequest,
	PixieGetNamespacesResponse,
	void,
	void
>("codestream/pixie/namespaces");

export interface PixiePod {
	upid: string;
	name: string;
}

export interface PixieGetPodsRequest {
	accountId: number;
	clusterId: string;
	namespace: string;
}

export interface PixieGetPodsResponse {
	pods: PixiePod[];
}

export const PixieGetPodsRequestType = new RequestType<
	PixieGetPodsRequest,
	PixieGetPodsResponse,
	void,
	void
>("codestream/pixie/pods");
