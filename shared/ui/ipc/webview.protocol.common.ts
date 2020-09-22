import { GetFileScmInfoResponse } from "@codestream/protocols/agent";
import { Position, Range } from "vscode-languageserver-types";
import { EditorSelection } from "./webview.protocol";

export const MaxRangeValue = 2147483647;

export interface EditorMargins {
	top?: number;
	right?: number;
	bottom?: number;
	left?: number;
}

export enum EditorScrollMode {
	Pixels = "pixels",
	Lines = "lines"
}

export interface EditorMetrics {
	fontSize?: number;
	lineHeight?: number;
	margins?: EditorMargins;
	scrollMode?: EditorScrollMode;
	scrollRatio?: number;
}

export interface EditorSelection extends Range {
	// MUST be identical to Range.end
	cursor: Position;
}

/* NOTE: there can be dynamic panel names that begin with configure-provider- or configure-enterprise- */
export enum WebviewPanels {
	Activity = "activity",
	Codemarks = "knowledge",
	CodemarksForFile = "codemarks-for-file",
	Export = "export",
	FilterSearch = "filter-search",
	Invite = "invite",
	NewComment = "new-comment",
	NewIssue = "new-issue",
	NewReview = "new-review",
	Team = "people",
	Profile = "profile",
	PullRequest = "pull-request",
	Review = "review",
	Status = "status",
	Tasks = "tasks",
	LandingRedirect = "landing-redirect", // new customers and signins go here
	PRInfo = "pr-info",
	Integrations = "integrations",
	GettingStarted = "gtting-started", // this is a typo but now baked into user data, so let's just leave it
	NewPullRequest = "new-pull-request",
	Flow = "flow",
	Tester = "tester",
	Sidebar = "sidebar",
	OpenReviews = "open-reviews",
	OpenPullRequests = "open-pull-requests",
	WorkInProgress = "work-in-progress"
}

// this is for mixpanel and maps the values from WebviewPanels to their
// corresponding human-readable names
export const WebviewPanelNames = {
	activity: "Activity",
	"filter-search": "Filter & Search",
	"new-comment": "NewComment",
	"new-issue": "New Issue",
	"new-review": "New Review",
	people: "My Team",
	profile: "Profile",
	review: "Review",
	status: "Status",
	"landing-redirect": "Landing Redirect",
	"gtting-started": "Getting Started", // this is a typo but now baked into user data, so let's just leave it
	"work-in-progress": "Work in Progress",
	"open-pull-requests": "Pull Requests",
	"open-reviews": "Feedback Requests",
	"codemarks-for-file": "Codemarks",
	tasks: "Issues"
};

export enum WebviewModals {
	ChangeAvatar = "change-avatar",
	ChangeEmail = "change-email",
	ChangeFullName = "change-full-name",
	ChangePassword = "change-password",
	ChangePhoneNumber = "change-phone-number",
	ChangeUsername = "change-username",
	ChangeWorksOn = "change-works-on",
	ChangeTeamName = "change-team-name",
	CreateTeam = "create-team",
	Keybindings = "keybindings",
	Notifications = "notifications",
	ReviewSettings = "review-settings",
	Invite = "invite"
}

export interface WebviewContext {
	currentTeamId: string;
	currentStreamId?: string;
	threadId?: string;
	currentCodemarkId?: string;
	currentReviewId?: string;
	createPullRequestReviewId?: string;
	currentPullRequest?:
		| {
				providerId: string;
				id: string;
		  }
		| undefined;
	profileUserId?: string;
	currentMarkerId?: string;
	isRepositioning?: boolean;
	hasFocus: boolean;
	panelStack?: (WebviewPanels | string)[];
	activePanel?: WebviewPanels;
	startWorkCard?: any;
}

export interface SessionState {
	otc?: string;
	userId?: string;
	inMaintenanceMode?: boolean;
}

export interface EditorContext {
	scmInfo?: GetFileScmInfoResponse;
	activeFile?: string;
	lastActiveFile?: string;
	textEditorVisibleRanges?: Range[];
	textEditorUri?: string;
	textEditorSelections?: EditorSelection[];
	metrics?: EditorMetrics;
	textEditorLineCount?: number;
	visibleEditorCount?: number; // only populated (and used) by vscode
}

export interface WebviewConfigs {
	showHeadshots: boolean;
	debug: boolean;
	email?: string;
	serverUrl: string;
	team?: string;
}

export interface IpcHost {
	postMessage<R>(message: WebviewIpcMessage, targetOrgigin: string, transferable?: any): Promise<R>;
	postMessage<R>(message: WebviewIpcMessage): Promise<R>;
	onmessage: any;
}

declare function acquireCodestreamHost(): IpcHost;

let host: IpcHost;
export const findHost = (): IpcHost => {
	if (host) return host;
	try {
		host = acquireCodestreamHost();
	} catch (e) {
		throw new Error("Host needs to provide global `acquireCodestreamHost` function");
	}
	return host;
};

export enum IpcRoutes {
	Agent = "codestream",
	Host = "host",
	Webview = "webview"
}

export interface WebviewIpcNotificationMessage {
	method: string;
	params?: any;
}

export interface WebviewIpcRequestMessage {
	id: string;
	method: string;
	params?: any;
}

export interface WebviewIpcResponseMessage {
	id: string;
	params?: any;
	error?: any;
}

export type WebviewIpcMessage =
	| WebviewIpcNotificationMessage
	| WebviewIpcRequestMessage
	| WebviewIpcResponseMessage;

// Don't use as for some reason it isn't a valid type guard
// export function isIpcNotificationMessage(
// 	msg: WebviewIpcMessage
// ): msg is WebviewIpcNotificationMessage {
// 	return (msg as any).method != null && (msg as any).id == null;
// }

export function isIpcRequestMessage(msg: WebviewIpcMessage): msg is WebviewIpcRequestMessage {
	return (msg as any).method != null && (msg as any).id != null;
}

export function isIpcResponseMessage(msg: WebviewIpcMessage): msg is WebviewIpcResponseMessage {
	return (msg as any).method == null && (msg as any).id != null;
}
