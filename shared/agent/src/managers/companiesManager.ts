"use strict";
import {
	FetchCompaniesRequest,
	FetchCompaniesRequestType,
	FetchCompaniesResponse
} from "../protocol/agent.protocol";
import { CSCompany } from "../protocol/api.protocol";
import { lsp, lspHandler } from "../system";
import { CachedEntityManagerBase, Id } from "./entityManager";

@lsp
export class CompaniesManager extends CachedEntityManagerBase<CSCompany> {
	@lspHandler(FetchCompaniesRequestType)
	async get(request?: FetchCompaniesRequest): Promise<FetchCompaniesResponse> {
		let companies = await this.getAllCached();
		if (request != null) {
			if (request.companyIds != null && request.companyIds.length !== 0) {
				companies = companies.filter(t => request.companyIds!.includes(t.id));
			}
		}

		return { companies };
	}


	protected async loadCache() {
		const response = await this.session.api.fetchCompanies({ mine: true });
		const { companies, ...rest } = response;
		this.cache.reset(companies);
		this.cacheResponse(rest);
	}

	protected async fetchById(companyId: Id): Promise<CSCompany> {
		const response = await this.session.api.getCompany({ companyId });
		return response.company;
	}

	protected getEntityName(): string {
		return "Company";
	}
}
