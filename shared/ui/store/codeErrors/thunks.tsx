import {
	CodeBlock,
	CreateShareableCodeErrorRequestType,
	CSAsyncGrokError,
	CSGrokStream,
	DidResolveStackTraceLineNotification,
	ExecuteThirdPartyTypedType,
	GetNewRelicErrorGroupRequest,
	GetNewRelicErrorGroupRequestType,
	GetNewRelicErrorGroupResponse,
	ResolveStackTracePositionRequestType,
	UpdateCodeErrorRequestType,
} from "@codestream/protocols/agent";
import { CSCodeError, CSStackTraceLine } from "@codestream/protocols/api";
import {
	EditorCopySymbolType,
	EditorReplaceSymbolType,
	EditorRevealRangeRequestType,
} from "@codestream/protocols/webview";
import { logError } from "@codestream/webview/logger";
import { CodeStreamState } from "@codestream/webview/store";
import {
	addCodeErrors,
	bootstrapCodeErrors,
	claimCodeError,
	handleDirectives,
	NewCodeErrorAttributes,
	PENDING_CODE_ERROR_ID_FORMAT,
	PENDING_CODE_ERROR_ID_PREFIX,
	removeCodeError,
	_addProviderError,
	_clearProviderError,
	_isLoadingErrorGroup,
	_setErrorGroup,
	_updateCodeErrors,
	setFunctionToEdit,
	_deleteCodeError,
	setGrokLoading,
	setGrokRepliesLength,
	setGrokError,
	setFunctionToEditFailed,
} from "@codestream/webview/store/codeErrors/actions";
import { getCodeError } from "@codestream/webview/store/codeErrors/reducer";
import { setCurrentCodeError } from "@codestream/webview/store/context/actions";
import { addPosts, appendGrokStreamingResponse } from "@codestream/webview/store/posts/actions";
import { addStreams } from "@codestream/webview/store/streams/actions";
import { createPostAndCodeError, deletePost } from "@codestream/webview/Stream/actions";
import { highlightRange } from "@codestream/webview/Stream/api-functions";
import { confirmPopup } from "@codestream/webview/Stream/Confirm";
import { HostApi } from "@codestream/webview/webview-api";
import { Position, Range } from "vscode-languageserver-types";
import React from "react";
import { getGrokPostLength } from "@codestream/webview/store/posts/reducer";
import { URI } from "vscode-uri";
import { clearResolvedFlag } from "@codestream/utils/api/codeErrorCleanup";
import { GrokStreamEvent } from "@codestream/webview/store/posts/types";

export const updateCodeErrors =
	(codeErrors: CSCodeError[]) => async (dispatch, getState: () => CodeStreamState) => {
		const state = getState();
		codeErrors = codeErrors.map(_ => ({
			..._,
			stackTraces: state.codeErrors.codeErrors[_.id].stackTraces,
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

export const createCodeError =
	(attributes: NewCodeErrorAttributes) => async (dispatch, getState: () => CodeStreamState) => {
		// console.debug("createCodeError", attributes);
		try {
			const response = await HostApi.instance.send(CreateShareableCodeErrorRequestType, {
				attributes,
				entryPoint: attributes.entryPoint,
				addedUsers: attributes.addedUsers,
				replyPost: attributes.replyPost,
				codeBlock: attributes.codeBlock,
				language: attributes.language,
				analyze: attributes.analyze,
				reinitialize: attributes.reinitialize,
				parentPostId: attributes.parentPostId,
			});
			if (response.codeError) {
				dispatch(addCodeErrors([response.codeError]));
				dispatch(addStreams([response.stream]));
				dispatch(addPosts([response.post]));
			}
			return response;
		} catch (error) {
			logError("Error creating a code error", { message: error.toString() });
			throw { reason: "create", message: error.toString() } as CreateCodeErrorError;
		}
	};

export const setProviderError =
	(providerId: string, errorGroupGuid: string, error?: { message: string }) =>
	async (dispatch, getState: () => CodeStreamState) => {
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

export const processCodeErrorsMessage =
	(codeErrors: CSCodeError[]) => async (dispatch, getState: () => CodeStreamState) => {
		const newCodeErrors = codeErrors.filter(_ => !_.deactivated);
		clearResolvedFlag(newCodeErrors);
		const deleteCodeErrors = codeErrors.filter(_ => _.deactivated);
		dispatch(addCodeErrors(newCodeErrors));
		const context = getState().context;
		for (const deleteCodeError of deleteCodeErrors) {
			dispatch(_deleteCodeError(deleteCodeError.id));
			if (context.currentCodeErrorId === deleteCodeError.id) {
				dispatch(setCurrentCodeError());
			}
		}
	};

export const clearProviderError =
	(providerId: string, id: string, error?: { message: string }) =>
	async (dispatch, getState: () => CodeStreamState) => {
		try {
			dispatch(_clearProviderError(providerId, id));
		} catch (error) {
			logError(error, { detail: `failed to setProviderError`, providerId, id });
		}
	};

export const fetchErrorGroup =
	(codeError: CSCodeError, occurrenceId?: string, entityGuid?: string) =>
	async (dispatch, getState: () => CodeStreamState) => {
		let objectId;
		try {
			// this is an errorGroupGuid
			objectId = codeError?.objectId;
			dispatch(_isLoadingErrorGroup(objectId, { isLoading: true }));
			return dispatch(
				fetchNewRelicErrorGroup({
					errorGroupGuid: objectId!,
					// might not have a codeError.stackTraces from discussions
					occurrenceId:
						occurrenceId ||
						(codeError.stackTraces ? codeError.stackTraces[0].occurrenceId! : undefined),
					entityGuid: entityGuid,
				})
			).then((result: GetNewRelicErrorGroupResponse) => {
				dispatch(_isLoadingErrorGroup(objectId, { isLoading: true }));
				return dispatch(_setErrorGroup(codeError.objectId!, result.errorGroup));
			});
		} catch (error) {
			logError(error, { detail: `failed to fetchErrorGroup`, objectId });
		}
	};

/**
 * Try to find a codeError by its objectId
 *
 * @param objectId
 * @param occurrenceId
 * @returns
 */
export const findErrorGroupByObjectId =
	(objectId: string, occurrenceId?: string) =>
	async (dispatch, getState: () => CodeStreamState) => {
		try {
			const locator = (state: CodeStreamState, oid: string, tid?: string) => {
				const codeError = Object.values(state.codeErrors.codeErrors).find(
					(_: CSCodeError) =>
						_.objectId ===
						oid /*&& (tid ? _.stackTraces.find(st => st.occurrenceId === tid) : true)*/
				);
				return codeError;
			};
			const state = getState();
			if (!state.codeErrors.bootstrapped) {
				return dispatch(bootstrapCodeErrors()).then((_: any) => {
					return locator(getState(), objectId, occurrenceId);
				});
			} else {
				return locator(state, objectId, occurrenceId);
			}
		} catch (error) {
			logError(error, {
				detail: `failed to findErrorGroupByObjectId`,
				objectId,
				occurrenceId,
			});
		}
		return undefined;
	};

export const setErrorGroup =
	(errorGroupGuid: string, data?: any) => async (dispatch, getState: () => CodeStreamState) => {
		try {
			dispatch(_setErrorGroup(errorGroupGuid, data));
		} catch (error) {
			logError(error, { detail: `failed to _setErrorGroup`, errorGroupGuid });
		}
	};

export const openErrorGroup =
	(errorGroupGuid: string, occurrenceId?: string, data: any = {}) =>
	async (dispatch, getState: () => CodeStreamState) => {
		dispatch(setFunctionToEdit(undefined));
		const { environment } = getState().configs;
		let message, response;
		if (data.environment && data.environment !== environment) {
			message = "This error group belongs to an account in a different region.";
		} else {
			response = await claimCodeError({
				objectId: errorGroupGuid,
				objectType: "errorGroup",
			});

			if (response.unauthorized) {
				if (response.unauthorizedAccount) {
					message = "You do not have access to this New Relic account.";
				} else if (response.unauthorizedErrorGroup) {
					message = "You do not have access to this error group.";
				} else {
					const orgDesc = response.ownedBy
						? `the ${response.ownedBy} organization`
						: "another organization";
					message = (
						<div>
							<div>
								This error can't be displayed because it's owned by {orgDesc} on CodeStream.
							</div>
							<div style={{ fontSize: "smaller", marginTop: "25px" }} className="subtle">
								{response?.companyId}
							</div>
						</div>
					);
				}
			}
		}

		if (message) {
			HostApi.instance.track("codestream/errors/error_group roadblocked", {
				meta_data: `error_group_id: ${errorGroupGuid}`,
				event_type: "response",
			});
			confirmPopup({
				title: "Error Can't Be Opened",
				message,
				centered: true,
				buttons: [
					{
						label: "OK",
						className: "control-button",
					},
				],
			});
			logError(`Error Can't Be Opened`, { message, errorGroupGuid, occurrenceId, data });
			return;
		} else if (response && response.codeError) {
			await dispatch(addCodeErrors([response.codeError]));
		}

		dispatch(findErrorGroupByObjectId(errorGroupGuid, occurrenceId))
			.then(codeError => {
				// if we found an existing codeError, it exists in the data store
				const pendingId = codeError ? codeError.id : PENDING_CODE_ERROR_ID_FORMAT(errorGroupGuid);

				// this signals that when the user provides an API key (which they don't have yet),
				// we will circle back to this action to try to claim the code error again
				if (response.needNRToken) {
					data.claimWhenConnected = true;
				} else {
					data.pendingRequiresConnection = data.claimWhenConnected = false;
				}

				// NOTE don't really like this "PENDING" business, but it's something to say we need to CREATE a codeError
				// rationalie is: instead of creating _another_ codeError router-like UI,
				// just re-use the CodeErrorNav component which already does some work for
				// directing / opening a codeError
				dispatch(setCurrentCodeError(pendingId, data));
			})
			.catch(ex => {
				logError(`failed to findErrorGroupByObjectId`, {
					ex,
					errorGroupGuid,
					occurrenceId,
					claimResponse: response,
					data,
				});
			});
	};

/**
 * codeErrors (CodeStream's representation of a NewRelic error group error) can be ephemeral
 * and by default, they are not persisted to the data store. before certain actions happen from the user
 * we will create a concrete version of the codeError, then run the operation requiring it.
 *
 * a pending codeError has an ide that begins with PENDING, and fully looks like `PENDING-${errorGroupGuid}`.
 *
 */
export const upgradePendingCodeError =
	(
		codeErrorId: string,
		source: "Comment" | "Status Change" | "Assignee Change",
		codeBlock?: CodeBlock,
		language?: string,
		analyze = false
	) =>
	async (dispatch, getState: () => CodeStreamState) => {
		console.debug("upgradePendingCodeError", { codeErrorId, source, codeBlock, language });
		try {
			const state = getState();
			const existingCodeError = getCodeError(state.codeErrors, codeErrorId);
			if (!existingCodeError) {
				console.warn(`upgradePendingCodeError: no codeError found for ${codeErrorId}`);
				return;
			}
			const isPending = codeErrorId?.indexOf(PENDING_CODE_ERROR_ID_PREFIX) === 0;
			if (isPending || analyze) {
				// console.debug("===--- PENDING_CODE_ERROR_ID_PREFIX ===---")
				const { accountId, objectId, objectType, title, text, stackTraces, objectInfo, postId } =
					existingCodeError;
				const newCodeError: NewCodeErrorAttributes = {
					accountId,
					objectId,
					objectType,
					title,
					text,
					stackTraces,
					objectInfo,
					codeBlock,
					language,
					analyze,
					reinitialize: !isPending && analyze,
					parentPostId: postId,
				};
				const response = await dispatch(createPostAndCodeError(newCodeError));
				if (!response.codeError) {
					if (response.exception) {
						logError(JSON.stringify(response.exception), {
							codeErrorId: codeErrorId,
						});
					} else {
						logError("no codeError returned", {
							codeErrorId: codeErrorId,
						});
					}
					return undefined;
				}

				// remove the pending codeError
				if (isPending) {
					dispatch(removeCodeError(codeErrorId));
				}

				dispatch(
					setCurrentCodeError(response.codeError.id, {
						// need to reset this back to undefined now that we aren't
						// pending any longer
						pendingErrorGroupGuid: undefined,
						// if there's already a selected line, retain it
						lineIndex: state.context.currentCodeErrorData?.lineIndex ?? undefined,
						// same with timestamp
						timestamp: state.context.currentCodeErrorData?.timestamp ?? undefined,
					})
				);
				return {
					codeError: response.codeError as CSCodeError,
					wasPending: isPending,
				};
			} else {
				return {
					codeError: existingCodeError as CSCodeError,
				};
			}
		} catch (ex) {
			logError(ex, {
				codeErrorId: codeErrorId,
			});
		}
		return undefined;
	};

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

			const response = (await HostApi.instance.send(new ExecuteThirdPartyTypedType<T, R>(), {
				method: method,
				providerId: "newrelic*com",
				params: params,
			})) as any;
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

export const replaceSymbol =
	(uri: string, symbol: string, codeBlock: string, namespace?: string) =>
	async (dispatch, getState: () => CodeStreamState) => {
		await HostApi.instance.send(EditorReplaceSymbolType, {
			uri,
			symbolName: symbol,
			codeBlock,
			namespace,
		});
	};

export const copySymbolFromIde =
	(stackLine: CSStackTraceLine, repoId?: string, ref?: string) => async dispatch => {
		if (!stackLine.method || !stackLine.fileRelativePath) {
			return;
		}
		const currentPosition =
			ref && repoId && stackLine.fileRelativePath
				? await HostApi.instance.send(ResolveStackTracePositionRequestType, {
						ref,
						repoId,
						filePath: stackLine.fileRelativePath,
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

		const symbolDetails = await HostApi.instance.send(EditorCopySymbolType, {
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
	};

export const jumpToStackLine =
	(lineIndex: number, stackLine: CSStackTraceLine, repoId: string, ref?: string) =>
	async (dispatch, getState: () => CodeStreamState) => {
		const state = getState();
		dispatch(
			setCurrentCodeError(state.context.currentCodeErrorId, {
				...(state.context.currentCodeErrorData || {}),
				lineIndex: lineIndex || 0,
			})
		);

		if (!stackLine.fileRelativePath) {
			console.error(`Unable to jump to stack trace line: missing fileRelativePath`);
			return;
		}
		const currentPosition = await HostApi.instance.send(ResolveStackTracePositionRequestType, {
			ref,
			repoId,
			filePath: stackLine.fileRelativePath!,
			line: stackLine.line!,
			column: stackLine.column!,
		});
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

		const revealResponse = await HostApi.instance.send(EditorRevealRangeRequestType, {
			uri: path!,
			preserveFocus: true,
			range,
			ref,
		});
		if (revealResponse?.success) {
			highlightRange({
				uri: path!,
				range,
				highlight: true,
				ref,
			});
		}
	};

export const updateCodeError = request => async dispatch => {
	const response = await HostApi.instance.send(UpdateCodeErrorRequestType, request);
	if (response?.codeError) {
		dispatch(updateCodeErrors([response.codeError]));
	}
};

export const fetchNewRelicErrorGroup =
	(request: GetNewRelicErrorGroupRequest) => async dispatch => {
		return HostApi.instance.send(GetNewRelicErrorGroupRequestType, request);
	};

export const startGrokLoading = (codeError: CSCodeError) => async (dispatch, getState) => {
	const state: CodeStreamState = getState();
	const grokPostLength = getGrokPostLength(state, codeError.streamId, codeError.postId);
	// console.debug(
	// 	`===--- startGrokLoading called, grokPostLength: ${grokPostLength}`
	// );
	dispatch(setGrokLoading(true));
	dispatch(setFunctionToEditFailed(false));
	dispatch(setGrokError(undefined));
	dispatch(setGrokRepliesLength(grokPostLength));
};

export const handleGrokError = (grokError: CSAsyncGrokError) => async dispatch => {
	dispatch(setGrokLoading(false));
	dispatch(setGrokError(grokError));
	if (grokError.extra.streamId && grokError.extra.postId) {
		dispatch(deletePost(grokError.extra.streamId, grokError.extra.postId));
	}
};

export const handleGrokChonk = (events: CSGrokStream[]) => async dispatch => {
	if (events.length === 0) return;
	const grokStoreEvents: GrokStreamEvent[] = events.map(e => ({
		sequence: e.sequence,
		postId: e.extra.postId,
		streamId: e.extra.streamId,
		content: e?.content?.content,
		done: e.extra.done === true,
	}));

	dispatch(appendGrokStreamingResponse(grokStoreEvents));
};
