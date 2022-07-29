"use strict";
import { GitRemoteLike } from "git/gitService";
import * as qs from "querystring";
import { file } from "tmp";
import { isRequestMessage } from "vscode-jsonrpc/lib/messages";
import { URI } from "vscode-uri";
import { toRepoName } from "../git/utils";
import { Logger } from "../logger";
import {
	BitbucketBoard,
	BitbucketCard,
	BitbucketCreateCardRequest,
	BitbucketCreateCardResponse,
	CreateThirdPartyCardRequest,
	FetchAssignableUsersAutocompleteRequest,
	FetchAssignableUsersResponse,
	FetchThirdPartyBoardsRequest,
	FetchThirdPartyBoardsResponse,
	FetchThirdPartyCardsRequest,
	FetchThirdPartyCardsResponse,
	FetchThirdPartyCardWorkflowRequest,
	FetchThirdPartyCardWorkflowResponse,
	FetchThirdPartyPullRequestCommitsRequest,
	FetchThirdPartyPullRequestCommitsResponse,
	FetchThirdPartyPullRequestFilesResponse,
	FetchThirdPartyPullRequestRepository,
	FetchThirdPartyPullRequestRequest,
	FetchThirdPartyPullRequestResponse,
	GetMyPullRequestsRequest,
	GetMyPullRequestsResponse,
	MoveThirdPartyCardRequest,
	MoveThirdPartyCardResponse,
	ProviderGetForkedReposResponse,
	ThirdPartyDisconnect,
	ThirdPartyProviderCard,
} from "../protocol/agent.protocol";
import { CSBitbucketProviderInfo } from "../protocol/api.protocol";
import { log, lspProvider } from "../system";
import {
	getOpenedRepos,
	getRemotePaths,
	ProviderCreatePullRequestRequest,
	ProviderCreatePullRequestResponse,
	ProviderGetRepoInfoResponse,
	ProviderPullRequestInfo,
	PullRequestComment,
	ThirdPartyProviderSupportsIssues,
	ThirdPartyProviderSupportsPullRequests,
} from "./provider";
import { ThirdPartyIssueProviderBase } from "./thirdPartyIssueProviderBase";

interface BitbucketRepo {
	uuid: string;
	full_name: string;
	path: string;
	owner: {
		uuid: string;
		username: string;
		type: string;
	};
	has_issues: boolean;
}

interface BitbucketAuthor {
	account_id: string;
	display_name: string;
	user: {
		avatar?: {
			html?: {
				href?: string;
			};
		};
	};
}

interface BitbucketPullRequestCommit {
	abbreviatedOid: string;
	/* Author & Committer are the same for Bitbucket */
	author: BitbucketAuthor;
	/* Author & Committer are the same for Bitbucket */
	committer: BitbucketAuthor;
	message: string;
	date: string;
	hash: string;
	links: {
		html: string;
	};
}

interface BitbucketPullRequestDiffStat {
	hash: string;
	new: {
		path: string;
	};
	old: {
		path: string;
	};
	status: string;
}

interface BitbucketPermission {
	permission: string;
	repository: BitbucketRepo;
}

interface BitbucketUser {
	uuid: string;
	display_name: string;
	account_id: string;
	username: string;
}

interface BitbucketPullRequest {
	author: {
		links: {
			avatar: {
				href: string;
			};
		};
	};
	created_on: string;
	destination: {
		branch: {
			name: string;
		};
	};
	id: number;
	links: {
		html: {
			href: string;
		};
	};
	source: {
		branch: {
			name: string;
		};
		repository: {
			name: string;
			full_name: string;
		};
	};
	summary: {
		html: string;
		raw: string;
	};
	state: string;
	title: string;
	updated_on: string;
}

interface BitbucketValues<T> {
	values: T;
	next: string;
}
/**
 * BitBucket provider
 * @see https://developer.atlassian.com/bitbucket/api/2/reference/
 */
@lspProvider("bitbucket")
export class BitbucketProvider
	extends ThirdPartyIssueProviderBase<CSBitbucketProviderInfo>
	implements ThirdPartyProviderSupportsIssues, ThirdPartyProviderSupportsPullRequests
{
	private _knownRepos = new Map<string, BitbucketRepo>();
	private _reposWithIssues: BitbucketRepo[] = [];

	get displayName() {
		return "Bitbucket";
	}

	get name() {
		return "bitbucket";
	}

	get headers() {
		return {
			Authorization: `Bearer ${this.accessToken}`,
			"Content-Type": "application/json",
		};
	}

	getPRExternalContent(comment: PullRequestComment) {
		return {
			provider: {
				name: this.displayName,
				icon: this.name,
				id: this.providerConfig.id,
			},
			subhead: `#${comment.pullRequest.id}`,
			actions: [
				{
					label: "Open Comment",
					uri: comment.url,
				},
				{
					label: `Open Merge Request #${comment.pullRequest.id}`,
					uri: comment.pullRequest.url,
				},
			],
		};
	}

	async onConnected(providerInfo?: CSBitbucketProviderInfo) {
		super.onConnected(providerInfo);
		this._knownRepos = new Map<string, BitbucketRepo>();
	}

	@log()
	async onDisconnected(request?: ThirdPartyDisconnect) {
		this._knownRepos.clear();
		this._reposWithIssues = [];
		return super.onDisconnected(request);
	}

	@log()
	async getBoards(request?: FetchThirdPartyBoardsRequest): Promise<FetchThirdPartyBoardsResponse> {
		void (await this.ensureConnected());

		const openRepos = await getOpenedRepos<BitbucketRepo>(
			r => r.domain === "bitbucket.org",
			p => this.get<BitbucketRepo>(`/repositories/${p}`),
			this._knownRepos
		);

		let boards: BitbucketBoard[];
		if (openRepos.size > 0) {
			const bitbucketRepos = Array.from(openRepos.values());
			boards = bitbucketRepos
				.filter(r => r.has_issues)
				.map(r => ({
					id: r.uuid,
					name: r.full_name,
					apiIdentifier: r.full_name,
					path: r.path,
					singleAssignee: true, // bitbucket issues only allow one assignee
				}));
		} else {
			let bitbucketRepos: BitbucketRepo[] = [];
			try {
				let apiResponse = await this.get<BitbucketValues<BitbucketPermission[]>>(
					`/user/permissions/repositories?${qs.stringify({
						fields: "+values.repository.has_issues",
					})}`
				);
				bitbucketRepos = apiResponse.body.values.map(p => p.repository);
				while (apiResponse.body.next) {
					apiResponse = await this.get<BitbucketValues<BitbucketPermission[]>>(
						apiResponse.body.next
					);
					bitbucketRepos = bitbucketRepos.concat(apiResponse.body.values.map(p => p.repository));
				}
			} catch (err) {
				Logger.error(err);
				debugger;
			}
			bitbucketRepos = bitbucketRepos.filter(r => r.has_issues);
			this._reposWithIssues = [...bitbucketRepos];
			boards = bitbucketRepos.map(r => {
				return {
					...r,
					id: r.uuid,
					name: r.full_name,
					apiIdentifier: r.full_name,
					singleAssignee: true, // bitbucket issues only allow one assignee
				};
			});
		}

		return { boards };
	}

	// FIXME -- implement this
	async getCardWorkflow(
		request: FetchThirdPartyCardWorkflowRequest
	): Promise<FetchThirdPartyCardWorkflowResponse> {
		return { workflow: [] };
	}

	@log()
	async getCards(request: FetchThirdPartyCardsRequest): Promise<FetchThirdPartyCardsResponse> {
		void (await this.ensureConnected());

		const cards: ThirdPartyProviderCard[] = [];
		if (this._reposWithIssues.length === 0) await this.getBoards();
		await Promise.all(
			this._reposWithIssues.map(async repo => {
				const { body } = await this.get<{ uuid: string; [key: string]: any }>(
					`/repositories/${repo.full_name}/issues`
				);
				// @ts-ignore
				body.values.forEach(card => {
					cards.push({
						id: card.id,
						url: card.links.html.href,
						title: card.title,
						modifiedAt: new Date(card.updated_on).getTime(),
						tokenId: card.id,
						body: card.content ? card.content.raw : "",
					});
				});
			})
		);
		return { cards };
	}

	@log()
	async createCard(request: CreateThirdPartyCardRequest) {
		void (await this.ensureConnected());

		const data = request.data as BitbucketCreateCardRequest;
		const cardData: { [key: string]: any } = {
			title: data.title,
			content: {
				raw: data.description,
				markup: "markdown",
			},
		};
		if (data.assignee) {
			cardData.assignee = { uuid: data.assignee.uuid };
		}
		const response = await this.post<{}, BitbucketCreateCardResponse>(
			`/repositories/${data.repoName}/issues`,
			cardData
		);
		let card = response.body;
		let issueResponse;
		try {
			const strippedPath = card.links.self.href.split(this.baseUrl)[1];
			issueResponse = await this.get<BitbucketCard>(strippedPath);
		} catch (err) {
			Logger.error(err);
			return card;
		}
		card = issueResponse.body;
		card.url = card.links.html!.href;
		return card;
	}

	@log()
	async moveCard(request: MoveThirdPartyCardRequest): Promise<MoveThirdPartyCardResponse> {
		return { success: false };
	}

	private async getMemberId() {
		const userResponse = await this.get<{ uuid: string; [key: string]: any }>(`/user`);

		return userResponse.body.uuid;
	}

	@log()
	async getAssignableUsers(request: { boardId: string }) {
		void (await this.ensureConnected());

		try {
			const repoResponse = await this.get<BitbucketRepo>(`/repositories/${request.boardId}`);
			if (repoResponse.body.owner.type === "team") {
				let members: BitbucketUser[] = [];
				let apiResponse = await this.get<BitbucketValues<BitbucketUser[]>>(
					`/users/${repoResponse.body.owner.username}/members`
				);
				members = apiResponse.body.values;
				while (apiResponse.body.next) {
					apiResponse = await this.get<BitbucketValues<BitbucketUser[]>>(apiResponse.body.next);
					members = members.concat(apiResponse.body.values);
				}

				return {
					users: members.map(u => ({ ...u, id: u.account_id, displayName: u.display_name })),
				};
			} else {
				const userResponse = await this.get<BitbucketUser>("/user");
				const user = userResponse.body;
				return { users: [{ ...user, id: user.account_id, displayName: user.display_name }] };
			}
		} catch (ex) {
			Logger.error(ex);
			return { users: [] };
		}
	}

	@log()
	async getAssignableUsersAutocomplete(
		request: FetchAssignableUsersAutocompleteRequest
	): Promise<FetchAssignableUsersResponse> {
		return { users: [] };
	}

	@log()
	async getPullRequest(
		request: FetchThirdPartyPullRequestRequest
	): Promise<FetchThirdPartyPullRequestResponse> {
		// TODO implementation
		const { pullRequestId, repoWithOwner } = this.parseId(request.pullRequestId);

		const item = await this.get<BitbucketPullRequest>(
			`/repositories/${repoWithOwner}/pullrequests/${pullRequestId}`
		);

		const response: FetchThirdPartyPullRequestResponse = {
			viewer: {} as any,
			repository: {
				id: item.body.id + "",
				url: "",
				resourcePath: "",
				rebaseMergeAllowed: true,
				squashMergeAllowed: true,
				mergeCommitAllowed: true,
				repoOwner: repoWithOwner.split("/")[0],
				repoName: repoWithOwner.split("/")[1],
				providerId: this.providerConfig.id,
				viewerDefaultMergeMethod: "MERGE",
				viewerPermission: "WRITE",
				branchProtectionRules: undefined,
				pullRequest: {
					repository: {
						name: "TODO",
						repoWithOwner: repoWithOwner,
						url: "TODO"
					} as any,
					providerId: this.providerConfig.id,
					files: {
						nodes: [
							{
								// TODO FIXME
								path: "TODO",
								additions: 1,
								deletions: 1
							}
						]
					}
				}
			} as FetchThirdPartyPullRequestRepository
		};

		return response as any;
	}

	@log()
	async getPullRequestCommits(request: {
		pullRequestId: string;
	}): Promise<FetchThirdPartyPullRequestCommitsResponse[]> {
		const { pullRequestId, repoWithOwner } = this.parseId(request.pullRequestId);
		const items = await this.get<BitbucketValues<BitbucketPullRequestCommit[]>>(
			`/repositories/${repoWithOwner}/pullrequests/${pullRequestId}/commits`
		);

		const response = items.body.values.map(commit => {
			const author = {
				name: commit.author.display_name,
				avatarUrl: commit.author.user.avatar?.html?.href,
				user: {
					login: commit.author.account_id
				}
			};
			return {
				abbreviatedOid: commit.hash,
				author: author,
				committer: author,
				message: commit.message,
				authoredDate: commit.date,
				oid: commit.hash,
				url: commit.links.html
			} as FetchThirdPartyPullRequestCommitsResponse;
		});
		return response;
	}

	async getPullRequestFilesChanged(request: {
		pullRequestId: string;
	}): Promise<FetchThirdPartyPullRequestFilesResponse[]> {
		const { pullRequestId, repoWithOwner } = this.parseId(request.pullRequestId);
		const items = await this.get<BitbucketValues<BitbucketPullRequestDiffStat[]>>(
			`/repositories/${repoWithOwner}/pullrequests/${pullRequestId}/diffstat`
		);

		return items.body.values.map(file => {
			return {
				sha: file.hash,
				filename: file.new.path,
				previousFilename: file.old.path,
				status: file.status,
				additions: 0, //what is this?
				changes: 0, //TODO can we find this?
				deletions: 0,
				patch: ""
			} as FetchThirdPartyPullRequestFilesResponse;
		});
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

	getOwnerFromRemote(remote: string): { owner: string; name: string } {
		// HACKitude yeah, sorry
		const uri = URI.parse(remote);
		const split = uri.path.split("/");
		const owner = split[1];
		const name = toRepoName(split[2]);
		return {
			owner,
			name,
		};
	}

	async getPullRequestsContainigSha(
		repoIdentifier: { owner: string; name: string }[],
		sha: string
	): Promise<any[]> {
		return [];
	}

	async createPullRequest(
		request: ProviderCreatePullRequestRequest
	): Promise<ProviderCreatePullRequestResponse | undefined> {
		void (await this.ensureConnected());

		try {
			const repoInfo = await this.getRepoInfo({ remote: request.remote });
			if (repoInfo && repoInfo.error) {
				return {
					error: repoInfo.error,
				};
			}
			const { owner, name } = this.getOwnerFromRemote(request.remote);
			let createPullRequestResponse;
			if (request.isFork) {
				createPullRequestResponse = await this.post<
					BitBucketCreatePullRequestRequest,
					BitBucketCreatePullRequestResponse
				>(`/repositories/${request.baseRefRepoNameWithOwner}/pullrequests`, {
					source: {
						branch: { name: request.headRefName },
						repository: {
							full_name: request.headRefRepoNameWithOwner,
						},
					},
					destination: {
						branch: { name: request.baseRefName },
						repository: {
							full_name: request.baseRefRepoNameWithOwner,
						},
					},
					title: request.title,
					description: this.createDescription(request),
				});
			} else {
				createPullRequestResponse = await this.post<
					BitBucketCreatePullRequestRequest,
					BitBucketCreatePullRequestResponse
				>(`/repositories/${owner}/${name}/pullrequests`, {
					source: { branch: { name: request.headRefName } },
					destination: { branch: { name: request.baseRefName } },
					title: request.title,
					description: this.createDescription(request),
				});
			}

			const title = `#${createPullRequestResponse.body.id} ${createPullRequestResponse.body.title}`;
			return {
				url: createPullRequestResponse.body.links.html.href,
				title: title,
			};
		} catch (ex) {
			Logger.error(ex, `${this.displayName}: createPullRequest`, {
				remote: request.remote,
				head: request.headRefName,
				base: request.baseRefName,
			});
			let message = ex.message;
			if (message.indexOf("credentials lack one or more required privilege scopes") > -1) {
				message +=
					"\n\nYou may need to disconnect and reconnect your Bitbucket for CodeStream integration to create your first Pull Request.";
			}
			return {
				error: {
					type: "PROVIDER",
					message: `${this.displayName}: ${message}`,
				},
			};
		}
	}

	@log()
	async getRepoInfo(request: { remote: string }): Promise<ProviderGetRepoInfoResponse> {
		try {
			const { owner, name } = this.getOwnerFromRemote(request.remote);
			const repoResponse = await this.get<BitBucketRepo>(`/repositories/${owner}/${name}`);
			const pullRequestResponse = await this.get<BitbucketValues<BitbucketPullRequest[]>>(
				`/repositories/${owner}/${name}/pullrequests?state=OPEN`
			);
			let pullRequests: ProviderPullRequestInfo[] = [];
			if (pullRequestResponse && pullRequestResponse.body && pullRequestResponse.body.values) {
				pullRequests = pullRequestResponse.body.values.map(_ => {
					return {
						id: _.id + "",
						url: _.links!.html!.href,
						baseRefName: _.destination.branch.name,
						headRefName: _.source.branch.name,
						nameWithOwner: _.source.repository.full_name,
					} as ProviderPullRequestInfo;
				});
			}
			return {
				id: repoResponse.body.uuid,
				owner,
				name,
				nameWithOwner: `${owner}/${name}`,
				isFork: repoResponse.body.parent != null,
				defaultBranch:
					repoResponse.body &&
					repoResponse.body.mainbranch &&
					repoResponse.body.mainbranch.name &&
					repoResponse.body.mainbranch.type === "branch"
						? repoResponse.body.mainbranch.name
						: undefined,
				pullRequests: pullRequests,
			};
		} catch (ex) {
			return this.handleProviderError(ex, request);
		}
	}

	async getForkedRepos(request: { remote: string }): Promise<ProviderGetForkedReposResponse> {
		try {
			const { owner, name } = this.getOwnerFromRemote(request.remote);

			const repoResponse = await this.get<BitBucketRepo>(`/repositories/${owner}/${name}`);

			const parentOrSelfProject = repoResponse.body.parent
				? repoResponse.body.parent
				: repoResponse.body;

			const branchesByProjectId = new Map<string, any[]>();
			if (repoResponse.body.parent) {
				const branchesResponse = await this.get<any[]>(
					`/repositories/${repoResponse.body.parent.full_name}/refs`
				);
				branchesByProjectId.set(repoResponse.body.parent.uuid, branchesResponse.body.values as any);
			}
			const branchesResponse = await this.get<any[]>(
				`/repositories/${repoResponse.body.full_name}/refs`
			);
			branchesByProjectId.set(repoResponse.body.uuid, branchesResponse.body.values as any);

			const forksResponse = await this.get<any>(
				`/repositories/${parentOrSelfProject.full_name}/forks`
			);

			for (const project of forksResponse.body.values) {
				const branchesResponse = await this.get<any[]>(`/repositories/${project.full_name}/refs`);
				branchesByProjectId.set(project.uuid, branchesResponse.body.values as any);
			}

			const response = {
				self: {
					nameWithOwner: repoResponse.body.full_name,
					owner: owner,
					id: repoResponse.body.uuid,
					refs: {
						nodes: branchesByProjectId
							.get(repoResponse.body.uuid)!
							.map(branch => ({ name: branch.name })),
					},
				},
				forks: (forksResponse?.body?.values).map((fork: any) => ({
					nameWithOwner: fork.full_name,
					owner: fork.slug,
					id: fork.uuid,
					refs: {
						nodes: branchesByProjectId.get(fork.uuid)!.map(branch => ({ name: branch.name })),
					},
				})),
			} as ProviderGetForkedReposResponse;
			if (repoResponse.body.parent) {
				response.parent = {
					nameWithOwner: parentOrSelfProject.full_name,
					owner: parentOrSelfProject.full_name,
					id: parentOrSelfProject.uuid,
					refs: {
						nodes: branchesByProjectId
							.get(parentOrSelfProject.uuid)!
							.map(branch => ({ name: branch.name })),
					},
				};
			}
			return response;
		} catch (ex) {
			return this.handleProviderError(ex, request);
		}
	}

	private _isMatchingRemotePredicate = (r: GitRemoteLike) => r.domain === "bitbucket.org";
	getIsMatchingRemotePredicate() {
		return this._isMatchingRemotePredicate;
	}

	async getMyPullRequests(
		request: GetMyPullRequestsRequest
	): Promise<GetMyPullRequestsResponse[][] | undefined> {
		void (await this.ensureConnected());
		// call to /user to get the username
		const usernameResponse = await this.get<BitbucketUser>("/user");
		if (!usernameResponse) {
			Logger.warn("getMyPullRequests user not found");
			return undefined;
		}

		const username = usernameResponse.body.username;
		const queriesSafe = request.queries.map(query =>
			query.replace(/["']/g, '\\"').replace("@me", username)
		);
		const providerId = this.providerConfig?.id;
		const items = await Promise.all(
			queriesSafe.map(_query => {
				let query = _query;
				let limit = 100;

				// TODO deal with request.isOpen

				// recent is kind of a magic string, where we just look
				// for some random PR activity to at least show you
				// something. if you have the repo query checked, and
				// we can query by repo, then use that. otherwise github
				// needs at least one qualifier so we query for PRs
				// that you were the author of
				// https://trello.com/c/XIg6MKWy/4813-add-4th-default-pr-query-recent
				// if (query === "recent") {
				// 	if (repoQuery.length > 0) {
				// 		query = "is:pr";
				// 	} else {
				// 		query = "is:pr author:@me";
				// 	}
				// 	limit = 5;
				// }

				// if a user has put a "repo:X/Y" in their query, don't add the repoQuery as specified by the request.isOpen option
				// const finalQuery = query.indexOf("repo:") > -1 ? query : repoQuery + query;
				// if (query !== finalQuery) {
				// 	Logger.log(
				// 		`getMyPullRequests providerId="${providerId}" finalQuery="${finalQuery}" query=${query}`
				// 	);
				// } else {
				// 	Logger.log(`getMyPullRequests providerId="${providerId}" finalQuery="${finalQuery}"`);
				// }

				// the baseUrl will be applied inside the this.get, it normally looks like https://api.bitbucket.org/2.0
				return this.get<BitbucketValues<BitbucketPullRequest[]>>(`/pullrequests/${query}`);
			})
		).catch(ex => {
			Logger.error(ex, "getMyPullRequests");
			let errString;
			if (ex.response) {
				errString = JSON.stringify(ex.response);
			} else {
				errString = ex.message;
			}
			throw new Error(errString);
		});
		const response: GetMyPullRequestsResponse[][] = [];
		items.forEach((item, index) => {
			if (item?.body?.values?.length) {
				response[index] = item.body.values.map(pr => {
					const lastEditedString = new Date(pr.updated_on).getTime() + "";
					return {
						author: {
							avatarUrl: pr.author.links.avatar.href,
							login: username
						},
						baseRefName: pr.destination.branch.name,
						body: pr.summary.html,
						bodyText: pr.summary.raw,
						createdAt: new Date(pr.created_on).getTime(),
						headRefName: pr.source.branch.name,
						headRepository: {
							name: pr.source.repository.name,
							nameWithOwner: pr.source.repository.full_name
						},
						id: pr.id + "",
						idComputed: JSON.stringify({
							id: pr.id,
							pullRequestId: pr.id,
							repoWithOwner: pr.source.repository.full_name
						}),
						lastEditedAt: lastEditedString,
						labels: {
							nodes: []
						},
						number: pr.id,
						providerId: providerId,
						state: pr.state,
						title: pr.title,
						updatedAt: lastEditedString,
						url: pr.links.html.href
					} as GetMyPullRequestsResponse;
				});
				if (!request.queries[index].match(/\bsort:/)) {
					response[index] = response[index].sort(
						(a: { createdAt: number }, b: { createdAt: number }) => b.createdAt - a.createdAt
					);
				}
			}
		});

		return response;
	}

	parseId(pullRequestId: string) {
		const parsed = JSON.parse(pullRequestId);
		// https://gitlab.com/gitlab-org/gitlab/-/blob/1cb9fe25/doc/api/README.md#id-vs-iid
		// id - Is unique across all issues and is used for any API call
		// iid - Is unique only in scope of a single project. When you browse issues or merge requests with the Web UI, you see the iid
		return {
			id: parsed.id || parsed.pullRequestId,
			pullRequestId: parsed.pullRequestId,
			repoWithOwner: parsed.repoWithOwner
		};
	}
}

interface BitBucketCreatePullRequestRequest {
	source: {
		branch: {
			name: string;
		};
		repository?: {
			full_name?: string;
		};
	};

	destination: {
		branch: {
			name: string;
		};
		repository?: {
			full_name?: string;
		};
	};
	title: string;
	description?: string;
}

interface BitBucketCreatePullRequestResponse {
	id: string;
	links: { html: { href: string } };
	number: number;
	title: string;
}

interface BitBucketRepo {
	full_name: string;
	uuid: string;
	mainbranch?: {
		name?: string;
		type?: string;
	};
	parent?: any;
}
