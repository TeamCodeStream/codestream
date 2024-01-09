import React from "../../../shared/ui/node_modules/react";
// TODO fix me
// import "@formatjs/intl-listformat/polyfill-locales";
import { APMLogSearchPanel } from "../../ui/Stream/APMLogging/APMLogSearchPanel";

export function App() {
	// TODO typing for _cs
	const entityGuidWindow = (window as any)._cs.entityGuid;
	return <APMLogSearchPanel entityGuid={entityGuidWindow}></APMLogSearchPanel>;
}
