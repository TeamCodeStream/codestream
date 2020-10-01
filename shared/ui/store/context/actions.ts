import { RegisterUserRequest } from "@codestream/protocols/agent";
import { logError } from "../../logger";
import { setUserPreference } from "../../Stream/actions";
import { action } from "../common";
import { ContextActionsType, ContextState, PostEntryPoint, Route } from "./types";
import { WebviewPanels, WebviewModals } from "@codestream/protocols/webview";
import { CodemarkType } from "@codestream/protocols/api";

export const reset = () => action("RESET");

export const setContext = (payload: Partial<ContextState>) =>
	action(ContextActionsType.SetContext, payload);

export const _openPanel = (panel: string) => action(ContextActionsType.OpenPanel, panel);
export const openPanel = (panel: string) => (dispatch, getState) => {
	if (getState().context.panelStack[0] !== panel) {
		return dispatch(_openPanel(panel));
	}
};

export const closePanel = () => action(ContextActionsType.ClosePanel);

export const _openModal = (modal: WebviewModals) => action(ContextActionsType.OpenModal, modal);
export const openModal = (modal: WebviewModals) => (dispatch, getState) => {
	if (getState().context.activeModal !== modal) {
		return dispatch(_openModal(modal));
	}
};

export const closeModal = () => {
	return action(ContextActionsType.CloseModal);
};

export const closeAllPanels = () => dispatch => {
	dispatch(closeModal());
	dispatch(openPanel(WebviewPanels.Sidebar));
	dispatch(setCurrentCodemark());
	dispatch(setCurrentReview());
	dispatch(clearCurrentPullRequest());
};

export const focus = () => action(ContextActionsType.SetFocusState, true);

export const blur = () => action(ContextActionsType.SetFocusState, false);

export const _setChannelFilter = (value: string) =>
	action(ContextActionsType.SetChannelFilter, value);

export const setChannelFilter = (value: string) => async dispatch => {
	if (value !== "selecting") {
		// if a filter is selected, only update user preferences
		// the context reducer will update the `channelFilter` on the preferences change
		return await dispatch(setUserPreference(["showChannels"], value));
	}
	return dispatch(_setChannelFilter(value));
};

export const setChannelsMuteAll = (enabled: boolean) =>
	action(ContextActionsType.SetChannelsMuteAll, enabled);

export const setCodemarkTagFilter = (value: string) =>
	action(ContextActionsType.SetCodemarkTagFilter, value);

export const setCodemarkAuthorFilter = (value: string) =>
	action(ContextActionsType.SetCodemarkAuthorFilter, value);

export const setCodemarkBranchFilter = (value: string) =>
	action(ContextActionsType.SetCodemarkBranchFilter, value);

export const setCodemarkFileFilter = (value: string) =>
	action(ContextActionsType.SetCodemarkFileFilter, value);

export const setCodemarkTypeFilter = (value: string) =>
	action(ContextActionsType.SetCodemarkTypeFilter, value);

export const setCodemarksFileViewStyle = (style: "list" | "inline") =>
	action(ContextActionsType.SetCodemarksFileViewStyle, style);

export const setCodemarksShowArchived = (enabled: boolean) =>
	action(ContextActionsType.SetCodemarksShowArchived, enabled);

export const setCodemarksShowResolved = (enabled: boolean) =>
	action(ContextActionsType.SetCodemarksShowResolved, enabled);

export const setCodemarksWrapComments = (enabled: boolean) =>
	action(ContextActionsType.SetCodemarksWrapComments, enabled);

export const setCurrentCodemark = (codemarkId?: string, markerId?: string) =>
	action(ContextActionsType.SetCurrentCodemark, { codemarkId, markerId });

export const setComposeCodemarkActive = (type: CodemarkType | undefined) =>
	action(ContextActionsType.SetComposeCodemarkActive, { type });

export const repositionCodemark = (codemarkId?: string, markerId?: string, value?: boolean) =>
	action(ContextActionsType.RepositionCodemark, { codemarkId, markerId, value });

export const _setCurrentStream = (streamId?: string, threadId?: string) =>
	action(ContextActionsType.SetCurrentStream, { streamId, threadId });

export const setCurrentStream = (streamId?: string, threadId?: string) => (dispatch, getState) => {
	if (streamId === undefined && threadId !== undefined) {
		const error = new Error("setCurrentStream was called with a threadId but no streamId");
		logError(error);
		throw error;
	}
	const { context } = getState();
	const streamChanged = context.currentStreamId !== streamId;
	const threadChanged = context.threadId !== threadId;
	if (streamChanged || threadChanged) {
		return dispatch(_setCurrentStream(streamId, threadId));
	}
};

export const setCurrentReview = (reviewId?: string) =>
	action(ContextActionsType.SetCurrentReview, { reviewId });

export const setCreatePullRequest = (reviewId?: string) =>
	action(ContextActionsType.SetCreatePullRequest, { reviewId });

export const setCurrentPullRequest = (providerId: string, id: string) =>
	action(ContextActionsType.SetCurrentPullRequest, { providerId, id });

export const clearCurrentPullRequest = () =>
	action(ContextActionsType.SetCurrentPullRequest, {
		providerId: "",
		id: ""
	});

export const setStartWorkCard = (card: any) =>
	action(ContextActionsType.SetStartWorkCard, { card });

export const setCurrentPullRequestAndBranch = (prId?: string) =>
	action(ContextActionsType.SetCurrentPullRequestAndBranch, { prId });

export const setProfileUser = (userId?: string) =>
	action(ContextActionsType.SetProfileUser, userId);

export const setShowFeedbackSmiley = (enabled: boolean) =>
	action(ContextActionsType.SetShowFeedbackSmiley, enabled);

export const setIssueProvider = (providerId: string | undefined) =>
	action(ContextActionsType.SetIssueProvider, providerId);

export const setNewPostEntry = (entryPoint: PostEntryPoint) =>
	action(ContextActionsType.SetNewPostEntryPoint, entryPoint);

export const goToNewUserEntry = (params = {}) =>
	action(ContextActionsType.SetRoute, { name: Route.NewUser, params });

export const goToForgotPassword = (params = {}) =>
	action(ContextActionsType.SetRoute, { name: Route.ForgotPassword, params });

export type SupportedSSOProvider = "github" | "gitlab" | "bitbucket" | "okta";

export const goToSSOAuth = (
	provider: SupportedSSOProvider,
	params: { [key: string]: any } = {}
) => {
	params.provider = provider;
	switch (provider) {
		case "github":
		case "gitlab":
		case "bitbucket":
		case "okta":
			return action(ContextActionsType.SetRoute, { name: Route.ProviderAuth, params });
		default:
			throw Error("An invalid auth provider was specified");
	}
};

export const goToSignup = (params = {}) =>
	action(ContextActionsType.SetRoute, { name: Route.Signup, params });

export const goToLogin = (params = {}) =>
	action(ContextActionsType.SetRoute, { name: Route.Login, params });

export const goToJoinTeam = (params = {}) =>
	action(ContextActionsType.SetRoute, { name: Route.JoinTeam, params });

export const goToEmailConfirmation = (params: {
	email: string;
	teamId?: string;
	registrationParams: RegisterUserRequest;
}) => action(ContextActionsType.SetRoute, { name: Route.EmailConfirmation, params });

export const goToTeamCreation = (params = {}) =>
	action(ContextActionsType.SetRoute, { name: Route.TeamCreation, params });

export const goToSetPassword = params =>
	action(ContextActionsType.SetRoute, { name: Route.MustSetPassword, params });

export const goToOktaConfig = params =>
	action(ContextActionsType.SetRoute, { name: Route.OktaConfig, params });
