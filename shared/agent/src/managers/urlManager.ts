import path from "path";
import { URI } from "vscode-uri";
import { SessionContainer } from "../container";
import { Logger } from "../logger";
import {
	AgentOpenUrlRequest,
	AgentOpenUrlRequestType,
	CodeStreamDiffUriData,
	ResolveLocalUriRequest,
	ResolveLocalUriRequestType,
} from "../protocol/agent.protocol";
import { lsp, lspHandler } from "../system";
import { openUrl } from "../system/openUrl";
import * as csUri from "../system/uri";
import { ReviewsManager } from "./reviewsManager";

@lsp
export class UrlManager {
	@lspHandler(AgentOpenUrlRequestType)
	async openUrl(request: AgentOpenUrlRequest) {
		const cc = Logger.getCorrelationContext();
		try {
			await openUrl(request.url);
		} catch (ex) {
			Logger.error(ex, cc);
		}
	}

	@lspHandler(ResolveLocalUriRequestType)
	async resolveLocalUri({ uri }: ResolveLocalUriRequest) {
		const cc = Logger.getCorrelationContext();
		const { git } = SessionContainer.instance();
		let filePath = undefined;
		if (uri.startsWith("codestream-diff://")) {
			let parsedUri = undefined;
			if (csUri.Uris.isCodeStreamDiffUri(uri)) {
				parsedUri = csUri.Uris.fromCodeStreamDiffUri<CodeStreamDiffUriData>(uri);
			} else {
				parsedUri = ReviewsManager.parseUri(uri);
			}
			const repo = parsedUri?.repoId && (await git.getRepositoryById(parsedUri?.repoId));
			filePath = repo && parsedUri?.path && path.join(repo.path, parsedUri.path);
		} else {
			const parsedUri = URI.parse(uri);
			filePath = parsedUri.fsPath;
		}

		if (!filePath) {
			Logger.warn(cc, `Unable to resolve local URI for ${uri}`);
		}
		const parsedUri =
			filePath &&
			URI.from({
				scheme: "file",
				path: filePath,
			});
		return {
			uri: parsedUri?.toString(true),
		};
	}
}
