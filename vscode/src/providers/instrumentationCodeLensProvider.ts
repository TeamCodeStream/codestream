"use strict";

import { EventEmitter, extensions, TextDocument } from "vscode";
import * as vscode from "vscode";
import {
	ViewMethodLevelTelemetryCommandArgs,
	ViewMethodLevelTelemetryErrorCommandArgs
} from "commands";
import { Event, SymbolKind } from "vscode-languageclient";
import {
	FileLevelTelemetryRequestOptions,
	FunctionLocator,
	GetFileLevelTelemetryResponse
} from "@codestream/protocols/agent";
import { Strings } from "../system";
import { Logger } from "../logger";
import { InstrumentableSymbol, ISymbolLocator } from "./symbolLocator";

export class InstrumentationCodeLensProvider implements vscode.CodeLensProvider {
	private documentManager: any = {};
	private resetCache: boolean = false;

	constructor(
		private codeLensTemplate: string,
		private symbolLocator: ISymbolLocator,
		private observabilityService: {
			getFileLevelTelemetry(
				filePath: string,
				languageId: string,
				resetCache?: boolean,
				locator?: FunctionLocator,
				options?: FileLevelTelemetryRequestOptions | undefined
			): Promise<GetFileLevelTelemetryResponse>;
		},
		private telemetryService: { track: Function }
	) {}

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

	private hasSupportedRubyExtension(): boolean {
		return (
			extensions.getExtension<Promise<any>>("castwide.solargraph")?.isActive ||
			extensions.getExtension<Promise<any>>("rebornix.Ruby")?.isActive ||
			false
		);
	}

	private missingRubyExtensionCodelens(newRelicAccountId?: number): vscode.CodeLens[] {
		const viewCommandArgs: ViewMethodLevelTelemetryErrorCommandArgs = {
			error: { type: "NO_RUBY_VSCODE_EXTENSION" },
			newRelicAccountId,
			languageId: "ruby"
		};
		const missingRubyExtensionCodelens: vscode.CodeLens[] = [
			new vscode.CodeLens(
				new vscode.Range(new vscode.Position(0, 0), new vscode.Position(1, 1)),
				new InstrumentableSymbolCommand(
					"Click to configure golden signals from New Relic",
					"codestream.viewMethodLevelTelemetry",
					"To see code-level metrics you'll need to install one of the following extensions for VS Code...",
					[JSON.stringify(viewCommandArgs)]
				)
			)
		];
		return missingRubyExtensionCodelens;
	}

	public async provideCodeLenses(
		document: TextDocument,
		token: vscode.CancellationToken
	): Promise<vscode.CodeLens[]> {
		let codeLenses: vscode.CodeLens[] = [];
		let instrumentableSymbols: InstrumentableSymbol[] = [];

		if (document.languageId === "ruby" && !this.hasSupportedRubyExtension()) {
			return this.missingRubyExtensionCodelens();
		}

		try {
			if (token.isCancellationRequested) {
				Logger.log("provideCodeLenses isCancellationRequested0");
				return [];
			}
			instrumentableSymbols = await this.symbolLocator.locate(document, token);
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
				includeThroughput: this.codeLensTemplate.indexOf("${throughput}") > -1,
				includeErrorRate: this.codeLensTemplate.indexOf("${errorsPerMinute}") > -1
			};

			let functionLocator: FunctionLocator | undefined = undefined;
			if (document.languageId === "csharp") {
				const thePackage = instrumentableSymbols.find(_ => _.parent?.kind === SymbolKind.Package);
				if (thePackage) {
					functionLocator = {namespace: thePackage?.parent?.name};
				}
			}

			const fileLevelTelemetryResponse = await this.observabilityService.getFileLevelTelemetry(
				document.fileName,
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
								"Click to configure golden signals from New Relic",
								"codestream.viewMethodLevelTelemetry",
								"Associate this repository with an entity from New Relic so that you can see golden signals right in your editor",
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
				// Strip off any trailing () for function (csharp)
				const simpleSymbolName = symbol.symbol.name.replace(/\(\)$/, "");
				if (symbol.parent) {
					result =
						(data.className === symbol.parent.name && data.functionName === simpleSymbolName) ||
						(data.namespace === symbol.parent.name && data.functionName === simpleSymbolName);
				} else {
					// if no parent (aka class) ensure we find a function that doesn't have a parent
					result = !symbol.parent && data.functionName === simpleSymbolName;
				}
				if (!result) {
					// Since nothing matched, relax criteria and base just on function name
					result = data.functionName === simpleSymbolName;
				}
				return result;
			};

			const lenses = instrumentableSymbols.map(_ => {
				const throughputForFunction = fileLevelTelemetryResponse.throughput
					? fileLevelTelemetryResponse.throughput.find((i: any) => symbolMatcherFn(_, i))
					: undefined;

				const averageDurationForFunction = fileLevelTelemetryResponse.averageDuration
					? fileLevelTelemetryResponse.averageDuration.find((i: any) => symbolMatcherFn(_, i))
					: undefined;

				const errorRateForFunction = fileLevelTelemetryResponse.errorRate
					? fileLevelTelemetryResponse.errorRate.find((i: any) => symbolMatcherFn(_, i))
					: undefined;

				if (!throughputForFunction && !averageDurationForFunction && !errorRateForFunction) {
					Logger.warn(`provideCodeLenses no data for ${_.symbol.name}`);
					return undefined;
				}

				const viewCommandArgs: ViewMethodLevelTelemetryCommandArgs = {
					repo: fileLevelTelemetryResponse.repo,
					codeNamespace: fileLevelTelemetryResponse.codeNamespace!,
					metricTimesliceNameMapping: {
						t: throughputForFunction ? throughputForFunction.metricTimesliceName : "",
						d: averageDurationForFunction ? averageDurationForFunction.metricTimesliceName : "",
						e: errorRateForFunction ? errorRateForFunction.metricTimesliceName : ""
					},
					filePath: document.fileName,
					relativeFilePath: fileLevelTelemetryResponse.relativeFilePath,
					languageId: document.languageId,
					range: _.symbol.range,
					functionName: _.symbol.name,
					newRelicAccountId: fileLevelTelemetryResponse.newRelicAccountId,
					newRelicEntityGuid: fileLevelTelemetryResponse.newRelicEntityGuid,
					methodLevelTelemetryRequestOptions: methodLevelTelemetryRequestOptions
				};

				return new vscode.CodeLens(
					_.symbol.range,
					new InstrumentableSymbolCommand(
						Strings.interpolate(this.codeLensTemplate, {
							averageDuration:
								averageDurationForFunction && averageDurationForFunction.averageDuration
									? `${averageDurationForFunction.averageDuration.toFixed(3) || "0.00"}ms`
									: "n/a",
							throughput:
								throughputForFunction && throughputForFunction.requestsPerMinute
									? `${throughputForFunction.requestsPerMinute.toFixed(3) || "0.00"}rpm`
									: "n/a",
							errorsPerMinute:
								errorRateForFunction && errorRateForFunction.errorsPerMinute
									? `${errorRateForFunction.errorsPerMinute.toFixed(3) || "0"}epm`
									: "n/a",
							since: fileLevelTelemetryResponse.sinceDateFormatted,
							date: date
						}),
						"codestream.viewMethodLevelTelemetry",
						tooltip,
						[JSON.stringify(viewCommandArgs)]
					)
				);
			});

			codeLenses = lenses.filter(_ => _ != null) as vscode.CodeLens[];

			if (codeLenses.length > 0) {
				this.tryTrack(
					cacheKey,
					fileLevelTelemetryResponse && fileLevelTelemetryResponse.newRelicAccountId
						? fileLevelTelemetryResponse.newRelicAccountId.toString()
						: "",
					document.languageId
				);
			}
		} catch (ex) {
			Logger.error(ex, "provideCodeLens", {
				fileName: document.fileName
			});
		}

		return codeLenses;
	}

	private tryTrack(cacheKey: string, accountId: string, languageId: string) {
		const doc = this.documentManager[cacheKey];
		if (doc && !doc.tracked) {
			try {
				this.telemetryService.track("MLT Codelenses Rendered", {
					"NR Account ID": accountId,
					Language: languageId
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
