import { ActionType } from "../common";
import * as preferencesActions from "../preferences/actions";
// import * as sessionActions from "../session/actions";
import { WebviewPanels } from "@codestream/protocols/api";
import { CodeStreamState } from "..";
import { PreferencesActionsType } from "../preferences/types";
import * as actions from "./actions";
import { ContextActionsType, ContextState, Route } from "./types";

type ContextActions = ActionType<typeof actions>;
type PreferencesActions = ActionType<typeof preferencesActions>;
// type SessionActions = ActionType<typeof sessionActions>;

const initialState: ContextState = {
	chatProviderAccess: "strict",
	newPostEntryPoint: undefined,
	currentTeamId: "",
	currentStreamId: "",
	currentCodemarkId: undefined,
	createPullRequestReviewId: undefined,
	currentOrganizationInvite: undefined,
	currentPullRequest: undefined,
	pullRequestCheckoutBranch: false,
	newPullRequestOptions: undefined,
	isRepositioning: false,
	issueProvider: undefined,
	threadId: undefined,
	currentRepo: undefined,
	onboardStep: 0,

	panelStack: [WebviewPanels.LandingRedirect],

	activeModal: undefined,

	hasFocus: true, // we assume we start with the focus when codestream initializes
	channelFilter: "all",
	channelsMuteAll: false,
	codemarkFileFilter: "all",
	codemarkTypeFilter: "all",
	codemarkTagFilter: "all",
	codemarkBranchFilter: "all",
	codemarkAuthorFilter: "all",
	codemarksFileViewStyle: "inline",
	codemarksShowArchived: false,
	codemarksShowResolved: false,
	codemarksWrapComments: false,
	showFeedbackSmiley: true,
	route: { name: Route.NewUser, params: {} },
	spatialViewShowPRComments: false,
	composeCodemarkActive: undefined,
	errorsInboxOptions: undefined,
	currentInstrumentation: undefined,
	currentPixieDynamicLoggingOptions: undefined,
	wantNewRelicOptions: undefined,
	currentPullRequestNeedsRefresh: { needsRefresh: false, providerId: "", pullRequestId: "" },
};

export function reduceContext(
	state: ContextState = initialState,
	action: ContextActions | PreferencesActions
) {
	switch (action.type) {
		case ContextActionsType.SetContext:
			return { ...state, ...action.payload };
		case ContextActionsType.SetTeamlessContext:
			return { ...state, __teamless__: { ...(state.__teamless__ || {}), ...action.payload } };
		case ContextActionsType.SetCurrentStream: {
			const { streamId, threadId } = action.payload;
			return { ...state, currentStreamId: streamId, threadId };
		}
		case ContextActionsType.SetCurrentCodemark:
			return {
				...state,
				currentCodemarkId: action.payload.codemarkId,
				currentMarkerId: action.payload.markerId,
				isRepositioning: false,
			};
		case ContextActionsType.SetComposeCodemarkActive:
			const { type } = action.payload;
			return {
				...state,
				composeCodemarkActive: type,
			};
		case ContextActionsType.RepositionCodemark:
			return {
				...state,
				currentCodemarkId: action.payload.codemarkId,
				currentMarkerId: action.payload.markerId,
				isRepositioning: action.payload.value,
			};

		case ContextActionsType.OpenPanel:
			return { ...state, panelStack: [action.payload, ...state.panelStack].slice(0, 10) };
		case ContextActionsType.ClosePanel: {
			if (state.panelStack.length === 1) return { ...state, panelStack: [WebviewPanels.Sidebar] };
			const [, ...panelStack] = state.panelStack;
			return { ...state, panelStack };
		}
		case ContextActionsType.OpenModal:
			return { ...state, activeModal: action.payload };
		case ContextActionsType.CloseModal: {
			return { ...state, activeModal: undefined };
		}
		case ContextActionsType.SetFocusState:
			return { ...state, hasFocus: action.payload };
		case ContextActionsType.SetChannelsMuteAll:
			return { ...state, channelsMuteAll: action.payload };
		case ContextActionsType.SetIsFirstPageview:
			return { ...state, isFirstPageview: action.payload };
		case ContextActionsType.SetChannelFilter:
			return { ...state, channelFilter: action.payload };
		case ContextActionsType.SetCodemarkTagFilter:
			return { ...state, codemarkTagFilter: action.payload };
		case ContextActionsType.SetCodemarkBranchFilter:
			return { ...state, codemarkBranchFilter: action.payload };
		case ContextActionsType.SetCodemarkAuthorFilter:
			return { ...state, codemarkAuthorFilter: action.payload };
		case ContextActionsType.SetCodemarkFileFilter:
			return { ...state, codemarkFileFilter: action.payload };
		case ContextActionsType.SetCodemarkTypeFilter:
			return { ...state, codemarkTypeFilter: action.payload };
		case ContextActionsType.SetCodemarksFileViewStyle:
			return { ...state, codemarksFileViewStyle: action.payload };
		case ContextActionsType.SetCodemarksShowArchived:
			return { ...state, codemarksShowArchived: action.payload };
		case ContextActionsType.SetCodemarksShowResolved:
			return { ...state, codemarksShowResolved: action.payload };
		case ContextActionsType.SetCodemarksWrapComments:
			return { ...state, codemarksWrapComments: action.payload };
		case ContextActionsType.SetCurrentReview:
			return { ...state, currentReviewId: action.payload.reviewId };
		case ContextActionsType.SetCurrentReviewOptions:
			return { ...state, currentReviewOptions: action.payload.options };
		case ContextActionsType.SetCurrentCodeError:
			return {
				...state,
				currentCodeErrorId: action.payload.codeErrorId,
				currentCodeErrorData: action.payload.data,
			};
		case ContextActionsType.SetCurrentRepo:
			return {
				...state,
				currentRepo:
					action.payload.id && action.payload.path
						? {
								id: action.payload.id,
								path: action.payload.path,
						  }
						: undefined,
			};
		case ContextActionsType.SetCreatePullRequest:
			return { ...state, createPullRequestReviewId: action.payload.reviewId };
		case ContextActionsType.SetCurrentPullRequest:
			return {
				...state,
				currentPullRequest:
					action.payload.providerId && action.payload.id
						? {
								providerId: action.payload.providerId,
								id: action.payload.id,
								commentId: action.payload.commentId,
								source: action.payload.source,
								view: action.payload.view,
								previousView: state?.currentPullRequest?.view,
								// @ts-ignore
								groupIndex: action.payload?.groupIndex,
						  }
						: undefined,
				pullRequestCheckoutBranch: false,
			};

		case ContextActionsType.SetCurrentOrganizationInvite:
			return {
				...state,
				currentOrganizationInvite: {
					name: action.payload.name,
					id: action.payload.id,
					host: action.payload?.host,
					_type: action.payload?._type,
				},
			};
		case ContextActionsType.SetCurrentPullRequestAndBranch:
			return {
				...state,
				currentPullRequestId: action.payload.prId,
				pullRequestCheckoutBranch: true,
			};
		case ContextActionsType.SetNewPullRequestOptions: {
			return {
				...state,
				newPullRequestOptions: action.payload.options,
			};
		}
		case ContextActionsType.SetCurrentErrorsInboxOptions: {
			return {
				...state,
				errorsInboxOptions: action.payload,
			};
		}
		case ContextActionsType.SetCurrentPullRequestNeedsRefresh: {
			return {
				...state,
				currentPullRequestNeedsRefresh: action.payload,
			};
		}
		case ContextActionsType.SetCurrentInstrumentationOptions: {
			return {
				...state,
				currentInstrumentation: action.payload.options,
			};
		}
		case ContextActionsType.SetCurrentPixieDynamicLoggingOptions: {
			return {
				...state,
				currentPixieDynamicLoggingOptions: action.payload.options,
			};
		}
		case ContextActionsType.SetWantNewRelicOptions: {
			return {
				...state,
				wantNewRelicOptions: action.payload,
			};
		}
		case ContextActionsType.SetStartWorkCard:
			return { ...state, startWorkCard: action.payload.card };
		case ContextActionsType.SetOnboardStep:
			return { ...state, onboardStep: action.payload.step };
		case ContextActionsType.SetProfileUser:
			return { ...state, profileUserId: action.payload };
		case ContextActionsType.SetShowFeedbackSmiley:
			return { ...state, showFeedbackSmiley: action.payload };
		case ContextActionsType.SetIssueProvider:
			return { ...state, issueProvider: action.payload };
		case ContextActionsType.SetRefreshAnomalies:
			return { ...state, anomaliesNeedRefresh: action.payload };
		case ContextActionsType.SetNewPostEntryPoint:
			return { ...state, newPostEntryPoint: action.payload };
		case ContextActionsType.SetNewPostDefaultText:
			return { ...state, newPostDefaultText: action.payload };
		case PreferencesActionsType.Set:
		case PreferencesActionsType.Update: {
			if (action.payload.showChannels) {
				return { ...state, channelFilter: action.payload.showChannels };
			}
			return state;
		}

		case ContextActionsType.SetRoute: {
			return { ...state, route: action.payload };
		}

		// case SessionActionType.Set: {
		// 	// started a real session so next time the starting route should be login
		// 	if (action.payload.userId) {
		// 		return { ...state, route: { name: Route.Login, params: {} } };
		// 	}
		// 	return state;
		// }

		case ContextActionsType.SetPendingProtocolHandlerUrl:
			return {
				...state,
				pendingProtocolHandlerUrl: action.payload.url,
				pendingProtocolHandlerQuery: action.payload.query,
			};

		case ContextActionsType.SetCurrentMethodLevelTelemetry: {
			return {
				...state,
				currentMethodLevelTelemetry: action.payload.data,
			};
		}

		case ContextActionsType.SetCurrentObservabilityAnomaly: {
			return {
				...state,
				currentObservabilityAnomaly: action.payload.anomaly,
				currentObservabilityAnomalyEntityGuid: action.payload.entityGuid,
				currentObservabilityAnomalyEntityName: action.payload?.entityName,
			};
		}

		case "RESET":
			return {
				...initialState,
				route: { name: Route.Login, params: {} },
				chatProviderAccess: state.chatProviderAccess,
				__teamless__: state.__teamless__,
			};
		default:
			return { ...initialState, ...state };
	}
}

export const getTestGroup = (state: CodeStreamState, testName: string): string | undefined => {
	const company = state.companies[state.teams[state.context.currentTeamId].companyId];
	return company && company.testGroups ? company.testGroups[testName] : undefined;
};
