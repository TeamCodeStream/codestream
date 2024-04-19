"use strict";
import {
	FetchReposRequest,
	FetchReposRequestType,
	FetchReposResponse,
	GetRepoRequest,
	GetRepoRequestType,
	GetRepoResponse,
	MatchReposRequest,
	MatchReposRequestType,
	MatchReposResponse,
} from "@codestream/protocols/agent";
import { CSRemote, CSRepository } from "@codestream/protocols/api";
import { lsp, lspHandler } from "../system";
import { SessionContainer } from "../container";

@lsp
export class ReposManager {
	@lspHandler(FetchReposRequestType)
	async get(request?: FetchReposRequest): Promise<FetchReposResponse> {
		const { scm } = SessionContainer.instance();
		const repositoryMappings = SessionContainer.instance().repositoryMappings;

		const reposResponse = await scm.getRepos({ includeRemotes: true });

		const repos: CSRepository[] = [];
		for (const repoInstance of reposResponse.repositories ?? []) {
			// const name = getRepoName({ path: repoInstance.path });
			const remotesPromise: Promise<CSRemote[]> = Promise.all(
				repoInstance.remotes?.map(async remote => {
					const normalizedUrlResult = await repositoryMappings.normalizeUrl({
						url: remote.rawUrl!,
					});
					return <CSRemote>{
						url: remote.rawUrl,
						companyIdentifier: "",
						normalizedUrl: normalizedUrlResult.normalizedUrl,
					};
				}) || []
			);

			const remotes = await remotesPromise;

			if (repoInstance.id) {
				const repo: CSRepository = {
					id: repoInstance.id,
					name: repoInstance.name,
					remotes,
					teamId: "",
					createdAt: 0,
					modifiedAt: 0,
					creatorId: "",
				};
				repos.push(repo);
			}
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

	// TODO Maybe this should either be 1 remote at a time or correlate
	//  response array entries to request entries
	@lspHandler(MatchReposRequestType)
	async matchRepos(request: MatchReposRequest): Promise<MatchReposResponse> {
		const knownRepos = await this.get();
		const foundRepos: CSRepository[] = [];
		for (const repo of request.repos) {
			for (const remote of repo.remotes) {
				const lowerRemote = remote.toLocaleLowerCase();
				const found = knownRepos.repos.find(_ =>
					_.remotes.map(_ => _.normalizedUrl.toLocaleLowerCase()).includes(lowerRemote)
				);
				if (found) {
					foundRepos.push(found);
					break;
				}
			}
		}
		return {
			repos: foundRepos,
		};
	}

	async getById(id: string): Promise<CSRepository | undefined> {
		const response = await this.get();
		return response.repos.find(repo => repo.id === id);
	}
}
