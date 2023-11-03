import {
	CancellationToken,
	Disposable,
	DocumentSelector,
	InlayHint,
	InlayHintKind,
	InlayHintLabelPart,
	InlayHintsProvider,
	languages,
	Position,
	Range,
	TextDocument
} from "vscode";
import { SessionStatus, SessionStatusChangedEvent } from "../api/session";
import { Container } from "../container";
import { Logger } from "logger";
import { Strings } from "../system";
import {
	FileLevelTelemetryMetric,
	FileLevelTelemetryRequestOptions
} from "@codestream/protocols/agent";
import { ISymbolLocator, SymbolLocator } from "./symbolLocator";
import { IObservabilityService } from "agent/agentConnection";
import {
	CollatedMetric,
	InstrumentableSymbolCommand,
	isFileLevelTelemetryAverageDuration,
	isFileLevelTelemetryErrorRate,
	isFileLevelTelemetrySampleSize
} from "./instrumentationCodeLensProvider";
import { configuration } from "configuration";
import { ViewMethodLevelTelemetryCommandArgs } from "commands";

export class CodeStreamInlayHintsProvider implements InlayHintsProvider, Disposable {
	static selector: DocumentSelector = [{ scheme: "file" }, { scheme: "untitled" }];

	private readonly _disposable: Disposable;
	private readonly codeLensTemplate: string;
	private _disposableSignedIn: Disposable | undefined;

	constructor(
		private symbolLocator: ISymbolLocator = new SymbolLocator(),
		private observabilityService: IObservabilityService = Container.agent.observability!
	) {
		this._disposable = Disposable.from(
			Container.session.onDidChangeSessionStatus(this.onSessionStatusChanged, this)
		);
		// TODO handle null
		this.codeLensTemplate = configuration.get<string>(
			configuration.name("goldenSignalsInEditorFormat").value
		);
	}

	dispose() {
		this._disposable && this._disposable.dispose();
	}

	private async onSessionStatusChanged(e: SessionStatusChangedEvent) {
		const status = e.getStatus();
		switch (status) {
			case SessionStatus.SignedOut:
				this._disposableSignedIn && this._disposableSignedIn.dispose();
				break;

			case SessionStatus.SignedIn:
				this._disposableSignedIn = languages.registerInlayHintsProvider(
					CodeStreamInlayHintsProvider.selector,
					this
				);
				break;
		}
	}

	// The symbol provider has doesn't differentiate between anonymous functions and named functions via the kind field
	// and it pretty much returns random crap for the "name" of an anonymous function. So we can hopefully detect
	// anonymous functions by the fact that they are invalid javascript varialbe names
	private isValidJavascriptFunctionName(functionName: string): boolean {
		return functionName.match(/^[a-zA-Z_$][0-9a-zA-Z_$]*$/) != null;
	}

	public async provideInlayHints(
		document: TextDocument,
		range: Range,
		token: CancellationToken
	): Promise<InlayHint[]> {
		Logger.log(
			`*** provideInlayHints called with ${document.fileName} ${range.start.line}:${range.start.character} ${range.end.line}:${range.end.character}`
		);

		const methodLevelTelemetryRequestOptions: FileLevelTelemetryRequestOptions = {
			includeAverageDuration: this.codeLensTemplate.includes("${averageDuration}"),
			includeThroughput: this.codeLensTemplate.includes("${sampleSize}"),
			includeErrorRate: this.codeLensTemplate.includes("${errorRate}")
		};

		const fileLevelTelemetryResponse = await this.observabilityService.getFileLevelTelemetry(
			document.uri.toString(),
			document.languageId,
			false,
			undefined,
			methodLevelTelemetryRequestOptions
		);
		// this.resetCache = false;

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
			return [];
		}

		const allValidAnonymousMetrics: FileLevelTelemetryMetric[] = [
			...(fileLevelTelemetryResponse.averageDuration ?? []),
			...(fileLevelTelemetryResponse.errorRate ?? []),
			...(fileLevelTelemetryResponse.sampleSize ?? [])
		].filter(_ => _.functionName === "(anonymous)" && _.lineno && _.column);

		const date = fileLevelTelemetryResponse.lastUpdateDate
			? new Date(fileLevelTelemetryResponse.lastUpdateDate).toLocaleString()
			: "";

		if (allValidAnonymousMetrics.length === 0) {
			Logger.log("provideCodeLenses no valid anonymous metrics");
			return [];
		}

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
			if (!collatedMetric && metric.lineno && metric.column) {
				const currentLocation = await this.observabilityService.computeCurrentLocation(
					id,
					metric.lineno,
					metric.column,
					commit,
					metric.functionName,
					document.uri.toString()
				);
				for (const [_key, value] of Object.entries(currentLocation.locations)) {
					Logger.log(`*** currentLocation ${value.lineStart} / ${value.colStart}`);
					// Not the currentLocation column - we'd have to get the symbols from the commit sha but that is too expensive
					// But the column does give us the order of anonymous functions on the same line so we can find anonymous functions with
					// symbol provider and put them in the same order (assuming user didn't refactor the code too much)
					const currentLocation = new Range(
						new Position(value.lineStart - 1, metric.column),
						new Position(value.lineStart - 1, metric.column)
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
		}

		const inlayHints: InlayHint[] = [];
		const symbols = await this.symbolLocator.locate(document, token);
		const sortedKeys: string[] = Array.from(locationLensMap.entries())
			.sort((a, b) => {
				const aLine = a[1].currentLocation.start.line;
				const bLine = b[1].currentLocation.start.line;
				if (aLine === bLine) {
					return a[1].currentLocation.start.character - b[1].currentLocation.start.character;
				}
				return aLine - bLine;
			})
			.map(_ => _[0]);
		// Count of inlay hints per line
		const lineTracker = new Map<number, number>();
		for (const key of sortedKeys) {
			const lineLevelMetric = locationLensMap.get(key);
			if (!lineLevelMetric) {
				continue;
			}
			Logger.log(`*** processing lineLevelMetric ${key}`);
			const { currentLocation, duration, sampleSize, errorRate } = lineLevelMetric;
			// TODO get symbol at currentLocation to calculate correct InlayHint position
			const { start } = currentLocation;
			const symbolsForLine = symbols.allSymbols
				.filter(_ => _.range.start.line === start.line)
				.filter(_ => !this.isValidJavascriptFunctionName(_.name));
			const lineCount = lineTracker.get(start.line) ?? 0;
			lineTracker.set(start.line, lineCount + 1);
			const symbol = symbolsForLine[lineCount];
			symbolsForLine.forEach(_ => {
				Logger.log(`*** symbol for line ${JSON.stringify(_)}`);
			});

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

			const text = Strings.interpolate(this.codeLensTemplate, {
				averageDuration:
					duration && duration.averageDuration
						? `${duration.averageDuration.toFixed(3) || "0.00"}ms`
						: "n/a",
				sampleSize: sampleSize && sampleSize.sampleSize ? `${sampleSize.sampleSize}` : "n/a",
				errorRate:
					errorRate && errorRate.errorRate ? `${(errorRate.errorRate * 100).toFixed(2)}%` : "0.00%",
				since: fileLevelTelemetryResponse.sinceDateFormatted,
				date: date
			});
			const inlayHintLabelPart = new InlayHintLabelPart("(stats)");
			inlayHintLabelPart.command = new InstrumentableSymbolCommand(
				"show telemetry details",
				"codestream.viewMethodLevelTelemetry",
				undefined,
				[JSON.stringify(viewCommandArgs)]
			);
			inlayHintLabelPart.tooltip = text;
			const inlayHint = new InlayHint(symbol.range.start, [inlayHintLabelPart], InlayHintKind.Type);
			Logger.log(`*** inlayHint ${inlayHint.position.line}:${inlayHint.position.character}`);
			inlayHints.push(inlayHint);
		}
		return inlayHints;

		// if (currentLocation[id]) {
		// 	Logger.log(
		// 		`*** currentLocation ${currentLocation.locations[0].lineStart} ${currentLocation.locations[0].colStart}`
		// 	);
		// }
	}
}
