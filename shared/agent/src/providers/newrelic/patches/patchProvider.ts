import { applyPatch, parsePatch } from "diff";
import { Disposable, lsp, lspHandler } from "system";
import {
	ApplyPatchRequest,
	ApplyPatchResponse,
	ApplyPatchType,
	ERROR_GENERIC_USE_ERROR_MESSAGE,
} from "@codestream/protocols/agent";
import * as fs from "fs/promises";
import { existsSync } from "fs";
import { ResponseError } from "vscode-languageserver";
import { URI } from "vscode-uri";

@lsp
export class PatchProvider implements Disposable {
	@lspHandler(ApplyPatchType)
	async applyPatchToFile(request: ApplyPatchRequest): Promise<ApplyPatchResponse> {
		const { fileUri, patch } = request;
		const uri = URI.parse(fileUri);
		// Check if the file exists
		if (!existsSync(uri.fsPath)) {
			throw new ResponseError(ERROR_GENERIC_USE_ERROR_MESSAGE, "File not found");
		}
		const fileContents = await fs.readFile(uri.fsPath, "utf8");
		const diff = parsePatch(patch);
		if (!diff || diff.length === 0) {
			throw new Error("Invalid patch");
		}
		const result = applyPatch(fileContents, diff[0]);
		if (!result) {
			throw new Error("Patch failed");
		}
		// Write the patch result back to the file
		await fs.writeFile(uri.fsPath, result);
		return { success: true };
	}

	dispose() {}
}
