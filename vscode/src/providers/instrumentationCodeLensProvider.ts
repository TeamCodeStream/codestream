"use strict";

import { EventEmitter, extensions, TextDocument } from "vscode";
import * as vscode from "vscode";
import { Event, SymbolKind } from "vscode-languageclient";
import {
	FileLevelTelemetryRequestOptions,
	FunctionLocator,
	GetFileLevelTelemetryResponse
} from "@codestream/protocols/agent";

import {
	ViewMethodLevelTelemetryCommandArgs,
	ViewMethodLevelTelemetryErrorCommandArgs
} from "commands";
import { Strings } from "../system";
import { Logger } from "../logger";
import { InstrumentableSymbol, ISymbolLocator } from "./symbolLocator";
import { Container } from "../container";

function allEmpty(arrays: (any[] | undefined)[]) {
	for (const arr of arrays) {
		if (!isEmpty(arr)) {
			return false;
		}
	}
	return true;
}

function isEmpty(array: any[] | undefined) {
	if (!array) {
		return true;
	}
	return array.length === 0;
}

class ErrorCodeLens extends vscode.CodeLens {
	isErrorCodeLens = true;
}

export class InstrumentationCodeLensProvider implements vscode.CodeLensProvider {
	private documentManager: any = {};
	private resetCache: boolean = false;

	constructor(
		private codeLensTemplate: string,
		private symbolLocator: ISymbolLocator,
		private observabilityService: {
			getFileLevelTelemetry(
				fileUri: string,
				languageId: string,
				resetCache?: boolean,
				locator?: FunctionLocator,
				options?: FileLevelTelemetryRequestOptions | undefined
			): Promise<GetFileLevelTelemetryResponse>;
		},
		private telemetryService: { track: Function }
	) {
		Container.session.onDidChangeCodelenses(e => {
			this.resetCache = true;
			this._onDidChangeCodeLenses.fire();
		});
	}

	private _onDidChangeCodeLenses = new EventEmitter<void>();
	get onDidChangeCodeLenses(): Event<void> {
		return this._onDidChangeCodeLenses.event;
	}

	documentOpened(document: TextDocument) {
		this.documentManager[document.uri.toString()] = {
			document: document,
			tracked: false
		};
	}

	documentClosed(document: TextDocument) {
		delete this.documentManager[document.uri.toString()];
	}

	update(template: string) {
		this.codeLensTemplate = template;
		this.resetCache = true;
		this._onDidChangeCodeLenses.fire();
	}

	private checkRubyPlugin(): vscode.CodeLens[] | undefined {
		if (extensions.getExtension("Shopify.ruby-lsp")?.isActive) {
			const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("ruby"); // ruby.useLanguageServer
			const useLanguageServer = config.get("useLanguageServer");
			if (!useLanguageServer) {
				return this.rubyPluginConfigCodelens();
			}
			return;
		}

		if (extensions.getExtension("castwide.solargraph")?.isActive === true) {
			return;
		} else {
			return this.missingRubyExtensionCodelens();
		}
	}

	private checkPythonPlugin(): vscode.CodeLens[] | undefined {
		return extensions.getExtension("ms-python.python")?.isActive === true
			? undefined
			: this.missingPythonExtensionCodelens();
	}

	private checkJavaPlugin(): vscode.CodeLens[] | undefined {
		// At least for Java isActive is wildly inaccurate
		const extension = extensions.getExtension("redhat.java");
		return extension ? undefined : this.missingJavaExtensionCodelens();
	}

	private checkCsharpPlugin(): vscode.CodeLens[] | undefined {
		return extensions.getExtension("ms-dotnettools.csharp")?.isActive === true
			? undefined
			: this.missingCsharpExtensionCodelens();
	}

	private checkGoPlugin(): vscode.CodeLens[] | undefined {
		return extensions.getExtension("golang.go")?.isActive === true
			? undefined
			: this.missingGoExtensionCodelens();
	}

	private checkPhpPlugin(): vscode.CodeLens[] | undefined {
		return extensions.getExtension("bmewburn.vscode-intelephense-client")?.isActive === true
			? undefined
			: this.missingPhpExtensionCodelens();
	}

	private checkPlugin(languageId: string): vscode.CodeLens[] | undefined {
		switch (languageId) {
			case "ruby": {
				return this.checkRubyPlugin();
			}
			case "java": {
				return this.checkJavaPlugin();
			}
			case "python": {
				return this.checkPythonPlugin();
			}
			case "csharp": {
				return this.checkCsharpPlugin();
			}
			case "go": {
				return this.checkGoPlugin();
			}
			case "php": {
				return this.checkPhpPlugin();
			}
		}
		return undefined;
	}

	private rubyPluginConfigCodelens(newRelicAccountId?: number): vscode.CodeLens[] {
		return this.errorCodelens(
			"RUBY_PLUGIN_NO_LANGUAGE_SERVER",
			"ruby",
			"Click to configure code-level metrics from New Relic",
			"To see code-level metrics you'll need to configure the extension for VS Code...",
			newRelicAccountId
		);
	}

	private noSpanCodelens(languageId: string): vscode.CodeLens[] {
		return this.errorCodelens("NO_SPANS", languageId, "No code-level metrics found for this file");
	}

	private missingRubyExtensionCodelens(newRelicAccountId?: number): vscode.CodeLens[] {
		return this.errorCodelens(
			"NO_RUBY_VSCODE_EXTENSION",
			"ruby",
			"Click to configure code-level metrics from New Relic",
			"To see code-level metrics you'll need to install one of the following extensions for VS Code...",
			newRelicAccountId
		);
	}

	private missingPythonExtensionCodelens(newRelicAccountId?: number): vscode.CodeLens[] {
		return this.errorCodelens(
			"NO_PYTHON_VSCODE_EXTENSION",
			"python",
			"Click to configure code-level metrics from New Relic",
			"To see code-level metrics you'll need to install one of the following extensions for VS Code...",
			newRelicAccountId
		);
	}

	private missingJavaExtensionCodelens(newRelicAccountId?: number): vscode.CodeLens[] {
		return this.errorCodelens(
			"NO_JAVA_VSCODE_EXTENSION",
			"java",
			"Click to configure code-level metrics from New Relic",
			"To see code-level metrics you'll need to install one of the following extensions for VS Code...",
			newRelicAccountId
		);
	}

	private missingCsharpExtensionCodelens(newRelicAccountId?: number): vscode.CodeLens[] {
		return this.errorCodelens(
			"NO_CSHARP_VSCODE_EXTENSION",
			"csharp",
			"Click to configure code-level metrics from New Relic",
			"To see code-level metrics you'll need to install one of the following extensions for VS Code...",
			newRelicAccountId
		);
	}

	private missingGoExtensionCodelens(newRelicAccountId?: number): vscode.CodeLens[] {
		return this.errorCodelens(
			"NO_GO_VSCODE_EXTENSION",
			"go",
			"Click to configure code-level metrics from New Relic",
			"To see code-level metrics you'll need to install one of the following extensions for VS Code...",
			newRelicAccountId
		);
	}

	private missingPhpExtensionCodelens(newRelicAccountId?: number): vscode.CodeLens[] {
		return this.errorCodelens(
			"NO_PHP_VSCODE_EXTENSION",
			"php",
			"Click to configure code-level metrics from New Relic",
			"To see code-level metrics you'll need to install one of the following extensions for VS Code...",
			newRelicAccountId
		);
	}

	private errorCodelens(
		errorCode: string,
		languageId: string,
		title: string,
		tooltip?: string,
		newRelicAccountId?: number
	): ErrorCodeLens[] {
		const viewCommandArgs: ViewMethodLevelTelemetryErrorCommandArgs = {
			error: { type: errorCode },
			newRelicAccountId,
			languageId
		};
		const errorCodelens: ErrorCodeLens[] = [
			new ErrorCodeLens(
				new vscode.Range(new vscode.Position(0, 0), new vscode.Position(1, 1)),
				new InstrumentableSymbolCommand(title, "codestream.viewMethodLevelTelemetry", tooltip, [
					JSON.stringify(viewCommandArgs)
				])
			)
		];
		return errorCodelens;
	}

	// Shouldn't have to to this (╯°□°)╯︵ ┻━┻
	// java plugin doesn't include package name - just class name
	parseJavaPackage(documentText: string): string | undefined {
		const lines = documentText.split(/\r?\n/);

		for (const line of lines) {
			const matcher = line.match(/^\s*package\s+([A-Za-z0-9_\.]+);\s*$/);
			if (matcher && matcher.length > 1) {
				return matcher[1];
			}
		}
		return undefined;
	}

	// like java, the go plugin doesn't give us the package name
	parseGoPackage(documentText: string): string | undefined {
		const lines = documentText.split(/\r?\n/);

		for (const line of lines) {
			const matcher = line.match(/^\s*package\s+([A-Za-z0-9_]+)\s*$/);
			if (matcher && matcher.length > 1) {
				return matcher[1];
			}
		}
		return undefined;
	}

	// Shouldn't have to to this (╯°□°)╯︵ ┻━┻
	parseCsharpNamespace(documentText: string): string | undefined {
		const lines = documentText.split(/\r?\n/);

		for (const line of lines) {
			const matcher = line.match(/^\s*namespace\s+([A-Za-z0-9_.]+)\s*[;|{]?\s*$/);
			if (matcher && matcher.length > 1) {
				return matcher[1];
			}
		}
		return undefined;
	}

	public async provideCodeLenses(
		document: TextDocument,
		token: vscode.CancellationToken
	): Promise<vscode.CodeLens[]> {
		let codeLenses: vscode.CodeLens[] = [];
		let instrumentableSymbols: InstrumentableSymbol[] = [];
		let allSymbols: vscode.DocumentSymbol[] = [];

		const checkPluginErrors = this.checkPlugin(document.languageId);
		if (checkPluginErrors && checkPluginErrors.length > 0) {
			return checkPluginErrors;
		}

		try {
			if (token.isCancellationRequested) {
				Logger.log("provideCodeLenses isCancellationRequested0");
				return [];
			}
			const result = await this.symbolLocator.locate(document, token);
			instrumentableSymbols = result.instrumentableSymbols;
			allSymbols = result.allSymbols;
		} catch (ex) {
			Logger.warn("provideCodeLenses", {
				error: ex,
				document: document
			});
			return [];
		}

		try {
			const cacheKey = document.uri.toString();
			const cache = this.documentManager[cacheKey];
			if (!cache) {
				this.documentManager[cacheKey] = {
					document: document,
					tracked: false
				};
			}

			if (!instrumentableSymbols.length) {
				Logger.log("provideCodeLenses no symbols", {
					document: document
				});
				return [];
			} else {
				Logger.log("provideCodeLenses symbols", {
					count: instrumentableSymbols.length,
					symbols: instrumentableSymbols.map(_ => _.symbol.name)
				});
			}

			if (token.isCancellationRequested) {
				Logger.log("provideCodeLenses isCancellationRequested1");
				return [];
			}

			const methodLevelTelemetryRequestOptions = {
				includeAverageDuration: this.codeLensTemplate.indexOf("${averageDuration}") > -1,
				includeThroughput: this.codeLensTemplate.indexOf("${sampleSize}") > -1,
				includeErrorRate: this.codeLensTemplate.indexOf("${errorRate}") > -1
			};

			let functionLocator: FunctionLocator | undefined = undefined;
			if (document.languageId === "csharp") {
				functionLocator = {
					namespace: this.parseCsharpNamespace(document.getText())
				};
			}

			if (document.languageId === "java") {
				const thePackage = instrumentableSymbols.find(_ => _.parent?.kind === SymbolKind.Package);

				if (thePackage && thePackage?.parent?.name) {
					functionLocator = {
						namespace: `${this.parseJavaPackage(document.getText())}.${thePackage.parent.name}`
					};
				}
			}

			if (document.languageId === "go") {
				functionLocator = {
					namespace: this.parseGoPackage(document.getText())
				};
			}

			if (document.languageId === "php") {
				const phpNamespace = allSymbols.find(_ => _.kind === vscode.SymbolKind.Namespace)?.name;
				const classesAndFunctions = allSymbols.filter(
					_ => _.kind === vscode.SymbolKind.Class || _.kind === vscode.SymbolKind.Function
				);
				const prefix = phpNamespace ? phpNamespace + "\\" : "";
				const namespaces = classesAndFunctions.map(_ => prefix + _.name);
				functionLocator = { namespaces };
			}

			const fileLevelTelemetryResponse = await this.observabilityService.getFileLevelTelemetry(
				document.uri.toString(),
				document.languageId,
				this.resetCache,
				functionLocator,
				methodLevelTelemetryRequestOptions
			);
			this.resetCache = false;

			if (fileLevelTelemetryResponse == null) {
				Logger.log("provideCodeLenses no response", {
					fileName: document.fileName,
					languageId: document.languageId,
					methodLevelTelemetryRequestOptions
				});
				return [];
			}

			if (!fileLevelTelemetryResponse.repo) {
				Logger.warn("provideCodeLenses missing repo");
				return [];
			}

			if (fileLevelTelemetryResponse.error) {
				Logger.warn("provideCodeLenses error", {
					error: fileLevelTelemetryResponse.error
				});
				if (fileLevelTelemetryResponse.error.type === "NOT_ASSOCIATED") {
					const viewCommandArgs: ViewMethodLevelTelemetryErrorCommandArgs = {
						error: fileLevelTelemetryResponse.error,
						newRelicEntityGuid: fileLevelTelemetryResponse.newRelicEntityGuid,
						newRelicAccountId: fileLevelTelemetryResponse.newRelicAccountId,
						repo: fileLevelTelemetryResponse.repo,
						languageId: document.languageId
					};
					const nonAssociatedCodeLens: vscode.CodeLens[] = [
						new vscode.CodeLens(
							new vscode.Range(new vscode.Position(0, 0), new vscode.Position(1, 1)),
							new InstrumentableSymbolCommand(
								"Click to configure code-level metrics from New Relic",
								"codestream.viewMethodLevelTelemetry",
								"Select the service on New Relic that is built from this repository to see how it's performing.",
								[JSON.stringify(viewCommandArgs)]
							)
						)
					];
					return nonAssociatedCodeLens;
				}
				return [];
			}

			if (token.isCancellationRequested) {
				Logger.log("provideCodeLenses isCancellationRequested2");
				return [];
			}

			if (
				allEmpty([
					fileLevelTelemetryResponse.sampleSize,
					fileLevelTelemetryResponse.averageDuration,
					fileLevelTelemetryResponse.errorRate
				])
			) {
				return this.noSpanCodelens(document.languageId);
			}

			const date = fileLevelTelemetryResponse.lastUpdateDate
				? new Date(fileLevelTelemetryResponse.lastUpdateDate).toLocaleString()
				: "";

			const tooltip = `${
				fileLevelTelemetryResponse.newRelicEntityName
					? `entity: ${fileLevelTelemetryResponse.newRelicEntityName}`
					: ""
			} - ${date ? `since ${date}` : ""}\nClick for more.`;

			const symbolMatcherFn = (
				symbol: InstrumentableSymbol,
				data: { namespace?: string; className?: string; functionName: string }
			) => {
				let result: boolean;
				// Strip off any trailing () for function (csharp and java) - undo this if we get types in agent
				const simpleSymbolName = symbol.symbol.name.replace(/\(.*?\)$/, "");
				let simpleClassName;
				if (data.className != undefined) {
					const parts = data.className.split("\\");
					simpleClassName = parts[parts.length - 1];
				}
				let simpleFunctionName;
				if (data.functionName != undefined) {
					const parts = data.functionName.split("\\");
					simpleFunctionName = parts[parts.length - 1];
				}
				if (symbol.parent) {
					result =
						(data.className === symbol.parent.name && data.functionName === simpleSymbolName) ||
						(data.namespace === symbol.parent.name && data.functionName === simpleSymbolName) ||
						(simpleClassName === symbol.parent.name && data.functionName === simpleSymbolName);
				} else {
					// if no parent (aka class) ensure we find a function that doesn't have a parent
					result =
						!symbol.parent &&
						(data.functionName === simpleSymbolName || simpleFunctionName === simpleSymbolName);
				}
				if (!result) {
					// Since nothing matched, relax criteria and base just on function name
					result = data.functionName === simpleSymbolName;
				}
				return result;
			};

			const lenses = instrumentableSymbols.map(_ => {
				const sampleSizeForFunction = fileLevelTelemetryResponse.sampleSize
					? fileLevelTelemetryResponse.sampleSize.find((i: any) => symbolMatcherFn(_, i))
					: undefined;

				const averageDurationForFunction = fileLevelTelemetryResponse.averageDuration
					? fileLevelTelemetryResponse.averageDuration.find((i: any) => symbolMatcherFn(_, i))
					: undefined;

				const errorRateForFunction = fileLevelTelemetryResponse.errorRate
					? fileLevelTelemetryResponse.errorRate.find((i: any) => symbolMatcherFn(_, i))
					: undefined;

				if (!sampleSizeForFunction && !averageDurationForFunction && !errorRateForFunction) {
					Logger.warn(`provideCodeLenses no data for ${_.symbol.name}`);
					return undefined;
				}

				const anomaly = averageDurationForFunction?.anomaly || errorRateForFunction?.anomaly;
				const viewCommandArgs: ViewMethodLevelTelemetryCommandArgs = {
					repo: fileLevelTelemetryResponse.repo,
					codeNamespace: fileLevelTelemetryResponse.codeNamespace!,
					metricTimesliceNameMapping: {
						sampleSize: sampleSizeForFunction ? sampleSizeForFunction.metricTimesliceName : "",
						duration: averageDurationForFunction
							? averageDurationForFunction.metricTimesliceName
							: "",
						errorRate: errorRateForFunction ? errorRateForFunction.metricTimesliceName : "",
						source: sampleSizeForFunction ? sampleSizeForFunction.source : ""
					},
					filePath: document.fileName,
					relativeFilePath: fileLevelTelemetryResponse.relativeFilePath,
					languageId: document.languageId,
					range: _.symbol.range,
					// Strip off any trailing () for function (csharp and java) - undo this if we get types in agent
					functionName: _.symbol.name.replace(/\(.*?\)$/, ""),
					newRelicAccountId: fileLevelTelemetryResponse.newRelicAccountId,
					newRelicEntityGuid: fileLevelTelemetryResponse.newRelicEntityGuid,
					methodLevelTelemetryRequestOptions: methodLevelTelemetryRequestOptions,
					anomaly
				};

				let text;

				if (!averageDurationForFunction?.anomaly && !errorRateForFunction?.anomaly) {
					text = Strings.interpolate(this.codeLensTemplate, {
						averageDuration:
							averageDurationForFunction && averageDurationForFunction.averageDuration
								? `${averageDurationForFunction.averageDuration.toFixed(3) || "0.00"}ms`
								: "n/a",
						sampleSize:
							sampleSizeForFunction && sampleSizeForFunction.sampleSize
								? `${sampleSizeForFunction.sampleSize}`
								: "n/a",
						errorRate:
							errorRateForFunction && errorRateForFunction.errorRate
								? `${(errorRateForFunction.errorRate * 100).toFixed(2)}%`
								: "0.00%",
						since: fileLevelTelemetryResponse.sinceDateFormatted,
						date: date
					});
				} else {
					const anomalyTexts: string[] = [];
					if (errorRateForFunction?.anomaly) {
						const value = (errorRateForFunction.anomaly.ratio - 1) * 100;
						anomalyTexts.push(`error rate +${value.toFixed(2)}%`);
					}
					if (averageDurationForFunction?.anomaly) {
						const value = (averageDurationForFunction.anomaly.ratio - 1) * 100;
						anomalyTexts.push(`avg duration +${value.toFixed(2)}%`);
					}

					const since =
						errorRateForFunction?.anomaly?.sinceText ||
						averageDurationForFunction?.anomaly?.sinceText;
					text = anomalyTexts.join(", ") + " since " + since;
				}

				// TODO pass anomaly object
				return new vscode.CodeLens(
					_.symbol.range,
					new InstrumentableSymbolCommand(text, "codestream.viewMethodLevelTelemetry", tooltip, [
						JSON.stringify(viewCommandArgs)
					])
				);
			});

			codeLenses = lenses.filter(_ => _ != null) as vscode.CodeLens[];

			const localRanges = codeLenses.map(_ => _.range);
			const uriRanges = await Container.agent.documentMarkers.getRangesForUri(
				localRanges,
				document.uri.toString(true)
			);
			codeLenses.forEach((lens, i) => {
				const agentRange = uriRanges.ranges[i];
				const start = new vscode.Position(agentRange.start.line, agentRange.start.character);
				const end = new vscode.Position(agentRange.end.line, agentRange.end.character);
				const newRange = new vscode.Range(start, end);
				lens.range = newRange;
			});
			codeLenses = codeLenses.filter(_ => _.range.start.line >= 0);
			const hasLenses = codeLenses.length > 0;

			if (hasLenses) {
				this.tryTrack(
					cacheKey,
					fileLevelTelemetryResponse && fileLevelTelemetryResponse.newRelicAccountId
						? fileLevelTelemetryResponse.newRelicAccountId.toString()
						: "",
					document.languageId,
					codeLenses.length
				);
			}
		} catch (ex) {
			Logger.error(ex, "provideCodeLens", {
				fileName: document.fileName
			});
		}

		return codeLenses;
	}

	private tryTrack(cacheKey: string, accountId: string, languageId: string, codeLensCount: number) {
		const doc = this.documentManager[cacheKey];
		if (doc && !doc.tracked) {
			try {
				this.telemetryService.track("MLT Codelenses Rendered", {
					"NR Account ID": accountId,
					Language: languageId,
					"Codelense Count": codeLensCount
				});
				doc.tracked = true;
			} catch {}
		}
	}

	public resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken) {
		return token.isCancellationRequested ? undefined : codeLens;
	}
}

class InstrumentableSymbolCommand implements vscode.Command {
	arguments: string[] | undefined;
	constructor(
		public title: string,
		public command: string,
		public tooltip?: string,
		args?: string[] | undefined
	) {
		this.arguments = args;
	}
}
