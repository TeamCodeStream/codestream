import * as paths from "path";
import { CodemarkType, CSMarkerIdentifier, CSReviewCheckpoint } from "@codestream/protocols/api";
import { Editor } from "extensions/editor";
import { commands, Disposable, env, Range, Uri, ViewColumn, window, workspace } from "vscode";
import { openUrl } from "urlHandler";
import {
	FileLevelTelemetryRequestOptions,
	MetricTimesliceNameMapping
} from "protocols/agent/agent.protocol.providers";
import { SessionSignedOutReason, StreamThread } from "./api/session";
import { TokenManager } from "./api/tokenManager";
import { WorkspaceState } from "./common";
import { BuiltInCommands } from "./constants";
import { Container } from "./container";
import { Logger } from "./logger";
import { Command, createCommandDecorator, Strings } from "./system";
import * as csUri from "./system/uri";

const commandRegistry: Command[] = [];
const command = createCommandDecorator(commandRegistry);

export interface InsertTextCommandArgs {
	text: string;
	marker: CSMarkerIdentifier;
	indentAfterInsert?: boolean;
}

export interface ApplyMarkerCommandArgs {
	marker: CSMarkerIdentifier;
}

export interface ShowMarkerDiffCommandArgs {
	marker: CSMarkerIdentifier;
}

export interface ShowReviewDiffCommandArgs {
	reviewId: string;
	checkpoint: CSReviewCheckpoint;
	repoId: string;
	path: string;
}

export interface ShowReviewLocalDiffCommandArgs {
	repoId: string;
	path: string;
	editingReviewId?: string;
	includeSaved: boolean;
	includeStaged: boolean;
	baseSha: string;
}

export interface CloseReviewDiffCommandArgs {}

export interface GotoCodemarkCommandArgs {
	source?: string;
	index: number;
}

export interface NewCodemarkCommandArgs {
	source?: string;
}

export interface NewReviewCommandArgs {
	source?: string;
}

export interface NewPullRequestCommandArgs {
	source?: string;
}

export interface OpenCodemarkCommandArgs {
	codemarkId: string;
	onlyWhenVisible?: boolean;
	sourceUri?: Uri;
}

export interface OpenPullRequestCommandArgs {
	providerId: string;
	pullRequestId: string;
	// optionally open to a particular comment
	commentId?: string;
	sourceUri?: Uri;
	externalUrl?: string;
}

export interface OpenReviewCommandArgs {
	reviewId: string;
	onlyWhenVisible?: boolean;
	sourceUri?: Uri;
}

export interface OpenStreamCommandArgs {
	streamThread: StreamThread;
}

export interface ViewMethodLevelTelemetryCommandArgs {
	repoId: string;
	codeNamespace: string;
	filePath: string;
	relativeFilePath: string;
	languageId: string;
	range: Range;
	functionName: string;
	newRelicAccountId?: number;
	newRelicEntityGuid?: string;
	methodLevelTelemetryRequestOptions?: FileLevelTelemetryRequestOptions;
	metricTimesliceNameMapping?: MetricTimesliceNameMapping;
}

export class Commands implements Disposable {
	private readonly _disposable: Disposable;

	constructor() {
		this._disposable = Disposable.from(
			...commandRegistry.map(({ name, method }) =>
				commands.registerCommand(name, (...args: any[]) => method.apply(this, args))
			),
			commands.registerCommand("workbench.view.extension.codestream", () =>
				Container.webview.show()
			)
		);
	}

	dispose() {
		this._disposable && this._disposable.dispose();
	}

	@command("goOffline")
	goOffline() {
		return Container.session.goOffline();
	}

	@command("insertText", { showErrorMessage: "Unable to insertText" })
	async insertText(args: InsertTextCommandArgs): Promise<boolean> {
		const editor = await this.openWorkingFileForMarkerCore(args.marker);
		if (editor === undefined) return false;

		const resp = await Container.agent.documentMarkers.getDocumentFromMarker(args.marker);
		if (resp === undefined) return false;

		const line = resp.range.start.line;
		await editor.edit(builder => {
			builder.replace(new Range(line, 0, line, 0), args.text);
		});
		if (args.indentAfterInsert) {
			await Editor.selectRange(editor.document.uri, new Range(line, 0, line + 10, 0), undefined, {
				preserveFocus: false
			});
			await commands.executeCommand(BuiltInCommands.IndentSelection);
			await commands.executeCommand(BuiltInCommands.FormatSelection);
		}
		return true;
	}

	@command("applyMarker", { showErrorMessage: "Unable to open comment" })
	async applyMarker(args: ApplyMarkerCommandArgs): Promise<boolean> {
		const editor = await this.openWorkingFileForMarkerCore(args.marker);
		if (editor === undefined) return false;

		const resp = await Container.agent.documentMarkers.getDocumentFromMarker(args.marker);
		if (resp === undefined) return false;

		return editor.edit(builder => {
			builder.replace(
				new Range(
					resp.range.start.line,
					resp.range.start.character,
					resp.range.end.line,
					resp.range.end.character
				),
				resp.marker.code
			);
		});
	}

	@command("showMarkerDiff", { showErrorMessage: "Unable to open comment" })
	async showMarkerDiff(args: ShowMarkerDiffCommandArgs): Promise<boolean> {
		const resp = await Container.agent.documentMarkers.getDocumentFromMarker(args.marker);
		if (resp === undefined) return false;

		const originalUri = Uri.parse(resp.textDocument.uri);

		const markerId: CSMarkerIdentifier = {
			id: args.marker.id,
			file: args.marker.file,
			repoId: args.marker.repoId
		};
		const patchedUri = originalUri.with({
			scheme: "codestream-patch",
			query: encodeURIComponent(JSON.stringify(markerId))
		});

		const fileName = paths.basename(originalUri.fsPath);

		// Try to designate the diff view in the column to the left the webview
		// FYI, this doesn't always work, see https://github.com/Microsoft/vscode/issues/56097
		// let column = Container.webview.viewColumn as number | undefined;
		// if (column !== undefined) {
		// 	column--;
		// 	if (column <= 0) {
		// 		column = undefined;
		// 	}
		// }

		await commands.executeCommand(
			BuiltInCommands.Diff,
			originalUri,
			patchedUri,
			`${fileName} \u27f7 ${fileName} (patched)`,
			{
				preserveFocus: false,
				preview: true,
				viewColumn: ViewColumn.Active
			}
		);

		return true;
	}

	@command("showReviewDiff", { showErrorMessage: "Unable to display review diff" })
	async showReviewDiff(args: ShowReviewDiffCommandArgs): Promise<boolean> {
		await Container.diffContents.loadContents(
			args.reviewId,
			args.checkpoint,
			args.repoId,
			args.path
		);
		const { review } = await Container.agent.reviews.get(args.reviewId);
		let update = "";
		if (args.checkpoint && args.checkpoint > 0) {
			update = ` (Update #${args.checkpoint})`;
		}
		const viewColumn = await this.getViewColumn();
		await commands.executeCommand(
			BuiltInCommands.Diff,
			Uri.parse(
				`codestream-diff://${args.reviewId}/${args.checkpoint}/${args.repoId}/left/${args.path}`
			),
			Uri.parse(
				`codestream-diff://${args.reviewId}/${args.checkpoint}/${args.repoId}/right/${args.path}`
			),
			`${paths.basename(args.path)} @ ${Strings.truncate(review.title, 25)}${update}`,
			{ preserveFocus: false, preview: true, viewColumn: viewColumn }
		);

		return true;
	}

	@command("showReviewLocalDiff", { showErrorMessage: "Unable to display review local diff" })
	async showReviewLocalDiff(args: ShowReviewLocalDiffCommandArgs): Promise<boolean> {
		const rightVersion = args.includeSaved ? "saved" : args.includeStaged ? "staged" : "head";

		await Container.diffContents.loadContentsLocal(
			args.repoId,
			args.path,
			args.editingReviewId,
			args.baseSha,
			rightVersion
		);

		const viewColumn = await this.getViewColumn();
		await commands.executeCommand(
			BuiltInCommands.Diff,
			Uri.parse(`codestream-diff://local/undefined/${args.repoId}/left/${args.path}`),
			Uri.parse(`codestream-diff://local/undefined/${args.repoId}/right/${args.path}`),
			`${paths.basename(args.path)} review changes`,
			{ preserveFocus: false, preview: true, viewColumn: viewColumn }
		);

		return true;
	}

	async showLocalDiff(args: {
		repoId: string;
		filePath: string;
		previousFilePath?: string;
		baseSha: string;
		baseBranch: string;
		headSha: string;
		headBranch: string;
		context?: {
			pullRequest: {
				providerId: string;
				id: string;
			};
		};
	}): Promise<boolean> {
		const leftData = {
			path: args.previousFilePath || args.filePath,
			repoId: args.repoId,
			baseBranch: args.baseBranch,
			headBranch: args.headBranch,
			leftSha: args.baseSha,
			rightSha: args.headSha,
			side: "left",
			context: args.context
		};

		const rightData = {
			path: args.filePath,
			previousFilePath: args.previousFilePath,
			repoId: args.repoId,
			baseBranch: args.baseBranch,
			headBranch: args.headBranch,
			leftSha: args.baseSha,
			rightSha: args.headSha,
			side: "right",
			context: args.context
		};

		const viewColumn = await this.getViewColumn();
		await commands.executeCommand(
			BuiltInCommands.Diff,
			csUri.Uris.toCodeStreamDiffUri(leftData, leftData.path),
			csUri.Uris.toCodeStreamDiffUri(rightData, args.filePath),
			`${Strings.truncate(paths.basename(args.filePath), 40)} (${Strings.truncate(
				args.baseSha,
				8,
				""
			)}) ⇔ (${Strings.truncate(args.headSha, 8, "")})`,
			{ preserveFocus: false, preview: true, viewColumn: viewColumn }
		);

		return true;
	}

	@command("closeReviewDiff", { showErrorMessage: "Unable to close review diff" })
	async closeReviewDiff(_args: CloseReviewDiffCommandArgs): Promise<boolean> {
		for (const e of window.visibleTextEditors) {
			const uri = Uri.parse(e.document.uri.toString(false));

			if (uri.scheme === "codestream-diff") {
				// FIXME -- this is where we should close the tab, but vscode
				// doesn't provide the right API call yet to do that
				// await e.show(e.viewColumn);
				// await commands.executeCommand("workbench.action.closeActiveEditor");
			}
		}

		return true;
	}

	@command("startWork", { showErrorMessage: "Unable to start work" })
	startWork() {
		return this.startWorkRequest();
	}

	@command("newComment", { showErrorMessage: "Unable to add comment" })
	newComment(args?: NewCodemarkCommandArgs) {
		return this.newCodemarkRequest(CodemarkType.Comment, args);
	}

	@command("newIssue", { showErrorMessage: "Unable to create issue" })
	newIssue(args?: NewCodemarkCommandArgs) {
		return this.newCodemarkRequest(CodemarkType.Issue, args);
	}

	@command("newReview", { showErrorMessage: "Unable to request a review" })
	newReview(args?: NewReviewCommandArgs) {
		return this.newReviewRequest(args);
	}

	@command("showNextChangedFile", { showErrorMessage: "Unable to show next changed file" })
	showNextChangedFile() {
		return this.showNextChangedFileRequest();
	}

	@command("showPreviousChangedFile", { showErrorMessage: "Unable to show previous changed file" })
	showPreviousChangedFile() {
		return this.showPreviousChangedFileRequest();
	}

	@command("newBookmark", { showErrorMessage: "Unable to add bookmark" })
	newBookmark(args?: NewCodemarkCommandArgs) {
		return this.newCodemarkRequest(CodemarkType.Bookmark, args);
	}

	@command("newPermalink", { showErrorMessage: "Unable to get permalink" })
	newPermalink(args?: NewCodemarkCommandArgs) {
		return this.newCodemarkRequest(CodemarkType.Link, args);
	}

	@command("newPullRequest", { showErrorMessage: "Unable to create Pull Request" })
	newPullRequest(args?: NewPullRequestCommandArgs) {
		return this.newPullRequestRequest(args);
	}

	@command("scmNewPullRequest", { showErrorMessage: "Unable to create Pull Request" })
	async scmNewPullRequest() {
		try {
			const editor = window.activeTextEditor;
			await Container.webview.newPullRequestRequest(
				editor && editor.selection && !editor.selection.isEmpty ? editor : undefined,
				"VSC SCM"
			);
		} catch (ex) {
			Logger.error(ex);
		}
	}

	@command("copyPermalink", { showErrorMessage: "Unable to copy permalink" })
	async copyPermalink(_args?: NewCodemarkCommandArgs) {
		const editor = window.activeTextEditor;
		if (editor === undefined) return;

		const response = await Container.agent.documentMarkers.createPermalink(
			editor.document.uri,
			editor.selection,
			"private"
		);
		if (response === undefined) return;

		return env.clipboard.writeText(response.linkUrl);
	}

	// @command("gotoCodemark0", {
	// 	args: ([args]) => [{ ...(args || {}), index: 0 }],
	// 	showErrorMessage: "Unable to jump to codemark #0"
	// })
	// @command("gotoCodemark1", {
	// 	args: ([args]) => [{ ...(args || {}), index: 1 }],
	// 	showErrorMessage: "Unable to jump to codemark #1"
	// })
	// @command("gotoCodemark2", {
	// 	args: ([args]) => [{ ...(args || {}), index: 2 }],
	// 	showErrorMessage: "Unable to jump to codemark #2"
	// })
	// @command("gotoCodemark3", {
	// 	args: ([args]) => [{ ...(args || {}), index: 3 }],
	// 	showErrorMessage: "Unable to jump to codemark #3"
	// })
	// @command("gotoCodemark4", {
	// 	args: ([args]) => [{ ...(args || {}), index: 4 }],
	// 	showErrorMessage: "Unable to jump to codemark #4"
	// })
	// @command("gotoCodemark5", {
	// 	args: ([args]) => [{ ...(args || {}), index: 5 }],
	// 	showErrorMessage: "Unable to jump to codemark #5"
	// })
	// @command("gotoCodemark6", {
	// 	args: ([args]) => [{ ...(args || {}), index: 6 }],
	// 	showErrorMessage: "Unable to jump to codemark #6"
	// })
	// @command("gotoCodemark7", {
	// 	args: ([args]) => [{ ...(args || {}), index: 7 }],
	// 	showErrorMessage: "Unable to jump to codemark #7"
	// })
	// @command("gotoCodemark8", {
	// 	args: ([args]) => [{ ...(args || {}), index: 8 }],
	// 	showErrorMessage: "Unable to jump to codemark #8"
	// })
	// @command("gotoCodemark9", {
	// 	args: ([args]) => [{ ...(args || {}), index: 9 }],
	// 	showErrorMessage: "Unable to jump to codemark #9"
	// })
	// async gotoCodemark(args?: GotoCodemarkCommandArgs) {
	// 	if (args === undefined) return;

	// 	Container.agent.telemetry.track("Codemark Clicked", { "Codemark Location": "Shortcut" });
	// 	const response = await Container.agent.documentMarkers.getDocumentFromKeyBinding(args.index);
	// 	if (response == null) return;

	// 	const uri = Uri.parse(response.textDocument.uri);

	// 	await Editor.selectRange(
	// 		uri,
	// 		new Range(
	// 			response.range.start.line,
	// 			response.range.start.character,
	// 			response.range.start.line,
	// 			response.range.start.character
	// 		),
	// 		undefined,
	// 		{
	// 			preserveFocus: false
	// 		}
	// 	);

	// 	await Container.webview.openCodemark(response.marker.codemarkId, {
	// 		onlyWhenVisible: true,
	// 		sourceUri: uri
	// 	});
	// }

	@command("openCodemark", { showErrorMessage: "Unable to open comment" })
	async openCodemark(args: OpenCodemarkCommandArgs): Promise<void> {
		if (args === undefined) return;

		Container.agent.telemetry.track("Codemark Clicked", { "Codemark Location": "Source File" });

		const { codemarkId: _codemarkId, ...options } = args;
		return Container.webview.openCodemark(args.codemarkId, options);
	}

	@command("openPullRequest", { showErrorMessage: "Unable to open pull request" })
	async openPullRequest(args: OpenPullRequestCommandArgs): Promise<void> {
		if (args === undefined) return;

		const trackParams: { [k: string]: any } = {
			Host: args.providerId
		};
		const editor = window.activeTextEditor;
		if (editor && editor.document.uri.scheme === "file") {
			trackParams["Comment Location"] = "Source Gutter";
		}
		if (editor && editor.document.uri.scheme === "codestream-diff") {
			trackParams["Comment Location"] = "Diff Gutter";
		}

		Container.agent.telemetry.track("PR Comment Clicked", trackParams);

		if (args.externalUrl) {
			return openUrl(args.externalUrl);
		}
		return Container.webview.openPullRequest(args.providerId, args.pullRequestId, args.commentId);
	}

	@command("openReview", { showErrorMessage: "Unable to open review" })
	async openReview(args: OpenReviewCommandArgs): Promise<void> {
		if (args === undefined) return;

		const { reviewId: _reviewId, ...options } = args;
		return Container.webview.openReview(args.reviewId, options);
	}

	@command("openStream", { showErrorMessage: "Unable to open stream" })
	async openStream(args: OpenStreamCommandArgs): Promise<StreamThread | undefined> {
		if (args == null || args.streamThread === undefined) return undefined;

		return Container.webview.show(args.streamThread);
	}

	@command("signIn", { customErrorHandling: true })
	async signIn() {
		try {
			const token = await TokenManager.get(Container.config.serverUrl, Container.config.email);
			if (!token) {
				await Container.context.workspaceState.update(WorkspaceState.TeamId, undefined);
				await Container.webview.show();
			} else {
				await Container.session.login(Container.config.email, token);
			}
		} catch (ex) {
			Logger.error(ex);
		}
	}

	@command("signOut")
	async signOut(reason = SessionSignedOutReason.UserSignedOutFromExtension) {
		try {
			if (reason === SessionSignedOutReason.UserSignedOutFromExtension) {
				Container.webview.hide();
			}
			await Container.session.logout(reason);
		} catch (ex) {
			Logger.error(ex);
		}
	}

	@command("toggle")
	async toggle() {
		try {
			return await Container.webview.toggle();
		} catch (ex) {
			Logger.error(ex);
		}
	}

	@command("scmNewReview", { showErrorMessage: "Unable to request a review" })
	async scmNewReview() {
		try {
			return this.newReviewRequest({ source: "VSC SCM" });
		} catch (ex) {
			Logger.error(ex);
		}
	}

	@command("scmNewComment", { showErrorMessage: "Unable to add comment" })
	async scmNewComment() {
		try {
			const editor = window.activeTextEditor;
			await Container.webview.newCodemarkRequest(
				CodemarkType.Comment,
				editor && editor.selection && !editor.selection.isEmpty ? editor : undefined,
				"VSC SCM",
				true
			);
		} catch (ex) {
			Logger.error(ex);
		}
	}

	@command("scmNewIssue", { showErrorMessage: "Unable to create issue" })
	async scmNewIssue() {
		try {
			const editor = window.activeTextEditor;
			await Container.webview.newCodemarkRequest(
				CodemarkType.Issue,
				editor && editor.selection && !editor.selection.isEmpty ? editor : undefined,
				"VSC SCM",
				true
			);
		} catch (ex) {
			Logger.error(ex);
		}
	}

	@command("viewMethodLevelTelemetry", {
		showErrorMessage: "Unable to view method level telemetry"
	})
	async viewMethodLevelTelemetry(args: string) {
		try {
			const parsedArgs = JSON.parse(args) as ViewMethodLevelTelemetryCommandArgs;
			await Container.webview.viewMethodLevelTelemetry(parsedArgs);
		} catch (ex) {
			Logger.error(ex);
		}
	}

	async updateEditorCodeLens(): Promise<boolean> {
		Container.instrumentableCodeLensController.refresh();
		return true;
	}

	private async startWorkRequest() {
		await Container.webview.startWorkRequest(window.activeTextEditor, "Context Menu");
	}

	private async newCodemarkRequest(type: CodemarkType, args: NewCodemarkCommandArgs = {}) {
		await Container.webview.newCodemarkRequest(
			type,
			window.activeTextEditor,
			args.source || "Context Menu"
		);
	}

	private async newReviewRequest(args: NewCodemarkCommandArgs = {}) {
		await Container.webview.newReviewRequest(
			window.activeTextEditor,
			args.source || "Context Menu"
		);
	}

	private async newPullRequestRequest(args: NewPullRequestCommandArgs = {}) {
		await Container.webview.newPullRequestRequest(
			window.activeTextEditor,
			args.source || "Context Menu"
		);
	}

	private async showNextChangedFileRequest() {
		await Container.webview.showNextChangedFile();
	}

	private async showPreviousChangedFileRequest() {
		await Container.webview.showPreviousChangedFile();
	}

	private async openWorkingFileForMarkerCore(marker: CSMarkerIdentifier) {
		const resp = await Container.agent.documentMarkers.getDocumentFromMarker(marker);
		if (resp === undefined || resp === null) return undefined;

		const uri = Uri.parse(resp.textDocument.uri);
		const normalizedUri = uri.toString(false);

		const editor = window.activeTextEditor;
		if (editor !== undefined && editor.document.uri.toString(false) === normalizedUri) {
			return editor;
		}

		for (const e of window.visibleTextEditors) {
			if (e.document.uri.toString(false) === normalizedUri) {
				return window.showTextDocument(e.document, e.viewColumn);
			}
		}

		// FYI, this doesn't always work, see https://github.com/Microsoft/vscode/issues/56097
		// let column = Container.webview.viewColumn as number | undefined;
		// if (column !== undefined) {
		// 	column--;
		// 	if (column <= 0) {
		// 		column = undefined;
		// 	}
		// }

		const document = await workspace.openTextDocument();
		return window.showTextDocument(document, {
			preserveFocus: false,
			preview: false,
			viewColumn: ViewColumn.Active
		});
	}

	private async getViewColumn(): Promise<number> {
		return ViewColumn.Active;

		// // <HACK>>
		// // sometimes the webview misrepresents what
		// // its viewColumn value is (it returns a number high than it should)
		// // try to force an editor to be active so we can get a valid
		// // webview.viewColumn later
		// try {
		// 	const editor = window.activeTextEditor;
		// 	if (editor === undefined) {
		// 		void (await commands.executeCommand(BuiltInCommands.NextEditor));
		// 		await Container.webview.show();
		// 	}
		// } catch {}
		// // </HACK>

		// // FYI, see showMarkerDiff() above
		// // Try to designate the diff view in the column to the left the webview
		// // FYI, this doesn't always work, see https://github.com/Microsoft/vscode/issues/56097
		// let column = Container.webview.viewColumn as number | undefined;

		// if (column !== undefined) {
		// 	column--;
		// 	if (column <= 0) {
		// 		column = undefined;
		// 	}
		// }
		// return column || ViewColumn.Active;
	}
}
