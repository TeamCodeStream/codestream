import { ThemeProvider } from "../../../shared/ui/node_modules/styled-components";
import React from "../../../shared/ui/node_modules/react";
// TODO fix me
// import "@formatjs/intl-listformat/polyfill-locales";
import { APMLogSearchPanel } from "../../ui/Stream/APMLogging/APMLogSearchPanel";
import { ModalRoot } from "../../ui/Stream/Modal";
import { NRQLPanel } from "../../ui/Stream/NRQL/NRQLPanel";
import { WhatsNewPanel } from "../../ui/Stream/WhatsNew";
import { OpenEditorViewNotification } from "../../ui/ipc/host.protocol";
import { createTheme } from "../../ui/src/themes";
import { HostApi } from "../../ui/webview-api";
import { WebviewDidInitializeNotificationType } from "../../ui/ipc/webview.protocol.notifications";

export function App() {
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
						ide={codestreamProps.ide}
					></APMLogSearchPanel>
				)}
				{codestreamProps.panel === "nrql" && <NRQLPanel {...codestreamProps}></NRQLPanel>}
				{codestreamProps.panel === "whatsnew" && <WhatsNewPanel></WhatsNewPanel>}
			</div>
		</ThemeProvider>
	);
}
