import { CSStream, CSTeam, CSUser, StreamType } from "@codestream/protocols/api";
import { difference, isString } from "lodash-es";
import { createSelector } from "reselect";
import { CodeStreamState } from "..";
import { emptyArray, mapFilter, toMapBy } from "../../utils";
import { isFeatureEnabled } from "../apiVersioning/reducer";
import { ActionType } from "../common";
import { PreferencesState } from "../preferences/types";
import { getStreamForId } from "../streams/reducer";
import { UnreadsState } from "../unreads/types";
import * as actions from "./actions";
import { UsersActionsType, UsersState } from "./types";

type UsersActions = ActionType<typeof actions>;

const initialState: UsersState = {};

const updateUser = (payload: CSUser, users: UsersState) => {
	const user = users[payload.id] || {};
	return { ...user, ...payload };
};

export function reduceUsers(state = initialState, action: UsersActions) {
	switch (action.type) {
		case UsersActionsType.Bootstrap: {
			return toMapBy("id", action.payload);
		}
		case UsersActionsType.Update:
			return { ...state, [action.payload.id]: updateUser(action.payload, state) };
		case UsersActionsType.Add: {
			const updatedUsers = action.payload.map(user => updateUser(user, state));
			return { ...state, ...toMapBy("id", updatedUsers) };
		}
		case "RESET":
			return initialState;
		default:
			return state;
	}
}

const getUsername = (user: CSUser) => {
	if (!user.username && user.email) {
		return user.email.replace(/@.*/, "");
	}
	return user.username;
};

const getUsers = (state: CodeStreamState) => state.users;

const getCurrentTeam = (state: CodeStreamState) => state.teams[state.context.currentTeamId];

const getCurrentUser = (state: CodeStreamState) => state.users[state.session.userId || ""];

export const isCurrentUserInternal = (state: CodeStreamState) => {
	const email = state.users[state.session.userId || ""]?.email;
	if (!email) return false;
	return ["codestream.com", "newrelic.com"].includes(email.split("@")[1]);
};

export const getActiveMemberIds = (team: CSTeam) => {
	return difference(
		difference(team.memberIds, team.removedMemberIds || []),
		team.foreignMemberIds || []
	);
};

export const isActiveMember = (team: CSTeam, userId: string) => {
	return getActiveMemberIds(team).includes(userId);
};

export const getTeamMembers = createSelector(getCurrentTeam, getUsers, (team, users) => {
	const memberIds = getActiveMemberIds(team);
	return mapFilter(memberIds, (id: string) => {
		const user: CSUser = users[id];
		return user && !user.deactivated && !user.externalUserId ? user : undefined;
	}).sort((a, b) => a?.username?.localeCompare(b?.username));
});

export const getTeamMates = createSelector(
	getTeamMembers,
	(state: CodeStreamState) => state.session.userId!,
	(members: CSUser[], userId: string) => members.filter(m => m.id !== userId && m.isRegistered)
);

// return the team tags as an array, in sort order
export const getTeamTagsArray = createSelector(getCurrentTeam, team => {
	if (team.tags == null) {
		return emptyArray;
	}

	return mapFilter(Object.entries(team.tags), ([id, tag]) =>
		tag.deactivated ? null : { id, ...tag }
	).sort((a, b) => (a.sortOrder == null || b.sortOrder == null ? -1 : a.sortOrder - b.sortOrder));
});

// return the team tags as an associative array (hash)
export const getTeamTagsHash = createSelector(getTeamTagsArray, tagsArray => {
	return toMapBy("id", tagsArray);
});

export const getAllUsers = createSelector(getUsers, (users: UsersState) => Object.values(users));
export const getUsernames = createSelector(getAllUsers, users => {
	return users.map(getUsername);
});
export const getNrAiUserId = createSelector(getAllUsers, users => {
	return users.find(u => u.username === "AI")?.id;
});

export const getUsernamesById = createSelector(getAllUsers, users => {
	const map = {};
	users.forEach(user => {
		map[user.id] = getUsername(user);
	});
	return map;
});

export const getUsernamesByIdLowerCase = createSelector(getAllUsers, users => {
	const map: { [id: string]: string } = {};
	users.forEach(user => {
		map[user.id] = getUsername(user).toLowerCase();
	});
	return map;
});

export const getNormalizedUsernames = createSelector(getUsernames, usernames => {
	return mapFilter(usernames, username => username && username.toLowerCase());
});

export const getUserByCsId = createSelector(
	(state: UsersState) => state,
	(_: any, codestreamId: string) => codestreamId,
	(users: UsersState, codestreamId: string) => {
		for (let user of Object.values(users)) {
			if (user.codestreamId === codestreamId || user.id === codestreamId) return user;
		}
		return undefined;
	}
);

export const findMentionedUserIds = (members: CSUser[], text: string) => {
	const mentionedUserIds: string[] = [];
	if (text == null || text.length === 0) {
		return mentionedUserIds;
	}

	members.forEach(user => {
		const matcher = user.username.replace(/\+/g, "\\+").replace(/\./g, "\\.");
		if (text.match("@" + matcher + "\\b")) {
			mentionedUserIds.push(user.id);
		}
	});
	return mentionedUserIds;
};

export const currentUserIsAdminSelector = createSelector(
	(state: CodeStreamState) => state.users,
	(state: CodeStreamState) => state.teams,
	(state: CodeStreamState) => state.session,
	(state: CodeStreamState) => state.context,
	(users, teams, session, context) => {
		if (!session.userId) {
			return false;
		}
		const team = teams[context.currentTeamId];
		const user = users[session.userId];
		return (team.adminIds || []).includes(user.id);
	}
);

export const getStreamMembers = createSelector(
	state => state.users,
	(state: CodeStreamState, streamOrId: CSStream | string) => {
		return isString(streamOrId)
			? getStreamForId(state.streams, state.context.currentTeamId, streamOrId)
			: streamOrId;
	},
	(users: UsersState, stream?: CSStream) => {
		if (
			stream == undefined ||
			stream.type === StreamType.File ||
			stream.type === StreamType.Object ||
			stream.memberIds == undefined
		)
			return [];

		return mapFilter(stream.memberIds, id => {
			const user = users[id];
			if (user && user.isRegistered) return user;
			return;
		});
	}
);

export const getPreferences = createSelector(
	(state: CodeStreamState) => state.preferences,
	(preferences: PreferencesState) => preferences
);

export const getReadReplies = createSelector(
	(state: CodeStreamState) => state.preferences,
	(_: any, id: string) => id,
	(preferences: PreferencesState, id: string) => (preferences.readReplies || {})[id] || 0
);

interface Readable {
	id: string;
	numReplies: number;
	modifiedAt: number;
	creatorId: string;
}

const isItemUnread = (item: Readable, lastReadItem: number | undefined, userId: string) => {
	// start represents when this feature was first deployed;
	// items before that won't have the unread badge otherwise
	// customers will just have a "sea of blue" even though they
	// may be up-to-date on all content
	const start = 1617827398000;
	if (item.modifiedAt < start) return false;
	// if we are the author and there are no replies, the not unread
	if (item.creatorId == userId && item.numReplies == 0) return false;
	// if we've never read the item, or if there are new replies
	// since the last time we read it, return true
	return lastReadItem == undefined || item.numReplies > lastReadItem;
};

export const isUnread = createSelector(
	(state: CodeStreamState) => (isFeatureEnabled(state, "readItem") ? state.umis : undefined),
	(state: CodeStreamState) => state.session.userId || "",
	(_a: any, item: Readable) => item,
	(umis: UnreadsState | undefined, userId: string, item: Readable) => {
		if (!umis || !item) return false;
		const { lastReadItems } = umis;
		return isItemUnread(item, lastReadItems[item.id], userId);
	}
);

export const unreadMap = createSelector(
	(state: CodeStreamState) => (isFeatureEnabled(state, "readItem") ? state.umis : undefined),
	(state: CodeStreamState) => state.session.userId || "",
	(_a: any, items: Readable[]) => items,
	(umis: UnreadsState | undefined, userId: string, items: Readable[]) => {
		const ret = {};
		// if it's not supported, just return false for every item
		if (!umis) {
			items.forEach(item => {
				ret[item.id] = false;
			});
			return ret;
		}
		const { lastReadItems = {} } = umis;
		items.filter(Boolean).forEach(item => {
			ret[item.id] = isItemUnread(item, lastReadItems[item.id], userId);
		});
		return ret;
	}
);
