import {
	ExecuteThirdPartyRequestUntypedType,
	ExecuteThirdPartyTypedRequest,
	ExecuteThirdPartyTypedType,
	FetchAssignableUsersRequestType,
	FetchAssignableUsersResponse,
	FetchThirdPartyPullRequestCommitsResponse,
	FetchThirdPartyPullRequestCommitsType,
	FetchThirdPartyPullRequestRequestType,
	FetchThirdPartyPullRequestResponse,
	GetCommitsFilesRequestType,
	GetCommitsFilesResponse,
	GetMyPullRequestsRequest,
	GetMyPullRequestsResponse,
	QueryThirdPartyRequestType,
} from "@codestream/protocols/agent";
import { PullRequestQuery } from "@codestream/protocols/api";
import { RequestType } from "vscode-languageserver-protocol";

import { PullRequest } from "@codestream/webview/ipc/webview.protocol.common";
import { logError } from "@codestream/webview/logger";
import { setProviderError } from "@codestream/webview/store/codeErrors/thunks";
import { createAppAsyncThunk } from "@codestream/webview/store/helper";
import {
	addMyPullRequests,
	addPullRequestCollaborators,
	addPullRequestCommits,
	addPullRequestConversations,
	addPullRequestFiles,
	clearPullRequestError,
	getPullRequestExactId,
	handleDirectives,
	PullRequestIdPayload,
	updatePullRequestFilter,
} from "@codestream/webview/store/providerPullRequests/slice";
import { HostApi } from "@codestream/webview/webview-api";
import { CodeStreamState } from "..";
import { action } from "../common";
import {
	setCurrentPullRequest,
	setCurrentPullRequestAndBranch,
	setCurrentReview,
} from "../context/actions";
import { getPRLabelForProvider } from "../providers/reducer";
import { ProviderPullRequestActionsTypes } from "./types";

const _getPullRequestConversationsFromProvider = async (
	providerId: string,
	id: string,
	src: string,
) => {
	const response1 = await HostApi.instance.send(FetchThirdPartyPullRequestRequestType, {
		providerId: providerId,
		pullRequestId: id,
		src: src,
		force: true,
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
	} else if (response1?.project?.mergeRequest?.repository?.nameWithOwner) {
		// gitlab requires this to be encoded
		boardId = encodeURIComponent((response1 as any).project.mergeRequest.repository.nameWithOwner);
	}
	if (boardId) {
		response2 = await HostApi.instance.send(FetchAssignableUsersRequestType, {
			providerId: providerId,
			boardId: boardId,
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
								image: _.avatarUrl,
							},
						};
				  })
				: [],
	};
};

export const getPullRequestConversationsFromProvider = createAppAsyncThunk<
	FetchThirdPartyPullRequestResponse | undefined,
	PullRequestIdPayload
>("providerPullRequests/getPullRequestConversationsFromProvider", async (request, { dispatch }) => {
	const { providerId, id } = request;
	try {
		dispatch(clearPullRequestError(request));

		const responses = await _getPullRequestConversationsFromProvider(
			providerId,
			id,
			"getPullRequestConversationsFromProvider",
		);
		dispatch(
			addPullRequestConversations({
				...request,
				conversations: responses.conversations,
			}),
		);
		dispatch(
			addPullRequestCollaborators({
				...request,
				collaborators: responses.collaborators,
			}),
		);

		return responses.conversations;
	} catch (error) {
		logError(`failed to refresh pullRequest: ${error?.message}`, { providerId, id });
	}
	return undefined;
});

export const getPullRequestConversations = createAppAsyncThunk<
	FetchThirdPartyPullRequestResponse | { error: Error } | undefined,
	PullRequestIdPayload
>("providerPullRequests/getPullRequestConversations", async (request, { getState, dispatch }) => {
	const { providerId, id } = request;
	try {
		const state: CodeStreamState = getState();
		const provider = state.providerPullRequests.pullRequests[providerId];
		if (provider) {
			let pr = provider?.[id];
			if (!pr) {
				try {
					const parsed = JSON.parse(id);
					pr = provider[parsed.id];
				} catch (ex) {
					console.log(ex);
				}
			}
			if (pr && pr.conversations) {
				if (isAnHourOld(pr.conversationsLastFetch)) {
					console.warn(
						`stale pullRequest conversations from store providerId=${providerId} id=${id}, re-fetching...`,
					);
				} else {
					console.log(
						`fetched pullRequest conversations from store providerId=${providerId} id=${id}`,
					);
					return pr.conversations;
				}
			}
		}

		const responses = await _getPullRequestConversationsFromProvider(
			providerId,
			id,
			"getPullRequestConversations",
		);
		await dispatch(
			addPullRequestConversations({
				...request,
				conversations: responses.conversations,
			}),
		);
		await dispatch(
			addPullRequestCollaborators({
				...request,
				collaborators: responses.collaborators,
			}),
		);
		return responses.conversations;
	} catch (error) {
		logError(error, { detail: `failed to get pullRequest conversations`, providerId, id });
		return { error };
	}
});

/**
 * This resets the provider's files changed list
 * @param providerId
 * @param id
 */
export const clearPullRequestFiles = (providerId: string, id: string) =>
	action(ProviderPullRequestActionsTypes.ClearPullRequestFiles, {
		providerId,
		id,
	});

interface GetPullRequestFiles {
	providerId: string;
	id: string;
	commits?: string[];
	repoId?: string;
	accessRawDiffs?: boolean;
}

export const getPullRequestFiles = createAppAsyncThunk<
	GetCommitsFilesResponse[] | undefined,
	GetPullRequestFiles
>("providerPullRequests", async (params, { getState, dispatch }) => {
	const { providerId, id, commits = [], repoId, accessRawDiffs } = params;
	try {
		const state = getState();
		const provider = state.providerPullRequests.pullRequests[providerId];
		const commitsIndex = JSON.stringify(commits);
		const exactId = getPullRequestExactId(state);
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

		let response: GetCommitsFilesResponse[] | undefined;

		if (repoId && commits.length > 0) {
			response = await HostApi.instance.send(GetCommitsFilesRequestType, {
				repoId,
				commits,
			});
		} else {
			response = await dispatch(
				api({
					method: "getPullRequestFilesChanged",
					params: {
						pullRequestId: id,
						accessRawDiffs,
					},
				}),
			).unwrap();
		}

		if (!response) {
			return undefined;
		}

		dispatch(
			addPullRequestFiles({
				providerId,
				id,
				commits: commitsIndex,
				pullRequestFiles: response,
				accessRawDiffs,
			}),
		);
		return response;
	} catch (error) {
		logError(error, { detail: `failed to get pullRequest files`, providerId, id });
	}
	return undefined;
});

export const getPullRequestFilesFromProvider = createAppAsyncThunk<
	GetCommitsFilesResponse[] | undefined,
	PullRequestIdPayload
>("providerPullRequests/getPullRequestFilesFromProvider", async (request, { dispatch }) => {
	const { id, providerId } = request;
	try {
		const response = await dispatch(
			api({
				method: "getPullRequestFilesChanged",
				params: {
					pullRequestId: id,
				},
			}),
		).unwrap();
		//  as GetCommitsFilesResponse[];
		// JSON.stringify matches the other use of this call
		dispatch(
			addPullRequestFiles({
				providerId,
				id,
				commits: JSON.stringify([]),
				pullRequestFiles: response,
			}),
		);
		return response;
	} catch (error) {
		logError(error, { detail: `failed to get pullRequest files from provider`, providerId, id });
	}
	return undefined;
});

export interface PRRequest {
	providerId: string;
	queries: PullRequestQuery[];
	openReposOnly: boolean;
	options?: { force?: boolean };
	throwOnError?: boolean;
	test?: boolean;
	index?: number;
}

// TODO fix
// On full build this error is thrown by lsp. On esbuild dev mode it is not, hence this workaround
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function throwIfError(response: any) {
	if (response?.exception?.responseError?.message) {
		throw response.exception.responseError;
	}
}

export const getMyPullRequests = createAppAsyncThunk<
	GetMyPullRequestsResponse[][] | undefined,
	PRRequest
>("providerPullRequests/myPullRequests", async (request: PRRequest, { getState, dispatch }) => {
	const { providerId, queries, openReposOnly, options, index, throwOnError, test } = request;
	try {
		let force = false;
		if (!options || !options.force) {
			const state = getState();
			const provider = state.providerPullRequests.myPullRequests[providerId];
			if (provider) {
				console.log(`fetched myPullRequest data from store providerId=${providerId}`);
				return provider;
			}
			// if the data was wiped... set force to get data from the provider api and
			// bypass our cache
			force = true;
		}
		const apiRequest = new RequestType<
			ExecuteThirdPartyTypedRequest<GetMyPullRequestsRequest>,
			GetMyPullRequestsResponse[][],
			any,
			any
		>("codestream/provider/generic");
		const response = await HostApi.instance.send(apiRequest, {
			method: "getMyPullRequests",
			providerId: providerId,
			params: {
				prQueries: queries,
				isOpen: openReposOnly,
				force: force || (options && options.force),
			},
		});
		throwIfError(response);
		if (index !== undefined) {
			dispatch(updatePullRequestFilter({ providerId, data: response, index }));
		} else if (!test && response != null) {
			dispatch(addMyPullRequests({ providerId, data: response }));
		}

		return response;
	} catch (error) {
		if (throwOnError) {
			throw error;
		}
		// callee is handling, let them handle any logging
		logError(error, { detail: `failed to get my pullRequests`, providerId });
	}
	return undefined;
});

// export const clearPullRequestCommits = (providerId: string, id: string) =>
// 	action(ProviderPullRequestActionsTypes.ClearPullRequestCommits, {
// 		providerId,
// 		id,
// 	});

export const getPullRequestCommitsFromProvider = createAppAsyncThunk<
	FetchThirdPartyPullRequestCommitsResponse[] | undefined,
	PullRequestIdPayload
>("providerPullRequests/getPullRequestCommitsFromProvider", async (request, { dispatch }) => {
	const { id, providerId } = request;
	try {
		const response = await HostApi.instance.send(FetchThirdPartyPullRequestCommitsType, {
			providerId,
			pullRequestId: id,
		});
		dispatch(addPullRequestCommits({ ...request, pullRequestCommits: response }));
		return response;
	} catch (error) {
		logError(error, { detail: `failed to refresh pullRequest commits`, providerId, id });
	}
	return undefined;
});

export interface GetPullRequestCommitsRequest extends PullRequestIdPayload {
	options?: { force: true };
}

export const getPullRequestCommits = createAppAsyncThunk<
	FetchThirdPartyPullRequestCommitsResponse[] | undefined,
	GetPullRequestCommitsRequest
>("providerPullRequests/getPullRequestCommits", async (request, { getState, dispatch }) => {
	const { providerId, options, id } = request;
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
					`fetched pullRequest commits from store providerId=${providerId} id=${exactId}`,
				);
				return pr.commits;
			}
		}
		const response: FetchThirdPartyPullRequestCommitsResponse[] = await HostApi.instance.send(
			FetchThirdPartyPullRequestCommitsType,
			{
				providerId: providerId,
				pullRequestId: id,
			},
		);
		dispatch(
			addPullRequestCommits({
				providerId,
				id,
				pullRequestCommits: response,
			}),
		);
		return response;
	} catch (error) {
		logError(error, { detail: `failed to get pullRequest commits`, providerId, id });
	}
	return undefined;
});

export interface OpenPullRequestByUrlRequest {
	url: string;
	options?: {
		source?: string;
		checkoutBranch?: any;
		providerId?: string;
		groupIndex?: string;
		isVS?: boolean;
	};
}

export interface OpenPullRequestByUrlResponse {
	error: string;
}

export const openPullRequestByUrl = createAppAsyncThunk<
	OpenPullRequestByUrlResponse | undefined,
	OpenPullRequestByUrlRequest
>("providerPullRequests/openPullRequestByUrl", async (request, { dispatch }) => {
	const { options, url } = request;
	const prLabel = getPRLabelForProvider(options?.providerId || "");
	const defaultErrorString = `Enter the URL for a specific ${prLabel.pullrequest}`;
	let handled = false;
	let response;
	let providerInfo;
	try {
		providerInfo = await HostApi.instance.send(QueryThirdPartyRequestType, {
			url: url,
		});
	} catch (error) {}
	try {
		if (providerInfo && providerInfo.providerId) {
			const id = await HostApi.instance.send(ExecuteThirdPartyRequestUntypedType, {
				method: "getPullRequestIdFromUrl",
				providerId: providerInfo.providerId,
				params: { url },
			});
			if (id) {
				dispatch(setCurrentReview(""));
				if (options && options.checkoutBranch) {
					dispatch(setCurrentPullRequestAndBranch(id as string));
				}
				dispatch(
					setCurrentPullRequest(
						providerInfo.providerId,
						id as string,
						"",
						options ? options.source : undefined,
						options?.isVS ? "details" : "sidebar-diffs",
						options?.groupIndex ? options.groupIndex : undefined,
					),
				);
				handled = true;
			}
		}
	} catch (error) {
		logError(error, { detail: `failed to openPullRequestByUrl`, url });
		let errorString = typeof error === "string" ? error : error.message;
		if (errorString) {
			const target = "failed with message: ";
			const targetLength = target.length;
			const index = errorString.indexOf(target);
			if (index > -1) {
				errorString = errorString.substring(index + targetLength);
			}
		}
		return { error: defaultErrorString };
	}
	if (!handled) {
		response = { error: defaultErrorString };
	}
	return response;
});

// export const setProviderError = createAsyncThunk()
// 	(providerId: string, id: string, error?: { message: string }) =>
// 	async (dispatch, getState: () => CodeStreamState) => {
// 		try {
// 			dispatch(_addPullRequestError(providerId, id, error));
// 		} catch (error) {
// 			logError(error, { detail: `failed to setProviderError`, providerId, id });
// 		}
// 	};

// export const clearProviderError =
// 	(providerId: string, id: string, error?: { message: string }) =>
// 	async (dispatch, getState: () => CodeStreamState) => {
// 		try {
// 			dispatch(_addPullRequestError(providerId, id, error));
// 		} catch (error) {
// 			logError(error, { detail: `failed to setProviderError`, providerId, id });
// 		}
// 	};

export type MethodType =
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
	| "markFileAsViewed"
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
	| "updateReviewComment";

interface ApiRequest {
	method: MethodType;
	params: any;
	options?: {
		updateOnSuccess?: boolean;
		preventClearError: boolean;
		preventErrorReporting?: boolean;
	};
}

/**
 * Provider api
 *
 * @param method the method in the agent
 * @param params the data to send to the provider
 * @param options optional options
 */
export const api = createAppAsyncThunk<any, ApiRequest>(
	"providerPullRequests/api",
	async (request, { getState, dispatch }) => {
		const { method, options } = request;
		let params = request.params;
		let providerId;
		let pullRequestId;
		try {
			const state = getState();
			const currentPullRequest: PullRequest | undefined = state.context.currentPullRequest;
			if (!currentPullRequest) {
				dispatch(
					setProviderError(providerId, pullRequestId, {
						message: "currentPullRequest not found",
					}),
				);
				return undefined;
			}
			({ providerId, id: pullRequestId } = currentPullRequest);
			params = params || {};
			if (!params.pullRequestId) params.pullRequestId = pullRequestId;
			if (currentPullRequest.metadata) {
				params = { ...params, ...currentPullRequest.metadata };
				params.metadata = currentPullRequest.metadata;
			}

			// TODO restore generics
			const response = (await HostApi.instance.send(new ExecuteThirdPartyTypedType(), {
				method: method,
				providerId: providerId,
				params: params,
			})) as any;
			if (response && (!options || (options && !options.preventClearError))) {
				dispatch(clearPullRequestError({ providerId, id: pullRequestId }));
			}

			if (response && response.directives) {
				dispatch(
					handleDirectives({
						providerId,
						id: pullRequestId,
						data: response.directives,
					}),
				);
				return {
					handled: true,
				};
			}
			return response; // TODO restore generics as R;
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
					message: errorString,
				}),
			);
			logError(error, { providerId, pullRequestId, method, message: errorString });

			HostApi.instance.track("PR Error", {
				Host: providerId,
				Operation: method,
				Error: errorString,
				IsOAuthError: errorString && errorString.indexOf("OAuth App access restrictions") > -1,
			});
			return undefined;
		}
	},
);

const isAnHourOld = conversationsLastFetch => {
	return conversationsLastFetch > 0 && Date.now() - conversationsLastFetch > 60 * 60 * 1000;
};
