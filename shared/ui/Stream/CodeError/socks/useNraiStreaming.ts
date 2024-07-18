import { SocketClient } from "@codestream/webview/Stream/CodeError/socks/SockClient";
import { useAppDispatch, useDidMount } from "@codestream/webview/utilities/hooks";
import {
	appendStreamingResponse,
	CommentMsg,
	StreamingResponseMsg,
} from "@codestream/webview/store/discussions/discussionsSlice";
import { fetchComment } from "@codestream/webview/store/discussions/thunks";

let sockClient: SocketClient | undefined;

async function initWebsockets(
	grokStreamHandler: (data: StreamingResponseMsg) => void,
	commentHandler: (data: CommentMsg) => void
) {
	if (!sockClient) {
		sockClient = new SocketClient();
		sockClient.onEvent(
			{
				eventName: "GROKSTREAM",
				handler: grokStreamHandler,
			},
			"codestream-non-nerdpack"
		);
		sockClient.onEvent(
			{ eventName: "COMMENT", handler: commentHandler },
			"codestream-non-nerdpack"
		);
		await sockClient.init();
	}
}

export default function useNraiStreaming() {
	const dispatch = useAppDispatch();

	const grokStreamHandler = async (data: StreamingResponseMsg) => {
		dispatch(appendStreamingResponse(data));
	};

	const commentHandler = async (data: CommentMsg) => {
		dispatch(fetchComment(data));
	};

	useDidMount(() => {
		initWebsockets(grokStreamHandler, commentHandler);
	});

	return {};
}
