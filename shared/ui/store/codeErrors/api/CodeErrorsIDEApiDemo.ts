import {
	EditorCopySymbolRequest,
	EditorCopySymbolResponse,
	EditorCopySymbolType,
	EditorReplaceSymbolRequest,
	EditorReplaceSymbolResponse,
	EditorReplaceSymbolType,
	EditorRevealRangeRequest,
	EditorRevealRangeRequestType,
	EditorRevealRangeResponse,
	EditorUndoType,
} from "@codestream/protocols/webview";
import { CodeErrorsIDEApi } from "@codestream/webview/store/codeErrors/api/CodeErrorsIDEApi";
import { HostApi } from "@codestream/webview/webview-api";
import { wait } from "@codestream/webview/utils";
import { getDemoNrAiStream } from "@codestream/webview/store/codeErrors/api/data/nraiStream";
import {
	codeErrorId,
	parentPostId,
	postId,
	streamId,
} from "@codestream/webview/store/codeErrors/api/data/createSharableCodeErrorResponse";
import { DidChangeDataNotificationType } from "@codestream/protocols/agent";
import {
	getAddPostsMain,
	getFinalAddPosts,
} from "@codestream/webview/store/codeErrors/api/data/broadcasts";

class CodeErrorsIDEApiDemo implements CodeErrorsIDEApi {
	private _nraiUserId: string | undefined;
	private _userId: string | undefined;
	private _applyFixCallback: (() => void) | undefined;
	private _postReplyCallback: ((text: string) => void) | undefined;
	private _repoId: string | undefined;

	async startDemoGrokStream() {
		const nraiUserId = this._nraiUserId;
		if (!nraiUserId) {
			return;
		}
		const demoGrokStream = getDemoNrAiStream(streamId, postId, parentPostId, codeErrorId);
		HostApi.instance.emit(DidChangeDataNotificationType.method, {
			type: "posts",
			data: getAddPostsMain(streamId, postId, parentPostId, nraiUserId),
		});

		await wait(400);
		for (const event of demoGrokStream) {
			HostApi.instance.emit(DidChangeDataNotificationType.method, event);
			await wait(100);
		}
		await wait(400);
		HostApi.instance.emit(DidChangeDataNotificationType.method, {
			type: "posts",
			data: getFinalAddPosts(streamId, postId, parentPostId, nraiUserId, this._repoId!),
		});
	}

	async startDemoSequence() {
		await this.startDemoGrokStream();
	}

	async editorCopySymbol(request: EditorCopySymbolRequest): Promise<EditorCopySymbolResponse> {
		const result = await HostApi.instance.send(EditorCopySymbolType, request);
		// Can be non awaited
		this.startDemoSequence();
		return result;
	}

	async editorReplaceSymbol(
		request: EditorReplaceSymbolRequest
	): Promise<EditorReplaceSymbolResponse> {
		return HostApi.instance.send(EditorReplaceSymbolType, request);
	}

	async editorRevealRange(request: EditorRevealRangeRequest): Promise<EditorRevealRangeResponse> {
		return HostApi.instance.send(EditorRevealRangeRequestType, request);
	}

	async editorUndo(times: number): Promise<void> {
		await HostApi.instance.send(EditorUndoType, { times });
		return;
	}

	setNrAiUserId(userId: string): void {
		this._nraiUserId = userId;
	}

	setUserId(userId: string): void {
		this._userId = userId;
	}

	setApplyFixCallback(callback: () => void) {
		this._applyFixCallback = callback;
	}

	setPostReplyCallback(callback: (text: string) => void) {
		this._postReplyCallback = callback;
	}

	setCurrentRepoId(repoId: string): void {
		this._repoId = repoId;
	}
}

export const codeErrorsIDEApiDemo = new CodeErrorsIDEApiDemo();
