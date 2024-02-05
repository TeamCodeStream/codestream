import {
	DocumentSymbolProvider,
	TextDocument,
	DocumentSymbol,
	CancellationToken,
	SymbolInformation,
	Range,
	Position,
	Disposable
} from "vscode";
import { Logger } from "../logger";
import { CodeStreamSession, SessionStatus, SessionStatusChangedEvent } from "../api/session";

import { CodeStreamAgentConnection } from "../agent/agentConnection";

export class NrqlDocumentSymbolProvider implements DocumentSymbolProvider, Disposable {
	private _disposable: Disposable | undefined;
	private _status: SessionStatus | undefined = undefined;

	constructor(
		private session: CodeStreamSession,
		private agent: CodeStreamAgentConnection
	) {
		this._status = this.session.status;
		this._disposable = Disposable.from(
			session.onDidChangeSessionStatus(this.onSessionStatusChanged, this)
		);
	}

	public async provideDocumentSymbols(
		document: TextDocument,
		token: CancellationToken
	): Promise<SymbolInformation[] | DocumentSymbol[] | null | undefined> {
		if (this._status !== SessionStatus.SignedIn) {
			return [];
		}
		let uriString;
		try {
			uriString = document.uri.toString();

			// this is a "built-in" method
			const parsed = (await this.agent.sendRawRequest(
				"textDocument/documentSymbol",
				{
					textDocument: {
						uri: uriString
					}
				},
				token
			)) as DocumentSymbol[];

			const results = this.adjustSymbolRanges(parsed);
			Logger.log(
				`nrqlDocumentSymbolProvider:provideDocumentSymbols returning results=${results?.length} for ${uriString}`
			);
			return results;
		} catch (ex) {
			Logger.warn(`nrqlDocumentSymbolProvider:provideDocumentSymbols for ${uriString}`, {
				error: ex
			});
		}
		return [];
	}

	public update(status: SessionStatus) {
		this._status = status;
	}

	public dispose() {
		this._disposable && this._disposable.dispose();
	}

	private onSessionStatusChanged(e: SessionStatusChangedEvent) {
		this._status = e.getStatus();
		Logger.log(`NrqlDocumentSymbolProvider:provideDocumentSymbols status=${this._status}`);
	}

	private adjustSymbolRanges(symbols: DocumentSymbol[]): DocumentSymbol[] {
		// Adjust symbol ranges from LSP format (zero-based line and character positions) to VSCode format (zero-based line, one-based character positions)
		return symbols.map(symbol => {
			const range = symbol.range;
			const adjustedRange = new Range(
				new Position(range.start.line, range.start.character + 1),
				new Position(range.end.line, range.end.character + 1)
			);
			return new DocumentSymbol(
				symbol.name,
				symbol.detail,
				symbol.kind,
				adjustedRange,
				adjustedRange
			);
		});
	}
}
