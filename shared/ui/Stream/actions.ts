import {
	ArchiveStreamRequestType,
	CloseStreamRequestType,
	CreateChannelStreamRequestType,
	CreateChannelStreamResponse,
	CreateDirectStreamRequestType,
	CreateDirectStreamResponse,
	CreatePostRequestType,
	CreatePostResponse,
	CreatePostWithMarkerRequestType,
	DeletePostRequestType,
	EditPostRequestType,
	FetchCodemarksRequestType,
	FetchPostRepliesRequestType,
	FetchPostsRequestType,
	InviteUserRequestType,
	JoinStreamRequestType,
	LeaveStreamRequestType,
	MarkPostUnreadRequestType,
	MarkStreamReadRequestType,
	MuteStreamRequestType,
	OpenStreamRequestType,
	ReactToPostRequestType,
	RenameStreamRequestType,
	SetStreamPurposeRequestType,
	UnarchiveStreamRequestType,
	UpdateCodemarkRequestType,
	UpdatePreferencesRequestType,
	UpdateReviewRequestType,
	UpdateStreamMembershipRequestType,
	CreateTeamTagRequestType,
	UpdateTeamTagRequestType,
	DeleteTeamTagRequestType,
	UpdateStatusRequestType,
	UpdateInvisibleRequestType
} from "@codestream/protocols/agent";
import { CSPost, StreamType, CSReviewStatus } from "@codestream/protocols/api";
import { logError } from "../logger";
import {
	saveCodemarks,
	updateCodemarks,
	createCodemark,
	NewCodemarkAttributes,
	isLegacyNewCodemarkAttributes
} from "../store/codemarks/actions";
import { createReview, NewReviewAttributes, updateReviews } from "../store/reviews/actions";
import {
	closePanel,
	openPanel,
	openModal,
	closeModal,
	setCodemarkAuthorFilter,
	setCodemarkBranchFilter,
	setChannelFilter,
	setCodemarkTagFilter,
	setCodemarkFileFilter,
	setCodemarkTypeFilter
} from "../store/context/actions";
import * as contextActions from "../store/context/actions";
import * as postsActions from "../store/posts/actions";
import { updatePreferences } from "../store/preferences/actions";
import * as streamActions from "../store/streams/actions";
import { addUsers, updateUser } from "../store/users/actions";
import { uuid, isNotOnDisk, uriToFilePath } from "../utils";
import { updateTeam } from "../store/teams/actions";
import { HostApi } from "../webview-api";
import { CodeStreamState } from "../store";
import { pick } from "lodash-es";
import { getTeamMembers, findMentionedUserIds } from "../store/users/reducer";
import { confirmPopup } from "./Confirm";
import React from "react";
import { getFileScmError } from "../store/editorContext/reducer";
import { PostEntryPoint } from "../store/context/types";
import { middlewareInjector } from "../store/middleware-injector";
import { PostsActionsType } from "../store/posts/types";

export {
	openPanel,
	closePanel,
	openModal,
	closeModal,
	setCodemarkAuthorFilter,
	setCodemarkTypeFilter,
	setCodemarkBranchFilter,
	setCodemarkFileFilter,
	setCodemarkTagFilter,
	setChannelFilter
};
export {
	connectProvider,
	disconnectProvider,
	removeEnterpriseProvider
} from "../store/providers/actions";

export const markStreamRead = (streamId: string, postId?: string) => () => {
	HostApi.instance
		.send(MarkStreamReadRequestType, { streamId, postId })
		.catch(error => logError(`There was an error marking a stream read: ${error}`, { streamId }));
};

export const markPostUnread = (streamId: string, postId: string) => () => {
	HostApi.instance
		.send(MarkPostUnreadRequestType, { streamId, postId })
		.catch(error =>
			logError(`There was an error marking a post unread: ${error}`, { streamId, postId })
		);
};

export const createPostAndCodemark = (
	attributes: NewCodemarkAttributes,
	entryPoint?: PostEntryPoint
) => async (dispatch, getState: () => CodeStreamState) => {
	const { codeBlocks } = attributes;
	let markers: any = [];
	let warning;
	let remotes: string[] = [];

	codeBlocks.forEach(codeBlock => {
		let marker: any = {
			code: codeBlock.contents,
			range: codeBlock.range,
			documentId: { uri: codeBlock.uri }
		};

		if (codeBlock.scm) {
			marker.file = codeBlock.scm.file;
			marker.source = codeBlock.scm;
			if (codeBlock.scm.remotes && codeBlock.scm.remotes.length) {
				remotes = remotes.concat(codeBlock.scm.remotes.map(_ => _.url));
			}
		}
		markers.push(marker);

		if (isNotOnDisk(codeBlock.uri))
			warning = {
				title: "Unsaved File",
				message:
					"Your teammates won't be able to see the codemark when viewing this file unless you save the file first."
			};
		else {
			switch (getFileScmError(codeBlock)) {
				case "NoRepo": {
					warning = {
						title: "Missing Git Info",
						message: `This repo doesn’t appear to be tracked by Git. Your teammates won’t be able to see the codemark when viewing this source file.\n\n${uriToFilePath(
							codeBlock.uri
						)}`
					};
					break;
				}
				case "NoRemotes": {
					warning = {
						title: "No Remote URL",
						message:
							"This repo doesn’t have a remote URL configured. Your teammates won’t be able to see the codemark when viewing this source file."
					};
					break;
				}
				case "NoGit": {
					warning = {
						title: "Git could not be located",
						message:
							"CodeStream was unable to find the `git` command. Make sure it's installed and configured properly."
					};
					break;
				}
				default: {
				}
			}
		}
	});

	if (warning) {
		try {
			await new Promise((resolve, reject) => {
				return confirmPopup({
					title: warning.title,
					message: () =>
						React.createElement("span", undefined, [
							warning.message + " ",
							React.createElement(
								"a",
								{
									href: "https://docs.codestream.com/userguide/faq/git-issues/"
								},
								"Learn more"
							)
						]),
					centered: true,
					buttons: [
						{
							label: "Post Anyway",
							action: resolve
						},
						{ label: "Cancel", action: reject }
					]
				});
			});
		} catch (error) {
			return;
		}
	}
	if (remotes && remotes.length && remotes.length > 1) {
		remotes = Array.from(new Set(remotes));
	}

	if (isLegacyNewCodemarkAttributes(attributes)) {
		return dispatch(
			createPost(
				attributes.streamId,
				undefined,
				attributes.text,
				{
					...pick(
						attributes,
						"title",
						"text",
						"streamId",
						"type",
						"assignees",
						"tags",
						"relatedCodemarkIds"
					),
					markers,
					textEditorUris: attributes.codeBlocks.map(_ => {
						return { uri: _.uri };
					})
				},
				findMentionedUserIds(getTeamMembers(getState()), attributes.text || ""),
				{
					crossPostIssueValues: attributes.crossPostIssueValues,
					entryPoint: entryPoint
				}
			)
		);
	} else {
		return dispatch(
			createCodemark({
				...attributes,
				textDocuments: attributes.codeBlocks.map(_ => {
					return { uri: _.uri };
				}),
				entryPoint: entryPoint,
				remotes: remotes,
				mentionedUserIds: findMentionedUserIds(
					getTeamMembers(getState()),
					attributes.text || ""
				).concat(attributes.assignees)
			})
		);
	}
};

export const createPostAndReview = (
	attributes: NewReviewAttributes,
	entryPoint?: PostEntryPoint
) => async (dispatch, getState: () => CodeStreamState) => {
	return dispatch(
		createReview({
			...attributes,
			entryPoint: entryPoint,
			mentionedUserIds: findMentionedUserIds(
				getTeamMembers(getState()),
				attributes.text || ""
			).concat(attributes.reviewers)
		})
	);
};

export const createPost = (
	streamId: string,
	parentPostId: string | undefined,
	text: string,
	codemark?: any,
	mentions?: string[],
	extra: any = {}
) => async (dispatch, getState: () => CodeStreamState) => {
	const { session, context } = getState();
	const pendingId = uuid();

	// no need for pending post when creating a codemark
	if (!codemark) {
		dispatch(
			postsActions.addPendingPost({
				id: pendingId,
				streamId,
				parentPostId,
				text,
				codemark,
				creatorId: session.userId!,
				createdAt: new Date().getTime(),
				pending: true
			})
		);
	}

	const filteredPosts: any = [];
	const injectedMiddleware = middlewareInjector.inject(
		PostsActionsType.Add,
		(payload: CSPost[]) => {
			return payload.filter(post => {
				// third party post objects don't have a version property
				if (post.version == undefined) {
					if (post.creatorId === session.userId && post.streamId === streamId) {
						filteredPosts.push(post);
						return false;
					}
				} else {
					if (
						post.version <= 1 &&
						post.creatorId === session.userId &&
						post.streamId === streamId
					) {
						filteredPosts.push(post);
						return false;
					}
				}

				return true;
			});
		}
	);

	try {
		let responsePromise: Promise<CreatePostResponse>;
		if (codemark) {
			responsePromise = HostApi.instance.send(CreatePostWithMarkerRequestType, {
				streamId,
				text: codemark.text,
				textDocuments: codemark.textEditorUris,
				markers: codemark.markers,
				title: codemark.title,
				type: codemark.type,
				assignees: codemark.assignees,
				mentionedUserIds: mentions,
				entryPoint: extra.entryPoint || context.newPostEntryPoint,
				parentPostId,
				tags: codemark.tags,
				relatedCodemarkIds: codemark.relatedCodemarkIds,
				reviewCheckpoint: extra.reviewCheckpoint,
				crossPostIssueValues: extra.crossPostIssueValues
					? {
							...extra.crossPostIssueValues,
							externalProvider: extra.crossPostIssueValues.issueProvider.name,
							externalProviderHost: extra.crossPostIssueValues.issueProvider.host,
							externalAssignees: extra.crossPostIssueValues.assignees
					  }
					: undefined
			});
		} else {
			responsePromise = HostApi.instance.send(CreatePostRequestType, {
				streamId,
				text,
				parentPostId,
				mentionedUserIds: mentions,
				entryPoint: extra.entryPoint,
				reviewCheckpoint: extra.reviewCheckpoint
			});
		}
		const response = await responsePromise;

		if (response.codemark) {
			dispatch(saveCodemarks([response.codemark]));
		}
		response.streams &&
			response.streams.forEach(stream => dispatch(streamActions.updateStream(stream)));
		return dispatch(postsActions.resolvePendingPost(pendingId, response.post));
	} catch (error) {
		if ((error.message as string).includes("No document could be found for Uri")) {
			logError("Error creating a post - No document could be found for uri", {
				message: error.message
			});
			await new Promise(resolve =>
				confirmPopup({
					title: "This codemark can't be created.",
					message:
						"CodeStream is is unable to determine which file this is. Please close the file, reopen it, and try again.",
					buttons: [{ label: "Ok", action: resolve, wait: true }],
					centered: true
				})
			);
		} else {
			logError("Error creating a post", { message: error.toString() });
		}
		return dispatch(postsActions.failPendingPost(pendingId));
	} finally {
		injectedMiddleware.dispose();
		// just to be sure no posts get missed
		if (filteredPosts.length > 0) dispatch(postsActions.savePosts(filteredPosts));
	}
};

export const retryPost = pendingId => async (dispatch, getState) => {
	const { posts } = getState();
	const pendingPost = posts.pending.find(post => post.id === pendingId);
	if (pendingPost) {
		const { post } = await HostApi.instance.send(CreatePostRequestType, pendingPost);
		return dispatch(postsActions.resolvePendingPost(pendingId, post));
		// if it fails then what?
	} else {
		// what happened to the pending post?
	}
};

export const cancelPost = postsActions.cancelPendingPost;

export const createSystemPost = (
	streamId: string,
	parentPostId: string,
	text: string,
	seqNum: number | string
) => async (dispatch, getState) => {
	const { context } = getState();
	const pendingId = uuid();

	const post = {
		id: pendingId,
		teamId: context.currentTeamId,
		timestamp: new Date().getTime(),
		createdAt: new Date().getTime(),
		creatorId: "codestream",
		parentPostId: parentPostId,
		streamId,
		seqNum,
		text,
		numReplies: 0,
		hasBeenEdited: false,
		modifiedAt: new Date().getTime()
	};

	dispatch(postsActions.savePosts([post]));
};

export const editPost = (
	streamId: string,
	postId: string,
	text: string,
	mentionedUserIds?: string[]
) => async dispatch => {
	try {
		const response = await HostApi.instance.send(EditPostRequestType, {
			streamId,
			postId,
			text,
			mentionedUserIds
		});
		dispatch(postsActions.updatePost(response.post));
	} catch (error) {
		logError(`There was an error editing a post: ${error}`, { streamId, postId, text });
	}
};

export const reactToPost = (post: CSPost, emoji: string, value: boolean) => async (
	dispatch,
	getState
) => {
	try {
		const { session } = getState();
		// optimistically set it on the client... waiting for the server
		const reactions = { ...(post.reactions || {}) };
		reactions[emoji] = [...(reactions[emoji] || [])];
		if (value) reactions[emoji].push(session.userId);
		else reactions[emoji] = reactions[emoji].filter(id => id !== session.userId);

		dispatch(postsActions.updatePost({ ...post, reactions }));

		// then update it for real on the API server
		const response = await HostApi.instance.send(ReactToPostRequestType, {
			streamId: post.streamId,
			postId: post.id,
			emojis: { [emoji]: value }
		});
		return dispatch(postsActions.updatePost(response.post));
	} catch (error) {
		logError(`There was an error reacting to a post: ${error}`, { post, emoji, value });
	}
};

export const deletePost = (streamId: string, postId: string) => async dispatch => {
	try {
		const { post } = await HostApi.instance.send(DeletePostRequestType, { streamId, postId });
		return dispatch(postsActions.deletePost(post));
	} catch (error) {
		logError(`There was an error deleting a post: ${error}`, { streamId, postId });
	}
};

// usage: setUserPreference(["favorites", "shoes", "wedges"], "red")
export const setUserPreference = (prefPath: string[], value: any) => async dispatch => {
	// create an object out of the provided path
	const newPreference = {};
	let newPreferencePointer = newPreference;
	while (prefPath.length > 1) {
		const part = prefPath.shift()!.replace(/\./g, "*");
		newPreferencePointer[part] = {};
		newPreferencePointer = newPreferencePointer[part];
	}
	newPreferencePointer[prefPath[0].replace(/\./g, "*")] = value;

	try {
		// optimistically merge it into current preferences
		dispatch(updatePreferences(newPreference));
		const response = await HostApi.instance.send(UpdatePreferencesRequestType, {
			preferences: newPreference
		});
		// update with confirmed server response
		// turning this off so we don't get 3 updates: one optimistically, one
		// via API return, and one via pubnub
		// dispatch(updatePreferences(response.preferences));
	} catch (error) {
		logError(`Error trying to update preferences`, { message: error.message });
	}
};

// usage setUserPreference({"foo":true, "bar.baz.bin":"no"})
export const setUserPreferences = (data: any) => async dispatch => {
	const newPreference = {};
	let newPreferencePointer = newPreference;
	for (const key of Object.keys(data)) {
		const prefPath = key.split(".");
		while (prefPath.length > 1) {
			const part = prefPath.shift()!.replace(/\./g, "*");
			newPreferencePointer[part] = {};
			newPreferencePointer = newPreferencePointer[part];
		}
		newPreferencePointer[prefPath[0].replace(/\./g, "*")] = data[key];
	}

	try {
		// optimistically merge it into current preferences
		dispatch(updatePreferences(newPreference));
		const response = await HostApi.instance.send(UpdatePreferencesRequestType, {
			preferences: newPreference
		});
		// update with confirmed server response
		dispatch(updatePreferences(response.preferences));
	} catch (error) {
		logError(`Error trying to update preferences`, { message: error.message });
	}
};

const EMPTY_HASH = {};
export const setPaneCollapsed = (paneId: string, value: boolean) => async (dispatch, getState) => {
	const { preferences } = getState();
	let maximizedPane = "";
	// check to see if there is a maximized panel, and if so unmaximize it
	const panePreferences = preferences.sidebarPanes || EMPTY_HASH;
	Object.keys(panePreferences).forEach(id => {
		if (panePreferences[id] && panePreferences[id].maximized) {
			dispatch(setPaneMaximized(id, false));
			maximizedPane = id;
		}
	});
	// otherwise, expand/collapse this pane
	if (!maximizedPane || maximizedPane === paneId)
		dispatch(setUserPreference(["sidebarPanes", paneId, "collapsed"], value));
};

export const setPaneMaximized = (panelId: string, value: boolean) => async dispatch => {
	dispatch(setUserPreference(["sidebarPanes", panelId, "maximized"], value));
};

export const setUserStatus = (
	label: string,
	ticketId: string,
	ticketUrl: string,
	ticketProvider: string,
	invisible: boolean
) => async dispatch => {
	try {
		const response = await HostApi.instance.send(UpdateStatusRequestType, {
			status: { label, ticketId, ticketUrl, ticketProvider, invisible }
		});
		dispatch(updateUser(response.user));
	} catch (error) {
		logError(`Error trying to update status`, { message: error.message });
	}
};

// use setUserStatus instead
// export const setUserInvisible = (invisible: boolean) => async dispatch => {
// 	try {
// 		const response = await HostApi.instance.send(UpdateInvisibleRequestType, { invisible });
// 		dispatch(updateUser(response.user));
// 	} catch (error) {
// 		logError(`Error trying to update invisible`, { message: error.message });
// 	}
// };

export const createStream = (
	attributes:
		| {
				name: string;
				type: StreamType.Channel;
				memberIds: string[];
				privacy: "public" | "private";
				purpose?: string;
		  }
		| { type: StreamType.Direct; memberIds: string[] }
) => async dispatch => {
	let responsePromise: Promise<CreateChannelStreamResponse | CreateDirectStreamResponse>;
	if (attributes.type === StreamType.Channel) {
		responsePromise = HostApi.instance.send(CreateChannelStreamRequestType, {
			type: StreamType.Channel,
			name: attributes.name,
			memberIds: attributes.memberIds,
			privacy: attributes.privacy,
			purpose: attributes.purpose,
			isTeamStream: false
		});
	} else {
		responsePromise = HostApi.instance.send(CreateDirectStreamRequestType, {
			type: StreamType.Direct,
			memberIds: attributes.memberIds
		});
	}

	try {
		const response = await responsePromise!;
		dispatch(streamActions.addStreams([response.stream]));
		dispatch(contextActions.setCurrentStream(response.stream.id));

		// unmute any created streams
		dispatch(setUserPreference(["mutedStreams", response.stream.id], false));

		return response.stream;
	} catch (error) {
		/* TODO: Handle errors
				- handle name taken errors
				- restricted actions
				- users can't join
		*/
		logError(`There was an error creating a channel: ${error}`, attributes);
		return undefined;
	}
};

export const leaveChannel = (streamId: string) => async (dispatch, getState) => {
	const { context, session } = getState();

	try {
		const { stream } = await HostApi.instance.send(LeaveStreamRequestType, { streamId });
		if (stream.privacy === "private") {
			dispatch(streamActions.remove(streamId, context.currentTeamId));
		} else {
			dispatch(
				streamActions.updateStream({
					...stream,
					memberIds: stream.memberIds!.filter(id => id !== session.userId)
				})
			);
		}
		if (context.currentStreamId === streamId) {
			// this will take you to the #general channel
			dispatch(contextActions.setCurrentStream(undefined));
			// dispatch(setPanel("channels"));
		}
	} catch (error) {
		logError(`There was an error leaving a channel: ${error}`, { streamId });
	}
};

export const removeUsersFromStream = (streamId: string, userIds: string[]) => async dispatch => {
	try {
		const { stream } = await HostApi.instance.send(UpdateStreamMembershipRequestType, {
			streamId,
			remove: userIds
		});
		return dispatch(streamActions.updateStream(stream));
	} catch (error) {
		logError(`There was an error removing user(s) from a stream: ${error}`, { streamId, userIds });
	}
};

export const addUsersToStream = (streamId: string, userIds: string[]) => async dispatch => {
	try {
		const { stream } = await HostApi.instance.send(UpdateStreamMembershipRequestType, {
			streamId,
			add: userIds
		});
		return dispatch(streamActions.updateStream(stream));
	} catch (error) {
		logError(`There was an error adding user(s) to a stream: ${error}`, { streamId, userIds });
	}
};

export const joinStream = (streamId: string) => async dispatch => {
	try {
		const { stream } = await HostApi.instance.send(JoinStreamRequestType, { streamId });
		return dispatch(streamActions.updateStream(stream));
	} catch (error) {
		logError(`There was an error joining a stream: ${error}`, { streamId });
	}
};

export const renameStream = (streamId: string, name: string) => async dispatch => {
	try {
		const { stream } = await HostApi.instance.send(RenameStreamRequestType, { streamId, name });
		return dispatch(streamActions.updateStream(stream));
	} catch (error) {
		logError(`There was an error renaming a stream: ${error}`, { streamId, name });
	}
};

export const setPurpose = (streamId: string, purpose: string) => async dispatch => {
	try {
		const { stream } = await HostApi.instance.send(SetStreamPurposeRequestType, {
			streamId,
			purpose
		});
		return dispatch(streamActions.updateStream(stream));
	} catch (error) {
		logError(`There was an error setting stream purpose: ${error}`, { streamId });
	}
};

export const archiveStream = (streamId: string, archive = true) => async dispatch => {
	try {
		const command = archive ? ArchiveStreamRequestType : UnarchiveStreamRequestType;
		const { stream } = await HostApi.instance.send(command, { streamId });
		if (stream) return dispatch(streamActions.updateStream(stream));
	} catch (error) {
		logError(`There was an error ${archive ? "" : "un"}archiving stream: ${error}`, { streamId });
	}
};

export const invite = (attributes: { email: string; fullName?: string }) => async dispatch => {
	try {
		const response = await HostApi.instance.send(InviteUserRequestType, attributes);
		return dispatch(addUsers([response.user]));
	} catch (error) {
		logError(`There was an error inviting a user: ${error}`, attributes);
	}
};

export const fetchPosts = (params: {
	streamId: string;
	limit?: number;
	before?: string;
}) => async dispatch => {
	try {
		const response = await HostApi.instance.send(FetchPostsRequestType, params);
		dispatch(postsActions.addPostsForStream(params.streamId, response.posts));
		response.codemarks && dispatch(saveCodemarks(response.codemarks));
		return response;
	} catch (error) {
		logError(`There was an error fetching posts: ${error}`, params);
		return undefined;
	}
};

export const fetchThread = (streamId: string, parentPostId: string) => async dispatch => {
	try {
		const { posts, codemarks } = await HostApi.instance.send(FetchPostRepliesRequestType, {
			streamId,
			postId: parentPostId
		});
		codemarks && dispatch(saveCodemarks(codemarks));
		return dispatch(postsActions.addPostsForStream(streamId, posts));
	} catch (error) {
		logError(`There was an error fetching a thread: ${error}`, { parentPostId });
		return undefined;
	}
};

// TODO: make this a capability? doesn't work on CS teams
export const closeDirectMessage = (streamId: string) => async dispatch => {
	try {
		const { stream } = await HostApi.instance.send(CloseStreamRequestType, { streamId });
		dispatch(streamActions.updateStream(stream));
	} catch (error) {
		logError(`There was an error closing a dm: ${error}`);
	}
};

export const openDirectMessage = (streamId: string) => async dispatch => {
	try {
		const response = await HostApi.instance.send(OpenStreamRequestType, { streamId });
		return dispatch(streamActions.updateStream(response.stream));
	} catch (error) {
		logError(`There was an error opening a dm: ${error}`);
	}
};

export const changeStreamMuteState = (streamId: string, mute: boolean) => async (
	dispatch,
	getState
) => {
	const mutedStreams = getState().preferences.mutedStreams || {};

	try {
		dispatch(updatePreferences({ mutedStreams: { ...mutedStreams, [streamId]: mute } }));
		await HostApi.instance.send(MuteStreamRequestType, { streamId, mute });
	} catch (error) {
		logError(`There was an error toggling stream mute state: ${error}`, { streamId });
		// TODO: communicate failure
		dispatch(updatePreferences({ mutedStreams: { ...mutedStreams, [streamId]: !mute } }));
	}
};

export const fetchCodemarks = () => async dispatch => {
	try {
		const response = await HostApi.instance.send(FetchCodemarksRequestType, {});
		if (response) dispatch(saveCodemarks(response.codemarks));
	} catch (error) {
		logError(`failed to fetch codemarks: ${error}`);
	}
};

type IssueStatus = "closed" | "open";

const describeIssueStatusChange = (action: IssueStatus) => {
	switch (action) {
		case "open":
			return "reopened";
		case "closed":
			return "resolved";
		default:
			return action;
	}
};

export const setCodemarkStatus = (
	codemarkId: string,
	status: IssueStatus,
	extraText?: string
) => async dispatch => {
	try {
		const response = await HostApi.instance.send(UpdateCodemarkRequestType, {
			codemarkId,
			status
		});

		await dispatch(
			createPost(
				response.codemark.streamId,
				response.codemark.postId,
				`/me ${describeIssueStatusChange(status)} this issue ${extraText || ""}`
			)
		);

		return dispatch(updateCodemarks([response.codemark]));
	} catch (error) {
		logError(`failed to change codemark status: ${error}`, { codemarkId });
		return undefined;
	}
};

const describeStatusChange = (action: CSReviewStatus) => {
	switch (action) {
		case "open":
			return "reopened";
		case "approved":
			return "approved";
		// case "pending":
		// return "requested changes in";
		case "rejected":
			return "rejected";
		default:
			return action;
	}
};

const toStatusTelemetryNames = (status: CSReviewStatus) => {
	if (status === "approved") return "Approved";
	if (status === "rejected") return "Rejected";
	if (status === "open") return "Reopened";
	return undefined;
};

export const setReviewStatus = (reviewId: string, status: CSReviewStatus) => async dispatch => {
	try {
		const response = await HostApi.instance.send(UpdateReviewRequestType, {
			id: reviewId,
			status
		});

		await dispatch(
			createPost(
				response.review.streamId,
				response.review.postId,
				`/me ${describeStatusChange(status)} this review`
			)
		);
		try {
			HostApi.instance.track("Review State Updated", {
				"Review ID": reviewId,
				"Review State": toStatusTelemetryNames(status)
			});
		} catch (err) {
			logError(`failed to track review status change: ${err}`, { reviewId, status });
		}

		return dispatch(updateReviews([response.review]));
	} catch (error) {
		logError(`failed to change review status: ${error}`, { reviewId });
		return undefined;
	}
};

export const updateTeamTag = (
	team,
	attributes: {
		id?: string;
		color: string;
		label?: string;
		deactivated?: boolean;
		sortOrder?: number;
	}
) => async dispatch => {
	try {
		const tag = { ...attributes };

		if (team.tags == null) {
			team.tags = Object.create(null);
		}

		let response;
		if (!tag.id) {
			// create a random ID for the new tag
			// this is a simple and effective way to create a
			// unique ID. IMO it doesn't really matter that it
			// isn't super elegant or pretty. -Pez
			tag.id = Date.now() + Object.keys(team.tags).length + tag.color;
			tag.sortOrder = Date.now();
			response = HostApi.instance.send(CreateTeamTagRequestType, { team, tag });
			HostApi.instance.track("Tags Updated", {
				"Tag Action": "New",
				Label: tag.label,
				Color: tag.color
			});
		} else if (tag.deactivated) {
			response = HostApi.instance.send(DeleteTeamTagRequestType, { team, tag });
			HostApi.instance.track("Tags Updated", {
				"Tag Action": "Delete",
				Label: tag.label,
				Color: tag.color
			});
		} else {
			response = HostApi.instance.send(UpdateTeamTagRequestType, { team, tag });
			HostApi.instance.track("Tags Updated", {
				"Tag Action": "Edit",
				Label: tag.label,
				Color: tag.color
			});
		}

		// update the team in real-time in the reducer
		team.tags[tag.id] = tag;
		return dispatch(updateTeam(team));
	} catch (error) {
		logError(`There was an error updating a tag: ${error}`, attributes);
	}
};
