"use strict";
import { RequestType, TextDocumentIdentifier } from "vscode-languageserver-protocol";
import { CreateMarkerRequest, PostPlus } from "./agent.protocol";
import {
	CSChannelStream,
	CSCreateReviewRequest,
	CSDirectStream,
	CSGetReviewDiffsRequest,
	CSGetReviewDiffsResponse,
	CSGetReviewsResponse,
	CSMarker,
	CSMarkerLocations,
	CSRepoChange,
	CSRepository,
	CSReview,
	CSReviewChangesetBase,
	CSReviewCheckpoint,
	CSStream,
	CSUpdateReviewRequest,
	CSUpdateReviewResponse,
} from "./api.protocol";
import { CSReviewDiffs } from "./api.protocol.models";

export interface ReviewPlus extends CSReview {}

export interface CreateDiffsRequest extends CSReviewDiffs {}
export interface CreateReviewChangesetsRequest
	extends Omit<CSReviewChangesetBase, "reviewId" | "repoId" | "diffId"> {
	repoId: string;
	diffs: CreateDiffsRequest;
}

export interface CreateReviewRequest extends Omit<CSCreateReviewRequest, "teamId"> {
	markers?: CreateMarkerRequest[];
	reviewChangesets?: CreateReviewChangesetsRequest[];
	entryPoint?: string;
}

export interface CreateReviewResponse {
	review: CSReview;
	markers?: CSMarker[];
	markerLocations?: CSMarkerLocations[];
	streams?: CSStream[];
	repos?: CSRepository[];
}
export const CreateReviewRequestType = new RequestType<
	CreateReviewRequest,
	CreateReviewResponse,
	void,
	void
>("codestream/reviews/create");

export interface ShareableReviewAttributes extends Omit<CreateReviewRequest, "markers"> {}

export interface CreateShareableReviewRequest {
	attributes: ShareableReviewAttributes;
	memberIds?: string[];
	textDocuments?: TextDocumentIdentifier[];
	entryPoint?: string;
	mentionedUserIds?: string[];
	addedUsers?: string[];
}

export interface CreateShareableReviewResponse {
	review: ReviewPlus;
	post: PostPlus;
	stream: CSDirectStream | CSChannelStream;
	markerLocations?: CSMarkerLocations[];
}

export const CreateShareableReviewRequestType = new RequestType<
	CreateShareableReviewRequest,
	CreateShareableReviewResponse,
	void,
	void
>("codestream/reviews/create");

export interface FetchReviewsRequest {
	reviewIds?: string[];
	streamId?: string;
	streamIds?: string[];
	before?: number;
	byLastAcivityAt?: boolean;
}

export type FetchReviewsResponse = CSGetReviewsResponse;

export const FetchReviewsRequestType = new RequestType<
	FetchReviewsRequest,
	FetchReviewsResponse,
	void,
	void
>("codestream/reviews");

export interface DeleteReviewRequest {
	id: string;
}
export interface DeleteReviewResponse {}
export const DeleteReviewRequestType = new RequestType<
	DeleteReviewRequest,
	DeleteReviewResponse,
	void,
	void
>("codestream/review/delete");

export interface GetReviewRequest {
	reviewId: string;
}

export interface GetReviewResponse {
	review: CSReview;
}

export const GetReviewRequestType = new RequestType<
	GetReviewRequest,
	GetReviewResponse,
	void,
	void
>("codestream/review");

export interface SetReviewStatusRequest {
	id: string;
	status: string;
}
export interface SetReviewStatusResponse {
	review: ReviewPlus;
}
export const SetReviewStatusRequestType = new RequestType<
	SetReviewStatusRequest,
	SetReviewStatusResponse,
	void,
	void
>("codestream/review/setStatus");

export interface UpdateReviewRequest extends CSUpdateReviewRequest {
	id: string;
	/**
	 * This property is set from the client, then transformed into
	 * `$addToSet.reviewChangesets`
	 *
	 * @serverIgnore this property can be deleted before it is sent to the server
	 */
	repoChanges?: CSRepoChange[];
}

export interface UpdateReviewResponse extends CSUpdateReviewResponse {}

export const UpdateReviewRequestType = new RequestType<
	UpdateReviewRequest,
	UpdateReviewResponse,
	void,
	void
>("codestream/review/update");

export interface FollowReviewRequest {
	id: string;
	value: boolean;
}
export interface FollowReviewResponse {}
export const FollowReviewRequestType = new RequestType<
	FollowReviewRequest,
	FollowReviewResponse,
	void,
	void
>("codestream/review/follow");

export interface GetReviewContentsRequest {
	reviewId: string;
	repoId: string;
	path: string;
	checkpoint: CSReviewCheckpoint;
}

export interface GetReviewContentsLocalRequest {
	repoId: string;
	path: string;
	oldPath?: string;
	editingReviewId?: string;
	baseSha: string;
	rightVersion: string;
}

export interface GetReviewContentsResponse {
	repoRoot?: string;
	left?: string;
	right?: string;
	leftPath?: string;
	rightPath?: string;
	fileNotIncludedInReview?: boolean;
	error?: string;
}

export const GetReviewContentsRequestType = new RequestType<
	GetReviewContentsRequest,
	GetReviewContentsResponse,
	void,
	void
>("codestream/review/contents");

export const GetReviewContentsLocalRequestType = new RequestType<
	GetReviewContentsLocalRequest,
	GetReviewContentsResponse,
	void,
	void
>("codestream/review/contentsLocal");

export interface GetAllReviewContentsRequest {
	reviewId: string;
	checkpoint: CSReviewCheckpoint;
}

export interface ReviewFileContents {
	leftPath: string;
	rightPath: string;
	path: string; // FIXME remove when all IDEs move to leftPath and rightPath
	left: string;
	right: string;
}

export interface GetReviewCoverageRequest {
	textDocument: TextDocumentIdentifier;
}

export interface GetReviewCoverageResponse {
	reviewIds: (string | undefined)[];
}

export const GetReviewCoverageRequestType = new RequestType<
	GetReviewCoverageRequest,
	GetReviewCoverageResponse,
	void,
	void
>("codestream/review/coverage");

export interface ReviewRepoContents {
	repoId: string;
	files: ReviewFileContents[];
}

export interface GetAllReviewContentsResponse {
	repos: ReviewRepoContents[];
}

export const GetAllReviewContentsRequestType = new RequestType<
	GetAllReviewContentsRequest,
	GetAllReviewContentsResponse,
	void,
	void
>("codestream/review/allContents");

export interface FetchReviewDiffsRequest extends CSGetReviewDiffsRequest {}

export interface FetchReviewDiffsResponse extends CSGetReviewDiffsResponse {}

export const FetchReviewDiffsRequestType = new RequestType<
	FetchReviewDiffsRequest,
	FetchReviewDiffsResponse,
	void,
	void
>("codestream/review/diffs");

export interface FetchReviewCheckpointDiffsRequest extends CSGetReviewDiffsRequest {}

export interface FetchReviewCheckpointDiffsResponse
	extends Array<{
		repoId: string;
		checkpoint: CSReviewCheckpoint;
		diffs: CSReviewDiffs;
	}> {}

export const FetchReviewCheckpointDiffsRequestType = new RequestType<
	FetchReviewCheckpointDiffsRequest,
	FetchReviewCheckpointDiffsResponse,
	void,
	void
>("codestream/review/checkpoint-diffs");

export interface StartReviewRequest {
	reviewId: string;
}

export interface StartReviewResponse {
	success: boolean;
	error?: string;
}

export const StartReviewRequestType = new RequestType<
	StartReviewRequest,
	StartReviewResponse,
	void,
	void
>("codestream/review/start");

export interface PauseReviewRequest {
	reviewId: string;
}

export interface PauseReviewResponse {
	success: boolean;
	error?: string;
}

export const PauseReviewRequestType = new RequestType<
	PauseReviewRequest,
	PauseReviewResponse,
	void,
	void
>("codestream/review/pause");

export interface EndReviewRequest {
	reviewId: string;
}

export interface EndReviewResponse {
	success: boolean;
	error?: string;
}

export const EndReviewRequestType = new RequestType<
	EndReviewRequest,
	EndReviewResponse,
	void,
	void
>("codestream/review/end");
