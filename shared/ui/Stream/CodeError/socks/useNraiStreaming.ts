import { SocketClient } from "@codestream/webview/Stream/CodeError/socks/SockClient";
import { useAppDispatch, useDidMount } from "@codestream/webview/utilities/hooks";
import {
	appendStreamingResponse,
	CommentMsg,
	StreamingResponseMsg,
} from "@codestream/webview/store/discussions/discussionsSlice";

let sockClient: SocketClient | undefined;

async function initWebsockets(handler: (data: StreamingResponseMsg) => void) {
	if (!sockClient) {
		sockClient = new SocketClient();
		sockClient.onEvent(
			{
				eventName: "GROKSTREAM",
				handler,
			},
			"codestream-non-nerdpack"
		);
		sockClient.onEvent({ eventName: "COMMENT", handler }, "codestream-non-nerdpack");
		await sockClient.init();
	}
}

export default function useNraiStreaming() {
	const dispatch = useAppDispatch();

	const handler = async (data: StreamingResponseMsg | CommentMsg) => {
		// console.log("GROKSTREAM hook", data);
		dispatch(appendStreamingResponse(data));
	};

	useDidMount(() => {
		initWebsockets(handler);
	});

	// console.debug("*** useNraiStreaming");
	return {};
}
