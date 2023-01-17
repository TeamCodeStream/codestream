import { Strings } from "../system";
import { Disposable, TextDocumentContentProvider, Uri, workspace } from "vscode";

import { Container } from "../container";

export class GitContentProvider implements TextDocumentContentProvider, Disposable {
	private readonly _disposable: Disposable;

	constructor() {
		this._disposable = Disposable.from(
			workspace.registerTextDocumentContentProvider("codestream-git", this)
		);
	}

	async provideTextDocumentContent(uri: Uri): Promise<string> {
		const { path, sha } = Strings.parseGitUrl(uri);
		const contents = await Container.agent.scm.getFileContentsAtRevision(undefined, path, sha);
		return contents.content || "";
	}

	dispose() {
		this._disposable.dispose();
	}
}

export function toCSGitUri(uri: Uri, ref: string): Uri {
	return uri.with({
		scheme: "codestream-git",
		query: JSON.stringify({
			sha: ref,
			shortSha: isSha(ref) ? ref.substr(0, 7) : ref
		})
	});
}

const shaRegExp = /^[a-f0-9]{40}$/i;
const isSha = (ref: string | undefined) => ref && shaRegExp.test(ref);
