import { createSelector } from "reselect";
import { toMapBy, mapFilter } from "../../utils";
import { ActionType } from "../common";
import * as actions from "./actions";
import { CodemarksActionsTypes, CodemarksState } from "./types";
import { CodemarkPlus } from "@codestream/protocols/agent";
import { CodemarkType, CSReview, CodemarkStatus } from "@codestream/protocols/api";
import { CodeStreamState } from "..";
import { getThreadPosts } from "../posts/reducer";
import { isPending } from "../posts/types";

type CodemarksActions = ActionType<typeof actions>;

const initialState: CodemarksState = {};

export function reduceCodemarks(state = initialState, action: CodemarksActions) {
	switch (action.type) {
		case CodemarksActionsTypes.AddCodemarks:
		case CodemarksActionsTypes.UpdateCodemarks:
		case CodemarksActionsTypes.SaveCodemarks: {
			return { ...state, ...toMapBy("id", action.payload) };
		}
		case CodemarksActionsTypes.Delete: {
			const nextState = { ...state };
			delete nextState[action.payload];
			return nextState;
		}
		case "RESET":
			return initialState;
		default:
			return state;
	}
}

export function getCodemark(state: CodemarksState, id?: string): CodemarkPlus | undefined {
	if (!id) return undefined;
	return state[id];
}

export function getByType(state: CodemarksState, type?: string): CodemarkPlus[] {
	if (!type) return Object.values(state);

	return Object.values(state).filter(codemark => codemark.type === type);
}

export function getMyOpenIssues(state: CodemarksState, assigneeId: string): CodemarkPlus[] {
	return Object.values(state).filter(
		codemark =>
			codemark.type === CodemarkType.Issue &&
			codemark.status !== CodemarkStatus.Closed &&
			!codemark.externalProvider &&
			(codemark.assignees || []).includes(assigneeId) &&
			!codemark.deactivated
	);
}

function isNotLinkType(codemark: CodemarkPlus) {
	return codemark.type !== CodemarkType.Link;
}

function isNotDeprecatedType(codemark: CodemarkPlus) {
	return (
		codemark.type !== CodemarkType.Trap &&
		codemark.type !== CodemarkType.Question &&
		codemark.type !== CodemarkType.Bookmark
	);
}

const getCodemarks = state => state.codemarks;
const getCodemarkTypeFilter = state => state.context.codemarkTypeFilter;
export const getTypeFilteredCodemarks = createSelector(
	getCodemarks,
	getCodemarkTypeFilter,
	(codemarks: CodemarksState, filter: string) => {
		if (filter === "all")
			return Object.values(codemarks).filter(c => isNotLinkType(c) && isNotDeprecatedType(c));
		else {
			return Object.values(codemarks).filter(
				codemark =>
					isNotLinkType(codemark) &&
					isNotDeprecatedType(codemark) &&
					codemark.type === filter &&
					!codemark.deactivated
			);
		}
	}
);
const getCodemarkFileFilter = state => {
	const { context } = state;
	// let fileNameToFilterFor;
	let fileStreamIdToFilterFor;
	if (context.activeFile && context.fileStreamId) {
		// fileNameToFilterFor = context.activeFile;
		fileStreamIdToFilterFor = context.fileStreamId;
	} else if (context.activeFile && !context.fileStreamId) {
		// fileNameToFilterFor = context.activeFile;
	} else {
		// fileNameToFilterFor = context.lastActiveFile;
		fileStreamIdToFilterFor = context.lastFileStreamId;
	}
	return fileStreamIdToFilterFor;
};
export const getFileFilteredCodemarks = createSelector(
	getCodemarks,
	getCodemarkFileFilter,
	(codemarks: CodemarksState, filter: string) => {
		return Object.values(codemarks).filter(codemark => {
			if (isNotLinkType(codemark) === false) return false;

			const codeBlock = codemark.markers && codemark.markers.length && codemark.markers[0];
			const codeBlockFileStreamId = codeBlock && codeBlock.fileStreamId;
			return !codemark.deactivated && codeBlockFileStreamId === filter;
		});
	}
);
export const getActiveCodemarks = createSelector(getCodemarks, (codemarks: CodemarksState) => {
	return Object.values(codemarks).filter(
		codemark => isNotLinkType(codemark) && isNotDeprecatedType(codemark) && !codemark.deactivated
	);
});

export const teamHasCodemarks = createSelector(getCodemarks, (codemarks: CodemarksState) => {
	return Object.keys(codemarks).length > 0;
});

export const getReviewChangeRequests = createSelector(
	(state: CodeStreamState) => state.codemarks,
	(state: CodeStreamState, review: CSReview) =>
		getThreadPosts(state, review.streamId, review.postId),
	(codemarks, posts) => {
		return mapFilter(posts, post => {
			if (isPending(post) || post.codemarkId == null) return;

			const codemark = getCodemark(codemarks, post.codemarkId);
			if (codemark == null || !codemark.isChangeRequest) return;
			return codemark;
		});
	}
);
