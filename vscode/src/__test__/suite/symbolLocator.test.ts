import * as assert from "assert";
import * as p from "path";

import * as vscode from "vscode";
import { CancellationTokenSource } from "vscode-languageclient";

import { SymbolLocator } from "../../providers/symbolLocator";

suite("SymbolLocator Test Suite", () => {
	test("python codeLens test", async () => {
		// we require this extension
		await vscode.commands.executeCommand(
			"workbench.extensions.installExtension",
			"ms-python.python"
		);

		const uri = vscode.Uri.parse(
			p.join(vscode.workspace.workspaceFolders![0].uri.toString(), `app.py`)
		);

		const document = await vscode.workspace.openTextDocument(uri);

		const result = await new SymbolLocator().locate(document, new CancellationTokenSource().token);

		assert.strictEqual(result.instrumentableSymbols.length, 9);
	}).timeout(45000);

	test("flask: python codeLens test", async () => {
		// we require this extension
		await vscode.commands.executeCommand(
			"workbench.extensions.installExtension",
			"ms-python.python"
		);

		const uri = vscode.Uri.parse(
			p.join(vscode.workspace.workspaceFolders![0].uri.toString(), `flask.py`)
		);

		const document = await vscode.workspace.openTextDocument(uri);

		const result = await new SymbolLocator().locate(document, new CancellationTokenSource().token);
		// console.log(JSON.stringify(result, null, 4));
		assert.strictEqual(result.instrumentableSymbols.length, 1);
	}).timeout(45000);
});
