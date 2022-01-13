import { ActionType } from "../common";
import * as actions from "./actions";
import { clearCurrentPullRequest, setCurrentPullRequest } from "../context/actions";
import { ProviderPullRequestActionsTypes, ProviderPullRequestsState } from "./types";
import { createSelector } from "reselect";
import { CodeStreamState } from "..";
import { CSRepository } from "@codestream/protocols/api";
import { ContextActionsType, ContextState } from "../context/types";
import {
	DiscussionNode,
	FetchThirdPartyPullRequestPullRequest,
	GitLabMergeRequest
} from "@codestream/protocols/agent";
import { logError } from "@codestream/webview/logger";

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
		case ProviderPullRequestActionsTypes.UpdatePullRequestFilter: {
			const newState = { ...state.myPullRequests };
			if (newState[action.payload.providerId].data) {
				newState[action.payload.providerId].data![action.payload.index] = action.payload.data;
			}
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
				accessRawDiffs: action.payload.accessRawDiffs,
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
		case ProviderPullRequestActionsTypes.UpdatePullRequestTitle: {
			const newState = { ...state.myPullRequests };
			newState[action.payload.providerId]["data"]?.forEach((arr: any, index) => {
				arr?.forEach((pr, i) => {
					if (pr.id === action.payload.id) {
						newState[action.payload.providerId]["data"]![index][i] = {
							...newState[action.payload.providerId]["data"]![index][i],
							title: action.payload.pullRequestData.title
						};
					}
				});
			});
			return {
				myPullRequests: newState,
				pullRequests: { ...state.pullRequests }
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
					const pr = newState[providerId][id].conversations.project
						.mergeRequest as GitLabMergeRequest;
					for (const directive of action.payload.data) {
						if (directive.type === "addApprovedBy") {
							if (pr.approvedBy) {
								for (const d of directive.data) {
									if (!pr.approvedBy.nodes.find(_ => _.login === d.login)) {
										pr.approvedBy.nodes.push(d);
									}
								}
							}
						} else if (directive.type === "removeApprovedBy") {
							if (pr.approvedBy) {
								pr.approvedBy.nodes.length = 0;
								for (const d of directive.data) {
									pr.approvedBy.nodes.push(d);
								}
							}
						} else if (directive.type === "addNode") {
							const node = pr.discussions.nodes.find(_ => _.id === directive.data.id);
							if (!node) {
								pr.discussions.nodes.push(directive.data);
							}
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
						} else if (directive.type === "addPendingReview") {
							if (!directive.data) continue;
							pr.pendingReview = directive.data;
						} else if (directive.type === "removePendingReview") {
							pr.pendingReview = undefined;
						} else if (directive.type === "addReaction") {
							const reaction = pr.reactionGroups.find(_ => _.content === directive.data.name);
							if (reaction) {
								reaction.data.push(directive.data);
							} else {
								pr.reactionGroups.push({ content: directive.data.name, data: [directive.data] });
							}
						} else if (directive.type === "addReply") {
							if (
								directive.data.discussion.id &&
								directive.data.discussion.id.indexOf("gitlab/Discussion") > -1
							) {
								const discussionId = directive.data.discussion.id.split("/").slice(-1)[0];
								const nodeToUpdate = pr.discussions.nodes.find((_: DiscussionNode) => {
									const idAsString = _.id + "";
									const discussionNodeId = idAsString.split("/").slice(-1)[0];
									return (
										idAsString.indexOf("gitlab/IndividualNoteDiscussion") > -1 &&
										discussionId === discussionNodeId
									);
								});

								if (nodeToUpdate) {
									nodeToUpdate.id = directive.data.discussion.id;
									nodeToUpdate.replyId = directive.data.discussion.id;
									nodeToUpdate.resolvable = true;
									const firstNode = nodeToUpdate?.notes?.nodes[0];
									if (firstNode) {
										firstNode.id = firstNode.id.replace("/Note/", "/DiscussionNote/");
										firstNode.resolvable = true;
										firstNode.discussion.id = directive.data.discussion.id;
										firstNode.discussion.replyId = directive.data.discussion.replyId;
									}
								}
							}

							const discussionNode = pr.discussions.nodes.find(
								(_: DiscussionNode) => _.id === directive.data.discussion.id
							);
							if (discussionNode) {
								const firstNode = discussionNode?.notes?.nodes[0];
								if (firstNode) {
									if (firstNode.replies == null) {
										firstNode.replies = [directive.data];
									} else if (!firstNode.replies.find(_ => _.id === directive.data.id)) {
										firstNode.replies.push(directive.data);
									}
								} else {
									console.warn("Could not find node", discussionNode);
								}
							}
						} else if (directive.type === "removeNode") {
							if (!directive.data.id) continue;

							let nodeIndex = 0;
							let nodeRemoveIndex = -1;
							for (const node of pr.discussions.nodes) {
								if (node.id === directive.data.id) {
									// is an outer node
									nodeRemoveIndex = nodeIndex;
									break;
								}
								if (node.notes && node.notes.nodes.length) {
									const index = node.notes.nodes.findIndex(_ => _.id === directive.data.id);
									if (index === 0) {
										if (node.notes.nodes[0].replies && node.notes.nodes[0].replies.length) {
											if (node.notes.nodes[0].replies) {
												// attach the position object on the root to all the replies
												for (const reply of node.notes.nodes[0].replies) {
													if (!reply) continue;
													reply.position = node.notes.nodes[0].position;
												}
											}
											// get the original replies
											const originalReplies = node.notes.nodes[0].replies;
											// remove the first reply (it will become the "root" node)
											const shifted = node.notes.nodes[0].replies?.splice(0, 1);
											// take old first reply and set it as the first note node
											node.notes.nodes.splice(0, 1, shifted[0] as any);
											// attach the modified replies back to the new "root" node
											node.notes.nodes[0].replies = originalReplies || [];
										} else {
											// not one of the replies, it's the root, just remove it
											node.notes.nodes = node.notes.nodes.filter(_ => _.id !== directive.data.id);
										}
									} else {
										node.notes.nodes = node.notes.nodes.filter(_ => _.id !== directive.data.id);
										for (const notesWithReplies of node.notes.nodes) {
											if (notesWithReplies.replies && notesWithReplies.replies.length) {
												notesWithReplies.replies = notesWithReplies.replies.filter(
													_ => _.id !== directive.data.id
												);
											}
										}
									}
								}

								nodeIndex++;
							}
							if (nodeRemoveIndex > -1) {
								pr.discussions.nodes.splice(nodeRemoveIndex, 1);
							}
						} else if (directive.type === "updateDiscussionNote") {
							const discussionNode = pr.discussions.nodes.find(
								(_: DiscussionNode) => _.id === directive.data.discussion.id
							);
							if (discussionNode) {
								const note = discussionNode?.notes?.nodes.find(_ => _.id === directive.data.id);
								if (note) {
									const keys = Object.keys(directive.data).filter(
										_ => _ !== "discussion" && _ !== "id"
									);
									for (const k of keys) {
										(note as any)[k] = directive.data[k];
									}
								}
								// typescript is killing me here...
								else if (
									discussionNode.notes?.nodes &&
									discussionNode.notes.nodes.length > 0 &&
									discussionNode.notes.nodes[0] &&
									discussionNode.notes.nodes[0].replies?.length
								) {
									const reply = discussionNode!.notes!.nodes![0]?.replies?.find(
										_ => _.id === directive.data.id
									);
									if (reply) {
										const keys = Object.keys(directive.data).filter(
											_ => _ !== "discussion" && _ !== "id"
										);
										for (const k of keys) {
											(reply as any)[k] = directive.data[k];
										}
									}
								}
							}
						} else if (directive.type === "updateNode") {
							const node = pr.discussions.nodes.find((_: any) => _.id === directive.data.id);
							if (node) {
								for (const key in directive.data) {
									if (key === "notes") {
										for (const note of directive.data.notes.nodes) {
											if (node.notes) {
												let existingNote = node.notes.nodes.find(_ => _.id === note.id);
												if (existingNote) {
													for (const k in note) {
														(existingNote as any)[k] = note[k];
													}
												}
											}
										}
									} else {
										(node as any)[key] = directive.data[key];
									}
								}
							}
						} else if (directive.type === "updatePullRequest") {
							for (const key in directive.data) {
								if (directive.data[key] && Array.isArray(directive.data[key].nodes)) {
									// clear out the array, but keep its reference
									(pr as any)[key].nodes.length = 0;
									for (const n of directive.data[key].nodes) {
										(pr as any)[key].nodes.push(n);
									}
								} else {
									(pr as any)[key] = directive.data[key];
								}
							}
						} else if (directive.type === "updatePendingReviewCommentsCount") {
							// ensure no negatives
							if (pr.pendingReview && pr.pendingReview.comments) {
								pr.pendingReview.comments.totalCount = Math.max(
									(pr.pendingReview.comments.totalCount || 0) + directive.data,
									0
								);
							}
						} else if (directive.type === "updateReviewCommentsCount") {
							// ensure no negatives
							pr.userDiscussionsCount = Math.max(
								(pr.userDiscussionsCount || 0) + directive.data,
								0
							);
						} else if (directive.type === "updateReviewers") {
							if (pr.reviewers && pr.reviewers.nodes) {
								if (pr.reviewers && !pr.reviewers.nodes) {
									pr.reviewers.nodes = [];
								} else {
									pr.reviewers.nodes.length = 0;
								}
								for (const reviewer of directive.data) {
									pr.reviewers.nodes.push(reviewer);
								}
							}
						} else if (directive.type === "removeReaction") {
							const group = pr.reactionGroups.find(_ => _.content === directive.data.content);
							if (group) {
								group.data = group.data.filter(_ => _.user.login !== directive.data.login);
								if (group.data.length === 0) {
									pr.reactionGroups = pr.reactionGroups.filter(
										_ => _.content !== directive.data.content
									);
								}
							}
						} else if (directive.type === "setLabels") {
							pr.labels.nodes = directive.data.nodes;
						}
					}
				} else if (providerId === "github*com" || providerId === "github/enterprise") {
					const pr = newState[providerId][id].conversations.repository
						.pullRequest as FetchThirdPartyPullRequestPullRequest;
					/**
					 *
					 *  KEEP THIS IN SYNC WITH github.ts
					 *
					 */
					for (const directive of action.payload.data) {
						if (directive.type === "addReaction") {
							if (directive.data.subject.__typename === "PullRequest") {
								pr.reactionGroups
									.find((_: any) => _.content === directive.data.reaction.content)
									.users.nodes.push(directive.data.reaction.user);
							} else {
								const node = pr.timelineItems.nodes.find(_ => _.id === directive.data.subject.id);
								if (node) {
									node.reactionGroups
										.find((_: any) => _.content === directive.data.reaction.content)
										.users.nodes.push(directive.data.reaction.user);
								}
							}
						} else if (directive.type === "removeReaction") {
							if (directive.data.subject.__typename === "PullRequest") {
								pr.reactionGroups.find(
									(_: any) => _.content === directive.data.reaction.content
								).users.nodes = pr.reactionGroups
									.find((_: any) => _.content === directive.data.reaction.content)
									.users.nodes.filter((_: any) => _.login !== directive.data.reaction.user.login);
							} else {
								const node = pr.timelineItems.nodes.find(_ => _.id === directive.data.subject.id);
								if (node) {
									node.reactionGroups.find(
										(_: any) => _.content === directive.data.reaction.content
									).users.nodes = node.reactionGroups
										.find((_: any) => _.content === directive.data.reaction.content)
										.users.nodes.filter((_: any) => _.login !== directive.data.reaction.user.login);
								}
							}
						} else if (directive.type === "removeComment") {
							for (const node of pr.timelineItems.nodes) {
								if (node.comments?.nodes?.length) {
									node.comments.nodes = node.comments.nodes.filter(
										(_: any) => _.id !== directive.data.id
									);
									for (const comments of node.comments.nodes) {
										if (comments.replies) {
											comments.replies = comments.replies.filter(
												(_: any) => _.id !== directive.data.id
											);
										}
									}
								}
							}
						} else if (directive.type === "removePullRequestReview") {
							if (directive.data.id) {
								pr.reviews.nodes = pr.reviews.nodes.filter(_ => _.id !== directive.data.id);
								pr.timelineItems.nodes = pr.timelineItems.nodes.filter(
									_ => _.id !== directive.data.id
								);
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
						} else if (directive.type === "addReviewCommentNodes") {
							for (const newNode of directive.data) {
								if (!newNode.id) continue;
								let node = pr.timelineItems.nodes.find((_: any) => _.id === newNode.id);
								if (node) {
									for (const c of newNode.comments.nodes) {
										if (node.comments.nodes.find((_: any) => _.id === c.id) == null) {
											node.comments.nodes.push(c);
										}
									}
								} else {
									pr.timelineItems.nodes.push(newNode);
								}
							}
						} else if (directive.type === "addLegacyCommentReply") {
							for (const node of pr.timelineItems.nodes) {
								if (!node.comments) continue;
								for (const comment of node.comments.nodes) {
									if (directive.data._inReplyToId === comment.databaseId) {
										if (!comment.replies) comment.replies = [];
										comment.replies.push(directive.data);
										break;
									}
								}
							}
						} else if (directive.type === "removePendingReview") {
							pr.pendingReview = undefined;
						} else if (directive.type === "removeRequestedReviewer") {
							if (pr.reviewRequests?.nodes) {
								pr.reviewRequests.nodes = pr.reviewRequests.nodes.filter(
									_ => _.requestedReviewer?.login !== directive.data.login
								);
							}
						} else if (directive.type === "addPendingReview") {
							if (!directive.data) continue;
							pr.pendingReview = directive.data;
						} else if (directive.type === "addReview") {
							if (!directive.data) continue;
							if (pr.reviews.nodes.find(_ => _.id === directive.data.id) == null) {
								pr.reviews.nodes.push(directive.data);
							}
						} else if (directive.type === "updateReviewCommentsCount") {
							if (!directive.data) continue;
							if (pr.pendingReview && pr.pendingReview.comments) {
								pr.pendingReview.comments.totalCount = directive.data.comments.totalCount;
							}
						} else if (directive.type === "addReviewThreads") {
							if (!directive.data) continue;
							for (const d of directive.data) {
								if (pr.reviewThreads.edges.find(_ => _.node.id === d.node.id) == null) {
									pr.reviewThreads.edges.push(d);
								}
							}
						} else if (directive.type === "updatePullRequestReviewThreadComment") {
							let done = false;
							for (const edge of pr.reviewThreads.edges) {
								if (!edge.node.comments) continue;

								for (const comment of edge.node.comments.nodes) {
									if (comment.id === directive.data.id) {
										for (const key in directive.data) {
											(comment as any)[key] = directive.data[key];
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
						} else if (directive.type === "reviewSubmitted") {
							const node = pr.timelineItems.nodes.find(
								_ => _.id === directive.data.pullRequestReview.id
							);
							if (node) {
								for (const key of Object.keys(directive.data.updates)) {
									node[key] = directive.data.updates[key];
								}

								if (node.comments) {
									for (const comment of directive.data.comments) {
										const existingComment = node.comments.nodes.find(
											(_: any) => _.id === comment.id
										);
										if (existingComment) {
											existingComment.state = comment.state;
										}
									}
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
						} else if (directive.type === "updateReview") {
							if (!pr.reviews?.nodes) {
								pr.reviews.nodes = [];
							}
							if (pr.reviews.nodes) {
								pr.reviews.nodes = pr.reviews.nodes.filter(_ => _.id !== directive.data.id);
								pr.reviews.nodes.push(directive.data);
							}
						} else if (directive.type === "updateReviewThreads") {
							if (pr.reviewThreads) {
								for (const d of directive.data) {
									const found = pr.reviewThreads.edges.find(_ => _.node.id === d.node.id);
									if (found) {
										found.node.viewerCanResolve = d.node.viewerCanResolve;
									}
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
									(nodeWrapper.node as any)[key] = directive.data[key];
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

export const getPullRequestProviderId = createSelector(
	(state: CodeStreamState) => state.context,
	(context: ContextState) => {
		return context.currentPullRequest ? context.currentPullRequest.providerId : undefined;
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

export const getCurrentProviderPullRequestRootObject = createSelector(
	getCurrentProviderPullRequest,
	getPullRequestProviderId,
	(providerPullRequest, providerId) => {
		if (providerId) {
			if (providerId.indexOf("github") > -1) {
				return providerPullRequest.conversations;
			}
			if (providerId.indexOf("gitlab") > -1) {
				return providerPullRequest.conversations;
			}
		}
		return undefined;
	}
);

export const getCurrentProviderPullRequestObject = createSelector(
	getCurrentProviderPullRequest,
	getPullRequestProviderId,
	(providerPullRequest, providerId) => {
		if (providerId) {
			if (providerId.indexOf("github") > -1) {
				return providerPullRequest.conversations.repository.pullRequest;
			}
			if (providerId.indexOf("gitlab") > -1) {
				return providerPullRequest.conversations.project.mergeRequest;
			}
		}
		return undefined;
	}
);

export const getCurrentProviderPullRequestLastUpdated = createSelector(
	getCurrentProviderPullRequest,
	getPullRequestProviderId,
	(providerPullRequest, providerId) => {
		if (!providerPullRequest) return undefined;
		if (!providerId) return undefined;

		if (providerId.indexOf("github") > -1) {
			return providerPullRequest?.conversations?.repository?.pullRequest?.updatedAt;
		}
		if (providerId.indexOf("gitlab") > -1) {
			return providerPullRequest?.conversations?.project?.mergeRequest?.updatedAt;
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
	getPullRequestProviderId,
	(repos: CSRepository[], currentPr, providerId?: string) => {
		const result = getProviderPullRequestRepoObjectCore(repos, currentPr, providerId);
		return result?.currentRepo;
	}
);

/**
 *  Attempts to get a CS repo for the current PR
 */
export const getProviderPullRequestRepoObject = createSelector(
	getRepos,
	getCurrentProviderPullRequest,
	getPullRequestProviderId,
	(repos: CSRepository[], currentPr, providerId?: string) => {
		return getProviderPullRequestRepoObjectCore(repos, currentPr, providerId);
	}
);

export const getProviderPullRequestRepoObjectCore = (
	repos: CSRepository[],
	currentPr: {
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
	},
	providerId?: string
) => {
	const result: {
		error?: string;
		currentRepo?: CSRepository;
		repos?: CSRepository[];
		repoName?: string;
		repoUrl?: string;
		reason?: "remote" | "repoName" | "matchedOnProviderUrl" | "closestMatch";
	} = {};

	try {
		if (!currentPr || !currentPr.conversations) {
			return {
				error: "missing current pr or conversations"
			};
		}
		let repoName;
		let repoUrl;
		if (
			providerId &&
			providerId.indexOf("github") > -1 &&
			currentPr.conversations &&
			currentPr.conversations.repository
		) {
			// this is the github case
			repoName = currentPr.conversations.repository.repoName.toLowerCase();
			repoUrl = currentPr.conversations.repository.url.toLowerCase();
		} else if (providerId && providerId.indexOf("gitlab") > -1) {
			if (!currentPr.conversations.project) {
				result.error = "Missing project name for: " + currentPr;
			}
			// this is for gitlab
			repoName = currentPr.conversations.project?.name?.toLowerCase();
			repoUrl = currentPr.conversations.project!.mergeRequest.webUrl.toLowerCase();
		}
		result.repoName = repoName;
		result.repoUrl = repoUrl;
		result.repos = repos;

		const matchingRepos = repos.filter(_ =>
			_.remotes.some(
				r =>
					r.normalizedUrl &&
					r.normalizedUrl.length > 2 &&
					r.normalizedUrl.match(/([a-zA-Z0-9]+)/) &&
					repoUrl.indexOf(r.normalizedUrl.toLowerCase()) > -1
			)
		);

		if (matchingRepos.length === 1) {
			result.currentRepo = matchingRepos[0];
			result.reason = "remote";
		} else {
			let matchingRepos2 = repos.filter(_ => _.name && _.name.toLowerCase() === repoName);
			if (matchingRepos2.length != 1) {
				matchingRepos2 = repos.filter(_ =>
					_.remotes.some(r => repoUrl.indexOf(r.normalizedUrl.toLowerCase()) > -1)
				);
				if (matchingRepos2.length === 1) {
					result.currentRepo = matchingRepos2[0];
					result.reason = "matchedOnProviderUrl";
				} else {
					// try to match on the best/closet repo
					const bucket: { repo: CSRepository; points: number }[] = [];
					const splitRepoUrl = repoUrl.split("/");
					for (const repo of repos) {
						for (const remote of repo.remotes) {
							const split = remote.normalizedUrl.split("/");
							if (split.length) {
								let points = 0;
								for (const s of split) {
									if (s && splitRepoUrl.includes(s)) {
										points++;
									}
								}
								bucket.push({ repo: repo, points: points });
							}
						}
					}
					if (bucket.length) {
						bucket.sort((a, b) => b.points - a.points);
						result.currentRepo = bucket[0].repo;
						result.reason = "closestMatch";
					} else {
						result.error = `Could not find repo for repoName=${repoName} repoUrl=${repoUrl}`;
					}
				}
			} else {
				result.currentRepo = matchingRepos2[0];
				result.reason = "repoName";
			}
		}
	} catch (ex) {
		result.error = typeof ex === "string" ? ex : ex.message;
		console.error(ex);
	}
	if (result.error || !result.currentRepo) {
		logError(result.error || "Could not find currentRepo", {
			result
		});
	}
	return result;
};

export const getProviderPullRequestCollaborators = createSelector(
	getCurrentProviderPullRequest,
	currentPr => {
		return currentPr ? currentPr.collaborators : [];
	}
);

export const isAnHourOld = conversationsLastFetch => {
	return conversationsLastFetch > 0 && Date.now() - conversationsLastFetch > 60 * 60 * 1000;
};
