import React from "../../../shared/ui/node_modules/react";
import { render } from "../../../shared/ui/node_modules/react-dom";
// TODO fix me
// import "@formatjs/intl-listformat/polyfill-locales";
import { App } from "./App";

export function setupCommunication(host: { postMessage: (message: any) => void }) {
	Object.defineProperty(window, "acquireCodestreamHost", {
		value() {
			return host;
		},
	});
}

export async function initialize(selector: string) {
	render(<App />, document.querySelector(selector));
}
