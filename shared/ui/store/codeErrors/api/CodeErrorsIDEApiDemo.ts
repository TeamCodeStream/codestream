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
import { getDemoGrokStream } from "@codestream/webview/store/codeErrors/api/data/grokStream";
import {
	parentPostId,
	postId,
	streamId,
} from "@codestream/webview/store/codeErrors/api/data/createSharableCodeErrorResponse";
import { DidChangeDataNotificationType } from "@codestream/protocols/agent";
import { getAddPostsMain } from "@codestream/webview/store/codeErrors/api/data/broadcasts";

// const dispatch = useAppDispatch();

async function startDemoGrokStream(nrAiUserId: string) {
	console.log("*** startDemoGrokStream ***");
	const demoGrokStream = getDemoGrokStream(streamId, postId, parentPostId);
	HostApi.instance.emit(DidChangeDataNotificationType.method, {
		type: "posts",
		data: getAddPostsMain(streamId, postId, parentPostId, nrAiUserId),
	});

	await wait(400);
	for (const event of demoGrokStream) {
		HostApi.instance.emit(DidChangeDataNotificationType.method, event);
		await wait(100);
	}
}

class CodeErrorsIDEApiDemo implements CodeErrorsIDEApi {
	private _nraiUserId: string | undefined;

	async editorCopySymbol(request: EditorCopySymbolRequest): Promise<EditorCopySymbolResponse> {
		const result = HostApi.instance.send(EditorCopySymbolType, request);
		// Can be non awaited
		startDemoGrokStream(this._nraiUserId!);
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
}

export const codeErrorsIDEApiDemo = new CodeErrorsIDEApiDemo();
