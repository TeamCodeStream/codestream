import { EntityTypeMap, GetEditorEntityGuidsRequestType } from "@codestream/protocols/agent";
import {
	DecorationOptions,
	Disposable,
	MarkdownString,
	OverviewRulerLane,
	Range,
	TextEditorDecorationType,
	window,
	workspace
} from "vscode";
import { CodeStreamAgentConnection } from "../agent/agentConnection";
import { CodeStreamSession, SessionStatus, SessionStatusChangedEvent } from "../api/session";
import { Logger } from "../logger";
import { Functions } from "../system";
import { ExecuteLogCommandArgs, ExecuteNrqlCommandArgs } from "../commands";

export class EntityEditorDecorationProvider implements Disposable {
	private _isEnabled: boolean = false;
	private _entityGuidDecorationType: TextEditorDecorationType | undefined = undefined;

	private _disposable: Disposable | undefined;
	private _sessionDisposable: Disposable | undefined;
	private _activeEditor = window.activeTextEditor;

	constructor(
		private agent: CodeStreamAgentConnection,
		private session: CodeStreamSession
	) {
		this._entityGuidDecorationType = window.createTextEditorDecorationType({
			overviewRulerColor: "#1de783",
			overviewRulerLane: OverviewRulerLane.Right,
			textDecoration: "underline dashed",
			light: {
				textDecoration: "underline dashed"
			},
			dark: {
				textDecoration: "underline dashed"
			}
		});
		this._disposable = Disposable.from(
			this._entityGuidDecorationType,
			this.session.onDidChangeSessionStatus(this.onSessionStatusChanged, this)
		);
	}

	private onSessionStatusChanged(e: SessionStatusChangedEvent) {
		switch (e.getStatus()) {
			case SessionStatus.SignedOut:
				this._isEnabled = false;

				window.visibleTextEditors.forEach(editor => {
					editor.setDecorations(this._entityGuidDecorationType!, []);
				});
				this._sessionDisposable?.dispose();

				break;

			case SessionStatus.SignedIn: {
				this._isEnabled = true;
				this._sessionDisposable = Disposable.from(
					window.onDidChangeActiveTextEditor(editor => {
						this._activeEditor = editor;
						if (editor) {
							this.updateDecorations();
						}
					}),
					workspace.onDidSaveTextDocument(document => {
						if (this._activeEditor && document === this._activeEditor.document) {
							this.updateDecorations();
						}
					})
				);
				this.updateDecorations();
				break;
			}
		}
	}

	/**
	 * Update the decorations for the active editor
	 *
	 * note: this is debounced to avoid updating the decorations too frequently
	 */
	updateDecorations = Functions.debounce(
		() => {
			if (this._activeEditor) {
				this._updateDecorations();
			}
		},
		100,
		{
			leading: false,
			trailing: true
		}
	);

	private async _updateDecorations() {
		if (!this._isEnabled || !window.activeTextEditor) {
			if (window.activeTextEditor && this._entityGuidDecorationType) {
				window.activeTextEditor.setDecorations(this._entityGuidDecorationType, []);
			}
			return;
		}

		const decorations: DecorationOptions[] = [];
		try {
			const response = await this.agent.sendRequest(GetEditorEntityGuidsRequestType, {
				documentUri: window.activeTextEditor.document.uri.toString(true)
			});

			if (response?.items?.length) {
				for (const item of response.items) {
					let nrqlArgs: ExecuteNrqlCommandArgs | undefined = undefined;
					const logArgs: ExecuteLogCommandArgs = {
						entity: item.entity,
						entityTypeDescription: item.entity.entityType
							? EntityTypeMap[item.entity.entityType]
							: "",
						entryPoint: "entity_guid_finder",
						ignoreSearch: true
					};
					if (
						item.entity?.goldenMetrics?.metrics?.length &&
						item.entity?.goldenMetrics?.metrics[0].query
					) {
						nrqlArgs = {
							accountId: item.entity.accountId,
							entryPoint: "entity_guid_finder",
							fileUri: window.activeTextEditor.document.uri,
							text: item.entity.goldenMetrics?.metrics[0].query
						};
					}
					let hoverMessage: MarkdownString | undefined = undefined;
					if (item.markdownString) {
						let markdownLinks = [];
						if (nrqlArgs) {
							markdownLinks.push(
								`[__NRQL__](command:codestream.executeNrql?${encodeURIComponent(
									JSON.stringify(nrqlArgs)
								)})`
							);
						}
						if (logArgs) {
							markdownLinks.push(
								`[__Logs__](command:codestream.logSearch?${encodeURIComponent(
									JSON.stringify(logArgs)
								)})`
							);
						}
						hoverMessage = new MarkdownString(
							item.markdownString +
								(markdownLinks.length > 0 ? "\n\n" + markdownLinks.join(" | ") : ""),
							true
						);
						hoverMessage.isTrusted = true;
					}
					const decoration = {
						range: new Range(
							window.activeTextEditor.document.positionAt(item.range.start),
							window.activeTextEditor.document.positionAt(item.range.end)
						),
						hoverMessage: hoverMessage
					};
					decorations.push(decoration);
				}
				window.activeTextEditor.setDecorations(this._entityGuidDecorationType!, decorations);
			}
			if (decorations.length === 0) {
				window.activeTextEditor.setDecorations(this._entityGuidDecorationType!, []);
			}
		} catch (ex) {
			Logger.warn("Error updating decorations", { error: ex });
		}
	}

	dispose() {
		this._disposable?.dispose();
		this._sessionDisposable?.dispose();
	}
}
