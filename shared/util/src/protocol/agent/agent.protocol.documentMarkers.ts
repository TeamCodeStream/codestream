"use strict";
import {
	Range,
	RequestType,
	TextDocumentIdentifier,
	VersionedTextDocumentIdentifier,
} from "vscode-languageserver-protocol";
import { CodemarkPlus } from "./agent.protocol.codemarks";
import {
	CodemarkType,
	CSEntity,
	CSMarker,
	CSMarkerIdentifier,
	CSMarkerLocation,
	CSReferenceLocation,
} from "./api.protocol";

export interface CreateDocumentMarkerPermalinkRequest {
	range: Range;
	uri: string;
	privacy: "public" | "private";
	contents?: string;
}

export interface CreateDocumentMarkerPermalinkResponse {
	linkUrl: string;
}

export const CreateDocumentMarkerPermalinkRequestType = new RequestType<
	CreateDocumentMarkerPermalinkRequest,
	CreateDocumentMarkerPermalinkResponse,
	void,
	void
>("codestream/textDocument/markers/create/link");

export type DocumentMarker = CSEntity &
	CSMarkerIdentifier & {
		teamId: string;
		fileStreamId: string;

		creatorAvatar?: string;
		creatorName: string;
		code: string;
		commitHashWhenCreated?: string;
		range: Range;
		// location is somewhat redundant because we have the calculated `range`
		// property already, however there is additional data on the location
		// object, called `meta` that we also want to expose
		location: CSMarkerLocation;
		title?: string;
		summary: string;
		summaryMarkdown: string;
		type: CodemarkType;
	} & (
		| {
				fileUri: string;
				codemark: CodemarkPlus;
				codemarkId: string;
				externalContent?: undefined;
		  }
		| {
				fileUri: string;
				codemark?: undefined;
				codemarkId?: undefined;
				externalContent: DocumentMarkerExternalContent;
		  }
	);

export interface DocumentMarkerExternalContent {
	provider: {
		id: string;
		name: string;
		icon?: string;
	};
	externalId?: string;
	externalChildId?: string;
	externalType?: string;
	diffHunk?: string;
	title?: string;
	subhead?: string;
	actions?: { label?: string; icon?: string; uri: string }[];
}

export enum MarkerNotLocatedReason {
	MISSING_ORIGINAL_LOCATION = "missing original location",
	MISSING_ORIGINAL_COMMIT = "missing original commit",
	CODEBLOCK_DELETED = "code block deleted",
	UNKNOWN = "unknown",
}

export interface MarkerNotLocated extends CSMarker {
	codemark: CodemarkPlus;
	creatorName: string;
	notLocatedReason: MarkerNotLocatedReason;
	notLocatedDetails?: string;
	summary: string;
	summaryMarkdown: string;
	externalContent?: undefined;
}

export interface FetchDocumentMarkersRequest {
	textDocument: TextDocumentIdentifier;
	gitSha?: string;
	applyFilters: boolean;
}
export interface FetchDocumentMarkersResponse {
	markers: DocumentMarker[];
	markersNotLocated: MarkerNotLocated[];
}

export type Markerish = {
	id: string;
	referenceLocations: CSReferenceLocation[];
};

export type ComputeCurrentLocationsRequest = {
	uri: string;
	commit: string;
	markers: Markerish[];
};

export type MarkerLocationsById = {
	[id: string]: CSMarkerLocation;
};

export type ComputeCurrentLocationResponse = {
	locations: MarkerLocationsById;
};

export const ComputeCurrentLocationsRequestType = new RequestType<
	ComputeCurrentLocationsRequest,
	ComputeCurrentLocationResponse,
	void,
	void
>("codestream/textDocument/currentLocation");

export const FetchDocumentMarkersRequestType = new RequestType<
	FetchDocumentMarkersRequest,
	FetchDocumentMarkersResponse | undefined,
	void,
	void
>("codestream/textDocument/markers");

export interface GetDocumentFromKeyBindingRequest {
	key: number;
}
export interface GetDocumentFromKeyBindingResponse {
	textDocument: TextDocumentIdentifier;
	range: Range;
	marker: CSMarker;
}
export const GetDocumentFromKeyBindingRequestType = new RequestType<
	GetDocumentFromKeyBindingRequest,
	GetDocumentFromKeyBindingResponse | undefined,
	void,
	void
>("codestream/textDocument/fromKey");

export interface GetDocumentFromMarkerRequest {
	markerId: string;
	file?: string;
	repoId?: string;
	/* for debugging purposes */
	source?: string;
}
export interface GetDocumentFromMarkerResponse {
	textDocument: VersionedTextDocumentIdentifier;
	range: Range;
	marker: CSMarker;
}
export const GetDocumentFromMarkerRequestType = new RequestType<
	GetDocumentFromMarkerRequest,
	GetDocumentFromMarkerResponse | undefined,
	void,
	void
>("codestream/textDocument/fromMarker");

export interface CalculateNonLocalRangesRequest {
	ranges: Range[];
	uri: string;
}

export interface CalculateNonLocalRangesResponse {
	ranges: Range[];
}

export const CalculateNonLocalRangesRequestType = new RequestType<
	CalculateNonLocalRangesRequest,
	CalculateNonLocalRangesResponse,
	void,
	void
>("codestream/textDocument/calculateNonLocalRanges");
