import {
	FetchThirdPartyPullRequestCommitsResponse,
	FetchThirdPartyPullRequestResponse,
	GetCommitsFilesResponse,
	GetMyPullRequestsResponse,
	GitLabMergeRequest,
} from "@codestream/protocols/agent";
import { CSRepository } from "@codestream/protocols/api";

import { Collaborator } from "@codestream/protocols/webview";
import { Index } from "../common";

export enum ProviderPullRequestActionsTypes {
	AddPullRequestConversations = "@providerPullRequests/AddConversations",
	AddPullRequestCollaborators = "@providerPullRequests/AddPullRequestCollaborators",
	AddPullRequestFiles = "@providerPullRequests/AddFiles",
	AddPullRequestCommits = "@providerPullRequests/AddCommits",
	AddMyPullRequests = "@providerPullRequests/AddMyPullRequests",
	ClearPullRequestFiles = "@providerPullRequests/ClearFiles",
	ClearPullRequestCommits = "@providerPullRequests/ClearCommits",
	AddPullRequestError = "@providerPullRequests/AddError",
	ClearPullRequestError = "@providerPullRequests/ClearError",
	HandleDirectives = "@providerPullRequests/HandleDirectives",
	UpdatePullRequestTitle = "@providerPullRequests/UpdatePullRequestTitle",
	UpdatePullRequestFilter = "@providerPullRequests/UpdatePullRequestFilter",
}

export function isGitLabMergeRequest(mr: any): mr is GitLabMergeRequest {
	if (mr?.webUrl) {
		return true;
	}
	return mr.hasOwnProperty("author") && mr.hasOwnProperty("baseRefName");
}

export interface RepoPullRequest {
	conversations?: FetchThirdPartyPullRequestResponse;

	/**
	 * Client side date tracking of when this was last added to the redux store
	 *
	 * @type {(number | undefined)}
	 */
	conversationsLastFetch: number | undefined;
	files?: { [key: string]: GetCommitsFilesResponse[] };
	collaborators?: Collaborator[];
	commits?: FetchThirdPartyPullRequestCommitsResponse[];
	error?: { message: string };
	accessRawDiffs?: boolean;
}

/**
 * data structure is as such:
 * myPullRequests: {
 * 	data: GetMyPullRequestsResponse[]
 * }
 * pullRequests: {
 * 	"github*com": {
 * 			"prId": {
 * 				conversations: any,
 * 				files: any[]
 * 				commits: any[]
 * 			}
 *  	}
 * 	}
 */
export type ProviderPullRequestsState = {
	myPullRequests: Index<GetMyPullRequestsResponse[][]>;
	pullRequests: Index<Index<RepoPullRequest>>;
};

export type RepoMatchReason = "remote" | "repoName" | "matchedOnProviderUrl" | "closestMatch";

export type CurrentRepoResponse = {
	error?: string;
	currentRepo?: CSRepository;
	repos?: CSRepository[];
	repoName?: string;
	repoUrl?: string;
	reason?: RepoMatchReason;
};
