import * as assert from "assert";
import { InstrumentationCodeLensProvider } from "../../providers/instrumentationCodeLensProvider";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { InstrumentableSymbol, ISymbolLocator, SymbolLocator } from "../../providers/symbolLocator";
import { CancellationTokenSource } from "vscode-languageclient";
import {
	FileLevelTelemetryRequestOptions,
	FunctionLocator,
	GetFileLevelTelemetryResponse
} from "@codestream/protocols/agent";

class MockSymbolLocator implements ISymbolLocator {
	locate(
		document: vscode.TextDocument,
		token: vscode.CancellationToken
	): Promise<InstrumentableSymbol[]> {
		return new Promise(resolve => {
			resolve([
				new InstrumentableSymbol(
					new vscode.DocumentSymbol(
						"hello_world",
						"",
						vscode.SymbolKind.Function,
						new vscode.Range(new vscode.Position(0, 0), new vscode.Position(1, 1)),
						new vscode.Range(new vscode.Position(0, 0), new vscode.Position(1, 1))
					),
					undefined
				)
			]);
		});
	}
}

const documentFactory = (
	url: string,
	fileName: string,
	languageId: string
): vscode.TextDocument => {
	return {
		uri: vscode.Uri.parse(url, false),
		fileName: fileName,
		languageId: languageId,
		version: 0
	} as any;
};

suite("InstrumentationCodeLensProvider Test Suite", () => {
	test("Smoke test", async () => {
		const observabilityService = {
			getFileLevelTelemetry: function(
				filePath: string,
				languageId: string,
				resetCache?: boolean,
				locator?: FunctionLocator,
				options?: FileLevelTelemetryRequestOptions | undefined
			): Promise<GetFileLevelTelemetryResponse> {
				return new Promise(resolve => {
					return resolve({
						repo: {
							id: "123",
							name: "repo",
							remote: "remote"
						},
						relativeFilePath: "/hello/foo.py",
						newRelicAccountId: 1,
						newRelicEntityGuid: "123",
						newRelicEntityAccounts: [] as any,
						codeNamespace: "fooNamespace",
						averageDuration: [
							{
								functionName: "hello_world",
								averageDuration: 3.333,
								metricTimesliceName: "d"
							}
						]
					} as GetFileLevelTelemetryResponse);
				});
			}
		};

		const provider = new InstrumentationCodeLensProvider(
			"avg duration: ${averageDuration} | throughput: ${throughput} | error rate: ${errorsPerMinute} - since ${since}",
			new MockSymbolLocator(),
			observabilityService,
			{ track: function() {} } as any
		);

		const codeLenses = await provider.provideCodeLenses(
			documentFactory("app.py", "app.py", "python"),
			new CancellationTokenSource().token
		);
		assert.strictEqual(codeLenses.length, 1);
		assert.strictEqual(codeLenses[0].command!.title!.indexOf("3.33") > -1, true);
	});

	test("NOT_ASSOCIATED", async () => {
		const observabilityService = {
			getFileLevelTelemetry: function(
				filePath: string,
				languageId: string,
				resetCache?: boolean,
				locator?: FunctionLocator,
				options?: FileLevelTelemetryRequestOptions | undefined
			): Promise<GetFileLevelTelemetryResponse> {
				return new Promise(resolve => {
					return resolve({
						repo: {
							id: "123",
							name: "repo",
							remote: "remote"
						},
						relativeFilePath: "/hello/foo.py",
						newRelicAccountId: 1,
						newRelicEntityGuid: "123",
						newRelicEntityAccounts: [] as any,
						codeNamespace: "fooNamespace",
						error: {
							type: "NOT_ASSOCIATED"
						}
					} as GetFileLevelTelemetryResponse);
				});
			}
		};

		const provider = new InstrumentationCodeLensProvider(
			"anythingHere",
			new MockSymbolLocator(),
			observabilityService,
			{ track: function() {} } as any
		);

		const codeLenses = await provider.provideCodeLenses(
			documentFactory("app.py", "app.py", "python"),
			new CancellationTokenSource().token
		);
		assert.strictEqual(codeLenses.length, 1);
		assert.strictEqual(codeLenses[0].command!.title!.includes("Click to configure"), true);
		assert.strictEqual(
			codeLenses[0].command!.tooltip,
			"Associate this repository with an entity from New Relic so that you can see golden signals right in your editor"
		);
	});

	test("NO_RUBY_VSCODE_EXTENSION", async () => {
		const observabilityService = {
			getFileLevelTelemetry: function(
				filePath: string,
				languageId: string,
				resetCache?: boolean,
				locator?: FunctionLocator,
				options?: FileLevelTelemetryRequestOptions | undefined
			): Promise<GetFileLevelTelemetryResponse> {
				return new Promise(resolve => {
					return resolve({} as GetFileLevelTelemetryResponse);
				});
			}
		};

		const provider = new InstrumentationCodeLensProvider(
			"anythingHere",
			new MockSymbolLocator(),
			observabilityService,
			{ track: function() {} } as any
		);

		const codeLenses = await provider.provideCodeLenses(
			documentFactory("agents_controller.rb", "agents_controller.rb", "ruby"),
			new CancellationTokenSource().token
		);
		assert.strictEqual(codeLenses.length, 1);
		assert.strictEqual(codeLenses[0].command!.title!.indexOf("Click to configure") > -1, true);
		assert.strictEqual(
			codeLenses[0].command!.tooltip,
			"To see code-level metrics you'll need to install one of the following extensions for VS Code..."
		);
	});
});
