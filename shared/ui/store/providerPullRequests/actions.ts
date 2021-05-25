import { action } from "../common";
import { ProviderPullRequestActionsTypes } from "./types";
import { logError } from "@codestream/webview/logger";
import { HostApi } from "@codestream/webview/webview-api";
import {
	FetchThirdPartyPullRequestRequestType,
	FetchThirdPartyPullRequestResponse,
	ExecuteThirdPartyTypedType,
	ExecuteThirdPartyTypedRequest,
	GetMyPullRequestsRequest,
	GetMyPullRequestsResponse,
	FetchThirdPartyPullRequestCommitsType,
	QueryThirdPartyRequestType,
	ExecuteThirdPartyRequestUntypedType,
	FetchAssignableUsersRequestType,
	FetchAssignableUsersResponse,
	GetCommitsFilesRequestType,
	GetCommitsFilesResponse
} from "@codestream/protocols/agent";
import { CodeStreamState } from "..";
import { RequestType } from "vscode-languageserver-protocol";
import {
	setCurrentPullRequest,
	setCurrentPullRequestAndBranch,
	setCurrentReview
} from "../context/actions";
import { getPullRequestExactId, isAnHourOld } from "./reducer";

export const reset = () => action("RESET");

export const _addPullRequestConversations = (providerId: string, id: string, pullRequest: any) =>
	action(ProviderPullRequestActionsTypes.AddPullRequestConversations, {
		providerId,
		id,
		pullRequest
	});

export const _addPullRequestCollaborators = (providerId: string, id: string, collaborators: any) =>
	action(ProviderPullRequestActionsTypes.AddPullRequestCollaborators, {
		providerId,
		id,
		collaborators
	});

export const updateMyPullRequests = (providerId: string, id: string, pullRequestData: any) => {
	// update pull request action creator
	action(ProviderPullRequestActionsTypes.updateMyPullRequests, {
		providerId,
		id,
		pullRequestData
	})
}

export const _addPullRequestFiles = (
	providerId: string,
	id: string,
	commits: string,
	pullRequestFiles: any,
	accessRawDiffs?: boolean
) =>
	action(ProviderPullRequestActionsTypes.AddPullRequestFiles, {
		providerId,
		id,
		commits,
		pullRequestFiles,
		accessRawDiffs
	});

export const _addPullRequestCommits = (providerId: string, id: string, pullRequestCommits: any) =>
	action(ProviderPullRequestActionsTypes.AddPullRequestCommits, {
		providerId,
		id,
		pullRequestCommits
	});

export const _addMyPullRequests = (providerId: string, data: any) =>
	action(ProviderPullRequestActionsTypes.AddMyPullRequests, {
		providerId,
		data
	});

export const _addPullRequestError = (providerId: string, id: string, error?: { message: string }) =>
	action(ProviderPullRequestActionsTypes.AddPullRequestError, {
		providerId,
		id,
		error
	});

export const clearPullRequestError = (providerId: string, id: string) =>
	action(ProviderPullRequestActionsTypes.ClearPullRequestError, {
		providerId,
		id,
		undefined
	});

export const handleDirectives = (providerId: string, id: string, data: any) =>
	action(ProviderPullRequestActionsTypes.HandleDirectives, {
		providerId,
		id,
		data
	});

const _getPullRequestConversationsFromProvider = async (
	providerId: string,
	id: string,
	src: string
) => {
	const response1 = await HostApi.instance.send(FetchThirdPartyPullRequestRequestType, {
		providerId: providerId,
		pullRequestId: id,
		src: src,
		force: true
	});

	let response2: FetchAssignableUsersResponse | undefined = undefined;
	let boardId;
	if (
		response1 &&
		response1.repository &&
		response1.repository.repoOwner &&
		response1.repository.repoName
	) {
		boardId = `${response1.repository.repoOwner}/${response1.repository.repoName}`;
	} else if (
		response1 &&
		(response1 as any).project &&
		(response1 as any).project.mergeRequest &&
		(response1 as any).project.mergeRequest.repository.nameWithOwner
	) {
		// gitlab requires this to be encoded
		boardId = encodeURIComponent((response1 as any).project.mergeRequest.repository.nameWithOwner);
	}
	if (boardId) {
		response2 = await HostApi.instance.send(FetchAssignableUsersRequestType, {
			providerId: providerId,
			boardId: boardId
		});
	}
	return {
		conversations: response1,
		collaborators:
			response2 && response2.users && response2.users.length
				? response2.users.map(_ => {
						return {
							id: _.id,
							username: _.displayName,
							avatar: {
								image: _.avatarUrl
							}
						};
				  })
				: []
	};
};

export const getPullRequestConversationsFromProvider = (
	providerId: string,
	id: string
) => async dispatch => {
	try {
		dispatch(clearPullRequestError(providerId, id));

		const responses = await _getPullRequestConversationsFromProvider(
			providerId,
			id,
			"getPullRequestConversationsFromProvider"
		);
		dispatch(_addPullRequestConversations(providerId, id, responses.conversations));
		dispatch(_addPullRequestCollaborators(providerId, id, responses.collaborators));

		return responses.conversations as FetchThirdPartyPullRequestResponse;
	} catch (error) {
		logError(`failed to refresh pullRequest: ${error}`, { providerId, id });
	}
	return undefined;
};

export const getPullRequestConversations = (providerId: string, id: string) => async (
	dispatch,
	getState: () => CodeStreamState
) => {
	try {
		const state = getState();
		const provider = state.providerPullRequests.pullRequests[providerId];
		if (provider) {
			const pr = provider[id];
			if (pr && pr.conversations) {
				if (isAnHourOld(pr.conversationsLastFetch)) {
					console.warn(
						`stale pullRequest conversations from store providerId=${providerId} id=${id}, re-fetching...`
					);
				} else {
					console.log(
						`fetched pullRequest conversations from store providerId=${providerId} id=${id}`
					);
					return pr.conversations;
				}
			}
		}

		const responses = await _getPullRequestConversationsFromProvider(
			providerId,
			id,
			"getPullRequestConversations"
		);
		await dispatch(_addPullRequestConversations(providerId, id, responses.conversations));
		await dispatch(_addPullRequestCollaborators(providerId, id, responses.collaborators));
		return responses.conversations;
	} catch (error) {
		logError(`failed to get pullRequest conversations: ${error}`, { providerId, id });
		return { error };
	}
};

/**
 * This resets the provider's files changed list
 * @param providerId
 * @param id
 */
export const clearPullRequestFiles = (providerId: string, id: string) =>
	action(ProviderPullRequestActionsTypes.ClearPullRequestFiles, {
		providerId,
		id
	});

export const getPullRequestFiles = (
	providerId: string,
	id: string,
	commits: string[] = [],
	repoId?: string,
	accessRawDiffs?: boolean
) => async (dispatch, getState: () => CodeStreamState) => {
	try {
		const state = getState();
		const provider = state.providerPullRequests.pullRequests[providerId];
		const commitsIndex = JSON.stringify(commits);
		let exactId = getPullRequestExactId(state);
		if (provider) {
			const pr = provider[exactId];
			if (
				pr &&
				pr.files &&
				pr.files[commitsIndex] &&
				pr.files[commitsIndex].length &&
				(pr.accessRawDiffs || !accessRawDiffs)
			) {
				console.log(`fetched pullRequest files from store providerId=${providerId} id=${exactId}`);
				return pr.files[commitsIndex];
			}
		}

		let response: GetCommitsFilesResponse[];

		if (repoId && commits.length > 0) {
			response = await HostApi.instance.send(GetCommitsFilesRequestType, {
				repoId,
				commits
			});
		} else {
			response = await dispatch(
				api("getPullRequestFilesChanged", {
					pullRequestId: id,
					accessRawDiffs
				})
			);
		}

		dispatch(_addPullRequestFiles(providerId, id, commitsIndex, response, accessRawDiffs));
		return response;
	} catch (error) {
		logError(`failed to get pullRequest files: ${error}`, { providerId, id });
	}
	return undefined;
};

export const getPullRequestFilesFromProvider = (
	providerId: string,
	id: string
) => async dispatch => {
	try {
		const response = await dispatch(
			api("getPullRequestFilesChanged", {
				pullRequestId: id
			})
		);
		// JSON.stringify matches the other use of this call
		dispatch(_addPullRequestFiles(providerId, id, JSON.stringify([]), response, undefined));
		return response;
	} catch (error) {
		logError(`failed to get pullRequest files from provider: ${error}`, { providerId, id });
	}
	return undefined;
};

export const getMyPullRequests = (
	providerId: string,
	queries: string[],
	openReposOnly: boolean,
	options?: { force?: boolean },
	throwOnError?: boolean
) => async (dispatch, getState: () => CodeStreamState) => {
	try {
		let force = false;
		if (!options || !options.force) {
			const state = getState();
			const provider = state.providerPullRequests.myPullRequests[providerId];
			if (provider && provider.data != null) {
				console.log(`fetched myPullRequest data from store providerId=${providerId}`);
				return provider.data;
			}
			// if the data was wiped... set force to get data from the provider api and
			// bypass our cache
			force = true;
		}
		const request = new RequestType<
			ExecuteThirdPartyTypedRequest<GetMyPullRequestsRequest>,
			GetMyPullRequestsResponse,
			any,
			any
		>("codestream/provider/generic");
		const response = await HostApi.instance.send(request, {
			method: "getMyPullRequests",
			providerId: providerId,
			params: {
				queries,
				isOpen: openReposOnly,
				force: force || (options && options.force)
			}
		});

		dispatch(_addMyPullRequests(providerId, response));
		return response;
	} catch (error) {
		if (throwOnError) {
			throw error;
		}
		// callee is handling, let them handle any logging
		logError(`failed to get my pullRequests: ${error}`, { providerId });
	}
	return undefined;
};

export const clearPullRequestCommits = (providerId: string, id: string) =>
	action(ProviderPullRequestActionsTypes.ClearPullRequestCommits, {
		providerId,
		id
	});

export const getPullRequestCommitsFromProvider = (
	providerId: string,
	id: string
) => async dispatch => {
	try {
		const response = await HostApi.instance.send(FetchThirdPartyPullRequestCommitsType, {
			providerId,
			pullRequestId: id
		});
		dispatch(_addPullRequestCommits(providerId, id, response));
		return response;
	} catch (error) {
		logError(`failed to refresh pullRequest commits: ${error}`, { providerId, id });
	}
	return undefined;
};

export const getPullRequestCommits = (
	providerId: string,
	id: string,
	options?: { force: true }
) => async (dispatch, getState: () => CodeStreamState) => {
	try {
		const state = getState();
		const provider = state.providerPullRequests.pullRequests[providerId];
		if (options?.force) {
			console.log(`fetching new pullRequest commits from store providerId=${providerId}`);
		} else if (provider) {
			const exactId = getPullRequestExactId(state);
			const pr = provider[exactId];
			if (pr && pr.commits && pr.commits.length) {
				console.log(
					`fetched pullRequest commits from store providerId=${providerId} id=${exactId}`
				);
				return pr.commits;
			}
		}
		const response = await HostApi.instance.send(FetchThirdPartyPullRequestCommitsType, {
			providerId: providerId,
			pullRequestId: id
		});
		dispatch(_addPullRequestCommits(providerId, id, response));
		return response;
	} catch (error) {
		logError(`failed to get pullRequest commits: ${error}`, { providerId, id });
	}
	return undefined;
};

export const openPullRequestByUrl = (
	url: string,
	options?: {
		source?: string;
		checkoutBranch?: any;
	}
) => async (dispatch, getState: () => CodeStreamState) => {
	let handled = false;
	let response;
	let providerInfo;
	try {
		providerInfo = await HostApi.instance.send(QueryThirdPartyRequestType, {
			url: url
		});
	} catch (error) {}
	try {
		if (providerInfo && providerInfo.providerId) {
			const id = await HostApi.instance.send(ExecuteThirdPartyRequestUntypedType, {
				method: "getPullRequestIdFromUrl",
				providerId: providerInfo.providerId,
				params: { url }
			});
			if (id) {
				dispatch(setCurrentReview(""));
				if (options && options.checkoutBranch)
					dispatch(setCurrentPullRequestAndBranch(id as string));
				dispatch(
					setCurrentPullRequest(
						providerInfo.providerId,
						id as string,
						"",
						options ? options.source : undefined
					)
				);
				handled = true;
			}
		}
	} catch (error) {
		logError(`failed to openPullRequestByUrl: ${error}`, { url });
		let errorString = typeof error === "string" ? error : error.message;
		if (errorString) {
			const target = "failed with message: ";
			const targetLength = target.length;
			const index = errorString.indexOf(target);
			if (index > -1) {
				errorString = errorString.substring(index + targetLength);
			}
		}
		return { error: errorString };
	}
	if (!handled) {
		response = { error: "Unable to view PR" };
	}
	return response;
};

export const setProviderError = (
	providerId: string,
	id: string,
	error?: { message: string }
) => async (dispatch, getState: () => CodeStreamState) => {
	try {
		dispatch(_addPullRequestError(providerId, id, error));
	} catch (error) {
		logError(`failed to setProviderError: ${error}`, { providerId, id });
	}
};

export const clearProviderError = (
	providerId: string,
	id: string,
	error?: { message: string }
) => async (dispatch, getState: () => CodeStreamState) => {
	try {
		dispatch(_addPullRequestError(providerId, id, error));
	} catch (error) {
		logError(`failed to setProviderError: ${error}`, { providerId, id });
	}
};

/**
 * Provider api
 *
 * @param method the method in the agent
 * @param params the data to send to the provider
 * @param options optional options
 */
export const api = <T = any, R = any>(
	method:
		| "addReviewerToPullRequest"
		| "cancelMergeWhenPipelineSucceeds"
		| "createCommentReply"
		| "createPullRequestComment"
		| "createPullRequestCommentAndClose"
		| "createPullRequestCommentAndReopen"
		| "createPullRequestThread"
		| "createPullRequestInlineComment"
		| "createPullRequestInlineReviewComment"
		| "createToDo"
		| "deletePullRequest"
		| "deletePullRequestComment"
		| "deletePullRequestReview"
		| "getIssues"
		| "getLabels"
		| "getMilestones"
		| "getPullRequestFilesChanged"
		| "getPullRequestLastUpdated"
		| "getProjects"
		| "getReviewers"
		| "lockPullRequest"
		| "markPullRequestReadyForReview"
		| "markToDoDone"
		| "mergePullRequest"
		| "remoteBranches"
		| "removeReviewerFromPullRequest"
		| "resolveReviewThread"
		| "setAssigneeOnPullRequest"
		| "setIssueOnPullRequest"
		| "setLabelOnPullRequest"
		| "setReviewersOnPullRequest"
		| "setWorkInProgressOnPullRequest"
		| "submitReview"
		| "toggleReaction"
		| "toggleMilestoneOnPullRequest"
		| "toggleProjectOnPullRequest"
		| "togglePullRequestApproval"
		| "unresolveReviewThread"
		| "updateIssueComment"
		| "unlockPullRequest"
		| "updatePullRequest"
		| "updatePullRequestBody"
		| "updatePullRequestSubscription"
		| "updatePullRequestTitle"
		| "updateReview"
		| "updateReviewComment",
	params: any,
	options?: {
		updateOnSuccess?: boolean;
		preventClearError: boolean;
		preventErrorReporting?: boolean;
	}
) => async (dispatch, getState: () => CodeStreamState) => {
	console.log("in api function");
	let providerId;
	let pullRequestId;
	try {
		const state = getState();
		console.log("current state");
		console.log(state);
		const currentPullRequest = state.context.currentPullRequest;
		if (!currentPullRequest) {
			dispatch(
				setProviderError(providerId, pullRequestId, {
					message: "currentPullRequest not found"
				})
			);
			return;
		}
		({ providerId, id: pullRequestId } = currentPullRequest);
		console.log("at the params line");
		params = params || {};
		if (!params.pullRequestId) params.pullRequestId = pullRequestId;
		if (currentPullRequest.metadata) {
			params = { ...params, ...currentPullRequest.metadata };
			params.metadata = currentPullRequest.metadata;
		}
		console.log("executing 3rd party sending ??");
		console.log(method);
		console.log(providerId);
		console.log(params);

		const response = (await HostApi.instance.send(new ExecuteThirdPartyTypedType<T, R>(), {
			method: method,
			providerId: providerId,
			params: params
		})) as any;
		console.log('check the reesponse here interestting');
		console.log(response);
		if (response && (!options || (options && !options.preventClearError))) {
			dispatch(clearPullRequestError(providerId, pullRequestId));
		}

		if (response && response.directives) {
			dispatch(handleDirectives(providerId, pullRequestId, response.directives));
			return {
				handled: true
			};
		}
		console.log("response:");
		console.log(response);
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
		dispatch(
			setProviderError(providerId, pullRequestId, {
				message: errorString
			})
		);
		logError(error, { providerId, pullRequestId, method, message: errorString });

		HostApi.instance.track("PR Error", {
			Host: providerId,
			Operation: method,
			Error: errorString,
			IsOAuthError: errorString && errorString.indexOf("OAuth App access restrictions") > -1
		});
		return undefined;
	}
};
