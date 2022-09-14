import { createSelector } from "@reduxjs/toolkit";
import { ActionType } from "../common";
import * as actions from "./actions";
import { StreamActionType, StreamsState } from "./types";
import { includes as _includes, sortBy as _sortBy, sortBy } from "lodash-es";
import { CodeStreamState } from "..";
import { emptyArray } from "@codestream/webview/utils";
import { CSChannelStream } from "@codestream/protocols/api";

type StreamsAction = ActionType<typeof actions>;

const initialState: StreamsState = {
	byTeam: {},
};

const addStreamForTeam = (state, stream) => {
	const teamId = stream.teamId;
	const teamStreams = state[teamId] || {};
	return {
		...state,
		[teamId]: { ...teamStreams, [stream.id]: stream },
	};
};

const addStream = (state, stream) => {
	return {
		byTeam: addStreamForTeam(state.byTeam, stream),
	};
};

export const reduceStreams = (state: StreamsState = initialState, action: StreamsAction) => {
	switch (action.type) {
		case StreamActionType.ADD_STREAMS:
		case StreamActionType.BOOTSTRAP_STREAMS:
			return action.payload.reduce(addStream, state);
		case StreamActionType.UPDATE_STREAM:
			return addStream(state, action.payload);
		case StreamActionType.REMOVE_STREAM: {
			const streamsForTeam = { ...(state.byTeam[action.payload.teamId] || {}) };
			delete streamsForTeam[action.payload.streamId];
			return {
				...state,
				byTeam: { ...state.byTeam, [action.payload.teamId]: streamsForTeam },
			};
		}
		case "RESET":
			return initialState;
		default:
			return state;
	}
};

// Selectors
// TODO: memoize
export const getStreamForTeam = (state: StreamsState, teamId: string) => {
	const streams = state.byTeam[teamId] || {};
	return _sortBy(
		Object.values(streams).filter(stream => (stream as any).isTeamStream),
		"createdAt"
	)[0];
};

export const getChannelStreamsForTeam = createSelector(
	(state: CodeStreamState) => state.streams,
	(state: CodeStreamState, teamId: string) => teamId,
	(state: CodeStreamState) => state.session.userId!,
	(streamState: StreamsState, teamId: string, userId: string): CSChannelStream[] => {
		const streams = streamState.byTeam[teamId];

		if (streams == null) return emptyArray;

		return sortBy(
			Object.values(streams).filter(
				stream =>
					stream.type === "channel" &&
					!stream.deactivated &&
					!stream.isArchived &&
					!stream.serviceType &&
					(stream.isTeamStream || _includes(stream.memberIds, userId)),
				stream => (stream.name || "").toLowerCase()
			)
		) as CSChannelStream[];
	}
);

// TODO: memoize
export const getPublicChannelStreamsForTeam = (
	state: StreamsState,
	teamId: string,
	userId: string
) => {
	const streams = state.byTeam[teamId] || {};
	return Object.values(streams).filter(
		stream =>
			stream.type === "channel" &&
			!stream.deactivated &&
			!stream.isArchived &&
			!stream.isTeamStream &&
			!stream.serviceType &&
			!_includes(stream.memberIds, userId)
	);
};

export const getArchivedChannelStreamsForTeam = (state: StreamsState, teamId: string) => {
	const streams = state.byTeam[teamId] || {};
	return Object.values(streams).filter(stream => stream.type === "channel" && stream.isArchived);
};

const makeName = user => {
	if (!user) return;
	if (user.username) {
		return user.username;
	} else {
		return user.email.replace(/@.*/, "");
	}
};

const makeDirectMessageStreamName = (memberIds, users) => {
	const names = memberIds.map(id => makeName(users[id])).filter(Boolean);
	if (names.length === 0) {
		console.error("Cannot construct direct message stream name without member names", {
			memberIds,
			users,
		});
		return "NO NAME";
	}
	return names.join(", ");
};

export const getDMName = (stream, users, currentUserId) => {
	if (stream.name) return stream.name;
	if (stream.type === "direct") {
		// if it's a direct message w/myself, then use my name, otherwise exclude myself
		if (stream.memberIds.length === 1 && stream.memberIds[0] === currentUserId) {
			return makeDirectMessageStreamName([currentUserId], users) + " (you)";
		}
		const withoutMe = (stream.memberIds || []).filter(id => id !== currentUserId);
		return makeDirectMessageStreamName(withoutMe, users);
	} else {
		console.error("Cannot get a name for a non-dm channel", stream);
		return "NO NAME";
	}
};

export const getDirectMessageStreamsForTeam = (state: StreamsState, teamId: string) => {
	const streams = state.byTeam[teamId] || {};
	// TODO: filter for only those including the current user
	return Object.values(streams).filter(stream => stream.type === "direct");
};

export const getServiceStreamsForTeam = (state: StreamsState, teamId: string, userId: string) => {
	const streams = state.byTeam[teamId] || {};
	const serviceStreams = Object.values(streams).filter(
		stream =>
			stream.type === "channel" &&
			!stream.deactivated &&
			!stream.isArchived &&
			stream.serviceType &&
			(stream.isTeamStream || (stream.memberIds && stream.memberIds!.includes(userId)))
	);
	serviceStreams.map(stream => {
		// We need to stop doing this
		(stream as any).displayName = "Live Share";
	});
	return serviceStreams;
};

export const getStreamForId = (state: StreamsState, teamId: string, streamId: string) => {
	const streams = state.byTeam[teamId] || {};
	return Object.values(streams).find(stream => stream.id === streamId);
};
