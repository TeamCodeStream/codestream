import { PixieDynamicLoggingFunctionParameter } from "@codestream/protocols/agent";
import { CodemarkType } from "@codestream/protocols/api";
import { NotificationType } from "vscode-jsonrpc";
import { Range } from "vscode-languageserver-types";
import { IpcRoutes } from "./webview.protocol.common";

export * from "./webview.protocol.common";

export * from "./host.protocol";
export * from "./host.protocol.editor";
export * from "./host.protocol.notifications";
export * from "./host.protocol.review";
export * from "./host.protocol.vsls";

export * from "./webview.protocol.notifications";

// TODO: This should be a request to the webview -- not a notification
export interface ShowCodemarkNotification {
	codemarkId: string;
	sourceUri?: string;
}
export const ShowCodemarkNotificationType = new NotificationType<ShowCodemarkNotification, void>(
	`${IpcRoutes.Webview}/codemark/show`
);

// TODO: This should be a request to the webview -- not a notification
export interface ShowReviewNotification {
	reviewId: string;
	openFirstDiff?: boolean;
	sourceUri?: string;
}
export const ShowReviewNotificationType = new NotificationType<ShowReviewNotification, void>(
	`${IpcRoutes.Webview}/review/show`
);

// TODO: This should be a request to the webview -- not a notification
export interface ShowCodeErrorNotification {
	codeErrorId: string;
}
export const ShowCodeErrorNotificationType = new NotificationType<ShowCodeErrorNotification, void>(
	`${IpcRoutes.Webview}/codeError/show`
);

// TODO: This should be a request to the webview -- not a notification
export interface ShowPullRequestwNotification {
	providerId: string;
	id: string;
	commentId?: string;
	/* Either a providerId && id are used, OR a url */
	url?: string;
	source?: string;
}
export const ShowPullRequestNotificationType = new NotificationType<
	ShowPullRequestwNotification,
	void
>(`${IpcRoutes.Webview}/pullRequest/show`);

// TODO: This should be a request to the webview -- not a notification
export interface ShowStreamNotification {
	streamId: string;
	threadId?: string;
	codemarkId?: string;
}
export const ShowStreamNotificationType = new NotificationType<ShowStreamNotification, void>(
	`${IpcRoutes.Webview}/stream/show`
);

// TODO: This should be a request to the webview -- not a notification
export interface NewCodemarkNotification {
	uri?: string;
	range?: Range;
	type: CodemarkType;
	source?: string;
}

export const NewCodemarkNotificationType = new NotificationType<NewCodemarkNotification, void>(
	`${IpcRoutes.Webview}/codemark/new`
);

export interface NewReviewNotification {
	uri?: string;
	range?: Range;
	source?: string;
	includeLatestCommit?: boolean;
}

export interface NewPullRequestBranch {
	name: string;
	remote?: {
		name: string;
		provider?: {
			id: string;
			name: string;
			domain: string;
		};
		url?: string;
	};
	repoPath: string;
}

export interface NewPullRequestNotification {
	uri?: string;
	range?: Range;
	source?: string;
	branch?: NewPullRequestBranch;
}

export const NewReviewNotificationType = new NotificationType<NewReviewNotification, void>(
	`${IpcRoutes.Webview}/review/new`
);

export const NewPullRequestNotificationType = new NotificationType<
	NewPullRequestNotification,
	void
>(`${IpcRoutes.Webview}/pullRequest/new`);

export interface StartWorkNotification {
	uri?: string;
	source?: string;
}

export const StartWorkNotificationType = new NotificationType<StartWorkNotification, void>(
	`${IpcRoutes.Webview}/work/start`
);

export interface ShowNextChangedFileNotification {}

export const ShowNextChangedFileNotificationType = new NotificationType<
	ShowNextChangedFileNotification,
	void
>(`${IpcRoutes.Webview}/showChangedFile/next`);

export interface ShowPreviousChangedFileNotification {}

export const ShowPreviousChangedFileNotificationType = new NotificationType<
	ShowPreviousChangedFileNotification,
	void
>(`${IpcRoutes.Webview}/showChangedFile/previous`);

export interface PixieDynamicLogging {
	functionName: string;
	functionParameters: PixieDynamicLoggingFunctionParameter[];
	functionReceiver?: string;
	packageName: string;
}

export const PixieDynamicLoggingType = new NotificationType<PixieDynamicLogging, void>(
	`${IpcRoutes.Webview}/pixie/dynamicLogging`
);

export interface ViewMethodLevelTelemetryNotification {
	range?: Range;
	methodName: string;
	newRelicAccountId?: number;
	newRelicEntityGuid?: string;
}

export const ViewMethodLevelTelemetryNotificationType = new NotificationType<
	ViewMethodLevelTelemetryNotification,
	void
>(`${IpcRoutes.Webview}/mlt/view`);
