"use strict";
import { RequestType, TextDocumentIdentifier } from "vscode-languageserver-protocol";
import {
	ChannelServiceType,
	CSChannelStream,
	CSDirectStream,
	CSFileStream,
	CSObjectStream,
	CSStream,
	StreamType,
} from "./api.protocol";

export interface CreateChannelStreamRequest {
	type: StreamType.Channel;
	name: string;
	memberIds: string[] | undefined;
	isTeamStream: boolean;
	privacy: "public" | "private";
	purpose?: string;
	serviceType?: ChannelServiceType.Vsls;
	serviceKey?: string;
	serviceInfo?: { [key: string]: any };
}

export interface CreateChannelStreamResponse {
	stream: CSChannelStream;
}

export const CreateChannelStreamRequestType = new RequestType<
	CreateChannelStreamRequest,
	CreateChannelStreamResponse,
	void,
	void
>("codestream/streams/createChannel");

export interface CreateDirectStreamRequest {
	type: StreamType.Direct;
	memberIds: string[];
}

export interface CreateDirectStreamResponse {
	stream: CSDirectStream;
}

export const CreateDirectStreamRequestType = new RequestType<
	CreateDirectStreamRequest,
	CreateDirectStreamResponse,
	void,
	void
>("codestream/streams/createDirect");

export interface FetchStreamsRequest {
	types?: (StreamType.Channel | StreamType.Direct | StreamType.Object)[];
	streamIds?: string[];
	// Will return only streams with the matching set of memberIds
	memberIds?: string[];
}

export interface FetchStreamsResponse {
	streams: (CSChannelStream | CSDirectStream | CSObjectStream)[];
}

export const FetchStreamsRequestType = new RequestType<
	FetchStreamsRequest,
	FetchStreamsResponse,
	void,
	void
>("codestream/streams");

export interface FetchFileStreamsRequest {
	repoId: string;
}

export interface FetchFileStreamsResponse {
	streams: CSFileStream[];
}

export const FetchFileStreamsRequestType = new RequestType<
	FetchFileStreamsRequest,
	FetchFileStreamsResponse,
	void,
	void
>("codestream/streams/file");

export interface FetchUnreadStreamsRequest {}

export interface FetchUnreadStreamsResponse {
	streams: CSStream[];
}

export const FetchUnreadStreamsRequestType = new RequestType<
	FetchUnreadStreamsRequest,
	FetchUnreadStreamsResponse,
	void,
	void
>("codestream/streams/unread");

export interface ArchiveStreamRequest {
	streamId: string;
}

export interface ArchiveStreamResponse {
	stream: CSChannelStream;
}

export const ArchiveStreamRequestType = new RequestType<
	ArchiveStreamRequest,
	ArchiveStreamResponse,
	void,
	void
>("codestream/stream/archive");

export interface CloseStreamRequest {
	streamId: string;
}

export interface CloseStreamResponse {
	stream: CSDirectStream;
}

export const CloseStreamRequestType = new RequestType<
	CloseStreamRequest,
	CloseStreamResponse,
	void,
	void
>("codestream/stream/close");

export interface GetStreamRequest {
	streamId: string;
	type?: StreamType;
}

export interface GetStreamResponse {
	stream: CSStream;
}

export const GetStreamRequestType = new RequestType<
	GetStreamRequest,
	GetStreamResponse,
	void,
	void
>("codestream/stream");

export interface GetFileStreamRequest {
	textDocument: TextDocumentIdentifier;
}

export interface GetFileStreamResponse {
	stream?: CSFileStream;
}

export const GetFileStreamRequestType = new RequestType<
	GetFileStreamRequest,
	GetFileStreamResponse,
	void,
	void
>("codestream/streams/fileStream");

export interface JoinStreamRequest {
	streamId: string;
}

export interface JoinStreamResponse {
	stream: CSChannelStream;
}

export const JoinStreamRequestType = new RequestType<
	JoinStreamRequest,
	JoinStreamResponse,
	void,
	void
>("codestream/stream/join");

export interface LeaveStreamRequest {
	streamId: string;
}

export interface LeaveStreamResponse {
	stream: CSChannelStream;
}

export const LeaveStreamRequestType = new RequestType<
	LeaveStreamRequest,
	LeaveStreamResponse,
	void,
	void
>("codestream/stream/leave");

export interface MarkStreamReadRequest {
	streamId: string;
	postId?: string;
}

export interface MarkStreamReadResponse {}

export const MarkStreamReadRequestType = new RequestType<
	MarkStreamReadRequest,
	MarkStreamReadResponse,
	void,
	void
>("codestream/stream/markRead");

export interface MarkItemReadRequest {
	itemId: string;
	numReplies: number;
}

export interface MarkItemReadResponse {}

export const MarkItemReadRequestType = new RequestType<
	MarkItemReadRequest,
	MarkItemReadResponse,
	void,
	void
>("codestream/post/markRead");

export interface MuteStreamRequest {
	streamId: string;
	mute: boolean;
}

export interface MuteStreamResponse {
	stream: CSChannelStream | CSDirectStream | CSObjectStream;
}

export const MuteStreamRequestType = new RequestType<
	MuteStreamRequest,
	MuteStreamResponse,
	void,
	void
>("codestream/stream/mute");

export interface OpenStreamRequest {
	streamId: string;
}

export interface OpenStreamResponse {
	stream: CSDirectStream;
}

export const OpenStreamRequestType = new RequestType<
	OpenStreamRequest,
	OpenStreamResponse,
	void,
	void
>("codestream/stream/open");

export interface RenameStreamRequest {
	streamId: string;
	name: string;
}

export interface RenameStreamResponse {
	stream: CSChannelStream;
}

export const RenameStreamRequestType = new RequestType<
	RenameStreamRequest,
	RenameStreamResponse,
	void,
	void
>("codestream/stream/rename");

export interface SetStreamPurposeRequest {
	streamId: string;
	purpose: string;
}

export interface SetStreamPurposeResponse {
	stream: CSChannelStream | CSDirectStream | CSObjectStream;
}

export const SetStreamPurposeRequestType = new RequestType<
	SetStreamPurposeRequest,
	SetStreamPurposeResponse,
	void,
	void
>("codestream/stream/setPurpose");

export interface UnarchiveStreamRequest {
	streamId: string;
}

export interface UnarchiveStreamResponse {
	stream: CSChannelStream;
}

export const UnarchiveStreamRequestType = new RequestType<
	UnarchiveStreamRequest,
	UnarchiveStreamResponse,
	void,
	void
>("codestream/stream/unarchive");

export interface UpdateStreamMembershipRequest {
	streamId: string;
	add?: string[];
	remove?: string[];
}

export interface UpdateStreamMembershipResponse {
	stream: CSChannelStream;
}

export const UpdateStreamMembershipRequestType = new RequestType<
	UpdateStreamMembershipRequest,
	UpdateStreamMembershipResponse,
	void,
	void
>("codestream/stream/updateMembership");
