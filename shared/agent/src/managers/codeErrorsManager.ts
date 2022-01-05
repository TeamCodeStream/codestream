"use strict";
import { MessageType } from "../api/apiProvider";
import {
	ClaimCodeErrorRequest,
	ClaimCodeErrorRequestType,
	ClaimCodeErrorResponse,
	DeleteCodeErrorRequest,
	DeleteCodeErrorRequestType,
	FetchCodeErrorsRequest,
	FetchCodeErrorsRequestType,
	FetchCodeErrorsResponse,
	GetCodeErrorRequest,
	GetCodeErrorRequestType,
	GetCodeErrorResponse,
	UpdateCodeErrorRequest,
	UpdateCodeErrorRequestType,
	UpdateCodeErrorResponse
} from "../protocol/agent.protocol";
import { CSCodeError } from "../protocol/api.protocol";
import { log, lsp, lspHandler } from "../system";
import { CachedEntityManagerBase, Id } from "./entityManager";

@lsp
export class CodeErrorsManager extends CachedEntityManagerBase<CSCodeError> {
	@lspHandler(FetchCodeErrorsRequestType)
	@log()
	async get(request?: FetchCodeErrorsRequest): Promise<FetchCodeErrorsResponse> {
		let codeErrors = await this.getAllCached();
		if (request != null) {
			if (request.codeErrorIds?.length ?? 0 > 0) {
				codeErrors = codeErrors.filter(e => request.codeErrorIds!.includes(e.id));
			}
			if (request.streamIds?.length ?? 0 > 0) {
				codeErrors = codeErrors.filter(e => request.streamIds!.includes(e.streamId));
			}
		}

		return { codeErrors };
	}

	@lspHandler(GetCodeErrorRequestType)
	@log()
	async getCodeError(request: GetCodeErrorRequest): Promise<GetCodeErrorResponse> {
		const codeError = await this.getById(request.codeErrorId);
		return { codeError };
	}

	@lspHandler(UpdateCodeErrorRequestType)
	@log()
	async update(request: UpdateCodeErrorRequest): Promise<UpdateCodeErrorResponse> {
		const updateResponse = await this.session.api.updateCodeError(request);
		const [codeError] = await this.resolve({
			type: MessageType.CodeErrors,
			data: [updateResponse.codeError]
		});

		return { codeError };
	}

	@lspHandler(DeleteCodeErrorRequestType)
	@log()
	delete(request: DeleteCodeErrorRequest) {
		return this.session.api.deleteCodeError(request);
	}

	@lspHandler(ClaimCodeErrorRequestType)
	@log()
	claimCodeError(request: ClaimCodeErrorRequest): Promise<ClaimCodeErrorResponse> {
		return this.session.api.claimCodeError(request);
	}

	protected async loadCache() {
		const response = await this.session.api.fetchCodeErrors({});
		const { codeErrors, ...rest } = response;
		this.cache.reset(codeErrors);
		this.cacheResponse(rest);
	}

	async getById(id: Id): Promise<CSCodeError> {
		const codeError = await super.getById(id);
		return codeError;
	}

	protected async fetchById(codeErrorId: Id): Promise<CSCodeError> {
		const response = await this.session.api.getCodeError({ codeErrorId });
		return response.codeError;
	}

	protected getEntityName(): string {
		return "Code Error";
	}
}
