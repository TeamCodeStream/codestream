/// <reference path="../../@types/window.d.ts"/>
import { UIStateRequestType } from "@codestream/protocols/agent";
import { shallowEqual } from "react-redux";
import { Dispatch } from "redux";

import { WebviewDidChangeContextNotificationType } from "../../ipc/webview.protocol";
import { HostApi } from "../../webview-api";
import { ContextActionsType } from "../context/types";

export const contextChangeObserver = store => (next: Dispatch) => (action: { type: string }) => {
	if (action.type === ContextActionsType.SetFocusState) {
		return next(action);
	}
	const oldContext = store.getState().context;
	const result = next(action);
	const newContext = store.getState().context;

	window.requestIdleCallback(() => {
		if (!shallowEqual(oldContext, newContext)) {
			HostApi.instance.notify(WebviewDidChangeContextNotificationType, {
				context: newContext,
			});

			// alert the agent so it may use more aggressive behaviors based upon
			// which UI the user is looking at
			void HostApi.instance.send(UIStateRequestType, {
				context: newContext,
			});
		}
	});

	return result;
};
