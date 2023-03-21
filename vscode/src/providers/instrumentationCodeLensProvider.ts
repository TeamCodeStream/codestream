"use strict";
import * as vscode from "vscode";
import { EventEmitter, extensions, TextDocument } from "vscode";
import { Event, SymbolKind } from "vscode-languageclient";
import {
	FileLevelTelemetryAverageDuration,
	FileLevelTelemetryErrorRate,
	FileLevelTelemetryMetric,
	FileLevelTelemetryRequestOptions,
  FileLevelTelemetrySampleSize,
	FunctionLocator,
	GetFileLevelTelemetryResponse,
	TelemetryData
} from "@codestream/protocols/agent";

import {
	ViewMethodLevelTelemetryCommandArgs,
	ViewMethodLevelTelemetryErrorCommandArgs
} from "commands";
import { Strings } from "../system";
import { Logger } from "../logger";
import { InstrumentableSymbol, ISymbolLocator } from "./symbolLocator";
import { Container } from "../container";
import { IObservabilityService } from "../agent/ObservabilityService";

export type CollatedMetric = {
	duration?: FileLevelTelemetryAverageDuration;
	sampleSize?: FileLevelTelemetrySampleSize;
	errorRate?: FileLevelTelemetryErrorRate;
	currentLocation: vscode.Range;
};

export function isFileLevelTelemetryAverageDuration(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	value: any
): value is FileLevelTelemetryAverageDuration {
	if (!value) {
		return false;
	}
	return typeof value.averageDuration === "number";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isFileLevelTelemetrySampleSize(value: any): value is FileLevelTelemetrySampleSize {
	if (!value) {
		return false;
	}
	return typeof value.sampleSize === "number" && !!value.source;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isFileLevelTelemetryErrorRate(value: any): value is FileLevelTelemetryErrorRate {
	if (!value) {
		return false;
	}
	return typeof value.errorRate === "number";
}

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

type DocumentInfo = {
	document: TextDocument;
	tracked: boolean;
};

export class InstrumentationCodeLensProvider implements vscode.CodeLensProvider {
	private trackingCache: { [key: string]: DocumentInfo } = {};
	private resetCache = false;

	constructor(
		private codeLensTemplate: string,
		private symbolLocator: ISymbolLocator,
		private observabilityService: IObservabilityService,
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
		this.trackingCache[document.uri.toString()] = {
			document: document,
			tracked: false
		};
	}

	documentClosed(document: TextDocument) {
		delete this.trackingCache[document.uri.toString()];
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

	private symbolMatcherFn(
		symbol: InstrumentableSymbol,
		data: { namespace?: string; className?: string; functionName?: string }
	) {
		if (!data.functionName) {
			return false;
		}
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
			const cache = this.trackingCache[cacheKey];
			if (!cache) {
				this.trackingCache[cacheKey] = {
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

			const methodLevelTelemetryRequestOptions: FileLevelTelemetryRequestOptions = {
				includeAverageDuration: this.codeLensTemplate.includes("${averageDuration}"),
				includeThroughput: this.codeLensTemplate.includes("${sampleSize}"),
				includeErrorRate: this.codeLensTemplate.includes("${errorRate}")
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

			const allValidAnonymousMetrics: FileLevelTelemetryMetric[] = [
				...(fileLevelTelemetryResponse.averageDuration ?? []),
				...(fileLevelTelemetryResponse.errorRate ?? []),
				...(fileLevelTelemetryResponse.sampleSize ?? [])
			].filter(_ => _.functionName === "(anonymous)" && _.lineno && _.column);

			const locationLensMap = new Map<string, CollatedMetric>();
			for (const metric of allValidAnonymousMetrics) {
				const commit = metric.commit ?? fileLevelTelemetryResponse.deploymentCommit;
				if (!commit) {
					continue;
				}
				const id = `${document.uri.toString()}:${metric.lineno}:${metric.column}:${commit}:${
					metric.functionName
				}`;
				let collatedMetric = locationLensMap.get(id);
				if (!collatedMetric && metric.functionName) {
					const currentLocation = await this.observabilityService.computeCurrentLocation(
						id,
						metric.lineno!, // Was filtered earlier
						metric.column!, // Was filtered earlier
						commit,
						metric.functionName,
						document.uri.toString()
					);
					for (const [_key, value] of Object.entries(currentLocation.locations)) {
						Logger.debug(`currentLocation ${value.lineStart} / ${value.colStart}`);
						const currentLocation = new vscode.Range(
							new vscode.Position(value.lineStart - 1, 0),
							new vscode.Position(value.lineStart - 1, 0)
						);
						collatedMetric = { currentLocation };
						locationLensMap.set(id, collatedMetric);
					}
				}

				if (collatedMetric) {
					if (isFileLevelTelemetryAverageDuration(metric)) {
						collatedMetric.duration = metric;
					} else if (isFileLevelTelemetrySampleSize(metric)) {
						collatedMetric.sampleSize = metric;
					} else if (isFileLevelTelemetryErrorRate(metric)) {
						collatedMetric.errorRate = metric;
					}
				}

				// if (currentLocation[id]) {
				// 	Logger.log(
				// 		`*** currentLocation ${currentLocation.locations[0].lineStart} ${currentLocation.locations[0].colStart}`
				// 	);
				// }
			}

			const lineLevelLensMap = new Map<string, CollatedMetric[]>();
			for (const value of locationLensMap.values()) {
				const lineKey = `${value.currentLocation.start.line}`;
				let collatedMetrics = lineLevelLensMap.get(lineKey);
				if (!collatedMetrics) {
					collatedMetrics = [];
					lineLevelLensMap.set(lineKey, collatedMetrics);
				}
				collatedMetrics.push(value);
			}

			const locationLenses: vscode.CodeLens[] = [];

			for (const lineLevelMetrics of lineLevelLensMap.values()) {
				// Skipping lineLevelMetrics.length > 1 as it is handled in inlayHintProvider.ts
				if (lineLevelMetrics.length === 1) {
					const lineLevelMetric = lineLevelMetrics[0];
					// Don't show the inlay if there is presently no code at the location
					// (otherwise you get phantom inlays for removed code)
					if (!this.lineHasAnonymousFunction(allSymbols, lineLevelMetric.currentLocation)) {
						continue;
					}
					const viewCommandArgs: ViewMethodLevelTelemetryCommandArgs = {
						repo: fileLevelTelemetryResponse.repo,
						codeNamespace: fileLevelTelemetryResponse.codeNamespace!,
						metricTimesliceNameMapping: {
							sampleSize: lineLevelMetric.sampleSize ? lineLevelMetric.sampleSize.facet[0] : "",
							duration: lineLevelMetric.duration ? lineLevelMetric.duration.facet[0] : "",
							errorRate: lineLevelMetric.errorRate ? lineLevelMetric.errorRate.facet[0] : "",
							source: lineLevelMetric.sampleSize ? lineLevelMetric.sampleSize.source : ""
						},
						filePath: document.fileName,
						relativeFilePath: fileLevelTelemetryResponse.relativeFilePath,
						languageId: document.languageId,
						range: lineLevelMetric.currentLocation,
						functionName: "(anonymous)",
						newRelicAccountId: fileLevelTelemetryResponse.newRelicAccountId,
						newRelicEntityGuid: fileLevelTelemetryResponse.newRelicEntityGuid,
						methodLevelTelemetryRequestOptions: methodLevelTelemetryRequestOptions
						// TODO anomaly?
					};
					const text =
						Strings.interpolate(this.codeLensTemplate, {
							averageDuration:
								lineLevelMetric.duration && lineLevelMetric.duration.averageDuration
									? `${lineLevelMetric.duration.averageDuration.toFixed(3) || "0.00"}ms`
									: "n/a",
							sampleSize:
								lineLevelMetric.sampleSize && lineLevelMetric.sampleSize.sampleSize
									? `${lineLevelMetric.sampleSize.sampleSize}`
									: "n/a",
							errorRate:
								lineLevelMetric.errorRate && lineLevelMetric.errorRate.errorRate
									? `${(lineLevelMetric.errorRate.errorRate * 100).toFixed(2)}%`
									: "0.00%",
							since: fileLevelTelemetryResponse.sinceDateFormatted,
							date: date
						}) + " (anonymous)";

					const lens = new vscode.CodeLens(
						lineLevelMetric.currentLocation,
						new InstrumentableSymbolCommand(text, "codestream.viewMethodLevelTelemetry", tooltip, [
							JSON.stringify(viewCommandArgs)
						])
					);
					locationLenses.push(lens);
					continue;
				}
				// Skipping lineLevelMetrics.length > 1 as it is handled in inlayHintProvider.ts
			}

			const lenses = instrumentableSymbols.map(_ => {
				const sampleSizeForFunction = fileLevelTelemetryResponse.sampleSize
					? fileLevelTelemetryResponse.sampleSize.find(i => this.symbolMatcherFn(_, i))
					: undefined;

				const averageDurationForFunction = fileLevelTelemetryResponse.averageDuration
					? fileLevelTelemetryResponse.averageDuration.find(i => this.symbolMatcherFn(_, i))
					: undefined;

				const errorRateForFunction = fileLevelTelemetryResponse.errorRate
					? fileLevelTelemetryResponse.errorRate.find(i => this.symbolMatcherFn(_, i))
					: undefined;

				if (!sampleSizeForFunction && !averageDurationForFunction && !errorRateForFunction) {
					Logger.warn(`provideCodeLenses no data for ${_.symbol.name} (might be anon function)`);
					return undefined;
				}

				const anomaly = averageDurationForFunction?.anomaly || errorRateForFunction?.anomaly;
				const viewCommandArgs: ViewMethodLevelTelemetryCommandArgs = {
					repo: fileLevelTelemetryResponse.repo,
					codeNamespace: fileLevelTelemetryResponse.codeNamespace!,
					metricTimesliceNameMapping: {
						sampleSize: sampleSizeForFunction ? sampleSizeForFunction.facet[0] : "",
						duration: averageDurationForFunction ? averageDurationForFunction.facet[0] : "",
						errorRate: errorRateForFunction ? errorRateForFunction.facet[0] : "",
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

			lenses.push(...locationLenses);
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
						? fileLevelTelemetryResponse.newRelicAccountId
						: undefined,
					fileLevelTelemetryResponse?.newRelicEntityGuid,
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

  private lineHasAnonymousFunction(
    allSymbols: vscode.DocumentSymbol[],
    currentLocation: vscode.Range
  ): boolean {
    const symbolsForLine = allSymbols.filter(symbol => {
      return (
        symbol.range.start.line === currentLocation.start.line && symbol.name.endsWith(" callback")
      );
    });
    Logger.debug(`symbolsForLine ${JSON.stringify(symbolsForLine, null, 2)}`);
    return symbolsForLine.length > 0;
  }

	private tryTrack(
		cacheKey: string,
		accountId: number | undefined,
		entityGuid: string | undefined,
		languageId: string,
		codeLensCount: number
	) {
    const doc = this.trackingCache[cacheKey];
		if (doc && !doc.tracked) {
			try {
				this.telemetryService.track("codestream/codelenses displayed", {
					account_id: accountId,
					entity_guid: entityGuid,
					meta_data: `language: ${languageId}`,
					meta_data_2: `codelense_count: ${codeLensCount}`,
					event_type: "state_load"
				} as TelemetryData);
				doc.tracked = true;
			} catch {}
		}
	}

	public resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken) {
		return token.isCancellationRequested ? undefined : codeLens;
	}
}

export class InstrumentableSymbolCommand implements vscode.Command {
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
