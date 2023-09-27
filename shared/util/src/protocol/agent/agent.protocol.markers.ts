"use strict";
import { Range, RequestType, TextDocumentIdentifier } from "vscode-languageserver-protocol";
import { CodeBlockSource } from "./agent.protocol.posts";
import {
	CSCodemark,
	CSLocationArray,
	CSMarker,
	CSMarkerLocation,
	CSMarkerLocations,
	CSPost,
} from "./api.protocol";

export interface CreateMarkerLocationRequest {
	streamId: string;
	commitHash: string;
	locations: {
		[id: string]: CSLocationArray;
	};
}

export interface CreateMarkerLocationResponse {}

export const CreateMarkerLocationRequestType = new RequestType<
	CreateMarkerLocationRequest,
	CreateMarkerLocationResponse,
	void,
	void
>("codestream/markerLocations/create");

export interface FetchMarkerLocationsRequest {
	streamId: string;
	commitHash: string;
}

export interface FetchMarkerLocationsResponse {
	markerLocations: CSMarkerLocations;
}

export interface FetchMarkersRequest {
	streamId: string;
	commitHash?: string;
	markerIds?: string[];
}

export interface FetchMarkersResponse {
	markers: CSMarker[];
	markerLocations: CSMarkerLocation[];
	codemarks: CSCodemark[];
	posts: CSPost[];
}

export const FetchMarkersRequestType = new RequestType<
	FetchMarkersRequest,
	FetchMarkersResponse,
	void,
	void
>("codestream/markers");

export interface GetMarkerRequest {
	markerId: string;
}

export interface GetMarkerResponse {
	marker: CSMarker;
}

export const GetMarkerRequestType = new RequestType<
	GetMarkerRequest,
	GetMarkerResponse,
	void,
	void
>("codestream/marker");

export interface UpdateMarkerRequest {
	markerId: string;
	commitHashWhenCreated?: string;
}

export interface UpdateMarkerResponse {
	marker: CSMarker;
}

export const UpdateMarkerRequestType = new RequestType<
	UpdateMarkerRequest,
	UpdateMarkerResponse,
	void,
	void
>("codestream/marker/update");

export interface MoveMarkerRequest {
	markerId: string;
	code: string;
	documentId: TextDocumentIdentifier;
	range: Range;
	source: CodeBlockSource;
}

export interface MoveMarkerResponse {
	marker: CSMarker;
}

export const MoveMarkerRequestType = new RequestType<
	MoveMarkerRequest,
	MoveMarkerResponse,
	void,
	void
>("codestream/marker/move");

export interface AddMarkersRequest {
	codemarkId: string;
	newMarkers: {
		code: string;
		documentId: TextDocumentIdentifier;
		range: Range;
		source: CodeBlockSource;
	}[];
}

export interface AddMarkersResponse {
	codemark: CSCodemark;
}

export const AddMarkersRequestType = new RequestType<
	AddMarkersRequest,
	AddMarkersResponse,
	void,
	void
>("codestream/markers/add");

export interface AddReferenceLocationRequest {
	markerId: string;
	commitHash: string;
	location: CSLocationArray;
	flags: { [id: string]: boolean };
}

export interface AddReferenceLocationResponse {
	// marker: < some directive >,
	// markerLocations: < markerLocations update >
}

export interface DeleteMarkerRequest {
	markerId: string;
}

export interface DeleteMarkerResponse {}

export const DeleteMarkerRequestType = new RequestType<
	DeleteMarkerRequest,
	DeleteMarkerResponse,
	void,
	void
>("codestream/marker/delete");
