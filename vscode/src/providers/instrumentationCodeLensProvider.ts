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

		if (!instrumentableSymbols.length) {
			return codeLenses;
		}

		if (token.isCancellationRequested) return [];

		const methodLevelTelemetryResponse = await Container.agent.observability.getMethodLevelTelemetry(
			document.fileName,
			document.languageId,
			{
				includeAverageDuration: this.template.indexOf("${averageDuration}") > -1,
				includeThroughput: this.template.indexOf("${throughput}") > -1,
				includeErrorRate: this.template.indexOf("${errorsPerMinute}") > -1
			}
		);

		if (methodLevelTelemetryResponse == null || !methodLevelTelemetryResponse.hasAnyData) {
			return codeLenses;
		}

		if (token.isCancellationRequested) return [];

		const date = methodLevelTelemetryResponse.lastUpdateDate
			? new Date(methodLevelTelemetryResponse.lastUpdateDate).toLocaleString()
			: "";

		const tooltip = `${
			methodLevelTelemetryResponse.newRelicEntityName
				? `entity: ${methodLevelTelemetryResponse.newRelicEntityName}`
				: ""
		} - ${date ? `since ${date}` : ""}\nClick for more.`;

		const lenses = instrumentableSymbols.map(_ => {
			const throughputForFunction = methodLevelTelemetryResponse.throughput
				? methodLevelTelemetryResponse.throughput.find(i => i.function === _.symbol.name)
				: undefined;

			const averageDurationForFunction = methodLevelTelemetryResponse.averageDuration
				? methodLevelTelemetryResponse.averageDuration.find(i => i.function === _.symbol.name)
				: undefined;

			const errorRateForFunction = methodLevelTelemetryResponse.errorRate
				? methodLevelTelemetryResponse.errorRate.find(i => i.function === _.symbol.name)
				: undefined;

			if (!throughputForFunction && !averageDurationForFunction && !errorRateForFunction) {
				// no data at all!
				return undefined;
			}

			const viewCommandArgs: ViewMethodLevelTelemetryCommandArgs = {
				range: _.symbol.range,
				methodName: _.symbol.name,
				newRelicAccountId: methodLevelTelemetryResponse.newRelicAccountId,
				newRelicEntityGuid: methodLevelTelemetryResponse.newRelicEntityGuid
			};

			return new vscode.CodeLens(
				_.symbol.range,
				new InstrumentableSymbolCommand(
					Strings.interpolate(this.template, {
						averageDuration: averageDurationForFunction
							? `${averageDurationForFunction.averageDuration.toFixed(2) || "0.00"}ms`
							: "n/a",
						throughput: throughputForFunction
							? `${throughputForFunction.requestsPerMinute.toFixed(2) || "0.00"}rpm`
							: "n/a",
						errorsPerMinute: errorRateForFunction
							? `${errorRateForFunction.errorsPerMinute.toFixed(2) || "0"}epm`
							: "n/a",
						since: methodLevelTelemetryResponse.sinceDateFormatted,
						date: date
					}),
					"codestream.viewMethodLevelTelemetry",
					tooltip,
					[JSON.stringify(viewCommandArgs)]
				)
			);
		});

		codeLenses = lenses.filter(_ => _ != null) as vscode.CodeLens[];
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
