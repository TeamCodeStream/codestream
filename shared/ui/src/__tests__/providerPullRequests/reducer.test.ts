import { CSRemote, CSRepository } from "@codestream/protocols/api";
interface RepoStub extends Omit<Partial<CSRepository>, "remotes"> {
	remotes: RemoteStub[];
}

interface RemoteStub extends Partial<CSRemote> {}

// function stubRepos(repo: RepoStub[]): CSRepository[] {
// 	return repo as CSRepository[];
// }

// function stubConversations(
// 	ob: Partial<FetchThirdPartyPullRequestResponse>
// ): FetchThirdPartyPullRequestResponse {
// 	return ob as FetchThirdPartyPullRequestResponse;
// }
