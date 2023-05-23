"use strict";
import { Range, RequestType, TextDocumentIdentifier } from "vscode-languageserver-protocol";
import { BlameAuthor, CodeDelimiterStyles } from "./agent.protocol";
import { CodeErrorPlus, CreateCodeErrorRequest } from "./agent.protocol.codeErrors";
import {
	CodemarkPlus,
	CreateCodemarkRequest,
	CreateCodemarkResponse,
} from "./agent.protocol.codemarks";
import { ThirdPartyProviderUser } from "./agent.protocol.providers";
import { CreateReviewRequest, ReviewPlus } from "./agent.protocol.reviews";
import {
	CodemarkType,
	CSCodeError,
	CSCodemark,
	CSMarker,
	CSMarkerLocations,
	CSPost,
	CSReactions,
	CSRepository,
	CSReview,
	CSStream,
} from "./api.protocol";
import { Attachment, ShareTarget } from "./api.protocol.models";

export interface PostPlus extends CSPost {
	codemark?: CodemarkPlus;
	review?: CSReview;
	codeError?: CSCodeError;
	hasMarkers?: boolean;
}

export interface CreateExternalPostRequest {
	streamId: string;
	text: string;
	mentionedUserIds?: string[];
	parentPostId?: string;
	remotes?: string[];
	entryPoint?: string;
	codemarkResponse?: CreateCodemarkResponse;
	crossPostIssueValues?: CrossPostIssueValues;
}

export interface CreateSharedExternalPostRequest {
	channelId?: string;
	memberIds?: string[];
	text: string;
	mentionedUserIds?: string[];
	parentPostId?: string;
	parentText?: string;
	remotes?: string[];
	entryPoint?: string;
	// can share either a codemark
	codemark?: CodemarkPlus;
	// ...or a review
	review?: ReviewPlus;
	// ...or a "code error"
	codeError?: CodeErrorPlus;
	crossPostIssueValues?: CrossPostIssueValues;
	providerServerTokenUserId?: string;
	existingPostId?: string;
	files?: { name: string; url?: string }[];
}

export interface DeleteSharedExternalPostRequest {
	channelId: string;
	postId: string;
}

export interface DeleteSharedExternalPostResponse {
	ts?: string;
}

export interface CreatePostRequest {
	streamId: string;
	text: string;
	mentionedUserIds?: string[];
	/** users added via blame-mention, to send invite and email notification to */
	addedUsers?: string[];
	/** for added users via on-prem, also pass along inviteInfo */
	inviteInfo?: {
		serverUrl: string;
		disableStrictSSL: boolean;
	};
	parentPostId?: string;
	codemark?: CreateCodemarkRequest;
	review?: CreateReviewRequest;
	codeError?: CreateCodeErrorRequest;
	entryPoint?: string;
	crossPostIssueValues?: CrossPostIssueValues;
	dontSendEmail?: boolean;
	// Marked true when what looks to be a standard reply is marked as "Change Request".
	// In this case, under the hood, we create a markerless codemark, but in reality,
	// the user just sees a reply. This is used for telemetry to differentiate
	// a real codemark from a review reply marked as "Change Request"
	isPseudoCodemark?: boolean;
	reviewCheckpoint?: number;
	files?: Attachment[];
	codeBlock?: string;
	analyze?: boolean
}

export interface CrossPostIssueValues {
	externalProvider?: string;
	externalProviderHost?: string;
	externalProviderUrl?: string;
	assignees?: ThirdPartyProviderUser[];
	codeDelimiterStyle?: CodeDelimiterStyles;
	issueProvider: {
		/**
		 * name is a lower-cased unique "key" that identifies a specific provider.
		 * It will be something like "msteams" rather than "Microsoft Teams"
		 */
		name: string;
		id: string;
		host: string;
	};
	[key: string]: any;
}

export interface CreatePostResponse {
	post: PostPlus;
	review?: ReviewPlus;
	codemark?: CodemarkPlus;
	codeError?: CodeErrorPlus;
	markers?: CSMarker[];
	markerLocations?: CSMarkerLocations[];
	streams?: CSStream[];
	repos?: CSRepository[];
	ts?: string;
	permalink?: string;
	channelId?: string;
	channelName?: string;
}
export const CreatePostRequestType = new RequestType<
	CreatePostRequest,
	CreatePostResponse,
	void,
	void
>("codestream/posts/create");

export interface CodeBlockSource {
	file: string;
	repoPath: string;
	revision: string;
	fixedGitSha?: boolean;
	authors: BlameAuthor[];
	remotes: { name: string; url: string }[];
	branch?: string;
}
export interface CreatePostWithMarkerRequest {
	textDocuments: TextDocumentIdentifier[];
	text: string;
	mentionedUserIds?: string[];
	markers: {
		code: string;
		range?: Range;
		source?: CodeBlockSource;
		documentId: TextDocumentIdentifier;
	}[];
	parentPostId?: string;
	streamId: string;
	title?: string;
	type: CodemarkType;
	assignees?: string[];
	status?: string;
	entryPoint?: string;
	tags?: string[];
	relatedCodemarkIds?: string[];
	crossPostIssueValues?: CrossPostIssueValues;
	reviewCheckpoint?: number;
}

export const CreatePostWithMarkerRequestType = new RequestType<
	CreatePostWithMarkerRequest,
	CreatePostResponse,
	void,
	void
>("codestream/posts/createWithCodemark");

export interface FetchPostRepliesRequest {
	streamId: string;
	postId: string;
}
export interface FetchPostRepliesResponse {
	posts: CSPost[];
	codemarks?: CSCodemark[];
}
export const FetchPostRepliesRequestType = new RequestType<
	FetchPostRepliesRequest,
	FetchPostRepliesResponse,
	void,
	void
>("codestream/post/replies");

export interface FetchPostsRequest {
	streamId: string;
	limit?: number;
	after?: number | string; // equiv to slack.oldest
	before?: number | string; // equiv to slack.latest
	inclusive?: boolean;
}
export interface FetchPostsResponse {
	posts: PostPlus[];
	codemarks?: CodemarkPlus[];
	markers?: CSMarker[];
	reviews?: CSReview[];
	codeErrors?: CSCodeError[];
	more?: boolean;
}
export const FetchPostsRequestType = new RequestType<
	FetchPostsRequest,
	FetchPostsResponse,
	void,
	void
>("codestream/posts");

export interface FetchActivityRequest {
	limit?: number;
	before?: string;
}

export interface FetchActivityResponse {
	posts: PostPlus[];
	codemarks: CodemarkPlus[];
	reviews: CSReview[];
	codeErrors: CSCodeError[];
	records: string[];
	more?: boolean;
}

export const FetchActivityRequestType = new RequestType<
	FetchActivityRequest,
	FetchActivityResponse,
	void,
	void
>("codestream/posts/activity");

export interface DeletePostRequest {
	streamId: string;
	postId: string;
}
export interface DeletePostResponse {
	post: CSPost;
}
export const DeletePostRequestType = new RequestType<
	DeletePostRequest,
	DeletePostResponse,
	void,
	void
>("codestream/post/delete");

export interface EditPostRequest {
	streamId: string;
	postId: string;
	text: string;
	mentionedUserIds?: string[];
}

export interface EditPostResponse {
	post: CSPost;
}

export const EditPostRequestType = new RequestType<EditPostRequest, EditPostResponse, void, void>(
	"codestream/post/edit"
);

export interface UpdatePostSharingDataRequest {
	postId: string;
	sharedTo: ShareTarget[];
}
export interface UpdatePostSharingDataResponse {
	post: CSPost;
}
export const UpdatePostSharingDataRequestType = new RequestType<
	UpdatePostSharingDataRequest,
	UpdatePostSharingDataResponse,
	void,
	void
>("codestream/post/share-update");

export interface SharePostViaServerRequest {
	postId: string;
	providerId: string;
}

export interface SharePostViaServerResponse {
	post: CSPost;
}

export const SharePostViaServerRequestType = new RequestType<
	SharePostViaServerRequest,
	SharePostViaServerResponse,
	void,
	void
>("codestream/post/share-via-server");

export interface GetPostRequest {
	streamId: string;
	postId: string;
}

export interface GetPostResponse {
	post: PostPlus;
}

export const GetPostRequestType = new RequestType<GetPostRequest, GetPostResponse, void, void>(
	"codestream/post"
);

export interface GetPostsRequest {
	streamId: string;
	postIds: string[];
	parentPostId?: string;
}

export interface GetPostsResponse {
	posts: CSPost[];
}

export const GetPostsRequestType = new RequestType<GetPostsRequest, GetPostsResponse, void, void>(
	"codestream/posts/byIds"
);

export interface MarkPostUnreadRequest {
	streamId: string;
	postId: string;
}

export interface MarkPostUnreadResponse {}

export const MarkPostUnreadRequestType = new RequestType<
	MarkPostUnreadRequest,
	MarkPostUnreadResponse,
	void,
	void
>("codestream/post/markUnread");

export interface ReactToPostRequest {
	streamId: string;
	postId: string;
	emojis: CSReactions;
}

export interface ReactToPostResponse {
	post: CSPost;
}

export const ReactToPostRequestType = new RequestType<
	ReactToPostRequest,
	ReactToPostResponse,
	void,
	void
>("codestream/post/react");
