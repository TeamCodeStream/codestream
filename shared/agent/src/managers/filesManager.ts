"use strict";
import * as path from "path";
import { TextDocumentIdentifier } from "vscode-languageserver-protocol";
import { URI } from "vscode-uri";
import { SessionContainer } from "../container";
import { Logger } from "../logger";
import {
	FetchFileStreamsRequest,
	FetchFileStreamsRequestType,
	FetchFileStreamsResponse,
	GetFileStreamRequest,
	GetFileStreamRequestType,
	GetFileStreamResponse
} from "../protocol/agent.protocol";
import { CSFileStream, StreamType } from "../protocol/api.protocol";
import { lsp, lspHandler } from "../system";
import { IndexParams, IndexType } from "./cache";
import { getValues, KeyValue } from "./cache/baseCache";
import { EntityManagerBase, Id } from "./entityManager";

@lsp
export class FilesManager extends EntityManagerBase<CSFileStream> {
	private idsByPath = new Map<string, Id>();

	getIndexedFields(): IndexParams<CSFileStream>[] {
		return [
			{
				fields: ["repoId"],
				type: IndexType.Group,
				fetchFn: this.fetchByRepoId.bind(this)
			}
		];
	}

	async getDocumentUri(fileStreamId: Id): Promise<string | undefined> {
		const { git } = SessionContainer.instance();
		const fileStream = await this.getById(fileStreamId);

		const repo = await git.getRepositoryById(fileStream.repoId);
		if (!repo) {
			return;
		}

		const filePath = path.join(repo.path, fileStream.file);
		const documentUri = URI.file(filePath).toString();

		return documentUri;
	}

	async getByPath(filePath: string): Promise<CSFileStream | undefined> {
		const lowerCaseFilePath = filePath.toLowerCase();
		let id = this.idsByPath.get(lowerCaseFilePath);
		if (id) {
			return this.cache.getById(id);
		}

		const container = SessionContainer.instance();
		const repo = await container.git.getRepositoryByFilePath(filePath);
		if (repo === undefined || repo.id === undefined) {
			return undefined;
		}

		const streams = await this.getByRepoId(repo.id);
		for (const stream of streams) {
			this.idsByPath.set(path.join(repo.path, stream.file).toLowerCase(), stream.id);
		}

		id = this.idsByPath.get(lowerCaseFilePath);
		if (id) {
			return this.cache.getById(id);
		}

		return undefined;
	}

	async getByRepoId(repoId: string): Promise<CSFileStream[]> {
		return this.cache.getGroup([["repoId", repoId]]);
	}

	async getTextDocument(streamId: string): Promise<TextDocumentIdentifier | undefined> {
		const { git } = SessionContainer.instance();

		const stream = await this.cache.getById(streamId);
		if (!stream || stream.type !== StreamType.File) {
			return undefined;
		}

		const repo = await git.getRepositoryById(stream.repoId);
		if (!repo) {
			return undefined;
		}

		const filePath = path.join(repo.path, stream.file);
		const documentUri = URI.file(filePath).toString();

		return TextDocumentIdentifier.create(documentUri);
	}

	@lspHandler(GetFileStreamRequestType)
	async getFileStream(request: GetFileStreamRequest): Promise<GetFileStreamResponse> {
		const stream = await this.getByPath(URI.parse(request.textDocument.uri).fsPath);
		return { stream: stream as CSFileStream };
	}

	protected async fetchById(id: Id): Promise<CSFileStream> {
		try {
			const response = await this.session.api.getStream({ streamId: id, type: StreamType.File });
			return response.stream as CSFileStream;
		} catch (err) {
			Logger.error(err);
			// When the user doesn't have access to the stream, the server returns a 403. If
			// this error occurs, it could be that we're subscribed to streams we're not
			// supposed to be subscribed to.
			Logger.warn(`Error fetching stream id=${id}`);
			return undefined!;
		}
	}

	private async fetchByRepoId(criteria: KeyValue<CSFileStream>[]): Promise<CSFileStream[]> {
		const [repoId] = getValues(criteria);
		const response = await this.session.api.fetchFileStreams({ repoId: repoId });
		this.cacheResponse(response);
		return response.streams as CSFileStream[];
	}

	@lspHandler(FetchFileStreamsRequestType)
	protected async fetchFileStreams(
		request: FetchFileStreamsRequest
	): Promise<FetchFileStreamsResponse> {
		const streams = await this.getByRepoId(request.repoId);
		return { streams: streams };
	}

	protected getEntityName(): string {
		return "FileStream";
	}
}
