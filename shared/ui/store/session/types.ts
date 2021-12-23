import { SessionState as _SessionState } from "../../ipc/webview.protocol.common";
export type SessionState = _SessionState;

export enum SessionActionType {
	Set = "@session/SetSession",
	SetMaintenanceMode = "@session/SetMaintenanceMode",
	SetTOS = "@session/SetTOS"
}
