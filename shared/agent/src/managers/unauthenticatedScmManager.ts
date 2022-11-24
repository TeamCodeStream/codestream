import {
	GetUserInfoRequestType,
	GetUserInfoResponse,
	GetWorkspaceAutoJoinInfoRequestType,
	GetWorkspaceAutoJoinInfoResponse,
	GetWorkspaceRepoInfoRequestType,
	GetWorkspaceRepoInfoResponse,
} from "@codestream/protocols/agent";

import { Container } from "../container";
import { git } from "../git/git";
import { Logger } from "../logger";
import { lsp, lspHandler } from "../system";

const os = require("os");

@lsp
export class UnauthenticatedScmManager {
	@lspHandler(GetUserInfoRequestType)
	async getUserInfo(): Promise<GetUserInfoResponse> {
		try {
			// since OSes have different requirements for characters in usernames,
			// i'd regex replace out any characters that are not ones that we allow
			// just to allow an even greater frictionless experience.
			// "canz man".replace(/[^A-Za-z0-9\-_\.]/g,'') => "canzman"
			const userInfo = os.userInfo();
			const username = userInfo.username.replace(/[^A-Za-z0-9\-_\.]/g, "").substring(0, 21);
			const email = await git({}, "config", "--get", "user.email");
			const name = await git({}, "config", "--get", "user.name");

			return { email: email.trim(), name: name.trim(), username };
		} catch {
			return { email: "", name: "", username: "" };
		}
	}

	@lspHandler(GetWorkspaceRepoInfoRequestType)
	async getKnownCommitHashesInOpenRepos(): Promise<GetWorkspaceRepoInfoResponse | undefined> {
		try {
			const { repositoryLocator } = Container.instance();
			const repos = await repositoryLocator.getKnownCommitHashesForRepos();
			return { repos: repos };
		} catch (ex) {
			Logger.error(ex);
			return undefined;
		}
	}

	@lspHandler(GetWorkspaceAutoJoinInfoRequestType)
	async getAutoJoinInfo(): Promise<GetWorkspaceAutoJoinInfoResponse[] | undefined> {
		try {
			const { server } = Container.instance();
			const result = await this.getKnownCommitHashesInOpenRepos();
			if (!result || !result.repos) return undefined;

			const accumulator: string[] = [];
			const shas = Object.keys(result.repos).reduce(
				(r, k) => r.concat(result.repos[k]),
				accumulator
			);
			if (!shas || !shas.length) return undefined;

			const response = (await server.get({
				url: "/no-auth/team-lookup",
				queryData: {
					commitHashes: shas.join(","),
				},
			})) as GetWorkspaceAutoJoinInfoResponse[];
			return response;
		} catch (ex) {
			Logger.error(ex);
			return undefined;
		}
	}
}
