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
	email: string;
	notifications: Notifications | null;
	proxySupport: "override" | "on" | "off" | null;
	serverUrl: string;
	showAvatars: boolean;
	showInStatusBar: "left" | "right" | false;
	showMarkerCodeLens: boolean;
	showMarkerGlyphs: boolean;
	showGoldenSignalsInEditor: boolean;
	showShortcutTipOnSelection: boolean;
	traceLevel: TraceLevel;
	showInstrumentationGlyphs?: boolean;
	goldenSignalsInEditorFormat?: string;
}
