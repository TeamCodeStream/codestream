"use strict";
import {
	Block,
	KnownBlock,
	LogLevel,
	WebAPICallOptions,
	WebAPICallResult,
	WebClient,
	WebClientEvent
} from "@slack/web-api";
import { Agent as HttpsAgent } from "https";
import HttpsProxyAgent from "https-proxy-agent";
import { uniq } from "lodash-es";
import { Container, SessionContainer } from "../../container";
import { LogCorrelationContext, Logger, TraceLevel } from "../../logger";
import {
	Capabilities,
	CreatePostResponse,
	CreateSharedExternalPostRequest,
	FetchStreamsRequest,
	FetchStreamsResponse,
	FetchUsersResponse,
	UpdateThirdPartyStatusRequest,
	UpdateThirdPartyStatusResponse
} from "../../protocol/agent.protocol";
import {
	CSChannelStream,
	CSDirectStream,
	CSGetMeResponse,
	CSObjectStream,
	CSRepository,
	CSSlackProviderInfo,
	CSTeam,
	CSUser,
	ProviderType,
	StreamType
} from "../../protocol/api.protocol";
import { debug, Functions, log, Strings } from "../../system";
import { MessageType, StreamsRTMessage } from "../apiProvider";

import { CodeStreamApiProvider } from "api/codestream/codestreamApi";
import {
	fromMeMessageSlackPost,
	fromSlackChannel,
	fromSlackChannelOrDirect,
	fromSlackDirect,
	fromSlackPost,
	fromSlackPostId,
	fromSlackUser,
	toSlackCodeErrorPostBlocks,
	toSlackPostBlocks,
	toSlackPostText,
	toSlackReviewPostBlocks,
	UserMaps
} from "./slackSharingApi.adapters";

interface DeferredStreamRequest<TResult> {
	action(): Promise<TResult>;
	grouping: number;
	order: number;
	stream: {
		id: string;
		priority?: number;
	};
}

const meMessageRegex = /^\/me /;

// these are the slack api endpoints that are currently in use. add more as needed.
type SlackMethods =
	| "channels.info"
	| "chat.meMessage"
	| "chat.postMessage"
	| "chat.getPermalink"
	| "conversations.info"
	| "groups.info"
	| "users.profile.set"
	| "users.info";

export class SlackSharingApiProvider {
	providerType = ProviderType.Slack;
	private _slack: WebClient;
	private readonly _slackToken: string;
	private readonly _slackUserId: string;

	private _userMaps: UserMaps | undefined;

	readonly capabilities: Capabilities = {
		channelMute: false,
		postDelete: true,
		postEdit: true,
		// webview uses this to see if the provider can upgrade to realtime.
		// to hide the channels tab -- make this false
		providerCanSupportRealtimeChat: false,
		providerSupportsRealtimeChat: false,
		// agent uses this
		providerSupportsRealtimeEvents: false
	};

	constructor(
		private _codestream: CodeStreamApiProvider,
		providerInfo: CSSlackProviderInfo,
		private readonly _codestreamTeamId: string,
		private readonly _proxyAgent: HttpsAgent | HttpsProxyAgent | undefined
	) {
		this._slackToken = providerInfo.accessToken;
		this._slack = this.newWebClient();
		this._slack.on(WebClientEvent.RATE_LIMITED, retryAfter => {
			Logger.log(
				`SlackSharingApiProvider request was rate limited and future requests will be paused for ${retryAfter} seconds`
			);
		});
		this._slackUserId = providerInfo.userId!;
	}

	protected newWebClient() {
		return new WebClient(this._slackToken, {
			agent: this._proxyAgent,
			logLevel: Logger.level === TraceLevel.Debug ? LogLevel.DEBUG : LogLevel.INFO,
			logger: {
				setLevel() {},
				setName() {},
				getLevel() {
					return Logger.level === TraceLevel.Debug ? LogLevel.DEBUG : LogLevel.INFO;
				},
				debug(...msgs) {
					Logger.debug("SLACK", ...msgs);
				},
				info(...msgs) {
					Logger.log("SLACK", ...msgs);
				},
				warn(...msgs) {
					SlackSharingApiProvider.tryTrackConnectivityIssues(msgs);
					Logger.warn("SLACK", ...msgs);
				},
				error(...msgs) {
					SlackSharingApiProvider.tryTrackConnectivityIssues(msgs);
					Logger.warn("SLACK [ERROR]", ...msgs);
				}
			}
		});
	}

	private static tryTrackConnectivityIssues(msgs: string[]) {
		try {
			if (!msgs || !msgs.length) return;

			const msg = msgs[0];
			if (
				!msg ||
				typeof msg !== "string" ||
				msg.indexOf("self signed certificate in certificate chain") === -1
			) {
				return;
			}

			const telemetry = Container.instance().telemetry;
			if (!telemetry) return;

			telemetry.track({
				eventName: "Connect Error",
				properties: {
					Error: msg,
					Provider: "Slack"
				}
			});
		} catch (error) {
			Logger.error(error);
		}
	}

	get userId(): string {
		return this._slackUserId;
	}

	private async ensureUserMaps(): Promise<UserMaps> {
		if (this._userMaps === undefined) {
			const slackUsers = (await this.fetchUsers()).users;

			const userMaps = {
				slackUsernamesById: new Map(),
				slackUserIdsByUsername: new Map(),
				slackUserIdsByEmail: new Map(),
				codeStreamUsersByUsername: new Map(),
				codeStreamUsersByUserId: new Map()
			};

			for (const user of slackUsers) {
				if (user.username) {
					userMaps.slackUsernamesById.set(user.id, user.username);
					userMaps.slackUserIdsByUsername.set(user.username.toLowerCase(), user.id);
				}
				// exclude users without emails or are these weird cs-.*@unknown.com ones
				if (!user.email) continue;

				const email = user.email.toLowerCase();
				if (email.indexOf("cs-") === 0 && email.endsWith("@unknown.com")) continue;

				userMaps.slackUserIdsByEmail.set(email, user.id);
			}

			const codeStreamUsers = (await SessionContainer.instance().users.get()).users;
			for (const user of codeStreamUsers) {
				userMaps.codeStreamUsersByUserId.set(user.id, user);
				// username must exist for CS users, right?
				if (user.username) {
					userMaps.codeStreamUsersByUsername.set(user.username.toLowerCase(), user);
				}
			}
			this._userMaps = userMaps;
		}
		return this._userMaps;
	}

	@log({
		prefix: (context, e: CreateSharedExternalPostRequest) =>
			`${context.prefix}(${e.review != null ? "review" : "codemark"})`
	})
	async createExternalPost(request: CreateSharedExternalPostRequest): Promise<CreatePostResponse> {
		let createdPostId;
		try {
			const userMaps = await this.ensureUserMaps();
			const channelId = request.channelId;
			let text = request.text;
			const meMessage = meMessageRegex.test(text);

			const sleep = (miliseconds: number) => {
				return new Promise(resolve => setTimeout(resolve, miliseconds));
			};

			if (text) {
				text = toSlackPostText(text, userMaps, request.mentionedUserIds);
			}

			if (meMessage) {
				const response = await this.slackApiCall("chat.meMessage", {
					channel: channelId,
					text: text
				});

				const { ok, error, ts: postId } = response as WebAPICallResult & {
					message?: any;
					ts?: any;
				};
				if (!ok) throw new Error(error);

				const post = await fromMeMessageSlackPost(
					postId,
					channelId,
					this._codestreamTeamId,
					request.text,
					request.codemark
				);
				const { postId: postId2 } = fromSlackPostId(post.id, post.streamId);
				createdPostId = postId2;

				return { post: post };
			}

			// lookup some additional repo metadata
			let repoHash: { [key: string]: CSRepository } | undefined = undefined;
			let repoHashSource: { repoId: string }[] | undefined = undefined;
			if (request.codemark && request.codemark.markers && request.codemark.markers.length) {
				repoHashSource = request.codemark.markers;
			} else if (
				request.review &&
				request.review.reviewChangesets &&
				request.review.reviewChangesets.length
			) {
				repoHashSource = request.review.reviewChangesets;
			}
			if (repoHashSource) {
				try {
					const reposResponse = await SessionContainer.instance().repos.get({
						repoIds: uniq(repoHashSource.map(_ => _.repoId))
					});
					if (reposResponse && reposResponse.repos.length) {
						repoHash = reposResponse.repos.reduce((map: any, obj: CSRepository) => {
							map[obj.id] = obj;
							return map;
						}, {});
					}
				} catch (er) {
					Logger.error(er);
				}
			}

			let blocks: (KnownBlock | Block)[] | undefined;
			if (request.codemark != null) {
				const codemark = request.codemark;
				blocks = toSlackPostBlocks(
					codemark,
					request.remotes,
					userMaps,
					repoHash,
					this._slackUserId
				);

				// Set the fallback (notification) content for the message
				text = `${codemark.title || ""}${
					codemark.title && codemark.text ? `\n\n` : ""
				}${codemark.text || ""}`;
			} else if (request.review != null) {
				const review = request.review;
				blocks = toSlackReviewPostBlocks(review, userMaps, repoHash, this._slackUserId);
				// Set the fallback (notification) content for the message
				text = `${review.title || ""}${review.title && review.text ? `\n\n` : ""}${review.text ||
					""}`;
			} else if (request.codeError != null) {
				const codeError = request.codeError;
				blocks = toSlackCodeErrorPostBlocks(codeError, userMaps, repoHash, this._slackUserId);
				// Set the fallback (notification) content for the message
				text = `${codeError.title}`;
			}

			const response = await this.slackApiCall("chat.postMessage", {
				channel: channelId,
				text: text,
				as_user: true,
				unfurl_links: true,
				thread_ts: request.parentPostId,
				reply_broadcast: false, // parentPostId ? true : undefined --- because of slack bug (https://trello.com/c/Y48QI6Z9/919)
				blocks: blocks !== undefined ? blocks : undefined
			});

			const { ok, error, message } = response as WebAPICallResult & { message?: any; ts?: any };
			if (!ok) throw new Error(error);

			sleep(1000); // wait for slack to be able to be called about this message

			const permalinkResponse = await this.slackApiCall("chat.getPermalink", {
				channel: channelId,
				message_ts: message.ts
			});

			const ts = message.ts;
			let thePermalink = "";

			if (ts && !request.parentPostId) {
				const { ok, error, permalink } = permalinkResponse as WebAPICallResult & {
					permalink: string;
				};
				if (!ok) {
					const cc = Logger.getCorrelationContext();
					Logger.warn(cc, `Unable to get permalink for ${channelId} ${message.ts}: ${error}`);
				} else {
					thePermalink = permalink;
				}
			}

			const post = await fromSlackPost(
				message,
				channelId,
				userMaps.slackUsernamesById,
				this._codestreamTeamId
			);
			const { postId } = fromSlackPostId(post.id, post.streamId);
			createdPostId = postId;

			return {
				post: post,
				ts: ts,
				permalink: thePermalink
			};
		} finally {
			if (createdPostId) {
				this._codestream.trackProviderPost({
					provider: "slack",
					teamId: this._codestreamTeamId,
					streamId: request.channelId,
					postId: createdPostId
				});
			}
		}
	}

	@log()
	async updateStatus(
		request: UpdateThirdPartyStatusRequest
	): Promise<UpdateThirdPartyStatusResponse> {
		try {
			const response = await this.slackApiCall("users.profile.set", {
				profile: {
					status_text: request.text,
					status_emoji: request.icon || ":desktop_computer:",
					status_expiration: 0
				}
			});

			const { ok, error } = response as WebAPICallResult;
			if (!ok) throw new Error(error);

			return {
				status: ok
			};
		} finally {
		}
	}

	@log({
		exit: (r: FetchStreamsResponse) =>
			`\n${r.streams
				.filter(s => s.type !== StreamType.Object)
				.map(ss => {
					const s = ss as CSChannelStream | CSDirectStream;
					return `\t${s.id} = ${s.name}${s.priority == null ? "" : `, p=${s.priority}`}${
						s.type === StreamType.Direct ? `, closed=${s.isClosed}` : ""
					}`;
				})
				.join("\n")}\ncompleted`
	})
	async fetchStreams(request: FetchStreamsRequest) {
		const cc = Logger.getCorrelationContext();

		try {
			const responses = await this.slackApiCallPaginated("users.conversations", {
				exclude_archived: true,
				types: "public_channel,private_channel,mpim,im",
				limit: 1000
			});

			const start = process.hrtime();
			Logger.log(cc, "Fetching pages...");

			const conversations = [];
			for await (const response of responses) {
				const { ok, error, channels: data } = response as WebAPICallResult & {
					channels: any[];
				};
				if (!ok) throw new Error(error);

				this.logPaginatedResponse(cc, response);

				conversations.push(...data);
			}

			Logger.log(cc, `Fetched pages \u2022 ${Strings.getDurationMilliseconds(start)} ms`);

			const userMaps = await this.ensureUserMaps();

			const pendingRequestsQueue: DeferredStreamRequest<
				CSChannelStream | CSDirectStream | CSObjectStream
			>[] = [];

			const [channels, groups, ims] = await Promise.all([
				this.fetchChannels(
					// Filter out shared channels for now, until we can convert to the conversation apis
					conversations.filter(c => c.is_channel && !c.is_shared),
					undefined,
					pendingRequestsQueue
				),
				this.fetchGroups(
					// Filter out shared channels for now, until we can convert to the conversation apis
					conversations.filter(c => c.is_group && !c.is_shared),
					userMaps.slackUsernamesById,
					undefined,
					pendingRequestsQueue
				),
				this.fetchIMs(
					conversations.filter(c => c.is_im),
					userMaps.slackUsernamesById,
					undefined,
					pendingRequestsQueue
				)
			]);

			const streams = channels.concat(...groups, ...ims);
			if (this.capabilities.providerSupportsRealtimeEvents && pendingRequestsQueue.length !== 0) {
				this.processPendingStreamsQueue(pendingRequestsQueue);
			}

			if (
				request.types != null &&
				request.types.length !== 0 &&
				(!request.types.includes(StreamType.Channel) || !request.types.includes(StreamType.Direct))
			) {
				return { streams: streams.filter(s => request.types!.includes(s.type)) };
			}

			return { streams: streams };
		} catch (ex) {
			Logger.error(ex, cc);
			throw ex;
		}
	}

	@log({
		args: false,
		correlate: true,
		enter: q => `fetching ${q.length} stream(s) in the background...`
	})
	protected async processPendingStreamsQueue(
		queue: DeferredStreamRequest<CSChannelStream | CSDirectStream | CSObjectStream>[]
	) {
		const cc = Logger.getCorrelationContext();

		queue.sort((a, b) => b.grouping - a.grouping || a.order - b.order);

		const { streams } = SessionContainer.instance();

		const notifyThrottle = 4000;
		let timeSinceLastNotification = new Date().getTime();
		const completed: (CSChannelStream | CSDirectStream | CSObjectStream)[] = [];

		let failed = 0;
		while (queue.length) {
			const deferred = queue.shift();
			if (deferred === undefined) continue;

			try {
				const timeoutMs = 30000;
				const timer = setTimeout(async () => {
					Logger.warn(
						cc,
						`TIMEOUT ${timeoutMs / 1000}s exceeded while fetching stream '${
							deferred.stream.id
						}' in the background`
					);

					if (completed.length !== 0) {
						const message: StreamsRTMessage = { type: MessageType.Streams, data: completed };
						message.data = await streams.resolve(message);
						// this._onDidReceiveMessage.fire(message);

						completed.length = 0;
						timeSinceLastNotification = new Date().getTime();
					}
				}, timeoutMs);

				const stream = await deferred.action();
				// Since the info calls may not return the priority, preserve the existing state
				if (stream.type === StreamType.Direct && stream.priority == null) {
					stream.priority = deferred.stream.priority;
				}

				clearTimeout(timer);
				completed.push(stream);
			} catch {
				failed++;
			}

			if (
				queue.length === 0 ||
				(completed.length !== 0 &&
					new Date().getTime() - timeSinceLastNotification > notifyThrottle)
			) {
				const message: StreamsRTMessage = { type: MessageType.Streams, data: completed };
				message.data = await streams.resolve(message);
				// 	this._onDidReceiveMessage.fire(message);

				completed.length = 0;
				timeSinceLastNotification = new Date().getTime();
			}
		}

		if (failed > 0) {
			Logger.debug(cc, `Failed fetching ${failed} stream(s) in the background`);
		}
	}

	@debug({ args: false })
	private async fetchChannels(
		channels: any | undefined,
		countsByChannel: { [id: string]: any } | undefined,
		pendingQueue: DeferredStreamRequest<CSChannelStream | CSDirectStream | CSObjectStream>[]
	): Promise<(CSChannelStream | CSDirectStream | CSObjectStream)[]> {
		const cc = Logger.getCorrelationContext();

		if (channels === undefined) {
			const responses = await this.slackApiCallPaginated("channels.list", {
				exclude_archived: true,
				exclude_members: false,
				limit: 1000
			});

			const start = process.hrtime();
			Logger.log(cc, "Fetching pages...");

			channels = [];
			for await (const response of responses) {
				const { ok, error, channels: data } = response as WebAPICallResult & {
					channels: any[];
				};
				if (!ok) throw new Error(error);

				this.logPaginatedResponse(cc, response);

				channels.push(...data);
			}

			Logger.log(cc, `Fetched pages \u2022 ${Strings.getDurationMilliseconds(start)} ms`);
		}

		const streams = [];
		let pending:
			| {
					action(): Promise<CSChannelStream>;
					id: string;
					name: string;
			  }[]
			| undefined;

		let counts;
		let s;
		for (const c of channels) {
			if (c.is_archived) continue;

			if (countsByChannel != null) {
				counts = countsByChannel[c.id];
				if (counts !== undefined) {
					if (counts.latest != null) {
						c.latest = { ts: counts.latest };
					}
				}
			}

			s = fromSlackChannel(c, this._slackUserId, this._codestreamTeamId);
			streams.push(s);

			if (countsByChannel !== undefined && counts === undefined) continue;

			if (pending === undefined) {
				pending = [];
			}

			pending.push({
				action: () => this.fetchChannel(c.id),
				id: c.id,
				name: c.name as string
			});
		}

		if (pending !== undefined) {
			pending.sort((a, b) => a.name.localeCompare(b.name));

			const index = 0;
			for (const p of pending) {
				pendingQueue.push({ action: p.action, grouping: 10, order: index, stream: { id: p.id } });
			}
		}

		return streams;
	}

	@log({
		args: false,
		prefix: (context, id) => `${context.prefix}(${id})`
	})
	private async fetchChannel(id: string) {
		const cc = Logger.getCorrelationContext();

		try {
			const response = await this.slackApiCall("channels.info", {
				channel: id
			});

			const { ok, error, channel } = response as WebAPICallResult & { channel: any };
			if (!ok) throw new Error(error);

			return fromSlackChannel(channel, this._slackUserId, this._codestreamTeamId);
		} catch (ex) {
			Logger.error(ex, cc);
			throw ex;
		}
	}

	@debug({ args: false })
	private async fetchGroups(
		groups: any | undefined,
		usernamesById: Map<string, string>,
		countsByGroup: { [id: string]: any } | undefined,
		pendingQueue: DeferredStreamRequest<CSChannelStream | CSDirectStream | CSObjectStream>[]
	): Promise<(CSChannelStream | CSDirectStream | CSObjectStream)[]> {
		const cc = Logger.getCorrelationContext();

		if (groups === undefined) {
			const responses = await this.slackApiCallPaginated("groups.list", {
				exclude_archived: true,
				exclude_members: false,
				limit: 1000
			});

			const start = process.hrtime();
			Logger.log(cc, "Fetching pages...");

			groups = [];
			for await (const response of responses) {
				const { ok, error, groups: data } = response as WebAPICallResult & {
					groups: any[];
				};
				if (!ok) throw new Error(error);

				this.logPaginatedResponse(cc, response);

				groups.push(...data);
			}

			Logger.log(cc, `Fetched pages \u2022 ${Strings.getDurationMilliseconds(start)} ms`);
		}
		const streams = [];
		let pending:
			| {
					action(): Promise<CSChannelStream | CSDirectStream | CSObjectStream>;
					grouping: number;
					id: string;
					priority: number;
			  }[]
			| undefined;
		let counts;
		let s;
		for (const g of groups) {
			if (g.is_archived) continue;

			if (countsByGroup != null) {
				counts = countsByGroup[g.id];
				if (counts !== undefined) {
					g.is_open = counts.is_open;
					if (counts.latest != null) {
						g.latest = { ts: counts.latest };
					}
				} else {
					g.is_open = false;
				}
			}

			s = fromSlackChannelOrDirect(g, usernamesById, this._slackUserId, this._codestreamTeamId);
			if (s !== undefined) {
				streams.push(s);
			}

			if (countsByGroup !== undefined && counts === undefined) continue;

			if (g.is_open !== false) {
				if (pending === undefined) {
					pending = [];
				}

				pending.push({
					action: () => this.fetchGroup(g.id, usernamesById),
					grouping: g.is_mpim ? 1 : 5,
					id: g.id,
					priority: (g.priority || 0) as number
				});
			}
		}

		if (pending !== undefined) {
			pending.sort((a, b) => b.priority - a.priority);

			const index = 0;
			for (const p of pending) {
				pendingQueue.push({
					action: p.action,
					grouping: p.grouping,
					order: index,
					stream: { id: p.id, priority: p.priority }
				});
			}
		}

		return streams;
	}

	@log({
		args: false,
		prefix: (context, id) => `${context.prefix}(${id})`
	})
	private async fetchGroup(id: any, usernamesById: Map<string, string>) {
		const cc = Logger.getCorrelationContext();

		try {
			const response = await this.slackApiCall("groups.info", {
				channel: id
			});

			const { ok, error, group } = response as WebAPICallResult & { group: any };
			if (!ok) throw new Error(error);

			// this._unreads.update(
			// 	group.id,
			// 	group.last_read,
			// 	group.is_mpim ? group.unread_count_display || 0 : 0,
			// 	group.unread_count_display || 0
			// );

			return fromSlackChannelOrDirect(
				group,
				usernamesById,
				this._slackUserId,
				this._codestreamTeamId
			)!;
		} catch (ex) {
			Logger.error(ex, cc);
			throw ex;
		}
	}

	@debug({ args: false })
	private async fetchIMs(
		ims: any | undefined,
		usernamesById: Map<string, string>,
		countsByIM: { [id: string]: any } | undefined,
		pendingQueue: DeferredStreamRequest<CSChannelStream | CSDirectStream | CSObjectStream>[]
	): Promise<(CSChannelStream | CSDirectStream | CSObjectStream)[]> {
		const cc = Logger.getCorrelationContext();

		if (ims === undefined) {
			const responses = await this.slackApiCallPaginated("im.list", {
				limit: 1000
			});

			const start = process.hrtime();
			Logger.log(cc, "Fetching pages...");

			ims = [];
			for await (const response of responses) {
				const { ok, error, ims: data } = response as WebAPICallResult & {
					ims: any[];
				};
				if (!ok) throw new Error(error);

				this.logPaginatedResponse(cc, response);

				ims.push(...data);
			}

			Logger.log(cc, `Fetched pages \u2022 ${Strings.getDurationMilliseconds(start)} ms`);
		}

		const streams = [];
		let pending:
			| {
					action(): Promise<CSDirectStream>;
					id: string;
					priority: number;
			  }[]
			| undefined;
		let counts;
		let s;
		for (const im of ims) {
			if (im.is_user_deleted) continue;

			if (countsByIM != null) {
				counts = countsByIM[im.id];
				if (counts !== undefined) {
					im.is_open = counts.is_open;
					if (counts.latest != null) {
						im.latest = { ts: counts.latest };
					}
				} else {
					im.is_open = false;
				}
			}

			s = fromSlackDirect(im, usernamesById, this._slackUserId, this._codestreamTeamId);
			streams.push(s);

			if (countsByIM !== undefined && counts === undefined) continue;

			if (s.isClosed !== false) {
				if (pending === undefined) {
					pending = [];
				}

				pending.push({
					action: () => this.fetchIM(im.id, usernamesById),
					id: im.id,
					priority: (im.priority || 0) as number
				});
			}
		}

		if (pending !== undefined) {
			pending.sort((a, b) => b.priority - a.priority);

			const index = 0;
			for (const p of pending) {
				pendingQueue.push({
					action: p.action,
					grouping: 0,
					order: index,
					stream: { id: p.id, priority: p.priority }
				});
			}
		}

		return streams;
	}

	@log({
		args: false,
		prefix: (context, id) => `${context.prefix}(${id})`
	})
	private async fetchIM(id: string, usernamesById: Map<string, string>) {
		const cc = Logger.getCorrelationContext();

		try {
			const response = await this.slackApiCall("conversations.info", {
				channel: id
			});

			const { ok, error, channel } = response as WebAPICallResult & { channel: any };
			if (!ok) throw new Error(error);

			// this._unreads.update(
			// 	channel.id,
			// 	channel.last_read,
			// 	channel.unread_count_display || 0,
			// 	channel.unread_count_display || 0
			// );

			return fromSlackDirect(channel, usernamesById, this._slackUserId, this._codestreamTeamId);
		} catch (ex) {
			Logger.error(ex, cc);
			throw ex;
		}
	}

	private async getMeCore(meResponse?: CSGetMeResponse) {
		if (meResponse === undefined) {
			meResponse = await SessionContainer.instance().users.getMe();
		}

		let me = meResponse.user;
		me.codestreamId = me.id;
		me.id = this.userId;

		const response = await this.slackApiCall("users.info", {
			user: this.userId
		});

		let user;

		const { ok, user: usr } = response as WebAPICallResult & { user: any };
		if (ok) {
			// Don't need to pass the codestream users here, since we set the codestreamId already above
			user = fromSlackUser(usr, this._codestreamTeamId);
			me = {
				...me,
				avatar: user.avatar,
				// creatorId: user.id,
				deactivated: user.deactivated,
				email: user.email || me.email,
				firstName: user.firstName,
				fullName: user.fullName,
				id: user.id,
				lastName: user.lastName,
				username: user.username
			};
		}

		if (me.lastReads == null) {
			me.lastReads = {};
		}

		return { user: me };
	}

	@log()
	async fetchUsers(): Promise<FetchUsersResponse> {
		const cc = Logger.getCorrelationContext();

		const [responses, { user: me }] = await Promise.all([
			this.slackApiCallPaginated("users.list", { limit: 1000 }),
			this.getMeCore()
		]);

		const members = [];
		for await (const response of responses) {
			const { ok, error, members: data } = response as WebAPICallResult & {
				members: any[];
			};
			if (!ok) throw new Error(error);

			this.logPaginatedResponse(cc, response);

			members.push(...data);
		}

		const users: CSUser[] = members.map((m: any) =>
			// Find ourselves and replace it with our model
			m.id === this._slackUserId ? me : fromSlackUser(m, this._codestreamTeamId)
		);

		return { users: users };
	}

	@debug({
		args: false,
		prefix: (context, method, request) =>
			`${context.prefix} ${method}(${
				request != null
					? Logger.toLoggable(request, (key, value) =>
							logFilterKeys.has(key) ? `<${key}>` : Logger.sanitize(key, value)
					  )
					: ""
			})`
	})
	protected async slackApiCall<
		TRequest extends WebAPICallOptions,
		TResponse extends WebAPICallResult
	>(method: SlackMethods, request?: TRequest): Promise<TResponse> {
		const cc = Logger.getCorrelationContext();

		const timeoutMs = 30000;
		try {
			const response = await Functions.cancellable(
				this._slack.apiCall(method, request),
				timeoutMs,
				{
					cancelMessage: cc && cc.prefix,
					onDidCancel: () => Logger.warn(cc, `TIMEOUT ${timeoutMs / 1000}s exceeded`)
				}
			);

			if (Container.instance().agent.recordRequests) {
				const now = Date.now();
				// const { method, body } = init;

				const fs = require("fs");
				const sanitize = require("sanitize-filename");
				const sanitizedMethod = sanitize(
					method
					// .split("?")[0]
					// .replace(/\//g, "_")
					// .replace("_", "")
				);
				const filename = `/tmp/dump-${now}-slack-${sanitizedMethod}.json`;

				const out = {
					url: method,
					request: request,
					response: response
				};
				const outString = JSON.stringify(out, null, 2);

				fs.writeFile(filename, outString, "utf8", () => {
					Logger.log(`Written ${filename}`);
				});
			}

			return response as TResponse;
		} catch (ex) {
			Logger.error(ex, cc, ex.data != null ? JSON.stringify(ex.data) : undefined);
			if (
				ex.data &&
				ex.data.response_metadata &&
				typeof ex.data.response_metadata === "object" &&
				ex.data.response_metadata.messages &&
				ex.data.response_metadata.messages.length
			) {
				ex.message = `${ex.message}. ${ex.data.response_metadata.messages.join(",")}`;
			}
			throw ex;
		}
	}

	@debug({
		args: false,
		prefix: (context, method, request) =>
			`${context.prefix} ${method}(${
				request != null
					? Logger.toLoggable(request, (key, value) =>
							logFilterKeys.has(key) ? `<${key}>` : Logger.sanitize(key, value)
					  )
					: ""
			})`
	})
	protected async slackApiCallPaginated<
		TRequest extends WebAPICallOptions,
		TResponse extends WebAPICallResult
	>(method: string, request: TRequest): Promise<AsyncIterableIterator<TResponse>> {
		const cc = Logger.getCorrelationContext();

		try {
			const response = this._slack.paginate(method, request);
			return response as AsyncIterableIterator<TResponse>;
		} catch (ex) {
			Logger.error(ex, cc, ex.data != null ? JSON.stringify(ex.data) : undefined);
			throw ex;
		}
	}

	async dispose() {}

	private logPaginatedResponse(cc: LogCorrelationContext | undefined, response: WebAPICallResult) {
		try {
			const typeofResponse_metadata =
				response && response.response_metadata ? typeof response.response_metadata : "";

			Logger.log(cc, `Fetched page;`, {
				hasResponse: response != null,
				typeofResponse_metadata: typeofResponse_metadata,
				cursor:
					response && response.response_metadata && typeofResponse_metadata === "object"
						? response.response_metadata.next_cursor
						: ""
			});
		} catch (ex) {
			Logger.warn("Failed to log paginated response", {
				context: cc,
				error: ex
			});
		}
	}
}

const logFilterKeys = new Set(["text", "attachments"]);
