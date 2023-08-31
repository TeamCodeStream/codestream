"use strict";
import { TraceLevel } from "./logger";

export enum Notifications {
	All = "all",
	Mentions = "mentions",
	None = "none"
}

export interface Config {
	autoSignIn: boolean;
	disableStrictSSL: boolean;
	extraCerts: string;
	email: string;
	notifications: Notifications | null;
	proxySupport: "override" | "on" | "off" | null;
	serverUrl: string;
	showInStatusBar: "left" | "right" | false;
	showLineLevelBlame: boolean;
	showMarkerGlyphs: boolean;
	goldenSignalsInEditor: boolean;
	traceLevel: TraceLevel;
	showInstrumentationGlyphs?: boolean;
	goldenSignalsInEditorFormat?: string;
	promptToEnableCodeLensInDiffs?: boolean;
}

export const ConfigSettingsNeedingReload = [
	"disableStrictSSL",
	"proxySupport",
	"serverUrl",
	"extraCerts"
];
