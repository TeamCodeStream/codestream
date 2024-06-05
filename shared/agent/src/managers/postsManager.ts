"use strict";
import * as fs from "fs";

import { last, orderBy } from "lodash";
import {
	CSCodeError,
	CSCreateCodemarkResponse,
	CSMarker,
	CSPost,
	CSReview,
	isCSReview,
	ProviderType,
} from "@codestream/protocols/api";
import {
	CodeDelimiterStyles,
	CodemarkPlus,
	CreatePostRequest,
	CreatePostRequestType,
	CreatePostResponse,
	CreateShareableCodeErrorRequest,
	CreateShareableCodeErrorRequestType,
	CreateShareableCodeErrorResponse,
	CrossPostIssueValues,
	DeletePostRequest,
	DeletePostRequestType,
	DeletePostResponse,
	EditPostRequest,
	EditPostRequestType,
	EditPostResponse,
	FetchActivityRequest,
	FetchActivityRequestType,
	FetchActivityResponse,
	FetchPostRepliesRequest,
	FetchPostRepliesRequestType,
	FetchPostRepliesResponse,
	FetchPostsRequest,
	FetchPostsRequestType,
	FetchPostsResponse,
	GetPostRequest,
	GetPostRequestType,
	GetPostResponse,
	GetPostsRequest,
	GetPostsRequestType,
	MarkItemReadRequest,
	MarkItemReadRequestType,
	MarkItemReadResponse,
	MarkPostUnreadRequest,
	MarkPostUnreadRequestType,
	MarkPostUnreadResponse,
	PostPlus,
	ReactToPostRequest,
	ReactToPostRequestType,
	ReactToPostResponse,
	ReportingMessageType,
	SharePostViaServerRequest,
	SharePostViaServerRequestType,
	SharePostViaServerResponse,
	UpdatePostSharingDataRequest,
	UpdatePostSharingDataRequestType,
	UpdatePostSharingDataResponse,
} from "@codestream/protocols/agent";
import { TextDocumentIdentifier } from "vscode-languageserver";
import { URI } from "vscode-uri";

import { CodeStreamApiProvider } from "api/codestream/codestreamApi";
import { Marker, MarkerLocation } from "../api/extensions";
import { Container, SessionContainer } from "../container";
import { Logger } from "../logger";
import { providerDisplayNamesByNameKey } from "../providers/provider";
import { Arrays, debug, log, lsp, lspHandler, Strings } from "../system";
import { BaseIndex, IndexParams, IndexType } from "./cache";
import { getValues, KeyValue } from "./cache/baseCache";
import { EntityCache, EntityCacheCfg } from "./cache/entityCache";
import { EntityManagerBase, Id } from "./entityManager";

import getProviderDisplayName = Marker.getProviderDisplayName;

export type FetchPostsFn = (request: FetchPostsRequest) => Promise<FetchPostsResponse>;

interface SearchResult {
	index?: number;
	afterIndex?: number;
	outOfRange?: boolean;
}

function search(posts: CSPost[], seq: string | number): SearchResult {
	if (posts.length === 0) {
		return {
			outOfRange: true,
		};
	}

	const seqNum = Number(seq);
	let min = 0;
	let max = posts.length - 1;
	let guess: number;

	const minSeqNum = Number(posts[min].seqNum);
	const maxSeqNum = Number(posts[max].seqNum);

	if (seqNum < minSeqNum || seqNum > maxSeqNum) {
		return {
			outOfRange: true,
		};
	}

	while (min <= max) {
		guess = Math.floor((min + max) / 2);
		const guessPost = posts[guess];
		if (guessPost.seqNum === seq) {
			return {
				index: guess,
			};
		} else {
			const guessSeqNum = Number(guessPost.seqNum);

			if (min === max) {
				if (seqNum > guessSeqNum) {
					return {
						afterIndex: min,
					};
				} else {
					return {
						afterIndex: min - 1,
					};
				}
			}

			if (guessSeqNum < seqNum) {
				min = guess + 1;
			} else {
				max = guess - 1;
			}
		}
	}

	throw new Error("Unexpected error on PostIndex.search()");
}

const noEscape = (s: string) => {
	return s;
};

class PostCollection {
	private posts: CSPost[];

	constructor(request: FetchPostsRequest, response: FetchPostsResponse) {
		this.posts = response.posts;
		this.updateComplete(request, response);
	}

	private complete = false;
	private updateComplete(request: FetchPostsRequest, response: FetchPostsResponse) {
		if (this.complete) {
			return;
		}

		if (request.after === undefined && !response.more) {
			this.complete = true;
		}
	}

	getBetween(
		after: string | number,
		before: string | number,
		inclusive?: boolean
	): { posts?: CSPost[] } {
		let { index: start } = search(this.posts, after);
		if (start === undefined) {
			return {};
		}

		let { index: end } = search(this.posts, before);
		if (end === undefined) {
			return {};
		}

		if (inclusive) {
			end++;
		} else {
			start++;
		}

		return {
			posts: this.posts.slice(start, end),
		};
	}

	getBefore(
		before: string | number,
		limit: number,
		inclusive?: boolean
	): { posts?: CSPost[]; more?: boolean } {
		let { index: end } = search(this.posts, before);
		if (end === undefined) {
			return {};
		}

		if (inclusive) {
			end++;
		}

		const start = end - limit;
		if (start < 0 && this.complete) {
			return {
				posts: this.posts.slice(0, end),
				more: false,
			};
		} else if (start < 0) {
			return {};
		} else {
			return {
				posts: this.posts.slice(start, end),
				more: true,
			};
		}
	}

	getAfter(
		after: string | number,
		limit: number,
		inclusive?: boolean
	): { posts?: CSPost[]; more?: boolean } {
		let { index: start } = search(this.posts, after);
		if (start === undefined) {
			return {};
		}

		if (!inclusive) {
			start++;
		}

		const end = start + limit;
		return {
			posts: this.posts.slice(start, end),
			more: end <= this.posts.length,
		};
	}

	getLatest(limit: number): { posts: CSPost[]; more: boolean } {
		let start = this.posts.length - limit;
		const more = start > 0 || !this.complete;
		start = Math.max(0, start);

		return {
			posts: this.posts.slice(start),
			more,
		};
	}

	get latest() {
		return this.posts[this.posts.length - 1];
	}

	updateOrInsert(post: CSPost) {
		const seqNum = Number(post.seqNum);
		const latestSeqNum = this.latest ? Number(this.latest.seqNum) : 0;
		if (seqNum > latestSeqNum) {
			this.posts.push(post);
		} else {
			const { outOfRange, index, afterIndex } = search(this.posts, post.seqNum);
			if (outOfRange) {
				return;
			} else if (index !== undefined) {
				this.posts[index] = post;
			} else if (afterIndex !== undefined) {
				this.posts.splice(afterIndex + 1, 0, post);
			}
		}
	}

	push(post: CSPost) {
		this.posts.push(post);
	}

	add(request: FetchPostsRequest, response: FetchPostsResponse) {
		const { before, after } = request;
		const { posts } = response;

		if (after) {
			return;
		}

		const firstNewSeq = posts[0].seqNum;
		const lastNewSeq = posts[posts.length - 1].seqNum;
		const firstExistingSeq = this.posts[0].seqNum;

		const firstNewSeqNum = Number(firstNewSeq);
		const lastNewSeqNum = Number(lastNewSeq);
		const firstExistingSeqNum = Number(firstExistingSeq);

		if (before === firstExistingSeq && lastNewSeqNum < firstExistingSeqNum) {
			this.posts = posts.concat(this.posts);
		} else if (firstNewSeqNum < firstExistingSeqNum) {
			const { index } = search(this.posts, lastNewSeq);
			if (index !== undefined) {
				this.posts = posts.concat(this.posts.slice(index + 1));
			}
		}

		this.updateComplete(request, response);
	}
}

export class PostIndex extends BaseIndex<CSPost> {
	private readonly postsByStream = new Map<Id, PostCollection>();

	constructor(fetchFn: FetchPostsFn) {
		super(["streamId"], fetchFn as any);
	}

	invalidate(): void {
		this.postsByStream.clear();
	}

	isStreamInitialized(streamId: Id): boolean {
		return this.postsByStream.has(streamId);
	}

	getPosts(request: FetchPostsRequest): { posts?: CSPost[]; more?: boolean } {
		const { streamId, after, before, limit = 100, inclusive } = request;
		const postCollection = this.postsByStream.get(streamId);
		if (!postCollection) {
			return {};
		}

		if (after !== undefined && before !== undefined) {
			return postCollection.getBetween(after, before, inclusive);
		} else if (after !== undefined) {
			return postCollection.getAfter(after, limit, inclusive);
		} else if (before !== undefined) {
			return postCollection.getBefore(before, limit, inclusive);
		} else {
			return postCollection.getLatest(limit);
		}
	}

	setPosts(request: FetchPostsRequest, response: FetchPostsResponse) {
		if (!this.enabled) return;

		const { streamId } = request;
		if (!streamId) return;
		let postCollection = this.postsByStream.get(streamId);
		if (!postCollection) {
			postCollection = new PostCollection(request, response);
			this.postsByStream.set(streamId, postCollection);
		} else {
			postCollection.add(request, response);
		}
	}

	set(entity: CSPost, oldEntity?: CSPost): void {
		const streamId = entity.streamId;
		const posts = this.postsByStream.get(streamId);
		if (!posts) {
			return;
		}

		posts.updateOrInsert(entity);
	}
}

interface PostCacheCfg extends EntityCacheCfg<CSPost> {
	fetchPosts: FetchPostsFn;
}

class PostsCache extends EntityCache<CSPost> {
	private readonly postIndex: PostIndex;
	private readonly fetchPosts: FetchPostsFn;

	constructor(cfg: PostCacheCfg) {
		super(cfg);
		this.fetchPosts = cfg.fetchPosts;
		this.postIndex = new PostIndex(cfg.fetchPosts);
		this.indexes.set("streamId", this.postIndex);
	}

	@debug({
		exit: (result: FetchPostsResponse) =>
			`returned ${result.posts.length} posts (more=${result.more})`,
		prefix: (context, request: FetchPostsRequest) => `${context.prefix}(${request.streamId})`,
		singleLine: true,
	})
	async getPosts(request: FetchPostsRequest): Promise<FetchPostsResponse> {
		const cc = Logger.getCorrelationContext();

		let { posts, more } = this.postIndex.getPosts(request);
		if (posts === undefined) {
			Logger.debug(cc, `cache miss, fetching...`);
			const response = await this.fetchPosts(request);

			this.set(response.posts);

			if (request.streamId) {
				this.postIndex.setPosts(request, response);
			}
			posts = response.posts;
			more = response.more;
		}

		return { posts: posts!, more };
	}

	private _streamInitialization = new Map<Id, Promise<void>>();
	async ensureStreamInitialized(streamId: Id): Promise<void> {
		if (this.postIndex.isStreamInitialized(streamId)) {
			return;
		}

		const promise = this._streamInitialization.get(streamId);
		if (promise) {
			await promise;
		} else {
			Logger.debug(`PostCache: initializing stream ${streamId}`);
			const newPromise = this.getPosts({
				streamId: streamId,
				limit: 100,
			});
			this._streamInitialization.set(streamId, newPromise as Promise<any>);
			await newPromise;
		}
	}
}

function getGitError(textDocument?: TextDocumentIdentifier): Promise<string | void> {
	return new Promise(resolve => {
		if (textDocument) {
			fs.access(URI.parse(textDocument.uri).fsPath, async error => {
				if (error) return resolve("FileNotSaved");

				const scmInfo = await SessionContainer.instance().scm.getFileInfo(textDocument);
				if (!scmInfo.scm) {
					if (!scmInfo.error) {
						return resolve("RepoNotManaged");
					} else {
						return resolve("GitNotFound");
					}
				} else if (scmInfo.scm!.remotes.length === 0) {
					return resolve("NoRemotes");
				}
				resolve();
			});
		}
	});
}

@lsp
export class PostsManager extends EntityManagerBase<CSPost> {
	protected readonly cache: PostsCache = new PostsCache({
		idxFields: this.getIndexedFields(),
		fetchFn: this.fetch.bind(this),
		fetchPosts: this.fetchPosts.bind(this),
		entityName: this.getEntityName(),
	});

	disableCache() {
		this.cache.disable();
	}

	enableCache() {
		this.cache.enable();
	}

	async cacheSet(entity: CSPost, oldEntity?: CSPost): Promise<CSPost | undefined> {
		if (entity && entity.streamId) {
			await this.cache.ensureStreamInitialized(entity.streamId);
		}

		return super.cacheSet(entity, oldEntity);
	}

	getIndexedFields(): IndexParams<CSPost>[] {
		return [
			{
				fields: ["streamId", "parentPostId"],
				type: IndexType.Group,
				fetchFn: this.fetchByParentPostId.bind(this),
			},
		];
	}

	protected async fetchById(id: Id): Promise<CSPost> {
		const response = await this.session.api.getPost({ streamId: undefined!, postId: id });
		return response.post;
	}

	private async fetchPosts(request: FetchPostsRequest): Promise<FetchPostsResponse> {
		const response = await this.session.api.fetchPosts(request);
		const { posts, ...rest } = response;
		this.cacheResponse(rest);
		return response;
	}

	private async fetchByParentPostId(criteria: KeyValue<CSPost>[]): Promise<CSPost[]> {
		const [streamId, parentPostId] = getValues(criteria);
		const response = await this.session.api.fetchPostReplies({
			streamId,
			postId: parentPostId,
		});
		this.cacheResponse(response);
		return response.posts;
	}

	@lspHandler(FetchPostsRequestType)
	async get(request: FetchPostsRequest): Promise<FetchPostsResponse> {
		await this.cache.ensureStreamInitialized(request.streamId);
		const cacheResponse = await this.cache.getPosts(request);
		const posts = await this.enrichPosts(cacheResponse.posts);
		return {
			codemarks: [],
			posts: posts,
			more: cacheResponse.more,
		};
	}

	@lspHandler(GetPostsRequestType)
	async getPostsByIds(request: GetPostsRequest) {
		return this.session.api.getPosts(request);
	}

	@lspHandler(FetchActivityRequestType)
	@log()
	async getActivity(request: FetchActivityRequest): Promise<FetchActivityResponse> {
		const response = await (this.session.api as CodeStreamApiProvider).fetchPosts({
			...request,
		});

		const { posts: postsManager } = SessionContainer.instance();

		const posts: PostPlus[] = [];
		// filter out deleted posts and cache valid ones
		for (const post of response.posts) {
			if (!post.deactivated) {
				posts.push(post);
				postsManager.cacheSet(post);
			}
		}

		let records = await Arrays.filterMapAsync(
			[...(response.codemarks ?? []), ...(response.reviews ?? [])],
			async object => {
				if (object.deactivated) return;

				if (isCSReview(object)) {
					// no-op
				} else {
					if (object.reviewId != null || object.codeErrorId != null) return;
				}

				return object;
			}
		);

		records = orderBy(records, r => r.lastActivityAt ?? r.createdAt, "desc");

		// if there are no valid activities in this batch, recurse
		if (records.length === 0 && response.posts.length > 0 && response.more) {
			const beforePostId = last(response.posts)!.id;
			return this.getActivity({
				...request,
				before: beforePostId,
			});
		}

		return {
			codemarks: [],
			reviews: [],
			posts: await this.enrichPosts(posts),
			records: this.createRecords(records),
			more: response.more,
		};
	}

	private createRecords(records: (CSReview | CodemarkPlus)[]): string[] {
		return records.map(r => {
			if (isCSReview(r)) {
				return `review|${r.id}`;
			}

			return `codemark|${r.id}`;
		});
	}

	private async enrichPost(post: CSPost): Promise<PostPlus> {
		let codeError;

		return { ...post, codemark: undefined, hasMarkers: false, review: undefined, codeError };
	}

	async enrichPosts(posts: CSPost[]): Promise<PostPlus[]> {
		const enrichedPosts = [];
		for (const post of posts) {
			enrichedPosts.push(await this.enrichPost(post));
		}
		return enrichedPosts;
	}

	@lspHandler(FetchPostRepliesRequestType)
	async getReplies(request: FetchPostRepliesRequest): Promise<FetchPostRepliesResponse> {
		let parentPost;
		let childPosts;

		try {
			parentPost = await this.cache.getById(request.postId);
		} catch (err) {
			Logger.error(err, `Could not find thread's parent post ${request.postId}`);
		}

		try {
			childPosts = await this.cache.getGroup([
				["streamId", request.streamId],
				["parentPostId", request.postId],
			]);
		} catch (err) {
			Logger.error(err, `Could not find thread ${request.postId}`);
		}

		const posts = [];
		if (parentPost) {
			posts.push(parentPost);
		}
		if (childPosts) {
			posts.push(...childPosts);
		}

		return { posts, codemarks: [] };
	}

	// TODO COLLAB-ERRORS: NO LONGER USED?
	// this is what the webview will call to create codeErrors in the sharing model
	@lspHandler(CreateShareableCodeErrorRequestType)
	@log()
	async createSharingCodeErrorPost(
		request: CreateShareableCodeErrorRequest
	): Promise<CreateShareableCodeErrorResponse> {
		let codeError: CSCodeError | undefined;
		const stream = await SessionContainer.instance().streams.getTeamStream();

		const postRequest = {
			errorGuid: request.errorGuid,
			codeError: request,
			text: "",
			streamId: stream.id,
			dontSendEmail: false,
			mentionedUserIds: request.mentionedUserIds,
			addedUsers: request.addedUsers,
			codeBlock: request.codeBlock?.code,
			language: request.language,
			analyze: request.analyze,
			reinitialize: request.reinitialize,
			parentPostId: request.parentPostId, // For grok reinitialization
		};
		// Logger.log(`postRequest: ${JSON.stringify(postRequest, null, 2)}`);
		const response = await this.session.api.createPost(postRequest);

		codeError = response.codeError!;

		// trackCodeErrorPostCreation(codeError, request.entryPoint, request.addedUsers);
		this.cacheResponse(response!);

		let replyPostResponse: CreatePostResponse | undefined = undefined;
		if (request.replyPost) {
			replyPostResponse = await this.session.api.createPost({
				streamId: stream.id,
				text: request.replyPost.text,
				parentPostId: response.post.id,
			});
		}

		return {
			stream,
			post: await this.enrichPost(response!.post),
			codeError,
			replyPost: replyPostResponse?.post,
		};
	}

	@lspHandler(CreatePostRequestType)
	async createPost(
		request: CreatePostRequest,
		textDocuments?: TextDocumentIdentifier[]
	): Promise<CreatePostResponse> {
		let codemarkResponse: CSCreateCodemarkResponse | undefined;
		let cardResponse;
		let externalProviderUrl;
		let externalProvider;
		let externalProviderHost;
		let externalAssignees;
		let response: CreatePostResponse | undefined;
		let providerCardRequest;
		let postId;
		let streamId;
		let requiresUpdate;
		let codemarkId;
		if (this.session.api.providerType !== ProviderType.CodeStream) {
			// if (request.codemark) {
			// 	codemarkResponse = await this.session.api.createCodemark({
			// 		...request.codemark,
			// 		parentPostId: request.parentPostId,
			// 		providerType: this.session.api.providerType,
			// 	});
			// 	if (request.crossPostIssueValues) {
			// 		providerCardRequest = {
			// 			codemark: {
			// 				title: request.codemark.title,
			// 				text: request.codemark.text,
			// 				markers: codemarkResponse.markers,
			// 				permalink: codemarkResponse.codemark.permalink,
			// 			},
			// 			remotes: request.codemark.remotes,
			// 		};
			// 	}
			// 	codemarkId = codemarkResponse.codemark.id;
			// 	requiresUpdate = true;
			// }
		} else {
			// is CS team -- this createPost will create a Post and a Codemark
			response = await this.session.api.createPost(request);
			if (request.codemark) {
				if (request.crossPostIssueValues) {
					providerCardRequest = {
						codemark: {
							title: request.codemark.title,
							text: request.codemark.text,
							markers: response.markers,
							permalink: response.codemark && response.codemark.permalink,
						},
						remotes: request.codemark.remotes,
					};
				}
				codemarkId = response.codemark && response.codemark.id;
			}
		}

		if (providerCardRequest && request.codemark && request.crossPostIssueValues) {
			cardResponse = await this.createProviderCard(
				providerCardRequest,
				request.crossPostIssueValues
			);
			if (cardResponse) {
				externalProviderUrl = cardResponse.url;
				externalProvider = request.crossPostIssueValues.issueProvider.name;
				externalProviderHost = request.crossPostIssueValues.issueProvider.host;
				externalAssignees = request.crossPostIssueValues.assignees;

				request.codemark.externalProviderUrl = externalProviderUrl;
				request.codemark.externalProvider = externalProvider;
				request.codemark.externalAssignees = externalAssignees;
				request.codemark.externalProviderHost = externalProviderHost;
				if (codemarkResponse && codemarkResponse.codemark) {
					codemarkResponse.codemark.externalProviderUrl = externalProviderUrl;
					codemarkResponse.codemark.externalProvider = externalProvider;
					codemarkResponse.codemark.externalAssignees = externalAssignees;
					codemarkResponse.codemark.externalProviderHost = externalProviderHost;
				}
				if (response && response.codemark) {
					response.codemark.externalProviderUrl = externalProviderUrl;
					response.codemark.externalProvider = externalProvider;
					response.codemark.externalAssignees = externalAssignees;
					response.codemark.externalProviderHost = externalProviderHost;
				}

				requiresUpdate = true;
			}
		}

		if (this.session.api.providerType !== ProviderType.CodeStream) {
			response = await this.session.api.createExternalPost({
				...request,
				text: request.text || "",
				remotes: request.codemark && request.codemark.remotes,
				codemarkResponse: codemarkResponse,
			});
			postId = response.post.id;
			streamId = response.post.streamId;
			requiresUpdate = true;
		}

		this.cacheResponse(response!);
		return {
			...response!,
			post: await this.enrichPost(response!.post),
		};
	}

	@lspHandler(DeletePostRequestType)
	deletePost(request: DeletePostRequest): Promise<DeletePostResponse> {
		return this.session.api.deletePost(request);
	}

	@lspHandler(EditPostRequestType)
	editPost(request: EditPostRequest): Promise<EditPostResponse> {
		return this.session.api.editPost(request);
	}

	@lspHandler(UpdatePostSharingDataRequestType)
	sharePost(request: UpdatePostSharingDataRequest): Promise<UpdatePostSharingDataResponse> {
		return this.session.api.updatePostSharingData(request);
	}

	@lspHandler(SharePostViaServerRequestType)
	sharePostViaServer(request: SharePostViaServerRequest): Promise<SharePostViaServerResponse> {
		return this.session.api.sharePostViaServer(request);
	}

	@lspHandler(MarkPostUnreadRequestType)
	markPostUnread(request: MarkPostUnreadRequest): Promise<MarkPostUnreadResponse> {
		return this.session.api.markPostUnread(request);
	}

	@lspHandler(MarkItemReadRequestType)
	markItemRead(request: MarkItemReadRequest): Promise<MarkItemReadResponse> {
		return this.session.api.markItemRead(request);
	}

	@lspHandler(ReactToPostRequestType)
	reactToPost(request: ReactToPostRequest): Promise<ReactToPostResponse> {
		return this.session.api.reactToPost(request);
	}

	@lspHandler(GetPostRequestType)
	protected async getPost(request: GetPostRequest): Promise<GetPostResponse> {
		const post = await this.getById(request.postId);
		return { post: await this.enrichPost(post) };
	}

	protected getEntityName(): string {
		return "Post";
	}

	protected bareRepo(repo: string): string {
		if (repo.match(/^(bitbucket\.org|github\.com)\/(.+)\//)) {
			repo = repo.split("/").splice(2).join("/");
		} else if (repo.indexOf("/") !== -1) {
			repo = repo.split("/").splice(1).join("/");
		}
		return repo;
	}

	getCodeDelimiters = (
		codeDelimiterStyle?: CodeDelimiterStyles
	): {
		start: string;
		end: string;
		linefeed: string;
		anchorFormat: string;
		escapeFn: (s: string) => string;
	} => {
		switch (codeDelimiterStyle) {
			// https://asana.com/guide/help/fundamentals/text
			case CodeDelimiterStyles.NONE:
				return {
					start: "",
					end: "",
					linefeed: "\n",
					anchorFormat: "${text} ${url}",
					escapeFn: noEscape,
				};
			case CodeDelimiterStyles.HTML_LIGHT_MARKUP:
				return {
					start: "",
					end: "",
					linefeed: "\n",
					anchorFormat: '<a href="${url}">${text}</a>',
					escapeFn: Strings.escapeHtml,
				};
			// https://docs.microsoft.com/en-us/azure/devops/project/wiki/markdown-guidance?view=azure-devops
			case CodeDelimiterStyles.HTML_MARKUP:
				return {
					start: "<pre><div><code>",
					end: "</code></div></pre>",
					linefeed: "<br/>",
					anchorFormat: '<a href="${url}">${text}</a>',
					escapeFn: Strings.escapeHtml,
				};

			// https://www.jetbrains.com/help/youtrack/incloud/youtrack-markdown-syntax-issues.html
			case CodeDelimiterStyles.SINGLE_BACK_QUOTE:
				return {
					start: "`",
					end: "`",
					linefeed: "\n",
					anchorFormat: "[${text}](${url})",
					escapeFn: noEscape,
				};
			// https://jira.atlassian.com/secure/WikiRendererHelpAction.jspa?section=all
			case CodeDelimiterStyles.CODE_BRACE:
				return {
					start: "{code}",
					end: "{code}",
					linefeed: "\n",
					anchorFormat: "[${text}|${url}]",
					escapeFn: noEscape,
				};
			// https://confluence.atlassian.com/bitbucketserver/markdown-syntax-guide-776639995.html
			// https://help.trello.com/article/821-using-markdown-in-trello
			default:
			case CodeDelimiterStyles.TRIPLE_BACK_QUOTE:
				return {
					start: "```\n",
					end: "```\n",
					linefeed: "\n",
					anchorFormat: "[${text}](${url})",
					escapeFn: noEscape,
				};
		}
	};

	createProviderCard = async (
		providerCardRequest: {
			codemark: {
				text: string | undefined;
				title: string | undefined;
				markers?: CSMarker[];
				permalink?: string;
			};
			remotes?: string[];
		},
		attributes: CrossPostIssueValues,
		ideName?: string
	) => {
		const delimiters = this.getCodeDelimiters(attributes.codeDelimiterStyle);
		const { linefeed, start, end, escapeFn } = delimiters;
		let description = `${escapeFn(providerCardRequest.codemark.text || "")}${linefeed}${linefeed}`;

		if (providerCardRequest.codemark.markers && providerCardRequest.codemark.markers.length) {
			let createdAtLeastOne = false;
			for (const marker of providerCardRequest.codemark.markers) {
				const links = [];
				const repo = await SessionContainer.instance().repos.getById(marker.repoId);
				if (repo) {
					const repoName = escapeFn(this.bareRepo(repo.name));
					description += `[${repoName}] `;
				}
				description += escapeFn(marker.file);
				let range;
				if (marker.locationWhenCreated) {
					range = MarkerLocation.toRangeFromArray(marker.locationWhenCreated);
				} else if (marker.referenceLocations && marker.referenceLocations.length) {
					const referenceLocation =
						marker.referenceLocations[0] && marker.referenceLocations[0].location;
					if (referenceLocation) {
						range = MarkerLocation.toRangeFromArray(referenceLocation);
					}
				}
				if (range) {
					if (range.start.line === range.end.line) {
						description += ` (Line ${range.start.line + 1})`;
					} else {
						description += ` (Lines ${range.start.line + 1}-${range.end.line + 1})`;
					}
				}

				description += `${linefeed}${linefeed}${start}${linefeed}${escapeFn(
					marker.code
				)}${linefeed}${end}${linefeed}${linefeed}`;

				if (providerCardRequest.codemark.permalink) {
					const link = Strings.interpolate(delimiters.anchorFormat, {
						text: "Open in IDE",
						url: `${providerCardRequest.codemark.permalink}?marker=${
							marker.id
						}&ide=default&src=${encodeURIComponent(
							providerDisplayNamesByNameKey.get(attributes.issueProvider.name) || ""
						)}`,
					});
					if (link) {
						links.push(link);
					}
				}

				let url = marker.remoteCodeUrl;
				if (
					!url &&
					range &&
					range.start !== undefined &&
					range.end !== undefined &&
					providerCardRequest.remotes !== undefined &&
					providerCardRequest.remotes.length !== 0
				) {
					for (const remote of providerCardRequest.remotes) {
						url = Marker.getRemoteCodeUrl(
							remote,
							marker.commitHashWhenCreated,
							marker.file,
							range.start.line + 1,
							range.end.line + 1
						);

						if (url !== undefined) {
							break;
						}
					}
				}
				if (url) {
					if (!url.displayName) {
						url.displayName = getProviderDisplayName(url.name) || "";
					}
					const link = Strings.interpolate(delimiters.anchorFormat, {
						text: `Open on ${url.displayName}`,
						url: url.url,
					});
					if (link) {
						links.push(link);
					}
				}
				if (links.length) {
					description += links.join(" · ") + linefeed;
					createdAtLeastOne = true;
				}
			}
			if (!createdAtLeastOne) {
				description += `${linefeed}Posted via CodeStream${linefeed}`;
			}
		}

		try {
			let response;
			const { providerRegistry } = SessionContainer.instance();

			const codeStreamLink = "https://codestream.com/?utm_source=cs&utm_medium=issue&utm_campaign=";
			let createdFrom = "";
			switch (ideName) {
				case "VSC":
					createdFrom = "from VS Code";
					break;
				case "JETBRAINS":
					createdFrom = "from JetBrains";
					break;
				case "VS":
					createdFrom = "from Visual Studio";
					break;
				case "ATOM":
					createdFrom = "from Atom";
					break;
			}
			switch (attributes.issueProvider.name) {
				case "jira":
				case "jiraserver": {
					response = await providerRegistry.createCard({
						providerId: attributes.issueProvider.id,
						data: {
							description: `${description}\n~Created ${createdFrom} using [CodeStream|${codeStreamLink}jira]~`,
							summary: providerCardRequest.codemark.title,
							issueType: attributes.issueType,
							project: attributes.boardId,
							assignees: attributes.assignees,
						},
					});
					break;
				}
				case "trello": {
					response = await providerRegistry.createCard({
						providerId: attributes.issueProvider.id,
						data: {
							listId: attributes.listId,
							name: providerCardRequest.codemark.title,
							assignees: attributes.assignees,
							description: `${description}\nCreated ${createdFrom} using [CodeStream](${codeStreamLink}trello)`,
						},
					});
					break;
				}
				case "github":
				case "github_enterprise": {
					response = await providerRegistry.createCard({
						providerId: attributes.issueProvider.id,
						data: {
							description: `${description}\n<sup>Created ${createdFrom} using [CodeStream](${codeStreamLink}github)</sup>`,
							title: providerCardRequest.codemark.title,
							repoName: attributes.boardName,
							assignees: attributes.assignees,
						},
					});
					break;
				}
				case "gitlab":
				case "gitlab_enterprise": {
					response = await providerRegistry.createCard({
						providerId: attributes.issueProvider.id,
						data: {
							description: `${description}\n<sup>Created ${createdFrom} using [CodeStream](${codeStreamLink}gitlab)</sup>`,
							title: providerCardRequest.codemark.title,
							repoName: attributes.boardName,
							assignee: attributes.assignees && attributes.assignees[0],
						},
					});
					break;
				}
				case "youtrack": {
					response = await providerRegistry.createCard({
						providerId: attributes.issueProvider.id,
						data: {
							description: `${description}\n<sup>Created ${createdFrom} using [CodeStream](${codeStreamLink}youtrack)</sup>`,
							name: providerCardRequest.codemark.title,
							boardId: attributes.board.id,
							assignee: attributes.assignees && attributes.assignees[0],
						},
					});
					break;
				}
				case "asana": {
					response = await providerRegistry.createCard({
						providerId: attributes.issueProvider.id,
						data: {
							description: `<body>${description}\nCreated ${createdFrom} using <a href="${codeStreamLink}asana">CodeStream</a></body>`,
							boardId: attributes.boardId,
							listId: attributes.listId,
							name: providerCardRequest.codemark.title,
							assignee: attributes.assignees && attributes.assignees[0],
						},
					});
					break;
				}
				case "bitbucket": {
					response = await providerRegistry.createCard({
						providerId: attributes.issueProvider.id,
						data: {
							description: `${description}\nCreated ${createdFrom} using [CodeStream](${codeStreamLink}bitbucket)`,
							title: providerCardRequest.codemark.title,
							repoName: attributes.boardName,
							assignee: attributes.assignees && attributes.assignees[0],
						},
					});
					break;
				}
				case "azuredevops": {
					response = await providerRegistry.createCard({
						providerId: attributes.issueProvider.id,
						data: {
							description: `${description}\n<sup>Created ${createdFrom} using <a href="${codeStreamLink}azuredevops">CodeStream</a></sup>`,
							title: providerCardRequest.codemark.title,
							boardId: attributes.board.id,
							assignee: attributes.assignees && attributes.assignees[0],
						},
					});
					break;
				}

				case "shortcut": {
					response = await providerRegistry.createCard({
						providerId: attributes.issueProvider.id,
						data: {
							description: `${description}\n\n <sup>Created ${createdFrom} using [CodeStream](${codeStreamLink}shortcut)</sup>`,
							name: providerCardRequest.codemark.title,
							projectId: attributes.projectId,
							assignees: attributes.assignees,
						},
					});
					break;
				}

				case "linear": {
					response = await providerRegistry.createCard({
						providerId: attributes.issueProvider.id,
						data: {
							description: `${description}\n\n Created ${createdFrom} using [CodeStream](${codeStreamLink}linear)`,
							name: providerCardRequest.codemark.title,
							projectId: attributes.projectId,
							assignees: attributes.assignees,
						},
					});
					Logger.log("GOT RESPONSE: " + JSON.stringify(response, null, 4));
					break;
				}

				default:
					return undefined;
			}
			return response;
		} catch (error) {
			Container.instance().errorReporter.reportMessage({
				type: ReportingMessageType.Error,
				message: `Failed to create a ${attributes.issueProvider.name} card`,
				source: "agent",
				extra: { message: error.message },
			});
			Logger.error(error, `failed to create a ${attributes.issueProvider.name} card:`);
			return undefined;
		}
	};
}
