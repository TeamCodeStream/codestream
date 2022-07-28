"use strict";

import opn from "opn";
import * as path from "path";

export function openUrl(target: string) {
	const opts = {
		wait: false
	} as any;

	// @ts-ignore
	if (process.pkg !== undefined && process.platform === "linux") {
		// This script is part of the opn module, but it can't be invoked directly
		// from the PKGed agent. All IDE plugins that care about Linux and use
		// the PGKed agent must extract it as a sibling of the agent executable.
		const dir = path.dirname(process.execPath);
		opts.app = path.join(dir, "xdg-open");
	}

	return opn(target, opts);
}
