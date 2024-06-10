import { CSCodeError } from "../../protocol/agent/api.protocol.models";

export function clearResolvedFlag(codeErrors: CSCodeError[]) {
	for (const codeError of codeErrors) {
		if (codeError.stackTraces) {
			for (const stackTrace of codeError.stackTraces) {
				for (const stackLine of stackTrace.lines) {
					stackLine.resolved = undefined;
				}
			}
		}
	}
}
