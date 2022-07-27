import * as assert from "assert";
import { InstrumentationCodeLensProvider } from "../../providers/instrumentationCodeLensProvider";
import sinon, { SinonSpy } from "sinon";

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
	let stubbedExtension: sinon.SinonStub | undefined;
	let stubbedConfig: sinon.SinonStub | undefined;

	teardown(function() {
		stubbedExtension?.restore();
		stubbedConfig?.restore();
	});

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

		stubbedExtension = sinon.stub(vscode.extensions, "getExtension").returns((<
			Partial<vscode.Extension<any>>
		>{
			id: "ms-python.vscode-pylance",
			isActive: true
		}) as vscode.Extension<any>);

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

		stubbedExtension = sinon.stub(vscode.extensions, "getExtension").returns((<
			Partial<vscode.Extension<any>>
		>{
			id: "ms-python.vscode-pylance",
			isActive: true
		}) as vscode.Extension<any>);

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

	test("NO_PYTHON_VSCODE_EXTENSION", async () => {
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
			documentFactory("app.py", "app.py", "python"),
			new CancellationTokenSource().token
		);
		assert.strictEqual(codeLenses.length, 1);
		assert.strictEqual(codeLenses[0].command!.title!.indexOf("Click to configure") > -1, true);
		assert.strictEqual(
			codeLenses[0].command!.tooltip,
			"To see code-level metrics you'll need to install one of the following extensions for VS Code..."
		);
		const args = JSON.parse(codeLenses[0].command?.arguments![0]);

		assert.strictEqual(args.error.type, "NO_PYTHON_VSCODE_EXTENSION");
	});

	test("NO_CSHARP_VSCODE_EXTENSION", async () => {
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
			documentFactory("Controller.cs", "Controller.cs", "csharp"),
			new CancellationTokenSource().token
		);
		assert.strictEqual(codeLenses.length, 1);
		assert.strictEqual(codeLenses[0].command!.title!.indexOf("Click to configure") > -1, true);
		assert.strictEqual(
			codeLenses[0].command!.tooltip,
			"To see code-level metrics you'll need to install one of the following extensions for VS Code..."
		);
		const args = JSON.parse(codeLenses[0].command?.arguments![0]);

		assert.strictEqual(args.error.type, "NO_CSHARP_VSCODE_EXTENSION");
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
		const args = JSON.parse(codeLenses[0].command?.arguments![0]);

		assert.strictEqual(args.error.type, "NO_RUBY_VSCODE_EXTENSION");
	});

	test("RUBY_PLUGIN_NO_LANGUAGE_SERVER", async () => {
		const observabilityService = {
			getFileLevelTelemetry: function(
				filePath: string,
				languageId: string,
				resetCache?: boolean,
				locator?: FunctionLocator,
				options?: FileLevelTelemetryRequestOptions | undefined
			): Promise<GetFileLevelTelemetryResponse> {
				return new Promise(resolve => {});
			}
		};

		const provider = new InstrumentationCodeLensProvider(
			"anythingHere",
			new MockSymbolLocator(),
			observabilityService,
			{ track: function() {} } as any
		);

		const mockGetConfig: Partial<vscode.WorkspaceConfiguration> = {
			get: (section: string) => {
				return false;
			}
		};

		stubbedExtension = sinon.stub(vscode.extensions, "getExtension").returns((<
			Partial<vscode.Extension<any>>
		>{
			id: "rebornix.Ruby",
			isActive: true
		}) as vscode.Extension<any>);

		stubbedConfig = sinon
			.stub(vscode.workspace, "getConfiguration")
			.returns(mockGetConfig as vscode.WorkspaceConfiguration);

		const codeLenses = await provider.provideCodeLenses(
			documentFactory("agents_controller.rb", "agents_controller.rb", "ruby"),
			new CancellationTokenSource().token
		);
		assert.strictEqual(codeLenses.length, 1);
		assert.strictEqual(
			codeLenses[0].command!.title!,
			"Click to configure golden signals from New Relic"
		);
		const args = JSON.parse(codeLenses[0].command?.arguments![0]);

		assert.strictEqual(args.error.type, "RUBY_PLUGIN_NO_LANGUAGE_SERVER");
	});

	test("NO_JAVA_VSCODE_EXTENSION", async () => {
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
			documentFactory("Controller.java", "Controller.java", "java"),
			new CancellationTokenSource().token
		);
		assert.strictEqual(codeLenses.length, 1);
		assert.strictEqual(codeLenses[0].command!.title!.indexOf("Click to configure") > -1, true);
		assert.strictEqual(
			codeLenses[0].command!.tooltip,
			"To see code-level metrics you'll need to install one of the following extensions for VS Code..."
		);
		const args = JSON.parse(codeLenses[0].command?.arguments![0]);

		assert.strictEqual(args.error.type, "NO_JAVA_VSCODE_EXTENSION");
	});

	test("NO_SPANS", async () => {
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
						relativeFilePath: "/hello/agents_controller.rb",
						newRelicAccountId: 1,
						newRelicEntityGuid: "123",
						newRelicEntityAccounts: [] as any,
						codeNamespace: "fooNamespace",
						averageDuration: []
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

		const mockGetConfig: Partial<vscode.WorkspaceConfiguration> = {
			get: (section: string) => {
				return true;
			}
		};

		stubbedExtension = sinon.stub(vscode.extensions, "getExtension").returns((<
			Partial<vscode.Extension<any>>
		>{
			id: "rebornix.Ruby",
			isActive: true
		}) as vscode.Extension<any>);

		stubbedConfig = sinon
			.stub(vscode.workspace, "getConfiguration")
			.returns(mockGetConfig as vscode.WorkspaceConfiguration);

		const codeLenses = await provider.provideCodeLenses(
			documentFactory("agents_controller.rb", "agents_controller.rb", "ruby"),
			new CancellationTokenSource().token
		);
		assert.strictEqual(codeLenses.length, 1);
		assert.strictEqual(
			codeLenses[0].command!.title!,
			"No golden signal metrics found for this file"
		);
		// console.info("***+++---=== codeLenses[0].command?.arguments![0] " + codeLenses[0].command?.arguments![0]);
		const args = JSON.parse(codeLenses[0].command?.arguments![0]);

		assert.strictEqual(args.error.type, "NO_SPANS");
	});
});
