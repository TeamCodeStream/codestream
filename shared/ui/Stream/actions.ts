import {
	ArchiveStreamRequestType,
	CloseStreamRequestType,
	CreateChannelStreamRequestType,
	CreateChannelStreamResponse,
	CreateDirectStreamRequestType,
	CreateDirectStreamResponse,
	CreateTeamTagRequestType,
	CreateThirdPartyPostRequestType,
	DeleteTeamTagRequestType,
	EditPostRequestType,
	FetchPostsRequestType,
	FetchUsersRequestType,
	InviteUserRequestType,
	JoinStreamRequestType,
	LeaveStreamRequestType,
	MarkItemReadRequestType,
	MarkPostUnreadRequestType,
	MarkStreamReadRequestType,
	MuteStreamRequestType,
	OpenStreamRequestType,
	ReactToPostRequestType,
	RenameStreamRequestType,
	SetStreamPurposeRequestType,
	SharePostViaServerRequestType,
	UnarchiveStreamRequestType,
	UpdatePreferencesRequestType,
	UpdateStatusRequestType,
	UpdateStreamMembershipRequestType,
	UpdateTeamTagRequestType,
} from "@codestream/protocols/agent";
import { CSPost, CSReviewStatus, StreamType } from "@codestream/protocols/api";
import { get, isEqual } from "lodash-es";

import { createAppAsyncThunk } from "@codestream/webview/store/helper";
import { logError } from "../logger";
import { CodeStreamState } from "../store";
import { saveCodemarks } from "../store/codemarks/actions";
import * as contextActions from "../store/context/actions";
import {
	closeModal,
	closePanel,
	openModal,
	openPanel,
	setChannelFilter,
	setCodemarkAuthorFilter,
	setCodemarkBranchFilter,
	setCodemarkFileFilter,
	setCodemarkTagFilter,
	setCodemarkTypeFilter,
} from "../store/context/actions";
import * as postsActions from "../store/posts/actions";
import { updatePreferences } from "../store/preferences/actions";
import * as streamActions from "../store/streams/actions";
import { updateTeam } from "../store/teams/actions";
import { addUsers, updateUser } from "../store/users/actions";
import { HostApi } from "../webview-api";
import { SetUserPreferenceRequest } from "./actions.types";
import { setPostThreadsLoading } from "../store/posts/actions";
import { codeErrorsApi } from "@codestream/webview/store/codeErrors/api/apiResolver";

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
	setChannelFilter,
};

export const markStreamRead = (streamId: string, postId?: string) => () => {
	HostApi.instance
		.send(MarkStreamReadRequestType, { streamId, postId })
		.catch(error =>
			logError(error, { detail: `There was an error marking a stream read`, streamId })
		);
};

export const markPostUnread = (streamId: string, postId: string) => () => {
	HostApi.instance
		.send(MarkPostUnreadRequestType, { streamId, postId })
		.catch(error =>
			logError(error, { detail: `There was an error marking a post unread`, streamId, postId })
		);
};

export const markItemRead = (itemId: string, numReplies: number) => () => {
	HostApi.instance
		.send(MarkItemReadRequestType, { itemId, numReplies })
		.catch(error =>
			logError(error, { detail: `There was an error marking an item read`, itemId, numReplies })
		);
};

export const createComment =
	(text: string, threadId?: string, mentions?: string[]) =>
	async (dispatch, getState: () => CodeStreamState) => {};

export const editPost =
	(streamId: string, postId: string, text: string, mentionedUserIds?: string[]) =>
	async (dispatch, getState) => {
		try {
			const response = await HostApi.instance.send(EditPostRequestType, {
				streamId,
				postId,
				text,
				mentionedUserIds,
			});
			dispatch(postsActions.updatePost(response.post));

			if (response.post.sharedTo) {
				for (const shareTarget of response.post.sharedTo) {
					try {
						const { post, ts, permalink } = await HostApi.instance.send(
							CreateThirdPartyPostRequestType,
							{
								providerId: shareTarget.providerId,
								channelId: shareTarget.channelId,
								providerTeamId: shareTarget.teamId,
								existingPostId: shareTarget.postId,
								text,
								mentionedUserIds,
							}
						);
					} catch (error) {
						if (error.includes("edit_window_closed")) continue;
						try {
							await HostApi.instance.send(SharePostViaServerRequestType, {
								postId,
								providerId: shareTarget.providerId,
							});
						} catch (error2) {
							logError(`Error sharing an edited post: ${error2}`);
						}
					}
				}
			}
		} catch (error) {
			logError(error, { detail: `There was an error editing a post`, streamId, postId, text });
		}
	};

export const reactToPost =
	(post: CSPost, emoji: string, value: boolean) => async (dispatch, getState) => {
		try {
			const { session } = getState();
			// optimistically set it on the client... waiting for the server
			const reactions = { ...(post.reactions || {}) };
			reactions[emoji] = [...(reactions[emoji] || [])];
			if (value) {
				reactions[emoji].push(session.userId);
			} else {
				reactions[emoji] = reactions[emoji].filter(id => id !== session.userId);
			}

			dispatch(postsActions.updatePost({ ...post, reactions }));

			// then update it for real on the API server
			const response = await HostApi.instance.send(ReactToPostRequestType, {
				streamId: post.streamId,
				postId: post.id,
				emojis: { [emoji]: value },
			});
			return dispatch(postsActions.updatePost(response.post));
		} catch (error) {
			logError(error, { detail: `There was an error reacting to a post`, post, emoji, value });
		}
	};

// usage: setUserPreference( { prefPath: ["favorites", "shoes", "wedges"], value: "red" } )
export const setUserPreference = createAppAsyncThunk<void, SetUserPreferenceRequest>(
	"stream/setUserPreferences",
	async (request, { dispatch, getState }) => {
		const { prefPath, value } = request;
		const dotPath = request.prefPath.join("."); // Used to retrieve current value later
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
			const state = getState();
			// lodash get can resolve nested properties
			const currentPrefsValue = get(state.preferences, dotPath);
			// lodash isEqual is a deep equals, handles arrays / objects
			if (isEqual(currentPrefsValue, value)) {
				console.debug("Skipping already set pref", dotPath, value);
			} else {
				// optimistically merge it into current preferences
				dispatch(updatePreferences(newPreference));
				const response = await HostApi.instance.send(UpdatePreferencesRequestType, {
					preferences: newPreference,
				});
			}
			// update with confirmed server response
			// turning this off so we don't get 3 updates: one optimistically, one
			// via API return, and one via pubnub
			// dispatch(updatePreferences(response.preferences));
		} catch (error) {
			logError(`Error trying to update preferences`, { message: error.message });
		}
	}
);

/*
Usage:
	dispatch(
		setUserPreferences([
			{ prefPath: ["pizza"], value: "yes" },
			{ prefPath: ["car", "honda", "civic"], value: "decent" },
		])
	);
*/
export const setUserPreferences = (request: SetUserPreferenceRequest[]) => async dispatch => {
	const result: any = {};

	for (const preference of request) {
		let currentObj = result;
		const { prefPath, value } = preference;

		for (let i = 0; i < prefPath.length; i++) {
			const key = prefPath[i];

			if (i === prefPath.length - 1) {
				currentObj[key] = value;
			} else {
				currentObj[key] = currentObj[key] || {};
				currentObj = currentObj[key];
			}
		}
	}
	try {
		// optimistically merge it into current preferences
		dispatch(updatePreferences(result));
		const response = await HostApi.instance.send(UpdatePreferencesRequestType, {
			preferences: result,
		});
		// update with confirmed server response
		// To keep consistent with setUserPreference (singular)...
		// turning this off so we don't get 3 updates: one optimistically, one
		// via API return, and one via pubnu
		// dispatch(updatePreferences(response.preferences));
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
	if (!maximizedPane || maximizedPane === paneId) {
		dispatch(setUserPreference({ prefPath: ["sidebarPanes", paneId, "collapsed"], value }));
	}
};

export const setPaneMaximized = (panelId: string, value: boolean) => async dispatch => {
	dispatch(setUserPreference({ prefPath: ["sidebarPanes", panelId, "maximized"], value }));
};

export const setUserStatus =
	(
		label: string,
		ticketId: string,
		ticketUrl: string,
		ticketProvider: string,
		invisible: boolean,
		teamId: string
	) =>
	async dispatch => {
		try {
			const response = await HostApi.instance.send(UpdateStatusRequestType, {
				status: { [teamId]: { label, ticketId, ticketUrl, ticketProvider, invisible } },
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

export const createStream =
	(
		attributes:
			| {
					name: string;
					type: StreamType.Channel;
					memberIds: string[];
					privacy: "public" | "private";
					purpose?: string;
			  }
			| { type: StreamType.Direct; memberIds: string[] }
	) =>
	async dispatch => {
		let responsePromise: Promise<CreateChannelStreamResponse | CreateDirectStreamResponse>;
		if (attributes.type === StreamType.Channel) {
			responsePromise = HostApi.instance.send(CreateChannelStreamRequestType, {
				type: StreamType.Channel,
				name: attributes.name,
				memberIds: attributes.memberIds,
				privacy: attributes.privacy,
				purpose: attributes.purpose,
				isTeamStream: false,
			});
		} else {
			responsePromise = HostApi.instance.send(CreateDirectStreamRequestType, {
				type: StreamType.Direct,
				memberIds: attributes.memberIds,
			});
		}

		try {
			const response = await responsePromise!;
			dispatch(streamActions.addStreams([response.stream]));
			dispatch(contextActions.setCurrentStream(response.stream.id));

			// unmute any created streams
			dispatch(setUserPreference({ prefPath: ["mutedStreams", response.stream.id], value: false }));

			return response.stream;
		} catch (error) {
			/* TODO: Handle errors
          handle name taken errors
          restricted actions
          users can't join
          */
			logError(error, { ...attributes, detail: `There was an error creating a channel` });
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
					memberIds: stream.memberIds!.filter(id => id !== session.userId),
				})
			);
		}
		if (context.currentStreamId === streamId) {
			// this will take you to the #general channel
			dispatch(contextActions.setCurrentStream(undefined));
			// dispatch(setPanel("channels"));
		}
	} catch (error) {
		logError(error, { detail: `There was an error leaving a channel`, streamId });
	}
};

export const removeUsersFromStream = (streamId: string, userIds: string[]) => async dispatch => {
	try {
		const { stream } = await HostApi.instance.send(UpdateStreamMembershipRequestType, {
			streamId,
			remove: userIds,
		});
		return dispatch(streamActions.updateStream(stream));
	} catch (error) {
		logError(error, {
			detail: `There was an error removing user(s) from a stream`,
			streamId,
			userIds,
		});
	}
};

export const addUsersToStream = (streamId: string, userIds: string[]) => async dispatch => {
	try {
		const { stream } = await HostApi.instance.send(UpdateStreamMembershipRequestType, {
			streamId,
			add: userIds,
		});
		return dispatch(streamActions.updateStream(stream));
	} catch (error) {
		logError(error, { detail: `There was an error adding user(s) to a stream`, streamId, userIds });
	}
};

export const joinStream = (streamId: string) => async dispatch => {
	try {
		const { stream } = await HostApi.instance.send(JoinStreamRequestType, { streamId });
		return dispatch(streamActions.updateStream(stream));
	} catch (error) {
		logError(error, { detail: `There was an error joining a stream`, streamId });
	}
};

export const renameStream = (streamId: string, name: string) => async dispatch => {
	try {
		const { stream } = await HostApi.instance.send(RenameStreamRequestType, { streamId, name });
		return dispatch(streamActions.updateStream(stream));
	} catch (error) {
		logError(error, { detail: `There was an error renaming a stream`, streamId, name });
	}
};

export const setPurpose = (streamId: string, purpose: string) => async dispatch => {
	try {
		const { stream } = await HostApi.instance.send(SetStreamPurposeRequestType, {
			streamId,
			purpose,
		});
		return dispatch(streamActions.updateStream(stream));
	} catch (error) {
		logError(error, { detail: `There was an error setting stream purpose`, streamId });
	}
};

export const archiveStream =
	(streamId: string, archive = true) =>
	async dispatch => {
		try {
			const command = archive ? ArchiveStreamRequestType : UnarchiveStreamRequestType;
			const { stream } = await HostApi.instance.send(command, { streamId });
			if (stream) return dispatch(streamActions.updateStream(stream));
		} catch (error) {
			logError(error, {
				detail: `There was an error ${archive ? "" : "un"}archiving stream`,
				streamId,
			});
		}
	};

export const invite =
	(attributes: { email: string; fullName?: string; inviteType?: string }) => async dispatch => {
		try {
			const response = await HostApi.instance.send(InviteUserRequestType, attributes);
			return dispatch(addUsers([response.user]));
		} catch (error) {
			logError(error, { ...attributes, detail: `There was an error inviting a user` });
		}
	};

export const fetchPosts =
	(params: { streamId: string; limit?: number; before?: string }) => async dispatch => {
		try {
			const response = await HostApi.instance.send(FetchPostsRequestType, params);
			dispatch(postsActions.addPostsForStream(params.streamId, response.posts));
			response.codemarks && dispatch(saveCodemarks(response.codemarks));
			return response;
		} catch (error) {
			logError(error, { ...params, detail: `There was an error fetching posts` });
			return undefined;
		}
	};

export const fetchThread =
	(streamId: string, parentPostId: string) => async (dispatch, getState) => {
		try {
			dispatch(setPostThreadsLoading(parentPostId, true));
			const { posts, codemarks } = await codeErrorsApi.fetchPostReplies({
				streamId,
				postId: parentPostId,
			});
			const missingAuthorIds: string[] = [];
			for (const post of posts) {
				const author = getState().users[post.creatorId];
				if (!author) {
					if (!missingAuthorIds.includes(post.creatorId)) {
						missingAuthorIds.push(post.creatorId);
					}
				}
			}
			if (missingAuthorIds.length > 0) {
				const response = await HostApi.instance.send(FetchUsersRequestType, {
					userIds: missingAuthorIds,
				});
				await dispatch(addUsers(response.users));
			}
			codemarks && (await dispatch(saveCodemarks(codemarks)));
			await dispatch(postsActions.addPostsForStream(streamId, posts));
		} catch (error) {
			logError(error, { detail: `There was an error fetching a thread`, parentPostId });
		} finally {
			dispatch(setPostThreadsLoading(parentPostId, false));
		}
	};

// TODO: make this a capability? doesn't work on CS teams
export const closeDirectMessage = (streamId: string) => async dispatch => {
	try {
		const { stream } = await HostApi.instance.send(CloseStreamRequestType, { streamId });
		dispatch(streamActions.updateStream(stream));
	} catch (error) {
		logError(error, { detail: `There was an error closing a dm` });
	}
};

export const openDirectMessage = (streamId: string) => async dispatch => {
	try {
		const response = await HostApi.instance.send(OpenStreamRequestType, { streamId });
		return dispatch(streamActions.updateStream(response.stream));
	} catch (error) {
		logError(error, { detail: `There was an error opening a dm` });
	}
};

export const changeStreamMuteState =
	(streamId: string, mute: boolean) => async (dispatch, getState) => {
		const mutedStreams = getState().preferences.mutedStreams || {};

		try {
			dispatch(updatePreferences({ mutedStreams: { ...mutedStreams, [streamId]: mute } }));
			await HostApi.instance.send(MuteStreamRequestType, { streamId, mute });
		} catch (error) {
			logError(error, { detail: `There was an error toggling stream mute state`, streamId });
			// TODO: communicate failure
			dispatch(updatePreferences({ mutedStreams: { ...mutedStreams, [streamId]: !mute } }));
		}
	};

export const fetchCodemarks = () => async dispatch => {
	try {
		// const response = await HostApi.instance.send(FetchCodemarksRequestType, {});
		// if (response) dispatch(saveCodemarks(response.codemarks));
	} catch (error) {
		logError(error, { detail: `failed to fetch codemarks` });
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

const describePinnedChange = (value: boolean) => {
	switch (value) {
		case true:
			return "unarchived";
		case false:
			return "archived";
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
			return "requested changes in";
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

export const updateTeamTag =
	(
		team,
		attributes: {
			id?: string;
			color: string;
			label?: string;
			deactivated?: boolean;
			sortOrder?: number;
		}
	) =>
	async dispatch => {
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
			} else if (tag.deactivated) {
				response = HostApi.instance.send(DeleteTeamTagRequestType, { team, tag });
			} else {
				response = HostApi.instance.send(UpdateTeamTagRequestType, { team, tag });
			}

			// update the team in real-time in the reducer
			team.tags[tag.id] = tag;
			return dispatch(updateTeam(team));
		} catch (error) {
			logError(error, { ...attributes, detail: `There was an error updating a tag` });
		}
	};
