"use strict";
import { initialize, setupCommunication } from "@codestream/webview/index";
import { initializeColorPalette } from "./theme";

declare function acquireVsCodeApi();

const api = acquireVsCodeApi();
const channel = new MessageChannel();

function getLocalStorage() {
	const state = api.getState() || { localStorage: {} };
	return state.localStorage;
}
Object.defineProperty(window, "codestreamInitialized", {
	value: true
});

// LocalStorage polyfill
Object.defineProperty(window, "localStorage", {
	value: {
		setItem(key: string, value: string) {
			const localStorage = getLocalStorage();
			api.setState({ localStorage: { ...localStorage, [key]: value } });
		},
		getItem(key: string) {
			return getLocalStorage()[key];
		},
		removeItem(key: string) {
			const localStorage = getLocalStorage();
			delete localStorage[key];
			api.setState({ localStorage: localStorage });
		}
	}
});

window.addEventListener("message", message => channel.port1.postMessage(message.data), false);
channel.port1.onmessage = message => api.postMessage(message.data);

setupCommunication(channel.port2);
initializeColorPalette();

initialize("#app");
