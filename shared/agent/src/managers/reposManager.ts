"use strict";
import {
	FetchReposRequest,
	FetchReposRequestType,
	FetchReposResponse,
	GetRepoRequest,
	GetRepoRequestType,
	GetRepoResponse,
} from "@codestream/protocols/agent";
import { CSRepository } from "@codestream/protocols/api";

import { lsp, lspHandler } from "../system";
import { SessionContainer } from "../container";
import { getNrContainer } from "../providers/newrelic/nrContainer";

@lsp
export class ReposManager {
	@lspHandler(FetchReposRequestType)
	async get(request?: FetchReposRequest): Promise<FetchReposResponse> {
		const { git, nr } = SessionContainer.instance();
		const nrContainer = getNrContainer();

		const observabilityReposResponse = await nrContainer.repos.getObservabilityRepos({});

		const repos: CSRepository[] = [];
		for (const observabilityRepo of observabilityReposResponse.repos!!) {
			const repo: CSRepository = {
				id: observabilityRepo.repoId,
				name: observabilityRepo.repoName,
				remotes: [
					{
						url: observabilityRepo.repoRemote,
						normalizedUrl: observabilityRepo.repoRemote,
						companyIdentifier: "",
					},
				],
				teamId: "",
				createdAt: 0,
				modifiedAt: 0,
				creatorId: "",
			};
			repos.push(repo);
		}

		return { repos };
	}

	@lspHandler(GetRepoRequestType)
	async getRepo(request: GetRepoRequest): Promise<GetRepoResponse> {
		const repo = await this.getById(request.repoId);
		return { repo: repo };
	}

	protected getEntityName(): string {
		return "Repository";
	}

	async getById(id: string): Promise<CSRepository> {
		const response = await this.get();
		return response.repos.find(repo => repo.id === id)!!;
	}
}
