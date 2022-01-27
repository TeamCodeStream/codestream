import * as assert from "assert";
import * as vscode from "vscode";
import { SymbolLocator } from "../../providers/symbolLocator";
import { CancellationTokenSource } from "vscode-languageclient";

suite("SymbolLocator Test Suite", () => {
	test("python codeLens test", async () => {
		return new Promise(async resolve => {
			// we require this extension
			await vscode.commands.executeCommand(
				"workbench.extensions.installExtension",
				"ms-python.python"
			);

			const uri = vscode.Uri.parse(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/app.py`);

			// why do we need both of these? the world will never know...
			await vscode.commands.executeCommand("vscode.open", uri);
			const document = await vscode.workspace.openTextDocument(uri);

			const result = await new SymbolLocator().locate(
				document,
				new CancellationTokenSource().token
			);

			assert.strictEqual(result.length, 9);
			resolve();
		});
	}).timeout(45000);
});
