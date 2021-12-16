"use strict";

import * as fs from "fs";
import {
	CancellationToken,
	ConfigurationChangeEvent,
	Disposable,
	DocumentSymbol,
	TextDocument,
	TextEditor,
	TextEditorDecorationType,
	window
} from "vscode";
import * as vscode from "vscode";
import {
	CodeStreamDiffUriData,
	MethodLevelTelemetryRequestOptions
} from "@codestream/protocols/agent";
import { SessionStatus, SessionStatusChangedEvent } from "../api/session";
import { Strings } from "../system";
import { configuration } from "../configuration";
import * as csUri from "../system/uri";
import { Container } from "../container";
import { Logger } from "../logger";

const positionStyleMap: { [key: string]: string } = {
	inline: "display: inline-block; margin: 0 0.5em 0 0; vertical-align: middle;",
	overlay:
		"display: inline-block; left: 0; position: absolute; top: 50%; transform: translateY(-50%)"
};

const buildDecoration = (position: string) => {
	const pngPath = Container.context.asAbsolutePath("assets/images/eye.png");
	try {
		const pngBase64 = fs.readFileSync(pngPath, { encoding: "base64" });
		const pngInlineUrl = `data:image/png;base64,${pngBase64}`;

		return {
			contentText: "",
			height: "16px",
			width: "16px",

			textDecoration: `none; background-image: url(${pngInlineUrl}); background-position: center; background-repeat: no-repeat; background-size: contain; ${positionStyleMap[position]}`
		};
	} catch (e) {
		return;
	}
};

const MarkerPositions = ["inline", "overlay"];
const MarkerTypes = ["comment"];
const MarkerColors = ["blue", "green", "yellow", "orange", "red", "purple", "aqua", "gray"];

const sleep = async (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
const tokenSanitizeRegex = /\$\{(?:'.*?[^\\]'|\W*)?(\w*?)(?:'.*?[^\\]'|[\W\d]*)\}/g;
const tokenSanitizeReplacement = "$${$1=this.$1,($1 == null ? '' : $1)}";

const interpolationMap = new Map<string, Function>();

export function interpolate(template: string, context: object | undefined): string {
	if (template == null || template.length === 0) return template;
	if (context == null) return template.replace(tokenSanitizeRegex, "");

	let fn = interpolationMap.get(template);
	if (fn == null) {
		// eslint-disable-next-line @typescript-eslint/no-implied-eval
		fn = new Function(
			`return \`${template.replace(tokenSanitizeRegex, tokenSanitizeReplacement)}\`;`
		);
		interpolationMap.set(template, fn);
	}

	return fn.call(context);
}

export class InstrumentationDecorationProvider
	implements
		// HoverProvider,
		vscode.Disposable,
		vscode.CodeLensProvider {
	private readonly _disposable: Disposable;
	private _decorationTypes: { [key: string]: TextEditorDecorationType } | undefined;
	private _enabledDisposable: Disposable | undefined;
	private _suspended = false;

	constructor() {
		this._disposable = Disposable.from(
			configuration.onDidChange(this.onConfigurationChanged, this),
			Container.session.onDidChangeSessionStatus(this.onSessionStatusChanged, this)
		);
	}

	dispose() {
		this.disable();
		this._disposable && this._disposable.dispose();
	}

	private onConfigurationChanged(e: ConfigurationChangeEvent) {
		// if (configuration.changed(e, configuration.name("showInstrumentationGlyphs").value)) {
		// 	this.ensure(true);
		// }
	}

	private onSessionStatusChanged(e: SessionStatusChangedEvent) {
		switch (e.getStatus()) {
			case SessionStatus.SignedOut:
				this.disable();
				break;

			case SessionStatus.SignedIn: {
				this.ensure();
				break;
			}
		}
	}

	private ensure(reset: boolean = false) {
		if (!Container.config.showMarkerGlyphs || !Container.session.signedIn) {
			this.disable();

			return;
		}

		if (reset) {
			this.disable();
		}
		this.enable();
	}

	private disable() {
		if (this._enabledDisposable === undefined) return;

		for (const editor of this.getApplicableVisibleEditors()) {
			this.clear(editor);
		}

		this._enabledDisposable.dispose();
		this._enabledDisposable = undefined;
	}

	private enable() {
		if (
			this._enabledDisposable !== undefined ||
			Container.session.status !== SessionStatus.SignedIn
		) {
			return;
		}

		//	const decorationTypes: { [key: string]: TextEditorDecorationType } = Object.create(null);

		if (!this._suspended) {
			// for (const position of MarkerPositions) {
			// 	for (const type of MarkerTypes) {
			// 		for (const color of MarkerColors) {
			// 			const key = `${position}-${type}-${color}`;
			// 			const before = buildDecoration(position);
			// 			if (before) {
			// 				decorationTypes[key] = window.createTextEditorDecorationType({
			// 					before
			// 				});
			// 			}
			// 		}
			// 	}
			// }
		}

		//	this._decorationTypes = decorationTypes;

		const subscriptions: Disposable[] = [
			//	...Object.values(decorationTypes),
			Container.session.onDidChangeSessionStatus(this.onSessionStatusChanged, this)
			//	window.onDidChangeVisibleTextEditors(this.onEditorVisibilityChanged, this),
			// vscode.workspace.onDidCloseTextDocument(this.onDocumentClosed, this),
			// vscode.workspace.onDidSaveTextDocument((e: TextDocument) => {
			// 	this.f(e);
			// })
		];

		// if (!this._suspended) {
		// 	subscriptions.push(vscode.languages.registerHoverProvider({ scheme: "file" }, this));
		// 	subscriptions.push(
		// 		vscode.languages.registerHoverProvider({ scheme: "codestream-diff" }, this)
		// 	);
		// }

		this._enabledDisposable = Disposable.from(...subscriptions);

		// this.applyToApplicableVisibleEditors();
	}

	// applyToApplicableVisibleEditors(editors = window.visibleTextEditors) {
	// 	const editorsToWatch = new Map<string, () => void>();

	// 	for (const e of this.getApplicableVisibleEditors(editors)) {
	// 		const key = e.document.uri.toString();
	// 		editorsToWatch.set(
	// 			key,
	// 			(this._watchedEditorsMap && this._watchedEditorsMap.get(key)) ||
	// 				Functions.debounce(() => this.apply(e, true), 1000)
	// 		);

	// 		this.apply(e);
	// 	}

	// 	this._watchedEditorsMap = editorsToWatch;
	// }

	private getApplicableVisibleEditors(editors = window.visibleTextEditors) {
		return editors.filter(this.isApplicableEditor);
	}

	private isApplicableEditor(editor: TextEditor | undefined) {
		if (!editor || !editor.document) return false;

		if (editor.document.uri.scheme === "file") return true;

		// check for review diff
		const parsedUri = Strings.parseCSReviewDiffUrl(editor.document.uri.toString());
		if (parsedUri) {
			return parsedUri.version === "right";
		}

		// check for PR diff
		const codeStreamDiff = csUri.Uris.fromCodeStreamDiffUri<CodeStreamDiffUriData>(
			editor.document.uri.toString()
		);
		if (codeStreamDiff) {
			return codeStreamDiff.side === "right";
		}

		return false;
	}

	// private async onDocumentClosed(e: TextDocument) {
	// 	if (this._current.length) {
	// 		console.log(e);
	// 		this._current.forEach(_ => _.val.dispose());
	// 	}
	// }

	// async apply(editor: TextEditor | undefined, force: boolean = false) {
	// 	if (
	// 		this._decorationTypes === undefined ||
	// 		!Container.session.signedIn ||
	// 		!this.isApplicableEditor(editor)
	// 	) {
	// 		return;
	// 	}
	// 	if (editor && editor.document) {
	// 		this.f(editor.document!);
	// 	}
	// 	console.log(force);
	// 	// const decorations = await this.provideDecorations(editor!);
	// 	// if (Object.keys(decorations).length === 0) {
	// 	// 	this.clear(editor);
	// 	// 	return;
	// 	// }

	// 	// for (const [key, value] of Object.entries(this._decorationTypes)) {
	// 	// 	editor!.setDecorations(value, (decorations[key] as any) || emptyArray);
	// 	// }
	// }

	// private async onEditorVisibilityChanged(editors: vscode.TextEditor[]) {
	// 	for (const e of editors) {
	// 		this.f(e.document);
	// 	}
	// }

	clear(editor: TextEditor | undefined = window.activeTextEditor) {
		if (editor === undefined || this._decorationTypes === undefined) return;

		// for (const decoration of Object.values(this._decorationTypes)) {
		// 	editor.setDecorations(decoration, emptyArray);
		// }
	}

	// async provideHover(
	// 	document: TextDocument,
	// 	position: Position,
	// 	token: CancellationToken
	// ): Promise<Hover | undefined> {
	// 	const regex = new RegExp(this.regex);
	// 	console.log(position, token);

	// 	const line = document.lineAt(position.line);

	// 	// // const indexOf = line.text.indexOf(matches[0]);
	// 	// // 	const position = new vscode.Position(line.lineNumber, indexOf);
	// 	// const range = document.getWordRangeAtPosition(position, new RegExp(this.regex));
	// 	// const text = document.getText(range);
	// 	const matches = regex.exec(line.text);

	// 	if (matches) {
	// 		let message = "";
	// 		message += ` \n\n[__View Custom Transaction \u2197__](command:codestream.instrumentationOpen?${encodeURIComponent(
	// 			JSON.stringify({ name: matches[2].replace(/['"]/g, "") })
	// 		)} " View Custom Transaction")`;
	// 		const markdown = new vscode.MarkdownString(message, true);
	// 		markdown.isTrusted = true;
	// 		return new Hover(markdown, line.range);
	// 	}

	// 	return undefined;
	// }

	async getSymbols(
		document: TextDocument,
		token: vscode.CancellationToken
	): Promise<DocumentSymbol[]> {
		let symbols: DocumentSymbol[] | undefined = [];

		for (const timeout of [0, 750, 1500, 3000]) {
			if (token.isCancellationRequested) {
				return [];
			}
			symbols = await vscode.commands.executeCommand<DocumentSymbol[]>(
				"vscode.executeDocumentSymbolProvider",
				document.uri
			);
			if (!symbols || symbols.length === 0) {
				await sleep(timeout);
			} else {
				Logger.log("getSymbols found", { timeout });
				return symbols || [];
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

	private _languageSupport = new Set<string>(["python"]);

	public async provideCodeLenses(
		document: vscode.TextDocument,
		token: vscode.CancellationToken
	): Promise<vscode.CodeLens[]> {
		let codeLenses: vscode.CodeLens[] = [];

		if (!this._languageSupport.has(document.languageId)) return codeLenses;

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

		// TODO move to settings?
		const template =
			"avg duration: ${averageDuration}ms | throughput: ${throughput}rpm | error rate: ${errorsPerMinute}% - since ${since}";

		const options: MethodLevelTelemetryRequestOptions = {
			includeAverageDuration: template.indexOf("${averageDuration}") > -1,
			includeThroughput: template.indexOf("${throughput}") > -1,
			includeErrorRate: template.indexOf("${errorsPerMinute}") > -1
		};

		if (token.isCancellationRequested) return [];

		const methodLevelTelemetryResponse = await Container.agent.observability.getMethodLevelTelemetry(
			document.fileName,
			document.languageId,
			options
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
		} - ${date ? `since ${date}` : ""}`;

		const lenses = instrumentableSymbols.map(_ => {
			// "avg duration: 40.8ms | throughput: 360rpm | error rate: 0.3% - Nov 29, 2021 7:12",
			const throughputForFunction = methodLevelTelemetryResponse.throughput
				? methodLevelTelemetryResponse.throughput.find((i: any) => i.function === _.symbol.name)
				: undefined;

			const averageDurationForFunction = methodLevelTelemetryResponse.averageDuration
				? methodLevelTelemetryResponse.averageDuration.find(
						(i: any) => i.function === _.symbol.name
				  )
				: undefined;

			const errorRateForFunction = methodLevelTelemetryResponse.errorRate
				? methodLevelTelemetryResponse.errorRate.find((i: any) => i.function === _.symbol.name)
				: undefined;

			if (!throughputForFunction && !averageDurationForFunction && !errorRateForFunction) {
				// no data at all!
				return undefined;
			}

			return new vscode.CodeLens(
				_.symbol.range,
				new InstrumentableSymbolCommand(
					Strings.interpolate(template, {
						throughput: throughputForFunction
							? throughputForFunction.requestsPerMinute.toFixed(2)
							: "n/a",
						averageDuration: averageDurationForFunction
							? averageDurationForFunction.averageDuration.toFixed(2) || "0.00"
							: "n/a",
						errorsPerMinute: errorRateForFunction
							? errorRateForFunction.errorsPerMinute.toFixed(2) || "0"
							: "n/a",
						since: methodLevelTelemetryResponse.sinceDateFormatted,
						date: date
					}),
					"anyCommand",
					tooltip,
					["argument1"]
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
