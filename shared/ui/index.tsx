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
	ShowStreamNotificationType,
	WebviewDidInitializeNotificationType,
	WebviewPanels,
	HostDidChangeVisibleEditorsNotificationType,
	ShowPullRequestNotificationType
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
	QueryThirdPartyRequestType
} from "@codestream/protocols/agent";
import { CSApiCapabilities, CodemarkType } from "@codestream/protocols/api";
import translations from "./translations/en";
import { apiUpgradeRecommended, apiUpgradeRequired } from "./store/apiVersioning/actions";
import { getCodemark } from "./store/codemarks/reducer";
import { getReview } from "./store/reviews/reducer";
import { fetchCodemarks, openPanel } from "./Stream/actions";
import { ContextState } from "./store/context/types";
import { CodemarksState } from "./store/codemarks/types";
import { ReviewsState } from "./store/reviews/types";
import { EditorContextState } from "./store/editorContext/types";
import { updateProviders } from "./store/providers/actions";
import { apiCapabilitiesUpdated } from "./store/apiVersioning/actions";
import { bootstrap, reset } from "./store/actions";
import { online, offline, errorOccurred } from "./store/connectivity/actions";
import { upgradeRequired, upgradeRecommended } from "./store/versioning/actions";
import { updatePreferences } from "./store/preferences/actions";
import { updateDocument, removeDocument, resetDocuments } from "./store/documents/actions";
import { updateUnreads } from "./store/unreads/actions";
import { updateConfigs } from "./store/configs/actions";
import { setEditorContext } from "./store/editorContext/actions";
import {
	blur,
	focus,
	setCurrentStream,
	setCurrentCodemark,
	setCurrentReview,
	setCurrentPullRequest,
	setCurrentPullRequestAndBranch,
	setStartWorkCard,
	clearCurrentPullRequest
} from "./store/context/actions";
import { URI } from "vscode-uri";
import { moveCursorToLine } from "./Stream/CodemarkView";
import { setMaintenanceMode } from "./store/session/actions";
import { updateModifiedRepos } from "./store/users/actions";
import { logWarning } from "./logger";
import { fetchReview } from "./store/reviews/actions";
import { openPullRequestByUrl } from "./store/providerPullRequests/actions";

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

	render(
		<Container store={store} i18n={{ locale: "en", messages: translations }} />,
		document.querySelector(selector)
	);

	await store.dispatch(bootstrap() as any);

	HostApi.instance.notify(WebviewDidInitializeNotificationType, {});

	HostApi.instance.send(VerifyConnectivityRequestType, void {}).then(resp => {
		if (resp.error) {
			store.dispatch(errorOccurred(resp.error.message, resp.error.details));
		}
	});
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
			store.dispatch(offline());
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
					store.dispatch(updateModifiedRepos());
				}
				break;
			case ChangeDataType.Documents:
				if ((data as any).reason === "removed") {
					store.dispatch(removeDocument((data as any).document));
				} else {
					store.dispatch(updateDocument((data as any).document));
				}
				if ((data as any).reason === "saved") {
					store.dispatch(updateModifiedRepos());
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
				textEditorSelections: [],
				textEditorVisibleRanges: [],
				scmInfo: undefined
			};
		}
		store.dispatch(setEditorContext(context));
	});

	api.on(HostDidChangeVisibleEditorsNotificationType, async params => {
		store.dispatch(setEditorContext({ visibleEditorCount: params.count }));
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
		store.dispatch(setCurrentReview(e.reviewId));
	});

	api.on(ShowPullRequestNotificationType, async e => {
		store.dispatch(setCurrentPullRequest(e.providerId, e.id));
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
								let { codemarks } = store.getState();
								if (Object.keys(codemarks).length === 0) {
									await store.dispatch(fetchCodemarks());
									codemarks = store.getState().codemarks;
								}
								const codemark = getCodemark(codemarks, route.id);
								if (codemark && codemark.type === CodemarkType.Link)
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
								const { reviews } = store.getState();
								const review = getReview(reviews, route.id);
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
			case RouteControllerType.PullRequest: {
				switch (route.action) {
					case "open": {
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
									store.dispatch(setCurrentReview(""));
									store.dispatch(clearCurrentPullRequest());
									store.dispatch(setStartWorkCard(card));
									store.dispatch(openPanel(WebviewPanels.Sidebar));
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
												providerId: route.query.providerId,
												params: { issueId: issue.id, assigneeId: issue.viewer.id, onOff: true }
											})
											.then(() => {
												store.dispatch(setCurrentReview(""));
												store.dispatch(clearCurrentPullRequest());
												store.dispatch(
													setStartWorkCard({ ...issue, providerId: route.query.providerId })
												);
												store.dispatch(openPanel(WebviewPanels.Sidebar));
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
						store.dispatch(setCurrentReview(""));
						store.dispatch(setCurrentCodemark(""));
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
