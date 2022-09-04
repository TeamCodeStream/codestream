import { ConfirmLoginCodeRequest, TokenLoginRequest } from "@codestream/protocols/agent";
import { PasswordLoginParams } from "@codestream/webview/Authentication/actions";
import { setUserPreference } from "../../Stream/actions";
import { reset } from "../actions";
import { action } from "../common";
import { SessionActionType, SessionState } from "./types";

export { reset };

export const setSession = (session: Partial<SessionState>) =>
	action(SessionActionType.Set, session);

export const setTOS = (value: boolean) => action(SessionActionType.SetTOS, value);

export const setMaintenanceMode = (
	value: boolean,
	meta?: PasswordLoginParams | TokenLoginRequest | ConfirmLoginCodeRequest
) => action(SessionActionType.SetMaintenanceMode, value, meta);
