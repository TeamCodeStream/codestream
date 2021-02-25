import { ActionType, Index } from "../common";
import * as actions from "./actions";
import { clearCurrentPullRequest, setCurrentPullRequest } from "../context/actions";
import { ProviderPullRequestActionsTypes, ProviderPullRequestsState } from "./types";
import { createSelector } from "reselect";
import { CodeStreamState } from "..";
import { CSRepository } from "@codestream/protocols/api";
import { ContextActionsType, ContextState } from "../context/types";

type ProviderPullRequestActions =
	| ActionType<typeof actions>
	| ActionType<typeof setCurrentPullRequest>
	| ActionType<typeof clearCurrentPullRequest>;

const initialState: ProviderPullRequestsState = { pullRequests: {}, myPullRequests: {} };

const createNewObject = (state, action) => {
	const newState = { ...state.pullRequests };
	newState[action.payload.providerId] = newState[action.payload.providerId] || {};
	return newState;
};

export function reduceProviderPullRequests(
	state = initialState,
	action: ProviderPullRequestActions
): ProviderPullRequestsState {
	let id;
	if ((action as any).payload! && (action as any).payload.id) {
		// need to get the underlying id here if we're part of a composite
		// id, we need to parse it and get the _real_ id.
		if ((action as any).payload.id.indexOf("{") === 0) {
			id = JSON.parse((action as any).payload.id).id;
		} else {
			id = (action as any).payload.id;
		}
	}
	switch (action.type) {
		case ContextActionsType.SetCurrentPullRequest: {
			if (action.payload && id && action.payload.providerId) {
				const newState = createNewObject(state, action);
				newState[action.payload.providerId][id] = {
					...newState[action.payload.providerId][id]
				};
				newState[action.payload.providerId][id].error = undefined;
				return {
					myPullRequests: { ...state.myPullRequests },
					pullRequests: newState
				};
			} else if (action.payload) {
				const newState = { ...state };
				if (newState && newState.pullRequests) {
					for (const prProviders of Object.values(newState.pullRequests)) {
						for (const pr of Object.values(prProviders)) {
							pr.error = undefined;
						}
					}
				}
			}
			return state;
		}
		case ProviderPullRequestActionsTypes.AddMyPullRequests: {
			const newState = { ...state.myPullRequests };
			newState[action.payload.providerId] = {
				data: action.payload.data
			};
			return {
				myPullRequests: newState,
				pullRequests: { ...state.pullRequests }
			};
		}
		case ProviderPullRequestActionsTypes.AddPullRequestFiles: {
			const newState = createNewObject(state, action);
			const files = {
				...newState[action.payload.providerId][id].files
			};
			files[action.payload.commits] = action.payload.pullRequestFiles;
			newState[action.payload.providerId][id] = {
				...newState[action.payload.providerId][id],
				files
			};
			return {
				myPullRequests: { ...state.myPullRequests },
				pullRequests: newState
			};
		}
		case ProviderPullRequestActionsTypes.ClearPullRequestFiles: {
			const newState = createNewObject(state, action);
			newState[action.payload.providerId][id] = {
				...newState[action.payload.providerId][id],
				files: []
			};
			return {
				myPullRequests: { ...state.myPullRequests },
				pullRequests: newState
			};
		}
		case ProviderPullRequestActionsTypes.AddPullRequestCommits: {
			const newState = createNewObject(state, action);
			newState[action.payload.providerId][id] = {
				...newState[action.payload.providerId][id],
				commits: action.payload.pullRequestCommits
			};
			return {
				myPullRequests: { ...state.myPullRequests },
				pullRequests: newState
			};
		}
		case ProviderPullRequestActionsTypes.ClearPullRequestCommits: {
			const newState = createNewObject(state, action);
			newState[action.payload.providerId][id] = {
				...newState[action.payload.providerId][id],
				commits: []
			};
			return {
				myPullRequests: { ...state.myPullRequests },
				pullRequests: newState
			};
		}
		case ProviderPullRequestActionsTypes.AddPullRequestCollaborators: {
			const newState = createNewObject(state, action);
			newState[action.payload.providerId][id] = {
				...newState[action.payload.providerId][id],
				collaborators: action.payload.collaborators
			};
			return {
				myPullRequests: { ...state.myPullRequests },
				pullRequests: newState
			};
		}
		case ProviderPullRequestActionsTypes.AddPullRequestConversations: {
			const newState = createNewObject(state, action);
			newState[action.payload.providerId][id] = {
				...newState[action.payload.providerId][id],
				conversations: action.payload.pullRequest,
				conversationsLastFetch: Date.now()
			};
			return {
				myPullRequests: { ...state.myPullRequests },
				pullRequests: newState
			};
		}
		case ProviderPullRequestActionsTypes.ClearPullRequestError: {
			const newState = createNewObject(state, action);
			newState[action.payload.providerId][id] = {
				...newState[action.payload.providerId][id]
			};
			newState[action.payload.providerId][id].error = undefined;
			return {
				myPullRequests: { ...state.myPullRequests },
				pullRequests: newState
			};
		}
		case ProviderPullRequestActionsTypes.AddPullRequestError: {
			const newState = createNewObject(state, action);
			newState[action.payload.providerId][id] = {
				...newState[action.payload.providerId][id]
			};
			newState[action.payload.providerId][id].error = action.payload.error;
			return {
				myPullRequests: { ...state.myPullRequests },
				pullRequests: newState
			};
		}
		case ProviderPullRequestActionsTypes.HandleDirectives: {
			const newState = { ...state.pullRequests };
			let providerId = action.payload.providerId;
			newState[providerId] = newState[action.payload.providerId] || {};
			newState[providerId][id] = {
				...newState[providerId][id]
			};
			if (newState[providerId][id] && newState[providerId][id].conversations) {
				if (providerId === "gitlab*com" || providerId === "gitlab/enterprise") {
					const pr = newState[providerId][id].conversations.project.mergeRequest;
					for (const directive of action.payload.data) {
						if (directive.type === "addApprovedBy") {
							for (const d of directive.data) {
								if (!pr.approvedBy.nodes.find(_ => _.username === d.username)) {
									pr.approvedBy.nodes.push(d);
								}
							}
						} else if (directive.type === "removeApprovedBy") {
							pr.approvedBy.nodes.length = 0;
							for (const d of directive.data) {
								pr.approvedBy.nodes.push(d);
							}
						} else if (directive.type === "addNode") {
							// if (!directive.data.id) continue;
							// const node = pr.discussions.nodes.find(_ => _.id === directive.data.id);
							// if (!node) {
							pr.discussions.nodes.push(directive.data);
							//	}
						} else if (directive.type === "addNodes") {
							// if (!directive.data.id) continue;
							for (const d of directive.data) {
								if (!d.id) {
									console.warn("missing id");
									continue;
								}
								const node = pr.discussions.nodes.find(_ => _.id === d.id);
								if (!node) {
									pr.discussions.nodes.push(d);
								}
							}
						} else if (directive.type === "removeNode") {
							if (!directive.data.id) continue;

							let nodeIndex = 0;
							let nodeRemoveIndex = -1;
							let pseudoGoto = false;
							for (const node of pr.discussions.nodes) {
								if (node.id === directive.data.id) {
									// is an outer node
									nodeRemoveIndex = nodeIndex;
									break;
								}
								if (node.notes && node.notes.nodes.length) {
									let noteIndex = 0;
									for (const note of node.notes.nodes) {
										if (note.id === directive.data.id) {
											// if this is the first note, nuke all the replies too
											// by removing the parent node
											if (noteIndex === 0) {
												nodeRemoveIndex = nodeIndex;
												pseudoGoto = true;
												break;
											} else {
												node.notes.nodes.splice(noteIndex, 1);
												pseudoGoto = true;
												break;
											}
										}
										noteIndex++;
									}
								}

								if (pseudoGoto) {
									break;
								}
								nodeIndex++;
							}
							if (nodeRemoveIndex > -1) {
								pr.discussions.nodes.splice(nodeRemoveIndex, 1);
							}
							// const index = pr.discussions.nodes.indexOf(x => x.id === directive.data.id);
							// if (index > -1) {
							// 	pr.discussions.nodes.splice(index, 1);
							// }
							// for (const node of pr.discussions.nodes) {
							// 	node.notes.nodes = node.notes.nodes.filter(x => x.id !== directive.data.id);
							// }
						} else if (directive.type === "updatePullRequest") {
							for (const key in directive.data) {
								if (directive.data[key] && Array.isArray(directive.data[key].nodes)) {
									// clear out the array, but keep its reference
									pr[key].nodes.length = 0;
									for (const n of directive.data[key].nodes) {
										pr[key].nodes.push(n);
									}
								} else {
									pr[key] = directive.data[key];
								}
							}
						} else if (directive.type === "addReaction") {
							const reaction = pr.reactionGroups.find(_ => _.content === directive.data.name);
							if (reaction) {
								reaction.data.push(directive.data);
							} else {
								pr.reactionGroups.push({ content: directive.data.name, data: [directive.data] });
							}
						} else if (directive.type === "removeReaction") {
							const group = pr.reactionGroups.find(_ => _.content === directive.data.content);
							if (group) {
								group.data = group.data.filter(_ => _.user.username !== directive.data.username);
								if (group.data.length === 0) {
									pr.reactionGroups = pr.reactionGroups.filter(
										_ => _.content !== directive.data.content
									);
								}
							}
						}
					}
				} else if (providerId === "github*com" || providerId === "github/enterprise") {
					const pr = newState[providerId][id].conversations.repository.pullRequest;
					for (const directive of action.payload.data) {
						if (directive.type === "addReaction") {
							if (directive.data.subject.__typename === "PullRequest") {
								pr.reactionGroups
									.find(_ => _.content === directive.data.reaction.content)
									.users.nodes.push(directive.data.reaction.user);
							} else {
								const node = pr.timelineItems.nodes.find(_ => _.id === directive.data.subject.id);
								if (node) {
									node.reactionGroups
										.find(_ => _.content === directive.data.reaction.content)
										.users.nodes.push(directive.data.reaction.user);
								}
							}
						} else if (directive.type === "removeReaction") {
							if (directive.data.subject.__typename === "PullRequest") {
								pr.reactionGroups.find(
									_ => _.content === directive.data.reaction.content
								).users.nodes = pr.reactionGroups
									.find(_ => _.content === directive.data.reaction.content)
									.users.nodes.filter(_ => _.login !== directive.data.reaction.user.login);
							} else {
								const node = pr.timelineItems.nodes.find(_ => _.id === directive.data.subject.id);
								if (node) {
									node.reactionGroups.find(
										_ => _.content === directive.data.reaction.content
									).users.nodes = node.reactionGroups
										.find(_ => _.content === directive.data.reaction.content)
										.users.nodes.filter(_ => _.login !== directive.data.reaction.user.login);
								}
							}
						} else if (directive.type === "removeNode") {
							pr.timelineItems.nodes = pr.timelineItems.nodes.filter(
								_ => _.id !== directive.data.id
							);
						} else if (directive.type === "updateNode") {
							const node = pr.timelineItems.nodes.find(_ => _.id === directive.data.id);
							if (node) {
								for (const key in directive.data) {
									node[key] = directive.data[key];
								}
							}
						} else if (directive.type === "addNode") {
							if (!directive.data.id) continue;
							const node = pr.timelineItems.nodes.find(_ => _.id === directive.data.id);
							if (!node) {
								pr.timelineItems.nodes.push(directive.data);
							}
						} else if (directive.type === "addNodes") {
							for (const newNode of directive.data) {
								if (!newNode.id) continue;
								const node = pr.timelineItems.nodes.find((_: any) => _.id === newNode.id);
								if (!node) {
									pr.timelineItems.nodes.push(newNode);
								}
							}
						} else if (directive.type === "updatePullRequestReviewComment") {
							let done = false;
							for (const edge of pr.reviewThreads.edges) {
								if (!edge.node.comments) continue;
								for (const comment of edge.node.comments.nodes) {
									if (comment.id === directive.data.id) {
										for (const key in directive.data) {
											comment[key] = directive.data[key];
										}
										done = true;
									}
									if (done) break;
								}
								if (done) break;
							}
						} else if (directive.type === "updatePullRequestReviewCommentNode") {
							const node = pr.timelineItems.nodes.find(
								_ => _.id === directive.data.pullRequestReview.id
							);
							if (node && node.comments) {
								for (const comment of node.comments.nodes) {
									if (comment.id !== directive.data.id) continue;
									for (const key in directive.data) {
										comment[key] = directive.data[key];
									}
									break;
								}
							}
						} else if (directive.type === "updatePullRequestReview") {
							const node = pr.timelineItems.nodes.find(_ => _.id === directive.data.id);
							if (node) {
								for (const key in directive.data) {
									node[key] = directive.data[key];
								}
							}
						} else if (directive.type === "updatePullRequestReviewers") {
							pr.reviewRequests.nodes.length = 0;
							for (const data of directive.data) {
								pr.reviewRequests.nodes.push(data);
							}
						} else if (directive.type === "updatePullRequest") {
							for (const key in directive.data) {
								if (directive.data[key] && Array.isArray(directive.data[key].nodes)) {
									// clear out the array, but keep its reference
									pr[key].nodes.length = 0;
									for (const n of directive.data[key].nodes) {
										pr[key].nodes.push(n);
									}
								} else {
									pr[key] = directive.data[key];
								}
							}
						} else if (
							directive.type === "resolveReviewThread" ||
							directive.type === "unresolveReviewThread"
						) {
							const nodeWrapper = pr.reviewThreads.edges.find(
								_ => _.node.id === directive.data.threadId
							);
							if (nodeWrapper && nodeWrapper.node) {
								for (const key in directive.data) {
									nodeWrapper.node[key] = directive.data[key];
								}
							}

							const reviews = pr.timelineItems.nodes.filter(
								_ => _.__typename === "PullRequestReview"
							);
							if (reviews) {
								for (const review of reviews) {
									for (const comment of review.comments.nodes) {
										if (comment.threadId !== directive.data.threadId) continue;

										for (const key in directive.data) {
											comment[key] = directive.data[key];
										}

										break;
									}
								}
							}
						}
					}
				}
			}
			return {
				myPullRequests: { ...state.myPullRequests },
				pullRequests: newState
			};
		}
		case "RESET":
			return initialState;
		default:
			return state;
	}
}
const getRepos = (state: CodeStreamState) => Object.values(state.repos);
export const getProviderPullRequests = (state: CodeStreamState) => state.providerPullRequests;
export const getMyPullRequests = (state: CodeStreamState) =>
	state.providerPullRequests.myPullRequests;

/**
 * Gets the raw id of the pullRequest/mergeRequest as set by setCurrentPullRequest
 *
 * */
export const getPullRequestId = createSelector(
	(state: CodeStreamState) => state.context,
	(context: ContextState) => {
		return context.currentPullRequest ? context.currentPullRequest.id : "";
	}
);

/**
 * Gets the exact, parsed id of the pullRequest/mergeRequest. GitLab has a multi-id
 * setup, and this returns only the "id" part, or if GitHub, returns the value asis.
 *
 * */
export const getPullRequestExactId = createSelector(
	(state: CodeStreamState) => state.context,
	(context: ContextState) => {
		if (!context.currentPullRequest) return "";
		if (
			context.currentPullRequest.providerId === "gitlab*com" ||
			context.currentPullRequest.providerId === "gitlab/enterprise"
		) {
			try {
				return JSON.parse(context.currentPullRequest.id).id;
			} catch (ex) {
				console.warn(ex, context.currentPullRequest);
				throw ex;
			}
		}
		return context.currentPullRequest.id;
	}
);

/**
 * Gets the PR object for the currentPullRequestId
 */
export const getCurrentProviderPullRequest = createSelector(
	getProviderPullRequests,
	getPullRequestExactId,
	(providerPullRequests, id: string) => {
		if (!id) return undefined;
		for (const providerPullRequest of Object.values(providerPullRequests)) {
			for (const pullRequests of Object.values(providerPullRequest)) {
				if (!pullRequests) continue;
				const data = pullRequests[id];
				if (data) return data;
			}
		}
		return undefined;
	}
);

export const getCurrentProviderPullRequestLastUpdated = createSelector(
	getCurrentProviderPullRequest,
	providerPullRequest => {
		if (!providerPullRequest) return undefined;
		return providerPullRequest &&
			providerPullRequest.conversations &&
			providerPullRequest.conversations.repository &&
			providerPullRequest.conversations.repository.pullRequest
			? providerPullRequest.conversations.repository.pullRequest.updatedAt
			: undefined;
	}
);
/**
 *  Attempts to get a CS repo for the current PR
 */
export const getProviderPullRequestRepo = createSelector(
	getRepos,
	getCurrentProviderPullRequest,
	(repos, currentPr) => {
		let currentRepo: CSRepository | undefined = undefined;

		try {
			if (!currentPr || !currentPr.conversations || !currentPr.conversations.repository) {
				return undefined;
			}
			let repoName;
			let repoUrl;
			if (!currentPr.conversations.repository) {
				// debugger;
				repoName = currentPr.conversations.project.name.toLowerCase();
				repoUrl = currentPr.conversations.project.mergeRequest.webUrl.toLowerCase();
			} else {
				repoName = currentPr.conversations.repository.repoName.toLowerCase();
				repoUrl = currentPr.conversations.repository.url.toLowerCase();
			}
			let matchingRepos = repos.filter(_ =>
				_.remotes.some(
					r =>
						r.normalizedUrl &&
						r.normalizedUrl.length > 2 &&
						r.normalizedUrl.match(/([a-zA-Z0-9]+)/) &&
						repoUrl.indexOf(r.normalizedUrl.toLowerCase()) > -1
				)
			);
			if (matchingRepos.length === 1) {
				currentRepo = matchingRepos[0];
			} else {
				let matchingRepos2 = repos.filter(_ => _.name && _.name.toLowerCase() === repoName);
				if (matchingRepos2.length != 1) {
					matchingRepos2 = repos.filter(_ =>
						_.remotes.some(r => repoUrl.indexOf(r.normalizedUrl.toLowerCase()) > -1)
					);
					if (matchingRepos2.length === 1) {
						currentRepo = matchingRepos2[0];
					} else {
						console.error(`Could not find repo for repoName=${repoName} repoUrl=${repoUrl}`);
					}
				} else {
					currentRepo = matchingRepos2[0];
				}
			}
		} catch (error) {
			console.error(error);
		}
		return currentRepo;
	}
);

// TODO make this generic so that we don't need it
export const getProviderPullRequestRepo2 = createSelector(
	getRepos,
	getCurrentProviderPullRequest,
	(repos, currentPr) => {
		let currentRepo: CSRepository | undefined = undefined;

		try {
			if (!currentPr || !currentPr.sourceProject) return undefined;
			const repoName = currentPr.sourceProject.name.toLowerCase();
			const repoUrl = currentPr.sourceProject.webUrl.toLowerCase();

			let matchingRepos = repos.filter(_ =>
				_.remotes.some(
					r =>
						r.normalizedUrl &&
						r.normalizedUrl.length > 2 &&
						r.normalizedUrl.match(/([a-zA-Z0-9]+)/) &&
						repoUrl.indexOf(r.normalizedUrl.toLowerCase()) > -1
				)
			);
			if (matchingRepos.length === 1) {
				currentRepo = matchingRepos[0];
			} else {
				let matchingRepos2 = repos.filter(_ => _.name && _.name.toLowerCase() === repoName);
				if (matchingRepos2.length != 1) {
					matchingRepos2 = repos.filter(_ =>
						_.remotes.some(r => repoUrl.indexOf(r.normalizedUrl.toLowerCase()) > -1)
					);
					if (matchingRepos2.length === 1) {
						currentRepo = matchingRepos2[0];
					} else {
						console.error(`Could not find repo for repoName=${repoName} repoUrl=${repoUrl}`);
					}
				} else {
					currentRepo = matchingRepos2[0];
				}
			}
		} catch (error) {
			console.error(error);
		}
		return currentRepo;
	}
);

export const getProviderPullRequestCollaborators = createSelector(
	getCurrentProviderPullRequest,
	currentPr => {
		return currentPr ? currentPr.collaborators : [];
	}
);

export const isAnHourOld = conversationsLastFetch => {
	return conversationsLastFetch > 0 && Date.now() - conversationsLastFetch > 60 * 60 * 1000;
};
