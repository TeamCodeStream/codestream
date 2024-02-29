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
} from "@codestream/protocols/webview";
import { CodeErrorsIDEApi } from "@codestream/webview/store/codeErrors/api/CodeErrorsIDEApi";
import { HostApi } from "@codestream/webview/webview-api";
import { wait } from "@codestream/webview/utils";
import { getDemoNrAiStream } from "@codestream/webview/store/codeErrors/api/data/nraiStream";
import {
	parentPostId,
	postId,
	streamId,
	unitTestPostId,
	userUnitTestPostId,
} from "@codestream/webview/store/codeErrors/api/data/createSharableCodeErrorResponse";
import { DidChangeDataNotificationType } from "@codestream/protocols/agent";
import {
	getAddPostsMain,
	getAddPostsUnitTest,
	getAddPostsUserUnitTest,
	getFinalAddPosts,
	getFinalAddPostsUnitTest,
} from "@codestream/webview/store/codeErrors/api/data/broadcasts";
import { getNraiUnitTestStream } from "@codestream/webview/store/codeErrors/api/data/nraiUnitTestStream";

class CodeErrorsIDEApiDemo implements CodeErrorsIDEApi {
	private _nraiUserId: string | undefined;
	private _userId: string | undefined;
	private _applyFixCallback: (() => void) | undefined;
	private _postReplyCallback: ((text: string) => void) | undefined;

	async startUnitTestStream() {
		const nraiUserId = this._nraiUserId;
		if (!nraiUserId) {
			return;
		}
		const unitTestStream = getNraiUnitTestStream(streamId, unitTestPostId, parentPostId);
		HostApi.instance.emit(DidChangeDataNotificationType.method, {
			type: "posts",
			data: getAddPostsUnitTest(streamId, unitTestPostId, parentPostId, nraiUserId),
		});
		await wait(400);
		for (const event of unitTestStream) {
			HostApi.instance.emit(DidChangeDataNotificationType.method, event);
			await wait(50);
		}
		await wait(400);
		HostApi.instance.emit(DidChangeDataNotificationType.method, {
			type: "posts",
			data: getFinalAddPostsUnitTest(streamId, unitTestPostId, parentPostId, nraiUserId),
		});
	}

	async startDemoGrokStream() {
		const nraiUserId = this._nraiUserId;
		if (!nraiUserId) {
			return;
		}
		const demoGrokStream = getDemoNrAiStream(streamId, postId, parentPostId);
		HostApi.instance.emit(DidChangeDataNotificationType.method, {
			type: "posts",
			data: getAddPostsMain(streamId, postId, parentPostId, nraiUserId),
		});

		await wait(400);
		for (const event of demoGrokStream) {
			HostApi.instance.emit(DidChangeDataNotificationType.method, event);
			await wait(50);
		}
		await wait(400);
		HostApi.instance.emit(DidChangeDataNotificationType.method, {
			type: "posts",
			data: getFinalAddPosts(streamId, postId, parentPostId, nraiUserId),
		});
	}

	async applyFix() {
		if (this._applyFixCallback) {
			await wait(400);
			this._applyFixCallback();
		}
	}

	async askForUnitTest() {
		if (this._postReplyCallback) {
			await wait(400);
			this._postReplyCallback("@AI Write a unit test for the suggested fix.");
		}
	}

	async clearReply() {
		if (this._postReplyCallback) {
			await wait(400);
			this._postReplyCallback("");
		}
	}

	async postUnitTestReply() {
		if (!this._userId) {
			return;
		}
		const post = getAddPostsUserUnitTest(streamId, userUnitTestPostId, parentPostId, this._userId);
		console.debug("Posting a unit test reply");
		HostApi.instance.emit(DidChangeDataNotificationType.method, {
			type: "posts",
			data: post,
		});
	}

	async startDemoSequence() {
		await this.startDemoGrokStream();
		await wait(400);
		await this.applyFix();
		await wait(400);
		await this.askForUnitTest();
		await wait(400);
		await this.postUnitTestReply();
		await wait(400);
		await this.clearReply();
		await wait(400);
		await this.startUnitTestStream();
	}

	async editorCopySymbol(request: EditorCopySymbolRequest): Promise<EditorCopySymbolResponse> {
		const result = HostApi.instance.send(EditorCopySymbolType, request);
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
}

export const codeErrorsIDEApiDemo = new CodeErrorsIDEApiDemo();
