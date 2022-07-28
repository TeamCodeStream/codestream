"use strict";

import * as grpcLibrary from "@grpc/grpc-js";
import * as grpcProtoLoader from "@grpc/proto-loader";
import Long from "long";
import os from "os";
import path from "path";
import * as protobuf from "protobufjs";
import { SessionContainer } from "../container";
import { Logger } from "../logger";
import {
	PixieCluster,
	PixieDynamicLoggingCancelRequest,
	PixieDynamicLoggingCancelRequestType,
	PixieDynamicLoggingReponse,
	PixieDynamicLoggingRequest,
	PixieDynamicLoggingRequestType,
	PixieDynamicLoggingResultNotification,
	PixieGetClustersRequest,
	PixieGetClustersRequestType,
	PixieGetClustersResponse,
	PixieGetNamespacesRequest,
	PixieGetNamespacesRequestType,
	PixieGetNamespacesResponse,
	PixieGetPodsRequest,
	PixieGetPodsRequestType,
	PixieGetPodsResponse,
	PixiePod
} from "../protocol/agent.protocol";
import { NewRelicProvider } from "../providers/newrelic";
import { CodeStreamSession } from "../session";
import { getProvider, Strings } from "../system";
import { lsp, lspHandler } from "../system/decorators/lsp";
const padLeft = Strings.padLeft;

// see: https://www.npmjs.com/package/protobufjs
protobuf.util.Long = Long;
protobuf.configure();

const DYNAMIC_LOGGING_SCRIPT_TEMPLATE = `
import pxtrace
import px

upid = '$UPID$'

@pxtrace.probe("$PROBE_PATH$")
def probe_func():
    return [{
        $FUNCTION_PARAMETERS$
        'latency': pxtrace.FunctionLatency()
    }]

pxtrace.UpsertTracepoint('$TRACEPOINT_NAME$',
                         '$TRACEPOINT_NAME$',
                         probe_func,
                         px.uint128(upid),
                         "5m")

px.display(px.DataFrame(table='$TRACEPOINT_NAME$'))
`;

@lsp
export class PixieManager {
	constructor(public readonly session: CodeStreamSession) {}

	private _dynamicLoggingActiveRequests = new Set<string>();

	@lspHandler(PixieGetClustersRequestType)
	async getClusters(request: PixieGetClustersRequest): Promise<PixieGetClustersResponse> {
		const cloudApiPath = path.join(
			os.homedir(),
			".codestream",
			"protobuf",
			"pixie",
			"cloudapi.proto"
		);
		const cloudApiProto = await grpcProtoLoader.load(cloudApiPath);
		const cloudApiPackage = grpcLibrary.loadPackageDefinition(cloudApiProto);
		const cloudApi = cloudApiPackage.px as any;

		const clusterInfo = new cloudApi.cloudapi.VizierClusterInfo(
			"work.withpixie.ai",
			await this.buildCredentials(request.accountId)
		);

		return new Promise<PixieGetClustersResponse>((resolve, reject) => {
			clusterInfo.getClusterInfo({}, function(err: any, response: { clusters: PixieCluster[] }) {
				if (err) {
					reject(new Error(err.message || err.toString()));
				} else {
					resolve({
						clusters: response.clusters
							.sort((a, b) =>
								a.clusterName.toLowerCase() > b.clusterName.toLowerCase()
									? 1
									: b.clusterName.toLowerCase() > a.clusterName.toLowerCase()
									? -1
									: 0
							)
							.map(_ => {
								const id = {
									high: newLong(_.id!.highBits),
									low: newLong(_.id!.lowBits)
								};
								const clusterId = formatId(id);
								return {
									clusterId,
									clusterName: _.clusterName
								};
							})
					});
				}
			});
		});
	}

	@lspHandler(PixieGetNamespacesRequestType)
	async getNamespaces(request: PixieGetNamespacesRequest): Promise<PixieGetNamespacesResponse> {
		const vizier = await this.getVizierService(request.accountId);

		const script = `
import px
df = px.DataFrame(table='process_stats', start_time='-30s')
df.namespace = df.ctx['namespace']
df = df.groupby('namespace').agg()
px.display(df[['namespace']])
`;

		const call = vizier.executeScript({
			queryStr: script,
			clusterId: request.clusterId
		});

		return new Promise<PixieGetNamespacesResponse>((resolve, reject) => {
			let error: string | undefined;
			let namespaces: string[] | undefined;
			call.on("data", (response: any) => {
				const batch = response?.data?.batch;
				if (batch?.cols?.length) {
					if (!namespaces) {
						namespaces = [];
					}
					const numRows = batch.numRows ? newLong(batch.numRows).toInt() : 0;
					const namespacesCol = colValue<string>(batch.cols[0]);
					for (let i = 0; i < numRows; i++) {
						namespaces.push(namespacesCol![i]);
					}
				}
			});
			call.on("error", (e: any) => {
				error = e.message || e.toString();
			});
			call.on("status", (status: any) => {
				Logger.debug(status);
			});
			call.on("end", () => {
				if (namespaces) {
					resolve({
						namespaces: namespaces.sort()
					});
				} else {
					reject(new Error(error || "Error fetching namespaces"));
				}
			});
		});
	}

	@lspHandler(PixieGetPodsRequestType)
	async getPods(request: PixieGetPodsRequest): Promise<PixieGetPodsResponse> {
		const vizier = await this.getVizierService(request.accountId);

		const script = `
import px
namespace = '${request.namespace}'
df = px.DataFrame(table='process_stats', start_time='-30s')
df = df[df.ctx['namespace'] == namespace]
df.pod = df.ctx['pod_name']
df = df.groupby(['upid', 'pod']).agg()
px.display(df[['upid', 'pod']])`;

		const call = vizier.executeScript({
			queryStr: script,
			clusterId: request.clusterId
		});

		return new Promise<PixieGetPodsResponse>((resolve, reject) => {
			let error: string | undefined;
			let pods: Map<string, string> | undefined;
			call.on("data", (response: any) => {
				const batch = response?.data?.batch;
				if (batch?.cols?.length) {
					if (!pods) {
						pods = new Map();
					}
					const numRows = batch.numRows ? newLong(batch.numRows).toInt() : 0;
					const upids = colValue<{ high: Long; low: Long }>(batch.cols[0]);
					const names = colValue<string>(batch.cols[1]) as string[];
					for (let i = 0; i < numRows; i++) {
						const upid = formatId(upids![i]);
						pods.set(upid, names[i]);
					}
				}
			});
			call.on("error", (e: any) => {
				error = e.message || e.toString();
			});
			call.on("status", (status: any) => {
				Logger.debug(status);
			});
			call.on("end", () => {
				if (pods) {
					const podsArray = Array.from(pods, ([key, value]) => ({
						upid: key,
						name: value
					})).sort((a, b) =>
						a.name.toLowerCase() > b.name.toLowerCase()
							? 1
							: b.name.toLowerCase() > a.name.toLowerCase()
							? -1
							: 0
					);

					resolve({
						pods: podsArray
					});
				} else {
					reject(new Error(error || "Error fetching pods"));
				}
			});
		});
	}

	@lspHandler(PixieDynamicLoggingRequestType)
	async dynamicLogging(request: PixieDynamicLoggingRequest): Promise<PixieDynamicLoggingReponse> {
		const { session } = SessionContainer.instance();
		const limitRows = request.limitRows || 50;
		const limitSeconds = request.limitSeconds || 60;
		const now = Date.now();
		const expiration = now + limitSeconds * 1000;
		const id = now.toString();

		const vizier = await this.getVizierService(request.accountId);

		let parametersScript = "";
		for (const parameter of request.functionParameters) {
			parametersScript += `'${parameter.name}': pxtrace.ArgExpr("${parameter.name}"),\n`;
		}
		const probePath = request.functionReceiver
			? `${request.packageName}.(${request.functionReceiver}).${request.functionName}`
			: `${request.packageName}.${request.functionName}`;

		const script = DYNAMIC_LOGGING_SCRIPT_TEMPLATE.replace(/\$PROBE_PATH\$/g, probePath)
			.replace(/\$TRACEPOINT_NAME\$/g, `${request.functionName}_data_${id}`)
			.replace(/\$FUNCTION_PARAMETERS\$/g, parametersScript)
			.replace(/\$UPID\$/g, request.upid);

		const promise = new Promise<PixieDynamicLoggingReponse>((resolve, reject) => {
			const poller = () => {
				let metaData: string[] = [];
				const data: any[] = [];
				let error: string | undefined;
				let callStatus: string | undefined;

				const call = vizier.executeScript({
					queryStr: script,
					clusterId: request.clusterId,
					mutation: true
				});
				call.on("data", function(response: any) {
					if (response.metaData) {
						metaData = (response.metaData.relation.columns as any[]).map(c => c.columnName);
					}
					const batch = response.data?.batch;
					if (batch?.cols) {
						const cols = batch.cols.map((c: any) => colValue(c));
						const numRows = batch.numRows ? newLong(batch.numRows).toInt() : 0;

						for (let r = 0; r < numRows; r++) {
							const row: any = {};
							for (let c = 0; c < cols.length; c++) {
								const values = cols[c];
								const key = metaData[c];
								if (key) {
									const value = values[r];
									row[key] = value;
								}
							}
							data.push(row);
						}
					}
				});
				call.on("error", function(err: any) {
					if (
						err.message ===
						"14 UNAVAILABLE: rpc error: code = Unavailable desc = probe installation in progress"
					) {
						callStatus = "Installing probe...";
					} else if (
						err.message ===
						"14 UNAVAILABLE: rpc error: code = Unavailable desc = Schema is not ready yet"
					) {
						callStatus = "Setting up schema...";
					} else {
						error = err.toString();
					}
				});
				call.on("status", function(s: any) {
					if (s?.details?.length) {
						if (
							s.details === "rpc error: code = Unavailable desc = probe installation in progress"
						) {
							callStatus = "Installing probe...";
						} else if (
							s.details === "rpc error: code = Unavailable desc = Schema is not ready yet"
						) {
							callStatus = "Setting up schema...";
						} else {
							callStatus = s.details;
						}
					}
				});
				call.on("end", () => {
					const expired = Date.now() > expiration;
					const cancelled = !this._dynamicLoggingActiveRequests.has(id);
					const done = expired || cancelled || data.length > limitRows;
					const status = expired
						? "Done (timeout)"
						: cancelled
						? "Cancelled"
						: callStatus
						? callStatus
						: done
						? "Done"
						: "Capturing";
					postProcess(data, metaData);
					session.agent.sendNotification(PixieDynamicLoggingResultNotification, {
						id,
						metaData,
						data,
						status,
						error,
						done
					});

					if (!done) {
						setTimeout(poller, 5000);
					} else {
						this._dynamicLoggingActiveRequests.delete(id);
					}
				});
			};
			this._dynamicLoggingActiveRequests.add(id);
			poller();
			resolve({ id });
		});

		return promise;
	}

	@lspHandler(PixieDynamicLoggingCancelRequestType)
	dynamicLoggingCancel(request: PixieDynamicLoggingCancelRequest) {
		this._dynamicLoggingActiveRequests.delete(request.id);
	}

	private async buildCredentials(accountId: number) {
		const nrProvider = getProvider("newrelic*com") as NewRelicProvider;
		if (nrProvider != null) {
			const token = await nrProvider.getPixieToken(accountId);
			return grpcLibrary.credentials.combineChannelCredentials(
				grpcLibrary.credentials.createSsl(),
				grpcLibrary.credentials.createFromMetadataGenerator((params, callback) => {
					const md = new grpcLibrary.Metadata();
					md.set("authorization", "Bearer " + token);
					md.set("pixie-api-client", "codestream");
					return callback(null, md);
				})
			);
		} else {
			throw new Error("Not connected to New Relic");
		}
	}

	private async getVizierService(accountId: number) {
		const vizierApi = await this.getVizierApi();
		return new vizierApi.api.vizierpb.VizierService(
			"work.withpixie.ai",
			await this.buildCredentials(accountId)
		);
	}

	private _vizierApi: any;

	private async getVizierApi() {
		if (this._vizierApi) {
			return this._vizierApi;
		}

		const vizierApiPath = path.join(
			os.homedir(),
			".codestream",
			"protobuf",
			"pixie",
			"vizierapi.proto"
		);
		const vizierApiProto = await grpcProtoLoader.load(vizierApiPath);
		const vizierApiPackage = grpcLibrary.loadPackageDefinition(vizierApiProto);
		this._vizierApi = vizierApiPackage.px as any;
		return this._vizierApi;
	}
}

function colValue<T>(col: any): T[] | undefined {
	if (col?.uint128Data?.data?.length) {
		return col.uint128Data.data;
	}
	if (col?.time64nsData?.data?.length) {
		return col.time64nsData.data.map((_: any) => newLong(_).toString());
	}
	if (col?.int64Data?.data?.length) {
		return col.int64Data.data.map((_: any) => newLong(_).toString());
	}

	if (col?.stringData?.data) {
		return col.stringData.data as T[];
	}

	return undefined;
}

function newLong(longLike: any): Long {
	return new Long(longLike.low, longLike.high, longLike.unsigned);
}

function formatId(id: { high: Long; low: Long }): string {
	const highStr = padLeft(id.high.toString(16), 16, "0");
	const lowStr = padLeft(id.low.toString(16), 16, "0");
	const str = highStr + lowStr;
	const formatted = `${str.substring(0, 8)}-${str.substring(8, 12)}-${str.substring(
		12,
		16
	)}-${str.substring(16, 20)}-${str.substring(20, 32)}`;
	return formatted;
}

function postProcess(data: any[], metaData: string[]) {
	for (const rowObject of data) {
		for (let i = 0; i < metaData.length; i++) {
			const columnName = metaData[i];
			const value = rowObject[columnName];
			if (typeof value === "string") {
				try {
					const parsed = JSON.parse(value);
					if (parsed.hasOwnProperty("array") && parsed.hasOwnProperty("len")) {
						// handle Go arrays
						const len = parsed["len"];
						if (typeof len === "number") {
							rowObject[columnName] = `array[${len}]`;
							continue;
						}
					}
				} catch (ignore) {}
			}
			if (i === metaData.length - 1 && metaData[i] === "latency") {
				try {
					rowObject[columnName] = numberWithCommas(value) + " ns";
				} catch (ignore) {}
			}
		}
	}
}

function numberWithCommas(x: number) {
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
