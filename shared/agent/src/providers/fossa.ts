import Cache from "timed-cache";
import * as qs from "querystring";
import {
	FetchThirdPartyCodeAnalyzersRequest,
	FetchThirdPartyLicenseDependenciesResponse,
	FetchThirdPartyRepoMatchToFossaRequest,
	FetchThirdPartyRepoMatchToFossaResponse,
	FetchThirdPartyVulnerabilitiesResponse,
	FossaProject,
	GetFossaProjectsResponse,
	IssueParams,
	LicenseDependencyIssues,
	ReposScm,
	ThirdPartyProviderConfig,
	VulnerabilityIssues,
} from "@codestream/protocols/agent";
import { log, lspProvider } from "../system";
import { CodeStreamSession } from "session";
import { GitRemoteParser } from "../git/parsers/remoteParser";
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
		protected readonly providerConfig: ThirdPartyProviderConfig
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
		sort?: string
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
		if (!repoId) {
			Logger.warn(`${this.name}: _getCurrentRepo repoId=${repoId}`);
			return [];
		}
		const { scm } = SessionContainer.instance();
		const reposResponse = await scm.getRepos({
			inEditorOnly: true,
			includeProviders: true,
			includeCurrentBranches: true,
		});
		if (!reposResponse.repositories || !reposResponse.repositories.length) {
			Logger.warn(`${this.name}: _getCurrentRepo repoId=${repoId} no repositories`);
			return [];
		}
		const repo = reposResponse.repositories.filter(_ => _.id === repoId);
		if (!repo) {
			Logger.warn(
				`${this.name}: _getCurrentRepo repoId=${repoId} no filtered repo reposResponse.repositories`,
				reposResponse.repositories
			);
		}
		return repo;
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
			Logger.log(`${this.name}: _getProjects: from cache`, {
				cacheKey: this._fossaProjectCacheKey,
			});
		} else {
			const projsResponse = await this.get<GetFossaProjectsResponse>("/projects?page=1&count=1000");
			if (projsResponse.body) {
				this._fossaProjectCache.put(this._fossaProjectCacheKey, projsResponse.body);
				projects = projsResponse.body.projects;
				Logger.log(
					`${this.name}: _getProjects: from Fossa API, project size ${projsResponse.body.projects}`,
					{
						cacheKey: this._fossaProjectCacheKey,
					}
				);
			}
		}
		return projects;
	}

	/**
	 * Matches current repo to Fossa project
	 * @returns project object
	 */
	async _matchRepoToFossaProject(
		currentRepo: ReposScm,
		fossaProjects: FossaProject[],
		repoId?: string
	): Promise<FossaProject | undefined> {
		if (!repoId) {
			Logger.warn(`${this.name}: _matchRepoToFossaProject no repoId`, repoId);
			return undefined;
		}
		Logger.log(`${this.name}: currentRepo=${currentRepo?.id}`);
		for (const project of fossaProjects) {
			let parsed;
			let newUrl;
			if (project.id.startsWith("git+")) {
				newUrl = project.id.split("+");
				newUrl = newUrl[1];
			} else if (project.id.startsWith("custom+")) {
				const idSplit = project.id.split("/");
				const idSliced = idSplit.slice(1);
				newUrl = idSliced.join("/");
			} else {
				Logger.warn(`${this.name}: couldn't parse into newUrl project.id=${project.id}`, project);
			}

			if (newUrl) {
				try {
					Logger.log(`${this.name}: newUrl: ${newUrl}`);
					parsed = await GitRemoteParser.parseGitUrl(`https://${newUrl}`);
				} catch (err) {
					Logger.error(err, `${this.name}: could not parse newUrl ${newUrl}`);
				}

				if (parsed) {
					const [, domain, path] = parsed;
					const folderName = path.split("/").pop();
					if (
						currentRepo.folder.name === folderName &&
						currentRepo.providerGuess &&
						domain.includes(currentRepo.providerGuess)
					) {
						Logger.log(
							`${this.name}: repo/project found, providerGuess=${currentRepo.providerGuess} folderName=${folderName} currentRepo.folder.name=${currentRepo.folder.name} project.id=${project.id}`
						);
						return project;
					} else {
						Logger.log(
							`${this.name}: repo/project did not match, providerGuess=${currentRepo.providerGuess} folderName=${folderName} currentRepo.folder.name=${currentRepo.folder.name} project.id=${project.id}`
						);
					}
				} else {
					Logger.log(`${this.name}: project not parsed, newUrl=${newUrl} project.id=${project.id}`);
				}
			}
		}
		return undefined;
	}

	@log()
	async fetchIsRepoMatch(
		request: FetchThirdPartyRepoMatchToFossaRequest
	): Promise<FetchThirdPartyRepoMatchToFossaResponse> {
		try {
			const [currentRepo] = await this._getCurrentRepo(request.repoId);
			if (!currentRepo) {
				Logger.warn(`${this.name}: !currentRepo, repoId=${request.repoId}`);
				return { isRepoMatch: false };
			}
			const projects: FossaProject[] = await this._getProjects();
			const project = await this._matchRepoToFossaProject(currentRepo, projects, request.repoId);
			if (!project) {
				Logger.warn(`${this.name}: !project, repoId=${request.repoId}`);
				return { isRepoMatch: false };
			}
			return { isRepoMatch: true };
		} catch (error) {
			Logger.error(error, `${this.name}: fetchIsRepoMatch error`);
			if (error.message.toLowerCase() === "unauthorized") {
				return { error: "API token is invalid" };
			}
			return { error: "Project not found on FOSSA" };
		}
	}

	@log()
	async fetchLicenseDependencies(
		request: FetchThirdPartyCodeAnalyzersRequest,
		params: IssueParams
	): Promise<FetchThirdPartyLicenseDependenciesResponse> {
		try {
			const [currentRepo] = await this._getCurrentRepo(request.repoId);
			if (!currentRepo) {
				Logger.warn(`${this.name}: !currentRepo, repoId=${request.repoId}`);
				return { issues: [] };
			}

			const projects: FossaProject[] = await this._getProjects();
			const project = await this._matchRepoToFossaProject(currentRepo, projects, request.repoId);
			if (!project) {
				Logger.warn(`${this.name}: !project, repoId=${request.repoId}`);
				return { issues: [] };
			}

			const { type, category, page, sort } = params;
			const issueResponse = await this.get<LicenseDependencyIssues>(
				this._getIssuesUrl(project.id, type, category, page, sort)
			);

			return {
				issues: issueResponse.body.issues,
			};
		} catch (error) {
			Logger.error(error, `${this.name}: fetchLicenseDependencies error`);
			return { error: "Error fetching issues from FOSSA" };
		}
	}

	@log()
	async fetchVulnerabilities(
		request: FetchThirdPartyCodeAnalyzersRequest,
		params: IssueParams
	): Promise<FetchThirdPartyVulnerabilitiesResponse> {
		try {
			const [currentRepo] = await this._getCurrentRepo(request.repoId);
			if (!currentRepo) {
				Logger.warn(`${this.name}: !currentRepo, repoId=${request.repoId}`);
				return { issues: [] };
			}

			const projects: FossaProject[] = await this._getProjects();
			const project = await this._matchRepoToFossaProject(currentRepo, projects, request.repoId);
			if (!project) {
				Logger.warn(`${this.name}: !project, repoId=${request.repoId}`);
				return { issues: [] };
			}

			const { type, category, page, sort } = params;
			const issueResponse = await this.get<VulnerabilityIssues>(
				this._getIssuesUrl(project.id, type, category, page, sort)
			);

			return {
				issues: issueResponse.body.issues,
			};
		} catch (error) {
			Logger.error(error, `${this.name}: fetchVulnerabilities error`);
			return { error: "Error fetching issues from FOSSA" };
		}
	}
}
