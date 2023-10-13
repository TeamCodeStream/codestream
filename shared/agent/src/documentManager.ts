"use strict";
import path from "path";
import {
	Connection,
	Disposable,
	Emitter,
	Event,
	TextDocument,
	TextDocumentChangeEvent,
	TextDocuments,
} from "vscode-languageserver";
import { URI } from "vscode-uri";
import { isWindows } from "./git/shell";
import { Logger } from "./logger";
import { Disposables } from "./system";
const escapedRegex = /(^.*?:\/\/\/)([a-z])%3A(\/.*$)/;
const unescapedRegex = /(^.*?:\/\/\/)([a-zA-Z]):(\/.*$)/;

export class DocumentManager implements Disposable {
	private _onDidChangeContent = new Emitter<TextDocumentChangeEvent>();
	get onDidChangeContent(): Event<TextDocumentChangeEvent> {
		return this._onDidChangeContent.event;
	}

	private _onDidOpen = new Emitter<TextDocumentChangeEvent>();
	get onDidOpen(): Event<TextDocumentChangeEvent> {
		return this._onDidOpen.event;
	}

	private _onDidClose = new Emitter<TextDocumentChangeEvent>();
	get onDidClose(): Event<TextDocumentChangeEvent> {
		return this._onDidClose.event;
	}

	private readonly _disposable: Disposable;

	private readonly _normalizedUriLookup = new Map<string, string>();

	constructor(
		private readonly _documents: TextDocuments,
		connection: Connection
	) {
		this._disposable = Disposables.from(
			this._documents.onDidChangeContent(async e => {
				this._onDidChangeContent.fire(e);
			}),
			this._documents.onDidOpen(e => {
				Logger.debug(`Document opened: ${e.document.uri}`);
				this._onDidOpen.fire(e);
			}),
			this._documents.onDidClose(e => {
				Logger.debug(`Document closed: ${e.document.uri}`);
				this._onDidClose.fire(e);
			})
		);

		this._documents.listen(connection);
	}

	dispose() {
		this._disposable && this._disposable.dispose();
	}

	_encodePath(fullpath: string): string {
		let filePart = "";
		const match = fullpath.match(/^(file:\/*)/);
		if (match) {
			filePart = match[1];
			fullpath = fullpath.substring(filePart.length);
		}
		const parsed = path.parse(fullpath);
		const dir = parsed.dir
			.split(path.sep)
			.map(part => encodeURIComponent(part))
			.join(path.sep);
		const name = encodeURIComponent(parsed.name);
		const ext = encodeURIComponent(parsed.ext);
		return `${filePart}${parsed.root}${dir}${path.sep}${name}${ext}`;
	}

	get(uri: string): TextDocument | undefined {
		const key = this._normalizedUriLookup.get(uri);
		if (key !== undefined) {
			return this._documents.get(key);
		}

		let doc = this._documents.get(uri);
		if (doc !== undefined) return doc;

		const parsedUri = URI.parse(uri);
		const decodedUri = parsedUri.toString(true);
		const encodedSpacesUri = decodedUri.replace(/ /g, "%20");
		const encodedPathUri = this._encodePath(decodedUri);
		doc =
			this._documents.get(decodedUri) ||
			this._documents.get(encodedSpacesUri) ||
			this._documents.get(encodedPathUri) ||
			this._documents.get(parsedUri.toString(false));
		if (doc !== undefined) {
			this._normalizedUriLookup.set(uri, doc.uri);
		}

		if (doc || !isWindows) {
			return doc;
		}

		// If we are on windows we have to do some drive letter manipulation to support different editor using different uri formatting
		let match = unescapedRegex.exec(uri);
		if (match != null) {
			const escapedUriLowerCaseDrive = uri.replace(
				unescapedRegex,
				function (_, start: string, drive: string, end: string) {
					return `${start}${drive.toLowerCase()}%3A${end}`;
				}
			);
			doc = this._documents.get(escapedUriLowerCaseDrive);
			if (doc !== undefined) {
				this._normalizedUriLookup.set(uri, doc.uri);
				return doc;
			}

			const unescapedUriUpperCaseDrive = uri.replace(
				unescapedRegex,
				function (_, start: string, drive: string, end: string) {
					return `${start}${drive.toUpperCase()}:${end}`;
				}
			);
			doc = this._documents.get(unescapedUriUpperCaseDrive);
			if (doc !== undefined) {
				this._normalizedUriLookup.set(uri, doc.uri);
				return doc;
			}
		}

		match = unescapedRegex.exec(encodedSpacesUri);
		if (match != null) {
			const escapedUriLowerCaseDrive = encodedSpacesUri.replace(
				unescapedRegex,
				function (_, start: string, drive: string, end: string) {
					return `${start}${drive.toLowerCase()}%3A${end}`;
				}
			);
			doc = this._documents.get(escapedUriLowerCaseDrive);
			if (doc !== undefined) {
				this._normalizedUriLookup.set(uri, doc.uri);
				return doc;
			}

			const upperCaseDrive = encodedSpacesUri.replace(
				unescapedRegex,
				function (_, start: string, drive: string, end: string) {
					return `${start}${drive.toUpperCase()}:${end}`;
				}
			);
			doc = this._documents.get(upperCaseDrive);
			if (doc !== undefined) {
				this._normalizedUriLookup.set(uri, doc.uri);
				return doc;
			}
		}

		match = escapedRegex.exec(uri);
		if (match != null) {
			let unescapedUri = uri.replace(
				escapedRegex,
				function (_, start: string, drive: string, end: string) {
					return `${start}${drive.toUpperCase()}:${end}`;
				}
			);
			doc = this._documents.get(unescapedUri);
			if (doc !== undefined) {
				this._normalizedUriLookup.set(uri, doc.uri);

				return doc;
			}

			unescapedUri = uri.replace(escapedRegex, function (start, drive: string, end) {
				return `${start}${drive.toLowerCase()}:${end}`;
			});
			doc = this._documents.get(unescapedUri);
			if (doc !== undefined) {
				this._normalizedUriLookup.set(uri, doc.uri);
			}

			return doc;
		}

		return undefined;
	}
}
