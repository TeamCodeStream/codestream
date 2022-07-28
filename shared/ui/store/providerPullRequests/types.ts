import { CSRepository } from "@codestream/protocols/api";
import { Index } from "../common";
import { GetMyPullRequestsResponse } from "@codestream/protocols/agent";

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
	UpdatePullRequestFilter = "@providerPullRequests/UpdatePullRequestFilter"
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
	myPullRequests: Index<{ data?: GetMyPullRequestsResponse[] }>;
	pullRequests: Index<
		Index<{
			conversations: any;

			/**
			 * Client side date tracking of when this was last added to the redux store
			 *
			 * @type {(number | undefined)}
			 */
			conversationsLastFetch: number | undefined;
			files?: any[];
			collaborators?: any[];
			commits?: any[];
			error?: { message: string };
			accessRawDiffs?: boolean;
		}>
	>;
};

export type RepoPullRequest = {
	conversations: {
		// github
		repository?: {
			repoName: string;
			url: string;
		};
		// gitlab
		project?: {
			name: string;
			repoName: string;
			mergeRequest: {
				webUrl: string;
			};
		};
	};
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
