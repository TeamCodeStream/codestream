import React from "react";
import { render } from "react-dom";
import { ThemeProvider } from "styled-components";
import { APMLogSearchPanel } from "./Stream/APMLogging/APMLogSearchPanel";
import { ModalRoot } from "./Stream/Modal";
import { NRQLPanel } from "./Stream/NRQL/NRQLPanel";
import { WhatsNewPanel } from "./Stream/WhatsNew";
import { OpenEditorViewNotification } from "./ipc/host.protocol";
import { createTheme } from "./src/themes";
import { HostApi } from "./webview-api";
import { WebviewDidInitializeNotificationType } from "./ipc/webview.protocol.notifications";

function App() {
	// TODO: hack typings for now
	const codestreamProps = (window as any)._cs as OpenEditorViewNotification;

	HostApi.instance.notify(WebviewDidInitializeNotificationType, {});

	return (
		<ThemeProvider theme={createTheme()}>
			<div className="stream">
				<ModalRoot />
				{codestreamProps.panel === "logs" && (
					<APMLogSearchPanel
						entityGuid={codestreamProps.entityGuid}
						suppliedQuery={codestreamProps.query}
						entryPoint={codestreamProps.entryPoint}
						traceId={codestreamProps.traceId}
						ide={codestreamProps.ide}
					></APMLogSearchPanel>
				)}
				{codestreamProps.panel === "nrql" && <NRQLPanel {...codestreamProps}></NRQLPanel>}
				{codestreamProps.panel === "whatsnew" && <WhatsNewPanel></WhatsNewPanel>}
			</div>
		</ThemeProvider>
	);
}

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
