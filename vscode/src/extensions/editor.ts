"use strict";
import { EditorMetrics, EditorSelection } from "@codestream/protocols/webview";
import {
	commands,
	DecorationRangeBehavior,
	Position,
	Range,
	Selection,
	TextDocumentShowOptions,
	TextEditor,
	TextEditorRevealType,
	Uri,
	ViewColumn,
	window,
	workspace
} from "vscode";
import { Position as LspPosition, Range as LspRange } from "vscode-languageclient";
import { configuration } from "../configuration";
import { BuiltInCommands } from "../constants";
import { Container } from "../container";
import { Logger } from "../logger";

const highlightDecorationType = window.createTextEditorDecorationType({
	rangeBehavior: DecorationRangeBehavior.OpenOpen,
	backgroundColor: "rgba(127, 127, 127, 0.4)"
});

export namespace Editor {
	export function findEditor(uri: Uri, lastActive?: TextEditor): TextEditor | undefined {
		const normalizedUri = uri.toString(false);

		let e = window.activeTextEditor;
		if (e !== undefined && e.document.uri.toString(false) === normalizedUri) {
			return e;
		}

		let found;
		for (e of window.visibleTextEditors) {
			// Prioritize the last active window over other visible ones
			if (e === lastActive && e.document.uri.toString(false) === normalizedUri) {
				return e;
			}

			if (e.document.uri.toString(false) === normalizedUri) {
				found = e;
			}
		}

		return found;
	}

	export async function findOrOpenEditor(
		uri: Uri,
		options: TextDocumentShowOptions & { rethrow?: boolean } = {},
		lastActive?: TextEditor
	): Promise<TextEditor | undefined> {
		const e = findEditor(uri, lastActive);
		if (e !== undefined) {
			if (!options.preserveFocus) {
				await window.showTextDocument(e.document, { ...options, viewColumn: e.viewColumn });
			}

			return e;
		}

		// FYI, this doesn't always work, see https://github.com/Microsoft/vscode/issues/56097
		let column = Container.webview.viewColumn as number | undefined;

		// If we have a last active view column and it isn't the same as the webview's, then use it
		if (
			lastActive !== undefined &&
			lastActive.viewColumn !== undefined &&
			lastActive.viewColumn !== column
		) {
			column = lastActive.viewColumn;
		} else if (column !== undefined) {
			column--;
			if (column <= 0) {
				column = undefined;
			}
		}

		return openEditor(uri, { viewColumn: column, ...options });
	}

	export function getActiveOrVisible(active?: TextEditor, lastActive?: TextEditor) {
		const editor = active || window.activeTextEditor;
		if (editor !== undefined && Editor.isTextEditor(editor)) {
			return editor;
		}

		if (window.visibleTextEditors.length !== 0) {
			let firstValid;

			for (const e of window.visibleTextEditors) {
				if (Editor.isTextEditor(e)) {
					if (firstValid === undefined) {
						firstValid = e;
					}
				}

				if (e === lastActive) return e;
			}

			return firstValid;
		}

		return undefined;
	}

	export function getMetrics(activeFile: Uri): EditorMetrics {
		const metrics: EditorMetrics = {};

		const lineHeight = configuration.getAny<number | undefined>("editor.lineHeight");
		metrics.lineHeight = lineHeight === 0 ? undefined : lineHeight;

		const fontSize = configuration.getAny<number | undefined>("editor.fontSize");
		metrics.fontSize = fontSize;

		const breadcrumbs = configuration.getAny<boolean>("breadcrumbs.enabled", undefined, false);
		// if you are doing a codestream diff then you can add a comment in the
		// right pane, but VS Code does not show a breadcrumb, so we don't want to
		// add 22px in that scenario. but if breadcrumbs are on and you aren't doing
		// a CS diff, then the margins are approx. 22px high
		if (breadcrumbs && !activeFile.scheme.startsWith("codestream-diff")) {
			metrics.margins = { top: 22 };
		}

		return metrics;
	}

	export async function highlightRange(
		uri: Uri,
		range: Range,
		lastActive: TextEditor | undefined,
		clear?: boolean
	): Promise<boolean> {
		if (clear) {
			// while removing, only do anything if the uri is already open. otherwise, vscode will clear the highlight
			const normalizedUri = uri.toString(false);
			for (const e of window.visibleTextEditors) {
				if (e.document.uri.toString(false) === normalizedUri) {
					e.setDecorations(highlightDecorationType, []);
				}
			}
			return true;
		}

		const editor = await findOrOpenEditor(uri, { preserveFocus: true }, lastActive);
		if (editor === undefined) return false;

		editor.setDecorations(highlightDecorationType, clear ? [] : [range]);
		// Don't reveal on highlight right now -- webview probably needs a flag to control this
		// editor.revealRange(range, TextEditorRevealType.Default);
		return true;
	}

	export function isTextEditor(editor: TextEditor): boolean {
		const scheme = editor.document.uri.scheme;
		return scheme !== "output" && scheme !== "debug";
	}

	export async function revealRange(
		uri: Uri,
		range: Range,
		lastActive: TextEditor | undefined,
		{ atTop, ...options }: TextDocumentShowOptions & { atTop?: boolean }
	): Promise<boolean> {
		const editor = await findOrOpenEditor(uri, { ...options }, lastActive);
		if (editor === undefined) return false;

		const revealType = atTop
			? TextEditorRevealType.AtTop
			: TextEditorRevealType.InCenterIfOutsideViewport;
		editor.revealRange(range, revealType);
		return true;
	}

	export async function selectRange(
		uri: Uri,
		range: Range,
		lastActive: TextEditor | undefined,
		options: TextDocumentShowOptions
	): Promise<boolean> {
		const editor = await findOrOpenEditor(uri, { ...options }, lastActive);
		if (editor === undefined) return false;

		editor.selection = new Selection(range.start, range.end);
		editor.revealRange(range, TextEditorRevealType.InCenterIfOutsideViewport);
		return true;
	}

	export async function scrollTo(
		uri: Uri,
		position: Position,
		lastActive: TextEditor | undefined,
		options: { atTop?: boolean } = {}
	): Promise<void> {
		const editor = findEditor(uri, lastActive);
		if (editor === undefined) return;

		const revealType = options.atTop
			? TextEditorRevealType.AtTop
			: TextEditorRevealType.InCenterIfOutsideViewport;
		editor.revealRange(new Range(position, position), revealType);
	}

	export async function openEditor(
		uri: Uri,
		options: TextDocumentShowOptions & { rethrow?: boolean } = {}
	): Promise<TextEditor | undefined> {
		const { rethrow, ...opts } = options;
		try {
			const document = await workspace.openTextDocument(uri);
			return window.showTextDocument(document, {
				preserveFocus: false,
				preview: true,
				viewColumn: ViewColumn.Active,
				...opts
			});
		} catch (ex) {
			const msg = ex.toString();
			if (msg.includes("File seems to be binary and cannot be opened as text")) {
				await commands.executeCommand(BuiltInCommands.Open, uri);
				return undefined;
			}

			if (rethrow) throw ex;

			Logger.error(ex, "openEditor");
			return undefined;
		}
	}

	// eslint-disable-next-line @typescript-eslint/array-type
	export function toEditorSelections(selections: ReadonlyArray<Selection>): EditorSelection[] {
		return selections.map(s => ({ cursor: s.active, start: s.start, end: s.end }));
	}

	export function fromSerializablePosition(position: LspPosition): Position {
		return new Position(position.line, position.character);
	}

	export function fromSerializableRange(range: LspRange, reverse?: boolean): Range;
	export function fromSerializableRange(ranges: LspRange[], reverse?: boolean): Range[];
	export function fromSerializableRange(
		ranges: LspRange | LspRange[],
		reverse?: boolean
	): Range | Range[] {
		if (!Array.isArray(ranges)) {
			return reverse
				? new Range(
						ranges.end.line,
						ranges.end.character,
						ranges.start.line,
						ranges.start.character
				  )
				: new Range(
						ranges.start.line,
						ranges.start.character,
						ranges.end.line,
						ranges.end.character
				  );
		}

		return ranges.map(r =>
			reverse
				? new Range(r.end.line, r.end.character, r.start.line, r.start.character)
				: new Range(r.start.line, r.start.character, r.end.line, r.end.character)
		);
	}

	export function toSerializableRange(range: Range, reverse?: boolean): LspRange;
	// eslint-disable-next-line @typescript-eslint/array-type
	export function toSerializableRange(ranges: ReadonlyArray<Range>, reverse?: boolean): LspRange[];
	export function toSerializableRange(
		// eslint-disable-next-line @typescript-eslint/array-type
		ranges: Range | ReadonlyArray<Range>,
		reverse?: boolean
	): LspRange | LspRange[] {
		if (!Array.isArray(ranges)) {
			return reverse
				? { start: (ranges as any).end, end: (ranges as any).start }
				: { start: (ranges as any).start, end: (ranges as any).end };
		}

		return ranges.map(r =>
			reverse ? { start: r.end, end: r.start } : { start: r.start, end: r.end }
		);
	}
}
