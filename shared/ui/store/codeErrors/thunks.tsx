import {
	DidResolveStackTraceLineNotification,
	GetNewRelicErrorGroupRequest,
	GetObservabilityErrorsRequest,
	ResolveStackTracePositionResponse,
	ResolveStackTraceRequest,
} from "@codestream/protocols/agent";
import { CSCodeError, CSStackTraceLine } from "@codestream/protocols/api";
import { logError } from "@codestream/webview/logger";
import { CodeStreamState } from "@codestream/webview/store";
import {
	_addProviderError,
	_clearProviderError,
	_isLoadingErrorGroup,
	_setErrorGroup,
	_updateCodeErrors,
	addCodeErrors,
	handleDirectives,
	setFunctionToEdit,
	setFunctionToEditFailed,
} from "@codestream/webview/store/codeErrors/actions";
import { setCurrentCodeErrorData } from "@codestream/webview/store/context/actions";
import { createAppAsyncThunk } from "@codestream/webview/store/helper";
import { highlightRange } from "@codestream/webview/Stream/api-functions";
import { Position, Range } from "vscode-languageserver-types";
import { URI } from "vscode-uri";
import {
	codeErrorsApi,
	codeErrorsIDEApi,
} from "@codestream/webview/store/codeErrors/api/apiResolver";
import { CodeErrorData } from "@codestream/protocols/webview";

export const updateCodeErrors =
	(codeErrors: CSCodeError[]) => async (dispatch, getState: () => CodeStreamState) => {
		const state = getState();
		codeErrors = codeErrors.map(_ => ({
			..._,
			stackTraces: state.codeErrors.codeErrors[_.entityGuid].stackTraces,
		}));
		dispatch(_updateCodeErrors(codeErrors));
	};
export const resolveStackTraceLine =
	(notification: DidResolveStackTraceLineNotification) =>
	async (dispatch, getState: () => CodeStreamState) => {
		const { codeErrorId, occurrenceId, index, resolvedLine } = notification;

		const state = getState();
		const codeError = state.codeErrors?.codeErrors[codeErrorId];
		if (!codeError) return;

		let stackTraceIndex = codeError.stackTraces.findIndex(_ => _.occurrenceId === occurrenceId);

		// FIXME occurrenceId mapping is not reliable, so assume it's the only one that exists
		if (stackTraceIndex < 0 && codeError.stackTraces.length === 1) stackTraceIndex = 0;

		const stackTrace = codeError.stackTraces[stackTraceIndex];
		const updatedLines = [...stackTrace.lines];
		updatedLines[index] = {
			...updatedLines[index],
			...resolvedLine,
		};
		const updatedStackTrace = {
			...stackTrace,
			lines: updatedLines,
		};
		const updatedStackTraces = [...codeError.stackTraces];
		updatedStackTraces[stackTraceIndex] = updatedStackTrace;
		const updatedCodeError = {
			...codeError,
			stackTraces: updatedStackTraces,
		};
		dispatch(_updateCodeErrors([updatedCodeError]));
	};

export interface CreateCodeErrorError {
	reason: "share" | "create";
	message?: string;
}

export const setProviderError =
	(providerId: string, errorGroupGuid: string, error?: { message: string }) => dispatch => {
		try {
			dispatch(_addProviderError(providerId, errorGroupGuid, error));
		} catch (error) {
			logError(error, {
				detail: `failed to setProviderError`,
				providerId,
				errorGroupGuid,
			});
		}
	};

export const clearProviderError =
	(providerId: string, id: string, error?: { message: string }) => dispatch => {
		try {
			dispatch(_clearProviderError(providerId, id));
		} catch (error) {
			logError(error, { detail: `failed to setProviderError`, providerId, id });
		}
	};

type FetchErrorGroupParameters = {
	codeError: CSCodeError;
	occurrenceId?: string;
	entityGuid?: string;
};

type FetchErrorGroupDiscussionParameters = {
	accountId: number;
	errorGroupGuid: string;
	entityGuid: string;
};

export const fetchErrorGroup = createAppAsyncThunk(
	"codeErrors/fetchErrorGroup",
	async ({ codeError, occurrenceId, entityGuid }: FetchErrorGroupParameters, { dispatch }) => {
		let errorGroupGuid;
		try {
			errorGroupGuid = codeError?.entityGuid;
			dispatch(_isLoadingErrorGroup(errorGroupGuid, { isLoading: true }));
			const result = await dispatch(
				fetchNewRelicErrorGroup({
					errorGroupGuid: errorGroupGuid!,
					// might not have a codeError.stackTraces from discussions
					occurrenceId: occurrenceId ?? codeError.stackTraces[0].occurrenceId,
					entityGuid: entityGuid,
				})
			).unwrap();

			dispatch(_isLoadingErrorGroup(errorGroupGuid, { isLoading: true }));

			if (result.errorGroup) {
				dispatch(_setErrorGroup(codeError.entityGuid, result.errorGroup));
			}
		} catch (error) {
			logError(error, { detail: `failed to fetchErrorGroup`, objectId: errorGroupGuid });
			return undefined;
		}
	}
);

export type FindErrorGroupByObjectIdParameters = {
	objectId: string;
	occurrenceId?: string;
};

/**
 * Try to find a codeError by its objectId
 *
 * @param objectId
 * @param occurrenceId
 * @returns
 */
export const findErrorGroupByObjectId = createAppAsyncThunk(
	"codeErrors/findErrorGroupByObjectId", // action type
	async (
		{ objectId, occurrenceId }: FindErrorGroupByObjectIdParameters,
		{ dispatch, getState }
	) => {
		try {
			const locator = (state: CodeStreamState, oid: string, tid?: string) => {
				const codeError = Object.values(state.codeErrors.codeErrors).find(
					(_: CSCodeError) =>
						_.entityGuid ===
						oid /*&& (tid ? _.stackTraces.find(st => st.occurrenceId === tid) : true)*/
				);
				return codeError;
			};
			const state = getState();
			return locator(state, objectId, occurrenceId);
		} catch (error) {
			logError(error, {
				detail: `failed to findErrorGroupByObjectId`,
				objectId,
				occurrenceId,
			});
		}
		return undefined;
	}
);

export const setErrorGroup = (errorGroupGuid: string, data?: any) => dispatch => {
	try {
		dispatch(_setErrorGroup(errorGroupGuid, data));
	} catch (error) {
		logError(error, { detail: `failed to _setErrorGroup`, errorGroupGuid });
	}
};

export type OpenErrorGroupParameters = {
	errorGroupGuid: string;
	occurrenceId?: string;
	data: CodeErrorData;
};

export const openErrorGroup = createAppAsyncThunk(
	"codeErrors/openErrorGroup",
	async (
		{ errorGroupGuid, occurrenceId, data }: OpenErrorGroupParameters,
		{ dispatch, getState }
	) => {
		dispatch(setFunctionToEdit(undefined));
		try {
			// This InlineCodemarks.tsx uses this to initiate <CodeErrorNav>
			dispatch(setCurrentCodeErrorData(errorGroupGuid, data));
		} catch (ex) {
			logError(`failed to findErrorGroupByObjectId`, {
				ex,
				errorGroupGuid,
				occurrenceId,
				data,
			});
		}
	}
);

/**
 * Provider api
 *
 * @param method the method in the agent
 * @param params the data to send to the provider
 * @param options optional options
 */
export const api =
	<T = any, R = any>(
		method: "assignRepository" | "removeAssignee" | "setAssignee" | "setState",
		params: { errorGroupGuid: string } | any,
		options?: {
			updateOnSuccess?: boolean;
			preventClearError: boolean;
			preventErrorReporting?: boolean;
		}
	) =>
	async (dispatch, getState: () => CodeStreamState) => {
		let providerId = "newrelic*com";
		let pullRequestId;
		try {
			// const state = getState();
			// const currentPullRequest = state.context.currentPullRequest;
			// if (!currentPullRequest) {
			// 	dispatch(
			// 		setProviderError(providerId, pullRequestId, {
			// 			message: "currentPullRequest not found"
			// 		})
			// 	);
			// 	return;
			// }
			// ({ providerId, id: pullRequestId } = currentPullRequest);
			// params = params || {};
			// if (!params.pullRequestId) params.pullRequestId = pullRequestId;
			// if (currentPullRequest.metadata) {
			// 	params = { ...params, ...currentPullRequest.metadata };
			// 	params.metadata = currentPullRequest.metadata;
			// }

			const response = await codeErrorsApi.executeThirdPartyTyped(method, "newrelic*com", params);
			// if (response && (!options || (options && !options.preventClearError))) {
			// 	dispatch(clearProviderError(params.errorGroupGuid, pullRequestId));
			// }

			if (response && response.directives) {
				dispatch(handleDirectives(params.errorGroupGuid, response.directives));
				return {
					handled: true,
					directives: response.directives,
				};
			}
			return response as R;
		} catch (error) {
			let errorString = typeof error === "string" ? error : error.message;
			if (errorString) {
				if (
					options &&
					options.preventErrorReporting &&
					(errorString.indexOf("ENOTFOUND") > -1 ||
						errorString.indexOf("ETIMEDOUT") > -1 ||
						errorString.indexOf("EAI_AGAIN") > -1 ||
						errorString.indexOf("ECONNRESET") > -1 ||
						errorString.indexOf("ENETDOWN") > -1 ||
						errorString.indexOf("socket disconnected before secure") > -1)
				) {
					// ignores calls where the user might be offline
					console.error(error);
					return undefined;
				}

				const target = "failed with message: ";
				const targetLength = target.length;
				const index = errorString.indexOf(target);
				if (index > -1) {
					errorString = errorString.substring(index + targetLength);
					const jsonIndex = errorString.indexOf(`: {\"`);
					// not the first character
					if (jsonIndex > 0) {
						errorString = errorString.substring(0, jsonIndex);
					}
				}
			}
			// dispatch(
			// 	setProviderError(providerId, params.errorGroupGuid, {
			// 		message: errorString
			// 	})
			// );
			logError(error, { providerId, pullRequestId, method, message: errorString });

			return {
				error: errorString,
			};
		}
	};

export type ReplaceSymbolParameters = {
	uri: string;
	symbol: string;
	codeBlock: string;
	namespace?: string;
};

export const replaceSymbol = createAppAsyncThunk(
	"codeErrors/replaceSymbol", // action type
	async ({ uri, symbol, codeBlock, namespace }: ReplaceSymbolParameters) => {
		await codeErrorsIDEApi.editorReplaceSymbol({
			uri,
			symbolName: symbol,
			codeBlock,
			namespace,
		});
	}
);

export type CopySymbolFromIdeRequest = {
	stackLine: CSStackTraceLine;
	repoId?: string;
	ref?: string;
};

export const copySymbolFromIde = createAppAsyncThunk(
	"codeErrors/copySymbolFromIde",
	async ({ stackLine, repoId, ref }: CopySymbolFromIdeRequest, { dispatch }) => {
		if (!stackLine.method || !stackLine.fileRelativePath) {
			return;
		}
		const currentPosition =
			ref && repoId && stackLine.fileRelativePath && stackLine.fileFullPath
				? await codeErrorsApi.resolveStackTracePosition({
						ref,
						repoId,
						fileRelativePath: stackLine.fileRelativePath,
						line: stackLine.line,
						column: stackLine.column,
				  })
				: undefined;
		if (currentPosition?.error) {
			logError(`Unable to copySymbolFromIde: ${currentPosition.error}`);
		}

		const currentPositionPath = currentPosition?.path;

		// console.debug(`===--- EditorCopySymbolType uri: ${path}, ref: ${ref}`);

		const lookupPath =
			currentPositionPath ??
			URI.file(stackLine.fileFullPath ?? stackLine.fileRelativePath).toString();

		// console.debug("===--- copySymbolFromIde lookupPath: ", lookupPath);

		const symbolDetails = await codeErrorsIDEApi.editorCopySymbol({
			uri: lookupPath,
			namespace: stackLine.namespace,
			symbolName: stackLine.method,
			ref,
		});

		if (symbolDetails.success && symbolDetails.range && symbolDetails.text) {
			dispatch(
				setFunctionToEdit({
					codeBlock: symbolDetails.text,
					symbol: stackLine.method,
					uri: lookupPath,
					range: symbolDetails.range,
					namespace: stackLine.namespace,
					language: symbolDetails.language,
				})
			);
		} else {
			dispatch(setFunctionToEditFailed(true));
		}
	}
);

export type JumpToStackLineRequest = {
	lineIndex: number;
	stackLine: CSStackTraceLine;
	repoId?: string;
	ref?: string;
};

export const jumpToStackLine = createAppAsyncThunk(
	"codeErrors/jumpToStackLine",
	async ({ lineIndex, stackLine, repoId, ref }: JumpToStackLineRequest, { dispatch, getState }) => {
		const state = getState();
		dispatch(
			setCurrentCodeErrorData(state.context.currentCodeErrorGuid, {
				...(state.context.currentCodeErrorData || {}),
				lineIndex: lineIndex || 0,
			})
		);

		let currentPosition: ResolveStackTracePositionResponse;

		if (!ref && stackLine.fileFullPath) {
			// skip resolveStackTracePosition since this is a local file
			currentPosition = {
				column: stackLine.column,
				line: stackLine.line,
				path: URI.file(stackLine.fileFullPath).toString(),
			};
		} else {
			if (!stackLine.fileRelativePath) {
				console.error(`Unable to jump to stack trace line: missing fileRelativePath`);
				return;
			}
			if (!repoId) {
				console.error(`Unable to jump to stack trace line: missing repoId`);
				return;
			}
			currentPosition = await codeErrorsApi.resolveStackTracePosition({
				ref,
				repoId,
				fileRelativePath: stackLine.fileRelativePath,
				line: stackLine.line,
				column: stackLine.column,
			});
		}
		if (currentPosition.error) {
			logError(`Unable to jump to stack trace line: ${currentPosition.error}`);
			return;
		}

		const { path } = currentPosition;
		const { line } = ref ? stackLine : currentPosition;
		const range = Range.create(
			Position.create(line! - 1, 0),
			Position.create(line! - 1, 2147483647)
		);

		if (range.start.line === range.end.line && range.start.character === range.end.character) {
			// if we are only a single point -- expand to end of line
			range.end.character = 2147483647;
		}

		if (path) {
			const revealResponse = await codeErrorsIDEApi.editorRevealRange({
				uri: path,
				preserveFocus: true,
				range,
				ref,
			});
			if (revealResponse?.success) {
				highlightRange({
					uri: path,
					range,
					highlight: true,
					ref,
				});
			}
		}
	}
);

export const fetchNewRelicErrorGroup = createAppAsyncThunk(
	"codeErrors/fetchNewRelicErrorGroup",
	async (request: GetNewRelicErrorGroupRequest) => {
		return codeErrorsApi.getNewRelicErrorGroup(request);
	}
);

/**
 *  "resolving" the stack trace here gives us two pieces of info for each line of the stack
 *  the info parsed directly from the stack, and the "resolved" info that is specific to the
 *  file the user has currently in their repo ... this position may be different if the user is
 *  on a particular commit ... the "parsed" stack info is considered permanent, the "resolved"
 *  stack info is considered ephemeral, since it only applies to the current user in the current state
 *  resolved line number that gives the full path and line of the
 * @param errorGroupGuid
 * @param repoId
 * @param sha
 * @param occurrenceId
 * @param stackTrace
 * @returns ResolveStackTraceResponse
 */
export const resolveStackTrace = createAppAsyncThunk(
	"codeErrors/resolveStackTrace",
	async (request: ResolveStackTraceRequest) => {
		return codeErrorsApi.resolveStackTrace(request);
	}
);

{
	/* export const startGrokLoading = (codeError: CSCodeError) => (dispatch, getState) => {
	const state: CodeStreamState = getState();
	const grokPostLength = getNrAiPostLength(state, codeError.streamId, codeError.postId);
	// console.debug(
	// 	`===--- startGrokLoading called, grokPostLength: ${grokPostLength}`
	// );
	dispatch(setGrokLoading(true));
	dispatch(setFunctionToEditFailed(false));
	dispatch(setGrokError(undefined));
	dispatch(setGrokRepliesLength(grokPostLength));
}; */
}

// export const handleGrokChonk = (events: CSGrokStream[]) => dispatch => {
// 	if (events.length === 0) return;
// 	const grokStoreEvents: GrokStreamEvent[] = events.map(e => ({
// 		sequence: e.sequence,
// 		postId: e.extra.postId,
// 		streamId: e.extra.streamId,
// 		content: e?.content?.content,
// 		done: e.extra.done === true,
// 	}));
//
// 	dispatch(appendGrokStreamingResponse(grokStoreEvents));
// };

// TODO async thunk, check demo mode, delegate
export const doGetObservabilityErrors = createAppAsyncThunk(
	"codeErrors/getObservabilityErrors",
	async (request: GetObservabilityErrorsRequest) => {
		return await codeErrorsApi.getObservabilityErrors(request);
	}
);

export const addAndEnhanceCodeError = createAppAsyncThunk(
	"codeErrors/enhance",
	async (codeError: CSCodeError, { dispatch }) => {
		dispatch(addCodeErrors([codeError]));
	}
);
