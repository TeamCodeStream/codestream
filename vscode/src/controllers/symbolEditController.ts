import { SymbolLocator } from "providers/symbolLocator";
import {
	EditorCopySymbolRequest,
	EditorCopySymbolResponse,
	EditorReplaceSymbolRequest,
	EditorReplaceSymbolResponse
} from "@codestream/protocols/webview";
import { Editor } from "extensions";
import { Uri, commands, Range } from "vscode";
import { CancellationTokenSource } from "vscode-languageclient";
import { BuiltInCommands } from "../constants";
import { Logger } from "logger";

const symbolLocator = new SymbolLocator();

export async function copySymbol(
	params: EditorCopySymbolRequest
): Promise<EditorCopySymbolResponse> {
	try {
		const editor = await Editor.findOrOpenEditor(Uri.parse(params.uri));
		if (!editor?.document) {
			return { success: false };
		}
		const symbols = await symbolLocator.locate(
			editor?.document,
			new CancellationTokenSource().token
		);
		const fullList = [...symbols.allSymbols, ...symbols.instrumentableSymbols.map(s => s.symbol)];
		for (const symbol of fullList) {
			// Strip () out of method name .i.e getVets() becomes getVets
			const simpleSymbolName = symbol.name.replace(/\(.*?\)$/, "");
			if (simpleSymbolName === params.symbolName) {
				// Logger.warn(`Found symbol ${JSON.stringify(symbol)}`);
				const theText = editor.document.getText(symbol.range);
				return {
					success: true,
					text: theText,
					range: symbol.range
				};
			}
		}
		return {
			success: false
		};
	} catch (ex) {
		// TODO fix vscode error logging (logs errors as {})
		if (ex instanceof Error) {
			Logger.warn(`copySymbol failed`, { message: ex.message, stack: ex.stack });
		} else {
			Logger.warn(`copySymbol failed`, { error: ex });
		}

		return {
			success: false
		};
	}
}

export async function replaceSymbol(
	params: EditorReplaceSymbolRequest
): Promise<EditorReplaceSymbolResponse> {
	try {
		const uri = Uri.parse(params.uri);
		const editor = await Editor.findOrOpenEditor(uri);
		if (!editor?.document) {
			return { success: false };
		}
		const symbols = await symbolLocator.locate(
			editor?.document,
			new CancellationTokenSource().token
		);
		const targetSymbol = symbols.allSymbols.find(s => s.name === params.symbolName);
		if (!targetSymbol) {
			return {
				success: false
			};
		}
		await editor.edit(builder => {
			builder.replace(targetSymbol.range, params.codeBlock);
		});
		// grap the updated symbol to get the range for formatting
		const updatedSymbols = await symbolLocator.locate(
			editor?.document,
			new CancellationTokenSource().token
		);
		const updatedTargetSymbol = updatedSymbols.allSymbols.find(s => s.name === params.symbolName);
		if (!updatedTargetSymbol) {
			// we still win but not formatted?
			return {
				success: true
			};
		}
		await Editor.selectRange(editor.document.uri, updatedTargetSymbol.range, undefined, {
			preserveFocus: false
		});
		await commands.executeCommand(BuiltInCommands.IndentSelection);
		await commands.executeCommand(BuiltInCommands.FormatSelection);
		// Undo the highlight done by the stack trace error jump
		await Editor.highlightRange(uri, updatedTargetSymbol.range, undefined, true);
		await Editor.selectRange(
			editor.document.uri,
			new Range(updatedTargetSymbol.range.start, updatedTargetSymbol.range.start),
			undefined,
			{}
		);
		await editor.document.save();
		return {
			success: true
		};
	} catch (ex) {
		// TODO fix vscode error logging (logs errors as {})
		if (ex instanceof Error) {
			Logger.warn(`replaceSymbol failed`, { message: ex.message, stack: ex.stack });
		} else {
			Logger.warn(`replaceSymbol failed`, { error: ex });
		}
		return {
			success: false
		};
	}
}
