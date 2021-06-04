export { SessionState } from "@codestream/webview/ipc/webview.protocol";

export enum SessionActionType {
	Set = "@session/SetSession",
	SetMaintenanceMode = "@session/SetMaintenanceMode",
	SetTOS = "@session/SetTOS"
}
