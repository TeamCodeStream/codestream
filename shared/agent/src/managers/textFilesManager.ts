import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import {
	DeleteTextFileRequest,
	DeleteTextFileResponse,
	ReadTextFileRequest,
	ReadTextFileRequestType,
	ReadTextFileResponse,
	WriteTextFileRequest,
	WriteTextFileRequestType,
	WriteTextFileResponse,
} from "@codestream/protocols/agent";

import { CodeStreamSession } from "session";
import { Logger } from "../logger";
import { log, lsp, lspHandler } from "../system";
import { xfs } from "../xfs";

@lsp
export class TextFilesManager {
	constructor(public readonly session: CodeStreamSession) {}

	private textFilePath(file: string): string {
		return path.join(os.homedir(), ".codestream", file);
	}

	@lspHandler(ReadTextFileRequestType)
	@log()
	async readTextFile(request: ReadTextFileRequest): Promise<ReadTextFileResponse> {
		try {
			const file = request.baseDir
				? path.join(request.baseDir, request.path)
				: this.textFilePath(request.path);
			if (!fs.existsSync(file)) return {};
			const contents = await xfs.readText(file);
			Logger.debug(`Read data ${contents} from ${file}`);
			return { contents };
		} catch (ex) {
			Logger.error(ex);
		}
		return {};
	}

	@lspHandler(WriteTextFileRequestType)
	@log()
	async writeTextFile(request: WriteTextFileRequest): Promise<WriteTextFileResponse> {
		const { path, contents } = request;
		try {
			const file = this.textFilePath(path);
			await xfs.writeTextAtomic(contents, file);
			Logger.debug(`Saved contents ${contents} to ${file}`);
			return {
				success: true,
			};
		} catch (ex) {
			Logger.error(ex);
		}
		return {
			success: false,
		};
	}

	@log()
	async deleteTextFile(request: DeleteTextFileRequest): Promise<DeleteTextFileResponse> {
		const { path } = request;
		try {
			const file = this.textFilePath(path);
			await xfs.deleteFile(file);
			Logger.debug(`Deleted ${file}`);
			return {
				success: true,
			};
		} catch (ex) {
			Logger.error(ex);
		}
		return {
			success: false,
		};
	}
}
