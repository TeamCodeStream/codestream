"use strict";
/**
Portions adapted from https://github.com/eamodio/vscode-gitlens/blob/6b341c5ae6bea67f9aefc573d89bbe3e3f1d0776/src/constants.ts which carries this notice:

The MIT License (MIT)

Copyright (c) 2016-2021 Eric Amodio

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/**
 * Modifications Copyright CodeStream Inc. under the Apache 2.0 License (Apache-2.0)
 */
export const extensionId = "codestream";
export const extensionOutputChannelName = "CodeStream";
export const extensionQualifiedId = `CodeStream.${extensionId}`;

export enum BuiltInCommands {
	CloseActiveEditor = "workbench.action.closeActiveEditor",
	CloseAllEditors = "workbench.action.closeAllEditors",
	CursorMove = "cursorMove",
	Diff = "vscode.diff",
	EditorScroll = "editorScroll",
	ExecuteDocumentSymbolProvider = "vscode.executeDocumentSymbolProvider",
	ExecuteCodeLensProvider = "vscode.executeCodeLensProvider",
	GoToNextDiff = "workbench.action.compareEditor.nextChange",
	GoToPreviousDiff = "workbench.action.compareEditor.previousChange",
	GoToNextChangedFile = "codestream.showNextChangedFile",
	GoToPreviousChangedFile = "codestream.showPreviousChangedFile",
	IndentSelection = "editor.action.reindentselectedlines",
	FormatSelection = "editor.action.formatSelection",
	NextEditor = "workbench.action.nextEditor",
	Open = "vscode.open",
	PreviewHtml = "vscode.previewHtml",
	RevealLine = "revealLine",
	ReloadWindow = "workbench.action.reloadWindow",
	SetContext = "setContext",
	ShowCodeStream = "workbench.view.extension.codestream",
	ShowReferences = "editor.action.showReferences"
}
