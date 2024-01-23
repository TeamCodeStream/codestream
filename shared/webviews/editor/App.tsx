import { ThemeProvider } from "../../../shared/ui/node_modules/styled-components";
import React from "../../../shared/ui/node_modules/react";
// TODO fix me
// import "@formatjs/intl-listformat/polyfill-locales";
import { APMLogSearchPanel } from "../../ui/Stream/APMLogging/APMLogSearchPanel";
import { NRQLPanel } from "../../ui/Stream/NRQL/NRQLPanel";
import { OpenEditorViewNotification } from "../../ui/ipc/host.protocol";
import { createTheme } from "../../ui/src/themes";

export function App() {
	// TODO: hack typings for now
	const codestreamProps = (window as any)._cs as OpenEditorViewNotification;

	return (
		<ThemeProvider theme={createTheme()}>
			<div className="stream">
				{codestreamProps.panel === "logs" && (
					<APMLogSearchPanel
						entityAccounts={codestreamProps.entityAccounts}
						entityGuid={codestreamProps.entityGuid}
						suppliedQuery={codestreamProps.query}
					></APMLogSearchPanel>
				)}
				{codestreamProps.panel === "nrql" && (
					<NRQLPanel
						entityAccounts={codestreamProps.entityAccounts}
						entityGuid={codestreamProps.entityGuid}
						suppliedQuery={codestreamProps.query}
					></NRQLPanel>
				)}
			</div>
		</ThemeProvider>
	);
}
