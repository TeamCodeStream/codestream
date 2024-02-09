"use strict";
import * as qs from "querystring";

import {
	BitbucketBoard,
	BitbucketCard,
	BitbucketCreateCardRequest,
	BitbucketCreateCardResponse,
	BitbucketParticipantRole,
	CreateThirdPartyCardRequest,
	FetchThirdPartyBoardsRequest,
	FetchThirdPartyBoardsResponse,
	FetchThirdPartyCardsRequest,
	FetchThirdPartyCardsResponse,
	FetchThirdPartyCardWorkflowRequest,
	FetchThirdPartyCardWorkflowResponse,
	MoveThirdPartyCardRequest,
	MoveThirdPartyCardResponse,
	ThirdPartyDisconnect,
	ThirdPartyProviderCard,
} from "@codestream/protocols/agent";
import { CSBitbucketProviderInfo } from "@codestream/protocols/api";

import { GitRemoteLike } from "git/gitService";
import { Logger } from "../logger";
import { log, lspProvider } from "../system";
import { getOpenedRepos, ThirdPartyProviderSupportsIssues } from "./provider";
import { ThirdPartyIssueProviderBase } from "./thirdPartyIssueProviderBase";

interface BitbucketRepo {
	uuid: string;
	full_name: string;
	path: string;
	owner: {
		display_name: string;
		links: {
			self: {
				href: string;
			};
			avatar: {
				href: string;
			};
			html: {
				href: string;
			};
		};
		type: string;
		uuid: string;
		account_id: string;
		nickname: string;
		username: string;
	};
	has_issues: boolean;
	mainbranch?: {
		name?: string;
		type?: string;
	};
	parent?: any;
}

interface BitbucketCurrentUser {
	display_name: string;
	links: {
		self: {
			href: string;
		};
		avatar: {
			href: string;
		};
		repositories: {
			href: string;
		};
		snippets: {
			href: string;
		};
		html: {
			href: string;
		};
		hooks: {
			href: string;
		};
	};
	created_on: string;
	type: string;
	uuid: string;
	username: string;
	is_staff: boolean;
	account_id: string;
	nickname: string;
	account_status: string;
}

interface BitbucketAuthor {
	type: string;
	raw: string;
	user: {
		account_id: string;
		display_name: string;
		links?: {
			self?: {
				href: string;
			};
			avatar?: {
				href: string;
			};
			html?: {
				href: string;
			};
		};
		type: string;
		uuid: string;
		nickname: string;
	};
}

interface BitbucketPullRequestComment2 {
	id: number;
	author: {
		login: string;
		account_id?: string;
		uuid?: string;
	};
	deleted: boolean;
	inline: {
		from: number | undefined;
		to: number | undefined;
		path: string;
	};
	type: string;
	file: string;
	bodyHtml: string;
	bodyText: string;
	state: string;
	parent?: {
		id: number;
	};
	replies?: BitbucketPullRequestComment2[];
}

interface BitbucketMergeRequest {
	message: string;
	close_source_branch?: boolean;
	merge_strategy?: string;
}

interface BitbucketSubmitReviewRequestResponse {
	approved: boolean;
	state: string;
	participated_on: Date;
	user: {
		uuid: string;
		links: {
			avatar: {
				href: string;
			};
		};
	};
}

interface BitbucketSubmitReviewRequest {
	type: string;
}

interface BitbucketDeclinePullRequest {
	type: string;
}

interface BitBucketCreateCommentRequest {
	content: {
		raw: string;
	};
	inline?: {
		to: number;
		path: string;
	};
	parent?: {
		id: number;
	};
}

interface TimelineItem {
	pull_request: {
		type: string;
		id: number;
		title: string;
		links: {
			self: {
				href: string;
			};
			html: {
				href: string;
			};
		};
	};
	comment: {
		id: number;
		created_on: string;
		updated_on: string;
		content: {
			type: string;
			raw: string;
			markup: string;
			html: string;
		};
		user: {
			display_name: string;
			links: {
				self: {
					href: string;
				};
				avatar: {
					href: string;
				};
				html: {
					href: string;
				};
			};
			type: string;
			uuid: string;
			account_id: string;
			nickname: string;
		};
		deleted: boolean;
		inline?: {};
		type: string;
		links: {
			self: {
				href: string;
			};
			html: {
				href: string;
			};
		};
		pullrequest: {
			type: string;
			id: number;
			title: string;
			links: {
				self: {
					href: string;
				};
				html: {
					href: string;
				};
			};
		};
	};
}

interface BitbucketPullRequestComment {
	id: number;
	created_on: string;
	content: {
		raw: string;
		html: string;
	};
	user: {
		account_id: string;
		uuid: string;
		display_name: string;
		nickname: string;
		links?: {
			avatar?: {
				href?: string;
			};
		};
	};
	deleted: boolean;
	inline?: {
		from?: number | undefined;
		to?: number | undefined;
		path?: string;
	};
	type: string;
	file?: string;
	bodyHtml?: string;
	bodyText?: string;
	state?: string;
	parent?: {
		id: number;
	};
	children?: [BitbucketPullRequestComment];
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
		html: {
			href: string;
		};
		patch: {
			href: string;
		};
	};
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

interface BitbucketWorkspaceMembers {
	type?: string;
	user: {
		display_name: string;
		links: {
			self: {
				href: string;
			};
			avatar: {
				href: string;
			};
			html: {
				href: string;
			};
		};
		type: string;
		uuid: string;
		account_id: string;
		nickname: string;
	};
	workspace?: {
		type: string;
		uuid: string;
		name: string;
		slug: string;
		links: {
			avatar: {
				href: string;
			};
			html: {
				href: string;
			};
			self: {
				href: string;
			};
		};
	};
	links?: {
		self: {
			href: string;
		};
	};
}
[];

interface BitbucketReviewers {
	//This is the reviewer from the bitbucket API, NOT our version of reviewer
	display_name: string;
	links: {
		self?: {
			href: string;
		};
		avatar: {
			href: string;
		};
		html?: {
			href: string;
		};
	};
	type?: string;
	uuid: string;
	account_id: string;
	nickname: string;
}
[];

interface BitbucketUpdateReviewerRequest {
	reviewers: BitbucketReviewers[]; //this is the reviewers for Bitbucket API, not for us
}

interface BitbucketMergeRequestResponse {
	comment_count: number;
	task_count: number;
	type: string;
	id: number;
	title: string;
	description: string;
	rendered: {
		title: {
			type: string;
			raw: string;
			markup: string;
			html: string;
		};
		description: {
			type: string;
			raw: string;
			markup: string;
			html: string;
		};
	};
	state: string;
	merge_commit: {
		type: string;
		hash: string;
		date: string;
		author: {
			type: string;
			raw: string;
			user: {
				display_name: string;
				links: {
					avatar: {
						href: string;
					};
				};
				type: string;
				uuid: string;
				account_id: string;
				nickname: string;
			};
		};
		message: string;
		summary: {
			type: string;
			raw: string;
			markup: string;
			html: string;
		};
		links: {
			html: {
				href: string;
			};
		};
	};
	close_source_branch: false;
	closed_by: {
		display_name: string;
		links: {
			avatar: {
				href: string;
			};
		};
		type: string;
		uuid: string;
		account_id: string;
		nickname: string;
	};
	author: BitbucketAuthor;
	reason: string;
	created_on: string;
	updated_on: string;
	closed_on: string;
	destination: {
		branch: {
			name: string;
		};
		commit: {
			type: string;
			hash: string;
			links: {
				self: {
					href: string;
				};
				html: {
					href: string;
				};
			};
		};
		repository: {
			type: string;
			full_name: string;
			links: {
				avatar: {
					href: string;
				};
			};
			name: string;
			uuid: string;
		};
	};
	source: {
		branch: {
			name: string;
		};
		commit: {
			type: string;
			hash: string;
			links: {
				html: {
					href: string;
				};
			};
		};
		repository: {
			type: string;
			full_name: string;
			links: {
				avatar: {
					href: string;
				};
			};
			name: string;
			uuid: string;
		};
	};
	reviewers: BitbucketReviewers[];
	participants: BitbucketParticipants[];
	links: {
		html: {
			href: string;
		};
	};
	summary: {
		type: string;
		raw: string;
		markup: string;
		html: string;
	};
}

interface BitbucketUserPermissionsRequest {
	repository: {
		type: string;
		full_name: string;
		links: {
			self: {
				href: string;
			};
			html: {
				href: string;
			};
			avatar: {
				href: string;
			};
		};
		name: string;
		uuid: string;
	};
	type: string;
	permission: string;
	user: {
		display_name: string;
		links: {
			self: {
				href: string;
			};
			avatar: {
				href: string;
			};
			html: {
				href: string;
			};
		};
		type: string;
		uuid: string;
		account_id: string;
		nickname: string;
	};
}
[];

export interface BitbucketParticipants {
	type?: string;
	user: {
		display_name: string;
		links: {
			avatar: {
				href: string;
			};
		};
		type?: string;
		uuid: string;
		account_id: string;
		nickname: string;
	};
	role: BitbucketParticipantRole;
	approved: boolean;
	state?: string; //"approved" | "changes_requested"
	participated_on: string;
}
[];

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
	implements ThirdPartyProviderSupportsIssues
{
	private _knownRepos = new Map<string, BitbucketRepo>();
	private _reposWithIssues: BitbucketRepo[] = [];
	private _currentBitbucketUsers = new Map<string, BitbucketCurrentUser>();

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

	async getCurrentUser(): Promise<BitbucketCurrentUser> {
		await this.ensureConnected();

		const data = await this.get<BitbucketCurrentUser>(`/user`);

		const currentUser = {
			display_name: data.body.display_name,
			links: {
				self: {
					href: data.body.links.self.href,
				},
				avatar: {
					href: data.body.links.avatar.href,
				},
				repositories: {
					href: data.body.links.repositories.href,
				},
				snippets: {
					href: data.body.links.snippets.href,
				},
				html: {
					href: data.body.links.html.href,
				},
				hooks: {
					href: data.body.links.hooks.href,
				},
			},
			created_on: data.body.created_on,
			type: data.body.type,
			uuid: data.body.uuid,
			username: data.body.username,
			is_staff: data.body.is_staff,
			account_id: data.body.account_id,
			nickname: data.body.nickname,
			account_status: data.body.account_status,
		};
		return currentUser;
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
					users: members.map(u => ({ ...u, id: u.uuid, displayName: u.display_name })),
				};
			} else {
				const userResponse = await this.get<BitbucketUser>("/user");
				const user = userResponse.body;
				return { users: [{ ...user, id: user.uuid, displayName: user.display_name }] };
			}
		} catch (ex) {
			Logger.error(ex);
			return { users: [] };
		}
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

	private _isMatchingRemotePredicate = (r: GitRemoteLike) => r.domain === "bitbucket.org";
	getIsMatchingRemotePredicate() {
		return this._isMatchingRemotePredicate;
	}

	parseId(pullRequestId: string): { id: string; pullRequestId: string; repoWithOwner: string } {
		const parsed = JSON.parse(pullRequestId);
		return {
			id: parsed.pullRequestId,
			pullRequestId: parsed.pullRequestId,
			repoWithOwner: parsed.repoWithOwner,
		};
	}
}
