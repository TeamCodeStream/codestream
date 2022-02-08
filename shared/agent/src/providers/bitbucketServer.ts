"use strict";
import { GitRemoteLike } from "git/gitService";
import { URI } from "vscode-uri";
import { toRepoName } from "../git/utils";
import { Logger } from "../logger";
import {
	ProviderConfigurationData,
	ProviderGetForkedReposResponse
} from "../protocol/agent.protocol";
import { CSBitbucketProviderInfo } from "../protocol/api.protocol";
import { log, lspProvider } from "../system";

import {
	getRemotePaths,
	ProviderCreatePullRequestRequest,
	ProviderCreatePullRequestResponse,
	ProviderGetRepoInfoResponse,
	ProviderPullRequestInfo,
	PullRequestComment,
	ThirdPartyIssueProviderBase
} from "./provider";

interface BitbucketServerRepo {
	id: string;
	name: string;
	path: string;
}

interface BitbucketPullRequest {
	id: number;
	title: string;
	state: string;
	destination: {
		branch: {
			name: string;
		};
	};
	source: {
		branch: {
			name: string;
		};
	};
	links: {
		html: { href: string };
		comments: {
			href: string;
		};
	};
}

/**
 * BitBucket provider
 * @see https://developer.atlassian.com/bitbucket/api/2/reference/
 */
@lspProvider("bitbucket_server")
export class BitbucketServerProvider extends ThirdPartyIssueProviderBase<CSBitbucketProviderInfo> {
	get displayName() {
		return "Bitbucket Server";
	}

	get name() {
		return "bitbucket_server";
	}

	get apiPath() {
		return "/rest/api/1.0";
	}

	get baseUrl() {
		return `${this._providerInfo?.data?.baseUrl}${this.apiPath}`;
	}

	get headers() {
		return {
			Authorization: `Bearer ${this.accessToken}`,
			"Content-Type": "application/json"
		};
	}

	protected getPRExternalContent(comment: PullRequestComment) {
		return {
			provider: {
				name: this.displayName,
				icon: this.name,
				id: this.providerConfig.id
			},
			subhead: `#${comment.pullRequest.id}`,
			actions: [
				{
					label: "Open Comment",
					uri: comment.url
				},
				{
					label: `Open Merge Request #${comment.pullRequest.id}`,
					uri: comment.pullRequest.url
				}
			]
		};
	}

	@log()
	async configure(request: ProviderConfigurationData) {
		await this.session.api.setThirdPartyProviderToken({
			providerId: this.providerConfig.id,
			host: request.host,
			token: request.token,
			data: {
				baseUrl: request.baseUrl
			}
		});
		this.session.updateProviders();
	}

	async onConnected(providerInfo?: CSBitbucketProviderInfo) {
		super.onConnected(providerInfo);
	}

	getRepoByPath(path: string) {
		const parts = path.split("/");
		if (parts.length > 1) {
			return this.get<BitbucketServerRepo>(`/projects/${parts[0]}/repos/${parts[1]}`);
		} else {
			throw new Error("improper bitbucket path");
		}
	}

	async getRemotePaths(repo: any, _projectsByRemotePath: any) {
		// TODO don't need this ensureConnected -- doesn't hit api
		await this.ensureConnected();
		const remotePaths = await getRemotePaths(
			repo,
			this.getIsMatchingRemotePredicate(),
			_projectsByRemotePath
		);
		return remotePaths;
	}

	protected getOwnerFromRemote(remote: string): { owner: string; name: string } {
		// HACKitude yeah, sorry
		const uri = URI.parse(remote);
		const split = uri.path.split("/");
		// BBS seems to default to "scm" as the first part aka /scm/foo/bar.git
		// but there's a product called "Kantega SSO Enterprise" which utilizes https+sso for checkouts,
		//

		// https://kantega-sso.atlassian.net/wiki/spaces/KSE/pages/1802357/FAQ+-+Frequently+Asked+Questions
		// Does Kerberos single sign-on work with Bitbucket clients?
		// Yes, single sign-on using Kerberos can be configured also for Git clients.
		// There is an option to enable Kerberos on the common /scm/* path and an alternative path.
		// Enabling this will allow Git clients to clone from the alternate,
		// Kerberos-enabled path /kerberos-scm/*
		if (split[1] === "scm" || split[1] === "kerberos-scm") {
			const owner = split[2];
			const name = toRepoName(split[3]);
			return {
				owner,
				name
			};
		} else if (split.length > 4 && split[1] === "bitbucket" && split[2] === "scm") {
			// https://trello.com/c/qmGVBexf - has a case where path seems to be like:
			// bitbucket/scm/owner/repo.git ... speculation is that where multiple atlassian
			// services are present, this part of the path distinguishes them
			const owner = split[3];
			const name = toRepoName(split[4]);
			return { owner, name };
		}

		const owner = split[1];
		const name = toRepoName(split[2]);
		return {
			owner,
			name
		};
	}

	async createPullRequest(
		request: ProviderCreatePullRequestRequest
	): Promise<ProviderCreatePullRequestResponse | undefined> {
		void (await this.ensureConnected());

		try {
			const repoInfo = await this.getRepoInfo({ remote: request.remote });
			if (repoInfo && repoInfo.error) {
				return {
					error: repoInfo.error
				};
			}
			const { owner, name } = this.getOwnerFromRemote(request.remote);

			let createPullRequestResponse;
			if (request.isFork) {
				const split = request.baseRefRepoNameWithOwner!.split("/");
				createPullRequestResponse = await this.post<
					BitbucketServerCreatePullRequestRequest,
					BitbucketServerCreatePullRequestResponse
				>(`/projects/${split[0]}/repos/${split[1]}/pull-requests`, {
					fromRef: {
						id: request.headRefName,
						repository: {
							project: {
								key: repoInfo.key!
							},
							slug: name
						}
					},
					toRef: {
						id: request.baseRefName,
						repository: {
							project: {
								key: split[0]!
							},
							slug: split[1]
						}
					},
					title: request.title,
					description: this.createDescription(request)
				});
			} else {
				createPullRequestResponse = await this.post<
					BitbucketServerCreatePullRequestRequest,
					BitbucketServerCreatePullRequestResponse
				>(`/projects/${owner}/repos/${name}/pull-requests`, {
					fromRef: {
						id: request.headRefName,
						repository: {
							project: {
								key: repoInfo.key!
							},
							slug: name
						}
					},
					toRef: {
						id: request.baseRefName,
						repository: {
							project: {
								key: repoInfo.key!
							},
							slug: name
						}
					},
					title: request.title,
					description: this.createDescription(request)
				});
			}
			const title = `#${createPullRequestResponse.body.id} ${createPullRequestResponse.body.title}`;
			return {
				url:
					createPullRequestResponse.body.links.self &&
					createPullRequestResponse.body.links.self.length
						? createPullRequestResponse.body.links.self[0].href
						: undefined,
				title: title
			};
		} catch (ex) {
			Logger.error(ex, `${this.displayName}: createPullRequest`, {
				remote: request.remote,
				head: request.headRefName,
				base: request.baseRefName
			});

			return {
				error: {
					type: "PROVIDER",
					message: `${this.displayName}: ${ex.message}`
				}
			};
		}
	}

	async getRepoInfo(request: { remote: string }): Promise<ProviderGetRepoInfoResponse> {
		try {
			const { owner, name } = this.getOwnerFromRemote(request.remote);
			const repoResponse = await this.get<BitbucketServerRepo>(`/projects/${owner}/repos/${name}`);
			const defaultBranchResponse = await this.get<BitbucketServerBranch>(
				`/projects/${owner}/repos/${name}/branches/default`
			);

			const defaultBranchName = defaultBranchResponse
				? defaultBranchResponse.body.displayId
				: undefined;

			const pullRequestResponse = await this.get<any>(
				`/projects/${owner}/repos/${name}/pull-requests?state=OPEN`
			);
			let pullRequests: ProviderPullRequestInfo[] = [];
			if (pullRequestResponse && pullRequestResponse.body && pullRequestResponse.body.values) {
				pullRequests = pullRequestResponse.body.values.map((_: any) => {
					return {
						id: _.id,
						url: _.links!.self[0]!.href,
						baseRefName: _.toRef.displayId,
						headRefName: _.fromRef.displayId
					};
				});
			}
			return {
				owner,
				name,
				id: repoResponse.body.id,
				isFork: repoResponse.body.origin != null,
				key: repoResponse.body.project.key,
				defaultBranch: defaultBranchName,
				pullRequests: pullRequests
			};
		} catch (ex) {
			Logger.error(ex, `${this.displayName}: getRepoInfo`, {
				remote: request.remote
			});
			return {
				error: {
					type: "PROVIDER",
					message: `${this.displayName}: ${ex.message}`
				}
			};
		}
	}

	async getForkedRepos(request: { remote: string }): Promise<ProviderGetForkedReposResponse> {
		try {
			const { owner, name } = this.getOwnerFromRemote(request.remote);

			const repoResponse = await this.get<BitbucketServerRepo>(`/projects/${owner}/repos/${name}`);

			const parentOrSelfProject = repoResponse.body.origin
				? repoResponse.body.origin
				: repoResponse.body;

			const branchesByProjectId = new Map<string, any[]>();
			if (repoResponse.body.origin) {
				const branchesResponse = await this.get<any[]>(
					`/projects/${repoResponse.body.project.key}/repos/${repoResponse.body.slug}/branches`
				);
				branchesByProjectId.set(repoResponse.body.origin.uuid, branchesResponse.body.values as any);
			}
			const branchesResponse = await this.get<any[]>(`/projects/${owner}/repos/${name}/branches`);
			branchesByProjectId.set(repoResponse.body.uuid, branchesResponse.body.values as any);

			const forksResponse = await this.get<any>(`/projects/${owner}/repos/${name}/forks`);

			for (const project of forksResponse.body.values) {
				const branchesResponse = await this.get<any[]>(
					`/projects/${project.project.key}/repos/${project.project.slug}/branches`
				);
				branchesByProjectId.set(project.uuid, branchesResponse.body.values as any);
			}

			const response = {
				self: {
					nameWithOwner: `${owner}/${name}`,
					owner: owner,
					id: repoResponse.body.uuid,
					refs: {
						nodes: branchesByProjectId
							.get(repoResponse.body.uuid)!
							.map(branch => ({ name: branch.displayId }))
					}
				},
				forks: (forksResponse?.body?.values).map((fork: any) => ({
					nameWithOwner: `${fork.project.key}/${fork.slug}`,
					owner: fork.slug,
					id: fork.uuid,
					refs: {
						nodes: branchesByProjectId.get(fork.uuid)!.map(branch => ({ name: branch.displayId }))
					}
				}))
			} as ProviderGetForkedReposResponse;
			if (repoResponse.body.origin) {
				response.parent = {
					nameWithOwner: `${parentOrSelfProject.project.key}/${parentOrSelfProject.slug}`,
					owner: parentOrSelfProject.project.key,
					id: parentOrSelfProject.uuid,
					refs: {
						nodes: branchesByProjectId
							.get(parentOrSelfProject.uuid)!
							.map(branch => ({ name: branch.displayId }))
					}
				};
			}
			return response;
		} catch (ex) {
			Logger.error(ex, `${this.providerConfig.id}: getForkedRepos`, {
				remote: request.remote
			});
			let errorMessage =
				ex.response && ex.response.errors
					? ex.response.errors[0].message
					: `Unknown ${this.providerConfig.name} error`;
			errorMessage = `${this.providerConfig.name}: ${errorMessage}`;
			return {
				error: {
					type: "PROVIDER",
					message: errorMessage
				}
			};
		}
	}

	getIsMatchingRemotePredicate() {
		const baseUrl = this._providerInfo?.data?.baseUrl || this.getConfig().host;
		const configDomain = baseUrl ? URI.parse(baseUrl).authority : "";
		return (r: GitRemoteLike) => configDomain !== "" && r.domain === configDomain;
	}
}

interface BitbucketServerCreatePullRequestRequest {
	fromRef: {
		id: string;
		repository: {
			project: {
				key: string;
			};
			slug: string;
		};
	};
	toRef: {
		id: string;
		repository: {
			project: {
				key: string;
			};
			slug: string;
		};
	};
	title: string;
	description?: string;
}

interface BitbucketServerCreatePullRequestResponse {
	id: string;
	links: { self: { href: string }[] };
	number: number;
	title: string;
}

interface BitbucketServerBranch {
	displayId: string;
	type: string;
	isDefault: boolean;
}

interface BitbucketServerRepo {
	uuid: string;
	id: string;
	slug?: string;
	project: {
		key: string;
	};
	mainbranch?: {
		name?: string;
		type?: string;
	};
	origin?: any;
}
