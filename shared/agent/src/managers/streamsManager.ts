"use strict";
import { CodeStreamApiProvider } from "../api/codestream/codestreamApi";
import { SessionContainer } from "../container";
import { Logger } from "../logger";
import {
	ArchiveStreamRequest,
	ArchiveStreamRequestType,
	ArchiveStreamResponse,
	CloseStreamRequest,
	CloseStreamRequestType,
	CloseStreamResponse,
	CreateChannelStreamRequest,
	CreateChannelStreamRequestType,
	CreateChannelStreamResponse,
	CreateDirectStreamRequest,
	CreateDirectStreamRequestType,
	CreateDirectStreamResponse,
	FetchStreamsRequest,
	FetchStreamsRequestType,
	FetchStreamsResponse,
	FetchUnreadStreamsRequest,
	FetchUnreadStreamsRequestType,
	FetchUnreadStreamsResponse,
	GetStreamRequest,
	GetStreamRequestType,
	GetStreamResponse,
	JoinStreamRequest,
	JoinStreamRequestType,
	JoinStreamResponse,
	LeaveStreamRequest,
	LeaveStreamRequestType,
	LeaveStreamResponse,
	MarkStreamReadRequest,
	MarkStreamReadRequestType,
	MarkStreamReadResponse,
	MuteStreamRequest,
	MuteStreamRequestType,
	MuteStreamResponse,
	OpenStreamRequest,
	OpenStreamRequestType,
	OpenStreamResponse,
	RenameStreamRequest,
	RenameStreamRequestType,
	RenameStreamResponse,
	SetStreamPurposeRequest,
	SetStreamPurposeRequestType,
	SetStreamPurposeResponse,
	UnarchiveStreamRequest,
	UnarchiveStreamRequestType,
	UnarchiveStreamResponse,
	UpdateStreamMembershipRequest,
	UpdateStreamMembershipRequestType,
	UpdateStreamMembershipResponse
} from "../protocol/agent.protocol";
import {
	CSChannelStream,
	CSDirectStream,
	CSObjectStream,
	CSStream,
	StreamType
} from "../protocol/api.protocol";
import { lsp, lspHandler } from "../system";
import { KeyValue } from "./cache/baseCache";
import { CachedEntityManagerBase, Id } from "./entityManager";

@lsp
export class StreamsManager extends CachedEntityManagerBase<
	CSChannelStream | CSDirectStream | CSObjectStream
> {
	@lspHandler(FetchStreamsRequestType)
	async get(request?: FetchStreamsRequest): Promise<FetchStreamsResponse> {
		let streams = await this.getAllCached();
		if (request != null) {
			if (request.streamIds != null && request.streamIds.length !== 0) {
				streams = streams.filter(s => request.streamIds!.includes(s.id));
			}

			if (request.types != null && request.types.length !== 0) {
				streams = streams.filter(s => request.types!.includes(s.type));
			}

			if (request.memberIds != null && request.memberIds.length !== 0) {
				const memberCount = request.memberIds.length;
				const uniqueMembers = new Set(request.memberIds);
				streams = streams.filter(
					s =>
						s.memberIds !== undefined &&
						s.memberIds.length === memberCount &&
						s.memberIds.every(id => uniqueMembers.has(id))
				);
			}
		}

		return { streams: streams };
	}

	async getTeamStream(): Promise<CSChannelStream> {
		const streams = (await this.get({ types: [StreamType.Channel] })).streams as CSChannelStream[];

		return streams.find(stream => stream.isTeamStream)!;
	}

	protected async loadCache() {
		const response = await this.session.api.fetchStreams({});
		const { streams, ...rest } = response;
		this.cache.reset(streams);
		this.cacheResponse(rest);
	}

	async getSubscribable(teamId: string) {
		const response = await this.get({ types: [StreamType.Channel, StreamType.Direct] });
		return {
			streams: response.streams.filter(s =>
				CodeStreamApiProvider.isStreamSubscriptionRequired(s, this.session.userId, teamId)
			)
		};
	}

	@lspHandler(FetchUnreadStreamsRequestType)
	async getUnread(request?: FetchUnreadStreamsRequest): Promise<FetchUnreadStreamsResponse> {
		const response = this.session.api.fetchUnreadStreams(request || {});
		this.cacheResponse(response);
		return response;
	}

	protected async fetchById(id: Id): Promise<CSChannelStream | CSDirectStream> {
		try {
			const response = await this.session.api.getStream({ streamId: id });
			return response.stream as CSChannelStream | CSDirectStream;
		} catch (err) {
			Logger.error(err);
			// When the user doesn't have access to the stream, the server returns a 403. If
			// this error occurs, it could be that we're subscribed to streams we're not
			// supposed to be subscribed to.
			Logger.warn(`Error fetching stream id=${id}`);
			return undefined!;
		}
	}

	async cacheGet(
		criteria: KeyValue<CSStream>[]
	): Promise<CSChannelStream | CSDirectStream | CSObjectStream | undefined> {
		const cached = await super.cacheGet(criteria);
		if (cached) {
			return cached;
		} else {
			return (await SessionContainer.instance().files.cacheGet(criteria)) as any;
		}
	}

	async cacheSet(
		entity: CSStream,
		oldEntity?: CSStream
	): Promise<CSChannelStream | CSDirectStream | CSObjectStream | undefined> {
		switch (entity.type) {
			case StreamType.Channel:
			case StreamType.Direct:
				return super.cacheSet(entity, oldEntity as any);
			case StreamType.File:
				return SessionContainer.instance().files.cacheSet(entity, oldEntity as any) as any;
		}
		return undefined;
	}

	@lspHandler(CreateChannelStreamRequestType)
	createChannelStream(request: CreateChannelStreamRequest): Promise<CreateChannelStreamResponse> {
		return this.session.api.createChannelStream(request);
	}

	@lspHandler(CreateDirectStreamRequestType)
	createDirectStream(request: CreateDirectStreamRequest): Promise<CreateDirectStreamResponse> {
		return this.session.api.createDirectStream(request);
	}

	@lspHandler(ArchiveStreamRequestType)
	archive(request: ArchiveStreamRequest): Promise<ArchiveStreamResponse> {
		return this.session.api.archiveStream(request);
	}

	@lspHandler(CloseStreamRequestType)
	close(request: CloseStreamRequest): Promise<CloseStreamResponse> {
		return this.session.api.closeStream(request);
	}

	@lspHandler(JoinStreamRequestType)
	join(request: JoinStreamRequest): Promise<JoinStreamResponse> {
		return this.session.api.joinStream(request);
	}

	@lspHandler(LeaveStreamRequestType)
	leave(request: LeaveStreamRequest): Promise<LeaveStreamResponse> {
		return this.session.api.leaveStream(request);
	}

	@lspHandler(MarkStreamReadRequestType)
	markRead(request: MarkStreamReadRequest): Promise<MarkStreamReadResponse> {
		return this.session.api.markStreamRead(request);
	}

	@lspHandler(MuteStreamRequestType)
	mute(request: MuteStreamRequest): Promise<MuteStreamResponse> {
		return this.session.api.muteStream(request);
	}

	@lspHandler(OpenStreamRequestType)
	open(request: OpenStreamRequest): Promise<OpenStreamResponse> {
		return this.session.api.openStream(request);
	}

	@lspHandler(RenameStreamRequestType)
	rename(request: RenameStreamRequest): Promise<RenameStreamResponse> {
		return this.session.api.renameStream(request);
	}

	@lspHandler(SetStreamPurposeRequestType)
	setPurpose(request: SetStreamPurposeRequest): Promise<SetStreamPurposeResponse> {
		return this.session.api.setStreamPurpose(request);
	}

	@lspHandler(UnarchiveStreamRequestType)
	unarchive(request: UnarchiveStreamRequest): Promise<UnarchiveStreamResponse> {
		return this.session.api.unarchiveStream(request);
	}

	@lspHandler(UpdateStreamMembershipRequestType)
	updateMembership(
		request: UpdateStreamMembershipRequest
	): Promise<UpdateStreamMembershipResponse> {
		return this.session.api.updateStreamMembership(request);
	}

	@lspHandler(GetStreamRequestType)
	protected async getStream(request: GetStreamRequest): Promise<GetStreamResponse> {
		const stream = await this.getById(request.streamId);
		return { stream: stream };
	}

	protected getEntityName(): string {
		return "Stream";
	}
}
