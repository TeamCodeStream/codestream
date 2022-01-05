"use strict";
import {
	CreateRepoRequest,
	CreateRepoRequestType,
	CreateRepoResponse,
	FetchReposRequest,
	FetchReposRequestType,
	FetchReposResponse,
	GetRepoRequest,
	GetRepoRequestType,
	GetRepoResponse
} from "../protocol/agent.protocol";
import { CSRepository } from "../protocol/api.protocol";
import { lsp, lspHandler } from "../system";
import { CachedEntityManagerBase, Id } from "./entityManager";

@lsp
export class ReposManager extends CachedEntityManagerBase<CSRepository> {
	@lspHandler(CreateRepoRequestType)
	createRepo(request: CreateRepoRequest): Promise<CreateRepoResponse> {
		return this.session.api.createRepo(request);
	}

	@lspHandler(FetchReposRequestType)
	async get(request?: FetchReposRequest): Promise<FetchReposResponse> {
		let repos = await this.getAllCached();
		if (request != null) {
			if (request.repoIds != null && request.repoIds.length !== 0) {
				repos = repos.filter(r => request.repoIds!.includes(r.id));
			}
		}

		return { repos: repos };
	}

	protected async loadCache() {
		const response = await this.session.api.fetchRepos({});
		const { repos, ...rest } = response;
		this.cache.reset(repos);
		this.cacheResponse(rest);
	}

	protected async fetchById(repoId: Id): Promise<CSRepository> {
		const response = await this.session.api.getRepo({ repoId: repoId });
		return response.repo;
	}

	@lspHandler(GetRepoRequestType)
	protected async getRepo(request: GetRepoRequest): Promise<GetRepoResponse> {
		const repo = await this.getById(request.repoId);
		return { repo: repo };
	}

	protected getEntityName(): string {
		return "Repository";
	}
}
