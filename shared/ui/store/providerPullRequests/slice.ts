import {
	DiscussionNode,
	FetchThirdPartyPullRequestCommitsResponse,
	FetchThirdPartyPullRequestPullRequest,
	FetchThirdPartyPullRequestResponse,
	GetCommitsFilesResponse,
	GetMyPullRequestsResponse,
	GitLabMergeRequest,
} from "@codestream/protocols/agent";
import { CSRepository } from "@codestream/protocols/api";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { isEmpty } from "lodash-es";
import { createSelector } from "reselect";

import { Directive } from "@codestream/webview/store/providerPullRequests/directives";
import { Collaborator } from "@codestream/protocols/webview";
import { CodeStreamState } from "..";
import { ContextState } from "../context/types";
import { ProviderPullRequestsState, RepoPullRequest } from "./types";

const initialState: ProviderPullRequestsState = { pullRequests: {}, myPullRequests: {} };

function parseId(idOrJson?: string): string | undefined {
	if (!idOrJson) {
		return undefined;
	}
	let id: string;
	// need to get the underlying id here if we're part of a composite
	// id, we need to parse it and get the _real_ id.
	if (idOrJson.indexOf("{") === 0) {
		id = JSON.parse(idOrJson).id;
	} else {
		id = idOrJson;
	}
	return id;
}

export interface PullRequestIdPayload {
	id: string;
	providerId: string;
}

export interface PullRequestFilterPayload {
	providerId: string;
	index: number;
	data: GetMyPullRequestsResponse[][];
}

export interface PullRequestPayload {
	providerId: string;
	data: GetMyPullRequestsResponse[][];
}

export interface PullRequestCommitsPayload extends PullRequestIdPayload {
	pullRequestCommits: FetchThirdPartyPullRequestCommitsResponse[];
}

export interface AddPullRequestFilesPayload extends PullRequestIdPayload {
	pullRequestFiles: GetCommitsFilesResponse[];
	commits: string;
	accessRawDiffs?: boolean;
}

interface RemovePullRequestByIndex {
	providerId: string;
	index: number;
}

export interface UpdatePullRequestTitlePayload extends PullRequestIdPayload {
	pullRequestData: {
		title: string;
	};
}

export interface AddPullRequestCollaboratorsPayload extends PullRequestIdPayload {
	collaborators: Collaborator[];
}

export interface AddPullRequestConversationsPayload extends PullRequestIdPayload {
	conversations: FetchThirdPartyPullRequestResponse;
}

export interface AddPullRequestErrorPayload extends PullRequestIdPayload {
	error?: { message: string };
}

export interface HandleDirectivesPayload extends PullRequestIdPayload {
	data: Directive[];
}

const providerPullRequestsSlice = createSlice({
	name: "providerPullRequests",
	initialState,
	reducers: {
		addMyPullRequests: (state, action: PayloadAction<PullRequestPayload>) => {
			if (!state.myPullRequests[action.payload.providerId]) {
				state.myPullRequests[action.payload.providerId] = [];
			}
			state.myPullRequests[action.payload.providerId] = action.payload.data;
			return;
		},
		updatePullRequestFilter: (state, action: PayloadAction<PullRequestFilterPayload>) => {
			if (!isEmpty(action.payload.data)) {
				state.myPullRequests[action.payload.providerId][action.payload.index] =
					action.payload.data[0];
			}
		},
		addPullRequestFiles: (state, action: PayloadAction<AddPullRequestFilesPayload>) => {
			const id = parseId(action.payload.id);
			if (!id) {
				return;
			}

			state.pullRequests[action.payload.providerId][id].accessRawDiffs =
				action.payload.accessRawDiffs;
			const files = state.pullRequests[action.payload.providerId][id].files ?? {};
			files[action.payload.commits] = action.payload.pullRequestFiles;
			state.pullRequests[action.payload.providerId][id].files = files;

			return;
		},
		clearPullRequestFiles: (state, action: PayloadAction<PullRequestIdPayload>) => {
			const id = parseId(action.payload.id);
			if (!id) {
				return;
			}

			state.pullRequests[action.payload.providerId][id].files = {};
			return;
		},
		addPullRequestCommits: (state, action: PayloadAction<PullRequestCommitsPayload>) => {
			const id = parseId(action.payload.id);
			if (!id) {
				return;
			}
			state.pullRequests[action.payload.providerId][id].commits = action.payload.pullRequestCommits;
			return;
		},
		removePullRequest: (state, action: PayloadAction<RemovePullRequestByIndex>) => {
			const { providerId, index } = action.payload;
			const prs = state.myPullRequests[providerId];
			prs.splice(index, 1);
		},
		clearPullRequestCommits: (state, action: PayloadAction<PullRequestIdPayload>) => {
			const id = parseId(action.payload.id);
			if (!id) {
				return state;
			}

			state.pullRequests[action.payload.providerId][id].commits = [];
			return;
		},
		addPullRequestCollaborators: (
			state,
			action: PayloadAction<AddPullRequestCollaboratorsPayload>
		) => {
			const id = parseId(action.payload.id);
			if (!id) {
				return;
			}
			state.pullRequests[action.payload.providerId][id].collaborators =
				action.payload.collaborators;
			return;
		},
		updatePullRequestTitle: (state, action: PayloadAction<UpdatePullRequestTitlePayload>) => {
			const providerPrs: GetMyPullRequestsResponse[][] | undefined =
				state.myPullRequests?.[action.payload.providerId];
			if (!providerPrs) {
				return;
			}
			for (const arr of providerPrs) {
				const pr = arr.find(pr => pr.id === action.payload.id);
				if (pr) {
					pr.title = action.payload.pullRequestData.title;
				}
			}
			return;
		},
		addPullRequestConversations: (
			state,
			action: PayloadAction<AddPullRequestConversationsPayload>
		) => {
			const id = parseId(action.payload.id);
			if (!id) {
				return;
			}
			if (!state.pullRequests[action.payload.providerId]) {
				state.pullRequests[action.payload.providerId] = {};
			}
			state.pullRequests[action.payload.providerId][id] = {
				...state.pullRequests[action.payload.providerId][id],
				conversations: action.payload.conversations,
				conversationsLastFetch: Date.now(),
			};
			// state.pullRequests[action.payload.providerId][id].conversations =
			// 	action.payload.conversations;
			// state.pullRequests[action.payload.providerId][id].conversationsLastFetch = Date.now();
			return;
		},
		clearPullRequestError: (state, action: PayloadAction<PullRequestIdPayload>) => {
			const id = parseId(action.payload.id);
			if (!id) {
				return;
			}
			if (state.pullRequests[action.payload.providerId]?.[id]?.error) {
				state.pullRequests[action.payload.providerId][id].error = undefined;
			}

			return;
		},
		addPullRequestError: (state, action: PayloadAction<AddPullRequestErrorPayload>) => {
			const id = parseId(action.payload.id);
			if (!id) {
				return;
			}
			state.pullRequests[action.payload.providerId][id].error = action.payload.error;
			return;
		},
		handleDirectives: (state, action: PayloadAction<HandleDirectivesPayload>) => {
			const id = parseId(action.payload.id);
			if (!id) {
				return;
			}
			const providerId = action.payload.providerId;

			if (state.pullRequests[providerId][id] && state.pullRequests[providerId][id].conversations) {
				if (providerId === "gitlab*com" || providerId === "gitlab/enterprise") {
					const pr = state.pullRequests[providerId][id]?.conversations?.project
						?.mergeRequest as GitLabMergeRequest;
					for (const directive of action.payload.data) {
						if (directive.type === "addApprovedBy") {
							if (pr?.approvedBy) {
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
					const pr = state.pullRequests[providerId][id]?.conversations?.repository
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
								// adding reactions to comments or replies
								if (!node) {
									// comments node array
									let comments = pr.timelineItems.nodes.find(
										_ => _.__typename === "PullRequestReview"
									)?.comments?.nodes;

									for (let i = 0; i < comments.length; i++) {
										// If found id match on comment, update pr reactionGroup user for comment
										if (comments[i]?.id === directive.data.subject.id) {
											pr.timelineItems.nodes
												.find(_ => _.__typename === "PullRequestReview")
												?.comments?.nodes[i].reactionGroups.find(
													(_: any) => _.content === directive.data.reaction.content
												)
												.users.nodes.push(directive.data.reaction.user);
											// No id match on comment, so try deeper search on replies associated with comment
										} else {
											let replies = comments[i]?.replies;
											for (let j = 0; j < replies.length; j++) {
												// If found id match on reply, update pr reactionGroup user for reply
												if (replies[j]?.id === directive.data.subject.id) {
													pr.timelineItems.nodes
														.find(_ => _.__typename === "PullRequestReview")
														?.comments?.nodes[i].replies[j].reactionGroups.find(
															(_: any) => _.content === directive.data.reaction.content
														)
														.users.nodes.push(directive.data.reaction.user);
												}
											}
										}
									}
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
								// remove reactions to comments or replies
								if (!node) {
									// comments node array
									let comments = pr.timelineItems.nodes.find(
										_ => _.__typename === "PullRequestReview"
									)?.comments?.nodes;

									for (let i = 0; i < comments.length; i++) {
										// If found id match on comment, remove user from reactionGroup
										if (comments[i]?.id === directive.data.subject.id) {
											const reactionGroupIndex = pr.timelineItems.nodes
												.find(_ => _.__typename === "PullRequestReview")
												?.comments?.nodes[i]?.reactionGroups.find(
													(_: any) => _.content === directive.data.reaction.content
												)
												.users.nodes.findIndex(
													(_: any) => _.login === directive.data.reaction.user.login
												);
											pr.timelineItems.nodes
												.find(_ => _.__typename === "PullRequestReview")
												?.comments?.nodes[i]?.reactionGroups.find(
													(_: any) => _.content === directive.data.reaction.content
												)
												.users.nodes.splice(reactionGroupIndex, 1);
											// No id match on comment, so try deeper search on replies associated with comment
										} else {
											let replies = comments[i]?.replies;
											for (let j = 0; j < replies.length; j++) {
												// If found id match on reply, remove user from reactionGroup
												if (replies[j]?.id === directive.data.subject.id) {
													const reactionGroupIndex = pr.timelineItems.nodes
														.find(_ => _.__typename === "PullRequestReview")
														?.comments?.nodes[i].replies[j].reactionGroups.find(
															(_: any) => _.content === directive.data.reaction.content
														)
														.users.nodes.findIndex(
															(_: any) => _.login === directive.data.reaction.user.login
														);

													pr.timelineItems.nodes
														.find(_ => _.__typename === "PullRequestReview")
														?.comments?.nodes[i].replies[j].reactionGroups.find(
															(_: any) => _.content === directive.data.reaction.content
														)
														.users.nodes.splice(reactionGroupIndex, 1);
												}
											}
										}
									}
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
							if (!directive?.data?.id) continue;
							const node = pr.timelineItems.nodes.find(_ => _?.id === directive?.data?.id);
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
						} else if (directive.type === "updatePullRequestFileNode") {
							if (!directive.data) continue;

							if (directive.data) {
								let done = false;

								for (const file of pr.files.nodes) {
									if (!file) continue;

									if (file.path === directive.data.path) {
										file.viewerViewedState = directive.data.viewerViewedState;
										done = true;
									}
									if (done) break;
								}
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
				} else if (providerId === "bitbucket*org") {
					const pr = state.pullRequests[providerId][id]?.conversations?.repository
						.pullRequest as FetchThirdPartyPullRequestPullRequest;

					for (const directive of action.payload.data) {
						if (directive.type === "updatePullRequest") {
							for (const key in directive.data) {
								pr[key] = directive.data[key];
							}
						} else if (directive.type === "addNode") {
							pr.comments = pr.comments || [];
							pr.comments.push(directive.data);
						} else if (directive.type === "addPullRequestComment") {
							pr.timelineItems = pr.timelineItems || {};
							pr.timelineItems.nodes = pr.timelineItems.nodes || [];
							pr.timelineItems.nodes.push(directive.data);
						} else if (directive.type === "addReply") {
							pr.comments = pr.comments || [];
							const findParent = function (
								items: { id: number; replies: any[] }[],
								data: { parent: { id: number } }
							) {
								for (const item of items) {
									if (item.id === data.parent.id) {
										item.replies = item.replies || [];
										item.replies.push(data);
										return;
									}
									if (item.replies?.length) {
										findParent(item.replies, data);
									}
								}
							};
							if (directive?.data?.parent?.id) {
								findParent(pr.comments, directive.data);
							} else {
								console.warn("missing parent.id", directive);
							}
						}
					}
				}
				return;
			}
		},
		reset: _state => {
			return initialState;
		},
	},
});

const getRepos = (state: CodeStreamState): CSRepository[] => Object.values(state.repos);
// export const getProviderPullRequests = (state: CodeStreamState) => state.providerPullRequests;
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
			context.currentPullRequest.providerId === "gitlab/enterprise" ||
			context.currentPullRequest.providerId === "bitbucket*org"
		) {
			try {
				if (context.currentPullRequest.id.indexOf("{") === 0) {
					return JSON.parse(context.currentPullRequest.id).id;
				} else {
					return context.currentPullRequest.id.substring(
						context.currentPullRequest.id.lastIndexOf("/") + 1
					);
				}
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
	(state: CodeStreamState) => state.providerPullRequests,
	getPullRequestExactId,
	(providerPullRequests, id: string): RepoPullRequest | undefined => {
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
				return providerPullRequest?.conversations;
			}
			if (providerId.indexOf("gitlab") > -1) {
				return providerPullRequest?.conversations;
			}
			if (providerId.indexOf("bitbucket") > -1) {
				return providerPullRequest?.conversations;
			}
		}
		return undefined;
	}
);

export const getCurrentProviderPullRequestObject = createSelector(
	getCurrentProviderPullRequest,
	getPullRequestProviderId,
	(providerPullRequest, providerId) => {
		// TODO merge github and gitlab into single shared type
		if (providerId) {
			if (providerId.indexOf("github") > -1 || providerId.indexOf("bitbucket") > -1) {
				return providerPullRequest?.conversations?.repository.pullRequest;
			}
			if (providerId.indexOf("gitlab") > -1) {
				return providerPullRequest?.conversations?.project?.mergeRequest;
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

		if (providerId.indexOf("github") > -1 || providerId.indexOf("bitbucket") > -1) {
			return providerPullRequest?.conversations?.repository?.pullRequest?.updatedAt;
		}
		if (providerId.indexOf("gitlab") > -1) {
			return providerPullRequest?.conversations?.project?.mergeRequest?.updatedAt;
		}
		return undefined;
	}
);

export const getProviderPullRequestCollaborators = createSelector(
	getCurrentProviderPullRequest,
	currentPr => {
		return currentPr ? currentPr.collaborators : [];
	}
);

export const {
	addMyPullRequests,
	addPullRequestCollaborators,
	addPullRequestCommits,
	addPullRequestConversations,
	addPullRequestError,
	removePullRequest,
	addPullRequestFiles,
	clearPullRequestCommits,
	clearPullRequestError,
	clearPullRequestFiles,
	handleDirectives,
	reset,
	updatePullRequestFilter,
	updatePullRequestTitle,
} = providerPullRequestsSlice.actions;
export default providerPullRequestsSlice.reducer;
