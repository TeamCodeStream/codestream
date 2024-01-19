import React from "../../../shared/ui/node_modules/react";
// TODO fix me
// import "@formatjs/intl-listformat/polyfill-locales";
import { APMLogSearchPanel } from "../../ui/Stream/APMLogging/APMLogSearchPanel";
import { NRQLPanel } from '../../ui/Stream/NRQL/NRQLPanel';

export function App() {
	// TODO typing for _cs
	const codestreamProps = (window as any)._cs;

	return (
		<div className="stream">
			{codestreamProps.panel === "logs" && (
				<APMLogSearchPanel entityGuid={codestreamProps.entityGuid} searchTerm={codestreamProps.searchTerm}></APMLogSearchPanel>
			)}
			{codestreamProps.panel === "nrql" && (
				<NRQLPanel entityGuid={codestreamProps.entityGuid}></NRQLPanel>
			)}
		</div>
	)
}
