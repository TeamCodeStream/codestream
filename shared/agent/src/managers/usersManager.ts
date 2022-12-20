"use strict";
import {
	BlameAuthor,
	DeleteUserRequest,
	DeleteUserRequestType,
	FetchUsersRequest,
	FetchUsersRequestType,
	FetchUsersResponse,
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
	UpdateInvisibleRequest,
	UpdateInvisibleRequestType,
	UpdatePreferencesRequest,
	UpdatePreferencesRequestType,
	UpdatePreferencesResponse,
	UpdatePresenceRequest,
	UpdatePresenceRequestType,
	UpdateStatusRequest,
	UpdateStatusRequestType,
	UpdateStatusResponse,
	UpdateUserRequest,
	UpdateUserRequestType,
} from "@codestream/protocols/agent";
import { CSMe, CSUser } from "@codestream/protocols/api";

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

	@lspHandler(UpdatePresenceRequestType)
	updatePresence(request: UpdatePresenceRequest) {
		return this.session.api.updatePresence(request);
	}

	async getMe(): Promise<CSMe> {
		const cachedMe = await this.cache.getById(this.session.userId);
		if (!cachedMe) {
			throw new Error(`User's own object (${this.session.userId}) not found in cache`);
		}
		return cachedMe as CSMe;
	}

	// Non-promise version from cache
	getMeCached(): CSMe {
		const cachedMe = this.cache.getFromCache([["id", this.session.userId]]);
		if (!cachedMe) {
			throw new Error(`User's own object (${this.session.userId}) not found in cache`);
		}
		return cachedMe as CSMe;
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

	pipeEscape(s: string) {
		return s.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
	}

	pipeUnescape(s: string) {
		return s.replace(/\\\|/g, "|").replace(/\\\\/g, "\\");
	}
}
