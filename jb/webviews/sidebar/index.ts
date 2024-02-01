import { initialize, setupCommunication } from "@codestream/webview/index";

declare function acquireHostApi();

// const api = acquireHostApi();

// @ts-ignore
window.messageQueue = [];
// @ts-ignore
window.api = window.acquireHostApi ? acquireHostApi() : {
    postMessage: function(data) {
        // @ts-ignore
        messageQueue.push(data);
    }
}
const channel = new MessageChannel();

window.addEventListener("message", message => channel.port1.postMessage(message.data), false);
// @ts-ignore
channel.port1.onmessage = message => api.postMessage(message.data);

setupCommunication(channel.port2);

initialize("#app");
