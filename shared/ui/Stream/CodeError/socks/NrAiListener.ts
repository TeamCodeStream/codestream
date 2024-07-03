import { HostApi } from "@codestream/webview/webview-api";
import { GetCollaborationWebsocketInfoRequestType } from "@codestream/protocols/agent";

export async function initWebsockets() {
	const wsUrlInfo = await HostApi.instance.send(GetCollaborationWebsocketInfoRequestType, {});
	const url = new WebSocket(wsUrlInfo.url);
}
