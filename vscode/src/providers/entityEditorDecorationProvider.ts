import {
	EntityGuidToken,
	GetEditorEntityGuidsRequestType
} from "@codestream/protocols/agent";
import {
	ConfigurationChangeEvent,
	DecorationOptions,
	Disposable,
	MarkdownString,
	OverviewRulerLane,
	Range,
	TextEditor,
	TextEditorDecorationType,
	window,
	workspace
} from "vscode";
import { CodeStreamAgentConnection } from "../agent/agentConnection";
import { CodeStreamSession, SessionStatus, SessionStatusChangedEvent } from "../api/session";
import { ExecuteLogCommandArgs, ExecuteNrqlCommandArgs } from "../commands";
import { Config, Configuration } from "../configuration";
import { Logger } from "../logger";
import { Functions } from "../system";

const CONFIGURATION_NAME = "highlightEntityGuids";

export class EntityEditorDecorationProvider implements Disposable {
	private _isEnabled: boolean = false;
	private _entityGuidDecorationType: TextEditorDecorationType | undefined = undefined;

	private _disposable: Disposable | undefined;
	private _sessionDisposable: Disposable | undefined;
	private _activeEditor = window.activeTextEditor;
	private _status: SessionStatus | undefined = undefined;

	constructor(
		private agent: CodeStreamAgentConnection,
		private session: CodeStreamSession,
		private configuration: Configuration,
		// needs to be a function to avoid stale data (and don't want to use Container in this file)
		private configLocator: () => Config
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
			this.session.onDidChangeSessionStatus(this.onSessionStatusChanged, this),
			configuration.onDidChange((...args) => this.onConfigurationChanged(...args), this)
		);
	}

	/**
	 * Update the decorations for the active editor
	 *
	 * note: this is debounced to avoid updating the decorations too frequently
	 */
	updateDecorations = Functions.debounce(
		() => {
			this._updateDecorations();
		},
		100,
		{
			leading: false,
			trailing: true
		}
	);

	private async _updateDecorations() {
		const decorations: DecorationOptions[] = [];

		try {
			if (!this._isEnabled || !window.activeTextEditor) {
				if (window.activeTextEditor && this._entityGuidDecorationType) {
					window.activeTextEditor.setDecorations(this._entityGuidDecorationType, decorations);
				}
				return;
			}

			const response = await this.agent.sendRequest(GetEditorEntityGuidsRequestType, {
				documentUri: window.activeTextEditor.document.uri.toString(true)
			});

			if (!response?.items?.length) {
				return;
			}

			for (const entityGuidToken of response.items) {
				decorations.push({
					range: new Range(
						window.activeTextEditor.document.positionAt(entityGuidToken.range.start),
						window.activeTextEditor.document.positionAt(entityGuidToken.range.end)
					),
					hoverMessage: this.buildHoverMessage(window.activeTextEditor, entityGuidToken)
				});
			}

			window.activeTextEditor.setDecorations(this._entityGuidDecorationType!, decorations);
		} catch (ex) {
			Logger.warn("EntityEditorDecorationProvider: Error updating decorations", { error: ex });
		}
	}

	private buildHoverMessage(
		activeTextEditor: TextEditor,
		item: EntityGuidToken
	): MarkdownString | undefined {
		if (!item || !item.markdownString) {
			return undefined;
		}

		const markdownLinks = [];
		if (
			activeTextEditor &&
			item.entity?.goldenMetrics?.metrics?.length &&
			item.entity?.goldenMetrics?.metrics[0] &&
			item.entity?.goldenMetrics?.metrics[0].query
		) {
			markdownLinks.push(
				`[__NRQL__](command:codestream.executeNrql?${encodeURIComponent(
					JSON.stringify({
						accountId: item.entity.accountId,
						entryPoint: "entity_guid_finder",
						// used for the hash
						fileUri: activeTextEditor.document.uri,
						// text is the nrql query
						text: item.entity.goldenMetrics?.metrics[0].query
					} as ExecuteNrqlCommandArgs)
				)})`
			);
		}

		markdownLinks.push(
			`[__Logs__](command:codestream.logSearch?${encodeURIComponent(
				JSON.stringify({
					entityGuid: item.entity.guid,
					entryPoint: "entity_guid_finder",
					ignoreSearch: true
				} as ExecuteLogCommandArgs)
			)})`
		);

		const hoverMessage = new MarkdownString(
			item.markdownString + (markdownLinks.length > 0 ? "\n\n" + markdownLinks.join(" | ") : ""),
			true
		);
		hoverMessage.isTrusted = true;

		return hoverMessage;
	}

	private onConfigurationChanged(e: ConfigurationChangeEvent) {
		if (this.configuration.changed(e, this.configuration.name(CONFIGURATION_NAME).value)) {
			if (this.configLocator().highlightEntityGuids) {
				this.ensure();
			} else {
				this.disable();
			}
		}
	}

	private disable() {
		try {
			window.visibleTextEditors.forEach(editor => {
				editor.setDecorations(this._entityGuidDecorationType!, []);
			});
			this._sessionDisposable?.dispose();
			this._isEnabled = false;
		} catch (ex) {
			Logger.error(ex, "EntityEditorDecorationProvider.disable");
		}
	}

	private ensure() {
		try {
			if (!(this.configLocator().highlightEntityGuids && this._status === SessionStatus.SignedIn)) {
				return;
			}

			this._sessionDisposable?.dispose();

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
			this._isEnabled = true;
			this.updateDecorations();
		} catch (ex) {
			Logger.error(ex, "EntityEditorDecorationProvider.ensure");
		}
	}

	private onSessionStatusChanged(e: SessionStatusChangedEvent) {
		this._status = e.getStatus();
		switch (this._status) {
			case SessionStatus.SignedOut:
				this.disable();
				break;

			case SessionStatus.SignedIn: {
				this.ensure();
				break;
			}
		}
	}

	dispose() {
		this._disposable?.dispose();
		this._sessionDisposable?.dispose();
	}
}
