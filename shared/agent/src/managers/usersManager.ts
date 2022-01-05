"use strict";
import { Logger } from "../logger";
import {
	BlameAuthor,
	CompactModifiedRepo,
	DeleteUserRequest,
	DeleteUserRequestType,
	FetchUsersRequest,
	FetchUsersRequestType,
	FetchUsersResponse,
	GetMeRequestType,
	GetMeResponse,
	GetPreferencesRequestType,
	GetPreferencesResponse,
	GetUnreadsRequest,
	GetUnreadsRequestType,
	GetUnreadsResponse,
	GetUserRequest,
	GetUserRequestType,
	GetUserResponse,
	InviteUserRequest,
	InviteUserRequestType,
	KickUserRequest,
	KickUserRequestType,
	RepoScmStatus,
	SetModifiedReposRequest,
	SetModifiedReposRequestType,
	UpdateInvisibleRequest,
	UpdateInvisibleRequestType,
	UpdateInvisibleResponse,
	UpdatePreferencesRequest,
	UpdatePreferencesRequestType,
	UpdatePreferencesResponse,
	UpdatePresenceRequest,
	UpdatePresenceRequestType,
	UpdateStatusRequest,
	UpdateStatusRequestType,
	UpdateStatusResponse,
	UpdateUserRequest,
	UpdateUserRequestType
} from "../protocol/agent.protocol";
import { CSMe, CSUser, FileStatus } from "../protocol/api.protocol";
import { lsp, lspHandler } from "../system";
import { CachedEntityManagerBase, Id } from "./entityManager";

@lsp
export class UsersManager extends CachedEntityManagerBase<CSUser> {
	@lspHandler(FetchUsersRequestType)
	async get(request?: FetchUsersRequest): Promise<FetchUsersResponse> {
		let users = await this.getAllCached();
		if (request != null) {
			if (request.userIds != null && request.userIds.length !== 0) {
				users = users.filter(u => request.userIds!.includes(u.id));
			}
		}

		return { users: users };
	}

	protected async loadCache() {
		const response = await this.session.api.fetchUsers({});
		response.users.forEach(user => {
			this.resolveModifiedRepos(user);
		});
		const { users, ...rest } = response;
		this.cache.reset(users);
		this.cacheResponse(rest);
	}

	async getByEmails(
		emails: string[],
		options: { ignoreCase?: boolean } = { ignoreCase: true }
	): Promise<CSUser[]> {
		if (options.ignoreCase) {
			emails = emails.map(email => email.toLocaleUpperCase());
		}

		const users = (await this.get()).users;
		return users.filter(
			u =>
				u.email != null &&
				emails.includes(options.ignoreCase ? u.email.toLocaleUpperCase() : u.email)
		);
	}

	async enrichEmailList(emails: string[]): Promise<BlameAuthor[]> {
		emails = emails.map(email => email.toLocaleLowerCase());

		const users = (await this.get()).users;

		const ret: BlameAuthor[] = [];
		emails.forEach((email: string) => {
			const user = users.find(u => u.email?.toLocaleLowerCase() === email);
			if (user) ret.unshift({ id: user.id, email: user.email, username: user.username });
			else ret.push({ email });
		});
		return ret.filter(author => !author.email.toLocaleLowerCase().includes("noreply"));
	}

	protected async fetchById(userId: Id): Promise<CSUser> {
		if (this.session.userId !== userId) {
			const response = await this.session.api.getMe();
			return response.user;
		}

		const response = await this.session.api.getUser({ userId: userId });
		return response.user;
	}

	@lspHandler(InviteUserRequestType)
	inviteUser(request: InviteUserRequest) {
		return this.session.api.inviteUser(request);
	}

	@lspHandler(DeleteUserRequestType)
	deleteUser(request: DeleteUserRequest) {
		return this.session.api.deleteUser(request);
	}

	@lspHandler(KickUserRequestType)
	kickUser(request: KickUserRequest) {
		return this.session.api.kickUser(request);
	}

	@lspHandler(UpdateUserRequestType)
	updateUser(request: UpdateUserRequest) {
		return this.session.api.updateUser(request);
	}

	@lspHandler(UpdatePreferencesRequestType)
	async updatePreferences(request: UpdatePreferencesRequest): Promise<UpdatePreferencesResponse> {
		return this.session.api.updatePreferences(request);
	}

	@lspHandler(UpdateStatusRequestType)
	async updateStatus(request: UpdateStatusRequest): Promise<UpdateStatusResponse> {
		return this.session.api.updateStatus(request);
	}

	@lspHandler(UpdateInvisibleRequestType)
	async updateInvisible(request: UpdateInvisibleRequest): Promise<UpdateStatusResponse> {
		return this.session.api.updateInvisible(request);
	}

	@lspHandler(SetModifiedReposRequestType)
	async setModifiedRepos(request: SetModifiedReposRequest): Promise<void> {
		return this.session.api.setModifiedRepos(request);
	}

	@lspHandler(UpdatePresenceRequestType)
	updatePresence(request: UpdatePresenceRequest) {
		return this.session.api.updatePresence(request);
	}

	@lspHandler(GetMeRequestType)
	async getMe(): Promise<GetMeResponse> {
		if (this.session.userId !== undefined) {
			const cachedMe = await this.getById(this.session.userId);
			if (cachedMe !== undefined) {
				return { user: cachedMe as CSMe };
			}
		}

		return await this.session.api.getMe();
	}

	@lspHandler(GetUnreadsRequestType)
	getUnreads(request: GetUnreadsRequest): Promise<GetUnreadsResponse> {
		return this.session.api.getUnreads(request);
	}

	@lspHandler(GetUserRequestType)
	protected async getUser(request: GetUserRequest): Promise<GetUserResponse> {
		const user = await this.getById(request.userId);
		return { user: user };
	}

	@lspHandler(GetPreferencesRequestType)
	async getPreferences(): Promise<GetPreferencesResponse> {
		return this.session.api.getPreferences();
	}

	protected getEntityName(): string {
		return "User";
	}

	protected resolveModifiedRepos(entity: CSUser) {
		if (entity.compactModifiedRepos) {
			entity.modifiedRepos = {};
			Object.keys(entity.compactModifiedRepos).forEach(teamId => {
				entity.modifiedRepos![teamId] = this.decompactifyModifiedRepos(
					entity.compactModifiedRepos![teamId]
				);
			});
			delete entity.compactModifiedRepos;
		}
	}

	async cacheSet(entity: CSUser, oldEntity?: CSUser): Promise<CSUser | undefined> {
		this.resolveModifiedRepos(entity);
		return super.cacheSet(entity, oldEntity);
	}

	pipeEscape(s: string) {
		return s.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
	}

	pipeUnescape(s: string) {
		return s.replace(/\\\|/g, "|").replace(/\\\\/g, "\\");
	}

	compactifyModifiedRepos(modifiedRepos: RepoScmStatus[]) {
		return modifiedRepos.map(repo => {
			return {
				repoId: repo.repoId || "",
				repoPath: repo.repoPath,
				branch: repo.branch || "",
				startCommit: repo.startCommit,
				modifiedFiles: repo.modifiedFiles.map(file => {
					return `1|${this.pipeEscape(file.file)}|${file.status}|${file.linesAdded}|${
						file.linesRemoved
					}`;
				}),
				stompingAuthors: repo.authors
					.filter(author => author.stomped)
					.map(author => {
						return `1|${this.pipeEscape(author.email)}|${author.stomped}`;
					}),
				localCommits: (repo.commits || []).map(commit => {
					const info = commit.info as { [key: string]: string };
					return `1|${commit.sha || ""}|${this.pipeEscape(info.shortMessage || "")}`;
				})
			};
		});
	}

	decompactifyModifiedRepos(compactModifiedRepos: CompactModifiedRepo[]): RepoScmStatus[] {
		return compactModifiedRepos.map(repo => {
			return {
				repoId: repo.repoId,
				repoPath: repo.repoPath,
				branch: repo.branch,
				startCommit: repo.startCommit,
				modifiedFiles: repo.modifiedFiles.map(file => {
					const parts = file.split("|");
					return {
						file: this.pipeUnescape(parts[1]),
						oldFile: "", // unused
						status: parts[2] as FileStatus,
						linesAdded: parseInt(parts[3], 10),
						linesRemoved: parseInt(parts[4], 10)
					};
				}),
				authors: repo.stompingAuthors.map(author => {
					const parts = author.split("|");
					return {
						email: this.pipeUnescape(parts[1]),
						stomped: parseInt(parts[2], 10),
						commits: 0 // unused
					};
				}),
				commits: repo.localCommits.map(commit => {
					const parts = commit.split("|");
					return {
						sha: parts[1],
						localOnly: true,
						info: {
							shortMessage: this.pipeUnescape(parts[2])
						}
					};
				}),
				// these are unused
				savedFiles: [],
				stagedFiles: [],
				remotes: [],
				totalModifiedLines: 0
			};
		});
	}

	pruneModifiedRepos(modifiedRepos: RepoScmStatus[]): RepoScmStatus[] {
		return modifiedRepos.map(repo => {
			return {
				repoId: repo.repoId || "",
				repoPath: repo.repoPath,
				branch: repo.branch || "",
				startCommit: repo.startCommit,
				modifiedFiles: repo.modifiedFiles.map(file => {
					return {
						file: file.file,
						oldFile: "",
						status: file.status,
						linesAdded: file.linesAdded,
						linesRemoved: file.linesRemoved
					};
				}),
				authors: repo.authors
					.filter(author => author.stomped)
					.map(author => {
						return {
							email: author.email,
							stomped: author.stomped,
							commits: 0 // unused but required
						};
					}),
				commits: (repo.commits || [])
					.filter(commit => commit.localOnly)
					.map(commit => {
						const info = commit.info as { [key: string]: string };
						return {
							sha: commit.sha,
							localOnly: true,
							info: {
								shortMessage: info.shortMessage || ""
							}
						};
					}),
				// these are unused but required in RepoScmStatus
				savedFiles: [],
				stagedFiles: [],
				remotes: [],
				totalModifiedLines: 0
			};
		});
	}
}
