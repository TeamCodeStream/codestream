import { action } from "../common";
import { SessionActionType, SessionState } from "./types";
import { HostApi } from "../../webview-api";
import { reset } from "../actions";
import { LogoutRequestType, AcceptTOSRequestType } from "@codestream/protocols/webview";
import { setBootstrapped } from "../bootstrapped/actions";
import { setUserPreference } from "../../Stream/actions";
import {
	TokenLoginRequestType,
	GetAccessTokenRequestType,
	isLoginFailResponse,
	TokenLoginRequest
} from "@codestream/protocols/agent";
import { CodeStreamState } from "../index";
import { CSMe } from "@codestream/protocols/api";
import { onLogin, PasswordLoginParams } from "@codestream/webview/Authentication/actions";
import { logError } from "@codestream/webview/logger";
// import { DisconnectFromIDEProviderRequestType } from "../../ipc/host.protocol";

export { reset };

export const setSession = (session: Partial<SessionState>) =>
	action(SessionActionType.Set, session);

export const setTOS = (value: boolean) => action(SessionActionType.SetTOS, value);

export const acceptTOS = () => async (dispatch, getState: () => CodeStreamState) => {
	const { session } = getState();

	if (session.userId) {
		await dispatch(setUserPreference(["acceptedTOS"], true));
	}

	dispatch(setTOS(true));
};

export const setMaintenanceMode = (
	value: boolean,
	meta?: PasswordLoginParams | TokenLoginRequest
) => action(SessionActionType.SetMaintenanceMode, value, meta);

export const logout = () => async (dispatch, getState: () => CodeStreamState) => {
	const { users, session, ide } = getState();

	dispatch(setBootstrapped(false));
	/*
	if (ide.name === "VSC") {
		await HostApi.instance.send(DisconnectFromIDEProviderRequestType, { provider: "github" });
	}
	*/
	await HostApi.instance.send(LogoutRequestType, {});
	dispatch(reset());
	dispatch(setBootstrapped(true));
};

export const switchToTeam = (
	id: string,
	options?: { codemarkId?: string; reviewId?: string }
) => async (dispatch, getState: () => CodeStreamState) => {
	const { accessToken } = await HostApi.instance.send(GetAccessTokenRequestType, {});

	const { configs, context, users, session, codemarks } = getState();
	const user = users[session.userId!] as CSMe;

	dispatch(setBootstrapped(false));
	dispatch(reset());

	await HostApi.instance.send(LogoutRequestType, {});
	const response = await HostApi.instance.send(TokenLoginRequestType, {
		token: {
			email: user.email,
			value: accessToken,
			url: configs.serverUrl,
			teamId: id,
			providerAccess: context.chatProviderAccess as any
		},
		teamId: id,
		codemarkId: options?.codemarkId,
		reviewId: options?.reviewId
	});

	if (isLoginFailResponse(response)) {
		logError("Failed to switch teams", { ...response, userId: user.id, email: user.email });
		return dispatch(setBootstrapped(true));
	}

	return dispatch(onLogin(response));
};
