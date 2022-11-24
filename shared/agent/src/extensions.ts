import { ReposScm } from "@codestream/protocols/agent";

import { GitRemote, GitRepository } from "git/models/models";
import { xfs } from "./xfs";

export namespace GitRepositoryExtensions {
	/**
	 * Converts a GitRepository into a RepoScm object
	 *
	 * @export
	 * @param {GitRepository} repo
	 * @param {(string | undefined)} currentBranch
	 * @param {GitRemote[]} remotes
	 * @param {withSubDirectoriesDepth} number, if set, a partial tree of directories will be returned with this repository
	 * @return {*}  {ReposScm}
	 */
	export function toRepoScm(
		repo: GitRepository,
		currentBranch: string | undefined,
		remotes: GitRemote[],
		withSubDirectoriesDepth?: number
	): ReposScm {
		const result = {
			id: repo.id,
			path: repo.path,
			folder: repo.folder,
			root: repo.root,
			currentBranch: currentBranch,
			remotes: remotes,
			providerGuess:
				// FIXME -- not sure how to map remotes to github enterprise, gitlab onprem, etc.
				remotes
					? remotes.find(remote => remote.domain.includes("github"))
						? "github"
						: remotes.find(remote => remote.domain.includes("gitlab"))
						? "gitlab"
						: remotes.find(remote => remote.domain.includes("bitbucket"))
						? "bitbucket"
						: ""
					: undefined,
			directories: withSubDirectoriesDepth
				? xfs.getDirectoryTree(
						{
							depth: 0,
							children: [],
							name: "/",
							fullPath: repo.path,
							id: repo.id!,
							partialPath: [],
						},
						withSubDirectoriesDepth
				  )
				: undefined,
		};
		return result;
	}
}
