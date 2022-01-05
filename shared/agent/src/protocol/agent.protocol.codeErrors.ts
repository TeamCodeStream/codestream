"use strict";
import { RequestType } from "vscode-languageserver-protocol";
import { CreateMarkerRequest, NewRelicErrorGroup, PostPlus } from "./agent.protocol";
import {
	CSChannelStream,
	CSCreateCodeErrorRequest,
	CSDirectStream,
	CSGetCodeErrorsResponse,
	CSMarker,
	CSMarkerLocations,
	CSRepository,
	CSCodeError,
	CSStream,
	CSUpdateCodeErrorRequest,
	CSUpdateCodeErrorResponse
} from "./api.protocol";
import { CSObjectStream, CSPost } from "./api.protocol.models";

export interface CodeErrorPlus extends CSCodeError {
	errorGroup?: NewRelicErrorGroup;
}

export interface CreateCodeErrorRequest extends Omit<CSCreateCodeErrorRequest, "teamId"> {
	markers?: CreateMarkerRequest[];
	entryPoint?: string;
}

export interface CreateCodeErrorResponse {
	codeError: CSCodeError;
	markers?: CSMarker[];
	markerLocations?: CSMarkerLocations[];
	streams?: CSStream[];
	repos?: CSRepository[];
}
export const CreateCodeErrorRequestType = new RequestType<
	CreateCodeErrorRequest,
	CreateCodeErrorResponse,
	void,
	void
>("codestream/codeErrors/create");

export interface ShareableCodeErrorAttributes extends Omit<CreateCodeErrorRequest, "markers"> {}

export interface CreateShareableCodeErrorRequest {
	attributes: ShareableCodeErrorAttributes;
	entryPoint?: string;
	mentionedUserIds?: string[];
	addedUsers?: string[];
	replyPost?: { text: string; mentionedUserIds?: string[] };
}

export interface CreateShareableCodeErrorResponse {
	codeError: CodeErrorPlus;
	post: PostPlus;
	stream: CSDirectStream | CSChannelStream;
	markerLocations?: CSMarkerLocations[];
	replyPost?: PostPlus;
}

export const CreateShareableCodeErrorRequestType = new RequestType<
	CreateShareableCodeErrorRequest,
	CreateShareableCodeErrorResponse,
	void,
	void
>("codestream/codeErrors/create");

export interface FetchCodeErrorsRequest {
	codeErrorIds?: string[];
	streamIds?: string[];
	before?: number;
	byLastAcivityAt?: boolean;
}

// TODO: when the server starts returning the markers, this response should have CodeErrorPlus objects
export type FetchCodeErrorsResponse = Pick<CSGetCodeErrorsResponse, "codeErrors">;

export const FetchCodeErrorsRequestType = new RequestType<
	FetchCodeErrorsRequest,
	FetchCodeErrorsResponse,
	void,
	void
>("codestream/codeErrors");

export interface ClaimCodeErrorRequest {
	objectId: string;
	objectType: string;
}

export interface ClaimCodeErrorResponse {
	notFound?: boolean;
	unauthorized?: boolean;
	needNRToken?: boolean;
	unauthorizedAccount?: boolean;
	unauthorizedErrorGroup?: boolean;
	codeError?: CSCodeError;
	post?: CSPost;
	stream?: CSObjectStream;
	accountId?: string;
	ownedBy?: string;
}

export const ClaimCodeErrorRequestType = new RequestType<
	ClaimCodeErrorRequest,
	ClaimCodeErrorResponse,
	void,
	void
>("codestream/codeErrors/claim");

export interface DeleteCodeErrorRequest {
	id: string;
}
export interface DeleteCodeErrorResponse {}
export const DeleteCodeErrorRequestType = new RequestType<
	DeleteCodeErrorRequest,
	DeleteCodeErrorResponse,
	void,
	void
>("codestream/codeError/delete");

export interface GetCodeErrorRequest {
	codeErrorId: string;
}

export interface GetCodeErrorResponse {
	codeError: CSCodeError;
}

export const GetCodeErrorRequestType = new RequestType<
	GetCodeErrorRequest,
	GetCodeErrorResponse,
	void,
	void
>("codestream/codeError");

export interface SetCodeErrorStatusRequest {
	id: string;
	status: string;
}
export interface SetCodeErrorStatusResponse {
	codeError: CSCodeError;
}
export const SetCodeErrorStatusRequestType = new RequestType<
	SetCodeErrorStatusRequest,
	SetCodeErrorStatusResponse,
	void,
	void
>("codestream/codeError/setStatus");

export interface UpdateCodeErrorRequest extends CSUpdateCodeErrorRequest {
	id: string;
}

export interface UpdateCodeErrorResponse extends CSUpdateCodeErrorResponse {}

export const UpdateCodeErrorRequestType = new RequestType<
	UpdateCodeErrorRequest,
	UpdateCodeErrorResponse,
	void,
	void
>("codestream/codeError/update");

export interface FollowCodeErrorRequest {
	id: string;
	value: boolean;
}
export interface FollowCodeErrorResponse {}
export const FollowCodeErrorRequestType = new RequestType<
	FollowCodeErrorRequest,
	FollowCodeErrorResponse,
	void,
	void
>("codestream/codeError/follow");
