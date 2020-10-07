import { EditorContextState, EditorContextActionsType } from "./types";
import { Range } from "vscode-languageserver-types";
import * as actions from "./actions";
import { ActionType } from "../common";
import { createSelector } from "reselect";
import { range } from "@codestream/webview/utils";
import { EditorContext, EditorMetrics, EditorScrollMode } from "@codestream/protocols/webview";
import { GetFileScmInfoResponse, GetRangeScmInfoResponse } from "@codestream/protocols/agent";
import { CodeStreamState } from "..";
import { IdeState } from "../ide/types";

type EditorContextActions = ActionType<typeof actions>;

const initialState: EditorContextState = {
	activeFile: "",
	textEditorVisibleRanges: [],
	textEditorUri: undefined,
	textEditorSelections: [],
	metrics: {
		fontSize: 12,
		lineHeight: 18,
		scrollMode: EditorScrollMode.Lines,
		scrollRatio: 1
	},
	scmInfo: undefined
};

export function reduceEditorContext(state = initialState, action: EditorContextActions) {
	switch (action.type) {
		case EditorContextActionsType.SetEditorLayout: {
			return { ...state, ...action.payload };
		}

		case EditorContextActionsType.SetEditorContext: {
			const { metrics }: { metrics?: EditorMetrics } = action.payload;
			if (metrics != null) {
				if (metrics.lineHeight == undefined) {
					if (metrics.fontSize == undefined) {
						metrics.fontSize = 12;
						metrics.lineHeight = 18;
					} else {
						metrics.lineHeight = metrics.fontSize * 1.5;
					}
				}

				if (metrics.scrollMode === undefined) {
					metrics.scrollMode = EditorScrollMode.Lines;
				}

				if (metrics.scrollRatio === undefined) {
					metrics.scrollRatio = 1;
				}
			}

			// scmInfo needs to be overwritten if the file is changing and the payload doesn't have one
			const nextScmInfo =
				action.payload.textEditorUri && action.payload.textEditorUri !== state.textEditorUri
					? action.payload.scmInfo
					: action.payload.scmInfo || state.scmInfo;

			return { ...state, ...action.payload, scmInfo: nextScmInfo };
		}
		case "RESET":
			return initialState;
		default:
			return state;
	}
}

const emptyArray = [];

let LAST_SELECTION: any = {};
export const getCurrentSelection = createSelector(
	(state: EditorContextState) => state.textEditorSelections || emptyArray,
	selections => {
		if (JSON.stringify(selections[0]) !== JSON.stringify(LAST_SELECTION)) {
			LAST_SELECTION = selections[0];
		}
		return selections[0];
	}
);

let LAST_RANGES: any = [];
export const getVisibleRanges = (state: EditorContextState) => {
	if (JSON.stringify(state.textEditorVisibleRanges) !== JSON.stringify(LAST_RANGES)) {
		LAST_RANGES = state.textEditorVisibleRanges || emptyArray;
	}
	return LAST_RANGES;
};

export const getLine0ForEditorLine = (
	textEditorVisibleRanges: Range[],
	editorLine: number,
	repositionToFit?: boolean
) => {
	// start at 20 lines above the first visible range
	const linesAboveViewport = 20;

	// since we're starting at minus-20 lines, our line counter should start at -20
	let lineCounter = -linesAboveViewport;

	let toLineNum0 = -1; // indicates we didn't find it
	if (textEditorVisibleRanges != null) {
		textEditorVisibleRanges.forEach((lineRange, rangeIndex) => {
			// if this is the first range, start 20 lines above.
			const startLine =
				rangeIndex === 0 ? lineRange.start.line - linesAboveViewport : lineRange.start.line;
			range(startLine, lineRange.end.line + 1).forEach(thisLine => {
				if (thisLine === editorLine) toLineNum0 = lineCounter;
				lineCounter++;
			});
		});
	}

	// didn't find it -- guess where we think it is and return as appropriate
	if (repositionToFit && toLineNum0 < 0) {
		// above
		if (editorLine < textEditorVisibleRanges[0].start.line) {
			toLineNum0 = 0;
		}
		// below
		else if (editorLine > textEditorVisibleRanges[textEditorVisibleRanges.length - 1].end.line) {
			toLineNum0 = lineCounter;
		}
		// must be folded out, return half the height
		else {
			toLineNum0 = lineCounter / 2;
		}
	}
	return toLineNum0;
};

export const getVisibleLineCount = createSelector(
	(visibleRanges?: Range[]) => visibleRanges || emptyArray,
	(textEditorVisibleRanges: Range[]) => {
		let numLinesVisible = 0;
		if (textEditorVisibleRanges != null) {
			textEditorVisibleRanges.forEach(range => {
				numLinesVisible += range.end.line - range.start.line + 1;
			});
		}
		return numLinesVisible;
	}
);

export enum ScmError {
	NoRepo = "NoRepo",
	NoGit = "NoGit",
	NoRemotes = "NoRemotes"
}

export const getFileScmError = (scmInfo: GetFileScmInfoResponse | GetRangeScmInfoResponse) => {
	if (scmInfo.ignored) return undefined;
	if (scmInfo.scm == null) {
		if (scmInfo.error == null) return ScmError.NoRepo;

		return ScmError.NoGit;
	}

	if (scmInfo.scm.remotes.length === 0) return ScmError.NoRemotes;

	return undefined;
};

export const mapFileScmErrorForTelemetry = (error: string) => {
	if (error === ScmError.NoRepo) return "RepoNotManaged";
	if (error === ScmError.NoGit) return "GitNotFound";
	if (error === ScmError.NoRemotes) return "NoRemotes";
	return "Unknown";
};

export const getSidebarLocation = createSelector(
	(state: CodeStreamState) => state.editorContext,
	(state: CodeStreamState) => state.ide,
	(editorContext: EditorContext, ideState: IdeState) => {
		let position = editorContext.sidebar && editorContext.sidebar.location;
		if (!position) {
			if (ideState.name === "VSC") position = "left";
			else position = "right";
		}

		return position;
	}
);
