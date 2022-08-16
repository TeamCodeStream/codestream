import { initialize, setupCommunication } from "@codestream/webview/index";

declare function acquireHostApi();

const api = acquireHostApi();
const channel = new MessageChannel();

window.addEventListener("message", message => channel.port1.postMessage(message.data), false);
channel.port1.onmessage = message => api.postMessage(message.data);

setupCommunication(channel.port2);

initialize("#app");
