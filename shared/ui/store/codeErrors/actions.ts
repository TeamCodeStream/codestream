import { CSCodeError, CSStackTraceInfo, CSStackTraceLine } from "@codestream/protocols/api";
import { action } from "../common";
import { CodeErrorsActionsTypes } from "./types";
import { HostApi } from "@codestream/webview/webview-api";
import {
	UpdateCodeErrorRequestType,
	DeleteCodeErrorRequestType,
	CreateShareableCodeErrorRequestType,
	GetCodeErrorRequestType,
	FetchCodeErrorsRequestType,
	ClaimCodeErrorRequestType,
	ResolveStackTraceRequestType,
	ResolveStackTracePositionRequestType,
	UpdateCodeErrorResponse,
	GetNewRelicErrorGroupRequestType,
	GetNewRelicErrorGroupRequest,
	ExecuteThirdPartyTypedType,
	GetNewRelicErrorGroupResponse,
	DidResolveStackTraceLineNotification
} from "@codestream/protocols/agent";
import { logError } from "@codestream/webview/logger";
import { addStreams } from "../streams/actions";
import { CodeStreamState } from "..";
import { mapFilter } from "@codestream/webview/utils";
import { addPosts } from "../posts/actions";
import { createPost, createPostAndCodeError, openPanel } from "@codestream/webview/Stream/actions";
import { getTeamMembers } from "../users/reducer";
import { phraseList } from "@codestream/webview/utilities/strings";
import { Position, Range } from "vscode-languageserver-types";
import { highlightRange } from "../../Stream/api-functions";
import { EditorRevealRangeRequestType, WebviewPanels } from "@codestream/protocols/webview";
import { setCurrentCodeError } from "../context/actions";
import { getCodeError } from "./reducer";
import { confirmPopup } from "@codestream/webview/Stream/Confirm";

export const reset = () => action("RESET");

export const _bootstrapCodeErrors = (codeErrors: CSCodeError[]) =>
	action(CodeErrorsActionsTypes.Bootstrap, codeErrors);

export const bootstrapCodeErrors = () => async dispatch => {
	const { codeErrors } = await HostApi.instance.send(FetchCodeErrorsRequestType, {});
	dispatch(_bootstrapCodeErrors(codeErrors));
};

export const addCodeErrors = (codeErrors: CSCodeError[]) =>
	action(CodeErrorsActionsTypes.AddCodeErrors, codeErrors);

export const removeCodeError = (id: string) => action(CodeErrorsActionsTypes.Delete, id);

export const saveCodeErrors = (codeErrors: CSCodeError[]) =>
	action(CodeErrorsActionsTypes.SaveCodeErrors, codeErrors);

export const _updateCodeErrors = (codeErrors: CSCodeError[]) =>
	action(CodeErrorsActionsTypes.UpdateCodeErrors, codeErrors);

export const updateCodeErrors = (codeErrors: CSCodeError[]) => async (
	dispatch,
	getState: () => CodeStreamState
) => {
	const state = getState();
	codeErrors = codeErrors.map(_ => ({
		..._,
		stackTraces: state.codeErrors.codeErrors[_.id].stackTraces
	}));
	dispatch(_updateCodeErrors(codeErrors));
};
export const resolveStackTraceLine = (notification: DidResolveStackTraceLineNotification) => async (
	dispatch,
	getState: () => CodeStreamState
) => {
	const { codeErrorId, occurrenceId, index, resolvedLine } = notification;

	const state = getState();
	const codeError = state.codeErrors?.codeErrors[codeErrorId];
	let stackTraceIndex = codeError.stackTraces.findIndex(_ => _.occurrenceId === occurrenceId);

	// FIXME occurrenceId mapping is not reliable, so assume it's the only one that exists
	if (stackTraceIndex < 0 && codeError.stackTraces.length === 1) stackTraceIndex = 0;

	const stackTrace = codeError.stackTraces[stackTraceIndex];
	const updatedLines = [...stackTrace.lines];
	updatedLines[index] = {
		...updatedLines[index],
		...resolvedLine
	};
	const updatedStackTrace = {
		...stackTrace,
		lines: updatedLines
	};
	const updatedStackTraces = [...codeError.stackTraces];
	updatedStackTraces[stackTraceIndex] = updatedStackTrace;
	const updatedCodeError = {
		...codeError,
		stackTraces: updatedStackTraces
	};
	dispatch(_updateCodeErrors([updatedCodeError]));
};

export interface NewCodeErrorAttributes {
	accountId?: number;
	objectId?: string;
	objectType?: "errorGroup";
	objectInfo?: any;
	title: string;
	text?: string;
	stackTraces: CSStackTraceInfo[];
	assignees?: string[];
	addedUsers?: string[];
	entryPoint?: string;
	replyPost?: {
		text: string;
		mentionedUserIds?: string[];
	};
	providerUrl?: string;
}

export interface CreateCodeErrorError {
	reason: "share" | "create";
	message?: string;
}

export const createCodeError = (attributes: NewCodeErrorAttributes) => async (
	dispatch,
	getState: () => CodeStreamState
) => {
	try {
		const response = await HostApi.instance.send(CreateShareableCodeErrorRequestType, {
			attributes,
			entryPoint: attributes.entryPoint,
			addedUsers: attributes.addedUsers,
			replyPost: attributes.replyPost
		});
		if (response) {
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

export const _deleteCodeError = (id: string) => action(CodeErrorsActionsTypes.Delete, id);

export const deleteCodeError = (id: string) => async dispatch => {
	try {
		await HostApi.instance.send(DeleteCodeErrorRequestType, {
			id
		});
		dispatch(_deleteCodeError(id));
	} catch (error) {
		logError(`failed to delete code error: ${error}`, { id });
	}
};

/**
 * "Advanced" properties that can come from the client (webview)
 */
interface AdvancedEditableCodeErrorAttributes {
	// array of userIds / tags to add
	$push: { assignees?: string[]; tags?: string[] };
	// array of userIds / tags to remove
	$pull: { assignees?: string[]; tags?: string[] };
}

export type EditableAttributes = Partial<
	Pick<CSCodeError, "title" | "assignees"> & AdvancedEditableCodeErrorAttributes
>;

export const fetchCodeError = (codeErrorId: string) => async dispatch => {
	const response = await HostApi.instance.send(GetCodeErrorRequestType, { codeErrorId });

	if (response.codeError) return dispatch(saveCodeErrors([response.codeError]));
};

/**
 *  "resolving" the stack trace here gives us two pieces of info for each line of the stack
 *	the info parsed directly from the stack, and the "resolved" info that is specific to the
 *	file the user has currently in their repo ... this position may be different if the user is
 *	on a particular commit ... the "parsed" stack info is considered permanent, the "resolved"
 *	stack info is considered ephemeral, since it only applies to the current user in the current state
 *	resolved line number that gives the full path and line of the
 * @param errorGroupGuid
 * @param repoId
 * @param sha
 * @param occurrenceId
 * @param stackTrace
 * @returns ResolveStackTraceResponse
 */
export const resolveStackTrace = (
	errorGroupGuid: string,
	repoId: string,
	ref: string,
	occurrenceId: string,
	stackTrace: string[],
	codeErrorId: string
) => {
	return HostApi.instance.send(ResolveStackTraceRequestType, {
		errorGroupGuid,
		stackTrace,
		repoId,
		ref,
		occurrenceId,
		codeErrorId
	});
};

export const jumpToStackLine = (
	lineIndex: number,
	stackLine: CSStackTraceLine,
	ref: string,
	repoId: string
) => async (dispatch, getState: () => CodeStreamState) => {
	const state = getState();
	dispatch(
		setCurrentCodeError(state.context.currentCodeErrorId, {
			...(state.context.currentCodeErrorData || {}),
			lineIndex: lineIndex || 0
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
		column: stackLine.column!
	});
	if (currentPosition.error) {
		logError(`Unable to jump to stack trace line: ${currentPosition.error}`);
		return;
	}

	const { path } = currentPosition;
	const { line } = ref ? stackLine : currentPosition;
	const range = Range.create(Position.create(line! - 1, 0), Position.create(line! - 1, 2147483647));

	if (range.start.line === range.end.line && range.start.character === range.end.character) {
		// if we are only a single point -- expand to end of line
		range.end.character = 2147483647;
	}

	const revealResponse = await HostApi.instance.send(EditorRevealRangeRequestType, {
		uri: path!,
		preserveFocus: true,
		range,
		ref
	});
	if (revealResponse?.success) {
		highlightRange({
			uri: path!,
			range,
			highlight: true,
			ref
		});
	}
};

export const claimCodeError = async request => {
	return await HostApi.instance.send(ClaimCodeErrorRequestType, request);
};

export const updateCodeError = request => async dispatch => {
	const response = await HostApi.instance.send(UpdateCodeErrorRequestType, request);
	if (response?.codeError) {
		dispatch(updateCodeErrors([response.codeError]));
	}
};

export const fetchNewRelicErrorGroup = (
	request: GetNewRelicErrorGroupRequest
) => async dispatch => {
	return HostApi.instance.send(GetNewRelicErrorGroupRequestType, request);
};

export const handleDirectives = (id: string, data: any) =>
	action(CodeErrorsActionsTypes.HandleDirectives, {
		id,
		data
	});

export const _addProviderError = (
	providerId: string,
	errorGroupGuid: string,
	error?: { message: string }
) =>
	action(CodeErrorsActionsTypes.AddProviderError, {
		providerId: providerId,
		id: errorGroupGuid,
		error
	});

export const _clearProviderError = (providerId: string, errorGroupGuid: string) =>
	action(CodeErrorsActionsTypes.ClearProviderError, {
		providerId: providerId,
		id: errorGroupGuid,
		undefined
	});

export const _setErrorGroup = (errorGroupGuid: string, data: any) =>
	action(CodeErrorsActionsTypes.SetErrorGroup, {
		providerId: "newrelic*com",
		id: errorGroupGuid,
		data
	});

export const _isLoadingErrorGroup = (errorGroupGuid: string, data: any) =>
	action(CodeErrorsActionsTypes.IsLoadingErrorGroup, {
		providerId: "newrelic*com",
		id: errorGroupGuid,
		data
	});

export const setProviderError = (
	providerId: string,
	errorGroupGuid: string,
	error?: { message: string }
) => async (dispatch, getState: () => CodeStreamState) => {
	try {
		dispatch(_addProviderError(providerId, errorGroupGuid, error));
	} catch (error) {
		logError(`failed to setProviderError: ${error}`, { providerId, errorGroupGuid });
	}
};

export const clearProviderError = (
	providerId: string,
	id: string,
	error?: { message: string }
) => async (dispatch, getState: () => CodeStreamState) => {
	try {
		dispatch(_clearProviderError(providerId, id));
	} catch (error) {
		logError(`failed to setProviderError: ${error}`, { providerId, id });
	}
};

export const fetchErrorGroup = (
	codeError: CSCodeError,
	occurrenceId?: string,
	entityGuid?: string
) => async (dispatch, getState: () => CodeStreamState) => {
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
				entityGuid: entityGuid
			})
		).then((result: GetNewRelicErrorGroupResponse) => {
			dispatch(_isLoadingErrorGroup(objectId, { isLoading: true }));
			return dispatch(_setErrorGroup(codeError.objectId!, result.errorGroup));
		});
	} catch (error) {
		logError(`failed to fetchErrorGroup: ${error}`, { objectId });
	}
};

/**
 * Try to find a codeError by its objectId
 *
 * @param objectId
 * @param occurrenceId
 * @returns
 */
export const findErrorGroupByObjectId = (objectId: string, occurrenceId?: string) => async (
	dispatch,
	getState: () => CodeStreamState
) => {
	try {
		const locator = (state: CodeStreamState, oid: string, tid?: string) => {
			const codeError = Object.values(state.codeErrors.codeErrors).find(
				(_: CSCodeError) =>
					_.objectId === oid /*&& (tid ? _.stackTraces.find(st => st.occurrenceId === tid) : true)*/
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
		logError(`failed to findErrorGroupByObjectId: ${error}`, { objectId, occurrenceId });
	}
	return undefined;
};

export const setErrorGroup = (errorGroupGuid: string, data?: any) => async (
	dispatch,
	getState: () => CodeStreamState
) => {
	try {
		dispatch(_setErrorGroup(errorGroupGuid, data));
	} catch (error) {
		logError(`failed to _setErrorGroup: ${error}`, { errorGroupGuid });
	}
};

export const openErrorGroup = (
	errorGroupGuid: string,
	occurrenceId?: string,
	data: any = {}
) => async (dispatch, getState: () => CodeStreamState) => {
	const response = await claimCodeError({
		objectId: errorGroupGuid,
		objectType: "errorGroup"
	});
	console.warn("COLIN: CLAIM RESPONSE:", response);

	if (response.unauthorized) {
		let message;
		if (response.unauthorizedAccount) {
			message = "You do not have access to this New Relic account.";
		} else if (response.unauthorizedErrorGroup) {
			message = "You do not have access to this error group.";
		} else {
			const orgDesc = response.ownedBy
				? `the ${response.ownedBy} organization`
				: "another organization";
			message = `This error can't be displayed because it's owned by ${orgDesc} on CodeStream.`;
		}
		HostApi.instance.track("Error Roadblocked", {
			"Error Group ID": errorGroupGuid,
			"NR Account ID": response.accountId
		});
		confirmPopup({
			title: "Error Can't Be Opened",
			message,
			centered: true,
			buttons: [
				{
					label: "OK",
					className: "control-button"
				}
			]
		});
		logError(`Error Can't Be Opened`, { message, errorGroupGuid, occurrenceId, data });
		return;
	} else if (response.codeError) {
		await dispatch(addCodeErrors([response.codeError]));
	}

	dispatch(findErrorGroupByObjectId(errorGroupGuid, occurrenceId)).then(codeError => {
		// if we found an existing codeError, it exists in the data store
		const pendingId = codeError ? codeError.id : PENDING_CODE_ERROR_ID_FORMAT(errorGroupGuid);

		// this signals that when the user provides an API key (which they don't have yet),
		// we will circle back to this action to try to claim the code error again
		if (response.needNRToken) {
			data.claimWhenConnected = true;
		}

		// NOTE don't really like this "PENDING" business, but it's something to say we need to CREATE a codeError
		// rationalie is: instead of creating _another_ codeError router-like UI,
		// just re-use the CodeErrorNav component which already does some work for
		// directing / opening a codeError
		dispatch(setCurrentCodeError(pendingId, data));

		dispatch(openPanel(WebviewPanels.CodemarksForFile));
	});
};

export const PENDING_CODE_ERROR_ID_PREFIX = "PENDING";
export const PENDING_CODE_ERROR_ID_FORMAT = id => `${PENDING_CODE_ERROR_ID_PREFIX}-${id}`;

/**
 * codeErrors (CodeStream's representation of a NewRelic error group error) can be ephemeral
 * and by default, they are not persisted to the data store. before certain actions happen from the user
 * we will create a concrete version of the codeError, then run the operation requiring it.
 *
 * a pending codeError has an ide that begins with PENDING, and fully looks like `PENDING-${errorGroupGuid}`.
 *
 * @param {string} codeErrorId
 */
export const upgradePendingCodeError = (
	codeErrorId: string,
	source: "Comment" | "Status Change" | "Assignee Change"
) => async (dispatch, getState: () => CodeStreamState) => {
	console.log("upgradePendingCodeError", { codeErrorId: codeErrorId });
	try {
		const state = getState();
		let existingCodeError = getCodeError(state.codeErrors, codeErrorId) as CSCodeError;
		if (codeErrorId?.indexOf(PENDING_CODE_ERROR_ID_PREFIX) === 0) {
			const {
				accountId,
				objectId,
				objectType,
				title,
				text,
				stackTraces,
				objectInfo
			} = existingCodeError;
			const newCodeError: NewCodeErrorAttributes = {
				accountId,
				objectId,
				objectType,
				title,
				text,
				stackTraces,
				objectInfo
			};
			const response = (await dispatch(createPostAndCodeError(newCodeError))) as any;
			HostApi.instance.track("Error Created", {
				"Error Group ID": "",
				"NR Account ID": newCodeError.accountId,
				Trigger: source
			});

			// remove the pending codeError
			dispatch(removeCodeError(codeErrorId!));

			dispatch(
				setCurrentCodeError(response.codeError.id, {
					// need to reset this back to undefined now that we aren't
					// pending any longer
					pendingErrorGroupGuid: undefined,
					// if there's already a selected line, retain it
					lineIndex: state.context.currentCodeErrorData?.lineIndex || 0
				})
			);
			return {
				codeError: response.codeError as CSCodeError,
				wasPending: true
			};
		} else {
			return {
				codeError: existingCodeError as CSCodeError
			};
		}
	} catch (ex) {
		logError(ex, {
			codeErrorId: codeErrorId
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
export const api = <T = any, R = any>(
	method: "assignRepository" | "removeAssignee" | "setAssignee" | "setState",

	params: { errorGroupGuid: string } | any,
	options?: {
		updateOnSuccess?: boolean;
		preventClearError: boolean;
		preventErrorReporting?: boolean;
	}
) => async (dispatch, getState: () => CodeStreamState) => {
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
			params: params
		})) as any;
		// if (response && (!options || (options && !options.preventClearError))) {
		// 	dispatch(clearProviderError(params.errorGroupGuid, pullRequestId));
		// }

		if (response && response.directives) {
			dispatch(handleDirectives(params.errorGroupGuid, response.directives));
			return {
				handled: true,
				directives: response.directives
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

		HostApi.instance.track("ErrorGroup Error", {
			Host: providerId,
			Operation: method,
			Error: errorString,
			IsOAuthError: errorString && errorString.indexOf("OAuth App access restrictions") > -1
		});
		return {
			error: errorString
		};
	}
};
