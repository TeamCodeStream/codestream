"use strict";

import { CancellationToken, DocumentSymbol, EventEmitter, TextDocument } from "vscode";
import * as vscode from "vscode";
import { ViewMethodLevelTelemetryCommandArgs } from "commands";
import { Event } from "vscode-languageclient";
import { BuiltInCommands } from "../constants";
import { Strings } from "../system";
import { Container } from "../container";
import { Logger } from "../logger";

const sleep = async (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export class InstrumentationCodeLensProvider implements vscode.CodeLensProvider {
	constructor(private template: string) {}

	private _onDidChangeCodeLenses = new EventEmitter<void>();
	get onDidChangeCodeLenses(): Event<void> {
		return this._onDidChangeCodeLenses.event;
	}

	update(template: string) {
		this.template = template;
		this._onDidChangeCodeLenses.fire();
	}

	async getSymbols(
		document: TextDocument,
		token: vscode.CancellationToken
	): Promise<DocumentSymbol[]> {
		let symbols: DocumentSymbol[] | undefined = [];

		for (const timeout of [0, 750, 1500, 3000]) {
			if (token.isCancellationRequested) {
				return [];
			}
			try {
				symbols = await vscode.commands.executeCommand<DocumentSymbol[]>(
					BuiltInCommands.ExecuteDocumentSymbolProvider,
					document.uri
				);
				if (!symbols || symbols.length === 0) {
					await sleep(timeout);
				} else {
					Logger.log("getSymbols found", { timeout });
					return symbols || [];
				}
			} catch (ex) {
				Logger.warn("failed to ExecuteDocumentSymbolProvider", { ex });
			}
		}

		return symbols || [];
	}

	private buildLensCollection(
		symbols: DocumentSymbol[],
		token: CancellationToken,
		collection: InstrumentableSymbol[]
	) {
		for (const symbol of symbols) {
			if (token.isCancellationRequested) {
				return;
			}

			if (symbol.children && symbol.children.length) {
				this.buildLensCollection(symbol.children, token, collection);
			}
			if (symbol.kind === vscode.SymbolKind.Function || symbol.kind === vscode.SymbolKind.Method) {
				collection.push(new InstrumentableSymbol(symbol));
			}
		}
	}

	public async provideCodeLenses(
		document: vscode.TextDocument,
		token: vscode.CancellationToken
	): Promise<vscode.CodeLens[]> {
		let codeLenses: vscode.CodeLens[] = [];
		const instrumentableSymbols: InstrumentableSymbol[] = [];

		try {
			if (token.isCancellationRequested) {
				return [];
			}

			const symbolResult = await this.getSymbols(document, token);
			this.buildLensCollection(symbolResult, token, instrumentableSymbols);
		} catch (ex) {
			Logger.warn("provideCodeLenses", {
				error: ex,
				document: document
			});
			return codeLenses;
		}

		try {
			if (!instrumentableSymbols.length) {
				return codeLenses;
			}

			if (token.isCancellationRequested) return [];

			const methodLevelTelemetryRequestOptions = {
				includeAverageDuration: this.template.indexOf("${averageDuration}") > -1,
				includeThroughput: this.template.indexOf("${throughput}") > -1,
				includeErrorRate: this.template.indexOf("${errorsPerMinute}") > -1
			};

			const fileLevelTelemetryResponse = await Container.agent.observability.getFileLevelTelemetry(
				document.fileName,
				document.languageId,
				methodLevelTelemetryRequestOptions
			);

			if (fileLevelTelemetryResponse == null || !fileLevelTelemetryResponse.hasAnyData) {
				Logger.log("provideCodeLenses no data", {
					fileName: document.fileName,
					languageId: document.languageId,
					methodLevelTelemetryRequestOptions
				});
				return codeLenses;
			}

			if (!fileLevelTelemetryResponse.repo) {
				Logger.warn("provideCodeLenses missing repo");
				return codeLenses;
			}

			if (token.isCancellationRequested) return [];

			const date = fileLevelTelemetryResponse.lastUpdateDate
				? new Date(fileLevelTelemetryResponse.lastUpdateDate).toLocaleString()
				: "";

			const tooltip = `${
				fileLevelTelemetryResponse.newRelicEntityName
					? `entity: ${fileLevelTelemetryResponse.newRelicEntityName}`
					: ""
			} - ${date ? `since ${date}` : ""}\nClick for more.`;

			const lenses = instrumentableSymbols.map(_ => {
				const throughputForFunction = fileLevelTelemetryResponse.throughput
					? fileLevelTelemetryResponse.throughput.find((i: any) => i.functionName === _.symbol.name)
					: undefined;

				const averageDurationForFunction = fileLevelTelemetryResponse.averageDuration
					? fileLevelTelemetryResponse.averageDuration.find(
							(i: any) => i.functionName === _.symbol.name
					  )
					: undefined;

				const errorRateForFunction = fileLevelTelemetryResponse.errorRate
					? fileLevelTelemetryResponse.errorRate.find((i: any) => i.functionName === _.symbol.name)
					: undefined;

				if (!throughputForFunction && !averageDurationForFunction && !errorRateForFunction) {
					Logger.debug("provideCodeLenses no data");
					return undefined;
				}

				const viewCommandArgs: ViewMethodLevelTelemetryCommandArgs = {
					repoId: fileLevelTelemetryResponse.repo.id,
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
						Strings.interpolate(this.template, {
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
		} catch (ex) {
			Logger.error(ex, "provideCodeLens", {
				fileName: document.fileName
			});
		}
		return codeLenses;
	}

	public resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken) {
		return token.isCancellationRequested ? undefined : codeLens;
	}
}

class InstrumentableSymbol {
	constructor(public symbol: vscode.DocumentSymbol) {}
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
