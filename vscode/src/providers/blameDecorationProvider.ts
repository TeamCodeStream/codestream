"use strict";

import { GetBlameLineInfo } from "protocols/agent/agent.protocol.scm";
import { Functions } from "system";
import {
	ConfigurationChangeEvent,
	Disposable,
	extensions,
	MarkdownString,
	Position,
	TextDocumentChangeEvent,
	TextEditorDecorationType,
	TextEditorSelectionChangeEvent,
	ThemeColor,
	window,
	workspace
} from "vscode";
import { SessionStatus, SessionStatusChangedEvent } from "../api/session";
import { NewCodemarkCommandArgs } from "../commands";
import { configuration } from "../configuration";
import { Container } from "../container";
import { Logger } from "../logger";

export class BlameDecorationProvider implements Disposable {
	private _decorationTypes: { [key: string]: TextEditorDecorationType } | undefined;
	private readonly _disposable: Disposable;
	private _enabledDisposable: Disposable | undefined;
	private _latestCursorEvent: TextEditorSelectionChangeEvent | undefined;
	private _blameCache: Map<number, GetBlameLineInfo>;
	private readonly onSourceChangeDebounced = Functions.debounce(
		this.onSourceChange.bind(this),
		2000,
		{ track: true }
	);

	constructor() {
		this._disposable = Disposable.from(
			configuration.onDidChange(this.onConfigurationChanged, this),
			Container.session.onDidChangeSessionStatus(this.onSessionStatusChanged, this)
		);
		this._blameCache = new Map<number, GetBlameLineInfo>();

		this.onConfigurationChanged(configuration.initializingChangeEvent);
	}

	dispose() {
		this.disable();
		this._disposable && this._disposable.dispose();
	}

	private onConfigurationChanged(e: ConfigurationChangeEvent) {
		if (configuration.changed(e, configuration.name("showLineLevelBlame").value)) {
			this.ensure(true);
		}
	}

	private onSessionStatusChanged(e: SessionStatusChangedEvent) {
		switch (e.getStatus()) {
			case SessionStatus.SignedOut:
				this.disable();
				break;

			case SessionStatus.SignedIn: {
				this.ensure();
				break;
			}
		}
	}

	private ensure(reset: boolean = false) {
		if (!Container.config.showLineLevelBlame || !Container.session.signedIn) {
			this.disable();
			return;
		}

		if (reset) {
			this.disable();
		}
		this.enable();
	}

	private disable() {
		this.resetBlameCache();
		if (this._enabledDisposable === undefined) return;

		this._enabledDisposable.dispose();
		this._enabledDisposable = undefined;
	}

	private enable() {
		const gitlens = extensions.getExtension("eamodio.gitlens");

		if (
			this._enabledDisposable !== undefined ||
			Container.session.status !== SessionStatus.SignedIn ||
			(gitlens && gitlens.isActive)
		) {
			return;
		}

		const decorationTypes: { [key: string]: TextEditorDecorationType } = {};

		decorationTypes.blameSuffix = window.createTextEditorDecorationType({
			after: {
				color: new ThemeColor("editorCodeLens.foreground"),
				margin: "30px"
			}
		});

		this._decorationTypes = decorationTypes;

		this._enabledDisposable = Disposable.from(
			workspace.onDidChangeTextDocument(this.onTextDocumentChange, this),
			workspace.onDidSaveTextDocument(this.onTextDocumentSave, this),
			window.onDidChangeTextEditorSelection(this.onCursorChange, this),
			Container.agent.onDidChangeRepositoryCommitHash(this.onSourceChange, this)
		);
	}

	private resetBlameCache() {
		this._blameCache.clear();
	}

	private async onTextDocumentChange(e: TextDocumentChangeEvent) {
		if (e.document.uri.scheme !== "file") {
			return;
		}
		this.clearDecorations();
		await this.onSourceChangeDebounced();
	}

	private async onTextDocumentSave() {
		this.onSourceChangeDebounced.flush();
		await this.onSourceChange();
	}

	private async onSourceChange() {
		this.resetBlameCache();
		if (this._latestCursorEvent) {
			await this.onCursorChange(this._latestCursorEvent);
		}
	}

	private clearDecorations() {
		if (this._latestCursorEvent) {
			const editor = this._latestCursorEvent.textEditor;
			editor.setDecorations(this._decorationTypes!.blameSuffix, []);
		}
	}

	private async onCursorChange(e: TextEditorSelectionChangeEvent) {
		this._latestCursorEvent = e;
		if (this.onSourceChangeDebounced.pending()) {
			return;
		}
		const cursor = e.selections[0].active;
		const editor = e.textEditor;
		if (editor.document.uri.scheme !== "file") {
			return;
		}
		const length = editor.document.lineAt(cursor.line).text.length;
		const range = editor.selection.with({
			start: new Position(cursor.line, length),
			end: new Position(cursor.line, length)
		});
		try {
			if (!this._blameCache.get(cursor.line)) {
				const startLine = Math.max(cursor.line - 5, 0);
				const endLine = Math.min(cursor.line + 5, editor.document.lineCount);
				const { blame } = await Container.agent.scm.getBlame(
					editor.document.uri.toString(),
					startLine,
					endLine
				);
				blame.forEach((blameInfo, index) => {
					const lineNumber = startLine + index;
					this._blameCache.set(lineNumber, blameInfo);
				});
			}
			const lineBlame = this._blameCache.get(cursor.line);
			if (lineBlame) {
				const hoverMessage = lineBlame.isUncommitted ? undefined : this.formatHover(lineBlame);
				editor.setDecorations(this._decorationTypes!.blameSuffix, [
					{
						hoverMessage,
						range,
						renderOptions: { after: { contentText: lineBlame.formattedBlame } }
					}
				]);
			}
		} catch (ex) {
			Logger.error(ex);
		}
	}

	private formatHover(commitInfo: GetBlameLineInfo): MarkdownString {
		const commandArgs: NewCodemarkCommandArgs = {
			source: "Blame Hover"
		};
		const mdString = new MarkdownString("", true);
		mdString.isTrusted = true;
		if (commitInfo.gravatarUrl && commitInfo.gravatarUrl.length > 0) {
			const authorString = commitInfo.authorEmail ? `**${commitInfo.authorName}**` : "**You**";
			const dateString =
				commitInfo.dateFormatted && commitInfo.dateFromNow
					? `${commitInfo.dateFromNow} (${commitInfo.dateFormatted})`
					: "";
			mdString.appendMarkdown(
				`![headshot](${commitInfo.gravatarUrl}) ${authorString} ${dateString}`
			);
			mdString.appendText("\n\n");
			mdString.appendMarkdown(`<${commitInfo.authorEmail}>`);
		}
		mdString.appendText("\n\n");
		if (!commitInfo.sha || commitInfo.sha.length === 0 || commitInfo.sha.match(/0{40}/)) {
			mdString.appendText("Working Tree");
		} else {
			mdString.appendMarkdown("$(git-commit)");
			mdString.appendText(` ${commitInfo.sha.slice(0, 7)}`);
			mdString.appendText("\n\n");
			mdString.appendText(commitInfo.summary);
		}
		commitInfo.prs.forEach((pr: { id: string; providerId: string; title: string; url: string }) => {
			mdString.appendText("\n\n");
			mdString.appendMarkdown(
				`[$(git-pull-request) ${
					pr.title
				} $(link-external)](command:codestream.openPullRequest?${encodeURIComponent(
					JSON.stringify({
						providerId: pr.providerId,
						pullRequestId: pr.id,
						externalUrl: pr.url
					})
				)})`
			);
		});
		commitInfo.reviews.forEach(review => {
			mdString.appendText("\n\n");
			mdString.appendMarkdown(
				`[$(file-code) ${review.title}](command:codestream.openReview?${encodeURIComponent(
					JSON.stringify({
						...commandArgs,
						reviewId: review.id
					})
				)})`
			);
		});
		// if (commitInfo.diff && commitInfo.diff.length > 0) {
		// 	mdString.appendText("\n\n");
		// 	mdString.appendMarkdown("***");
		// 	mdString.appendText("\n\n");
		// 	mdString.appendCodeblock(commitInfo.diff, "diff");
		// }
		mdString.appendText("\n\n");
		mdString.appendMarkdown("***");
		mdString.appendText("\n\n");
		mdString.appendMarkdown(
			`[Add comment](command:codestream.newComment?${encodeURIComponent(
				JSON.stringify(commandArgs)
			)})`
		);
		mdString.appendMarkdown(
			` · [Create issue](command:codestream.newIssue?${encodeURIComponent(
				JSON.stringify(commandArgs)
			)})`
		);
		mdString.appendMarkdown(
			` · [Share permalink](command:codestream.newPermalink?${encodeURIComponent(
				JSON.stringify(commandArgs)
			)})`
		);
		return mdString;
	}
}
