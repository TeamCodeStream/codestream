import {
	ConfirmLoginCodeRequest,
	RefreshMaintenancePollNotification,
	TokenLoginRequest,
} from "@codestream/protocols/agent";

import { PasswordLoginParams } from "@codestream/webview/Authentication/actions";
import { reset } from "../actions";
import { action } from "../common";
import { SessionActionType, SessionState } from "./types";
import { HostDidChangeVisibilityNotification } from "@codestream/protocols/webview";

export { reset };

export const setSession = (session: Partial<SessionState>) =>
	action(SessionActionType.Set, session);

export const setTOS = (value: boolean) => action(SessionActionType.SetTOS, value);

export const setMaintenanceMode = (
	value: boolean | undefined,
	meta?:
		| PasswordLoginParams
		| TokenLoginRequest
		| ConfirmLoginCodeRequest
		| RefreshMaintenancePollNotification
		| HostDidChangeVisibilityNotification
) => action(SessionActionType.SetMaintenanceMode, value, meta);
