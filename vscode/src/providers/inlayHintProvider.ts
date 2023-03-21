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
import { IObservabilityService, observabilityService } from "agent/ObservabilityService";
import {
	CollatedMetric,
	InstrumentableSymbolCommand,
	isFileLevelTelemetryAverageDuration,
	isFileLevelTelemetryErrorRate,
	isFileLevelTelemetrySampleSize
} from "./instrumentationCodeLensProvider";
import { configuration } from "configuration";
import { ViewMethodLevelTelemetryCommandArgs } from "commands";
import { Stopwatch } from "@codestream/utils/system/stopwatch";
import Cache from "timed-cache";

export class CodeStreamInlayHintsProvider implements InlayHintsProvider, Disposable {
	// TODO limit to languages we support?
	static selector: DocumentSelector = [{ scheme: "file" }, { scheme: "untitled" }];

	private readonly _disposable: Disposable;
	private readonly codeLensTemplate: string;
	private _disposableSignedIn: Disposable | undefined;
	private _cache = new Cache<Map<string, CollatedMetric>>();

	constructor(
		private symbolLocator: ISymbolLocator = new SymbolLocator(),
		private _observabilityService: IObservabilityService = observabilityService
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
	// anonymous functions by the fact that they are invalid javascript variable names
	private isValidJavascriptFunctionName(functionName: string): boolean {
		return functionName.match(/^[a-zA-Z_$][0-9a-zA-Z_$]*$/) != null;
	}

	public async provideInlayHints(
		document: TextDocument,
		range: Range,
		token: CancellationToken
	): Promise<InlayHint[]> {
		const overallStopwatch = Stopwatch.createAndStart("provideInlayHints total");
		Logger.debug(
			`provideInlayHints called with ${document.fileName} ${range.start.line}:${range.start.character} ${range.end.line}:${range.end.character}`
		);

		const methodLevelTelemetryRequestOptions: FileLevelTelemetryRequestOptions = {
			includeAverageDuration: this.codeLensTemplate.includes("${averageDuration}"),
			includeThroughput: this.codeLensTemplate.includes("${sampleSize}"),
			includeErrorRate: this.codeLensTemplate.includes("${errorRate}")
		};

		const fileLevelTelemetryStopwatch = Stopwatch.createAndStart("getFileLevelTelemetry");
		const fileLevelTelemetryResponse = await this._observabilityService.getFileLevelTelemetry(
			document.uri.toString(),
			document.languageId,
			false,
			undefined,
			methodLevelTelemetryRequestOptions
		);
		// this.resetCache = false;
		fileLevelTelemetryStopwatch.stop();
		Logger.debug(`provideInlayHints ${fileLevelTelemetryStopwatch.report()}`);

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

		const computeLoopStopwatch = Stopwatch.createAndStart("computeCurrentLocationLoop");
		let loopCount = 0;
		const locationMapKey = `${document.uri.toString()}:${document.version}`;
		let locationLensMap = this._cache.get(locationMapKey) ?? new Map<string, CollatedMetric>();
		if (!this._cache.get(locationMapKey)) {
			for (const metric of allValidAnonymousMetrics) {
				const commit = metric.commit ?? fileLevelTelemetryResponse.deploymentCommit;
				if (!commit) {
					continue;
				}
				const id = `${document.uri.toString()}|${metric.lineno}|${metric.column}|${commit}|${
					metric.functionName
				}`;

				let collatedMetric = locationLensMap.get(id);
				if (!collatedMetric && metric.lineno && metric.column) {
					const currentLocationStopwatch = Stopwatch.createAndStart(
						`computeCurrentLocation ${loopCount++}`
					);
					const currentLocation = await this._observabilityService.computeCurrentLocation(
						id,
						metric.lineno,
						metric.column,
						commit,
						metric.functionName ?? "(anonymous)",
						document.uri.toString()
					);
					currentLocationStopwatch.stop();
					Logger.debug(`provideInlayHints ${currentLocationStopwatch.report()}`);
					for (const [_key, value] of Object.entries(currentLocation.locations)) {
						Logger.debug(`currentLocation ${value.lineStart} / ${value.colStart}`);
						// Not the currentLocation column - we'd have to get the symbols from the commit sha but that is too
						// expensive But the column does give us the order of anonymous functions on the same line so we can find
						// anonymous functions with symbol provider and put them in the same order (assuming user didn't refactor
						// the code too much)
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
			// Remove entries that have more than one metrics per lineno
			const finalLocationLensMap = new Map<string, CollatedMetric>();
			const keyArray = Array.from(locationLensMap.keys());
			for (const key of keyArray) {
				// [0] is the document uri, [1] is the line number
				const lineCount = keyArray.filter(_ => _.split("|")[1] === key.split("|")[1]).length;
				if (lineCount > 1) {
					// lineCount === 1 handled in instrumentationCodeLensProvider
					// TODO did I just realize there can be multiple named functions on the same line?
					Logger.debug(`adding ${key} to finalLocationLensMap`);
					finalLocationLensMap.set(key, locationLensMap.get(key)!);
				}
			}
			locationLensMap = finalLocationLensMap;
			this._cache.put(locationMapKey, locationLensMap);
		} else {
			Logger.debug(`provideInlayHints cache hit ${locationMapKey}`);
		}
		computeLoopStopwatch.stop();
		Logger.debug(`provideInlayHints ${computeLoopStopwatch.report()}`);

		const computePhaseStopwatch = Stopwatch.createAndStart("computePhase");
		const inlayHints: InlayHint[] = [];
		const symbolLocatorStopwatch = Stopwatch.createAndStart("symbolLocator");
		const symbols = await this.symbolLocator.locate(document, token);
		symbolLocatorStopwatch.stop();
		Logger.debug(`provideInlayHints ${symbolLocatorStopwatch.report()}`);

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
			const { currentLocation, duration, sampleSize, errorRate } = lineLevelMetric;
			const { start } = currentLocation;
			const symbolsForLine = symbols.allSymbols
				.filter(_ => _.range.start.line === start.line)
				.filter(_ => !this.isValidJavascriptFunctionName(_.name));
			const lineCount = lineTracker.get(start.line) ?? 0;
			lineTracker.set(start.line, lineCount + 1);
			const symbol = symbolsForLine[lineCount];
			// symbolsForLine.forEach(_ => {
			// 	Logger.debug(`symbol for line ${JSON.stringify(_)}`);
			// });

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
			// Logger.debug(`inlayHint ${inlayHint.position.line}:${inlayHint.position.character}`);
			inlayHints.push(inlayHint);
		}
		computePhaseStopwatch.stop();
		Logger.debug(`provideInlayHints ${computePhaseStopwatch.report()}`);
		overallStopwatch.stop();
		Logger.debug(`provideInlayHints ${overallStopwatch.report()}`);
		return inlayHints;

		// if (currentLocation[id]) {
		// 	Logger.log(
		// 		`*** currentLocation ${currentLocation.locations[0].lineStart} ${currentLocation.locations[0].colStart}`
		// 	);
		// }
	}
}
