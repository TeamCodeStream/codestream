"use strict";
import { initialize, setupCommunication } from "@codestream/editor/index";
import { initializeColorPalette } from "./theme";

declare function acquireVsCodeApi();

const api = acquireVsCodeApi();

const channel = new MessageChannel();
window.addEventListener(
	"message",
	message => {
		channel.port1.postMessage(message.data);
	},
	false
);
channel.port1.onmessage = message => api.postMessage(message.data);

setupCommunication(channel.port2);

initializeColorPalette();

initialize("#app");
