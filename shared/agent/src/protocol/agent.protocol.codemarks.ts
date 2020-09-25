"use strict";
import { RequestType, TextDocumentIdentifier } from "vscode-languageserver-protocol";
import {
	CrossPostIssueValues,
	GetRangeScmInfoResponse,
	PostPlus,
	ThirdPartyProviderUser
} from "./agent.protocol";
import {
	CSChannelStream,
	CSCodemark,
	CSCreateCodemarkRequest,
	CSDirectStream,
	CSLocationArray,
	CSMarker,
	CSMarkerLocations,
	CSReferenceLocation,
	CSRepository,
	CSReview,
	CSStream
} from "./api.protocol";

export interface CodemarkPlus extends CSCodemark {
	markers?: CSMarker[];
}

// interfaces here are for the webview -> agent API

export interface CreateCodemarkRequest extends Omit<CSCreateCodemarkRequest, "teamId"> {
	markers?: CreateMarkerRequest[];
	// codemarks can be part of a review
	reviewId?: string;
	// if part of a review, it can be a change request
	isChangeRequest?: boolean;
}

// A description of what's required to create markers in the webview -> agent API
export interface CreateMarkerRequest {
	code: string;
	repoId?: string;
	remotes?: string[];
	file?: string;
	fileStreamId?: string;
	referenceLocations?: CSReferenceLocation[];
	commitHash?: string;
	location?: CSLocationArray;
	branchWhenCreated?: string;
	remoteCodeUrl?: { displayName: string; name: string; url: string };
	knownCommitHashes?: string[];
}

export interface CreateCodemarkResponse {
	codemark: CSCodemark;
	markers?: CSMarker[];
	markerLocations?: CSMarkerLocations[];
	streams?: CSStream[];
	repos?: CSRepository[];
	permalink?: string;
}
export const CreateCodemarkRequestType = new RequestType<
	CreateCodemarkRequest,
	CreateCodemarkResponse,
	void,
	void
>("codestream/codemarks/create");

// ShareableCodemark interfaces were created for the sharing model,
// New interfaces were created so there wouldn't be impact to the legacy code since sharing model was behind a feature flag
// and because codemarks could be private or public to the team the api, the api is different to the legacy methods

export interface ShareableCodemarkAttributes extends Omit<CreateCodemarkRequest, "markers"> {
	codeBlocks: GetRangeScmInfoResponse[];
	crossPostIssueValues?: CrossPostIssueValues;
}

export interface CreateShareableCodemarkRequest {
	attributes: ShareableCodemarkAttributes;
	memberIds?: string[];
	textDocuments?: TextDocumentIdentifier[];
	entryPoint?: string;
	mentionedUserIds?: string[];
	addedUsers?: string[];
	// codemarks can now be replies
	parentPostId?: string;
	isPseudoCodemark?: boolean;
	/**
	 * true, if this "comment" is part of a PR provider review, rather than a single comment
	 */
	isProviderReview?: boolean;
	/**
	 * the possible reviewId of
	 */
	pullRequestReviewId?: string;
}

export interface CreateShareableCodemarkResponse {
	codemark: CodemarkPlus;
	post: PostPlus;
	stream: CSDirectStream | CSChannelStream;
	markerLocations?: CSMarkerLocations[];
}

export interface CreatePassthroughCodemarkResponse {
	isPassThrough: boolean;
	codemark?: CodemarkPlus;
	pullRequest: {
		providerId: string;
		id: string;
	};
	success: boolean;
}

export const CreateShareableCodemarkRequestType = new RequestType<
	CreateShareableCodemarkRequest,
	CreateShareableCodemarkResponse,
	void,
	void
>("codestream/codemarks/sharing/create");

export interface CreateCodemarkPermalinkRequest {
	codemarkId: string;
	isPublic: boolean;
}
export interface CreateCodemarkPermalinkResponse {
	permalink: string;
}
export const CreateCodemarkPermalinkRequestType = new RequestType<
	CreateCodemarkPermalinkRequest,
	CreateCodemarkPermalinkResponse,
	void,
	void
>("codestream/codemark/permalink");

export interface FetchCodemarksRequest {
	streamId?: string;
	before?: number;
	byLastAcivityAt?: boolean;
}
export interface FetchCodemarksResponse {
	codemarks: CodemarkPlus[];
	markers?: CSMarker[];
}
export const FetchCodemarksRequestType = new RequestType<
	FetchCodemarksRequest,
	FetchCodemarksResponse | undefined,
	void,
	void
>("codestream/codemarks");

export interface DeleteCodemarkRequest {
	codemarkId: string;
}
export interface DeleteCodemarkResponse {}
export const DeleteCodemarkRequestType = new RequestType<
	DeleteCodemarkRequest,
	DeleteCodemarkResponse,
	void,
	void
>("codestream/codemark/delete");

export interface GetCodemarkRequest {
	codemarkId: string;
	sortByActivity?: boolean;
}

export interface GetCodemarkResponse {
	codemark: CSCodemark;
}

export const GetCodemarkRequestType = new RequestType<
	GetCodemarkRequest,
	GetCodemarkResponse,
	void,
	void
>("codestream/codemark");

export interface SetCodemarkPinnedRequest {
	codemarkId: string;
	value: boolean;
}
export interface SetCodemarkPinnedResponse {}
export const SetCodemarkPinnedRequestType = new RequestType<
	SetCodemarkPinnedRequest,
	SetCodemarkPinnedResponse,
	void,
	void
>("codestream/codemark/setPinned");

export interface SetCodemarkStatusRequest {
	codemarkId: string;
	status: string;
}
export interface SetCodemarkStatusResponse {
	codemark: CodemarkPlus;
}
export const SetCodemarkStatusRequestType = new RequestType<
	SetCodemarkStatusRequest,
	SetCodemarkStatusResponse,
	void,
	void
>("codestream/codemark/setStatus");

export interface UpdateCodemarkRequest {
	codemarkId: string;
	streamId?: string;
	postId?: string;
	parentPostId?: string;
	color?: string;
	status?: string;
	assignees?: string[];
	title?: string;
	text?: string;
	externalAssignees?: ThirdPartyProviderUser[];
	externalProvider?: string;
	externalProviderHost?: string;
	externalProviderUrl?: string;
	wantEmailNotification?: boolean;
}
export interface UpdateCodemarkResponse {
	codemark: CodemarkPlus;
}
export const UpdateCodemarkRequestType = new RequestType<
	UpdateCodemarkRequest,
	UpdateCodemarkResponse,
	void,
	void
>("codestream/codemark/update");

export interface GetCodemarkSha1Request {
	codemarkId: string;
	markerId?: string;
}
export interface GetCodemarkSha1Response {
	documentVersion?: number;
	codemarkSha1: string | undefined;
	documentSha1: string | undefined;
}
export const GetCodemarkSha1RequestType = new RequestType<
	GetCodemarkSha1Request,
	GetCodemarkSha1Response,
	void,
	void
>("codestream/codemark/sha1");

export interface GetCodemarkRangeRequest {
	codemarkId: string;
	markerId?: string;
}
export interface GetCodemarkRangeResponse {
	currentCommitHash?: string;
	currentBranch?: string;
	currentContent?: string;
	diff?: string;
	success: boolean;
}
export const GetCodemarkRangeRequestType = new RequestType<
	GetCodemarkRangeRequest,
	GetCodemarkRangeResponse,
	void,
	void
>("codestream/codemark/range");

export interface PinReplyToCodemarkRequest {
	codemarkId: string;
	postId: string;
	value: boolean;
}
export interface PinReplyToCodemarkResponse {
	codemark: CodemarkPlus;
}
export const PinReplyToCodemarkRequestType = new RequestType<
	PinReplyToCodemarkRequest,
	PinReplyToCodemarkResponse,
	void,
	void
>("codestream/codemark/pinReply");

export interface FollowCodemarkRequest {
	codemarkId: string;
	value: boolean;
}
export interface FollowCodemarkResponse {}
export const FollowCodemarkRequestType = new RequestType<
	FollowCodemarkRequest,
	FollowCodemarkResponse,
	void,
	void
>("codestream/codemark/follow");
