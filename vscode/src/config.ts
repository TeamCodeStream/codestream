"use strict";
import { TraceLevel } from "./logger";

export enum Notifications {
	All = "all",
	Mentions = "mentions",
	None = "none"
}

export interface Config {
	autoHideMarkers: boolean;
	autoSignIn: boolean;
	disableStrictSSL: boolean;
	extraCerts: string;
	email: string;
	notifications: Notifications | null;
	proxySupport: "override" | "on" | "off" | null;
	serverUrl: string;
	showAvatars: boolean;
	showInStatusBar: "left" | "right" | false;
	showLineLevelBlame: boolean;
	showMarkerCodeLens: boolean;
	showMarkerGlyphs: boolean;
	goldenSignalsInEditor: boolean;
	showShortcutTipOnSelection: boolean;
	traceLevel: TraceLevel;
	showInstrumentationGlyphs?: boolean;
	goldenSignalsInEditorFormat?: string;
}

export const ConfigSettingsNeedingReload = [
	"disableStrictSSL",
	"proxySupport",
	"serverUrl",
	"extraCerts"
];
