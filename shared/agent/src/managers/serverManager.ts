import { Logger } from "../logger";
import { CodeStreamSession } from "../session";
import * as qs from "querystring";
import {
	CodeStreamApiDeleteRequestType,
	CodeStreamApiGetRequestType,
	CodeStreamApiPostRequestType,
	CodeStreamApiPutRequestType
} from "../protocol/agent.protocol";
import { lsp, lspHandler } from "../system";

@lsp
export class ServerManager {
	constructor(private readonly session: CodeStreamSession) {}

	@lspHandler(CodeStreamApiGetRequestType)
	async get(request: { url: string; queryData: object }): Promise<any> {
		try {
			if (request.queryData) {
				request.url += `?${qs.stringify(request.queryData)}`;
			}
			return this.session.api.get(request.url);
		} catch (e) {
			Logger.error(e, "Could not GET", {
				url: request.url
			});
		}
	}

	@lspHandler(CodeStreamApiPostRequestType)
	async post(request: { url: string; body?: any }): Promise<any> {
		try {
			let response;
			if (request.url.indexOf("/upload-file") === 0) {
				const len = Object.keys(request.body.buffer).length;
				// pivot the object back into an array
				const arr = [];
				for (let i = 0; i < len; i++) {
					arr[i] = request.body.buffer[i];
				}
				// TODO remove the await
				response = await this.session.api.post(request.url, arr);
			} else {
				// TODO remove the await
				response = await this.session.api.post(request.url, request.body);
			}
			return response;
		} catch (e) {
			Logger.error(e, "Could not POST", {
				url: request.url
			});
		}
	}

	@lspHandler(CodeStreamApiPutRequestType)
	async put(request: { url: string; body?: any }): Promise<any> {
		try {
			return this.session.api.put(request.url, request.body);
		} catch (e) {
			Logger.error(e, "Could not PUT", {
				url: request.url
			});
		}
	}

	@lspHandler(CodeStreamApiDeleteRequestType)
	async delete(request: { url: string }): Promise<any> {
		try {
			return this.session.api.delete(request.url);
		} catch (e) {
			Logger.error(e, "Could not DELETE", {
				url: request.url
			});
		}
	}
}
