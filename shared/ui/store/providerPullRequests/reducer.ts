import { ActionType, Index } from "../common";
import * as actions from "./actions";
import { clearCurrentPullRequest, setCurrentPullRequest } from "../context/actions";
import { ProviderPullRequestActionsTypes, ProviderPullRequestsState } from "./types";
import { createSelector } from "reselect";
import { CodeStreamState } from "..";
import { CSRepository } from "@codestream/protocols/api";
import { ContextActionsType } from "../context/types";

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
	switch (action.type) {
		case ContextActionsType.SetCurrentPullRequest: {
			if (action.payload && action.payload.id && action.payload.providerId) {
				const newState = createNewObject(state, action);
				newState[action.payload.providerId][action.payload.id] = {
					...newState[action.payload.providerId][action.payload.id]
				};
				newState[action.payload.providerId][action.payload.id].error = undefined;
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
		case ProviderPullRequestActionsTypes.RemoveFromMyPullRequests: {
			const newState = { ...state.myPullRequests };
			newState[action.payload.providerId] = {
				data: undefined
			};
			return {
				myPullRequests: newState,
				pullRequests: { ...state.pullRequests }
			};
		}
		case ProviderPullRequestActionsTypes.ClearMyPullRequests: {
			const newState = { ...state.myPullRequests };
			newState[action.payload.providerId] = {
				data: undefined
			};
			return {
				myPullRequests: newState,
				pullRequests: { ...state.pullRequests }
			};
		}
		case ProviderPullRequestActionsTypes.AddPullRequestFiles: {
			const newState = createNewObject(state, action);
			newState[action.payload.providerId][action.payload.id] = {
				...newState[action.payload.providerId][action.payload.id],
				files: action.payload.pullRequestFiles
			};
			return {
				myPullRequests: { ...state.myPullRequests },
				pullRequests: newState
			};
		}
		case ProviderPullRequestActionsTypes.ClearPullRequestFiles: {
			const newState = createNewObject(state, action);
			newState[action.payload.providerId][action.payload.id] = {
				...newState[action.payload.providerId][action.payload.id],
				files: []
			};
			return {
				myPullRequests: { ...state.myPullRequests },
				pullRequests: newState
			};
		}
		case ProviderPullRequestActionsTypes.AddPullRequestCommits: {
			const newState = createNewObject(state, action);
			newState[action.payload.providerId][action.payload.id] = {
				...newState[action.payload.providerId][action.payload.id],
				commits: action.payload.pullRequestCommits
			};
			return {
				myPullRequests: { ...state.myPullRequests },
				pullRequests: newState
			};
		}
		case ProviderPullRequestActionsTypes.ClearPullRequestCommits: {
			const newState = createNewObject(state, action);
			newState[action.payload.providerId][action.payload.id] = {
				...newState[action.payload.providerId][action.payload.id],
				commits: []
			};
			return {
				myPullRequests: { ...state.myPullRequests },
				pullRequests: newState
			};
		}
		case ProviderPullRequestActionsTypes.AddPullRequestCollaborators: {
			const newState = createNewObject(state, action);
			newState[action.payload.providerId][action.payload.id] = {
				...newState[action.payload.providerId][action.payload.id],
				collaborators: action.payload.collaborators
			};
			return {
				myPullRequests: { ...state.myPullRequests },
				pullRequests: newState
			};
		}
		case ProviderPullRequestActionsTypes.AddPullRequestConversations: {
			const newState = createNewObject(state, action);
			newState[action.payload.providerId][action.payload.id] = {
				...newState[action.payload.providerId][action.payload.id],
				conversations: action.payload.pullRequest
			};
			return {
				myPullRequests: { ...state.myPullRequests },
				pullRequests: newState
			};
		}
		case ProviderPullRequestActionsTypes.ClearPullRequestError: {
			const newState = createNewObject(state, action);
			newState[action.payload.providerId][action.payload.id] = {
				...newState[action.payload.providerId][action.payload.id]
			};
			newState[action.payload.providerId][action.payload.id].error = undefined;
			return {
				myPullRequests: { ...state.myPullRequests },
				pullRequests: newState
			};
		}
		case ProviderPullRequestActionsTypes.AddPullRequestError: {
			const newState = createNewObject(state, action);
			newState[action.payload.providerId][action.payload.id] = {
				...newState[action.payload.providerId][action.payload.id]
			};
			newState[action.payload.providerId][action.payload.id].error = action.payload.error;
			return {
				myPullRequests: { ...state.myPullRequests },
				pullRequests: newState
			};
		}
		case ProviderPullRequestActionsTypes.HandleDirectives: {
			const newState = { ...state.pullRequests };
			let providerId = action.payload.providerId;
			let id = action.payload.id;
			newState[providerId] = newState[action.payload.providerId] || {};
			newState[providerId][id] = {
				...newState[providerId][id]
			};
			if (newState[providerId][id] && newState[providerId][id].conversations) {
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
							} else {
								console.warn(`Could not find node with id ${directive.data.subject.id}`);
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
							} else {
								console.warn(`Could not find node with id ${directive.data.subject.id}`);
							}
						}
					} else if (directive.type === "removeNode") {
						pr.timelineItems.nodes = pr.timelineItems.nodes.filter(_ => _.id !== directive.data.id);
					} else if (directive.type === "updateNode") {
						const node = pr.timelineItems.nodes.find(_ => _.id === directive.data.id);
						if (node) {
							for (const key in directive.data) {
								node[key] = directive.data[key];
							}
						} else {
							console.warn(`Could not find node with id ${directive.data.subject.id}`);
						}
					} else if (directive.type === "addNode") {
						if (!directive.data.id) continue;
						const node = pr.timelineItems.nodes.find(_ => _.id === directive.data.id);
						if (!node) {
							pr.timelineItems.nodes.push(directive.data);
						} else {
							console.warn(`Could not find node with id ${directive.data.id}`);
						}
					} else if (directive.type === "addNodes") {
						for (const newNode of directive.data) {
							if (!newNode.id) continue;
							const node = pr.timelineItems.nodes.find((_: any) => _.id === newNode.id);
							if (!node) {
								pr.timelineItems.nodes.push(newNode);
							} else {
								console.warn(`Node already exists: id ${newNode.id}`);
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
						} else {
							console.warn(`Could not find node with id ${directive.data.id}`);
						}
					} else if (directive.type === "updatePullRequestReview") {
						const node = pr.timelineItems.nodes.find(_ => _.id === directive.data.id);
						if (node) {
							for (const key in directive.data) {
								node[key] = directive.data[key];
							}
						} else {
							console.warn(`Could not find node with id ${directive.data.id}`);
						}
					} else if (directive.type === "updatePullRequest") {
						for (const key in directive.data) {
							pr[key] = directive.data[key];
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
						} else {
							console.warn(`Could not find node with id ${directive.data.threadId}`);
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
const currentPullRequest = (state: CodeStreamState) => state.context.currentPullRequest;
const currentPullRequestId = (state: CodeStreamState) =>
	state.context.currentPullRequest ? state.context.currentPullRequest.id : undefined;

/**
 * Gets the PR object for the currentPullRequestId
 */
export const getCurrentProviderPullRequest = createSelector(
	getProviderPullRequests,
	currentPullRequestId,
	(providerPullRequests, id) => {
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

/**
 *  Attempts to get a CS repo for the current PR
 */
export const getProviderPullRequestRepo = createSelector(
	getRepos,
	getCurrentProviderPullRequest,
	(repos, currentPr) => {
		let currentRepo: CSRepository | undefined = undefined;

		try {
			if (!currentPr || !currentPr.conversations) return undefined;
			const repoName = currentPr.conversations.repository.repoName.toLowerCase();
			const repoUrl = currentPr.conversations.repository.url.toLowerCase();

			let matchingRepos = repos.filter(_ =>
				_.remotes.some(r => r.normalizedUrl && repoUrl.indexOf(r.normalizedUrl.toLowerCase()) > -1)
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
