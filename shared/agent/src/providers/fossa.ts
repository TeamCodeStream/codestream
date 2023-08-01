import Cache from "timed-cache";
import * as qs from "querystring";
import {
	FetchThirdPartyCodeAnalyzersRequest,
	FetchThirdPartyLicenseDependenciesResponse,
	FetchThirdPartyRepoMatchToFossaRequest,
	FetchThirdPartyRepoMatchToFossaResponse,
	FetchThirdPartyVulnerabilitiesResponse,
	ReposScm,
	ThirdPartyProviderConfig,
} from "@codestream/protocols/agent";
import { log, lspProvider } from "../system";
import { CodeStreamSession } from "session";
import { GitRemoteParser } from "../git/parsers/remoteParser";

import {
	FossaProject,
	GetFossaProjectsResponse,
	LicenseDependencyIssues,
	VulnerabilityIssues,
	IssueParams,
} from "../../../util/src/protocol/agent/agent.protocol.fossa";
import { ThirdPartyCodeAnalyzerProviderBase } from "./thirdPartyCodeAnalyzerProviderBase";
import { CSFossaProviderInfo } from "@codestream/protocols/api";
import { SessionContainer } from "../container";
import { Logger } from "../logger";

@lspProvider("fossa")
export class FossaProvider extends ThirdPartyCodeAnalyzerProviderBase<CSFossaProviderInfo> {
	private _fossaProjectCache = new Cache<GetFossaProjectsResponse>({ defaultTtl: 30000 * 1000 }); // 5 minutes
	private _fossaProjectCacheKey = "projects";

	constructor(
		public readonly session: CodeStreamSession,
		protected readonly providerConfig: ThirdPartyProviderConfig,
	) {
		super(session, providerConfig);
	}

	get displayName() {
		return "Fossa.com";
	}

	get name() {
		return "fossa";
	}

	get headers() {
		return {
			Accept: "application/json",
			Authorization: `Bearer ${this.accessToken}`,
		};
	}

	get apiPath() {
		return "/api/v2";
	}

	get apiUrl() {
		return "https://fossa.com";
	}

	get appUrl() {
		return "https://app.fossa.com";
	}

	get baseUrl() {
		return `${this.appUrl}${this.apiPath}`;
	}

	/**
	 * Query string for Fossa Issues API
	 * @returns query string
	 */
	private _getIssuesUrl(
		projectId: string,
		type: string,
		category: string,
		page: number,
		sort?: string,
	): string {
		return `/issues?${qs.stringify({
			category,
			page,
			sort,
		})}&scope[id]=${encodeURIComponent(projectId)}&scope[type]=${type}`;
	}

	/**
	 * Repos that are opened in the editor
	 * @returns array of owner/repo strings
	 */
	private async _getCurrentRepo(repoId?: string): Promise<ReposScm[]> {
		if (!repoId) return [];
		const { scm } = SessionContainer.instance();
		const reposResponse = await scm.getRepos({
			inEditorOnly: true,
			includeProviders: true,
			includeCurrentBranches: true,
		});
		if (!reposResponse.repositories || !reposResponse.repositories.length) return [];
		return reposResponse.repositories.filter(_ => _.id === repoId);
	}

	/**
	 * Projects that are uploaded to Fossa
	 * @returns array of projects
	 */
	private async _getProjects(): Promise<FossaProject[]> {
		const cached = this._fossaProjectCache.get(this._fossaProjectCacheKey);
		let projects: FossaProject[] = [];
		if (cached) {
			projects = cached.projects;
			Logger.log("getFossaProjects: from cache", {
				cacheKey: this._fossaProjectCacheKey,
			});
		} else {
			const projsResponse = await this.get<GetFossaProjectsResponse>("/projects");
			if (projsResponse.body) {
				this._fossaProjectCache.put(this._fossaProjectCacheKey, projsResponse.body);
				projects = projsResponse.body.projects;
				Logger.log(
					`getFossaProjects: from Fossa API, project size ${projsResponse.body.projects}`,
					{
						cacheKey: this._fossaProjectCacheKey,
					},
				);
			}
		}
		return projects;
	}

	/**
	 * Matches current repo to Fossa project
	 * @returns project object
	 */
	private async _matchRepoToFossaProject(
		currentRepo: ReposScm,
		fossaProjects: FossaProject[],
		repoId?: string,
	): Promise<FossaProject | undefined> {
		if (repoId) {
			for (const project of fossaProjects) {
				let parsed;
				try {
					parsed = await GitRemoteParser.parseGitUrl(project.title);
				} catch (err) {
					Logger.error(err);
				}
				if (parsed) {
					const [, domain, path] = parsed;
					const folderName = path.split("/").pop();
					if (
						currentRepo.folder.name === folderName &&
						currentRepo.providerGuess &&
						domain.includes(currentRepo.providerGuess)
					) {
						return project;
					}
				}
			}
		}
		return;
	}

	@log()
	async fetchIsRepoMatch(
		request: FetchThirdPartyRepoMatchToFossaRequest,
	): Promise<FetchThirdPartyRepoMatchToFossaResponse> {
		const [currentRepo] = await this._getCurrentRepo(request.repoId);
		if (!currentRepo) {
			return { isRepoMatch: false };
		}
		const projects: FossaProject[] = await this._getProjects();
		const project = await this._matchRepoToFossaProject(currentRepo, projects, request.repoId);
		if (!project) {
			return { isRepoMatch: false };
		}
		return { isRepoMatch: true };
	}

	@log()
	async fetchLicenseDependencies(
		request: FetchThirdPartyCodeAnalyzersRequest,
		params: IssueParams,
	): Promise<FetchThirdPartyLicenseDependenciesResponse> {
		try {
			const [currentRepo] = await this._getCurrentRepo(request.repoId);
			if (!currentRepo) {
				return { issues: [] };
			}

			const projects: FossaProject[] = await this._getProjects();
			const project = await this._matchRepoToFossaProject(currentRepo, projects, request.repoId);
			if (!project) {
				return { issues: [] };
			}

			const { type, category, page, sort } = params;
			const issueResponse = await this.get<LicenseDependencyIssues>(
				this._getIssuesUrl(project.id, type, category, page, sort),
			);

			return {
				issues: issueResponse.body.issues,
			};
		} catch (error) {
			Logger.error(error);
			return {
				error,
			};
		}
	}

	@log()
	async fetchVulnerabilities(
		request: FetchThirdPartyCodeAnalyzersRequest,
		params: IssueParams,
	): Promise<FetchThirdPartyVulnerabilitiesResponse> {
		try {
			const [currentRepo] = await this._getCurrentRepo(request.repoId);
			if (!currentRepo) {
				return { issues: [] };
			}

			const projects: FossaProject[] = await this._getProjects();
			const project = await this._matchRepoToFossaProject(currentRepo, projects, request.repoId);
			if (!project) {
				return { issues: [] };
			}

			const { type, category, page, sort } = params;
			const issueResponse = await this.get<VulnerabilityIssues>(
				this._getIssuesUrl(project.id, type, category, page, sort),
			);

			return {
				issues: issueResponse.body.issues,
			};
		} catch (error) {
			Logger.error(error);
			return {
				error,
			};
		}
	}
}
