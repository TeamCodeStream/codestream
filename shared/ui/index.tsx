import "@formatjs/intl-listformat/polyfill-locales";
import React from "react";
import { render } from "react-dom";
import Container from "./Container";
import {
	EditorRevealRangeRequestType,
	HostDidChangeActiveEditorNotificationType,
	HostDidChangeConfigNotificationType,
	HostDidChangeFocusNotificationType,
	HostDidChangeEditorSelectionNotificationType,
	HostDidChangeEditorVisibleRangesNotificationType,
	HostDidLogoutNotificationType,
	HostDidReceiveRequestNotificationType,
	Route,
	RouteControllerType,
	RouteActionType,
	ShowCodemarkNotificationType,
	ShowReviewNotificationType,
	ShowCodeErrorNotificationType,
	ShowStreamNotificationType,
	WebviewDidInitializeNotificationType,
	WebviewPanels,
	HostDidChangeVisibleEditorsNotificationType,
	ShowPullRequestNotificationType,
	HostDidChangeLayoutNotificationType,
	RouteWithQuery
} from "./ipc/webview.protocol";
import { createCodeStreamStore } from "./store";
import { HostApi } from "./webview-api";
import {
	ApiVersionCompatibility,
	DidChangeApiVersionCompatibilityNotificationType,
	DidChangeConnectionStatusNotificationType,
	DidChangeDataNotificationType,
	DidChangeVersionCompatibilityNotificationType,
	DidChangeServerUrlNotificationType,
	ConnectionStatus,
	ChangeDataType,
	VersionCompatibility,
	ThirdPartyProviders,
	GetDocumentFromMarkerRequestType,
	DidEncounterMaintenanceModeNotificationType,
	VerifyConnectivityRequestType,
	ExecuteThirdPartyRequestUntypedType,
	GetReposScmRequestType,
	DidChangeProcessBufferNotificationType,
	NormalizeUrlRequestType,
	GetNewRelicErrorGroupRequestType,
	PixieDynamicLoggingResultNotification,
	DidResolveStackTraceLineNotificationType,
	TelemetrySetAnonymousIdRequestType
} from "@codestream/protocols/agent";
import { CSApiCapabilities, CodemarkType, CSCodeError, CSMe } from "@codestream/protocols/api";
import translations from "./translations/en";
// import translationsEs from "./translations/es";
import { apiUpgradeRecommended, apiUpgradeRequired } from "./store/apiVersioning/actions";
import { getCodemark } from "./store/codemarks/reducer";
import { getReview } from "./store/reviews/reducer";
import { getCodeError } from "./store/codeErrors/reducer";
import { fetchCodemarks, openPanel } from "./Stream/actions";
import { ContextState } from "./store/context/types";
import { CodemarksState } from "./store/codemarks/types";
import { EditorContextState } from "./store/editorContext/types";
import { configureProvider, updateProviders } from "./store/providers/actions";
import { isConnected } from "./store/providers/reducer";
import { apiCapabilitiesUpdated } from "./store/apiVersioning/actions";
import { bootstrap, reset } from "./store/actions";
import { online, offline, errorOccurred } from "./store/connectivity/actions";
import { upgradeRequired, upgradeRecommended } from "./store/versioning/actions";
import { updatePreferences } from "./store/preferences/actions";
import { updateDocument, removeDocument, resetDocuments } from "./store/documents/actions";
import { updateUnreads } from "./store/unreads/actions";
import { updateConfigs } from "./store/configs/actions";
import { setEditorContext, setEditorLayout } from "./store/editorContext/actions";
import {
	blur,
	focus,
	setCurrentStream,
	setCurrentCodemark,
	setCurrentReview,
	setCurrentCodeError,
	setCurrentPullRequest,
	setStartWorkCard,
	closeAllPanels,
	clearCurrentPullRequest,
	setPendingProtocolHandlerUrl,
	goToNewRelicSignup
} from "./store/context/actions";
import { URI } from "vscode-uri";
import { moveCursorToLine } from "./Stream/api-functions";
import { setMaintenanceMode } from "./store/session/actions";
import { updateModifiedReposDebounced } from "./store/users/actions";
import { logWarning } from "./logger";
import { fetchReview } from "./store/reviews/actions";
import {
	addCodeErrors,
	fetchCodeError,
	claimCodeError,
	findErrorGroupByObjectId,
	openErrorGroup,
	PENDING_CODE_ERROR_ID_FORMAT as toPendingCodeErrorId,
	resolveStackTraceLine
} from "./store/codeErrors/actions";
import { openPullRequestByUrl } from "./store/providerPullRequests/actions";
import { updateCapabilities } from "./store/capabilities/actions";
import { confirmPopup } from "./Stream/Confirm";
import { switchToTeam } from "./store/session/actions";
import { Range } from "vscode-languageserver-types";
import * as path from "path-browserify";
import { appendProcessBuffer } from "./store/editorContext/actions";

export { HostApi };

export function setupCommunication(host: { postMessage: (message: any) => void }) {
	Object.defineProperty(window, "acquireCodestreamHost", {
		value() {
			return host;
		}
	});
}

export async function initialize(selector: string) {
	const store = createCodeStreamStore(undefined, undefined);

	listenForEvents(store);

	const locale = "en";
	const messages: any = translations;
	// try {
	// 	const userLocale = navigator && navigator.language?.split(/-|_/)[0];
	// 	if (userLocale === "es") {
	// 		locale = userLocale;
	// 		messages = translationsEs;
	// 	}
	// } catch(ex) { console.warn(ex);}

	render(
		<Container store={store} i18n={{ locale: locale, messages: messages }} />,
		document.querySelector(selector)
	);

	await store.dispatch(bootstrap() as any);

	HostApi.instance.notify(WebviewDidInitializeNotificationType, {});

	// verify we can connect to the server, if successful, as a side effect,
	// we get the api server's capabilities and our environment
	const resp = await HostApi.instance.send(VerifyConnectivityRequestType, void {});
	if (resp.error) {
		store.dispatch(errorOccurred(resp.error.message, resp.error.details));
	} else {
		if (resp.capabilities) {
			store.dispatch(updateCapabilities(resp.capabilities));
		}
		if (resp.environment) {
			store.dispatch(
				updateConfigs({
					isOnPrem: resp.isOnPrem,
					environment: resp.environment,
					isProductionCloud: resp.isProductionCloud
				})
			);
		}
	}
}

// TODO: type up the store state
function listenForEvents(store) {
	const api = HostApi.instance;

	api.on(DidEncounterMaintenanceModeNotificationType, async e => {
		if (store.getState().session.userId) {
			/*
		 		don't logout here because the extension will do it since the webview isn't guaranteed to be available
				and we don't want to attempt 2 logouts
			*/
			await store.dispatch(reset());
			store.dispatch(setMaintenanceMode(true, e));
		}
	});

	api.on(DidChangeConnectionStatusNotificationType, e => {
		if (e.status === ConnectionStatus.Reconnected) {
			store.dispatch(online());
		} else {
			store.dispatch(offline(e.code));
		}
	});

	api.on(DidChangeVersionCompatibilityNotificationType, async e => {
		if (e.compatibility === VersionCompatibility.CompatibleUpgradeRecommended) {
			store.dispatch(upgradeRecommended());
		} else if (e.compatibility === VersionCompatibility.UnsupportedUpgradeRequired) {
			store.dispatch(upgradeRequired());
		}
	});

	api.on(DidChangeApiVersionCompatibilityNotificationType, e => {
		if (e.compatibility === ApiVersionCompatibility.ApiUpgradeRequired) {
			store.dispatch(apiUpgradeRequired());
		} else if (e.compatibility === ApiVersionCompatibility.ApiUpgradeRecommended) {
			store.dispatch(apiUpgradeRecommended(e.missingCapabilities || {}));
		}
	});

	api.on(DidChangeDataNotificationType, ({ type, data }) => {
		switch (type) {
			case ChangeDataType.Commits:
				store.dispatch(resetDocuments());
				if (data && (data as any).type === "change") {
					// need to be careful as updateModifiedRepos triggers git actions
					updateModifiedReposDebounced(store.dispatch);
				}
				break;
			case ChangeDataType.Documents:
				if ((data as any).reason === "removed") {
					store.dispatch(removeDocument((data as any).document));
				} else {
					store.dispatch(updateDocument((data as any).document));
				}
				if ((data as any).reason === "saved") {
					updateModifiedReposDebounced(store.dispatch);
				}
				break;
			case ChangeDataType.Preferences:
				store.dispatch(updatePreferences(data));
				break;
			case ChangeDataType.Unreads:
				store.dispatch(updateUnreads(data as any)); // TODO: Not sure why we need the any here
				break;
			case ChangeDataType.Providers:
				store.dispatch(updateProviders(data as ThirdPartyProviders));
				break;
			case ChangeDataType.ApiCapabilities:
				store.dispatch(apiCapabilitiesUpdated(data as CSApiCapabilities));
				break;
			default:
				store.dispatch({ type: `ADD_${type.toUpperCase()}`, payload: data });
		}
	});

	api.on(DidChangeServerUrlNotificationType, params => {
		store.dispatch(updateConfigs({ serverUrl: params.serverUrl }));
	});

	api.on(HostDidChangeConfigNotificationType, configs => store.dispatch(updateConfigs(configs)));

	api.on(HostDidChangeActiveEditorNotificationType, async params => {
		let context: EditorContextState;
		if (params.editor) {
			context = {
				activeFile: params.editor.fileName,
				textEditorUri: params.editor.uri,
				textEditorGitSha: params.editor.gitSha,
				textEditorVisibleRanges: params.editor.visibleRanges,
				textEditorLineCount: params.editor.lineCount,
				metrics: params.editor.metrics,

				textEditorSelections: params.editor.selections,
				scmInfo: undefined
				// scmInfo: isNotOnDisk(params.editor.uri)
				// 	? undefined
				// 	: await api.send(GetFileScmInfoRequestType, { uri: params.editor.uri })
			};
		} else {
			context = {
				activeFile: undefined,
				textEditorUri: undefined,
				textEditorGitSha: undefined,
				textEditorSelections: [],
				textEditorVisibleRanges: [],
				scmInfo: undefined
			};
		}
		store.dispatch(setEditorContext(context));
	});

	api.on(HostDidChangeLayoutNotificationType, async params => {
		store.dispatch(setEditorLayout(params));
	});

	api.on(HostDidChangeVisibleEditorsNotificationType, async params => {
		store.dispatch(setEditorContext({ visibleEditorCount: params.count }));
	});

	api.on(DidChangeProcessBufferNotificationType, async params => {
		store.dispatch(appendProcessBuffer({ text: params.text || "" }));
	});

	api.on(HostDidChangeFocusNotificationType, ({ focused }) => {
		if (focused) {
			setTimeout(() => store.dispatch(focus()), 10); // we want the first click to go to the FocusTrap blanket
		} else {
			store.dispatch(blur());
		}
	});

	api.on(HostDidLogoutNotificationType, () => {
		store.dispatch(reset());
	});

	api.on(HostDidChangeEditorSelectionNotificationType, params => {
		store.dispatch(
			setEditorContext({
				textEditorUri: params.uri,
				textEditorGitSha: params.gitSha,
				textEditorVisibleRanges: params.visibleRanges,
				textEditorSelections: params.selections,
				textEditorLineCount: params.lineCount
			})
		);
	});

	api.on(HostDidChangeEditorVisibleRangesNotificationType, params => {
		store.dispatch(
			setEditorContext({
				textEditorUri: params.uri,
				textEditorVisibleRanges: params.visibleRanges,
				textEditorSelections: params.selections,
				textEditorLineCount: params.lineCount
			})
		);
	});

	const onShowStreamNotificationType = async function(streamId, threadId, codemarkId) {
		if (codemarkId) {
			let {
				codemarks
			}: {
				codemarks: CodemarksState;
			} = store.getState();

			if (Object.keys(codemarks).length === 0) {
				await store.dispatch(fetchCodemarks());
				codemarks = store.getState().codemarks;
			}
			const codemark = getCodemark(codemarks, codemarkId);
			if (codemark == null) return;

			store.dispatch(openPanel(WebviewPanels.Codemarks));
			if (codemark.streamId) {
				store.dispatch(setCurrentStream(codemark.streamId, codemark.postId));
			} else if (codemark.markerIds) {
				const response = await HostApi.instance.send(GetDocumentFromMarkerRequestType, {
					markerId: codemark.markerIds[0]
				});
				if (response) {
					HostApi.instance.send(EditorRevealRangeRequestType, {
						uri: response.textDocument.uri,
						range: response.range,
						atTop: true
					});
				}
			}
		} else {
			store.dispatch(openPanel("main"));
			store.dispatch(setCurrentStream(streamId, threadId));
		}
	};
	api.on(ShowStreamNotificationType, async ({ streamId, threadId, codemarkId }) => {
		onShowStreamNotificationType(streamId, threadId, codemarkId);
	});

	api.on(ShowCodemarkNotificationType, async e => {
		let {
			codemarks,
			context,
			editorContext
		}: {
			codemarks: CodemarksState;
			context: ContextState;
			editorContext: EditorContextState;
		} = store.getState();

		if (Object.keys(codemarks).length === 0) {
			await store.dispatch(fetchCodemarks());
			codemarks = store.getState().codemarks;
		}

		const codemark = getCodemark(codemarks, e.codemarkId);
		if (codemark == null) return;

		store.dispatch(setCurrentCodemark(codemark.id));
	});

	api.on(ShowReviewNotificationType, async e => {
		const { reviews } = store.getState();
		const review = getReview(reviews, e.reviewId);
		if (!review) {
			await store.dispatch(fetchReview(e.reviewId));
		}
		store.dispatch(clearCurrentPullRequest());
		store.dispatch(setCurrentReview(e.reviewId, { openFirstDiff: e.openFirstDiff }));
	});

	api.on(ShowCodeErrorNotificationType, async e => {
		const { codeErrors } = store.getState();
		const codeError = getCodeError(codeErrors, e.codeErrorId);
		if (!codeError) {
			await store.dispatch(fetchCodeError(e.codeErrorId));
		}
		store.dispatch(clearCurrentPullRequest());
		store.dispatch(setCurrentCodeError(e.codeErrorId));
	});

	api.on(ShowPullRequestNotificationType, async e => {
		store.dispatch(setCurrentReview());
		if (e.url) {
			store.dispatch(openPullRequestByUrl(e.url, { source: e.source }));
		} else {
			store.dispatch(setCurrentPullRequest(e.providerId, e.id, e.commentId, e.source));
		}
	});

	api.on(HostDidReceiveRequestNotificationType, async e => {
		if (!e) return;
		const route = parseProtocol(e.url);
		if (!route || !route.controller) return;

		switch (route.controller) {
			case "codemark": {
				if (route.action) {
					switch (route.action) {
						case "open": {
							if (route.id) {
								const type = route.query.isLink ? "permalink" : "codemark";
								if (confirmSwitchToTeam(store, route.query, type, route.id)) return;

								let { codemarks } = store.getState();
								if (Object.keys(codemarks).length === 0) {
									await store.dispatch(fetchCodemarks());
									codemarks = store.getState().codemarks;
								}
								const codemark = getCodemark(codemarks, route.id);
								if (codemark && codemark.type === CodemarkType.Link && codemark.markerIds?.length)
									moveCursorToLine(codemark!.markerIds![0]);
								else {
									const markerId =
										route.query && route.query.marker ? route.query.marker : undefined;
									store.dispatch(setCurrentCodemark(route.id, markerId));
								}
							}
							break;
						}
					}
				}
				break;
			}
			case RouteControllerType.Review: {
				if (route.action) {
					switch (route.action) {
						case "open": {
							if (route.id) {
								if (confirmSwitchToTeam(store, route.query, "feedback request", route.id)) return;

								const { reviews } = store.getState();
								const review = getReview(reviews, route.id);
								store.dispatch(closeAllPanels());
								if (!review) {
									await store.dispatch(fetchReview(route.id));
								}
								store.dispatch(setCurrentReview(route.id));
							}
							break;
						}
					}
				}
				break;
			}
			case RouteControllerType.File: {
				const reposResponse = await HostApi.instance.send(GetReposScmRequestType, {
					inEditorOnly: true
				});

				if (reposResponse) {
					HostApi.instance.send(EditorRevealRangeRequestType, {
						uri: path.join(reposResponse.repositories![0].path, "main.js"),
						range: Range.create(0, 0, 0, 0),
						atTop: true
					});
				} else {
					console.warn("no repo found");
				}
				break;
			}
			case RouteControllerType.CodeError: {
				if (route.action) {
					switch (route.action) {
						case "open": {
							if (route.id) {
								let { codeErrors } = store.getState();
								let codeError = getCodeError(codeErrors, route.id);
								if (!codeError) {
									await store.dispatch(fetchCodeError(route.id));
									let { codeErrors } = store.getState(); // i luv redux
									codeError = getCodeError(codeErrors, route.id);
								}
								if (
									confirmSwitchToTeam(store, { ...route.query, codeError }, "code error", route.id)
								) {
									return;
								}

								store.dispatch(closeAllPanels());
								store.dispatch(setCurrentCodeError(route.id));
							}
							break;
						}
					}
				}
				break;
			}
			case RouteControllerType.NewRelic: {
				switch (route.action) {
					case "connect": {
						const definedQuery = route as RouteWithQuery<{
							apiKey: string;
						}>;
						if (!store.getState().session.userId) {
							store.dispatch(goToNewRelicSignup({}));
						} else {
							if (definedQuery.query.apiKey) {
								store.dispatch(
									configureProvider("newrelic*com", { apiKey: definedQuery.query.apiKey }, true)
								);
							} else {
								store.dispatch(openPanel("configure-provider-newrelic-newrelic*com"));
							}
						}
						break;
					}
					case "errorsinbox": {
						store.dispatch(closeAllPanels());

						const definedQuery = route as RouteWithQuery<{
							errorGroupGuid: string;
							traceId?: string;
							occurrenceId?: string;
							src?: string;
							entityId?: string;
							hash?: string;
							commit?: string;
							remote?: string;
							tag?: string;
							ide?: string;
							timestamp?: number;
							multipleRepos?: number;
						}>;

						definedQuery.query.occurrenceId =
							definedQuery.query.occurrenceId || definedQuery.query.traceId;

						// if the user isn't logged in we'll queue this url
						// up for post-login processing
						if (!store.getState().session.userId) {
							store.dispatch(
								setPendingProtocolHandlerUrl({ url: e.url, query: definedQuery.query })
							);
							if (route.query["anonymousId"]) {
								await HostApi.instance.send(TelemetrySetAnonymousIdRequestType, {
									anonymousId: route.query["anonymousId"]
								});
							}
							store.dispatch(goToNewRelicSignup({}));
							break;
						}

						if (definedQuery.query.tag === "$TAG_NAME" || definedQuery.query.tag === "null") {
							definedQuery.query.tag = "";
						}

						if (
							definedQuery.query.commit === "$GIT_COMMIT" ||
							definedQuery.query.commit === "null"
						) {
							definedQuery.query.commit = "";
						}
						const state = store.getState();

						store.dispatch(
							openErrorGroup(definedQuery.query.errorGroupGuid, definedQuery.query.occurrenceId, {
								...definedQuery.query,
								// cache the sessionStart here in case the IDE is restarted
								sessionStart: state.context.sessionStart,
								pendingEntityId: definedQuery.query.entityId,
								pendingErrorGroupGuid: definedQuery.query.errorGroupGuid,
								pendingRequiresConnection: !isConnected(state, {
									id: "newrelic*com"
								}),
								openType: "Open in IDE Flow"
							})
						);
						break;
					}

					case "pixie": {
						const { remote, file, line } = route.query;
						let lineNumber = line ? parseInt(line, 0) : 0;
						if (isNaN(lineNumber)) lineNumber = 0;
						if (!remote || !file) return;

						let normalizedUrlResponse;
						try {
							normalizedUrlResponse = await HostApi.instance.send(NormalizeUrlRequestType, {
								url: remote
							});
						} catch (e) {
							logWarning(`could not normalize remote: ${e.message}`);
							return;
						}
						const { normalizedUrl } = normalizedUrlResponse;

						let reposResponse;
						try {
							reposResponse = await HostApi.instance.send(GetReposScmRequestType, {
								inEditorOnly: true
							});
						} catch (e) {
							logWarning(`could not get repos: ${e.message}`);
							return;
						}

						if (reposResponse) {
							const repo = (reposResponse.repositories || []).find(r => {
								if (r.id) {
									const csRepo = store.getState().repos[r.id];
									return (csRepo.remotes || []).find(rem => {
										logWarning(
											`comparing pixie "${normalizedUrl}" to known repo "${rem.normalizedUrl}"`
										);
										return normalizedUrl === rem.normalizedUrl;
									});
								}
							});
							if (repo) {
								const filePath = path.join(repo.path, file);
								HostApi.instance.send(EditorRevealRangeRequestType, {
									uri: filePath,
									range: Range.create(lineNumber, 0, lineNumber, 9999),
									atTop: true
								});
							} else {
								logWarning(`no matching repo found to pixie remote ${normalizedUrl}`);
							}
						} else {
							logWarning("no git repos found to match pixie remote");
						}
					}
				}
				break;
			}
			case RouteControllerType.PullRequest: {
				switch (route.action) {
					case "open": {
						store.dispatch(closeAllPanels());
						store.dispatch(
							openPullRequestByUrl(route.query.url, { checkoutBranch: route.query.checkoutBranch })
						);
						break;
					}
				}
				break;
			}
			case RouteControllerType.StartWork: {
				switch (route.action) {
					case "open": {
						const { query } = route;
						if (query.providerId === "trello*com") {
							const card = { ...query, providerIcon: "trello" };
							HostApi.instance
								.send(ExecuteThirdPartyRequestUntypedType, {
									method: "selfAssignCard",
									providerId: card.providerId,
									params: { cardId: card.id }
								})
								.then(() => {
									store.dispatch(closeAllPanels());
									store.dispatch(setStartWorkCard(card));
								});
						} else {
							HostApi.instance
								.send(ExecuteThirdPartyRequestUntypedType, {
									method: "getIssueIdFromUrl",
									providerId: route.query.providerId,
									params: { url: route.query.url }
								})
								.then((issue: any) => {
									if (issue) {
										HostApi.instance
											.send(ExecuteThirdPartyRequestUntypedType, {
												method: "setAssigneeOnIssue",
												providerId: route!.query.providerId,
												params: { issueId: issue.id, assigneeId: issue.viewer.id, onOff: true }
											})
											.then(() => {
												store.dispatch(closeAllPanels());
												store.dispatch(
													setStartWorkCard({ ...issue, providerId: route!.query.providerId })
												);
											});
									} else {
										console.error("Unable to find issue from: ", route);
									}
								})
								.catch(e => {
									console.error("Error: Unable to load issue from: ", route);
								});
						}
						break;
					}
				}
				break;
			}
			case "navigate": {
				if (route.action) {
					if (Object.values(WebviewPanels).includes(route.action as any)) {
						store.dispatch(closeAllPanels());
						store.dispatch(openPanel(route.action));
					} else {
						logWarning(`Cannot navigate to route.action=${route.action}`);
					}
				}

				break;
			}
			default: {
				break;
			}
		}
	});

	api.on(PixieDynamicLoggingResultNotification, async e => {
		const keys = e.metaData?.slice(3);
		const results: any[] = [];

		if (e.data) {
			for (const row of e.data) {
				let result = {};
				keys?.forEach(_ => {
					result[_] = row[_];
				});
				results.push(result);
			}
		}

		store.dispatch({
			type: `ADD_DYNAMICLOGGING`,
			payload: { status: e.status, metaData: e.metaData, results: results }
		});
	});

	api.on(DidResolveStackTraceLineNotificationType, async e => {
		store.dispatch(resolveStackTraceLine(e));
	});
}

export const parseQuery = function(queryString: string) {
	var query = {};
	var pairs = (queryString[0] === "?" ? queryString.substr(1) : queryString).split("&");
	for (var i = 0; i < pairs.length; i++) {
		var pair = pairs[i].split("=");
		query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || "");
	}
	return query;
};

export const parseProtocol = function(uriString: string | undefined): Route | undefined {
	if (!uriString) return undefined;

	let uri: URI;
	try {
		const decodedUriString = decodeURIComponent(uriString);
		uri = URI.parse(decodedUriString);
		while (uri.authority.indexOf("codestream") === -1) {
			uri = URI.parse(uri.scheme + ":/" + uri.path);
		}
	} catch (ex) {
		return undefined;
	}
	// removes any empties
	const paths = uri.path.split("/").filter(function(p) {
		return p;
	});

	let controller: RouteControllerType | undefined;
	let action: RouteActionType | undefined;
	let id: string | undefined;
	let parsedQuery;
	if (uri.query) {
		parsedQuery = parseQuery(uri.query) as any;
		if (parsedQuery) {
			controller = parsedQuery.controller;
			action = parsedQuery.action;
			id = parsedQuery.id;
		}
	}

	if (paths.length > 0) {
		if (!controller) {
			controller = paths[0] as RouteControllerType;
		}
		if (!id) {
			id = paths[1];
		}
		if (!action && paths.length > 1) {
			action = paths[2] as RouteActionType;
			if (!action) {
				// some urls don't have an id (like search)
				action = paths[1] as RouteActionType;
			}
		}
	}

	return {
		controller,
		action,
		id,
		query: parsedQuery
	};
};

const confirmSwitchToTeam = function(
	store: any,
	options: { teamId: string; companyName: string; codeError?: CSCodeError },
	type: string,
	itemId: string
): boolean {
	const { context, session, users } = store.getState();
	const currentUser = session.userId ? (users[session.userId] as CSMe) : null;
	const { currentTeamId } = context;
	const { teamId, companyName } = options;

	if (type === "code error") {
		if (
			!options.codeError ||
			!currentUser ||
			!(options.codeError.followerIds || []).includes(currentUser.id)
		) {
			confirmPopup({
				title: "No access",
				message: <span>You don't have access to this {type}.</span>,
				centered: true,
				buttons: [
					{
						label: "OK",
						className: "control-button"
					}
				]
			});
			return true;
		} else {
			return false;
		}
	}
	if (teamId && teamId !== currentTeamId) {
		if (currentUser?.teamIds.includes(teamId)) {
			const switchInfo =
				type === "feedback request"
					? { reviewId: itemId }
					: type === "code error"
					? { codeErrorId: itemId }
					: { codemarkId: itemId };
			confirmPopup({
				title: "Switch organizations?",
				message: (
					<span>
						The {type} you are trying to view was created in{" "}
						{companyName ? (
							<span>
								the <b>{companyName}</b>
							</span>
						) : (
							"another"
						)}{" "}
						organization. You'll need to switch to that organization to view it.
					</span>
				),
				centered: true,
				buttons: [
					{
						label: "Cancel",
						className: "control-button"
					},
					{
						label: "Switch Organizations",
						className: "control-button",
						wait: true,
						action: () => {
							store.dispatch(switchToTeam(teamId, switchInfo));
						}
					}
				]
			});
			return true;
		} else {
			confirmPopup({
				title: "Not a member",
				message: <span>You aren't a member of the organization that owns this {type}.</span>,
				centered: true,
				buttons: [
					{
						label: "OK",
						className: "control-button"
					}
				]
			});
			return true;
		}
	}
	return false;
};
