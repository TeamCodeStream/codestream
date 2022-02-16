"use strict";
import * as path from "path";
import {
	ThirdPartyIssueProvider,
	ThirdPartyProvider,
	ThirdPartyProviderSupportsPullRequests
} from "providers/provider";
import { CodeStreamSession } from "session";
import { Range, TextDocumentChangeEvent } from "vscode-languageserver";
import { URI } from "vscode-uri";
import { Marker, MarkerLocation, Ranges } from "../api/extensions";
import { Container, SessionContainer } from "../container";
import * as gitUtils from "../git/utils";
import { Logger } from "../logger";
import { findBestMatchingLine, MAX_RANGE_VALUE } from "../markerLocation/calculator";
import {
	CodeStreamDiffUriData,
	CreateDocumentMarkerPermalinkRequest,
	CreateDocumentMarkerPermalinkRequestType,
	CreateDocumentMarkerPermalinkResponse,
	DidChangeDocumentMarkersNotificationType,
	DocumentMarker,
	FetchDocumentMarkersRequest,
	FetchDocumentMarkersRequestType,
	FetchDocumentMarkersResponse,
	GetDocumentFromKeyBindingRequest,
	GetDocumentFromKeyBindingRequestType,
	GetDocumentFromKeyBindingResponse,
	GetDocumentFromMarkerRequest,
	GetDocumentFromMarkerRequestType,
	GetDocumentFromMarkerResponse,
	MarkerNotLocated,
	MarkerNotLocatedReason
} from "../protocol/agent.protocol";
import {
	CodemarkStatus,
	CodemarkType,
	CSCodemark,
	CSLocationArray,
	CSMarker,
	CSMe,
	CSUser
} from "../protocol/api.protocol";
import { Functions, log, lsp, lspHandler, Strings } from "../system";
import * as csUri from "../system/uri";
import { GetLocationsResult } from "./markerLocationManager";
import { compareRemotes } from "./markersBuilder";
import { ReviewsManager } from "./reviewsManager";

const emojiMap: { [key: string]: string } = require("../../emoji/emojis.json");
const emojiRegex = /:([-+_a-z0-9]+):/g;

const emptyArray = (Object.freeze([]) as any) as any[];
const emptyResponse = {
	markers: emptyArray,
	markersNotLocated: emptyArray
};

@lsp
export class DocumentMarkerManager {
	private _user: CSMe | undefined;
	private _documentFromMarkerCache = new Map<string, GetDocumentFromMarkerResponse>();
	private _codemarkDocumentMarkersCache = new Map<
		string,
		{
			documentVersion: number;
			promise: Promise<FetchDocumentMarkersResponse>;
		}
	>();

	constructor(readonly session: CodeStreamSession) {
		this.session.onDidChangeCodemarks(this.onCodemarksChanged, this);
		this.session.onDidChangeCurrentUser(this.onCurrentUserChanged, this);
		this.session.onDidChangePreferences(this.onPreferencesChanged, this);
		this.session.onDidChangeMarkers(this.onMarkersChanged, this);
		this.session.agent.documents.onDidChangeContent(this.onDocumentContentChanged, this);
	}

	private onCodemarksChanged(codemarks: CSCodemark[]) {
		const fileStreamIds = new Set<string>();
		for (const codemark of codemarks) {
			if (codemark.fileStreamIds) {
				for (const fileStreamId of codemark.fileStreamIds) {
					fileStreamIds.add(fileStreamId);
				}
			}
		}

		this.onFileStreamsChanged(fileStreamIds);
	}

	private onCurrentUserChanged(me: CSMe) {
		this._user = me;
	}

	private onPreferencesChanged() {
		// const cc = Logger.getCorrelationContext();
		// Logger.log(cc, "CLEARING THE CACHE");
		this._codemarkDocumentMarkersCache.clear();
	}

	private onDocumentContentChanged(e: TextDocumentChangeEvent) {
		this.fireDidChangeDocumentMarkers(e.document.uri, "document");
	}

	private onMarkersChanged(markers: CSMarker[]) {
		const fileStreamIds = new Set<string>();
		for (const marker of markers) {
			fileStreamIds.add(marker.fileStreamId);
		}

		this.onFileStreamsChanged(fileStreamIds);
	}

	private async onFileStreamsChanged(fileStreamIds: Set<string>) {
		const { files } = SessionContainer.instance();

		for (const fileStreamId of fileStreamIds) {
			const uri = await files.getDocumentUri(fileStreamId);
			if (uri) {
				this.fireDidChangeDocumentMarkers(uri, "codemarks");
			}
		}
	}

	private _debouncedDocumentMarkersChangedByReason = new Map<
		"document" | "codemarks",
		(uri: string, reason: "document" | "codemarks") => Promise<void>
	>();

	async fireDidChangeDocumentMarkers(uri: string, reason: "document" | "codemarks") {
		// Normalize the uri to vscode style uri formating
		try {
			uri = URI.parse(uri).toString();
		} catch (e) {
			// capture the URI being used so we'll have it for the sentry error and can diagnose
			e.message = `${e.message}: ${uri}`;
			throw e;
		}

		this._codemarkDocumentMarkersCache.delete(uri);

		let fn = this._debouncedDocumentMarkersChangedByReason.get(reason);
		if (fn === undefined) {
			// Create a debounced function based on the reason that is uniquely debounced by the uri
			fn = Functions.debounceMemoized(
				this.fireDidChangeDocumentMarkersCore.bind(this),
				// If we are firing because of a codemark/marker change, only wait 100ms (max 3s), otherwise 3s (max 15s)
				reason === "codemarks" ? 100 : 3000,
				{
					maxWait: reason === "codemarks" ? 3000 : 15000,
					resolver: function(uri: string, reason: "document" | "codemarks") {
						return uri;
					}
				}
			);
			this._debouncedDocumentMarkersChangedByReason.set(reason, fn);
		}

		fn(uri, reason);
	}

	private async fireDidChangeDocumentMarkersCore(uri: string, reason: "document" | "codemarks") {
		this.session.agent.sendNotification(DidChangeDocumentMarkersNotificationType, {
			textDocument: {
				uri: uri
			},
			reason: reason
		});
	}

	@log()
	@lspHandler(CreateDocumentMarkerPermalinkRequestType)
	async createPermalink({
		uri,
		range,
		privacy,
		contents
	}: CreateDocumentMarkerPermalinkRequest): Promise<CreateDocumentMarkerPermalinkResponse> {
		const { codemarks, git, scm } = SessionContainer.instance();

		const scmResponse = await scm.getRangeInfo({
			uri: uri,
			range: range,
			contents: contents,
			skipBlame: true
		});
		const remotes = scmResponse.scm && scmResponse.scm.remotes.sort(compareRemotes).map(r => r.url);

		let remoteCodeUrl;
		if (remotes !== undefined && scmResponse.scm !== undefined && scmResponse.scm.revision) {
			// Ensure range end is >= start
			range = Ranges.ensureStartBeforeEnd(range);

			for (const remote of remotes) {
				remoteCodeUrl = Marker.getRemoteCodeUrl(
					remote,
					scmResponse.scm.revision,
					scmResponse.scm.file,
					scmResponse.range.start.line + 1,
					scmResponse.range.end.line + 1
				);

				if (remoteCodeUrl !== undefined) {
					break;
				}
			}
		}

		let commitHash;
		let location;
		if (scmResponse.scm) {
			if (!scmResponse.scm.revision) {
				commitHash = (await git.getRepoHeadRevision(scmResponse.scm.repoPath))!;
				location = MarkerLocation.toArray(MarkerLocation.empty());
			} else {
				commitHash = scmResponse.scm.revision;
				location = MarkerLocation.toArrayFromRange(range);
			}
		}

		const response = await codemarks.create({
			type: CodemarkType.Link,
			markers: [
				{
					code: scmResponse.contents,
					remotes: remotes,
					commitHash: commitHash,
					file: scmResponse.scm && scmResponse.scm.file,
					location: location
				}
			],
			remotes: remotes,
			remoteCodeUrl: remoteCodeUrl,
			createPermalink: privacy
		});

		const telemetry = Container.instance().telemetry;
		const payload = {
			Access: privacy === "public" ? "Public" : "Private",
			"Codemark ID": response.codemark.id
		};
		telemetry.track({ eventName: "Permalink Created", properties: payload });

		return { linkUrl: response.permalink! };
	}

	@log()
	@lspHandler(FetchDocumentMarkersRequestType)
	async get(request: FetchDocumentMarkersRequest): Promise<FetchDocumentMarkersResponse> {
		const uri = request.textDocument.uri;
		if (uri.startsWith("codestream-diff://")) {
			if (csUri.Uris.isCodeStreamDiffUri(uri)) {
				return this.getDocumentMarkersForPullRequestDiff(request);
			}
			return this.getDocumentMarkersForReviewDiff(request);
		} else {
			return this.getDocumentMarkersForRegularFile(request);
		}
	}

	private async getFilters() {
		const { users } = SessionContainer.instance();
		const preferences = (await users.getMe()).preferences;
		if (!preferences) return {};

		return {
			excludeArchived: !preferences.codemarksShowArchived,
			excludeResolved: !!preferences.codemarksHideResolved,
			excludeReviews: !!preferences.codemarksHideReviews
		};
	}

	private async getDocumentMarkersForPullRequestDiff({
		textDocument: documentId
	}: FetchDocumentMarkersRequest) {
		const { git, providerRegistry } = SessionContainer.instance();
		const uri = documentId.uri;

		const cc = Logger.getCorrelationContext();
		const parsedUri = csUri.Uris.fromCodeStreamDiffUri<CodeStreamDiffUriData>(uri);
		if (!parsedUri) throw new Error(`Could not parse uri ${uri}`);
		let providerId;
		let pullRequestId;
		if (parsedUri.context && parsedUri.context.pullRequest) {
			providerId = parsedUri.context.pullRequest.providerId;
			if (!providerRegistry.providerSupportsPullRequests(providerId)) {
				Logger.log(cc, `UnsupportedProvider ${providerId}`);
				return emptyResponse;
			}
			pullRequestId = parsedUri.context.pullRequest.id;
		} else {
			Logger.log(cc, `missing context for uri ${uri}`);
			return emptyResponse;
		}

		const result = await providerRegistry.executeMethod({
			method: "getPullRequest",
			providerId,
			params: {
				pullRequestId
			}
		});
		const documentMarkers: DocumentMarker[] = [];

		// TODO hardcoded stuff
		if (providerId === "gitlab/enterprise" || providerId === "gitlab*com") {
			const pr = result.project.mergeRequest;
			const comments: any[] = [];
			result.project.mergeRequest.discussions.nodes.forEach((_: any) => {
				if (_.notes && _.notes.nodes) {
					_.notes.nodes.forEach((n: any) => {
						if (n.position && n.position.newPath === parsedUri.path) {
							comments.push(n);
						}
					});
				}
			});

			const provider = providerRegistry
				.getProviders()
				.find((provider: ThirdPartyProvider) => provider.getConfig().id === pr.providerId);
			if (provider) {
				comments.forEach(async (comment: any) => {
					let summary = comment.body;
					if (summary.length !== 0) {
						summary = summary.replace(emojiRegex, (s: string, code: string) => emojiMap[code] || s);
					}

					const gotoLine = comment.position.newLine;

					const location: CSLocationArray = [gotoLine, 0, gotoLine, 0, undefined];
					documentMarkers.push({
						createdAt: +new Date(comment.createdAt),
						modifiedAt: +new Date(comment.createdAt),
						id: comment.id,
						file: comment.position.newPath,
						repoId: "",
						creatorId: comment.author.username,
						teamId: "",
						fileStreamId: "",
						creatorAvatar: comment.author ? comment.author.avatarUrl : undefined,
						code: "",
						fileUri: documentId.uri,
						creatorName: comment.author ? comment.author.name : "Unknown",
						range: MarkerLocation.toRangeFromArray(location),
						location: MarkerLocation.fromArray(location, comment.id),
						title: pr.title,
						summary: summary,
						summaryMarkdown: `${Strings.escapeMarkdown(summary, { quoted: false })}`,
						type: CodemarkType.PRComment,
						externalContent: {
							provider: { name: provider.name, id: pr.providerId, icon: provider.icon },
							externalId: pr.idComputed,
							externalChildId: comment.id,
							externalType: "pr",
							title: comment.body,
							subhead: ""
						}
					});
				});
			}
		} else {
			// TODO this is all GH-specific
			const pr = result.repository.pullRequest;
			const comments: any[] = [];
			pr.timelineItems.nodes
				.filter((node: any) => node.__typename === "PullRequestReview")
				.forEach((review: any) => {
					review.comments &&
						review.comments.nodes.forEach((comment: any) => {
							if (comment.path === parsedUri.path) comments.push(comment);
						});
				});
			const provider = providerRegistry
				.getProviders()
				.find((provider: ThirdPartyProvider) => provider.getConfig().id === pr.providerId);
			if (provider) {
				const gitRepo = await git.getRepositoryById(parsedUri.repoId);
				const repoPath = path.join(gitRepo ? gitRepo.path : "", parsedUri.path);
				const diff = await git.getDiffBetweenCommits(
					parsedUri.leftSha,
					parsedUri.rightSha,
					repoPath,
					true
				);

				const diffWithMetadata = gitUtils.translatePositionToLineNumber(diff);

				comments.forEach(async (comment: any) => {
					let summary = comment.body || comment.bodyText;
					if (summary.length !== 0) {
						summary = summary.replace(emojiRegex, (s: string, code: string) => emojiMap[code] || s);
					}

					let gotoLine = 1;
					if (comment.diffHunk && diffWithMetadata) {
						const lineNumber = gitUtils.getLineNumber(diffWithMetadata, comment.position);
						if (lineNumber != null) {
							gotoLine = lineNumber;
						} else {
							return;
						}
					} else {
						return;
					}

					const location: CSLocationArray = [gotoLine, 0, gotoLine, 0, undefined];
					documentMarkers.push({
						createdAt: +new Date(comment.createdAt),
						modifiedAt: +new Date(comment.createdAt),
						id: comment.id,
						file: comment.path,
						repoId: "",
						creatorId: comment.author.login,
						teamId: "",
						fileStreamId: "",
						creatorAvatar: comment.author ? comment.author.avatarUrl : undefined,
						code: "",
						fileUri: documentId.uri,
						creatorName: comment.author ? comment.author.login : "Unknown",
						range: MarkerLocation.toRangeFromArray(location),
						location: MarkerLocation.fromArray(location, comment.id),
						title: pr.title,
						summary: summary,
						summaryMarkdown: `${Strings.escapeMarkdown(summary, { quoted: false })}`,
						type: CodemarkType.PRComment,
						externalContent: {
							provider: { name: provider.name, id: pr.providerId, icon: provider.icon },
							externalId: pr.id,
							externalChildId: comment.id,
							externalType: "pr",
							title: comment.bodyText,
							subhead: ""
						}
					});
				});
			}
		}
		return {
			markers: documentMarkers,
			markersNotLocated: []
		};
	}

	private async getDocumentMarkersForReviewDiff({
		textDocument: documentId
	}: FetchDocumentMarkersRequest) {
		const { codemarks, files, markers, reviews, users, posts } = SessionContainer.instance();

		let parsedUri;
		try {
			parsedUri = ReviewsManager.parseUri(documentId.uri);
		} catch (e) {
			// we don't currently support getting document markers for PR diffs
			return emptyResponse;
		}

		const { reviewId, path, repoId } = parsedUri;
		if (reviewId === "local") return emptyResponse;

		const stream = (await files.getByRepoId(repoId)).find(f => f.file === path);
		if (stream == null) return emptyResponse;

		const review = await reviews.getById(reviewId);
		const markersForDocument = await markers.getByStreamId(stream.id, true);
		const documentMarkers: DocumentMarker[] = [];
		for (const marker of markersForDocument) {
			if (!marker.postId) continue; // permalinks
			const post = await posts.getById(marker.postId);
			if (review.postId !== post.parentPostId) continue;
			const canonicalLocation = marker.referenceLocations.find(l => l.flags?.canonical);
			if (canonicalLocation == null) continue;

			const codemark = await codemarks.getEnrichedCodemarkById(marker.codemarkId);
			const creator = await users.getById(marker.creatorId);
			let summary = codemark.title || codemark.text || "";
			if (summary.length !== 0) {
				summary = (codemark.title || codemark.text).replace(
					emojiRegex,
					(s, code) => emojiMap[code] || s
				);
			}
			documentMarkers.push({
				...marker,
				fileUri: documentId.uri,
				codemark: codemark,
				creatorName: (creator && creator.username) || "Unknown",
				range: MarkerLocation.toRangeFromArray(canonicalLocation.location),
				location: MarkerLocation.fromArray(canonicalLocation.location, marker.id),
				summary: summary,
				summaryMarkdown: `${Strings.escapeMarkdown(summary, { quoted: false })}`,
				type: codemark.type
			});
		}

		return {
			markers: documentMarkers,
			markersNotLocated: []
		};
	}

	private async getDocumentMarkersForRegularFile(request: FetchDocumentMarkersRequest) {
		const cc = Logger.getCorrelationContext();
		try {
			const { files } = SessionContainer.instance();
			const { textDocument: documentId } = request;
			const documentUri = URI.parse(documentId.uri);

			const filePath = documentUri.fsPath;
			Logger.log(cc, `MARKERS: requested document markers for ${filePath}`);

			const { markers, markersNotLocated } = await this.getCodemarkDocumentMarkers(request);

			const filters = await this.getFilters();

			const filteredMarkers = request.applyFilters
				? markers.filter(marker => {
						const { codemark } = marker;
						if (!codemark) return false;
						if (filters.excludeArchived && !codemark.pinned) return false;
						if (filters.excludeReviews && codemark.reviewId) return false;
						if (filters.excludeResolved && codemark.status === "closed") return false;
						return true;
				  })
				: markers;

			return {
				markers: filteredMarkers,
				markersNotLocated
			};
		} catch (ex) {
			Logger.error(ex, cc);
			debugger;
			return emptyResponse;
		}
	}

	private getCodemarkDocumentMarkers(
		request: FetchDocumentMarkersRequest
	): Promise<FetchDocumentMarkersResponse> {
		const cc = Logger.getCorrelationContext();

		const { textDocument: documentId } = request;
		const { documents } = Container.instance();
		const doc = documents.get(documentId.uri);
		const documentUri = URI.parse(documentId.uri);

		if (request.gitSha) {
			return this.getCodemarkDocumentMarkersCore(request);
		}

		const cached = this._codemarkDocumentMarkersCache.get(documentUri.toString());
		if (doc && cached && cached.documentVersion === doc?.version) {
			Logger.log(
				cc,
				`MARKERS: found cached codemark document markers for ${documentUri.fsPath} v${doc?.version}`
			);
			return cached.promise;
		}

		const promise = this.getCodemarkDocumentMarkersCore(request);

		if (doc?.version !== undefined) {
			this._codemarkDocumentMarkersCache.set(documentUri.toString(), {
				documentVersion: doc.version,
				promise
			});
		}

		return promise;
	}

	private async getCodemarkDocumentMarkersCore({
		textDocument: documentId,
		gitSha
	}: FetchDocumentMarkersRequest): Promise<FetchDocumentMarkersResponse> {
		const cc = Logger.getCorrelationContext();

		const {
			codemarks,
			files,
			markers,
			markerLocations,
			users,
			reviews,
			posts
		} = SessionContainer.instance();
		const { documents } = Container.instance();
		const { git } = SessionContainer.instance();
		const doc = documents.get(documentId.uri);
		const documentUri = URI.parse(documentId.uri);

		Logger.log(
			cc,
			`MARKERS: calculating codemark document markers for ${documentUri.fsPath} v${doc?.version}`
		);

		const documentMarkers: DocumentMarker[] = [];
		const markersNotLocated: MarkerNotLocated[] = [];
		const filePath = documentUri.fsPath;

		const stream = await files.getByPath(filePath);
		// Logger.log(cc, "FILTERS ARE: " + JSON.stringify(filters, null, 4));
		if (stream != null) {
			const markersForDocument = await markers.getByStreamId(stream.id, true);
			Logger.log(
				cc,
				`MARKERS: found ${markersForDocument.length} markers - retrieving current locations`
			);

			let getLocationsResult: GetLocationsResult;
			if (gitSha) {
				getLocationsResult = await markerLocations.getCommitLocations(
					filePath,
					gitSha,
					stream.id,
					markersForDocument
				);
			} else {
				getLocationsResult = await markerLocations.getCurrentLocations(
					documentId.uri,
					stream.id,
					markersForDocument
				);
			}
			const { locations, missingLocations } = getLocationsResult;

			const usersById = new Map<string, CSUser>();

			Logger.log(cc, `MARKERS: results:`);

			for (const marker of markersForDocument) {
				try {
					const codemark = await codemarks.getEnrichedCodemarkById(marker.codemarkId);

					// Only return markers that are not links and match the filter[s] (if any)
					if (codemark.type === CodemarkType.Link) {
						continue;
					}

					let creator;
					try {
						creator = usersById.get(marker.creatorId);
						if (creator === undefined) {
							// HACK: This is a total hack for non-CS teams (slack, msteams) to avoid getting codestream users mixed with slack users in the cache
							creator = await users.getById(marker.creatorId);

							if (creator !== undefined) {
								usersById.set(marker.creatorId, creator);
							}
						}
					} catch (ex) {
						debugger;
					}

					let summary = codemark.title || codemark.text || "";
					if (summary.length !== 0) {
						summary = (codemark.title || codemark.text).replace(
							emojiRegex,
							(s, code) => emojiMap[code] || s
						);
					}

					let title;
					if (codemark.reviewId) {
						const review = await reviews.getById(codemark.reviewId);
						const reviewPost = await posts.getById(review.postId);
						title = reviewPost.text;
					}

					if (!locations[marker.id]) {
						const contents = gitSha
							? await git.getFileContentForRevision(documentId.uri, gitSha)
							: doc && doc.getText();
						if (contents) {
							const line = await findBestMatchingLine(
								contents,
								marker.code,
								marker.locationWhenCreated ? marker.locationWhenCreated[0] : 0
							);
							if (line > 0) {
								locations[marker.id] = {
									id: marker.id,
									lineStart: line,
									colStart: 0,
									lineEnd: line,
									colEnd: MAX_RANGE_VALUE
								};
							}
						}
					}

					const location = locations[marker.id];
					if (location) {
						documentMarkers.push({
							...marker,
							fileUri: documentUri.toString(),
							codemark: codemark,
							creatorName: (creator && creator.username) || "Unknown",
							range: MarkerLocation.toRange(location),
							location: location,
							...(title ? { title } : {}),
							summary: summary,
							summaryMarkdown: `${Strings.escapeMarkdown(summary, { quoted: false })}`,
							type: codemark.type
						});
						Logger.log(
							cc,
							`MARKERS: ${marker.id}=[${location.lineStart}, ${location.colStart}, ${location.lineEnd}, ${location.colEnd}]`
						);
					} else {
						const missingLocation = missingLocations[marker.id];
						if (missingLocation) {
							markersNotLocated.push({
								...marker,
								...(title ? { title } : {}),
								summary: summary,
								summaryMarkdown: `${Strings.escapeMarkdown(summary, { quoted: false })}`,
								creatorName: (creator && creator.username) || "Unknown",
								codemark: codemark,
								notLocatedReason: missingLocation.reason,
								notLocatedDetails: missingLocation.details
							});
							Logger.log(
								cc,
								`MARKERS: ${marker.id}=${missingLocation.details ||
									"location not found"}, reason: ${missingLocation.reason}`
							);
						} else {
							markersNotLocated.push({
								...marker,
								...(title ? { title } : {}),
								summary: summary,
								summaryMarkdown: `${Strings.escapeMarkdown(summary, { quoted: false })}`,
								creatorName: (creator && creator.username) || "Unknown",
								codemark: codemark,
								notLocatedReason: MarkerNotLocatedReason.UNKNOWN
							});
							Logger.log(cc, `MARKERS: ${marker.id}=location not found, reason: unknown`);
						}
					}
				} catch (ex) {
					Logger.error(ex, cc);
				}
			}
		}

		return {
			markers: documentMarkers,
			markersNotLocated
		};
	}

	@log()
	@lspHandler(GetDocumentFromKeyBindingRequestType)
	async getDocumentFromKeyBinding({
		key
	}: GetDocumentFromKeyBindingRequest): Promise<GetDocumentFromKeyBindingResponse | undefined> {
		const { codemarks, users } = SessionContainer.instance();

		const { preferences } = await users.getPreferences();
		const codemarkKeybindings: { [key: string]: string } = preferences.codemarkKeybindings || {};

		const codemarkId = codemarkKeybindings[key];
		if (codemarkId == null || codemarkId.length === 0) return undefined;

		const codemark = await codemarks.getEnrichedCodemarkById(codemarkId);
		if (codemark == null || codemark.markers == null || codemark.markers.length === 0) {
			return undefined;
		}

		const [marker] = codemark.markers;

		return this.getDocumentFromMarker({
			markerId: marker.id,
			file: marker.file,
			repoId: marker.repoId
		});
	}

	@lspHandler(GetDocumentFromMarkerRequestType)
	@log()
	async getDocumentFromMarker({
		markerId,
		repoId,
		file,
		source // for debugging
	}: GetDocumentFromMarkerRequest): Promise<GetDocumentFromMarkerResponse | undefined> {
		const { git, markers, markerLocations, repositoryMappings } = SessionContainer.instance();
		const { documents } = Container.instance();

		const marker = await markers.getById(markerId);
		if (repoId == null || file == null) {
			file = marker.file;
			repoId = marker.repoId;
		}

		const repo = await git.getRepositoryById(repoId);
		const repoPath = repo?.path;
		if (!repoPath) return undefined;

		const filePath = path.join(repoPath, file);
		const documentUri = URI.file(filePath).toString();

		const cachedResponse = this._documentFromMarkerCache.get(markerId);
		const document = documents.get(documentUri);
		if (cachedResponse && document && cachedResponse.textDocument.version === document.version) {
			return cachedResponse;
		}

		const result = await markerLocations.getCurrentLocations(documentUri);
		const location = result.locations[markerId];
		const range = location ? MarkerLocation.toRange(location) : Range.create(0, 0, 0, 0);
		const version = (document && document.version) || 0;
		const response = {
			textDocument: { uri: documentUri, version },
			marker: marker,
			range: range
		};

		if (version !== 0) {
			this._documentFromMarkerCache.set(markerId, response);
		}

		return response;
	}
}
